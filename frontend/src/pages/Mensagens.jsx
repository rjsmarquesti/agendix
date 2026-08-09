import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const BADGE_MEIO = {
  email:     'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  whatsapp:  'bg-green-500/15 text-green-400 border border-green-500/30',
};
const BADGE_ORIGEM = {
  manual:      'bg-slate-500/20 text-slate-300 border border-slate-500/30',
  lembrete:    'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30',
  confirmacao: 'bg-green-500/15 text-green-400 border border-green-500/30',
  agente_ia:   'bg-purple-500/15 text-purple-400 border border-purple-500/30',
  sistema:     'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  ativacao:    'bg-cyan-500/15 text-cyan-400 border border-cyan-500/30',
  reset_senha: 'bg-orange-500/15 text-orange-400 border border-orange-500/30',
};
const LABEL_ORIGEM = {
  manual: 'Manual', lembrete: 'Lembrete', confirmacao: 'Confirmação',
  agente_ia: 'Agente IA', sistema: 'Sistema', ativacao: 'Ativação', reset_senha: 'Reset Senha',
};
const BADGE_STATUS = {
  enviado: 'bg-green-500/15 text-green-400',
  erro:    'bg-red-500/15 text-red-400',
  pendente:'bg-yellow-500/15 text-yellow-400',
};

function fmt(dt) {
  if (!dt) return '—';
  const d = new Date(dt);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function Mensagens() {
  const { tenant } = useAuth();

  // ── Envio ──────────────────────────────────────────────────────────────────
  const [leadBusca,   setLeadBusca]   = useState('');
  const [leadSel,     setLeadSel]     = useState(null);
  const [meio,        setMeio]        = useState('email');
  const [assunto,     setAssunto]     = useState('');
  const [corpo,       setCorpo]       = useState('');
  const [enviando,    setEnviando]    = useState(false);

  // ── Histórico ──────────────────────────────────────────────────────────────
  const [logs,        setLogs]        = useState([]);
  const [total,       setTotal]       = useState(0);
  const [paginas,     setPaginas]     = useState(1);
  const [pagAtual,    setPagAtual]    = useState(1);
  const [fMeio,       setFMeio]       = useState('');
  const [fOrigem,     setFOrigem]     = useState('');
  const [fDe,         setFDe]         = useState('');
  const [fAte,        setFAte]        = useState('');
  const [modalLog,    setModalLog]    = useState(null);
  const [carregando,  setCarregando]  = useState(false);

  const temEmail = !!tenant?.smtpUser;
  const temWA    = !!tenant?.evolutionInstance;

  useEffect(() => {
    if (!temEmail && temWA) setMeio('whatsapp');
    else if (temEmail && !temWA) setMeio('email');
  }, [temEmail, temWA]);

  // Carrega todos os leads ao montar; filtra localmente pelo input
  const [todosLeads, setTodosLeads] = useState([]);
  useEffect(() => {
    api.get('/leads?limit=500')
      .then(d => setTodosLeads(d.leads || d || []))
      .catch(() => {});
  }, []);

  const leadsFiltrados = todosLeads.filter(l => {
    if (!leadBusca) return true;
    const q = leadBusca.toLowerCase();
    return (l.nome || '').toLowerCase().includes(q) ||
           (l.email || '').toLowerCase().includes(q) ||
           (l.telefone || '').includes(q);
  });

  const carregarLogs = useCallback(async (pag = 1) => {
    setCarregando(true);
    try {
      const params = new URLSearchParams({ page: pag });
      if (fMeio)   params.set('meio',   fMeio);
      if (fOrigem) params.set('origem', fOrigem);
      if (fDe)     params.set('de',     fDe);
      if (fAte)    params.set('ate',    fAte);
      const d = await api.get(`/mensagens?${params}`);
      setLogs(d.logs);
      setTotal(d.total);
      setPaginas(d.paginas);
      setPagAtual(pag);
    } catch { toast.error('Erro ao carregar histórico.'); }
    finally { setCarregando(false); }
  }, [fMeio, fOrigem, fDe, fAte]);

  useEffect(() => { carregarLogs(1); }, [carregarLogs]);

  async function enviar() {
    if (!leadSel)  return toast.error('Selecione um lead.');
    if (!corpo.trim()) return toast.error('Corpo da mensagem é obrigatório.');
    if (meio === 'email' && !temEmail) return toast.error('SMTP não configurado.');
    if (meio === 'whatsapp' && !temWA) return toast.error('WhatsApp não configurado.');
    setEnviando(true);
    try {
      await api.post('/mensagens/enviar', {
        leadId: leadSel.id, meio,
        assunto: meio === 'email' ? assunto : undefined,
        corpo,
      });
      toast.success('Mensagem enviada!');
      setLeadSel(null); setLeadBusca(''); setAssunto(''); setCorpo('');
      carregarLogs(1);
    } catch (e) { toast.error(e.message || 'Erro ao enviar.'); }
    finally { setEnviando(false); }
  }

  return (
    <Layout title="Mensagens" subtitle="Envio e histórico de comunicações">
      {/* ── Novo Envio ── */}
      <div className="card mb-6">
        <h2 className="text-base font-semibold mb-4" style={{ color: 'var(--tx)' }}>Novo Envio</h2>

        {/* Lead */}
        <div className="mb-3 relative">
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--mt)' }}>Lead / Cliente</label>
          {leadSel ? (
            <div className="flex items-center gap-2 p-2 rounded-lg border" style={{ background: 'var(--surface)', borderColor: 'var(--bd)' }}>
              <span className="text-sm flex-1" style={{ color: 'var(--tx)' }}>{leadSel.nome} — {leadSel.email || leadSel.telefone}</span>
              <button onClick={() => { setLeadSel(null); setLeadBusca(''); }} className="text-xs" style={{ color: 'var(--mt)' }}>✕</button>
            </div>
          ) : (
            <>
              <input
                value={leadBusca}
                onChange={e => setLeadBusca(e.target.value)}
                placeholder="Filtrar por nome, e-mail ou telefone..."
                className="w-full rounded-lg border px-3 py-2 text-sm outline-none mb-1"
                style={{ background: 'var(--surface)', borderColor: 'var(--bd)', color: 'var(--tx)' }}
              />
              <div className="rounded-lg border overflow-y-auto" style={{ background: 'var(--surface)', borderColor: 'var(--bd)', maxHeight: '180px' }}>
                {leadsFiltrados.length === 0 ? (
                  <p className="text-xs px-3 py-2" style={{ color: 'var(--mt)' }}>
                    {todosLeads.length === 0 ? 'Carregando...' : 'Nenhum lead encontrado.'}
                  </p>
                ) : leadsFiltrados.map(l => (
                  <button key={l.id} onClick={() => { setLeadSel(l); setLeadBusca(''); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 transition border-b last:border-0"
                    style={{ color: 'var(--tx)', borderColor: 'var(--bd)' }}>
                    <span className="font-medium">{l.nome}</span>
                    <span className="ml-2 text-xs" style={{ color: 'var(--mt)' }}>{l.email || ''}{l.email && l.telefone ? ' · ' : ''}{l.telefone || ''}</span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Meio */}
        <div className="mb-3">
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--mt)' }}>Canal</label>
          <div className="flex gap-2">
            {[
              { val: 'email',    label: 'E-mail',    ok: temEmail },
              { val: 'whatsapp', label: 'WhatsApp',  ok: temWA    },
            ].map(opt => (
              <button key={opt.val}
                disabled={!opt.ok}
                onClick={() => setMeio(opt.val)}
                title={!opt.ok ? (opt.val === 'email' ? 'Configure SMTP em Configurações' : 'Configure WhatsApp em Configurações') : ''}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition ${meio === opt.val ? 'border-[var(--g)] text-[var(--g)] bg-[var(--g)]/10' : 'border-transparent text-[var(--mt)] bg-white/5'} ${!opt.ok ? 'opacity-40 cursor-not-allowed' : 'hover:bg-white/8 cursor-pointer'}`}>
                {opt.label} {!opt.ok && '⚠'}
              </button>
            ))}
          </div>
        </div>

        {/* Assunto (email) */}
        {meio === 'email' && (
          <div className="mb-3">
            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--mt)' }}>Assunto</label>
            <input value={assunto} onChange={e => setAssunto(e.target.value)}
              placeholder="Assunto do e-mail"
              className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
              style={{ background: 'var(--surface)', borderColor: 'var(--bd)', color: 'var(--tx)' }} />
          </div>
        )}

        {/* Corpo */}
        <div className="mb-4">
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--mt)' }}>
            {meio === 'email' ? 'Mensagem (HTML permitido)' : 'Mensagem'}
          </label>
          <textarea value={corpo} onChange={e => setCorpo(e.target.value)} rows={5}
            placeholder="Digite a mensagem..."
            className="w-full rounded-lg border px-3 py-2 text-sm outline-none resize-y font-mono"
            style={{ background: 'var(--surface)', borderColor: 'var(--bd)', color: 'var(--tx)' }} />
        </div>

        <button onClick={enviar} disabled={enviando}
          className="px-5 py-2 rounded-lg text-sm font-semibold transition"
          style={{ background: 'var(--g)', color: '#08080C', opacity: enviando ? 0.7 : 1, cursor: enviando ? 'wait' : 'pointer' }}>
          {enviando ? 'Enviando...' : 'Enviar mensagem'}
        </button>
      </div>

      {/* ── Histórico ── */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h2 className="text-base font-semibold flex-1" style={{ color: 'var(--tx)' }}>Histórico</h2>
          <select value={fMeio} onChange={e => setFMeio(e.target.value)}
            className="rounded-lg border px-3 py-1.5 text-sm outline-none"
            style={{ background: 'var(--surface)', borderColor: 'var(--bd)', color: 'var(--tx)' }}>
            <option value="">Todos os canais</option>
            <option value="email">E-mail</option>
            <option value="whatsapp">WhatsApp</option>
          </select>
          <select value={fOrigem} onChange={e => setFOrigem(e.target.value)}
            className="rounded-lg border px-3 py-1.5 text-sm outline-none"
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
            className="rounded-lg border px-3 py-1.5 text-sm outline-none"
            style={{ background: 'var(--surface)', borderColor: 'var(--bd)', color: 'var(--tx)' }} />
          <input type="date" value={fAte} onChange={e => setFAte(e.target.value)}
            className="rounded-lg border px-3 py-1.5 text-sm outline-none"
            style={{ background: 'var(--surface)', borderColor: 'var(--bd)', color: 'var(--tx)' }} />
        </div>

        <p className="text-xs mb-3" style={{ color: 'var(--mt)' }}>{total} registro{total !== 1 ? 's' : ''}</p>

        {carregando ? (
          <div className="text-center py-10 text-sm" style={{ color: 'var(--mt)' }}>Carregando...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-10 text-sm" style={{ color: 'var(--mt)' }}>Nenhuma mensagem encontrada.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--bd)' }}>
                  {['Data/Hora','Lead','Para','Canal','Assunto','Origem','Status'].map(h => (
                    <th key={h} className="text-left py-2 px-3 text-xs font-semibold" style={{ color: 'var(--mt)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id} onClick={() => setModalLog(l)}
                    className="cursor-pointer transition hover:bg-white/3"
                    style={{ borderBottom: '1px solid var(--bd)' }}>
                    <td className="py-2.5 px-3 whitespace-nowrap text-xs" style={{ color: 'var(--mt)' }}>{fmt(l.criadoEm)}</td>
                    <td className="py-2.5 px-3 text-xs" style={{ color: 'var(--tx)' }}>{l.lead?.nome || '—'}</td>
                    <td className="py-2.5 px-3 text-xs font-mono" style={{ color: 'var(--mt)' }}>{l.para}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${BADGE_MEIO[l.meio] || ''}`}>{l.meio}</span>
                    </td>
                    <td className="py-2.5 px-3 text-xs max-w-[140px] truncate" style={{ color: 'var(--tx)' }}>{l.assunto || '—'}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${BADGE_ORIGEM[l.origem] || 'text-gray-400'}`}>{LABEL_ORIGEM[l.origem] || l.origem}</span>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${BADGE_STATUS[l.status] || ''}`}>{l.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginação */}
        {paginas > 1 && (
          <div className="flex justify-center gap-2 mt-4">
            {Array.from({ length: paginas }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => carregarLogs(p)}
                className={`w-8 h-8 rounded-lg text-sm font-medium transition ${p === pagAtual ? 'bg-[var(--g)] text-[#08080C]' : 'bg-white/5 text-[var(--mt)] hover:bg-white/10'}`}>
                {p}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Modal Corpo ── */}
      {modalLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setModalLog(null)}>
          <div className="rounded-xl border max-w-2xl w-full max-h-[80vh] flex flex-col"
            style={{ background: 'var(--surface)', borderColor: 'var(--bd)' }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--bd)' }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--tx)' }}>
                  {modalLog.assunto || 'Mensagem'}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--mt)' }}>
                  {fmt(modalLog.criadoEm)} · Para: {modalLog.para} · {LABEL_ORIGEM[modalLog.origem] || modalLog.origem}
                </p>
              </div>
              <button onClick={() => setModalLog(null)} className="text-lg leading-none" style={{ color: 'var(--mt)' }}>✕</button>
            </div>
            <div className="overflow-y-auto p-4 flex-1">
              {modalLog.meio === 'email' ? (
                <iframe srcDoc={modalLog.corpo} className="w-full h-96 rounded-lg border"
                  style={{ borderColor: 'var(--bd)', background: '#fff' }} title="corpo email" />
              ) : (
                <pre className="text-sm whitespace-pre-wrap" style={{ color: 'var(--tx)', fontFamily: 'inherit' }}>{modalLog.corpo}</pre>
              )}
              {modalLog.erroMsg && (
                <p className="mt-3 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-2">
                  Erro: {modalLog.erroMsg}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
