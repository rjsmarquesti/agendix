import { useEffect, useState, useRef, useMemo } from 'react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { usePushNotifications } from '../hooks/usePushNotifications';

const MODULOS_DISPONIVEIS = [
  { id: 'leads',        label: 'Leads',        desc: 'Gestão de contatos e oportunidades' },
  { id: 'agendamentos', label: 'Agendamentos',  desc: 'Agenda de atendimentos' },
];

const CORES = ['#2563eb','#7c3aed','#db2777','#dc2626','#ea580c','#16a34a','#0891b2','#1e293b'];

const DIAS_SEMANA = [
  { value: '0', label: 'Dom' },
  { value: '1', label: 'Seg' },
  { value: '2', label: 'Ter' },
  { value: '3', label: 'Qua' },
  { value: '4', label: 'Qui' },
  { value: '5', label: 'Sex' },
  { value: '6', label: 'Sáb' },
];

const DURACAO_OPTIONS = [
  { value: 15,  label: '15 minutos' },
  { value: 30,  label: '30 minutos' },
  { value: 45,  label: '45 minutos' },
  { value: 60,  label: '1 hora' },
  { value: 90,  label: '1h 30min' },
  { value: 120, label: '2 horas' },
];

const TABS_BASE = [
  { id: 'empresa',       label: 'Empresa' },
  { id: 'agenda',        label: 'Agenda' },
  { id: 'email',         label: 'Email' },
  { id: 'whatsapp',      label: 'WhatsApp' },
  { id: 'integracao',    label: 'Integração' },
  { id: 'n8n',           label: null }, // label dinâmica — calculada no componente
  { id: 'notificacoes',  label: 'Notificações' },
  { id: 'seguranca',     label: 'Segurança' },
  { id: 'plano',         label: 'Plano' },
  { id: 'dados',         label: 'Dados' },
];

const WA_PROVIDERS = [
  { value: 'evolution', label: 'Evolution API',        icon: '⚡', desc: 'Self-hosted, número WhatsApp Web. Recomendado para quem já usa Evolution.' },
  { value: 'meta',      label: 'Meta (Cloud API)',     icon: '🏢', desc: 'API oficial Meta/Facebook. Número verificado pelo WhatsApp Business.' },
  { value: 'twilio',    label: 'Twilio',               icon: '📡', desc: 'Plataforma enterprise de comunicações. Suporte global e SLA.' },
  { value: 'zapi',      label: 'Z-API',                icon: '🔗', desc: 'SaaS brasileiro. Fácil configuração, similar ao Evolution.' },
];

const PLANOS_MP = [
  {
    id: 'solo', label: 'Solo', preco: 'R$ 39/mês',
    descricao: '1 usuário · Agendamentos ilimitados · Confirmação WA',
    features: ['1 usuário', 'Agendamentos ilimitados', 'Confirmação WA automática', 'Agendamento público online'],
  },
  {
    id: 'pro', label: 'Pro', preco: 'R$ 59/mês',
    descricao: '5 usuários · Ilimitado · Bot WA completo · Financeiro + Agente IA',
    features: ['5 usuários', 'Agendamentos ilimitados', 'Bot WA completo', 'Financeiro completo', 'Atendimento WA (fila)', 'Agente IA'],
  },
  {
    id: 'business', label: 'Business', preco: 'R$ 99/mês',
    descricao: 'Usuários ilimitados · Bot WA + Agente IA · Financeiro completo',
    features: ['Usuários ilimitados', 'Agendamentos ilimitados', 'Bot WA + Agente IA', 'Financeiro completo', 'Atendimento WA (fila humana)'],
  },
];

function AbaSeguranca() {
  const { user } = useAuth();
  const [status, setStatus] = useState(null); // { totpAtivo }
  const [qrcode, setQrcode] = useState(null);
  const [secret, setSecret] = useState(null);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState('idle'); // idle | setup | confirm | disable

  useEffect(() => {
    api.get('/auth/me').then(d => setStatus({ totpAtivo: d?.user?.totpAtivo ?? false })).catch(() => {});
  }, []);

  async function iniciarSetup() {
    setLoading(true);
    try {
      const d = await api.get('/auth/2fa/setup');
      setQrcode(d.qrcode);
      setSecret(d.secret);
      setStep('setup');
    } catch (e) { toast.error(e.message); }
    setLoading(false);
  }

  async function confirmarCodigo() {
    if (!code || code.length < 6) return toast.error('Digite o código de 6 dígitos');
    setLoading(true);
    try {
      await api.post('/auth/2fa/verify', { code });
      toast.success('2FA ativado com sucesso!');
      setStatus({ totpAtivo: true });
      setStep('idle');
      setQrcode(null); setSecret(null); setCode('');
    } catch (e) { toast.error(e.message); }
    setLoading(false);
  }

  async function desativar2FA() {
    if (!code || code.length < 6) return toast.error('Digite o código de 6 dígitos');
    setLoading(true);
    try {
      await api.post('/auth/2fa/disable', { code });
      toast.success('2FA desativado');
      setStatus({ totpAtivo: false });
      setStep('idle'); setCode('');
    } catch (e) { toast.error(e.message); }
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Autenticação em dois fatores (2FA)</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Proteja sua conta com um código TOTP gerado por aplicativo (Google Authenticator, Authy, etc).
          </p>
        </div>

        {status === null && <p className="text-sm text-gray-400">Carregando...</p>}

        {status !== null && step === 'idle' && (
          <div className="flex items-center justify-between p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40">
            <div className="flex items-center gap-3">
              <span aria-hidden="true" className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${status.totpAtivo ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                {status.totpAtivo ? '2FA ativo' : '2FA inativo'}{' '}
                <span className={`text-xs font-semibold ${status.totpAtivo ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                  ({status.totpAtivo ? 'Ativo' : 'Inativo'})
                </span>
              </span>
            </div>
            {status.totpAtivo
              ? <button onClick={() => setStep('disable')} className="text-sm text-red-600 hover:underline">Desativar</button>
              : <button onClick={iniciarSetup} disabled={loading} className="text-sm text-blue-600 hover:underline">Configurar agora</button>
            }
          </div>
        )}

        {step === 'setup' && qrcode && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Escaneie o QR Code com seu aplicativo autenticador:
            </p>
            <img src={qrcode} alt="QR Code 2FA" className="w-48 h-48 rounded-xl border border-gray-200 dark:border-gray-600" />
            <p className="text-xs text-gray-400">Chave manual: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{secret}</code></p>
            <div className="flex gap-2">
              <input value={code} onChange={e => setCode(e.target.value)} maxLength={6}
                placeholder="Código de 6 dígitos" className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
              <button onClick={confirmarCodigo} disabled={loading}
                className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 disabled:opacity-50">
                {loading ? '...' : 'Ativar'}
              </button>
              <button onClick={() => { setStep('idle'); setQrcode(null); setCode(''); }}
                className="px-4 py-2 text-sm text-gray-500 hover:underline">Cancelar</button>
            </div>
          </div>
        )}

        {step === 'disable' && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 dark:text-gray-400">Digite o código do seu autenticador para desativar:</p>
            <div className="flex gap-2">
              <input value={code} onChange={e => setCode(e.target.value)} maxLength={6}
                placeholder="Código de 6 dígitos" className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
              <button onClick={desativar2FA} disabled={loading}
                className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 disabled:opacity-50">
                {loading ? '...' : 'Desativar'}
              </button>
              <button onClick={() => { setStep('idle'); setCode(''); }}
                className="px-4 py-2 text-sm text-gray-500 hover:underline">Cancelar</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AbaNotificacoes() {
  const { supported, permission, subscribed, loading, subscribe, unsubscribe, erro: pushErro } = usePushNotifications();

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Notificações push</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Receba alertas em tempo real quando um novo agendamento chegar pelo link público, mesmo com o navegador fechado.
          </p>
        </div>

        {!supported && (
          <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <p className="text-sm text-gray-500 dark:text-gray-400">Seu navegador não suporta notificações push.</p>
          </div>
        )}

        {supported && permission === 'denied' && (
          <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded-xl">
            <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-700 dark:text-red-400">Permissão bloqueada</p>
              <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">Você bloqueou as notificações neste navegador. Para ativar, clique no ícone de cadeado na barra de endereço e permita notificações.</p>
            </div>
          </div>
        )}

        {supported && permission !== 'denied' && (
          <div className="flex items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
            <div className="flex items-center gap-3">
              <div className={`w-2.5 h-2.5 rounded-full ${subscribed ? 'bg-green-500 animate-pulse' : 'bg-gray-300 dark:bg-gray-600'}`} />
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {subscribed ? 'Notificações ativas' : 'Notificações desativadas'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {subscribed ? 'Você receberá alertas de novos agendamentos neste dispositivo.' : 'Clique em ativar para receber alertas neste dispositivo.'}
                </p>
              </div>
            </div>
            {subscribed ? (
              <button
                onClick={unsubscribe}
                disabled={loading}
                className="shrink-0 px-4 py-2 text-sm font-semibold rounded-xl border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 transition">
                {loading ? 'Aguarde...' : 'Desativar'}
              </button>
            ) : (
              <button
                onClick={subscribe}
                disabled={loading}
                className="shrink-0 px-4 py-2 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 transition">
                {loading ? 'Ativando...' : 'Ativar'}
              </button>
            )}
          </div>
        )}

        {pushErro && (
          <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <p className="text-sm text-red-700 dark:text-red-400">{pushErro}</p>
          </div>
        )}

        <div className="border-t border-gray-100 dark:border-gray-700 pt-4">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            As notificações são por dispositivo e por usuário. Se você acessar em outro computador ou celular, precisará ativar novamente.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const { tenant, updateTenant } = useAuth();
  const [tab, setTab]           = useState('empresa');

  const TABS = useMemo(() => TABS_BASE.map(t =>
    t.id === 'n8n' ? { ...t, label: tenant?.n8nAtivo ? 'Bot / n8n' : 'Bot' } : t
  ), [tenant?.n8nAtivo]);
  const [form, setForm]         = useState({ nome: '', logo: '', corPrimaria: '#2563eb', modulos: [], n8nWebhookUrl: '', n8nApiKey: '', nichoLabel: '', evolutionInstance: '', evolutionApiKey: '', evolutionBaseUrl: '', n8nWorkflowWaId: null, n8nWorkflowNotifId: null, lembretesDiretosAtivo: false, smtpHost: '', smtpPort: '', smtpUser: '', smtpPass: '', smtpFrom: '', telefone: '', waProvider: 'evolution', waConfig: {} });
  const [agendaForm, setAgendaForm] = useState({
    horarioInicio: '08:00', horarioFim: '18:00', duracaoSlot: 60,
    diasUteis: '1,2,3,4,5', antecedenciaMin: 2, antecedenciaMax: 30,
    mensagemConfirmacao: '', mensagemWaConfirmacao: '', mensagemWaLembrete: '', mensagemWaAdmin: '',
    whatsappAdmin: '', ativo: true,
    agendaDiaAtivo: false, agendaDiaEmailAtivo: false, agendaDiaHorario: '07:00',
  });
  const [showSmtpPass, setShowSmtpPass] = useState(false);
  const [apiToken, setApiToken]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [planoStatus, setPlanoStatus] = useState(null);
  const [planoLoading, setPlanoLoading] = useState(false);
  const [cicloPlano,   setCicloPlano]   = useState('mensal');
  const [agendaLoading, setAL]    = useState(false);
  const [genLoading, setGL]       = useState(false);
  const [showToken, setShowToken]   = useState(false);
  const [usoMes, setUsoMes]         = useState(null);
  const [waStatus, setWaStatus]     = useState(null);
  const [waQrcode, setWaQrcode]     = useState(null);
  const [waLoading, setWaLoading]   = useState(false);
  const pollingRef = useRef(null);
  const [bloqueios, setBloqueios] = useState([]);
  const [bloqueioForm, setBloqueioForm] = useState({ data: '', tipoBloco: 'dia', horaInicio: '', horaFim: '', motivo: '' });
  const [bloqueioLoading, setBloqueioLoading] = useState(false);
  const [nichos, setNichos]           = useState([]);
  const [nichoSel, setNichoSel]       = useState('');
  const [subnichoSel, setSubnichoSel] = useState('');
  const [nichoLoading, setNichoLoading] = useState(false);

  // ── Agente IA ──
  const [agentConfig, setAgentConfig]   = useState(null);
  const [agentForm, setAgentForm]       = useState({ persona: 'Assistente', promptBase: '', horarioInicio: '09:00', horarioFim: '18:00', diasUteis: '1,2,3,4,5', msgForaHorario: '' });
  const [agentLeads, setAgentLeads]     = useState([]);
  const [agentStats, setAgentStats]     = useState(null);
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentSaving, setAgentSaving]   = useState(false);

  function mesFiltro() {
    const hoje = new Date();
    return `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
  }

  async function carregarBloqueios() {
    try {
      const d = await api.get(`/bloqueios?mes=${mesFiltro()}`);
      setBloqueios(d.bloqueios || []);
    } catch { /* silencioso */ }
  }

  async function carregarAgente() {
    try {
      const [cfg, leads, stats] = await Promise.all([
        api.get('/agente-ia/config'),
        api.get('/agente-ia/leads'),
        api.get('/agente-ia/stats'),
      ]);
      if (cfg.config) {
        setAgentConfig(cfg.config);
        setAgentForm({
          persona: cfg.config.persona,
          promptBase: cfg.config.promptBase,
          horarioInicio: cfg.config.horarioInicio,
          horarioFim: cfg.config.horarioFim,
          diasUteis: cfg.config.diasUteis,
          msgForaHorario: cfg.config.msgForaHorario || '',
        });
      }
      setAgentLeads(leads.leads || []);
      setAgentStats(stats);
    } catch { /* plano sem acesso — silencioso */ }
  }

  async function salvarAgente(e) {
    e.preventDefault();
    setAgentSaving(true);
    try {
      const d = await api.put('/agente-ia/config', agentForm);
      setAgentConfig(d.config);
      toast.success('Agente IA salvo!');
    } catch (err) { toast.error(err.message); }
    finally { setAgentSaving(false); }
  }

  async function toggleAgente() {
    setAgentLoading(true);
    try {
      const d = await api.post('/agente-ia/toggle', {});
      setAgentConfig(c => ({ ...c, ativo: d.ativo }));
      toast.success(d.ativo ? 'Agente IA ativado!' : 'Agente IA desativado.');
    } catch (err) { toast.error(err.message); }
    finally { setAgentLoading(false); }
  }

  async function adicionarBloqueio(e) {
    e.preventDefault();
    if (!bloqueioForm.data) { toast.error('Informe a data.'); return; }
    if (bloqueioForm.tipoBloco === 'hora' && (!bloqueioForm.horaInicio || !bloqueioForm.horaFim)) {
      toast.error('Informe início e fim do bloqueio.'); return;
    }
    setBloqueioLoading(true);
    try {
      const body = {
        data: bloqueioForm.data,
        motivo: bloqueioForm.motivo || null,
        ...(bloqueioForm.tipoBloco === 'hora' ? { horaInicio: bloqueioForm.horaInicio, horaFim: bloqueioForm.horaFim } : {}),
      };
      await api.post('/bloqueios', body);
      toast.success('Bloqueio adicionado!');
      setBloqueioForm({ data: '', tipoBloco: 'dia', horaInicio: '', horaFim: '', motivo: '' });
      carregarBloqueios();
    } catch (err) { toast.error(err.message); }
    finally { setBloqueioLoading(false); }
  }

  async function deletarBloqueio(id) {
    try {
      await api.delete(`/bloqueios/${id}`);
      toast.success('Bloqueio removido.');
      carregarBloqueios();
    } catch (err) { toast.error(err.message); }
  }

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('status') === 'approved') {
      toast.success('Pagamento aprovado! Seu plano será atualizado em instantes.');
      window.history.replaceState({}, '', '/configuracoes');
      setTab('plano');
    }

    api.get('/payments/status').then(setPlanoStatus).catch(() => setPlanoStatus({ erro: true }));

    api.get('/settings').then(d => {
      const t = d.tenant;
      setForm({
        nome: t.nome, logo: t.logo || '', corPrimaria: t.corPrimaria,
        modulos: t.modulos || [],
        n8nWebhookUrl: t.n8nWebhookUrl || '',
        n8nApiKey: t.n8nApiKey || '',
        nichoLabel: t.nichoLabel || '',
        evolutionInstance: t.evolutionInstance || '',
        evolutionApiKey: t.evolutionApiKey || '',
        evolutionBaseUrl: t.evolutionBaseUrl || '',
        n8nWorkflowWaId: t.n8nWorkflowWaId || null,
        n8nWorkflowNotifId: t.n8nWorkflowNotifId || null,
        lembretesDiretosAtivo: t.lembretesDiretosAtivo || false,
        smtpHost: t.smtpHost || '',
        smtpPort: t.smtpPort || '',
        smtpUser: t.smtpUser || '',
        smtpPass: t.smtpPass || '',
        smtpFrom: t.smtpFrom || '',
        telefone: t.telefone || '',
        waProvider: t.waProvider || 'evolution',
        waConfig: t.waConfig || {},
      });
      if (t.apiToken) setApiToken(t.apiToken);
      setNichoSel(t.nichoLabel || '');
      setSubnichoSel(t.subnicho || '');
    }).catch(err => toast.error(err.message));

    api.get('/settings/agenda').then(d => {
      const c = d.config;
      setAgendaForm({
        horarioInicio: c.horarioInicio, horarioFim: c.horarioFim,
        duracaoSlot: c.duracaoSlot, diasUteis: c.diasUteis,
        antecedenciaMin: c.antecedenciaMin, antecedenciaMax: c.antecedenciaMax,
        mensagemConfirmacao: c.mensagemConfirmacao || '',
        mensagemWaConfirmacao: c.mensagemWaConfirmacao || '',
        mensagemWaLembrete: c.mensagemWaLembrete || '',
        mensagemWaAdmin: c.mensagemWaAdmin || '',
        whatsappAdmin: c.whatsappAdmin || '',
        ativo: c.ativo,
        agendaDiaAtivo: c.agendaDiaAtivo || false,
        agendaDiaEmailAtivo: c.agendaDiaEmailAtivo || false,
        agendaDiaHorario: c.agendaDiaHorario || '07:00',
      });
    }).catch(e => console.error('[Settings] agenda:', e.message));

    api.get('/settings/nichos').then(d => setNichos(d)).catch(e => console.error('[Settings] nichos:', e.message));

    carregarBloqueios();
    carregarAgente();

    // Uso de agendamentos no mês atual
    const mesAtual = new Date().toISOString().slice(0, 7);
    api.get(`/agendamentos?dataInicio=${mesAtual}-01&dataFim=${mesAtual}-31`).then(d => {
      setUsoMes(d.agendamentos?.length ?? 0);
    }).catch(e => console.error('[Settings] uso-mes:', e.message));
  }, []);

  function toggleModulo(id) {
    setForm(f => ({
      ...f,
      modulos: f.modulos.includes(id) ? f.modulos.filter(m => m !== id) : [...f.modulos, id],
    }));
  }

  function toggleDia(valor) {
    const dias = agendaForm.diasUteis ? agendaForm.diasUteis.split(',').filter(Boolean) : [];
    const novo = dias.includes(valor) ? dias.filter(d => d !== valor) : [...dias, valor].sort();
    setAgendaForm(f => ({ ...f, diasUteis: novo.join(',') }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const d = await api.put('/settings', form);
      updateTenant(d.tenant);
      document.documentElement.style.setProperty('--cor-primaria', d.tenant.corPrimaria);
      toast.success('Configurações salvas!');
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  async function salvarNicho() {
    if (!nichoSel) { toast.error('Selecione um nicho.'); return; }
    setNichoLoading(true);
    try {
      const d = await api.put('/settings', { nicho: nichoSel, subnicho: subnichoSel || null });
      updateTenant(d.tenant);
      toast.success('Nicho salvo! Módulos atualizados.');
    } catch (err) { toast.error(err.message); }
    finally { setNichoLoading(false); }
  }

  async function handleAgendaSubmit(e) {
    e.preventDefault();
    setAL(true);
    try {
      await api.put('/settings/agenda', agendaForm);
      toast.success('Configurações de agenda salvas!');
    } catch (err) { toast.error(err.message); }
    finally { setAL(false); }
  }

  async function gerarToken() {
    if (apiToken && !confirm('Gerar um novo token vai invalidar o token atual. Continuar?')) return;
    setGL(true);
    try {
      const d = await api.post('/settings/api-token', {});
      setApiToken(d.apiToken);
      setShowToken(true);
      toast.success('Token gerado!');
    } catch (err) { toast.error(err.message); }
    finally { setGL(false); }
  }

  async function verificarStatusWa() {
    try {
      const d = await api.get('/settings/whatsapp/status');
      setWaStatus(d.status);
      if (d.status === 'open') {
        setWaQrcode(null);
        if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
      }
    } catch { /* silencioso */ }
  }

  async function desconectarWhatsapp() {
    if (!confirm('Desconectar o WhatsApp desta instância?')) return;
    setWaLoading(true);
    try {
      await api.post('/settings/whatsapp/disconnect');
      setWaStatus('close');
      setWaQrcode(null);
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
      toast.success('WhatsApp desconectado.');
    } catch (err) { toast.error(err.message); }
    finally { setWaLoading(false); }
  }

  async function conectarWhatsapp() {
    setWaLoading(true);
    try {
      await verificarStatusWa();
      const status = (await api.get('/settings/whatsapp/status')).status;
      if (status === 'open') { toast.success('WhatsApp já está conectado!'); return; }
      const d = await api.get('/settings/whatsapp/qrcode');
      if (d.qrcode) {
        setWaQrcode(d.qrcode);
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = setInterval(verificarStatusWa, 5000);
      } else {
        toast.error('QR Code não disponível. Tente novamente.');
      }
    } catch (err) { toast.error(err.message); }
    finally { setWaLoading(false); }
  }

  useEffect(() => {
    verificarStatusWa();
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  function copiar(texto) {
    navigator.clipboard.writeText(texto);
    toast.success('Copiado!');
  }

  const baseUrl = window.location.origin;
  const linkFormulario = tenant?.slug ? `${baseUrl}/agendar.html?slug=${tenant.slug}` : '';
  const embedCode = linkFormulario
    ? `<iframe src="${linkFormulario}" width="100%" height="680" frameborder="0" style="border-radius:16px;"></iframe>`
    : '';

  const diasAtivos = agendaForm.diasUteis ? agendaForm.diasUteis.split(',') : [];

  return (
    <Layout title="Configurações" subtitle="Personalize sua empresa no sistema">
      <div className="max-w-2xl">

        {/* Tabs — scroll horizontal em mobile */}
        <div className="overflow-x-auto mb-6 -mx-1 px-1">
          <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 min-w-max sm:min-w-0">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-3 sm:flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap
                  ${tab === t.id ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── ABA EMPRESA ── */}
        {tab === 'empresa' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Identidade da empresa</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da empresa</label>
                <input value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} required
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone <span className="text-gray-400 font-normal">(WhatsApp para notificações)</span></label>
                <input value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                  placeholder="ex: 61999999999"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Usado para receber avisos automáticos via WhatsApp (ex: lead respondeu na prospecção).</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Logo <span className="text-gray-400 font-normal">(opcional)</span></label>
                <div className="flex items-center gap-2">
                  <input type="url" value={form.logo} onChange={e => setForm(f => ({ ...f, logo: e.target.value }))}
                    placeholder="Cole uma URL ou envie um arquivo →"
                    className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                  <label className="cursor-pointer px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition whitespace-nowrap">
                    📁 Enviar
                    <input type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" className="hidden"
                      onChange={async e => {
                        const file = e.target.files[0]; if (!file) return;
                        try {
                          // Converte para base64 no browser — sem upload, sem 413
                          const dataUrl = await new Promise((resolve, reject) => {
                            if (file.type.includes('svg')) {
                              const reader = new FileReader();
                              reader.onload = () => resolve(reader.result);
                              reader.onerror = reject;
                              reader.readAsDataURL(file);
                              return;
                            }
                            const img = new Image();
                            const url = URL.createObjectURL(file);
                            img.onload = () => {
                              URL.revokeObjectURL(url);
                              const MAX = 400;
                              let w = img.width, h = img.height;
                              if (w > MAX || h > MAX) {
                                if (w > h) { h = Math.round(h * MAX / w); w = MAX; }
                                else       { w = Math.round(w * MAX / h); h = MAX; }
                              }
                              const canvas = document.createElement('canvas');
                              canvas.width = w; canvas.height = h;
                              canvas.getContext('2d').drawImage(img, 0, 0, w, h);
                              resolve(canvas.toDataURL('image/webp', 0.80));
                            };
                            img.onerror = reject;
                            img.src = url;
                          });
                          setForm(f => ({ ...f, logo: dataUrl }));
                          toast.success('Logo carregada! Clique em Salvar para confirmar.');
                        } catch (err) { toast.error('Erro ao processar imagem: ' + err.message); }
                        e.target.value = '';
                      }} />
                  </label>
                </div>
                {form.logo && <img src={form.logo} alt="preview" className="mt-2 h-12 object-contain rounded-lg border" />}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rótulo do nicho <span className="text-gray-400 font-normal">(opcional)</span></label>
                <input value={form.nichoLabel} onChange={e => setForm(f => ({ ...f, nichoLabel: e.target.value }))}
                  maxLength={100} placeholder="ex: consulta, exame de vista, atendimento estético"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Usado nas mensagens WhatsApp: "Você tem um <em>{form.nichoLabel || 'atendimento'}</em> agendado..."</p>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Cor principal</h2>
              <div className="flex items-center gap-3 flex-wrap">
                {CORES.map(cor => (
                  <button key={cor} type="button" onClick={() => setForm(f => ({ ...f, corPrimaria: cor }))}
                    className={`w-9 h-9 rounded-full transition-all ${form.corPrimaria === cor ? 'ring-4 ring-offset-2 ring-gray-400 scale-110' : 'hover:scale-105'}`}
                    style={{ backgroundColor: cor }} />
                ))}
                <input type="color" value={form.corPrimaria} onChange={e => setForm(f => ({ ...f, corPrimaria: e.target.value }))}
                  className="w-9 h-9 rounded-full cursor-pointer border-0" title="Cor personalizada" />
              </div>
              <div className="mt-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl" style={{ backgroundColor: form.corPrimaria }} />
                <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">{form.corPrimaria}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Nicho do negócio</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Define os módulos extras disponíveis no menu.</p>
              </div>
              <div className="flex gap-3 items-end flex-wrap">
                <div className="flex-1 min-w-48">
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Segmento principal</label>
                  <select value={nichoSel} onChange={e => { setNichoSel(e.target.value); setSubnichoSel(''); }}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                    <option value="">Selecione o nicho...</option>
                    {nichos.map(n => (
                      <option key={n.id} value={n.id}>{n.label}</option>
                    ))}
                  </select>
                </div>
                {nichoSel && nichos.find(n => n.id === nichoSel)?.subnichos?.length > 0 && (
                  <div className="flex-1 min-w-48">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tipo de negócio</label>
                    <select value={subnichoSel} onChange={e => setSubnichoSel(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                      <option value="">Selecione o tipo...</option>
                      {nichos.find(n => n.id === nichoSel).subnichos.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                )}
                <button type="button" onClick={salvarNicho} disabled={nichoLoading || !nichoSel}
                  className="px-5 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition whitespace-nowrap">
                  {nichoLoading ? 'Salvando...' : 'Aplicar nicho'}
                </button>
              </div>
              {nichoSel && nichos.find(n => n.id === nichoSel) && (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Módulos ativos após aplicar: </span>
                  leads, agendamentos
                  {nichos.find(n => n.id === nichoSel)?.modulosExtras?.length > 0 && (
                    <>, {nichos.find(n => n.id === nichoSel).modulosExtras.join(', ')}</>
                  )}
                </div>
              )}
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Módulos ativos</h2>
              <div className="space-y-3">
                {form.modulos.map(m => (
                  <div key={m} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                    <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                    <p className="font-medium text-gray-900 dark:text-gray-100 text-sm capitalize">{m}</p>
                  </div>
                ))}
                {form.modulos.length === 0 && (
                  <p className="text-sm text-gray-400 dark:text-gray-500">Nenhum módulo ativo. Selecione um nicho acima.</p>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={loading}
                className="btn-primary text-white font-semibold px-8 py-3 rounded-xl transition text-sm disabled:opacity-60">
                {loading ? 'Salvando...' : 'Salvar configurações'}
              </button>
            </div>
          </form>
        )}

        {/* ── ABA AGENDA ── */}
        {tab === 'agenda' && (
          <div className="space-y-6">
            <form onSubmit={handleAgendaSubmit} className="space-y-6">

              {/* Horários */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Horário de atendimento</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Início</label>
                    <input type="time" value={agendaForm.horarioInicio}
                      onChange={e => setAgendaForm(f => ({ ...f, horarioInicio: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fim</label>
                    <input type="time" value={agendaForm.horarioFim}
                      onChange={e => setAgendaForm(f => ({ ...f, horarioFim: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Duração de cada atendimento</label>
                  <div className="flex flex-wrap gap-2">
                    {DURACAO_OPTIONS.map(opt => (
                      <button key={opt.value} type="button"
                        onClick={() => setAgendaForm(f => ({ ...f, duracaoSlot: opt.value }))}
                        className={`px-4 py-2 rounded-xl text-sm font-medium border transition
                          ${agendaForm.duracaoSlot === opt.value
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Dias de atendimento</label>
                  <div className="grid grid-cols-7 gap-1.5 sm:flex sm:gap-2 sm:flex-wrap">
                    {DIAS_SEMANA.map(d => (
                      <button key={d.value} type="button"
                        onClick={() => toggleDia(d.value)}
                        className={`h-10 sm:w-12 sm:h-12 rounded-xl text-xs sm:text-sm font-semibold border transition
                          ${diasAtivos.includes(d.value)
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 border-gray-200 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}`}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Antecedência */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Regras de agendamento</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Antecedência mínima</label>
                    <div className="flex items-center gap-2">
                      <input type="number" min="0" max="48" value={agendaForm.antecedenciaMin}
                        onChange={e => setAgendaForm(f => ({ ...f, antecedenciaMin: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                      <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">horas</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Janela máxima</label>
                    <div className="flex items-center gap-2">
                      <input type="number" min="1" max="365" value={agendaForm.antecedenciaMax}
                        onChange={e => setAgendaForm(f => ({ ...f, antecedenciaMax: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                      <span className="text-sm text-gray-500 dark:text-gray-400 whitespace-nowrap">dias</span>
                    </div>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">WhatsApp para notificações <span className="text-gray-400 font-normal">(opcional)</span></label>
                  <input type="tel" value={agendaForm.whatsappAdmin} placeholder="5511999999999"
                    onChange={e => setAgendaForm(f => ({ ...f, whatsappAdmin: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Número com DDI para receber alertas de novos agendamentos via n8n.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mensagem de confirmação <span className="text-gray-400 font-normal">(opcional)</span></label>
                  <textarea rows={2} value={agendaForm.mensagemConfirmacao}
                    onChange={e => setAgendaForm(f => ({ ...f, mensagemConfirmacao: e.target.value }))}
                    placeholder="Entraremos em contato para confirmar. Até lá!"
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none" />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Exibida na tela de confirmação do formulário público.</p>
                </div>
              </div>

              {/* Templates de mensagens WhatsApp */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100">Mensagens WhatsApp personalizadas</h2>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Variáveis disponíveis: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{nome}}'}</code> <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{data}}'}</code> <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{hora}}'}</code> <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{servico}}'}</code> <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">{'{{nicho}}'}</code>. Se vazio, usa mensagem padrão.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirmação para o cliente</label>
                  <textarea rows={3} value={agendaForm.mensagemWaConfirmacao}
                    onChange={e => setAgendaForm(f => ({ ...f, mensagemWaConfirmacao: e.target.value }))}
                    placeholder={'✅ Agendamento confirmado!\n📅 {{data}} às {{hora}}\nSeu {{nicho}} está marcado. Até lá!'}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lembrete para o cliente</label>
                  <textarea rows={3} value={agendaForm.mensagemWaLembrete}
                    onChange={e => setAgendaForm(f => ({ ...f, mensagemWaLembrete: e.target.value }))}
                    placeholder={'⏰ Lembrete: você tem um {{nicho}} amanhã!\n📅 {{data}} às {{hora}}\nQualquer dúvida, nos avise.'}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Alerta para o admin</label>
                  <textarea rows={3} value={agendaForm.mensagemWaAdmin}
                    onChange={e => setAgendaForm(f => ({ ...f, mensagemWaAdmin: e.target.value }))}
                    placeholder={'📅 Novo {{nicho}} agendado!\n👤 {{nome}}\n📅 {{data}} às {{hora}}'}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none" />
                </div>
              </div>

              {/* Agenda do Dia */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Agenda do dia</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Todos os usuários ativos receberão a agenda completa do dia no horário configurado.</p>
                <div className="space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div onClick={() => setAgendaForm(f => ({ ...f, agendaDiaAtivo: !f.agendaDiaAtivo }))}
                      className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${agendaForm.agendaDiaAtivo ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${agendaForm.agendaDiaAtivo ? 'translate-x-4' : ''}`} />
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">Enviar agenda por WhatsApp</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <div onClick={() => setAgendaForm(f => ({ ...f, agendaDiaEmailAtivo: !f.agendaDiaEmailAtivo }))}
                      className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${agendaForm.agendaDiaEmailAtivo ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
                      <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${agendaForm.agendaDiaEmailAtivo ? 'translate-x-4' : ''}`} />
                    </div>
                    <span className="text-sm text-gray-700 dark:text-gray-300">Enviar agenda por Email</span>
                  </label>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Enviar às</label>
                    <input type="time" value={agendaForm.agendaDiaHorario}
                      onChange={e => setAgendaForm(f => ({ ...f, agendaDiaHorario: e.target.value }))}
                      className="px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button type="submit" disabled={agendaLoading}
                  className="btn-primary text-white font-semibold px-8 py-3 rounded-xl transition text-sm disabled:opacity-60">
                  {agendaLoading ? 'Salvando...' : 'Salvar configurações de agenda'}
                </button>
              </div>
            </form>

            {/* Link do formulário público */}
            {tenant?.slug && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100">Formulário público de agendamento</h2>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Ativo</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Compartilhe o link abaixo ou embeds no site do seu cliente para que qualquer pessoa possa agendar sem precisar de login.
                </p>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Link direto</label>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <input readOnly value={linkFormulario}
                      className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-xs bg-gray-50 dark:bg-gray-700 font-mono text-gray-600 dark:text-gray-400 truncate min-w-0" />
                    <div className="flex gap-2">
                      <button type="button" onClick={() => copiar(linkFormulario)}
                        className="flex-1 sm:flex-none px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 whitespace-nowrap">
                        Copiar
                      </button>
                      <a href={linkFormulario} target="_blank" rel="noreferrer"
                        className="flex-1 sm:flex-none text-center px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 whitespace-nowrap">
                        Abrir
                      </a>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">Código de embed (iframe)</label>
                  <div className="relative">
                    <textarea readOnly rows={3} value={embedCode}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-xs bg-gray-50 dark:bg-gray-700 font-mono text-gray-600 dark:text-gray-400 resize-none" />
                    <button type="button" onClick={() => copiar(embedCode)}
                      className="absolute top-2 right-2 px-2 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                      Copiar
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Cole este código no site do cliente para incorporar o formulário.</p>
                </div>
              </div>
            )}

            {/* Bloqueios de Horário */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Bloqueios de Horário</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Bloqueie dias ou intervalos específicos para que não apareçam como disponíveis no formulário público.</p>

              <form onSubmit={adicionarBloqueio} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Data</label>
                    <input type="date" value={bloqueioForm.data}
                      onChange={e => setBloqueioForm(f => ({ ...f, data: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tipo</label>
                    <select value={bloqueioForm.tipoBloco}
                      onChange={e => setBloqueioForm(f => ({ ...f, tipoBloco: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                      <option value="dia">Dia inteiro</option>
                      <option value="hora">Horário específico</option>
                    </select>
                  </div>
                </div>
                {bloqueioForm.tipoBloco === 'hora' && (
                  <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Início</label>
                      <input type="time" value={bloqueioForm.horaInicio}
                        onChange={e => setBloqueioForm(f => ({ ...f, horaInicio: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Fim</label>
                      <input type="time" value={bloqueioForm.horaFim}
                        onChange={e => setBloqueioForm(f => ({ ...f, horaFim: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Motivo <span className="text-gray-400">(opcional)</span></label>
                  <input type="text" maxLength={200} value={bloqueioForm.motivo}
                    onChange={e => setBloqueioForm(f => ({ ...f, motivo: e.target.value }))}
                    placeholder="ex: Feriado, Recesso, Almoço especial"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                </div>
                <button type="submit" disabled={bloqueioLoading}
                  className="btn-primary text-white text-sm font-semibold px-5 py-2 rounded-xl disabled:opacity-60">
                  {bloqueioLoading ? 'Salvando...' : '+ Adicionar bloqueio'}
                </button>
              </form>

              {bloqueios.length > 0 && (
                <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-2">
                  {bloqueios.map(b => (
                    <div key={b.id} className="flex items-center justify-between gap-3 py-2 px-3 rounded-xl bg-gray-50 dark:bg-gray-700/50 text-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
                          {new Date(b.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 truncate">
                          {b.horaInicio ? `${b.horaInicio}–${b.horaFim}` : 'Dia inteiro'}
                          {b.motivo ? ` · ${b.motivo}` : ''}
                        </span>
                      </div>
                      <button onClick={() => deletarBloqueio(b.id)}
                        className="text-red-400 hover:text-red-600 flex-shrink-0 text-xs px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {bloqueios.length === 0 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">Nenhum bloqueio cadastrado para este mês.</p>
              )}
            </div>
          </div>
        )}

        {/* ── ABA EMAIL ── */}
        {tab === 'email' && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">SMTP do tenant</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Configure um SMTP próprio para enviar emails de confirmação e lembrete com a identidade da sua empresa. Se não configurado, o sistema usa o email padrão da plataforma.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SMTP Host</label>
                  <input value={form.smtpHost} onChange={e => setForm(f => ({ ...f, smtpHost: e.target.value }))}
                    placeholder="smtp.hostinger.com"
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Porta</label>
                  <input type="number" value={form.smtpPort} onChange={e => setForm(f => ({ ...f, smtpPort: e.target.value }))}
                    placeholder="465"
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Usuário SMTP</label>
                <input type="email" value={form.smtpUser} onChange={e => setForm(f => ({ ...f, smtpUser: e.target.value }))}
                  placeholder="contato@suaempresa.com.br"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha SMTP</label>
                <div className="relative">
                  <input type={showSmtpPass ? 'text' : 'password'} value={form.smtpPass} onChange={e => setForm(f => ({ ...f, smtpPass: e.target.value }))}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 pr-10 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                  <button type="button" onClick={() => setShowSmtpPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">
                    {showSmtpPass ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email de origem (From)</label>
                <input value={form.smtpFrom} onChange={e => setForm(f => ({ ...f, smtpFrom: e.target.value }))}
                  placeholder="Minha Empresa <contato@suaempresa.com.br>"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Pode ser só o email ou no formato "Nome &lt;email&gt;"</p>
              </div>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={loading}
                className="btn-primary text-white font-semibold px-8 py-3 rounded-xl transition text-sm disabled:opacity-60">
                {loading ? 'Salvando...' : 'Salvar configurações de email'}
              </button>
            </div>
          </form>
        )}

        {/* ── ABA WHATSAPP ── */}
        {tab === 'whatsapp' && (
          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Selector de provider */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Provider de WhatsApp</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">Escolha como o sistema enviará e receberá mensagens WhatsApp para este tenant.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {WA_PROVIDERS.map(p => (
                    <button key={p.value} type="button"
                      onClick={() => setForm(f => ({ ...f, waProvider: p.value }))}
                      className={`text-left p-4 rounded-xl border-2 transition ${form.waProvider === p.value
                        ? 'border-[var(--g)] bg-green-50 dark:bg-green-900/10'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{p.icon}</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">{p.label}</span>
                        {form.waProvider === p.value && <span className="ml-auto text-[var(--g)] text-xs font-semibold">✓ Selecionado</span>}
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{p.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Campos Evolution API */}
              {form.waProvider === 'evolution' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100">⚡ Evolution API — Credenciais</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Configure a instância Evolution que enviará mensagens para este tenant.</p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da instância</label>
                    <input type="text" value={form.evolutionInstance}
                      onChange={e => setForm(f => ({ ...f, evolutionInstance: e.target.value }))}
                      placeholder="ex: minha-empresa"
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API Key</label>
                    <input type="password" value={form.evolutionApiKey}
                      onChange={e => setForm(f => ({ ...f, evolutionApiKey: e.target.value }))}
                      placeholder="Chave de acesso da instância"
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Base URL <span className="text-gray-400 font-normal">(opcional)</span></label>
                    <input type="url" value={form.evolutionBaseUrl}
                      onChange={e => setForm(f => ({ ...f, evolutionBaseUrl: e.target.value }))}
                      placeholder="https://api.divulgabr.com.br"
                      className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                    <p className="text-xs text-gray-400 mt-1">Deixe em branco para usar o padrão.</p>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-4 text-xs text-gray-500 dark:text-gray-400 space-y-1.5">
                    <p className="font-medium text-gray-700 dark:text-gray-300">URL do Webhook (configurar na Evolution API):</p>
                    <code className="block bg-white dark:bg-gray-800 px-3 py-2 rounded-lg text-gray-800 dark:text-gray-200 break-all">
                      {`${window.location.origin.replace(':5173','').replace(':3000','')}/api/webhook/agente/${tenant?.slug || 'seu-slug'}`}
                    </code>
                    <p className="text-gray-400">Eventos necessários: <strong>messages.upsert</strong>, <strong>connection.update</strong></p>
                  </div>
                </div>
              )}

              {/* Campos Meta Cloud API */}
              {form.waProvider === 'meta' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100">🏢 Meta Cloud API — Credenciais</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Acesse <strong>developers.facebook.com</strong> → seu App → WhatsApp → Configuração para obter as credenciais.
                  </p>
                  {[
                    { field: 'phoneNumberId', label: 'Phone Number ID', placeholder: '1234567890123456', type: 'text' },
                    { field: 'accessToken',   label: 'Access Token (permanente)', placeholder: 'EAAxxxxxxx...', type: 'password' },
                    { field: 'appSecret',     label: 'App Secret (validação HMAC)', placeholder: 'abc123...', type: 'password' },
                    { field: 'webhookVerifyToken', label: 'Webhook Verify Token (seu token)', placeholder: 'meu-token-secreto', type: 'text' },
                  ].map(({ field, label, placeholder, type }) => (
                    <div key={field}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                      <input type={type} value={form.waConfig[field] || ''}
                        onChange={e => setForm(f => ({ ...f, waConfig: { ...f.waConfig, [field]: e.target.value } }))}
                        placeholder={placeholder}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                    </div>
                  ))}
                  <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-4 text-xs text-gray-500 dark:text-gray-400 space-y-1.5">
                    <p className="font-medium text-gray-700 dark:text-gray-300">URL do Webhook (configurar no Meta Developers):</p>
                    <code className="block bg-white dark:bg-gray-800 px-3 py-2 rounded-lg text-gray-800 dark:text-gray-200 break-all">
                      {`${window.location.origin.replace(':5173','').replace(':3000','')}/api/webhook/meta/${tenant?.slug || 'seu-slug'}`}
                    </code>
                    <p className="text-gray-400">Assinar o campo: <strong>messages</strong></p>
                  </div>
                </div>
              )}

              {/* Campos Twilio */}
              {form.waProvider === 'twilio' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100">📡 Twilio — Credenciais</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Acesse <strong>console.twilio.com</strong> para obter as credenciais. O número deve ter WhatsApp ativado.
                  </p>
                  {[
                    { field: 'accountSid',  label: 'Account SID',    placeholder: 'ACxxxxxxxxxxxxxxxx', type: 'text' },
                    { field: 'authToken',   label: 'Auth Token',      placeholder: 'xxxxxxxxxxxxxxxx', type: 'password' },
                    { field: 'fromNumber',  label: 'Número Twilio WA', placeholder: '+14155238886', type: 'text' },
                  ].map(({ field, label, placeholder, type }) => (
                    <div key={field}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                      <input type={type} value={form.waConfig[field] || ''}
                        onChange={e => setForm(f => ({ ...f, waConfig: { ...f.waConfig, [field]: e.target.value } }))}
                        placeholder={placeholder}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                    </div>
                  ))}
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-xs text-amber-700 dark:text-amber-400">
                    <strong>Nota:</strong> Twilio não suporta listas interativas no WhatsApp. O bot de agendamento usará texto numerado automaticamente.
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-4 text-xs text-gray-500 dark:text-gray-400 space-y-1.5">
                    <p className="font-medium text-gray-700 dark:text-gray-300">URL do Webhook (configurar no Twilio Console):</p>
                    <code className="block bg-white dark:bg-gray-800 px-3 py-2 rounded-lg text-gray-800 dark:text-gray-200 break-all">
                      {`${window.location.origin.replace(':5173','').replace(':3000','')}/api/webhook/twilio/${tenant?.slug || 'seu-slug'}`}
                    </code>
                    <p className="text-gray-400">Método: <strong>HTTP POST</strong></p>
                  </div>
                </div>
              )}

              {/* Campos Z-API */}
              {form.waProvider === 'zapi' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100">🔗 Z-API — Credenciais</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Acesse <strong>app.z-api.io</strong> para obter os dados da instância.
                  </p>
                  {[
                    { field: 'instanceId',   label: 'Instance ID',    placeholder: 'XXXXXXXXXX', type: 'text' },
                    { field: 'token',         label: 'Token',           placeholder: 'xxxxxxxxxxxxxxxx', type: 'password' },
                    { field: 'clientToken',   label: 'Client Token',    placeholder: 'F...',        type: 'password' },
                  ].map(({ field, label, placeholder, type }) => (
                    <div key={field}>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
                      <input type={type} value={form.waConfig[field] || ''}
                        onChange={e => setForm(f => ({ ...f, waConfig: { ...f.waConfig, [field]: e.target.value } }))}
                        placeholder={placeholder}
                        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                    </div>
                  ))}
                  <div className="bg-gray-50 dark:bg-gray-900/40 rounded-xl p-4 text-xs text-gray-500 dark:text-gray-400 space-y-1.5">
                    <p className="font-medium text-gray-700 dark:text-gray-300">URL do Webhook (configurar no Z-API):</p>
                    <code className="block bg-white dark:bg-gray-800 px-3 py-2 rounded-lg text-gray-800 dark:text-gray-200 break-all">
                      {`${window.location.origin.replace(':5173','').replace(':3000','')}/api/webhook/zapi/${tenant?.slug || 'seu-slug'}`}
                    </code>
                    <p className="text-gray-400">Tipo: <strong>Received</strong> (mensagem recebida)</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button type="submit" disabled={loading}
                  className="btn-primary text-white font-semibold px-8 py-3 rounded-xl transition text-sm disabled:opacity-60">
                  {loading ? 'Salvando...' : 'Salvar configuração'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── ABA INTEGRAÇÃO ── */}
        {tab === 'integracao' && (
          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {tenant?.n8nAtivo && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100">Integração n8n</h2>
                  <span className="text-xs bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full font-medium">Opcional</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">O CRM chama este webhook quando um novo agendamento é criado via formulário ou WhatsApp.</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL do Webhook n8n</label>
                  <input type="url" value={form.n8nWebhookUrl}
                    onChange={e => setForm(f => ({ ...f, n8nWebhookUrl: e.target.value }))}
                    placeholder="https://seu-n8n.com/webhook/..."
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chave do webhook <span className="text-gray-400 font-normal">(opcional)</span></label>
                  <input type="password" value={form.n8nApiKey}
                    onChange={e => setForm(f => ({ ...f, n8nApiKey: e.target.value }))}
                    placeholder="Bearer token configurado no n8n"
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                </div>
              </div>
              )}
              {/* Lembretes diretos */}
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="font-semibold text-gray-900 dark:text-gray-100">Lembretes automáticos diretos</h2>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Envia lembretes de agendamento diretamente pelo sistema (sem depender do n8n).
                      Requer instância Evolution configurada abaixo. O sistema verifica a cada hora.
                    </p>
                  </div>
                  <button type="button"
                    onClick={() => setForm(f => ({ ...f, lembretesDiretosAtivo: !f.lembretesDiretosAtivo }))}
                    className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${form.lembretesDiretosAtivo ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.lembretesDiretosAtivo ? 'translate-x-5' : ''}`} />
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100">WhatsApp (Evolution API)</h2>
                  <span className="text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full font-medium">Saída</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Credenciais da instância Evolution usada para enviar confirmações e lembretes pelo número deste tenant.</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome da instância</label>
                  <input type="text" value={form.evolutionInstance}
                    onChange={e => setForm(f => ({ ...f, evolutionInstance: e.target.value }))}
                    placeholder="ex: minha-empresa"
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">API Key da instância</label>
                  <input type="password" value={form.evolutionApiKey}
                    onChange={e => setForm(f => ({ ...f, evolutionApiKey: e.target.value }))}
                    placeholder="Chave de acesso da instância Evolution"
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Base URL <span className="text-gray-400 font-normal">(opcional)</span></label>
                  <input type="url" value={form.evolutionBaseUrl}
                    onChange={e => setForm(f => ({ ...f, evolutionBaseUrl: e.target.value }))}
                    placeholder="https://api.divulgabr.com.br"
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                  <p className="text-xs text-gray-400 mt-1">Deixe em branco para usar o padrão.</p>
                </div>
              </div>
              <div className="flex justify-end">
                <button type="submit" disabled={loading}
                  className="btn-primary text-white font-semibold px-8 py-3 rounded-xl transition text-sm disabled:opacity-60">
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>

            {/* Conexão WhatsApp — QR Code */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100">Conexão WhatsApp</h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Escaneie o QR Code para conectar o número deste tenant.</p>
                </div>
                {waStatus === 'open' ? (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full text-xs font-semibold">
                    <span className="w-2 h-2 bg-green-500 rounded-full inline-block animate-pulse" />
                    Conectado
                  </span>
                ) : waStatus === 'not_configured' ? (
                  <span className="px-3 py-1.5 bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400 rounded-full text-xs font-semibold">Não configurado</span>
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full text-xs font-semibold">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full inline-block" />
                    Desconectado
                  </span>
                )}
              </div>

              {waQrcode ? (
                <div className="flex flex-col items-center gap-3 py-4">
                  <img src={waQrcode} alt="QR Code WhatsApp" className="w-40 h-40 sm:w-52 sm:h-52 rounded-xl border border-gray-200 bg-white p-2" />
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">Abra o WhatsApp → Aparelhos conectados → Conectar aparelho</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 animate-pulse">Aguardando conexão...</p>
                </div>
              ) : (
                <div className="flex items-center gap-3 flex-wrap">
                  <button onClick={conectarWhatsapp} disabled={waLoading || waStatus === 'not_configured'}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    {waLoading ? 'Carregando...' : waStatus === 'open' ? 'Reconectar WhatsApp' : 'Conectar WhatsApp'}
                  </button>
                  {waStatus === 'open' && (
                    <button onClick={desconectarWhatsapp} disabled={waLoading}
                      className="flex items-center gap-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50 font-semibold px-5 py-2.5 rounded-xl text-sm transition">
                      Desconectar
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Token de API */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Token de API</h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">Use este token para que o n8n possa <strong>criar leads, agendamentos e consultar disponibilidade</strong> via API.</p>
              {apiToken ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input type={showToken ? 'text' : 'password'} readOnly value={apiToken}
                      className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-gray-50 dark:bg-gray-700 font-mono text-gray-900 dark:text-gray-100" />
                    <button type="button" onClick={() => setShowToken(s => !s)}
                      className="px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                      {showToken ? 'Ocultar' : 'Ver'}
                    </button>
                    <button type="button" onClick={() => copiar(apiToken)}
                      className="px-3 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">
                      Copiar
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Header: <code className="bg-gray-100 dark:bg-gray-700 px-1 rounded">X-API-Token: {showToken ? apiToken : '••••••••'}</code></p>
                </div>
              ) : (
                <p className="text-sm text-gray-400 dark:text-gray-500">Nenhum token gerado ainda.</p>
              )}
              <button type="button" onClick={gerarToken} disabled={genLoading}
                className="bg-gray-900 hover:bg-gray-700 text-white font-semibold px-5 py-2.5 rounded-xl text-sm transition disabled:opacity-60">
                {genLoading ? 'Gerando...' : apiToken ? 'Regenerar token' : 'Gerar token de API'}
              </button>
            </div>

            {/* Endpoints */}
            {apiToken && (
              <div className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl p-6">
                <h2 className="font-semibold text-gray-700 dark:text-gray-300 mb-3">Endpoints disponíveis</h2>
                <div className="space-y-2 text-xs font-mono text-gray-600 dark:text-gray-400">
                  {[
                    ['GET',    '/api/n8n/leads',                'Listar leads'],
                    ['POST',   '/api/n8n/leads',                'Criar lead'],
                    ['PATCH',  '/api/n8n/leads/:id',            'Atualizar lead'],
                    ['GET',    '/api/n8n/agendamentos',         'Listar agendamentos'],
                    ['POST',   '/api/n8n/agendamentos',         'Criar agendamento (WhatsApp)'],
                    ['PATCH',  '/api/n8n/agendamentos/:id',     'Atualizar agendamento'],
                    ['GET',    '/api/n8n/disponibilidade?data=','Consultar slots livres'],
                    ['GET',    '/api/n8n/conversas/:telefone',  'Estado da conversa WA'],
                    ['PUT',    '/api/n8n/conversas/:telefone',  'Salvar/atualizar conversa WA'],
                    ['DELETE', '/api/n8n/conversas/:telefone',  'Encerrar conversa WA'],
                    ['GET',    '/api/n8n/settings',             'Templates e nicho do tenant'],
                  ].map(([method, path, desc]) => (
                    <div key={path+method} className="flex items-center gap-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold min-w-[48px] text-center
                        ${method==='GET' ? 'bg-green-100 text-green-700'
                        : method==='POST' ? 'bg-blue-100 text-blue-700'
                        : method==='DELETE' ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'}`}>{method}</span>
                      <span className="text-gray-500">{path}</span>
                      <span className="text-gray-400 hidden lg:inline">— {desc}</span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">Base URL: <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">{window.location.origin}</code></p>
              </div>
            )}

            {/* Plano */}
            <div className="bg-gray-900 rounded-2xl p-6 text-white">
              {tenant?.planoStatus === 'inadimplente' && (
                <div className="mb-4 flex items-center gap-3 bg-red-900/50 border border-red-700 rounded-xl px-4 py-3">
                  <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /></svg>
                  <p className="text-red-300 text-sm font-medium">Pagamento em atraso. Regularize para evitar suspensão do acesso.</p>
                </div>
              )}
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold">Plano atual</h2>
                <div className="flex items-center gap-2">
                  <span className="capitalize text-sm font-semibold bg-blue-900 text-blue-300 px-3 py-1 rounded-full">{tenant?.plano}</span>
                  {tenant?.planoStatus && tenant.planoStatus !== 'ativo' && (
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      tenant.planoStatus === 'trial' ? 'bg-slate-700 text-slate-300' :
                      tenant.planoStatus === 'inadimplente' ? 'bg-red-900 text-red-300' :
                      'bg-red-950 text-red-400'
                    }`}>
                      {{ trial: 'Trial', inadimplente: 'Inadimplente', cancelado: 'Cancelado' }[tenant.planoStatus]}
                    </span>
                  )}
                </div>
              </div>
              {tenant?.planoVencimento && (
                <p className="text-gray-400 text-sm mb-3">
                  Vencimento: <span className="text-white">{new Date(tenant.planoVencimento).toLocaleDateString('pt-BR')}</span>
                </p>
              )}
              {usoMes !== null && (
                <div className="mb-3">
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-400">Agendamentos este mês</span>
                    <span className="text-white font-medium">
                      {usoMes} / {tenant?.plano === 'solo' || tenant?.plano === 'trial' ? 100 : '∞'}
                    </span>
                  </div>
                  {(tenant?.plano === 'solo' || tenant?.plano === 'trial') && (
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${usoMes / 100 > 0.8 ? 'bg-red-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min(100, (usoMes / 100) * 100)}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
              <p className="text-gray-400 text-sm">Para alterar o plano ou adicionar mais usuários, entre em contato com o suporte.</p>
            </div>
          </div>
        )}

        {/* ── Aba: Bot / n8n ── */}
        {tab === 'n8n' && (
          <div className="space-y-6">
            {tenant?.n8nAtivo ? (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Status dos Workflows n8n</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Workflows provisionados automaticamente para este tenant no n8n.</p>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Bot Agendamento WhatsApp</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                        {form.n8nWorkflowWaId ? `ID: ${form.n8nWorkflowWaId}` : 'Não provisionado'}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${form.n8nWorkflowWaId ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' : 'bg-gray-200 text-gray-500 dark:bg-gray-600 dark:text-gray-400'}`}>
                      {form.n8nWorkflowWaId ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Notificações e Lembretes</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-mono mt-0.5">
                        {form.n8nWorkflowNotifId ? `ID: ${form.n8nWorkflowNotifId}` : 'Não provisionado'}
                      </p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${form.n8nWorkflowNotifId ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400' : 'bg-gray-200 text-gray-500 dark:bg-gray-600 dark:text-gray-400'}`}>
                      {form.n8nWorkflowNotifId ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                  {form.n8nWebhookUrl && (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                      <p className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">Webhook URL (Notificações)</p>
                      <p className="text-xs text-blue-600 dark:text-blue-300 font-mono break-all">{form.n8nWebhookUrl}</p>
                    </div>
                  )}
                  {!form.n8nWorkflowWaId && !form.n8nWorkflowNotifId && (
                    <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                      Entre em contato com o suporte para provisionar os workflows n8n para sua conta.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                  <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-gray-900 dark:text-gray-100 font-semibold mb-1">Bot WhatsApp via n8n</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                  Esta funcionalidade não está habilitada para sua conta.<br />Entre em contato com o suporte para ativá-la.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── ABA NOTIFICAÇÕES ── */}
        {tab === 'notificacoes' && <AbaNotificacoes />}

        {/* ── ABA SEGURANÇA ── */}
        {tab === 'seguranca' && <AbaSeguranca />}

        {/* ── ABA PLANO ── */}
        {tab === 'plano' && (
          <div className="space-y-6">
            {/* Status atual */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-3">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Assinatura atual</h2>
              {planoStatus ? (
                <div className="flex flex-wrap gap-4 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Plano: <strong className="text-gray-900 dark:text-gray-100 capitalize">{planoStatus.plano}</strong></span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${planoStatus.planoStatus === 'ativo' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : planoStatus.planoStatus === 'trial' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                    {planoStatus.planoStatus}
                  </span>
                  {planoStatus.planoVencimento && (
                    <span className="text-gray-500 dark:text-gray-400">Vencimento: <strong className="text-gray-900 dark:text-gray-100">{new Date(planoStatus.planoVencimento).toLocaleDateString('pt-BR')}</strong></span>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400">Carregando...</p>
              )}
              {planoStatus?.mpSubscriptionId && (
                <button
                  disabled={planoLoading}
                  onClick={async () => {
                    if (!window.confirm('Cancelar sua assinatura? O acesso continuará até o fim do período pago.')) return;
                    setPlanoLoading(true);
                    try {
                      await api.put('/payments/cancelar');
                      toast.success('Assinatura cancelada.');
                      const d = await api.get('/payments/status');
                      setPlanoStatus(d);
                    } catch (err) { toast.error(err.message); }
                    finally { setPlanoLoading(false); }
                  }}
                  className="text-sm text-red-500 hover:text-red-700 underline">
                  Cancelar assinatura
                </button>
              )}
            </div>

            {/* Escolher plano */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Escolher / trocar plano</h2>
                {/* Toggle mensal / anual */}
                <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-700 rounded-xl p-1">
                  {['mensal', 'anual'].map(c => (
                    <button key={c} onClick={() => setCicloPlano(c)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${cicloPlano === c ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}>
                      {c === 'mensal' ? 'Mensal' : (
                        <span className="flex items-center gap-1.5">
                          Anual
                          <span className="bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs font-bold px-1.5 py-0.5 rounded-full">-20%</span>
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {cicloPlano === 'anual' && (
                <p className="text-xs text-gray-500 dark:text-gray-400 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-xl px-4 py-2.5">
                  💰 Pague uma vez por ano e economize 2 meses. Preços com 20% de desconto.
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {PLANOS_MP.map(p => {
                  const precoAnual = { solo: 'R$ 374,40/ano', pro: 'R$ 566,40/ano', business: 'R$ 950,40/ano' }[p.id];
                  const precoMesAnual = { solo: 'R$ 31,20/mês', pro: 'R$ 47,20/mês', business: 'R$ 79,20/mês' }[p.id];
                  // Só desabilita se já estiver ATIVO neste plano+ciclo (trial pode assinar qualquer plano)
                  const isAtual = planoStatus?.planoStatus === 'ativo' && planoStatus?.plano === p.id && planoStatus?.cicloBilhagem === cicloPlano;
                  return (
                    <div key={p.id} className={`border rounded-xl p-4 flex flex-col gap-2 ${isAtual ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-200 dark:border-gray-600'}`}>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 dark:text-gray-100">{p.label}</span>
                        <div className="text-right">
                          <div className="text-sm font-bold text-blue-600 dark:text-blue-400">
                            {cicloPlano === 'anual' ? precoAnual : p.preco}
                          </div>
                          {cicloPlano === 'anual' && (
                            <div className="text-xs text-gray-400">{precoMesAnual}</div>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{p.descricao}</p>
                      <button
                        disabled={planoLoading || isAtual}
                        onClick={async () => {
                          setPlanoLoading(true);
                          // Abre janela ANTES do await — browsers bloqueiam window.open após operações async
                          const win = window.open('', '_blank');
                          try {
                            const d = await api.post('/payments/assinar', { plano: p.id, ciclo: cicloPlano });
                            if (d.init_point) { win.location.href = d.init_point; toast.success('Redirecionando para o Mercado Pago...'); }
                            else { win.close(); toast.error('Link de pagamento não gerado.'); }
                          } catch (err) { win.close(); toast.error(err.message); }
                          finally { setPlanoLoading(false); }
                        }}
                        className={`mt-1 text-sm font-semibold py-1.5 rounded-lg transition ${isAtual ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 cursor-default' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                        {isAtual ? 'Plano atual' : 'Assinar'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tab === 'dados' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Exportar backup</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Baixe um arquivo JSON com todos os seus dados: leads, agendamentos, serviços, configurações, bloqueios e lançamentos financeiros.</p>
              <button
                onClick={async () => {
                  try {
                    const blob = await api.download('/settings/backup');
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  } catch (err) { toast.error(err.message); }
                }}
                className="btn-primary text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition">
                ⬇ Exportar backup
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Restaurar backup</h2>
              <p className="text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl px-4 py-3">
                ⚠️ Esta ação <strong>apaga todos os dados atuais</strong> (leads, agendamentos, serviços, bloqueios e financeiro) e substitui pelo conteúdo do arquivo de backup.
              </p>
              <label className="cursor-pointer inline-flex items-center gap-2 px-6 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 transition font-semibold">
                📂 Selecionar arquivo .json
                <input type="file" accept=".json" className="hidden"
                  onChange={async e => {
                    const file = e.target.files[0]; if (!file) return;
                    if (!window.confirm('Tem certeza? Todos os dados atuais serão substituídos pelo backup.')) { e.target.value = ''; return; }
                    try {
                      const text = await file.text();
                      const data = JSON.parse(text);
                      await api.post('/settings/restore', data);
                      toast.success('Backup restaurado com sucesso!');
                    } catch (err) { toast.error(err.message || 'Arquivo inválido.'); }
                    e.target.value = '';
                  }} />
              </label>
            </div>
          </div>
        )}

        {/* ── ABA AGENTE IA ── */}
        {tab === 'agente-ia' && (
          <div className="space-y-6">
            {!agentConfig && !agentForm.promptBase ? (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
                <div className="text-center py-4">
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Disponível no plano <strong>Business</strong>.</p>
                  <p className="text-gray-400 dark:text-gray-500 text-xs">Configure abaixo para ativar o atendimento automático no WhatsApp.</p>
                </div>
              </div>
            ) : null}

            {/* Stats */}
            {agentStats && (
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Leads captados', value: agentStats.totalLeads },
                  { label: 'Checkouts enviados', value: agentStats.checkouts },
                  { label: 'Sessões ativas', value: agentStats.sessoes },
                ].map(s => (
                  <div key={s.label} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 text-center">
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{s.value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Toggle ativo */}
            {agentConfig && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-gray-100">Agente IA</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {agentConfig.ativo ? '✅ Ativo — respondendo mensagens automaticamente' : '⏸ Inativo — não está respondendo'}
                  </p>
                </div>
                <button onClick={toggleAgente} disabled={agentLoading}
                  className={`px-5 py-2 rounded-xl font-semibold text-sm transition ${agentConfig.ativo ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                  {agentLoading ? '...' : agentConfig.ativo ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            )}

            {/* Formulário de configuração */}
            <form onSubmit={salvarAgente} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Configuração do agente</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome / Persona</label>
                <input value={agentForm.persona} onChange={e => setAgentForm(f => ({ ...f, persona: e.target.value }))}
                  placeholder="Ex: Ana, Suporte, Assistente"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Prompt base <span className="text-red-500">*</span></label>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">Descreva seu negócio, produtos, preços e como o agente deve se comportar. Inclua o link de checkout se quiser que o agente o envie.</p>
                <textarea value={agentForm.promptBase} onChange={e => setAgentForm(f => ({ ...f, promptBase: e.target.value }))} required rows={8}
                  placeholder="Você é o assistente de vendas da [Empresa]. Oferecemos [serviços/produtos]. Preços: [...]"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Início do atendimento</label>
                  <input type="time" value={agentForm.horarioInicio} onChange={e => setAgentForm(f => ({ ...f, horarioInicio: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fim do atendimento</label>
                  <input type="time" value={agentForm.horarioFim} onChange={e => setAgentForm(f => ({ ...f, horarioFim: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Dias de atendimento</label>
                <div className="flex gap-2 flex-wrap">
                  {DIAS_SEMANA.map(d => {
                    const dias = agentForm.diasUteis ? agentForm.diasUteis.split(',') : [];
                    const ativo = dias.includes(d.value);
                    return (
                      <button key={d.value} type="button"
                        onClick={() => {
                          const novo = ativo ? dias.filter(x => x !== d.value) : [...dias, d.value].sort();
                          setAgentForm(f => ({ ...f, diasUteis: novo.join(',') }));
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${ativo ? 'bg-blue-600 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}>
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mensagem fora do horário <span className="text-gray-400 font-normal">(opcional)</span></label>
                <textarea value={agentForm.msgForaHorario} onChange={e => setAgentForm(f => ({ ...f, msgForaHorario: e.target.value }))} rows={2}
                  placeholder="Olá! Nosso horário de atendimento é de segunda a sexta, das 9h às 18h. Retornamos em breve!"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-4 py-3 text-xs text-blue-700 dark:text-blue-300">
                📌 Configure a instância WhatsApp na aba <strong>Integração</strong>. O webhook da Evolution API deve apontar para:
                <br />
                <code className="font-mono mt-1 block select-all">{window.location.origin.replace(':5173', ':3000')}/api/webhook/agente/{tenant?.slug || 'seu-slug'}</code>
                <br />
                Evento: <strong>MESSAGES_UPSERT</strong>
              </div>

              <button type="submit" disabled={agentSaving}
                className="btn-primary text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition disabled:opacity-60">
                {agentSaving ? 'Salvando...' : 'Salvar configurações'}
              </button>
            </form>

            {/* Leads captados */}
            {agentLeads.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 space-y-4">
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Leads captados pelo agente</h2>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-700">
                        <th className="pb-2 pr-4">Telefone</th>
                        <th className="pb-2 pr-4">Primeira mensagem</th>
                        <th className="pb-2 pr-4">Checkout</th>
                        <th className="pb-2">Captado em</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                      {agentLeads.map(l => (
                        <tr key={l.id}>
                          <td className="py-2 pr-4 font-mono text-xs">{l.telefone}</td>
                          <td className="py-2 pr-4 text-gray-600 dark:text-gray-300 max-w-xs truncate">{l.primeiraMsg || '—'}</td>
                          <td className="py-2 pr-4">{l.sentCheckout ? <span className="text-green-600 font-semibold">✓ Enviado</span> : <span className="text-gray-400">—</span>}</td>
                          <td className="py-2 text-gray-400 text-xs">{new Date(l.createdAt).toLocaleDateString('pt-BR')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
