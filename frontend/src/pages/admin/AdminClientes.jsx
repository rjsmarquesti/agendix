import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';
import Modal from '../../components/Modal';
import { api } from '../../services/api';

const PLANO_COLOR  = { basico: 'bg-slate-700 text-slate-300', pro: 'bg-blue-900 text-blue-300', premium: 'bg-yellow-900 text-yellow-300' };
const STATUS_COLOR = { trial: 'bg-slate-700 text-slate-300', ativo: 'bg-green-900 text-green-300', inadimplente: 'bg-red-900 text-red-300', cancelado: 'bg-red-950 text-red-400' };
const STATUS_LABEL = { trial: 'Trial', ativo: 'Ativo', inadimplente: 'Inadimplente', cancelado: 'Cancelado' };
const CORES = ['#2563eb','#7c3aed','#db2777','#dc2626','#ea580c','#16a34a','#0891b2','#1e293b'];
const MODULOS = [{ id: 'leads', label: 'Leads' }, { id: 'agendamentos', label: 'Agendamentos' }];

const EMPTY_TENANT = { nome: '', slug: '', logo: '', corPrimaria: '#2563eb', plano: 'basico', planoStatus: 'trial', planoVencimento: '', modulos: ['leads','agendamentos'], ativo: true };
const EMPTY_USER   = { nome: '', email: '', senha: '', role: 'admin' };
const EMPTY_SENHA  = { novaSenha: '', confirmar: '' };

export default function AdminClientes() {
  const [tenants, setTenants]     = useState([]);
  const [busca, setBusca]         = useState('');
  const [modal, setModal]         = useState(null); // 'novo' | 'editar' | 'usuario' | 'senha' | 'detalhe'
  const [selected, setSelected]   = useState(null);
  const [formTenant, setFT]       = useState(EMPTY_TENANT);
  const [formUser, setFU]         = useState(EMPTY_USER);
  const [formSenha, setFS]        = useState(EMPTY_SENHA);
  const [senhaUserId, setSUID]    = useState(null);
  const [loading, setLoading]     = useState(false);
  const [provLoading, setProvLoading] = useState(null); // id do tenant em provisioning

  const load = useCallback(async () => {
    try { const d = await api.get('/admin/tenants'); setTenants(d.tenants); }
    catch (err) { toast.error(err.message); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtrados = tenants.filter(t =>
    t.nome.toLowerCase().includes(busca.toLowerCase()) ||
    t.slug.toLowerCase().includes(busca.toLowerCase())
  );

  // ── Tenant ──────────────────────────────────────────────────────────────
  function abrirNovo()    { setFT(EMPTY_TENANT); setModal('novo'); }
  function abrirEditar(t) { setFT({ nome: t.nome, slug: t.slug, logo: t.logo || '', corPrimaria: t.corPrimaria, plano: t.plano, planoStatus: t.planoStatus || 'trial', planoVencimento: t.planoVencimento ? t.planoVencimento.slice(0,10) : '', modulos: t.modulos || [], ativo: t.ativo }); setSelected(t); setModal('editar'); }

  async function salvarTenant(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (modal === 'novo') { await api.post('/admin/tenants', formTenant); toast.success('Cliente criado!'); }
      else { await api.put(`/admin/tenants/${selected.id}`, formTenant); toast.success('Cliente atualizado!'); }
      setModal(null); load();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  async function toggleAtivo(t) {
    try {
      await api.put(`/admin/tenants/${t.id}`, { ...t, ativo: !t.ativo });
      toast.success(t.ativo ? 'Cliente desativado' : 'Cliente ativado');
      load();
    } catch (err) { toast.error(err.message); }
  }

  async function deletarTenant(t) {
    if (!confirm(`Remover "${t.nome}" e TODOS os dados? Esta ação não pode ser desfeita.`)) return;
    try { await api.delete(`/admin/tenants/${t.id}`); toast.success('Removido'); load(); }
    catch (err) { toast.error(err.message); }
  }

  // ── Usuário ──────────────────────────────────────────────────────────────
  function abrirUsuario(t) { setSelected(t); setFU(EMPTY_USER); setModal('usuario'); }

  async function salvarUsuario(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/admin/tenants/${selected.id}/usuarios`, formUser);
      toast.success('Usuário criado!'); setModal(null);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  // ── Detalhe ──────────────────────────────────────────────────────────────
  const [detalhe, setDetalhe] = useState(null);
  async function abrirDetalhe(t) {
    try {
      const d = await api.get(`/admin/tenants/${t.id}`);
      setDetalhe(d.tenant); setModal('detalhe');
    } catch (err) { toast.error(err.message); }
  }

  // ── Provisioning n8n ─────────────────────────────────────────────────────
  async function provisionarN8n(t) {
    const acao = t.n8nWorkflowWaId ? 'Recriar' : 'Provisionar';
    if (!confirm(`${acao} workflows n8n para "${t.nome}"?`)) return;
    setProvLoading(t.id);
    try {
      await api.post(`/admin/tenants/${t.id}/provision-n8n`);
      toast.success(`Workflows n8n provisionados para ${t.nome}!`);
      load();
    } catch (err) { toast.error(err.message); }
    finally { setProvLoading(null); }
  }

  // ── Senha ────────────────────────────────────────────────────────────────
  function abrirSenha(userId, tenantId) { setSUID({ userId, tenantId }); setFS(EMPTY_SENHA); setModal('senha'); }

  async function salvarSenha(e) {
    e.preventDefault();
    if (formSenha.novaSenha !== formSenha.confirmar) { toast.error('As senhas não coincidem'); return; }
    setLoading(true);
    try {
      await api.put(`/admin/tenants/${senhaUserId.tenantId}/usuarios/${senhaUserId.userId}/senha`, { novaSenha: formSenha.novaSenha });
      toast.success('Senha atualizada!'); setModal(null);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  function toggleModulo(id) {
    setFT(f => ({ ...f, modulos: f.modulos.includes(id) ? f.modulos.filter(m => m !== id) : [...f.modulos, id] }));
  }

  return (
    <AdminLayout title="Clientes" subtitle="Gerencie todas as empresas cadastradas">

      {/* Header impressão */}
      <div className="print-only">
        <div style={{ borderBottom: '2px solid #334155', paddingBottom: 12, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>Divulga BR — Painel Administrativo</div>
          <div style={{ fontWeight: 600, fontSize: 14, marginTop: 4 }}>Lista de Clientes</div>
          <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
            Emitido em {new Date().toLocaleDateString('pt-BR', { dateStyle: 'full' })} · {filtrados.length} cliente(s)
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex gap-3 mb-6 no-print">
        <input value={busca} onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome ou slug..."
          className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-700 text-white rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button onClick={() => window.print()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 text-sm transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          PDF
        </button>
        <button onClick={abrirNovo}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center gap-2 transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="hidden sm:inline">Novo Cliente</span>
          <span className="sm:hidden">Novo</span>
        </button>
      </div>

      {/* Cards mobile */}
      <div className="md:hidden space-y-3 mb-4 no-print">
        {filtrados.length === 0
          ? <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-slate-500">Nenhum cliente encontrado</div>
          : filtrados.map(t => (
            <div key={t.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  {t.logo
                    ? <img src={t.logo} alt={t.nome} className="w-10 h-10 rounded-xl object-contain bg-slate-800 p-1 flex-shrink-0" />
                    : <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                        style={{ backgroundColor: t.corPrimaria || '#2563eb' }}>
                        {t.nome[0]}
                      </div>
                  }
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{t.nome}</p>
                    <p className="text-slate-500 text-xs font-mono">{t.slug}</p>
                  </div>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-semibold flex-shrink-0 ${t.ativo ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
                  {t.ativo ? 'Ativo' : 'Inativo'}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${PLANO_COLOR[t.plano]}`}>{t.plano}</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[t.planoStatus] || STATUS_COLOR.trial}`}>{STATUS_LABEL[t.planoStatus] || 'Trial'}</span>
                <span className="text-slate-400 text-xs">{t._count?.leads || 0} leads</span>
                <span className="text-slate-400 text-xs">· {t._count?.users || 0} usuários</span>
              </div>
              <div className="flex items-center gap-1 border-t border-slate-800 pt-3">
                <button onClick={() => abrirDetalhe(t)} className="flex-1 text-slate-400 hover:text-white text-xs py-1.5 rounded-lg hover:bg-slate-800 transition text-center">Ver</button>
                <button onClick={() => abrirEditar(t)} className="flex-1 text-blue-400 hover:text-blue-300 text-xs py-1.5 rounded-lg hover:bg-slate-800 transition text-center">Editar</button>
                <button onClick={() => abrirUsuario(t)} className="flex-1 text-green-400 hover:text-green-300 text-xs py-1.5 rounded-lg hover:bg-slate-800 transition text-center">+ Usuário</button>
                <button onClick={() => provisionarN8n(t)} disabled={provLoading === t.id}
                  className={`flex-1 text-xs py-1.5 rounded-lg hover:bg-slate-800 transition text-center disabled:opacity-40 ${t.n8nWorkflowWaId ? 'text-green-400' : 'text-yellow-400'}`}>
                  {provLoading === t.id ? '...' : t.n8nWorkflowWaId ? 'n8n ✓' : 'n8n'}
                </button>
                <button onClick={() => deletarTenant(t)} className="flex-1 text-red-500 hover:text-red-400 text-xs py-1.5 rounded-lg hover:bg-slate-800 transition text-center">Remover</button>
              </div>
            </div>
          ))
        }
      </div>

      {/* Tabela desktop + impressão */}
      <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-800">
              <th className="px-6 py-4">Empresa</th>
              <th className="px-6 py-4">Slug</th>
              <th className="px-6 py-4">Plano</th>
              <th className="px-6 py-4">Leads</th>
              <th className="px-6 py-4">Usuários</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 no-print">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0
              ? <tr><td colSpan={7} className="px-6 py-12 text-center text-slate-500">Nenhum cliente encontrado</td></tr>
              : filtrados.map(t => (
                <tr key={t.id} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {t.logo
                        ? <img src={t.logo} alt={t.nome} className="w-9 h-9 rounded-xl object-contain bg-slate-800 p-1 flex-shrink-0" />
                        : <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                            style={{ backgroundColor: t.corPrimaria || '#2563eb' }}>
                            {t.nome[0]}
                          </div>
                      }
                      <div>
                        <p className="text-white font-medium text-sm">{t.nome}</p>
                        <p className="text-slate-500 text-xs">{t.corPrimaria}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-400 text-sm font-mono">{t.slug}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold capitalize w-fit ${PLANO_COLOR[t.plano]}`}>{t.plano}</span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold w-fit ${STATUS_COLOR[t.planoStatus] || STATUS_COLOR.trial}`}>{STATUS_LABEL[t.planoStatus] || 'Trial'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-300 text-sm">{t._count?.leads || 0}</td>
                  <td className="px-6 py-4 text-slate-300 text-sm">{t._count?.users || 0}</td>
                  <td className="px-6 py-4">
                    <button onClick={() => toggleAtivo(t)}
                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${t.ativo ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
                      {t.ativo ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="px-6 py-4 no-print">
                    <div className="flex items-center gap-1">
                      <button onClick={() => abrirDetalhe(t)} title="Ver detalhes"
                        className="text-slate-400 hover:text-white hover:bg-slate-700 p-2 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                      </button>
                      <button onClick={() => abrirEditar(t)} title="Editar"
                        className="text-blue-400 hover:text-blue-300 hover:bg-slate-700 p-2 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                      </button>
                      <button onClick={() => abrirUsuario(t)} title="Adicionar usuário"
                        className="text-green-400 hover:text-green-300 hover:bg-slate-700 p-2 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"/></svg>
                      </button>
                      <button onClick={() => provisionarN8n(t)}
                        title={t.n8nWorkflowWaId ? 'Recriar workflows n8n' : 'Provisionar workflows n8n'}
                        disabled={provLoading === t.id}
                        className={`p-2 rounded-lg transition-colors ${t.n8nWorkflowWaId ? 'text-green-400 hover:text-green-300' : 'text-slate-400 hover:text-yellow-400'} hover:bg-slate-700 disabled:opacity-40`}>
                        {provLoading === t.id
                          ? <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
                          : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                        }
                      </button>
                      <button onClick={() => deletarTenant(t)} title="Remover"
                        className="text-red-500 hover:text-red-400 hover:bg-slate-700 p-2 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* ── Modal: Novo / Editar Cliente ── */}
      <Modal isOpen={modal === 'novo' || modal === 'editar'} onClose={() => setModal(null)}
        title={modal === 'novo' ? 'Novo Cliente' : `Editar: ${selected?.nome}`}>
        <form onSubmit={salvarTenant} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
              <input required value={formTenant.nome} onChange={e => setFT(f => ({ ...f, nome: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug (URL) *</label>
              <input required value={formTenant.slug}
                onChange={e => setFT(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                placeholder="minha-empresa"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 font-mono" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">URL da Logo <span className="font-normal text-gray-400">(opcional)</span></label>
            <input type="url" value={formTenant.logo}
              onChange={e => setFT(f => ({ ...f, logo: e.target.value }))}
              placeholder="https://..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50" />
            {formTenant.logo && <img src={formTenant.logo} alt="preview" className="mt-2 h-10 object-contain rounded-lg border bg-gray-50 p-1" />}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plano</label>
              <select value={formTenant.plano} onChange={e => setFT(f => ({ ...f, plano: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50">
                <option value="basico">Básico (1 usuário · 50 ag/mês)</option>
                <option value="pro">Pro (5 usuários · 300 ag/mês · Bot WA)</option>
                <option value="premium">Premium (ilimitado · Bot WA)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status da assinatura</label>
              <select value={formTenant.planoStatus} onChange={e => setFT(f => ({ ...f, planoStatus: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50">
                <option value="trial">Trial</option>
                <option value="ativo">Ativo</option>
                <option value="inadimplente">Inadimplente</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vencimento da assinatura <span className="font-normal text-gray-400">(opcional)</span></label>
            <input type="date" value={formTenant.planoVencimento} onChange={e => setFT(f => ({ ...f, planoVencimento: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Cor principal</label>
            <div className="flex items-center gap-2 flex-wrap">
              {CORES.map(cor => (
                <button key={cor} type="button" onClick={() => setFT(f => ({ ...f, corPrimaria: cor }))}
                  className={`w-8 h-8 rounded-full transition-all ${formTenant.corPrimaria === cor ? 'ring-4 ring-offset-1 ring-gray-400 scale-110' : ''}`}
                  style={{ backgroundColor: cor }} />
              ))}
              <input type="color" value={formTenant.corPrimaria}
                onChange={e => setFT(f => ({ ...f, corPrimaria: e.target.value }))}
                className="w-8 h-8 rounded-full cursor-pointer border-0" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Módulos ativos</label>
            <div className="flex gap-4">
              {MODULOS.map(m => (
                <label key={m.id} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={formTenant.modulos.includes(m.id)} onChange={() => toggleModulo(m.id)} className="rounded" />
                  <span className="text-sm text-gray-700">{m.label}</span>
                </label>
              ))}
            </div>
          </div>
          {modal === 'editar' && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formTenant.ativo} onChange={e => setFT(f => ({ ...f, ativo: e.target.checked }))} className="rounded" />
              <span className="text-sm text-gray-700">Cliente ativo</span>
            </label>
          )}
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition disabled:opacity-60">
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Novo Usuário ── */}
      <Modal isOpen={modal === 'usuario'} onClose={() => setModal(null)}
        title={`Novo usuário — ${selected?.nome}`}>
        <form onSubmit={salvarUsuario} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input required value={formUser.nome} onChange={e => setFU(f => ({ ...f, nome: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" required value={formUser.email} onChange={e => setFU(f => ({ ...f, email: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
            <input type="password" required minLength={6} value={formUser.senha}
              onChange={e => setFU(f => ({ ...f, senha: e.target.value }))}
              placeholder="mínimo 6 caracteres"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Papel</label>
            <select value={formUser.role} onChange={e => setFU(f => ({ ...f, role: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50">
              <option value="admin">Admin</option>
              <option value="atendente">Atendente</option>
            </select>
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition disabled:opacity-60">
              {loading ? 'Criando...' : 'Criar usuário'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Modal: Detalhe / Usuários ── */}
      <Modal isOpen={modal === 'detalhe'} onClose={() => setModal(null)}
        title={`${detalhe?.nome || ''} — Usuários`}>
        {detalhe && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3 mb-4">
              {[
                { l: 'Leads',        v: detalhe._count?.leads },
                { l: 'Agendamentos', v: detalhe._count?.agendamentos },
                { l: 'Usuários',     v: detalhe._count?.users },
              ].map(s => (
                <div key={s.l} className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-gray-900">{s.v || 0}</p>
                  <p className="text-xs text-gray-500">{s.l}</p>
                </div>
              ))}
            </div>
            <p className="text-sm font-medium text-gray-700 mb-2">Usuários cadastrados:</p>
            {(detalhe.users || []).map(u => (
              <div key={u.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div>
                  <p className="text-sm font-medium text-gray-900">{u.nome}</p>
                  <p className="text-xs text-gray-500">{u.email} · {u.role}</p>
                </div>
                <button onClick={() => abrirSenha(u.id, detalhe.id)}
                  className="text-xs bg-yellow-100 text-yellow-700 hover:bg-yellow-200 px-3 py-1.5 rounded-lg transition font-medium">
                  Trocar senha
                </button>
              </div>
            ))}
            {(!detalhe.users || detalhe.users.length === 0) && (
              <p className="text-center text-gray-400 text-sm py-4">Nenhum usuário</p>
            )}
          </div>
        )}
      </Modal>

      {/* ── Modal: Trocar Senha ── */}
      <Modal isOpen={modal === 'senha'} onClose={() => setModal(null)} title="Trocar senha do usuário">
        <form onSubmit={salvarSenha} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha *</label>
            <input type="password" required minLength={6} value={formSenha.novaSenha}
              onChange={e => setFS(f => ({ ...f, novaSenha: e.target.value }))}
              placeholder="mínimo 6 caracteres"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar senha *</label>
            <input type="password" required value={formSenha.confirmar}
              onChange={e => setFS(f => ({ ...f, confirmar: e.target.value }))}
              placeholder="repita a senha"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50" />
          </div>
          {formSenha.novaSenha && formSenha.confirmar && formSenha.novaSenha !== formSenha.confirmar && (
            <p className="text-red-500 text-xs">As senhas não coincidem</p>
          )}
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={loading || formSenha.novaSenha !== formSenha.confirmar}
              className="bg-yellow-500 hover:bg-yellow-600 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition disabled:opacity-60">
              {loading ? 'Salvando...' : 'Atualizar senha'}
            </button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
