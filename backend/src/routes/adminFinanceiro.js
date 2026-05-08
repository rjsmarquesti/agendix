const router = require('express').Router();
const prisma = require('../lib/prisma');
const authMiddleware = require('../middlewares/auth');
const { requireRole } = require('../middlewares/auth');

const PRECO_PLANO = { basico: 37, pro: 57, premium: 97, business: 127 };

router.use(authMiddleware, requireRole('super_admin'));

// GET /api/admin/financeiro/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const hoje = new Date();
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

    const [tenants, receitaMes, despesaMes] = await Promise.all([
      prisma.tenant.findMany({
        select: { plano: true, planoStatus: true, planoVencimento: true },
      }),
      prisma.adminLancamento.aggregate({
        where: { tipo: 'receita', data: { startsWith: mesAtual } },
        _sum: { valor: true },
      }),
      prisma.adminLancamento.aggregate({
        where: { tipo: 'despesa', data: { startsWith: mesAtual } },
        _sum: { valor: true },
      }),
    ]);

    const ativos = tenants.filter(t => t.planoStatus === 'ativo');
    const mrr = ativos.reduce((acc, t) => acc + (PRECO_PLANO[t.plano] || 0), 0);

    const porStatus = tenants.reduce((acc, t) => {
      acc[t.planoStatus] = (acc[t.planoStatus] || 0) + 1;
      return acc;
    }, {});

    const receita = Number(receitaMes._sum.valor || 0);
    const despesa = Number(despesaMes._sum.valor || 0);

    res.json({
      mrr,
      receitaMes: receita,
      despesaMes: despesa,
      saldoMes: receita - despesa,
      totalTenants: tenants.length,
      ativos: porStatus.ativo || 0,
      trials: porStatus.trial || 0,
      inadimplentes: porStatus.inadimplente || 0,
      inativos: porStatus.inativo || 0,
      cancelados: porStatus.cancelado || 0,
    });
  } catch (err) {
    console.error('[adminFinanceiro/dashboard]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/financeiro/fluxo-caixa
router.get('/fluxo-caixa', async (req, res) => {
  try {
    const meses = [];
    const hoje = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const lancamentos = await prisma.adminLancamento.findMany({
      where: { data: { gte: meses[0] } },
      select: { tipo: true, valor: true, data: true, status: true },
    });

    let saldoAcumulado = 0;
    const resultado = meses.map(mes => {
      const doMes = lancamentos.filter(l => l.data.startsWith(mes));
      const receita = doMes
        .filter(l => l.tipo === 'receita' && l.status !== 'cancelado')
        .reduce((s, l) => s + Number(l.valor), 0);
      const despesa = doMes
        .filter(l => l.tipo === 'despesa' && l.status !== 'cancelado')
        .reduce((s, l) => s + Number(l.valor), 0);
      saldoAcumulado += receita - despesa;
      return { mes, receita, despesa, saldo: receita - despesa, saldoAcumulado };
    });

    res.json(resultado);
  } catch (err) {
    console.error('[adminFinanceiro/fluxo-caixa]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/financeiro/pagamentos — assinaturas dos tenants
router.get('/pagamentos', async (req, res) => {
  try {
    const tenants = await prisma.tenant.findMany({
      select: {
        id: true, nome: true, slug: true, plano: true,
        planoStatus: true, planoVencimento: true,
        mpSubscriptionId: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const resultado = tenants.map(t => ({
      ...t,
      valorPlano: PRECO_PLANO[t.plano] || 0,
    }));

    res.json(resultado);
  } catch (err) {
    console.error('[adminFinanceiro/pagamentos]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/financeiro — listar lançamentos com filtros
router.get('/', async (req, res) => {
  try {
    const { tipo, status, categoria, mes, tenantId } = req.query;
    const where = {};
    if (tipo) where.tipo = tipo;
    if (status) where.status = status;
    if (categoria) where.categoria = categoria;
    if (mes) where.data = { startsWith: mes };
    if (tenantId) where.tenantId = parseInt(tenantId);

    const lancamentos = await prisma.adminLancamento.findMany({
      where,
      include: { tenant: { select: { id: true, nome: true, slug: true } } },
      orderBy: { data: 'desc' },
    });

    res.json(lancamentos);
  } catch (err) {
    console.error('[adminFinanceiro/listar]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/financeiro — criar lançamento
router.post('/', async (req, res) => {
  try {
    const { tipo, descricao, valor, data, categoria, status, tenantId, referencia, observacoes } = req.body;
    if (!tipo || !descricao || !valor || !data) {
      return res.status(400).json({ error: 'tipo, descricao, valor e data são obrigatórios' });
    }

    const lancamento = await prisma.adminLancamento.create({
      data: {
        tipo,
        descricao,
        valor: parseFloat(valor),
        data,
        categoria: categoria || null,
        status: status || 'pago',
        tenantId: tenantId ? parseInt(tenantId) : null,
        referencia: referencia || null,
        observacoes: observacoes || null,
      },
      include: { tenant: { select: { id: true, nome: true, slug: true } } },
    });

    res.status(201).json(lancamento);
  } catch (err) {
    console.error('[adminFinanceiro/criar]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/admin/financeiro/:id — editar lançamento
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { tipo, descricao, valor, data, categoria, status, tenantId, referencia, observacoes } = req.body;

    const lancamento = await prisma.adminLancamento.update({
      where: { id },
      data: {
        ...(tipo && { tipo }),
        ...(descricao && { descricao }),
        ...(valor !== undefined && { valor: parseFloat(valor) }),
        ...(data && { data }),
        ...(categoria !== undefined && { categoria }),
        ...(status && { status }),
        ...(tenantId !== undefined && { tenantId: tenantId ? parseInt(tenantId) : null }),
        ...(referencia !== undefined && { referencia }),
        ...(observacoes !== undefined && { observacoes }),
      },
      include: { tenant: { select: { id: true, nome: true, slug: true } } },
    });

    res.json(lancamento);
  } catch (err) {
    console.error('[adminFinanceiro/editar]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/financeiro/:id — excluir lançamento
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.adminLancamento.delete({ where: { id } });
    res.json({ ok: true });
  } catch (err) {
    console.error('[adminFinanceiro/deletar]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
