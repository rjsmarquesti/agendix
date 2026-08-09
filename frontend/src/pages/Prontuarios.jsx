import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const CAMPOS_BASE = [
  { key: 'nomeCliente',       label: 'Nome do Paciente', required: true },
  { key: 'telefone',          label: 'Telefone' },
  { key: 'email',             label: 'E-mail' },
  { key: 'dataNascimento',    label: 'Data de Nascimento', type: 'date' },
  { key: 'convenio',          label: 'Convênio' },
  { key: 'numeroCarteirinha', label: 'Nº Carteirinha' },
];

const inp = 'w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

export default function Prontuarios() {
  const { tenant, user } = useAuth();
  const cor = tenant?.corPrimaria || 'var(--g)';

  const [prontuarios, setProntuarios] = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(false);
  const [editing, setEditing]   = useState(null);
  const [form, setForm]         = useState({ nomeCliente: '', telefone: '', email: '', dataNascimento: '', convenio: '', numeroCarteirinha: '', diagnostico: '', observacoes: '' });
  const [saving, setSaving]     = useState(false);
  const [viewItem, setViewItem] = useState(null);
  const [novaEv, setNovaEv]     = useState('');
  const [addingEv, setAddingEv] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const inpStyle = { backgroundColor: 'var(--s2)', borderColor: 'var(--bd)', color: 'var(--tx)' };

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, ...(search ? { search } : {}) });
      const data = await api.get(`/prontuarios?${params}`);
      setProntuarios(data.prontuarios || []);
      setTotal(data.total || 0);
    } catch (err) {
      toast.error(err.message || 'Erro ao carregar prontuários');
    } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { carregar(); }, [carregar]);

  function abrirNovo() {
    setEditing(null);
    setForm({ nomeCliente: '', telefone: '', email: '', dataNascimento: '', convenio: '', numeroCarteirinha: '', diagnostico: '', observacoes: '' });
    setModal(true);
  }

  function abrirEditar(p) {
    setEditing(p);
    setForm({ nomeCliente: p.nomeCliente, telefone: p.telefone || '', email: p.email || '', dataNascimento: p.dataNascimento || '', convenio: p.convenio || '', numeroCarteirinha: p.numeroCarteirinha || '', diagnostico: p.diagnostico || '', observacoes: p.observacoes || '' });
    setModal(true);
  }

  async function salvar() {
    if (!form.nomeCliente.trim()) return toast.error('Nome do paciente obrigatório');
    setSaving(true);
    try {
      const body = { ...form };
      Object.keys(body).forEach(k => { if (body[k] === '') body[k] = null; });
      if (editing) { await api.put(`/prontuarios/${editing.id}`, body); toast.success('Prontuário atualizado'); }
      else         { await api.post('/prontuarios', body);             toast.success('Prontuário criado'); }
      setModal(false); setPage(1); carregar();
    } catch (err) { toast.error(err.message || 'Erro ao salvar'); }
    finally { setSaving(false); }
  }

  async function deletar(id) {
    if (!confirm('Remover este prontuário?')) return;
    try { await api.delete(`/prontuarios/${id}`); toast.success('Prontuário removido'); carregar(); }
    catch (err) { toast.error(err.message || 'Erro ao remover'); }
  }

  async function abrirDetalhes(p) {
    try { const data = await api.get(`/prontuarios/${p.id}`); setViewItem(data.prontuario); setNovaEv(''); }
    catch { toast.error('Erro ao carregar prontuário'); }
  }

  async function adicionarEvolucao() {
    if (!novaEv.trim()) return toast.error('Descreva a evolução');
    setAddingEv(true);
    try {
      const data = await api.post(`/prontuarios/${viewItem.id}/evolucao`, { texto: novaEv.trim(), profissional: user?.nome || null });
      setViewItem(data.prontuario); setNovaEv(''); toast.success('Evolução registrada');
    } catch (err) { toast.error(err.message || 'Erro ao salvar evolução'); }
    finally { setAddingEv(false); }
  }

  async function removerEvolucao(evId) {
    if (!confirm('Remover esta evolução?')) return;
    try {
      const data = await api.delete(`/prontuarios/${viewItem.id}/evolucao/${evId}`);
      setViewItem(data.prontuario); toast.success('Evolução removida');
    } catch (err) { toast.error(err.message || 'Erro ao remover'); }
  }

  const pages = Math.ceil(total / 20);

  return (
    <Layout title="Prontuários">
      <div className="px-4 md:px-8 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--tx)' }}>Prontuários</h1>
            <p className="text-sm" style={{ color: 'var(--mt-lt)' }}>{total} registro{total !== 1 ? 's' : ''}</p>
          </div>
          <button onClick={abrirNovo}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: cor, color: '#08080C' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo prontuário
          </button>
        </div>

        {/* Busca */}
        <input type="text" placeholder="Buscar por nome ou diagnóstico..." value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          className="w-full max-w-sm px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={inpStyle} />

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : prontuarios.length === 0 ? (
          <div className="text-center py-16" style={{ color: 'var(--mt-lt)' }}>
            <p className="text-lg font-medium">Nenhum prontuário encontrado</p>
            <p className="text-sm mt-1">Crie o primeiro clicando em "Novo prontuário"</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {prontuarios.map(p => {
              const evCount = Array.isArray(p.evolucoes) ? p.evolucoes.length : 0;
              return (
                <div key={p.id} className="rounded-2xl border p-4 space-y-2 transition-shadow hover:shadow-md"
                  style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--bd)' }}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold truncate" style={{ color: 'var(--tx)' }}>{p.nomeCliente}</p>
                      {p.telefone && <p className="text-xs" style={{ color: 'var(--mt-lt)' }}>{p.telefone}</p>}
                      {p.convenio && <p className="text-xs" style={{ color: 'var(--mt-lt)' }}>Convênio: {p.convenio}</p>}
                      {p.diagnostico && <p className="text-xs truncate mt-0.5" style={{ color: 'var(--tx-md)' }}>{p.diagnostico}</p>}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => abrirDetalhes(p)} title="Ver" className="p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20">
                        <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                      </button>
                      <button onClick={() => abrirEditar(p)} title="Editar" className="p-1.5 rounded-lg hover:bg-yellow-50 dark:hover:bg-yellow-900/20">
                        <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      </button>
                      <button onClick={() => deletar(p.id)} title="Remover" className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                        <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--mt-lt)' }}>
                    <span>{new Date(p.createdAt).toLocaleDateString('pt-BR')}</span>
                    <span className="px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bd)' }}>
                      {evCount} evolução{evCount !== 1 ? 'ões' : ''}
                    </span>
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
              <h2 className="font-bold text-lg" style={{ color: 'var(--tx)' }}>{editing ? 'Editar prontuário' : 'Novo prontuário'}</h2>
              <button onClick={() => setModal(false)} style={{ color: 'var(--mt-lt)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {CAMPOS_BASE.map(f => (
                  <div key={f.key} className={f.key === 'nomeCliente' ? 'col-span-2' : ''}>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--tx-md)' }}>{f.label}{f.required && ' *'}</label>
                    <input type={f.type || 'text'} value={form[f.key] || ''} className={inp} style={inpStyle}
                      onChange={e => setForm(v => ({ ...v, [f.key]: e.target.value }))} />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--tx-md)' }}>Diagnóstico / CID</label>
                <textarea rows={2} value={form.diagnostico} className={inp} style={inpStyle} onChange={e => setForm(v => ({ ...v, diagnostico: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--tx-md)' }}>Observações</label>
                <textarea rows={3} value={form.observacoes} className={inp} style={inpStyle} onChange={e => setForm(v => ({ ...v, observacoes: e.target.value }))} />
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
                <h2 className="font-bold text-lg" style={{ color: 'var(--tx)' }}>{viewItem.nomeCliente}</h2>
                {viewItem.convenio && <p className="text-xs" style={{ color: 'var(--mt-lt)' }}>Convênio: {viewItem.convenio}{viewItem.numeroCarteirinha && ` · Cart. ${viewItem.numeroCarteirinha}`}</p>}
              </div>
              <button onClick={() => setViewItem(null)} style={{ color: 'var(--mt-lt)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                {viewItem.telefone       && <InfoRow label="Telefone"    value={viewItem.telefone} />}
                {viewItem.email          && <InfoRow label="E-mail"      value={viewItem.email} />}
                {viewItem.dataNascimento && <InfoRow label="Nascimento"  value={viewItem.dataNascimento} />}
                {viewItem.diagnostico    && <InfoRow label="Diagnóstico" value={viewItem.diagnostico} span />}
                {viewItem.observacoes    && <InfoRow label="Observações" value={viewItem.observacoes} span />}
              </div>

              {/* Histórico */}
              <div className="border-t pt-4" style={{ borderColor: 'var(--bd)' }}>
                <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--mt-lt)' }}>
                  Evoluções ({Array.isArray(viewItem.evolucoes) ? viewItem.evolucoes.length : 0})
                </p>
                <div className="space-y-3 max-h-60 overflow-y-auto mb-4 pr-1">
                  {(Array.isArray(viewItem.evolucoes) ? [...viewItem.evolucoes].reverse() : []).map(ev => (
                    <div key={ev.id} className="rounded-xl p-3 border" style={{ backgroundColor: 'var(--s2)', borderColor: 'var(--bd)' }}>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--mt-lt)' }}>
                          <span className="font-semibold">{new Date(ev.data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                          {ev.profissional && <span>· {ev.profissional}</span>}
                        </div>
                        <button onClick={() => removerEvolucao(ev.id)} className="p-0.5 rounded hover:bg-red-100 dark:hover:bg-red-900/20">
                          <svg className="w-3.5 h-3.5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                      <p className="text-sm whitespace-pre-wrap" style={{ color: 'var(--tx)' }}>{ev.texto}</p>
                    </div>
                  ))}
                  {(!Array.isArray(viewItem.evolucoes) || viewItem.evolucoes.length === 0) && (
                    <p className="text-sm text-center py-3" style={{ color: 'var(--mt-lt)' }}>Nenhuma evolução registrada</p>
                  )}
                </div>
                <div className="space-y-2">
                  <textarea rows={3} value={novaEv} onChange={e => setNovaEv(e.target.value)}
                    placeholder="Registre a evolução desta consulta..."
                    className={inp} style={{ backgroundColor: 'var(--s2)', borderColor: 'var(--bd)', color: 'var(--tx)' }} />
                  <button onClick={adicionarEvolucao} disabled={addingEv || !novaEv.trim()}
                    className="w-full py-2 rounded-xl text-sm font-medium disabled:opacity-50 hover:opacity-80"
                    style={{ backgroundColor: cor, color: '#08080C' }}>
                    {addingEv ? 'Registrando...' : '+ Registrar evolução'}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-between items-center gap-3 p-5 border-t flex-wrap" style={{ borderColor: 'var(--bd)' }}>
              <button onClick={async () => { setPdfLoading(true); try { const { gerarPdfProntuario } = await import('../utils/pdfGenerator'); await gerarPdfProntuario(viewItem, tenant); } catch { toast.error('Erro ao gerar PDF'); } finally { setPdfLoading(false); } }}
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
      <span className="text-xs flex-1 whitespace-pre-wrap" style={{ color: 'var(--tx)' }}>{value}</span>
    </div>
  );
}
