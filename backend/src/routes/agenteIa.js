const router = require('express').Router();
const prisma = require('../lib/prisma');
const { AGENTE_IA } = require('../config/planos');
const { handleMessage } = require('../services/agentService');
const { decryptTenant } = require('../lib/encrypt');
const tenantMiddleware = require('../middlewares/tenant');
const auth = require('../middlewares/auth');
const { agenteIaWebhookLimiter } = require('../middlewares/rateLimiter');
const { verificarApikeyEvolutionLog } = require('../middlewares/webhookVerify');

// Middleware: verifica plano para Agente IA
function requireAgenteIa(req, res, next) {
  const plano = req.tenant?.plano;
  if (!AGENTE_IA[plano]) {
    return res.status(403).json({ error: 'Módulo Agente IA disponível nos planos Pro e Business.' });
  }
  next();
}

// Todas as rotas abaixo exigem tenant + JWT
const protect = [tenantMiddleware, auth, requireAgenteIa];

// GET /api/agente-ia/config
router.get('/config', protect, async (req, res) => {
  try {
    const config = await prisma.agentConfig.findUnique({ where: { tenantId: req.tenant.id } });
    res.json({ config: config || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/agente-ia/config
router.put('/config', protect, async (req, res) => {
  const { persona, promptBase, horarioInicio, horarioFim, diasUteis, msgForaHorario, checkoutUrl } = req.body;
  if (!promptBase) return res.status(400).json({ error: 'O prompt base é obrigatório.' });

  // Valida checkoutUrl se informada
  if (checkoutUrl && checkoutUrl.trim()) {
    try { new URL(checkoutUrl.trim()); } catch {
      return res.status(400).json({ error: 'URL de checkout inválida.' });
    }
  }

  try {
    const config = await prisma.agentConfig.upsert({
      where: { tenantId: req.tenant.id },
      update: { persona, promptBase, horarioInicio, horarioFim, diasUteis, msgForaHorario, checkoutUrl: checkoutUrl?.trim() || null },
      create: { tenantId: req.tenant.id, persona, promptBase, horarioInicio, horarioFim, diasUteis, msgForaHorario, checkoutUrl: checkoutUrl?.trim() || null },
    });
    res.json({ config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agente-ia/toggle
router.post('/toggle', protect, async (req, res) => {
  try {
    const config = await prisma.agentConfig.findUnique({ where: { tenantId: req.tenant.id } });
    if (!config) return res.status(400).json({ error: 'Configure o agente antes de ativá-lo.' });

    const updated = await prisma.agentConfig.update({
      where: { tenantId: req.tenant.id },
      data: { ativo: !config.ativo },
    });
    res.json({ ativo: updated.ativo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agente-ia/stats
router.get('/stats', protect, async (req, res) => {
  try {
    const [totalLeads, checkouts, sessoes] = await Promise.all([
      prisma.agentLead.count({ where: { tenantId: req.tenant.id } }),
      prisma.agentLead.count({ where: { tenantId: req.tenant.id, sentCheckout: true } }),
      prisma.agentSession.count({ where: { tenantId: req.tenant.id } }),
    ]);
    res.json({ totalLeads, checkouts, sessoes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agente-ia/leads
router.get('/leads', protect, async (req, res) => {
  try {
    const leads = await prisma.agentLead.findMany({
      where: { tenantId: req.tenant.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json({ leads });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agente-ia/sessoes
router.get('/sessoes', protect, async (req, res) => {
  try {
    const sessoes = await prisma.agentSession.findMany({
      where: { tenantId: req.tenant.id },
      orderBy: { lastActivity: 'desc' },
      take: 50,
    });
    res.json({ sessoes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/agente-ia/sessoes/:phone
router.delete('/sessoes/:phone', protect, async (req, res) => {
  try {
    await prisma.agentSession.deleteMany({
      where: { id: req.params.phone, tenantId: req.tenant.id },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agente-ia/webhook/:slug — Evolution API (sem auth JWT)
router.post('/webhook/:slug', agenteIaWebhookLimiter, async (req, res) => {
  try {
    const { slug } = req.params;
    const tenant = decryptTenant(await prisma.tenant.findUnique({ where: { slug } }));
    if (!tenant || !tenant.ativo) return res.sendStatus(200);
    if (!AGENTE_IA[tenant.plano]) return res.sendStatus(200);

    // Fase 1 — log apenas: detecta divergência de apikey sem bloquear (adoção gradual)
    await verificarApikeyEvolutionLog(req, tenant).catch(() => {});

    const body = req.body;

    // Suporta Evolution API v1 e v2
    const event = body?.event || body?.type;
    if (event && !['messages.upsert', 'message'].includes(event)) return res.sendStatus(200);

    const msgData = body?.data?.message || body?.message;
    const from    = body?.data?.key?.remoteJid || body?.key?.remoteJid || '';
    const fromMe  = body?.data?.key?.fromMe ?? body?.key?.fromMe ?? false;

    if (fromMe) return res.sendStatus(200);
    if (from.includes('@g.us')) return res.sendStatus(200); // ignora grupos

    const text =
      msgData?.conversation ||
      msgData?.extendedTextMessage?.text ||
      msgData?.imageMessage?.caption ||
      '';

    if (!text.trim()) return res.sendStatus(200);

    const phone = from.replace('@s.whatsapp.net', '').replace(/\D/g, '');

    handleMessage(tenant, phone, text.trim()).catch(err =>
      console.error('[AgentWebhook] Erro:', err.message)
    );

    res.sendStatus(200);
  } catch (err) {
    console.error('[AgentWebhook]', err.message);
    res.sendStatus(200);
  }
});

module.exports = router;
