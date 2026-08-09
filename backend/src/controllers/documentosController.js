const prisma = require('../lib/prisma');

const TIPOS_VALIDOS = ['contrato', 'proposta', 'procuracao', 'relatorio', 'outro'];
const STATUS_VALIDOS = ['rascunho', 'ativo', 'vencido', 'cancelado'];

// GET /api/documentos?search=&status=&tipo=&page=1
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
      { clienteNome: { contains: search, mode: 'insensitive' } },
    ];

    const [documentos, total] = await Promise.all([
      prisma.documento.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take,
        include: { lead: { select: { id: true, nome: true } } },
      }),
      prisma.documento.count({ where }),
    ]);

    res.json({ documentos, total, page: Number(page), pages: Math.ceil(total / take) });
  } catch (err) { next(err); }
};

// GET /api/documentos/:id
exports.buscar = async (req, res, next) => {
  try {
    const d = await prisma.documento.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId },
      include: { lead: { select: { id: true, nome: true, telefone: true } } },
    });
    if (!d) return res.status(404).json({ error: 'Documento não encontrado' });
    res.json({ documento: d });
  } catch (err) { next(err); }
};

// POST /api/documentos
exports.criar = async (req, res, next) => {
  try {
    const { titulo, tipo, clienteNome, clienteTel, conteudo, observacoes,
            status, dataVencimento, leadId } = req.body;
    if (!titulo?.trim())      return res.status(400).json({ error: 'Título obrigatório' });
    if (!clienteNome?.trim()) return res.status(400).json({ error: 'Nome do cliente obrigatório' });

    const d = await prisma.documento.create({
      data: {
        tenantId:       req.user.tenantId,
        titulo:         titulo.trim(),
        tipo:           TIPOS_VALIDOS.includes(tipo) ? tipo : 'outro',
        clienteNome:    clienteNome.trim(),
        clienteTel:     clienteTel     || null,
        conteudo:       conteudo       || null,
        observacoes:    observacoes    || null,
        status:         STATUS_VALIDOS.includes(status) ? status : 'rascunho',
        dataVencimento: dataVencimento || null,
        leadId:         leadId ? Number(leadId) : null,
      },
    });
    res.status(201).json({ documento: d });
  } catch (err) { next(err); }
};

// PUT /api/documentos/:id
exports.atualizar = async (req, res, next) => {
  try {
    const { titulo, tipo, clienteNome, clienteTel, conteudo, observacoes,
            status, dataVencimento, leadId } = req.body;

    const existe = await prisma.documento.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId },
    });
    if (!existe) return res.status(404).json({ error: 'Documento não encontrado' });

    const d = await prisma.documento.update({
      where: { id: Number(req.params.id) },
      data: {
        titulo:         titulo?.trim()      || existe.titulo,
        tipo:           TIPOS_VALIDOS.includes(tipo) ? tipo : existe.tipo,
        clienteNome:    clienteNome?.trim() || existe.clienteNome,
        clienteTel:     clienteTel     !== undefined ? (clienteTel || null)     : existe.clienteTel,
        conteudo:       conteudo       !== undefined ? (conteudo || null)       : existe.conteudo,
        observacoes:    observacoes    !== undefined ? (observacoes || null)    : existe.observacoes,
        status:         STATUS_VALIDOS.includes(status) ? status               : existe.status,
        dataVencimento: dataVencimento !== undefined ? (dataVencimento || null) : existe.dataVencimento,
        leadId:         leadId         !== undefined ? (leadId ? Number(leadId) : null) : existe.leadId,
      },
    });
    res.json({ documento: d });
  } catch (err) { next(err); }
};

// DELETE /api/documentos/:id
exports.deletar = async (req, res, next) => {
  try {
    const existe = await prisma.documento.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId },
    });
    if (!existe) return res.status(404).json({ error: 'Documento não encontrado' });
    await prisma.documento.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Documento removido' });
  } catch (err) { next(err); }
};
