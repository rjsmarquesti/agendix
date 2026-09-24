// Guard genérico por módulo contratado (tenant.modulos, JSONB) — mesmo padrão já usado
// inline em prospeccao.js. Extraído para reuso nos módulos que hoje só exigem auth
// (fichas, anamnese, prontuarios, documentos, orcamentos, ordem_servico, processos),
// que antes deixavam qualquer tenant autenticado usar recursos fora do seu nicho/plano.
function requireModulo(nome) {
  return (req, res, next) => {
    const modulos = Array.isArray(req.tenant?.modulos) ? req.tenant.modulos : [];
    if (!modulos.includes(nome)) {
      return res.status(403).json({ error: `Módulo não disponível para esta empresa.`, modulo: nome });
    }
    next();
  };
}

module.exports = requireModulo;
