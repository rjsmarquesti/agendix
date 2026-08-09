import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { toast } from 'react-hot-toast';

const CLIENTE_STATUS_LABEL = { ativo: 'Ativo', pausado: 'Pausado', encerrado: 'Encerrado' };
const CLIENTE_STATUS_STYLE = {
  ativo:     'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  pausado:   'bg-amber-500/10 text-amber-400 border-amber-500/20',
  encerrado: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function Clientes() {
  const [clientes, setClientes]   = useState([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [pages, setPages]         = useState(1);
  const [busca, setBusca]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [selected, setSelected]   = useState(null);
  const [modalVer, setModalVer]   = useState(false);
  const [revertendo, setRevertendo] = useState(false);
  const [alterandoStatus, setAlterandoStatus] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // lead a reverter

  const load = useCallback(async (p = 1, b = busca) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ status: 'convertido', page: p });
      if (b) params.set('busca', b);
      const d = await api.get(`/leads?${params}`);
      setClientes(d.leads || []);
      setTotal(d.total || 0);
      setPage(d.page || 1);
      setPages(d.pages || 1);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }, [busca]);

  useEffect(() => { load(1); }, []);

  function buscar(e) {
    e.preventDefault();
    load(1, busca);
  }

  async function reverterStatus(lead) {
    setConfirmDelete(lead);
  }

  async function confirmarReverter() {
    const lead = confirmDelete;
    setConfirmDelete(null);
    setRevertendo(true);
    try {
      await api.put(`/leads/${lead.id}`, { status: 'qualificado' });
      toast.success('Lead movido de volta para Qualificado');
      load(page);
      if (modalVer) setModalVer(false);
    } catch (err) { toast.error(err.message); }
    finally { setRevertendo(false); }
  }

  async function alterarClienteStatus(cliente, novoStatus) {
    setAlterandoStatus(true);
    try {
      await api.patch(`/leads/${cliente.id}/cliente-status`, { clienteStatus: novoStatus });
      toast.success('Status atualizado');
      load(page);
      if (selected?.id === cliente.id) setSelected(c => ({ ...c, clienteStatus: novoStatus }));
    } catch (err) { toast.error(err.message); }
    finally { setAlterandoStatus(false); }
  }

  function fmtData(d) {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('pt-BR');
  }

  function fmtTel(t) {
    if (!t) return null;
    const d = t.replace(/\D/g, '');
    if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
    return t;
  }

  return (
    <Layout title="Clientes" subtitle="Leads convertidos em clientes">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <form onSubmit={buscar} className="flex gap-2 flex-1 max-w-md">
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por nome, telefone..."
            className="flex-1 px-4 py-2 rounded-xl border border-[var(--bd)] bg-[var(--s2)] text-[var(--tx)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--g)]"
          />
          <button type="submit" className="px-4 py-2 bg-[var(--g)] text-white rounded-xl text-sm font-medium hover:opacity-90 transition">
            Buscar
          </button>
        </form>
        <div className="text-sm text-[var(--mt)]">{total} cliente{total !== 1 ? 's' : ''}</div>
      </div>

      {/* Tabela desktop */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-[var(--bd)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--bd)] bg-[var(--s2)] text-[var(--mt)] text-xs uppercase tracking-wide">
              <th className="px-5 py-3 text-left">Nome</th>
              <th className="px-5 py-3 text-left">Nicho</th>
              <th className="px-5 py-3 text-left">Telefone</th>
              <th className="px-5 py-3 text-left">Serviços</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-left">Convertido em</th>
              <th className="px-5 py-3 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-10 text-center text-[var(--mt)]">Carregando...</td></tr>
            ) : clientes.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-14 text-center text-[var(--mt)]">Nenhum cliente encontrado</td></tr>
            ) : clientes.map(c => (
              <tr key={c.id} className="border-b border-[var(--bd)] hover:bg-[var(--s2)] transition-colors">
                <td className="px-5 py-3">
                  <div className="font-medium text-[var(--tx)]">{c.nome}</div>
                  {c.website && <a href={c.website} target="_blank" rel="noreferrer" className="text-xs text-[var(--g)] hover:underline truncate max-w-[160px] block">{c.website}</a>}
                </td>
                <td className="px-5 py-3">
                  {c.nicho ? (
                    <span className="text-xs px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-400">{c.nicho}{c.categoria ? ` · ${c.categoria}` : ''}</span>
                  ) : <span className="text-[var(--mt)]">—</span>}
                </td>
                <td className="px-5 py-3 text-[var(--tx)]">{fmtTel(c.telefone) || <span className="text-[var(--mt)]">—</span>}</td>
                <td className="px-5 py-3">
                  {Array.isArray(c.servicosContratados) && c.servicosContratados.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {c.servicosContratados.map((s, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-[var(--g)]/10 text-[var(--g)] border border-[var(--g)]/20">{s.nome}</span>
                      ))}
                    </div>
                  ) : <span className="text-[var(--mt)] text-xs">—</span>}
                </td>
                <td className="px-5 py-3">
                  <select value={c.clienteStatus || 'ativo'} disabled={alterandoStatus}
                    onChange={e => alterarClienteStatus(c, e.target.value)}
                    className={`text-xs px-2 py-1 rounded-lg border font-medium cursor-pointer bg-transparent ${CLIENTE_STATUS_STYLE[c.clienteStatus || 'ativo']}`}>
                    {Object.entries(CLIENTE_STATUS_LABEL).map(([v, l]) => (
                      <option key={v} value={v}>{l}</option>
                    ))}
                  </select>
                </td>
                <td className="px-5 py-3 text-xs text-[var(--mt)]">{fmtData(c.updatedAt)}</td>
                <td className="px-5 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => { setSelected(c); setModalVer(true); }}
                      className="px-3 py-1.5 text-xs rounded-lg bg-[var(--s2)] border border-[var(--bd)] text-[var(--tx)] hover:border-[var(--g)] transition">
                      Ver
                    </button>
                    <button onClick={() => reverterStatus(c)} disabled={revertendo}
                      className="px-3 py-1.5 text-xs rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition disabled:opacity-50">
                      Reverter
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards mobile */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="text-center py-10 text-[var(--mt)]">Carregando...</div>
        ) : clientes.length === 0 ? (
          <div className="text-center py-14 text-[var(--mt)]">Nenhum cliente encontrado</div>
        ) : clientes.map(c => (
          <div key={c.id} className="rounded-2xl border border-[var(--bd)] bg-[var(--s2)] p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="font-semibold text-[var(--tx)]">{c.nome}</div>
                {c.nicho && <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 mt-1 inline-block">{c.nicho}</span>}
              </div>
              <span className="text-xs text-[var(--mt)] shrink-0">{fmtData(c.updatedAt)}</span>
            </div>
            <div className="text-sm text-[var(--mt)] space-y-0.5">
              {c.telefone && <div>📞 {fmtTel(c.telefone)}</div>}
              {c.email    && <div>✉️ {c.email}</div>}
              {(c.cidade || c.municipio || c.estado) && <div>📍 {[c.cidade || c.municipio, c.estado].filter(Boolean).join(', ')}</div>}
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={() => { setSelected(c); setModalVer(true); }}
                className="flex-1 py-1.5 text-xs rounded-xl bg-[var(--surface)] border border-[var(--bd)] text-[var(--tx)] hover:border-[var(--g)] transition">
                Ver detalhes
              </button>
              <button onClick={() => reverterStatus(c)} disabled={revertendo}
                className="flex-1 py-1.5 text-xs rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 hover:bg-amber-500/20 transition">
                Reverter
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Paginação */}
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => load(p)}
              className={`w-9 h-9 rounded-xl text-sm font-medium transition ${p === page ? 'bg-[var(--g)] text-white' : 'bg-[var(--s2)] border border-[var(--bd)] text-[var(--tx)] hover:border-[var(--g)]'}`}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Modal Confirmação — Reverter cliente */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setConfirmDelete(null)}>
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--bd)] w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <h2 className="font-bold text-[var(--tx)] text-base mb-2">Reverter cliente?</h2>
            <p className="text-sm text-[var(--mt)] mb-6">
              Remover <span className="font-medium text-[var(--tx)]">"{confirmDelete.nome}"</span> da lista de clientes? O lead voltará para "Qualificado".
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-[var(--s2)] border border-[var(--bd)] text-[var(--tx)] text-sm font-medium hover:border-[var(--g)] transition">
                Cancelar
              </button>
              <button onClick={confirmarReverter} disabled={revertendo}
                className="flex-1 py-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-sm font-medium hover:bg-amber-500/20 transition disabled:opacity-50">
                Confirmar exclusão
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Ver */}
      {modalVer && selected && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setModalVer(false)}>
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--bd)] w-full max-w-lg p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-[var(--tx)] text-lg">{selected.nome}</h2>
              <button onClick={() => setModalVer(false)} className="text-[var(--mt)] hover:text-[var(--tx)] text-xl">✕</button>
            </div>

            {selected.nicho && (
              <div className="mb-4">
                <span className="text-xs px-2 py-1 rounded-full bg-indigo-500/10 text-indigo-400">{selected.nicho}{selected.categoria ? ` · ${selected.categoria}` : ''}</span>
              </div>
            )}

            <div className="space-y-2 text-sm">
              {selected.telefone  && <div className="flex gap-2"><span className="text-[var(--mt)] w-28 shrink-0">Telefone</span><span className="text-[var(--tx)]">{fmtTel(selected.telefone)}</span></div>}
              {selected.email     && <div className="flex gap-2"><span className="text-[var(--mt)] w-28 shrink-0">Email</span><span className="text-[var(--tx)]">{selected.email}</span></div>}
              {selected.website   && <div className="flex gap-2"><span className="text-[var(--mt)] w-28 shrink-0">Site</span><a href={selected.website} target="_blank" rel="noreferrer" className="text-[var(--g)] hover:underline truncate">{selected.website}</a></div>}
              {(selected.cidade || selected.municipio) && <div className="flex gap-2"><span className="text-[var(--mt)] w-28 shrink-0">Cidade</span><span className="text-[var(--tx)]">{selected.cidade || selected.municipio}{selected.estado ? ` — ${selected.estado}` : ''}</span></div>}
              {selected.observacoes && <div className="flex gap-2"><span className="text-[var(--mt)] w-28 shrink-0">Observações</span><span className="text-[var(--tx)]">{selected.observacoes}</span></div>}
              <div className="flex gap-2">
                <span className="text-[var(--mt)] w-28 shrink-0">Status</span>
                <select value={selected.clienteStatus || 'ativo'} disabled={alterandoStatus}
                  onChange={e => alterarClienteStatus(selected, e.target.value)}
                  className={`text-xs px-2 py-1 rounded-lg border font-medium cursor-pointer bg-transparent ${CLIENTE_STATUS_STYLE[selected.clienteStatus || 'ativo']}`}>
                  {Object.entries(CLIENTE_STATUS_LABEL).map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              {Array.isArray(selected.servicosContratados) && selected.servicosContratados.length > 0 && (
                <div className="flex gap-2">
                  <span className="text-[var(--mt)] w-28 shrink-0">Serviços</span>
                  <div className="flex flex-wrap gap-1">
                    {selected.servicosContratados.map((s, i) => (
                      <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-[var(--g)]/10 text-[var(--g)] border border-[var(--g)]/20">{s.nome}</span>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex gap-2"><span className="text-[var(--mt)] w-28 shrink-0">Convertido em</span><span className="text-[var(--tx)]">{fmtData(selected.updatedAt)}</span></div>
              <div className="flex gap-2"><span className="text-[var(--mt)] w-28 shrink-0">Origem</span><span className="text-[var(--tx)]">{selected.fonte || '—'}</span></div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => reverterStatus(selected)} disabled={revertendo}
                className="flex-1 py-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-sm font-medium hover:bg-amber-500/20 transition disabled:opacity-50">
                Reverter para Qualificado
              </button>
              <button onClick={() => setModalVer(false)}
                className="flex-1 py-2.5 rounded-xl bg-[var(--s2)] border border-[var(--bd)] text-[var(--tx)] text-sm font-medium hover:border-[var(--g)] transition">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
