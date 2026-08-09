const pino = require('pino');

const redact = {
  paths: ['req.headers.authorization', 'body.senha', 'body.password', 'body.apiToken', 'body.token'],
  censor: '[REDACTED]',
};

function buildTransports() {
  const targets = [];

  if (process.env.NODE_ENV === 'development') {
    targets.push({ target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } });
  }

  // Loki: ativo apenas se LOKI_URL estiver configurado
  if (process.env.LOKI_URL) {
    targets.push({
      target: 'pino-loki',
      options: {
        host: process.env.LOKI_URL,
        labels: { app: 'agendix-backend', env: process.env.NODE_ENV || 'production' },
        batching: true,
        interval: 5,
      },
    });
  }

  if (targets.length === 0) return undefined;
  if (targets.length === 1) return targets[0];
  return { targets };
}

const transport = buildTransports();

const logger = pino({ level: process.env.LOG_LEVEL || 'info', redact, transport });

module.exports = logger;
