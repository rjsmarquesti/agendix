/**
 * Parser de webhook da Z-API
 * Formato JSON próprio da Z-API
 */
function parseZApi(body) {
  // Z-API envia diferentes eventos; só nos interessa mensagens recebidas
  if (body?.isNewsletter) return null;
  if (body?.fromMe)       return null;

  const phone = (body?.phone || '').replace(/\D/g, '');
  const text  =
    body?.text?.message ||
    body?.message?.conversation ||
    body?.listResponseMessage?.singleSelectReply?.selectedRowId ||
    body?.buttonsResponseMessage?.selectedButtonId;

  if (!phone || !text) return null;

  return {
    from:     phone,
    text,
    pushName: body?.senderName || body?.name || null,
    type:     'text',
    raw:      body,
  };
}

module.exports = { parseZApi };
