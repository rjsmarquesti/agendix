const prisma = require('../lib/prisma');

const STATUS_VALIDOS = ['novo','contato','qualificado','proposta','agendado','convertido','perdido'];

exports.kanban = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const leads = await prisma.lead.findMany({
      where: { tenantId },
      select: {
        id: true, nome: true, telefone: true, nicho: true, subcategoria: true,
        rating: true, origem: true, priority: true, status: true,
        ultimoContato: true, proximoContato: true, cidade: true, estado: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const colunas = {};
    for (const s of STATUS_VALIDOS) colunas[s] = [];
    for (const lead of leads) {
      const col = lead.status || 'novo';
      if (colunas[col]) colunas[col].push(lead);
    }

    res.json(colunas);
  } catch (err) { next(err); }
};

exports.moverStatus = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const leadId = parseInt(req.params.id);
    const { status } = req.body;

    if (!STATUS_VALIDOS.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }

    const lead = await prisma.lead.findFirst({ where: { id: leadId, tenantId } });
    if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });

    const atualizado = await prisma.lead.update({
      where: { id: leadId },
      data: { status },
    });

    res.json(atualizado);
  } catch (err) { next(err); }
};

exports.followUp = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const hoje = new Date();
    hoje.setHours(23, 59, 59, 999);

    const leads = await prisma.lead.findMany({
      where: {
        tenantId,
        status: { in: ['novo', 'contato', 'qualificado', 'proposta'] },
        OR: [
          { proximoContato: { lte: hoje } },
          { proximoContato: null },
        ],
      },
      select: {
        id: true, nome: true, telefone: true, nicho: true, status: true,
        ultimoContato: true, proximoContato: true, cidade: true, estado: true,
        priority: true, origem: true,
      },
      orderBy: [
        { proximoContato: { sort: 'asc', nulls: 'last' } },
        { createdAt: 'asc' },
      ],
      take: 50,
    });

    res.json(leads);
  } catch (err) { next(err); }
};

exports.registrarContato = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const leadId = parseInt(req.params.id);
    const userId = req.user?.id || null;
    const { tipo, descricao, proximoContato } = req.body;

    if (!tipo) return res.status(400).json({ error: 'Tipo obrigatório' });

    const lead = await prisma.lead.findFirst({ where: { id: leadId, tenantId } });
    if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });

    const [atividade] = await prisma.$transaction([
      prisma.leadAtividade.create({
        data: {
          tenantId, leadId, userId,
          tipo, descricao: descricao || null,
          data: new Date(),
        },
      }),
      prisma.lead.update({
        where: { id: leadId },
        data: {
          ultimoContato: new Date(),
          proximoContato: proximoContato ? new Date(proximoContato) : null,
        },
      }),
    ]);

    res.status(201).json(atividade);
  } catch (err) { next(err); }
};

exports.atividades = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const leadId = parseInt(req.params.id);

    const lead = await prisma.lead.findFirst({ where: { id: leadId, tenantId } });
    if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });

    const atividades = await prisma.leadAtividade.findMany({
      where: { leadId, tenantId },
      include: { user: { select: { id: true, nome: true } } },
      orderBy: { data: 'desc' },
    });

    res.json(atividades);
  } catch (err) { next(err); }
};

exports.adicionarAtividade = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const leadId = parseInt(req.params.id);
    const userId = req.user?.id || null;
    const { tipo, descricao, data } = req.body;

    if (!tipo) return res.status(400).json({ error: 'Tipo obrigatório' });

    const lead = await prisma.lead.findFirst({ where: { id: leadId, tenantId } });
    if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });

    const atividade = await prisma.leadAtividade.create({
      data: {
        tenantId, leadId, userId,
        tipo, descricao: descricao || null,
        data: data ? new Date(data) : new Date(),
      },
      include: { user: { select: { id: true, nome: true } } },
    });

    // Atualiza ultimoContato ao adicionar atividade manual
    await prisma.lead.update({
      where: { id: leadId },
      data: { ultimoContato: new Date() },
    });

    res.status(201).json(atividade);
  } catch (err) { next(err); }
};

exports.stats = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { apiToken: true, slug: true },
    });

    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const [totalLeads, totalGoogleMaps, inseridosHoje, conversoesTotal] = await Promise.all([
      prisma.lead.count({ where: { tenantId } }),
      prisma.lead.count({ where: { tenantId, fonte: 'google_maps' } }),
      prisma.lead.count({ where: { tenantId, createdAt: { gte: hoje } } }),
      prisma.lead.count({ where: { tenantId, status: 'convertido' } }),
    ]);

    const appUrl = process.env.APP_URL || 'https://agendix.divulgabr.com.br';
    const apiUrl = process.env.API_URL || appUrl;

    res.json({
      totalLeads,
      totalGoogleMaps,
      inseridosHoje,
      conversoesTotal,
      webhookUrl: `${apiUrl}/api/webhook/gmaps`,
      webhookUrlExtrator: `${apiUrl}/api/webhook/extrator/${tenant?.slug || ''}`,
      apiToken: tenant?.apiToken || null,
    });
  } catch (err) { next(err); }
};

exports.detalhe = async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const leadId = parseInt(req.params.id);

    const lead = await prisma.lead.findFirst({
      where: { id: leadId, tenantId },
      include: {
        atividades: {
          include: { user: { select: { id: true, nome: true } } },
          orderBy: { data: 'desc' },
          take: 20,
        },
        agendamentos: {
          select: { id: true, data: true, hora: true, status: true },
          orderBy: { data: 'desc' },
          take: 5,
        },
      },
    });

    if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });
    res.json(lead);
  } catch (err) { next(err); }
};
