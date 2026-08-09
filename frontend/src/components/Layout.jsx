import { useState, useMemo, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificacaoBell from './NotificacaoBell';
import { getNichoLabel } from '../config/nichoLabels';
import ExtractorDrawer from './ExtractorDrawer';
import TrialToast, { incrementTrialNavCount } from './TrialToast';

/* ── Ícones inline ───────────────────────────────────────────────────────── */
const I = {
  dashboard:    'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  leads:        'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
  clientes:     'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  prospeccao:   'M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12',
  agenda:       'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  agendaHoje:   'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
  calendario:   'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  servicos:     'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  fichas:       'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
  prontuarios:  'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  anamnese:     'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
  orcamentos:   'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z',
  documentos:   'M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z',
  processos:    'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3',
  financeiro:   'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  mensagens:    'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  waFila:       'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
  waAtend:      'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
  agenteIa:     'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2',
  usuarios:     'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  config:       'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
  manual:       'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
  sair:         'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
  pin:          'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z',
  download:     'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4',
  ordemServico: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  sun:          'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z',
  moon:         'M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z',
  menu:         'M4 6h16M4 12h16M4 18h16',
  close:        'M6 18L18 6M6 6l12 12',
  search:       'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
  chevronDown:  'M19 9l-7 7-7-7',
};

function Icon({ d, size = 16 }) {
  return (
    <svg width={size} height={size} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={d} />
    </svg>
  );
}

/* ── Logo Agendix (checkmark + texto) ───────────────────────────────────── */
function AgendixLogo({ accent }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 6,
        background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#fff" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--sb-tx)', letterSpacing: '-0.03em' }}>
        agendix
      </span>
    </div>
  );
}

/* ── Seções da nav ───────────────────────────────────────────────────────── */
function buildNav(nicho) {
  return [
    {
      section: null,
      items: [
        { to: '/', label: 'Dashboard', sempre: true, icon: I.dashboard },
      ],
    },
    {
      section: 'Clientes',
      items: [
        { to: '/leads',      label: 'Leads / CRM', modulo: 'leads', icon: I.leads },
        { to: '/clientes',   label: 'Clientes',    modulo: 'leads', icon: I.clientes },
        { to: '/prospeccao', label: 'Prospecção',  modulo: 'leads', icon: I.prospeccao },
      ],
    },
    {
      section: 'Agenda',
      items: [
        { to: '/agendamentos', label: 'Agendamentos', modulo: 'agendamentos', icon: I.agenda },
        { to: '/agenda-hoje',  label: 'Agenda Hoje',  modulo: 'agendamentos', icon: I.agendaHoje },
        { to: '/calendario',   label: 'Calendário',   modulo: 'agendamentos', icon: I.calendario },
        { to: '/servicos', label: 'Serviços', modulo: 'agendamentos', roles: ['admin','super_admin'], icon: I.servicos },
      ],
    },
    {
      section: 'Registros',
      items: [
        { to: '/fichas',        label: getNichoLabel(nicho, 'fichas',        'nav', 'Fichas'),        modulo: 'fichas',        icon: I.fichas },
        { to: '/prontuarios',   label: getNichoLabel(nicho, 'prontuarios',   'nav', 'Prontuários'),   modulo: 'prontuarios',   icon: I.prontuarios },
        { to: '/anamnese',      label: getNichoLabel(nicho, 'anamnese',      'nav', 'Anamnese'),      modulo: 'anamnese',      icon: I.anamnese },
        { to: '/orcamentos',    label: getNichoLabel(nicho, 'orcamentos',    'nav', 'Orçamentos'),    modulo: 'orcamentos',    icon: I.orcamentos },
        { to: '/documentos',    label: getNichoLabel(nicho, 'documentos',    'nav', 'Documentos'),    modulo: 'documentos',    icon: I.documentos },
        { to: '/processos',     label: 'Processos',          modulo: 'processos',    icon: I.processos },
        { to: '/ordem-servico', label: 'Ordem de Serviço',   modulo: 'ordem_servico', icon: I.ordemServico },
      ],
    },
    {
      section: 'Financeiro',
      items: [
        { to: '/financeiro', label: 'Financeiro', modulo: 'financeiro', roles: ['admin','super_admin'], icon: I.financeiro },
      ],
    },
    {
      section: 'Comunicação',
      items: [
        { to: '/mensagens',      label: 'Mensagens',      sempre: true,              icon: I.mensagens },
        { to: '/wa-fila',        label: 'Fila Anti-ban',  sempre: true, roles: ['admin','super_admin'], icon: I.waFila },
        { to: '/wa-atendimento', label: 'WhatsApp',       modulo: 'wa_atendimento',  icon: I.waAtend },
        { to: '/agente-ia',      label: 'Agente IA',      modulo: 'agente_ia',       icon: I.agenteIa },
      ],
    },
    {
      section: 'Conta',
      items: [
        { to: '/usuarios',      label: 'Usuários',      roles: ['admin','super_admin'], icon: I.usuarios },
        { to: '/configuracoes', label: 'Configurações', roles: ['admin','super_admin'], icon: I.config },
      ],
    },
  ];
}

/* ── NavItem (cores para sidebar escura) ─────────────────────────────────── */
function NavItem({ to, label, icon, accentColor, onClick }) {
  return (
    <NavLink
      to={to}
      end={to === '/'}
      onClick={onClick}
      className={({ isActive }) => isActive ? 'nav-active' : ''}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '7px 10px',
        borderRadius: 'var(--r)',
        fontSize: 13.5,
        fontWeight: isActive ? 600 : 400,
        color: isActive ? accentColor : 'var(--sb-mt)',
        backgroundColor: isActive ? `color-mix(in srgb, ${accentColor} 12%, transparent)` : 'transparent',
        borderLeft: `2px solid ${isActive ? accentColor : 'transparent'}`,
        marginBottom: 1,
        textDecoration: 'none',
        transition: 'background 0.12s, color 0.12s',
        cursor: 'pointer',
      })}
      onMouseEnter={e => {
        if (!e.currentTarget.classList.contains('nav-active')) {
          e.currentTarget.style.backgroundColor = 'var(--sb-s2)';
          e.currentTarget.style.color = 'var(--sb-tx)';
        }
      }}
      onMouseLeave={e => {
        if (!e.currentTarget.classList.contains('nav-active')) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = 'var(--sb-mt)';
        }
      }}
    >
      <Icon d={icon} size={16} />
      {label}
    </NavLink>
  );
}

/* ── Layout principal ────────────────────────────────────────────────────── */
export default function Layout({ children, title, subtitle }) {
  const { token, user, tenant, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [extractorOpen, setExtractorOpen] = useState(false);
  const [extractorBadge, setExtractorBadge] = useState(0);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  const modulos = tenant?.modulos || ['leads', 'agendamentos'];
  const nicho   = tenant?.nichoLabel || 'geral';
  const cor      = tenant?.corPrimaria || null;
  const accent   = cor || 'var(--g)';

  useEffect(() => {
    if (!token || !modulos.includes('leads')) return;
    fetch('/api/prospeccao/stats', {
      headers: { Authorization: `Bearer ${token}`, 'X-Tenant-Slug': tenant?.slug || '' },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.inseridosHoje > 0) setExtractorBadge(data.inseridosHoje);
        if (data?.webhookUrlExtrator) {
          let meta = document.querySelector('meta[name="agendix-extrator-webhook"]');
          if (!meta) { meta = document.createElement('meta'); meta.name = 'agendix-extrator-webhook'; document.head.appendChild(meta); }
          meta.content = data.webhookUrlExtrator;
        }
      })
      .catch(() => {});
  }, [token, tenant?.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Fechar user menu ao clicar fora */
  useEffect(() => {
    function handleClick(e) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const diasTrial = useMemo(() => {
    if (tenant?.planoStatus !== 'trial' || !tenant?.planoVencimento) return null;
    return Math.max(0, Math.ceil((new Date(tenant.planoVencimento) - new Date()) / 86400000));
  }, [tenant]);

  const diasRenovacao = useMemo(() => {
    if (tenant?.planoStatus !== 'ativo' || tenant?.cicloBilhagem !== 'anual' || !tenant?.planoVencimento) return null;
    return Math.max(0, Math.ceil((new Date(tenant.planoVencimento) - new Date()) / 86400000));
  }, [tenant]);

  useEffect(() => {
    if (diasTrial !== null || diasRenovacao !== null) incrementTrialNavCount();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const NAV = buildNav(nicho);

  function filterItems(items) {
    return items.filter(item => {
      if (item.modulo && !modulos.includes(item.modulo)) return false;
      if (item.roles && !item.roles.includes(user?.role)) return false;
      return true;
    });
  }

  const closeSidebar = () => setSidebarOpen(false);

  /* ── Estilos inline ── */
  const S = {
    sidebar: {
      position: 'fixed', left: 0, top: 0, zIndex: 30,
      width: 'var(--sidebar-w)', height: '100vh',
      display: 'flex', flexDirection: 'column',
      backgroundColor: 'var(--sb-bg)',
      borderRight: '1px solid var(--sb-bd)',
      transition: 'transform 0.2s',
    },
    header: {
      position: 'sticky', top: 0, zIndex: 20,
      height: 'var(--header-h)',
      backgroundColor: 'var(--surface)',
      borderBottom: '1px solid var(--bd)',
      display: 'flex', alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      backdropFilter: 'blur(10px)',
    },
    iconBtn: {
      width: 34, height: 34,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: '1px solid var(--bd-md)',
      borderRadius: 'var(--r)',
      background: 'transparent',
      color: 'var(--mt-lt)',
      cursor: 'pointer',
      transition: 'background 0.12s, color 0.12s',
    },
    sbIconBtn: {
      width: 30, height: 30,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: 'var(--r)',
      border: 'none',
      background: 'transparent',
      color: 'var(--sb-mt)',
      cursor: 'pointer',
      transition: 'background 0.12s, color 0.12s',
    },
    sectionLabel: {
      fontSize: 10, fontWeight: 700,
      letterSpacing: '0.08em', textTransform: 'uppercase',
      color: 'var(--sb-mt)', padding: '12px 10px 4px',
      opacity: 0.6,
    },
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg)' }}>

      <a href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-medium"
        style={{ backgroundColor: accent, color: '#fff' }}>
        Pular para o conteúdo
      </a>

      {/* Overlay mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 md:hidden"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)' }}
          onClick={closeSidebar} />
      )}

      {/* ────────── Sidebar ────────── */}
      <aside
        className={`no-print ${sidebarOpen ? '' : '-translate-x-full'} md:translate-x-0`}
        style={S.sidebar}
      >
        {/* Logo + fechar mobile */}
        <div style={{
          padding: '14px 14px 12px',
          borderBottom: '1px solid var(--sb-bd)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <AgendixLogo accent={accent} />
          <button onClick={closeSidebar} aria-label="Fechar menu"
            className="md:hidden"
            style={S.sbIconBtn}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--sb-s2)'; e.currentTarget.style.color = 'var(--sb-tx)'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--sb-mt)'; }}>
            <Icon d={I.close} size={16} />
          </button>
        </div>

        {/* Tenant name (sub-brand) */}
        {tenant?.nome && (
          <div style={{ padding: '8px 14px 6px', borderBottom: '1px solid var(--sb-bd)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {tenant.logo
                ? <img src={tenant.logo} alt={`Logo de ${tenant.nome}`}
                    style={{ width: 22, height: 22, borderRadius: 4, objectFit: 'contain',
                      border: '1px solid var(--sb-bd)', backgroundColor: 'var(--sb-s2)' }} />
                : <div style={{
                    width: 22, height: 22, borderRadius: 4,
                    background: accent, color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, flexShrink: 0,
                  }}>
                    {tenant.nome[0]}
                  </div>
              }
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--sb-tx)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                  {tenant.nome}
                </p>
                <span style={{ fontSize: 10, color: 'var(--sb-mt)', textTransform: 'capitalize' }}>
                  Plano {tenant.plano}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav role="navigation" aria-label="Menu principal"
          style={{ flex: 1, overflowY: 'auto', padding: '6px 8px' }}>

          {NAV.map(({ section, items }) => {
            const visible = filterItems(items);
            if (!visible.length) return null;
            return (
              <div key={section || '__root'}>
                {section && <p style={S.sectionLabel}>{section}</p>}
                {visible.map(item => (
                  <NavItem key={item.to} {...item} accentColor={accent} onClick={closeSidebar} />
                ))}
              </div>
            );
          })}

          {/* Extrator Maps */}
          {modulos.includes('leads') && (
            <div>
              <button
                onClick={() => { setExtractorOpen(true); closeSidebar(); setExtractorBadge(0); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px',
                  borderRadius: 'var(--r)', width: '100%', marginBottom: 1,
                  fontSize: 13.5, fontWeight: 400,
                  color: 'var(--sb-mt)', background: 'none', border: 'none',
                  borderLeft: '2px solid transparent',
                  cursor: 'pointer', position: 'relative',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--sb-s2)'; e.currentTarget.style.color = 'var(--sb-tx)'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--sb-mt)'; }}>
                <Icon d={I.pin} size={16} />
                Extrator Maps
                {extractorBadge > 0 && (
                  <span style={{
                    position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                    minWidth: 18, height: 18, padding: '0 4px',
                    borderRadius: 'var(--r-full)', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', background: accent, color: '#fff',
                    fontSize: 10, fontWeight: 700,
                  }}>
                    {extractorBadge > 99 ? '99+' : extractorBadge}
                  </span>
                )}
              </button>
              {import.meta.env.VITE_EXTRATOR_DOWNLOAD_URL && (
                <a href={import.meta.env.VITE_EXTRATOR_DOWNLOAD_URL} target="_blank" rel="noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px',
                    borderRadius: 'var(--r)', fontSize: 13.5, fontWeight: 400,
                    color: 'var(--sb-mt)', textDecoration: 'none',
                    borderLeft: '2px solid transparent',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--sb-s2)'; e.currentTarget.style.color = 'var(--sb-tx)'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--sb-mt)'; }}>
                  <Icon d={I.download} size={16} />
                  Baixar Extensão
                </a>
              )}
            </div>
          )}
        </nav>

        {/* Footer: manual + sair + avatar */}
        <div style={{ padding: '8px', borderTop: '1px solid var(--sb-bd)' }}>
          <SbFooterBtn icon={I.manual} label="Manual" to="/manual" />
          <SbFooterBtn icon={I.sair} label="Sair" onClick={() => { logout(); navigate('/login'); }} isLogout />
          <div style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: '10px 10px 4px', marginTop: 6,
            borderTop: '1px solid var(--sb-bd)',
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 'var(--r-full)',
              background: accent, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, flexShrink: 0,
            }}>
              {user?.nome?.[0]?.toUpperCase() || 'U'}
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--sb-tx)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                {user?.nome}
              </p>
              <p style={{ fontSize: 10, color: 'var(--sb-mt)', margin: 0, textTransform: 'capitalize' }}>
                {user?.role === 'super_admin' ? 'Super Admin' : user?.role}
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* ────────── Main ────────── */}
      <main id="main-content" className="md:ml-[230px]"
        style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* Header / Topbar */}
        <header className="no-print" style={S.header}>
          {/* Esquerda: hambúrguer (mobile) + título */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <button onClick={() => setSidebarOpen(true)} aria-label="Abrir menu"
              aria-expanded={sidebarOpen}
              className="md:hidden"
              style={{ ...S.iconBtn, border: 'none' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--s2)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
              <Icon d={I.menu} size={18} />
            </button>
            <div style={{ minWidth: 0 }}>
              {title && (
                <h1 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--tx)',
                  letterSpacing: '-0.02em', lineHeight: 1.3,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {title}
                </h1>
              )}
              {subtitle && (
                <p style={{ margin: 0, fontSize: 11.5, color: 'var(--mt-lt)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Direita: search + bell + tema + avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            {/* Busca (visual only por enquanto) */}
            <button aria-label="Buscar" style={S.iconBtn}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--s2)'; e.currentTarget.style.color = 'var(--tx)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--mt-lt)'; }}>
              <Icon d={I.search} size={15} />
            </button>

            <NotificacaoBell />

            <button onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
              style={S.iconBtn}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--s2)'; e.currentTarget.style.color = 'var(--tx)'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--mt-lt)'; }}>
              <Icon d={theme === 'dark' ? I.sun : I.moon} size={15} />
            </button>

            {/* Avatar + nome + dropdown */}
            <div ref={userMenuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setUserMenuOpen(v => !v)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7,
                  padding: '4px 8px 4px 4px',
                  borderRadius: 'var(--r)',
                  border: '1px solid var(--bd-md)',
                  background: 'transparent',
                  cursor: 'pointer',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--s2)'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                <div style={{
                  width: 26, height: 26, borderRadius: 'var(--r-full)',
                  background: accent, color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 700,
                }}>
                  {user?.nome?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="hidden sm:block"
                  style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx-md)' }}>
                  {user?.nome}
                </span>
                <Icon d={I.chevronDown} size={12} />
              </button>

              {/* Dropdown */}
              {userMenuOpen && (
                <div style={{
                  position: 'absolute', right: 0, top: 'calc(100% + 6px)',
                  width: 180,
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--bd-md)',
                  borderRadius: 'var(--r-lg)',
                  boxShadow: 'var(--shadow-hover)',
                  zIndex: 50,
                  padding: '4px',
                  animation: 'scaleIn 0.15s ease both',
                }}>
                  <button
                    onClick={() => { navigate('/configuracoes'); setUserMenuOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      padding: '8px 10px', borderRadius: 'var(--r)', border: 'none',
                      background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--tx-md)',
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--s2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                    <Icon d={I.config} size={14} />
                    Configurações
                  </button>
                  <button
                    onClick={() => { logout(); navigate('/login'); setUserMenuOpen(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, width: '100%',
                      padding: '8px 10px', borderRadius: 'var(--r)', border: 'none',
                      background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--err)',
                      textAlign: 'left',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--err-dim)'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}>
                    <Icon d={I.sair} size={14} />
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-8">{children}</div>
      </main>

      <TrialToast diasTrial={diasTrial} diasRenovacao={diasRenovacao}
        tipo={diasRenovacao !== null ? 'anual' : 'trial'}
        plano={tenant?.plano || 'pro'} token={token} />
      <ExtractorDrawer isOpen={extractorOpen} onClose={() => setExtractorOpen(false)} />
    </div>
  );
}

/* ── Botão footer sidebar (cores dark) ──────────────────────────────────── */
function SbFooterBtn({ icon, label, to, onClick, isLogout }) {
  const style = {
    display: 'flex', alignItems: 'center', gap: 9, padding: '7px 10px',
    borderRadius: 'var(--r)', fontSize: 13, fontWeight: 400,
    color: isLogout ? 'var(--err)' : 'var(--sb-mt)',
    background: 'none', border: 'none',
    width: '100%', textDecoration: 'none', cursor: 'pointer', marginBottom: 1,
  };
  const enter = e => {
    e.currentTarget.style.backgroundColor = isLogout ? 'rgba(255,71,87,0.1)' : 'var(--sb-s2)';
    e.currentTarget.style.color = isLogout ? 'var(--err)' : 'var(--sb-tx)';
  };
  const leave = e => {
    e.currentTarget.style.backgroundColor = 'transparent';
    e.currentTarget.style.color = isLogout ? 'var(--err)' : 'var(--sb-mt)';
  };
  const ic = <Icon d={icon} size={15} />;

  if (to) return (
    <NavLink to={to} style={style} onMouseEnter={enter} onMouseLeave={leave}>{ic}{label}</NavLink>
  );
  return (
    <button onClick={onClick} style={style} onMouseEnter={enter} onMouseLeave={leave}>{ic}{label}</button>
  );
}
