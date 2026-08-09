import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import toast from 'react-hot-toast';

const TIPOS = [
  { value: 'acao_civil',      label: 'Ação Civil' },
  { value: 'trabalhista',     label: 'Trabalhista' },
  { value: 'criminal',        label: 'Criminal' },
  { value: 'familia',         label: 'Família' },
  { value: 'previdenciario',  label: 'Previdenciário' },
  { value: 'consumidor',      label: 'Consumidor' },
  { value: 'outro',           label: 'Outro' },
];

const STATUS_OPTS = [
  { value: 'ativo',      label: 'Ativo',      color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' },
  { value: 'suspenso',   label: 'Suspenso',   color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300' },
  { value: 'encerrado',  label: 'Encerrado',  color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
  { value: 'arquivado',  label: 'Arquivado',  color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
];

const TIPOS_MOV = [
  { value: 'audiencia',    label: 'Audiência' },
  { value: 'prazo',        label: 'Prazo' },
  { value: 'decisao',      label: 'Decisão' },
  { value: 'peticao',      label: 'Petição' },
  { value: 'despacho',     label: 'Despacho' },
  { value: 'outros',       label: 'Outros' },
];

function statusInfo(s) { return STATUS_OPTS.find(o => o.value === s) || STATUS_OPTS[0]; }
function tipoLabel(t)  { return TIPOS.find(o => o.value === t)?.label || t; }

const fmtMoeda = v => v != null ? Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : null;
const fmtData  = s => s ? new Date(s).toLocaleDateString('pt-BR') : null;

const EMPTY_FORM = {
  titulo: '', tipo: 'acao_civil', clienteNome: '', clienteTel: '',
  parteContraria: '', advogado: '', vara: '', comarca: '',
  dataAbertura: '', prazoProximo: '', dataEncerramento: '',
  valorCausa: '', honorarios: '', observacoes: '', status: 'ativo',
};

export default function Processos() {
  const { tenant } = useAuth();

  const [lista, setLista]             = useState([]);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [search, setSearch]           = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [filtroTipo, setFiltroTipo]   = useState('');
  const [loading, setLoading]         = useState(true);
  const [modal, setModal]             = useState(false);
  const [editing, setEditing]         = useState(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [saving, setSaving]           = useState(false);
  const [viewItem, setViewItem]       = useState(null);
  const [pdfLoading, setPdfLoading]   = useState(false);
  const [novaMovText, setNovaMovText] = useState('');
  const [novaMovTipo, setNovaMovTipo] = useState('outros');
  const [savingMov, setSavingMov]     = useState(false);

  const inpStyle = { backgroundColor: 'var(--s2)', borderColor: 'var(--bd)', color: 'var(--tx)' };
  const inp = 'w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page,
        ...(search        ? { search }         : {}),
        ...(filtroStatus  ? { status: filtroStatus } : {}),
        ...(filtroTipo    ? { tipo: filtroTipo }     : {}),
      });
      const data = await api.get(`/processos?${params}`);
      setLista(data.processos || []);
      setTotal(data.total || 0);
    } catch { toast.error('Erro ao carregar processos'); }
    finally { setLoading(false); }
  }, [page, search, filtroStatus, filtroTipo]);

  useEffect(() => { carregar(); }, [carregar]);

  function abrirNovo() { setEditing(null); setForm(EMPTY_FORM); setModal(true); }
  function abrirEditar(p) {
    setEditing(p);
    setForm({
      titulo: p.titulo || '', tipo: p.tipo || 'acao_civil', clienteNome: p.clienteNome || '',
      clienteTel: p.clienteTel || '', parteContraria: p.parteContraria || '',
      advogado: p.advogado || '', vara: p.vara || '', comarca: p.comarca || '',
      dataAbertura: p.dataAbertura || '', prazoProximo: p.prazoProximo || '',
      dataEncerramento: p.dataEncerramento || '', valorCausa: p.valorCausa || '',
      honorarios: p.honorarios || '', observacoes: p.observacoes || '', status: p.status || 'ativo',
    });
    setModal(true);
  }

  async function salvar(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = { ...form };
      if (editing) {
        const upd = await api.put(`/processos/${editing.id}`, body);
        toast.success('Processo atualizado');
        if (viewItem?.id === editing.id) setViewItem(upd.processo);
      } else {
        await api.post('/processos', body);
        toast.success('Processo criado');
      }
      setModal(false);
      carregar();
    } catch (err) { toast.error(err.message || 'Erro ao salvar'); }
    finally { setSaving(false); }
  }

  async function excluir(p) {
    if (!confirm(`Excluir processo ${p.numero}?`)) return;
    try {
      await api.delete(`/processos/${p.id}`);
      toast.success('Processo removido');
      if (viewItem?.id === p.id) setViewItem(null);
      carregar();
    } catch { toast.error('Erro ao excluir'); }
  }

  async function abrirView(p) {
    try {
      const data = await api.get(`/processos/${p.id}`);
      setViewItem(data.processo);
      setNovaMovText('');
      setNovaMovTipo('outros');
    } catch { toast.error('Erro ao carregar processo'); }
  }

  async function addMov() {
    if (!novaMovText.trim()) return;
    setSavingMov(true);
    try {
      const data = await api.post(`/processos/${viewItem.id}/movimentacao`, { texto: novaMovText.trim(), tipo: novaMovTipo });
      setViewItem(data.processo);
      setNovaMovText('');
    } catch { toast.error('Erro ao adicionar movimentação'); }
    finally { setSavingMov(false); }
  }

  async function removeMov(movId) {
    if (!confirm('Remover esta movimentação?')) return;
    try {
      const data = await api.delete(`/processos/${viewItem.id}/movimentacao/${movId}`);
      setViewItem(data.processo);
    } catch { toast.error('Erro ao remover movimentação'); }
  }

  async function exportarPDF(p) {
    setPdfLoading(true);
    try {
      const { gerarPdfProcesso } = await import('../utils/pdfGenerator');
      await gerarPdfProcesso(p, tenant);
    } catch { toast.error('Erro ao gerar PDF'); }
    finally { setPdfLoading(false); }
  }

  const sf = (field, value) => setForm(f => ({ ...f, [field]: value }));
  const pages = Math.ceil(total / 20);

  return (
    <Layout title="Processos" subtitle="Gestão de processos jurídicos">
      {/* Topo */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          className={inp + ' flex-1'} placeholder="Buscar por número, título ou cliente..." style={inpStyle}
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <select className={inp + ' sm:w-40'} style={inpStyle} value={filtroStatus} onChange={e => { setFiltroStatus(e.target.value); setPage(1); }}>
          <option value="">Todos os status</option>
          {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select className={inp + ' sm:w-44'} style={inpStyle} value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value); setPage(1); }}>
          <option value="">Todos os tipos</option>
          {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <button onClick={abrirNovo}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white"
          style={{ backgroundColor: 'var(--g)' }}>
          + Novo Processo
        </button>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-14 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--s2)' }} />)}
        </div>
      ) : lista.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <svg className="w-12 h-12" style={{ color: 'var(--tx3)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
          </svg>
          <p className="text-sm" style={{ color: 'var(--tx2)' }}>Nenhum processo encontrado</p>
          <button onClick={abrirNovo} className="px-4 py-2 text-sm rounded-lg text-white" style={{ backgroundColor: 'var(--g)' }}>Criar primeiro processo</button>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: 'var(--bd)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: 'var(--s2)' }}>
                {['Número', 'Título / Tipo', 'Cliente', 'Prazo Próximo', 'Status', 'Ações'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: 'var(--tx2)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map(p => {
                const si = statusInfo(p.status);
                return (
                  <tr key={p.id} className="border-t hover:opacity-90 cursor-pointer" style={{ borderColor: 'var(--bd)' }} onClick={() => abrirView(p)}>
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--tx2)' }}>{p.numero}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium" style={{ color: 'var(--tx)' }}>{p.titulo}</p>
                      <p className="text-xs" style={{ color: 'var(--tx2)' }}>{tipoLabel(p.tipo)}</p>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--tx)' }}>{p.clienteNome}</td>
                    <td className="px-4 py-3 text-xs" style={{ color: p.prazoProximo ? 'var(--tx)' : 'var(--tx3)' }}>
                      {p.prazoProximo ? fmtData(p.prazoProximo) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${si.color}`}>{si.label}</span>
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <button onClick={() => abrirEditar(p)} className="p-1.5 rounded-lg hover:opacity-80" title="Editar"
                          style={{ backgroundColor: 'var(--s2)', color: 'var(--tx2)' }}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                        <button onClick={() => excluir(p)} className="p-1.5 rounded-lg hover:opacity-80 text-red-500" title="Excluir"
                          style={{ backgroundColor: 'var(--s2)' }}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Paginação */}
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {[...Array(pages)].map((_, i) => (
            <button key={i} onClick={() => setPage(i + 1)}
              className={`w-8 h-8 rounded text-sm ${page === i + 1 ? 'text-white' : ''}`}
              style={{ backgroundColor: page === i + 1 ? 'var(--g)' : 'var(--s2)', color: page === i + 1 ? '#fff' : 'var(--tx)' }}>
              {i + 1}
            </button>
          ))}
        </div>
      )}

      {/* Modal criar/editar */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-2xl rounded-2xl shadow-xl mt-4" style={{ backgroundColor: 'var(--s1)' }}>
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--bd)' }}>
              <h2 className="font-semibold" style={{ color: 'var(--tx)' }}>{editing ? 'Editar Processo' : 'Novo Processo'}</h2>
              <button onClick={() => setModal(false)} style={{ color: 'var(--tx2)' }}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <form onSubmit={salvar} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--tx2)' }}>Título *</label>
                  <input className={inp} style={inpStyle} value={form.titulo} onChange={e => sf('titulo', e.target.value)} required placeholder="Ex: Ação de Indenização por Danos Morais" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--tx2)' }}>Tipo</label>
                  <select className={inp} style={inpStyle} value={form.tipo} onChange={e => sf('tipo', e.target.value)}>
                    {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--tx2)' }}>Status</label>
                  <select className={inp} style={inpStyle} value={form.status} onChange={e => sf('status', e.target.value)}>
                    {STATUS_OPTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--tx2)' }}>Cliente *</label>
                  <input className={inp} style={inpStyle} value={form.clienteNome} onChange={e => sf('clienteNome', e.target.value)} required placeholder="Nome completo" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--tx2)' }}>Telefone do cliente</label>
                  <input className={inp} style={inpStyle} value={form.clienteTel} onChange={e => sf('clienteTel', e.target.value)} placeholder="(61) 9 0000-0000" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--tx2)' }}>Parte contrária</label>
                  <input className={inp} style={inpStyle} value={form.parteContraria} onChange={e => sf('parteContraria', e.target.value)} placeholder="Nome ou razão social" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--tx2)' }}>Advogado responsável</label>
                  <input className={inp} style={inpStyle} value={form.advogado} onChange={e => sf('advogado', e.target.value)} placeholder="Nome do advogado" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--tx2)' }}>Vara</label>
                  <input className={inp} style={inpStyle} value={form.vara} onChange={e => sf('vara', e.target.value)} placeholder="Ex: 3ª Vara Cível" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--tx2)' }}>Comarca</label>
                  <input className={inp} style={inpStyle} value={form.comarca} onChange={e => sf('comarca', e.target.value)} placeholder="Ex: Brasília/DF" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--tx2)' }}>Data de abertura</label>
                  <input type="date" className={inp} style={inpStyle} value={form.dataAbertura} onChange={e => sf('dataAbertura', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--tx2)' }}>Próximo prazo</label>
                  <input type="date" className={inp} style={inpStyle} value={form.prazoProximo} onChange={e => sf('prazoProximo', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--tx2)' }}>Data de encerramento</label>
                  <input type="date" className={inp} style={inpStyle} value={form.dataEncerramento} onChange={e => sf('dataEncerramento', e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--tx2)' }}>Valor da causa (R$)</label>
                  <input type="number" step="0.01" min="0" className={inp} style={inpStyle} value={form.valorCausa} onChange={e => sf('valorCausa', e.target.value)} placeholder="0,00" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--tx2)' }}>Honorários (R$)</label>
                  <input type="number" step="0.01" min="0" className={inp} style={inpStyle} value={form.honorarios} onChange={e => sf('honorarios', e.target.value)} placeholder="0,00" />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--tx2)' }}>Observações</label>
                  <textarea rows={3} className={inp} style={inpStyle} value={form.observacoes} onChange={e => sf('observacoes', e.target.value)} placeholder="Notas adicionais..." />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setModal(false)} className="px-4 py-2 rounded-lg text-sm" style={{ backgroundColor: 'var(--s2)', color: 'var(--tx)' }}>Cancelar</button>
                <button type="submit" disabled={saving} className="px-5 py-2 rounded-lg text-sm text-white font-medium" style={{ backgroundColor: 'var(--g)', opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Salvando...' : editing ? 'Salvar' : 'Criar Processo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Drawer detalhes */}
      {viewItem && (
        <div className="fixed inset-0 z-40 flex justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={() => setViewItem(null)}>
          <div className="w-full max-w-lg h-full overflow-y-auto shadow-2xl" style={{ backgroundColor: 'var(--s1)' }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b sticky top-0" style={{ borderColor: 'var(--bd)', backgroundColor: 'var(--s1)' }}>
              <div>
                <p className="text-xs font-mono" style={{ color: 'var(--tx2)' }}>{viewItem.numero}</p>
                <h3 className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>{viewItem.titulo}</h3>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { abrirEditar(viewItem); setViewItem(null); }}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ backgroundColor: 'var(--s2)', color: 'var(--tx)' }}>
                  Editar
                </button>
                <button onClick={() => exportarPDF(viewItem)} disabled={pdfLoading}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: 'var(--g)', opacity: pdfLoading ? 0.7 : 1 }}>
                  {pdfLoading ? 'PDF...' : 'PDF'}
                </button>
                <button onClick={() => setViewItem(null)} style={{ color: 'var(--tx2)' }}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Status */}
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusInfo(viewItem.status).color}`}>{statusInfo(viewItem.status).label}</span>
                <span className="text-xs px-2 py-1 rounded-full" style={{ backgroundColor: 'var(--s2)', color: 'var(--tx2)' }}>{tipoLabel(viewItem.tipo)}</span>
              </div>

              {/* Dados principais */}
              <Section title="Partes">
                <Row label="Cliente"          value={viewItem.clienteNome} />
                <Row label="Telefone"         value={viewItem.clienteTel} />
                <Row label="Parte contrária"  value={viewItem.parteContraria} />
                <Row label="Advogado"         value={viewItem.advogado} />
              </Section>

              <Section title="Processo">
                <Row label="Vara"             value={viewItem.vara} />
                <Row label="Comarca"          value={viewItem.comarca} />
                <Row label="Abertura"         value={fmtData(viewItem.dataAbertura)} />
                <Row label="Próximo prazo"    value={fmtData(viewItem.prazoProximo)} />
                <Row label="Encerramento"     value={fmtData(viewItem.dataEncerramento)} />
              </Section>

              <Section title="Financeiro">
                <Row label="Valor da causa"   value={fmtMoeda(viewItem.valorCausa)} />
                <Row label="Honorários"       value={fmtMoeda(viewItem.honorarios)} />
              </Section>

              {viewItem.observacoes && (
                <Section title="Observações">
                  <p className="text-sm" style={{ color: 'var(--tx)' }}>{viewItem.observacoes}</p>
                </Section>
              )}

              {/* Movimentações */}
              <Section title="Movimentações">
                <div className="space-y-2 mb-3">
                  {(!viewItem.movimentacoes || viewItem.movimentacoes.length === 0) && (
                    <p className="text-xs" style={{ color: 'var(--tx3)' }}>Nenhuma movimentação registrada.</p>
                  )}
                  {(viewItem.movimentacoes || []).slice().reverse().map(m => (
                    <div key={m.id} className="flex gap-2 p-3 rounded-lg" style={{ backgroundColor: 'var(--s2)' }}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--s1)', color: 'var(--tx2)' }}>
                            {TIPOS_MOV.find(t => t.value === m.tipo)?.label || m.tipo}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--tx3)' }}>{new Date(m.data).toLocaleDateString('pt-BR')}</span>
                        </div>
                        <p className="text-sm" style={{ color: 'var(--tx)' }}>{m.texto}</p>
                      </div>
                      <button onClick={() => removeMov(m.id)} className="text-red-400 hover:text-red-600 flex-shrink-0 mt-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                  ))}
                </div>
                {/* Add movimentação */}
                <div className="space-y-2">
                  <select className={inp + ' text-xs'} style={inpStyle} value={novaMovTipo} onChange={e => setNovaMovTipo(e.target.value)}>
                    {TIPOS_MOV.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <textarea rows={2} className={inp + ' text-xs'} style={inpStyle} placeholder="Descreva a movimentação..." value={novaMovText} onChange={e => setNovaMovText(e.target.value)} />
                  <button onClick={addMov} disabled={savingMov || !novaMovText.trim()}
                    className="w-full py-2 rounded-lg text-xs text-white font-medium" style={{ backgroundColor: 'var(--g)', opacity: (savingMov || !novaMovText.trim()) ? 0.5 : 1 }}>
                    {savingMov ? 'Adicionando...' : '+ Registrar movimentação'}
                  </button>
                </div>
              </Section>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--tx2)' }}>{title}</h4>
      <div className="rounded-xl p-3 space-y-1" style={{ backgroundColor: 'var(--s2)' }}>{children}</div>
    </div>
  );
}

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex justify-between gap-2 text-sm py-0.5">
      <span style={{ color: 'var(--tx2)' }}>{label}</span>
      <span className="font-medium text-right" style={{ color: 'var(--tx)' }}>{value}</span>
    </div>
  );
}
