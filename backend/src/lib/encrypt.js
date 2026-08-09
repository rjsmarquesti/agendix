const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const PREFIX    = 'enc:';

function getKey(envVar = 'ENCRYPTION_KEY') {
  const raw = process.env[envVar] || '';
  if (!raw || raw.length < 64) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`[FATAL] ${envVar} não configurada ou inválida — mínimo 64 chars hex`);
    }
    return Buffer.from('agendix_dev_key_NOT_FOR_PRODUCTION_USE_SET_ENCRYPTION_KEY_ENV_!', 'utf8').subarray(0, 32);
  }
  return Buffer.from(raw.slice(0, 64), 'hex');
}

function encrypt(plaintext) {
  if (!plaintext) return plaintext;
  if (plaintext.startsWith(PREFIX)) return plaintext;

  const key = getKey('ENCRYPTION_KEY');
  const iv  = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag   = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function _decryptWithKey(value, keyEnv) {
  const parts = value.slice(PREFIX.length).split(':');
  if (parts.length !== 3) return null;
  const [ivHex, authTagHex, ciphertextHex] = parts;
  const key        = getKey(keyEnv);
  const iv         = Buffer.from(ivHex, 'hex');
  const authTag    = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const decipher   = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

// Tenta chave atual; se falhar, tenta chave anterior (rotação sem downtime)
function decrypt(value) {
  if (!value) return value;
  if (!value.startsWith(PREFIX)) return value; // plaintext legado

  try {
    return _decryptWithKey(value, 'ENCRYPTION_KEY');
  } catch {
    if (process.env.ENCRYPTION_KEY_PREV) {
      try {
        return _decryptWithKey(value, 'ENCRYPTION_KEY_PREV');
      } catch { /* chave anterior também falhou */ }
    }
    return null;
  }
}

function normalizarModulos(m) {
  if (Array.isArray(m)) return m;
  if (!m) return ['leads', 'agendamentos'];
  if (typeof m === 'string') {
    try { return JSON.parse(m); } catch {
      return m.split(',').map(s => s.trim()).filter(Boolean);
    }
  }
  return ['leads', 'agendamentos'];
}

// Campos criptografados expandidos (Sprint 2): cnpj, telefone, email, mpAccessToken, webhookSecret
function decryptTenant(tenant) {
  if (!tenant) return tenant;

  // wa_config armazenado como JSON criptografado (TEXT)
  let waConfig = null;
  if (tenant.waConfig) {
    const decryptedJson = decrypt(tenant.waConfig);
    if (decryptedJson) {
      try { waConfig = JSON.parse(decryptedJson); } catch { waConfig = null; }
    }
  }

  return {
    ...tenant,
    modulos:         normalizarModulos(tenant.modulos),
    evolutionApiKey: decrypt(tenant.evolutionApiKey),
    n8nApiKey:       decrypt(tenant.n8nApiKey),
    smtpPass:        decrypt(tenant.smtpPass),
    cnpj:            decrypt(tenant.cnpj),
    telefone:        decrypt(tenant.telefone),
    email:           decrypt(tenant.email),
    mpAccessToken:   decrypt(tenant.mpAccessToken),
    webhookSecret:   decrypt(tenant.webhookSecret),
    waConfig,
  };
}

module.exports = { encrypt, decrypt, decryptTenant, normalizarModulos };
