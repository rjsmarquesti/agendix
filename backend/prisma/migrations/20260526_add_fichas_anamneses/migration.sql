-- Fichas de clientes (dados cadastrais + campos dinâmicos por nicho)
CREATE TABLE fichas_clientes (
  id          SERIAL PRIMARY KEY,
  tenant_id   INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id     INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  nome        TEXT NOT NULL,
  telefone    TEXT,
  email       TEXT,
  campos      JSONB NOT NULL DEFAULT '{}',
  observacoes TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_fichas_tenant_created ON fichas_clientes(tenant_id, created_at);
CREATE INDEX idx_fichas_tenant_lead    ON fichas_clientes(tenant_id, lead_id);

-- Anamnese (questionário clínico/estético/físico por nicho)
CREATE TABLE anamneses (
  id            SERIAL PRIMARY KEY,
  tenant_id     INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  ficha_id      INTEGER REFERENCES fichas_clientes(id) ON DELETE SET NULL,
  lead_id       INTEGER REFERENCES leads(id) ON DELETE SET NULL,
  nome_cliente  TEXT NOT NULL,
  campos        JSONB NOT NULL DEFAULT '{}',
  observacoes   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_anamneses_tenant_created ON anamneses(tenant_id, created_at);
CREATE INDEX idx_anamneses_tenant_ficha   ON anamneses(tenant_id, ficha_id);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER fichas_updated_at
  BEFORE UPDATE ON fichas_clientes FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER anamneses_updated_at
  BEFORE UPDATE ON anamneses FOR EACH ROW EXECUTE FUNCTION set_updated_at();
