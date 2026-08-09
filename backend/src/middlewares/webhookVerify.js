const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { decrypt } = require('../lib/encrypt');
const audit = require('../lib/audit');

// Verifica X-Webhook-Secret em webhooks da Evolution API por slug de tenant.
// Se o tenant não tiver webhookSecret configurado, passa sem verificar (retrocompatível).
async function verifyEvolutionWebhook(req, res, next) {
  try {
    const { slug } = req.params;
    if (!slug) return next();

    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { webhookSecret: true },
    });
    if (!tenant) return res.status(404).json({ error: 'Tenant não encontrado' });

    // Sem secret configurado → permite (modo de adoção gradual)
    if (!tenant.webhookSecret) return next();

    const expected = decrypt(tenant.webhookSecret);
    const provided = req.headers['x-webhook-secret'] || '';

    const valid =
      expected &&
      provided.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(provided, 'utf8'), Buffer.from(expected, 'utf8'));

    if (!valid) {
      audit.log(audit.EVENTS.WEBHOOK_FORGE_ATTEMPT, {
        ip: req.ip,
        detalhes: { slug },
      });
      return res.status(401).json({ error: 'Webhook não autorizado' });
    }

    next();
  } catch (err) {
    next(err);
  }
}

// Fase 1 (log apenas) — valida apikey da Evolution API comparando body.apikey com a
// key do tenant. A Evolution envia a key no CORPO do webhook (não no header), então
// validar por header rejeitava todos os webhooks legítimos. Em divergência apenas
// registra — não bloqueia (adoção gradual, ver AP de webhook no CLAUDE.md).
async function verificarApikeyEvolutionLog(req, tenant) {
  const storedKey = tenant?.evolutionApiKey;
  if (!storedKey) return { valido: true, motivo: 'sem_key_configurada' };

  const expected  = decrypt(storedKey) || storedKey;
  const fromBody   = typeof req.body?.apikey === 'string' ? req.body.apikey : null;
  const fromHeader = req.headers['apikey'] || req.headers['x-api-key'] || null;
  const provided   = fromBody || fromHeader;

  const valido = provided && provided === expected;
  if (!valido) {
    console.warn(`[webhook:evolution] apikey divergente — slug=${tenant.slug} (origem: ${fromBody ? 'body' : fromHeader ? 'header' : 'ausente'})`);
    await audit.log(audit.EVENTS.WEBHOOK_FORGE_ATTEMPT, {
      entidade: 'tenant', entidadeId: tenant.id, tenantId: tenant.id,
      ip: req.ip,
      detalhes: { slug: tenant.slug, origem: fromBody ? 'body' : fromHeader ? 'header' : 'ausente', fase: 'log-apenas' },
    });
  }
  return { valido, motivo: valido ? 'ok' : 'apikey_divergente' };
}

module.exports = { verifyEvolutionWebhook, verificarApikeyEvolutionLog };
