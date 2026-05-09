const router = require('express').Router();
const ctrl = require('../controllers/dashboardController');
const auth = require('../middlewares/auth');

router.get('/', auth, ctrl.stats);
router.get('/onboarding', auth, ctrl.onboarding);

module.exports = router;
