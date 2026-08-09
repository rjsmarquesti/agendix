-- Corrige tenants cujo campo modulos foi armazenado como string JSON em vez de array JSON.
-- Ex: "leads,agendamentos" ou '"leads,agendamentos"' → '["leads","agendamentos"]'
UPDATE tenants
SET modulos = '["leads","agendamentos"]'::jsonb
WHERE jsonb_typeof(modulos) != 'array';
