import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';
import { api } from '../../services/api';

const PLANO_BADGE = {
  basico:   'bg-slate-700 text-slate-200',
  pro:      'bg-blue-900 text-blue-300',
  premium:  'bg-yellow-900 text-yellow-300',
  business: 'bg-purple-900 text-purple-300',
};

const STATUS_BADGE = {
  ativo:        'bg-green-900 text-green-300',
  trial:        'bg-yellow-900 text-yellow-300',
  inadimplente: 'bg-red-900 text-red-300',
  inativo:      'bg-slate-700 text-slate-400',
  cancelado:    'bg-red-900/50 text-red-400',
};

const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

export default function AdminDashboardFinanceiro() {
  const [dash, setDash]     = useState(null);
  const [pagamentos, setPag] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/admin/financeiro/dashboard'),
      api.get('/admin/financeiro/pagamentos'),
    ])
      .then(([d, p]) => { setDash(d); setPag(p); })
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }, []);

  const cards = dash ? [
    { label: 'MRR Estimado',     value: fmt(dash.mrr),          color: 'text-green-400',  sub: `${dash.ativos} clientes ativos` },
    { label: 'Receita do Mês',   value: fmt(dash.receitaMes),   color: 'text-blue-400',   sub: 'lançamentos manuais' },
    { label: 'Despesa do Mês',   value: fmt(dash.despesaMes),   color: 'text-red-400',    sub: 'lançamentos manuais' },
    { label: 'Saldo do Mês',     value: fmt(dash.saldoMes),     color: dash.saldoMes >= 0 ? 'text-green-400' : 'text-red-400', sub: 'receita − despesa' },
    { label: 'Inadimplentes',    value: dash.inadimplentes,     color: 'text-orange-400', sub: 'assinatura atrasada' },
    { label: 'Trials Ativos',    value: dash.trials,            color: 'text-yellow-400', sub: 'em período de teste' },
    { label: 'Total de Clientes',value: dash.totalTenants,      color: 'text-white',      sub: `${dash.ativos} ativos` },
    { label: 'Inativos/Cancelados', value: (dash.inativos || 0) + (dash.cancelados || 0), color: 'text-slate-400', sub: 'sem assinatura ativa' },
  ] : [];

  return (
    <AdminLayout title="Financeiro" subtitle="Dashboard da plataforma SaaS">

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
        </div>
      )}

      {!loading && (
        <>
          {/* Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {cards.map(c => (
              <div key={c.label} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <p className="text-slate-400 text-xs mb-1">{c.label}</p>
                <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
                <p className="text-slate-600 text-xs mt-1">{c.sub}</p>
              </div>
            ))}
          </div>

          {/* Tabela de pagamentos por tenant */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-800">
              <h2 className="text-white font-semibold">Status de Pagamentos — Clientes</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    {['Cliente', 'Plano', 'Valor/mês', 'Status', 'Vencimento', 'Assinatura MP'].map(h => (
                      <th key={h} className="text-left text-slate-400 font-medium px-6 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagamentos.map(t => (
                    <tr key={t.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="text-white font-medium">{t.nome}</div>
                        <div className="text-slate-500 text-xs">{t.slug}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${PLANO_BADGE[t.plano]}`}>
                          {t.plano}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300 font-medium">{fmt(t.valorPlano)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_BADGE[t.planoStatus] || 'bg-slate-700 text-slate-400'}`}>
                          {t.planoStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs">
                        {t.planoVencimento
                          ? new Date(t.planoVencimento).toLocaleDateString('pt-BR')
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-xs font-mono">
                        {t.mpSubscriptionId ? t.mpSubscriptionId.slice(0, 16) + '…' : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {pagamentos.length === 0 && (
                <div className="text-center py-12 text-slate-500">Nenhum cliente cadastrado.</div>
              )}
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
