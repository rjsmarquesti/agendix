import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { getNichoLabel } from '../config/nichoLabels';
import { getFichaFields } from '../config/nichoFichaFields';
// pdfGenerator carregado sob demanda para manter bundle principal enxuto
import { api } from '../services/api';
import toast from 'react-hot-toast';

const CAMPOS_BASE = [
  { key: 'nome',     label: 'Nome',     type: 'text',  required: true },
  { key: 'telefone', label: 'Telefone', type: 'text' },
  { key: 'email',    label: 'E-mail',   type: 'text' },
];

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

export default function Fichas() {
  const { tenant } = useAuth();
  const nicho  = tenant?.nichoLabel || 'geral';
  const title  = getNichoLabel(nicho, 'fichas', 'title', 'Fichas de Clientes');
  const fields = getFichaFields(nicho);

  const [fichas, setFichas]   = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [search, setSearch]   = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm]       = useState({ nome: '', telefone: '', email: '', campos: {}, observacoes: '' });
  const [saving, setSaving]   = useState(false);
  const [viewFicha, setViewFicha] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, ...(search ? { search } : {}) });
      const data = await api.get(`/fichas?${params}`);
      setFichas(data.fichas || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(err.message || 'Erro ao carregar fichas');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { carregar(); }, [carregar]);

  function abrirNova() {
    setEditing(null);
    setForm({ nome: '', telefone: '', email: '', campos: {}, observacoes: '' });
    setModal(true);
  }

  function abrirEditar(f) {
    setEditing(f);
    setForm({ nome: f.nome, telefone: f.telefone || '', email: f.email || '', campos: f.campos || {}, observacoes: f.observacoes || '' });
    setModal(true);
  }

  function setCampo(key, val) {
    setForm(f => ({ ...f, campos: { ...f.campos, [key]: val } }));
  }

  async function salvar() {
    if (!form.nome.trim()) return toast.error('Nome obrigatório');
    setSaving(true);
    try {
      const body = { nome: form.nome, telefone: form.telefone || null, email: form.email || null, campos: form.campos, observacoes: form.observacoes || null };
      if (editing) {
        await api.put(`/fichas/${editing.id}`, body);
        toast.success('Ficha atualizada');
      } else {
        await api.post('/fichas', body);
        toast.success('Ficha criada');
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
    if (!confirm('Remover esta ficha?')) return;
    try {
      await api.delete(`/fichas/${id}`);
      toast.success('Ficha removida');
      carregar();
    } catch (err) {
      toast.error(err.message || 'Erro ao remover');
    }
  }

  async function abrirDetalhes(f) {
    try {
      const data = await api.get(`/fichas/${f.id}`);
      setViewFicha(data.ficha);
    } catch (err) {
      toast.error('Erro ao carregar ficha');
    }
  }

  const pages = Math.ceil(total / 20);

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
            Nova ficha
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
        ) : fichas.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--mt-lt)' }}>
            <p className="text-lg font-medium">Nenhuma ficha encontrada</p>
            <p className="text-sm mt-1">Crie a primeira ficha clicando em "Nova ficha"</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {fichas.map(f => (
              <div key={f.id} className="rounded-2xl border p-4 space-y-2 transition-shadow hover:shadow-md"
                style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--bd)' }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate" style={{ color: 'var(--tx)' }}>{f.nome}</p>
                    {f.telefone && <p className="text-xs" style={{ color: 'var(--mt-lt)' }}>{f.telefone}</p>}
                    {f.email    && <p className="text-xs truncate" style={{ color: 'var(--mt-lt)' }}>{f.email}</p>}
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => abrirDetalhes(f)} title="Ver"
                      className="p-1.5 rounded-lg transition-colors hover:bg-blue-50 dark:hover:bg-blue-900/20">
                      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                    <button onClick={() => abrirEditar(f)} title="Editar"
                      className="p-1.5 rounded-lg transition-colors hover:bg-yellow-50 dark:hover:bg-yellow-900/20">
                      <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => deletar(f.id)} title="Remover"
                      className="p-1.5 rounded-lg transition-colors hover:bg-red-50 dark:hover:bg-red-900/20">
                      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                {f.lead && (
                  <p className="text-xs px-2 py-0.5 rounded-full w-fit"
                    style={{ backgroundColor: 'var(--bd)', color: 'var(--mt-lt)' }}>
                    Lead: {f.lead.nome}
                  </p>
                )}
                <p className="text-xs" style={{ color: 'var(--mt-lt)' }}>
                  {new Date(f.createdAt).toLocaleDateString('pt-BR')}
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
                {editing ? 'Editar ficha' : 'Nova ficha'}
              </h2>
              <button onClick={() => setModal(false)} style={{ color: 'var(--mt-lt)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Campos base */}
              {CAMPOS_BASE.map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--tx-md)' }}>
                    {f.label}{f.required && ' *'}
                  </label>
                  <input type={f.type} value={form[f.key] || ''} onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ backgroundColor: 'var(--s2)', borderColor: 'var(--bd)', color: 'var(--tx)' }} />
                </div>
              ))}

              {/* Campos dinâmicos do nicho */}
              {fields.length > 0 && (
                <div className="border-t pt-4 space-y-4" style={{ borderColor: 'var(--bd)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--mt-lt)' }}>
                    Dados do nicho
                  </p>
                  {fields.map(f => (
                    <div key={f.key}>
                      <label className="block text-sm font-medium mb-1" style={{ color: 'var(--tx-md)' }}>{f.label}</label>
                      <DynamicField field={f} value={form.campos[f.key]} onChange={setCampo} />
                    </div>
                  ))}
                </div>
              )}

              {/* Observações */}
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
      {viewFicha && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60" onClick={e => e.target === e.currentTarget && setViewFicha(null)}>
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
            style={{ backgroundColor: 'var(--surface)' }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--bd)' }}>
              <h2 className="font-bold text-lg" style={{ color: 'var(--tx)' }}>{viewFicha.nome}</h2>
              <button onClick={() => setViewFicha(null)} style={{ color: 'var(--mt-lt)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-3">
              {viewFicha.telefone && <Row label="Telefone" value={viewFicha.telefone} />}
              {viewFicha.email    && <Row label="E-mail"   value={viewFicha.email} />}
              {fields.map(f => viewFicha.campos?.[f.key]
                ? <Row key={f.key} label={f.label} value={viewFicha.campos[f.key]} />
                : null
              )}
              {viewFicha.observacoes && <Row label="Observações" value={viewFicha.observacoes} />}
              {viewFicha.anamneses?.length > 0 && (
                <div className="border-t pt-3" style={{ borderColor: 'var(--bd)' }}>
                  <p className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--mt-lt)' }}>
                    Anamneses ({viewFicha.anamneses.length})
                  </p>
                  {viewFicha.anamneses.map(a => (
                    <div key={a.id} className="text-sm py-1 border-b last:border-0" style={{ borderColor: 'var(--bd)', color: 'var(--tx-md)' }}>
                      {new Date(a.createdAt).toLocaleDateString('pt-BR')} — {a.nomeCliente}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex justify-between items-center gap-3 p-5 border-t flex-wrap" style={{ borderColor: 'var(--bd)' }}>
              <button
                onClick={async () => {
                  setPdfLoading(true);
                  try {
                    const { gerarPdfFicha } = await import('../utils/pdfGenerator');
                    await gerarPdfFicha(viewFicha, tenant, fields, title);
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
                <button onClick={() => { abrirEditar(viewFicha); setViewFicha(null); }}
                  className="px-4 py-2 rounded-xl text-sm border" style={{ borderColor: 'var(--bd)', color: 'var(--tx)' }}>
                  Editar
                </button>
                <button onClick={() => setViewFicha(null)}
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
