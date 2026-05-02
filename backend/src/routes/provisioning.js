const router = require('express').Router({ mergeParams: true });
const ctrl = require('../controllers/n8nProvisioningController');
const auth = require('../middlewares/auth');

const onlySuper = [auth, (req, res, next) => {
  if (req.user.role !== 'super_admin') return res.status(403).json({ error: 'Acesso negado' });
  next();
}];

router.get('/',    ...onlySuper, ctrl.status);
router.post('/',   ...onlySuper, ctrl.provisionar);
router.delete('/', ...onlySuper, ctrl.remover);

module.exports = router;
