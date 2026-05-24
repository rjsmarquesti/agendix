const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authMiddleware = require('../middlewares/auth');
const tenantMiddleware = require('../middlewares/tenant');
const {
  criarAssinatura,
  cancelarAssinatura,
  buscarAssinatura,
  verificarWebhookSignature,
  getPlanNameFromId,
} = require('../services/mercadoPagoService');
const audit = require('../lib/audit');
const { enviarEmailOnboardingPago, enviarEmailAdminNovoPagamento } = require('../lib/mailer');

// POST /api/payments/assinar — cria assinatura MP e retorna init_point
router.post('/assinar', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const { plano } = req.body;
    const planosValidos = ['solo', 'pro', 'business'];
    if (!planosValidos.includes(plano)) {
      return res.status(400).json({ error: 'Plano inválido' });
    }

    const tenant = req.tenant;
    const { id: subscriptionId, init_point } = await criarAssinatura(tenant, plano);

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { mpSubscriptionId: subscriptionId, mpPlanId: process.env[`MP_PLAN_${plano.toUpperCase()}_ID`] },
    });

    res.json({ init_point, subscriptionId });
  } catch (err) {
    console.error('[payments/assinar]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/payments/cancelar — cancela assinatura ativa
router.put('/cancelar', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const tenant = req.tenant;
    if (!tenant.mpSubscriptionId) {
      return res.status(400).json({ error: 'Nenhuma assinatura ativa encontrada' });
    }

    await cancelarAssinatura(tenant.mpSubscriptionId);

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { planoStatus: 'inativo', mpSubscriptionId: null },
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('[payments/cancelar]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/status — retorna status da assinatura
router.get('/status', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const tenant = req.tenant;
    const data = {
      plano: tenant.plano,
      planoStatus: tenant.planoStatus,
      planoVencimento: tenant.planoVencimento,
      mpSubscriptionId: tenant.mpSubscriptionId || null,
    };

    if (tenant.mpSubscriptionId) {
      try {
        const sub = await buscarAssinatura(tenant.mpSubscriptionId);
        data.mpStatus = sub.status;
        data.mpNextPayment = sub.next_payment_date;
      } catch (_) {
        // ignora erro de lookup MP, retorna dados locais
      }
    }

    res.json(data);
  } catch (err) {
    console.error('[payments/status]', err.message);
    res.status(500).json({ error: err.message });
  }
});

const PRECO_PLANO = { solo: 49, pro: 89, business: 149 };
const ORDEM_PLANO = { solo: 0, pro: 1, business: 2 };

// POST /api/payments/mudar-plano — admin inicia upgrade ou agenda downgrade
router.post('/mudar-plano', authMiddleware, async (req, res) => {
  try {
    // somente super_admin pode usar esta rota
    if (req.user.role !== 'super_admin') return res.status(403).json({ error: 'Acesso negado' });

    const { tenantId, plano: planoNovo } = req.body;
    const planosValidos = ['solo', 'pro', 'business'];
    if (!tenantId || !planosValidos.includes(planoNovo)) {
      return res.status(400).json({ error: 'tenantId e plano são obrigatórios' });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: Number(tenantId) } });
    if (!tenant) return res.status(404).json({ error: 'Tenant não encontrado' });

    const nivelAtual = ORDEM_PLANO[tenant.plano];
    const nivelNovo  = ORDEM_PLANO[planoNovo];

    if (nivelNovo === nivelAtual) {
      return res.status(400).json({ error: 'Tenant já está neste plano' });
    }

    // ── Upgrade ──────────────────────────────────────────────────────────────
    if (nivelNovo > nivelAtual) {
      if (tenant.mpSubscriptionId) {
        await cancelarAssinatura(tenant.mpSubscriptionId);
      }
      const { id: subscriptionId, init_point } = await criarAssinatura(tenant, planoNovo);
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          mpSubscriptionId: subscriptionId,
          mpPlanId: process.env[`MP_PLAN_${planoNovo.toUpperCase()}_ID`],
          plano: planoNovo,
          planoStatus: 'aguardando_pagamento',
          planoDowngradePendente: null,
          planoDowngradeData: null,
        },
      });
      return res.json({ tipo: 'upgrade', checkout_url: init_point });
    }

    // ── Downgrade agendado ────────────────────────────────────────────────────
    // Fallback: se planoVencimento for null (assinatura sem data definida), agenda para 30 dias
    const dataDowngrade = tenant.planoVencimento
      ? new Date(tenant.planoVencimento)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        planoDowngradePendente: planoNovo,
        planoDowngradeData: dataDowngrade,
      },
    });
    return res.json({ tipo: 'downgrade', agendado: true, data: dataDowngrade });
  } catch (err) {
    console.error('[payments/mudar-plano]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/payments/downgrade-cancelar/:tenantId — cancela downgrade agendado
router.delete('/downgrade-cancelar/:tenantId', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'super_admin') return res.status(403).json({ error: 'Acesso negado' });
    await prisma.tenant.update({
      where: { id: Number(req.params.tenantId) },
      data: { planoDowngradePendente: null, planoDowngradeData: null },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('[payments/downgrade-cancelar]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Dedup em memória para x-request-id do MP (TTL 10 min)
const processedRequestIds = new Map();
function isDuplicateRequest(requestId) {
  if (!requestId) return false;
  if (processedRequestIds.has(requestId)) return true;
  processedRequestIds.set(requestId, Date.now());
  // limpeza lazy: remove IDs com mais de 10 minutos
  if (processedRequestIds.size > 500) {
    const cutoff = Date.now() - 10 * 60 * 1000;
    for (const [k, ts] of processedRequestIds) {
      if (ts < cutoff) processedRequestIds.delete(k);
    }
  }
  return false;
}

// POST /api/payments/webhook — recebe notificações do Mercado Pago
// IMPORTANTE: precisa de body raw — registrado com express.raw() em server.js
router.post('/webhook', async (req, res) => {
  try {
    if (!verificarWebhookSignature(req)) {
      return res.status(401).json({ error: 'Assinatura inválida' });
    }

    // Protege contra replay: mesmo x-request-id dentro de 10 min é ignorado
    const xRequestId = req.headers['x-request-id'];
    if (isDuplicateRequest(xRequestId)) {
      return res.sendStatus(200);
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { type, data } = body;

    if (type === 'subscription_preapproval' && data?.id) {
      const sub = await buscarAssinatura(data.id);
      const tenantId = parseInt(sub.external_reference, 10);

      if (!isNaN(tenantId)) {
        let planoStatus = 'inativo';
        let planoVencimento = null;

        if (sub.status === 'authorized') {
          planoStatus = 'ativo';
          planoVencimento = sub.next_payment_date ? new Date(sub.next_payment_date) : null;
        } else if (sub.status === 'cancelled') {
          planoStatus = 'cancelado';
        } else if (sub.status === 'paused') {
          planoStatus = 'inadimplente';
        }

        const planName = getPlanNameFromId(sub.preapproval_plan_id);

        const tenantAtual = await prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { nome: true, slug: true, plano: true, planoStatus: true, planoDowngradePendente: true, mpSubscriptionId: true },
        });

        let updateData = {
          planoStatus,
          planoVencimento,
          mpSubscriptionId: data.id,
          ...(planName ? { plano: planName } : {}),
        };

        // Aplica downgrade pendente quando o ciclo é renovado com sucesso
        if (sub.status === 'authorized' && tenantAtual?.planoDowngradePendente) {
          try {
            await cancelarAssinatura(data.id);
            const nova = await criarAssinatura({ id: tenantId, nome: tenantAtual.nome }, tenantAtual.planoDowngradePendente);
            updateData = {
              ...updateData,
              plano: tenantAtual.planoDowngradePendente,
              mpSubscriptionId: nova.id,
              mpPlanId: process.env[`MP_PLAN_${tenantAtual.planoDowngradePendente.toUpperCase()}_ID`],
              planoStatus: 'aguardando_pagamento',
              planoDowngradePendente: null,
              planoDowngradeData: null,
            };
          } catch (errDowngrade) {
            console.error('[webhook/downgrade-pendente]', errDowngrade.message);
          }
        }

        await prisma.tenant.update({ where: { id: tenantId }, data: updateData });

        // Emails de onboarding — apenas na primeira ativação (trial → pago ou aguardando → pago)
        const primeiraAtivacao = sub.status === 'authorized' &&
          (tenantAtual?.planoStatus === 'trial' || tenantAtual?.planoStatus === 'aguardando_pagamento');

        if (primeiraAtivacao) {
          const planoFinal = updateData.plano || planName || tenantAtual?.plano;
          const adminUser = await prisma.user.findFirst({
            where: { tenantId, role: 'admin', ativo: true },
            select: { nome: true, email: true },
          });
          if (adminUser) {
            enviarEmailOnboardingPago({
              para: adminUser.email,
              nome: adminUser.nome,
              slug: tenantAtual.slug,
              plano: planoFinal,
            }).catch(err => console.error('[webhook/onboarding-email]', err.message));
          }
          enviarEmailAdminNovoPagamento({
            tenantNome: tenantAtual.nome,
            tenantSlug: tenantAtual.slug,
            plano: planoFinal,
            adminEmail: adminUser?.email,
          }).catch(err => console.error('[webhook/admin-notif]', err.message));
        }

        // Audit de mudança de status financeiro via webhook
        if (sub.status === 'authorized') {
          audit.log('assinatura_ativa', { entidade: 'tenant', entidadeId: tenantId, detalhes: { plano: planName, subscriptionId: data.id } });
        } else if (sub.status === 'cancelled') {
          audit.log('assinatura_cancelada', { entidade: 'tenant', entidadeId: tenantId, detalhes: { subscriptionId: data.id } });
        } else if (sub.status === 'paused') {
          audit.log('assinatura_inadimplente', { entidade: 'tenant', entidadeId: tenantId, detalhes: { subscriptionId: data.id } });
        }

        // Grava receita no financeiro admin ao autorizar pagamento — idempotente via unique index
        const planoParaReceita = updateData.planoDowngradePendente === null
          ? tenantAtual?.planoDowngradePendente ?? planName
          : planName;
        if (sub.status === 'authorized' && planoParaReceita) {
          const valor = PRECO_PLANO[planoParaReceita] ?? 0;
          try {
            await prisma.adminLancamento.create({
              data: {
                tipo: 'receita',
                categoria: 'assinatura',
                descricao: `Assinatura ${planoParaReceita} — ${tenantAtual?.nome || `Tenant #${tenantId}`}`,
                valor,
                data: new Date().toISOString().split('T')[0],
                status: 'pago',
                referencia: data.id,
                tenantId,
              },
            });
          } catch (errCreate) {
            // P2002 = unique constraint — webhook duplicado, lançamento já existe; ignora
            if (errCreate.code !== 'P2002') throw errCreate;
          }
        }
      }
    }

    res.sendStatus(200);
  } catch (err) {
    console.error('[payments/webhook]', err.message);
    res.sendStatus(200); // sempre 200 para o MP não reenviar
  }
});

module.exports = router;
