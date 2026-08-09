const router = require('express').Router();
const ctrl = require('../controllers/dashboardController');
const auth = require('../middlewares/auth');

router.get('/',                   auth, ctrl.stats);
router.get('/onboarding',         auth, ctrl.onboarding);
router.get('/agendamentos-serie', auth, ctrl.agendamentosSerie);
router.get('/canais',             auth, ctrl.canais);

module.exports = router;
