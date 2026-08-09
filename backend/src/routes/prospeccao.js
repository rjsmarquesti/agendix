const router = require('express').Router();
const ctrl = require('../controllers/prospeccaoController');
const auth = require('../middlewares/auth');

router.use(auth);

// Guard: prospecção disponível para Pro, Business e Trial
router.use((req, res, next) => {
  const modulos = Array.isArray(req.tenant?.modulos) ? req.tenant.modulos : [];
  const plano = req.tenant?.plano;
  const status = req.tenant?.planoStatus;
  const liberado = modulos.includes('prospeccao')
    || ['pro', 'business'].includes(plano)
    || status === 'trial';
  if (!liberado) return res.status(403).json({ error: 'Módulo de prospecção não disponível no plano atual.' });
  next();
});

router.get('/stats',           ctrl.stats);
router.get('/disparos',        ctrl.disparos);
router.get('/kanban',          ctrl.kanban);
router.get('/follow-up',       ctrl.followUp);
router.get('/:id/atividades',  ctrl.atividades);
router.get('/:id',             ctrl.detalhe);
router.post('/:id/atividades', ctrl.adicionarAtividade);
router.post('/:id/contato',    ctrl.registrarContato);
router.put('/:id/status',      ctrl.moverStatus);

module.exports = router;
