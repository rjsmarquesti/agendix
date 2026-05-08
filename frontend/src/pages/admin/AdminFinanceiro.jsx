import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';
import { api } from '../../services/api';

const fmt = v => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

const STATUS_BADGE = {
  pago:      'bg-green-900 text-green-300',
  pendente:  'bg-yellow-900 text-yellow-300',
  cancelado: 'bg-slate-700 text-slate-400',
};

const TIPO_BADGE = {
  receita: 'bg-green-900/40 text-green-400',
  despesa: 'bg-red-900/40 text-red-400',
};

const CATEGORIAS_RECEITA = ['assinatura', 'consultoria', 'licença', 'outro'];
const CATEGORIAS_DESPESA = ['infraestrutura', 'marketing', 'folha', 'software', 'impostos', 'outro'];

const EMPTY = {
  tipo: 'receita', descricao: '', valor: '', data: new Date().toISOString().slice(0, 10),
  categoria: '', status: 'pago', tenantId: '', referencia: '', observacoes: '',
};

export default function AdminFinanceiro() {
  const [lancamentos, setLancamentos] = useState([]);
  const [tenants, setTenants]         = useState([]);
  const [loading, setLoading]         = useState(true);
  const [modal, setModal]             = useState(false);
  const [form, setForm]               = useState(EMPTY);
  const [editId, setEditId]           = useState(null);
  const [saving, setSaving]           = useState(false);
  const [confirmDel, setConfirmDel]   = useState(null);

  // Filtros
  const [fTipo,   setFTipo]   = useState('');
  const [fStatus, setFStatus] = useState('');
  const [fMes,    setFMes]    = useState('');

  function buildQuery() {
    const p = new URLSearchParams();
    if (fTipo)   p.set('tipo',   fTipo);
    if (fStatus) p.set('status', fStatus);
    if (fMes)    p.set('mes',    fMes);
    return p.toString();
  }

  async function load() {
    setLoading(true);
    try {
      const [l, t] = await Promise.all([
        api.get(`/admin/financeiro?${buildQuery()}`),
        api.get('/admin/tenants'),
      ]);
      setLancamentos(l);
      setTenants(t.tenants || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [fTipo, fStatus, fMes]); // eslint-disable-line

  function openNew() {
    setForm(EMPTY);
    setEditId(null);
    setModal(true);
  }

  function openEdit(l) {
    setForm({
      tipo: l.tipo, descricao: l.descricao, valor: l.valor,
      data: l.data, categoria: l.categoria || '', status: l.status,
      tenantId: l.tenantId || '', referencia: l.referencia || '',
      observacoes: l.observacoes || '',
    });
    setEditId(l.id);
    setModal(true);
  }

  async function salvar(e) {
    e.preventDefault();
    if (!form.descricao || !form.valor || !form.data) {
      return toast.error('Preencha descrição, valor e data.');
    }
    setSaving(true);
    try {
      if (editId) {
        await api.put(`/admin/financeiro/${editId}`, form);
        toast.success('Lançamento atualizado!');
      } else {
        await api.post('/admin/financeiro', form);
        toast.success('Lançamento criado!');
      }
      setModal(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function deletar(id) {
    try {
      await api.delete(`/admin/financeiro/${id}`);
      toast.success('Excluído!');
      setConfirmDel(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  const categorias = form.tipo === 'receita' ? CATEGORIAS_RECEITA : CATEGORIAS_DESPESA;
  const totalReceita = lancamentos.filter(l => l.tipo === 'receita' && l.status !== 'cancelado').reduce((s, l) => s + Number(l.valor), 0);
  const totalDespesa = lancamentos.filter(l => l.tipo === 'despesa' && l.status !== 'cancelado').reduce((s, l) => s + Number(l.valor), 0);

  return (
    <AdminLayout title="Lançamentos" subtitle="Entradas e saídas da plataforma">

      {/* Filtros + Botão */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={fTipo} onChange={e => setFTipo(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500">
          <option value="">Todos os tipos</option>
          <option value="receita">Receita</option>
          <option value="despesa">Despesa</option>
        </select>
        <select value={fStatus} onChange={e => setFStatus(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500">
          <option value="">Todos os status</option>
          <option value="pago">Pago</option>
          <option value="pendente">Pendente</option>
          <option value="cancelado">Cancelado</option>
        </select>
        <input type="month" value={fMes} onChange={e => setFMes(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500" />
        <div className="flex-1" />
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition">
          + Novo Lançamento
        </button>
      </div>

      {/* Totalizadores */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-slate-400 text-xs">Receita filtrada</p>
          <p className="text-green-400 text-xl font-bold">{fmt(totalReceita)}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-slate-400 text-xs">Despesa filtrada</p>
          <p className="text-red-400 text-xl font-bold">{fmt(totalDespesa)}</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <p className="text-slate-400 text-xs">Saldo</p>
          <p className={`text-xl font-bold ${totalReceita - totalDespesa >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {fmt(totalReceita - totalDespesa)}
          </p>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {loading
          ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>
          : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Data', 'Tipo', 'Descrição', 'Categoria', 'Cliente', 'Valor', 'Status', ''].map(h => (
                    <th key={h} className="text-left text-slate-400 font-medium px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lancamentos.map(l => (
                  <tr key={l.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4 text-slate-400 text-xs whitespace-nowrap">{l.data}</td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${TIPO_BADGE[l.tipo]}`}>
                        {l.tipo}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-white max-w-[180px]">
                      <div className="truncate">{l.descricao}</div>
                      {l.referencia && <div className="text-slate-500 text-xs truncate">{l.referencia}</div>}
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-xs capitalize">{l.categoria || '—'}</td>
                    <td className="px-5 py-4 text-slate-400 text-xs">{l.tenant?.nome || '—'}</td>
                    <td className={`px-5 py-4 font-semibold ${l.tipo === 'receita' ? 'text-green-400' : 'text-red-400'}`}>
                      {l.tipo === 'despesa' ? '−' : '+'}{fmt(l.valor)}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_BADGE[l.status]}`}>
                        {l.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button onClick={() => openEdit(l)}
                          className="text-slate-400 hover:text-white transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => setConfirmDel(l.id)}
                          className="text-slate-400 hover:text-red-400 transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {lancamentos.length === 0 && (
              <div className="text-center py-12 text-slate-500">Nenhum lançamento encontrado.</div>
            )}
          </div>
        )}
      </div>

      {/* Modal criar/editar */}
      {modal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h2 className="text-white font-semibold">{editId ? 'Editar Lançamento' : 'Novo Lançamento'}</h2>
              <button onClick={() => setModal(false)} className="text-slate-400 hover:text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={salvar} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Tipo *</label>
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value, categoria: '' }))}
                    className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500">
                    <option value="receita">Receita</option>
                    <option value="despesa">Despesa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Status *</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500">
                    <option value="pago">Pago</option>
                    <option value="pendente">Pendente</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1">Descrição *</label>
                <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  placeholder="Ex: Assinatura Pro — Cliente ABC"
                  className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Valor (R$) *</label>
                  <input type="number" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))}
                    placeholder="0,00"
                    className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Data *</label>
                  <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Categoria</label>
                  <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500">
                    <option value="">— selecione —</option>
                    {categorias.map(c => <option key={c} value={c} className="capitalize">{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 text-xs mb-1">Cliente (opcional)</label>
                  <select value={form.tenantId} onChange={e => setForm(f => ({ ...f, tenantId: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500">
                    <option value="">— sem cliente —</option>
                    {tenants.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1">Referência / NF</label>
                <input value={form.referencia} onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))}
                  placeholder="ID da assinatura MP, número de nota fiscal, etc."
                  className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500" />
              </div>

              <div>
                <label className="block text-slate-400 text-xs mb-1">Observações</label>
                <textarea rows={2} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500 resize-none" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-800 text-sm transition">
                  Cancelar
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition disabled:opacity-50">
                  {saving ? 'Salvando…' : editId ? 'Salvar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmação de exclusão */}
      {confirmDel && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm text-center">
            <p className="text-white font-semibold mb-2">Excluir lançamento?</p>
            <p className="text-slate-400 text-sm mb-6">Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDel(null)}
                className="flex-1 py-2 rounded-xl border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-800 text-sm transition">
                Cancelar
              </button>
              <button onClick={() => deletar(confirmDel)}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition">
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
