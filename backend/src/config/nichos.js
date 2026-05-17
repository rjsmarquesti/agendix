const UNIVERSAIS = ['leads', 'agendamentos'];

const NICHOS = {
  estetica: {
    label: 'Estética',
    modulosExtras: ['fichas', 'anamnese'],
  },
  saude: {
    label: 'Saúde / Clínica',
    modulosExtras: ['prontuarios', 'anamnese'],
  },
  advocacia: {
    label: 'Advocacia',
    modulosExtras: ['processos', 'documentos'],
  },
  construcao: {
    label: 'Construção / Reforma',
    modulosExtras: ['orcamentos'],
  },
  geral: {
    label: 'Geral',
    modulosExtras: [],
  },
};

function modulosPorNicho(nicho) {
  const n = NICHOS[nicho] || NICHOS.geral;
  return [...UNIVERSAIS, ...n.modulosExtras];
}

module.exports = { NICHOS, UNIVERSAIS, modulosPorNicho };
