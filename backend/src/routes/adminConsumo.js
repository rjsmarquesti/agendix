const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middlewares/auth');
const { requireRole } = require('../middlewares/auth');

const PLANOS = require('../config/planos');
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'logos');

router.use(authMiddleware, requireRole('super_admin'));

function logoBytes(logoUrl) {
  if (!logoUrl) return 0;
  try {
    const filename = logoUrl.split('/').pop();
    const filePath = path.join(UPLOAD_DIR, filename);
    if (fs.existsSync(filePath)) return fs.statSync(filePath).size;
  } catch (_) {}
  return 0;
}

function pct(usado, limite) {
  if (limite === Infinity || limite === null) return null;
  return Math.min(100, Math.round((usado / limite) * 100));
}

async function consumoTenant(tenant) {
  const tenantId = tenant.id;
  const [leads, agendamentos, usuarios, servicos, conversas, lancamentos] = await Promise.all([
    prisma.lead.count({ where: { tenantId } }),
    prisma.agendamento.count({ where: { tenantId } }),
    prisma.user.count({ where: { tenantId } }),
    prisma.servico.count({ where: { tenantId } }),
    prisma.conversaWhatsapp.count({ where: { tenantId } }),
    prisma.lancamentoFinanceiro.count({ where: { tenantId } }),
  ]);

  const logoKB = Math.round(logoBytes(tenant.logo) / 1024);

  const limiteAgend = PLANOS.LIMITE_AGENDAMENTOS[tenant.plano] ?? Infinity;
  const limiteUsers = PLANOS.LIMITE_USUARIOS[tenant.plano] ?? Infinity;

  return {
    id: tenant.id,
    nome: tenant.nome,
    slug: tenant.slug,
    plano: tenant.plano,
    planoStatus: tenant.planoStatus,
    logo: tenant.logo,
    corPrimaria: tenant.corPrimaria,
    leads,
    agendamentos,
    usuarios,
    servicos,
    conversas,
    lancamentos,
    logoKB,
    limites: {
      agendamentos: limiteAgend === Infinity ? null : limiteAgend,
      usuarios: limiteUsers === Infinity ? null : limiteUsers,
    },
    pct: {
      agendamentos: pct(agendamentos, limiteAgend),
      usuarios: pct(usuarios, limiteUsers),
    },
  };
}

// GET /api/admin/consumo — consumo de todos os tenants
router.get('/', async (req, res) => {
  try {
    const tenants = await prisma.tenant.findMany({
      orderBy: { nome: 'asc' },
      select: { id: true, nome: true, slug: true, plano: true, planoStatus: true, logo: true, corPrimaria: true },
    });

    const resultado = await Promise.all(tenants.map(t => consumoTenant(t)));
    res.json(resultado);
  } catch (err) {
    console.error('[adminConsumo/listar]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/consumo/:id — consumo detalhado de um tenant
router.get('/:id', async (req, res) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: parseInt(req.params.id) },
      select: { id: true, nome: true, slug: true, plano: true, planoStatus: true, logo: true, corPrimaria: true },
    });
    if (!tenant) return res.status(404).json({ error: 'Tenant não encontrado' });

    const resultado = await consumoTenant(tenant);
    res.json(resultado);
  } catch (err) {
    console.error('[adminConsumo/detalhe]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
