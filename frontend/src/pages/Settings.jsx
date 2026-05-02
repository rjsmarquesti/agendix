import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

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
  { value: 30,  label: '30 minutos' },
  { value: 45,  label: '45 minutos' },
  { value: 60,  label: '1 hora' },
  { value: 90,  label: '1h 30min' },
  { value: 120, label: '2 horas' },
];

const TABS = [
  { id: 'empresa',    label: 'Empresa' },
  { id: 'agenda',     label: 'Agenda' },
  { id: 'integracao', label: 'Integração' },
  { id: 'n8n',        label: 'Bot / n8n' },
];

export default function Settings() {
  const { tenant, updateTenant } = useAuth();
  const [tab, setTab]           = useState('empresa');
  const [form, setForm]         = useState({ nome: '', logo: '', corPrimaria: '#2563eb', modulos: [], n8nWebhookUrl: '', n8nApiKey: '', nichoLabel: '', evolutionInstance: '', evolutionApiKey: '', evolutionBaseUrl: '', n8nWorkflowWaId: null, n8nWorkflowNotifId: null });
  const [agendaForm, setAgendaForm] = useState({
    horarioInicio: '08:00', horarioFim: '18:00', duracaoSlot: 60,
    diasUteis: '1,2,3,4,5', antecedenciaMin: 2, antecedenciaMax: 30,
    mensagemConfirmacao: '', mensagemWaConfirmacao: '', mensagemWaLembrete: '', mensagemWaAdmin: '',
    whatsappAdmin: '', ativo: true,
  });
  const [apiToken, setApiToken]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [agendaLoading, setAL]    = useState(false);
  const [genLoading, setGL]       = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [usoMes, setUsoMes]       = useState(null);
  const [bloqueios, setBloqueios] = useState([]);
  const [bloqueioForm, setBloqueioForm] = useState({ data: '', tipoBloco: 'dia', horaInicio: '', horaFim: '', motivo: '' });
  const [bloqueioLoading, setBloqueioLoading] = useState(false);

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
      });
      if (t.apiToken) setApiToken(t.apiToken);
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
      });
    }).catch(() => {});

    carregarBloqueios();

    // Uso de agendamentos no mês atual
    const mesAtual = new Date().toISOString().slice(0, 7);
    api.get(`/agendamentos?dataInicio=${mesAtual}-01&dataFim=${mesAtual}-31`).then(d => {
      setUsoMes(d.agendamentos?.length ?? 0);
    }).catch(() => {});
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

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-2xl p-1 mb-6">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all
                ${tab === t.id ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
              {t.label}
            </button>
          ))}
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">URL da Logo <span className="text-gray-400 font-normal">(opcional)</span></label>
                <input type="url" value={form.logo} onChange={e => setForm(f => ({ ...f, logo: e.target.value }))}
                  placeholder="https://..." className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
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

            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-6">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-4">Módulos ativos</h2>
              <div className="space-y-3">
                {MODULOS_DISPONIVEIS.map(m => (
                  <label key={m.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors">
                    <input type="checkbox" checked={form.modulos.includes(m.id)} onChange={() => toggleModulo(m.id)} className="w-4 h-4 rounded" />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{m.label}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{m.desc}</p>
                    </div>
                  </label>
                ))}
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
                  <div className="flex gap-2 flex-wrap">
                    {DIAS_SEMANA.map(d => (
                      <button key={d.value} type="button"
                        onClick={() => toggleDia(d.value)}
                        className={`w-12 h-12 rounded-xl text-sm font-semibold border transition
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
                  <div className="flex items-center gap-2">
                    <input readOnly value={linkFormulario}
                      className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-xs bg-gray-50 dark:bg-gray-700 font-mono text-gray-600 dark:text-gray-400 truncate" />
                    <button type="button" onClick={() => copiar(linkFormulario)}
                      className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 whitespace-nowrap">
                      Copiar
                    </button>
                    <a href={linkFormulario} target="_blank" rel="noreferrer"
                      className="px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 whitespace-nowrap">
                      Abrir
                    </a>
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
                <div className="grid grid-cols-2 gap-3">
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
                  <div className="grid grid-cols-2 gap-3">
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

        {/* ── ABA INTEGRAÇÃO ── */}
        {tab === 'integracao' && (
          <div className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
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
                      {usoMes} / {tenant?.plano === 'basico' ? 50 : tenant?.plano === 'pro' ? 300 : '∞'}
                    </span>
                  </div>
                  {tenant?.plano !== 'premium' && (
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${usoMes / (tenant?.plano === 'basico' ? 50 : 300) > 0.8 ? 'bg-red-500' : 'bg-blue-500'}`}
                        style={{ width: `${Math.min(100, (usoMes / (tenant?.plano === 'basico' ? 50 : 300)) * 100)}%` }}
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
          </div>
        )}
      </div>
    </Layout>
  );
}
