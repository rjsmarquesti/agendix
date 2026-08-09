import { useEffect, useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import Layout from '../components/Layout';
import { BadgeLead, BadgeAgend } from '../components/Badge';
import OnboardingChecklist from '../components/OnboardingChecklist';
import { api } from '../services/api';

/* ── Recharts carregado sob demanda ─────────────────────────────────────── */
const RechartsLine = lazy(() =>
  import('recharts').then(m => ({ default: m.LineChart }))
);
const RechartsArea = lazy(() =>
  import('recharts').then(m => ({ default: m.AreaChart }))
);

/* ── Stat Card com trend ─────────────────────────────────────────────────── */
function StatCard({ label, value, colorVar, icon, trend, trendLabel, prefix = '' }) {
  const trendPositivo = trend >= 0;
  return (
    <div style={{
      backgroundColor: 'var(--surface)', borderRadius: 'var(--r-lg)',
      border: '1px solid var(--bd)', padding: '20px 20px 16px',
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--mt-lt)', margin: 0 }}>{label}</p>
        <div style={{
          width: 36, height: 36, borderRadius: 'var(--r)',
          backgroundColor: colorVar + '1a', color: colorVar,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg aria-hidden="true" width={18} height={18} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {icon}
          </svg>
        </div>
      </div>
      <div>
        <p style={{ fontSize: 26, fontWeight: 700, color: 'var(--tx)', margin: 0, letterSpacing: '-0.03em' }}>
          {prefix}{value ?? '—'}
        </p>
        {trend !== undefined && (
          <span style={{
            fontSize: 11.5, fontWeight: 500,
            color: trendPositivo ? '#10B981' : 'var(--err)',
          }}>
            {trendPositivo ? '↑' : '↓'}{Math.abs(trend)}% {trendLabel}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Avatar de iniciais ──────────────────────────────────────────────────── */
const AVATAR_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#06b6d4','#3b82f6'];
function AvatarInicial({ nome, size = 32 }) {
  const idx = (nome?.charCodeAt(0) || 0) % AVATAR_COLORS.length;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: AVATAR_COLORS[idx], color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, flexShrink: 0,
    }}>
      {nome?.[0]?.toUpperCase() || '?'}
    </div>
  );
}

/* ── Mini Calendário ─────────────────────────────────────────────────────── */
function MiniCalendario({ agendamentos }) {
  const hoje = new Date();
  const ano  = hoje.getFullYear();
  const mes  = hoje.getMonth();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const primeiroDia = new Date(ano, mes, 1).getDay(); // 0=dom

  const diasComAg = new Set(
    (agendamentos || []).map(a => parseInt(a.data?.split('-')[2]))
  );

  const DIAS_SEMANA = ['D','S','T','Q','Q','S','S'];
  const celulas = [...Array(primeiroDia).fill(null),
    ...Array.from({ length: diasNoMes }, (_, i) => i + 1)];

  const mesLabel = hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--mt-lt)', textTransform: 'capitalize',
        marginBottom: 8, textAlign: 'center' }}>
        {mesLabel}
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {DIAS_SEMANA.map((d, i) => (
          <div key={i} style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--mt)',
            textAlign: 'center', padding: '2px 0' }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {celulas.map((dia, i) => {
          if (!dia) return <div key={`e-${i}`} />;
          const ehHoje = dia === hoje.getDate();
          const temAg  = diasComAg.has(dia);
          return (
            <div key={dia} style={{
              width: '100%', aspectRatio: '1',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', borderRadius: 'var(--r-sm)',
              fontSize: 11, fontWeight: ehHoje ? 700 : 400,
              backgroundColor: ehHoje ? 'var(--g)' : 'transparent',
              color: ehHoje ? '#fff' : 'var(--tx-md)',
              position: 'relative',
              cursor: 'default',
            }}>
              {dia}
              {temAg && !ehHoje && (
                <div style={{
                  position: 'absolute', bottom: 1,
                  width: 4, height: 4, borderRadius: '50%',
                  backgroundColor: 'var(--g)',
                }} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ── Funil de Leads ──────────────────────────────────────────────────────── */
const STATUS_FUNIL = [
  { key: 'novo',        label: 'Novo Lead',   color: '#6366f1' },
  { key: 'contatado',   label: 'Contatado',   color: '#8b5cf6' },
  { key: 'interesse',   label: 'Interesse',   color: '#3b82f6' },
  { key: 'proposta',    label: 'Proposta',    color: '#06b6d4' },
  { key: 'negociacao',  label: 'Negociação',  color: '#f59e0b' },
  { key: 'convertido',  label: 'Convertido',  color: '#10b981' },
  { key: 'perdido',     label: 'Perdido',     color: '#ef4444' },
];

function FunilLeads({ leads }) {
  const contagem = {};
  STATUS_FUNIL.forEach(s => { contagem[s.key] = 0; });
  (leads || []).forEach(l => {
    if (contagem[l.status] !== undefined) contagem[l.status]++;
  });
  const max = Math.max(...Object.values(contagem), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {STATUS_FUNIL.map(({ key, label, color }) => (
        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11.5, color: 'var(--tx-md)', minWidth: 80, textAlign: 'right' }}>
            {label}
          </span>
          <div style={{
            flex: 1, height: 8, borderRadius: 'var(--r-full)',
            backgroundColor: 'var(--s2)', overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', borderRadius: 'var(--r-full)',
              backgroundColor: color,
              width: `${Math.round((contagem[key] / max) * 100)}%`,
              transition: 'width 0.6s ease',
            }} />
          </div>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--tx)', minWidth: 24, textAlign: 'right' }}>
            {contagem[key]}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Gráfico de linha (Desempenho) ───────────────────────────────────────── */
function GraficoLinha({ serie }) {
  const [Libs, setLibs] = useState(null);

  useEffect(() => {
    import('recharts').then(m => setLibs(m));
  }, []);

  if (!Libs || !serie?.length) {
    return (
      <div style={{
        height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--mt)', fontSize: 12,
      }}>
        {serie?.length === 0 ? 'Sem dados no período' : 'Carregando gráfico…'}
      </div>
    );
  }

  const { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } = Libs;

  return (
    <ResponsiveContainer width="100%" height={120}>
      <AreaChart data={serie} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="agGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="var(--g)" stopOpacity={0.18} />
            <stop offset="95%" stopColor="var(--g)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--bd)" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--mt-lt)' }} axisLine={false} tickLine={false}
          interval={Math.floor(serie.length / 6)} />
        <YAxis tick={{ fontSize: 9, fill: 'var(--mt-lt)' }} axisLine={false} tickLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--bd-md)',
            borderRadius: 'var(--r)', fontSize: 12, color: 'var(--tx)' }}
          cursor={{ stroke: 'var(--bd-md)' }}
          formatter={(v) => [v, 'Agendamentos']}
        />
        <Area type="monotone" dataKey="total" stroke="var(--g)" strokeWidth={2}
          fill="url(#agGradient)" dot={false} activeDot={{ r: 4, fill: 'var(--g)' }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ── Gráfico de donut (Canais) ───────────────────────────────────────────── */
const CANAIS_COLORS = {
  'WhatsApp':     '#10b981',
  'Link Público': '#06b6d4',
  'Manual':       '#f59e0b',
  'Outros':       '#94a3b8',
};

function GraficoDonut({ canais }) {
  const [Libs, setLibs] = useState(null);

  useEffect(() => {
    import('recharts').then(m => setLibs(m));
  }, []);

  if (!Libs || !canais?.length) {
    return (
      <div style={{
        height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--mt)', fontSize: 12,
      }}>
        {canais?.length === 0 ? 'Sem dados' : 'Carregando…'}
      </div>
    );
  }

  const { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } = Libs;
  const data = canais.map(c => ({ name: c.nome, value: c.qtd }));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <ResponsiveContainer width={100} height={100}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={28} outerRadius={44}
            dataKey="value" paddingAngle={2} strokeWidth={0}>
            {data.map((entry, i) => (
              <Cell key={i} fill={CANAIS_COLORS[entry.name] || '#94a3b8'} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: 'var(--surface)', border: '1px solid var(--bd-md)',
              borderRadius: 'var(--r)', fontSize: 12, color: 'var(--tx)' }}
            formatter={(v, n) => [v, n]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
        {canais.map(c => (
          <div key={c.nome} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0,
              backgroundColor: CANAIS_COLORS[c.nome] || '#94a3b8' }} />
            <span style={{ fontSize: 11, color: 'var(--tx-md)', flex: 1 }}>{c.nome}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--tx)' }}>{c.pct}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Card wrapper ────────────────────────────────────────────────────────── */
function Card({ children, title, action, style: s }) {
  return (
    <div style={{
      backgroundColor: 'var(--surface)', borderRadius: 'var(--r-lg)',
      border: '1px solid var(--bd)', ...s,
    }}>
      {title && (
        <div style={{
          padding: '16px 20px 12px',
          borderBottom: '1px solid var(--bd)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx)', margin: 0 }}>{title}</h2>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

/* ── Skeleton ────────────────────────────────────────────────────────────── */
function Skeleton({ h = 80 }) {
  return (
    <div className="animate-pulse" style={{
      height: h, borderRadius: 'var(--r-lg)',
      backgroundColor: 'var(--s2)', border: '1px solid var(--bd)',
    }} />
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const [data,   setData]   = useState(null);
  const [serie,  setSerie]  = useState(null);
  const [canais, setCanais] = useState(null);
  const [allLeads, setAllLeads] = useState([]);

  useEffect(() => {
    api.get('/dashboard').then(setData).catch(err => toast.error(err.message));
    api.get('/dashboard/agendamentos-serie').then(d => setSerie(d.serie)).catch(() => setSerie([]));
    api.get('/dashboard/canais').then(d => setCanais(d.canais)).catch(() => setCanais([]));
    /* Buscar leads para o funil */
    api.get('/leads?limite=200').then(d => setAllLeads(d.leads || [])).catch(() => {});
  }, []);

  const db    = data?.dashboard || {};
  const leads = data?.leadsRecentes || [];
  const agends = data?.agendamentosDodia || [];

  /* ── Skeleton inicial ── */
  if (!data) return (
    <Layout title="Dashboard" subtitle="Visão geral do seu negócio">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 16, marginBottom: 24 }}>
        {[...Array(5)].map((_, i) => <Skeleton key={i} h={96} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        <Skeleton h={320} /> <Skeleton h={320} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        <Skeleton h={180} /> <Skeleton h={180} /> <Skeleton h={180} />
      </div>
    </Layout>
  );

  return (
    <Layout title="Dashboard" subtitle="Visão geral do seu negócio">
      <OnboardingChecklist />

      {/* ── 5 Stat Cards ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
        gap: 14, marginBottom: 20,
      }}>
        <StatCard label="Agendamentos Hoje"
          value={db.agendamentosHoje ?? '—'}
          colorVar="var(--g)"
          trend={db.agendamentosHojeTrend}
          trendLabel="vs ontem"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />}
        />
        <StatCard label="Agendamentos Este Mês"
          value={db.agendamentosEsteMes ?? '—'}
          colorVar="#6366f1"
          trend={db.agendamentosEsteMesTrend}
          trendLabel="vs mês anterior"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />}
        />
        <StatCard label="Leads em Aberto"
          value={db.leadsEmAberto ?? '—'}
          colorVar="#f59e0b"
          trend={db.leadsEmAbertoTrend}
          trendLabel="vs mês anterior"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />}
        />
        <StatCard label="Receita Este Mês"
          value={db.receitaEsteMes !== null ? db.receitaEsteMes?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '—'}
          prefix={db.receitaEsteMes !== null ? 'R$ ' : ''}
          colorVar="#10b981"
          trend={db.receitaEsteMesTrend || undefined}
          trendLabel="vs mês anterior"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />}
        />
        <StatCard label="Novos Clientes"
          value={db.novosClientesMes ?? '—'}
          colorVar="#8b5cf6"
          trend={db.novosClientesMesTrend}
          trendLabel="vs mês anterior"
          icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />}
        />
      </div>

      {/* ── Linha 2: Próximos Agendamentos + Mini Calendário + Funil ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 14, marginBottom: 14 }}>

        {/* Próximos agendamentos */}
        <Card title="Próximos Agendamentos"
          action={<Link to="/agendamentos" style={{ fontSize: 12, fontWeight: 500, color: 'var(--g)', textDecoration: 'none' }}>Ver todos</Link>}>
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {agends.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--mt-lt)', textAlign: 'center', padding: '16px 0', margin: 0 }}>
                Nenhum agendamento hoje
              </p>
            ) : agends.slice(0, 5).map(a => (
              <div key={a.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '8px 10px',
                borderRadius: 'var(--r)', backgroundColor: 'var(--s2)',
              }}>
                <AvatarInicial nome={a.lead?.nome} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)', margin: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.lead?.nome}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--mt-lt)', margin: 0 }}>{a.tipo}</p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--g)', margin: 0 }}>{a.hora}</p>
                  <BadgeAgend status={a.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Mini calendário */}
        <Card title={new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^\w/, c => c.toUpperCase())}>
          <div style={{ padding: '12px 16px 16px' }}>
            <MiniCalendario agendamentos={agends} />
          </div>
        </Card>

        {/* Funil de leads */}
        <Card title="Funil de Leads"
          action={<Link to="/leads" style={{ fontSize: 12, fontWeight: 500, color: 'var(--g)', textDecoration: 'none' }}>Ver funil</Link>}>
          <div style={{ padding: '16px' }}>
            <FunilLeads leads={allLeads} />
          </div>
        </Card>
      </div>

      {/* ── Linha 3: Leads Recentes + Gráfico Linha + Gráfico Donut ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 0.9fr', gap: 14 }}>

        {/* Leads recentes */}
        <Card title="Leads Recentes"
          action={<Link to="/leads" style={{ fontSize: 12, fontWeight: 500, color: 'var(--g)', textDecoration: 'none' }}>Ver todos</Link>}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--s2)' }}>
                  <th style={{ padding: '8px 16px', fontSize: 11, fontWeight: 600, color: 'var(--mt-lt)',
                    textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Nome</th>
                  <th style={{ padding: '8px 16px', fontSize: 11, fontWeight: 600, color: 'var(--mt-lt)',
                    textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em' }} className="hidden sm:table-cell">Origem</th>
                  <th style={{ padding: '8px 16px', fontSize: 11, fontWeight: 600, color: 'var(--mt-lt)',
                    textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {leads.length === 0 ? (
                  <tr><td colSpan={3} style={{ padding: '20px', textAlign: 'center', color: 'var(--mt-lt)', fontSize: 13 }}>
                    Nenhum lead ainda
                  </td></tr>
                ) : leads.map(l => (
                  <tr key={l.id} style={{ borderBottom: '1px solid var(--bd)' }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--s2)'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                    <td style={{ padding: '10px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <AvatarInicial nome={l.nome} size={28} />
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--tx)', margin: 0 }}>{l.nome}</p>
                          <p style={{ fontSize: 11, color: 'var(--mt-lt)', margin: 0 }}>{l.telefone || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: 'var(--tx-md)' }} className="hidden sm:table-cell">
                      {l.origem || '—'}
                    </td>
                    <td style={{ padding: '10px 16px' }}><BadgeLead status={l.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Gráfico linha — Desempenho */}
        <Card title="Desempenho de Agendamentos"
          action={<span style={{ fontSize: 11, color: 'var(--mt-lt)' }}>últimos 30 dias</span>}>
          <div style={{ padding: '12px 16px 16px' }}>
            <GraficoLinha serie={serie} />
          </div>
        </Card>

        {/* Gráfico donut — Canais */}
        <Card title="Canais de Agendamento">
          <div style={{ padding: '12px 16px 16px' }}>
            <GraficoDonut canais={canais} />
          </div>
        </Card>
      </div>
    </Layout>
  );
}
