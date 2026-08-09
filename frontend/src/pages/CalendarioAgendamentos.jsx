import { useState, useEffect, useCallback, useRef } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';

const STATUS_COLOR = {
  marcado:    'bg-blue-100 text-blue-800 border-blue-200',
  confirmado: 'bg-green-100 text-green-800 border-green-200',
  cancelado:  'bg-red-100 text-red-500 border-red-200 line-through opacity-60',
  realizado:  'bg-gray-100 text-gray-600 border-gray-200',
};

const STATUS_OPTIONS = ['marcado', 'confirmado', 'cancelado', 'realizado'];

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho',
               'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DIAS_SEMANA = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function toISO(date) {
  return date.toISOString().split('T')[0];
}

function ultimoDiaMes(ano, mes) {
  return new Date(ano, mes + 1, 0).getDate();
}

function celulasDoMes(ano, mes) {
  const primeiroDia = new Date(ano, mes, 1).getDay();
  const totalDias   = ultimoDiaMes(ano, mes);
  const celulas = [];
  for (let i = 0; i < primeiroDia; i++) celulas.push(null);
  for (let d = 1; d <= totalDias; d++) celulas.push(d);
  while (celulas.length % 7 !== 0) celulas.push(null);
  return celulas;
}

// Sub-modal de criação de agendamento
function ModalCriar({ dataInicial, onClose, onSaved }) {
  const [form, setForm] = useState({
    nome: '',
    telefone: '',
    email: '',
    data: dataInicial || '',
    hora: '',
    tipo: '',
    status: 'marcado',
    observacoes: '',
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/agendamentos', form);
      onSaved();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm"
           onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Novo agendamento</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nome *</label>
            <input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              required placeholder="Nome do cliente" className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Telefone *</label>
              <input type="tel" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                required placeholder="(xx) xxxxx-xxxx" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="Opcional" className={inputCls} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Data *</label>
              <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                required className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Hora *</label>
              <input type="time" value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))}
                required className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tipo / Serviço</label>
            <input type="text" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
              placeholder="Ex: Consulta, Corte..." className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className={inputCls}>
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Observações</label>
            <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              rows={2} placeholder="Opcional..." className={inputCls + ' resize-none'} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium
                         text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium
                         transition-colors disabled:opacity-50">
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Sub-modal de edição de agendamento
function ModalEditar({ ag, onClose, onSaved }) {
  const [form, setForm] = useState({
    data: ag.data || '',
    hora: ag.hora || '',
    tipo: ag.tipo || '',
    status: ag.status || 'marcado',
    observacoes: ag.observacoes || '',
  });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.put(`/agendamentos/${ag.id}`, { lead_id: ag.leadId, ...form });
      onSaved();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm"
           onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Editar agendamento</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Data</label>
              <input type="date" value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))}
                required
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm
                           bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Hora</label>
              <input type="time" value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))}
                required
                className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm
                           bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Tipo / Serviço</label>
            <input type="text" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
              placeholder="Ex: Consulta, Corte..."
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Observações</label>
            <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              rows={2} placeholder="Opcional..."
              className="w-full border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-medium
                         text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium
                         transition-colors disabled:opacity-50">
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal de detalhe do dia com ações
function ModalDia({ data, agendamentos: agsIniciais, onClose, onReload }) {
  const [ags, setAgs] = useState(agsIniciais);
  const [loadingId, setLoadingId] = useState(null);
  const [editando, setEditando] = useState(null);
  const [criando, setCriando] = useState(false);

  // Sincroniza se o pai recarregar
  useEffect(() => { setAgs(agsIniciais); }, [agsIniciais]);

  const dataFmt = data ? new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  }) : '';

  async function mudarStatus(ag, novoStatus) {
    if (novoStatus === 'cancelado') {
      if (!window.confirm(`Cancelar o agendamento de ${ag.lead?.nome || ag.clienteNome || 'cliente'}?`)) return;
    }
    setLoadingId(ag.id);
    try {
      await api.put(`/agendamentos/${ag.id}`, { lead_id: ag.leadId, data: ag.data, hora: ag.hora, tipo: ag.tipo, status: novoStatus, observacoes: ag.observacoes });
      setAgs(prev => prev.map(a => a.id === ag.id ? { ...a, status: novoStatus } : a));
      onReload();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoadingId(null);
    }
  }

  function botoesAcao(ag) {
    const busy = loadingId === ag.id;
    const btn = (label, onClick, cor) => (
      <button key={label} onClick={onClick} disabled={busy || loadingId !== null}
        className={`px-2 py-0.5 rounded-lg text-[11px] font-medium transition-colors disabled:opacity-40
                    ${cor}`}>
        {busy && loadingId === ag.id ? '...' : label}
      </button>
    );

    const acoes = [];
    if (ag.status === 'marcado') {
      acoes.push(btn('Confirmar', () => mudarStatus(ag, 'confirmado'), 'bg-green-100 text-green-700 hover:bg-green-200'));
      acoes.push(btn('Cancelar',  () => mudarStatus(ag, 'cancelado'),  'bg-red-100 text-red-600 hover:bg-red-200'));
    }
    if (ag.status === 'confirmado') {
      acoes.push(btn('Realizado', () => mudarStatus(ag, 'realizado'), 'bg-gray-100 text-gray-700 hover:bg-gray-200'));
      acoes.push(btn('Cancelar',  () => mudarStatus(ag, 'cancelado'), 'bg-red-100 text-red-600 hover:bg-red-200'));
    }
    if (ag.status === 'cancelado') {
      acoes.push(btn('Reativar', () => mudarStatus(ag, 'marcado'), 'bg-blue-100 text-blue-700 hover:bg-blue-200'));
    }
    acoes.push(btn('Editar', () => setEditando(ag), 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200'));
    return acoes;
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col"
             onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 capitalize text-sm">{dataFmt}</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => setCriando(true)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Novo
              </button>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <div className="overflow-y-auto flex-1 p-5 space-y-3">
            {ags.length === 0
              ? <p className="text-sm text-gray-400 text-center py-6">Nenhum agendamento neste dia.</p>
              : [...ags].sort((a, b) => a.hora.localeCompare(b.hora)).map(ag => (
                <div key={ag.id}
                  className={`p-3 rounded-xl border text-sm ${STATUS_COLOR[ag.status] || STATUS_COLOR.marcado}`}>
                  <div className="flex items-start gap-3">
                    <span className="font-bold whitespace-nowrap">{ag.hora}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{ag.lead?.nome || ag.clienteNome || '—'}</p>
                      {(ag.servico?.nome || ag.tipo) &&
                        <p className="text-xs opacity-75 truncate">{ag.servico?.nome || ag.tipo}</p>}
                      <p className="text-xs opacity-60 capitalize">{ag.status}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {botoesAcao(ag)}
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>

      {editando && (
        <ModalEditar
          ag={editando}
          onClose={() => setEditando(null)}
          onSaved={() => { setEditando(null); onReload(); }}
        />
      )}

      {criando && (
        <ModalCriar
          dataInicial={data}
          onClose={() => setCriando(false)}
          onSaved={() => { setCriando(false); onReload(); }}
        />
      )}
    </>
  );
}

export default function CalendarioAgendamentos() {
  const hoje = new Date();
  const [offset, setOffset] = useState(0);
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [diaSelecionado, setDiaSelecionado] = useState(null);
  const [dragOverDay, setDragOverDay] = useState(null);
  const draggingAg = useRef(null);

  const ano = new Date(hoje.getFullYear(), hoje.getMonth() + offset, 1).getFullYear();
  const mes  = new Date(hoje.getFullYear(), hoje.getMonth() + offset, 1).getMonth();

  const dataInicio = `${ano}-${String(mes + 1).padStart(2, '0')}-01`;
  const dataFim    = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(ultimoDiaMes(ano, mes)).padStart(2, '0')}`;

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get(`/agendamentos?dataInicio=${dataInicio}&dataFim=${dataFim}&limit=500`);
      setAgendamentos(Array.isArray(data) ? data : data?.agendamentos || []);
    } catch {
      setAgendamentos([]);
    } finally {
      setLoading(false);
    }
  }, [dataInicio, dataFim]);

  useEffect(() => { carregar(); }, [carregar]);

  async function moverAgendamento(ag, novaData) {
    if (ag.data === novaData) return;
    try {
      await api.put(`/agendamentos/${ag.id}`, {
        lead_id: ag.leadId,
        data: novaData,
        hora: ag.hora,
        tipo: ag.tipo,
        status: ag.status,
        observacoes: ag.observacoes,
      });
      carregar();
    } catch (err) {
      alert('Erro ao mover agendamento: ' + err.message);
    }
  }

  const idx = agendamentos.reduce((acc, ag) => {
    if (!acc[ag.data]) acc[ag.data] = [];
    acc[ag.data].push(ag);
    return acc;
  }, {});

  const celulas = celulasDoMes(ano, mes);
  const agsDiaSelecionado = diaSelecionado ? (idx[diaSelecionado] || []) : [];

  const podePrev = offset > 0;
  const podeNext = offset < 11;

  return (
    <Layout title="Calendário de Agendamentos"
            subtitle={`${MESES[mes]} ${ano}`}>

      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => setOffset(o => o - 1)}
          disabled={!podePrev}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700
                     text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800
                     disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Mês anterior
        </button>

        <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          {MESES[mes]} {ano}
        </h2>

        <button
          onClick={() => setOffset(o => o + 1)}
          disabled={!podeNext}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700
                     text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800
                     disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
          Próximo mês
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4 text-xs">
        {Object.entries({ marcado: 'Marcado', confirmado: 'Confirmado', realizado: 'Realizado', cancelado: 'Cancelado' }).map(([k, v]) => (
          <span key={k} className={`px-2 py-0.5 rounded-full border font-medium ${STATUS_COLOR[k]}`}>{v}</span>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 overflow-hidden">
        <div className="grid grid-cols-7 border-b border-gray-100 dark:border-gray-800">
          {DIAS_SEMANA.map(d => (
            <div key={d} className="text-center py-3 text-xs font-semibold text-gray-500 dark:text-gray-400">{d}</div>
          ))}
        </div>

        {loading ? (
          <div className="py-24 text-center text-gray-400 text-sm">Carregando...</div>
        ) : (
          <div className="grid grid-cols-7">
            {celulas.map((dia, i) => {
              if (!dia) return (
                <div key={`vazio-${i}`}
                  className="min-h-[100px] bg-gray-50 dark:bg-gray-950/40 border-b border-r border-gray-100 dark:border-gray-800" />
              );

              const isoStr = `${ano}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
              const isHoje = isoStr === toISO(hoje);
              const ags    = idx[isoStr] || [];
              const total  = ags.length;

              const isDragOver = dragOverDay === isoStr;

              return (
                <div key={isoStr}
                  onClick={() => setDiaSelecionado(isoStr)}
                  onDragOver={e => { e.preventDefault(); setDragOverDay(isoStr); }}
                  onDragLeave={() => setDragOverDay(null)}
                  onDrop={e => {
                    e.preventDefault();
                    setDragOverDay(null);
                    if (draggingAg.current) {
                      moverAgendamento(draggingAg.current, isoStr);
                      draggingAg.current = null;
                    }
                  }}
                  className={`min-h-[100px] border-b border-r border-gray-100 dark:border-gray-800 p-1.5
                              cursor-pointer transition-colors group
                              ${isDragOver
                                ? 'bg-blue-100 dark:bg-blue-900/30 ring-2 ring-inset ring-blue-400'
                                : 'hover:bg-blue-50/40 dark:hover:bg-blue-900/10'}`}>
                  <div className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold mb-1
                    ${isHoje
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30'}`}>
                    {dia}
                  </div>
                  <div className="space-y-0.5">
                    {ags.slice(0, 3).map(ag => (
                      <div key={ag.id}
                        draggable
                        onDragStart={e => {
                          e.stopPropagation();
                          draggingAg.current = ag;
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragEnd={() => { draggingAg.current = null; setDragOverDay(null); }}
                        onClick={e => e.stopPropagation()}
                        className={`text-[10px] rounded px-1 py-0.5 border truncate leading-tight font-medium cursor-grab active:cursor-grabbing ${STATUS_COLOR[ag.status] || STATUS_COLOR.marcado}`}>
                        {ag.hora} {ag.lead?.nome || ag.clienteNome || '—'}
                      </div>
                    ))}
                    {total > 3 && (
                      <div className="text-[10px] text-gray-400 dark:text-gray-500 px-1 font-medium">
                        +{total - 3} mais
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {!loading && (
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-gray-500 dark:text-gray-400">
          <span>Total no mês: <strong className="text-gray-800 dark:text-gray-200">{agendamentos.length}</strong></span>
          <span>Marcados: <strong className="text-blue-600">{agendamentos.filter(a => a.status === 'marcado').length}</strong></span>
          <span>Confirmados: <strong className="text-green-600">{agendamentos.filter(a => a.status === 'confirmado').length}</strong></span>
          <span>Realizados: <strong className="text-gray-600">{agendamentos.filter(a => a.status === 'realizado').length}</strong></span>
        </div>
      )}

      {diaSelecionado && (
        <ModalDia
          data={diaSelecionado}
          agendamentos={agsDiaSelecionado}
          onClose={() => setDiaSelecionado(null)}
          onReload={carregar}
        />
      )}
    </Layout>
  );
}
