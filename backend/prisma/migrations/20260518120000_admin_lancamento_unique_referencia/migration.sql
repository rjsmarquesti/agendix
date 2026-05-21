-- Idempotência de webhook Mercado Pago: impede AdminLancamento duplicado
-- por mesmo subscription ID (referencia) + categoria.
-- NULL values não violam o constraint (comportamento padrão do PostgreSQL).
CREATE UNIQUE INDEX IF NOT EXISTS "admin_lancamentos_referencia_categoria_key"
  ON "admin_lancamentos"("referencia", "categoria")
  WHERE "referencia" IS NOT NULL;
