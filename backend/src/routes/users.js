const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/usersController');
const auth = require('../middlewares/auth');
const { requireRole } = auth;

const validar = [
  body('nome').notEmpty().withMessage('Nome obrigatório'),
  body('email').isEmail().withMessage('Email inválido'),
  body('senha').isLength({ min: 6 }).withMessage('Senha mínimo 6 caracteres'),
];

router.get('/',    auth, requireRole('admin', 'super_admin'), ctrl.listar);
router.post('/',   auth, requireRole('admin', 'super_admin'), validar, ctrl.criar);
router.put('/:id', auth, requireRole('admin', 'super_admin'), ctrl.atualizar);
router.delete('/:id', auth, requireRole('admin', 'super_admin'), ctrl.deletar);

module.exports = router;
