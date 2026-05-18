/**
 * Criptografia AES-256-GCM para campos sensíveis no banco de dados.
 * Usa ENCRYPTION_KEY do ambiente (32 bytes em hex = 64 chars).
 *
 * Formato armazenado: "iv_hex:authTag_hex:ciphertext_hex"
 * Prefixo "enc:" diferencia valores criptografados de plaintext legado.
 */
const crypto = require('crypto');

const ALGORITHM  = 'aes-256-gcm';
const PREFIX     = 'enc:';

function getKey() {
  const raw = process.env.ENCRYPTION_KEY || '';
  if (!raw || raw.length < 64) {
    // Em dev sem chave configurada, usa uma chave determinística (não segura para produção)
    return Buffer.from('agendix_dev_key_NOT_FOR_PRODUCTION_USE_SET_ENCRYPTION_KEY_ENV_!', 'utf8').subarray(0, 32);
  }
  return Buffer.from(raw.slice(0, 64), 'hex');
}

function encrypt(plaintext) {
  if (!plaintext) return plaintext;
  // Já criptografado — não re-criptografa
  if (plaintext.startsWith(PREFIX)) return plaintext;

  const key = getKey();
  const iv  = crypto.randomBytes(12); // 96 bits para GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag   = cipher.getAuthTag();

  return `${PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(value) {
  if (!value) return value;
  // Valor legado (plaintext) — retorna como está
  if (!value.startsWith(PREFIX)) return value;

  try {
    const parts = value.slice(PREFIX.length).split(':');
    if (parts.length !== 3) return value;

    const [ivHex, authTagHex, ciphertextHex] = parts;
    const key        = getKey();
    const iv         = Buffer.from(ivHex, 'hex');
    const authTag    = Buffer.from(authTagHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch {
    // Falha na descriptografia (chave trocada, dado corrompido)
    return null;
  }
}

/**
 * Descriptografa os campos sensíveis de um tenant vindo do banco.
 * Chamado pelo middleware de tenant e pelo apiTokenAuth do n8n/webhook.
 */
function decryptTenant(tenant) {
  if (!tenant) return tenant;
  return {
    ...tenant,
    modulos: typeof tenant.modulos === 'string' ? JSON.parse(tenant.modulos || '[]') : (tenant.modulos || []),
    evolutionApiKey: decrypt(tenant.evolutionApiKey),
    n8nApiKey:       decrypt(tenant.n8nApiKey),
    smtpPass:        decrypt(tenant.smtpPass),
  };
}

module.exports = { encrypt, decrypt, decryptTenant };
