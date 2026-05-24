-- Reestruturação de planos: basico/pro/premium/business → solo/pro/business
-- Passo 1: adicionar novo valor ao enum
ALTER TYPE "Plano" ADD VALUE 'solo';

-- Passo 2: migrar dados existentes
UPDATE "tenants" SET plano = 'solo'     WHERE plano = 'basico';
UPDATE "tenants" SET plano = 'business' WHERE plano = 'premium';
UPDATE "tenants" SET "plano_downgrade_pendente" = 'solo'
  WHERE "plano_downgrade_pendente" = 'basico';
UPDATE "tenants" SET "plano_downgrade_pendente" = 'business'
  WHERE "plano_downgrade_pendente" = 'premium';

-- Passo 3: recriar o enum sem basico/premium
ALTER TYPE "Plano" RENAME TO "Plano_old";
CREATE TYPE "Plano" AS ENUM ('solo', 'pro', 'business');

-- Passo 4: alterar colunas para usar o novo tipo
ALTER TABLE "tenants"
  ALTER COLUMN plano TYPE "Plano" USING plano::text::"Plano",
  ALTER COLUMN plano SET DEFAULT 'solo';

ALTER TABLE "tenants"
  ALTER COLUMN "plano_downgrade_pendente" TYPE "Plano"
  USING "plano_downgrade_pendente"::text::"Plano";

-- Passo 5: remover tipo antigo
DROP TYPE "Plano_old";
