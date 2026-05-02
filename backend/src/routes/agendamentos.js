const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/agendamentosController');
const auth = require('../middlewares/auth');

const validar = [
  body('lead_id').isInt().withMessage('Lead obrigatório'),
  body('data').notEmpty().withMessage('Data obrigatória'),
  body('hora').notEmpty().withMessage('Hora obrigatória'),
];

router.get('/',    auth, ctrl.listar);
router.get('/:id', auth, ctrl.buscarPorId);
router.post('/',   auth, validar, ctrl.criar);
router.put('/:id', auth, validar, ctrl.atualizar);
router.delete('/:id', auth, ctrl.deletar);

module.exports = router;
