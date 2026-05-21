const webpush = require('web-push');
const prisma   = require('./prisma');

if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    `mailto:${process.env.VAPID_EMAIL || 'suporte@divulgabr.com.br'}`,
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

async function enviarPushParaTenant(tenantId, payload) {
  if (!process.env.VAPID_PUBLIC_KEY) return;

  const subs = await prisma.pushSubscription.findMany({ where: { tenantId } });
  if (!subs.length) return;

  const expired = [];

  await Promise.allSettled(
    subs.map(sub =>
      webpush
        .sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        )
        .catch(err => {
          if (err.statusCode === 410 || err.statusCode === 404) expired.push(sub.id);
        })
    )
  );

  if (expired.length) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: expired } } });
  }
}

module.exports = { enviarPushParaTenant };
