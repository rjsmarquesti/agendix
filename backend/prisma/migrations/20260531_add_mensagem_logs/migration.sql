CREATE TYPE "MeioEnvio"   AS ENUM ('email', 'whatsapp');
CREATE TYPE "StatusEnvio" AS ENUM ('enviado', 'erro', 'pendente');

CREATE TABLE "mensagem_logs" (
  "id"          SERIAL PRIMARY KEY,
  "tenant_id"   INTEGER REFERENCES "tenants"("id") ON DELETE CASCADE,
  "lead_id"     INTEGER REFERENCES "leads"("id") ON DELETE SET NULL,
  "meio"        "MeioEnvio"   NOT NULL,
  "status"      "StatusEnvio" NOT NULL DEFAULT 'enviado',
  "para"        TEXT NOT NULL,
  "assunto"     TEXT,
  "corpo"       TEXT NOT NULL,
  "origem"      TEXT NOT NULL DEFAULT 'manual',
  "erro_msg"    TEXT,
  "usuario_id"  INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
  "criado_em"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX "mensagem_logs_tenant_id_idx"  ON "mensagem_logs"("tenant_id");
CREATE INDEX "mensagem_logs_lead_id_idx"    ON "mensagem_logs"("lead_id");
CREATE INDEX "mensagem_logs_criado_em_idx"  ON "mensagem_logs"("criado_em" DESC);
CREATE INDEX "mensagem_logs_meio_idx"       ON "mensagem_logs"("meio");
CREATE INDEX "mensagem_logs_origem_idx"     ON "mensagem_logs"("origem");
