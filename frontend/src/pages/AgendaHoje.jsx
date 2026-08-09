import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

const STATUS = {
  marcado:    { label: 'Marcado',    bg: 'bg-blue-100',   text: 'text-blue-700',   dot: 'bg-blue-500' },
  confirmado: { label: 'Confirmado', bg: 'bg-green-100',  text: 'text-green-700',  dot: 'bg-green-500' },
  cancelado:  { label: 'Cancelado',  bg: 'bg-red-100',    text: 'text-red-600',    dot: 'bg-red-400' },
  realizado:  { label: 'Realizado',  bg: 'bg-gray-100',   text: 'text-gray-500',   dot: 'bg-gray-400' },
};

const ACOES = [
  { status: 'confirmado', label: '✓ Confirmar',  cls: 'bg-green-500 text-white' },
  { status: 'realizado',  label: '✓ Realizado',  cls: 'bg-gray-600 text-white' },
  { status: 'cancelado',  label: '✗ Cancelar',   cls: 'bg-red-500 text-white' },
];

function hojeStr() {
  return new Date().toISOString().split('T')[0];
}

function formatHora(h) {
  return h?.slice(0, 5) || '';
}

export default function AgendaHoje() {
  const { user, tenant } = useAuth();
  const navigate = useNavigate();
  const [agendamentos, setAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(null);
  const [expandido, setExpandido] = useState(null);
  const [gerando, setGerando] = useState(false);

  async function imprimirAgenda() {
    setGerando(true);
    try {
      const { gerarPdfAgendaDia } = await import('../utils/pdfGenerator');
      await gerarPdfAgendaDia(agendamentos, tenant, hoje);
    } catch (err) {
      toast.error('Erro ao gerar PDF: ' + err.message);
    } finally {
      setGerando(false);
    }
  }

  const hoje = hojeStr();
  const dataFormatada = new Date(hoje + 'T12:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: '2-digit', month: 'long',
  });

  const carregar = useCallback(async () => {
    try {
      const d = await api.get('/agendamentos', { data: hoje });
      setAgendamentos(d.agendamentos || []);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [hoje]);

  useEffect(() => { carregar(); }, [carregar]);

  async function mudarStatus(ag, novoStatus) {
    setAtualizando(ag.id);
    try {
      await api.put(`/agendamentos/${ag.id}`, {
        lead_id: ag.leadId,
        data: ag.data,
        hora: ag.hora,
        tipo: ag.tipo,
        status: novoStatus,
        observacoes: ag.observacoes,
      });
      toast.success(STATUS[novoStatus]?.label + '!');
      setExpandido(null);
      carregar();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setAtualizando(null);
    }
  }

  const ativos    = agendamentos.filter(a => !['cancelado', 'realizado'].includes(a.status));
  const concluidos = agendamentos.filter(a => ['cancelado', 'realizado'].includes(a.status));
  const total     = agendamentos.length;
  const realizados = agendamentos.filter(a => a.status === 'realizado').length;
  const pendentes  = agendamentos.filter(a => a.status === 'marcado').length;

  return (
    <Layout title="Agenda de Hoje" subtitle={dataFormatada}>
      <div className="px-4 py-4 space-y-4">

        {/* Barra de ações */}
        <div className="flex justify-end">
          <button
            onClick={imprimirAgenda}
            disabled={gerando || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-gray-800
                       border border-gray-200 dark:border-gray-700 text-sm font-medium
                       text-gray-700 dark:text-gray-300 shadow-sm hover:bg-gray-50
                       dark:hover:bg-gray-700 disabled:opacity-50 transition-colors">
            {gerando ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            )}
            {gerando ? 'Gerando...' : 'Imprimir agenda'}
          </button>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 text-center shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{total}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Total</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 text-center shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-2xl font-bold text-amber-500">{pendentes}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Pendentes</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-3 text-center shadow-sm border border-gray-100 dark:border-gray-700">
            <p className="text-2xl font-bold text-green-600">{realizados}</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Realizados</p>
          </div>
        </div>

        {/* Timeline de ativos */}
        {loading ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Carregando...
          </div>
        ) : ativos.length === 0 && concluidos.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-5xl mb-3">📭</p>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum agendamento hoje</p>
            <button onClick={() => navigate('/agendamentos')}
              className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold">
              + Novo agendamento
            </button>
          </div>
        ) : (
          <>
            {ativos.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Agenda do dia</p>
                <div className="space-y-3">
                  {ativos.map(ag => {
                    const s = STATUS[ag.status] || STATUS.marcado;
                    const aberto = expandido === ag.id;
                    return (
                      <div key={ag.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <button
                          onClick={() => setExpandido(aberto ? null : ag.id)}
                          className="w-full flex items-center gap-3 p-4 text-left">
                          <div className="w-14 text-center flex-shrink-0">
                            <span className="text-xl font-bold text-blue-600 dark:text-blue-400 leading-none">
                              {formatHora(ag.hora)}
                            </span>
                          </div>
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <div className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${s.dot}`} />
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{ag.lead?.nome || ag.clienteNome || '—'}</p>
                              <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{ag.tipo || 'Consulta'}{ag.lead?.telefone ? ` · ${ag.lead.telefone}` : ''}</p>
                            </div>
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${s.bg} ${s.text}`}>
                            {s.label}
                          </span>
                        </button>

                        {aberto && (
                          <div className="px-4 pb-4 pt-0 border-t border-gray-50 dark:border-gray-700">
                            {ag.observacoes && (
                              <p className="text-xs text-gray-400 dark:text-gray-500 mb-3 pt-3 italic">"{ag.observacoes}"</p>
                            )}
                            {ag.lead?.telefone && (
                              <a href={`https://wa.me/55${ag.lead.telefone.replace(/\D/g,'')}`}
                                target="_blank" rel="noreferrer"
                                className="flex items-center gap-2 w-full mb-3 py-2.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl text-sm font-medium justify-center">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.122.554 4.11 1.523 5.83L.057 23.882l6.233-1.635A11.937 11.937 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.015-1.374l-.36-.214-3.7.971.988-3.609-.235-.371A9.818 9.818 0 112 12 9.818 9.818 0 0112 2.182c5.42 0 9.818 4.398 9.818 9.818 0 5.421-4.398 9.818-9.818 9.818z"/>
                                </svg>
                                Abrir WhatsApp
                              </a>
                            )}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                              {ACOES.filter(a => a.status !== ag.status).map(acao => (
                                <button key={acao.status}
                                  disabled={atualizando === ag.id}
                                  onClick={() => mudarStatus(ag, acao.status)}
                                  className={`py-2.5 rounded-xl text-xs font-semibold transition active:scale-95 disabled:opacity-50 ${acao.cls}`}>
                                  {atualizando === ag.id ? '...' : acao.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {concluidos.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">Concluídos</p>
                <div className="space-y-2">
                  {concluidos.map(ag => {
                    const s = STATUS[ag.status] || STATUS.realizado;
                    return (
                      <div key={ag.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-3 opacity-70">
                        <span className="text-base font-bold text-gray-400 dark:text-gray-500 w-14 text-center">{formatHora(ag.hora)}</span>
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{ag.lead?.nome || ag.clienteNome}</p>
                          <p className="text-xs text-gray-400 dark:text-gray-500">{ag.tipo || 'Consulta'}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}>{s.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

    </Layout>
  );
}
