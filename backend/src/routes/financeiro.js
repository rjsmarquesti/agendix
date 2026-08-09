const router = require('express').Router();
const ctrl = require('../controllers/financeiroController');
const auth = require('../middlewares/auth');
const { MODULO_FINANCEIRO } = require('../config/planos');
const { checkPermission } = require('../lib/permissions');

function requireFinanceiro(req, res, next) {
  if (!MODULO_FINANCEIRO[req.tenant.plano]) {
    return res.status(403).json({ error: 'Módulo financeiro disponível a partir do plano Pro.', upgrade: true });
  }
  next();
}

function requireFinanceiroCompleto(req, res, next) {
  if (MODULO_FINANCEIRO[req.tenant.plano] !== 'completo') {
    return res.status(403).json({ error: 'Recurso disponível apenas no plano Business.', upgrade: true, nivelAtual: MODULO_FINANCEIRO[req.tenant.plano] });
  }
  next();
}

router.use(auth, requireFinanceiro);

router.get('/dashboard',   requireFinanceiroCompleto, checkPermission('financeiro', 'view'),   ctrl.dashboard);
router.get('/fluxo-caixa', requireFinanceiroCompleto, checkPermission('financeiro', 'view'),   ctrl.fluxoCaixa);
router.get('/relatorio',   requireFinanceiroCompleto, checkPermission('financeiro', 'view'),   ctrl.relatorio);
router.get('/categorias',  checkPermission('financeiro', 'view'),   ctrl.categorias);
router.get('/',            checkPermission('financeiro', 'view'),   ctrl.listar);
router.post('/',           checkPermission('financeiro', 'create'), ctrl.criar);
router.put('/:id',         checkPermission('financeiro', 'edit'),   ctrl.atualizar);
router.delete('/:id',      checkPermission('financeiro', 'edit'),   ctrl.deletar);

module.exports = router;
