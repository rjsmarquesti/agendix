import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import { api } from '../services/api';

const COLUNAS = [
  { id: 'novo',        label: 'Novo',        cor: 'bg-slate-500' },
  { id: 'contato',     label: 'Contato',     cor: 'bg-blue-500' },
  { id: 'qualificado', label: 'Qualificado', cor: 'bg-indigo-500' },
  { id: 'proposta',    label: 'Proposta',    cor: 'bg-yellow-500' },
  { id: 'agendado',    label: 'Agendado',    cor: 'bg-green-500' },
  { id: 'convertido',  label: 'Convertido',  cor: 'bg-emerald-600' },
  { id: 'perdido',     label: 'Perdido',     cor: 'bg-red-500' },
];

const TIPOS_CONTATO = [
  { id: 'ligacao',    label: 'Ligação',    icon: '📞' },
  { id: 'whatsapp',   label: 'WhatsApp',   icon: '💬' },
  { id: 'email',      label: 'E-mail',     icon: '📧' },
  { id: 'visita',     label: 'Visita',     icon: '🏠' },
  { id: 'observacao', label: 'Observação', icon: '📝' },
];

function badgePriority(p) {
  const m = { urgente: 'bg-red-500/20 text-red-400', alta: 'bg-orange-500/20 text-orange-400', normal: '', baixa: 'bg-slate-500/20 text-slate-400' };
  return m[p] || '';
}

function fmtData(d) {
  if (!d) return null;
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function fmtDataHora(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function isVencido(d) {
  return d && new Date(d) < new Date();
}

// ── Card do Kanban ─────────────────────────────────────────────────────────────
function LeadCard({ lead, onClick, onDragStart }) {
  const vencido = isVencido(lead.proximoContato);
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="bg-slate-800 border border-slate-700 rounded-xl p-3 cursor-pointer hover:border-green-500/50 transition-colors space-y-1.5 select-none"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium text-sm text-white leading-tight line-clamp-1">{lead.nome}</span>
        {lead.priority && lead.priority !== 'normal' && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium whitespace-nowrap ${badgePriority(lead.priority)}`}>
            {lead.priority}
          </span>
        )}
      </div>
      {(lead.nicho || lead.subcategoria) && (
        <p className="text-xs text-slate-400 truncate">{lead.subcategoria || lead.nicho}</p>
      )}
      {lead.telefone && (
        <a
          href={`https://wa.me/55${lead.telefone.replace(/\D/g, '')}`}
          target="_blank" rel="noreferrer"
          onClick={e => e.stopPropagation()}
          className="text-xs text-green-400 hover:underline"
        >
          {lead.telefone}
        </a>
      )}
      {lead.rating > 0 && (
        <div className="flex items-center gap-1 text-xs text-yellow-400">
          ⭐ {lead.rating.toFixed(1)}
        </div>
      )}
      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
        <span>{lead.cidade || '—'}</span>
        {lead.proximoContato ? (
          <span className={vencido ? 'text-red-400 font-semibold' : 'text-slate-400'}>
            📅 {fmtData(lead.proximoContato)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

// ── Modal Registrar Contato ────────────────────────────────────────────────────
function ModalContato({ lead, onClose, onSalvo }) {
  const [tipo, setTipo] = useState('ligacao');
  const [descricao, setDescricao] = useState('');
  const [proximoContato, setProximoContato] = useState('');
  const [loading, setLoading] = useState(false);

  async function salvar() {
    setLoading(true);
    try {
      await api.post(`/prospeccao/${lead.id}/contato`, { tipo, descricao, proximoContato: proximoContato || null });
      toast.success('Contato registrado!');
      onSalvo();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao registrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-lg font-semibold text-white">Registrar contato — {lead.nome}</h3>

        <div>
          <label className="text-sm text-slate-400 mb-1.5 block">Tipo</label>
          <div className="grid grid-cols-5 gap-2">
            {TIPOS_CONTATO.map(t => (
              <button
                key={t.id}
                onClick={() => setTipo(t.id)}
                className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl text-xs transition-colors
                  ${tipo === t.id ? 'bg-green-500/20 border border-green-500 text-green-400' : 'bg-slate-800 border border-slate-700 text-slate-400 hover:border-slate-600'}`}
              >
                <span className="text-base">{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm text-slate-400 mb-1.5 block">Descrição</label>
          <textarea
            value={descricao}
            onChange={e => setDescricao(e.target.value)}
            rows={3}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-green-500"
            placeholder="O que foi conversado..."
          />
        </div>

        <div>
          <label className="text-sm text-slate-400 mb-1.5 block">Próximo contato</label>
          <input
            type="datetime-local"
            value={proximoContato}
            onChange={e => setProximoContato(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm hover:bg-slate-700">
            Cancelar
          </button>
          <button onClick={salvar} disabled={loading} className="flex-1 py-2 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-500 disabled:opacity-50">
            {loading ? 'Salvando...' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Drawer Lateral do Lead ─────────────────────────────────────────────────────
function DrawerLead({ leadId, onClose }) {
  const [lead, setLead] = useState(null);
  const [novaAtiv, setNovaAtiv] = useState({ tipo: 'observacao', descricao: '' });
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!leadId) return;
    api.get(`/prospeccao/${leadId}`)
      .then(d => setLead(d))
      .catch(() => toast.error('Erro ao carregar lead'));
  }, [leadId]);

  async function adicionarAtividade() {
    if (!novaAtiv.descricao.trim()) return;
    setSalvando(true);
    try {
      await api.post(`/prospeccao/${leadId}/atividades`, novaAtiv);
      toast.success('Atividade adicionada');
      setNovaAtiv({ tipo: 'observacao', descricao: '' });
      const updated = await api.get(`/prospeccao/${leadId}`);
      setLead(updated);
    } catch {
      toast.error('Erro ao adicionar');
    } finally {
      setSalvando(false);
    }
  }

  const tipoIcon = { ligacao: '📞', whatsapp: '💬', email: '📧', visita: '🏠', observacao: '📝' };

  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/40" onClick={onClose} />
      <div className="w-full max-w-lg bg-slate-900 border-l border-slate-700 overflow-y-auto flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-800 sticky top-0 bg-slate-900">
          <h3 className="font-semibold text-white text-lg">{lead?.nome || '...'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>

        {!lead ? (
          <div className="flex-1 flex items-center justify-center text-slate-500">Carregando...</div>
        ) : (
          <div className="p-5 space-y-6 flex-1">
            {/* Dados básicos */}
            <div className="grid grid-cols-2 gap-3 text-sm">
              {lead.telefone && (
                <div>
                  <p className="text-slate-400 text-xs mb-0.5">Telefone</p>
                  <a href={`https://wa.me/55${lead.telefone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                    className="text-green-400 hover:underline">{lead.telefone}</a>
                </div>
              )}
              {lead.email && (
                <div>
                  <p className="text-slate-400 text-xs mb-0.5">E-mail</p>
                  <p className="text-white truncate">{lead.email}</p>
                </div>
              )}
              {lead.cidade && (
                <div>
                  <p className="text-slate-400 text-xs mb-0.5">Cidade</p>
                  <p className="text-white">{lead.cidade}{lead.estado ? ` / ${lead.estado}` : ''}</p>
                </div>
              )}
              {lead.rating > 0 && (
                <div>
                  <p className="text-slate-400 text-xs mb-0.5">Avaliação</p>
                  <p className="text-yellow-400">⭐ {lead.rating.toFixed(1)}</p>
                </div>
              )}
              {lead.website && (
                <div className="col-span-2">
                  <p className="text-slate-400 text-xs mb-0.5">Website</p>
                  <a href={lead.website} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline truncate block">{lead.website}</a>
                </div>
              )}
            </div>

            {/* Resposta WA */}
            {lead.respostaWa && (
              <div className="bg-green-900/20 border border-green-700/40 rounded-lg p-3">
                <p className="text-xs text-green-400 font-semibold uppercase tracking-wide mb-1">Resposta recebida via WA</p>
                <p className="text-sm text-white whitespace-pre-wrap">{lead.respostaWa}</p>
              </div>
            )}

            {/* Ações rápidas */}
            <div className="flex flex-wrap gap-2">
              {lead.telefone && (
                <a href={`https://wa.me/55${lead.telefone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 border border-green-600/40 text-green-400 rounded-lg text-xs hover:bg-green-600/30">
                  💬 WhatsApp
                </a>
              )}
              {lead.googleMapsUrl && (
                <a href={lead.googleMapsUrl} target="_blank" rel="noreferrer"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 border border-blue-600/40 text-blue-400 rounded-lg text-xs hover:bg-blue-600/30">
                  📍 Ver no Maps
                </a>
              )}
            </div>

            {/* Histórico de agendamentos */}
            {lead.agendamentos?.length > 0 && (
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-2">Agendamentos</p>
                <div className="space-y-1">
                  {lead.agendamentos.map(ag => (
                    <div key={ag.id} className="flex items-center justify-between text-xs bg-slate-800 rounded-lg px-3 py-2">
                      <span className="text-white">{ag.data} {ag.hora}</span>
                      <span className="text-slate-400">{ag.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Histórico de atividades */}
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-3">Histórico de atividades</p>
              {lead.atividades?.length === 0 ? (
                <p className="text-sm text-slate-500">Nenhuma atividade registrada.</p>
              ) : (
                <div className="space-y-3">
                  {lead.atividades?.map(a => (
                    <div key={a.id} className="flex gap-3">
                      <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center text-sm flex-shrink-0">
                        {tipoIcon[a.tipo] || '📝'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 text-xs text-slate-400 mb-0.5">
                          <span className="text-white capitalize">{a.tipo}</span>
                          {a.user && <span>· {a.user.nome}</span>}
                          <span>· {fmtDataHora(a.data)}</span>
                        </div>
                        {a.descricao && <p className="text-sm text-slate-300">{a.descricao}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Nova atividade */}
            <div className="border-t border-slate-800 pt-4 space-y-3">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Nova atividade</p>
              <select
                value={novaAtiv.tipo}
                onChange={e => setNovaAtiv(a => ({ ...a, tipo: e.target.value }))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
              >
                {TIPOS_CONTATO.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
              </select>
              <textarea
                value={novaAtiv.descricao}
                onChange={e => setNovaAtiv(a => ({ ...a, descricao: e.target.value }))}
                rows={2}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white resize-none focus:outline-none focus:border-green-500"
                placeholder="Descrição..."
              />
              <button
                onClick={adicionarAtividade}
                disabled={salvando || !novaAtiv.descricao.trim()}
                className="w-full py-2 rounded-xl bg-green-600 text-white text-sm font-medium hover:bg-green-500 disabled:opacity-50"
              >
                {salvando ? 'Salvando...' : 'Adicionar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Aba Funil (Kanban) ─────────────────────────────────────────────────────────
function AbaFunil({ onAbrirLead }) {
  const [colunas, setColunas] = useState(null);
  const dragRef = useRef(null);

  useEffect(() => {
    carregarKanban();
  }, []);

  async function carregarKanban() {
    try {
      const data = await api.get('/prospeccao/kanban');
      setColunas(data);
    } catch {
      toast.error('Erro ao carregar funil');
    }
  }

  function onDragStart(leadId, status) {
    dragRef.current = { leadId, status };
  }

  async function onDrop(novoStatus) {
    if (!dragRef.current) return;
    const { leadId, status } = dragRef.current;
    if (status === novoStatus) return;
    dragRef.current = null;

    // Otimista
    setColunas(prev => {
      if (!prev) return prev;
      const next = { ...prev };
      const lead = next[status]?.find(l => l.id === leadId);
      if (!lead) return prev;
      next[status] = next[status].filter(l => l.id !== leadId);
      next[novoStatus] = [{ ...lead, status: novoStatus }, ...(next[novoStatus] || [])];
      return next;
    });

    try {
      await api.put(`/prospeccao/${leadId}/status`, { status: novoStatus });
    } catch {
      toast.error('Erro ao mover lead');
      carregarKanban();
    }
  }

  if (!colunas) {
    return <div className="flex items-center justify-center h-64 text-slate-500">Carregando funil...</div>;
  }

  const total = Object.values(colunas).reduce((s, arr) => s + arr.length, 0);

  return (
    <div>
      <p className="text-sm text-slate-400 mb-4">{total} leads no funil</p>
      <div className="flex gap-3 overflow-x-auto pb-4 min-h-[400px]">
        {COLUNAS.map(col => (
          <div
            key={col.id}
            onDragOver={e => e.preventDefault()}
            onDrop={() => onDrop(col.id)}
            className="flex-shrink-0 w-52 bg-slate-800/50 rounded-2xl p-3 flex flex-col gap-2"
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${col.cor}`} />
                <span className="text-xs font-semibold text-slate-300">{col.label}</span>
              </div>
              <span className="text-xs text-slate-500 bg-slate-700 px-1.5 py-0.5 rounded-full">
                {(colunas[col.id] || []).length}
              </span>
            </div>
            {(colunas[col.id] || []).map(lead => (
              <LeadCard
                key={lead.id}
                lead={lead}
                onClick={() => onAbrirLead(lead.id)}
                onDragStart={() => onDragStart(lead.id, col.id)}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Aba Follow-up ──────────────────────────────────────────────────────────────
function AbaFollowUp() {
  const [leads, setLeads] = useState(null);
  const [modalLead, setModalLead] = useState(null);

  useEffect(() => { carregar(); }, []);

  async function carregar() {
    try {
      const data = await api.get('/prospeccao/follow-up');
      setLeads(data);
    } catch {
      toast.error('Erro ao carregar follow-up');
    }
  }

  if (!leads) return <div className="flex items-center justify-center h-64 text-slate-500">Carregando...</div>;

  return (
    <div>
      <p className="text-sm text-slate-400 mb-4">{leads.length} leads aguardando contato</p>
      {leads.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-4xl mb-3">🎉</p>
          <p>Todos os follow-ups em dia!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leads.map(lead => {
            const vencido = isVencido(lead.proximoContato);
            return (
              <div key={lead.id} className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-white truncate">{lead.nome}</p>
                    <span className="text-xs text-slate-500 capitalize">{lead.status}</span>
                  </div>
                  <p className="text-sm text-slate-400 truncate">{lead.nicho || lead.cidade || '—'}</p>
                </div>
                <div className="text-right flex-shrink-0 space-y-0.5">
                  {lead.ultimoContato ? (
                    <p className="text-xs text-slate-500">Último: {fmtData(lead.ultimoContato)}</p>
                  ) : (
                    <p className="text-xs text-slate-500">Sem contato</p>
                  )}
                  {lead.proximoContato ? (
                    <p className={`text-xs font-semibold ${vencido ? 'text-red-400' : 'text-slate-400'}`}>
                      {vencido ? '⚠ ' : ''}Próx: {fmtData(lead.proximoContato)}
                    </p>
                  ) : null}
                </div>
                {lead.telefone && (
                  <a href={`https://wa.me/55${lead.telefone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                    className="text-green-400 hover:text-green-300 flex-shrink-0">💬</a>
                )}
                <button
                  onClick={() => setModalLead(lead)}
                  className="px-3 py-1.5 bg-green-600/20 border border-green-600/40 text-green-400 rounded-lg text-xs hover:bg-green-600/30 flex-shrink-0"
                >
                  Registrar
                </button>
              </div>
            );
          })}
        </div>
      )}

      {modalLead && (
        <ModalContato
          lead={modalLead}
          onClose={() => setModalLead(null)}
          onSalvo={() => { setModalLead(null); carregar(); }}
        />
      )}
    </div>
  );
}

// ── Aba Disparos ──────────────────────────────────────────────────────────────
function AbaDisparos({ onAbrirLead }) {
  const [dados, setDados] = useState(null);
  const [filtroNicho, setFiltroNicho] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [expandido, setExpandido] = useState(null);

  useEffect(() => { carregar(); }, [filtroNicho, filtroStatus]);

  async function carregar() {
    try {
      const params = new URLSearchParams();
      if (filtroNicho) params.set('nicho', filtroNicho);
      if (filtroStatus) params.set('status', filtroStatus);
      const data = await api.get(`/prospeccao/disparos?${params}`);
      setDados(data);
    } catch {
      toast.error('Erro ao carregar disparos');
    }
  }

  const STATUS_COR = {
    novo: 'text-slate-400', contato: 'text-blue-400', qualificado: 'text-indigo-400',
    proposta: 'text-yellow-400', agendado: 'text-green-400',
    convertido: 'text-emerald-400', perdido: 'text-red-400',
  };

  if (!dados) return <div className="flex items-center justify-center h-64 text-slate-500">Carregando...</div>;

  const { leads, total, totalDisparados, totalComSite } = dados;

  return (
    <div className="space-y-5">
      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total disparados', valor: totalDisparados, cor: 'text-green-400' },
          { label: 'Com website', valor: totalComSite, sub: totalDisparados ? `${Math.round(totalComSite/totalDisparados*100)}%` : '0%', cor: 'text-blue-400' },
          { label: 'Sem website', valor: totalDisparados - totalComSite, sub: totalDisparados ? `${Math.round((totalDisparados-totalComSite)/totalDisparados*100)}%` : '0%', cor: 'text-slate-400' },
        ].map(c => (
          <div key={c.label} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 text-center">
            <p className={`text-2xl font-bold ${c.cor}`}>{c.valor}</p>
            {c.sub && <p className="text-xs text-slate-500">{c.sub}</p>}
            <p className="text-xs text-slate-400 mt-1">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex gap-3 flex-wrap">
        <input
          value={filtroNicho}
          onChange={e => setFiltroNicho(e.target.value)}
          placeholder="Filtrar por nicho..."
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white w-48 focus:outline-none focus:border-green-500"
        />
        <select
          value={filtroStatus}
          onChange={e => setFiltroStatus(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-green-500"
        >
          <option value="">Todos os status</option>
          {COLUNAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <span className="text-sm text-slate-500 self-center">{total} resultado{total !== 1 ? 's' : ''}</span>
      </div>

      {/* Tabela */}
      {leads.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <p className="text-4xl mb-3">📭</p>
          <p>Nenhum disparo registrado ainda.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {leads.map(lead => (
            <div key={lead.id} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              {/* Linha principal */}
              <div
                className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-slate-700/40 transition-colors"
                onClick={() => setExpandido(expandido === lead.id ? null : lead.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={e => { e.stopPropagation(); onAbrirLead(lead.id); }}
                      className="font-medium text-white hover:text-green-400 text-sm truncate max-w-[200px]"
                    >
                      {lead.nome}
                    </button>
                    {lead.nicho && (
                      <span className="text-xs bg-slate-700 text-slate-300 px-2 py-0.5 rounded-full truncate max-w-[120px]">
                        {lead.nicho}
                      </span>
                    )}
                    <span className={`text-xs font-medium capitalize ${STATUS_COR[lead.status] || 'text-slate-400'}`}>
                      {lead.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                    {lead.cidade && <span className="text-xs text-slate-500">{lead.cidade}{lead.estado ? `/${lead.estado}` : ''}</span>}
                    {lead.rating > 0 && <span className="text-xs text-yellow-400">⭐ {lead.rating.toFixed(1)}</span>}
                  </div>
                </div>

                <div className="flex-shrink-0 text-right space-y-0.5">
                  <p className="text-xs text-slate-400">Disparado em</p>
                  <p className="text-xs text-white font-medium">{fmtDataHora(lead.updatedAt)}</p>
                </div>

                <div className="flex-shrink-0 flex items-center gap-2">
                  {lead.website ? (
                    <a
                      href={lead.website.startsWith('http') ? lead.website : `https://${lead.website}`}
                      target="_blank" rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-xs text-blue-400 hover:underline max-w-[100px] truncate block"
                      title={lead.website}
                    >
                      🌐 site
                    </a>
                  ) : (
                    <span className="text-xs text-slate-600">sem site</span>
                  )}
                  {lead.telefone && (
                    <a
                      href={`https://wa.me/${lead.telefone.replace(/\D/g,'')}`}
                      target="_blank" rel="noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="text-green-400 hover:text-green-300 text-sm"
                    >
                      💬
                    </a>
                  )}
                  <span className="text-slate-500 text-xs">{expandido === lead.id ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Mensagem expandida */}
              {expandido === lead.id && lead.mensagem && (
                <div className="border-t border-slate-700 px-4 py-3 bg-slate-900/50">
                  <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wide">Mensagem enviada</p>
                  <div className="space-y-2">
                    {lead.mensagem.split('\n\n').filter(Boolean).map((msg, i) => (
                      <div key={i} className="flex gap-2">
                        <span className="text-xs text-slate-600 w-4 flex-shrink-0 pt-0.5">{i+1}.</span>
                        <p className="text-sm text-slate-300 leading-relaxed">{msg}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {expandido === lead.id && !lead.mensagem && (
                <div className="border-t border-slate-700 px-4 py-3 bg-slate-900/50">
                  <p className="text-xs text-slate-500 italic">Mensagem não registrada.</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Aba Extrator ───────────────────────────────────────────────────────────────
function AbaExtrator() {
  const [stats, setStats] = useState(null);
  const [token, setToken] = useState(false);

  useEffect(() => {
    api.get('/prospeccao/stats')
      .then(d => setStats(d))
      .catch(() => toast.error('Erro ao carregar stats'));
  }, []);

  function copiar(texto) {
    navigator.clipboard.writeText(texto).then(() => toast.success('Copiado!'));
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Cards de stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total de leads', valor: stats.totalLeads },
            { label: 'Via extrator', valor: stats.totalGoogleMaps },
            { label: 'Importados hoje', valor: stats.inseridosHoje },
            { label: 'Convertidos', valor: stats.conversoesTotal },
          ].map(c => (
            <div key={c.label} className="bg-slate-800 border border-slate-700 rounded-2xl p-4 text-center">
              <p className="text-2xl font-bold text-white">{c.valor}</p>
              <p className="text-xs text-slate-400 mt-1">{c.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Webhook URL */}
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 space-y-4">
        <h3 className="font-semibold text-white">Como usar o extrator externo</h3>
        <p className="text-sm text-slate-400">
          Configure seu extrator (Chrome Extension, n8n ou script) para enviar dados ao webhook abaixo.
          Use o token da sua conta para autenticação.
        </p>

        <div>
          <label className="text-xs text-slate-400 mb-1 block">Webhook URL</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-slate-900 rounded-xl px-3 py-2 text-sm text-green-400 truncate">
              {stats?.webhookUrl || '...'}
            </code>
            <button onClick={() => copiar(stats?.webhookUrl || '')}
              className="px-3 py-2 bg-slate-700 rounded-xl text-xs text-slate-300 hover:bg-slate-600">
              Copiar
            </button>
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-1 block">API Token</label>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-slate-900 rounded-xl px-3 py-2 text-sm text-yellow-400 truncate">
              {stats?.apiToken ? (token ? stats.apiToken : '••••••••••••••••') : 'Não configurado'}
            </code>
            {stats?.apiToken && (
              <>
                <button onClick={() => setToken(t => !t)}
                  className="px-3 py-2 bg-slate-700 rounded-xl text-xs text-slate-300 hover:bg-slate-600">
                  {token ? 'Ocultar' : 'Ver'}
                </button>
                <button onClick={() => copiar(stats?.apiToken || '')}
                  className="px-3 py-2 bg-slate-700 rounded-xl text-xs text-slate-300 hover:bg-slate-600">
                  Copiar
                </button>
              </>
            )}
          </div>
        </div>

        <div className="bg-slate-900/60 rounded-xl p-4 text-sm text-slate-400 space-y-1.5">
          <p className="font-medium text-slate-300 text-xs uppercase tracking-wide mb-2">Formato JSON esperado</p>
          <pre className="text-xs text-green-400 overflow-x-auto whitespace-pre-wrap">{`POST ${stats?.webhookUrl || '/api/webhook/gmaps'}
Headers: { "x-api-token": "<seu-token>" }

{
  "leads": [
    {
      "nome": "Clínica Exemplo",
      "telefone": "61999990000",
      "email": "contato@clinica.com",
      "nicho": "Saúde",
      "cidade": "Brasília",
      "estado": "DF",
      "rating": 4.5,
      "website": "https://clinica.com",
      "placeId": "ChIJ...",
      "googleMapsUrl": "https://maps.google.com/..."
    }
  ]
}`}</pre>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────────
export default function Prospeccao() {
  const [aba, setAba] = useState('funil');
  const [drawerLeadId, setDrawerLeadId] = useState(null);

  const abas = [
    { id: 'funil',     label: 'Funil',     icon: '▦' },
    { id: 'followup',  label: 'Follow-up', icon: '📋' },
    { id: 'disparos',  label: 'Disparos',  icon: '📨' },
    { id: 'extrator',  label: 'Extrator',  icon: '🔌' },
  ];

  return (
    <Layout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-white">Prospecção</h1>
        </div>

        {/* Abas */}
        <div className="flex gap-1 bg-slate-800/60 p-1 rounded-xl w-fit">
          {abas.map(a => (
            <button
              key={a.id}
              onClick={() => setAba(a.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${aba === a.id ? 'bg-green-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              <span>{a.icon}</span>
              {a.label}
            </button>
          ))}
        </div>

        {aba === 'funil'    && <AbaFunil onAbrirLead={setDrawerLeadId} />}
        {aba === 'followup' && <AbaFollowUp />}
        {aba === 'disparos' && <AbaDisparos onAbrirLead={setDrawerLeadId} />}
        {aba === 'extrator' && <AbaExtrator />}
      </div>

      {drawerLeadId && (
        <DrawerLead leadId={drawerLeadId} onClose={() => setDrawerLeadId(null)} />
      )}
    </Layout>
  );
}
