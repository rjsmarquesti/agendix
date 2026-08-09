import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const STATUS = {
  aberta:          { label: 'Aberta',           color: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  em_andamento:    { label: 'Em andamento',      color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  aguardando_peca: { label: 'Aguardando peça',   color: 'bg-orange-500/10 text-orange-400 border-orange-500/20' },
  concluida:       { label: 'Concluída',         color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  cancelada:       { label: 'Cancelada',         color: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

const ITEM_VAZIO = { descricao: '', qtd: 1, valorUnit: '' };

function calcTotal(itens) {
  return itens.reduce((acc, i) => acc + (Number(i.qtd) || 0) * (Number(i.valorUnit) || 0), 0);
}

function fmtMoeda(v) {
  return Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function fmtData(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR');
}

const FORM_VAZIO = {
  clienteNome: '', clienteTel: '', clienteEndereco: '', descricaoServico: '',
  itens: [{ ...ITEM_VAZIO }], dataAbertura: '', dataPrevista: '',
  dataConclusao: '', tecnicoNome: '', garantiaDias: '', observacoes: '', status: 'aberta',
};

export default function OrdemServico() {
  const { tenant } = useAuth();
  const [ordens, setOrdens]         = useState([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [pages, setPages]           = useState(1);
  const [search, setSearch]         = useState('');
  const [filtroStatus, setFiltro]   = useState('');
  const [modal, setModal]           = useState(null); // 'novo' | 'editar' | 'ver'
  const [editing, setEditing]       = useState(null);
  const [viewOs, setViewOs]         = useState(null);
  const [form, setForm]             = useState(FORM_VAZIO);
  const [loading, setLoading]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [modalEnvio, setModalEnvio] = useState(null); // 'wa' | 'email'
  const [envioTel, setEnvioTel]     = useState('');
  const [envioEmail, setEnvioEmail] = useState('');
  const [enviando, setEnviando]     = useState(false);

  const load = useCallback(async (p = 1, s = search, st = filtroStatus) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p });
      if (s)  params.set('search', s);
      if (st) params.set('status', st);
      const d = await api.get(`/ordem-servico?${params}`);
      setOrdens(d.ordens || []);
      setTotal(d.total || 0);
      setPage(d.page || 1);
      setPages(d.pages || 1);
    } catch (err) { toast.error(err.message); }
    finally { setLoading(false); }
  }, [search, filtroStatus]);

  useEffect(() => { load(); }, []);

  function abrirNovo() { setForm(FORM_VAZIO); setEditing(null); setModal('novo'); }

  function abrirEditar(os) {
    setForm({
      clienteNome:     os.clienteNome     || '',
      clienteTel:      os.clienteTel      || '',
      clienteEndereco: os.clienteEndereco || '',
      descricaoServico: os.descricaoServico || '',
      itens:           Array.isArray(os.itens) && os.itens.length > 0 ? os.itens : [{ ...ITEM_VAZIO }],
      dataAbertura:    os.dataAbertura    || '',
      dataPrevista:    os.dataPrevista    || '',
      dataConclusao:   os.dataConclusao   || '',
      tecnicoNome:     os.tecnicoNome     || '',
      garantiaDias:    os.garantiaDias    ?? '',
      observacoes:     os.observacoes     || '',
      status:          os.status          || 'aberta',
    });
    setEditing(os);
    setModal('editar');
  }

  function abrirVer(os) { setViewOs(os); setModal('ver'); }

  async function salvar(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = {
        ...form,
        itens: form.itens.filter(i => i.descricao?.trim()),
        garantiaDias: form.garantiaDias ? Number(form.garantiaDias) : null,
      };
      if (editing) {
        const d = await api.put(`/ordem-servico/${editing.id}`, body);
        toast.success('OS atualizada!');
        setViewOs(d.ordem);
      } else {
        await api.post('/ordem-servico', body);
        toast.success('OS criada!');
      }
      setModal(null);
      load(page);
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  async function deletar(os) {
    if (!confirm(`Remover OS ${os.numero}?`)) return;
    try {
      await api.delete(`/ordem-servico/${os.id}`);
      toast.success('OS removida');
      load(page);
    } catch (err) { toast.error(err.message); }
  }

  async function enviar() {
    setEnviando(true);
    try {
      const endpoint = modalEnvio === 'wa'
        ? `/ordem-servico/${viewOs.id}/enviar-wa`
        : `/ordem-servico/${viewOs.id}/enviar-email`;
      const body = modalEnvio === 'wa' ? { telefone: envioTel } : { email: envioEmail };
      await api.post(endpoint, body);
      toast.success(modalEnvio === 'wa' ? 'Enviado via WhatsApp!' : 'E-mail enviado!');
      const d = await api.get(`/ordem-servico/${viewOs.id}`);
      setViewOs(d.ordem);
      setModalEnvio(null);
      load(page);
    } catch (err) { toast.error(err.message); }
    finally { setEnviando(false); }
  }

  function addItem() { setForm(f => ({ ...f, itens: [...f.itens, { ...ITEM_VAZIO }] })); }
  function removeItem(i) { setForm(f => ({ ...f, itens: f.itens.filter((_, idx) => idx !== i) })); }
  function setItem(i, field, val) {
    setForm(f => ({ ...f, itens: f.itens.map((it, idx) => idx === i ? { ...it, [field]: val } : it) }));
  }

  const titulo = modal === 'editar' ? `Editar ${editing?.numero}` : 'Nova Ordem de Serviço';

  return (
    <Layout title="Ordens de Serviço" subtitle="Gerencie as ordens de serviço">

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && load(1)}
          placeholder="Buscar por cliente ou número..."
          className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--bd)] bg-[var(--s2)] text-[var(--tx)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--g)]"
        />
        <select value={filtroStatus} onChange={e => { setFiltro(e.target.value); load(1, search, e.target.value); }}
          className="px-3 py-2.5 rounded-xl border border-[var(--bd)] bg-[var(--s2)] text-[var(--tx)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--g)]">
          <option value="">Todos os status</option>
          {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <button onClick={() => load(1)}
          className="px-4 py-2.5 rounded-xl border border-[var(--bd)] bg-[var(--s2)] text-[var(--tx)] text-sm hover:border-[var(--g)] transition">
          Buscar
        </button>
        <button onClick={abrirNovo}
          className="px-5 py-2.5 bg-[var(--g)] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition whitespace-nowrap">
          + Nova OS
        </button>
      </div>

      {/* Tabela desktop */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border border-[var(--bd)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--bd)] bg-[var(--s2)] text-[var(--mt)] text-xs uppercase tracking-wide">
              <th className="px-5 py-3 text-left">Número</th>
              <th className="px-5 py-3 text-left">Cliente</th>
              <th className="px-5 py-3 text-left">Status</th>
              <th className="px-5 py-3 text-left">Técnico</th>
              <th className="px-5 py-3 text-left">Previsão</th>
              <th className="px-5 py-3 text-right">Total</th>
              <th className="px-5 py-3 text-left">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-10 text-center text-[var(--mt)]">Carregando...</td></tr>
            ) : ordens.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-14 text-center text-[var(--mt)]">Nenhuma ordem encontrada</td></tr>
            ) : ordens.map(os => {
              const st = STATUS[os.status] || STATUS.aberta;
              return (
                <tr key={os.id} className="border-b border-[var(--bd)] hover:bg-[var(--s2)] transition-colors">
                  <td className="px-5 py-3">
                    <div className="font-mono text-xs text-[var(--g)]">{os.numero}</div>
                    <div className="text-xs text-[var(--mt)]">{fmtData(os.createdAt)}</div>
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-[var(--tx)]">{os.clienteNome}</div>
                    {os.clienteTel && <div className="text-xs text-[var(--mt)]">{os.clienteTel}</div>}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full border ${st.color}`}>{st.label}</span>
                  </td>
                  <td className="px-5 py-3 text-sm text-[var(--tx)]">{os.tecnicoNome || <span className="text-[var(--mt)]">—</span>}</td>
                  <td className="px-5 py-3 text-xs text-[var(--mt)]">{os.dataPrevista ? fmtData(os.dataPrevista + 'T00:00:00') : '—'}</td>
                  <td className="px-5 py-3 text-right font-semibold text-[var(--tx)]">{fmtMoeda(os.valorTotal)}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => abrirVer(os)} className="px-3 py-1.5 text-xs rounded-lg bg-[var(--s2)] border border-[var(--bd)] text-[var(--tx)] hover:border-[var(--g)] transition">Ver</button>
                      <button onClick={() => abrirEditar(os)} className="px-3 py-1.5 text-xs rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition">Editar</button>
                      <button onClick={() => deletar(os)} className="px-3 py-1.5 text-xs rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition">✕</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Cards mobile */}
      <div className="md:hidden space-y-3">
        {loading ? <div className="text-center py-10 text-[var(--mt)]">Carregando...</div>
        : ordens.length === 0 ? <div className="text-center py-14 text-[var(--mt)]">Nenhuma ordem encontrada</div>
        : ordens.map(os => {
          const st = STATUS[os.status] || STATUS.aberta;
          return (
            <div key={os.id} className="rounded-2xl border border-[var(--bd)] bg-[var(--s2)] p-4">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <div className="font-mono text-xs text-[var(--g)] mb-0.5">{os.numero}</div>
                  <div className="font-semibold text-[var(--tx)]">{os.clienteNome}</div>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full border shrink-0 ${st.color}`}>{st.label}</span>
              </div>
              <div className="text-xs text-[var(--mt)] space-y-0.5 mb-3">
                {os.tecnicoNome  && <div>👷 {os.tecnicoNome}</div>}
                {os.dataPrevista && <div>📅 Previsão: {os.dataPrevista}</div>}
                <div className="font-semibold text-[var(--tx)]">{fmtMoeda(os.valorTotal)}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => abrirVer(os)} className="flex-1 py-1.5 text-xs rounded-xl bg-[var(--surface)] border border-[var(--bd)] text-[var(--tx)] hover:border-[var(--g)] transition">Ver</button>
                <button onClick={() => abrirEditar(os)} className="flex-1 py-1.5 text-xs rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition">Editar</button>
                <button onClick={() => deletar(os)} className="flex-1 py-1.5 text-xs rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition">✕</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Paginação */}
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
            <button key={p} onClick={() => load(p)}
              className={`w-9 h-9 rounded-xl text-sm font-medium transition ${p === page ? 'bg-[var(--g)] text-white' : 'bg-[var(--s2)] border border-[var(--bd)] text-[var(--tx)] hover:border-[var(--g)]'}`}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* ── Modal: Criar / Editar ── */}
      {(modal === 'novo' || modal === 'editar') && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--bd)] w-full max-w-2xl my-4 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-[var(--tx)] text-lg">{titulo}</h2>
              <button onClick={() => setModal(null)} className="text-[var(--mt)] hover:text-[var(--tx)] text-xl">✕</button>
            </div>

            <form onSubmit={salvar} className="space-y-4">
              {/* Cliente */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--tx)] mb-1">Cliente *</label>
                  <input required value={form.clienteNome} onChange={e => setForm(f => ({ ...f, clienteNome: e.target.value }))}
                    placeholder="Nome do cliente"
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--bd)] bg-[var(--s2)] text-[var(--tx)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--g)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--tx)] mb-1">Telefone</label>
                  <input value={form.clienteTel} onChange={e => setForm(f => ({ ...f, clienteTel: e.target.value }))}
                    placeholder="(00) 00000-0000"
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--bd)] bg-[var(--s2)] text-[var(--tx)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--g)]" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--tx)] mb-1">Endereço do cliente</label>
                <input value={form.clienteEndereco} onChange={e => setForm(f => ({ ...f, clienteEndereco: e.target.value }))}
                  placeholder="Rua, número, bairro, cidade"
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--bd)] bg-[var(--s2)] text-[var(--tx)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--g)]" />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--tx)] mb-1">Descrição do serviço</label>
                <textarea value={form.descricaoServico} onChange={e => setForm(f => ({ ...f, descricaoServico: e.target.value }))}
                  rows={2} placeholder="Descreva o problema / serviço a realizar"
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--bd)] bg-[var(--s2)] text-[var(--tx)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--g)] resize-none" />
              </div>

              {/* Itens */}
              <div>
                <label className="block text-sm font-medium text-[var(--tx)] mb-2">Itens / Peças</label>
                <div className="space-y-2">
                  <div className="hidden sm:grid grid-cols-12 gap-2 text-xs text-[var(--mt)] px-1">
                    <span className="col-span-6">Descrição</span>
                    <span className="col-span-2 text-center">Qtd</span>
                    <span className="col-span-3 text-right">Valor unit.</span>
                    <span className="col-span-1"></span>
                  </div>
                  {form.itens.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <input value={item.descricao} onChange={e => setItem(i, 'descricao', e.target.value)}
                        placeholder="Descrição do item/peça"
                        className="col-span-6 px-3 py-2 rounded-xl border border-[var(--bd)] bg-[var(--s2)] text-[var(--tx)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--g)]" />
                      <input type="number" min="1" value={item.qtd} onChange={e => setItem(i, 'qtd', e.target.value)}
                        className="col-span-2 px-3 py-2 rounded-xl border border-[var(--bd)] bg-[var(--s2)] text-[var(--tx)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--g)] text-center" />
                      <input type="number" min="0" step="0.01" value={item.valorUnit} onChange={e => setItem(i, 'valorUnit', e.target.value)}
                        placeholder="0,00"
                        className="col-span-3 px-3 py-2 rounded-xl border border-[var(--bd)] bg-[var(--s2)] text-[var(--tx)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--g)] text-right" />
                      <button type="button" onClick={() => removeItem(i)} disabled={form.itens.length === 1}
                        className="col-span-1 flex items-center justify-center text-red-400 hover:text-red-300 disabled:opacity-30 text-lg">✕</button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addItem}
                  className="mt-2 text-sm text-[var(--g)] hover:underline">+ Adicionar item</button>
                <div className="mt-2 text-right font-semibold text-[var(--tx)]">
                  Total: {fmtMoeda(calcTotal(form.itens))}
                </div>
              </div>

              {/* Datas e técnico */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--tx)] mb-1">Data de abertura</label>
                  <input type="date" value={form.dataAbertura} onChange={e => setForm(f => ({ ...f, dataAbertura: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--bd)] bg-[var(--s2)] text-[var(--tx)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--g)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--tx)] mb-1">Previsão de conclusão</label>
                  <input type="date" value={form.dataPrevista} onChange={e => setForm(f => ({ ...f, dataPrevista: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--bd)] bg-[var(--s2)] text-[var(--tx)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--g)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--tx)] mb-1">Data de conclusão</label>
                  <input type="date" value={form.dataConclusao} onChange={e => setForm(f => ({ ...f, dataConclusao: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--bd)] bg-[var(--s2)] text-[var(--tx)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--g)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--tx)] mb-1">Status</label>
                  <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--bd)] bg-[var(--s2)] text-[var(--tx)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--g)]">
                    {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--tx)] mb-1">Técnico responsável</label>
                  <input value={form.tecnicoNome} onChange={e => setForm(f => ({ ...f, tecnicoNome: e.target.value }))}
                    placeholder="Nome do técnico"
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--bd)] bg-[var(--s2)] text-[var(--tx)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--g)]" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--tx)] mb-1">Garantia (dias)</label>
                  <input type="number" min="0" value={form.garantiaDias} onChange={e => setForm(f => ({ ...f, garantiaDias: e.target.value }))}
                    placeholder="Ex: 90"
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--bd)] bg-[var(--s2)] text-[var(--tx)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--g)]" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--tx)] mb-1">Observações</label>
                <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  rows={2} placeholder="Informações adicionais"
                  className="w-full px-4 py-2.5 rounded-xl border border-[var(--bd)] bg-[var(--s2)] text-[var(--tx)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--g)] resize-none" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving}
                  className="flex-1 py-2.5 bg-[var(--g)] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition disabled:opacity-50">
                  {saving ? 'Salvando...' : modal === 'editar' ? 'Atualizar OS' : 'Criar OS'}
                </button>
                <button type="button" onClick={() => setModal(null)}
                  className="flex-1 py-2.5 rounded-xl border border-[var(--bd)] bg-[var(--s2)] text-[var(--tx)] text-sm font-medium hover:border-[var(--g)] transition">
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Visualizar ── */}
      {modal === 'ver' && viewOs && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--bd)] w-full max-w-2xl my-4 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-1">
              <div>
                <span className="font-mono text-sm text-[var(--g)]">{viewOs.numero}</span>
                <span className={`ml-3 text-xs px-2 py-1 rounded-full border ${STATUS[viewOs.status]?.color}`}>{STATUS[viewOs.status]?.label}</span>
              </div>
              <button onClick={() => setModal(null)} className="text-[var(--mt)] hover:text-[var(--tx)] text-xl">✕</button>
            </div>

            <h2 className="text-lg font-bold text-[var(--tx)] mb-4">{viewOs.clienteNome}</h2>

            {/* Dados */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm mb-4">
              {viewOs.clienteTel      && <div><span className="text-[var(--mt)]">Telefone: </span><span className="text-[var(--tx)]">{viewOs.clienteTel}</span></div>}
              {viewOs.clienteEndereco && <div className="col-span-2"><span className="text-[var(--mt)]">Endereço: </span><span className="text-[var(--tx)]">{viewOs.clienteEndereco}</span></div>}
              {viewOs.tecnicoNome     && <div><span className="text-[var(--mt)]">Técnico: </span><span className="text-[var(--tx)]">{viewOs.tecnicoNome}</span></div>}
              {viewOs.garantiaDias    && <div><span className="text-[var(--mt)]">Garantia: </span><span className="text-[var(--tx)]">{viewOs.garantiaDias} dias</span></div>}
              {viewOs.dataAbertura    && <div><span className="text-[var(--mt)]">Abertura: </span><span className="text-[var(--tx)]">{viewOs.dataAbertura}</span></div>}
              {viewOs.dataPrevista    && <div><span className="text-[var(--mt)]">Previsão: </span><span className="text-[var(--tx)]">{viewOs.dataPrevista}</span></div>}
              {viewOs.dataConclusao   && <div><span className="text-[var(--mt)]">Conclusão: </span><span className="text-[var(--tx)]">{viewOs.dataConclusao}</span></div>}
            </div>

            {viewOs.descricaoServico && (
              <div className="mb-4 p-3 rounded-xl bg-[var(--s2)] border border-[var(--bd)] text-sm text-[var(--tx)]">
                🔧 {viewOs.descricaoServico}
              </div>
            )}

            {/* Tabela de itens */}
            {Array.isArray(viewOs.itens) && viewOs.itens.length > 0 && (
              <div className="rounded-xl border border-[var(--bd)] overflow-hidden mb-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[var(--s2)] text-[var(--mt)] text-xs uppercase">
                      <th className="px-4 py-2 text-left">Descrição</th>
                      <th className="px-4 py-2 text-center">Qtd</th>
                      <th className="px-4 py-2 text-right">Unit.</th>
                      <th className="px-4 py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {viewOs.itens.map((it, i) => (
                      <tr key={i} className="border-t border-[var(--bd)]">
                        <td className="px-4 py-2 text-[var(--tx)]">{it.descricao}</td>
                        <td className="px-4 py-2 text-center text-[var(--mt)]">{it.qtd}</td>
                        <td className="px-4 py-2 text-right text-[var(--mt)]">{fmtMoeda(it.valorUnit)}</td>
                        <td className="px-4 py-2 text-right text-[var(--tx)]">{fmtMoeda((it.qtd||1)*(it.valorUnit||0))}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-[var(--bd)] bg-[var(--g)]/10">
                      <td colSpan={3} className="px-4 py-2.5 text-right font-bold text-[var(--g)]">Total</td>
                      <td className="px-4 py-2.5 text-right font-bold text-[var(--g)] text-base">{fmtMoeda(viewOs.valorTotal)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {viewOs.observacoes && (
              <div className="mb-4 p-3 rounded-xl bg-[var(--s2)] border border-[var(--bd)] text-sm text-[var(--mt)]">
                📝 {viewOs.observacoes}
              </div>
            )}

            {/* Ações */}
            <div className="flex flex-wrap gap-2">
              <button onClick={async () => {
                setPdfLoading(true);
                try {
                  const { gerarPdfOrdemServico } = await import('../utils/pdfGenerator');
                  await gerarPdfOrdemServico(viewOs, tenant);
                } catch { toast.error('Erro ao gerar PDF'); }
                finally { setPdfLoading(false); }}
              } disabled={pdfLoading}
                className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/20 text-sm hover:bg-red-500/20 transition disabled:opacity-50">
                {pdfLoading ? '...' : '📄 PDF'}
              </button>
              <button onClick={() => { setEnvioTel(viewOs.clienteTel || ''); setModalEnvio('wa'); }}
                className="px-4 py-2 rounded-xl bg-green-500/10 text-green-400 border border-green-500/20 text-sm hover:bg-green-500/20 transition">
                📱 WhatsApp
              </button>
              <button onClick={() => { setEnvioEmail(''); setModalEnvio('email'); }}
                className="px-4 py-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 text-sm hover:bg-blue-500/20 transition">
                ✉️ E-mail
              </button>
              <button onClick={() => abrirEditar(viewOs)}
                className="px-4 py-2 rounded-xl bg-[var(--s2)] border border-[var(--bd)] text-[var(--tx)] text-sm hover:border-[var(--g)] transition">
                ✏️ Editar
              </button>
              <button onClick={() => setModal(null)}
                className="px-4 py-2 rounded-xl bg-[var(--s2)] border border-[var(--bd)] text-[var(--mt)] text-sm hover:border-[var(--g)] transition ml-auto">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Envio ── */}
      {modalEnvio && (
        <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--surface)] rounded-2xl border border-[var(--bd)] w-full max-w-sm p-6 shadow-2xl">
            <h3 className="font-bold text-[var(--tx)] mb-4">
              {modalEnvio === 'wa' ? '📱 Enviar por WhatsApp' : '✉️ Enviar por E-mail'}
            </h3>
            {modalEnvio === 'wa' ? (
              <input value={envioTel} onChange={e => setEnvioTel(e.target.value)}
                placeholder="55119999-0000"
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--bd)] bg-[var(--s2)] text-[var(--tx)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--g)] mb-4" />
            ) : (
              <input value={envioEmail} onChange={e => setEnvioEmail(e.target.value)}
                placeholder="cliente@email.com"
                className="w-full px-4 py-2.5 rounded-xl border border-[var(--bd)] bg-[var(--s2)] text-[var(--tx)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--g)] mb-4" />
            )}
            <div className="flex gap-3">
              <button onClick={enviar} disabled={enviando || (modalEnvio === 'wa' ? !envioTel : !envioEmail?.includes('@'))}
                className="flex-1 py-2.5 bg-[var(--g)] text-white rounded-xl text-sm font-semibold hover:opacity-90 transition disabled:opacity-50">
                {enviando ? 'Enviando...' : 'Enviar'}
              </button>
              <button onClick={() => setModalEnvio(null)}
                className="flex-1 py-2.5 rounded-xl border border-[var(--bd)] text-[var(--tx)] text-sm hover:border-[var(--g)] transition">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
