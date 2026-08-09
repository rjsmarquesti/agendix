const prisma = require('../lib/prisma');

const TIPOS_VALIDOS  = ['acao_civil','trabalhista','criminal','familia','previdenciario','consumidor','outro'];
const STATUS_VALIDOS = ['ativo','suspenso','encerrado','arquivado'];

async function gerarNumero(tenantId) {
  const ano   = new Date().getFullYear();
  const count = await prisma.processo.count({ where: { tenantId } });
  return `PROC-${ano}-${String(count + 1).padStart(4, '0')}`;
}

// GET /api/processos?search=&status=&tipo=&page=1
exports.listar = async (req, res, next) => {
  try {
    const { search, status, tipo, page = 1 } = req.query;
    const take = 20;
    const skip = (Number(page) - 1) * take;

    const where = { tenantId: req.user.tenantId };
    if (status) where.status = status;
    if (tipo)   where.tipo   = tipo;
    if (search) where.OR = [
      { titulo:      { contains: search, mode: 'insensitive' } },
      { numero:      { contains: search, mode: 'insensitive' } },
      { clienteNome: { contains: search, mode: 'insensitive' } },
    ];

    const [processos, total] = await Promise.all([
      prisma.processo.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take,
        include: { lead: { select: { id: true, nome: true } } },
      }),
      prisma.processo.count({ where }),
    ]);

    res.json({ processos, total, page: Number(page), pages: Math.ceil(total / take) });
  } catch (err) { next(err); }
};

// GET /api/processos/:id
exports.buscar = async (req, res, next) => {
  try {
    const p = await prisma.processo.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId },
      include: { lead: { select: { id: true, nome: true, telefone: true } } },
    });
    if (!p) return res.status(404).json({ error: 'Processo não encontrado' });
    res.json({ processo: p });
  } catch (err) { next(err); }
};

// POST /api/processos
exports.criar = async (req, res, next) => {
  try {
    const {
      titulo, tipo, clienteNome, clienteTel, parteContraria, advogado,
      vara, comarca, dataAbertura, prazoProximo, dataEncerramento,
      valorCausa, honorarios, observacoes, status, leadId,
    } = req.body;

    if (!titulo?.trim())      return res.status(400).json({ error: 'Título obrigatório' });
    if (!clienteNome?.trim()) return res.status(400).json({ error: 'Nome do cliente obrigatório' });

    const numero = await gerarNumero(req.user.tenantId);

    const p = await prisma.processo.create({
      data: {
        tenantId:          req.user.tenantId,
        numero,
        titulo:            titulo.trim(),
        tipo:              TIPOS_VALIDOS.includes(tipo) ? tipo : 'outro',
        status:            STATUS_VALIDOS.includes(status) ? status : 'ativo',
        clienteNome:       clienteNome.trim(),
        clienteTel:        clienteTel        || null,
        parteContraria:    parteContraria    || null,
        advogado:          advogado          || null,
        vara:              vara              || null,
        comarca:           comarca           || null,
        dataAbertura:      dataAbertura      || null,
        prazoProximo:      prazoProximo      || null,
        dataEncerramento:  dataEncerramento  || null,
        valorCausa:        valorCausa        ? Number(valorCausa)   : null,
        honorarios:        honorarios        ? Number(honorarios)   : null,
        observacoes:       observacoes       || null,
        movimentacoes:     [],
        leadId:            leadId            ? Number(leadId) : null,
      },
    });
    res.status(201).json({ processo: p });
  } catch (err) { next(err); }
};

// PUT /api/processos/:id
exports.atualizar = async (req, res, next) => {
  try {
    const existe = await prisma.processo.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId },
    });
    if (!existe) return res.status(404).json({ error: 'Processo não encontrado' });

    const {
      titulo, tipo, clienteNome, clienteTel, parteContraria, advogado,
      vara, comarca, dataAbertura, prazoProximo, dataEncerramento,
      valorCausa, honorarios, observacoes, status, leadId,
    } = req.body;

    const p = await prisma.processo.update({
      where: { id: Number(req.params.id) },
      data: {
        titulo:           titulo?.trim()      || existe.titulo,
        tipo:             TIPOS_VALIDOS.includes(tipo)   ? tipo   : existe.tipo,
        status:           STATUS_VALIDOS.includes(status) ? status : existe.status,
        clienteNome:      clienteNome?.trim() || existe.clienteNome,
        clienteTel:       clienteTel        !== undefined ? (clienteTel || null)        : existe.clienteTel,
        parteContraria:   parteContraria    !== undefined ? (parteContraria || null)    : existe.parteContraria,
        advogado:         advogado          !== undefined ? (advogado || null)          : existe.advogado,
        vara:             vara              !== undefined ? (vara || null)              : existe.vara,
        comarca:          comarca           !== undefined ? (comarca || null)           : existe.comarca,
        dataAbertura:     dataAbertura      !== undefined ? (dataAbertura || null)      : existe.dataAbertura,
        prazoProximo:     prazoProximo      !== undefined ? (prazoProximo || null)      : existe.prazoProximo,
        dataEncerramento: dataEncerramento  !== undefined ? (dataEncerramento || null)  : existe.dataEncerramento,
        valorCausa:       valorCausa        !== undefined ? (valorCausa ? Number(valorCausa) : null)   : existe.valorCausa,
        honorarios:       honorarios        !== undefined ? (honorarios ? Number(honorarios) : null)   : existe.honorarios,
        observacoes:      observacoes       !== undefined ? (observacoes || null)       : existe.observacoes,
        leadId:           leadId            !== undefined ? (leadId ? Number(leadId) : null)           : existe.leadId,
      },
    });
    res.json({ processo: p });
  } catch (err) { next(err); }
};

// DELETE /api/processos/:id
exports.deletar = async (req, res, next) => {
  try {
    const existe = await prisma.processo.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId },
    });
    if (!existe) return res.status(404).json({ error: 'Processo não encontrado' });
    await prisma.processo.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Processo removido' });
  } catch (err) { next(err); }
};

// POST /api/processos/:id/movimentacao
exports.addMovimentacao = async (req, res, next) => {
  try {
    const { texto, tipo = 'outros' } = req.body;
    if (!texto?.trim()) return res.status(400).json({ error: 'Texto obrigatório' });

    const existe = await prisma.processo.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId },
    });
    if (!existe) return res.status(404).json({ error: 'Processo não encontrado' });

    const movs = Array.isArray(existe.movimentacoes) ? existe.movimentacoes : [];
    const nova  = { id: Date.now(), data: new Date().toISOString(), tipo, texto: texto.trim() };
    movs.push(nova);

    const p = await prisma.processo.update({
      where: { id: Number(req.params.id) },
      data:  { movimentacoes: movs },
    });
    res.json({ processo: p });
  } catch (err) { next(err); }
};

// DELETE /api/processos/:id/movimentacao/:movId
exports.removeMovimentacao = async (req, res, next) => {
  try {
    const existe = await prisma.processo.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId },
    });
    if (!existe) return res.status(404).json({ error: 'Processo não encontrado' });

    const movs = (Array.isArray(existe.movimentacoes) ? existe.movimentacoes : [])
      .filter(m => String(m.id) !== String(req.params.movId));

    const p = await prisma.processo.update({
      where: { id: Number(req.params.id) },
      data:  { movimentacoes: movs },
    });
    res.json({ processo: p });
  } catch (err) { next(err); }
};
