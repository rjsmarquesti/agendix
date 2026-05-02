const LEAD_COLORS = {
  novo:        'bg-blue-100 text-blue-700',
  contato:     'bg-yellow-100 text-yellow-700',
  qualificado: 'bg-cyan-100 text-cyan-700',
  proposta:    'bg-indigo-100 text-indigo-700',
  agendado:    'bg-purple-100 text-purple-700',
  convertido:  'bg-green-100 text-green-700',
  perdido:     'bg-red-100 text-red-700',
};

const AGEND_COLORS = {
  marcado:    'bg-blue-100 text-blue-700',
  confirmado: 'bg-green-100 text-green-700',
  cancelado:  'bg-red-100 text-red-700',
  realizado:  'bg-gray-100 text-gray-600',
};

const PRIORITY_COLORS = {
  baixa:   'bg-gray-100 text-gray-500',
  normal:  'bg-blue-50 text-blue-600',
  alta:    'bg-orange-100 text-orange-600',
  urgente: 'bg-red-100 text-red-700',
};

const FONTE_COLORS = {
  google_maps: 'bg-green-100 text-green-700',
  manual:      'bg-gray-100 text-gray-600',
  csv_import:  'bg-yellow-100 text-yellow-700',
  api:         'bg-violet-100 text-violet-700',
};

const LABELS = {
  // status lead
  novo: 'Novo', contato: 'Contato', qualificado: 'Qualificado',
  proposta: 'Proposta', agendado: 'Agendado', convertido: 'Convertido', perdido: 'Perdido',
  // status agend
  marcado: 'Marcado', confirmado: 'Confirmado', cancelado: 'Cancelado', realizado: 'Realizado',
  // priority
  baixa: 'Baixa', normal: 'Normal', alta: 'Alta', urgente: 'Urgente',
  // fonte
  google_maps: 'Google Maps', manual: 'Manual', csv_import: 'CSV', api: 'API',
};

export function BadgeLead({ status }) {
  const color = LEAD_COLORS[status] || 'bg-gray-100 text-gray-600';
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${color}`}>{LABELS[status] || status}</span>;
}

export function BadgeAgend({ status }) {
  const color = AGEND_COLORS[status] || 'bg-gray-100 text-gray-600';
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${color}`}>{LABELS[status] || status}</span>;
}

export function BadgePriority({ priority }) {
  const color = PRIORITY_COLORS[priority] || 'bg-gray-100 text-gray-500';
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>{LABELS[priority] || priority}</span>;
}

export function BadgeFonte({ fonte }) {
  const color = FONTE_COLORS[fonte] || 'bg-gray-100 text-gray-600';
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>{LABELS[fonte] || fonte}</span>;
}
