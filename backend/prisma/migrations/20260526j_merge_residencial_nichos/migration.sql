-- Migração: fundir servicos_tecnicos_residenciais → residencial
-- Tenants com o nicho antigo passam a usar a chave unificada.
-- Orçamentos, módulos e dados NÃO são perdidos — o tenant continua com
-- os mesmos módulos ativos; o modulosPorNicho('residencial') já inclui 'orcamentos'.

UPDATE tenants
SET nicho_label = 'residencial'
WHERE nicho_label = 'servicos_tecnicos_residenciais';
