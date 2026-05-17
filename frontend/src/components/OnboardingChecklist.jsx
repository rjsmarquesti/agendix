import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';

function Passo({ passo, numero }) {
  const base = 'flex items-start gap-3 p-3 rounded-xl transition-colors';
  const estilo = passo.concluido
    ? `${base} opacity-50`
    : `${base} bg-white dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 shadow-sm`;

  const conteudo = (
    <div className={estilo}>
      <div className={`mt-0.5 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
        ${passo.concluido
          ? 'bg-green-500 text-white'
          : 'bg-blue-600 text-white'}`}>
        {passo.concluido
          ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          : numero}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold ${passo.concluido ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-gray-100'}`}>
          {passo.label}
        </p>
        {!passo.concluido && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{passo.descricao}</p>
        )}
      </div>
      {!passo.concluido && (
        <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </div>
  );

  if (passo.concluido) return conteudo;
  if (passo.externo) return <a href={passo.link} target="_blank" rel="noopener noreferrer">{conteudo}</a>;
  return <Link to={passo.link}>{conteudo}</Link>;
}

export default function OnboardingChecklist() {
  const [dados, setDados] = useState(null);
  const [fechado, setFechado] = useState(false);

  useEffect(() => {
    api.get('/dashboard/onboarding')
      .then(setDados)
      .catch(e => console.error('[Onboarding]:', e.message));
  }, []);

  if (!dados || fechado) return null;

  const concluidos = dados.passos.filter(p => p.concluido).length;
  const total = dados.passos.length;
  const todosFeitos = concluidos === total;

  if (todosFeitos) return null;

  const pct = Math.round((concluidos / total) * 100);

  return (
    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-100 dark:border-blue-800/50 rounded-2xl p-5 mb-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
            Configure seu Agendix 🚀
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {concluidos} de {total} passos concluídos
          </p>
        </div>
        <button
          onClick={() => setFechado(true)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1"
          title="Fechar"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Barra de progresso */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mb-4">
        <div
          className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="space-y-2">
        {dados.passos.map((passo, i) => (
          <Passo key={passo.id} passo={passo} numero={i + 1} />
        ))}
      </div>

      {dados.linkPublico && (
        <div className="mt-4 pt-4 border-t border-blue-100 dark:border-blue-800/50">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Seu link de agendamento:</p>
          <div className="flex items-center gap-2">
            <code className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2 py-1 flex-1 truncate text-blue-600 dark:text-blue-400">
              {dados.linkPublico}
            </code>
            <button
              onClick={() => { navigator.clipboard.writeText(dados.linkPublico); }}
              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded-lg transition-colors flex-shrink-0"
              title="Copiar link"
            >
              Copiar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
