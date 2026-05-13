import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function TrialExpirado() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">PerÃ­odo de teste encerrado</h1>
        <p className="text-gray-400 mb-8">
          Seu trial de 30 dias chegou ao fim. Escolha um plano para continuar usando o Agendix.
        </p>

        <div className="space-y-3 mb-8">
          {[
            { nome: 'BÃ¡sico',   preco: 'R$ 37/mÃªs', desc: '60 agendamentos Â· 1 usuÃ¡rio' },
            { nome: 'Pro',      preco: 'R$ 57/mÃªs', desc: '300 agendamentos Â· 5 usuÃ¡rios Â· Bot WA' },
            { nome: 'Premium',  preco: 'R$ 97/mÃªs', desc: 'Ilimitado Â· Bot WA Â· Financeiro' },
            { nome: 'Business', preco: 'R$ 127/mÃªs', desc: 'Ilimitado Â· Tudo incluso' },
          ].map(p => (
            <div key={p.nome} className="flex items-center justify-between bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-left">
              <div>
                <p className="text-white font-medium text-sm">{p.nome}</p>
                <p className="text-gray-500 text-xs">{p.desc}</p>
              </div>
              <span className="text-amber-400 font-bold text-sm whitespace-nowrap">{p.preco}</span>
            </div>
          ))}
        </div>

        {user?.role === 'admin' || user?.role === 'super_admin' ? (
          <Link to="/configuracoes"
            className="inline-block w-full bg-amber-500 hover:bg-amber-400 text-white font-semibold py-3 rounded-xl transition-colors">
            Escolher plano agora
          </Link>
        ) : (
          <p className="text-gray-500 text-sm">Entre em contato com o administrador da sua conta para reativar o acesso.</p>
        )}

        <p className="text-gray-600 text-xs mt-4">
          DÃºvidas? <a href="mailto:suporte@divulgabr.com.br" className="underline hover:text-gray-400">suporte@divulgabr.com.br</a>
        </p>
      </div>
    </div>
  );
}

