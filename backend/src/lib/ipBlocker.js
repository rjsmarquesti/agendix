const { getRedis } = require('./redis');
const audit = require('./audit');

// Escalada de bloqueio por IP (contagem acumulativa por 24h)
const ESCALADA = [
  { minCount: 1, blockSecs: 60 },
  { minCount: 2, blockSecs: 900 },
  { minCount: 3, blockSecs: 3600 },
  { minCount: 4, blockSecs: 86400 },
];

function getBlockSecs(count) {
  for (let i = ESCALADA.length - 1; i >= 0; i--) {
    if (count >= ESCALADA[i].minCount) return ESCALADA[i].blockSecs;
  }
  return 60;
}

async function blockEscalation(ip, { userId, tenantId } = {}) {
  try {
    const redis = getRedis();
    const countKey = `ipblock:count:${ip}`;
    const blockKey = `ipblock:block:${ip}`;

    const count = await redis.incr(countKey);
    await redis.expire(countKey, 86400); // contador expira em 24h

    const blockSecs = getBlockSecs(count);
    await redis.set(blockKey, String(count), 'EX', blockSecs);

    if (count >= 4) {
      audit.log(audit.EVENTS.IP_BLOCKED, {
        ip, userId, tenantId,
        detalhes: { count, blockSecs, severity: 'critical' },
      });
    }
  } catch {
    // Redis indisponível — não bloqueia, apenas registra
  }
}

async function isBlocked(ip) {
  try {
    const blocked = await getRedis().get(`ipblock:block:${ip}`);
    return !!blocked;
  } catch {
    return false; // Redis fora do ar — não bloqueia
  }
}

async function checkIpBlock(req, res, next) {
  try {
    if (await isBlocked(req.ip)) {
      return res.status(403).json({ error: 'Acesso temporariamente bloqueado. Tente novamente mais tarde.' });
    }
    next();
  } catch {
    next();
  }
}

module.exports = { blockEscalation, isBlocked, checkIpBlock };
