const Redis = require('ioredis');

let client;

function getRedis() {
  if (!client) {
    client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      retryStrategy: (times) => Math.min(times * 200, 5000),
      enableOfflineQueue: false, // falha rápido quando desconectado → insurance limiter assume
      maxRetriesPerRequest: 1,
    });
    client.on('error', (err) => {
      // Suprime log de reconexão ruidoso; mantém erros reais
      if (!err.message?.includes('ECONNREFUSED') && !err.message?.includes('connect ETIMEDOUT')) {
        console.error('[redis]', err.message);
      }
    });
  }
  return client;
}

module.exports = { getRedis };
