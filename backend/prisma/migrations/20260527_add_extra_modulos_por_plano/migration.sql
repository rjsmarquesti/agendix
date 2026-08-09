-- Adiciona módulos 'financeiro', 'wa_atendimento' e 'agente_ia' aos tenants
-- que já tinham acesso por plano, para manter compatibilidade após mover
-- o controle de visibilidade de plano → módulo.
-- Nota: enum Plano tem apenas 'solo', 'pro', 'business' — sem 'trial'

-- financeiro: pro e business já tinham acesso
UPDATE tenants
SET modulos = CASE
  WHEN modulos::jsonb ? 'financeiro' THEN modulos
  ELSE (modulos::jsonb || '["financeiro"]'::jsonb)::text::jsonb
END
WHERE plano IN ('pro', 'business');

-- wa_atendimento: pro e business já tinham acesso
UPDATE tenants
SET modulos = CASE
  WHEN modulos::jsonb ? 'wa_atendimento' THEN modulos
  ELSE (modulos::jsonb || '["wa_atendimento"]'::jsonb)::text::jsonb
END
WHERE plano IN ('pro', 'business');

-- agente_ia: pro e business já tinham acesso
UPDATE tenants
SET modulos = CASE
  WHEN modulos::jsonb ? 'agente_ia' THEN modulos
  ELSE (modulos::jsonb || '["agente_ia"]'::jsonb)::text::jsonb
END
WHERE plano IN ('pro', 'business');
