/**
 * Parser de webhook da Evolution API (v1 e v2)
 * Retorna null se não for mensagem inbound processável.
 */
function parseEvolution(body) {
  const event = body?.event;
  if (event !== 'messages.upsert') return null;

  const msg = body?.data;
  if (!msg || msg.key?.fromMe) return null;

  const remoteJid = msg.key?.remoteJid || '';
  if (remoteJid.endsWith('@g.us')) return null; // ignora grupos

  const phone = remoteJid.replace('@s.whatsapp.net', '');
  const text  =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId;

  if (!phone || !text) return null;

  return {
    from:     phone,
    text,
    pushName: msg.pushName || msg.notifyName || null,
    type:     'text',
    raw:      body,
  };
}

/** Verifica se é evento de conexão (conexão/ban) */
function parseEvolutionConnection(body) {
  if (body?.event !== 'connection.update') return null;
  const data        = body?.data || {};
  const state       = data.state;
  const reasonCode  = data.statusReason ?? data.lastDisconnect?.error?.output?.statusCode;
  const isBanned    = state === 'close' && reasonCode === 401;
  const isDown      = state === 'close' || state === 'connecting';
  return { state, isBanned, isDown };
}

module.exports = { parseEvolution, parseEvolutionConnection };
