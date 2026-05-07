const router = require('express').Router();
const prisma  = require('../lib/prisma');
const auth    = require('../middlewares/auth');

// GET /notificacoes — últimas 20 não lidas do tenant
router.get('/', auth, async (req, res, next) => {
  try {
    const notificacoes = await prisma.notificacao.findMany({
      where: { tenantId: req.tenant.id, lida: false },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    const total = await prisma.notificacao.count({
      where: { tenantId: req.tenant.id, lida: false },
    });
    res.json({ notificacoes, total });
  } catch (err) { next(err); }
});

// PUT /notificacoes/lidas — marca todas como lidas
router.put('/lidas', auth, async (req, res, next) => {
  try {
    await prisma.notificacao.updateMany({
      where: { tenantId: req.tenant.id, lida: false },
      data: { lida: true },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
