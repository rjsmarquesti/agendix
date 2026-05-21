import { useEffect, useState, useCallback } from 'react';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/AdminLayout';
import Modal from '../../components/Modal';
import { api } from '../../services/api';

const PLANO_COLOR  = { basico: 'bg-slate-700 text-slate-300', pro: 'bg-blue-900 text-blue-300', premium: 'bg-yellow-900 text-yellow-300', business: 'bg-purple-900 text-purple-300' };
const STATUS_COLOR = { trial: 'bg-slate-700 text-slate-300', ativo: 'bg-green-900 text-green-300', inadimplente: 'bg-red-900 text-red-300', cancelado: 'bg-red-950 text-red-400', inativo: 'bg-gray-700 text-gray-400', aguardando_pagamento: 'bg-yellow-900 text-yellow-300' };
const STATUS_LABEL = { trial: 'Trial', ativo: 'Ativo', inadimplente: 'Inadimplente', cancelado: 'Cancelado', inativo: 'Inativo', aguardando_pagamento: 'Aguardando pgto.' };
const CORES = ['#2563eb','#7c3aed','#db2777','#dc2626','#ea580c','#16a34a','#0891b2','#1e293b'];
const MODULOS = [{ id: 'leads', label: 'Leads' }, { id: 'agendamentos', label: 'Agendamentos' }];
const ORDEM_PLANO = { basico: 0, pro: 1, premium: 2, business: 3 };
const PLANOS_INFO = [
  { value: 'basico',   label: 'Básico',   preco: 'R$ 37/mês' },
  { value: 'pro',      label: 'Pro',       preco: 'R$ 57/mês' },
  { value: 'premium',  label: 'Premium',   preco: 'R$ 97/mês' },
  { value: 'business', label: 'Business',  preco: 'R$ 127/mês' },
];

const EMPTY_TENANT    = { nome: '', slug: '', logo: '', corPrimaria: '#2563eb', plano: 'basico', planoStatus: 'trial', planoVencimento: '', modulos: ['leads','agendamentos'], ativo: true, email: '', telefone: '' };
const EMPTY_USER      = { nome: '', email: '', senha: '', role: 'admin' };
const EMPTY_SENHA     = { novaSenha: '', confirmar: '' };
const EMPTY_EDIT_USER = { nome: '', email: '', whatsapp: '', role: 'atendente', ativo: true };

function IconEye({ off }) {
  return off ? (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
    </svg>
  );
}

export default function AdminClientes() {
  const [tenants, setTenants]     = useState([]);
  const [busca, setBusca]         = useState('');
  const [modal, setModal]         = useState(null); // 'novo' | 'editar' | 'usuario' | 'senha' | 'detalhe'
  const [selected, setSelected]   = useState(null);
  const [formTenant, setFT]       = useState(EMPTY_TENANT);
  const [formUser, setFU]         = useState(EMPTY_USER);
  const [formSenha, setFS]        = useState(EMPTY_SENHA);
  const [senhaUserId, setSUID]    = useState(null);
  const [showUserSenha, setShowUserSenha] = useState(false);
  const [showNovaSenha, setShowNovaSenha] = useState(false);
  const [showConfSenha, setShowConfSenha] = useState(false);
  const [formEditUser, setFEU]  = useState(EMPTY_EDIT_USER);
  const [editUserId, setEUID]   = useState(null);
  const [loading, setLoading]     = useState(false);
  const [waStatuses, setWaStatuses]   = useState({}); // { [tenantId]: 'open'|'close'|'error'|... }
  const [evoLoading, setEvoLoading]   = useState(null); // id do tenant em criação Evolution
  const [tenantPlano, setTenantPlano] = useState(null); // tenant sendo alterado de plano
  const [novoPlanoSel, setNovoPlanoSel] = useState(''); // plano selecionado no modal
  const [planoLoading, setPlanoLoading] = useState(false);
  const [waTenant, setWaTenant]       = useState(null); // tenant aberto no modal WA
  const [waAdminStatus, setWaAdminStatus] = useState(null);
  const [waAdminQrcode, setWaAdminQrcode] = useState(null);
  const [waAdminLoading, setWaAdminLoading] = useState(false);
  const waAdminPollRef = useState(null);

  const loadWaStatuses = useCallback(async () => {
    try {
      const d = await api.get('/admin/tenants/wa-status');
      setWaStatuses(d.statuses || {});
    } catch { /* silencioso */ }
  }, []);

  const load = useCallback(async () => {
    try {
      const d = await api.get('/admin/tenants');
      setTenants(d.tenants);
      loadWaStatuses();
    } catch (err) { toast.error(err.message); }
  }, [loadWaStatuses]);

  useEffect(() => { load(); }, [load]);

  const filtrados = tenants.filter(t =>
    t.nome.toLowerCase().includes(busca.toLowerCase()) ||
    t.slug.toLowerCase().includes(busca.toLowerCase())
  );

  // ── Tenant ──────────────────────────────────────────────────────────────
  function abrirNovo()    { setFT(EMPTY_TENANT); setModal('novo'); }
  function abrirEditar(t) { setFT({ nome: t.nome, slug: t.slug, logo: t.logo || '', corPrimaria: t.corPrimaria, plano: t.plano, planoStatus: t.planoStatus || 'trial', planoVencimento: t.planoVencimento ? t.planoVencimento.slice(0,10) : '', modulos: t.modulos || [], ativo: t.ativo, email: t.email || '', telefone: t.telefone || '' }); setSelected(t); setModal('editar'); }

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

  async function toggleN8n(t) {
    try {
      const res = await api.put(`/admin/tenants/${t.id}`, { n8nAtivo: !t.n8nAtivo });
      if (res?.tenant?._n8nError) {
        toast.error(`n8n ativado mas falha ao provisionar: ${res.tenant._n8nError}`);
      } else {
        toast.success(t.n8nAtivo ? 'Bot n8n desativado' : 'Bot n8n ativado e workflows criados!');
      }
      load();
    } catch (err) { toast.error(err.message); }
  }

  async function reprovisionarN8n(t) {
    try {
      await api.post(`/admin/tenants/${t.id}/provision-n8n`);
      toast.success('Workflows n8n recriados com sucesso!');
      load();
    } catch (err) { toast.error(`Falha ao re-provisionar: ${err.message}`); }
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

  // ── Evolution API ────────────────────────────────────────────────────────
  async function criarEvolution(t) {
    if (!confirm(`Criar instância WhatsApp para "${t.nome}" na Evolution API?`)) return;
    setEvoLoading(t.id);
    try {
      await api.post(`/admin/tenants/${t.id}/create-evolution`);
      toast.success(`Instância WhatsApp criada para ${t.nome}!`);
      load();
    } catch (err) { toast.error(err.message); }
    finally { setEvoLoading(null); }
  }

  async function reconfigurarWebhook(t) {
    try {
      const res = await api.post(`/admin/tenants/${t.id}/reconfigure-webhook`);
      toast.success(`Webhook configurado: ${res.data.webhook}`);
    } catch (err) { toast.error(err.message); }
  }

  // ── WhatsApp Admin Modal ─────────────────────────────────────────────────
  function fecharWaModal() {
    if (waAdminPollRef[0]) { clearInterval(waAdminPollRef[0]); waAdminPollRef[0] = null; }
    setWaTenant(null); setWaAdminStatus(null); setWaAdminQrcode(null);
  }

  async function abrirWaModal(t) {
    setWaTenant(t); setWaAdminStatus(null); setWaAdminQrcode(null);
    try {
      const d = await api.get(`/admin/tenants/${t.id}/whatsapp/status`);
      setWaAdminStatus(d.status);
      setWaStatuses(prev => ({ ...prev, [t.id]: d.status }));
    } catch { setWaAdminStatus('error'); }
  }

  async function verificarStatusWaAdmin(tenantId) {
    try {
      const d = await api.get(`/admin/tenants/${tenantId}/whatsapp/status`);
      setWaAdminStatus(d.status);
      setWaStatuses(prev => ({ ...prev, [tenantId]: d.status }));
      if (d.status === 'open') {
        setWaAdminQrcode(null);
        if (waAdminPollRef[0]) { clearInterval(waAdminPollRef[0]); waAdminPollRef[0] = null; }
      }
    } catch { /* silencioso */ }
  }

  async function conectarWaAdmin() {
    if (!waTenant) return;
    setWaAdminLoading(true);
    try {
      const statusD = await api.get(`/admin/tenants/${waTenant.id}/whatsapp/status`);
      if (statusD.status === 'open') { toast.success('WhatsApp já conectado!'); setWaAdminStatus('open'); return; }
      const d = await api.get(`/admin/tenants/${waTenant.id}/whatsapp/qrcode`);
      if (d.qrcode) {
        setWaAdminQrcode(d.qrcode);
        if (waAdminPollRef[0]) clearInterval(waAdminPollRef[0]);
        waAdminPollRef[0] = setInterval(() => verificarStatusWaAdmin(waTenant.id), 5000);
      } else {
        toast.error('QR Code não disponível.');
      }
    } catch (err) { toast.error(err.message); }
    finally { setWaAdminLoading(false); }
  }

  async function desconectarWaAdmin() {
    if (!waTenant || !confirm('Desconectar WhatsApp deste tenant?')) return;
    setWaAdminLoading(true);
    try {
      await api.post(`/admin/tenants/${waTenant.id}/whatsapp/disconnect`);
      setWaAdminStatus('close'); setWaAdminQrcode(null);
      if (waAdminPollRef[0]) { clearInterval(waAdminPollRef[0]); waAdminPollRef[0] = null; }
      toast.success('WhatsApp desconectado.');
    } catch (err) { toast.error(err.message); }
    finally { setWaAdminLoading(false); }
  }

  // ── Senha ────────────────────────────────────────────────────────────────
  function abrirSenha(userId, tenantId) { setSUID({ userId, tenantId }); setFS(EMPTY_SENHA); setModal('senha'); }

  async function enviarLinkReset(userId) {
    try {
      await api.post(`/admin/usuarios/${userId}/reset-senha`, { via: 'ambos' });
      toast.success('Link de redefinição enviado por email e WhatsApp!');
    } catch (err) {
      toast.error(err.message || 'Erro ao enviar link');
    }
  }

  function abrirEditarUsuario(u) {
    setFEU({ nome: u.nome, email: u.email, whatsapp: u.whatsapp || '', role: u.role, ativo: u.ativo });
    setEUID(u.id);
    setModal('editar-usuario');
  }

  async function salvarEditarUsuario(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.put(`/admin/usuarios/${editUserId}`, formEditUser) || {};
      // atualiza lista local
      setTenants(ts => ts.map(t => ({
        ...t,
        users: (t.users || []).map(u => u.id === editUserId ? { ...u, ...formEditUser } : u),
      })));
      if (detalhe?.users) {
        setDetalhe(d => ({ ...d, users: d.users.map(u => u.id === editUserId ? { ...u, ...formEditUser } : u) }));
      }
      toast.success('Usuário atualizado!');
      setModal(null);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }

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

  // ── Mudar Plano ──────────────────────────────────────────────────────────
  function abrirMudarPlano(t) {
    setTenantPlano(t);
    setNovoPlanoSel(t.plano);
    setModal('mudar-plano');
  }

  async function confirmarMudarPlano() {
    if (!tenantPlano || novoPlanoSel === tenantPlano.plano) return;
    setPlanoLoading(true);
    try {
      const result = await api.post('/payments/mudar-plano', {
        tenantId: tenantPlano.id,
        plano: novoPlanoSel,
      });
      if (result.tipo === 'upgrade' && result.checkout_url) {
        window.open(result.checkout_url, '_blank');
        toast.success('Checkout de upgrade aberto em nova aba');
      } else {
        const dataFmt = result.data
          ? new Date(result.data).toLocaleDateString('pt-BR')
          : 'fim do ciclo';
        toast.success(`Downgrade para ${novoPlanoSel} agendado para ${dataFmt}`);
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPlanoLoading(false);
    }
  }

  async function cancelarDowngrade(t) {
    try {
      await api.delete(`/payments/downgrade-cancelar/${t.id}`);
      toast.success('Downgrade cancelado');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  }

  // ── WA status badge ───────────────────────────────────────────────────────
  function WaBadge({ tenantId, hasInstance, onClick, disabled }) {
    if (!hasInstance) {
      return (
        <button onClick={onClick} disabled={disabled}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-700 hover:bg-green-900/60 text-slate-400 hover:text-green-400 rounded-full text-xs font-semibold transition disabled:opacity-40">
          {disabled
            ? <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
            : <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          }
          {disabled ? 'Criando...' : 'Criar WA'}
        </button>
      );
    }

    const st = waStatuses[tenantId];
    const isOpen = st === 'open';
    const isLoading = st === undefined; // ainda não chegou

    return (
      <button onClick={onClick}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition w-fit
          ${isOpen ? 'bg-green-900/60 hover:bg-green-900 text-green-400' : isLoading ? 'bg-slate-700 text-slate-400' : 'bg-yellow-900/60 hover:bg-yellow-900 text-yellow-400'}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-green-400 animate-pulse' : isLoading ? 'bg-slate-500 animate-pulse' : 'bg-yellow-400'}`} />
        {isLoading ? 'WA...' : isOpen ? 'Conectado' : st === 'error' ? 'Erro' : 'Desconectado'}
      </button>
    );
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
                <button onClick={() => abrirMudarPlano(t)}
                  className={`px-2.5 py-1 rounded-full text-xs font-semibold ${PLANO_COLOR[t.plano]}`}>
                  {PLANOS_INFO.find(p => p.value === t.plano)?.label || t.plano}
                </button>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLOR[t.planoStatus] || STATUS_COLOR.trial}`}>{STATUS_LABEL[t.planoStatus] || 'Trial'}</span>
                {t.planoDowngradePendente && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold bg-yellow-900/60 text-yellow-300">
                    ↓ {PLANOS_INFO.find(p => p.value === t.planoDowngradePendente)?.label}
                    {t.planoDowngradeData && ` em ${new Date(t.planoDowngradeData).toLocaleDateString('pt-BR')}`}
                  </span>
                )}
                <span className="text-slate-400 text-xs">{t._count?.leads || 0} leads</span>
                <span className="text-slate-400 text-xs">· {t._count?.users || 0} usuários</span>
              </div>
              <div className="flex items-center gap-1 border-t border-slate-800 pt-3">
                <button onClick={() => abrirDetalhe(t)} className="flex-1 text-slate-400 hover:text-white text-xs py-1.5 rounded-lg hover:bg-slate-800 transition text-center">Ver</button>
                <button onClick={() => abrirEditar(t)} className="flex-1 text-blue-400 hover:text-blue-300 text-xs py-1.5 rounded-lg hover:bg-slate-800 transition text-center">Editar</button>
                <button onClick={() => abrirUsuario(t)} className="flex-1 text-green-400 hover:text-green-300 text-xs py-1.5 rounded-lg hover:bg-slate-800 transition text-center">+ Usuário</button>
                <button onClick={() => t.evolutionInstance ? abrirWaModal(t) : criarEvolution(t)} disabled={evoLoading === t.id}
                  className={`flex-1 text-xs py-1.5 rounded-lg hover:bg-slate-800 transition text-center disabled:opacity-40
                    ${!t.evolutionInstance ? 'text-slate-400' : waStatuses[t.id] === 'open' ? 'text-green-400' : waStatuses[t.id] === undefined ? 'text-slate-400' : 'text-yellow-400'}`}>
                  {evoLoading === t.id ? '...' : !t.evolutionInstance ? 'WA' : waStatuses[t.id] === 'open' ? 'WA ●' : waStatuses[t.id] === undefined ? 'WA?' : 'WA ○'}
                </button>
                <button onClick={() => toggleN8n(t)}
                  className={`flex-1 text-xs py-1.5 rounded-lg hover:bg-slate-800 transition text-center ${t.n8nAtivo ? 'text-purple-400' : 'text-slate-500'}`}>
                  {t.n8nAtivo ? 'n8n ✓' : 'n8n'}
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
              <th className="px-6 py-4 no-print">WhatsApp</th>
              <th className="px-6 py-4 no-print">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0
              ? <tr><td colSpan={8} className="px-6 py-12 text-center text-slate-500">Nenhum cliente encontrado</td></tr>
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
                      <button onClick={() => abrirMudarPlano(t)}
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold w-fit hover:opacity-80 transition-opacity ${PLANO_COLOR[t.plano]}`}>
                        {PLANOS_INFO.find(p => p.value === t.plano)?.label || t.plano}
                      </button>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold w-fit ${STATUS_COLOR[t.planoStatus] || STATUS_COLOR.trial}`}>{STATUS_LABEL[t.planoStatus] || 'Trial'}</span>
                      {t.planoDowngradePendente && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-900/60 text-yellow-300 w-fit">
                          ↓ {PLANOS_INFO.find(p => p.value === t.planoDowngradePendente)?.label}
                          {t.planoDowngradeData && ` ${new Date(t.planoDowngradeData).toLocaleDateString('pt-BR')}`}
                        </span>
                      )}
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
                    <WaBadge
                      tenantId={t.id}
                      hasInstance={!!t.evolutionInstance}
                      onClick={() => t.evolutionInstance ? abrirWaModal(t) : criarEvolution(t)}
                      disabled={evoLoading === t.id}
                    />
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
                      <button onClick={() => toggleN8n(t)} title={t.n8nAtivo ? 'Desativar Bot n8n' : 'Ativar Bot n8n'}
                        className={`p-2 rounded-lg transition-colors hover:bg-slate-700 ${t.n8nAtivo ? 'text-purple-400 hover:text-purple-300' : 'text-slate-500 hover:text-slate-300'}`}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                      </button>
                      {t.n8nAtivo && (!t.n8nWorkflowWaId || !t.n8nWorkflowNotifId) && (
                        <button onClick={() => reprovisionarN8n(t)} title="Re-provisionar workflows n8n"
                          className="p-2 rounded-lg transition-colors hover:bg-slate-700 text-yellow-400 hover:text-yellow-300">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                        </button>
                      )}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Logo <span className="font-normal text-gray-400">(opcional)</span></label>
            <div className="flex items-center gap-2">
              <input type="url" value={formTenant.logo}
                onChange={e => setFT(f => ({ ...f, logo: e.target.value }))}
                placeholder="Cole uma URL ou envie um arquivo →"
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50" />
              <label className="cursor-pointer px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-gray-600 hover:bg-gray-100 transition whitespace-nowrap">
                📁 Enviar
                <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" className="hidden"
                  onChange={async e => {
                    const file = e.target.files[0]; if (!file) return;
                    const fd = new FormData(); fd.append('logo', file);
                    try {
                      const d = await api.upload('/settings/upload-logo', fd);
                      setFT(f => ({ ...f, logo: d.url }));
                      toast.success('Logo enviada!');
                    } catch (err) { toast.error(err.message); }
                    e.target.value = '';
                  }} />
              </label>
            </div>
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
                <option value="business">Business (ilimitado · Bot WA · Financeiro)</option>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email de contato</label>
              <input type="email" value={formTenant.email} onChange={e => setFT(f => ({ ...f, email: e.target.value }))}
                placeholder="contato@empresa.com"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input value={formTenant.telefone} onChange={e => setFT(f => ({ ...f, telefone: e.target.value }))}
                placeholder="(11) 99999-9999"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50" />
            </div>
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
            <div className="relative">
              <input type={showUserSenha ? 'text' : 'password'} required minLength={6} value={formUser.senha}
                onChange={e => setFU(f => ({ ...f, senha: e.target.value }))}
                placeholder="mínimo 6 caracteres"
                className="w-full px-4 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50" />
              <button type="button" onClick={() => setShowUserSenha(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                <IconEye off={showUserSenha} />
              </button>
            </div>
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
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => abrirEditarUsuario(u)}
                    className="text-xs bg-gray-100 text-gray-700 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition font-medium">
                    Editar
                  </button>
                  <button onClick={() => enviarLinkReset(u.id)}
                    className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1.5 rounded-lg transition font-medium">
                    Enviar link
                  </button>
                  <button onClick={() => abrirSenha(u.id, detalhe.id)}
                    className="text-xs bg-yellow-100 text-yellow-700 hover:bg-yellow-200 px-3 py-1.5 rounded-lg transition font-medium">
                    Trocar senha
                  </button>
                </div>
              </div>
            ))}
            {(!detalhe.users || detalhe.users.length === 0) && (
              <p className="text-center text-gray-400 text-sm py-4">Nenhum usuário</p>
            )}
          </div>
        )}
      </Modal>

      {/* ── Modal: Mudar Plano ── */}
      <Modal isOpen={modal === 'mudar-plano'} onClose={() => setModal(null)}
        title={`Mudar plano — ${tenantPlano?.nome}`}>
        {tenantPlano && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">Plano atual: <strong>{PLANOS_INFO.find(p => p.value === tenantPlano.plano)?.label}</strong></p>
            <div className="grid grid-cols-1 gap-2">
              {PLANOS_INFO.map(p => {
                const nivel = ORDEM_PLANO[p.value];
                const nivelAtual = ORDEM_PLANO[tenantPlano.plano];
                const isAtual = p.value === tenantPlano.plano;
                const isUpgrade = nivel > nivelAtual;
                const isDowngrade = nivel < nivelAtual;
                return (
                  <button key={p.value} type="button"
                    onClick={() => setNovoPlanoSel(p.value)}
                    disabled={isAtual}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border-2 text-sm transition
                      ${novoPlanoSel === p.value && !isAtual ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-gray-50'}
                      ${isAtual ? 'opacity-40 cursor-not-allowed' : 'hover:border-blue-300 cursor-pointer'}`}>
                    <span className="font-medium text-gray-800">{p.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-500">{p.preco}</span>
                      {isUpgrade && <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full font-semibold">Upgrade</span>}
                      {isDowngrade && <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-semibold">Downgrade</span>}
                      {isAtual && <span className="text-xs px-2 py-0.5 bg-slate-200 text-slate-600 rounded-full font-semibold">Atual</span>}
                    </div>
                  </button>
                );
              })}
            </div>
            {novoPlanoSel !== tenantPlano.plano && ORDEM_PLANO[novoPlanoSel] > ORDEM_PLANO[tenantPlano.plano] && (
              <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                O checkout do Mercado Pago será aberto em nova aba para o cliente autorizar o pagamento.
              </p>
            )}
            {novoPlanoSel !== tenantPlano.plano && ORDEM_PLANO[novoPlanoSel] < ORDEM_PLANO[tenantPlano.plano] && (
              <p className="text-xs text-yellow-700 bg-yellow-50 rounded-lg px-3 py-2">
                O cliente mantém o plano atual até o fim do ciclo. O downgrade será aplicado automaticamente na próxima renovação.
                {tenantPlano.planoDowngradePendente && (
                  <span className="block mt-1 font-semibold">Já existe um downgrade pendente para {PLANOS_INFO.find(p => p.value === tenantPlano.planoDowngradePendente)?.label}. Ele será substituído.</span>
                )}
              </p>
            )}
            <div className="flex justify-between items-center pt-2">
              {tenantPlano.planoDowngradePendente && (
                <button type="button" onClick={() => { cancelarDowngrade(tenantPlano); setModal(null); }}
                  className="text-xs text-red-500 hover:text-red-700 underline">
                  Cancelar downgrade pendente
                </button>
              )}
              <div className="flex gap-2 ml-auto">
                <button type="button" onClick={() => setModal(null)}
                  className="px-4 py-2 rounded-xl text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
                  Cancelar
                </button>
                <button type="button"
                  onClick={confirmarMudarPlano}
                  disabled={planoLoading || novoPlanoSel === tenantPlano.plano}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-xl text-sm transition disabled:opacity-60">
                  {planoLoading ? 'Processando...' : ORDEM_PLANO[novoPlanoSel] > ORDEM_PLANO[tenantPlano.plano] ? 'Ir para Checkout' : 'Agendar Downgrade'}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal: WhatsApp ── */}
      <Modal isOpen={!!waTenant} onClose={fecharWaModal} title={`WhatsApp — ${waTenant?.nome || ''}`}>
        <div className="space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-300">Instância: <span className="font-mono text-slate-400">{waTenant?.evolutionInstance}</span></span>
            {waAdminStatus === 'open' ? (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-900/60 text-green-400 rounded-full text-xs font-semibold">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />Conectado
              </span>
            ) : waAdminStatus === 'not_configured' ? (
              <span className="px-3 py-1.5 bg-slate-700 text-slate-400 rounded-full text-xs font-semibold">Não configurado</span>
            ) : waAdminStatus === null ? (
              <span className="px-3 py-1.5 bg-slate-700 text-slate-400 rounded-full text-xs font-semibold animate-pulse">Verificando...</span>
            ) : (
              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-900/60 text-yellow-400 rounded-full text-xs font-semibold">
                <span className="w-2 h-2 bg-yellow-400 rounded-full" />Desconectado
              </span>
            )}
          </div>

          {/* QR Code */}
          {waAdminQrcode ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <img src={waAdminQrcode} alt="QR Code WhatsApp" className="w-52 h-52 rounded-xl border-4 border-green-500" />
              <p className="text-sm text-slate-400 text-center">Abra o WhatsApp → Aparelhos conectados → Conectar aparelho</p>
              <p className="text-xs text-slate-500 animate-pulse">Aguardando conexão...</p>
            </div>
          ) : (
            <div className="flex items-center gap-3 flex-wrap pt-2">
              <button onClick={conectarWaAdmin} disabled={waAdminLoading || waAdminStatus === 'not_configured'}
                className="flex items-center gap-2 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                {waAdminLoading ? 'Carregando...' : waAdminStatus === 'open' ? 'Reconectar' : 'Conectar WhatsApp'}
              </button>
              {waAdminStatus === 'open' && (
                <button onClick={desconectarWaAdmin} disabled={waAdminLoading}
                  className="flex items-center gap-2 border border-red-700 text-red-400 hover:bg-red-900/20 disabled:opacity-50 font-semibold px-5 py-2.5 rounded-xl text-sm transition">
                  Desconectar
                </button>
              )}
              {waTenant?.evolutionInstance && (
                <button onClick={() => reconfigurarWebhook(waTenant)} disabled={waAdminLoading}
                  className="flex items-center gap-2 border border-slate-600 text-slate-400 hover:bg-slate-700 disabled:opacity-50 font-semibold px-5 py-2.5 rounded-xl text-sm transition"
                  title="Registra a URL de webhook na Evolution API para este tenant">
                  Reconfigurar Webhook
                </button>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* ── Modal: Trocar Senha ── */}
      <Modal isOpen={modal === 'senha'} onClose={() => setModal(null)} title="Trocar senha do usuário">
        <form onSubmit={salvarSenha} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nova senha *</label>
            <div className="relative">
              <input type={showNovaSenha ? 'text' : 'password'} required minLength={6} value={formSenha.novaSenha}
                onChange={e => setFS(f => ({ ...f, novaSenha: e.target.value }))}
                placeholder="mínimo 6 caracteres"
                className="w-full px-4 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50" />
              <button type="button" onClick={() => setShowNovaSenha(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                <IconEye off={showNovaSenha} />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar senha *</label>
            <div className="relative">
              <input type={showConfSenha ? 'text' : 'password'} required value={formSenha.confirmar}
                onChange={e => setFS(f => ({ ...f, confirmar: e.target.value }))}
                placeholder="repita a senha"
                className="w-full px-4 pr-10 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50" />
              <button type="button" onClick={() => setShowConfSenha(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors">
                <IconEye off={showConfSenha} />
              </button>
            </div>
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

      {/* ── Modal: Editar Usuário ── */}
      <Modal isOpen={modal === 'editar-usuario'} onClose={() => setModal(null)} title="Editar usuário">
        <form onSubmit={salvarEditarUsuario} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input required value={formEditUser.nome} onChange={e => setFEU(f => ({ ...f, nome: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input type="email" required value={formEditUser.email} onChange={e => setFEU(f => ({ ...f, email: e.target.value }))}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp</label>
            <input value={formEditUser.whatsapp} onChange={e => setFEU(f => ({ ...f, whatsapp: e.target.value }))}
              placeholder="5511999999999"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Papel</label>
              <select value={formEditUser.role} onChange={e => setFEU(f => ({ ...f, role: e.target.value }))}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50">
                <option value="admin">Admin</option>
                <option value="atendente">Atendente</option>
              </select>
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formEditUser.ativo} onChange={e => setFEU(f => ({ ...f, ativo: e.target.checked }))} className="rounded" />
                <span className="text-sm text-gray-700">Ativo</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button type="submit" disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition disabled:opacity-60">
              {loading ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
