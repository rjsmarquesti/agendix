const { randomUUID } = require('crypto');
const logger = require('../lib/logger');

/**
 * Middleware de logging estruturado por requisição.
 * Anexa correlationId a cada req/res e loga método, rota, status e duração.
 */
function requestLogger(req, res, next) {
  const correlationId = req.headers['x-correlation-id'] || randomUUID();
  const start = Date.now();

  req.correlationId = correlationId;
  req.log = logger.child({ correlationId });

  res.setHeader('X-Correlation-Id', correlationId);

  res.on('finish', () => {
    const ms = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    req.log[level]({
      method:    req.method,
      url:       req.originalUrl,
      status:    res.statusCode,
      ms,
      tenantId:  req.user?.tenantId || req.tenant?.id || null,
    });
  });

  next();
}

module.exports = requestLogger;
