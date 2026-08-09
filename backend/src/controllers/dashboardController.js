const prisma = require('../lib/prisma');
const { localDateStr } = require('../utils/dateUtils');
const { getConnectionState } = require('../services/evolutionService');

exports.onboarding = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const tenant = req.tenant;

    const [servicosCount, config] = await Promise.all([
      prisma.servico.count({ where: { tenantId } }),
      prisma.configuracaoAgenda.findFirst({ where: { tenantId } }),
    ]);

    const temServicos = servicosCount > 0;
    const temHorarios = !!(config?.horarioInicio && config?.horarioFim);

    let whatsappConectado = false;
    if (tenant.evolutionInstance) {
      try {
        const result = await getConnectionState(tenant.evolutionInstance, tenant.evolutionApiKey);
        const state = result?.instance?.state || result?.state || '';
        whatsappConectado = state === 'open';
      } catch (_) {}
    }

    const linkPublico = `${process.env.APP_URL}/agendar/${tenant.slug}`;

    res.json({
      passos: [
        { id: 'servicos', label: 'Cadastre seus serviços', descricao: 'Adicione os serviços que você oferece.', link: '/servicos', concluido: temServicos },
        { id: 'horarios', label: 'Configure sua agenda', descricao: 'Defina seus horários de atendimento.', link: '/configuracoes', concluido: temHorarios },
        { id: 'whatsapp', label: 'Conecte o WhatsApp', descricao: 'Ative o bot de agendamento automático.', link: '/configuracoes', concluido: whatsappConectado },
        { id: 'link', label: 'Compartilhe seu link', descricao: 'Envie para seus clientes começarem a agendar.', link: linkPublico, externo: true, concluido: false },
      ],
      linkPublico,
    });
  } catch (err) { next(err); }
};

exports.stats = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const hoje = localDateStr();

    /* ── Períodos para trend ── */
    const now = new Date();
    const mesAtualInicio = new Date(now.getFullYear(), now.getMonth(), 1);
    const mesAnteriorInicio = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const mesAnteriorFim   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    const ontemStr = (() => {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d.toISOString().slice(0, 10);
    })();

    const [
      totalLeads, leadsNovos, convertidos, agendamentosHoje, leadsRecentes, agendamentosDodia,
      /* Este mês */
      agendamentosEsteMes,
      leadsEmAberto,
      novosClientesMes,
      /* Mês anterior (trend) */
      agendamentosOntem,
      agendamentosMesAnterior,
      leadsEmAbertoMesAnterior,
      novosClientesMesAnterior,
    ] = await Promise.all([
      prisma.lead.count({ where: { tenantId } }),
      prisma.lead.count({ where: { tenantId, status: 'novo' } }),
      prisma.lead.count({ where: { tenantId, status: 'convertido' } }),
      prisma.agendamento.count({ where: { tenantId, data: hoje } }),
      prisma.lead.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 5,
        select: { id: true, nome: true, telefone: true, status: true, origem: true, createdAt: true } }),
      prisma.agendamento.findMany({
        where: { tenantId, data: hoje },
        orderBy: { hora: 'asc' },
        include: { lead: { select: { nome: true, telefone: true } } },
      }),
      /* este mês */
      prisma.agendamento.count({ where: { tenantId, data: { gte: mesAtualInicio.toISOString().slice(0, 10) } } }),
      prisma.lead.count({ where: { tenantId, status: { notIn: ['convertido', 'perdido'] } } }),
      prisma.lead.count({ where: { tenantId, status: 'convertido', createdAt: { gte: mesAtualInicio } } }),
      /* ontem */
      prisma.agendamento.count({ where: { tenantId, data: ontemStr } }),
      /* mês anterior */
      prisma.agendamento.count({ where: { tenantId, data: { gte: mesAnteriorInicio.toISOString().slice(0, 10), lte: mesAnteriorFim.toISOString().slice(0, 10) } } }),
      prisma.lead.count({ where: { tenantId, status: { notIn: ['convertido', 'perdido'] }, createdAt: { lte: mesAnteriorFim } } }),
      prisma.lead.count({ where: { tenantId, status: 'convertido', createdAt: { gte: mesAnteriorInicio, lte: mesAnteriorFim } } }),
    ]);

    /* ── Calcular trends ── */
    function calcTrend(atual, anterior) {
      if (!anterior) return atual > 0 ? 100 : 0;
      return Math.round(((atual - anterior) / anterior) * 100);
    }

    res.json({
      stats: { totalLeads, leadsNovos, convertidos, agendamentosHoje },
      /* Campos novos para o dashboard redesenhado */
      dashboard: {
        agendamentosHoje,
        agendamentosHojeTrend:     calcTrend(agendamentosHoje, agendamentosOntem),
        agendamentosEsteMes,
        agendamentosEsteMesTrend:  calcTrend(agendamentosEsteMes, agendamentosMesAnterior),
        leadsEmAberto,
        leadsEmAbertoTrend:        calcTrend(leadsEmAberto, leadsEmAbertoMesAnterior),
        novosClientesMes,
        novosClientesMesTrend:     calcTrend(novosClientesMes, novosClientesMesAnterior),
        receitaEsteMes: null, // preenchido abaixo se módulo financeiro ativo
        receitaEsteMesTrend: 0,
      },
      leadsRecentes,
      agendamentosDodia,
    });
  } catch (err) { next(err); }
};

/* ── Série de agendamentos (últimos 30 dias) ─────────────────────────────── */
exports.agendamentosSerie = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const dias = parseInt(req.query.dias) || 30;

    const inicio = new Date();
    inicio.setDate(inicio.getDate() - (dias - 1));
    const inicioStr = inicio.toISOString().slice(0, 10);
    const hojeStr   = localDateStr();

    /* Agrupar por data */
    const rows = await prisma.agendamento.groupBy({
      by: ['data'],
      where: { tenantId, data: { gte: inicioStr, lte: hojeStr } },
      _count: { id: true },
      orderBy: { data: 'asc' },
    });

    /* Preencher dias sem agendamento com 0 */
    const mapa = {};
    rows.forEach(r => { mapa[r.data] = r._count.id; });

    const serie = [];
    for (let i = 0; i < dias; i++) {
      const d = new Date(inicio);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      serie.push({ data: key, label, total: mapa[key] || 0 });
    }

    res.json({ serie });
  } catch (err) { next(err); }
};

/* ── Canais de agendamento ───────────────────────────────────────────────── */
exports.canais = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;

    const rows = await prisma.agendamento.groupBy({
      by: ['canal'],
      where: { tenantId },
      _count: { id: true },
    });

    /* Mapear para 4 categorias */
    const MAPA = { whatsapp: 'WhatsApp', web: 'Link Público', manual: 'Manual' };
    const acum = { WhatsApp: 0, 'Link Público': 0, Manual: 0, Outros: 0 };

    rows.forEach(r => {
      const cat = MAPA[r.canal] || 'Outros';
      acum[cat] += r._count.id;
    });

    const total = Object.values(acum).reduce((s, v) => s + v, 0) || 1;
    const canais = Object.entries(acum).map(([nome, qtd]) => ({
      nome,
      qtd,
      pct: Math.round((qtd / total) * 100),
    })).filter(c => c.qtd > 0);

    res.json({ canais, total });
  } catch (err) { next(err); }
};
