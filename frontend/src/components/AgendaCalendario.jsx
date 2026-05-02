import { useMemo } from 'react';

const STATUS_STYLE = {
  marcado:    'bg-blue-100 text-blue-800 border-blue-200',
  confirmado: 'bg-green-100 text-green-800 border-green-200',
  cancelado:  'bg-red-100 text-red-500 border-red-200 opacity-60',
  realizado:  'bg-gray-100 text-gray-600 border-gray-200',
};

function diasDaSemana(semanaInicio) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(semanaInicio);
    d.setDate(d.getDate() + i);
    return d;
  });
}

function horasDoIntervalo(inicio = '08:00', fim = '18:00') {
  const [hi, hf] = [inicio, fim].map(h => parseInt(h.split(':')[0]));
  return Array.from({ length: hf - hi }, (_, i) => {
    const h = hi + i;
    return `${String(h).padStart(2, '0')}:00`;
  });
}

function dataStr(date) {
  return date.toISOString().split('T')[0];
}

function nomeDia(date) {
  return date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
}

export default function AgendaCalendario({
  agendamentos = [],
  semanaInicio,
  diasUteis = '1,2,3,4,5',
  horarioInicio = '08:00',
  horarioFim = '18:00',
  onSlotClick,
  onAgendClick,
}) {
  const dias = useMemo(() => diasDaSemana(semanaInicio), [semanaInicio]);
  const horas = useMemo(() => horasDoIntervalo(horarioInicio, horarioFim), [horarioInicio, horarioFim]);
  const diasUteisList = diasUteis.split(',').map(Number);

  // Index: { "YYYY-MM-DD|HH:00": [agendamentos] }
  const idx = useMemo(() => {
    const m = {};
    for (const ag of agendamentos) {
      const h = ag.hora?.slice(0, 5) || '';
      const chave = `${ag.data}|${h}`;
      if (!m[chave]) m[chave] = [];
      m[chave].push(ag);
    }
    return m;
  }, [agendamentos]);

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Header */}
        <div className="grid" style={{ gridTemplateColumns: `64px repeat(7, 1fr)` }}>
          <div />
          {dias.map((d, i) => {
            const inativo = !diasUteisList.includes(d.getDay());
            return (
              <div key={i}
                className={`text-center py-2 text-xs font-semibold border-b ${inativo ? 'text-gray-300' : 'text-gray-700'}`}>
                <div className="capitalize">{nomeDia(d)}</div>
                <div className={`text-lg font-bold ${dataStr(d) === dataStr(new Date()) ? 'text-blue-600' : ''}`}>
                  {d.getDate()}
                </div>
              </div>
            );
          })}
        </div>

        {/* Grade de horários */}
        <div>
          {horas.map(hora => (
            <div key={hora} className="grid border-b" style={{ gridTemplateColumns: `64px repeat(7, 1fr)` }}>
              {/* Label de hora */}
              <div className="text-xs text-gray-400 flex items-start justify-end pr-2 pt-1 leading-none">
                {hora}
              </div>

              {dias.map((d, di) => {
                const inativo = !diasUteisList.includes(d.getDay());
                const chave = `${dataStr(d)}|${hora}`;
                const ags = idx[chave] || [];

                return (
                  <div key={di}
                    className={`min-h-[52px] border-l p-1 group relative ${inativo ? 'bg-gray-50' : 'hover:bg-blue-50/40 cursor-pointer'}`}
                    onClick={() => !inativo && ags.length === 0 && onSlotClick?.({ data: dataStr(d), hora })}>

                    {ags.length === 0 && !inativo && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <span className="text-blue-300 text-xl font-light">+</span>
                      </div>
                    )}

                    {ags.slice(0, 2).map(ag => (
                      <div key={ag.id}
                        onClick={e => { e.stopPropagation(); onAgendClick?.(ag); }}
                        title={`${ag.lead?.nome || ag.clienteNome || '—'} · ${ag.servico?.nome || ag.tipo || ''} · ${ag.status}`}
                        className={`text-xs rounded-lg border px-1.5 py-0.5 mb-0.5 truncate cursor-pointer hover:opacity-80 ${STATUS_STYLE[ag.status] || STATUS_STYLE.marcado}`}>
                        {ag.lead?.nome || ag.clienteNome || 'Lead'}
                      </div>
                    ))}
                    {ags.length > 2 && (
                      <div className="text-xs text-gray-400 px-1">+{ags.length - 2}</div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
