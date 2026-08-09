CREATE TABLE "lead_atividades" (
  "id" SERIAL PRIMARY KEY,
  "tenant_id" INTEGER NOT NULL REFERENCES "tenants"("id") ON DELETE CASCADE,
  "lead_id" INTEGER NOT NULL REFERENCES "leads"("id") ON DELETE CASCADE,
  "user_id" INTEGER REFERENCES "users"("id") ON DELETE SET NULL,
  "tipo" TEXT NOT NULL,
  "descricao" TEXT,
  "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "lead_atividades_lead_id_idx" ON "lead_atividades"("lead_id");
CREATE INDEX "lead_atividades_tenant_id_idx" ON "lead_atividades"("tenant_id");
