const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/tenantsController');
const auth = require('../middlewares/auth');
const { requireRole } = auth;

const onlySuper = [auth, requireRole('super_admin')];

const validarTenant = [
  body('nome').notEmpty().withMessage('Nome obrigatório'),
  body('slug').notEmpty().matches(/^[a-z0-9-]+$/).withMessage('Slug: use apenas letras minúsculas, números e -'),
];

router.get('/',    ...onlySuper, ctrl.listar);
router.get('/:id', ...onlySuper, ctrl.buscarPorId);
router.post('/',   ...onlySuper, validarTenant, ctrl.criar);
router.put('/:id', ...onlySuper, ctrl.atualizar);
router.delete('/:id', ...onlySuper, ctrl.deletar);

// Usuários do tenant
router.post('/:id/usuarios',              ...onlySuper, ctrl.criarUsuario);
router.put('/:id/usuarios/:userId/senha', ...onlySuper, ctrl.resetarSenha);

// Evolution API — criar/recriar instância
router.post('/:id/create-evolution', ...onlySuper, ctrl.criarEvolution);

// Provisioning n8n
router.use('/:id/provision-n8n', require('./provisioning'));

module.exports = router;
