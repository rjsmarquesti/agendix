import { useSearchParams, Link } from 'react-router-dom';

export default function PagamentoRetorno() {
  const [params] = useSearchParams();
  const status = params.get('status');
  const aprovado = status === 'approved' || status === 'authorized';

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--bg)' }}>
      <div className="max-w-md w-full text-center rounded-2xl border p-10"
        style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--bd)' }}>
        {aprovado ? (
          <>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: 'var(--g-dim)', border: '1px solid rgba(0,201,122,0.25)' }}>
              <svg className="w-8 h-8" fill="none" stroke="var(--g)" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--tx)' }}>Assinatura ativada!</h1>
            <p className="mb-8" style={{ color: 'var(--tx-md)' }}>
              Seu plano foi ativado com sucesso. Pode levar alguns instantes para o sistema refletir o novo status.
            </p>
            <Link to="/"
              className="inline-block w-full font-semibold py-3 rounded-xl transition-colors"
              style={{ backgroundColor: 'var(--g)', color: '#08080C' }}>
              Ir para o painel
            </Link>
          </>
        ) : (
          <>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
              style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--tx)' }}>Pagamento não concluído</h1>
            <p className="mb-8" style={{ color: 'var(--tx-md)' }}>
              O pagamento foi cancelado ou não foi processado. Você pode tentar novamente a qualquer momento.
            </p>
            <Link to="/configuracoes"
              className="inline-block w-full font-semibold py-3 rounded-xl transition-colors"
              style={{ backgroundColor: 'var(--g)', color: '#08080C' }}>
              Tentar novamente
            </Link>
          </>
        )}
        <p className="text-xs mt-6" style={{ color: 'var(--mt)' }}>
          Dúvidas?{' '}
          <a href="mailto:suporte@divulgabr.com.br" className="underline" style={{ color: 'var(--mt-lt)' }}>
            suporte@divulgabr.com.br
          </a>
        </p>
      </div>
    </div>
  );
}
