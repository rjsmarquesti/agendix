import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function IconShield() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  );
}

// Etapa 1: email + senha
function StepCredentials({ onSuccess, onTotpRequired }) {
  const [form, setForm] = useState({ email: '', senha: '' });
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/super-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (res.status === 403 && data.code === 'TOTP_REQUIRED') {
        onTotpRequired(form); // passa credenciais para etapa 2
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Acesso negado');
      if (data.user?.role !== 'super_admin') throw new Error('Acesso restrito a administradores do sistema');
      onSuccess(data);
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
        <input type="email" required autoFocus value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          placeholder="super@crm.com"
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-1">Senha</label>
        <input type="password" required value={form.senha}
          onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
          placeholder="••••••••"
          className="w-full px-4 py-3 bg-slate-800 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
      </div>
      {erro && <p className="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-xl text-sm">{erro}</p>}
      <button type="submit" disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition text-sm flex items-center justify-center gap-2">
        {loading ? <><Spinner />Verificando...</> : 'Continuar'}
      </button>
    </form>
  );
}

// Etapa 2: código TOTP (6 dígitos)
function StepTotp({ credenciais, onSuccess, onVoltar }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const inputs = useRef([]);

  useEffect(() => { inputs.current[0]?.focus(); }, []);

  function handleChange(idx, val) {
    const v = val.replace(/\D/g, '').slice(0, 1);
    const next = [...digits];
    next[idx] = v;
    setDigits(next);
    if (v && idx < 5) inputs.current[idx + 1]?.focus();
  }

  function handleKeyDown(idx, e) {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
    if (e.key === 'ArrowLeft' && idx > 0) inputs.current[idx - 1]?.focus();
    if (e.key === 'ArrowRight' && idx < 5) inputs.current[idx + 1]?.focus();
  }

  function handlePaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      inputs.current[5]?.focus();
    }
    e.preventDefault();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const totp = digits.join('');
    if (totp.length < 6) { setErro('Digite os 6 dígitos'); return; }
    setErro('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/super-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...credenciais, totp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Código inválido');
      if (data.user?.role !== 'super_admin') throw new Error('Acesso negado');
      onSuccess(data);
    } catch (err) {
      setErro(err.message);
      setDigits(['', '', '', '', '', '']);
      setTimeout(() => inputs.current[0]?.focus(), 50);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600/20 rounded-full mb-3">
          <IconShield />
        </div>
        <p className="text-slate-300 text-sm">Digite o código de 6 dígitos do seu aplicativo autenticador.</p>
      </div>

      {/* Inputs individuais por dígito */}
      <div className="flex gap-2 justify-center" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={el => { inputs.current[i] = el; }}
            type="text" inputMode="numeric" maxLength={1}
            value={d}
            onChange={e => handleChange(i, e.target.value)}
            onKeyDown={e => handleKeyDown(i, e)}
            className="w-11 h-14 text-center text-xl font-bold bg-slate-800 border border-slate-600 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        ))}
      </div>

      {erro && <p className="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-xl text-sm text-center">{erro}</p>}

      <div className="space-y-2">
        <button type="submit" disabled={loading || digits.join('').length < 6}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition text-sm flex items-center justify-center gap-2">
          {loading ? <><Spinner />Verificando...</> : 'Verificar código'}
        </button>
        <button type="button" onClick={onVoltar}
          className="w-full text-slate-500 hover:text-slate-300 text-sm py-2 transition">
          Voltar ao login
        </button>
      </div>
    </form>
  );
}

export default function AdminLogin() {
  const [etapa, setEtapa] = useState('credenciais'); // 'credenciais' | 'totp'
  const [credenciais, setCredenciais] = useState(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  function handleSuccess(data) {
    login(data);
    navigate('/admin');
  }

  function handleTotpRequired(creds) {
    setCredenciais(creds);
    setEtapa('totp');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <span className="text-white font-bold text-2xl tracking-tight">Divulga BR</span>
          </div>
          <p className="text-slate-400 text-sm">Painel Administrativo</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <h2 className="text-white font-bold text-xl mb-1">
            {etapa === 'totp' ? 'Verificação em duas etapas' : 'Acesso restrito'}
          </h2>
          {etapa === 'credenciais' && (
            <p className="text-slate-500 text-sm mb-6">Somente administradores do sistema.</p>
          )}
          {etapa === 'totp' && (
            <p className="text-slate-500 text-sm mb-6">Abra o Google Authenticator ou Authy.</p>
          )}

          {etapa === 'credenciais' && (
            <StepCredentials
              onSuccess={handleSuccess}
              onTotpRequired={handleTotpRequired}
            />
          )}
          {etapa === 'totp' && (
            <StepTotp
              credenciais={credenciais}
              onSuccess={handleSuccess}
              onVoltar={() => { setEtapa('credenciais'); setCredenciais(null); }}
            />
          )}
        </div>

        <div className="text-center mt-4">
          <Link to="/admin/esqueci-senha" className="text-slate-500 hover:text-slate-300 text-xs transition-colors">
            Esqueci minha senha
          </Link>
          <p className="text-slate-700 text-xs mt-1">Divulga BR — Agendix</p>
        </div>
      </div>
    </div>
  );
}
