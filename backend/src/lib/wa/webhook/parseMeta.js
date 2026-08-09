/**
 * Parser de webhook da Meta (WhatsApp Cloud API)
 * Formato: entry[].changes[].value.messages[]
 *
 * Validação HMAC: X-Hub-Signature-256 (SHA-256 do body com webhookSecret)
 */
const crypto = require('crypto');

/**
 * Valida a assinatura do webhook da Meta.
 * Retorna true se válida.
 */
function validateMetaSignature(rawBody, signature, secret) {
  if (!secret || !signature) return false;
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * Extrai a primeira mensagem inbound do payload Meta.
 * Retorna null se não houver mensagem processável.
 */
function parseMeta(body) {
  if (body?.object !== 'whatsapp_business_account') return null;

  const changes = body?.entry?.[0]?.changes;
  if (!Array.isArray(changes)) return null;

  for (const change of changes) {
    const value    = change?.value;
    const messages = value?.messages;
    if (!Array.isArray(messages) || messages.length === 0) continue;

    const msg      = messages[0];
    const contacts = value?.contacts || [];
    const contact  = contacts.find(c => c.wa_id === msg.from);

    const type = msg.type;
    let text = null;

    if (type === 'text') {
      text = msg.text?.body;
    } else if (type === 'interactive') {
      // list_reply ou button_reply
      text = msg.interactive?.list_reply?.id
          || msg.interactive?.list_reply?.title
          || msg.interactive?.button_reply?.id
          || msg.interactive?.button_reply?.title;
    }

    if (!msg.from || !text) continue;

    return {
      from:     msg.from.replace(/^\+/, ''), // remove + se houver
      text,
      pushName: contact?.profile?.name || null,
      type,
      raw:      body,
    };
  }

  return null;
}

module.exports = { parseMeta, validateMetaSignature };
