const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const authMiddleware = require('../middlewares/auth');
const tenantMiddleware = require('../middlewares/tenant');

// Módulos base garantidos em qualquer plano
const MODULOS_BASE = ['leads', 'agendamentos'];
// Módulos extras liberados por plano
const MODULOS_POR_PLANO = {
  solo:     [],
  pro:      ['financeiro', 'wa_atendimento', 'agente_ia'],
  business: ['financeiro', 'wa_atendimento', 'agente_ia'],
};
// Todos os módulos controlados por plano (para remoção no downgrade/cancelamento)
const MODULOS_PAGOS = ['financeiro', 'wa_atendimento', 'agente_ia'];

function calcularModulos(plano, modulosAtuais) {
  const base = Array.isArray(modulosAtuais) ? modulosAtuais : [];
  // Remove módulos pagos e re-adiciona apenas os do novo plano
  const semPagos = base.filter(m => !MODULOS_PAGOS.includes(m));
  const extras = MODULOS_POR_PLANO[plano] || [];
  return [...new Set([...MODULOS_BASE, ...semPagos, ...extras])];
}

function modulosSemPagos(modulosAtuais) {
  const base = Array.isArray(modulosAtuais) ? modulosAtuais : [];
  return base.filter(m => !MODULOS_PAGOS.includes(m));
}
const {
  criarAssinatura,
  cancelarAssinatura,
  buscarAssinatura,
  verificarWebhookSignature,
  getPlanNameFromId,
  verificarPlanos,
} = require('../services/mercadoPagoService');
const audit = require('../lib/audit');
const { enviarEmailOnboardingPago, enviarEmailAdminNovoPagamento } = require('../lib/mailer');

// POST /api/payments/assinar — cria assinatura MP e retorna init_point
router.post('/assinar', authMiddleware, tenantMiddleware, async (req, res) => {
  try {
    const { plano, ciclo = 'mensal' } = req.body;
    const planosValidos = ['solo', 'pro', 'business'];
    const ciclosValidos = ['mensal', 'anual'];
    if (!planosValidos.includes(plano)) return res.status(400).json({ error: 'Plano inválido' });
    if (!ciclosValidos.includes(ciclo))  return res.status(400).json({ error: 'Ciclo inválido' });

    const tenant = req.tenant;

    // Cancela assinatura existente antes de criar nova (evita erro card_token_id do MP)
    if (tenant.mpSubscriptionId) {
      try { await cancelarAssinatura(tenant.mpSubscriptionId); } catch (e) {
        console.warn('[payments/assinar] falha ao cancelar assinatura anterior:', e.message);
      }
    }

    // JWT não contém email — busca do banco para garantir payer_email ao MP
    const userDb = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { email: true },
    });
    const payerEmail = userDb?.email || tenant.email || null;
    if (!payerEmail) return res.status(400).json({ error: 'Email do usuário não encontrado. Atualize seu cadastro antes de assinar.' });

    const { id: subscriptionId, init_point } = await criarAssinatura(tenant, plano, payerEmail, ciclo);

    const planEnvKey = ciclo === 'anual'
      ? `MP_PLAN_${plano.toUpperCase()}_ANUAL_ID`
      : `MP_PLAN_${plano.toUpperCase()}_ID`;

    await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        mpSubscriptionId: subscriptionId,
        mpPlanId: process.env[planEnvKey],
        cicloBilhagem: ciclo,
      },
    });

    res.json({ init_point, subscriptionId });
  } catch (err) {
    // Log completo para diagnóstico (o mercadoPagoService já loga o detalhe completo)
    console.error('[payments/assinar] status=%s msg=%s', err.status, err.message);
    const msg = err.message || '';
    if (msg.includes('MP_ACCESS_TOKEN') || msg.includes('access_token'))
      return res.status(500).json({ error: 'Token do Mercado Pago não configurado.' });
    if (msg.includes('Plano MP não configurado'))
      return res.status(400).json({ error: 'Plano não configurado no Mercado Pago. Contate o suporte.' });
    // Repassa a mensagem real do MP para facilitar diagnóstico em produção
    const mpDetail = err.cause ? JSON.stringify(err.cause) : (err.body ? JSON.stringify(err.body) : msg);
    res.status(err.status || 500).json({ error: `Erro MP: ${mpDetail}` });
  }
});

// GET /api/payments/diagnostico — verifica se os planos MP existem (somente super_admin)
const { requireRole } = require('../middlewares/auth');
router.get('/diagnostico', authMiddleware, requireRole('super_admin'), async (req, res) => {
  try {
    const planos = await verificarPlanos();
    const token = process.env.MP_ACCESS_TOKEN;
    res.json({
      token_configurado: !!token,
      token_preview: token ? `${token.slice(0, 8)}...${token.slice(-4)}` : null,
      planos,
    });
  } catch (err) {
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
      cicloBilhagem: tenant.cicloBilhagem || 'mensal',
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

const PRECO_PLANO = { solo: 39, pro: 59, business: 99 };
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

        // Para assinaturas inline (sem preapproval_plan_id), deriva o plano pelo valor ou reason
        let planName = getPlanNameFromId(sub.preapproval_plan_id);
        if (!planName) {
          const valor = sub.auto_recurring?.transaction_amount;
          const reason = (sub.reason || '').toLowerCase();
          if (reason.includes('business') || valor === 99 || valor === 950.40) planName = 'business';
          else if (reason.includes('pro')      || valor === 59 || valor === 566.40) planName = 'pro';
          else if (reason.includes('solo')     || valor === 39 || valor === 374.40) planName = 'solo';
        }

        const tenantAtual = await prisma.tenant.findUnique({
          where: { id: tenantId },
          select: { nome: true, slug: true, plano: true, planoStatus: true, planoDowngradePendente: true, mpSubscriptionId: true, modulos: true },
        });

        const modulosAtuais = Array.isArray(tenantAtual?.modulos) ? tenantAtual.modulos : MODULOS_BASE;

        let updateData = {
          planoStatus,
          planoVencimento,
          mpSubscriptionId: data.id,
          ...(planName ? { plano: planName } : {}),
          // Atualiza módulos conforme novo plano (mantém nicho-específicos, ajusta os pagos)
          ...(planName ? { modulos: calcularModulos(planName, modulosAtuais) } : {}),
          // Cancelamento/inadimplência: remove módulos pagos
          ...(sub.status === 'cancelled' || sub.status === 'paused'
            ? { modulos: modulosSemPagos(modulosAtuais) }
            : {}),
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
              planoStatus: 'ativo',
              modulos: calcularModulos(tenantAtual.planoDowngradePendente, modulosAtuais),
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
              tenantId,
            }).catch(err => console.error('[webhook/onboarding-email]', err.message));
          }
          enviarEmailAdminNovoPagamento({
            tenantNome: tenantAtual.nome,
            tenantSlug: tenantAtual.slug,
            plano: planoFinal,
            adminEmail: adminUser?.email,
            tenantId,
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
