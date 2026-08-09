const prisma = require('../lib/prisma');

// GET /api/fichas?search=&leadId=&page=1
exports.listar = async (req, res, next) => {
  try {
    const { search, leadId, page = 1 } = req.query;
    const take = 20;
    const skip = (Number(page) - 1) * take;

    const where = { tenantId: req.user.tenantId };
    if (leadId)  where.leadId = Number(leadId);
    if (search)  where.nome   = { contains: search, mode: 'insensitive' };

    const [fichas, total] = await Promise.all([
      prisma.fichaCliente.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take,
        include: { lead: { select: { id: true, nome: true, telefone: true } } },
      }),
      prisma.fichaCliente.count({ where }),
    ]);

    res.json({ fichas, total, page: Number(page), pages: Math.ceil(total / take) });
  } catch (err) { next(err); }
};

// GET /api/fichas/:id
exports.buscar = async (req, res, next) => {
  try {
    const ficha = await prisma.fichaCliente.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId },
      include: {
        lead: { select: { id: true, nome: true, telefone: true, email: true } },
        anamneses: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!ficha) return res.status(404).json({ error: 'Ficha não encontrada' });
    res.json({ ficha });
  } catch (err) { next(err); }
};

// POST /api/fichas
exports.criar = async (req, res, next) => {
  try {
    const { nome, telefone, email, leadId, campos, observacoes } = req.body;
    if (!nome?.trim()) return res.status(400).json({ error: 'Nome obrigatório' });

    const ficha = await prisma.fichaCliente.create({
      data: {
        tenantId: req.user.tenantId,
        nome: nome.trim(),
        telefone: telefone || null,
        email: email || null,
        leadId: leadId ? Number(leadId) : null,
        campos: campos || {},
        observacoes: observacoes || null,
      },
    });
    res.status(201).json({ ficha });
  } catch (err) { next(err); }
};

// PUT /api/fichas/:id
exports.atualizar = async (req, res, next) => {
  try {
    const { nome, telefone, email, leadId, campos, observacoes } = req.body;

    const existe = await prisma.fichaCliente.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId },
    });
    if (!existe) return res.status(404).json({ error: 'Ficha não encontrada' });

    const ficha = await prisma.fichaCliente.update({
      where: { id: Number(req.params.id) },
      data: {
        nome: nome?.trim() || existe.nome,
        telefone: telefone !== undefined ? (telefone || null) : existe.telefone,
        email:    email    !== undefined ? (email    || null) : existe.email,
        leadId:   leadId   !== undefined ? (leadId ? Number(leadId) : null) : existe.leadId,
        campos:   campos   !== undefined ? campos : existe.campos,
        observacoes: observacoes !== undefined ? (observacoes || null) : existe.observacoes,
      },
    });
    res.json({ ficha });
  } catch (err) { next(err); }
};

// DELETE /api/fichas/:id
exports.deletar = async (req, res, next) => {
  try {
    const existe = await prisma.fichaCliente.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId },
    });
    if (!existe) return res.status(404).json({ error: 'Ficha não encontrada' });

    await prisma.fichaCliente.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Ficha removida' });
  } catch (err) { next(err); }
};
