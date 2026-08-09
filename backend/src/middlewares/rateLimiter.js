const { RateLimiterRedis, RateLimiterMemory } = require('rate-limiter-flexible');
const { getRedis } = require('../lib/redis');

// Insurance: in-memory fallback quando Redis indisponível
function makeInsurance(keyPrefix, points, duration) {
  return new RateLimiterMemory({ keyPrefix: keyPrefix + '_mem', points, duration });
}

function makeRedisLimiter({ keyPrefix, points, duration, blockDuration }) {
  return new RateLimiterRedis({
    storeClient: getRedis(),
    keyPrefix,
    points,
    duration,
    blockDuration: blockDuration || 0,
    insuranceLimiter: makeInsurance(keyPrefix, points, duration),
  });
}

function limiterMiddleware(limiter) {
  return async (req, res, next) => {
    try {
      await limiter.consume(req.ip);
      next();
    } catch (rej) {
      const secs = rej?.msBeforeNextReset ? Math.ceil(rej.msBeforeNextReset / 1000) : 60;
      res.set('Retry-After', String(secs));
      res.status(429).json({ error: `Muitas requisições. Tente novamente em ${secs} segundos.` });
    }
  };
}

// Login: 5 tentativas/60s, bloqueia 60s (resistente a brute force, persiste entre deploys)
const loginLimiterRL = makeRedisLimiter({
  keyPrefix: 'rl_login', points: 5, duration: 60, blockDuration: 60,
});

// Recuperação de senha: 5 tentativas/15min (dificulta enumeração de emails)
const forgotPasswordLimiterRL = makeRedisLimiter({
  keyPrefix: 'rl_forgot', points: 5, duration: 900, blockDuration: 900,
});

// Agendamento público: 20/60s, bloqueia 5min se abusar
const agendamentoPublicoLimiterRL = makeRedisLimiter({
  keyPrefix: 'rl_ag_pub', points: 20, duration: 60, blockDuration: 300,
});

// n8n/automação: tolerância alta, sem bloqueio automático
const n8nLimiterRL = makeRedisLimiter({
  keyPrefix: 'rl_n8n', points: 200, duration: 60,
});

// API geral: 300/60s, bloqueia 2min
const apiGeralLimiterRL = makeRedisLimiter({
  keyPrefix: 'rl_api', points: 300, duration: 60, blockDuration: 120,
});

// Extrator: 10 req/min por IP — max 5.000 leads/min (vs 150k sem limite específico)
const extratorLimiterRL = makeRedisLimiter({
  keyPrefix: 'rl_extrator', points: 10, duration: 60, blockDuration: 300,
});

// Register: 3 trials/hora por IP — evita criação em massa de contas
const registerLimiterRL = makeRedisLimiter({
  keyPrefix: 'rl_register', points: 3, duration: 3600, blockDuration: 3600,
});

// Agente IA webhook: 30 req/min por IP — protege custo Claude API contra flood
const agenteIaWebhookLimiterRL = makeRedisLimiter({
  keyPrefix: 'rl_agente_webhook', points: 30, duration: 60, blockDuration: 300,
});

// Cancelamento público: 10 tentativas/15min por IP — token UUID já protege brute force,
// limite reduz fingerprinting de tenants e abuso de push notifications
const cancelarLimiterRL = makeRedisLimiter({
  keyPrefix: 'rl_cancelar', points: 10, duration: 900, blockDuration: 900,
});

module.exports = {
  loginLimiter:              limiterMiddleware(loginLimiterRL),
  forgotPasswordLimiter:     limiterMiddleware(forgotPasswordLimiterRL),
  agendamentoPublicoLimiter: limiterMiddleware(agendamentoPublicoLimiterRL),
  n8nLimiter:                limiterMiddleware(n8nLimiterRL),
  apiGeralLimiter:           limiterMiddleware(apiGeralLimiterRL),
  extratorLimiter:           limiterMiddleware(extratorLimiterRL),
  registerLimiter:           limiterMiddleware(registerLimiterRL),
  agenteIaWebhookLimiter:    limiterMiddleware(agenteIaWebhookLimiterRL),
  cancelarLimiter:           limiterMiddleware(cancelarLimiterRL),
};
