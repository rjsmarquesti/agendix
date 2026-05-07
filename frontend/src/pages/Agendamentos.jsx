import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import { BadgeAgend } from '../components/Badge';
import AgendaCalendario from '../components/AgendaCalendario';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const STATUS_OPTIONS = ['marcado', 'confirmado', 'cancelado', 'realizado'];
const CANAL_OPTIONS  = ['manual', 'web', 'whatsapp'];
const hoje = new Date().toISOString().split('T')[0];
const EMPTY_FORM = { lead_id: '', data: hoje, hora: '', tipo: '', status: 'marcado', observacoes: '' };

// Badge de canal de origem
const CANAL_STYLE = {
  manual:    { bg: 'bg-gray-100',   text: 'text-gray-600',   label: 'Manual',    icon: '👤' },
  web:       { bg: 'bg-blue-100',   text: 'text-blue-700',   label: 'Web',       icon: '🌐' },
  whatsapp:  { bg: 'bg-green-100',  text: 'text-green-700',  label: 'WhatsApp',  icon: '💬' },
};

function BadgeCanal({ canal }) {
  const s = CANAL_STYLE[canal] || CANAL_STYLE.manual;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
      <span>{s.icon}</span>{s.label}
    </span>
  );
}

function buildAgendPrintHTML(items, { filtroData, filtroStatus, filtroCanal }, tenantNome) {
  const ativos = [
    filtroData   && `Data: ${filtroData.split('-').reverse().join('/')}`,
    filtroStatus && `Status: ${filtroStatus}`,
    filtroCanal  && `Canal: ${filtroCanal}`,
  ].filter(Boolean).join(' · ') || 'Sem filtros ativos';

  const rows = items.map((a, i) => `
    <tr style="border-bottom:1px solid #e5e7eb;">
      <td style="padding:6px 8px;">${i + 1}</td>
      <td style="padding:6px 8px;"><strong>${a.lead?.nome || '-'}</strong>${a.lead?.telefone ? `<br><small style="color:#6b7280;">${a.lead.telefone}</small>` : ''}</td>
      <td style="padding:6px 8px;">${a.data ? a.data.split('-').reverse().join('/') : '-'}</td>
      <td style="padding:6px 8px;font-weight:600;color:#2563eb;">${a.hora || '-'}</td>
      <td style="padding:6px 8px;">${a.tipo || '-'}</td>
      <td style="padding:6px 8px;">${a.status || '-'}</td>
      <td style="padding:6px 8px;">${a.canalOrigem || 'manual'}</td>
      <td style="padding:6px 8px;max-width:180px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;">${a.observacoes || '-'}</td>
    </tr>`).join('');

  return `<div style="font-family:sans-serif;color:#111;font-size:12px;">
    <div style="border-bottom:2px solid #e5e7eb;padding-bottom:10px;margin-bottom:14px;">
      <div style="font-weight:700;font-size:17px;">${tenantNome || 'CRM'}</div>
      <div style="font-weight:600;font-size:13px;margin-top:2px;">Agenda de Atendimentos</div>
      <div style="color:#6b7280;font-size:11px;margin-top:2px;">
        ${new Date().toLocaleDateString('pt-BR', { dateStyle: 'full' })} · ${items.length} agendamento(s) · ${ativos}
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:11px;">
      <thead><tr style="background:#f9fafb;text-align:left;">
        <th style="padding:6px 8px;border-bottom:2px solid #e5e7eb;">#</th>
        <th style="padding:6px 8px;border-bottom:2px solid #e5e7eb;">Lead / Telefone</th>
        <th style="padding:6px 8px;border-bottom:2px solid #e5e7eb;">Data</th>
        <th style="padding:6px 8px;border-bottom:2px solid #e5e7eb;">Hora</th>
        <th style="padding:6px 8px;border-bottom:2px solid #e5e7eb;">Tipo</th>
        <th style="padding:6px 8px;border-bottom:2px solid #e5e7eb;">Status</th>
        <th style="padding:6px 8px;border-bottom:2px solid #e5e7eb;">Canal</th>
        <th style="padding:6px 8px;border-bottom:2px solid #e5e7eb;">Observações</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>`;
}

function AgendForm({ form, setForm, leads, onSubmit, loading }) {
  const inp = (id, label, type, extra = {}) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} value={form[id]} onChange={e => setForm(f => ({ ...f, [id]: e.target.value }))}
        className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" {...extra} />
    </div>
  );

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lead *</label>
        <select required value={form.lead_id} onChange={e => setForm(f => ({ ...f, lead_id: e.target.value }))}
          className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
          <option value="">Selecionar lead...</option>
          {leads.map(l => <option key={l.id} value={l.id}>{l.nome}{l.telefone ? ` · ${l.telefone}` : ''}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {inp('data', 'Data *', 'date', { required: true })}
        {inp('hora', 'Hora *', 'time', { required: true })}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {inp('tipo', 'Tipo', 'text', { placeholder: 'Consulta, Reunião...' })}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
            className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
        <textarea rows={3} value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
          className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none"
          placeholder="Detalhes do agendamento..." />
      </div>
      <div className="flex justify-end pt-2">
        <button type="submit" disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm">
          {loading ? 'Salvando...' : 'Salvar Agendamento'}
        </button>
      </div>
    </form>
  );
}

function formatDate(s) {
  if (!s) return '-';
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

const STATUS_COLOR_MOBILE = {
  marcado:   'bg-blue-100 text-blue-700',
  confirmado:'bg-green-100 text-green-700',
  cancelado: 'bg-red-100 text-red-700',
  realizado: 'bg-gray-100 text-gray-600',
};

function getSegunda(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  d.setHours(0, 0, 0, 0);
  return d;
}

function dataISO(date) { return date.toISOString().split('T')[0]; }

export default function Agendamentos() {
  const [items, setItems]               = useState([]);
  const [leads, setLeads]               = useState([]);
  const [filtroData, setFiltroData]     = useState(hoje);
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroCanal, setFiltroCanal]   = useState('');
  const [modalOpen, setModalOpen]       = useState(false);
  const [editId, setEditId]             = useState(null);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [loading, setLoading]           = useState(false);
  const [viewMode, setViewMode]         = useState('lista');
  const [semanaInicio, setSemanaInicio] = useState(() => getSegunda(new Date()));
  const [agendaConfig, setAgendaConfig] = useState({ horarioInicio: '08:00', horarioFim: '18:00', diasUteis: '1,2,3,4,5' });
  const [selecionados, setSelecionados] = useState(new Set());
  const tableRef       = useRef(null);
  const printHeaderRef = useRef(null);
  const { tenant } = useAuth();

  const todosNaPaginaSelecionados = items.length > 0 && items.every(a => selecionados.has(a.id));
  const algumSelecionado          = selecionados.size > 0;
  const itensParaImprimir         = algumSelecionado ? items.filter(a => selecionados.has(a.id)) : items;

  const semanaFim = useMemo(() => {
    const d = new Date(semanaInicio);
    d.setDate(d.getDate() + 6);
    return d;
  }, [semanaInicio]);

  const semanaLabel = useMemo(() => {
    const opts = { day: '2-digit', month: 'short' };
    return `${semanaInicio.toLocaleDateString('pt-BR', opts)} – ${semanaFim.toLocaleDateString('pt-BR', opts)}`;
  }, [semanaInicio, semanaFim]);

  useEffect(() => {
    api.get('/settings/agenda').then(d => {
      const c = d.config;
      setAgendaConfig({ horarioInicio: c.horarioInicio, horarioFim: c.horarioFim, diasUteis: c.diasUteis });
    }).catch(() => {});
  }, []);

  const loadItems = useCallback(async () => {
    try {
      const params = {};
      if (viewMode === 'semana') {
        params.dataInicio = dataISO(semanaInicio);
        params.dataFim    = dataISO(semanaFim);
      } else {
        if (filtroData)   params.data   = filtroData;
        if (filtroStatus) params.status = filtroStatus;
        if (filtroCanal)  params.canal  = filtroCanal;
      }
      const data = await api.get('/agendamentos', params);
      setItems(data.agendamentos);
      setSelecionados(new Set());
    } catch (err) { toast.error(err.message); }
  }, [filtroData, filtroStatus, filtroCanal, viewMode, semanaInicio, semanaFim]);

  useEffect(() => { loadItems(); }, [loadItems]);

  useEffect(() => {
    api.get('/leads', { limit: 200 })
      .then(d => setLeads(d.leads))
      .catch(() => {});
  }, []);

  function openCreate() {
    setForm({ ...EMPTY_FORM, data: filtroData || hoje });
    setEditId(null);
    setModalOpen(true);
  }

  async function openEdit(id) {
    try {
      const data = await api.get(`/agendamentos/${id}`);
      const a = data.agendamento;
      setForm({ lead_id: a.leadId, data: a.data, hora: a.hora, tipo: a.tipo || '', status: a.status, observacoes: a.observacoes || '' });
      setEditId(id);
      setModalOpen(true);
    } catch (err) { toast.error(err.message); }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      if (editId) {
        await api.put(`/agendamentos/${editId}`, form);
        toast.success('Agendamento atualizado!');
      } else {
        await api.post('/agendamentos', form);
        toast.success('Agendamento criado!');
      }
      setModalOpen(false);
      loadItems();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Remover este agendamento?')) return;
    try {
      await api.delete(`/agendamentos/${id}`);
      toast.success('Removido');
      loadItems();
    } catch (err) { toast.error(err.message); }
  }

  function toggleItem(id) {
    setSelecionados(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleTodos() {
    setSelecionados(todosNaPaginaSelecionados ? new Set() : new Set(items.map(a => a.id)));
  }

  function imprimirPDF() {
    if (!algumSelecionado) { window.print(); return; }

    if (printHeaderRef.current) printHeaderRef.current.classList.add('no-print');
    if (tableRef.current)       tableRef.current.classList.add('no-print');

    const prev = document.getElementById('__print_frame__');
    if (prev) prev.remove();

    const frame = document.createElement('div');
    frame.id = '__print_frame__';
    frame.className = 'print-only';
    frame.innerHTML = buildAgendPrintHTML(itensParaImprimir, { filtroData, filtroStatus, filtroCanal }, tenant?.nome);
    document.body.appendChild(frame);

    window.print();

    window.addEventListener('afterprint', () => {
      frame.remove();
      if (tableRef.current)       tableRef.current.classList.remove('no-print');
      if (printHeaderRef.current) printHeaderRef.current.classList.remove('no-print');
    }, { once: true });
  }

  const tituloData = filtroData
    ? new Date(filtroData + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })
    : 'Todos os dias';

  // Contadores por canal para exibir nos filtros
  const totalPorCanal = items.reduce((acc, a) => {
    const c = a.canalOrigem || 'manual';
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {});

  return (
    <Layout title="Agendamentos" subtitle="Controle sua agenda de atendimentos">

      {/* Header de impressão */}
      <div className="print-only" ref={printHeaderRef}>
        <div style={{ borderBottom: '2px solid #e5e7eb', paddingBottom: 12, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 18 }}>{tenant?.nome || 'CRM Divulga BR'}</div>
          <div style={{ fontWeight: 600, fontSize: 14, marginTop: 4 }}>Agenda de Atendimentos</div>
          <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>
            {filtroData ? `Data: ${formatDate(filtroData)}` : 'Todos os períodos'} · Emitido em {new Date().toLocaleDateString('pt-BR')}
          </div>
        </div>
      </div>

      {/* Toggle de visualização */}
      <div className="flex items-center gap-2 mb-4 no-print">
        <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 gap-1">
          <button onClick={() => setViewMode('lista')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${viewMode === 'lista' ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            ☰ Lista
          </button>
          <button onClick={() => setViewMode('semana')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${viewMode === 'semana' ? 'bg-white dark:bg-gray-700 shadow text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
            📅 Semana
          </button>
        </div>
        {viewMode === 'semana' && (
          <div className="flex items-center gap-2">
            <button onClick={() => setSemanaInicio(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; })}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-gray-900">‹</button>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{semanaLabel}</span>
            <button onClick={() => setSemanaInicio(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; })}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-gray-900">›</button>
            <button onClick={() => setSemanaInicio(getSegunda(new Date()))}
              className="px-3 py-1.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 bg-white dark:bg-gray-900">Hoje</button>
          </div>
        )}
      </div>

      {/* Toolbar */}
      {viewMode === 'lista' && (
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-3 mb-4 no-print">
        <div className="flex gap-2 flex-wrap">
          <input type="date" value={filtroData} onChange={e => setFiltroData(e.target.value)}
            className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-full sm:w-auto" />
          <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            <option value="">Todos os status</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
          <select value={filtroCanal} onChange={e => setFiltroCanal(e.target.value)}
            className="flex-1 sm:flex-none px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
            <option value="">Todos os canais</option>
            {CANAL_OPTIONS.map(c => (
              <option key={c} value={c}>{CANAL_STYLE[c].icon} {CANAL_STYLE[c].label}</option>
            ))}
          </select>
          <button onClick={() => { setFiltroData(''); setFiltroStatus(''); setFiltroCanal(''); }}
            className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition bg-white dark:bg-gray-900">
            Limpar
          </button>
        </div>
        <div className="flex gap-2 sm:ml-auto">
          <button onClick={imprimirPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 text-sm font-medium transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            {algumSelecionado ? `PDF (${selecionados.size})` : 'PDF'}
          </button>
          <button onClick={openCreate}
            className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-xl transition text-sm flex items-center justify-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Novo
          </button>
        </div>
      </div>
      )}

      {/* Grade de semana */}
      {viewMode === 'semana' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden mb-4">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Semana de {semanaLabel}</span>
            <button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-1.5 rounded-xl transition text-xs">+ Novo</button>
          </div>
          <AgendaCalendario
            agendamentos={items}
            semanaInicio={semanaInicio}
            diasUteis={agendaConfig.diasUteis}
            horarioInicio={agendaConfig.horarioInicio}
            horarioFim={agendaConfig.horarioFim}
            onSlotClick={({ data, hora }) => { setForm(f => ({ ...f, data, hora })); setEditId(null); setModalOpen(true); }}
            onAgendClick={ag => openEdit(ag.id)}
          />
        </div>
      )}

      {viewMode === 'lista' && (
      <>
      {/* Barra de seleção */}
      {algumSelecionado && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 mb-4 no-print">
          <span className="text-sm text-blue-700 font-medium">
            {selecionados.size} agendamento(s) selecionado(s)
          </span>
          <button onClick={() => setSelecionados(new Set())}
            className="text-xs text-blue-500 hover:text-blue-700 underline">
            Limpar seleção
          </button>
        </div>
      )}

      {/* Pills de contagem por canal */}
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5 no-print">
          {CANAL_OPTIONS.filter(c => totalPorCanal[c]).map(c => (
            <button key={c} onClick={() => setFiltroCanal(filtroCanal === c ? '' : c)}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition
                ${filtroCanal === c
                  ? `${CANAL_STYLE[c].bg} ${CANAL_STYLE[c].text} border-current`
                  : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}>
              <span>{CANAL_STYLE[c].icon}</span>
              {CANAL_STYLE[c].label}
              <span className="ml-0.5 font-bold">{totalPorCanal[c]}</span>
            </button>
          ))}
        </div>
      )}

      {/* Título da data (mobile) */}
      {filtroData && (
        <p className="md:hidden text-sm font-medium text-gray-700 mb-3 capitalize no-print">{tituloData}</p>
      )}

      {/* Cards mobile */}
      <div className="md:hidden space-y-3 no-print">
        {items.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-8 text-center text-gray-400 dark:text-gray-500">
            Nenhum agendamento encontrado
          </div>
        ) : items.map(a => (
          <div key={a.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-start gap-2">
                <input type="checkbox"
                  checked={selecionados.has(a.id)}
                  onChange={() => toggleItem(a.id)}
                  className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer flex-shrink-0" />
                <div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{a.lead.nome}</div>
                  {a.lead.telefone && <div className="text-xs text-gray-500 dark:text-gray-400">{a.lead.telefone}</div>}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => openEdit(a.id)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button onClick={() => handleDelete(a.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-3 text-sm mb-2">
              <span className="font-bold text-blue-600 text-lg">{a.hora}</span>
              <span className="text-gray-500">{formatDate(a.data)}</span>
              {a.tipo && <span className="text-gray-500">· {a.tipo}</span>}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLOR_MOBILE[a.status] || ''}`}>{a.status}</span>
              <BadgeCanal canal={a.canalOrigem || 'manual'} />
            </div>
            {a.observacoes && <p className="text-xs text-gray-400 mt-2 line-clamp-2">{a.observacoes}</p>}
          </div>
        ))}
      </div>

      {/* Tabela desktop + impressão */}
      <div ref={tableRef} className="hidden md:block bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider bg-gray-50 dark:bg-gray-700">
                <th className="px-3 py-3 w-10 no-print">
                  <input type="checkbox"
                    checked={todosNaPaginaSelecionados}
                    onChange={toggleTodos}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                </th>
                <th className="px-6 py-3">Lead</th>
                <th className="px-6 py-3">Data</th>
                <th className="px-6 py-3">Hora</th>
                <th className="px-6 py-3">Tipo</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3">Canal</th>
                <th className="px-6 py-3">Observações</th>
                <th className="px-6 py-3 no-print">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-12 text-center text-gray-400">Nenhum agendamento encontrado</td></tr>
              ) : items.map(a => (
                <tr key={a.id} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-3 py-4 no-print">
                    <input type="checkbox"
                      checked={selecionados.has(a.id)}
                      onChange={() => toggleItem(a.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{a.lead.nome}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">{a.lead.telefone || '-'}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{formatDate(a.data)}</td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-blue-600">{a.hora}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300">{a.tipo || '-'}</td>
                  <td className="px-6 py-4"><BadgeAgend status={a.status} /></td>
                  <td className="px-6 py-4"><BadgeCanal canal={a.canalOrigem || 'manual'} /></td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">{a.observacoes || '-'}</td>
                  <td className="px-6 py-4 no-print">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(a.id)}
                        className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(a.id)}
                        className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
      </>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
        title={editId ? 'Editar Agendamento' : 'Novo Agendamento'}>
        <AgendForm form={form} setForm={setForm} leads={leads} onSubmit={handleSubmit} loading={loading} />
      </Modal>
    </Layout>
  );
}
