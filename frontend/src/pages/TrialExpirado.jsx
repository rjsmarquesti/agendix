import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

const PLANOS = [
  { id: 'solo',     nome: 'Solo',     preco: 'R$ 39/mês', desc: '1 usuário · Agendamentos ilimitados · Confirmação WA' },
  { id: 'pro',      nome: 'Pro',      preco: 'R$ 59/mês', desc: 'Ilimitado · 5 usuários · Bot WA completo', destaque: true },
  { id: 'business', nome: 'Business', preco: 'R$ 99/mês', desc: 'Ilimitado · Usuários ilimitados · Bot WA + Agente IA' },
];

export default function TrialExpirado() {
  const { user } = useAuth();
  const [uso, setUso] = useState(null);

  useEffect(() => {
    api.get('/dashboard').then(d => setUso(d)).catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--bg)' }}>

      {/* Glow verde */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full"
          style={{ background: 'radial-gradient(circle, var(--g-glow) 0%, transparent 70%)' }} />
      </div>

      <div className="relative max-w-lg w-full">

        {/* Logo */}
        <div className="flex justify-center mb-10">
          <img src="/logo-agendix-dark.png" alt="Agendix" className="h-10 w-auto object-contain dark:block hidden" />
          <img src="/logo-agendix-light.png" alt="Agendix" className="h-10 w-auto object-contain dark:hidden block" />
        </div>

        {/* Card principal */}
        <div className="rounded-2xl border p-8 text-center mb-6"
          style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--bd)' }}>

          {/* Ícone */}
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: 'var(--a-dim)', border: '1px solid rgba(232,134,10,0.2)' }}>
            <svg className="w-7 h-7" fill="none" stroke="var(--a-lt)" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>

          <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--tx)' }}>
            Seu período de teste encerrou
          </h1>
          <p className="text-sm mb-4" style={{ color: 'var(--tx-md)' }}>
            Os 14 dias gratuitos chegaram ao fim. Escolha um plano e continue sem perder nenhum dado.
          </p>

          {uso && (
            <div className="rounded-xl px-4 py-3 mb-6 text-sm"
              style={{ backgroundColor: 'var(--s2)', borderColor: 'var(--bd)', border: '1px solid' }}>
              <p style={{ color: 'var(--tx-md)' }}>
                Durante seu trial você realizou{' '}
                <strong style={{ color: 'var(--g)' }}>{uso.agendamentosMes ?? 0} agendamentos</strong>
                {uso.totalLeads > 0 && (
                  <> e cadastrou <strong style={{ color: 'var(--g)' }}>{uso.totalLeads} leads</strong></>
                )}.
              </p>
            </div>
          )}

          {/* Planos */}
          <div className="space-y-3 text-left mb-8">
            {PLANOS.map(p => (
              <div key={p.nome}
                className="relative flex items-center justify-between rounded-xl px-4 py-3 border"
                style={p.destaque ? {
                  backgroundColor: 'var(--g-dim)',
                  borderColor: 'rgba(0,201,122,0.3)',
                } : {
                  backgroundColor: 'var(--s2)',
                  borderColor: 'var(--bd)',
                }}>
                {p.destaque && (
                  <span className="absolute -top-2.5 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--g)', color: '#08080C' }}>
                    MAIS POPULAR
                  </span>
                )}
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>{p.nome}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--mt-lt)' }}>{p.desc}</p>
                </div>
                <span className="text-sm font-bold whitespace-nowrap ml-4"
                  style={{ color: p.destaque ? 'var(--g)' : 'var(--tx-md)' }}>
                  {p.preco}
                </span>
              </div>
            ))}
          </div>

          {/* CTA */}
          {user?.role === 'admin' || user?.role === 'super_admin' ? (
            <Link to="/configuracoes"
              className="block w-full py-3.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90"
              style={{ backgroundColor: 'var(--g)', color: '#08080C' }}>
              Escolher meu plano →
            </Link>
          ) : (
            <p className="text-sm" style={{ color: 'var(--tx-md)' }}>
              Fale com o administrador da sua conta para reativar o acesso.
            </p>
          )}
        </div>

        {/* Rodapé */}
        <p className="text-center text-xs" style={{ color: 'var(--mt)' }}>
          Dúvidas?{' '}
          <a href="mailto:suporte@divulgabr.com.br"
            className="underline transition-colors" style={{ color: 'var(--mt-lt)' }}>
            suporte@divulgabr.com.br
          </a>
        </p>

      </div>
    </div>
  );
}
