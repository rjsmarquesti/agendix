const router = require('express').Router();
const audit = require('../lib/audit');
const { blockEscalation } = require('../lib/ipBlocker');

// Endpoints que atacantes tentam — qualquer hit = ban imediato 24h
const HONEYPOTS = [
  { method: 'get',  path: '/api/admin/debug' },
  { method: 'get',  path: '/api/v0/users' },
  { method: 'post', path: '/api/users/export' },
  { method: 'get',  path: '/api/admin/config/export' },
];

async function handleHoneypot(req, res) {
  const ip = req.ip;

  // Incrementa direto para count=4 → bloqueia 24h
  try {
    const { getRedis } = require('../lib/redis');
    const redis = getRedis();
    await redis.set(`ipblock:count:${ip}`, '4', 'EX', 86400);
  } catch { /* Redis fora do ar */ }

  await blockEscalation(ip);

  audit.log(audit.EVENTS.HONEYPOT_HIT, {
    ip,
    detalhes: { method: req.method, path: req.path, ua: req.headers['user-agent'] },
  });

  // Resposta plausível para não revelar que é um honeypot
  res.status(200).json({ status: 'ok', data: [] });
}

for (const { method, path } of HONEYPOTS) {
  router[method](path, handleHoneypot);
}

module.exports = router;
