import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

/* ── Ícone calendário Agendix (colorido) ── */
const IconCalendar = () => (
  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="8" width="40" height="36" rx="6" fill="url(#cg1)"/>
    <rect x="4" y="8" width="40" height="14" rx="6" fill="url(#cg2)"/>
    <rect x="14" y="2" width="4" height="12" rx="2" fill="#A78BFA"/>
    <rect x="30" y="2" width="4" height="12" rx="2" fill="#A78BFA"/>
    <rect x="12" y="26" width="6" height="6" rx="1.5" fill="#6D28D9" opacity=".5"/>
    <rect x="21" y="26" width="6" height="6" rx="1.5" fill="#6D28D9" opacity=".5"/>
    <rect x="30" y="26" width="6" height="6" rx="1.5" fill="#6D28D9" opacity=".5"/>
    <rect x="12" y="34" width="6" height="6" rx="1.5" fill="#6D28D9" opacity=".5"/>
    <rect x="21" y="34" width="6" height="6" rx="1.5" fill="#10B981"/>
    <path d="M23 37l1.5 1.5 3-3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <defs>
      <linearGradient id="cg1" x1="4" y1="8" x2="44" y2="44" gradientUnits="userSpaceOnUse">
        <stop stopColor="#7C3AED"/>
        <stop offset="1" stopColor="#3B82F6"/>
      </linearGradient>
      <linearGradient id="cg2" x1="4" y1="8" x2="44" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6D28D9"/>
        <stop offset="1" stopColor="#2563EB"/>
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
const IconBuilding = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);
const IconUser = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
  </svg>
);
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

function maskPhone(v) {
  const n = v.replace(/\D/g, '').slice(0, 11);
  if (n.length <= 2) return n;
  if (n.length <= 7) return `(${n.slice(0,2)}) ${n.slice(2)}`;
  return `(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`;
}

const FEATURES = [
  { icon: <IconWA />, title: 'Agendamento via WhatsApp', desc: 'Seus clientes agendam direto pelo WhatsApp de forma rápida e prática.' },
  { icon: <IconPeople />, title: 'CRM Integrado', desc: 'Organize seus clientes, históricos e retornos em um só lugar.' },
  { icon: <IconDollar />, title: 'Módulo Financeiro', desc: 'Tenha controle total das finanças do seu negócio.' },
];

const INPUT_CLS = 'w-full pl-10 pr-4 py-3 border rounded-xl text-sm transition placeholder-gray-400';

export default function Register() {
  const [form, setForm] = useState({ nomeEmpresa: '', nomeCompleto: '', whatsapp: '', email: '', senha: '' });
  const [showSenha, setShowSenha] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const set = field => e => setForm(f => ({ ...f, [field]: e.target.value }));

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao criar conta');
      if (data.token) {
        login(data.token, data.user);
        navigate('/');
      } else {
        setSucesso(true);
      }
    } catch (err) {
      if (err.message.toLowerCase().includes('networkerror') || err.message.includes('fetch')) {
        setErro('Não foi possível conectar ao servidor. Aguarde um instante e tente novamente.');
      } else {
        setErro(err.message);
      }
    } finally {
      setLoading(false);
    }
  }

  /* ── Painel esquerdo ── */
  const LeftPanel = () => (
    <div className="hidden lg:flex flex-col justify-between w-5/12 flex-shrink-0 p-12 relative overflow-hidden border-r"
      style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--bd)' }}>

      {/* Glow verde de fundo */}
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(ellipse at 20% 60%, var(--g-glow) 0%, transparent 60%), radial-gradient(ellipse at 80% 10%, rgba(6,182,212,0.08) 0%, transparent 50%)',
      }} />

      {/* Logo */}
      <div className="relative z-10">
        <img src="/logo-agendix-dark.png" alt="Agendix" className="h-14 w-auto object-contain dark:block hidden" />
        <img src="/logo-agendix-light.png" alt="Agendix" className="h-14 w-auto object-contain dark:hidden block" />
        <p className="mt-2 text-xs tracking-widest font-semibold" style={{ color: 'var(--g)' }}>
          AGENDE. ORGANIZE. CRESÇA.
        </p>
      </div>

      {/* Headline + features */}
      <div className="relative z-10 space-y-8">
        <div>
          <h2 className="text-3xl font-bold leading-tight" style={{ color: 'var(--tx)' }}>
            Comece grátis<br />por 14 dias.
          </h2>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--tx-md)' }}>
            O sistema de agendamento online que ajuda profissionais e empresas a economizar tempo, organizar atendimentos e crescer.
          </p>
        </div>
        <div className="space-y-4">
          {FEATURES.map((f, i) => (
            <div key={i} className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: 'var(--g-dim)', color: 'var(--g)' }}>
                {f.icon}
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--tx)' }}>{f.title}</p>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: 'var(--mt-lt)' }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p className="relative z-10 text-xs" style={{ color: 'var(--mt)' }}>© 2026 Agendix · DivulgaBR</p>
    </div>
  );

  /* ── Tela de sucesso ── */
  if (sucesso) {
    return (
      <div className="min-h-screen flex" style={{ backgroundColor: 'var(--bg)' }}>
        <LeftPanel />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-md text-center space-y-6">
            <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
              style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)' }}>
              <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Conta criada!</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mt-2 leading-relaxed">
                Enviamos um <strong>link de ativação</strong> para o seu email e WhatsApp.<br />
                Clique no link para ativar sua conta e começar a usar o Agendix.
              </p>
            </div>
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3 rounded-xl px-4 py-3 border border-blue-100 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
                <IconMail />
                <span className="text-sm text-blue-700 dark:text-blue-300">Verifique sua caixa de entrada</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl px-4 py-3 border border-green-100 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
                <IconWA />
                <span className="text-sm text-green-700 dark:text-green-300">Verifique seu WhatsApp</span>
              </div>
            </div>
            <Link to="/login" className="block text-sm font-semibold hover:underline" style={{ color: 'var(--g)' }}>
              Já ativei minha conta → Entrar
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-white dark:bg-gray-900">
      <LeftPanel />

      {/* Painel direito */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto relative" style={{ backgroundColor: 'var(--bg)' }}>

        {/* Toggle tema */}
        <button onClick={toggleTheme}
          className="absolute top-5 right-5 w-9 h-9 rounded-xl flex items-center justify-center border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          {theme === 'dark'
            ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
          }
        </button>

        <div className="w-full max-w-md py-8">

          {/* Header do formulário */}
          <div className="flex items-center gap-4 mb-8">
            <IconCalendar />
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Criar conta grátis</h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">Preencha os dados abaixo para começar</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Nome da empresa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Nome da Empresa ou Profissional
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <IconBuilding />
                </span>
                <input type="text" required placeholder="Ex: Salão da Ana"
                  value={form.nomeEmpresa} onChange={set('nomeEmpresa')}
                  className={INPUT_CLS} />
              </div>
            </div>

            {/* Nome completo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Seu nome
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <IconUser />
                </span>
                <input type="text" required placeholder="Ex: Ana Silva"
                  value={form.nomeCompleto} onChange={set('nomeCompleto')}
                  className={INPUT_CLS} />
              </div>
            </div>

            {/* WhatsApp com prefixo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                WhatsApp
              </label>
              <div className="flex gap-2">
                <div className="flex items-center gap-1.5 px-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 flex-shrink-0 select-none">
                  <span>🇧🇷</span>
                  <span className="font-medium">+55</span>
                </div>
                <div className="relative flex-1">
                  <input type="tel" required placeholder="(11) 99999-9999"
                    value={form.whatsapp}
                    onChange={e => setForm(f => ({ ...f, whatsapp: maskPhone(e.target.value) }))}
                    className={INPUT_CLS + ' pl-4'} />
                </div>
              </div>
            </div>

            {/* E-mail */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                E-mail
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <IconMail />
                </span>
                <input type="email" required placeholder="seu@email.com"
                  value={form.email} onChange={set('email')}
                  className={INPUT_CLS} />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                Senha
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                  <IconLock />
                </span>
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
              className="w-full py-3.5 rounded-xl font-semibold text-sm transition flex items-center justify-center gap-2 mt-2"
              style={{ backgroundColor: 'var(--g)', color: '#08080C', boxShadow: '0 4px 24px var(--g-glow)' }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.92'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
              {loading
                ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Criando conta...</>
                : 'Criar conta grátis'}
            </button>

            <p className="text-center text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
              Ao criar sua conta, você concorda com nossos{' '}
              <a href="/termos" target="_blank" className="text-accent hover:underline">Termos de Uso</a>{' '}
              e{' '}
              <a href="/privacidade" target="_blank" className="text-accent hover:underline">Política de Privacidade</a>
            </p>

            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Já tem uma conta?{' '}
              <Link to="/login" className="text-accent hover:underline font-semibold">
                Fazer login
              </Link>
            </p>

          </form>
        </div>
      </div>
    </div>
  );
}
