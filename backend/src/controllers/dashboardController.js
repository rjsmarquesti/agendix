const prisma = require('../lib/prisma');
const { localDateStr } = require('../utils/dateUtils');

exports.stats = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const hoje = localDateStr();

    const [totalLeads, leadsNovos, convertidos, agendamentosHoje, leadsRecentes, agendamentosDodia] =
      await Promise.all([
        prisma.lead.count({ where: { tenantId } }),
        prisma.lead.count({ where: { tenantId, status: 'novo' } }),
        prisma.lead.count({ where: { tenantId, status: 'convertido' } }),
        prisma.agendamento.count({ where: { tenantId, data: hoje } }),
        prisma.lead.findMany({ where: { tenantId }, orderBy: { createdAt: 'desc' }, take: 5 }),
        prisma.agendamento.findMany({
          where: { tenantId, data: hoje },
          orderBy: { hora: 'asc' },
          include: { lead: { select: { nome: true, telefone: true } } },
        }),
      ]);

    res.json({
      stats: { totalLeads, leadsNovos, convertidos, agendamentosHoje },
      leadsRecentes,
      agendamentosDodia,
    });
  } catch (err) { next(err); }
};
