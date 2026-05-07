const crypto = require('crypto');
const prisma = require('../lib/prisma');

exports.get = async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenantId } });
    if (!tenant) return res.status(404).json({ error: 'Empresa não encontrada' });
    res.json({ tenant });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { nome, logo, corPrimaria, modulos, n8nWebhookUrl, n8nApiKey, nichoLabel,
            evolutionInstance, evolutionApiKey, evolutionBaseUrl,
            lembretesDiretosAtivo } = req.body;
    const tenant = await prisma.tenant.update({
      where: { id: req.user.tenantId },
      data: {
        nome, logo, corPrimaria, modulos,
        n8nWebhookUrl: n8nWebhookUrl || null, n8nApiKey: n8nApiKey || null,
        nichoLabel: nichoLabel || null,
        evolutionInstance: evolutionInstance || null,
        evolutionApiKey: evolutionApiKey || null,
        evolutionBaseUrl: evolutionBaseUrl || null,
        lembretesDiretosAtivo: lembretesDiretosAtivo === true,
      },
    });
    res.json({ tenant });
  } catch (err) { next(err); }
};

// GET configuração de agenda do tenant
exports.getAgenda = async (req, res, next) => {
  try {
    let config = await prisma.configuracaoAgenda.findUnique({ where: { tenantId: req.user.tenantId } });
    if (!config) {
      config = await prisma.configuracaoAgenda.create({ data: { tenantId: req.user.tenantId } });
    }
    res.json({ config });
  } catch (err) { next(err); }
};

// PUT configuração de agenda do tenant
exports.updateAgenda = async (req, res, next) => {
  try {
    const { horarioInicio, horarioFim, duracaoSlot, diasUteis, antecedenciaMin, antecedenciaMax, mensagemConfirmacao, mensagemWaConfirmacao, mensagemWaLembrete, mensagemWaAdmin, whatsappAdmin, ativo } = req.body;
    const msgFields = {
      mensagemConfirmacao: mensagemConfirmacao || null,
      mensagemWaConfirmacao: mensagemWaConfirmacao || null,
      mensagemWaLembrete: mensagemWaLembrete || null,
      mensagemWaAdmin: mensagemWaAdmin || null,
    };
    const config = await prisma.configuracaoAgenda.upsert({
      where: { tenantId: req.user.tenantId },
      update: { horarioInicio, horarioFim, duracaoSlot: Number(duracaoSlot), diasUteis, antecedenciaMin: Number(antecedenciaMin), antecedenciaMax: Number(antecedenciaMax), ...msgFields, whatsappAdmin: whatsappAdmin || null, ativo: ativo !== false },
      create: { tenantId: req.user.tenantId, horarioInicio, horarioFim, duracaoSlot: Number(duracaoSlot), diasUteis, antecedenciaMin: Number(antecedenciaMin), antecedenciaMax: Number(antecedenciaMax), ...msgFields, whatsappAdmin: whatsappAdmin || null },
    });
    res.json({ config });
  } catch (err) { next(err); }
};

// Gera ou regenera o API token do tenant (para n8n chamar o CRM)
exports.gerarApiToken = async (req, res, next) => {
  try {
    const apiToken = crypto.randomBytes(32).toString('hex');
    const tenant = await prisma.tenant.update({
      where: { id: req.user.tenantId },
      data: { apiToken },
    });
    res.json({ apiToken: tenant.apiToken });
  } catch (err) { next(err); }
};
