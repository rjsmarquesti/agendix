import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useBrand } from '../hooks/useBrand';
import BrandLogo from '../components/BrandLogo';

/* ── Ícone calendário Agendix (colorido) ── */
const IconCalendar = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="8" width="40" height="36" rx="6" fill="url(#lcg1)"/>
    <rect x="4" y="8" width="40" height="14" rx="6" fill="url(#lcg2)"/>
    <rect x="14" y="2" width="4" height="12" rx="2" fill="#A78BFA"/>
    <rect x="30" y="2" width="4" height="12" rx="2" fill="#A78BFA"/>
    <rect x="12" y="26" width="6" height="6" rx="1.5" fill="#6D28D9" opacity=".5"/>
    <rect x="21" y="26" width="6" height="6" rx="1.5" fill="#6D28D9" opacity=".5"/>
    <rect x="30" y="26" width="6" height="6" rx="1.5" fill="#6D28D9" opacity=".5"/>
    <rect x="12" y="34" width="6" height="6" rx="1.5" fill="#6D28D9" opacity=".5"/>
    <rect x="21" y="34" width="6" height="6" rx="1.5" fill="#10B981"/>
    <path d="M23 37l1.5 1.5 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <defs>
      <linearGradient id="lcg1" x1="4" y1="8" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#7C3AED"/><stop offset="1" stopColor="#3B82F6"/>
      </linearGradient>
      <linearGradient id="lcg2" x1="4" y1="8" x2="44" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6D28D9"/><stop offset="1" stopColor="#2563EB"/>
      </linearGradient>
    </defs>
  </svg>
);

/* ── Ícones features ── */
const IconWA = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.488"/>
  </svg>
);
const IconPeople = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconDollar = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
  </svg>
);

/* ── Ícones de campo ── */
const IconMail = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,12 2,6"/>
  </svg>
);
const IconLock = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const IconEye = ({ off }) => off ? (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
) : (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

const FEATURES = [
  { icon: <IconWA />, title: 'Agendamento via WhatsApp', desc: 'Seus clientes agendam direto pelo WhatsApp de forma rápida e prática.' },
  { icon: <IconPeople />, title: 'CRM Integrado', desc: 'Organize seus clientes, históricos e retornos em um só lugar.' },
  { icon: <IconDollar />, title: 'Módulo Financeiro', desc: 'Tenha controle total das finanças do seu negócio.' },
];

const INPUT_CLS = 'w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 text-sm transition placeholder-gray-400';

export default function Login() {
  const [form, setForm] = useState({ slug: localStorage.getItem('crm_slug') || '', email: '', senha: '' });
  const [showSenha, setShowSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const brand = useBrand();

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }));

  async function handleLogin(e) {
    e.preventDefault();
    setErro(''); setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(form.slug.trim() ? { 'X-Tenant-Slug': form.slug.trim() } : {}) },
        body: JSON.stringify({ email: form.email, senha: form.senha }),
      });
      const data = await res.json();
      if (!res.ok && (res.status === 400 || res.status === 404) && !form.slug.trim()) {
        const res2 = await fetch('/api/auth/super-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, senha: form.senha }),
        });
        const data2 = await res2.json();
        if (!res2.ok) throw new Error(data2.error || 'Email ou senha incorretos');
        login(data2); navigate('/'); return;
      }
      if (!res.ok) throw new Error(data.error || 'Email ou senha incorretos');
      if (data.tenant?.slug) localStorage.setItem('crm_slug', data.tenant.slug);
      login(data); navigate('/');
    } catch (err) { setErro(err.message); }
    finally { setLoading(false); }
  }

  /* ── Painel esquerdo ── */
  const leftContent = brand.logo
    ? (
      <div className="hidden lg:flex flex-col justify-between w-5/12 flex-shrink-0 p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0F172A 0%, #1a0d3d 100%)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, #5B3DF5 0%, transparent 55%), radial-gradient(circle at 80% 10%, #2F80ED 0%, transparent 45%)',
          opacity: 0.18,
        }} />
        <div className="relative z-10 flex items-center gap-3">
          <BrandLogo logo={brand.logo} nome={brand.nome} size="lg" dark />
          <span className="text-white font-bold text-xl">{brand.nome}</span>
        </div>
        <div className="relative z-10 space-y-4">
          <h2 className="text-3xl font-bold text-white leading-tight">Bem-vindo<br />de volta.</h2>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(148,163,184,0.85)' }}>
            Entre na sua conta para gerenciar agendamentos, clientes e muito mais.
          </p>
        </div>
        <p className="relative z-10 text-xs" style={{ color: 'rgba(139,92,246,0.4)' }}>© 2026 Agendix · DivulgaBR</p>
      </div>
    )
    : (
      <div className="hidden lg:flex flex-col justify-between w-5/12 flex-shrink-0 p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0F172A 0%, #1a0d3d 100%)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, #5B3DF5 0%, transparent 55%), radial-gradient(circle at 80% 10%, #2F80ED 0%, transparent 45%)',
          opacity: 0.18,
        }} />
        <div className="relative z-10">
          <img src="/logo-agendix-dark.png" alt="Agendix" className="h-16 w-auto object-contain" style={{ mixBlendMode: 'screen' }} />
          <p className="mt-2 text-xs tracking-widest font-semibold" style={{ color: 'rgba(167,139,250,0.6)' }}>
            AGENDE. ORGANIZE. CRESÇA.
          </p>
        </div>
        <div className="relative z-10 space-y-8">
          <div>
            <h2 className="text-3xl font-bold text-white leading-tight">Bem-vindo<br />de volta.</h2>
            <p className="mt-3 text-sm leading-relaxed" style={{ color: 'rgba(148,163,184,0.85)' }}>
              Entre na sua conta para gerenciar agendamentos, clientes e muito mais.
            </p>
          </div>
          <div className="space-y-5">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(91,61,245,0.25)', color: '#a78bfa' }}>
                  {f.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'rgba(148,163,184,0.75)' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="relative z-10 text-xs" style={{ color: 'rgba(139,92,246,0.4)' }}>© 2026 Agendix · DivulgaBR</p>
      </div>
    );

  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-900">
      {leftContent}

      {/* Painel direito */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto relative">

        {/* Toggle tema */}
        <button onClick={toggleTheme}
          className="absolute top-5 right-5 w-9 h-9 rounded-xl flex items-center justify-center border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          {theme === 'dark'
            ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
          }
        </button>

        <div className="w-full max-w-md py-8">

          {/* Logo mobile */}
          <div className="flex lg:hidden justify-center mb-8">
            {brand.logo
              ? <div className="flex items-center gap-3">
                  <BrandLogo logo={brand.logo} nome={brand.nome} size="lg" />
                  <span className="font-bold text-xl text-gray-900 dark:text-gray-100">{brand.nome}</span>
                </div>
              : <>
                  <img src="/logo-agendix-light.png" alt="Agendix" className="h-14 w-auto object-contain dark:hidden" />
                  <img src="/logo-agendix-dark.png" alt="Agendix" className="h-14 w-auto object-contain hidden dark:block" style={{ mixBlendMode: 'screen' }} />
                </>
            }
          </div>

          {/* Header do formulário */}
          <div className="flex items-center gap-4 mb-8">
            <IconCalendar />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Entrar na conta</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Bem-vindo de volta!</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Slug da empresa <span className="text-gray-400 font-normal text-xs">(deixe em branco para acesso admin)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
                  </svg>
                </span>
                <input type="text" placeholder="minha-empresa"
                  value={form.slug} onChange={set('slug')}
                  className={INPUT_CLS} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">E-mail</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><IconMail /></span>
                <input type="email" required placeholder="seu@email.com"
                  value={form.email} onChange={set('email')}
                  className={INPUT_CLS} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Senha</label>
                <Link to="/esqueci-senha" className="text-xs text-violet-600 dark:text-violet-400 hover:underline">
                  Esqueci minha senha
                </Link>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"><IconLock /></span>
                <input type={showSenha ? 'text' : 'password'} required placeholder="••••••••"
                  value={form.senha} onChange={set('senha')}
                  className={INPUT_CLS + ' pr-10'} />
                <button type="button" onClick={() => setShowSenha(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  <IconEye off={showSenha} />
                </button>
              </div>
            </div>

            {erro && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                {erro}
              </div>
            )}

            <button type="submit" disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold text-white text-sm transition flex items-center justify-center gap-2 mt-2"
              style={{ background: 'linear-gradient(135deg, #7C3AED, #5B21B6)', boxShadow: '0 4px 24px rgba(124,58,237,0.35)' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.92'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              {loading
                ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Entrando...</>
                : 'Entrar'}
            </button>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Não tem uma conta?{' '}
              <Link to="/cadastro" className="text-violet-600 dark:text-violet-400 hover:underline font-semibold">
                Criar conta grátis
              </Link>
            </p>

          </form>
        </div>
      </div>
    </div>
  );
}
