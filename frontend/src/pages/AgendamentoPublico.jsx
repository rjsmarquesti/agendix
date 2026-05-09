import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

const API = (slug, path) => `/api/public/${slug}${path}`;

function diasDoMes(ano, mes) {
  return new Date(ano, mes + 1, 0).getDate();
}

function padZ(n) { return String(n).padStart(2, '0'); }

export default function AgendamentoPublico() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const servicoIdParam = params.get('servico');

  const [config, setConfig] = useState(null);
  const [erro, setErro] = useState(null);

  // Etapa: 'servico' | 'data' | 'hora' | 'dados' | 'sucesso'
  const [etapa, setEtapa] = useState('servico');
  const [servicoSel, setServicoSel] = useState(null);
  const [dataSel, setDataSel] = useState(null);   // YYYY-MM-DD
  const [horaSel, setHoraSel] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loadSlots, setLoadSlots] = useState(false);
  const [form, setForm] = useState({ nome: '', telefone: '', email: '', observacoes: '' });
  const [enviando, setEnviando] = useState(false);
  const [agendado, setAgendado] = useState(null);

  // Calendário
  const hoje = new Date();
  const [calAno, setCalAno] = useState(hoje.getFullYear());
  const [calMes, setCalMes] = useState(hoje.getMonth());

  useEffect(() => {
    fetch(API(slug, '/config'))
      .then(r => r.ok ? r.json() : Promise.reject('Empresa não encontrada'))
      .then(data => {
        setConfig(data);
        if (servicoIdParam) {
          const svc = data.servicos.find(s => String(s.id) === servicoIdParam);
          if (svc) { setServicoSel(svc); setEtapa('data'); }
        }
        if (data.corPrimaria) {
          document.documentElement.style.setProperty('--cor-pub', data.corPrimaria);
        }
      })
      .catch(e => setErro(String(e)));
  }, [slug, servicoIdParam]);

  useEffect(() => {
    if (!dataSel || !slug) return;
    setLoadSlots(true);
    const qs = servicoSel ? `?data=${dataSel}&servicoId=${servicoSel.id}` : `?data=${dataSel}`;
    fetch(API(slug, `/disponibilidade${qs}`))
      .then(r => r.json())
      .then(d => setSlots(d.slots || []))
      .catch(() => setSlots([]))
      .finally(() => setLoadSlots(false));
  }, [dataSel, slug, servicoSel]);

  async function agendar(e) {
    e.preventDefault();
    setEnviando(true);
    try {
      const r = await fetch(API(slug, '/agendar'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          data: dataSel,
          hora: horaSel,
          servicoId: servicoSel?.id,
          tipo: servicoSel?.nome,
        }),
      });
      const data = await r.json();
      if (!r.ok) { alert(data.error || 'Erro ao agendar'); return; }
      setAgendado(data);
      setEtapa('sucesso');
    } catch {
      alert('Erro de conexão. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  }

  // Dias habilitados: diasUteis é array de 0-6 (0=dom)
  function diaHabilitado(ano, mes, dia) {
    const d = new Date(ano, mes, dia);
    const dow = d.getDay();
    const diasUteis = config?.diasUteis ?? [1,2,3,4,5];
    if (!diasUteis.includes(dow)) return false;
    // não permite datas no passado
    const dataStr = `${ano}-${padZ(mes+1)}-${padZ(dia)}`;
    return dataStr >= hoje.toISOString().slice(0, 10);
  }

  if (erro) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-red-400">{erro}</p>
    </div>
  );

  if (!config) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
    </div>
  );

  const cor = config.corPrimaria || '#2563eb';
  const totalDias = diasDoMes(calAno, calMes);
  const primeiroDow = new Date(calAno, calMes, 1).getDay();
  const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

  function prevMes() {
    if (calMes === 0) { setCalAno(y => y - 1); setCalMes(11); }
    else setCalMes(m => m - 1);
  }
  function nextMes() {
    if (calMes === 11) { setCalAno(y => y + 1); setCalMes(0); }
    else setCalMes(m => m + 1);
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="text-center mb-8">
          {config.logo
            ? <img src={config.logo} alt={config.tenantNome} className="h-12 mx-auto mb-3 object-contain" />
            : <div className="w-12 h-12 rounded-2xl mx-auto mb-3 flex items-center justify-center text-white text-lg font-bold"
                style={{ backgroundColor: cor }}>{config.tenantNome?.[0]}</div>
          }
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{config.tenantNome}</h1>
          <p className="text-gray-500 text-sm">Agendamento online</p>
        </div>

        {/* Steps indicator */}
        {etapa !== 'sucesso' && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {['Serviço', 'Data', 'Horário', 'Dados'].map((s, i) => {
              const etapas = ['servico', 'data', 'hora', 'dados'];
              const idx = etapas.indexOf(etapa);
              const ativo = i === idx;
              const feito = i < idx;
              return (
                <div key={s} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                    ${feito ? 'text-white' : ativo ? 'text-white' : 'bg-gray-200 dark:bg-gray-800 text-gray-400'}`}
                    style={feito || ativo ? { backgroundColor: cor } : {}}>
                    {feito ? '✓' : i + 1}
                  </div>
                  <span className={`text-xs hidden sm:block ${ativo ? 'font-semibold text-gray-900 dark:text-white' : 'text-gray-400'}`}>{s}</span>
                  {i < 3 && <div className="w-6 h-px bg-gray-300 dark:bg-gray-700" />}
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6">

          {/* Etapa: Serviço */}
          {etapa === 'servico' && (
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Escolha o serviço</h2>
              {config.servicos.length === 0
                ? <p className="text-gray-400 text-sm">Nenhum serviço disponível.</p>
                : <div className="space-y-2">
                    {config.servicos.map(s => (
                      <button key={s.id} onClick={() => { setServicoSel(s); setEtapa('data'); }}
                        className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-colors text-left group">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white text-sm">{s.nome}</p>
                          {s.descricao && <p className="text-gray-400 text-xs mt-0.5">{s.descricao}</p>}
                          <p className="text-gray-500 text-xs mt-1">{s.duracaoMin} min</p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          {s.preco > 0 && <p className="font-bold text-sm" style={{ color: cor }}>
                            {s.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </p>}
                          <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-400 mt-1 ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </button>
                    ))}
                  </div>
              }
            </div>
          )}

          {/* Etapa: Data */}
          {etapa === 'data' && (
            <div>
              <button onClick={() => setEtapa('servico')} className="flex items-center gap-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm mb-4 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Voltar
              </button>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Escolha a data</h2>

              {/* Calendário */}
              <div className="flex items-center justify-between mb-4">
                <button onClick={prevMes} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <span className="font-semibold text-gray-900 dark:text-white text-sm">{MESES[calMes]} {calAno}</span>
                <button onClick={nextMes} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-1">
                {['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'].map(d => (
                  <div key={d} className="text-center text-xs text-gray-400 py-1">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {Array(primeiroDow).fill(null).map((_, i) => <div key={`e${i}`} />)}
                {Array(totalDias).fill(null).map((_, i) => {
                  const dia = i + 1;
                  const dataStr = `${calAno}-${padZ(calMes+1)}-${padZ(dia)}`;
                  const hab = diaHabilitado(calAno, calMes, dia);
                  const sel = dataSel === dataStr;
                  return (
                    <button key={dia} disabled={!hab}
                      onClick={() => { setDataSel(dataStr); setHoraSel(null); setEtapa('hora'); }}
                      className={`aspect-square rounded-xl text-xs font-medium transition-colors
                        ${sel ? 'text-white' : hab ? 'text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-800' : 'text-gray-300 dark:text-gray-700 cursor-not-allowed'}`}
                      style={sel ? { backgroundColor: cor } : {}}>
                      {dia}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Etapa: Horário */}
          {etapa === 'hora' && (
            <div>
              <button onClick={() => setEtapa('data')} className="flex items-center gap-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm mb-4 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Voltar
              </button>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-1">Escolha o horário</h2>
              <p className="text-gray-400 text-sm mb-4">{dataSel?.split('-').reverse().join('/')}</p>

              {loadSlots
                ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500" /></div>
                : slots.length === 0
                  ? <p className="text-gray-400 text-sm text-center py-6">Nenhum horário disponível nesta data.</p>
                  : <div className="grid grid-cols-3 gap-2">
                      {slots.map(h => (
                        <button key={h} onClick={() => { setHoraSel(h); setEtapa('dados'); }}
                          className={`py-2.5 rounded-xl text-sm font-medium border transition-colors
                            ${horaSel === h ? 'text-white border-transparent' : 'text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-blue-400'}`}
                          style={horaSel === h ? { backgroundColor: cor, borderColor: cor } : {}}>
                          {h}
                        </button>
                      ))}
                    </div>
              }
            </div>
          )}

          {/* Etapa: Dados pessoais */}
          {etapa === 'dados' && (
            <form onSubmit={agendar}>
              <button type="button" onClick={() => setEtapa('hora')} className="flex items-center gap-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-sm mb-4 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Voltar
              </button>
              <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Seus dados</h2>

              {/* Resumo */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mb-5 text-sm space-y-1">
                {servicoSel && <p className="text-gray-700 dark:text-gray-300"><span className="text-gray-400">Serviço:</span> {servicoSel.nome}</p>}
                <p className="text-gray-700 dark:text-gray-300"><span className="text-gray-400">Data:</span> {dataSel?.split('-').reverse().join('/')}</p>
                <p className="text-gray-700 dark:text-gray-300"><span className="text-gray-400">Horário:</span> {horaSel}</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Nome *</label>
                  <input required value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                    placeholder="Seu nome completo" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">WhatsApp *</label>
                  <input required value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                    placeholder="(11) 99999-9999" type="tel" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">E-mail</label>
                  <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400"
                    placeholder="seu@email.com" type="email" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Observações</label>
                  <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                    rows={2}
                    className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-blue-400 resize-none"
                    placeholder="Alguma observação?" />
                </div>
              </div>

              <button type="submit" disabled={enviando}
                className="mt-5 w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity disabled:opacity-60"
                style={{ backgroundColor: cor }}>
                {enviando ? 'Agendando…' : 'Confirmar agendamento'}
              </button>
            </form>
          )}

          {/* Etapa: Sucesso */}
          {etapa === 'sucesso' && (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                style={{ backgroundColor: `${cor}22` }}>
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: cor }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Agendamento confirmado!</h2>
              <p className="text-gray-500 text-sm mb-6">
                {config.mensagemConfirmacao || 'Em breve você receberá uma confirmação pelo WhatsApp.'}
              </p>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-sm text-left space-y-1 mb-6">
                {servicoSel && <p className="text-gray-700 dark:text-gray-300"><span className="text-gray-400">Serviço:</span> {servicoSel.nome}</p>}
                <p className="text-gray-700 dark:text-gray-300"><span className="text-gray-400">Data:</span> {dataSel?.split('-').reverse().join('/')}</p>
                <p className="text-gray-700 dark:text-gray-300"><span className="text-gray-400">Horário:</span> {horaSel}</p>
                <p className="text-gray-700 dark:text-gray-300"><span className="text-gray-400">Nome:</span> {form.nome}</p>
              </div>
              <button onClick={() => { setEtapa('servico'); setServicoSel(null); setDataSel(null); setHoraSel(null); setForm({ nome:'',telefone:'',email:'',observacoes:'' }); }}
                className="text-sm underline text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                Fazer outro agendamento
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-gray-400 text-xs mt-6">
          Powered by <span className="font-semibold">Agendix</span>
        </p>
      </div>
    </div>
  );
}
