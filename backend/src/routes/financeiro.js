const router = require('express').Router();
const ctrl = require('../controllers/financeiroController');
const auth = require('../middlewares/auth');
const { MODULO_FINANCEIRO } = require('../config/planos');

function requireFinanceiro(req, res, next) {
  if (!MODULO_FINANCEIRO[req.tenant.plano]) {
    return res.status(403).json({ error: 'Módulo financeiro disponível a partir do plano Pro.', upgrade: true });
  }
  next();
}

// Dashboard completo e relatórios só para Business
function requireFinanceiroCompleto(req, res, next) {
  if (MODULO_FINANCEIRO[req.tenant.plano] !== 'completo') {
    return res.status(403).json({ error: 'Recurso disponível apenas no plano Business.', upgrade: true, nivelAtual: MODULO_FINANCEIRO[req.tenant.plano] });
  }
  next();
}

router.use(auth, requireFinanceiro);

router.get('/dashboard',  requireFinanceiroCompleto, ctrl.dashboard);
router.get('/categorias', ctrl.categorias);
router.get('/',           ctrl.listar);
router.post('/',          ctrl.criar);
router.put('/:id',        ctrl.atualizar);
router.delete('/:id',     ctrl.deletar);

module.exports = router;
