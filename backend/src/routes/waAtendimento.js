const router = require('express').Router();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Guard: apenas planos pro, premium, business
function requirePlano(req, res, next) {
  const plano = req.tenant?.plano;
  if (plano === 'basico') {
    return res.status(403).json({ error: 'Módulo Atendimento WA disponível a partir do plano Pro.' });
  }
  next();
}

// ─── ATENDENTES ───────────────────────────────────────────────────────────────

// GET /api/wa-atendimento/atendentes
router.get('/atendentes', requirePlano, async (req, res) => {
  try {
    const atendentes = await prisma.waAtendente.findMany({
      where: { tenantId: req.tenant.id },
      orderBy: { nome: 'asc' },
    });
    res.json({ atendentes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/wa-atendimento/atendentes
router.post('/atendentes', requirePlano, async (req, res) => {
  const { nome, telefone, cargaMaxima } = req.body;
  if (!nome || !telefone) return res.status(400).json({ error: 'Nome e telefone são obrigatórios.' });
  try {
    const atendente = await prisma.waAtendente.create({
      data: { tenantId: req.tenant.id, nome, telefone, cargaMaxima: cargaMaxima || 5 },
    });
    res.status(201).json({ atendente });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/wa-atendimento/atendentes/:id
router.put('/atendentes/:id', requirePlano, async (req, res) => {
  const id = parseInt(req.params.id);
  const { nome, telefone, cargaMaxima, ativo } = req.body;
  try {
    const atendente = await prisma.waAtendente.updateMany({
      where: { id, tenantId: req.tenant.id },
      data: { nome, telefone, cargaMaxima, ativo },
    });
    if (atendente.count === 0) return res.status(404).json({ error: 'Atendente não encontrado.' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/wa-atendimento/atendentes/:id
router.delete('/atendentes/:id', requirePlano, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    await prisma.waAtendente.deleteMany({ where: { id, tenantId: req.tenant.id } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── FILA ─────────────────────────────────────────────────────────────────────

// GET /api/wa-atendimento/fila  (ativa: aguardando + em_atendimento)
router.get('/fila', requirePlano, async (req, res) => {
  try {
    const fila = await prisma.waFila.findMany({
      where: {
        tenantId: req.tenant.id,
        status: { in: ['aguardando', 'em_atendimento'] },
      },
      include: { atendente: { select: { id: true, nome: true } } },
      orderBy: { abertaEm: 'asc' },
    });
    res.json({ fila });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/wa-atendimento/fila/historico  (encerradas)
router.get('/fila/historico', requirePlano, async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  try {
    const [total, fila] = await Promise.all([
      prisma.waFila.count({
        where: { tenantId: req.tenant.id, status: { in: ['encerrado', 'abandonado'] } },
      }),
      prisma.waFila.findMany({
        where: { tenantId: req.tenant.id, status: { in: ['encerrado', 'abandonado'] } },
        include: { atendente: { select: { id: true, nome: true } } },
        orderBy: { abertaEm: 'desc' },
        skip,
        take: parseInt(limit),
      }),
    ]);
    res.json({ fila, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/wa-atendimento/fila  (abrir nova sessão — chamado pelo webhook WA)
router.post('/fila', requirePlano, async (req, res) => {
  const { clienteTelefone, clienteNome } = req.body;
  if (!clienteTelefone) return res.status(400).json({ error: 'clienteTelefone é obrigatório.' });
  try {
    // Verificar se já existe sessão ativa para este cliente
    const existente = await prisma.waFila.findFirst({
      where: {
        tenantId: req.tenant.id,
        clienteTelefone,
        status: { in: ['aguardando', 'em_atendimento'] },
      },
    });
    if (existente) return res.json({ fila: existente, novo: false });

    // Rodízio: atendente ativo com menor carga
    const atendente = await prisma.waAtendente.findFirst({
      where: { tenantId: req.tenant.id, ativo: true, cargaAtual: { lt: prisma.waAtendente.fields.cargaMaxima } },
      orderBy: { cargaAtual: 'asc' },
    });

    const fila = await prisma.waFila.create({
      data: {
        tenantId: req.tenant.id,
        clienteTelefone,
        clienteNome: clienteNome || null,
        atendenteId: atendente?.id || null,
        status: atendente ? 'em_atendimento' : 'aguardando',
      },
    });

    if (atendente) {
      await prisma.waAtendente.update({
        where: { id: atendente.id },
        data: { cargaAtual: { increment: 1 } },
      });
    }

    res.status(201).json({ fila, novo: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/wa-atendimento/fila/:id/encerrar
router.patch('/fila/:id/encerrar', requirePlano, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const sessao = await prisma.waFila.findFirst({ where: { id, tenantId: req.tenant.id } });
    if (!sessao) return res.status(404).json({ error: 'Sessão não encontrada.' });

    await prisma.waFila.update({
      where: { id },
      data: { status: 'encerrado', fechadaEm: new Date() },
    });

    if (sessao.atendenteId) {
      await prisma.waAtendente.update({
        where: { id: sessao.atendenteId },
        data: { cargaAtual: { decrement: 1 } },
      });
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/wa-atendimento/fila/:id/transferir
router.patch('/fila/:id/transferir', requirePlano, async (req, res) => {
  const id = parseInt(req.params.id);
  const { atendenteId } = req.body;
  if (!atendenteId) return res.status(400).json({ error: 'atendenteId é obrigatório.' });
  try {
    const sessao = await prisma.waFila.findFirst({ where: { id, tenantId: req.tenant.id } });
    if (!sessao) return res.status(404).json({ error: 'Sessão não encontrada.' });

    // Decrementar carga do anterior, incrementar do novo
    if (sessao.atendenteId) {
      await prisma.waAtendente.update({
        where: { id: sessao.atendenteId },
        data: { cargaAtual: { decrement: 1 } },
      });
    }
    await prisma.waAtendente.update({
      where: { id: atendenteId },
      data: { cargaAtual: { increment: 1 } },
    });

    await prisma.waFila.update({
      where: { id },
      data: { atendenteId, status: 'em_atendimento' },
    });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── LOGS / AUDITORIA ─────────────────────────────────────────────────────────

// GET /api/wa-atendimento/fila/:id/logs
router.get('/fila/:id/logs', requirePlano, async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const sessao = await prisma.waFila.findFirst({ where: { id, tenantId: req.tenant.id } });
    if (!sessao) return res.status(404).json({ error: 'Sessão não encontrada.' });

    const logs = await prisma.waConversaLog.findMany({
      where: { filaId: id },
      orderBy: { criadoEm: 'asc' },
    });
    res.json({ sessao, logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/wa-atendimento/fila/:id/logs  (registrar mensagem — usado internamente)
router.post('/fila/:id/logs', requirePlano, async (req, res) => {
  const filaId = parseInt(req.params.id);
  const { direcao, deTelefone, paraTelefone, mensagem, atendenteId, fonte } = req.body;
  if (!direcao || !deTelefone || !paraTelefone || !mensagem) {
    return res.status(400).json({ error: 'direcao, deTelefone, paraTelefone e mensagem são obrigatórios.' });
  }
  try {
    const sessao = await prisma.waFila.findFirst({ where: { id: filaId, tenantId: req.tenant.id } });
    if (!sessao) return res.status(404).json({ error: 'Sessão não encontrada.' });

    const log = await prisma.waConversaLog.create({
      data: {
        filaId,
        tenantId: req.tenant.id,
        direcao,
        deTelefone,
        paraTelefone,
        mensagem,
        atendenteId: atendenteId || null,
        fonte: fonte || 'bot',
      },
    });
    res.status(201).json({ log });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

// GET /api/wa-atendimento/dashboard
router.get('/dashboard', requirePlano, async (req, res) => {
  try {
    const tenantId = req.tenant.id;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const [aguardando, emAtendimento, encerradosHoje, atendentesAtivos] = await Promise.all([
      prisma.waFila.count({ where: { tenantId, status: 'aguardando' } }),
      prisma.waFila.count({ where: { tenantId, status: 'em_atendimento' } }),
      prisma.waFila.count({ where: { tenantId, status: 'encerrado', fechadaEm: { gte: hoje } } }),
      prisma.waAtendente.findMany({
        where: { tenantId, ativo: true },
        select: { id: true, nome: true, cargaAtual: true, cargaMaxima: true },
        orderBy: { nome: 'asc' },
      }),
    ]);

    res.json({ aguardando, emAtendimento, encerradosHoje, atendentes: atendentesAtivos });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
