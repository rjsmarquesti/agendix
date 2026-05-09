const prisma = require('../lib/prisma');
const { localDateStr } = require('../utils/dateUtils');
const { getConnectionState } = require('../services/evolutionService');

exports.onboarding = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const tenant = req.tenant;

    const [servicosCount, config] = await Promise.all([
      prisma.servico.count({ where: { tenantId } }),
      prisma.configuracaoAgenda.findFirst({ where: { tenantId } }),
    ]);

    const temServicos = servicosCount > 0;
    const temHorarios = !!(config?.horaInicio && config?.horaFim);

    let whatsappConectado = false;
    if (tenant.evolutionInstance) {
      try {
        const result = await getConnectionState(tenant.evolutionInstance, tenant.evolutionApiKey);
        const state = result?.instance?.state || result?.state || '';
        whatsappConectado = state === 'open';
      } catch (_) {}
    }

    const linkPublico = `${process.env.APP_URL}/agendar/${tenant.slug}`;

    res.json({
      passos: [
        { id: 'servicos', label: 'Cadastre seus serviços', descricao: 'Adicione os serviços que você oferece.', link: '/servicos', concluido: temServicos },
        { id: 'horarios', label: 'Configure sua agenda', descricao: 'Defina seus horários de atendimento.', link: '/configuracoes', concluido: temHorarios },
        { id: 'whatsapp', label: 'Conecte o WhatsApp', descricao: 'Ative o bot de agendamento automático.', link: '/configuracoes', concluido: whatsappConectado },
        { id: 'link', label: 'Compartilhe seu link', descricao: 'Envie para seus clientes começarem a agendar.', link: linkPublico, externo: true, concluido: false },
      ],
      linkPublico,
    });
  } catch (err) { next(err); }
};

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
