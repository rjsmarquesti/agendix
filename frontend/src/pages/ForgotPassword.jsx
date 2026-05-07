import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import AuthLeft from '../components/AuthLeft';
import BrandLogo from '../components/BrandLogo';
import { useBrand } from '../hooks/useBrand';

const LEFT_FEATURES = [
  {
    text: 'Link enviado para seu email com validade de 1 hora',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
      </svg>
    ),
  },
  {
    text: 'Redefina sua senha com segurança e acesse sua conta',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    ),
  },
  {
    text: 'Seus dados e agendamentos permanecem intactos',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
];

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme}
      title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
      className="fixed top-4 right-4 w-10 h-10 rounded-xl flex items-center justify-center bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 shadow border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors z-50">
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
  );
}

export default function ForgotPassword() {
  const brand                 = useBrand();
  const [email, setEmail]     = useState('');
  const [slug, setSlug]       = useState('');
  const [status, setStatus]   = useState(null); // null | 'ok' | 'error'
  const [msg, setMsg]         = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (slug.trim()) headers['X-Tenant-Slug'] = slug.trim();
      const res  = await fetch('/api/auth/forgot-password', {
        method: 'POST', headers,
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar email');
      setStatus('ok');
      setMsg(data.message || 'Email enviado!');
      setSent(true);
    } catch (err) {
      setStatus('error');
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900 transition-colors">
      <ThemeToggle />

      <AuthLeft
        title={'Recupere\nseu acesso.'}
        subtitle="Sem estresse. Enviaremos um link seguro para você criar uma nova senha."
        features={LEFT_FEATURES}
        brand={brand}
      />

      {/* Painel direito */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">

          {sent ? (
            /* ── Estado de sucesso ── */
            <div className="animate-auth space-y-6">
              <div className="flex flex-col items-center gap-3 text-center">
                <div className="w-20 h-20 rounded-full border-2 border-green-400 flex items-center justify-center animate-scale-in"
                  style={{ background: 'rgba(34,197,94,0.1)' }}>
                  <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Email enviado!</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Enviamos o link para <span className="font-semibold text-gray-700 dark:text-gray-200">{email}</span>
                  </p>
                </div>
              </div>

              {/* Card próximos passos */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 space-y-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">Próximos passos</p>
                {[
                  'Abra o email que enviamos para você',
                  'Clique no botão "Redefinir minha senha"',
                  'Crie uma nova senha e faça login',
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
                      style={{ background: 'linear-gradient(135deg,#5B3DF5,#2F80ED)' }}>
                      {i + 1}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-300">{step}</span>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2 text-center">
                <button onClick={() => { setSent(false); setStatus(null); }}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  Não recebeu? Tente novamente
                </button>
                <Link to="/login"
                  className="inline-flex items-center justify-center gap-2 text-sm font-medium text-white py-3 px-6 rounded-xl transition"
                  style={{ background: 'linear-gradient(135deg,#5B3DF5,#2F80ED)' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14" />
                  </svg>
                  Voltar ao login
                </Link>
              </div>
            </div>
          ) : (
            /* ── Formulário ── */
            <div className="animate-auth">
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Esqueci minha senha</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Informe seu email e enviaremos um link para redefinir
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div style={{ animationDelay: '60ms' }} className="animate-auth">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                    Identificador da empresa <span className="normal-case font-normal text-gray-400">(opcional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </span>
                    <input
                      value={slug}
                      onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                      placeholder="minha-empresa"
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700/60 text-gray-800 dark:text-gray-100 text-sm transition"
                      style={{ '--tw-ring-color': '#5B3DF5' }}
                    />
                  </div>
                </div>

                <div style={{ animationDelay: '120ms' }} className="animate-auth">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                    Email
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </span>
                    <input type="email" required placeholder="seu@email.com"
                      value={email} onChange={e => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700/60 text-gray-800 dark:text-gray-100 text-sm transition" />
                  </div>
                </div>

                {status === 'error' && (
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 px-4 py-3 rounded-xl text-sm">
                    {msg}
                  </div>
                )}

                <div style={{ animationDelay: '180ms' }} className="animate-auth">
                  <button type="submit" disabled={loading}
                    className="w-full text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
                    style={{ background: 'linear-gradient(135deg,#5B3DF5,#2F80ED)', opacity: loading ? 0.7 : 1 }}>
                    {loading
                      ? <><svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Enviando...</>
                      : 'Enviar link de redefinição'}
                  </button>
                </div>

                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                  Lembrou a senha?{' '}
                  <Link to="/login" className="font-medium hover:underline" style={{ color: '#5B3DF5' }}>
                    Voltar ao login
                  </Link>
                </p>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
