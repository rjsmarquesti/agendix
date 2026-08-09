import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';

export default function CancelamentoPublico() {
  const { token } = useParams();
  const [estado, setEstado] = useState('carregando'); // carregando | ok | jaCancelado | naoPode | erro | confirmando | cancelado
  const [ag, setAg] = useState(null);
  const [erro, setErro] = useState('');
  const [cancelando, setCancelando] = useState(false);

  useEffect(() => {
    api.get(`/public/cancelar/${token}`)
      .then(d => {
        setAg(d.agendamento);
        if (d.jaCancelado) setEstado('jaCancelado');
        else if (!d.podeCancel) setEstado('naoPode');
        else setEstado('ok');
      })
      .catch(err => {
        setErro(err.response?.data?.error || 'Link inválido ou expirado.');
        setEstado('erro');
      });
  }, [token]);

  async function confirmarCancelamento() {
    setCancelando(true);
    try {
      await api.post(`/public/cancelar/${token}`, {});
      setEstado('cancelado');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao cancelar. Tente novamente.');
      setEstado('erro');
    } finally {
      setCancelando(false);
    }
  }

  const cor = ag?.tenant?.corPrimaria || '#00C97A';
  const tenantNome = ag?.tenant?.nome || 'Agendix';

  function fmtData(d) {
    if (!d) return '';
    const [y, m, dia] = d.split('-');
    return `${dia}/${m}/${y}`;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6"
      style={{ background: '#09090C', fontFamily: 'DM Sans, sans-serif' }}>

      {/* Logo / nome do tenant */}
      <div className="mb-8 text-center">
        {ag?.tenant?.logo ? (
          <img src={ag.tenant.logo} alt={tenantNome} className="h-10 mx-auto mb-3 object-contain" />
        ) : (
          <div className="text-lg font-bold mb-1" style={{ color: cor }}>{tenantNome}</div>
        )}
      </div>

      <div className="w-full max-w-sm rounded-2xl border p-7 space-y-5"
        style={{ background: '#111118', borderColor: 'rgba(255,255,255,0.08)' }}>

        {/* Carregando */}
        {estado === 'carregando' && (
          <div className="text-center text-slate-400 py-8">Carregando...</div>
        )}

        {/* Erro */}
        {estado === 'erro' && (
          <div className="text-center space-y-3">
            <div className="text-4xl">⚠️</div>
            <p className="text-white font-semibold">Link inválido</p>
            <p className="text-sm text-slate-400">{erro}</p>
          </div>
        )}

        {/* Já cancelado */}
        {estado === 'jaCancelado' && (
          <div className="text-center space-y-3">
            <div className="text-4xl">✅</div>
            <p className="text-white font-semibold">Já cancelado</p>
            <p className="text-sm text-slate-400">Este agendamento já havia sido cancelado anteriormente.</p>
          </div>
        )}

        {/* Não pode cancelar */}
        {estado === 'naoPode' && (
          <div className="text-center space-y-3">
            <div className="text-4xl">🔒</div>
            <p className="text-white font-semibold">Não é possível cancelar</p>
            <p className="text-sm text-slate-400">Este agendamento já foi realizado ou não pode mais ser cancelado por aqui.</p>
            <p className="text-sm text-slate-500">Entre em contato diretamente com <strong className="text-slate-300">{tenantNome}</strong>.</p>
          </div>
        )}

        {/* Pronto para cancelar */}
        {(estado === 'ok' || estado === 'confirmando') && ag && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="text-3xl mb-2">📅</div>
              <p className="text-white font-semibold text-lg">{ag.servico || ag.tipo}</p>
              <p className="text-slate-300 text-sm mt-1">
                {fmtData(ag.data)} às {ag.hora}
              </p>
              {ag.clienteNome && (
                <p className="text-slate-500 text-xs mt-1">{ag.clienteNome}</p>
              )}
            </div>

            <div className="border rounded-xl p-4 space-y-1 text-sm"
              style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-slate-400">Empresa: <span className="text-white">{tenantNome}</span></p>
              <p className="text-slate-400">Data: <span className="text-white">{fmtData(ag.data)}</span></p>
              <p className="text-slate-400">Horário: <span className="text-white">{ag.hora}</span></p>
              <p className="text-slate-400">Serviço: <span className="text-white">{ag.servico || ag.tipo}</span></p>
            </div>

            {estado === 'ok' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 text-center">
                  Tem certeza que deseja cancelar este agendamento?
                </p>
                <button
                  onClick={confirmarCancelamento}
                  disabled={cancelando}
                  className="w-full py-3 rounded-xl font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ background: '#ef4444', color: '#fff' }}>
                  {cancelando ? 'Cancelando...' : 'Sim, cancelar agendamento'}
                </button>
                <a href={`/agendar/${ag.tenant?.slug}`}
                  className="block text-center text-xs py-2 rounded-xl border transition-opacity hover:opacity-80"
                  style={{ borderColor: 'rgba(255,255,255,0.1)', color: '#b0b0c8' }}>
                  Não, manter agendamento
                </a>
              </div>
            )}
          </div>
        )}

        {/* Cancelado com sucesso */}
        {estado === 'cancelado' && (
          <div className="text-center space-y-4">
            <div className="text-4xl">✅</div>
            <p className="text-white font-semibold text-lg">Cancelado com sucesso</p>
            <p className="text-sm text-slate-400">Seu agendamento foi cancelado. Se precisar reagendar, entre em contato com <strong className="text-slate-300">{tenantNome}</strong>.</p>
            {ag?.tenant?.slug && (
              <a href={`/agendar/${ag.tenant.slug}`}
                className="inline-block mt-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: cor, color: '#08080C' }}>
                Fazer novo agendamento
              </a>
            )}
          </div>
        )}
      </div>

      <p className="mt-6 text-xs text-slate-600">Powered by Agendix</p>
    </div>
  );
}
