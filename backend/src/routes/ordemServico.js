const router = require('express').Router();
const ctrl   = require('../controllers/ordemServicoController');
const auth   = require('../middlewares/auth');

router.use(auth);

router.get('/',    ctrl.listar);
router.get('/:id', ctrl.buscar);
router.post('/',   ctrl.criar);
router.put('/:id', ctrl.atualizar);
router.delete('/:id', ctrl.deletar);

router.post('/:id/enviar-wa',    ctrl.enviarPorWA);
router.post('/:id/enviar-email', ctrl.enviarPorEmail);

module.exports = router;
