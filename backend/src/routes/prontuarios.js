const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/prontuariosController');
const auth    = require('../middlewares/auth');

router.use(auth);

router.get('/',    ctrl.listar);
router.get('/:id', ctrl.buscar);
router.post('/',   ctrl.criar);
router.post('/:id/evolucao', ctrl.adicionarEvolucao);
router.delete('/:id/evolucao/:evolucaoId', ctrl.removerEvolucao);
router.put('/:id', ctrl.atualizar);
router.delete('/:id', ctrl.deletar);

module.exports = router;
