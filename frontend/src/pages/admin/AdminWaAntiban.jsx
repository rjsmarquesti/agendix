import { useState, useEffect, useCallback } from 'react';
import AdminLayout from '../../components/AdminLayout';
import { api } from '../../services/api';

const THRESHOLD_DEFAULT = 70;

function BarraProgresso({ valor, limite, label }) {
  const pct = limite > 0 ? Math.min(Math.round((valor / limite) * 100), 100) : 0;
  const cor  = pct >= 80 ? '#ef4444' : pct >= 50 ? '#f59e0b' : '#22c55e';
  return (
    <div>
      <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--mt-lt)' }}>
        <span>{label}</span>
        <span className="font-mono" style={{ color: 'var(--tx)' }}>{valor} / {limite}</span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bd)' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: cor }} />
      </div>
    </div>
  );
}

function BadgeStatus({ suspensa, dentroJanela, processing }) {
  if (suspensa)       return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-900/40 text-red-400">SUSPENSA</span>;
  if (!dentroJanela)  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-900/40 text-yellow-400">FORA DA JANELA</span>;
  if (processing)     return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-900/40 text-blue-400">ENVIANDO</span>;
  return <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-green-900/40 text-green-400">OK</span>;
}

function ScoreBadge({ score }) {
  const cor = score >= 70 ? 'text-green-400' : score >= 40 ? 'text-yellow-400' : 'text-red-400';
  return <span className={`font-bold text-lg ${cor}`}>{score}</span>;
}

export default function AdminWaAntiban() {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [threshold, setThreshold] = useState(THRESHOLD_DEFAULT);
  const [unlocking, setUnlocking] = useState(null); // `${instance}:${tel}`
  const [liberando, setLiberando] = useState(null); // instance
  const [expanded, setExpanded] = useState({});     // { [instance]: bool }
  const [lastRefresh, setLastRefresh] = useState(null);

  const carregar = useCallback(async () => {
    try {
      setLoading(true);
      const d = await api.get(`/admin/tenants/wa-antiban?threshold=${threshold}`);
      setData(d);
      setLastRefresh(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [threshold]);

  useEffect(() => { carregar(); }, [carregar]);

  // Auto-refresh a cada 30s
  useEffect(() => {
    const t = setInterval(carregar, 30_000);
    return () => clearInterval(t);
  }, [carregar]);

  async function desbloquearNumero(instance, telefone) {
    const key = `${instance}:${telefone}`;
    setUnlocking(key);
    try {
      await api.delete(`/admin/tenants/wa-reputacao/${telefone}?instance=${encodeURIComponent(instance)}`);
      await carregar();
    } catch (e) {
      alert('Erro ao desbloquear: ' + e.message);
    } finally {
      setUnlocking(null);
    }
  }

  async function liberarCircuitBreaker(instance) {
    setLiberando(instance);
    try {
      await api.post(`/admin/tenants/wa-watchdog/${encodeURIComponent(instance)}/liberar`);
      await carregar();
    } catch (e) {
      alert('Erro ao liberar: ' + e.message);
    } finally {
      setLiberando(null);
    }
  }

  const toggleExpanded = (instance) =>
    setExpanded(prev => ({ ...prev, [instance]: !prev[instance] }));

  if (loading && !data) {
    return (
      <AdminLayout title="WA Anti-ban" subtitle="Monitoramento de fila e reputação">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-current rounded-full border-t-transparent" style={{ color: 'var(--g)' }} />
        </div>
      </AdminLayout>
    );
  }

  const instancias = data?.instancias || [];
  const totalSuspensas  = instancias.filter(i => i.circuitBreaker?.suspensa).length;
  const totalBloqueados = instancias.reduce((s, i) => s + (i.numBloqueados || 0), 0);
  const totalPendentes  = instancias.reduce((s, i) => s + (i.pendentes || 0), 0);
  const foraJanela      = instancias.filter(i => !i.dentroJanela).length;

  return (
    <AdminLayout title="WA Anti-ban" subtitle="Monitoramento de fila, circuit breaker e reputação de números">
      {/* Header com KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Instâncias',     value: instancias.length, cor: 'var(--g)' },
          { label: 'Suspensas',      value: totalSuspensas,   cor: totalSuspensas  > 0 ? '#ef4444' : '#22c55e' },
          { label: 'Fora da janela', value: foraJanela,       cor: foraJanela     > 0 ? '#f59e0b' : '#22c55e' },
          { label: 'Nº bloqueados',  value: totalBloqueados,  cor: totalBloqueados > 0 ? '#f59e0b' : '#22c55e' },
        ].map(({ label, value, cor }) => (
          <div key={label} className="rounded-2xl p-4 border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--bd)' }}>
            <p className="text-xs mb-1" style={{ color: 'var(--mt-lt)' }}>{label}</p>
            <p className="text-3xl font-bold" style={{ color: cor }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Controles */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex items-center gap-2">
          <label className="text-sm" style={{ color: 'var(--mt-lt)' }}>Score mínimo:</label>
          <select value={threshold} onChange={e => setThreshold(Number(e.target.value))}
            className="text-sm rounded-lg px-3 py-1.5 border"
            style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--bd)', color: 'var(--tx)' }}>
            {[100, 90, 70, 50, 30, 0].map(v => <option key={v} value={v}>{v}</option>)}
          </select>
        </div>
        <button onClick={carregar} disabled={loading}
          className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm border transition-colors disabled:opacity-50"
          style={{ borderColor: 'var(--bd)', color: 'var(--tx)', backgroundColor: 'var(--surface)' }}>
          <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Atualizar
        </button>
        {lastRefresh && (
          <span className="text-xs" style={{ color: 'var(--mt-lt)' }}>
            Atualizado: {lastRefresh.toLocaleTimeString('pt-BR')}
          </span>
        )}
        {totalPendentes > 0 && (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-900/30 text-yellow-400">
            ⏳ {totalPendentes} mensagem{totalPendentes > 1 ? 's' : ''} aguardando na fila
          </span>
        )}
      </div>

      {/* Cards por instância */}
      <div className="space-y-4">
        {instancias.length === 0 && (
          <div className="text-center py-16 rounded-2xl border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--bd)' }}>
            <p style={{ color: 'var(--mt-lt)' }}>Nenhuma instância Evolution configurada.</p>
          </div>
        )}

        {instancias.map(inst => {
          const cb       = inst.circuitBreaker || {};
          const numeros  = inst.numeros || [];
          const isExp    = expanded[inst.instance];

          return (
            <div key={inst.instance} className="rounded-2xl border overflow-hidden"
              style={{ backgroundColor: 'var(--surface)', borderColor: cb.suspensa ? '#ef4444' : 'var(--bd)' }}>

              {/* Cabeçalho do card */}
              <div className="p-5 flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-bold text-base truncate" style={{ color: 'var(--tx)' }}>{inst.tenantNome}</h3>
                    <BadgeStatus suspensa={cb.suspensa} dentroJanela={inst.dentroJanela} processing={inst.processing} />
                  </div>
                  <p className="text-xs font-mono" style={{ color: 'var(--mt-lt)' }}>{inst.instance}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {cb.suspensa && (
                    <button onClick={() => liberarCircuitBreaker(inst.instance)}
                      disabled={liberando === inst.instance}
                      className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors disabled:opacity-50"
                      style={{ backgroundColor: '#ef4444', color: '#fff' }}>
                      {liberando === inst.instance ? 'Liberando...' : 'Liberar Circuit Breaker'}
                    </button>
                  )}
                  <button onClick={() => toggleExpanded(inst.instance)}
                    className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
                    style={{ borderColor: 'var(--bd)', color: 'var(--mt-lt)', backgroundColor: 'transparent' }}>
                    {isExp ? 'Recolher' : `Ver números (${numeros.length})`}
                  </button>
                </div>
              </div>

              {/* Corpo: barras de progresso */}
              <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Fila */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--mt-lt)' }}>Fila</p>
                  <BarraProgresso valor={inst.sentToday}    limite={inst.limiteDia}  label="Hoje" />
                  <BarraProgresso valor={inst.sentThisHour} limite={inst.limiteHora} label="Esta hora" />
                  {inst.pendentes > 0 && (
                    <p className="text-xs" style={{ color: '#f59e0b' }}>⏳ {inst.pendentes} na fila</p>
                  )}
                  <p className="text-xs" style={{ color: 'var(--mt-lt)' }}>
                    Janela: {inst.horaInicio}h–{inst.horaFim}h UTC · Delay: {(inst.minDelay/1000)|0}–{(inst.maxDelay/1000)|0}s
                  </p>
                </div>

                {/* Circuit Breaker */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--mt-lt)' }}>Circuit Breaker</p>
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${cb.suspensa ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                    <span className="text-sm" style={{ color: 'var(--tx)' }}>
                      {cb.suspensa ? 'SUSPENSA' : 'Operacional'}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--mt-lt)' }}>
                    Erros consecutivos: <span className="font-mono" style={{ color: cb.erros >= cb.threshold ? '#ef4444' : 'var(--tx)' }}>{cb.erros} / {cb.threshold}</span>
                  </p>
                  {cb.suspensaAte && (
                    <p className="text-xs" style={{ color: '#ef4444' }}>
                      Libera: {new Date(cb.suspensaAte).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>

                {/* Reputação */}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--mt-lt)' }}>Reputação</p>
                  <div className="flex items-baseline gap-3">
                    <span className="text-xs" style={{ color: 'var(--mt-lt)' }}>Bloqueados:</span>
                    <span className="font-bold" style={{ color: inst.numBloqueados > 0 ? '#ef4444' : '#22c55e' }}>{inst.numBloqueados}</span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-xs" style={{ color: 'var(--mt-lt)' }}>Score baixo:</span>
                    <span className="font-bold" style={{ color: inst.numBaixoScore > 0 ? '#f59e0b' : '#22c55e' }}>{inst.numBaixoScore}</span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--mt-lt)' }}>Threshold: &lt; {data?.threshold}</p>
                </div>
              </div>

              {/* Tabela de números expandida */}
              {isExp && numeros.length > 0 && (
                <div className="border-t" style={{ borderColor: 'var(--bd)' }}>
                  <div className="px-5 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--mt-lt)' }}>
                      Números com score &lt; {data?.threshold}
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ color: 'var(--mt-lt)' }}>
                            <th className="text-left pb-2 pr-4 font-medium text-xs">Telefone</th>
                            <th className="text-center pb-2 pr-4 font-medium text-xs">Score</th>
                            <th className="text-center pb-2 pr-4 font-medium text-xs">Falhas consec.</th>
                            <th className="text-center pb-2 pr-4 font-medium text-xs">Total falhas</th>
                            <th className="text-center pb-2 pr-4 font-medium text-xs">Status</th>
                            <th className="text-center pb-2 font-medium text-xs">Libera em</th>
                            <th className="pb-2 font-medium text-xs"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: 'var(--bd)' }}>
                          {numeros.map(n => (
                            <tr key={n.telefone}>
                              <td className="py-2 pr-4 font-mono text-xs" style={{ color: 'var(--tx)' }}>{n.telefone}</td>
                              <td className="py-2 pr-4 text-center"><ScoreBadge score={n.score} /></td>
                              <td className="py-2 pr-4 text-center font-mono text-xs" style={{ color: 'var(--tx)' }}>{n.consecutivas}</td>
                              <td className="py-2 pr-4 text-center font-mono text-xs" style={{ color: 'var(--tx)' }}>{n.totalFalhas}</td>
                              <td className="py-2 pr-4 text-center">
                                {n.bloqueado
                                  ? <span className="px-2 py-0.5 rounded-full text-xs bg-red-900/40 text-red-400">Bloqueado</span>
                                  : <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-900/40 text-yellow-400">Score baixo</span>
                                }
                              </td>
                              <td className="py-2 pr-4 text-center text-xs" style={{ color: 'var(--mt-lt)' }}>
                                {n.bloqueadoAte ? new Date(n.bloqueadoAte).toLocaleString('pt-BR') : '—'}
                              </td>
                              <td className="py-2 text-right">
                                {n.bloqueado && (
                                  <button onClick={() => desbloquearNumero(inst.instance, n.telefone)}
                                    disabled={unlocking === `${inst.instance}:${n.telefone}`}
                                    className="text-xs px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50 font-medium"
                                    style={{ backgroundColor: 'var(--g)', color: '#08080C' }}>
                                    {unlocking === `${inst.instance}:${n.telefone}` ? '...' : 'Desbloquear'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {isExp && numeros.length === 0 && (
                <div className="border-t px-5 py-4 text-sm" style={{ borderColor: 'var(--bd)', color: 'var(--mt-lt)' }}>
                  Nenhum número com score abaixo de {data?.threshold} nesta instância.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legenda */}
      <div className="mt-8 p-5 rounded-2xl border text-sm space-y-2" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--bd)' }}>
        <p className="font-semibold mb-3" style={{ color: 'var(--tx)' }}>Legenda — camadas de proteção anti-ban</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs" style={{ color: 'var(--mt-lt)' }}>
          <p><strong style={{ color: 'var(--tx)' }}>Janela horária:</strong> envios somente 08h–20h BRT (11h–23h UTC)</p>
          <p><strong style={{ color: 'var(--tx)' }}>Hard limit:</strong> máx 200 mensagens/dia por instância</p>
          <p><strong style={{ color: 'var(--tx)' }}>Rate limit:</strong> máx 30 mensagens/hora por instância</p>
          <p><strong style={{ color: 'var(--tx)' }}>Circuit breaker:</strong> 5 erros consecutivos → suspende 2h</p>
          <p><strong style={{ color: 'var(--tx)' }}>Reputação:</strong> 3 bounces consecutivos → bloqueia número 24h (por instância)</p>
          <p><strong style={{ color: 'var(--tx)' }}>Dedup:</strong> mesma mensagem para o mesmo número em &lt;1h → descartada</p>
          <p><strong style={{ color: 'var(--tx)' }}>Delay:</strong> 7–20s aleatório entre envios</p>
        </div>
      </div>
    </AdminLayout>
  );
}
