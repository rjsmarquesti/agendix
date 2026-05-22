import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const nav = [
  { to: '/admin',                         label: 'Dashboard',     exact: true, icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
  { to: '/admin/clientes',                label: 'Clientes',      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /> },
  { to: '/admin/usuarios',                label: 'Usuários',      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /> },
  { to: '/admin/financeiro',              label: 'Financeiro',    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /> },
  { to: '/admin/financeiro/lancamentos',  label: 'Lançamentos',   indent: true, icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /> },
  { to: '/admin/financeiro/fluxo-caixa', label: 'Fluxo de Caixa', indent: true, icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" /> },
  { to: '/admin/backups',                 label: 'Backups',       icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /> },
  { to: '/admin/consumo',                 label: 'Consumo',       icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /> },
  { to: '/admin/logs',                    label: 'Logs',          icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /> },
  { to: '/admin/perfil',                  label: 'Meu Perfil',    icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /> },
];

export default function AdminLayout({ children, title, subtitle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        w-64 min-h-screen flex flex-col border-r
        fixed left-0 top-0 z-30 transition-transform duration-200
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 no-print
      `} style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--bd)' }}>

        <button onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 md:hidden"
          style={{ color: 'var(--mt-lt)' }}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Brand */}
        <div className="p-5 border-b" style={{ borderColor: 'var(--bd)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'var(--g)' }}>
              <svg className="w-5 h-5" fill="none" stroke="#08080C" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <div>
              <span className="font-bold text-base leading-tight" style={{ color: 'var(--tx)' }}>Agendix</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: 'var(--g)' }} />
                <p className="text-xs" style={{ color: 'var(--mt-lt)' }}>Admin</p>
              </div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {nav.map(({ to, label, icon, exact, indent }) => (
            <NavLink key={to} to={to} end={exact}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 rounded-xl transition-colors text-sm font-medium
                ${indent ? 'px-3 py-2 ml-4' : 'px-3 py-2.5'}`}
              style={({ isActive }) =>
                isActive
                  ? { backgroundColor: 'var(--g)', color: '#08080C' }
                  : { color: 'var(--mt-lt)' }
              }
              onMouseEnter={e => { const a = e.currentTarget; if (a.style.backgroundColor !== 'var(--g)') { a.style.backgroundColor = 'var(--bd)'; a.style.color = 'var(--tx)'; } }}
              onMouseLeave={e => { const a = e.currentTarget; if (a.style.backgroundColor !== 'var(--g)') { a.style.backgroundColor = ''; } }}>
              <svg style={{ width: '18px', height: '18px', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">{icon}</svg>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t space-y-0.5" style={{ borderColor: 'var(--bd)' }}>
          <div className="px-3 py-2 mb-1">
            <p className="text-xs" style={{ color: 'var(--mt-lt)' }}>Super Admin</p>
            <p className="text-sm font-medium truncate" style={{ color: 'var(--tx-md)' }}>{user?.nome}</p>
          </div>
          <AdminSidebarBtn href="/manual-superadmin.html" label="Manual">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </AdminSidebarBtn>
          <AdminSidebarBtn onClick={() => { logout(); navigate('/admin/login'); }} label="Sair">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </AdminSidebarBtn>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 md:ml-64 flex flex-col min-w-0">
        <header className="border-b px-4 md:px-8 py-3.5 flex items-center justify-between sticky top-0 z-20 no-print backdrop-blur-sm"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--bd)' }}>
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1" style={{ color: 'var(--mt-lt)' }}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="min-w-0">
              <h1 className="text-base md:text-lg font-bold leading-tight truncate" style={{ color: 'var(--tx)' }}>{title}</h1>
              {subtitle && <p className="text-xs hidden sm:block" style={{ color: 'var(--mt-lt)' }}>{subtitle}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
              style={{ backgroundColor: 'var(--g)', color: '#08080C' }}>
              {user?.nome?.[0]?.toUpperCase()}
            </div>
            <span className="text-sm hidden sm:block" style={{ color: 'var(--mt-lt)' }}>{user?.email}</span>
          </div>
        </header>
        <div className="flex-1 p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}

function AdminSidebarBtn({ href, onClick, label, children }) {
  const cls = "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors w-full text-left text-sm font-medium";
  const style = { color: 'var(--mt-lt)' };
  const enter = e => { e.currentTarget.style.backgroundColor = 'var(--bd)'; e.currentTarget.style.color = 'var(--tx)'; };
  const leave = e => { e.currentTarget.style.backgroundColor = ''; e.currentTarget.style.color = 'var(--mt-lt)'; };
  const icon = <svg style={{ width: '18px', height: '18px', flexShrink: 0 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">{children}</svg>;
  if (href) return (
    <a href={href} target="_blank" rel="noreferrer" className={cls} style={style} onMouseEnter={enter} onMouseLeave={leave}>{icon}{label}</a>
  );
  return <button onClick={onClick} className={cls} style={style} onMouseEnter={enter} onMouseLeave={leave}>{icon}{label}</button>;
}
