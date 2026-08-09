const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/documentosController');
const auth    = require('../middlewares/auth');

router.use(auth);

router.get('/',    ctrl.listar);
router.get('/:id', ctrl.buscar);
router.post('/',   ctrl.criar);
router.put('/:id', ctrl.atualizar);
router.delete('/:id', ctrl.deletar);

module.exports = router;
