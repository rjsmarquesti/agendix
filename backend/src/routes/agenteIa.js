const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');
const { AGENTE_IA } = require('../config/planos');
const { handleMessage } = require('../services/agentService');

const prisma = new PrismaClient();

function requireAgenteIa(req, res, next) {
  const plano = req.tenant?.plano;
  if (!AGENTE_IA[plano]) {
    return res.status(403).json({ error: 'Módulo Agente IA disponível apenas nos planos Premium e Business.' });
  }
  next();
}

// GET /api/agente-ia/config
router.get('/config', requireAgenteIa, async (req, res) => {
  try {
    const config = await prisma.agentConfig.findUnique({ where: { tenantId: req.tenant.id } });
    res.json({ config: config || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/agente-ia/config
router.put('/config', requireAgenteIa, async (req, res) => {
  const { persona, promptBase, horarioInicio, horarioFim, diasUteis, msgForaHorario } = req.body;
  if (!promptBase) return res.status(400).json({ error: 'O prompt base é obrigatório.' });

  try {
    const config = await prisma.agentConfig.upsert({
      where: { tenantId: req.tenant.id },
      update: { persona, promptBase, horarioInicio, horarioFim, diasUteis, msgForaHorario },
      create: { tenantId: req.tenant.id, persona, promptBase, horarioInicio, horarioFim, diasUteis, msgForaHorario },
    });
    res.json({ config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/agente-ia/toggle
router.post('/toggle', requireAgenteIa, async (req, res) => {
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

// GET /api/agente-ia/leads
router.get('/leads', requireAgenteIa, async (req, res) => {
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

// GET /api/agente-ia/stats
router.get('/stats', requireAgenteIa, async (req, res) => {
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

module.exports = router;
