const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/usersController');
const auth = require('../middlewares/auth');
const { requireRole } = auth;
const { checkPermission, listarPermissoes } = require('../lib/permissions');
const prisma = require('../lib/prisma');

const validar = [
  body('nome').notEmpty().withMessage('Nome obrigatório'),
  body('email').isEmail().withMessage('Email inválido'),
  body('senha').isLength({ min: 6 }).withMessage('Senha mínimo 6 caracteres'),
];

router.get('/',    auth, checkPermission('users', 'view'),   ctrl.listar);
router.post('/',   auth, checkPermission('users', 'create'), validar, ctrl.criar);
router.put('/:id', auth, checkPermission('users', 'edit'),   ctrl.atualizar);
router.delete('/:id', auth, checkPermission('users', 'delete'), ctrl.deletar);

// GET /api/users/:id/permissions — lista permissões efetivas do usuário
router.get('/:id/permissions', auth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId: req.tenant?.id || undefined },
      select: { id: true, nome: true, role: true },
    });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const result = await listarPermissoes(userId, user.role);
    res.json({ user, ...result });
  } catch (err) { next(err); }
});

// PUT /api/users/:id/permissions — salva overrides de permissão
router.put('/:id/permissions', auth, requireRole('admin', 'super_admin'), async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const { permissions } = req.body; // { leads: { view: true, delete: false }, ... }
    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({ error: 'permissions deve ser um objeto' });
    }

    // Verifica se o usuário pertence ao tenant
    const user = await prisma.user.findFirst({
      where: { id: userId, tenantId: req.tenant?.id || undefined },
      select: { id: true, role: true },
    });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });
    if (user.role === 'super_admin') return res.status(400).json({ error: 'super_admin não pode ter permissões restritas' });

    // Upsert cada permissão recebida
    const ops = [];
    for (const [resource, actions] of Object.entries(permissions)) {
      for (const [action, granted] of Object.entries(actions)) {
        ops.push(
          prisma.userPermission.upsert({
            where: { userId_resource_action: { userId, resource, action } },
            update: { granted: Boolean(granted) },
            create: { userId, resource, action, granted: Boolean(granted) },
          })
        );
      }
    }
    await Promise.all(ops);

    res.json({ ok: true, message: 'Permissões atualizadas' });
  } catch (err) { next(err); }
});

module.exports = router;
