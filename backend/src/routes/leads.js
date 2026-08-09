const router = require('express').Router();
const { body } = require('express-validator');
const multer = require('multer');
const ctrl = require('../controllers/leadsController');
const auth = require('../middlewares/auth');
const { checkPermission } = require('../lib/permissions');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const ok = /\.(xlsx|xls|csv)$/i.test(file.originalname);
    cb(ok ? null : new Error('Formato inválido. Use .xlsx, .xls ou .csv'), ok);
  },
});

const validar = [body('nome').notEmpty().withMessage('Nome obrigatório')];

// Rotas estáticas primeiro (antes de /:id)
router.get('/nichos',             auth, checkPermission('leads', 'view'),   ctrl.nichos);
router.get('/stats',              auth, checkPermission('leads', 'view'),   ctrl.stats);
router.get('/exportar',           auth, checkPermission('leads', 'view'),   ctrl.exportar);
router.post('/importar',          auth, checkPermission('leads', 'create'), ctrl.importar);
router.post('/importar-arquivo',  auth, checkPermission('leads', 'create'), upload.single('arquivo'), ctrl.importarArquivo);
router.delete('/bulk',            auth, checkPermission('leads', 'delete'), ctrl.deletarEmMassa);

router.get('/',    auth, checkPermission('leads', 'view'),   ctrl.listar);
router.get('/:id',          auth, checkPermission('leads', 'view'),   ctrl.buscarPorId);
router.post('/',            auth, checkPermission('leads', 'create'), validar, ctrl.criar);
router.put('/:id',          auth, checkPermission('leads', 'edit'),   validar, ctrl.atualizar);
router.post('/:id/converter', auth, checkPermission('leads', 'edit'), ctrl.converterEmCliente);
router.patch('/:id/cliente-status', auth, checkPermission('leads', 'edit'), ctrl.atualizarClienteStatus);
router.delete('/:id',       auth, checkPermission('leads', 'delete'), ctrl.deletar);

module.exports = router;
