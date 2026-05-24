import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const STATUS_LABEL = {
  aguardando: { label: 'Aguardando', color: 'bg-yellow-100 text-yellow-800' },
  em_atendimento: { label: 'Em atendimento', color: 'bg-green-100 text-green-800' },
  encerrado: { label: 'Encerrado', color: 'bg-gray-100 text-gray-600' },
  abandonado: { label: 'Abandonado', color: 'bg-red-100 text-red-700' },
};

export default function WaAtendimento() {
  const { tenant } = useAuth();
  const plano = tenant?.plano;
  const liberado = plano === 'pro' || plano === 'business';

  const [tab, setTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [fila, setFila] = useState([]);
  const [historico, setHistorico] = useState([]);
  const [atendentes, setAtendentes] = useState([]);
  const [logsModal, setLogsModal] = useState(null); // { sessao, logs }
  const [loading, setLoading] = useState(false);

  // form novo atendente
  const [novoNome, setNovoNome] = useState('');
  const [novoTelefone, setNovoTelefone] = useState('');
  const [novoCarga, setNovoCarga] = useState(5);

  async function carregarDashboard() {
    try {
      const { data } = await api.get('/wa-atendimento/dashboard');
      setDashboard(data);
    } catch { /* silencioso */ }
  }

  async function carregarFila() {
    try {
      const { data } = await api.get('/wa-atendimento/fila');
      setFila(data.fila || []);
    } catch { /* silencioso */ }
  }

  async function carregarHistorico() {
    try {
      const { data } = await api.get('/wa-atendimento/fila/historico?limit=30');
      setHistorico(data.fila || []);
    } catch { /* silencioso */ }
  }

  async function carregarAtendentes() {
    try {
      const { data } = await api.get('/wa-atendimento/atendentes');
      setAtendentes(data.atendentes || []);
    } catch { /* silencioso */ }
  }

  useEffect(() => {
    if (!liberado) return;
    carregarDashboard();
    carregarFila();
    carregarAtendentes();
  }, [liberado]);

  useEffect(() => {
    if (tab === 'historico') carregarHistorico();
  }, [tab]);

  async function criarAtendente(e) {
    e.preventDefault();
    if (!novoNome || !novoTelefone) return toast.error('Preencha nome e telefone.');
    setLoading(true);
    try {
      await api.post('/wa-atendimento/atendentes', { nome: novoNome, telefone: novoTelefone, cargaMaxima: novoCarga });
      toast.success('Atendente cadastrado!');
      setNovoNome(''); setNovoTelefone(''); setNovoCarga(5);
      carregarAtendentes();
      carregarDashboard();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erro ao cadastrar');
    } finally { setLoading(false); }
  }

  async function toggleAtendente(id, ativo) {
    try {
      await api.put(`/wa-atendimento/atendentes/${id}`, { ativo: !ativo });
      carregarAtendentes();
    } catch { toast.error('Erro ao atualizar atendente'); }
  }

  async function removerAtendente(id) {
    if (!confirm('Remover atendente?')) return;
    try {
      await api.delete(`/wa-atendimento/atendentes/${id}`);
      toast.success('Removido');
      carregarAtendentes();
    } catch { toast.error('Erro ao remover'); }
  }

  async function encerrarSessao(id) {
    if (!confirm('Encerrar atendimento?')) return;
    try {
      await api.patch(`/wa-atendimento/fila/${id}/encerrar`);
      toast.success('Atendimento encerrado');
      carregarFila(); carregarDashboard();
    } catch { toast.error('Erro ao encerrar'); }
  }

  async function verLogs(sessao) {
    try {
      const { data } = await api.get(`/wa-atendimento/fila/${sessao.id}/logs`);
      setLogsModal(data);
    } catch { toast.error('Erro ao carregar logs'); }
  }

  if (!liberado) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
          <span className="text-4xl">🔒</span>
          <p className="text-lg font-semibold text-gray-700">Módulo Atendimento WhatsApp</p>
          <p className="text-gray-500">Disponível a partir do plano <strong>Pro</strong>.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto p-4 space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">📱 Atendimento WhatsApp</h1>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-200">
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'fila', label: 'Fila Ativa' },
            { id: 'atendentes', label: 'Atendentes' },
            { id: 'historico', label: 'Histórico' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* DASHBOARD */}
        {tab === 'dashboard' && dashboard && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card label="Aguardando" value={dashboard.aguardando} color="text-yellow-600" />
              <Card label="Em atendimento" value={dashboard.emAtendimento} color="text-green-600" />
              <Card label="Encerrados hoje" value={dashboard.encerradosHoje} color="text-gray-600" />
            </div>

            <div>
              <h2 className="text-sm font-semibold text-gray-700 mb-2">Carga dos atendentes</h2>
              <div className="space-y-2">
                {dashboard.atendentes.length === 0 && (
                  <p className="text-sm text-gray-400">Nenhum atendente ativo. Cadastre em "Atendentes".</p>
                )}
                {dashboard.atendentes.map(a => (
                  <div key={a.id} className="flex items-center gap-3 bg-white border rounded-lg p-3">
                    <span className="flex-1 text-sm font-medium text-gray-800">{a.nome}</span>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <span className={`font-bold ${a.cargaAtual >= a.cargaMaxima ? 'text-red-600' : 'text-green-600'}`}>
                        {a.cargaAtual}
                      </span>
                      <span>/</span>
                      <span>{a.cargaMaxima}</span>
                    </div>
                    <div className="w-24 bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${a.cargaAtual >= a.cargaMaxima ? 'bg-red-500' : 'bg-green-500'}`}
                        style={{ width: `${Math.min((a.cargaAtual / a.cargaMaxima) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* FILA ATIVA */}
        {tab === 'fila' && (
          <div className="space-y-2">
            <div className="flex justify-end">
              <button onClick={() => { carregarFila(); carregarDashboard(); }} className="text-xs text-emerald-600 hover:underline">
                ↻ Atualizar
              </button>
            </div>
            {fila.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Nenhum atendimento ativo.</p>}
            {fila.map(item => (
              <div key={item.id} className="bg-white border rounded-lg p-4 flex items-start justify-between gap-4">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-800">{item.clienteNome || item.clienteTelefone}</span>
                    {item.clienteNome && <span className="text-xs text-gray-400">{item.clienteTelefone}</span>}
                    <StatusBadge status={item.status} />
                  </div>
                  <div className="text-xs text-gray-500">
                    Atendente: <strong>{item.atendente?.nome || '— aguardando'}</strong>
                    {' · '}
                    Aberto: {new Date(item.abertaEm).toLocaleString('pt-BR')}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => verLogs(item)}
                    className="text-xs px-2 py-1 border rounded hover:bg-gray-50 text-gray-600"
                  >
                    Ver conversa
                  </button>
                  <button
                    onClick={() => encerrarSessao(item.id)}
                    className="text-xs px-2 py-1 border border-red-300 rounded hover:bg-red-50 text-red-600"
                  >
                    Encerrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ATENDENTES */}
        {tab === 'atendentes' && (
          <div className="space-y-4">
            <form onSubmit={criarAtendente} className="bg-white border rounded-lg p-4 space-y-3">
              <h2 className="text-sm font-semibold text-gray-700">Adicionar atendente</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  className="border rounded px-3 py-2 text-sm"
                  placeholder="Nome"
                  value={novoNome}
                  onChange={e => setNovoNome(e.target.value)}
                />
                <input
                  className="border rounded px-3 py-2 text-sm"
                  placeholder="Telefone (5511999999999)"
                  value={novoTelefone}
                  onChange={e => setNovoTelefone(e.target.value)}
                />
                <input
                  type="number"
                  min={1}
                  max={20}
                  className="border rounded px-3 py-2 text-sm"
                  placeholder="Carga máxima"
                  value={novoCarga}
                  onChange={e => setNovoCarga(parseInt(e.target.value))}
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 text-white text-sm px-4 py-2 rounded hover:bg-emerald-700 disabled:opacity-50"
              >
                Adicionar
              </button>
            </form>

            <div className="space-y-2">
              {atendentes.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Nenhum atendente cadastrado.</p>}
              {atendentes.map(a => (
                <div key={a.id} className="bg-white border rounded-lg p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-gray-800">{a.nome}</p>
                    <p className="text-xs text-gray-500">{a.telefone} · Carga max: {a.cargaMaxima}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${a.ativo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {a.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                    <button
                      onClick={() => toggleAtendente(a.id, a.ativo)}
                      className="text-xs border rounded px-2 py-1 hover:bg-gray-50 text-gray-600"
                    >
                      {a.ativo ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      onClick={() => removerAtendente(a.id)}
                      className="text-xs border border-red-300 rounded px-2 py-1 hover:bg-red-50 text-red-600"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* HISTÓRICO */}
        {tab === 'historico' && (
          <div className="space-y-2">
            {historico.length === 0 && <p className="text-sm text-gray-400 text-center py-8">Nenhum histórico encontrado.</p>}
            {historico.map(item => (
              <div key={item.id} className="bg-white border rounded-lg p-4 flex items-center justify-between gap-4">
                <div>
                  <p className="font-medium text-gray-800">{item.clienteNome || item.clienteTelefone}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(item.abertaEm).toLocaleString('pt-BR')}
                    {item.fechadaEm && ` → ${new Date(item.fechadaEm).toLocaleString('pt-BR')}`}
                    {' · '}{item.atendente?.nome || 'Sem atendente'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={item.status} />
                  <button
                    onClick={() => verLogs(item)}
                    className="text-xs px-2 py-1 border rounded hover:bg-gray-50 text-gray-600"
                  >
                    Auditoria
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de logs */}
      {logsModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <p className="font-semibold text-gray-800">
                  Conversa — {logsModal.sessao.clienteNome || logsModal.sessao.clienteTelefone}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(logsModal.sessao.abertaEm).toLocaleString('pt-BR')}
                  {logsModal.sessao.fechadaEm && ` → ${new Date(logsModal.sessao.fechadaEm).toLocaleString('pt-BR')}`}
                </p>
              </div>
              <button onClick={() => setLogsModal(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {logsModal.logs.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">Sem mensagens registradas.</p>
              )}
              {logsModal.logs.map(log => (
                <div
                  key={log.id}
                  className={`flex ${log.direcao === 'saida' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-xs rounded-xl px-3 py-2 text-sm ${
                    log.direcao === 'saida'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    <p>{log.mensagem}</p>
                    <p className={`text-xs mt-1 ${log.direcao === 'saida' ? 'text-emerald-100' : 'text-gray-400'}`}>
                      {log.fonte} · {new Date(log.criadoEm).toLocaleTimeString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

function Card({ label, value, color }) {
  return (
    <div className="bg-white border rounded-xl p-4 text-center">
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function StatusBadge({ status }) {
  const s = STATUS_LABEL[status] || { label: status, color: 'bg-gray-100 text-gray-600' };
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.color}`}>{s.label}</span>;
}
