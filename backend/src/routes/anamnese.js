const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/anamneseController');
const authMiddleware = require('../middlewares/auth');

router.use(authMiddleware);

router.get('/',    ctrl.listar);
router.get('/:id', ctrl.buscar);
router.post('/',   ctrl.criar);
router.put('/:id', ctrl.atualizar);
router.delete('/:id', ctrl.deletar);

module.exports = router;
