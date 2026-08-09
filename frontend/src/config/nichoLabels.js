/**
 * Labels técnicos por nicho para os módulos extras.
 * nav   = texto no menu lateral
 * title = título da página
 * desc  = descrição curta exibida no placeholder "em desenvolvimento"
 */
export const NICHO_MODULO_LABELS = {
  beleza_estetica: {
    fichas:      { nav: 'Fichas de Clientes',        title: 'Fichas de Clientes',        desc: 'Ficha técnica completa de cada cliente.' },
    anamnese:    { nav: 'Anamnese Estética',          title: 'Anamnese Estética',          desc: 'Histórico de saúde e preferências estéticas.' },
  },
  saude: {
    prontuarios: { nav: 'Prontuários',               title: 'Prontuários Clínicos',       desc: 'Registro clínico completo dos pacientes.' },
    anamnese:    { nav: 'Anamnese Clínica',           title: 'Anamnese Clínica',           desc: 'Histórico de saúde e queixas do paciente.' },
  },
  fitness: {
    fichas:      { nav: 'Avaliação Física',           title: 'Fichas de Avaliação Física', desc: 'Medidas, composição corporal e histórico de treino.' },
    anamnese:    { nav: 'Anamnese Física',             title: 'Anamnese Física',            desc: 'Histórico de saúde e limitações físicas.' },
  },
  pet: {
    fichas:      { nav: 'Fichas dos Animais',         title: 'Fichas dos Animais',         desc: 'Cadastro clínico e histórico de cada animal.' },
    anamnese:    { nav: 'Anamnese Veterinária',        title: 'Anamnese Veterinária',       desc: 'Histórico de saúde, vacinas e tratamentos.' },
  },
  automotivo: {
    orcamentos:  { nav: 'Orçamentos',                 title: 'Orçamentos de Serviço',      desc: 'Orçamentos e aprovações de serviços automotivos.' },
  },
  servicos_profissionais: {
    documentos:  { nav: 'Documentos do Cliente',      title: 'Documentos',                 desc: 'Contratos, procurações e documentos do cliente.' },
  },
  // servicos_tecnicos_residenciais foi fundido em residencial (migração 20260526j)
  residencial: {
    orcamentos:  { nav: 'Orçamentos de Serviço',      title: 'Orçamentos de Serviço',      desc: 'Orçamentos técnicos, materiais e mão de obra.' },
  },
  educacao: {},
  eventos: {},
  geral: {},
};

/**
 * Retorna o label de um módulo para o nicho ativo.
 * @param {string} nicho  - tenant.nichoLabel (ex: 'beleza_estetica')
 * @param {string} modulo - chave do módulo (ex: 'fichas', 'anamnese')
 * @param {'nav'|'title'|'desc'} tipo
 * @param {string} fallback
 */
export function getNichoLabel(nicho, modulo, tipo, fallback) {
  return NICHO_MODULO_LABELS[nicho]?.[modulo]?.[tipo] ?? fallback;
}
