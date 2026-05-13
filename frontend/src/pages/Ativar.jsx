import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import AuthLeft from '../components/AuthLeft';
import { useBrand } from '../hooks/useBrand';

const LEFT_FEATURES = [
  {
    text: 'Conta ativa com 30 dias grÃ¡tis para testar tudo',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    text: 'Agendamentos, CRM e financeiro disponÃ­veis imediatamente',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    text: 'Suporte por WhatsApp durante todo o perÃ­odo de teste',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
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

export default function Ativar() {
  const brand          = useBrand();
  const [searchParams] = useSearchParams();
  const [status, setStatus]   = useState('loading');
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setStatus('erro');
      setMensagem('Link invÃ¡lido. Nenhum token encontrado.');
      return;
    }
    fetch(`/api/auth/ativar?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.ok) {
          setStatus('ok');
          setMensagem(data.message || 'Conta ativada com sucesso!');
        } else {
          setStatus('erro');
          setMensagem(data.error || 'Erro ao ativar conta.');
        }
      })
      .catch(() => {
        setStatus('erro');
        setMensagem('Erro de conexÃ£o. Tente novamente.');
      });
  }, []);

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900 transition-colors">
      <ThemeToggle />

      <AuthLeft
        title={'Quase lÃ¡!\nAtive sua\nconta.'}
        subtitle="Um clique e vocÃª jÃ¡ pode comeÃ§ar a usar o Agendix com 30 dias grÃ¡tis."
        features={LEFT_FEATURES}
        brand={brand}
      />

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-10 border border-gray-100 dark:border-gray-700 text-center space-y-6 animate-auth">

            {status === 'loading' && (
              <>
                <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
                  style={{ background: 'rgba(91,61,245,0.1)' }}>
                  <svg className="animate-spin w-10 h-10" fill="none" viewBox="0 0 24 24"
                    style={{ color: '#5B3DF5' }}>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Ativando sua conta...</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Aguarde um instante</p>
                </div>
              </>
            )}

            {status === 'ok' && (
              <>
                <div className="w-20 h-20 rounded-full border-2 border-green-400 flex items-center justify-center mx-auto animate-scale-in"
                  style={{ background: 'rgba(34,197,94,0.1)' }}>
                  <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Conta ativada!</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 leading-relaxed">{mensagem}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    Agora vocÃª pode fazer login e comeÃ§ar a usar o Agendix com{' '}
                    <strong className="text-gray-700 dark:text-gray-200">30 dias grÃ¡tis</strong>.
                  </p>
                </div>

                {/* PrÃ³ximos passos */}
                <div className="rounded-2xl border border-gray-200 dark:border-gray-700 p-5 text-left space-y-3"
                  style={{ background: 'rgba(91,61,245,0.04)' }}>
                  <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">O que fazer agora</p>
                  {[
                    'FaÃ§a login com seu email e senha',
                    'Configure sua agenda e serviÃ§os',
                    'Compartilhe seu link de agendamento',
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

                <Link to="/login"
                  className="inline-flex items-center gap-2 px-8 py-3 text-white font-semibold rounded-xl transition"
                  style={{ background: 'linear-gradient(135deg,#5B3DF5,#2F80ED)' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14" />
                  </svg>
                  Ir para o login
                </Link>
              </>
            )}

            {status === 'erro' && (
              <>
                <div className="w-20 h-20 rounded-full border-2 border-red-300 flex items-center justify-center mx-auto animate-scale-in"
                  style={{ background: 'rgba(239,68,68,0.1)' }}>
                  <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Link invÃ¡lido</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{mensagem}</p>
                </div>
                <div className="flex flex-col gap-3">
                  <Link to="/login?mode=register"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 text-white font-semibold rounded-xl transition text-sm"
                    style={{ background: 'linear-gradient(135deg,#5B3DF5,#2F80ED)' }}>
                    Criar nova conta
                  </Link>
                  <Link to="/login"
                    className="text-sm font-medium hover:underline"
                    style={{ color: '#5B3DF5' }}>
                    JÃ¡ tenho conta ativada â†’ Entrar
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

