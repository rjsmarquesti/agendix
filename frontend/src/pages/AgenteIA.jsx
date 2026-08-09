import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const PROMPT_PADRAO = `Você é um assistente virtual simpático e profissional. Responda de forma clara e objetiva.

Serviços oferecidos: [liste seus serviços aqui]
Horário de atendimento: segunda a sexta, das 09h às 18h
Endereço: [seu endereço]
Link de agendamento: [seu link]

Seja cordial, use linguagem informal mas profissional. Limite as respostas a 3 parágrafos curtos.
Quando o cliente quiser agendar, envie o link de agendamento.`;

function BannerUpsell() {
  return (
    <div className="rounded-2xl border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-900/20 p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-800 flex items-center justify-center">
        <svg className="w-5 h-5 text-purple-600 dark:text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2h-2" />
        </svg>
      </div>
      <div className="flex-1">
        <p className="font-semibold text-purple-900 dark:text-purple-100">Agente IA disponível nos planos Pro e Business</p>
        <p className="text-sm text-purple-700 dark:text-purple-300 mt-0.5">
          Automatize o atendimento no WhatsApp com inteligência artificial. Responde clientes, agenda horários e captura leads 24h.
        </p>
      </div>
      <a href="mailto:suporte@divulgabr.com.br?subject=Upgrade%20Agendix%20-%20Agente%20IA"
        className="flex-shrink-0 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition-colors">
        Fazer upgrade
      </a>
    </div>
  );
}

function TabBtn({ label, ativo, onClick }) {
  return (
    <button onClick={onClick}
      className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${ativo
        ? 'bg-blue-600 text-white shadow-sm'
        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'}`}>
      {label}
    </button>
  );
}

export default function AgenteIA() {
  const { tenant } = useAuth();
  const plano = tenant?.plano;
  const liberado = ['pro', 'business', 'trial'].includes(plano);

  const [tab, setTab]         = useState('config');
  const [config, setConfig]   = useState(null);
  const [stats, setStats]     = useState(null);
  const [leads, setLeads]     = useState([]);
  const [sessoes, setSessoes] = useState([]);
  const [saving, setSaving]   = useState(false);
  const [toggling, setToggling] = useState(false);

  const [form, setForm] = useState({
    persona: 'Assistente Virtual',
    promptBase: PROMPT_PADRAO,
    horarioInicio: '09:00',
    horarioFim: '18:00',
    diasUteis: '1,2,3,4,5',
    msgForaHorario: '',
    checkoutUrl: '',
  });

  useEffect(() => {
    if (!liberado) return;
    carregarConfig();
    carregarStats();
  }, [liberado]);

  useEffect(() => {
    if (tab === 'leads') carregarLeads();
    if (tab === 'sessoes') carregarSessoes();
  }, [tab]);

  async function carregarConfig() {
    try {
      const { config: c } = await api.get('/agente-ia/config');
      if (c) {
        setConfig(c);
        setForm({
          persona: c.persona || 'Assistente Virtual',
          promptBase: c.promptBase || PROMPT_PADRAO,
          horarioInicio: c.horarioInicio || '09:00',
          horarioFim: c.horarioFim || '18:00',
          diasUteis: c.diasUteis || '1,2,3,4,5',
          msgForaHorario: c.msgForaHorario || '',
          checkoutUrl: c.checkoutUrl || '',
        });
      }
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function carregarStats() {
    try {
      const d = await api.get('/agente-ia/stats');
      setStats(d);
    } catch {}
  }

  async function carregarLeads() {
    try {
      const { leads: l } = await api.get('/agente-ia/leads');
      setLeads(l || []);
    } catch (err) { toast.error(err.message); }
  }

  async function carregarSessoes() {
    try {
      const { sessoes: s } = await api.get('/agente-ia/sessoes');
      setSessoes(s || []);
    } catch (err) { toast.error(err.message); }
  }

  async function salvar(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const { config: c } = await api.put('/agente-ia/config', form);
      setConfig(c);
      toast.success('Configurações salvas!');
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  async function toggleAtivo() {
    if (!config) { toast.error('Salve a configuração antes de ativar.'); return; }
    setToggling(true);
    try {
      const { ativo } = await api.post('/agente-ia/toggle');
      setConfig(c => ({ ...c, ativo }));
      toast.success(ativo ? 'Agente ativado!' : 'Agente desativado.');
    } catch (err) { toast.error(err.message); }
    finally { setToggling(false); }
  }

  async function resetarSessao(phone) {
    if (!confirm(`Resetar conversa com ${phone}?`)) return;
    try {
      await api.delete(`/agente-ia/sessoes/${phone}`);
      setSessoes(s => s.filter(x => x.id !== phone));
      toast.success('Conversa resetada.');
    } catch (err) { toast.error(err.message); }
  }

  function toggleDia(dia) {
    const dias = form.diasUteis ? form.diasUteis.split(',').map(Number) : [];
    const novo = dias.includes(dia) ? dias.filter(d => d !== dia) : [...dias, dia].sort();
    setForm(f => ({ ...f, diasUteis: novo.join(',') }));
  }

  const diasSelecionados = form.diasUteis ? form.diasUteis.split(',').map(Number) : [];

  const webhookUrl = `${window.location.origin.replace(/:\d+$/, ':3000')}/api/agente-ia/webhook/${tenant?.slug}`;

  if (!liberado) {
    return (
      <Layout>
        <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Agente IA</h1>
          <BannerUpsell />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">

        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Agente IA</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Assistente virtual para atendimento no WhatsApp</p>
          </div>
          <button onClick={toggleAtivo} disabled={toggling}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 ${
              config?.ativo
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200'
            }`}>
            <span className={`w-2 h-2 rounded-full ${config?.ativo ? 'bg-white animate-pulse' : 'bg-gray-400'}`} />
            {config?.ativo ? 'Agente Ativo' : 'Agente Inativo'}
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Leads captados', valor: stats.totalLeads, cor: 'text-blue-600' },
              { label: 'Checkouts enviados', valor: stats.checkouts, cor: 'text-green-600' },
              { label: 'Sessões ativas', valor: stats.sessoes, cor: 'text-purple-600' },
            ].map(c => (
              <div key={c.label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 text-center">
                <div className={`text-2xl font-bold ${c.cor}`}>{c.valor}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{c.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2">
          <TabBtn label="⚙️ Configuração" ativo={tab === 'config'} onClick={() => setTab('config')} />
          <TabBtn label="🔗 Webhook" ativo={tab === 'webhook'} onClick={() => setTab('webhook')} />
          <TabBtn label="👤 Leads" ativo={tab === 'leads'} onClick={() => setTab('leads')} />
          <TabBtn label="💬 Conversas" ativo={tab === 'sessoes'} onClick={() => setTab('sessoes')} />
        </div>

        {/* ── ABA CONFIGURAÇÃO ── */}
        {tab === 'config' && (
          <form onSubmit={salvar} className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Personalidade</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do agente</label>
                <input value={form.persona} onChange={e => setForm(f => ({ ...f, persona: e.target.value }))}
                  placeholder="Ex: Ana, Assistente Virtual"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Prompt de sistema
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-normal ml-2">— instruções do agente</span>
                </label>
                <textarea value={form.promptBase} onChange={e => setForm(f => ({ ...f, promptBase: e.target.value }))}
                  rows={10} required
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono resize-y" />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  Descreva seus serviços, preços, endereço e link de agendamento. Quanto mais contexto, melhores as respostas.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mensagem fora do horário</label>
                <textarea value={form.msgForaHorario} onChange={e => setForm(f => ({ ...f, msgForaHorario: e.target.value }))}
                  rows={2} placeholder="Olá! No momento estou fora do horário. Retorno em breve! 😊"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  URL de checkout
                  <span className="ml-1.5 text-xs text-gray-400 font-normal">— enviada quando o cliente demonstra intenção de compra</span>
                </label>
                <input type="url" value={form.checkoutUrl} onChange={e => setForm(f => ({ ...f, checkoutUrl: e.target.value }))}
                  placeholder="https://agendix.divulgabr.com.br/cadastro"
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-5">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Horário de atendimento</h2>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Início</label>
                  <input type="time" value={form.horarioInicio} onChange={e => setForm(f => ({ ...f, horarioInicio: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Fim</label>
                  <input type="time" value={form.horarioFim} onChange={e => setForm(f => ({ ...f, horarioFim: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Dias de atendimento</label>
                <div className="flex flex-wrap gap-2">
                  {DIAS.map((d, i) => (
                    <button type="button" key={i} onClick={() => toggleDia(i)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        diasSelecionados.includes(i)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={saving}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar configurações'}
              </button>
            </div>
          </form>
        )}

        {/* ── ABA WEBHOOK ── */}
        {tab === 'webhook' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-4">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">URL do Webhook</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Configure esta URL na sua instância Evolution API como webhook de mensagens recebidas.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-blue-600 dark:text-blue-400 font-mono break-all">
                  {`${window.location.protocol}//${window.location.hostname}/api/agente-ia/webhook/${tenant?.slug}`}
                </code>
                <button onClick={() => {
                  navigator.clipboard.writeText(`${window.location.protocol}//${window.location.hostname}/api/agente-ia/webhook/${tenant?.slug}`);
                  toast.success('Copiado!');
                }} className="flex-shrink-0 px-3 py-3 rounded-xl bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 text-blue-600 dark:text-blue-400 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 space-y-3">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Como configurar</h2>
              <ol className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <li className="flex gap-2"><span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">1</span>
                  Acesse o painel da sua Evolution API</li>
                <li className="flex gap-2"><span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">2</span>
                  Vá em <strong>Configurações → Webhook</strong> da instância</li>
                <li className="flex gap-2"><span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">3</span>
                  Cole a URL acima no campo de webhook</li>
                <li className="flex gap-2"><span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">4</span>
                  Ative o evento <strong>messages.upsert</strong></li>
                <li className="flex gap-2"><span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xs font-bold">5</span>
                  Salve a configuração e ative o agente acima</li>
              </ol>
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl text-sm text-amber-700 dark:text-amber-300">
                ⚠️ A instância Evolution API deve ser a mesma configurada em <strong>Configurações → WhatsApp</strong> do Agendix.
              </div>
            </div>
          </div>
        )}

        {/* ── ABA LEADS ── */}
        {tab === 'leads' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100">Leads captados pelo agente</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Números que iniciaram conversa com o agente</p>
            </div>
            {leads.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">
                Nenhum lead captado ainda. Ative o agente e compartilhe o número de WhatsApp.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Telefone</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Primeira mensagem</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Checkout</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Captado em</th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map(l => (
                    <tr key={l.id} className="border-t border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-6 py-4 font-mono text-gray-700 dark:text-gray-300">{l.telefone}</td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400 max-w-xs truncate">{l.primeiraMsg || '—'}</td>
                      <td className="px-6 py-4">
                        {l.sentCheckout
                          ? <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Enviado</span>
                          : <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-700 text-gray-500">—</span>}
                      </td>
                      <td className="px-6 py-4 text-gray-400 dark:text-gray-500">
                        {new Date(l.createdAt).toLocaleDateString('pt-BR')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ── ABA CONVERSAS ── */}
        {tab === 'sessoes' && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-gray-100">Conversas ativas</h2>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Sessões expiraram após 30 minutos de inatividade</p>
              </div>
              <button onClick={carregarSessoes} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Atualizar</button>
            </div>
            {sessoes.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">Nenhuma conversa ativa no momento.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50">
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Telefone</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mensagens</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Última atividade</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {sessoes.map(s => (
                    <tr key={s.id} className="border-t border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-6 py-4 font-mono text-gray-700 dark:text-gray-300">{s.id}</td>
                      <td className="px-6 py-4 text-gray-500 dark:text-gray-400">
                        {Array.isArray(s.messagesJson) ? s.messagesJson.length : '—'}
                      </td>
                      <td className="px-6 py-4 text-gray-400 dark:text-gray-500">
                        {new Date(s.lastActivity).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => resetarSessao(s.id)}
                          className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-medium">
                          Resetar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
