const { validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { dispararWebhook } = require('../services/webhook');
const { montarDadosLead, importarLote } = require('../services/leadService');

// GET /leads — listar com filtros geográficos, nicho, fonte, status
exports.listar = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const {
      busca, status, fonte, priority,
      estado, municipio, cidade, bairro,
      nicho, categoria,
      page = 1, limit = 50,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where = { tenantId };

    if (status)    where.status    = status;
    if (fonte)     where.fonte     = fonte;
    if (priority)  where.priority  = priority;
    if (estado)    where.estado    = estado;
    if (municipio) where.municipio = { contains: municipio };
    if (cidade)    where.cidade    = { contains: cidade };
    if (bairro)    where.bairro    = { contains: bairro };
    if (nicho)     where.nicho     = nicho;
    if (categoria) where.categoria = categoria;

    if (busca) {
      where.OR = [
        { nome:     { contains: busca } },
        { telefone: { contains: busca } },
        { email:    { contains: busca } },
        { nicho:    { contains: busca } },
        { bairro:   { contains: busca } },
        { cidade:   { contains: busca } },
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({ leads, total, page: Number(page), limit: Number(limit) });
  } catch (err) { next(err); }
};

// GET /leads/nichos — lista nichos e categorias disponíveis no tenant
exports.nichos = async (req, res, next) => {
  try {
    const raw = await prisma.lead.findMany({
      where: { tenantId: req.user.tenantId, nicho: { not: null } },
      select: { nicho: true, categoria: true },
      distinct: ['nicho', 'categoria'],
      orderBy: { nicho: 'asc' },
      take: 200, // máximo 200 combinações nicho+categoria por tenant
    });

    const mapa = {};
    raw.forEach(({ nicho, categoria }) => {
      if (!nicho) return;
      if (!mapa[nicho]) mapa[nicho] = new Set();
      if (categoria) mapa[nicho].add(categoria);
    });

    const data = Object.entries(mapa).map(([nicho, cats]) => ({
      nicho,
      categorias: Array.from(cats).sort(),
    }));

    res.json({ data });
  } catch (err) { next(err); }
};

// GET /leads/stats — contagens rápidas para o dashboard
exports.stats = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const [total, byStatus, byFonte, byNicho] = await Promise.all([
      prisma.lead.count({ where: { tenantId } }),
      prisma.lead.groupBy({ by: ['status'], where: { tenantId }, _count: true }),
      prisma.lead.groupBy({ by: ['fonte'],  where: { tenantId }, _count: true }),
      prisma.lead.groupBy({
        by: ['nicho'], where: { tenantId, nicho: { not: null } },
        _count: true, orderBy: { _count: { nicho: 'desc' } }, take: 10,
      }),
    ]);
    res.json({ total, byStatus, byFonte, byNicho });
  } catch (err) { next(err); }
};

// GET /leads/:id
exports.buscarPorId = async (req, res, next) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId },
    });
    if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });
    res.json({ lead });
  } catch (err) { next(err); }
};

// POST /leads — criar lead único
exports.criar = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const lead = await prisma.lead.create({
      data: { tenantId: req.user.tenantId, ...montarDadosLead(req.body) },
    });

    dispararWebhook(req.user.tenantId, 'lead.criado', lead);
    res.status(201).json({ lead });
  } catch (err) {
    // Duplicata place_id no mesmo tenant
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Este estabelecimento já está cadastrado (place_id duplicado)' });
    }
    next(err);
  }
};

// POST /leads/importar — importação em lote (Google Maps)
exports.importar = async (req, res, next) => {
  try {
    const { leads: lista } = req.body;
    if (!Array.isArray(lista) || lista.length === 0) {
      return res.status(400).json({ error: 'Envie um array "leads" com pelo menos 1 item' });
    }
    if (lista.length > 500) {
      return res.status(400).json({ error: 'Máximo de 500 leads por importação' });
    }

    const resultado = await importarLote(req.user.tenantId, lista);
    res.json({ ok: true, ...resultado });
  } catch (err) { next(err); }
};

// PUT /leads/:id — atualizar
exports.atualizar = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const existe = await prisma.lead.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId },
    });
    if (!existe) return res.status(404).json({ error: 'Lead não encontrado' });

    const lead = await prisma.lead.update({
      where: { id: existe.id, tenantId: req.user.tenantId },
      data: montarDadosLead({ ...existe, ...req.body }),
    });

    const evento = existe.status !== status ? 'lead.status_alterado' : 'lead.atualizado';
    dispararWebhook(req.user.tenantId, evento, lead);
    res.json({ lead });
  } catch (err) { next(err); }
};

// DELETE /leads/:id
exports.deletar = async (req, res, next) => {
  try {
    const existe = await prisma.lead.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId },
    });
    if (!existe) return res.status(404).json({ error: 'Lead não encontrado' });

    await prisma.lead.delete({ where: { id: existe.id, tenantId: req.user.tenantId } });
    res.json({ message: 'Lead removido' });
  } catch (err) { next(err); }
};
