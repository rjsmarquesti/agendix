const router = require('express').Router();
const ctrl = require('../controllers/settingsController');
const auth = require('../middlewares/auth');
const { requireRole } = auth;
const { getConnectionState, getQRCode } = require('../services/evolutionService');
const upload = require('../middlewares/upload');
const prisma = require('../lib/prisma');

router.get('/',            auth, requireRole('admin', 'super_admin'), ctrl.get);
router.put('/',            auth, requireRole('admin', 'super_admin'), ctrl.update);
router.post('/api-token',  auth, requireRole('admin', 'super_admin'), ctrl.gerarApiToken);
router.get('/agenda',      auth, requireRole('admin', 'super_admin'), ctrl.getAgenda);
router.put('/agenda',      auth, requireRole('admin', 'super_admin'), ctrl.updateAgenda);

// WhatsApp — status da conexão
router.get('/whatsapp/status', auth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const tenant = req.tenant;
    if (!tenant.evolutionInstance) {
      return res.json({ status: 'not_configured' });
    }
    const result = await getConnectionState(tenant.evolutionInstance, tenant.evolutionApiKey);
    res.json({ status: result?.instance?.state || result?.state || 'unknown' });
  } catch (err) {
    res.json({ status: 'error', message: err.message });
  }
});

// WhatsApp — obter QR Code
router.get('/whatsapp/qrcode', auth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const tenant = req.tenant;
    if (!tenant.evolutionInstance) {
      return res.status(400).json({ error: 'Instância WhatsApp não configurada para este tenant.' });
    }
    const result = await getQRCode(tenant.evolutionInstance, tenant.evolutionApiKey);
    res.json({ qrcode: result?.base64 || result?.qrcode?.base64 || null });
  } catch (err) {
    next(err);
  }
});

// Upload de logo
router.post('/upload-logo', auth, requireRole('admin', 'super_admin'), upload.single('logo'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Arquivo inválido. Use jpg, png, webp ou svg até 2MB.' });
  const url = `${process.env.APP_URL}/uploads/logos/${req.file.filename}`;
  res.json({ url });
});

// Backup — exportar todos os dados do tenant
router.get('/backup', auth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const [leads, agendamentos, servicos, config, bloqueios, lancamentos] = await Promise.all([
      prisma.lead.findMany({ where: { tenantId } }),
      prisma.agendamento.findMany({ where: { tenantId } }),
      prisma.servico.findMany({ where: { tenantId } }),
      prisma.configuracaoAgenda.findFirst({ where: { tenantId } }),
      prisma.bloqueioHorario.findMany({ where: { tenantId } }),
      prisma.lancamentoFinanceiro.findMany({ where: { tenantId } }),
    ]);
    const filename = `backup-${req.tenant.slug}-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.json({ version: 1, exportedAt: new Date(), tenant: req.tenant.slug, leads, agendamentos, servicos, config, bloqueios, lancamentos });
  } catch (err) { next(err); }
});

// Restore — reimportar backup (apaga dados atuais e reimporta)
router.post('/restore', auth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const { version, leads = [], agendamentos = [], servicos = [], config, bloqueios = [], lancamentos = [] } = req.body;
    if (version !== 1) return res.status(400).json({ error: 'Formato de backup inválido.' });

    const tenantId = req.tenant.id;

    const strip = ({ id, tenantId: _t, createdAt, updatedAt, ...rest }) => rest;

    await prisma.$transaction(async (tx) => {
      await tx.lancamentoFinanceiro.deleteMany({ where: { tenantId } });
      await tx.agendamento.deleteMany({ where: { tenantId } });
      await tx.lead.deleteMany({ where: { tenantId } });
      await tx.servico.deleteMany({ where: { tenantId } });
      await tx.bloqueioHorario.deleteMany({ where: { tenantId } });

      for (const s of servicos) await tx.servico.create({ data: { ...strip(s), tenantId } });
      for (const l of leads) await tx.lead.create({ data: { ...strip(l), tenantId } });
      for (const a of agendamentos) {
        const { servicoId, leadId, ...rest } = strip(a);
        await tx.agendamento.create({ data: { ...rest, tenantId } });
      }
      for (const b of bloqueios) await tx.bloqueioHorario.create({ data: { ...strip(b), tenantId } });
      for (const lf of lancamentos) await tx.lancamentoFinanceiro.create({ data: { ...strip(lf), tenantId } });

      if (config) {
        const { id, tenantId: _t, createdAt, updatedAt, ...configData } = config;
        await tx.configuracaoAgenda.upsert({
          where: { tenantId },
          create: { ...configData, tenantId },
          update: configData,
        });
      }
    });

    res.json({ message: 'Backup restaurado com sucesso.' });
  } catch (err) { next(err); }
});

module.exports = router;
