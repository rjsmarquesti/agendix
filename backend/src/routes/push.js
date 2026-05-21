const router = require('express').Router();
const prisma  = require('../lib/prisma');

// GET /api/push/vapid-key — chave pública VAPID (sem auth)
router.get('/vapid-key', (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return res.status(503).json({ error: 'Push não configurado.' });
  res.json({ publicKey: key });
});

// POST /api/push/subscribe — registra ou atualiza subscription do usuário
router.post('/subscribe', async (req, res, next) => {
  try {
    const { endpoint, p256dh, auth } = req.body;
    if (!endpoint || !p256dh || !auth)
      return res.status(400).json({ error: 'endpoint, p256dh e auth são obrigatórios.' });

    const existing = await prisma.pushSubscription.findFirst({
      where: { userId: req.user.id, endpoint },
    });

    if (existing) {
      await prisma.pushSubscription.update({
        where: { id: existing.id },
        data: { p256dh, auth },
      });
    } else {
      await prisma.pushSubscription.create({
        data: { tenantId: req.tenant.id, userId: req.user.id, endpoint, p256dh, auth },
      });
    }

    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /api/push/unsubscribe — remove subscription
router.post('/unsubscribe', async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'endpoint obrigatório.' });

    await prisma.pushSubscription.deleteMany({
      where: { userId: req.user.id, endpoint },
    });

    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
