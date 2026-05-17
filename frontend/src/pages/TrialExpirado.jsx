import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PLANOS = [
  { nome: 'Básico',   preco: 'R$ 37/mês',  desc: '100 agendamentos · 1 usuário' },
  { nome: 'Pro',      preco: 'R$ 57/mês',  desc: '300 agendamentos · 5 usuários · Bot WA' },
  { nome: 'Premium',  preco: 'R$ 97/mês',  desc: 'Ilimitado · Bot WA · Agente IA · Financeiro', destaque: true },
  { nome: 'Business', preco: 'R$ 127/mês', desc: 'Ilimitado · Tudo incluso + Financeiro completo' },
];

export default function TrialExpirado() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'linear-gradient(135deg, #0f0f1a 0%, #1a1025 50%, #0f0f1a 100%)' }}>

      {/* Glow de fundo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }} />
      </div>

      <div className="relative max-w-lg w-full">

        {/* Logo */}
        <div className="flex justify-center mb-10">
          <img src="/logo-agendix-dark.png" alt="Agendix" className="h-10 w-auto object-contain" />
        </div>

        {/* Card principal */}
        <div className="rounded-2xl border border-white/10 p-8 text-center mb-6"
          style={{ background: 'rgba(255,255,255,0.04)', backdropFilter: 'blur(12px)' }}>

          {/* Ícone */}
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ background: 'linear-gradient(135deg, #7c3aed22, #a855f722)', border: '1px solid #7c3aed44' }}>
            <svg className="w-7 h-7" fill="none" stroke="#a78bfa" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">Seu período de teste encerrou</h1>
          <p className="text-sm mb-8" style={{ color: 'rgba(148,163,184,0.8)' }}>
            Os 30 dias gratuitos chegaram ao fim. Escolha um plano e continue sem perder nenhum dado.
          </p>

          {/* Planos */}
          <div className="space-y-3 text-left mb-8">
            {PLANOS.map(p => (
              <div key={p.nome}
                className="relative flex items-center justify-between rounded-xl px-4 py-3 transition-all"
                style={p.destaque ? {
                  background: 'linear-gradient(135deg, rgba(124,58,237,0.2), rgba(168,85,247,0.1))',
                  border: '1px solid rgba(124,58,237,0.5)',
                } : {
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                }}>
                {p.destaque && (
                  <span className="absolute -top-2.5 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: 'linear-gradient(90deg,#7c3aed,#a855f7)', color: '#fff' }}>
                    MAIS POPULAR
                  </span>
                )}
                <div>
                  <p className="text-white font-semibold text-sm">{p.nome}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(148,163,184,0.7)' }}>{p.desc}</p>
                </div>
                <span className="text-sm font-bold whitespace-nowrap ml-4"
                  style={{ color: p.destaque ? '#a78bfa' : 'rgba(248,250,252,0.9)' }}>
                  {p.preco}
                </span>
              </div>
            ))}
          </div>

          {/* CTA */}
          {user?.role === 'admin' || user?.role === 'super_admin' ? (
            <Link to="/configuracoes"
              className="block w-full py-3.5 rounded-xl font-semibold text-sm text-white transition-all hover:opacity-90 hover:scale-[1.01]"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
              Escolher meu plano →
            </Link>
          ) : (
            <p className="text-sm" style={{ color: 'rgba(148,163,184,0.7)' }}>
              Fale com o administrador da sua conta para reativar o acesso.
            </p>
          )}
        </div>

        {/* Rodapé */}
        <p className="text-center text-xs" style={{ color: 'rgba(148,163,184,0.4)' }}>
          Dúvidas?{' '}
          <a href="mailto:suporte@divulgabr.com.br"
            className="underline hover:text-purple-400 transition-colors">
            suporte@divulgabr.com.br
          </a>
        </p>

      </div>
    </div>
  );
}
