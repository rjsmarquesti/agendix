/**
 * Campos dinâmicos de Ficha e Anamnese por nicho.
 * type: 'text' | 'textarea' | 'select' | 'date' | 'number' | 'radio'
 */

export const FICHA_FIELDS = {
  beleza_estetica: [
    { key: 'dataNascimento',          label: 'Data de Nascimento',        type: 'date' },
    { key: 'cpf',                     label: 'CPF',                       type: 'text' },
    { key: 'fototipoFitzpatrick',     label: 'Fototipo (Fitzpatrick)',     type: 'select', options: ['I – Muito claro','II – Claro','III – Médio','IV – Olivado','V – Escuro','VI – Muito escuro'] },
    { key: 'condicoesPele',           label: 'Condições de Pele',         type: 'textarea' },
    { key: 'alergias',                label: 'Alergias conhecidas',        type: 'textarea' },
    { key: 'procedimentosAnteriores', label: 'Procedimentos anteriores',   type: 'textarea' },
    { key: 'produtosUsados',          label: 'Produtos em uso',            type: 'textarea' },
  ],
  saude: [
    { key: 'dataNascimento',  label: 'Data de Nascimento',  type: 'date' },
    { key: 'cpf',             label: 'CPF',                 type: 'text' },
    { key: 'convenio',        label: 'Convênio',            type: 'text' },
    { key: 'numeroCarteirinha', label: 'Nº Carteirinha',    type: 'text' },
    { key: 'profissao',       label: 'Profissão',           type: 'text' },
    { key: 'estadoCivil',     label: 'Estado Civil',        type: 'select', options: ['Solteiro(a)','Casado(a)','Divorciado(a)','Viúvo(a)','União estável'] },
    { key: 'contatoEmergencia', label: 'Contato de emergência', type: 'text' },
  ],
  fitness: [
    { key: 'dataNascimento',    label: 'Data de Nascimento',  type: 'date' },
    { key: 'cpf',               label: 'CPF',                 type: 'text' },
    { key: 'peso',              label: 'Peso (kg)',           type: 'number' },
    { key: 'altura',            label: 'Altura (cm)',         type: 'number' },
    { key: 'imc',               label: 'IMC',                 type: 'number' },
    { key: 'percentualGordura', label: '% Gordura',           type: 'number' },
    { key: 'massaMagra',        label: 'Massa Magra (kg)',    type: 'number' },
    { key: 'objetivo', label: 'Objetivo', type: 'select', options: ['Emagrecimento','Hipertrofia','Condicionamento','Reabilitação','Performance','Saúde geral'] },
    { key: 'nivelAtividade', label: 'Nível de atividade atual', type: 'select', options: ['Sedentário','Levemente ativo','Moderado','Muito ativo','Atleta'] },
  ],
  pet: [
    { key: 'especie',   label: 'Espécie',   type: 'select', options: ['Cão','Gato','Ave','Réptil','Roedor','Peixe','Outro'] },
    { key: 'raca',      label: 'Raça',      type: 'text' },
    { key: 'sexo',      label: 'Sexo',      type: 'select', options: ['Macho','Fêmea'] },
    { key: 'castrado',  label: 'Castrado',  type: 'select', options: ['Sim','Não'] },
    { key: 'dataNascimento', label: 'Data de Nascimento', type: 'date' },
    { key: 'peso',      label: 'Peso (kg)', type: 'number' },
    { key: 'pelagem',   label: 'Pelagem / Cor', type: 'text' },
    { key: 'chip',      label: 'Microchip nº', type: 'text' },
    { key: 'tutor',     label: 'Nome do Tutor', type: 'text' },
    { key: 'contatoTutor', label: 'Contato do Tutor', type: 'text' },
  ],
};

export const ANAMNESE_FIELDS = {
  beleza_estetica: [
    { key: 'gestante',       label: 'Gestante ou lactante',      type: 'select', options: ['Não','Gestante','Lactante'] },
    { key: 'medicamentos',   label: 'Medicamentos em uso',        type: 'textarea' },
    { key: 'doencas',        label: 'Doenças ou condições',       type: 'textarea' },
    { key: 'cirurgias',      label: 'Cirurgias recentes',         type: 'textarea' },
    { key: 'fotossensivel',  label: 'Fotossensibilidade',         type: 'select', options: ['Sim','Não','Não sei'] },
    { key: 'queloides',      label: 'Tendência a queloides',      type: 'select', options: ['Sim','Não'] },
    { key: 'rosaceaAcne',    label: 'Rosácea ou acne ativa',      type: 'select', options: ['Sim','Não'] },
    { key: 'expectativas',   label: 'Expectativas do procedimento', type: 'textarea' },
    { key: 'contraindicacoes', label: 'Contraindicações relatadas', type: 'textarea' },
  ],
  saude: [
    { key: 'queixaPrincipal',    label: 'Queixa Principal',       type: 'textarea' },
    { key: 'historicoClinico',   label: 'Histórico Clínico',      type: 'textarea' },
    { key: 'medicamentosUso',    label: 'Medicamentos em Uso',    type: 'textarea' },
    { key: 'alergias',           label: 'Alergias',               type: 'textarea' },
    { key: 'cirurgias',          label: 'Cirurgias Anteriores',   type: 'textarea' },
    { key: 'historicoFamiliar',  label: 'Histórico Familiar',     type: 'textarea' },
    { key: 'habitos',            label: 'Hábitos de Vida (álcool, tabaco, atividade física)', type: 'textarea' },
    { key: 'queixasSecundarias', label: 'Queixas Secundárias',    type: 'textarea' },
  ],
  fitness: [
    { key: 'problemaCardio',       label: 'Problemas cardiovasculares',  type: 'select', options: ['Sim','Não'] },
    { key: 'pressaoArterial',      label: 'Pressão Arterial',            type: 'select', options: ['Normal','Hipertensão','Hipotensão'] },
    { key: 'diabetes',             label: 'Diabetes',                    type: 'select', options: ['Sim','Não','Pré-diabético'] },
    { key: 'fumante',              label: 'Fumante',                     type: 'select', options: ['Sim','Não','Ex-fumante'] },
    { key: 'lesoes',               label: 'Lesões ou cirurgias',         type: 'textarea' },
    { key: 'medicamentos',         label: 'Medicamentos em uso',          type: 'textarea' },
    { key: 'frequenciaExercicio',  label: 'Frequência atual de exercício', type: 'text' },
    { key: 'atividadePreferida',   label: 'Atividade física preferida',  type: 'text' },
    { key: 'dificuldades',         label: 'Dificuldades relatadas',      type: 'textarea' },
    { key: 'objetivoDetalhado',    label: 'Objetivo detalhado',          type: 'textarea' },
  ],
  pet: [
    { key: 'vacinasEmDia',     label: 'Vacinas em dia',          type: 'select', options: ['Sim','Não','Parcial'] },
    { key: 'verminose',        label: 'Vermifugação em dia',     type: 'select', options: ['Sim','Não'] },
    { key: 'doencasAnteriores', label: 'Doenças anteriores',    type: 'textarea' },
    { key: 'cirurgias',        label: 'Cirurgias realizadas',   type: 'textarea' },
    { key: 'alimentacao',      label: 'Tipo de alimentação',    type: 'select', options: ['Ração seca','Ração úmida','Alimentação natural','Misto'] },
    { key: 'alergias',         label: 'Alergias conhecidas',    type: 'textarea' },
    { key: 'comportamento',    label: 'Comportamento',          type: 'textarea' },
    { key: 'queixaAtual',      label: 'Queixa atual do tutor',  type: 'textarea' },
  ],
};

/** Retorna os campos de ficha para o nicho ativo, ou array vazio se não mapeado. */
export function getFichaFields(nicho) {
  return FICHA_FIELDS[nicho] || [];
}

/** Retorna os campos de anamnese para o nicho ativo, ou array vazio se não mapeado. */
export function getAnamneseFields(nicho) {
  return ANAMNESE_FIELDS[nicho] || [];
}
