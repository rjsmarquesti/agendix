const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/tenantsController');
const auth = require('../middlewares/auth');
const { requireRole } = auth;

const onlySuper = [auth, requireRole('super_admin')];

const validarTenant = [
  body('nome').notEmpty().withMessage('Nome obrigatório'),
  body('slug').notEmpty().matches(/^[a-z0-9-]+$/).withMessage('Slug: use apenas letras minúsculas, números e -'),
];

router.get('/',    ...onlySuper, ctrl.listar);

// Reputação de números (Sprint 3): números com score baixo por tenant
router.get('/wa-reputacao', ...onlySuper, async (req, res) => {
  try {
    const { reputacao } = require('../services/waQueue');
    const threshold = Number(req.query.threshold || 70);
    const baixos = reputacao.numerosComBaixoScore(threshold);
    res.json({ total: baixos.length, threshold, numeros: baixos });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Score de um número específico
router.get('/wa-reputacao/:telefone', ...onlySuper, (req, res) => {
  try {
    const { reputacao } = require('../services/waQueue');
    res.json(reputacao.statsNumero(req.params.telefone));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Stats da fila WA por instância (anti-ban: sent hoje, sent hora, pendentes)
router.get('/wa-queue-stats', ...onlySuper, async (req, res) => {
  try {
    const prisma = require('../lib/prisma');
    const { statsInstancia } = require('../services/waQueue');
    const tenants = await prisma.tenant.findMany({
      where:  { evolutionInstance: { not: null } },
      select: { id: true, nome: true, evolutionInstance: true },
    });
    const stats = tenants.map(t => ({ ...statsInstancia(t.evolutionInstance), tenantId: t.id, tenantNome: t.nome }));
    res.json({ stats });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Status WA em bulk para todos os tenants com instância configurada
router.get('/wa-status', ...onlySuper, async (req, res) => {
  try {
    const prisma = require('../lib/prisma');
    const { getConnectionState } = require('../services/evolutionService');

    const tenants = await prisma.tenant.findMany({
      where: { evolutionInstance: { not: null } },
      select: { id: true, evolutionInstance: true, evolutionApiKey: true },
    });

    const results = await Promise.allSettled(
      tenants.map(t => getConnectionState(t.evolutionInstance, t.evolutionApiKey))
    );

    const statuses = {};
    tenants.forEach((t, i) => {
      const r = results[i];
      statuses[t.id] = r.status === 'fulfilled'
        ? (r.value?.instance?.state || r.value?.state || 'unknown')
        : 'error';
    });

    res.json({ statuses });
  } catch (err) {
    res.json({ statuses: {} });
  }
});

// ── WA Anti-ban — painel consolidado (super_admin) ───────────────────────────

// Visão completa de todas as instâncias: fila + circuit breaker + reputação
router.get('/wa-antiban', ...onlySuper, async (req, res) => {
  try {
    const prisma   = require('../lib/prisma');
    const { statsInstanciaCompleto } = require('../services/waQueue');
    const { statsWatchdog }          = require('../services/waWatchdogService');
    const rep                        = require('../services/waReputacao');
    const threshold = Number(req.query.threshold || 70);

    const tenants = await prisma.tenant.findMany({
      where:  { evolutionInstance: { not: null } },
      select: { id: true, nome: true, evolutionInstance: true },
    });

    const watchdog = statsWatchdog();
    const watchdogMap = {};
    watchdog.forEach(w => { watchdogMap[w.instance] = w; });

    const instancias = tenants.map(t => {
      const fila     = statsInstanciaCompleto(t.evolutionInstance, threshold) || {
        instance: t.evolutionInstance, pendentes: 0, sentThisHour: 0, sentToday: 0,
        limiteHora: 30, limiteDia: 200, processing: false, dentroJanela: false,
        numBloqueados: 0, numBaixoScore: 0, numeros: [],
      };
      const cb = watchdogMap[t.evolutionInstance] || { erros: 0, suspensa: false, suspensaAte: null, threshold: 5 };
      return { tenantId: t.id, tenantNome: t.nome, ...fila, circuitBreaker: cb };
    });

    const resumoRep = rep.resumoPorInstancia();
    res.json({ instancias, resumoReputacao: resumoRep, threshold });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Desbloquear número na reputação (manual)
router.delete('/wa-reputacao/:telefone', ...onlySuper, (req, res) => {
  try {
    const rep      = require('../services/waReputacao');
    const { instance } = req.query;
    if (!instance) return res.status(400).json({ error: 'instance é obrigatório (query param)' });
    const desbloqueou = rep.resetNumero(instance, req.params.telefone);
    res.json({ ok: true, desbloqueou });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Stats de reputação por instância (com threshold configurável)
router.get('/wa-reputacao', ...onlySuper, async (req, res) => {
  try {
    const rep = require('../services/waReputacao');
    const threshold = Number(req.query.threshold || 70);
    const { instance } = req.query;
    const numeros = instance
      ? rep.listarInstancia(instance, threshold)
      : rep.numerosComBaixoScore(threshold);
    res.json({ total: numeros.length, threshold, numeros });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Score de um número específico por instância
router.get('/wa-reputacao/:telefone', ...onlySuper, (req, res) => {
  try {
    const rep = require('../services/waReputacao');
    const { instance } = req.query;
    if (!instance) return res.status(400).json({ error: 'instance é obrigatório (query param)' });
    res.json(rep.statsNumero(instance, req.params.telefone));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Liberar circuit breaker de uma instância manualmente
router.post('/wa-watchdog/:instance/liberar', ...onlySuper, (req, res) => {
  try {
    const { liberarInstancia } = require('../services/waWatchdogService');
    const resultado = liberarInstancia(req.params.instance);
    res.json({ ok: true, ...resultado });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// Stats do circuit breaker (todas as instâncias)
router.get('/wa-watchdog', ...onlySuper, (req, res) => {
  try {
    const { statsWatchdog } = require('../services/waWatchdogService');
    res.json({ instancias: statsWatchdog() });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', ...onlySuper, ctrl.buscarPorId);
router.post('/',   ...onlySuper, validarTenant, ctrl.criar);
router.put('/:id', ...onlySuper, ctrl.atualizar);
router.delete('/:id', ...onlySuper, ctrl.deletar);

// Usuários do tenant
router.get('/:id/usuarios', ...onlySuper, async (req, res, next) => {
  try {
    const prisma = require('../lib/prisma');
    const users = await prisma.user.findMany({
      where: { tenantId: Number(req.params.id) },
      select: { id: true, nome: true, email: true, role: true, ativo: true, activationToken: true, createdAt: true },
    });
    res.json(users);
  } catch (err) { next(err); }
});
router.post('/:id/usuarios',              ...onlySuper, ctrl.criarUsuario);
router.put('/:id/usuarios/:userId/senha', ...onlySuper, ctrl.resetarSenha);

// Ativar usuário diretamente (sem email)
router.post('/:id/usuarios/:userId/ativar', ...onlySuper, async (req, res, next) => {
  try {
    const prisma = require('../lib/prisma');
    await prisma.user.update({
      where: { id: Number(req.params.userId) },
      data: { ativo: true, activationToken: null, activationExpires: null },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Evolution API — criar/recriar instância
router.post('/:id/create-evolution', ...onlySuper, ctrl.criarEvolution);

// Evolution API — reconfigurar webhook (para tenants já existentes)
router.post('/:id/reconfigure-webhook', ...onlySuper, ctrl.reconfigurarWebhook);

// WhatsApp — status, QR code e disconnect (super-admin por tenant ID)
router.get('/:id/whatsapp/status', ...onlySuper, async (req, res, next) => {
  try {
    const prisma = require('../lib/prisma');
    const { getConnectionState } = require('../services/evolutionService');
    const tenant = await prisma.tenant.findUnique({ where: { id: Number(req.params.id) } });
    if (!tenant?.evolutionInstance) return res.json({ status: 'not_configured' });
    const result = await getConnectionState(tenant.evolutionInstance, tenant.evolutionApiKey);
    res.json({ status: result?.instance?.state || result?.state || 'unknown' });
  } catch (err) { res.json({ status: 'error', message: err.message }); }
});

router.get('/:id/whatsapp/qrcode', ...onlySuper, async (req, res, next) => {
  try {
    const prisma = require('../lib/prisma');
    const { getQRCode } = require('../services/evolutionService');
    const tenant = await prisma.tenant.findUnique({ where: { id: Number(req.params.id) } });
    if (!tenant?.evolutionInstance) return res.status(400).json({ error: 'Instância não configurada' });
    const result = await getQRCode(tenant.evolutionInstance, tenant.evolutionApiKey);
    res.json({ qrcode: result?.base64 || result?.qrcode?.base64 || null });
  } catch (err) { next(err); }
});

router.post('/:id/whatsapp/disconnect', ...onlySuper, async (req, res, next) => {
  try {
    const prisma = require('../lib/prisma');
    const { logoutInstance } = require('../services/evolutionService');
    const tenant = await prisma.tenant.findUnique({ where: { id: Number(req.params.id) } });
    if (!tenant?.evolutionInstance) return res.status(400).json({ error: 'Instância não configurada' });
    await logoutInstance(tenant.evolutionInstance, tenant.evolutionApiKey);
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// Provisioning n8n
router.use('/:id/provision-n8n', require('./provisioning'));

// Liberação manual de plano pelo super admin (sem passar pelo Mercado Pago)
router.patch('/:id/liberar-plano', ...onlySuper, async (req, res, next) => {
  try {
    const prisma = require('../lib/prisma');
    const audit = require('../lib/audit');

    const tenantId = Number(req.params.id);
    const { plano, planoStatus, planoVencimento } = req.body;

    const planosValidos  = ['solo', 'pro', 'business'];
    const statusValidos  = ['trial', 'ativo', 'inadimplente', 'cancelado'];

    if (!planosValidos.includes(plano))
      return res.status(400).json({ error: `Plano inválido. Use: ${planosValidos.join(', ')}` });
    if (!statusValidos.includes(planoStatus))
      return res.status(400).json({ error: `Status inválido. Use: ${statusValidos.join(', ')}` });

    // Calcula módulos conforme o plano (mesma lógica de modulosPorPlano do controller)
    const modulosBase = ['leads', 'agendamentos'];
    if (['pro', 'business'].includes(plano))  modulosBase.push('financeiro');
    if (['pro', 'business'].includes(plano))  modulosBase.push('wa_atendimento', 'agente_ia');
    if (plano === 'business')                 modulosBase.push('fichas', 'anamnese', 'prontuarios', 'orcamentos', 'documentos');

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        plano,
        planoStatus,
        planoVencimento: planoVencimento ? new Date(planoVencimento) : null,
        modulos: modulosBase,
        planoDowngradePendente: null,
        planoDowngradeData:     null,
      },
    });

    await audit.log('admin_liberar_plano', {
      tenantId,
      userId: req.user.id,
      entidade: 'tenant',
      entidadeId: tenantId,
      detalhes: { plano, planoStatus, planoVencimento: planoVencimento || null },
    });

    res.json({ ok: true, tenant });
  } catch (err) { next(err); }
});

// Diagnóstico + correção de tenants com trial expirado
router.post('/fix-trial-expirado', ...onlySuper, async (req, res, next) => {
  try {
    const prisma = require('../lib/prisma');
    const agora = new Date();
    const afetados = await prisma.tenant.findMany({
      where: { planoStatus: 'trial', planoVencimento: { lt: agora } },
      select: { id: true, slug: true, nome: true, plano: true, planoVencimento: true },
    });

    if (req.body.fix) {
      for (const t of afetados) {
        await prisma.tenant.update({
          where: { id: t.id },
          data: {
            planoStatus: 'ativo',
            planoVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
      }
    }

    res.json({ total: afetados.length, fix: !!req.body.fix, afetados });
  } catch (err) { next(err); }
});

module.exports = router;
