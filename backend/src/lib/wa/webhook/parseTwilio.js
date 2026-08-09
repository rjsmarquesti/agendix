/**
 * Parser de webhook da Twilio (form-encoded)
 * Headers: X-Twilio-Signature
 * Body: From=whatsapp:+5511...&To=whatsapp:+5511...&Body=...
 *
 * Validação: HMAC-SHA1 do URL + params ordenados alfabeticamente
 */
const crypto = require('crypto');

/**
 * Valida a assinatura Twilio.
 * url: URL completa do webhook (incluindo https://)
 * params: objeto com todos os campos do POST form-encoded
 */
function validateTwilioSignature(authToken, signature, url, params) {
  if (!authToken || !signature) return false;
  const sortedKeys = Object.keys(params).sort();
  const str = url + sortedKeys.reduce((acc, k) => acc + k + params[k], '');
  const expected = crypto.createHmac('sha1', authToken).update(str).digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * Extrai mensagem do payload Twilio (form-encoded já parseado pelo express.urlencoded).
 */
function parseTwilio(body) {
  const from = (body?.From || '').replace('whatsapp:+', '').replace('whatsapp:', '');
  const text = body?.Body;
  const name = body?.ProfileName || null;

  if (!from || !text) return null;

  return {
    from:     from.replace(/^\+/, ''),
    text,
    pushName: name,
    type:     'text',
    raw:      body,
  };
}

module.exports = { parseTwilio, validateTwilioSignature };
