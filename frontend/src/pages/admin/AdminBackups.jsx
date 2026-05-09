import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';
import { api } from '../../services/api';

const fmt = bytes => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const TIPO_BADGE = {
  admin:  'bg-blue-900 text-blue-300',
  tenant: 'bg-green-900 text-green-300',
};

export default function AdminBackups() {
  const [backups, setBackups]   = useState([]);
  const [tenants, setTenants]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [form, setForm]         = useState({ tipo: 'tenant', tenantId: '', descricao: '' });
  const [criando, setCriando]   = useState(false);
  const [confirmRestore, setConfirmRestore] = useState(null);
  const [confirmDel, setConfirmDel]         = useState(null);
  const [restoring, setRestoring]           = useState(false);

  async function load() {
    setLoading(true);
    try {
      const [b, t] = await Promise.all([
        api.get('/admin/backups'),
        api.get('/admin/tenants'),
      ]);
      setBackups(b);
      setTenants(t.tenants || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function criarBackup(e) {
    e.preventDefault();
    if (form.tipo === 'tenant' && !form.tenantId) return toast.error('Selecione um cliente.');
    setCriando(true);
    try {
      await api.post('/admin/backups', {
        tipo: form.tipo,
        tenantId: form.tenantId ? parseInt(form.tenantId) : undefined,
        descricao: form.descricao || undefined,
      });
      toast.success('Backup criado com sucesso!');
      setForm({ tipo: 'tenant', tenantId: '', descricao: '' });
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setCriando(false);
    }
  }

  async function restaurar(id) {
    setRestoring(true);
    try {
      await api.post(`/admin/backups/${id}/restaurar`, {});
      toast.success('Backup restaurado com sucesso!');
      setConfirmRestore(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setRestoring(false);
    }
  }

  async function excluir(id) {
    try {
      await api.delete(`/admin/backups/${id}`);
      toast.success('Backup excluído.');
      setConfirmDel(null);
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  const backupSel = confirmRestore ? backups.find(b => b.id === confirmRestore) : null;

  async function baixar(b) {
    try {
      const token = localStorage.getItem('crm_token');
      const res = await fetch(`/api/admin/backups/${b.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { toast.error('Erro ao baixar backup'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = b.nomeArquivo;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Erro ao baixar backup');
    }
  }

  return (
    <AdminLayout title="Gestor de Backups" subtitle="Criar, baixar e restaurar backups de clientes e do admin">

      {/* Formulário novo backup */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-6">
        <h2 className="text-white font-semibold mb-4">Novo Backup</h2>
        <form onSubmit={criarBackup} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-slate-400 text-xs mb-1">Tipo</label>
            <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value, tenantId: '' }))}
              className="bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500">
              <option value="tenant">Cliente (Tenant)</option>
              <option value="admin">Admin (Financeiro)</option>
            </select>
          </div>

          {form.tipo === 'tenant' && (
            <div className="min-w-[200px]">
              <label className="block text-slate-400 text-xs mb-1">Cliente *</label>
              <select value={form.tenantId} onChange={e => setForm(f => ({ ...f, tenantId: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500">
                <option value="">— selecione —</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.nome} ({t.slug})</option>)}
              </select>
            </div>
          )}

          <div className="flex-1 min-w-[180px]">
            <label className="block text-slate-400 text-xs mb-1">Descrição (opcional)</label>
            <input value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              placeholder="Ex: backup pré-atualização"
              className="w-full bg-slate-800 border border-slate-600 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-blue-500" />
          </div>

          <button type="submit" disabled={criando}
            className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-medium transition disabled:opacity-50">
            {criando
              ? <><span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" /> Criando…</>
              : <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  Criar Backup
                </>
            }
          </button>
        </form>
      </div>

      {/* Tabela de backups */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="text-white font-semibold">Histórico de Backups</h2>
          <span className="text-slate-500 text-sm">{backups.length} backups</span>
        </div>

        {loading
          ? <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" /></div>
          : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {['Tipo', 'Cliente', 'Arquivo', 'Tamanho', 'Descrição', 'Data', 'Ações'].map(h => (
                    <th key={h} className="text-left text-slate-400 font-medium px-5 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {backups.map(b => (
                  <tr key={b.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-5 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${TIPO_BADGE[b.tipo]}`}>
                        {b.tipo}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {b.tenant
                        ? <div><div className="text-white text-sm">{b.tenant.nome}</div><div className="text-slate-500 text-xs">{b.tenant.slug}</div></div>
                        : <span className="text-slate-500 text-xs">—</span>
                      }
                    </td>
                    <td className="px-5 py-4 text-slate-400 text-xs font-mono max-w-[160px] truncate">{b.nomeArquivo}</td>
                    <td className="px-5 py-4 text-slate-400 text-xs whitespace-nowrap">{fmt(b.tamanhoBytes)}</td>
                    <td className="px-5 py-4 text-slate-400 text-xs max-w-[140px] truncate">{b.descricao || '—'}</td>
                    <td className="px-5 py-4 text-slate-400 text-xs whitespace-nowrap">
                      {new Date(b.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        {/* Download */}
                        <button onClick={() => baixar(b)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-400 hover:bg-slate-700 transition-colors"
                          title="Baixar">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                        {/* Restaurar */}
                        <button onClick={() => setConfirmRestore(b.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-green-400 hover:bg-slate-700 transition-colors"
                          title="Restaurar">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                        </button>
                        {/* Excluir */}
                        <button onClick={() => setConfirmDel(b.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-700 transition-colors"
                          title="Excluir">
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
            {backups.length === 0 && (
              <div className="text-center py-12 text-slate-500">Nenhum backup encontrado. Crie o primeiro backup acima.</div>
            )}
          </div>
        )}
      </div>

      {/* Modal confirmar restauração */}
      {confirmRestore && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-red-900/50 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-900/30 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold">Restaurar backup?</p>
                <p className="text-slate-400 text-sm">Esta ação apagará os dados atuais e reimportará o backup.</p>
              </div>
            </div>
            {backupSel && (
              <div className="bg-slate-800 rounded-xl p-3 mb-4 text-sm">
                <p className="text-slate-300"><span className="text-slate-500">Tipo:</span> {backupSel.tipo}</p>
                {backupSel.tenant && <p className="text-slate-300"><span className="text-slate-500">Cliente:</span> {backupSel.tenant.nome}</p>}
                <p className="text-slate-300"><span className="text-slate-500">Arquivo:</span> {backupSel.nomeArquivo}</p>
                <p className="text-slate-300"><span className="text-slate-500">Data:</span> {new Date(backupSel.createdAt).toLocaleString('pt-BR')}</p>
              </div>
            )}
            <div className="flex gap-3">
              <button onClick={() => setConfirmRestore(null)}
                className="flex-1 py-2 rounded-xl border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-800 text-sm transition">
                Cancelar
              </button>
              <button onClick={() => restaurar(confirmRestore)} disabled={restoring}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition disabled:opacity-50">
                {restoring ? 'Restaurando…' : 'Confirmar Restauração'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmar exclusão */}
      {confirmDel && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-sm text-center">
            <p className="text-white font-semibold mb-2">Excluir backup?</p>
            <p className="text-slate-400 text-sm mb-6">O arquivo será removido permanentemente do servidor.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDel(null)}
                className="flex-1 py-2 rounded-xl border border-slate-600 text-slate-300 hover:text-white hover:bg-slate-800 text-sm transition">
                Cancelar
              </button>
              <button onClick={() => excluir(confirmDel)}
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
