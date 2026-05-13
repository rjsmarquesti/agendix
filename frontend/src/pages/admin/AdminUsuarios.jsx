import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import AdminLayout from '../../components/AdminLayout';

const ROLE_LABEL = { super_admin: 'Super Admin', admin: 'Admin', atendente: 'Atendente' };
const ROLE_COLOR = { super_admin: 'bg-purple-900/50 text-purple-300', admin: 'bg-blue-900/50 text-blue-300', atendente: 'bg-slate-700 text-slate-300' };

export default function AdminUsuarios() {
  const { token } = useAuth();
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };

  const [usuarios, setUsuarios] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({ tenantId: '', role: '', ativo: '', q: '' });

  const [modalReset, setModalReset] = useState(null);
  const [modalMsg, setModalMsg] = useState(null);
  const [viaReset, setViaReset] = useState('email');
  const [msgCanal, setMsgCanal] = useState('email');
  const [msgAssunto, setMsgAssunto] = useState('');
  const [msgTexto, setMsgTexto] = useState('');
  const [acao, setAcao] = useState({ loading: false, erro: '', ok: false });

  async function carregar() {
    setLoading(true);
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => { if (v) params.set(k, v); });
    const res = await fetch(`/api/admin/usuarios?${params}`, { headers });
    const data = await res.json();
    setUsuarios(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  useEffect(() => {
    fetch('/api/admin/tenants', { headers }).then(r => r.json()).then(d => setTenants(Array.isArray(d) ? d : []));
  }, []);

  useEffect(() => { carregar(); }, [filtros]);

  async function toggleAtivo(u) {
    await fetch(`/api/admin/usuarios/${u.id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ ativo: !u.ativo }),
    });
    setUsuarios(prev => prev.map(x => x.id === u.id ? { ...x, ativo: !u.ativo } : x));
  }

  function abrirReset(u) { setModalReset(u); setViaReset('email'); setAcao({ loading: false, erro: '', ok: false }); }
  function abrirMsg(u) { setModalMsg(u); setMsgCanal('email'); setMsgAssunto(''); setMsgTexto(''); setAcao({ loading: false, erro: '', ok: false }); }

  async function enviarReset() {
    setAcao({ loading: true, erro: '', ok: false });
    try {
      const res = await fetch(`/api/admin/usuarios/${modalReset.id}/reset-senha`, {
        method: 'POST', headers, body: JSON.stringify({ via: viaReset }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAcao({ loading: false, erro: '', ok: true });
    } catch (e) { setAcao({ loading: false, erro: e.message, ok: false }); }
  }

  async function enviarMensagem() {
    if (!msgTexto.trim()) return;
    setAcao({ loading: true, erro: '', ok: false });
    try {
      const res = await fetch(`/api/admin/usuarios/${modalMsg.id}/mensagem`, {
        method: 'POST', headers,
        body: JSON.stringify({ canal: msgCanal, assunto: msgAssunto, mensagem: msgTexto }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAcao({ loading: false, erro: '', ok: true });
    } catch (e) { setAcao({ loading: false, erro: e.message, ok: false }); }
  }

  return (
    <AdminLayout title="Usuários" subtitle="Todos os usuários de todos os tenants">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          placeholder="Buscar nome ou email..."
          value={filtros.q}
          onChange={e => setFiltros(f => ({ ...f, q: e.target.value }))}
          className="px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
        />
        <select value={filtros.tenantId} onChange={e => setFiltros(f => ({ ...f, tenantId: e.target.value }))}
          className="px-3 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-sm focus:outline-none">
          <option value="">Todos os tenants</option>
          {tenants.map(t => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        <select value={filtros.role} onChange={e => setFiltros(f => ({ ...f, role: e.target.value }))}
          className="px-3 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-sm focus:outline-none">
          <option value="">Todos os roles</option>
          <option value="admin">Admin</option>
          <option value="atendente">Atendente</option>
          <option value="super_admin">Super Admin</option>
        </select>
        <select value={filtros.ativo} onChange={e => setFiltros(f => ({ ...f, ativo: e.target.value }))}
          className="px-3 py-2 bg-slate-800 border border-slate-700 text-slate-300 rounded-xl text-sm focus:outline-none">
          <option value="">Todos</option>
          <option value="true">Ativos</option>
          <option value="false">Inativos</option>
        </select>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-slate-400">Carregando...</div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="text-left px-4 py-3 font-medium">Nome</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Email</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">WhatsApp</th>
                  <th className="text-left px-4 py-3 font-medium">Role</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Tenant</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-12 text-slate-500">Nenhum usuário encontrado</td></tr>
                )}
                {usuarios.map(u => (
                  <tr key={u.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3 text-white font-medium">{u.nome}</td>
                    <td className="px-4 py-3 text-slate-400 hidden md:table-cell">{u.email}</td>
                    <td className="px-4 py-3 text-slate-400 hidden lg:table-cell">{u.whatsapp || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-lg text-xs font-medium ${ROLE_COLOR[u.role] || 'bg-slate-700 text-slate-300'}`}>
                        {ROLE_LABEL[u.role] || u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400 hidden md:table-cell">
                      {u.tenant
                        ? <span className="text-xs bg-slate-800 px-2 py-1 rounded-lg">{u.tenant.nome}</span>
                        : <span className="text-slate-600 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleAtivo(u)}
                        className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${u.ativo
                          ? 'bg-green-900/50 text-green-300 hover:bg-red-900/50 hover:text-red-300'
                          : 'bg-red-900/50 text-red-300 hover:bg-green-900/50 hover:text-green-300'}`}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => abrirReset(u)} title="Resetar senha"
                          className="p-1.5 text-slate-400 hover:text-yellow-400 hover:bg-yellow-900/30 rounded-lg transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                          </svg>
                        </button>
                        <button onClick={() => abrirMsg(u)} title="Enviar mensagem"
                          className="p-1.5 text-slate-400 hover:text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Reset Senha */}
      {modalReset && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-bold text-lg mb-1">Resetar senha</h3>
            <p className="text-slate-400 text-sm mb-4">Enviar link de redefinição para <strong className="text-white">{modalReset.nome}</strong></p>
            <div className="space-y-3 mb-4">
              {[
                { v: 'email', label: '📧 Por e-mail' },
                { v: 'whatsapp', label: '💬 Por WhatsApp' },
                { v: 'ambos', label: '📧💬 Ambos' },
              ].map(({ v, label }) => (
                <label key={v} className="flex items-center gap-3 cursor-pointer">
                  <input type="radio" name="via" value={v} checked={viaReset === v} onChange={() => setViaReset(v)}
                    className="accent-blue-500" />
                  <span className="text-slate-300 text-sm">{label}</span>
                </label>
              ))}
            </div>
            {acao.erro && <div className="bg-red-900/30 border border-red-700 text-red-400 px-3 py-2 rounded-xl text-sm mb-3">{acao.erro}</div>}
            {acao.ok && <div className="bg-green-900/30 border border-green-700 text-green-400 px-3 py-2 rounded-xl text-sm mb-3">Link enviado com sucesso!</div>}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setModalReset(null)} className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors">Cancelar</button>
              <button onClick={enviarReset} disabled={acao.loading || acao.ok}
                className="px-4 py-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-60 text-white text-sm rounded-xl transition-colors font-medium">
                {acao.loading ? 'Enviando...' : 'Enviar link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Enviar Mensagem */}
      {modalMsg && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-bold text-lg mb-1">Enviar mensagem</h3>
            <p className="text-slate-400 text-sm mb-4">Para: <strong className="text-white">{modalMsg.nome}</strong></p>
            <div className="space-y-4 mb-4">
              <div className="flex gap-3">
                {[
                  { c: 'email', label: '📧 E-mail' },
                  { c: 'whatsapp', label: '💬 WhatsApp' },
                ].map(({ c, label }) => (
                  <button key={c} onClick={() => setMsgCanal(c)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition-colors border ${msgCanal === c ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'}`}>
                    {label}
                  </button>
                ))}
              </div>
              {msgCanal === 'email' && (
                <input placeholder="Assunto (opcional)" value={msgAssunto} onChange={e => setMsgAssunto(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              )}
              <textarea rows={4} placeholder="Mensagem..." value={msgTexto} onChange={e => setMsgTexto(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            {acao.erro && <div className="bg-red-900/30 border border-red-700 text-red-400 px-3 py-2 rounded-xl text-sm mb-3">{acao.erro}</div>}
            {acao.ok && <div className="bg-green-900/30 border border-green-700 text-green-400 px-3 py-2 rounded-xl text-sm mb-3">Mensagem enviada!</div>}
            <div className="flex gap-3 justify-end">
              <button onClick={() => setModalMsg(null)} className="px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors">Cancelar</button>
              <button onClick={enviarMensagem} disabled={acao.loading || acao.ok || !msgTexto.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm rounded-xl transition-colors font-medium">
                {acao.loading ? 'Enviando...' : 'Enviar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
