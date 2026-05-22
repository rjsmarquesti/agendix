/* Cores usando os tokens do design system (CSS variables) */
const LEAD_STYLES = {
  novo:        { bg: 'var(--g-dim)',              color: 'var(--g)'   },
  contato:     { bg: 'var(--a-dim)',              color: 'var(--a-lt)' },
  qualificado: { bg: 'var(--tl-dim)',             color: 'var(--tl)'  },
  proposta:    { bg: 'rgba(139,92,246,0.12)',      color: '#a78bfa'    },
  agendado:    { bg: 'rgba(139,92,246,0.12)',      color: '#a78bfa'    },
  convertido:  { bg: 'var(--g-dim)',              color: 'var(--g)'   },
  perdido:     { bg: 'rgba(239,68,68,0.10)',       color: '#f87171'    },
};

const AGEND_STYLES = {
  marcado:    { bg: 'var(--g-dim)',              color: 'var(--g)'    },
  confirmado: { bg: 'var(--tl-dim)',             color: 'var(--tl)'   },
  realizado:  { bg: 'var(--g-dim)',              color: 'var(--g)'    },
  cancelado:  { bg: 'var(--a-dim)',              color: 'var(--a-lt)' },
  faltou:     { bg: 'rgba(239,68,68,0.10)',      color: '#f87171'     },
};

const PRIORITY_STYLES = {
  baixa:   { bg: 'rgba(120,120,160,0.10)', color: 'var(--mt-lt)' },
  normal:  { bg: 'var(--tl-dim)',          color: 'var(--tl)'    },
  alta:    { bg: 'var(--a-dim)',           color: 'var(--a-lt)'  },
  urgente: { bg: 'rgba(239,68,68,0.10)',   color: '#f87171'      },
};

const FONTE_STYLES = {
  google_maps: { bg: 'var(--g-dim)',         color: 'var(--g)'    },
  manual:      { bg: 'rgba(120,120,160,0.10)', color: 'var(--mt-lt)' },
  csv_import:  { bg: 'var(--a-dim)',         color: 'var(--a-lt)' },
  api:         { bg: 'rgba(139,92,246,0.12)', color: '#a78bfa'   },
};

const LABELS = {
  novo: 'Novo', contato: 'Contato', qualificado: 'Qualificado',
  proposta: 'Proposta', agendado: 'Agendado', convertido: 'Convertido', perdido: 'Perdido',
  marcado: 'Marcado', confirmado: 'Confirmado', cancelado: 'Cancelado', realizado: 'Realizado', faltou: 'Faltou',
  baixa: 'Baixa', normal: 'Normal', alta: 'Alta', urgente: 'Urgente',
  google_maps: 'Google Maps', manual: 'Manual', csv_import: 'CSV', api: 'API',
};

const fallback = { bg: 'rgba(120,120,160,0.10)', color: 'var(--mt-lt)' };

export function BadgeLead({ status }) {
  const s = LEAD_STYLES[status] || fallback;
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}>
      {LABELS[status] || status}
    </span>
  );
}

export function BadgeAgend({ status }) {
  const s = AGEND_STYLES[status] || fallback;
  return (
    <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ backgroundColor: s.bg, color: s.color }}>
      {LABELS[status] || status}
    </span>
  );
}

export function BadgePriority({ priority }) {
  const s = PRIORITY_STYLES[priority] || fallback;
  return (
    <span className="px-2 py-0.5 rounded text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.color }}>
      {LABELS[priority] || priority}
    </span>
  );
}

export function BadgeFonte({ fonte }) {
  const s = FONTE_STYLES[fonte] || fallback;
  return (
    <span className="px-2 py-0.5 rounded text-xs font-medium"
      style={{ backgroundColor: s.bg, color: s.color }}>
      {LABELS[fonte] || fonte}
    </span>
  );
}
