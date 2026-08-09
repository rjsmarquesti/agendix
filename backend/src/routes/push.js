const router = require('express').Router();
const prisma  = require('../lib/prisma');
const auth    = require('../middlewares/auth');

// GET /api/push/vapid-key — chave pública VAPID (sem auth)
router.get('/vapid-key', (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return res.status(503).json({ error: 'Push não configurado.' });
  res.json({ publicKey: key });
});

// POST /api/push/subscribe — registra ou atualiza subscription do usuário
router.post('/subscribe', auth, async (req, res, next) => {
  try {
    const { endpoint, p256dh, auth: authKey } = req.body;
    if (!endpoint || !p256dh || !authKey)
      return res.status(400).json({ error: 'endpoint, p256dh e auth são obrigatórios.' });

    const userId   = req.user.id;
    const tenantId = req.tenant?.id || null;

    const existing = await prisma.pushSubscription.findFirst({ where: { endpoint } });

    if (existing) {
      await prisma.pushSubscription.update({
        where: { id: existing.id },
        data: { p256dh, auth: authKey },
      });
    } else {
      await prisma.pushSubscription.create({
        data: {
          tenant: { connect: { id: tenantId } },
          user:   { connect: { id: userId } },
          endpoint, p256dh, auth: authKey,
        },
      });
    }

    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/push/unsubscribe — remove subscription (endpoint é globalmente único)
router.post('/unsubscribe', async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'endpoint obrigatório.' });

    await prisma.pushSubscription.deleteMany({ where: { endpoint } });

    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
