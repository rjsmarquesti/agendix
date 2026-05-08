const router = require('express').Router();
const prisma = require('../lib/prisma');
const authMiddleware = require('../middlewares/auth');
const { requireRole } = require('../middlewares/auth');

router.use(authMiddleware, requireRole('super_admin'));

// GET /api/admin/logs?acao=&tenantId=&dataInicio=&dataFim=&limit=50&offset=0
router.get('/', async (req, res) => {
  try {
    const { acao, tenantId, dataInicio, dataFim, limit = 50, offset = 0 } = req.query;
    const where = {};

    if (acao) where.acao = { contains: acao, mode: 'insensitive' };
    if (tenantId) where.tenantId = parseInt(tenantId);
    if (dataInicio || dataFim) {
      where.createdAt = {};
      if (dataInicio) where.createdAt.gte = new Date(dataInicio);
      if (dataFim) {
        const fim = new Date(dataFim);
        fim.setHours(23, 59, 59, 999);
        where.createdAt.lte = fim;
      }
    }

    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: parseInt(limit),
        skip: parseInt(offset),
      }),
    ]);

    // Enriquecer com nome do tenant quando disponível
    const tenantIds = [...new Set(logs.map(l => l.tenantId).filter(Boolean))];
    const tenantsMap = {};
    if (tenantIds.length) {
      const tenants = await prisma.tenant.findMany({
        where: { id: { in: tenantIds } },
        select: { id: true, nome: true, slug: true },
      });
      tenants.forEach(t => { tenantsMap[t.id] = t; });
    }

    const enriched = logs.map(l => ({
      ...l,
      tenant: l.tenantId ? tenantsMap[l.tenantId] || null : null,
    }));

    res.json({ total, logs: enriched });
  } catch (err) {
    console.error('[adminLogs/listar]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/logs/acoes — lista de ações únicas para o filtro
router.get('/acoes', async (req, res) => {
  try {
    const acoes = await prisma.auditLog.findMany({
      select: { acao: true },
      distinct: ['acao'],
      orderBy: { acao: 'asc' },
    });
    res.json(acoes.map(a => a.acao));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
