const router = require('express').Router();
const prisma = require('../lib/prisma');
const auth = require('../middlewares/auth');
const { enfileirar } = require('../services/waQueue');

// Todo o módulo exige usuário autenticado (achado C1 da auditoria de 31/07/2026 —
// o router nunca exigia auth, expondo conversas de WhatsApp de clientes sem login).
router.use(auth);

// Guard: apenas planos pro e business
function requirePlano(req, res, next) {
  const { ATENDIMENTO_WA } = require('../config/planos');
  if (!ATENDIMENTO_WA[req.tenant?.plano]) {
    return res.status(403).json({ error: 'Módulo Atendimento WA disponível a partir do plano Pro.' });
  }
  next();
}

// Usuários com role 'atendente' só veem/respondem sessões próprias ou não
// atribuídas — admin/super_admin continuam sem restrição (comportamento atual).
// Retorna o WaAtendente vinculado ao usuário logado, ou null (sem restrição / sem vínculo).
async function resolverAtendenteDoUsuario(req) {
  if (req.user.role !== 'atendente') return null;
  return prisma.waAtendente.findFirst({ where: { tenantId: req.tenant.id, userId: req.user.id } });
}

// ─── ATENDENTES ───────────────────────────────────────────────────────────────

// GET /api/wa-atendimento/atendentes
router.get('/atendentes', requirePlano, async (req, res) => {
  try {
    const atendentes = await prisma.waAtendente.findMany({
      where: { tenantId: req.tenant.id },
      include: { user: { select: { id: true, email: true } } },
      orderBy: { nome: 'asc' },
    });
    res.json({ atendentes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/wa-atendimento/atendentes
router.post('/atendentes', requirePlano, async (req, res) => {
  const { nome, telefone, cargaMaxima, userId } = req.body;
  if (!telefone) return res.status(400).json({ error: 'Telefone é obrigatório.' });
  try {
    let nomeFinal = nome;
    if (userId) {
      const usuario = await prisma.user.findFirst({ where: { id: parseInt(userId), tenantId: req.tenant.id, role: 'atendente' } });
      if (!usuario) return res.status(400).json({ error: 'Usuário inválido: precisa existir no tenant com papel "atendente".' });
      nomeFinal = nomeFinal || usuario.nome;
    }
    if (!nomeFinal) return res.status(400).json({ error: 'Nome é obrigatório (ou selecione um usuário vinculado).' });

    const atendente = await prisma.waAtendente.create({
      data: { tenantId: req.tenant.id, nome: nomeFinal, telefone, cargaMaxima: cargaMaxima || 5, userId: userId ? parseInt(userId) : null },
    });
    res.status(201).json({ atendente });
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Este usuário já está vinculado a outro atendente.' });
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
    const meuAtendente = await resolverAtendenteDoUsuario(req);
    const where = {
      tenantId: req.tenant.id,
      status: { in: ['aguardando', 'em_atendimento'] },
    };
    if (req.user.role === 'atendente') {
      where.OR = meuAtendente
        ? [{ atendenteId: meuAtendente.id }, { atendenteId: null }]
        : [{ atendenteId: null }];
    }
    const fila = await prisma.waFila.findMany({
      where,
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
    const meuAtendente = await resolverAtendenteDoUsuario(req);
    const where = { tenantId: req.tenant.id, status: { in: ['encerrado', 'abandonado'] } };
    if (req.user.role === 'atendente') {
      where.OR = meuAtendente
        ? [{ atendenteId: meuAtendente.id }, { atendenteId: null }]
        : [{ atendenteId: null }];
    }
    const [total, fila] = await Promise.all([
      prisma.waFila.count({ where }),
      prisma.waFila.findMany({
        where,
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

    // Rodízio: atendente ativo com menor carga que ainda tem capacidade
    const atendentesDisponiveis = await prisma.waAtendente.findMany({
      where: { tenantId: req.tenant.id, ativo: true },
      orderBy: { cargaAtual: 'asc' },
    });
    const atendente = atendentesDisponiveis.find(a => a.cargaAtual < a.cargaMaxima) || null;

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

    if (req.user.role === 'atendente') {
      const meuAtendente = await resolverAtendenteDoUsuario(req);
      if (sessao.atendenteId && sessao.atendenteId !== meuAtendente?.id) {
        return res.status(403).json({ error: 'Sessão atribuída a outro atendente.' });
      }
    }

    const logs = await prisma.waConversaLog.findMany({
      where: { filaId: id, tenantId: req.tenant.id },
      orderBy: { criadoEm: 'asc' },
    });
    res.json({ sessao, logs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/wa-atendimento/fila/:id/responder — atendente responde pelo painel
// (envia via a mesma fila anti-ban que o bot/Agente IA já usam — prioritario:true
// pula a janela horária, igual AP-027; fire-and-forget, igual AP-010, pra não
// travar o request esperando o delay anti-ban de 7-20s)
router.post('/fila/:id/responder', requirePlano, async (req, res) => {
  const id = parseInt(req.params.id);
  const { mensagem } = req.body;
  if (!mensagem || !mensagem.trim()) return res.status(400).json({ error: 'Mensagem é obrigatória.' });
  try {
    const sessao = await prisma.waFila.findFirst({ where: { id, tenantId: req.tenant.id } });
    if (!sessao) return res.status(404).json({ error: 'Sessão não encontrada.' });
    if (sessao.status === 'encerrado' || sessao.status === 'abandonado') {
      return res.status(400).json({ error: 'Sessão já encerrada — não é possível responder.' });
    }

    let meuAtendente = null;
    if (req.user.role === 'atendente') {
      meuAtendente = await resolverAtendenteDoUsuario(req);
      if (sessao.atendenteId && sessao.atendenteId !== meuAtendente?.id) {
        return res.status(403).json({ error: 'Sessão atribuída a outro atendente.' });
      }
    }

    const log = await prisma.waConversaLog.create({
      data: {
        filaId: id,
        tenantId: req.tenant.id,
        direcao: 'saida',
        deTelefone: req.tenant.evolutionInstance || req.tenant.slug,
        paraTelefone: sessao.clienteTelefone,
        mensagem,
        atendenteId: meuAtendente?.id || sessao.atendenteId || null,
        fonte: 'humano',
        status: 'enviado',
      },
    });

    enfileirar(req.tenant, sessao.clienteTelefone, mensagem, { prioritario: true }).catch(err => {
      console.error('[wa_atendimento] falha ao enviar resposta:', err.message);
      prisma.waConversaLog.update({ where: { id: log.id }, data: { status: 'erro' } }).catch(() => {});
    });

    if (sessao.status === 'aguardando') {
      await prisma.waFila.update({ where: { id }, data: { status: 'em_atendimento' } });
    }

    res.json({ ok: true, logId: log.id });
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
