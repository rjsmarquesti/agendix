const prisma = require('../lib/prisma');

// GET /api/prontuarios?search=&page=1
exports.listar = async (req, res, next) => {
  try {
    const { search, page = 1 } = req.query;
    const take = 20;
    const skip = (Number(page) - 1) * take;

    const where = { tenantId: req.user.tenantId };
    if (search) where.OR = [
      { nomeCliente: { contains: search, mode: 'insensitive' } },
      { diagnostico: { contains: search, mode: 'insensitive' } },
    ];

    const [prontuarios, total] = await Promise.all([
      prisma.prontuario.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take,
        include: { lead: { select: { id: true, nome: true } } },
      }),
      prisma.prontuario.count({ where }),
    ]);

    res.json({ prontuarios, total, page: Number(page), pages: Math.ceil(total / take) });
  } catch (err) { next(err); }
};

// GET /api/prontuarios/:id
exports.buscar = async (req, res, next) => {
  try {
    const p = await prisma.prontuario.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId },
      include: { lead: { select: { id: true, nome: true, telefone: true } } },
    });
    if (!p) return res.status(404).json({ error: 'Prontuário não encontrado' });
    res.json({ prontuario: p });
  } catch (err) { next(err); }
};

// POST /api/prontuarios
exports.criar = async (req, res, next) => {
  try {
    const { nomeCliente, telefone, email, dataNascimento, convenio, numeroCarteirinha,
            campos, diagnostico, observacoes, leadId } = req.body;
    if (!nomeCliente?.trim()) return res.status(400).json({ error: 'Nome do paciente obrigatório' });

    const p = await prisma.prontuario.create({
      data: {
        tenantId:          req.user.tenantId,
        nomeCliente:       nomeCliente.trim(),
        telefone:          telefone          || null,
        email:             email             || null,
        dataNascimento:    dataNascimento    || null,
        convenio:          convenio          || null,
        numeroCarteirinha: numeroCarteirinha || null,
        campos:            campos            || {},
        evolucoes:         [],
        diagnostico:       diagnostico       || null,
        observacoes:       observacoes       || null,
        leadId:            leadId ? Number(leadId) : null,
      },
    });
    res.status(201).json({ prontuario: p });
  } catch (err) { next(err); }
};

// POST /api/prontuarios/:id/evolucao — adiciona nova entrada no histórico
exports.adicionarEvolucao = async (req, res, next) => {
  try {
    const { texto, profissional } = req.body;
    if (!texto?.trim()) return res.status(400).json({ error: 'Texto da evolução obrigatório' });

    const existe = await prisma.prontuario.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId },
    });
    if (!existe) return res.status(404).json({ error: 'Prontuário não encontrado' });

    const evolucoes = Array.isArray(existe.evolucoes) ? existe.evolucoes : [];
    const novaEvolucao = {
      id:          Date.now(),
      data:        new Date().toISOString(),
      texto:       texto.trim(),
      profissional: profissional?.trim() || null,
    };

    const p = await prisma.prontuario.update({
      where: { id: Number(req.params.id) },
      data:  { evolucoes: [...evolucoes, novaEvolucao] },
    });
    res.json({ prontuario: p });
  } catch (err) { next(err); }
};

// DELETE /api/prontuarios/:id/evolucao/:evolucaoId
exports.removerEvolucao = async (req, res, next) => {
  try {
    const existe = await prisma.prontuario.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId },
    });
    if (!existe) return res.status(404).json({ error: 'Prontuário não encontrado' });

    const evolucoes = (Array.isArray(existe.evolucoes) ? existe.evolucoes : [])
      .filter(e => String(e.id) !== String(req.params.evolucaoId));

    const p = await prisma.prontuario.update({
      where: { id: Number(req.params.id) },
      data:  { evolucoes },
    });
    res.json({ prontuario: p });
  } catch (err) { next(err); }
};

// PUT /api/prontuarios/:id
exports.atualizar = async (req, res, next) => {
  try {
    const { nomeCliente, telefone, email, dataNascimento, convenio, numeroCarteirinha,
            campos, diagnostico, observacoes, leadId } = req.body;

    const existe = await prisma.prontuario.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId },
    });
    if (!existe) return res.status(404).json({ error: 'Prontuário não encontrado' });

    const p = await prisma.prontuario.update({
      where: { id: Number(req.params.id) },
      data: {
        nomeCliente:       nomeCliente?.trim()   || existe.nomeCliente,
        telefone:          telefone          !== undefined ? (telefone || null)          : existe.telefone,
        email:             email             !== undefined ? (email || null)             : existe.email,
        dataNascimento:    dataNascimento    !== undefined ? (dataNascimento || null)    : existe.dataNascimento,
        convenio:          convenio          !== undefined ? (convenio || null)          : existe.convenio,
        numeroCarteirinha: numeroCarteirinha !== undefined ? (numeroCarteirinha || null) : existe.numeroCarteirinha,
        campos:            campos            !== undefined ? (campos || {})              : existe.campos,
        diagnostico:       diagnostico       !== undefined ? (diagnostico || null)      : existe.diagnostico,
        observacoes:       observacoes       !== undefined ? (observacoes || null)       : existe.observacoes,
        leadId:            leadId            !== undefined ? (leadId ? Number(leadId) : null) : existe.leadId,
      },
    });
    res.json({ prontuario: p });
  } catch (err) { next(err); }
};

// DELETE /api/prontuarios/:id
exports.deletar = async (req, res, next) => {
  try {
    const existe = await prisma.prontuario.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId },
    });
    if (!existe) return res.status(404).json({ error: 'Prontuário não encontrado' });
    await prisma.prontuario.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Prontuário removido' });
  } catch (err) { next(err); }
};
