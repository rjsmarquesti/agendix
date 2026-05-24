import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const TIPO_OPTIONS   = ['receita', 'despesa'];
const STATUS_OPTIONS = ['pago', 'pendente', 'cancelado'];

const TIPO_STYLE = {
  receita: { bg: 'bg-green-100', text: 'text-green-700', label: 'Receita' },
  despesa: { bg: 'bg-red-100',   text: 'text-red-700',   label: 'Despesa' },
};
const STATUS_STYLE = {
  pago:      { bg: 'bg-green-100',  text: 'text-green-700',  label: 'Pago' },
  pendente:  { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Pendente' },
  cancelado: { bg: 'bg-gray-100',   text: 'text-gray-500',   label: 'Cancelado' },
};

const EMPTY_FORM = {
  tipo: 'receita', descricao: '', valor: '', data: new Date().toISOString().split('T')[0],
  categoria: '', status: 'pendente', leadId: '', servicoId: '', observacoes: '',
};

function fmt(valor) {
  return Number(valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function mesAtual() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function BadgeTipo({ tipo }) {
  const s = TIPO_STYLE[tipo] || TIPO_STYLE.receita;
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>{s.label}</span>;
}
function BadgeStatus({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.pendente;
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold ${s.bg} ${s.text}`}>{s.label}</span>;
}

function BannerUpsell() {
  return (
    <div className="rounded-2xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-800 flex items-center justify-center">
        <svg className="w-5 h-5 text-purple-600 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </div>
      <div className="flex-1">
        <p className="font-semibold text-purple-900 dark:text-purple-100">Dashboard financeiro disponível no plano Business</p>
        <p className="text-sm text-purple-700 dark:text-purple-300 mt-0.5">Acesse DRE, ticket médio, contas a vencer e muito mais. Fale com o suporte para fazer upgrade.</p>
      </div>
      <a href="mailto:suporte@divulgabr.com.br?subject=Upgrade%20para%20Business%20-%20Agendix"
        className="flex-shrink-0 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors">
        Fazer upgrade
      </a>
    </div>
  );
}

export default function Financeiro() {
  const { tenant } = useAuth();
  const planoFinanceiro = (() => {
    const m = { solo: false, pro: 'basico', business: 'completo', trial: 'basico' };
    return m[tenant?.plano] || false;
  })();
  const [tab, setTab]               = useState('lancamentos');
  const [lancamentos, setLancamentos] = useState([]);
  const [total, setTotal]           = useState(0);
  const [dashboard, setDashboard]   = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [leads, setLeads]           = useState([]);
  const [servicos, setServicos]     = useState([]);
  const [loading, setLoading]       = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando]     = useState(null);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [periodo, setPeriodo]       = useState(mesAtual());

  const [filtros, setFiltros] = useState({ tipo: '', status: '', categoria: '', dataInicio: '', dataFim: '' });

  const carregarLancamentos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtros.tipo)       params.set('tipo', filtros.tipo);
      if (filtros.status)     params.set('status', filtros.status);
      if (filtros.categoria)  params.set('categoria', filtros.categoria);
      if (filtros.dataInicio) params.set('dataInicio', filtros.dataInicio);
      if (filtros.dataFim)    params.set('dataFim', filtros.dataFim);
      const d = await api.get(`/financeiro?${params}`);
      setLancamentos(d.lancamentos || []);
      setTotal(d.total || 0);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }, [filtros]);

  const carregarDashboard = useCallback(async () => {
    if (planoFinanceiro !== 'completo') return;
    try {
      const d = await api.get(`/financeiro/dashboard?periodo=${periodo}`);
      setDashboard(d);
    } catch (err) { toast.error(err.message); }
  }, [periodo, planoFinanceiro]);

  useEffect(() => { carregarLancamentos(); }, [carregarLancamentos]);
  useEffect(() => { carregarDashboard(); }, [carregarDashboard]);

  useEffect(() => {
    api.get('/financeiro/categorias').then(d => setCategorias(d.categorias || [])).catch(e => console.error('[Financeiro] categorias:', e.message));
    api.get('/leads?limit=200').then(d => setLeads(d.leads || [])).catch(e => console.error('[Financeiro] leads:', e.message));
    api.get('/servicos').then(d => setServicos(d.servicos || [])).catch(e => console.error('[Financeiro] servicos:', e.message));
  }, []);

  function abrirModal(item = null) {
    setEditando(item);
    setForm(item ? {
      tipo: item.tipo, descricao: item.descricao, valor: String(item.valor),
      data: item.data, categoria: item.categoria || '', status: item.status,
      leadId: item.leadId ? String(item.leadId) : '',
      servicoId: item.servicoId ? String(item.servicoId) : '',
      observacoes: item.observacoes || '',
    } : EMPTY_FORM);
    setModalAberto(true);
  }

  async function salvar(e) {
    e.preventDefault();
    if (!form.descricao || !form.valor || !form.data) {
      toast.error('Descrição, valor e data são obrigatórios.'); return;
    }
    setFormLoading(true);
    try {
      if (editando) {
        await api.put(`/financeiro/${editando.id}`, form);
        toast.success('Lançamento atualizado!');
      } else {
        await api.post('/financeiro', form);
        toast.success('Lançamento criado!');
      }
      setModalAberto(false);
      carregarLancamentos();
      carregarDashboard();
    } catch (err) { toast.error(err.message); }
    finally { setFormLoading(false); }
  }

  async function deletar(id) {
    if (!confirm('Remover este lançamento?')) return;
    try {
      await api.delete(`/financeiro/${id}`);
      toast.success('Lançamento removido.');
      carregarLancamentos();
      carregarDashboard();
    } catch (err) { toast.error(err.message); }
  }

  const inp = (id, label, type = 'text', extra = {}) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <input type={type} value={form[id]} onChange={e => setForm(f => ({ ...f, [id]: e.target.value }))}
        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        {...extra} />
    </div>
  );

  const sel = (id, label, options) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <select value={form[id]} onChange={e => setForm(f => ({ ...f, [id]: e.target.value }))}
        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );

  const categoriasUnicas = [...new Set(categorias.map(c => c.categoria))];

  return (
    <Layout title="Financeiro" subtitle="Faturamento, despesas e relatórios">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 mb-6 max-w-sm">
        {[{ id: 'lancamentos', label: 'Lançamentos' }, { id: 'dashboard', label: 'Dashboard' }].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all
              ${tab === t.id ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-gray-100' : 'text-gray-500 hover:text-gray-700'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── ABA LANÇAMENTOS ── */}
      {tab === 'lancamentos' && (
        <div className="space-y-4">
          {/* Filtros + botão novo */}
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 items-stretch sm:items-end">
            <select value={filtros.tipo} onChange={e => setFiltros(f => ({ ...f, tipo: e.target.value }))}
              className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              <option value="">Todos os tipos</option>
              <option value="receita">Receita</option>
              <option value="despesa">Despesa</option>
            </select>
            <select value={filtros.status} onChange={e => setFiltros(f => ({ ...f, status: e.target.value }))}
              className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">
              <option value="">Todos os status</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_STYLE[s].label}</option>)}
            </select>
            {categoriasUnicas.length > 0 && (
              <select value={filtros.categoria} onChange={e => setFiltros(f => ({ ...f, categoria: e.target.value }))}
                className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                <option value="">Todas as categorias</option>
                {categoriasUnicas.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
            <div className="flex gap-2">
              <input type="date" value={filtros.dataInicio} onChange={e => setFiltros(f => ({ ...f, dataInicio: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300" />
              <input type="date" value={filtros.dataFim} onChange={e => setFiltros(f => ({ ...f, dataFim: e.target.value }))}
                className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300" />
            </div>
            <div className="sm:ml-auto">
              <button onClick={() => abrirModal()}
                className="w-full sm:w-auto btn-primary text-white font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Novo lançamento
              </button>
            </div>
          </div>

          {/* Tabela */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">
                    <th className="px-5 py-3">Data</th>
                    <th className="px-5 py-3">Tipo</th>
                    <th className="px-5 py-3">Descrição</th>
                    <th className="px-5 py-3">Categoria</th>
                    <th className="px-5 py-3">Cliente</th>
                    <th className="px-5 py-3">Valor</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={8} className="px-5 py-10 text-center text-gray-400 dark:text-gray-500">Carregando...</td></tr>
                  ) : lancamentos.length === 0 ? (
                    <tr><td colSpan={8} className="px-5 py-10 text-center text-gray-400 dark:text-gray-500">Nenhum lançamento encontrado</td></tr>
                  ) : lancamentos.map(l => (
                    <tr key={l.id} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="px-5 py-3 text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {l.data?.split('-').reverse().join('/')}
                      </td>
                      <td className="px-5 py-3"><BadgeTipo tipo={l.tipo} /></td>
                      <td className="px-5 py-3">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{l.descricao}</p>
                        {l.observacoes && <p className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[200px]">{l.observacoes}</p>}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">{l.categoria || '—'}</td>
                      <td className="px-5 py-3 text-sm text-gray-500 dark:text-gray-400">{l.lead?.nome || '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`text-sm font-bold ${l.tipo === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
                          {l.tipo === 'despesa' ? '−' : '+'}{fmt(l.valor)}
                        </span>
                      </td>
                      <td className="px-5 py-3"><BadgeStatus status={l.status} /></td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => abrirModal(l)} className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                          </button>
                          <button onClick={() => deletar(l.id)} className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {total > 0 && (
              <div className="px-5 py-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400 dark:text-gray-500">
                {lancamentos.length} de {total} lançamento(s)
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ABA DASHBOARD ── */}
      {tab === 'dashboard' && (
        <div className="space-y-6">
          {planoFinanceiro !== 'completo' && <BannerUpsell />}

          {/* Seletor de período — só Business */}
          {planoFinanceiro === 'completo' && <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Período:</label>
            <input type="month" value={periodo} onChange={e => setPeriodo(e.target.value)}
              className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300" />
          </div>}

          {/* Resumo básico para Pro/Premium */}
          {planoFinanceiro === 'basico' && lancamentos.length > 0 && (() => {
            const rec = lancamentos.filter(l => l.tipo === 'receita' && l.status === 'pago').reduce((s, l) => s + Number(l.valor), 0);
            const desp = lancamentos.filter(l => l.tipo === 'despesa' && l.status === 'pago').reduce((s, l) => s + Number(l.valor), 0);
            return (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Receitas pagas</p>
                  <p className="text-2xl font-bold text-green-600">{fmt(rec)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Despesas pagas</p>
                  <p className="text-2xl font-bold text-red-600">{fmt(desp)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Saldo</p>
                  <p className={`text-2xl font-bold ${rec - desp >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{fmt(rec - desp)}</p>
                </div>
              </div>
            );
          })()}

          {/* Cards de resumo completo — Business */}
          {dashboard && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Receita</p>
                  <p className="text-2xl font-bold text-green-600">{fmt(dashboard.totalReceita)}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{dashboard.qtdReceitas} lançamentos</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Despesas</p>
                  <p className="text-2xl font-bold text-red-600">{fmt(dashboard.totalDespesa)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Saldo</p>
                  <p className={`text-2xl font-bold ${dashboard.saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{fmt(dashboard.saldo)}</p>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5">
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Ticket Médio</p>
                  <p className="text-2xl font-bold text-purple-600">{fmt(dashboard.ticketMedio)}</p>
                </div>
              </div>

              {/* Contas a pagar nos próximos 7 dias */}
              {dashboard.pendentes7d?.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-yellow-200 dark:border-yellow-800 p-6">
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    Contas a pagar nos próximos 7 dias
                  </h2>
                  <div className="space-y-2">
                    {dashboard.pendentes7d.map(l => (
                      <div key={l.id} className="flex items-center justify-between py-2 px-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-xl">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{l.descricao}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Vence {l.data?.split('-').reverse().join('/')}{l.categoria ? ` · ${l.categoria}` : ''}</p>
                        </div>
                        <span className="text-sm font-bold text-red-600">{fmt(l.valor)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Modal novo/editar lançamento */}
      <Modal isOpen={modalAberto} onClose={() => setModalAberto(false)}
        title={editando ? 'Editar lançamento' : 'Novo lançamento'}>
        <form onSubmit={salvar} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {sel('tipo', 'Tipo', TIPO_OPTIONS.map(t => ({ value: t, label: TIPO_STYLE[t].label })))}
            {sel('status', 'Status', STATUS_OPTIONS.map(s => ({ value: s, label: STATUS_STYLE[s].label })))}
          </div>
          {inp('descricao', 'Descrição', 'text', { required: true, placeholder: 'Ex: Consulta — Maria Silva' })}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {inp('valor', 'Valor (R$)', 'number', { required: true, step: '0.01', min: '0', placeholder: '0,00' })}
            {inp('data', 'Data', 'date', { required: true })}
          </div>
          {inp('categoria', 'Categoria', 'text', { placeholder: 'Ex: serviço, aluguel, fornecedor' })}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cliente (opcional)</label>
            <select value={form.leadId} onChange={e => setForm(f => ({ ...f, leadId: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
              <option value="">— Nenhum —</option>
              {leads.map(l => <option key={l.id} value={l.id}>{l.nome}{l.telefone ? ` · ${l.telefone}` : ''}</option>)}
            </select>
          </div>
          {servicos.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Serviço (opcional)</label>
              <select value={form.servicoId} onChange={e => setForm(f => ({ ...f, servicoId: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <option value="">— Nenhum —</option>
                {servicos.map(s => <option key={s.id} value={s.id}>{s.nome}{s.preco ? ` — ${fmt(s.preco)}` : ''}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
            <textarea rows={2} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setModalAberto(false)}
              className="px-5 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancelar
            </button>
            <button type="submit" disabled={formLoading}
              className="btn-primary text-white font-semibold px-6 py-2.5 rounded-xl text-sm disabled:opacity-60">
              {formLoading ? 'Salvando...' : editando ? 'Salvar alterações' : 'Criar lançamento'}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
