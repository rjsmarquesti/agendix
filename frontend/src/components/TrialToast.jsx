import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

const STORAGE_KEY_SHOWN  = 'trial_last_shown';
const STORAGE_KEY_NAV    = 'trial_nav_count';
const NAV_THRESHOLD      = 5;
const AUTO_DISMISS_MS    = 7000;

function getColor(dias, tipo) {
  if (tipo === 'anual') {
    if (dias > 15) return { accent: '#00C97A', bg: 'rgba(0,201,122,0.10)',  border: 'rgba(0,201,122,0.25)'  };
    if (dias > 7)  return { accent: '#F5A623', bg: 'rgba(245,166,35,0.10)', border: 'rgba(245,166,35,0.25)' };
    if (dias > 3)  return { accent: '#F97316', bg: 'rgba(249,115,22,0.10)', border: 'rgba(249,115,22,0.25)' };
    return          { accent: '#FF4757', bg: 'rgba(255,71,87,0.10)',  border: 'rgba(255,71,87,0.25)'  };
  }
  if (dias >= 11) return { accent: '#00C97A', bg: 'rgba(0,201,122,0.10)',  border: 'rgba(0,201,122,0.25)'  };
  if (dias >= 8)  return { accent: '#84CC16', bg: 'rgba(132,204,22,0.10)', border: 'rgba(132,204,22,0.25)' };
  if (dias >= 5)  return { accent: '#F5A623', bg: 'rgba(245,166,35,0.10)', border: 'rgba(245,166,35,0.25)' };
  if (dias >= 2)  return { accent: '#F97316', bg: 'rgba(249,115,22,0.10)', border: 'rgba(249,115,22,0.25)' };
  return           { accent: '#FF4757', bg: 'rgba(255,71,87,0.10)',  border: 'rgba(255,71,87,0.25)'  };
}

function shouldShow() {
  const shown = sessionStorage.getItem(STORAGE_KEY_SHOWN);
  if (!shown) return true;
  const nav = parseInt(sessionStorage.getItem(STORAGE_KEY_NAV) || '0', 10);
  return nav >= NAV_THRESHOLD;
}

function markShown() {
  sessionStorage.setItem(STORAGE_KEY_SHOWN, Date.now().toString());
  sessionStorage.setItem(STORAGE_KEY_NAV, '0');
}

export function incrementTrialNavCount() {
  if (!sessionStorage.getItem(STORAGE_KEY_SHOWN)) return;
  const nav = parseInt(sessionStorage.getItem(STORAGE_KEY_NAV) || '0', 10);
  sessionStorage.setItem(STORAGE_KEY_NAV, String(nav + 1));
}

// tipo: 'trial' | 'anual'
export default function TrialToast({ diasTrial, diasRenovacao, tipo = 'trial', plano = 'pro', token }) {
  const [visible,   setVisible]   = useState(false);
  const [closing,   setClosing]   = useState(false);
  const [checkout,  setCheckout]  = useState(false);
  const navigate = useNavigate();

  const dismiss = useCallback(() => {
    setClosing(true);
    setTimeout(() => setVisible(false), 350);
  }, []);

  const dias = tipo === 'anual' ? diasRenovacao : diasTrial;
  const mostrar = tipo === 'anual' ? (dias !== null && dias <= 30) : (dias !== null);

  useEffect(() => {
    if (!mostrar || dias === undefined) return;
    if (!shouldShow()) return;
    const t = setTimeout(() => {
      markShown();
      setVisible(true);
    }, 600);
    return () => clearTimeout(t);
  }, [dias, mostrar]);

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(t);
  }, [visible, dismiss]);

  if (!visible || !mostrar) return null;

  const { accent, bg, border } = getColor(dias, tipo);
  const label = tipo === 'anual'
    ? (dias === 0 ? 'Plano anual vence hoje' : `Plano anual vence em ${dias} dia${dias !== 1 ? 's' : ''}`)
    : (dias === 0 ? 'Trial encerrou hoje'    : `${dias} dia${dias !== 1 ? 's' : ''} de trial restante${dias !== 1 ? 's' : ''}`);

  return (
    <>
      <style>{`
        @keyframes trial-in  { from { opacity:0; transform:translateX(110%) } to { opacity:1; transform:translateX(0) } }
        @keyframes trial-out { from { opacity:1; transform:translateX(0)    } to { opacity:0; transform:translateX(110%) } }
        @keyframes trial-bar { from { width:100% } to { width:0% } }
        .trial-toast-in  { animation: trial-in  0.4s cubic-bezier(0.16,1,0.3,1) forwards }
        .trial-toast-out { animation: trial-out 0.35s ease-in forwards }
        .trial-bar       { animation: trial-bar ${AUTO_DISMISS_MS}ms linear forwards }
      `}</style>

      <div
        className={closing ? 'trial-toast-out' : 'trial-toast-in'}
        style={{
          position: 'fixed', top: '72px', right: '16px', zIndex: 1000,
          width: '300px', borderRadius: '12px',
          background: 'var(--surface, #18181F)',
          border: `1px solid ${border}`,
          boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px ${border}`,
          overflow: 'hidden',
          fontFamily: 'var(--font-body, DM Sans, sans-serif)',
        }}
      >
        {/* Barra de progresso */}
        <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)' }}>
          <div className="trial-bar" style={{ height: '100%', background: accent, borderRadius: '2px' }} />
        </div>

        <div style={{ padding: '14px 16px' }}>
          {/* Linha principal */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Ícone relógio */}
              <div style={{
                width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width="16" height="16" fill="none" stroke={accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: accent, lineHeight: 1.2 }}>
                  {tipo === 'anual' ? 'Renovação anual' : 'Período de teste'}
                </p>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--tx, #F0F0F5)', lineHeight: 1.3, marginTop: '2px' }}>
                  {label}
                </p>
              </div>
            </div>
            {/* Botão fechar */}
            <button onClick={dismiss} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '4px',
              color: 'var(--mt, #5A5A72)', flexShrink: 0, borderRadius: '6px',
              display: 'flex', alignItems: 'center',
            }}>
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" viewBox="0 0 24 24">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* CTA */}
          <button
            disabled={checkout}
            onClick={async () => {
              if (tipo === 'anual') { dismiss(); navigate('/configuracoes'); return; }
              setCheckout(true);
              // Abre janela ANTES do await — browsers bloqueiam window.open após operações async
              const win = window.open('', '_blank');
              try {
                const d = await api.post('/payments/assinar', { plano, ciclo: 'mensal' });
                if (d?.init_point) { dismiss(); win.location.href = d.init_point; }
                else { win.close(); dismiss(); navigate('/configuracoes'); }
              } catch { win.close(); dismiss(); navigate('/configuracoes'); }
            }}
            style={{
              marginTop: '12px', width: '100%', padding: '8px', borderRadius: '8px',
              background: bg, border: `1px solid ${border}`,
              color: accent, fontSize: '12px', fontWeight: 600,
              cursor: checkout ? 'wait' : 'pointer', textAlign: 'center', opacity: checkout ? 0.7 : 1,
            }}
          >
            {checkout ? 'Aguarde...' : tipo === 'anual' ? 'Renovar plano anual →' : 'Assinar agora →'}
          </button>
        </div>
      </div>
    </>
  );
}
