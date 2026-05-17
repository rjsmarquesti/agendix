#!/bin/sh
set -e

# Remove entrada de migration duplicada/falha antes de rodar migrate deploy
npx prisma db execute --url "$DATABASE_URL" --stdin << 'SQL'
UPDATE "_prisma_migrations"
SET rolled_back_at = NOW()
WHERE migration_name = '20260517203404_add_totp_2fa'
  AND finished_at IS NULL
  AND rolled_back_at IS NULL;
SQL

npx prisma migrate deploy
node prisma/seed.js
node server.js
