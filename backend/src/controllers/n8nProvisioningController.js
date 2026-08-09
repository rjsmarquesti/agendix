const { provisionarWorkflows, removerWorkflows } = require('../services/n8nProvisioningService');
const prisma = require('../lib/prisma');

exports.status = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      select: { id: true, nome: true, slug: true, n8nWorkflowWaId: true, n8nWorkflowNotifId: true, n8nWebhookUrl: true },
    });
    if (!tenant) return res.status(404).json({ error: 'Tenant não encontrado' });

    const provisionado = !!(tenant.n8nWorkflowWaId || tenant.n8nWorkflowNotifId);
    res.json({
      provisionado,
      waId: tenant.n8nWorkflowWaId,
      notifId: tenant.n8nWorkflowNotifId,
      webhookUrl: tenant.n8nWebhookUrl,
    });
  } catch (err) {
    next(err);
  }
};

exports.provisionar = async (req, res, next) => {
  try {
    if (!process.env.N8N_BASE_URL || !process.env.N8N_API_KEY) {
      return res.status(503).json({ error: 'N8N_BASE_URL e N8N_API_KEY não configurados no servidor' });
    }

    const id = Number(req.params.id);
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) return res.status(404).json({ error: 'Tenant não encontrado' });

    // Se já tem workflows, remove antes de recriar
    if (tenant.n8nWorkflowWaId || tenant.n8nWorkflowNotifId) {
      try {
        await removerWorkflows(tenant);
      } catch (err) {
        console.error(`[n8n] Falha ao remover workflows antigos de ${tenant.slug}:`, err.message);
      }
    }

    const { waId, notifId, webhookUrl } = await provisionarWorkflows(tenant);

    await prisma.tenant.update({
      where: { id },
      data: { n8nWorkflowWaId: waId, n8nWorkflowNotifId: notifId, n8nWebhookUrl: webhookUrl },
    });

    res.json({ ok: true, waId, notifId, webhookUrl });
  } catch (err) {
    next(err);
  }
};

exports.remover = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) return res.status(404).json({ error: 'Tenant não encontrado' });

    await removerWorkflows(tenant);

    await prisma.tenant.update({
      where: { id },
      data: { n8nWorkflowWaId: null, n8nWorkflowNotifId: null, n8nWebhookUrl: null },
    });

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
};
