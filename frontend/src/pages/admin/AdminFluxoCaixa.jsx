import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';
import { api } from '../../services/api';

const fmt  = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
const fmtK = v => {
  const abs = Math.abs(v);
  if (abs >= 1000) return `R$${(v / 1000).toFixed(1)}k`;
  return `R$${v.toFixed(0)}`;
};

const MES_LABEL = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function mesLabel(mes) {
  const [, m] = mes.split('-');
  return MES_LABEL[parseInt(m, 10) - 1];
}

export default function AdminFluxoCaixa() {
  const [dados, setDados]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/admin/financeiro/fluxo-caixa')
      .then(d => setDados(d))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  const maxVal = Math.max(
    ...dados.map(d => Math.max(d.receita, d.despesa, 1)),
    1
  );

  const saldoTotal = dados.reduce((s, d) => s + d.saldo, 0);
  const receitaTotal = dados.reduce((s, d) => s + d.receita, 0);
  const despesaTotal = dados.reduce((s, d) => s + d.despesa, 0);

  return (
    <AdminLayout title="Fluxo de Caixa" subtitle="Últimos 12 meses">

      {loading && (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
        </div>
      )}

      {!loading && (
        <>
          {/* Cards resumo */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <p className="text-slate-400 text-xs mb-1">Receita Total (12m)</p>
              <p className="text-green-400 text-2xl font-bold">{fmt(receitaTotal)}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <p className="text-slate-400 text-xs mb-1">Despesa Total (12m)</p>
              <p className="text-red-400 text-2xl font-bold">{fmt(despesaTotal)}</p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <p className="text-slate-400 text-xs mb-1">Saldo Acumulado</p>
              <p className={`text-2xl font-bold ${saldoTotal >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(saldoTotal)}</p>
            </div>
          </div>

          {/* Gráfico de barras CSS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
            <div className="flex items-center gap-6 mb-6 text-sm">
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-green-500" /><span className="text-slate-400">Receita</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-red-500" /><span className="text-slate-400">Despesa</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-blue-500" /><span className="text-slate-400">Saldo</span></div>
            </div>

            <div className="flex items-end gap-2 h-48 overflow-x-auto pb-2">
              {dados.map(d => {
                const hRec  = maxVal > 0 ? (d.receita / maxVal) * 160 : 0;
                const hDesp = maxVal > 0 ? (d.despesa / maxVal) * 160 : 0;
                const hSald = maxVal > 0 ? (Math.abs(d.saldo) / maxVal) * 160 : 0;
                return (
                  <div key={d.mes} className="flex flex-col items-center gap-1 flex-1 min-w-[52px] group">
                    <div className="flex items-end gap-[2px] h-40">
                      <div title={`Receita: ${fmt(d.receita)}`}
                        style={{ height: hRec }}
                        className="w-3 bg-green-500 rounded-t hover:bg-green-400 transition-all cursor-default" />
                      <div title={`Despesa: ${fmt(d.despesa)}`}
                        style={{ height: hDesp }}
                        className="w-3 bg-red-500 rounded-t hover:bg-red-400 transition-all cursor-default" />
                      <div title={`Saldo: ${fmt(d.saldo)}`}
                        style={{ height: hSald }}
                        className={`w-3 rounded-t hover:opacity-80 transition-all cursor-default ${d.saldo >= 0 ? 'bg-blue-500' : 'bg-orange-500'}`} />
                    </div>
                    <span className="text-slate-500 text-xs">{mesLabel(d.mes)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tabela detalhada */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800">
              <h2 className="text-white font-semibold">Detalhamento Mensal</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Mês', 'Receita', 'Despesa', 'Saldo do Mês', 'Saldo Acumulado'].map(h => (
                      <th key={h} className="text-left text-slate-400 font-medium px-6 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dados.map(d => (
                    <tr key={d.mes} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4 text-slate-300 font-medium">{mesLabel(d.mes)} {d.mes.split('-')[0]}</td>
                      <td className="px-6 py-4 text-green-400 font-medium">{fmt(d.receita)}</td>
                      <td className="px-6 py-4 text-red-400 font-medium">{fmt(d.despesa)}</td>
                      <td className={`px-6 py-4 font-semibold ${d.saldo >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {d.saldo >= 0 ? '+' : ''}{fmt(d.saldo)}
                      </td>
                      <td className={`px-6 py-4 font-semibold ${d.saldoAcumulado >= 0 ? 'text-blue-400' : 'text-orange-400'}`}>
                        {fmt(d.saldoAcumulado)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {dados.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  Nenhum dado financeiro encontrado. Adicione lançamentos para visualizar o fluxo de caixa.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
