-- Sprint 3 Segurança: RBAC granular por usuário
CREATE TABLE IF NOT EXISTS "user_permissions" (
  "id"       SERIAL PRIMARY KEY,
  "user_id"  INTEGER NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "resource" TEXT NOT NULL,
  "action"   TEXT NOT NULL,
  "granted"  BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "user_permissions_user_id_resource_action_key" UNIQUE ("user_id", "resource", "action")
);

CREATE INDEX IF NOT EXISTS "user_permissions_user_id_idx" ON "user_permissions"("user_id");
