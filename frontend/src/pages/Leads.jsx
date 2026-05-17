import { useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import { BadgeLead, BadgePriority, BadgeFonte } from '../components/Badge';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const STATUS_OPTIONS = ['novo','contato','qualificado','proposta','agendado','convertido','perdido'];
const FONTE_OPTIONS  = ['manual','google_maps','csv_import','api'];
const PRIORITY_OPTIONS = ['baixa','normal','alta','urgente'];
const ESTADOS_BR = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG',
  'PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
];

const STATUS_LABEL = {
  novo:'Novo', contato:'Contato', qualificado:'Qualificado', proposta:'Proposta',
  agendado:'Agendado', convertido:'Convertido', perdido:'Perdido',
};
const FONTE_LABEL = {
  manual:'Manual', google_maps:'Google Maps', csv_import:'CSV', api:'API',
};

const EMPTY_FORM = {
  nome:'', telefone:'', telefone2:'', email:'', website:'',
  origem:'', status:'novo', priority:'normal', fonte:'manual', observacoes:'',
  cep:'', logradouro:'', numero:'', complemento:'', bairro:'', cidade:'', municipio:'', estado:'',
  nicho:'', categoria:'', subcategoria:'', googleMapsUrl:'', rating:'',
  facebook:'', instagram:'', telegram:'', especialidades:'',
};

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
  novo:         'background:#f3f4f6;color:#374151;border:1px solid #e5e7eb;',
  contato:      'background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;',
  qualificado:  'background:#fef9c3;color:#a16207;border:1px solid #fef08a;',
  proposta:     'background:#f3e8ff;color:#7e22ce;border:1px solid #e9d5ff;',
  agendado:     'background:#dbeafe;color:#1d4ed8;border:1px solid #bfdbfe;',
  convertido:   'background:#dcfce7;color:#15803d;border:1px solid #bbf7d0;',
  perdido:      'background:#fee2e2;color:#dc2626;border:1px solid #fecaca;',
};

function buildLeadsPrintHTML(items, { busca, filtroStatus, filtroNicho, total }, tenant) {
  const ativos = [
    busca        && `Busca: "${busca}"`,
    filtroStatus && `Status: ${STATUS_LABEL[filtroStatus] || filtroStatus}`,
    filtroNicho  && `Nicho: ${filtroNicho}`,
  ].filter(Boolean).join(' · ') || 'Todos os registros';

  const rows = items.map((l, i) => {
    const statusStyle = STATUS_BADGE_STYLE[l.status] || STATUS_BADGE_STYLE.novo;
    const bg = i % 2 === 0 ? '#ffffff' : '#f9fafb';
    return `
    <tr style="background:${bg};">
      <td style="padding:7px 8px;border-bottom:1px solid #f3f4f6;color:#9ca3af;font-size:10px;">${i + 1}</td>
      <td style="padding:7px 8px;border-bottom:1px solid #f3f4f6;">
        <strong style="color:#111;">${l.nome}</strong>
        ${l.nicho ? `<div style="color:#6b7280;font-size:10px;margin-top:1px;">${l.nicho}${l.categoria ? ' · ' + l.categoria : ''}</div>` : ''}
      </td>
      <td style="padding:7px 8px;border-bottom:1px solid #f3f4f6;white-space:nowrap;">${l.telefone || '-'}</td>
      <td style="padding:7px 8px;border-bottom:1px solid #f3f4f6;">${[l.cidade || l.municipio, l.estado].filter(Boolean).join(' / ') || '-'}</td>
      <td style="padding:7px 8px;border-bottom:1px solid #f3f4f6;">
        <span style="padding:2px 7px;border-radius:20px;font-size:10px;font-weight:600;${statusStyle}">${STATUS_LABEL[l.status] || l.status || '-'}</span>
      </td>
      <td style="padding:7px 8px;border-bottom:1px solid #f3f4f6;color:#6b7280;text-transform:capitalize;">${l.priority || 'normal'}</td>
      <td style="padding:7px 8px;border-bottom:1px solid #f3f4f6;color:#6b7280;">${FONTE_LABEL[l.fonte] || l.fonte || '-'}</td>
    </tr>`;
  }).join('');

  return `<div style="font-family:'Segoe UI',Arial,sans-serif;color:#111;font-size:12px;line-height:1.4;">
    ${printHeader(tenant, 'Relatório de Leads', `${items.length} de ${total} lead(s) · ${ativos}`)}
    <table style="width:100%;border-collapse:collapse;font-size:11px;">
      <thead>
        <tr style="background:#f9fafb;">
          <th style="padding:8px;border-bottom:2px solid #e5e7eb;font-weight:700;color:#374151;text-align:left;">#</th>
          <th style="padding:8px;border-bottom:2px solid #e5e7eb;font-weight:700;color:#374151;text-align:left;">Nome / Nicho</th>
          <th style="padding:8px;border-bottom:2px solid #e5e7eb;font-weight:700;color:#374151;text-align:left;">Telefone</th>
          <th style="padding:8px;border-bottom:2px solid #e5e7eb;font-weight:700;color:#374151;text-align:left;">Localização</th>
          <th style="padding:8px;border-bottom:2px solid #e5e7eb;font-weight:700;color:#374151;text-align:left;">Status</th>
          <th style="padding:8px;border-bottom:2px solid #e5e7eb;font-weight:700;color:#374151;text-align:left;">Prior.</th>
          <th style="padding:8px;border-bottom:2px solid #e5e7eb;font-weight:700;color:#374151;text-align:left;">Fonte</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    ${printFooter()}
  </div>`;
}

// ─── LeadForm ─────────────────────────────────────────────────────────────────
function LeadForm({ form, setForm, onSubmit, loading, nichos }) {
  const [buscandoCep, setBuscandoCep] = useState(false);
  const categorias = nichos.find(n => n.nicho === form.nicho)?.categorias || [];

  const field = (id, label, type = 'text', extra = {}) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <input type={type} value={form[id]}
        onChange={e => setForm(f => ({ ...f, [id]: e.target.value }))}
        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        {...extra} />
    </div>
  );

  const sel = (id, label, options, labelMap = {}) => (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
      <select value={form[id]} onChange={e => setForm(f => ({ ...f, [id]: e.target.value }))}
        className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
        {options.map(o => <option key={o} value={o}>{labelMap[o] || o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
      </select>
    </div>
  );

  async function buscarCep(cep) {
    const limpo = cep.replace(/\D/g, '');
    if (limpo.length !== 8) return;
    setBuscandoCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
      const data = await res.json();
      if (data.erro) { toast.error('CEP não encontrado'); return; }
      setForm(f => ({
        ...f,
        logradouro: data.logradouro || '',
        bairro:     data.bairro     || '',
        cidade:     data.localidade || '',
        municipio:  data.localidade || '',
        estado:     data.uf         || '',
      }));
    } catch { toast.error('Erro ao buscar CEP'); }
    finally { setBuscandoCep(false); }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
      {/* Dados básicos */}
      {field('nome', 'Nome *', 'text', { required: true, placeholder: 'Nome / Razão social' })}
      <div className="grid grid-cols-2 gap-3">
        {field('telefone',  'Telefone',   'text', { placeholder: '(00) 00000-0000' })}
        {field('telefone2', 'Telefone 2', 'text', { placeholder: '(00) 00000-0000' })}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {field('email',   'Email',   'email', { placeholder: 'email@exemplo.com' })}
        {field('website', 'Website', 'text',  { placeholder: 'https://...' })}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {sel('status',   'Status',     STATUS_OPTIONS,   STATUS_LABEL)}
        {sel('priority', 'Prioridade', PRIORITY_OPTIONS)}
        {sel('fonte',    'Fonte',      FONTE_OPTIONS,    FONTE_LABEL)}
      </div>
      {field('origem', 'Origem', 'text', { placeholder: 'Instagram, Indicação...' })}

      {/* Google Maps */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Dados Google Maps <span className="font-normal text-gray-400">(opcional)</span></p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nicho</label>
            <select value={form.nicho}
              onChange={e => setForm(f => ({ ...f, nicho: e.target.value, categoria: '' }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50">
              <option value="">-- selecione --</option>
              {nichos.map(n => <option key={n.nicho} value={n.nicho}>{n.nicho}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
            <select value={form.categoria}
              onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
              disabled={!form.nicho}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50 disabled:opacity-50">
              <option value="">-- selecione --</option>
              {categorias.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {field('subcategoria', 'Subcategoria', 'text', { placeholder: 'Especialidade...' })}
          {field('rating', 'Avaliação (0-5)', 'number', { min: 0, max: 5, step: 0.1, placeholder: '4.5' })}
        </div>
        <div className="mt-3">
          {field('googleMapsUrl', 'URL Google Maps', 'text', { placeholder: 'https://maps.google.com/...' })}
        </div>
      </div>

      {/* Redes Sociais */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Redes Sociais <span className="font-normal text-gray-400">(opcional)</span></p>
        <div className="grid grid-cols-1 gap-3">
          {field('facebook',      'Facebook',       'text', { placeholder: 'https://facebook.com/...' })}
          {field('instagram',     'Instagram',      'text', { placeholder: 'https://instagram.com/...' })}
          {field('telegram',      'Telegram',       'text', { placeholder: 'https://t.me/...' })}
          {field('especialidades','Especialidades', 'text', { placeholder: 'Almoço, Jantar, Delivery...' })}
        </div>
      </div>

      {/* Endereço */}
      <div className="border-t border-gray-100 pt-4">
        <p className="text-sm font-semibold text-gray-700 mb-3">Endereço <span className="font-normal text-gray-400">(opcional)</span></p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">CEP</label>
            <input type="text" value={form.cep}
              onChange={e => setForm(f => ({ ...f, cep: e.target.value }))}
              onBlur={e => buscarCep(e.target.value)}
              placeholder="00000-000" maxLength={9}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50 pr-7" />
            {buscandoCep && (
              <svg className="animate-spin w-4 h-4 text-blue-500 absolute right-2 top-8" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            )}
          </div>
          <div className="col-span-2">
            {field('logradouro', 'Logradouro', 'text', { placeholder: 'Rua, Av...' })}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          {field('numero',      'Número',      'text', { placeholder: '123' })}
          {field('complemento', 'Complemento', 'text', { placeholder: 'Apto...' })}
          {field('bairro',      'Bairro',      'text', {})}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="col-span-2">
            {field('cidade', 'Cidade', 'text', {})}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">UF</label>
            <select value={form.estado}
              onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50">
              <option value="">--</option>
              {ESTADOS_BR.map(uf => <option key={uf} value={uf}>{uf}</option>)}
            </select>
          </div>
        </div>
        <div className="mt-3">
          {field('municipio', 'Município', 'text', { placeholder: 'Igual à cidade ou diferente para região' })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Observações</label>
        <textarea rows={3} value={form.observacoes}
          onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
          className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-gray-50 resize-none"
          placeholder="Informações adicionais..." />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button type="submit" disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm">
          {loading ? 'Salvando...' : 'Salvar Lead'}
        </button>
      </div>
    </form>
  );
}

// ─── ImportModal ──────────────────────────────────────────────────────────────
function ImportModal({ onClose, onDone }) {
  const [json, setJson] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleImport() {
    let lista;
    try { lista = JSON.parse(json); }
    catch { toast.error('JSON inválido'); return; }
    if (!Array.isArray(lista)) { toast.error('Envie um array JSON'); return; }

    setLoading(true);
    try {
      const data = await api.post('/leads/importar', { leads: lista });
      setResult(data);
      if (data.inseridos > 0) onDone();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      {!result ? (
        <>
          <p className="text-sm text-gray-600">
            Cole um array JSON com até <strong>500 leads</strong>. Cada item deve ter ao menos <code className="bg-gray-100 px-1 rounded">nome</code>, <code className="bg-gray-100 px-1 rounded">estado</code> e <code className="bg-gray-100 px-1 rounded">nicho</code>.
          </p>
          <textarea rows={12} value={json} onChange={e => setJson(e.target.value)}
            placeholder={'[\n  {\n    "nome": "Restaurante Exemplo",\n    "estado": "SP",\n    "cidade": "São Paulo",\n    "nicho": "Alimentação",\n    "telefone": "(11) 99999-0000",\n    "googleMapsUrl": "https://...",\n    "place_id": "ChIJ...",\n    "rating": 4.5\n  }\n]'}
            className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs font-mono bg-gray-50 resize-none" />
          <div className="flex justify-end gap-3">
            <button onClick={onClose}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition">
              Cancelar
            </button>
            <button onClick={handleImport} disabled={loading || !json.trim()}
              className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm">
              {loading ? 'Importando...' : 'Importar'}
            </button>
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-600">{result.inseridos}</div>
              <div className="text-xs text-green-700 mt-1">Inseridos</div>
            </div>
            <div className="bg-yellow-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{result.ignorados}</div>
              <div className="text-xs text-yellow-700 mt-1">Ignorados (duplicata)</div>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-red-600">{result.erros?.length || 0}</div>
              <div className="text-xs text-red-700 mt-1">Erros</div>
            </div>
          </div>
          {result.erros?.length > 0 && (
            <div className="bg-red-50 rounded-xl p-3 text-xs text-red-700 space-y-1 max-h-40 overflow-y-auto">
              {result.erros.map((e, i) => (
                <div key={i}><strong>{e.item}:</strong> {e.erro}</div>
              ))}
            </div>
          )}
          <div className="flex justify-end">
            <button onClick={onClose}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm">
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Leads ────────────────────────────────────────────────────────────────────
export default function Leads() {
  const [leads, setLeads]         = useState([]);
  const [total, setTotal]         = useState(0);
  const [stats, setStats]         = useState(null);
  const [nichos, setNichos]       = useState([]);

  // filtros
  const [busca, setBusca]         = useState('');
  const [filtroStatus, setFiltroStatus]     = useState('');
  const [filtroFonte, setFiltroFonte]       = useState('');
  const [filtroPriority, setFiltroPriority] = useState('');
  const [filtroEstado, setFiltroEstado]     = useState('');
  const [filtroMunicipio, setFiltroMunicipio] = useState('');
  const [filtroBairro, setFiltroBairro]     = useState('');
  const [filtroNicho, setFiltroNicho]       = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [showFiltros, setShowFiltros]       = useState(false);

  // paginação
  const [page, setPage]           = useState(1);
  const LIMIT = 50;

  // modais
  const [modalOpen, setModalOpen]       = useState(false);
  const [importOpen, setImportOpen]     = useState(false);
  const [editId, setEditId]             = useState(null);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [loading, setLoading]           = useState(false);

  const [selecionados, setSelecionados] = useState(new Set());
  const tableRef       = useRef(null);
  const printHeaderRef = useRef(null);

  const todosNaPaginaSelecionados = leads.length > 0 && leads.every(l => selecionados.has(l.id));
  const algumSelecionado          = selecionados.size > 0;
  const itensParaImprimir         = algumSelecionado ? leads.filter(l => selecionados.has(l.id)) : leads;

  const categoriasDoNicho = nichos.find(n => n.nicho === filtroNicho)?.categorias || [];

  // ── carregar nichos e stats ao montar
  useEffect(() => {
    api.get('/leads/nichos').then(d => setNichos(d.data || [])).catch(e => console.error('[Leads] nichos:', e.message));
    api.get('/leads/stats').then(d => setStats(d)).catch(e => console.error('[Leads] stats:', e.message));
  }, []);

  // ── carregar leads (com debounce nos filtros texto)
  const loadLeads = useCallback(async () => {
    try {
      const params = { page, limit: LIMIT };
      if (busca)           params.busca      = busca;
      if (filtroStatus)    params.status     = filtroStatus;
      if (filtroFonte)     params.fonte      = filtroFonte;
      if (filtroPriority)  params.priority   = filtroPriority;
      if (filtroEstado)    params.estado     = filtroEstado;
      if (filtroMunicipio) params.municipio  = filtroMunicipio;
      if (filtroBairro)    params.bairro     = filtroBairro;
      if (filtroNicho)     params.nicho      = filtroNicho;
      if (filtroCategoria) params.categoria  = filtroCategoria;
      const data = await api.get('/leads', params);
      setLeads(data.leads);
      setTotal(data.total);
    } catch (err) { toast.error(err.message); }
  }, [busca, filtroStatus, filtroFonte, filtroPriority, filtroEstado,
      filtroMunicipio, filtroBairro, filtroNicho, filtroCategoria, page]);

  useEffect(() => {
    const t = setTimeout(loadLeads, 350);
    return () => clearTimeout(t);
  }, [loadLeads]);

  // resetar página e seleção quando filtros mudam
  useEffect(() => { setPage(1); setSelecionados(new Set()); },
    [busca, filtroStatus, filtroFonte, filtroPriority, filtroEstado,
     filtroMunicipio, filtroBairro, filtroNicho, filtroCategoria]);

  // ── funções CRUD
  async function openEdit(id) {
    try {
      const data = await api.get(`/leads/${id}`);
      const l = data.lead;
      setForm({
        nome: l.nome, telefone: l.telefone || '', telefone2: l.telefone2 || '',
        email: l.email || '', website: l.website || '',
        origem: l.origem || '', status: l.status, priority: l.priority || 'normal',
        fonte: l.fonte || 'manual', observacoes: l.observacoes || '',
        cep: l.cep || '', logradouro: l.logradouro || '', numero: l.numero || '',
        complemento: l.complemento || '', bairro: l.bairro || '',
        cidade: l.cidade || '', municipio: l.municipio || '', estado: l.estado || '',
        nicho: l.nicho || '', categoria: l.categoria || '',
        subcategoria: l.subcategoria || '', googleMapsUrl: l.googleMapsUrl || '',
        rating: l.rating ?? '',
        facebook: l.facebook || '', instagram: l.instagram || '',
        telegram: l.telegram || '', especialidades: l.especialidades || '',
      });
      setEditId(id);
      setModalOpen(true);
    } catch (err) { toast.error(err.message); }
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditId(null);
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { ...form };
      if (payload.rating === '') delete payload.rating;
      if (editId) {
        await api.put(`/leads/${editId}`, payload);
        toast.success('Lead atualizado!');
      } else {
        await api.post('/leads', payload);
        toast.success('Lead criado!');
      }
      setModalOpen(false);
      loadLeads();
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }

  async function handleDelete(id, nome) {
    if (!confirm(`Remover o lead "${nome}"?`)) return;
    try {
      await api.delete(`/leads/${id}`);
      toast.success('Lead removido');
      loadLeads();
    } catch (err) { toast.error(err.message); }
  }

  const totalPages = Math.ceil(total / LIMIT);
  const filtrosAtivos = [filtroStatus, filtroFonte, filtroPriority, filtroEstado,
    filtroMunicipio, filtroBairro, filtroNicho, filtroCategoria].filter(Boolean).length;

  const { tenant } = useAuth();

  function toggleItem(id) {
    setSelecionados(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleTodos() {
    setSelecionados(todosNaPaginaSelecionados ? new Set() : new Set(leads.map(l => l.id)));
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
    frame.innerHTML = buildLeadsPrintHTML(itensParaImprimir, { busca, filtroStatus, filtroNicho, total }, tenant);
    document.body.appendChild(frame);

    window.print();

    window.addEventListener('afterprint', () => {
      frame.remove();
      if (tableRef.current)       tableRef.current.classList.remove('no-print');
      if (printHeaderRef.current) printHeaderRef.current.classList.remove('no-print');
    }, { once: true });
  }

  return (
    <Layout title="Leads" subtitle="Gerencie seus contatos e oportunidades de venda">

      {/* Stats rápidas */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{stats.total}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Total de leads</div>
          </div>
          {stats.byStatus?.slice(0, 3).map(s => (
            <div key={s.status} className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{s._count}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{STATUS_LABEL[s.status] || s.status}</div>
            </div>
          ))}
        </div>
      )}

      {/* Header de impressão (window.print sem seleção) */}
      <div className="print-only" ref={printHeaderRef}>
        <div dangerouslySetInnerHTML={{ __html: printHeader(tenant, 'Relatório de Leads', `${total} lead(s) · Todos os registros`) }} />
      </div>

      {/* Barra de ações */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4 no-print">
        <input type="text" placeholder="Buscar por nome, telefone, email, nicho, bairro..."
          value={busca} onChange={e => setBusca(e.target.value)}
          className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100" />

        <button onClick={() => setShowFiltros(v => !v)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition
            ${showFiltros || filtrosAtivos > 0
              ? 'bg-blue-50 border-blue-300 text-blue-700'
              : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          Filtros{filtrosAtivos > 0 ? ` (${filtrosAtivos})` : ''}
        </button>

        <button onClick={() => setImportOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 text-sm font-medium transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          Importar
        </button>

        <button onClick={imprimirPDF}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 text-sm font-medium transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          {algumSelecionado ? `PDF (${selecionados.size})` : 'PDF'}
        </button>

        <button onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2.5 rounded-xl transition text-sm flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Lead
        </button>
      </div>

      {/* Barra de seleção */}
      {algumSelecionado && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 mb-4 no-print">
          <span className="text-sm text-blue-700 font-medium">
            {selecionados.size} lead(s) selecionado(s)
          </span>
          <button onClick={() => setSelecionados(new Set())}
            className="text-xs text-blue-500 hover:text-blue-700 underline">
            Limpar seleção
          </button>
        </div>
      )}

      {/* Filtros expandidos */}
      {showFiltros && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 mb-4 no-print">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* Status */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <option value="">Todos</option>
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </div>
            {/* Fonte */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Fonte</label>
              <select value={filtroFonte} onChange={e => setFiltroFonte(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <option value="">Todas</option>
                {FONTE_OPTIONS.map(f => <option key={f} value={f}>{FONTE_LABEL[f]}</option>)}
              </select>
            </div>
            {/* Prioridade */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Prioridade</label>
              <select value={filtroPriority} onChange={e => setFiltroPriority(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <option value="">Todas</option>
                {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
            {/* Estado */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Estado (UF)</label>
              <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <option value="">Todos</option>
                {ESTADOS_BR.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
            {/* Município */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Município</label>
              <input type="text" value={filtroMunicipio} onChange={e => setFiltroMunicipio(e.target.value)}
                placeholder="Buscar município..."
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
            </div>
            {/* Bairro */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Bairro</label>
              <input type="text" value={filtroBairro} onChange={e => setFiltroBairro(e.target.value)}
                placeholder="Buscar bairro..."
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100" />
            </div>
            {/* Nicho */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Nicho</label>
              <select value={filtroNicho}
                onChange={e => { setFiltroNicho(e.target.value); setFiltroCategoria(''); }}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100">
                <option value="">Todos</option>
                {nichos.map(n => <option key={n.nicho} value={n.nicho}>{n.nicho}</option>)}
              </select>
            </div>
            {/* Categoria */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Categoria</label>
              <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)}
                disabled={!filtroNicho}
                className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 disabled:opacity-50">
                <option value="">Todas</option>
                {categoriasDoNicho.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          {filtrosAtivos > 0 && (
            <div className="mt-3 flex justify-end">
              <button onClick={() => {
                setFiltroStatus(''); setFiltroFonte(''); setFiltroPriority('');
                setFiltroEstado(''); setFiltroMunicipio(''); setFiltroBairro('');
                setFiltroNicho(''); setFiltroCategoria('');
              }}
                className="text-sm text-red-600 hover:text-red-800 font-medium">
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cards mobile */}
      <div className="md:hidden space-y-3 mb-4 no-print">
        {leads.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-8 text-center text-gray-400 dark:text-gray-500">Nenhum lead encontrado</div>
        ) : leads.map(l => (
          <div key={l.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-start gap-2">
                <input type="checkbox"
                  checked={selecionados.has(l.id)}
                  onChange={() => toggleItem(l.id)}
                  className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer flex-shrink-0" />
                <div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100">{l.nome}</div>
                  {l.nicho && <div className="text-xs text-indigo-500 mt-0.5">{l.nicho}{l.categoria ? ` · ${l.categoria}` : ''}</div>}
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button onClick={() => openEdit(l.id)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-lg">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                </button>
                <button onClick={() => handleDelete(l.id, l.nome)} className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              <BadgeLead status={l.status} />
              <BadgePriority priority={l.priority} />
              <BadgeFonte fonte={l.fonte} />
            </div>
            <div className="text-sm text-gray-600 space-y-0.5">
              {l.telefone && <div>📞 <a href={`tel:${l.telefone}`} className="hover:text-blue-600">{l.telefone}</a></div>}
              {(l.cidade || l.municipio) && <div>📍 {l.cidade || l.municipio}{l.estado ? ` / ${l.estado}` : ''}{l.bairro ? ` · ${l.bairro}` : ''}</div>}
              {l.googleMapsUrl && <div><a href={l.googleMapsUrl} target="_blank" rel="noreferrer" className="text-green-600 text-xs">Ver no Google Maps</a></div>}
              {l.especialidades && <div className="text-xs text-gray-400 mt-0.5">{l.especialidades}</div>}
              {(l.facebook || l.instagram || l.telegram) && (
                <div className="flex gap-2 mt-1">
                  {l.facebook  && <a href={l.facebook}  target="_blank" rel="noreferrer" className="text-blue-600 text-xs hover:underline">Facebook</a>}
                  {l.instagram && <a href={l.instagram} target="_blank" rel="noreferrer" className="text-pink-500 text-xs hover:underline">Instagram</a>}
                  {l.telegram  && <a href={l.telegram}  target="_blank" rel="noreferrer" className="text-sky-500 text-xs hover:underline">Telegram</a>}
                </div>
              )}
            </div>
          </div>
        ))}
        {totalPages > 1 && (
          <div className="flex items-center justify-between py-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 rounded-xl border text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">← Anterior</button>
            <span className="text-sm text-gray-500">{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 rounded-xl border text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40">Próxima →</button>
          </div>
        )}
      </div>

      {/* Tabela desktop + impressão */}
      <div ref={tableRef} className="hidden md:block bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between no-print">
          <span className="text-sm text-gray-500 font-medium">{total} lead(s) encontrado(s)</span>
          {totalPages > 1 && (
            <span className="text-sm text-gray-400">Pág. {page} / {totalPages}</span>
          )}
        </div>
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
                <th className="px-5 py-3">Nome / Nicho</th>
                <th className="px-5 py-3">Contato</th>
                <th className="px-5 py-3">Localização</th>
                <th className="px-5 py-3">Fonte</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Prior.</th>
                <th className="px-5 py-3 no-print">Ações</th>
              </tr>
            </thead>
            <tbody>
              {leads.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-14 text-center text-gray-400">
                    Nenhum lead encontrado
                  </td>
                </tr>
              ) : leads.map(l => (
                <tr key={l.id} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-3 py-3 no-print">
                    <input type="checkbox"
                      checked={selecionados.has(l.id)}
                      onChange={() => toggleItem(l.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer" />
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100 text-sm">{l.nome}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      {l.nicho ? (
                        <span className="text-indigo-500">{l.nicho}{l.categoria ? ` · ${l.categoria}` : ''}</span>
                      ) : (l.email || `#${l.id}`)}
                    </div>
                    {l.rating && (
                      <div className="flex items-center gap-0.5 mt-0.5">
                        <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-xs text-gray-500">{Number(l.rating).toFixed(1)}</span>
                        {l.reviewsCount > 0 && <span className="text-xs text-gray-400">({l.reviewsCount})</span>}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="text-sm text-gray-600">
                      {l.telefone ? (
                        <a href={`tel:${l.telefone}`} className="hover:text-blue-600">{l.telefone}</a>
                      ) : '-'}
                    </div>
                    {l.website && (
                      <a href={l.website.startsWith('http') ? l.website : `https://${l.website}`}
                        target="_blank" rel="noreferrer"
                        className="text-xs text-blue-500 hover:underline truncate block max-w-[140px]">
                        {l.website.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                    {l.googleMapsUrl && (
                      <a href={l.googleMapsUrl} target="_blank" rel="noreferrer"
                        className="text-xs text-green-600 hover:underline">Ver no Maps</a>
                    )}
                    {(l.facebook || l.instagram || l.telegram) && (
                      <div className="flex gap-1.5 mt-1">
                        {l.facebook  && <a href={l.facebook}  target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">FB</a>}
                        {l.instagram && <a href={l.instagram} target="_blank" rel="noreferrer" className="text-xs text-pink-500 hover:underline">IG</a>}
                        {l.telegram  && <a href={l.telegram}  target="_blank" rel="noreferrer" className="text-xs text-sky-500 hover:underline">TG</a>}
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-sm text-gray-600">
                    {l.cidade || l.municipio
                      ? <>{l.cidade || l.municipio}{l.estado ? ` / ${l.estado}` : ''}</>
                      : '-'}
                    {l.bairro && <div className="text-xs text-gray-400">{l.bairro}</div>}
                  </td>
                  <td className="px-5 py-3">
                    <BadgeFonte fonte={l.fonte} />
                  </td>
                  <td className="px-5 py-3">
                    <BadgeLead status={l.status} />
                  </td>
                  <td className="px-5 py-3">
                    <BadgePriority priority={l.priority} />
                  </td>
                  <td className="px-5 py-3 no-print">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(l.id)}
                        className="text-blue-600 hover:bg-blue-50 p-2 rounded-lg transition-colors" title="Editar">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button onClick={() => handleDelete(l.id, l.nome)}
                        className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Remover">
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

        {/* Paginação */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between no-print">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
              ← Anterior
            </button>
            <span className="text-sm text-gray-500">
              {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, total)} de {total}
            </span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
              Próxima →
            </button>
          </div>
        )}
      </div>

      {/* Modal criar/editar */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)}
        title={editId ? 'Editar Lead' : 'Novo Lead'}>
        <LeadForm form={form} setForm={setForm} onSubmit={handleSubmit}
          loading={loading} nichos={nichos} />
      </Modal>

      {/* Modal importação */}
      <Modal isOpen={importOpen} onClose={() => setImportOpen(false)}
        title="Importar Leads (JSON)">
        <ImportModal onClose={() => setImportOpen(false)} onDone={loadLeads} />
      </Modal>
    </Layout>
  );
}
