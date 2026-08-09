import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useBrand } from '../hooks/useBrand';
import BrandLogo from '../components/BrandLogo';

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
const IconBuilding = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
  </svg>
);

/* ── Stats do painel esquerdo ── */
const STATS = [
  { valor: '+65',   label: 'Páginas no sistema' },
  { valor: '+13',   label: 'Páginas admin' },
  { valor: '100%',  label: 'Online e Seguro' },
];

/* ── Logo Agendix inline ── */
function AgendixBrand({ accent = '#00C97A', dark = false }) {
  const textColor = dark ? '#EEEEF5' : '#111118';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{
        width: 30, height: 30, borderRadius: 7,
        background: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="#fff" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <span style={{ fontSize: 18, fontWeight: 800, color: textColor, letterSpacing: '-0.04em' }}>
        agendix
      </span>
    </div>
  );
}

export default function Login() {
  const [form, setForm] = useState({ slug: localStorage.getItem('crm_slug') || '', email: '', senha: '' });
  const [showSenha, setShowSenha] = useState(false);
  const [lembrar, setLembrar] = useState(false);
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
      let data;
      try { data = await res.json(); } catch { data = { error: `Erro ${res.status} — resposta inválida do servidor` }; }
      if (!res.ok && (res.status === 400 || res.status === 404) && !form.slug.trim()) {
        const res2 = await fetch('/api/auth/super-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.email, senha: form.senha }),
        });
        let data2;
        try { data2 = await res2.json(); } catch { data2 = { error: `Erro ${res2.status} — resposta inválida do servidor` }; }
        if (!res2.ok) throw new Error(data2.error || 'Email ou senha incorretos');
        login(data2); navigate('/'); return;
      }
      if (!res.ok) throw new Error(data.error || 'Email ou senha incorretos');
      if (data.tenant?.slug) localStorage.setItem('crm_slug', data.tenant.slug);
      login(data); navigate('/');
    } catch (err) { setErro(err.message); }
    finally { setLoading(false); }
  }

  /* ── Estilos de input ── */
  const inputStyle = {
    width: '100%', padding: '11px 12px 11px 38px',
    border: '1px solid var(--bd-md)', borderRadius: 'var(--r)',
    backgroundColor: 'var(--surface)', color: 'var(--tx)',
    fontSize: 14, fontFamily: 'var(--sans)',
    outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s, box-shadow 0.15s',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', backgroundColor: 'var(--bg)' }}>

      {/* ── Painel Esquerdo (hero dark) ── */}
      <div className="hidden lg:flex" style={{
        width: '45%', flexShrink: 0,
        flexDirection: 'column', justifyContent: 'space-between',
        backgroundColor: '#0A0A12',
        padding: '40px 48px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Glow de fundo */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          backgroundImage: 'radial-gradient(ellipse at 20% 80%, rgba(0,201,122,0.12) 0%, transparent 55%), radial-gradient(ellipse at 80% 10%, rgba(99,102,241,0.10) 0%, transparent 50%)',
        }} />

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {brand.logo
            ? <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <BrandLogo logo={brand.logo} nome={brand.nome} size="lg" dark />
                <span style={{ fontSize: 16, fontWeight: 700, color: '#EEEEF5' }}>{brand.nome}</span>
              </div>
            : <AgendixBrand accent="#00C97A" dark />
          }
        </div>

        {/* Headline */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h2 style={{ fontSize: 30, fontWeight: 800, color: '#EEEEF5', letterSpacing: '-0.03em', margin: '0 0 12px', lineHeight: 1.2 }}>
            Plataforma <span style={{ color: '#00C97A' }}>completa</span><br />
            para gestão do<br />
            <span style={{ color: '#00C97A' }}>seu negócio</span>
          </h2>
          <p style={{ fontSize: 14, color: '#7878A0', margin: '0 0 32px', lineHeight: 1.6 }}>
            Agendamentos, CRM, WhatsApp, Financeiro<br />e muito mais. Em um só sistema.
          </p>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 28, marginBottom: 36 }}>
            {STATS.map(({ valor, label }) => (
              <div key={label}>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#EEEEF5', margin: 0, letterSpacing: '-0.03em' }}>{valor}</p>
                <p style={{ fontSize: 11, color: '#7878A0', margin: 0 }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Tagline */}
          <p style={{ fontSize: 14, fontWeight: 600, color: '#EEEEF5', margin: 0 }}>
            Conecte.{' '}
            <span style={{ color: '#00C97A' }}>Organize.</span>{' '}
            <span style={{ color: '#00C97A' }}>Cresça.</span>
          </p>
        </div>

        {/* Footer */}
        <p style={{ position: 'relative', zIndex: 1, fontSize: 11, color: '#42425A', margin: 0 }}>
          © 2026 Agendix · DivulgaBR
        </p>
      </div>

      {/* ── Painel Direito (formulário) ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '40px 24px', position: 'relative',
        backgroundColor: 'var(--bg)', overflowY: 'auto',
      }}>

        {/* Toggle tema */}
        <button onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          style={{
            position: 'absolute', top: 20, right: 20,
            width: 36, height: 36, borderRadius: 'var(--r)',
            border: '1px solid var(--bd-md)', background: 'var(--surface)',
            color: 'var(--mt-lt)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.12s',
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--s2)'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'var(--surface)'}>
          {theme === 'dark'
            ? <svg width={15} height={15} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            : <svg width={15} height={15} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
          }
        </button>

        <div style={{ width: '100%', maxWidth: 400 }} className="animate-auth">

          {/* Logo mobile */}
          <div className="flex lg:hidden justify-center mb-8">
            {brand.logo
              ? <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <BrandLogo logo={brand.logo} nome={brand.nome} size="lg" />
                  <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--tx)' }}>{brand.nome}</span>
                </div>
              : <AgendixBrand accent="var(--g)" />
            }
          </div>

          {/* Card do formulário */}
          <div style={{
            backgroundColor: 'var(--surface)',
            border: '1px solid var(--bd)',
            borderRadius: 'var(--r-xl)',
            padding: '32px 32px 28px',
            boxShadow: 'var(--shadow-card)',
          }}>
            {/* Header do card */}
            <div style={{ marginBottom: 24 }}>
              <div className="hidden lg:block" style={{ marginBottom: 16 }}>
                <AgendixBrand accent="var(--g)" />
              </div>
              <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--tx)', margin: '0 0 4px', letterSpacing: '-0.02em' }}>
                Bem-vindo(a) ao Agendix
              </h1>
              <p style={{ fontSize: 13, color: 'var(--mt-lt)', margin: 0 }}>
                Faça login para acessar sua conta
              </p>
            </div>

            <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* E-mail da empresa (slug) */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx-md)', display: 'block', marginBottom: 6 }}>
                  Empresa <span style={{ fontSize: 11, color: 'var(--mt-lt)', fontWeight: 400 }}>(deixe em branco para admin)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--mt-lt)', pointerEvents: 'none' }}>
                    <IconBuilding />
                  </span>
                  <input type="text" placeholder="minha-empresa"
                    value={form.slug} onChange={set('slug')}
                    style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = 'var(--g)'; e.target.style.boxShadow = 'var(--shadow-glow)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--bd-md)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              {/* E-mail */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx-md)', display: 'block', marginBottom: 6 }}>
                  E-mail
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--mt-lt)', pointerEvents: 'none' }}>
                    <IconMail />
                  </span>
                  <input type="email" required placeholder="seu@email.com"
                    value={form.email} onChange={set('email')}
                    style={inputStyle}
                    onFocus={e => { e.target.style.borderColor = 'var(--g)'; e.target.style.boxShadow = 'var(--shadow-glow)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--bd-md)'; e.target.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              {/* Senha */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--tx-md)' }}>Senha</label>
                  <Link to="/esqueci-senha"
                    style={{ fontSize: 12, color: 'var(--g)', textDecoration: 'none', fontWeight: 500 }}
                    onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
                    Esqueci minha senha
                  </Link>
                </div>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--mt-lt)', pointerEvents: 'none' }}>
                    <IconLock />
                  </span>
                  <input type={showSenha ? 'text' : 'password'} required placeholder="••••••••"
                    value={form.senha} onChange={set('senha')}
                    style={{ ...inputStyle, paddingRight: 40 }}
                    onFocus={e => { e.target.style.borderColor = 'var(--g)'; e.target.style.boxShadow = 'var(--shadow-glow)'; }}
                    onBlur={e => { e.target.style.borderColor = 'var(--bd-md)'; e.target.style.boxShadow = 'none'; }}
                  />
                  <button type="button" onClick={() => setShowSenha(v => !v)}
                    style={{
                      position: 'absolute', right: 11, top: '50%', transform: 'translateY(-50%)',
                      background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mt-lt)', padding: 0,
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--tx)'}
                    onMouseLeave={e => e.currentTarget.style.color = 'var(--mt-lt)'}>
                    <IconEye off={showSenha} />
                  </button>
                </div>
              </div>

              {/* Lembrar acesso */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={lembrar} onChange={e => setLembrar(e.target.checked)}
                  style={{ width: 15, height: 15, accentColor: 'var(--g)', cursor: 'pointer' }} />
                <span style={{ fontSize: 13, color: 'var(--mt-lt)' }}>Lembrar meu acesso</span>
              </label>

              {/* Erro */}
              {erro && (
                <div style={{
                  backgroundColor: 'var(--err-dim)', border: '1px solid var(--err)',
                  color: 'var(--err)', padding: '10px 14px', borderRadius: 'var(--r)',
                  fontSize: 13,
                }}>
                  {erro}
                </div>
              )}

              {/* Botão entrar */}
              <button type="submit" disabled={loading}
                style={{
                  width: '100%', padding: '12px',
                  borderRadius: 'var(--r)', border: 'none',
                  backgroundColor: 'var(--g)', color: '#08080C',
                  fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.75 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'opacity 0.15s',
                  fontFamily: 'var(--sans)',
                }}
                onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.9'; }}
                onMouseLeave={e => { if (!loading) e.currentTarget.style.opacity = '1'; }}>
                {loading
                  ? <><svg style={{ animation: 'spin 1s linear infinite', width: 16, height: 16 }}
                      fill="none" viewBox="0 0 24 24">
                      <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>Entrando...</>
                  : 'Entrar'
                }
              </button>
            </form>
          </div>

          {/* Link cadastro */}
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--mt-lt)', marginTop: 20 }}>
            Ainda não tem conta?{' '}
            <Link to="/cadastro"
              style={{ color: 'var(--g)', fontWeight: 600, textDecoration: 'none' }}
              onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
              onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}>
              Comece grátis por 14 dias
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
