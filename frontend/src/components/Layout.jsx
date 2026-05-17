import { useState, useMemo } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificacaoBell from './NotificacaoBell';

export default function Layout({ children, title, subtitle }) {
  const { user, tenant, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const cor = tenant?.corPrimaria || '#2563eb';
  const modulos = tenant?.modulos || ['leads', 'agendamentos'];

  const diasTrial = useMemo(() => {
    if (tenant?.planoStatus !== 'trial' || !tenant?.planoVencimento) return null;
    const diff = new Date(tenant.planoVencimento) - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [tenant]);

  const navItems = [
    { to: '/', label: 'Dashboard', sempre: true, icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
    { to: '/leads', label: 'Leads', modulo: 'leads', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /> },
    { to: '/agendamentos', label: 'Agendamentos', modulo: 'agendamentos', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /> },
    { to: '/agenda-hoje', label: 'Agenda Hoje', modulo: 'agendamentos', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /> },
    { to: '/calendario', label: 'Calendário', modulo: 'agendamentos', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /> },
    { to: '/servicos', label: 'Serviços', modulo: 'agendamentos', roles: ['admin', 'super_admin'], icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /> },
    { to: '/usuarios', label: 'Usuários', roles: ['admin', 'super_admin'], icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /> },
    { to: '/configuracoes', label: 'Configurações', roles: ['admin', 'super_admin'], icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /> },
    { to: '/financeiro', label: 'Financeiro', planos: ['pro', 'premium', 'business'], roles: ['admin', 'super_admin'], icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
    // Módulos de nicho — visíveis apenas se ativados no tenant
    { to: '/fichas',      label: 'Fichas',      modulo: 'fichas',      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /> },
    { to: '/prontuarios', label: 'Prontuários', modulo: 'prontuarios', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
    { to: '/anamnese',    label: 'Anamnese',    modulo: 'anamnese',    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /> },
    { to: '/processos',   label: 'Processos',   modulo: 'processos',   icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" /> },
    { to: '/orcamentos',  label: 'Orçamentos',  modulo: 'orcamentos',  icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /> },
    { to: '/documentos',  label: 'Documentos',  modulo: 'documentos',  icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" /> },
  ];

  const itemsVisiveis = navItems.filter(item => {
    if (item.modulo && !modulos.includes(item.modulo)) return false;
    if (item.roles && !item.roles.includes(user?.role)) return false;
    if (item.planos && !item.planos.includes(tenant?.plano)) return false;
    return true;
  });

  function closeSidebar() { setSidebarOpen(false); }

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-gray-950">

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={closeSidebar} />
      )}

      {/* Sidebar */}
      <aside className={`
        w-64 min-h-screen bg-gray-900 dark:bg-gray-950 text-white flex flex-col
        fixed left-0 top-0 z-30 transition-transform duration-200
        border-r border-gray-800 dark:border-gray-800
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
        no-print
      `}>
        {/* Fechar (mobile) */}
        <button onClick={closeSidebar}
          className="absolute top-4 right-4 text-gray-400 hover:text-white md:hidden">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="p-6 border-b border-gray-700 dark:border-gray-800">
          <div className="flex items-center gap-3">
            {tenant?.logo
              ? <img src={tenant.logo} alt="logo" className="w-9 h-9 rounded-xl object-contain bg-white p-1" />
              : <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: cor }}>
                  {tenant?.nome?.[0] || 'C'}
                </div>
            }
            <div>
              <p className="font-bold text-sm leading-tight">{tenant?.nome || 'CRM'}</p>
              <p className="text-xs text-gray-400 capitalize">{tenant?.plano || 'básico'}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {itemsVisiveis.map(({ to, label, icon }) => (
            <NavLink key={to} to={to} end={to === '/'}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium text-sm
                ${isActive ? 'text-white' : 'text-gray-400 hover:bg-gray-800 dark:hover:bg-gray-800 hover:text-white'}`
              }
              style={({ isActive }) => isActive ? { backgroundColor: cor } : {}}>
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">{icon}</svg>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-700 dark:border-gray-800">
          <div className="px-4 py-2 mb-2">
            <p className="text-xs text-gray-400">{user?.role === 'super_admin' ? '⚡ Super Admin' : user?.role}</p>
            <p className="text-sm text-gray-200 truncate">{user?.nome}</p>
          </div>
          <a
            href={['admin','super_admin'].includes(user?.role) ? '/manual-admin.html' : '/manual-usuario.html'}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white transition-colors w-full text-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Manual
          </a>
          <button onClick={() => { logout(); navigate('/login'); }}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white transition-colors w-full text-left text-sm">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sair
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 md:ml-64 flex flex-col min-w-0">
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-4 md:px-8 py-4 flex items-center justify-between sticky top-0 z-20 no-print">
          {/* Hambúrguer (mobile) */}
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)}
              className="md:hidden text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 p-1">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div>
              <h1 className="text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">{title}</h1>
              {subtitle && <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 hidden sm:block">{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <NotificacaoBell />
            {/* Toggle dark/light */}
            <button onClick={toggleTheme}
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              {theme === 'dark' ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-full flex items-center justify-center font-bold text-sm text-white flex-shrink-0" style={{ backgroundColor: cor }}>
              {user?.nome?.[0]?.toUpperCase() || 'U'}
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block">{user?.nome}</span>
          </div>
        </header>
        {diasTrial !== null && (
          <div className={`px-4 md:px-8 py-2.5 flex items-center justify-between gap-4 text-sm font-medium
            ${diasTrial <= 3 ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-b border-red-200 dark:border-red-800'
                             : 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-b border-amber-200 dark:border-amber-800'}`}>
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
    </div>
  );
}
