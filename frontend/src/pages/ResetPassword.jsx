import { useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import AuthLeft from '../components/AuthLeft';
import { useBrand } from '../hooks/useBrand';

const LEFT_FEATURES = [
  {
    text: 'Crie uma senha forte com letras, números e símbolos',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
      </svg>
    ),
  },
  {
    text: 'Sua nova senha substitui a anterior imediatamente',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
      </svg>
    ),
  },
  {
    text: 'Seus dados e agendamentos permanecem protegidos',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
  },
];

function calcStrength(senha) {
  let score = 0;
  const rules = {
    length:  senha.length >= 6,
    upper:   /[A-Z]/.test(senha),
    number:  /[0-9]/.test(senha),
    symbol:  /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(senha),
  };
  score = Object.values(rules).filter(Boolean).length;
  return { score, rules };
}

const STRENGTH_LABELS = ['', 'Muito fraca', 'Fraca', 'Boa', 'Forte'];
const STRENGTH_COLORS = ['', '#EF4444', '#F97316', '#EAB308', '#22C55E'];

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

export default function ResetPassword() {
  const brand                   = useBrand();
  const [searchParams]         = useSearchParams();
  const token                   = searchParams.get('token') || '';
  const [novaSenha, setNova]    = useState('');
  const [confirmar, setConfirmar] = useState('');
  const [showNova, setShowNova] = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [status, setStatus]     = useState(null);
  const [msg, setMsg]           = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate                = useNavigate();

  const { score, rules } = calcStrength(novaSenha);
  const senhasMatch = confirmar.length > 0 && novaSenha === confirmar;
  const senhasDiff  = confirmar.length > 0 && novaSenha !== confirmar;

  async function handleSubmit(e) {
    e.preventDefault();
    if (novaSenha !== confirmar) { setStatus('error'); setMsg('As senhas não coincidem'); return; }
    setLoading(true); setStatus(null);
    try {
      const res  = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, novaSenha }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao redefinir senha');
      setStatus('ok');
      setMsg(data.message || 'Senha redefinida com sucesso!');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setStatus('error');
      setMsg(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-gray-900">
        <div className="text-center space-y-4">
          <p className="text-gray-600 dark:text-gray-400">Link inválido ou expirado.</p>
          <Link to="/login" className="text-sm font-medium hover:underline" style={{ color: '#5B3DF5' }}>Voltar para o login</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900 transition-colors">
      <ThemeToggle />

      <AuthLeft
        title={'Nova senha.\nNova fase.'}
        subtitle="Escolha uma senha segura para proteger sua conta."
        features={LEFT_FEATURES}
        brand={brand}
      />

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">

          {status === 'ok' ? (
            <div className="animate-auth text-center space-y-6">
              <div className="w-20 h-20 rounded-full border-2 border-green-400 flex items-center justify-center animate-scale-in mx-auto"
                style={{ background: 'rgba(34,197,94,0.1)' }}>
                <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Senha redefinida!</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{msg}</p>
              </div>
              <div className="rounded-2xl border border-green-200 dark:border-green-800 p-4 text-sm text-green-700 dark:text-green-400"
                style={{ background: 'rgba(34,197,94,0.06)' }}>
                Senha redefinida com segurança. Redirecionando para o login...
              </div>
            </div>
          ) : (
            <div className="animate-auth">
              <div className="mb-8">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Redefinir senha</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Digite e confirme sua nova senha abaixo
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Nova senha */}
                <div style={{ animationDelay: '60ms' }} className="animate-auth">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                    Nova senha
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </span>
                    <input type={showNova ? 'text' : 'password'} required minLength={6}
                      placeholder="Mínimo 6 caracteres"
                      value={novaSenha} onChange={e => setNova(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700/60 text-gray-800 dark:text-gray-100 text-sm transition" />
                    <button type="button" onClick={() => setShowNova(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      {showNova
                        ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                    </button>
                  </div>

                  {/* Strength bar */}
                  {novaSenha.length > 0 && (
                    <div className="mt-2 space-y-2">
                      <div className="flex gap-1">
                        {[1,2,3,4].map(i => (
                          <div key={i} className="h-1 flex-1 rounded-full transition-all duration-300"
                            style={{ background: i <= score ? STRENGTH_COLORS[score] : '#E5E7EB' }} />
                        ))}
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-xs" style={{ color: STRENGTH_COLORS[score] || '#9CA3AF' }}>
                          {STRENGTH_LABELS[score]}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {[
                          { key: 'length', label: 'Mínimo 6 caracteres' },
                          { key: 'upper',  label: 'Letra maiúscula' },
                          { key: 'number', label: 'Número' },
                          { key: 'symbol', label: 'Símbolo (!@#...)' },
                        ].map(({ key, label }) => (
                          <div key={key} className="flex items-center gap-1.5">
                            <span style={{ color: rules[key] ? '#22C55E' : '#9CA3AF' }}>
                              {rules[key]
                                ? <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                : <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>}
                            </span>
                            <span className="text-xs" style={{ color: rules[key] ? '#22C55E' : '#9CA3AF' }}>{label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirmar */}
                <div style={{ animationDelay: '120ms' }} className="animate-auth">
                  <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-1.5">
                    Confirmar nova senha
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </span>
                    <input type={showConf ? 'text' : 'password'} required minLength={6}
                      placeholder="Repita a senha"
                      value={confirmar} onChange={e => setConfirmar(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700/60 text-gray-800 dark:text-gray-100 text-sm transition" />
                    <button type="button" onClick={() => setShowConf(v => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      {showConf
                        ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                        : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
                    </button>
                  </div>
                  {senhasMatch && (
                    <p className="mt-1 text-xs text-green-500 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                      Senhas coincidem
                    </p>
                  )}
                  {senhasDiff && (
                    <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                      As senhas não coincidem
                    </p>
                  )}
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
                      ? <><svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Salvando...</>
                      : 'Salvar nova senha'}
                  </button>
                </div>

                <p className="text-center text-sm text-gray-500 dark:text-gray-400">
                  <Link to="/login" className="font-medium hover:underline" style={{ color: '#5B3DF5' }}>
                    Cancelar e voltar ao login
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
