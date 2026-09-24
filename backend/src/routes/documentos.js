const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/documentosController');
const auth    = require('../middlewares/auth');
const requireModulo = require('../middlewares/requireModulo');

router.use(auth, requireModulo('documentos'));

router.get('/',    ctrl.listar);
router.get('/:id', ctrl.buscar);
router.post('/',   ctrl.criar);
router.put('/:id', ctrl.atualizar);
router.delete('/:id', ctrl.deletar);

module.exports = router;
