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
const EMPTY_FORM      = { lead_id: '', data: hoje, hora: '', tipo: '', status: 'marcado', observacoes: '' };
const EMPTY_CRIAR     = { nome: '', telefone: '', email: '', data: hoje, hora: '', tipo: '', status: 'marcado', observacoes: '' };

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

function printHeader(tenant, titulo, meta) {
  const cor    = tenant?.corPrimaria || '#2563eb';
  const nome   = tenant?.nome || 'CRM';
  const logo   = tenant?.logo || '';
  const inicial = nome[0]?.toUpperCase() || 'C';
  const data   = new Date().toLocaleDateString('pt-BR', { dateStyle: 'full' });

  const logoHtml = logo
    ? `<img src="${logo}" alt="logo" style="height:52px;width:52px;object-fit:contain;border-radius:8px;border:1px solid #e5e7eb;padding:3px;background:#fff;">`
    : `<div style="height:52px;width:52px;border-radius:8px;background:${cor};display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;font-weight:800;flex-shrink:0;">${inicial}</div>`;

  return `
    <div style="print-color-adjust:exact;-webkit-print-color-adjust:exact;border-top:4px solid ${cor};padding-top:16px;margin-bottom:20px;">
      <table width="100%" style="border-collapse:collapse;">
        <tr>
          <td style="vertical-align:middle;width:60px;">${logoHtml}</td>
          <td style="vertical-align:middle;padding-left:14px;">
            <div style="font-size:20px;font-weight:800;color:#111;letter-spacing:-0.3px;">${nome}</div>
            <div style="font-size:13px;font-weight:700;color:${cor};margin-top:2px;">${titulo}</div>
            <div style="font-size:11px;color:#6b7280;margin-top:3px;">${meta}</div>
          </td>
          <td style="vertical-align:top;text-align:right;white-space:nowrap;">
            <div style="font-size:10px;color:#9ca3af;">Emitido em</div>
            <div style="font-size:11px;font-weight:600;color:#6b7280;">${data}</div>
          </td>
        </tr>
      </table>
      <div style="height:1px;background:${cor};opacity:0.2;margin-top:14px;"></div>
    </div>`;
}

function printFooter() {
  return `
    <div style="margin-top:24px;padding-top:10px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;font-size:10px;color:#9ca3af;">
      <span>Gerado por <strong>Agendix</strong></span>
      <span>${new Date().toLocaleString('pt-BR')}</span>
    </div>`;
}

const STATUS_BADGE_STYLE = {
  marcado:    'background:#dbeafe;color:#1d4ed8;border:1px solid #bfdbfe;',
  confirmado: 'background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;',
  cancelado:  'background:#fee2e2;color:#dc2626;border:1px solid #fecaca;',
  realizado:  'background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;',
};

function buildAgendPrintHTML(items, { filtroData, filtroStatus, filtroCanal }, tenant) {
  const ativos = [
    filtroData   && `Data: ${filtroData.split('-').reverse().join('/')}`,
    filtroStatus && `Status: ${filtroStatus}`,
    filtroCanal  && `Canal: ${filtroCanal}`,
  ].filter(Boolean).join(' · ') || 'Todos os registros';

  const rows = items.map((a, i) => {
    const statusStyle = STATUS_BADGE_STYLE[a.status] || STATUS_BADGE_STYLE.marcado;
    const bg = i % 2 === 0 ? '#ffffff' : '#f9fafb';
    return `
    <tr style="background:${bg};">
      <td style="padding:7px 8px;border-bottom:1px solid #f3f4f6;color:#9ca3af;font-size:10px;">${i + 1}</td>
      <td style="padding:7px 8px;border-bottom:1px solid #f3f4f6;">
        <strong style="color:#111;">${a.lead?.nome || '-'}</strong>
        ${a.lead?.telefone ? `<div style="color:#6b7280;font-size:10px;margin-top:1px;">${a.lead.telefone}</div>` : ''}
      </td>
      <td style="padding:7px 8px;border-bottom:1px solid #f3f4f6;white-space:nowrap;">${a.data ? a.data.split('-').reverse().join('/') : '-'}</td>
      <td style="padding:7px 8px;border-bottom:1px solid #f3f4f6;font-weight:700;color:${tenant?.corPrimaria||'#2563eb'};white-space:nowrap;">${a.hora || '-'}</td>
      <td style="padding:7px 8px;border-bottom:1px solid #f3f4f6;">${a.tipo || '-'}</td>
      <td style="padding:7px 8px;border-bottom:1px solid #f3f4f6;">
        <span style="padding:2px 7px;border-radius:20px;font-size:10px;font-weight:600;${statusStyle}">${a.status || '-'}</span>
      </td>
      <td style="padding:7px 8px;border-bottom:1px solid #f3f4f6;color:#6b7280;">${a.canalOrigem || 'manual'}</td>
      <td style="padding:7px 8px;border-bottom:1px solid #f3f4f6;color:#6b7280;max-width:160px;">${a.observacoes || '-'}</td>
    </tr>`;
  }).join('');

  return `<div style="font-family:'Segoe UI',Arial,sans-serif;color:#111;font-size:12px;line-height:1.4;">
    ${printHeader(tenant, 'Agenda de Atendimentos', `${items.length} agendamento(s) · ${ativos}`)}
    <table style="width:100%;border-collapse:collapse;font-size:11px;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:8px;border-bottom:2px solid #e5e7eb;font-weight:700;color:#374151;text-align:left;">#</th>
          <th style="padding:8px;border-bottom:2px solid #e5e7eb;font-weight:700;color:#374151;text-align:left;">Lead / Telefone</th>
          <th style="padding:8px;border-bottom:2px solid #e5e7eb;font-weight:700;color:#374151;text-align:left;">Data</th>
          <th style="padding:8px;border-bottom:2px solid #e5e7eb;font-weight:700;color:#374151;text-align:left;">Hora</th>
          <th style="padding:8px;border-bottom:2px solid #e5e7eb;font-weight:700;color:#374151;text-align:left;">Tipo</th>
          <th style="padding:8px;border-bottom:2px solid #e5e7eb;font-weight:700;color:#374151;text-align:left;">Status</th>
          <th style="padding:8px;border-bottom:2px solid #e5e7eb;font-weight:700;color:#374151;text-align:left;">Canal</th>
          <th style="padding:8px;border-bottom:2px solid #e5e7eb;font-weight:700;color:#374151;text-align:left;">Observações</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    ${printFooter()}
  </div>`;
}

// Formulário de CRIAÇÃO — usa nome+telefone (backend cria lead automaticamente)
function AgendFormCriar({ form, setForm, onSubmit, loading }) {
  const cls = "w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100";
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
          <input type="text" required value={form.nome} placeholder="Nome do cliente"
            onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className={cls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone *</label>
          <input type="tel" required value={form.telefone} placeholder="(xx) xxxxx-xxxx"
            onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} className={cls} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
        <input type="email" value={form.email} placeholder="Opcional"
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className={cls} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data *</label>
          <input type="date" required value={form.data}
            onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className={cls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hora *</label>
          <input type="time" required value={form.hora}
            onChange={e => setForm(f => ({ ...f, hora: e.target.value }))} className={cls} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
          <input type="text" value={form.tipo} placeholder="Consulta, Reunião..."
            onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} className={cls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={cls}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
        <textarea rows={3} value={form.observacoes} placeholder="Detalhes do agendamento..."
          onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
          className={cls + ' resize-none'} />
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

// Formulário de EDIÇÃO — usa lead_id (lead já existente)
function AgendForm({ form, setForm, leads, onSubmit, loading }) {
  const cls = "w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100";
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Lead *</label>
        <select required value={form.lead_id} onChange={e => setForm(f => ({ ...f, lead_id: e.target.value }))} className={cls}>
          <option value="">Selecionar lead...</option>
          {leads.map(l => <option key={l.id} value={l.id}>{l.nome}{l.telefone ? ` · ${l.telefone}` : ''}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data *</label>
          <input type="date" required value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} className={cls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Hora *</label>
          <input type="time" required value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))} className={cls} />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo</label>
          <input type="text" value={form.tipo} placeholder="Consulta, Reunião..." onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} className={cls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
          <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={cls}>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações</label>
        <textarea rows={3} value={form.observacoes} placeholder="Detalhes do agendamento..."
          onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
          className={cls + ' resize-none'} />
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
    }).catch(e => console.error('[Agendamentos] agenda config:', e.message));
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
      .catch(e => console.error('[Agendamentos] leads:', e.message));
  }, []);

  function openCreate() {
    setForm({ ...EMPTY_CRIAR, data: filtroData || hoje });
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
    frame.innerHTML = buildAgendPrintHTML(itensParaImprimir, { filtroData, filtroStatus, filtroCanal }, tenant);
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

      {/* Header de impressão (window.print sem seleção) */}
      <div className="print-only" ref={printHeaderRef}>
        <div dangerouslySetInnerHTML={{ __html: printHeader(tenant, 'Agenda de Atendimentos',
          `${items.length} agendamento(s) · ${filtroData ? `Data: ${formatDate(filtroData)}` : 'Todos os períodos'}`) }} />
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
        {editId
          ? <AgendForm form={form} setForm={setForm} leads={leads} onSubmit={handleSubmit} loading={loading} />
          : <AgendFormCriar form={form} setForm={setForm} onSubmit={handleSubmit} loading={loading} />
        }
      </Modal>
    </Layout>
  );
}
