import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';
import { api } from '../../services/api';

const ACAO_BADGE = {
  login:              'bg-slate-700 text-slate-300',
  backup_criado:      'bg-blue-900 text-blue-300',
  backup_restaurado:  'bg-green-900 text-green-300',
  tenant_criado:      'bg-purple-900 text-purple-300',
  tenant_deletado:    'bg-red-900 text-red-300',
};

function badgeAcao(acao) {
  return ACAO_BADGE[acao] || 'bg-slate-800 text-slate-400';
}

function labelAcao(acao) {
  const map = {
    login: 'Login',
    backup_criado: 'Backup Criado',
    backup_restaurado: 'Backup Restaurado',
    tenant_criado: 'Cliente Criado',
    tenant_deletado: 'Cliente Excluído',
  };
  return map[acao] || acao;
}

export default function AdminLogs() {
  const [logs, setLogs]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState([]);
  const [acoes, setAcoes]     = useState([]);
  const [expandido, setExpandido] = useState(null);

  // Filtros
  const [fAcao,     setFAcao]     = useState('');
  const [fTenant,   setFTenant]   = useState('');
  const [fInicio,   setFInicio]   = useState('');
  const [fFim,      setFim]       = useState('');
  const [offset,    setOffset]    = useState(0);
  const LIMIT = 50;

  const load = useCallback(async (reset = false) => {
    setLoading(true);
    const off = reset ? 0 : offset;
    try {
      const params = { limit: LIMIT, offset: off };
      if (fAcao)   params.acao = fAcao;
      if (fTenant) params.tenantId = fTenant;
      if (fInicio) params.dataInicio = fInicio;
      if (fFim)    params.dataFim = fFim;

      const data = await api.get('/admin/logs', params);
      if (reset) {
        setLogs(data.logs);
        setOffset(0);
      } else {
        setLogs(prev => [...prev, ...data.logs]);
      }
      setTotal(data.total);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [fAcao, fTenant, fInicio, fFim, offset]);

  useEffect(() => {
    Promise.all([
      api.get('/admin/tenants'),
      api.get('/admin/logs/acoes'),
    ]).then(([t, a]) => {
      setTenants(t.tenants || []);
      setAcoes(a);
    }).catch(() => {});
  }, []);

  useEffect(() => { load(true); }, [fAcao, fTenant, fInicio, fFim]); // eslint-disable-line

  function carregarMais() {
    const novoOffset = offset + LIMIT;
    setOffset(novoOffset);
  }

  useEffect(() => {
    if (offset > 0) load(false);
  }, [offset]); // eslint-disable-line

  return (
    <AdminLayout title="Logs de Auditoria" subtitle="Registro de ações críticas na plataforma">

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select value={fAcao} onChange={e => setFAcao(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500">
          <option value="">Todas as ações</option>
          {acoes.map(a => <option key={a} value={a}>{labelAcao(a)}</option>)}
        </select>

        <select value={fTenant} onChange={e => setFTenant(e.target.value)}
          className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500">
          <option value="">Todos os clientes</option>
          {tenants.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>

        <div className="flex items-center gap-2">
          <input type="date" value={fInicio} onChange={e => setFInicio(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500" />
          <span className="text-slate-500 text-sm">até</span>
          <input type="date" value={fFim} onChange={e => setFim(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500" />
        </div>

        <button onClick={() => { setFAcao(''); setFTenant(''); setFInicio(''); setFim(''); }}
          className="px-3 py-2 text-slate-400 hover:text-white text-sm transition">
          Limpar
        </button>

        <span className="text-slate-500 text-sm self-center ml-auto">{total} registro(s)</span>
      </div>

      {/* Tabela */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        {loading && logs.length === 0
          ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>
          : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Data/Hora', 'Ação', 'Entidade', 'Cliente', 'IP', 'Detalhes'].map(h => (
                    <th key={h} className="text-left text-slate-400 font-medium px-5 py-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <>
                    <tr key={l.id}
                      className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors cursor-pointer"
                      onClick={() => setExpandido(expandido === l.id ? null : l.id)}>
                      <td className="px-5 py-4 text-slate-400 text-xs whitespace-nowrap">
                        {new Date(l.createdAt).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${badgeAcao(l.acao)}`}>
                          {labelAcao(l.acao)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-400 text-xs">
                        {l.entidade ? <span className="capitalize">{l.entidade}</span> : '—'}
                        {l.entidadeId ? <span className="text-slate-600"> #{l.entidadeId}</span> : ''}
                      </td>
                      <td className="px-5 py-4 text-slate-300 text-xs">
                        {l.tenant ? <span>{l.tenant.nome} <span className="text-slate-500">({l.tenant.slug})</span></span> : '—'}
                      </td>
                      <td className="px-5 py-4 text-slate-500 text-xs font-mono">{l.ip || '—'}</td>
                      <td className="px-5 py-4">
                        {l.detalhes
                          ? <button className="text-slate-500 hover:text-blue-400 text-xs transition-colors">
                              {expandido === l.id ? '▲ ocultar' : '▼ ver'}
                            </button>
                          : <span className="text-slate-700 text-xs">—</span>
                        }
                      </td>
                    </tr>
                    {expandido === l.id && l.detalhes && (
                      <tr key={`${l.id}-detail`} className="bg-slate-800/50">
                        <td colSpan={6} className="px-5 py-3">
                          <pre className="text-slate-300 text-xs overflow-x-auto whitespace-pre-wrap font-mono bg-slate-950 rounded-lg p-3">
                            {JSON.stringify(l.detalhes, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>

            {logs.length === 0 && (
              <div className="text-center py-12 text-slate-500">Nenhum log encontrado para os filtros selecionados.</div>
            )}
          </div>
        )}

        {/* Carregar mais */}
        {logs.length < total && (
          <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between">
            <span className="text-slate-500 text-sm">Exibindo {logs.length} de {total}</span>
            <button onClick={carregarMais} disabled={loading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-xl transition disabled:opacity-50">
              {loading ? 'Carregando…' : 'Carregar mais'}
            </button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
