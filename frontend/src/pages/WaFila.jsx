import { useState, useEffect, useCallback } from 'react';
import Layout from '../components/Layout';
import { api } from '../services/api';

function BarraProgresso({ valor, limite, label, cor }) {
  const pct = limite > 0 ? Math.min(Math.round((valor / limite) * 100), 100) : 0;
  const bgCor = cor || (pct >= 80 ? '#ef4444' : pct >= 50 ? '#f59e0b' : '#22c55e');
  return (
    <div>
      <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--mt-lt)' }}>
        <span>{label}</span>
        <span className="font-mono" style={{ color: 'var(--tx)' }}>{valor} / {limite}</span>
      </div>
      <div className="h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bd)' }}>
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: bgCor }} />
      </div>
      <p className="text-xs mt-0.5 text-right" style={{ color: 'var(--mt-lt)' }}>{pct}%</p>
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div className="rounded-2xl p-5 border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--bd)' }}>
      <p className="text-xs mb-2" style={{ color: 'var(--mt-lt)' }}>{label}</p>
      <p className="text-3xl font-bold" style={{ color: color || 'var(--g)' }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--mt-lt)' }}>{sub}</p>}
    </div>
  );
}

function ScoreCircle({ score }) {
  const cor = score >= 70 ? '#22c55e' : score >= 40 ? '#f59e0b' : '#ef4444';
  return (
    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm border-2" style={{ borderColor: cor, color: cor }}>
      {score}
    </span>
  );
}

export default function WaFila() {
  const [data, setData]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [unlocking, setUnlocking] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [erro, setErro]         = useState(null);

  const carregar = useCallback(async () => {
    try {
      setErro(null);
      const d = await api.get('/wa-fila/stats');
      setData(d);
      setLastRefresh(new Date());
    } catch (e) {
      setErro(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  useEffect(() => {
    const t = setInterval(carregar, 30_000);
    return () => clearInterval(t);
  }, [carregar]);

  async function desbloquear(telefone) {
    setUnlocking(telefone);
    try {
      await api.delete(`/wa-fila/numeros/${telefone}`);
      await carregar();
    } catch (e) {
      alert('Erro: ' + e.message);
    } finally {
      setUnlocking(null);
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-current rounded-full border-t-transparent" style={{ color: 'var(--g)' }} />
        </div>
      </Layout>
    );
  }

  if (erro) {
    return (
      <Layout>
        <div className="p-8 text-center rounded-2xl border border-red-800/50 bg-red-900/10">
          <p className="text-red-400 font-medium">{erro}</p>
          <button onClick={carregar} className="mt-4 text-sm underline" style={{ color: 'var(--g)' }}>Tentar novamente</button>
        </div>
      </Layout>
    );
  }

  if (!data?.configurado) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto mt-8 p-8 rounded-2xl border text-center" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--bd)' }}>
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--mt-lt)' }}>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
          <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--tx)' }}>WhatsApp não configurado</h2>
          <p className="text-sm" style={{ color: 'var(--mt-lt)' }}>
            Configure sua instância WhatsApp em <strong>Configurações → WhatsApp</strong> para ativar o envio automático.
          </p>
        </div>
      </Layout>
    );
  }

  const { fila, circuitBreaker: cb, numeros, bloqueados, instance } = data;
  const pctDia  = fila.limiteDia  > 0 ? Math.min(Math.round((fila.sentToday    / fila.limiteDia)  * 100), 100) : 0;
  const pctHora = fila.limiteHora > 0 ? Math.min(Math.round((fila.sentThisHour / fila.limiteHora) * 100), 100) : 0;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Título + refresh */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--tx)' }}>Fila WA Anti-ban</h1>
            <p className="text-sm" style={{ color: 'var(--mt-lt)' }}>Instância: <span className="font-mono">{instance}</span></p>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <span className="text-xs" style={{ color: 'var(--mt-lt)' }}>
                Atualizado {lastRefresh.toLocaleTimeString('pt-BR')}
              </span>
            )}
            <button onClick={carregar}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border transition-colors"
              style={{ borderColor: 'var(--bd)', color: 'var(--tx)', backgroundColor: 'var(--surface)' }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Atualizar
            </button>
          </div>
        </div>

        {/* Alertas */}
        {cb?.suspensa && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-red-800/50 bg-red-900/10">
            <svg className="w-5 h-5 flex-shrink-0 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-semibold text-red-400 text-sm">Instância suspensa pelo circuit breaker</p>
              <p className="text-xs text-red-300 mt-0.5">
                {cb.erros} erros consecutivos detectados. Envios suspensos até {cb.suspensaAte ? new Date(cb.suspensaAte).toLocaleString('pt-BR') : '?'}.
                Entre em contato com o suporte para liberar manualmente.
              </p>
            </div>
          </div>
        )}

        {!fila.dentroJanela && !cb?.suspensa && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-yellow-800/50 bg-yellow-900/10">
            <svg className="w-5 h-5 flex-shrink-0 text-yellow-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold text-yellow-400 text-sm">Fora da janela de envio</p>
              <p className="text-xs text-yellow-300 mt-0.5">
                Mensagens só são enviadas entre 08h e 20h (BRT) para proteção anti-ban.
                {fila.pendentes > 0 && ` ${fila.pendentes} mensagem${fila.pendentes > 1 ? 's' : ''} aguardando na fila.`}
              </p>
            </div>
          </div>
        )}

        {bloqueados?.length > 0 && (
          <div className="flex items-start gap-3 p-4 rounded-xl border border-orange-800/50 bg-orange-900/10">
            <svg className="w-5 h-5 flex-shrink-0 text-orange-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            <div>
              <p className="font-semibold text-orange-400 text-sm">{bloqueados.length} número{bloqueados.length > 1 ? 's' : ''} bloqueado{bloqueados.length > 1 ? 's' : ''} por reputação</p>
              <p className="text-xs text-orange-300 mt-0.5">
                Mensagens para esses números estão sendo descartadas. O desbloqueio é automático após 24h, ou você pode desbloquear manualmente abaixo.
              </p>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Enviadas hoje"       value={fila.sentToday}    sub={`limite: ${fila.limiteDia}`}  color={pctDia  >= 80 ? '#ef4444' : pctDia  >= 50 ? '#f59e0b' : 'var(--g)'} />
          <StatCard label="Enviadas esta hora"  value={fila.sentThisHour} sub={`limite: ${fila.limiteHora}`} color={pctHora >= 80 ? '#ef4444' : pctHora >= 50 ? '#f59e0b' : 'var(--g)'} />
          <StatCard label="Na fila agora"       value={fila.pendentes}    sub={fila.pendentes > 0 ? 'aguardando janela ou rate limit' : 'fila vazia'} color={fila.pendentes > 0 ? '#f59e0b' : 'var(--g)'} />
          <StatCard label="Nº bloqueados"       value={bloqueados?.length || 0} sub="por reputação (24h)" color={bloqueados?.length > 0 ? '#ef4444' : 'var(--g)'} />
        </div>

        {/* Barras de uso */}
        <div className="p-5 rounded-2xl border space-y-4" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--bd)' }}>
          <p className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>Uso da fila</p>
          <BarraProgresso valor={fila.sentToday}    limite={fila.limiteDia}  label="Mensagens hoje" />
          <BarraProgresso valor={fila.sentThisHour} limite={fila.limiteHora} label="Mensagens esta hora" />
        </div>

        {/* Tabela de números com score baixo */}
        {numeros?.length > 0 && (
          <div className="rounded-2xl border overflow-hidden" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--bd)' }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--bd)' }}>
              <div>
                <h2 className="font-semibold text-sm" style={{ color: 'var(--tx)' }}>Números com score baixo</h2>
                <p className="text-xs mt-0.5" style={{ color: 'var(--mt-lt)' }}>Score 0–100. Abaixo de 70 indica histórico de falhas de entrega.</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full" style={{ backgroundColor: 'var(--bd)', color: 'var(--mt-lt)' }}>{numeros.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: 'var(--s2)' }}>
                  <tr style={{ color: 'var(--mt-lt)' }}>
                    <th className="text-left px-5 py-3 font-medium text-xs">Telefone</th>
                    <th className="text-center px-4 py-3 font-medium text-xs">Score</th>
                    <th className="text-center px-4 py-3 font-medium text-xs">Falhas consec.</th>
                    <th className="text-center px-4 py-3 font-medium text-xs">Total falhas</th>
                    <th className="text-center px-4 py-3 font-medium text-xs">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-xs">Desbloqueio</th>
                    <th className="px-5 py-3 font-medium text-xs"></th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'var(--bd)' }}>
                  {numeros.map(n => (
                    <tr key={n.telefone} className="hover:bg-[var(--s2)] transition-colors">
                      <td className="px-5 py-3 font-mono text-xs" style={{ color: 'var(--tx)' }}>{n.telefone}</td>
                      <td className="px-4 py-3 text-center"><ScoreCircle score={n.score} /></td>
                      <td className="px-4 py-3 text-center font-mono text-sm" style={{ color: n.consecutivas >= 3 ? '#ef4444' : 'var(--tx)' }}>{n.consecutivas}</td>
                      <td className="px-4 py-3 text-center font-mono text-sm" style={{ color: 'var(--tx)' }}>{n.totalFalhas}</td>
                      <td className="px-4 py-3 text-center">
                        {n.bloqueado
                          ? <span className="px-2 py-0.5 rounded-full text-xs bg-red-900/40 text-red-400 font-semibold">Bloqueado 24h</span>
                          : <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-900/40 text-yellow-400">Score baixo</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-xs" style={{ color: 'var(--mt-lt)' }}>
                        {n.bloqueadoAte
                          ? new Date(n.bloqueadoAte).toLocaleString('pt-BR')
                          : n.bloqueado ? 'Bloqueado' : '—'
                        }
                      </td>
                      <td className="px-5 py-3 text-right">
                        {n.bloqueado && (
                          <button onClick={() => desbloquear(n.telefone)}
                            disabled={unlocking === n.telefone}
                            className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors disabled:opacity-50"
                            style={{ backgroundColor: 'var(--g)', color: '#08080C' }}>
                            {unlocking === n.telefone ? '...' : 'Desbloquear'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {numeros?.length === 0 && (
          <div className="p-5 rounded-2xl border text-center" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--bd)' }}>
            <p className="text-sm" style={{ color: 'var(--mt-lt)' }}>Nenhum número com histórico de falhas. Tudo certo!</p>
          </div>
        )}

        {/* Legenda de proteções */}
        <div className="p-5 rounded-2xl border" style={{ backgroundColor: 'var(--surface)', borderColor: 'var(--bd)' }}>
          <p className="font-semibold text-sm mb-3" style={{ color: 'var(--tx)' }}>Como funciona o sistema anti-ban</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { icon: '🕐', titulo: 'Janela horária', desc: 'Envios somente entre 08h e 20h (BRT) para evitar suspeita do WhatsApp.' },
              { icon: '📊', titulo: 'Rate limit', desc: `Máximo ${fila.limiteHora} mensagens/hora e ${fila.limiteDia}/dia por instância.` },
              { icon: '⏱️', titulo: 'Delay aleatório', desc: '7 a 20 segundos entre cada envio para simular comportamento humano.' },
              { icon: '🔌', titulo: 'Circuit breaker', desc: '5 erros seguidos suspendem a instância por 2h para evitar ban permanente.' },
              { icon: '⭐', titulo: 'Score de reputação', desc: '3 falhas consecutivas num número bloqueia contato por 24h (proteção contra loops).' },
              { icon: '🔁', titulo: 'Dedup anti-spam', desc: 'Mensagem idêntica para o mesmo número em menos de 1h é descartada automaticamente.' },
            ].map(({ icon, titulo, desc }) => (
              <div key={titulo} className="flex gap-3 p-3 rounded-xl" style={{ backgroundColor: 'var(--bg)' }}>
                <span className="text-xl flex-shrink-0">{icon}</span>
                <div>
                  <p className="text-xs font-semibold" style={{ color: 'var(--tx)' }}>{titulo}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--mt-lt)' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
