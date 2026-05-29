import { useState, useMemo, useEffect } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificacaoBell from './NotificacaoBell';
import { getNichoLabel } from '../config/nichoLabels';
import ExtractorDrawer from './ExtractorDrawer';

export default function Layout({ children, title, subtitle }) {
  const { user, tenant, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [extractorOpen, setExtractorOpen] = useState(false);
  const [extractorBadge, setExtractorBadge] = useState(0);

  // Busca stats do extrator ao montar para mostrar badge de leads novos hoje
  useEffect(() => {
    if (!token || !modulos.includes('leads')) return;
    fetch('/api/prospeccao/stats', {
      headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Slug': tenant?.slug || '' },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.inseridosHoje > 0) setExtractorBadge(data.inseridosHoje);
        // Injeta meta tag para o content script da extensão ler automaticamente
        if (data?.webhookUrlExtrator) {
          let meta = document.querySelector('meta[name="agendix-extrator-webhook"]');
          if (!meta) { meta = document.createElement('meta'); meta.name = 'agendix-extrator-webhook'; document.head.appendChild(meta); }
          meta.content = data.webhookUrlExtrator;
        }
      })
      .catch(() => {});
  }, [token, tenant?.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const cor = tenant?.corPrimaria || null; // null = usa var(--g) padrão
  const modulos = tenant?.modulos || ['leads', 'agendamentos'];
  const nicho = tenant?.nichoLabel || 'geral';

  const diasTrial = useMemo(() => {
    if (tenant?.planoStatus !== 'trial' || !tenant?.planoVencimento) return null;
    const diff = new Date(tenant.planoVencimento) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [tenant]);

  const navItems = [
    { to: '/', label: 'Dashboard', sempre: true, icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
    { to: '/leads', label: 'Leads', modulo: 'leads', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /> },
    { to: '/prospeccao', label: 'Prospecção', modulo: 'leads', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" /> },
    { to: '/agendamentos', label: 'Agendamentos', modulo: 'agendamentos', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /> },
    { to: '/agenda-hoje', label: 'Agenda Hoje', modulo: 'agendamentos', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /> },
    { to: '/calendario', label: 'Calendário', modulo: 'agendamentos', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /> },
    { to: '/servicos', label: 'Serviços', modulo: 'agendamentos', roles: ['admin', 'super_admin'], icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /> },
    { to: '/usuarios', label: 'Usuários', roles: ['admin', 'super_admin'], icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /> },
    { to: '/configuracoes', label: 'Configurações', roles: ['admin', 'super_admin'], icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /> },
    { to: '/financeiro', label: 'Financeiro', modulo: 'financeiro', roles: ['admin', 'super_admin'], icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
    { to: '/fichas',      label: getNichoLabel(nicho, 'fichas',      'nav', 'Fichas'),       modulo: 'fichas',      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /> },
    { to: '/prontuarios', label: getNichoLabel(nicho, 'prontuarios', 'nav', 'Prontuários'), modulo: 'prontuarios', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
    { to: '/anamnese',    label: getNichoLabel(nicho, 'anamnese',    'nav', 'Anamnese'),     modulo: 'anamnese',    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /> },
    { to: '/processos',   label: 'Processos',   modulo: 'processos',   icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /> },
    { to: '/orcamentos',  label: getNichoLabel(nicho, 'orcamentos',  'nav', 'Orçamentos'),  modulo: 'orcamentos',  icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /> },
    { to: '/documentos',  label: getNichoLabel(nicho, 'documentos',  'nav', 'Documentos'),  modulo: 'documentos',  icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /> },
    { to: '/wa-atendimento', label: 'Atendimento WA', modulo: 'wa_atendimento', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /> },
    { to: '/agente-ia', label: 'Agente IA', modulo: 'agente_ia', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" /> },
  ];

  const itemsVisiveis = navItems.filter(item => {
    if (item.modulo && !modulos.includes(item.modulo)) return false;
    if (item.roles && !item.roles.includes(user?.role)) return false;
    if (item.planos && !item.planos.includes(tenant?.plano)) return false;
    return true;
  });

  function closeSidebar() { setSidebarOpen(false); }

  const activeStyle = cor
    ? { backgroundColor: cor, color: '#08080C' }
    : { backgroundColor: 'var(--g)', color: '#08080C' };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 md:hidden" onClick={closeSidebar} />
      )}

      {/* Sidebar */}
      <aside className={`
        w-64 min-h-screen flex flex-col
        fixed left-0 top-0 z-30 transition-transform duration-200
        border-r no-print
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
      `} style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--bd)' }}>

        {/* Fechar (mobile) */}
        <button onClick={closeSidebar}
          className="absolute top-4 right-4 md:hidden transition-colors"
          style={{ color: 'var(--mt-lt)' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--tx)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--mt-lt)'}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Logo área */}
        <div className="p-5 border-b" style={{ borderColor: 'var(--bd)' }}>
          <div className="flex items-center gap-3">
            {tenant?.logo
              ? <img src={tenant.logo} alt="logo" className="w-9 h-9 rounded-xl object-contain p-1"
                  style={{ backgroundColor: 'var(--s2)' }} />
              : <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold"
                  style={{ backgroundColor: cor || 'var(--g)', color: '#08080C' }}>
                  {tenant?.nome?.[0] || 'A'}
                </div>
            }
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight truncate" style={{ color: 'var(--tx)' }}>
                {tenant?.nome || 'Agendix'}
              </p>
              <p className="text-xs capitalize" style={{ color: 'var(--mt-lt)' }}>
                {tenant?.plano || 'básico'}
              </p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {itemsVisiveis.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} end={to === '/'}
              onClick={closeSidebar}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors font-medium text-sm"
              style={({ isActive }) =>
                isActive
                  ? activeStyle
                  : { color: 'var(--mt-lt)' }
              }
              onMouseEnter={e => { if (!e.currentTarget.classList.contains('active')) { e.currentTarget.style.backgroundColor = 'var(--bd)'; e.currentTarget.style.color = 'var(--tx)'; } }}
              onMouseLeave={e => { if (!e.currentTarget.classList.contains('active')) { e.currentTarget.style.backgroundColor = ''; } }}>
              <svg className="w-4.5 h-4.5 flex-shrink-0" style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">{icon}</svg>
              {label}
            </NavLink>
          ))}

          {/* Botão Extrator — visível apenas se módulo leads ativo */}
          {modulos.includes('leads') && (
            <button
              onClick={() => { setExtractorOpen(true); setSidebarOpen(false); setExtractorBadge(0); }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors font-medium text-sm w-full text-left relative"
              style={{ color: 'var(--mt-lt)' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--bd)'; e.currentTarget.style.color = 'var(--tx)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = 'var(--mt-lt)'; }}
            >
              <svg style={{ width: '18px', height: '18px', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                <circle cx="12" cy="10" r="3" strokeWidth={1.5} />
              </svg>
              Extrator Maps
              {extractorBadge > 0 && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: '#00C97A', color: '#0C0C0F' }}>
                  {extractorBadge > 99 ? '99+' : extractorBadge}
                </span>
              )}
            </button>
          )}
        </nav>

        {/* Footer sidebar */}
        <div className="p-3 border-t space-y-0.5" style={{ borderColor: 'var(--bd)' }}>
          <div className="px-3 py-2 mb-1">
            <p className="text-xs" style={{ color: 'var(--mt-lt)' }}>
              {user?.role === 'super_admin' ? '⚡ Super Admin' : user?.role}
            </p>
            <p className="text-sm font-medium truncate" style={{ color: 'var(--tx-md)' }}>{user?.nome}</p>
          </div>
          <SidebarBtn to="/manual" label="Manual">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </SidebarBtn>
          <SidebarBtn onClick={() => { logout(); navigate('/login'); }} label="Sair">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </SidebarBtn>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 md:ml-64 flex flex-col min-w-0">
        {/* Header */}
        <header className="border-b px-4 md:px-8 py-3.5 flex items-center justify-between sticky top-0 z-20 no-print backdrop-blur-sm"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--bd)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setSidebarOpen(true)}
              className="md:hidden p-1 transition-colors"
              style={{ color: 'var(--mt-lt)' }}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="text-base md:text-lg font-bold leading-tight truncate" style={{ color: 'var(--tx)' }}>{title}</h1>
              {subtitle && <p className="text-xs hidden sm:block truncate" style={{ color: 'var(--mt-lt)' }}>{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <NotificacaoBell />
            <button onClick={toggleTheme} title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
              className="w-9 h-9 rounded-xl flex items-center justify-center border transition-colors"
              style={{ borderColor: 'var(--bd-md)', color: 'var(--mt-lt)', backgroundColor: 'transparent' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--s2)'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}>
              {theme === 'dark'
                ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
              }
            </button>
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0"
              style={{ backgroundColor: cor || 'var(--g)', color: '#08080C' }}>
              {user?.nome?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="text-sm font-medium hidden sm:block" style={{ color: 'var(--tx-md)' }}>{user?.nome}</span>
          </div>
        </header>

        {/* Trial banner */}
        {diasTrial !== null && (
          <div className="px-4 md:px-8 py-2.5 flex items-center justify-between gap-4 text-sm font-medium border-b"
            style={{
              backgroundColor: diasTrial <= 3 ? 'rgba(239,68,68,0.08)' : 'var(--a-dim)',
              color: diasTrial <= 3 ? '#f87171' : 'var(--a-lt)',
              borderColor: diasTrial <= 3 ? 'rgba(239,68,68,0.2)' : 'rgba(232,134,10,0.2)',
            }}>
            <span>
              {diasTrial === 0
                ? 'Seu período de teste encerrou hoje.'
                : `Período de teste: ${diasTrial} dia${diasTrial !== 1 ? 's' : ''} restante${diasTrial !== 1 ? 's' : ''}.`}
            </span>
            <Link to="/configuracoes" className="underline whitespace-nowrap">Escolher plano</Link>
          </div>
        )}

        <div className="flex-1 p-4 md:p-8">{children}</div>
      </main>

      <ExtractorDrawer isOpen={extractorOpen} onClose={() => setExtractorOpen(false)} />
    </div>
  );
}

/* Botão auxiliar sidebar footer */
function SidebarBtn({ href, to, onClick, label, children }) {
  const cls = "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors w-full text-left text-sm font-medium";
  const style = { color: 'var(--mt-lt)' };
  const enter = e => { e.currentTarget.style.backgroundColor = 'var(--bd)'; e.currentTarget.style.color = 'var(--tx)'; };
  const leave = e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = 'var(--mt-lt)'; };
  const icon = (
    <svg style={{ width: '18px', height: '18px', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">{children}</svg>
  );
  if (to) return (
    <NavLink to={to} className={cls} style={style} onMouseEnter={enter} onMouseLeave={leave}>
      {icon}{label}
    </NavLink>
  );
  if (href) return (
    <a href={href} target="_blank" rel="noreferrer" className={cls} style={style} onMouseEnter={enter} onMouseLeave={leave}>
      {icon}{label}
    </a>
  );
  return (
    <button onClick={onClick} className={cls} style={style} onMouseEnter={enter} onMouseLeave={leave}>
      {icon}{label}
    </button>
  );
}
