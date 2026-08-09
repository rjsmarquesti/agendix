const prisma = require('../lib/prisma');

// GET /api/anamnese?search=&fichaId=&leadId=&page=1
exports.listar = async (req, res, next) => {
  try {
    const { search, fichaId, leadId, page = 1 } = req.query;
    const take = 20;
    const skip = (Number(page) - 1) * take;

    const where = { tenantId: req.user.tenantId };
    if (fichaId) where.fichaId = Number(fichaId);
    if (leadId)  where.leadId  = Number(leadId);
    if (search)  where.nomeCliente = { contains: search, mode: 'insensitive' };

    const [anamneses, total] = await Promise.all([
      prisma.anamnese.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take,
        include: {
          ficha: { select: { id: true, nome: true } },
          lead:  { select: { id: true, nome: true, telefone: true } },
        },
      }),
      prisma.anamnese.count({ where }),
    ]);

    res.json({ anamneses, total, page: Number(page), pages: Math.ceil(total / take) });
  } catch (err) { next(err); }
};

// GET /api/anamnese/:id
exports.buscar = async (req, res, next) => {
  try {
    const anamnese = await prisma.anamnese.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId },
      include: {
        ficha: { select: { id: true, nome: true } },
        lead:  { select: { id: true, nome: true, telefone: true } },
      },
    });
    if (!anamnese) return res.status(404).json({ error: 'Anamnese não encontrada' });
    res.json({ anamnese });
  } catch (err) { next(err); }
};

// POST /api/anamnese
exports.criar = async (req, res, next) => {
  try {
    const { nomeCliente, fichaId, leadId, campos, observacoes } = req.body;
    if (!nomeCliente?.trim()) return res.status(400).json({ error: 'Nome do cliente obrigatório' });

    const anamnese = await prisma.anamnese.create({
      data: {
        tenantId:    req.user.tenantId,
        nomeCliente: nomeCliente.trim(),
        fichaId:     fichaId ? Number(fichaId) : null,
        leadId:      leadId  ? Number(leadId)  : null,
        campos:      campos  || {},
        observacoes: observacoes || null,
      },
    });
    res.status(201).json({ anamnese });
  } catch (err) { next(err); }
};

// PUT /api/anamnese/:id
exports.atualizar = async (req, res, next) => {
  try {
    const { nomeCliente, fichaId, leadId, campos, observacoes } = req.body;

    const existe = await prisma.anamnese.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId },
    });
    if (!existe) return res.status(404).json({ error: 'Anamnese não encontrada' });

    const anamnese = await prisma.anamnese.update({
      where: { id: Number(req.params.id) },
      data: {
        nomeCliente: nomeCliente?.trim() || existe.nomeCliente,
        fichaId:     fichaId !== undefined ? (fichaId ? Number(fichaId) : null) : existe.fichaId,
        leadId:      leadId  !== undefined ? (leadId  ? Number(leadId)  : null) : existe.leadId,
        campos:      campos  !== undefined ? campos : existe.campos,
        observacoes: observacoes !== undefined ? (observacoes || null) : existe.observacoes,
      },
    });
    res.json({ anamnese });
  } catch (err) { next(err); }
};

// DELETE /api/anamnese/:id
exports.deletar = async (req, res, next) => {
  try {
    const existe = await prisma.anamnese.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId },
    });
    if (!existe) return res.status(404).json({ error: 'Anamnese não encontrada' });

    await prisma.anamnese.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Anamnese removida' });
  } catch (err) { next(err); }
};
