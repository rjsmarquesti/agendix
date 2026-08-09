const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/processosController');
const auth    = require('../middlewares/auth');

router.use(auth);

router.get('/',    ctrl.listar);
router.get('/:id', ctrl.buscar);
router.post('/',   ctrl.criar);
router.put('/:id', ctrl.atualizar);
router.delete('/:id', ctrl.deletar);
router.post('/:id/movimentacao',           ctrl.addMovimentacao);
router.delete('/:id/movimentacao/:movId',  ctrl.removeMovimentacao);

module.exports = router;
