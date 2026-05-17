-- CreateIndex
CREATE INDEX "agendamentos_tenant_id_status_idx" ON "agendamentos"("tenant_id", "status");

-- CreateIndex
CREATE INDEX "leads_tenant_id_created_at_idx" ON "leads"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "leads_tenant_id_telefone_idx" ON "leads"("tenant_id", "telefone");

-- CreateIndex
CREATE INDEX "leads_tenant_id_email_idx" ON "leads"("tenant_id", "email");
