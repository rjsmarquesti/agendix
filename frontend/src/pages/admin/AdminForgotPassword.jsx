import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function AdminForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao solicitar redefinição');
      setEnviado(true);
    } catch (err) {
      setErro(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg)' }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--g)' }}>
              <svg className="w-7 h-7" stroke="#08080C" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
              </svg>
            </div>
            <span className="font-bold text-2xl tracking-tight" style={{ color: 'var(--tx)' }}>Agendix</span>
          </div>
          <p className="text-sm" style={{ color: 'var(--mt-lt)' }}>Painel Administrativo</p>
        </div>

        <div className="rounded-2xl p-8 border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--bd)' }}>
          {enviado ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-900/40 border border-green-700 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-white font-bold text-lg">Email enviado!</h2>
              <p className="text-slate-400 text-sm">Se o email estiver cadastrado, você receberá um link de redefinição em instantes.</p>
              <Link to="/admin/login" className="block text-blue-400 hover:text-blue-300 text-sm mt-4">
                ← Voltar ao login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-white font-bold text-xl mb-2">Recuperar senha</h2>
              <p className="text-slate-400 text-sm mb-6">Informe seu email de administrador para receber o link de redefinição.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                  <input type="email" required value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="super@admin.com"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                </div>
                {erro && <div className="bg-red-900/30 border border-red-700 text-red-400 px-4 py-3 rounded-xl text-sm">{erro}</div>}
                <button type="submit" disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition text-sm flex items-center justify-center gap-2">
                  {loading
                    ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Enviando...</>
                    : 'Enviar link de redefinição'}
                </button>
                <div className="text-center">
                  <Link to="/admin/login" className="text-slate-400 hover:text-slate-300 text-sm">← Voltar ao login</Link>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
