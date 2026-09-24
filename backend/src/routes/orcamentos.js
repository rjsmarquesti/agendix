const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/orcamentosController');
const authMiddleware = require('../middlewares/auth');
const requireModulo = require('../middlewares/requireModulo');

router.use(authMiddleware, requireModulo('orcamentos'));

router.get('/',    ctrl.listar);
router.get('/:id', ctrl.buscar);
router.post('/',   ctrl.criar);
router.put('/:id', ctrl.atualizar);
router.delete('/:id', ctrl.deletar);
router.post('/:id/enviar-wa',    ctrl.enviarPorWA);
router.post('/:id/enviar-email', ctrl.enviarPorEmail);

module.exports = router;
