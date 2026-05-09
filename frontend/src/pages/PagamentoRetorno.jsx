import { useSearchParams, Link } from 'react-router-dom';

export default function PagamentoRetorno() {
  const [params] = useSearchParams();
  const status = params.get('status');

  const aprovado = status === 'approved' || status === 'authorized';

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        {aprovado ? (
          <>
            <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Assinatura ativada!</h1>
            <p className="text-gray-400 mb-8">
              Seu plano foi ativado com sucesso. Pode levar alguns instantes para o sistema refletir o novo status.
            </p>
            <Link to="/"
              className="inline-block w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-3 rounded-xl transition-colors">
              Ir para o painel
            </Link>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Pagamento não concluído</h1>
            <p className="text-gray-400 mb-8">
              O pagamento foi cancelado ou não foi processado. Você pode tentar novamente a qualquer momento.
            </p>
            <Link to="/configuracoes"
              className="inline-block w-full bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 rounded-xl transition-colors">
              Tentar novamente
            </Link>
          </>
        )}
        <p className="text-gray-600 text-xs mt-4">
          Dúvidas? <a href="mailto:suporte@divulgabr.com.br" className="underline hover:text-gray-400">suporte@divulgabr.com.br</a>
        </p>
      </div>
    </div>
  );
}
