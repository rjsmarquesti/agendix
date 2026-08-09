const UNIVERSAIS = ['leads', 'agendamentos'];

const NICHOS = {
  beleza_estetica: {
    label: 'Beleza e Estética',
    modulosExtras: ['fichas', 'anamnese'],
    subnichos: [
      'Barbearias', 'Salões de beleza', 'Manicures', 'Pedicures', 'Nail designers',
      'Designers de sobrancelha', 'Lash designers', 'Extensão de cílios',
      'Micropigmentadoras', 'Esteticistas', 'Clínicas de estética',
      'Harmonização facial', 'Depilação', 'Depilação a laser', 'Massoterapeutas',
      'Spas', 'Podologia', 'Bronzeamento artificial', 'Maquiadores', 'Cabeleireiros',
      'Trancistas', 'Dreadmakers', 'Terapias capilares', 'Clínicas de emagrecimento',
      'Studios de beleza', 'Studio de tatuagem', 'Body piercing',
    ],
  },
  saude: {
    label: 'Saúde e Bem-estar',
    modulosExtras: ['prontuarios', 'anamnese'],
    subnichos: [
      'Psicólogos', 'Nutricionistas', 'Fisioterapeutas', 'Dentistas',
      'Clínicas odontológicas', 'Fonoaudiólogos', 'Terapeutas ocupacionais',
      'Clínicas médicas', 'Médicos particulares', 'Psiquiatras', 'Neurologistas',
      'Pediatras', 'Clínicas populares', 'Quiropraxistas', 'Acupunturistas',
      'Clínicas de pilates terapêutico', 'Home care', 'Enfermagem domiciliar',
      'Terapeutas holísticos', 'Reiki', 'Aromaterapia', 'Osteopatas', 'Sexólogos',
      'Coaches de saúde', 'Consultórios particulares', 'Ótica',
    ],
  },
  fitness: {
    label: 'Fitness e Esporte',
    modulosExtras: ['fichas', 'anamnese'],
    subnichos: [
      'Personal trainers', 'Academias', 'Studios fitness', 'Crossfit', 'Pilates',
      'Yoga', 'Funcional', 'Artes marciais', 'Escolas de dança',
      'Professores particulares', 'Natação', 'Treinamento esportivo',
      'Avaliação física', 'Centros de performance', 'Studio de spinning',
    ],
  },
  educacao: {
    label: 'Educação e Aulas',
    modulosExtras: [],
    subnichos: [
      'Professores particulares', 'Reforço escolar', 'Escolas de idiomas',
      'Cursos livres', 'Mentores', 'Coaches', 'Consultores educacionais',
      'Aulas de música', 'Aulas de canto', 'Escolas de informática',
      'Aulas online', 'Pré-vestibulares', 'Autoescolas', 'Cursos profissionalizantes',
    ],
  },
  servicos_profissionais: {
    label: 'Serviços Profissionais',
    modulosExtras: ['documentos', 'ordem_servico', 'processos'],
    subnichos: [
      'Advogados', 'Escritórios jurídicos', 'Contadores', 'Consultores financeiros',
      'Corretores de imóveis', 'Consultores empresariais', 'Agências de marketing',
      'Social media', 'Designers gráficos', 'Desenvolvedores', 'Arquitetos',
      'Engenheiros', 'Despachantes', 'Consultorias em geral', 'Agências de viagem',
      'Consultores de RH',
    ],
  },
  automotivo: {
    label: 'Automotivo',
    modulosExtras: ['orcamentos', 'ordem_servico'],
    subnichos: [
      'Lava jato', 'Estética automotiva', 'Mecânicas', 'Troca de óleo',
      'Alinhamento e balanceamento', 'Insulfilm', 'Som automotivo',
      'Martelinho de ouro', 'Funilaria', 'Vistoria veicular',
    ],
  },
  pet: {
    label: 'Pet',
    modulosExtras: ['fichas', 'anamnese'],
    subnichos: [
      'Banho e tosa', 'Clínicas veterinárias', 'Veterinários', 'Adestradores',
      'Hotel pet', 'Pet sitter', 'Creche pet',
    ],
  },
  eventos: {
    label: 'Eventos e Locações',
    modulosExtras: [],
    subnichos: [
      'Estúdios fotográficos', 'Fotógrafos', 'Videomakers', 'Espaços para eventos',
      'Churrasqueiras', 'Quadras esportivas', 'Salões de festas', 'Coworkings',
      'Salas de reunião', 'Locação de equipamentos',
    ],
  },
  residencial: {
    label: 'Serviços Residenciais',
    modulosExtras: ['orcamentos', 'ordem_servico'],
    subnichos: [
      // Elétrica e eletrônica
      'Eletricista residencial',
      'Técnico de ar-condicionado / Refrigerista',
      'Técnico em fechadura eletrônica',
      'Instalador de portão eletrônico',
      'Técnico em interfone',
      'Técnico de informática',
      // Hidráulica
      'Encanador / Bombeiro hidráulico',
      'Instalador de chuveiro',
      'Técnico em aquecedor a gás',
      'Desentupidora',
      'Limpeza de caixa d\'água',
      'Caça vazamentos',
      // Construção e reforma
      'Pedreiro',
      'Azulejista',
      'Gesseiro',
      'Pintor residencial',
      'Serralheiro',
      'Vidraceiro',
      'Marceneiro',
      'Montador de móveis',
      'Instalador de cortinas e persianas',
      'Instalador de papel de parede',
      'Telhadista',
      'Impermeabilização',
      // Limpeza e conservação
      'Diarista / Limpeza residencial',
      'Limpeza pós-obra',
      'Limpeza de sofá e estofado',
      'Limpeza de colchão',
      'Limpeza de tapetes',
      'Limpeza de piscinas / Piscineiro',
      'Dedetização',
      // Jardim e áreas externas
      'Jardineiro',
      'Paisagista',
      // Demais
      'Marido de aluguel / Handyman',
      'Chaveiro',
    ],
  },
  geral: {
    label: 'Geral',
    modulosExtras: [],
    subnichos: [],
  },
};

function modulosPorNicho(nicho) {
  const n = NICHOS[nicho] || NICHOS.geral;
  return [...UNIVERSAIS, ...n.modulosExtras];
}

module.exports = { NICHOS, UNIVERSAIS, modulosPorNicho };
