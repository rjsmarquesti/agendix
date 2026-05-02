const router = require('express').Router();
const ctrl = require('../controllers/settingsController');
const auth = require('../middlewares/auth');
const { requireRole } = auth;

router.get('/',            auth, requireRole('admin', 'super_admin'), ctrl.get);
router.put('/',            auth, requireRole('admin', 'super_admin'), ctrl.update);
router.post('/api-token',  auth, requireRole('admin', 'super_admin'), ctrl.gerarApiToken);
router.get('/agenda',      auth, requireRole('admin', 'super_admin'), ctrl.getAgenda);
router.put('/agenda',      auth, requireRole('admin', 'super_admin'), ctrl.updateAgenda);

module.exports = router;
