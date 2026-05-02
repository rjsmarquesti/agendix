import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import { api } from '../services/api';

const DURACAO_OPTIONS = [
  { value: 15, label: '15 minutos' },
  { value: 30, label: '30 minutos' },
  { value: 45, label: '45 minutos' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1h 30min' },
  { value: 120, label: '2 horas' },
  { value: 180, label: '3 horas' },
];

const EMPTY_FORM = { nome: '', descricao: '', duracaoMin: 60, preco: '', ativo: true };

export default function Servicos() {
  const navigate = useNavigate();
  const [servicos, setServicos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const carregar = useCallback(async () => {
    try {
      const data = await api.get('/servicos');
      setServicos(data.servicos || []);
    } catch (err) {
      toast.error(err.message);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function abrirCriar() {
    setEditId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function abrirEditar(s) {
    setEditId(s.id);
    setForm({
      nome: s.nome,
      descricao: s.descricao || '',
      duracaoMin: s.duracaoMin,
      preco: s.preco != null ? String(s.preco) : '',
      ativo: s.ativo,
    });
    setModalOpen(true);
  }

  async function salvar() {
    if (!form.nome.trim()) { toast.error('Informe o nome do serviço.'); return; }
    setLoading(true);
    try {
      const body = {
        nome: form.nome.trim(),
        descricao: form.descricao.trim() || null,
        duracaoMin: parseInt(form.duracaoMin),
        preco: form.preco !== '' ? parseFloat(form.preco) : null,
        ativo: form.ativo,
      };
      if (editId) {
        await api.put(`/servicos/${editId}`, body);
        toast.success('Serviço atualizado!');
      } else {
        await api.post('/servicos', body);
        toast.success('Serviço criado!');
      }
      setModalOpen(false);
      carregar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleAtivo(s) {
    try {
      await api.put(`/servicos/${s.id}`, { ativo: !s.ativo });
      toast.success(s.ativo ? 'Serviço desativado.' : 'Serviço ativado.');
      carregar();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function moverOrdem(s, direcao) {
    try {
      await api.put(`/servicos/${s.id}/ordem`, { direcao });
      carregar();
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function deletar(s) {
    if (!confirm(`Remover "${s.nome}"?`)) return;
    try {
      await api.delete(`/servicos/${s.id}`);
      toast.success('Serviço removido.');
      carregar();
    } catch (err) {
      toast.error(err.message);
    }
  }

  function durLabel(min) {
    if (min < 60) return `${min} min`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m ? `${h}h ${m}min` : `${h}h`;
  }

  return (
    <Layout title="Serviços" subtitle="Gerencie os tipos de atendimento disponíveis para agendamento">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {servicos.length} serviço{servicos.length !== 1 ? 's' : ''} cadastrado{servicos.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={abrirCriar} className="btn-primary px-4 py-2 rounded-xl text-sm font-semibold text-white flex items-center gap-2">
          + Novo Serviço
        </button>
      </div>

      {servicos.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-4xl mb-3">🛠️</p>
          <p className="font-medium">Nenhum serviço cadastrado</p>
          <p className="text-sm mt-1">Crie serviços para que os clientes possam selecionar ao agendar.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {servicos.map((s, idx) => (
            <div key={s.id} className={`bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-4 flex items-center gap-4 shadow-sm ${!s.ativo ? 'opacity-50' : ''}`}>
              {/* Reordenar */}
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => moverOrdem(s, 'cima')}
                  disabled={idx === 0}
                  className="text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 disabled:opacity-20 text-xs"
                  title="Mover para cima"
                >▲</button>
                <button
                  onClick={() => moverOrdem(s, 'baixo')}
                  disabled={idx === servicos.length - 1}
                  className="text-gray-300 dark:text-gray-600 hover:text-gray-600 dark:hover:text-gray-400 disabled:opacity-20 text-xs"
                  title="Mover para baixo"
                >▼</button>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{s.nome}</span>
                  {!s.ativo && <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">Inativo</span>}
                </div>
                {s.descricao && <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{s.descricao}</p>}
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500 dark:text-gray-400">
                  <span>⏱ {durLabel(s.duracaoMin)}</span>
                  {s.preco != null && <span>💰 R$ {Number(s.preco).toFixed(2).replace('.', ',')}</span>}
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleAtivo(s)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
                >
                  {s.ativo ? 'Desativar' : 'Ativar'}
                </button>
                <button
                  onClick={() => abrirEditar(s)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                >
                  Editar
                </button>
                <button
                  onClick={() => deletar(s)}
                  className="text-xs px-3 py-1.5 rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 dark:text-red-400"
                >
                  Remover
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editId ? 'Editar Serviço' : 'Novo Serviço'}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome *</label>
            <input
              type="text"
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              placeholder="ex: Consulta, Retorno, Avaliação"
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              maxLength={100}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição</label>
            <textarea
              value={form.descricao}
              onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
              placeholder="Breve descrição exibida no formulário público (opcional)"
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              rows={2}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Duração</label>
              <select
                value={form.duracaoMin}
                onChange={e => setForm(f => ({ ...f, duracaoMin: parseInt(e.target.value) }))}
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {DURACAO_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preço (R$)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.preco}
                onChange={e => setForm(f => ({ ...f, preco: e.target.value }))}
                placeholder="Opcional"
                className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.ativo}
              onChange={e => setForm(f => ({ ...f, ativo: e.target.checked }))}
              className="w-4 h-4 rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Serviço ativo (visível no formulário público)</span>
          </label>
          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="flex-1 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700">
              Cancelar
            </button>
            <button onClick={salvar} disabled={loading} className="flex-1 py-2.5 btn-primary rounded-xl text-sm font-semibold text-white disabled:opacity-50">
              {loading ? 'Salvando...' : editId ? 'Salvar' : 'Criar Serviço'}
            </button>
          </div>
        </div>
      </Modal>
    </Layout>
  );
}
