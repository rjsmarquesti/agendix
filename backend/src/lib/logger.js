const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  // Em produção: JSON puro. Em dev: formatação legível.
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } }
    : undefined,
  redact: {
    paths: ['req.headers.authorization', 'body.senha', 'body.password', 'body.apiToken', 'body.token'],
    censor: '[REDACTED]',
  },
});

module.exports = logger;
