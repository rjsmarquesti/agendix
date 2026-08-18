/**
 * Rotas públicas de agendamento — sem autenticação, identificadas por :slug.
 * CORS aberto para permitir embed via iframe em qualquer domínio do cliente.
 *
 * GET  /api/public/:slug/config
 * GET  /api/public/:slug/disponibilidade?data=YYYY-MM-DD
 * POST /api/public/:slug/agendar
 */
const router = require('express').Router({ mergeParams: true });
const prisma = require('../lib/prisma');
const { getSlots } = require('../services/disponibilidadeService');
const { LIMITE_AGENDAMENTOS } = require('../config/planos');
const { randomUUID } = require('crypto');
const { validarHostPublico } = require('../lib/ssrfGuard');

// ── Middleware: resolve tenant pelo slug ─────────────────────────────────────
async function resolverTenant(req, res, next) {
  const { slug } = req.params;
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant || !tenant.ativo) return res.status(404).json({ error: 'Empresa não encontrada.' });
  req.tenant = tenant;
  next();
}

// ── GET /api/public/:slug/config ─────────────────────────────────────────────
router.get('/config', resolverTenant, async (req, res, next) => {
  try {
    let config = await prisma.configuracaoAgenda.findUnique({ where: { tenantId: req.tenant.id } });
    if (!config) {
      config = await prisma.configuracaoAgenda.create({ data: { tenantId: req.tenant.id } });
    }

    const servicos = await prisma.servico.findMany({
      where: { tenantId: req.tenant.id, ativo: true },
      orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
      select: { id: true, nome: true, descricao: true, duracaoMin: true, preco: true },
    });

    res.json({
      tenantNome:          req.tenant.nome,
      logo:                req.tenant.logo || null,
      corPrimaria:         req.tenant.corPrimaria,
      horarioInicio:       config.horarioInicio,
      horarioFim:          config.horarioFim,
      duracaoSlot:         config.duracaoSlot,
      diasUteis:           config.diasUteis,
      antecedenciaMin:     config.antecedenciaMin,
      antecedenciaMax:     config.antecedenciaMax,
      mensagemConfirmacao: config.mensagemConfirmacao || null,
      servicos,
    });
  } catch (err) { next(err); }
});

// ── GET /api/public/:slug/disponibilidade?data=YYYY-MM-DD ────────────────────
router.get('/disponibilidade', resolverTenant, async (req, res, next) => {
  try {
    const { data, servicoId } = req.query;
    if (!data) return res.status(400).json({ error: 'Parâmetro "data" obrigatório (YYYY-MM-DD).' });

    const resultado = await getSlots(req.tenant.id, data, servicoId ? parseInt(servicoId) : null);

    if (resultado.erro) return res.status(400).json({ error: resultado.erro, slots: [] });

    res.json({ data, slots: resultado.slots, total: resultado.slots.length });
  } catch (err) { next(err); }
});

// ── POST /api/public/:slug/agendar ───────────────────────────────────────────
router.post('/agendar', resolverTenant, async (req, res, next) => {
  try {
    const { nome, telefone, email, observacoes, data, hora, tipo, servicoId } = req.body;

    // Validações básicas
    if (!nome?.trim())     return res.status(400).json({ error: 'Campo "nome" obrigatório.' });
    if (!telefone?.trim()) return res.status(400).json({ error: 'Campo "telefone" obrigatório.' });
    if (!data || !hora)    return res.status(400).json({ error: 'Campos "data" e "hora" obrigatórios.' });

    const telefoneNorm = telefone.replace(/\D/g, '');
    if (telefoneNorm.length < 10) return res.status(400).json({ error: 'Telefone inválido.' });

    // Verificar limite de agendamentos/mês do plano (timezone São Paulo)
    const agora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
    const ano  = agora.getFullYear();
    const mes  = String(agora.getMonth() + 1).padStart(2, '0');
    const inicioDia1 = `${ano}-${mes}-01`;
    const ultimoDia  = new Date(ano, agora.getMonth() + 1, 0).getDate();
    const fimDia     = `${ano}-${mes}-${String(ultimoDia).padStart(2, '0')}`;
    const totalMes = await prisma.agendamento.count({
      where: { tenantId: req.tenant.id, data: { gte: inicioDia1, lte: fimDia } },
    });
    const limiteAg = LIMITE_AGENDAMENTOS[req.tenant.plano] ?? 60;
    if (totalMes >= limiteAg) {
      return res.status(402).json({ error: 'Agendamentos do mês esgotados. Entre em contato com a empresa.' });
    }

    // Verifica se o slot ainda está disponível (considera duração do serviço se informado)
    const svcId = servicoId ? parseInt(servicoId) : null;
    const slotResult = await getSlots(req.tenant.id, data, svcId);
    if (slotResult.erro) return res.status(400).json({ error: slotResult.erro });
    if (!slotResult.slots.includes(hora)) {
      return res.status(409).json({ error: 'Horário indisponível. Escolha outro.' });
    }

    // Busca nome do serviço para usar como tipo (se servicoId informado e tipo não)
    let tipoFinal = tipo || null;
    if (svcId && !tipoFinal) {
      const svc = await prisma.servico.findFirst({ where: { id: svcId, tenantId: req.tenant.id, ativo: true } });
      if (svc) tipoFinal = svc.nome;
    }

    // Busca ou cria lead pelo telefone
    let lead = await prisma.lead.findFirst({
      where: { tenantId: req.tenant.id, telefone: telefoneNorm },
    });

    if (!lead) {
      lead = await prisma.lead.create({
        data: {
          tenantId: req.tenant.id,
          nome: nome.trim(),
          telefone: telefoneNorm,
          email: email?.trim() || null,
          status: 'agendado',
          fonte: 'api',
        },
      });
    }

    // Cria agendamento dentro de transaction para anti-double-booking
    const agendamento = await prisma.$transaction(async (tx) => {
      const conflito = await tx.agendamento.findFirst({
        where: {
          tenantId: req.tenant.id,
          data,
          hora,
          status: { in: ['marcado', 'confirmado'] },
        },
      });
      if (conflito) {
        const err = new Error('SLOT_OCUPADO');
        err.status = 409;
        throw err;
      }

      return tx.agendamento.create({
        data: {
          tenantId:        req.tenant.id,
          leadId:          lead.id,
          servicoId:       svcId,
          data,
          hora,
          tipo:            tipoFinal || 'consulta',
          status:          'marcado',
          canalOrigem:     'web',
          clienteNome:     nome.trim(),
          clienteTelefone: telefoneNorm,
          observacoes:     observacoes?.trim() || null,
          cancelToken:     randomUUID(),
        },
        include: { lead: { select: { nome: true, telefone: true, email: true } } },
      });
    });

    // Dispara webhook n8n de notificação (sem bloquear a resposta)
    dispararWebhookNotificacao(req.tenant, agendamento).catch(err => console.error('[webhook]', err.message));

    res.status(201).json({
      agendamento,
      mensagem: 'Agendamento realizado com sucesso!',
    });
  } catch (err) {
    if (err.message === 'SLOT_OCUPADO' || err.status === 409) {
      return res.status(409).json({ error: 'Este horário foi reservado por outra pessoa. Escolha outro.' });
    }
    next(err);
  }
});

// ── GET /api/public/cancelar/:token — consulta agendamento pelo token ────────
router.get('/cancelar/:token', async (req, res, next) => {
  try {
    const ag = await prisma.agendamento.findUnique({
      where: { cancelToken: req.params.token },
      include: {
        tenant: { select: { nome: true, logo: true, corPrimaria: true } },
        servico: { select: { nome: true } },
      },
    });

    if (!ag) return res.status(404).json({ error: 'Link inválido ou expirado.' });
    if (ag.status === 'cancelado') return res.json({ agendamento: ag, jaCancelado: true });

    res.json({ agendamento: ag, jaCancelado: false });
  } catch (err) { next(err); }
});

// ── POST /api/public/cancelar/:token — efetua o cancelamento ─────────────────
router.post('/cancelar/:token', async (req, res, next) => {
  try {
    const ag = await prisma.agendamento.findUnique({
      where: { cancelToken: req.params.token },
      include: {
        tenant: true,
        lead: { select: { nome: true } },
      },
    });

    if (!ag) return res.status(404).json({ error: 'Link inválido ou expirado.' });
    if (ag.status === 'cancelado') return res.status(409).json({ error: 'Este agendamento já foi cancelado.' });
    if (['realizado', 'nao_compareceu'].includes(ag.status)) {
      return res.status(409).json({ error: 'Não é possível cancelar um agendamento já realizado.' });
    }

    await prisma.agendamento.update({
      where: { id: ag.id },
      data: { status: 'cancelado' },
    });

    // Push notification para o tenant
    const { enviarPushParaTenant } = require('../services/pushService');
    const nomeCliente = ag.clienteNome || ag.lead?.nome || 'Cliente';
    enviarPushParaTenant(ag.tenantId, {
      title: 'Agendamento cancelado pelo cliente',
      body:  `${nomeCliente} • ${ag.data} às ${ag.hora}`,
      url:   '/agendamentos',
      icon:  '/logo.png',
    }).catch(err => console.error('[push/cancelado-cliente]', err.message));

    res.json({ ok: true, mensagem: 'Agendamento cancelado com sucesso.' });
  } catch (err) { next(err); }
});

// ── Webhook de notificação (fire-and-forget) ─────────────────────────────────
async function dispararWebhookNotificacao(tenant, agendamento) {
  if (!tenant.n8nWebhookUrl) return;
  if (!(await validarHostPublico(tenant.n8nWebhookUrl))) {
    console.warn(`[webhook] n8nWebhookUrl aponta para host privado/interno — bloqueado (tenant=${tenant.slug})`);
    return;
  }
  const config = await prisma.configuracaoAgenda.findUnique({ where: { tenantId: tenant.id } });
  await fetch(tenant.n8nWebhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(tenant.n8nApiKey ? { 'X-N8N-API-Key': tenant.n8nApiKey } : {}),
    },
    body: JSON.stringify({
      evento: 'agendamento_criado',
      agendamento,
      tenant: {
        id: tenant.id, nome: tenant.nome, slug: tenant.slug,
        apiToken: tenant.apiToken || '',
        nichoLabel: tenant.nichoLabel || 'atendimento',
        evolutionInstance: tenant.evolutionInstance || null,
        evolutionApiKey:   tenant.evolutionApiKey   || null,
        evolutionBaseUrl:  tenant.evolutionBaseUrl  || 'https://api.divulgabr.com.br',
      },
      config: { whatsappAdmin: config?.whatsappAdmin || null },
    }),
  });
}

module.exports = router;
