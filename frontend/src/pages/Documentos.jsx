import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const TIPOS = [
  { value: 'contrato',   label: 'Contrato' },
  { value: 'proposta',   label: 'Proposta Comercial' },
  { value: 'procuracao', label: 'Procuração' },
  { value: 'relatorio',  label: 'Relatório' },
  { value: 'outro',      label: 'Outro' },
];

const STATUS_OPTS = [
  { value: 'rascunho',  label: 'Rascunho',  color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  { value: 'ativo',     label: 'Ativo',     color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  { value: 'vencido',   label: 'Vencido',   color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300' },
];

function statusInfo(s) { return STATUS_OPTS.find(o => o.value === s) || STATUS_OPTS[0]; }

const inp = 'w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
const EMPTY = { titulo: '', tipo: 'contrato', clienteNome: '', clienteTel: '', conteudo: '', observacoes: '', status: 'rascunho', dataVencimento: '' };

export default function Documentos() {
  const { tenant } = useAuth();
  const cor = tenant?.corPrimaria || 'var(--g)';

  const [documentos, setDocumentos] = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [filtroStatus, setFiltro] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(false);
  const [editing, setEditing]     = useState(null);
  const [form, setForm]           = useState(EMPTY);
  const [saving, setSaving]       = useState(false);
  const [viewItem, setViewItem]   = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const inpStyle = { backgroundColor: 'var(--s2)', borderColor: 'var(--bd)', color: 'var(--tx)' };

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, ...(search ? { search } : {}), ...(filtroStatus ? { status: filtroStatus } : {}), ...(filtroTipo ? { tipo: filtroTipo } : {}) });
      const data = await api.get(`/documentos?${params}`);
      setDocumentos(data.documentos || []);
      setTotal(data.total || 0);
    } catch (err) { toast.error(err.message || 'Erro ao carregar documentos'); }
    finally { setLoading(false); }
  }, [page, search, filtroStatus, filtroTipo]);

  useEffect(() => { carregar(); }, [carregar]);

  function abrirNovo() { setEditing(null); setForm(EMPTY); setModal(true); }
  function abrirEditar(d) {
    setEditing(d);
    setForm({ titulo: d.titulo, tipo: d.tipo, clienteNome: d.clienteNome, clienteTel: d.clienteTel || '', conteudo: d.conteudo || '', observacoes: d.observacoes || '', status: d.status, dataVencimento: d.dataVencimento || '' });
    setModal(true);
  }

  async function salvar() {
    if (!form.titulo.trim())      return toast.error('Título obrigatório');
    if (!form.clienteNome.trim()) return toast.error('Nome do cliente obrigatório');
    setSaving(true);
    try {
      const body = { ...form };
      Object.keys(body).forEach(k => { if (body[k] === '') body[k] = null; });
      if (editing) { await api.put(`/documentos/${editing.id}`, body); toast.success('Documento atualizado'); }
      else         { await api.post('/documentos', body);              toast.success('Documento criado'); }
      setModal(false); setPage(1); carregar();
    } catch (err) { toast.error(err.message || 'Erro ao salvar'); }
    finally { setSaving(false); }
  }

  async function deletar(id) {
    if (!confirm('Remover este documento?')) return;
    try { await api.delete(`/documentos/${id}`); toast.success('Documento removido'); carregar(); }
    catch (err) { toast.error(err.message || 'Erro ao remover'); }
  }

  async function alterarStatus(id, status) {
    try { await api.put(`/documentos/${id}`, { status }); carregar(); }
    catch { toast.error('Erro ao atualizar status'); }
  }

  async function abrirDetalhes(d) {
    try { const data = await api.get(`/documentos/${d.id}`); setViewItem(data.documento); }
    catch { toast.error('Erro ao carregar documento'); }
  }

  const pages = Math.ceil(total / 20);

  return (
    <Layout title="Documentos">
      <div className="px-4 md:px-8 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--tx)' }}>Documentos</h1>
            <p className="text-sm" style={{ color: 'var(--mt-lt)' }}>{total} documento{total !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={abrirNovo}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: cor, color: '#08080C' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Novo documento
          </button>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-3">
          <input type="text" placeholder="Buscar título ou cliente..." value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-60" style={inpStyle} />
          <select value={filtroStatus} onChange={e => { setFiltro(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border text-sm focus:outline-none" style={inpStyle}>
            <option value="">Todos os status</option>
            {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <select value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-lg border text-sm focus:outline-none" style={inpStyle}>
            <option value="">Todos os tipos</option>
            {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>
        ) : documentos.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--mt-lt)' }}>
            <p className="text-lg font-medium">Nenhum documento encontrado</p>
            <p className="text-sm mt-1">Crie o primeiro clicando em "Novo documento"</p>
          </div>
        ) : (
          <div className="space-y-3">
            {documentos.map(d => {
              const si = statusInfo(d.status);
              const tipoLabel = TIPOS.find(t => t.value === d.tipo)?.label || d.tipo;
              return (
                <div key={d.id} className="rounded-2xl border p-4 flex items-center justify-between gap-3 flex-wrap transition-shadow hover:shadow-md"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--bd)' }}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <p className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>{d.titulo}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${si.color}`}>{si.label}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bd)', color: 'var(--mt-lt)' }}>{tipoLabel}</span>
                    </div>
                    <p className="text-xs" style={{ color: 'var(--mt-lt)' }}>
                      {d.clienteNome} · {new Date(d.createdAt).toLocaleDateString('pt-BR')}
                      {d.dataVencimento && ` · vence ${d.dataVencimento.split('-').reverse().join('/')}`}
                    </p>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => abrirDetalhes(d)} title="Ver" className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                    </button>
                    <button onClick={() => abrirEditar(d)} title="Editar" className="p-1.5 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20">
                      <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    </button>
                    <button onClick={() => deletar(d.id)} title="Remover" className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {pages > 1 && (
          <div className="flex justify-center gap-2">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 rounded-lg text-sm border disabled:opacity-40" style={{ borderColor: 'var(--bd)', color: 'var(--tx)' }}>← Anterior</button>
            <span className="px-3 py-1 text-sm" style={{ color: 'var(--mt-lt)' }}>{page} / {pages}</span>
            <button disabled={page === pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 rounded-lg text-sm border disabled:opacity-40" style={{ borderColor: 'var(--bd)', color: 'var(--tx)' }}>Próxima →</button>
          </div>
        )}
      </div>

      {/* Modal criar/editar */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl" style={{ backgroundColor: 'var(--surface)' }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--bd)' }}>
              <h2 className="font-bold text-lg" style={{ color: 'var(--tx)' }}>{editing ? 'Editar documento' : 'Novo documento'}</h2>
              <button onClick={() => setModal(false)} style={{ color: 'var(--mt-lt)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--tx-md)' }}>Título *</label>
                <input type="text" value={form.titulo} className={inp} style={inpStyle} onChange={e => setForm(v => ({ ...v, titulo: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--tx-md)' }}>Tipo</label>
                  <select value={form.tipo} className={inp} style={inpStyle} onChange={e => setForm(v => ({ ...v, tipo: e.target.value }))}>
                    {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--tx-md)' }}>Status</label>
                  <select value={form.status} className={inp} style={inpStyle} onChange={e => setForm(v => ({ ...v, status: e.target.value }))}>
                    {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--tx-md)' }}>Cliente *</label>
                  <input type="text" value={form.clienteNome} className={inp} style={inpStyle} onChange={e => setForm(v => ({ ...v, clienteNome: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--tx-md)' }}>Telefone</label>
                  <input type="text" value={form.clienteTel} className={inp} style={inpStyle} onChange={e => setForm(v => ({ ...v, clienteTel: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--tx-md)' }}>Vencimento</label>
                  <input type="date" value={form.dataVencimento} className={inp} style={inpStyle} onChange={e => setForm(v => ({ ...v, dataVencimento: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--tx-md)' }}>Conteúdo do documento</label>
                <textarea rows={8} value={form.conteudo} className={inp} style={inpStyle}
                  placeholder="Redija o conteúdo do documento aqui..."
                  onChange={e => setForm(v => ({ ...v, conteudo: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--tx-md)' }}>Observações internas</label>
                <textarea rows={2} value={form.observacoes} className={inp} style={inpStyle} onChange={e => setForm(v => ({ ...v, observacoes: e.target.value }))} />
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t" style={{ borderColor: 'var(--bd)' }}>
              <button onClick={() => setModal(false)} className="px-4 py-2 rounded-xl text-sm border" style={{ borderColor: 'var(--bd)', color: 'var(--tx)' }}>Cancelar</button>
              <button onClick={salvar} disabled={saving} className="px-5 py-2 rounded-xl text-sm font-medium disabled:opacity-60 hover:opacity-80" style={{ backgroundColor: cor, color: '#08080C' }}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal visualizar */}
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={e => e.target === e.currentTarget && setViewItem(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl" style={{ backgroundColor: 'var(--surface)' }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--bd)' }}>
              <div>
                <h2 className="font-bold text-lg" style={{ color: 'var(--tx)' }}>{viewItem.titulo}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo(viewItem.status).color}`}>{statusInfo(viewItem.status).label}</span>
                  <span className="text-xs" style={{ color: 'var(--mt-lt)' }}>{TIPOS.find(t => t.value === viewItem.tipo)?.label}</span>
                </div>
              </div>
              <button onClick={() => setViewItem(null)} style={{ color: 'var(--mt-lt)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                <InfoRow label="Cliente"    value={viewItem.clienteNome} />
                {viewItem.clienteTel     && <InfoRow label="Telefone"    value={viewItem.clienteTel} />}
                {viewItem.dataVencimento && <InfoRow label="Vencimento"  value={viewItem.dataVencimento.split('-').reverse().join('/')} />}
              </div>
              {viewItem.conteudo && (
                <div className="border rounded-xl p-4 text-sm whitespace-pre-wrap leading-relaxed" style={{ borderColor: 'var(--bd)', color: 'var(--tx)', backgroundColor: 'var(--s2)' }}>
                  {viewItem.conteudo}
                </div>
              )}
              {viewItem.observacoes && (
                <div className="text-sm p-3 rounded-lg" style={{ backgroundColor: 'var(--a-dim)', color: 'var(--a-lt)' }}>
                  <span className="font-semibold">Obs. internas: </span>{viewItem.observacoes}
                </div>
              )}
              {/* Alterar status */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--mt-lt)' }}>Alterar status</p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTS.map(s => (
                    <button key={s.value} onClick={() => { alterarStatus(viewItem.id, s.value); setViewItem(v => ({ ...v, status: s.value })); }}
                      className={`text-xs px-3 py-1 rounded-full font-medium transition-opacity hover:opacity-80 ${s.color} ${viewItem.status === s.value ? 'ring-2 ring-offset-1 ring-current' : ''}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center gap-3 p-5 border-t flex-wrap" style={{ borderColor: 'var(--bd)' }}>
              <button onClick={async () => { setPdfLoading(true); try { const { gerarPdfDocumento } = await import('../utils/pdfGenerator'); await gerarPdfDocumento(viewItem, tenant); } catch { toast.error('Erro ao gerar PDF'); } finally { setPdfLoading(false); } }}
                disabled={pdfLoading} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm border hover:opacity-80 disabled:opacity-50" style={{ borderColor: 'var(--bd)', color: 'var(--tx)' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                {pdfLoading ? 'Gerando...' : 'Exportar PDF'}
              </button>
              <div className="flex gap-3">
                <button onClick={() => { abrirEditar(viewItem); setViewItem(null); }} className="px-4 py-2 rounded-xl text-sm border" style={{ borderColor: 'var(--bd)', color: 'var(--tx)' }}>Editar</button>
                <button onClick={() => setViewItem(null)} className="px-5 py-2 rounded-xl text-sm font-medium" style={{ backgroundColor: cor, color: '#08080C' }}>Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function InfoRow({ label, value, span }) {
  return (
    <div className={`flex gap-2 ${span ? 'col-span-2' : 'col-span-1'}`}>
      <span className="text-xs font-medium w-24 flex-shrink-0" style={{ color: 'var(--mt-lt)' }}>{label}</span>
      <span className="text-xs flex-1" style={{ color: 'var(--tx)' }}>{value}</span>
    </div>
  );
}
