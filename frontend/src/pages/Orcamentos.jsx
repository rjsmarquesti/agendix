import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { getNichoLabel } from '../config/nichoLabels';
// pdfGenerator carregado sob demanda
import { api } from '../services/api';
import toast from 'react-hot-toast';

const STATUS_OPTS = [
  { value: 'rascunho', label: 'Rascunho',  color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  { value: 'enviado',  label: 'Enviado',   color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  { value: 'aprovado', label: 'Aprovado',  color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  { value: 'recusado', label: 'Recusado',  color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
  { value: 'expirado', label: 'Expirado',  color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
];

function statusInfo(s) { return STATUS_OPTS.find(o => o.value === s) || STATUS_OPTS[0]; }

function moeda(v) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function calcTotal(itens) {
  return itens.reduce((acc, i) => acc + (Number(i.qtd) || 0) * (Number(i.valorUnit) || 0), 0);
}

const ITEM_VAZIO = { descricao: '', qtd: 1, valorUnit: '' };

export default function Orcamentos() {
  const { tenant } = useAuth();
  const nicho = tenant?.nichoLabel || 'geral';
  const title = getNichoLabel(nicho, 'orcamentos', 'title', 'Orçamentos');

  const [orcamentos, setOrcamentos] = useState([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [search, setSearch]         = useState('');
  const [filtroStatus, setFiltro]   = useState('');
  const [loading, setLoading]       = useState(true);
  const [modal, setModal]           = useState(false);
  const [editing, setEditing]       = useState(null);
  const [viewOrc, setViewOrc]       = useState(null);
  const [saving, setSaving]         = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [modalEnvio, setModalEnvio] = useState(null); // { orc, canal: 'wa'|'email' }
  const [enviando, setEnviando]     = useState(false);
  const [envioTel, setEnvioTel]     = useState('');
  const [envioEmail, setEnvioEmail] = useState('');

  const [form, setForm] = useState({
    clienteNome: '', clienteTel: '', descricao: '',
    itens: [{ ...ITEM_VAZIO }], validadeAte: '', observacoes: '', status: 'rascunho',
  });

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, ...(search ? { search } : {}), ...(filtroStatus ? { status: filtroStatus } : {}) });
      const data = await api.get(`/orcamentos?${params}`);
      setOrcamentos(data.orcamentos || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(err.message || 'Erro ao carregar orçamentos');
    } finally {
      setLoading(false);
    }
  }, [page, search, filtroStatus]);

  useEffect(() => { carregar(); }, [carregar]);

  function abrirNovo() {
    setEditing(null);
    setForm({ clienteNome: '', clienteTel: '', descricao: '', itens: [{ ...ITEM_VAZIO }], validadeAte: '', observacoes: '', status: 'rascunho' });
    setModal(true);
  }

  function abrirEditar(o) {
    setEditing(o);
    setForm({
      clienteNome: o.clienteNome, clienteTel: o.clienteTel || '',
      descricao: o.descricao || '',
      itens: Array.isArray(o.itens) && o.itens.length ? o.itens : [{ ...ITEM_VAZIO }],
      validadeAte: o.validadeAte || '', observacoes: o.observacoes || '', status: o.status,
    });
    setModal(true);
  }

  function setItem(idx, key, val) {
    setForm(f => {
      const itens = [...f.itens];
      itens[idx] = { ...itens[idx], [key]: val };
      return { ...f, itens };
    });
  }

  function addItem()    { setForm(f => ({ ...f, itens: [...f.itens, { ...ITEM_VAZIO }] })); }
  function removeItem(i){ setForm(f => ({ ...f, itens: f.itens.filter((_, idx) => idx !== i) })); }

  async function salvar() {
    if (!form.clienteNome.trim()) return toast.error('Nome do cliente obrigatório');
    setSaving(true);
    try {
      const body = {
        clienteNome: form.clienteNome, clienteTel: form.clienteTel || null,
        descricao: form.descricao || null,
        itens: form.itens.filter(i => i.descricao?.trim()),
        validadeAte: form.validadeAte || null, observacoes: form.observacoes || null,
        status: form.status,
      };
      if (editing) {
        await api.put(`/orcamentos/${editing.id}`, body);
        toast.success('Orçamento atualizado');
      } else {
        await api.post('/orcamentos', body);
        toast.success('Orçamento criado');
      }
      setModal(false);
      setPage(1);
      carregar();
    } catch (err) {
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  async function deletar(id) {
    if (!confirm('Remover este orçamento?')) return;
    try {
      await api.delete(`/orcamentos/${id}`);
      toast.success('Orçamento removido');
      carregar();
    } catch (err) {
      toast.error(err.message || 'Erro ao remover');
    }
  }

  async function alterarStatus(id, status) {
    try {
      await api.put(`/orcamentos/${id}`, { status });
      carregar();
    } catch (err) {
      toast.error('Erro ao atualizar status');
    }
  }

  async function confirmarEnvio() {
    if (!modalEnvio) return;
    setEnviando(true);
    try {
      const { orc, canal } = modalEnvio;
      if (canal === 'wa') {
        await api.post(`/orcamentos/${orc.id}/enviar-wa`, { telefone: envioTel });
        toast.success('Orçamento enviado via WhatsApp! ✅');
      } else {
        await api.post(`/orcamentos/${orc.id}/enviar-email`, { email: envioEmail });
        toast.success('Orçamento enviado por e-mail! ✅');
      }
      setModalEnvio(null);
      setViewOrc(v => v ? { ...v, status: v.status === 'rascunho' ? 'enviado' : v.status } : v);
      carregar();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao enviar orçamento');
    } finally {
      setEnviando(false);
    }
  }

  function abrirModalEnvio(orc, canal) {
    setEnvioTel(orc.clienteTel || orc.lead?.telefone || '');
    setEnvioEmail('');
    setModalEnvio({ orc, canal });
  }

  async function abrirDetalhes(o) {
    try {
      const data = await api.get(`/orcamentos/${o.id}`);
      setViewOrc(data.orcamento);
    } catch (err) {
      toast.error('Erro ao carregar orçamento');
    }
  }

  const pages   = Math.ceil(total / 20);
  const totalForm = calcTotal(form.itens);
  const inp = 'w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const inpStyle = { backgroundColor: 'var(--s2)', borderColor: 'var(--bd)', color: 'var(--tx)' };

  return (
    <Layout title={title}>
      <div className="px-4 md:px-8 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--tx)' }}>{title}</h1>
            <p className="text-sm" style={{ color: 'var(--mt-lt)' }}>{total} orçamento{total !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={abrirNovo}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: tenant?.corPrimaria || 'var(--g)', color: '#08080C' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo orçamento
          </button>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3">
          <input type="text" placeholder="Buscar cliente ou número..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            style={inpStyle} />
          <select value={filtroStatus} onChange={e => { setFiltro(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border text-sm focus:outline-none" style={inpStyle}>
            <option value="">Todos os status</option>
            {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : orcamentos.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--mt-lt)' }}>
            <p className="text-lg font-medium">Nenhum orçamento encontrado</p>
            <p className="text-sm mt-1">Crie o primeiro clicando em "Novo orçamento"</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orcamentos.map(o => {
              const si = statusInfo(o.status);
              return (
                <div key={o.id} className="rounded-2xl border p-4 flex items-center justify-between gap-3 flex-wrap transition-shadow hover:shadow-md"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--bd)' }}>
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>{o.clienteNome}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${si.color}`}>{si.label}</span>
                      </div>
                      <p className="text-xs" style={{ color: 'var(--mt-lt)' }}>
                        {o.numero} · {new Date(o.createdAt).toLocaleDateString('pt-BR')}
                        {o.validadeAte && ` · válido até ${o.validadeAte.split('-').reverse().join('/')}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="font-bold text-sm" style={{ color: 'var(--tx)' }}>{moeda(o.valorTotal)}</p>
                    <div className="flex gap-1">
                      <button onClick={() => abrirDetalhes(o)} title="Ver"
                        className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20">
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                      <button onClick={() => abrirEditar(o)} title="Editar"
                        className="p-1.5 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20">
                        <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => deletar(o.id)} title="Remover"
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Paginação */}
        {pages > 1 && (
          <div className="flex justify-center gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
              className="px-3 py-1 rounded-lg text-sm border disabled:opacity-40"
              style={{ borderColor: 'var(--bd)', color: 'var(--tx)' }}>← Anterior</button>
            <span className="px-3 py-1 text-sm" style={{ color: 'var(--mt-lt)' }}>{page} / {pages}</span>
            <button disabled={page === pages} onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 rounded-lg text-sm border disabled:opacity-40"
              style={{ borderColor: 'var(--bd)', color: 'var(--tx)' }}>Próxima →</button>
          </div>
        )}
      </div>

      {/* Modal criar/editar */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
            style={{ backgroundColor: 'var(--surface)' }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--bd)' }}>
              <h2 className="font-bold text-lg" style={{ color: 'var(--tx)' }}>
                {editing ? `Editar ${editing.numero}` : 'Novo orçamento'}
              </h2>
              <button onClick={() => setModal(false)} style={{ color: 'var(--mt-lt)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Cliente */}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--tx-md)' }}>Cliente *</label>
                  <input type="text" className={inp} style={inpStyle} value={form.clienteNome}
                    onChange={e => setForm(f => ({ ...f, clienteNome: e.target.value }))} />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--tx-md)' }}>Telefone</label>
                  <input type="text" className={inp} style={inpStyle} value={form.clienteTel}
                    onChange={e => setForm(f => ({ ...f, clienteTel: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--tx-md)' }}>Descrição do serviço</label>
                <textarea rows={2} className={inp} style={inpStyle} value={form.descricao}
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} />
              </div>

              {/* Itens */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium" style={{ color: 'var(--tx-md)' }}>Itens do orçamento</label>
                  <button onClick={addItem} className="text-xs px-2 py-1 rounded-lg border transition-colors hover:opacity-80"
                    style={{ borderColor: 'var(--bd)', color: 'var(--tx)' }}>+ Adicionar item</button>
                </div>
                <div className="space-y-2">
                  {/* Cabeçalho */}
                  <div className="grid grid-cols-12 gap-2 text-xs font-medium px-1" style={{ color: 'var(--mt-lt)' }}>
                    <span className="col-span-6">Descrição</span>
                    <span className="col-span-2 text-center">Qtd</span>
                    <span className="col-span-3 text-right">Valor unit.</span>
                    <span className="col-span-1" />
                  </div>
                  {form.itens.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <input type="text" placeholder="Descrição" className={`col-span-6 ${inp}`} style={inpStyle}
                        value={item.descricao} onChange={e => setItem(idx, 'descricao', e.target.value)} />
                      <input type="number" min="1" className={`col-span-2 ${inp} text-center`} style={inpStyle}
                        value={item.qtd} onChange={e => setItem(idx, 'qtd', e.target.value)} />
                      <input type="number" min="0" step="0.01" placeholder="0,00" className={`col-span-3 ${inp} text-right`} style={inpStyle}
                        value={item.valorUnit} onChange={e => setItem(idx, 'valorUnit', e.target.value)} />
                      <button onClick={() => removeItem(idx)} className="col-span-1 flex justify-center text-red-400 hover:text-red-600">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                {/* Total */}
                <div className="flex justify-end mt-3 pt-3 border-t" style={{ borderColor: 'var(--bd)' }}>
                  <span className="font-bold text-lg" style={{ color: 'var(--tx)' }}>Total: {moeda(totalForm)}</span>
                </div>
              </div>

              {/* Validade + Status */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--tx-md)' }}>Válido até</label>
                  <input type="date" className={inp} style={inpStyle} value={form.validadeAte}
                    onChange={e => setForm(f => ({ ...f, validadeAte: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--tx-md)' }}>Status</label>
                  <select className={inp} style={inpStyle} value={form.status}
                    onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                    {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--tx-md)' }}>Observações</label>
                <textarea rows={2} className={inp} style={inpStyle} value={form.observacoes}
                  onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-5 border-t" style={{ borderColor: 'var(--bd)' }}>
              <button onClick={() => setModal(false)} className="px-4 py-2 rounded-xl text-sm border"
                style={{ borderColor: 'var(--bd)', color: 'var(--tx)' }}>Cancelar</button>
              <button onClick={salvar} disabled={saving}
                className="px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-60 transition-opacity hover:opacity-80"
                style={{ backgroundColor: tenant?.corPrimaria || 'var(--g)', color: '#08080C' }}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal visualizar */}
      {viewOrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={e => e.target === e.currentTarget && setViewOrc(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
            style={{ backgroundColor: 'var(--surface)' }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--bd)' }}>
              <div>
                <h2 className="font-bold text-lg" style={{ color: 'var(--tx)' }}>{viewOrc.numero}</h2>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo(viewOrc.status).color}`}>
                  {statusInfo(viewOrc.status).label}
                </span>
              </div>
              <button onClick={() => setViewOrc(null)} style={{ color: 'var(--mt-lt)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <Row label="Cliente" value={viewOrc.clienteNome} />
              {viewOrc.clienteTel  && <Row label="Telefone"    value={viewOrc.clienteTel} />}
              {viewOrc.descricao   && <Row label="Descrição"   value={viewOrc.descricao} />}
              {viewOrc.validadeAte && <Row label="Válido até"  value={viewOrc.validadeAte.split('-').reverse().join('/')} />}
              {/* Tabela de itens */}
              {Array.isArray(viewOrc.itens) && viewOrc.itens.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--mt-lt)' }}>Itens</p>
                  <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--bd)' }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ backgroundColor: 'var(--s2)', color: 'var(--mt-lt)' }}>
                          <th className="text-left px-3 py-2">Descrição</th>
                          <th className="text-center px-3 py-2">Qtd</th>
                          <th className="text-right px-3 py-2">Unit.</th>
                          <th className="text-right px-3 py-2">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewOrc.itens.map((item, i) => (
                          <tr key={i} className="border-t" style={{ borderColor: 'var(--bd)', color: 'var(--tx)' }}>
                            <td className="px-3 py-2">{item.descricao}</td>
                            <td className="px-3 py-2 text-center">{item.qtd}</td>
                            <td className="px-3 py-2 text-right">{moeda(item.valorUnit)}</td>
                            <td className="px-3 py-2 text-right font-medium">{moeda((Number(item.qtd) || 0) * (Number(item.valorUnit) || 0))}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t font-bold" style={{ borderColor: 'var(--bd)', color: 'var(--tx)' }}>
                          <td colSpan={3} className="px-3 py-2 text-right">Total</td>
                          <td className="px-3 py-2 text-right">{moeda(viewOrc.valorTotal)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}
              {viewOrc.observacoes && <Row label="Observações" value={viewOrc.observacoes} />}
              {/* Alterar status rápido */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--mt-lt)' }}>Alterar status</p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTS.map(s => (
                    <button key={s.value} onClick={() => { alterarStatus(viewOrc.id, s.value); setViewOrc(v => ({ ...v, status: s.value })); }}
                      className={`text-xs px-3 py-1 rounded-full font-medium transition-opacity hover:opacity-80 ${s.color} ${viewOrc.status === s.value ? 'ring-2 ring-offset-1 ring-current' : ''}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center gap-3 p-5 border-t flex-wrap" style={{ borderColor: 'var(--bd)' }}>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={async () => {
                    setPdfLoading(true);
                    try {
                      const { gerarPdfOrcamento } = await import('../utils/pdfGenerator');
                      await gerarPdfOrcamento(viewOrc, tenant, title);
                    } catch { toast.error('Erro ao gerar PDF'); }
                    finally { setPdfLoading(false); }
                  }}
                  disabled={pdfLoading}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-opacity hover:opacity-80 disabled:opacity-50"
                  style={{ borderColor: 'var(--bd)', color: 'var(--tx)' }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  {pdfLoading ? 'Gerando...' : 'PDF'}
                </button>
                <button
                  onClick={() => abrirModalEnvio(viewOrc, 'wa')}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-opacity hover:opacity-80"
                  style={{ borderColor: 'rgba(0,201,122,0.4)', color: '#00C97A' }}>
                  💬 WhatsApp
                </button>
                <button
                  onClick={() => abrirModalEnvio(viewOrc, 'email')}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition-opacity hover:opacity-80"
                  style={{ borderColor: 'rgba(99,102,241,0.4)', color: '#818cf8' }}>
                  📧 E-mail
                </button>
              </div>
              <div className="flex gap-3">
                <button onClick={() => { abrirEditar(viewOrc); setViewOrc(null); }}
                  className="px-4 py-2 rounded-xl text-sm border" style={{ borderColor: 'var(--bd)', color: 'var(--tx)' }}>
                  Editar
                </button>
                <button onClick={() => setViewOrc(null)}
                  className="px-5 py-2 rounded-xl text-sm font-medium"
                  style={{ backgroundColor: tenant?.corPrimaria || 'var(--g)', color: '#08080C' }}>
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal de envio WA / E-mail */}
      {modalEnvio && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl shadow-2xl p-6 space-y-4" style={{ background: 'var(--surface)', border: '1px solid var(--bd)' }}>
            <h3 className="font-semibold text-lg" style={{ color: 'var(--tx)' }}>
              {modalEnvio.canal === 'wa' ? '💬 Enviar via WhatsApp' : '📧 Enviar por e-mail'}
            </h3>
            <p className="text-sm" style={{ color: 'var(--mt)' }}>
              Orçamento <strong style={{ color: 'var(--tx)' }}>{modalEnvio.orc.numero}</strong> para <strong style={{ color: 'var(--tx)' }}>{modalEnvio.orc.clienteNome}</strong>
            </p>

            {modalEnvio.canal === 'wa' ? (
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--mt)' }}>Telefone (com DDD)</label>
                <input
                  type="tel"
                  value={envioTel}
                  onChange={e => setEnvioTel(e.target.value)}
                  placeholder="61999990000"
                  className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
                  style={{ background: 'var(--bg)', border: '1px solid var(--bd)', color: 'var(--tx)' }}
                />
              </div>
            ) : (
              <div>
                <label className="text-xs mb-1 block" style={{ color: 'var(--mt)' }}>E-mail do cliente</label>
                <input
                  type="email"
                  value={envioEmail}
                  onChange={e => setEnvioEmail(e.target.value)}
                  placeholder="cliente@exemplo.com"
                  className="w-full rounded-xl px-3 py-2 text-sm focus:outline-none"
                  style={{ background: 'var(--bg)', border: '1px solid var(--bd)', color: 'var(--tx)' }}
                />
              </div>
            )}

            {modalEnvio.orc.status === 'rascunho' && (
              <p className="text-xs" style={{ color: 'var(--mt)' }}>
                ℹ️ O status será atualizado para <strong>Enviado</strong> automaticamente.
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setModalEnvio(null)}
                className="flex-1 py-2 rounded-xl text-sm border"
                style={{ borderColor: 'var(--bd)', color: 'var(--tx)' }}>
                Cancelar
              </button>
              <button
                onClick={confirmarEnvio}
                disabled={enviando || (modalEnvio.canal === 'wa' ? !envioTel.trim() : !envioEmail.includes('@'))}
                className="flex-1 py-2 rounded-xl text-sm font-medium disabled:opacity-50"
                style={{ backgroundColor: modalEnvio.canal === 'wa' ? '#00C97A' : '#6366f1', color: '#fff' }}>
                {enviando ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex gap-3">
      <span className="text-sm font-medium w-32 flex-shrink-0" style={{ color: 'var(--mt-lt)' }}>{label}</span>
      <span className="text-sm flex-1 whitespace-pre-wrap" style={{ color: 'var(--tx)' }}>{value}</span>
    </div>
  );
}
