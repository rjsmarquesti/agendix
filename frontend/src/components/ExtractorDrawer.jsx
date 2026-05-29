import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API = (path) => `/api${path}`;

export default function ExtractorDrawer({ isOpen, onClose }) {
  const { token, tenant } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]);
  const [copiado, setCopiado] = useState(false);
  const [extensaoConectada, setExtensaoConectada] = useState(false);

  const headers = { Authorization: `Bearer ${token}`, 'X-Tenant-Slug': tenant?.slug || '' };

  const carregar = useCallback(async () => {
    try {
      const [resStats] = await Promise.all([
        fetch(API('/prospeccao/stats'), { headers }),
      ]);
      if (resStats.ok) {
        const s = await resStats.json();
        setStats(s);

        // Tenta configurar a extensão automaticamente via meta tag
        atualizarMetaTag(s.webhookUrlExtrator);
        tentarConectarExtensao(s.webhookUrlExtrator);
      }
    } catch { /* silencioso */ }
  }, [token, tenant?.slug]);

  useEffect(() => {
    if (!isOpen) return;
    carregar();
  }, [isOpen, carregar]);

  function atualizarMetaTag(url) {
    if (!url) return;
    let meta = document.querySelector('meta[name="agendix-extrator-webhook"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.name = 'agendix-extrator-webhook';
      document.head.appendChild(meta);
    }
    meta.content = url;
  }

  function tentarConectarExtensao(url) {
    if (!url || !window.chrome?.runtime) return;
    const id = localStorage.getItem('agendix_extension_id');
    if (!id) return;
    try {
      window.chrome.runtime.sendMessage(id, { type: 'set-webhook', url }, (resp) => {
        if (resp?.ok) setExtensaoConectada(true);
      });
    } catch { /* extensão não instalada */ }
  }

  async function copiarUrl() {
    if (!stats?.webhookUrlExtrator) return;
    await navigator.clipboard.writeText(stats.webhookUrlExtrator);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  function irParaProspeccao() {
    onClose();
    navigate('/prospeccao');
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Drawer */}
      <div
        className="absolute right-0 top-0 h-full w-full max-w-sm flex flex-col overflow-hidden"
        style={{
          background: 'linear-gradient(180deg, #111116 0%, #0C0C0F 100%)',
          borderLeft: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '-24px 0 80px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(0,201,122,0.15)' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#00C97A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <span className="font-semibold text-sm" style={{ color: '#F0F0F5', fontFamily: 'DM Sans, system-ui, sans-serif' }}>
              Extrator Google Maps
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: '#5A5A72' }}
            onMouseEnter={e => e.currentTarget.style.color = '#F0F0F5'}
            onMouseLeave={e => e.currentTarget.style.color = '#5A5A72'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

          {/* Status da extensão */}
          {extensaoConectada && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium" style={{ background: 'rgba(0,201,122,0.1)', color: '#00C97A', border: '1px solid rgba(0,201,122,0.2)' }}>
              <div className="w-1.5 h-1.5 rounded-full bg-current" />
              Extensão conectada automaticamente
            </div>
          )}

          {/* Webhook URL */}
          <div>
            <p className="text-xs font-medium mb-2 uppercase tracking-wider" style={{ color: '#5A5A72', fontFamily: 'DM Sans, system-ui, sans-serif' }}>
              Webhook URL
            </p>
            <div className="flex gap-2">
              <div
                className="flex-1 px-3 py-2.5 rounded-lg text-xs font-mono truncate"
                style={{ background: '#18181F', border: '1px solid rgba(255,255,255,0.08)', color: '#9090A8' }}
              >
                {stats?.webhookUrlExtrator || '—'}
              </div>
              <button
                onClick={copiarUrl}
                className="px-3 py-2.5 rounded-lg text-xs font-medium transition-all flex-shrink-0"
                style={{
                  background: copiado ? 'rgba(0,201,122,0.15)' : 'rgba(255,255,255,0.06)',
                  border: `1px solid ${copiado ? 'rgba(0,201,122,0.3)' : 'rgba(255,255,255,0.1)'}`,
                  color: copiado ? '#00C97A' : '#9090A8',
                }}
              >
                {copiado ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            <p className="text-xs mt-2" style={{ color: '#5A5A72' }}>
              Cole esta URL no campo Webhook do popup da extensão Chrome.
            </p>
          </div>

          {/* Stats */}
          {stats ? (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Total leads', valor: stats.totalLeads },
                { label: 'Via Maps', valor: stats.totalGoogleMaps },
                { label: 'Hoje', valor: stats.inseridosHoje },
                { label: 'Convertidos', valor: stats.conversoesTotal },
              ].map(({ label, valor }) => (
                <div
                  key={label}
                  className="rounded-xl p-3"
                  style={{ background: '#18181F', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <p className="text-xl font-bold mb-0.5" style={{ color: '#F0F0F5', fontFamily: 'Instrument Serif, Georgia, serif' }}>
                    {valor ?? '—'}
                  </p>
                  <p className="text-xs" style={{ color: '#5A5A72', fontFamily: 'DM Sans, system-ui, sans-serif' }}>{label}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="rounded-xl p-3 animate-pulse" style={{ background: '#18181F', border: '1px solid rgba(255,255,255,0.06)', height: '72px' }} />
              ))}
            </div>
          )}

          {/* Divider */}
          <div style={{ height: '1px', background: 'rgba(255,255,255,0.06)' }} />

          {/* Como usar */}
          <div>
            <p className="text-xs font-medium mb-3 uppercase tracking-wider" style={{ color: '#5A5A72' }}>
              Como usar
            </p>
            <div className="space-y-2.5">
              {[
                { n: '1', texto: 'Instale a extensão "Agendix Extrator" no Chrome' },
                { n: '2', texto: 'Copie a Webhook URL acima e cole no popup da extensão' },
                { n: '3', texto: 'Digite um termo de busca e clique em "Abrir Maps"' },
                { n: '4', texto: 'Aguarde a extração e clique "Enviar webhook" no popup' },
              ].map(({ n, texto }) => (
                <div key={n} className="flex gap-3 items-start">
                  <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold mt-0.5"
                    style={{ background: 'rgba(0,201,122,0.15)', color: '#00C97A' }}>
                    {n}
                  </div>
                  <p className="text-sm leading-snug" style={{ color: '#9090A8', fontFamily: 'DM Sans, system-ui, sans-serif' }}>{texto}</p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button
            onClick={irParaProspeccao}
            className="w-full py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: '#00C97A',
              color: '#0C0C0F',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#00E589'; e.currentTarget.style.boxShadow = '0 0 20px rgba(0,201,122,0.3)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#00C97A'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            Ver leads na Prospecção →
          </button>
        </div>
      </div>
    </div>
  );
}
