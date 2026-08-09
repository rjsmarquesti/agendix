const prisma = require('../lib/prisma');

exports.listar = async (req, res, next) => {
  try {
    const { tipo, status, categoria, dataInicio, dataFim, page = 1, limit = 50 } = req.query;
    const where = { tenantId: req.tenant.id };

    if (tipo)      where.tipo = tipo;
    if (status)    where.status = status;
    if (categoria) where.categoria = categoria;
    if (dataInicio && dataFim && dataInicio > dataFim) {
      return res.status(400).json({ error: '"dataInicio" não pode ser maior que "dataFim"' });
    }
    if (dataInicio || dataFim) {
      where.data = {};
      if (dataInicio) where.data.gte = dataInicio;
      if (dataFim)    where.data.lte = dataFim;
    }

    const [lancamentos, total] = await Promise.all([
      prisma.lancamentoFinanceiro.findMany({
        where,
        orderBy: [{ data: 'desc' }, { createdAt: 'desc' }],
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        include: {
          lead:    { select: { id: true, nome: true, telefone: true } },
          servico: { select: { id: true, nome: true } },
        },
      }),
      prisma.lancamentoFinanceiro.count({ where }),
    ]);

    res.json({ lancamentos, total, page: Number(page), limit: Number(limit) });
  } catch (err) { next(err); }
};

exports.dashboard = async (req, res, next) => {
  try {
    const hoje = new Date();
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    const mesAnterior = (() => {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    })();

    const { periodo = mesAtual } = req.query;
    const [ano, mes] = periodo.split('-');
    const dataInicio = `${ano}-${mes}-01`;
    const dataFim = `${ano}-${mes}-31`;

    const where = { tenantId: req.tenant.id, data: { gte: dataInicio, lte: dataFim } };

    const [receitas, despesas, pendentes7d] = await Promise.all([
      prisma.lancamentoFinanceiro.aggregate({
        where: { ...where, tipo: 'receita', status: 'pago' },
        _sum: { valor: true },
        _count: true,
      }),
      prisma.lancamentoFinanceiro.aggregate({
        where: { ...where, tipo: 'despesa', status: 'pago' },
        _sum: { valor: true },
      }),
      prisma.lancamentoFinanceiro.findMany({
        where: {
          tenantId: req.tenant.id,
          status: 'pendente',
          tipo: 'despesa',
          data: {
            gte: hoje.toISOString().split('T')[0],
            lte: (() => {
              const d = new Date(hoje); d.setDate(d.getDate() + 7);
              return d.toISOString().split('T')[0];
            })(),
          },
        },
        orderBy: { data: 'asc' },
        take: 10,
      }),
    ]);

    const totalReceita = Number(receitas._sum.valor || 0);
    const totalDespesa = Number(despesas._sum.valor || 0);
    const saldo = totalReceita - totalDespesa;
    const ticketMedio = receitas._count > 0 ? totalReceita / receitas._count : 0;

    res.json({
      periodo,
      totalReceita,
      totalDespesa,
      saldo,
      ticketMedio,
      qtdReceitas: receitas._count,
      pendentes7d,
    });
  } catch (err) { next(err); }
};

exports.categorias = async (req, res, next) => {
  try {
    const rows = await prisma.lancamentoFinanceiro.findMany({
      where: { tenantId: req.tenant.id, categoria: { not: null } },
      select: { categoria: true, tipo: true },
      distinct: ['categoria', 'tipo'],
      orderBy: { categoria: 'asc' },
    });
    res.json({ categorias: rows });
  } catch (err) { next(err); }
};

exports.criar = async (req, res, next) => {
  try {
    const { tipo, descricao, valor, data, categoria, status, leadId, servicoId, observacoes } = req.body;
    const lancamento = await prisma.lancamentoFinanceiro.create({
      data: {
        tenantId: req.tenant.id,
        tipo,
        descricao,
        valor: Number(valor),
        data,
        categoria: categoria || null,
        status: status || 'pendente',
        leadId: leadId ? Number(leadId) : null,
        servicoId: servicoId ? Number(servicoId) : null,
        observacoes: observacoes || null,
      },
      include: {
        lead:    { select: { id: true, nome: true } },
        servico: { select: { id: true, nome: true } },
      },
    });
    res.status(201).json({ lancamento });
  } catch (err) { next(err); }
};

exports.atualizar = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const existe = await prisma.lancamentoFinanceiro.findFirst({ where: { id, tenantId: req.tenant.id } });
    if (!existe) return res.status(404).json({ error: 'Lançamento não encontrado' });

    const { tipo, descricao, valor, data, categoria, status, leadId, servicoId, observacoes } = req.body;
    const lancamento = await prisma.lancamentoFinanceiro.update({
      where: { id },
      data: {
        tipo, descricao,
        valor: valor != null ? Number(valor) : undefined,
        data, categoria,
        status,
        leadId: leadId ? Number(leadId) : null,
        servicoId: servicoId ? Number(servicoId) : null,
        observacoes,
      },
      include: {
        lead:    { select: { id: true, nome: true } },
        servico: { select: { id: true, nome: true } },
      },
    });
    res.json({ lancamento });
  } catch (err) { next(err); }
};

exports.deletar = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const result = await prisma.lancamentoFinanceiro.deleteMany({ where: { id, tenantId: req.tenant.id } });
    if (result.count === 0) return res.status(404).json({ error: 'Lançamento não encontrado' });
    res.json({ message: 'Lançamento removido' });
  } catch (err) { next(err); }
};

exports.fluxoCaixa = async (req, res, next) => {
  try {
    const meses = [];
    const hoje = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      meses.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const rows = await prisma.lancamentoFinanceiro.findMany({
      where: {
        tenantId: req.tenant.id,
        status: { not: 'cancelado' },
        data: { gte: `${meses[0]}-01`, lte: `${meses[11]}-31` },
      },
      select: { tipo: true, valor: true, data: true },
    });

    let saldoAcumulado = 0;
    const dados = meses.map(mes => {
      const do_mes = rows.filter(r => r.data.startsWith(mes));
      const receita = do_mes.filter(r => r.tipo === 'receita').reduce((s, r) => s + Number(r.valor), 0);
      const despesa = do_mes.filter(r => r.tipo === 'despesa').reduce((s, r) => s + Number(r.valor), 0);
      const saldo = receita - despesa;
      saldoAcumulado += saldo;
      return { mes, receita, despesa, saldo, saldoAcumulado };
    });

    res.json(dados);
  } catch (err) { next(err); }
};

exports.relatorio = async (req, res, next) => {
  try {
    const { de, ate } = req.query;
    const baseWhere = { tenantId: req.tenant.id, status: { not: 'cancelado' } };
    if (de || ate) {
      baseWhere.data = {};
      if (de)  baseWhere.data.gte = de;
      if (ate) baseWhere.data.lte = ate;
    }

    const [receitas, despesas] = await Promise.all([
      prisma.lancamentoFinanceiro.findMany({
        where: { ...baseWhere, tipo: 'receita' },
        select: {
          id: true, data: true, descricao: true, valor: true, categoria: true, status: true,
          lead:    { select: { nome: true } },
          servico: { select: { nome: true } },
        },
        orderBy: { data: 'asc' },
      }),
      prisma.lancamentoFinanceiro.findMany({
        where: { ...baseWhere, tipo: 'despesa' },
        select: {
          id: true, data: true, descricao: true, valor: true, categoria: true, status: true,
        },
        orderBy: { data: 'asc' },
      }),
    ]);

    const porServico = {};
    receitas.forEach(r => {
      const key = r.servico?.nome || '(sem serviço)';
      porServico[key] = (porServico[key] || 0) + Number(r.valor);
    });

    const porCategoria = {};
    receitas.forEach(r => {
      const key = r.categoria || '(sem categoria)';
      porCategoria[key] = (porCategoria[key] || 0) + Number(r.valor);
    });

    const toArray = obj =>
      Object.entries(obj)
        .map(([nome, total]) => ({ nome, total }))
        .sort((a, b) => b.total - a.total);

    const totalReceita = receitas.reduce((s, r) => s + Number(r.valor), 0);
    const totalDespesa = despesas.reduce((s, r) => s + Number(r.valor), 0);

    res.json({
      porServico: toArray(porServico),
      porCategoria: toArray(porCategoria),
      totalReceita,
      totalDespesa,
      saldo: totalReceita - totalDespesa,
      qtdReceitas: receitas.length,
      qtdDespesas: despesas.length,
      lancamentos: [...receitas.map(r => ({ ...r, tipo: 'receita' })), ...despesas.map(r => ({ ...r, tipo: 'despesa' }))].sort((a, b) => a.data.localeCompare(b.data)),
      de: de || null,
      ate: ate || null,
    });
  } catch (err) { next(err); }
};
