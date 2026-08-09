const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { getRedis } = require('./redis');

function generateAccessToken(payload) {
  const jti = uuidv4();
  return jwt.sign({ ...payload, jti }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
}

function generateRefreshToken(userId) {
  const jti = uuidv4();
  return jwt.sign(
    { userId, jti },
    process.env.REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

async function verifyAccessToken(token) {
  // jwt.verify lança TokenExpiredError / JsonWebTokenError se inválido
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  // Checa blacklist Redis (não-fatal se Redis indisponível)
  if (decoded.jti) {
    try {
      const blacklisted = await getRedis().get(`blacklist:${decoded.jti}`);
      if (blacklisted) {
        const err = new Error('Token revogado');
        err.name = 'TokenRevokedError';
        throw err;
      }
    } catch (err) {
      if (err.name === 'TokenRevokedError') throw err;
      // Redis fora do ar — permite o token passar (degradação segura)
    }
  }
  return decoded;
}

async function verifyRefreshToken(token) {
  const decoded = jwt.verify(
    token,
    process.env.REFRESH_SECRET || process.env.JWT_SECRET
  );
  if (decoded.jti) {
    try {
      const blacklisted = await getRedis().get(`blacklist:${decoded.jti}`);
      if (blacklisted) {
        const err = new Error('Refresh token revogado');
        err.name = 'TokenRevokedError';
        throw err;
      }
    } catch (err) {
      if (err.name === 'TokenRevokedError') throw err;
    }
  }
  return decoded;
}

async function blacklistToken(jti, ttlSecs) {
  if (!jti || ttlSecs <= 0) return;
  try {
    await getRedis().set(`blacklist:${jti}`, '1', 'EX', ttlSecs);
  } catch {
    // Redis indisponível — o token expirará naturalmente
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  blacklistToken,
};
