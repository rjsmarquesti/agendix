import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { getNichoLabel } from '../config/nichoLabels';
import { getAnamneseFields } from '../config/nichoFichaFields';
// pdfGenerator carregado sob demanda
import { api } from '../services/api';
import toast from 'react-hot-toast';

function DynamicField({ field, value, onChange }) {
  const cls = 'w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const style = { backgroundColor: 'var(--s2)', borderColor: 'var(--bd)', color: 'var(--tx)' };

  if (field.type === 'textarea') return (
    <textarea rows={3} className={cls} style={style} placeholder={field.label}
      value={value || ''} onChange={e => onChange(field.key, e.target.value)} />
  );
  if (field.type === 'select') return (
    <select className={cls} style={style} value={value || ''} onChange={e => onChange(field.key, e.target.value)}>
      <option value=''>Selecione...</option>
      {field.options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
  return (
    <input type={field.type || 'text'} className={cls} style={style} placeholder={field.label}
      value={value || ''} onChange={e => onChange(field.key, e.target.value)} />
  );
}

export default function Anamnese() {
  const { tenant } = useAuth();
  const nicho  = tenant?.nichoLabel || 'geral';
  const title  = getNichoLabel(nicho, 'anamnese', 'title', 'Anamnese');
  const fields = getAnamneseFields(nicho);

  const [anamneses, setAnamneses] = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(false);
  const [editing, setEditing]     = useState(null);
  const [fichas, setFichas]       = useState([]);
  const [form, setForm]           = useState({ nomeCliente: '', fichaId: '', campos: {}, observacoes: '' });
  const [saving, setSaving]       = useState(false);
  const [viewItem, setViewItem]   = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, ...(search ? { search } : {}) });
      const data = await api.get(`/anamnese?${params}`);
      setAnamneses(data.anamneses || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(err.message || 'Erro ao carregar anamneses');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { carregar(); }, [carregar]);

  // Carrega fichas para vincular
  useEffect(() => {
    api.get('/fichas?page=1').then(d => setFichas(d.fichas || [])).catch(() => {});
  }, []);

  function abrirNova() {
    setEditing(null);
    setForm({ nomeCliente: '', fichaId: '', campos: {}, observacoes: '' });
    setModal(true);
  }

  function abrirEditar(a) {
    setEditing(a);
    setForm({ nomeCliente: a.nomeCliente, fichaId: a.fichaId ? String(a.fichaId) : '', campos: a.campos || {}, observacoes: a.observacoes || '' });
    setModal(true);
  }

  function setCampo(key, val) {
    setForm(f => ({ ...f, campos: { ...f.campos, [key]: val } }));
  }

  async function salvar() {
    if (!form.nomeCliente.trim()) return toast.error('Nome do cliente obrigatório');
    setSaving(true);
    try {
      const body = {
        nomeCliente: form.nomeCliente,
        fichaId:     form.fichaId ? Number(form.fichaId) : null,
        campos:      form.campos,
        observacoes: form.observacoes || null,
      };
      if (editing) {
        await api.put(`/anamnese/${editing.id}`, body);
        toast.success('Anamnese atualizada');
      } else {
        await api.post('/anamnese', body);
        toast.success('Anamnese criada');
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
    if (!confirm('Remover esta anamnese?')) return;
    try {
      await api.delete(`/anamnese/${id}`);
      toast.success('Anamnese removida');
      carregar();
    } catch (err) {
      toast.error(err.message || 'Erro ao remover');
    }
  }

  async function abrirDetalhes(a) {
    try {
      const data = await api.get(`/anamnese/${a.id}`);
      setViewItem(data.anamnese);
    } catch (err) {
      toast.error('Erro ao carregar anamnese');
    }
  }

  const pages = Math.ceil(total / 20);

  // Se nicho não tem campos configurados
  if (fields.length === 0 && !loading && anamneses.length === 0) {
    return (
      <Layout title={title}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-pink-100 dark:bg-pink-900/30 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-pink-600 dark:text-pink-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <p className="text-lg font-semibold" style={{ color: 'var(--tx)' }}>{title}</p>
            <p className="text-sm" style={{ color: 'var(--mt-lt)' }}>Configure o nicho da empresa em Configurações para habilitar os campos de anamnese.</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={title}>
      <div className="px-4 md:px-8 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--tx)' }}>{title}</h1>
            <p className="text-sm" style={{ color: 'var(--mt-lt)' }}>{total} registro{total !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={abrirNova}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: tenant?.corPrimaria || 'var(--g)', color: '#08080C' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nova anamnese
          </button>
        </div>

        {/* Busca */}
        <input type="text" placeholder="Buscar por nome..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="w-full max-w-sm px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ backgroundColor: 'var(--s2)', borderColor: 'var(--bd)', color: 'var(--tx)' }} />

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : anamneses.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--mt-lt)' }}>
            <p className="text-lg font-medium">Nenhuma anamnese encontrada</p>
            <p className="text-sm mt-1">Crie a primeira clicando em "Nova anamnese"</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {anamneses.map(a => (
              <div key={a.id} className="rounded-2xl border p-4 space-y-2 transition-shadow hover:shadow-md"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--bd)' }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate" style={{ color: 'var(--tx)' }}>{a.nomeCliente}</p>
                    {a.ficha && <p className="text-xs" style={{ color: 'var(--mt-lt)' }}>Ficha: {a.ficha.nome}</p>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => abrirDetalhes(a)} title="Ver"
                      className="p-1.5 rounded-lg transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button onClick={() => abrirEditar(a)} title="Editar"
                      className="p-1.5 rounded-lg transition-colors hover:bg-yellow-50 dark:hover:bg-yellow-900/20">
                      <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => deletar(a.id)} title="Remover"
                      className="p-1.5 rounded-lg transition-colors hover:bg-red-50 dark:hover:bg-red-900/20">
                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="text-xs" style={{ color: 'var(--mt-lt)' }}>
                  {new Date(a.createdAt).toLocaleDateString('pt-BR')}
                </p>
              </div>
            ))}
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
                {editing ? 'Editar anamnese' : 'Nova anamnese'}
              </h2>
              <button onClick={() => setModal(false)} style={{ color: 'var(--mt-lt)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--tx-md)' }}>Nome do Cliente *</label>
                <input type="text" value={form.nomeCliente} onChange={e => setForm(v => ({ ...v, nomeCliente: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ backgroundColor: 'var(--s2)', borderColor: 'var(--bd)', color: 'var(--tx)' }} />
              </div>

              {fichas.length > 0 && (
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--tx-md)' }}>Vincular à Ficha (opcional)</label>
                  <select value={form.fichaId} onChange={e => setForm(v => ({ ...v, fichaId: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: 'var(--s2)', borderColor: 'var(--bd)', color: 'var(--tx)' }}>
                    <option value=''>Sem vínculo</option>
                    {fichas.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                  </select>
                </div>
              )}

              {/* Campos dinâmicos */}
              {fields.length > 0 ? (
                <div className="border-t pt-4 space-y-4" style={{ borderColor: 'var(--bd)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--mt-lt)' }}>
                    Questionário
                  </p>
                  {fields.map(f => (
                    <div key={f.key}>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--tx-md)' }}>{f.label}</label>
                      <DynamicField field={f} value={form.campos[f.key]} onChange={setCampo} />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm py-2" style={{ color: 'var(--mt-lt)' }}>
                  Configure o nicho em Configurações para exibir os campos específicos.
                </p>
              )}

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--tx-md)' }}>Observações</label>
                <textarea rows={3} value={form.observacoes} onChange={e => setForm(v => ({ ...v, observacoes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  style={{ backgroundColor: 'var(--s2)', borderColor: 'var(--bd)', color: 'var(--tx)' }} />
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
      {viewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={e => e.target === e.currentTarget && setViewItem(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
            style={{ backgroundColor: 'var(--surface)' }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--bd)' }}>
              <h2 className="font-bold text-lg" style={{ color: 'var(--tx)' }}>{viewItem.nomeCliente}</h2>
              <button onClick={() => setViewItem(null)} style={{ color: 'var(--mt-lt)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-3">
              {viewItem.ficha && <Row label="Ficha" value={viewItem.ficha.nome} />}
              {fields.map(f => viewItem.campos?.[f.key]
                ? <Row key={f.key} label={f.label} value={viewItem.campos[f.key]} />
                : null
              )}
              {viewItem.observacoes && <Row label="Observações" value={viewItem.observacoes} />}
              <Row label="Data" value={new Date(viewItem.createdAt).toLocaleDateString('pt-BR')} />
            </div>
            <div className="flex justify-between items-center gap-3 p-5 border-t flex-wrap" style={{ borderColor: 'var(--bd)' }}>
              <button
                onClick={async () => {
                  setPdfLoading(true);
                  try {
                    const { gerarPdfAnamnese } = await import('../utils/pdfGenerator');
                    await gerarPdfAnamnese(viewItem, tenant, fields, title);
                  } catch { toast.error('Erro ao gerar PDF'); }
                  finally { setPdfLoading(false); }
                }}
                disabled={pdfLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm border transition-opacity hover:opacity-80 disabled:opacity-50"
                style={{ borderColor: 'var(--bd)', color: 'var(--tx)' }}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {pdfLoading ? 'Gerando...' : 'Exportar PDF'}
              </button>
              <div className="flex gap-3">
                <button onClick={() => { abrirEditar(viewItem); setViewItem(null); }}
                  className="px-4 py-2 rounded-xl text-sm border" style={{ borderColor: 'var(--bd)', color: 'var(--tx)' }}>
                  Editar
                </button>
                <button onClick={() => setViewItem(null)}
                  className="px-5 py-2 rounded-xl text-sm font-medium"
                  style={{ backgroundColor: tenant?.corPrimaria || 'var(--g)', color: '#08080C' }}>
                  Fechar
                </button>
              </div>
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
      <span className="text-sm font-medium w-40 flex-shrink-0" style={{ color: 'var(--mt-lt)' }}>{label}</span>
      <span className="text-sm flex-1 whitespace-pre-wrap" style={{ color: 'var(--tx)' }}>{value}</span>
    </div>
  );
}
