// Mock de otplib para o ambiente Jest.
// otplib -> @otplib/plugin-base32-scure -> @scure/base é ESM-only (sem build CJS),
// o que quebra o require() do Jest ao carregar server.js -> routes/auth.js -> otplib.
// Nenhum dos test suites atuais exercita os endpoints de TOTP (login 2FA / setup 2FA),
// então o stub só precisa existir para o import não falhar.
const authenticator = {
  generateSecret: () => 'MOCKSECRET',
  keyuri: (email, issuer, secret) => `otpauth://totp/${issuer}:${email}?secret=${secret}&issuer=${issuer}`,
  verify: () => false,
  generate: () => '000000',
};

module.exports = { authenticator };
