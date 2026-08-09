-- Suporte a múltiplos providers de WhatsApp: Evolution API, Meta (Cloud API), Twilio, Z-API
-- wa_config armazena credenciais específicas do provider como JSON criptografado (TEXT)

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS wa_provider TEXT NOT NULL DEFAULT 'evolution';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS wa_config TEXT;
