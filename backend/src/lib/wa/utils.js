function normalizePhone(tel) {
  const digits = (tel || '').replace(/\D/g, '');
  if (!digits) return digits;
  return digits.startsWith('55') ? digits : '55' + digits;
}

module.exports = { normalizePhone };
