const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const auth = require('../middlewares/auth');
const { requireRole } = require('../middlewares/auth');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// GET /api/servicos — listar (todos ou apenas ativos)
router.get('/', auth, async (req, res, next) => {
  try {
    const { ativo } = req.query;
    const where = { tenantId: req.user.tenantId };
    if (ativo === 'true') where.ativo = true;
    if (ativo === 'false') where.ativo = false;

    const servicos = await prisma.servico.findMany({
      where,
      orderBy: [{ ordem: 'asc' }, { nome: 'asc' }],
    });
    res.json({ servicos });
  } catch (err) { next(err); }
});

// POST /api/servicos — criar
router.post('/',
  auth, requireRole('admin', 'super_admin'),
  [
    body('nome').trim().notEmpty().withMessage('Nome é obrigatório').isLength({ max: 100 }),
    body('duracaoMin').optional().isInt({ min: 15 }).withMessage('Duração mínima de 15 minutos'),
    body('preco').optional({ nullable: true }).isFloat({ min: 0 }).withMessage('Preço deve ser >= 0'),
    body('ordem').optional().isInt({ min: 0 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { nome, descricao, duracaoMin = 60, preco, ativo = true, ordem = 0 } = req.body;
      const servico = await prisma.servico.create({
        data: {
          tenantId: req.user.tenantId,
          nome,
          descricao: descricao || null,
          duracaoMin: parseInt(duracaoMin),
          preco: preco != null ? parseFloat(preco) : null,
          ativo,
          ordem: parseInt(ordem),
        },
      });
      res.status(201).json({ servico });
    } catch (err) { next(err); }
  }
);

// PUT /api/servicos/:id — atualizar
router.put('/:id',
  auth, requireRole('admin', 'super_admin'),
  [
    body('nome').optional().trim().notEmpty().isLength({ max: 100 }),
    body('duracaoMin').optional().isInt({ min: 15 }),
    body('preco').optional({ nullable: true }).isFloat({ min: 0 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await prisma.servico.findFirst({ where: { id, tenantId: req.user.tenantId } });
      if (!existing) return res.status(404).json({ error: 'Serviço não encontrado.' });

      const { nome, descricao, duracaoMin, preco, ativo, ordem } = req.body;
      const data = {};
      if (nome !== undefined) data.nome = nome;
      if (descricao !== undefined) data.descricao = descricao;
      if (duracaoMin !== undefined) data.duracaoMin = parseInt(duracaoMin);
      if (preco !== undefined) data.preco = preco != null ? parseFloat(preco) : null;
      if (ativo !== undefined) data.ativo = ativo;
      if (ordem !== undefined) data.ordem = parseInt(ordem);

      const servico = await prisma.servico.update({ where: { id }, data });
      res.json({ servico });
    } catch (err) { next(err); }
  }
);

// PATCH /api/servicos/:id/ordem — reordenar (troca ordem com outro)
router.patch('/:id/ordem',
  auth, requireRole('admin', 'super_admin'),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const { direcao } = req.body; // 'cima' | 'baixo'
      const tenantId = req.user.tenantId;

      const atual = await prisma.servico.findFirst({ where: { id, tenantId } });
      if (!atual) return res.status(404).json({ error: 'Serviço não encontrado.' });

      const todos = await prisma.servico.findMany({
        where: { tenantId },
        orderBy: [{ ordem: 'asc' }, { id: 'asc' }],
      });

      const idx = todos.findIndex(s => s.id === id);
      const trocarIdx = direcao === 'cima' ? idx - 1 : idx + 1;
      if (trocarIdx < 0 || trocarIdx >= todos.length) return res.json({ ok: true });

      const outro = todos[trocarIdx];
      await prisma.$transaction([
        prisma.servico.update({ where: { id: atual.id }, data: { ordem: trocarIdx } }),
        prisma.servico.update({ where: { id: outro.id }, data: { ordem: idx } }),
      ]);
      res.json({ ok: true });
    } catch (err) { next(err); }
  }
);

// DELETE /api/servicos/:id — deletar (verifica se tem agendamentos)
router.delete('/:id',
  auth, requireRole('admin', 'super_admin'),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await prisma.servico.findFirst({ where: { id, tenantId: req.user.tenantId } });
      if (!existing) return res.status(404).json({ error: 'Serviço não encontrado.' });

      // Se tem agendamentos vinculados, desativa em vez de deletar
      const count = await prisma.agendamento.count({ where: { servicoId: id } });
      if (count > 0) {
        await prisma.servico.update({ where: { id }, data: { ativo: false } });
        return res.json({ message: 'Serviço desativado (possui agendamentos vinculados).' });
      }

      await prisma.servico.delete({ where: { id } });
      res.json({ message: 'Serviço removido.' });
    } catch (err) { next(err); }
  }
);

module.exports = router;
