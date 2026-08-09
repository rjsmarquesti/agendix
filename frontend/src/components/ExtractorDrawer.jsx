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
        // Fallback: monta a URL no frontend se o backend ainda não retorna webhookUrlExtrator
        if (!s.webhookUrlExtrator && tenant?.slug) {
          s.webhookUrlExtrator = `${window.location.origin}/api/webhook/extrator/${tenant.slug}`;
        }
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
          background: 'linear-gradient(180deg, #FFFFFF 0%, #F4F4F8 100%)',
          borderLeft: '1px solid rgba(0,0,0,0.08)',
          boxShadow: '-24px 0 80px rgba(0,0,0,0.15)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.09)' }}>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(0,201,122,0.18)' }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#00C97A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <span style={{ color: '#111116', fontFamily: 'DM Sans, system-ui, sans-serif', fontSize: '15px', fontWeight: 600 }}>
              Extrator Google Maps
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: '#9090A8' }}
            onMouseEnter={e => e.currentTarget.style.color = '#111116'}
            onMouseLeave={e => e.currentTarget.style.color = '#9090A8'}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">

          {/* Status da extensão */}
          {extensaoConectada && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg font-medium" style={{ background: 'rgba(0,201,122,0.1)', color: '#00C97A', border: '1px solid rgba(0,201,122,0.25)', fontSize: '13px' }}>
              <div className="w-2 h-2 rounded-full bg-current flex-shrink-0" />
              Extensão conectada automaticamente
            </div>
          )}

          {/* Webhook URL */}
          <div>
            <p style={{ color: '#6B6B80', fontFamily: 'DM Sans, system-ui, sans-serif', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>
              Webhook URL
            </p>
            <div className="flex gap-2">
              <div
                className="flex-1 px-3 py-2.5 rounded-lg font-mono truncate"
                style={{ background: '#EDEDF2', border: '1px solid rgba(0,0,0,0.1)', color: '#333344', fontSize: '12px' }}
              >
                {stats?.webhookUrlExtrator || (tenant?.slug ? `${window.location.origin}/api/webhook/extrator/${tenant.slug}` : 'Carregando...')}
              </div>
              <button
                onClick={copiarUrl}
                className="px-4 py-2.5 rounded-lg font-semibold transition-all flex-shrink-0"
                style={{
                  background: copiado ? 'rgba(0,201,122,0.15)' : 'rgba(0,0,0,0.06)',
                  border: `1px solid ${copiado ? 'rgba(0,201,122,0.4)' : 'rgba(0,0,0,0.12)'}`,
                  color: copiado ? '#00A860' : '#444455',
                  fontSize: '13px',
                }}
              >
                {copiado ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
            <p style={{ color: '#6B6B80', fontSize: '12px', marginTop: '6px' }}>
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
                <div key={label} className="rounded-xl p-3.5" style={{ background: '#EDEDF2', border: '1px solid rgba(0,0,0,0.08)' }}>
                  <p style={{ color: '#111116', fontFamily: 'Instrument Serif, Georgia, serif', fontSize: '24px', fontWeight: 400, marginBottom: '2px' }}>
                    {valor ?? '—'}
                  </p>
                  <p style={{ color: '#6B6B80', fontFamily: 'DM Sans, system-ui, sans-serif', fontSize: '12px' }}>{label}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="rounded-xl animate-pulse" style={{ background: '#EDEDF2', border: '1px solid rgba(0,0,0,0.06)', height: '76px' }} />
              ))}
            </div>
          )}

          {/* Divider */}
          <div style={{ height: '1px', background: 'rgba(0,0,0,0.07)' }} />

          {/* Como usar */}
          <div>
            <p style={{ color: '#6B6B80', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px' }}>
              Como usar
            </p>
            <div className="space-y-3">
              {[
                { n: '1', texto: 'Baixe e instale a extensão "Agendix Extrator" no Chrome', link: 'https://drive.google.com/file/d/1cyefcdNK2uZwb0JktpGqwXKmSFDsWvMs/view?usp=sharing' },
                { n: '2', texto: 'Copie a Webhook URL acima e cole no popup da extensão' },
                { n: '3', texto: 'Digite um termo de busca e clique em "Abrir Maps"' },
                { n: '4', texto: 'Aguarde a extração e clique "Enviar leads" no popup' },
              ].map(({ n, texto, link }) => (
                <div key={n} className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center font-bold"
                    style={{ background: 'rgba(0,201,122,0.15)', color: '#00C97A', fontSize: '12px', marginTop: '1px' }}>
                    {n}
                  </div>
                  <p style={{ color: '#444455', fontFamily: 'DM Sans, system-ui, sans-serif', fontSize: '13px', lineHeight: '1.5' }}>
                    {texto}{link && (
                      <> — <a href={link} target="_blank" rel="noreferrer" style={{ color: '#00C97A', textDecoration: 'underline' }}>baixar aqui</a></>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-4" style={{ borderTop: '1px solid rgba(0,0,0,0.09)' }}>
          <button
            onClick={irParaProspeccao}
            className="w-full rounded-xl font-semibold transition-all"
            style={{
              background: '#00C97A',
              color: '#0C0C0F',
              padding: '12px 20px',
              fontSize: '14px',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#00E589'; e.currentTarget.style.boxShadow = '0 0 24px rgba(0,201,122,0.35)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#00C97A'; e.currentTarget.style.boxShadow = 'none'; }}
          >
            Ver leads na Prospecção →
          </button>
        </div>
      </div>
    </div>
  );
}
