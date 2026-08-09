import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api';

const TIPO_ICON = {
  lembrete_enviado: { icon: '✓',  bg: 'bg-green-100 dark:bg-green-900/30',  text: 'text-green-600 dark:text-green-400' },
  lembrete_falhou:  { icon: '!',  bg: 'bg-red-100 dark:bg-red-900/30',      text: 'text-red-600 dark:text-red-400' },
  agendamento_hoje: { icon: '📅', bg: 'bg-blue-100 dark:bg-blue-900/30',    text: 'text-blue-600 dark:text-blue-400' },
  wa_bounce:        { icon: '⚠',  bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-600 dark:text-orange-400' },
};

function fmtTempo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60000);
  if (min < 1)  return 'agora';
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  if (h < 24)   return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function NotificacaoBell() {
  const [notificacoes, setNotificacoes] = useState([]);
  const [total, setTotal]               = useState(0);
  const [aberto, setAberto]             = useState(false);
  const ref = useRef(null);

  async function carregar() {
    try {
      const d = await api.get('/notificacoes');
      setNotificacoes(d.notificacoes || []);
      setTotal(d.total || 0);
    } catch { /* silencioso */ }
  }

  async function marcarLidas() {
    try {
      await api.put('/notificacoes/lidas');
      setNotificacoes([]);
      setTotal(0);
    } catch { /* silencioso */ }
  }

  useEffect(() => {
    carregar();
    const id = setInterval(carregar, 60000);
    return () => clearInterval(id);
  }, []);

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setAberto(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function toggle() {
    if (!aberto && total > 0) marcarLidas();
    setAberto(v => !v);
  }

  return (
    <div className="relative" ref={ref}>
      <button onClick={toggle}
        title="Notificações"
        className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {total > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {aberto && (
        <div className="absolute right-0 top-11 w-80 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">Notificações</span>
          </div>

          {notificacoes.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-400 dark:text-gray-500">
              Nenhuma notificação
            </div>
          ) : (
            <ul className="max-h-80 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700">
              {notificacoes.map(n => {
                const s = TIPO_ICON[n.tipo] || TIPO_ICON.agendamento_hoje;
                return (
                  <li key={n.id} className="px-4 py-3 flex gap-3 items-start hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <span className={`mt-0.5 w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${s.bg} ${s.text}`}>
                      {s.icon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug">{n.titulo}</p>
                      {n.corpo && (
                        <p className={`text-xs text-gray-500 dark:text-gray-400 mt-0.5 ${n.tipo === 'wa_bounce' ? 'whitespace-normal' : 'truncate'}`}>
                          {n.corpo}
                        </p>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0 mt-0.5">{fmtTempo(n.createdAt)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
