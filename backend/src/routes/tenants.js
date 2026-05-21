const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/tenantsController');
const auth = require('../middlewares/auth');
const { requireRole } = auth;

const onlySuper = [auth, requireRole('super_admin')];

const validarTenant = [
  body('nome').notEmpty().withMessage('Nome obrigatório'),
  body('slug').notEmpty().matches(/^[a-z0-9-]+$/).withMessage('Slug: use apenas letras minúsculas, números e -'),
];

router.get('/',    ...onlySuper, ctrl.listar);

// Status WA em bulk para todos os tenants com instância configurada
router.get('/wa-status', ...onlySuper, async (req, res) => {
  try {
    const prisma = require('../lib/prisma');
    const { getConnectionState } = require('../services/evolutionService');

    const tenants = await prisma.tenant.findMany({
      where: { evolutionInstance: { not: null } },
      select: { id: true, evolutionInstance: true, evolutionApiKey: true },
    });

    const results = await Promise.allSettled(
      tenants.map(t => getConnectionState(t.evolutionInstance, t.evolutionApiKey))
    );

    const statuses = {};
    tenants.forEach((t, i) => {
      const r = results[i];
      statuses[t.id] = r.status === 'fulfilled'
        ? (r.value?.instance?.state || r.value?.state || 'unknown')
        : 'error';
    });

    res.json({ statuses });
  } catch (err) {
    res.json({ statuses: {} });
  }
});

router.get('/:id', ...onlySuper, ctrl.buscarPorId);
router.post('/',   ...onlySuper, validarTenant, ctrl.criar);
router.put('/:id', ...onlySuper, ctrl.atualizar);
router.delete('/:id', ...onlySuper, ctrl.deletar);

// Usuários do tenant
router.get('/:id/usuarios', ...onlySuper, async (req, res, next) => {
  try {
    const prisma = require('../lib/prisma');
    const users = await prisma.user.findMany({
      where: { tenantId: Number(req.params.id) },
      select: { id: true, nome: true, email: true, role: true, ativo: true, activationToken: true, createdAt: true },
    });
    res.json(users);
  } catch (err) { next(err); }
});
router.post('/:id/usuarios',              ...onlySuper, ctrl.criarUsuario);
router.put('/:id/usuarios/:userId/senha', ...onlySuper, ctrl.resetarSenha);

// Ativar usuário diretamente (sem email)
router.post('/:id/usuarios/:userId/ativar', ...onlySuper, async (req, res, next) => {
  try {
    const prisma = require('../lib/prisma');
    await prisma.user.update({
      where: { id: Number(req.params.userId) },
      data: { ativo: true, activationToken: null, activationExpires: null },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Evolution API — criar/recriar instância
router.post('/:id/create-evolution', ...onlySuper, ctrl.criarEvolution);

// Evolution API — reconfigurar webhook (para tenants já existentes)
router.post('/:id/reconfigure-webhook', ...onlySuper, ctrl.reconfigurarWebhook);

// WhatsApp — status, QR code e disconnect (super-admin por tenant ID)
router.get('/:id/whatsapp/status', ...onlySuper, async (req, res, next) => {
  try {
    const prisma = require('../lib/prisma');
    const { getConnectionState } = require('../services/evolutionService');
    const tenant = await prisma.tenant.findUnique({ where: { id: Number(req.params.id) } });
    if (!tenant?.evolutionInstance) return res.json({ status: 'not_configured' });
    const result = await getConnectionState(tenant.evolutionInstance, tenant.evolutionApiKey);
    res.json({ status: result?.instance?.state || result?.state || 'unknown' });
  } catch (err) { res.json({ status: 'error', message: err.message }); }
});

router.get('/:id/whatsapp/qrcode', ...onlySuper, async (req, res, next) => {
  try {
    const prisma = require('../lib/prisma');
    const { getQRCode } = require('../services/evolutionService');
    const tenant = await prisma.tenant.findUnique({ where: { id: Number(req.params.id) } });
    if (!tenant?.evolutionInstance) return res.status(400).json({ error: 'Instância não configurada' });
    const result = await getQRCode(tenant.evolutionInstance, tenant.evolutionApiKey);
    res.json({ qrcode: result?.base64 || result?.qrcode?.base64 || null });
  } catch (err) { next(err); }
});

router.post('/:id/whatsapp/disconnect', ...onlySuper, async (req, res, next) => {
  try {
    const prisma = require('../lib/prisma');
    const { logoutInstance } = require('../services/evolutionService');
    const tenant = await prisma.tenant.findUnique({ where: { id: Number(req.params.id) } });
    if (!tenant?.evolutionInstance) return res.status(400).json({ error: 'Instância não configurada' });
    await logoutInstance(tenant.evolutionInstance, tenant.evolutionApiKey);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Provisioning n8n
router.use('/:id/provision-n8n', require('./provisioning'));

// Diagnóstico + correção de tenants com trial expirado
router.post('/fix-trial-expirado', ...onlySuper, async (req, res, next) => {
  try {
    const prisma = require('../lib/prisma');
    const agora = new Date();
    const afetados = await prisma.tenant.findMany({
      where: { planoStatus: 'trial', planoVencimento: { lt: agora } },
      select: { id: true, slug: true, nome: true, plano: true, planoVencimento: true },
    });

    if (req.body.fix) {
      for (const t of afetados) {
        await prisma.tenant.update({
          where: { id: t.id },
          data: {
            planoStatus: 'ativo',
            planoVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
      }
    }

    res.json({ total: afetados.length, fix: !!req.body.fix, afetados });
  } catch (err) { next(err); }
});

module.exports = router;
