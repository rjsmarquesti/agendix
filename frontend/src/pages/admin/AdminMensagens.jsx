import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';
import { api } from '../../services/api';

const BADGE_MEIO = {
  email:    'bg-blue-100 text-blue-700',
  whatsapp: 'bg-green-100 text-green-700',
};
const BADGE_ORIGEM = {
  manual:      'bg-slate-100 text-slate-600',
  lembrete:    'bg-yellow-100 text-yellow-700',
  confirmacao: 'bg-green-100 text-green-700',
  agente_ia:   'bg-purple-100 text-purple-700',
  sistema:     'bg-blue-100 text-blue-700',
  ativacao:    'bg-cyan-100 text-cyan-700',
  reset_senha: 'bg-orange-100 text-orange-700',
  admin:       'bg-cyan-100 text-cyan-700',
};
const LABEL_ORIGEM = {
  manual: 'Manual', lembrete: 'Lembrete', confirmacao: 'Confirmação',
  agente_ia: 'Agente IA', sistema: 'Sistema', ativacao: 'Ativação', reset_senha: 'Reset Senha',
  admin: 'Admin',
};
const BADGE_STATUS = {
  enviado: 'bg-green-100 text-green-700',
  erro:    'bg-red-100 text-red-700',
  pendente:'bg-yellow-100 text-yellow-700',
};

function fmt(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

const PAGE_SIZE = 20;

export default function AdminMensagens() {
  const [logs,      setLogs]      = useState([]);
  const [total,     setTotal]     = useState(0);
  const [paginas,   setPaginas]   = useState(1);
  const [pagAtual,  setPagAtual]  = useState(1);
  const [tenants,   setTenants]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [selecionados, setSelecionados] = useState([]);
  const [modalLog,  setModalLog]  = useState(null);

  // Filtros
  const [fTenant, setFTenant] = useState('');
  const [fMeio,   setFMeio]   = useState('');
  const [fOrigem, setFOrigem] = useState('');
  const [fDe,     setFDe]     = useState('');
  const [fAte,    setFAte]    = useState('');

  useEffect(() => {
    api.get('/admin/tenants').then(d => setTenants(d?.tenants || [])).catch(() => {});
  }, []);

  const carregar = useCallback(async (pag = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: pag });
      if (fTenant) params.set('tenantId', fTenant);
      if (fMeio)   params.set('meio',     fMeio);
      if (fOrigem) params.set('origem',   fOrigem);
      if (fDe)     params.set('de',       fDe);
      if (fAte)    params.set('ate',      fAte);
      const d = await api.get(`/admin/mensagens?${params}`);
      setLogs(d.logs);
      setTotal(d.total);
      setPaginas(d.paginas);
      setPagAtual(pag);
      setSelecionados([]);
    } catch { toast.error('Erro ao carregar mensagens.'); }
    finally { setLoading(false); }
  }, [fTenant, fMeio, fOrigem, fDe, fAte]);

  useEffect(() => { carregar(1); }, [carregar]);

  async function excluir(id) {
    if (!confirm('Excluir este registro?')) return;
    try {
      await api.delete(`/admin/mensagens/${id}`);
      toast.success('Removido.');
      carregar(pagAtual);
    } catch (e) { toast.error(e.message); }
  }

  async function excluirLote() {
    if (selecionados.length === 0) return;
    if (!confirm(`Excluir ${selecionados.length} registro(s)?`)) return;
    try {
      await api.delete('/admin/mensagens', { ids: selecionados });
      toast.success(`${selecionados.length} registro(s) removido(s).`);
      carregar(pagAtual);
    } catch (e) { toast.error(e.message); }
  }

  function toggleSel(id) {
    setSelecionados(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);
  }
  function toggleTodos() {
    setSelecionados(s => s.length === logs.length ? [] : logs.map(l => l.id));
  }

  return (
    <AdminLayout title="Mensagens" subtitle="Auditoria completa de envios">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select value={fTenant} onChange={e => setFTenant(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ background: 'var(--surface)', borderColor: 'var(--bd)', color: 'var(--tx)' }}>
          <option value="">Todos os tenants</option>
          {tenants.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        <select value={fMeio} onChange={e => setFMeio(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ background: 'var(--surface)', borderColor: 'var(--bd)', color: 'var(--tx)' }}>
          <option value="">Todos os canais</option>
          <option value="email">E-mail</option>
          <option value="whatsapp">WhatsApp</option>
        </select>
        <select value={fOrigem} onChange={e => setFOrigem(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ background: 'var(--surface)', borderColor: 'var(--bd)', color: 'var(--tx)' }}>
          <option value="">Todas as origens</option>
          <option value="manual">Manual</option>
          <option value="lembrete">Lembrete</option>
          <option value="confirmacao">Confirmação</option>
          <option value="agente_ia">Agente IA</option>
          <option value="sistema">Sistema</option>
          <option value="ativacao">Ativação</option>
          <option value="reset_senha">Reset Senha</option>
        </select>
        <input type="date" value={fDe} onChange={e => setFDe(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ background: 'var(--surface)', borderColor: 'var(--bd)', color: 'var(--tx)' }} />
        <input type="date" value={fAte} onChange={e => setFAte(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm outline-none"
          style={{ background: 'var(--surface)', borderColor: 'var(--bd)', color: 'var(--tx)' }} />
      </div>

      {/* Barra de ações */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs" style={{ color: 'var(--mt)' }}>{total} registro{total !== 1 ? 's' : ''}</p>
        {selecionados.length > 0 && (
          <button onClick={excluirLote}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600/30 transition">
            Excluir {selecionados.length} selecionado(s)
          </button>
        )}
      </div>

      {/* Tabela */}
      <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'var(--bd)' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead style={{ background: 'var(--surface-2, var(--surface))' }}>
              <tr style={{ borderBottom: '1px solid var(--bd)' }}>
                <th className="py-3 px-3">
                  <input type="checkbox" checked={selecionados.length === logs.length && logs.length > 0}
                    onChange={toggleTodos}
                    className="w-4 h-4 rounded accent-green-500" />
                </th>
                {['Data/Hora','Tenant','Lead','Para','Canal','Assunto','Origem','Status','Ações'].map(h => (
                  <th key={h} className="text-left py-3 px-3 text-xs font-bold whitespace-nowrap text-slate-700">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-10 text-sm text-slate-500">Carregando...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-10 text-sm text-slate-500">Nenhum registro encontrado.</td></tr>
              ) : logs.map(l => (
                <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50 transition">
                  <td className="py-2.5 px-3">
                    <input type="checkbox" checked={selecionados.includes(l.id)}
                      onChange={() => toggleSel(l.id)}
                      className="w-4 h-4 rounded accent-green-500" />
                  </td>
                  <td className="py-2.5 px-3 text-xs whitespace-nowrap text-slate-600 font-medium">{fmt(l.criadoEm)}</td>
                  <td className="py-2.5 px-3 text-xs font-semibold text-slate-800">
                    {l.tenant ? (
                      <span title={l.tenant.slug}>{l.tenant.nome}</span>
                    ) : <span className="text-slate-400 italic">Sistema</span>}
                  </td>
                  <td className="py-2.5 px-3 text-xs text-slate-700">{l.lead?.nome || <span className="text-slate-400">—</span>}</td>
                  <td className="py-2.5 px-3 text-xs font-mono text-slate-600">{l.para}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${BADGE_MEIO[l.meio] || ''}`}>{l.meio}</span>
                  </td>
                  <td className="py-2.5 px-3 text-xs max-w-[140px] truncate text-slate-700">{l.assunto || <span className="text-slate-400">—</span>}</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${BADGE_ORIGEM[l.origem] || 'bg-slate-100 text-slate-600'}`}>{LABEL_ORIGEM[l.origem] || l.origem}</span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${BADGE_STATUS[l.status] || ''}`}>{l.status}</span>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <button onClick={() => setModalLog(l)}
                      className="mr-2 text-xs px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 transition text-slate-700">Ver</button>
                    <button onClick={() => excluir(l.id)}
                      className="text-xs px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 transition text-red-600">
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginação */}
      {paginas > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: paginas }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => carregar(p)}
              className={`w-8 h-8 rounded-lg text-sm font-medium transition ${p === pagAtual ? 'bg-[var(--g)] text-[#08080C]' : 'bg-white/5 text-[var(--mt)] hover:bg-white/10'}`}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Modal corpo */}
      {modalLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }} onClick={() => setModalLog(null)}>
          <div className="rounded-xl border max-w-2xl w-full max-h-[80vh] flex flex-col"
            style={{ background: 'var(--surface)', borderColor: 'var(--bd)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between p-4 border-b" style={{ borderColor: 'var(--bd)' }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--tx)' }}>{modalLog.assunto || 'Mensagem'}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--mt)' }}>
                  {fmt(modalLog.criadoEm)} · {modalLog.tenant?.nome || 'Sistema'} · Para: {modalLog.para}
                </p>
              </div>
              <button onClick={() => setModalLog(null)} className="text-lg leading-none ml-4" style={{ color: 'var(--mt)' }}>✕</button>
            </div>
            <div className="overflow-y-auto p-4 flex-1">
              {modalLog.meio === 'email' ? (
                <iframe srcDoc={modalLog.corpo} className="w-full h-96 rounded-lg border"
                  style={{ borderColor: 'var(--bd)', background: '#fff' }} title="corpo email" />
              ) : (
                <pre className="text-sm whitespace-pre-wrap" style={{ color: 'var(--tx)', fontFamily: 'inherit' }}>{modalLog.corpo}</pre>
              )}
              {modalLog.erroMsg && (
                <p className="mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2">Erro: {modalLog.erroMsg}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
