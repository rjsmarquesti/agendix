/**
 * Factory de providers WA.
 * Retorna o adapter correto baseado em tenant.waProvider.
 * Todos os adapters implementam: send(tel, msg), sendList(tel, slots, data), instanceKey
 */

const EvolutionAdapter = require('./EvolutionAdapter');
const MetaAdapter      = require('./MetaAdapter');
const TwilioAdapter    = require('./TwilioAdapter');
const ZApiAdapter      = require('./ZApiAdapter');

function getWaProvider(tenant) {
  const provider = tenant.waProvider || 'evolution';
  const cfg      = tenant.waConfig   || {};

  switch (provider) {
    case 'meta':    return new MetaAdapter(tenant, cfg);
    case 'twilio':  return new TwilioAdapter(tenant, cfg);
    case 'zapi':    return new ZApiAdapter(tenant, cfg);
    default:        return new EvolutionAdapter(tenant);
  }
}

/** Chave única de instância por tenant (usada no circuit breaker e na fila) */
function getProviderKey(tenant) {
  const provider = tenant.waProvider || 'evolution';
  const cfg      = tenant.waConfig   || {};
  switch (provider) {
    case 'meta':   return `meta:${cfg.phoneNumberId   || tenant.id}`;
    case 'twilio': return `twilio:${cfg.accountSid    || tenant.id}`;
    case 'zapi':   return `zapi:${cfg.instanceId      || tenant.id}`;
    default:       return tenant.evolutionInstance     || `evolution:${tenant.id}`;
  }
}

const { normalizePhone } = require('./utils');

module.exports = { getWaProvider, getProviderKey, normalizePhone };
