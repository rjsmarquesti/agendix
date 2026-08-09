-- AddColumn subnicho to tenants
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "subnicho" TEXT;
