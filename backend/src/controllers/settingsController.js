const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { encrypt, decrypt, decryptTenant, normalizarModulos } = require('../lib/encrypt');
const { modulosPorNicho, UNIVERSAIS } = require('../config/nichos');

exports.get = async (req, res, next) => {
  try {
    const raw = await prisma.tenant.findUnique({ where: { id: req.user.tenantId } });
    if (!raw) return res.status(404).json({ error: 'Empresa não encontrada' });
    // Descriptografa campos sensíveis antes de enviar ao frontend
    res.json({ tenant: decryptTenant(raw) });
  } catch (err) { next(err); }
};

exports.update = async (req, res, next) => {
  try {
    const { nome, logo, corPrimaria, modulos, nicho, subnicho, n8nWebhookUrl, n8nApiKey, nichoLabel,
            evolutionInstance, evolutionApiKey, evolutionBaseUrl,
            waProvider, waConfig,
            lembretesDiretosAtivo,
            smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom,
            telefone } = req.body;

    let modulosFinais = modulos;
    let nichoLabelFinal = nichoLabel;

    if (nicho !== undefined) {
      nichoLabelFinal = nicho;
      const tenantAtual = await prisma.tenant.findUnique({ where: { id: req.user.tenantId }, select: { modulos: true } });
      // modulos pode ser array (JSONB array) ou string (legado) — normaliza para array
      const rawMods = tenantAtual?.modulos;
      const atual = normalizarModulos(rawMods);
      const base = modulosPorNicho(nicho);
      const naoUniversaisAtuais = atual.filter(m => !UNIVERSAIS.includes(m));
      // Mantém módulos que já existiam e não são do mapeamento de nicho (ex: financeiro)
      const todosNichosExtras = Object.values(require('../config/nichos').NICHOS).flatMap(n => n.modulosExtras);
      const preservados = naoUniversaisAtuais.filter(m => !todosNichosExtras.includes(m));
      // Armazena como array (não como string JSON) para compatibilidade com o campo Json do Prisma
      modulosFinais = [...new Set([...base, ...preservados])];
    }

    const raw = await prisma.tenant.update({
      where: { id: req.user.tenantId },
      data: {
        nome, logo, corPrimaria, modulos: modulosFinais,
        n8nWebhookUrl: n8nWebhookUrl || null,
        // Criptografa campos sensíveis antes de persistir
        n8nApiKey:        n8nApiKey       ? encrypt(n8nApiKey)       : null,
        nichoLabel: nichoLabelFinal || null,
        subnicho: subnicho !== undefined ? (subnicho || null) : undefined,
        evolutionInstance: evolutionInstance || null,
        evolutionApiKey:  evolutionApiKey  ? encrypt(evolutionApiKey)  : null,
        evolutionBaseUrl: evolutionBaseUrl || null,
        waProvider: waProvider || 'evolution',
        // waConfig: só sobrescreve se vier com dados reais — objeto vazio não apaga credenciais anteriores
        ...(waConfig && typeof waConfig === 'object' && Object.keys(waConfig).length > 0
          ? { waConfig: encrypt(JSON.stringify(waConfig)) }
          : {}),
        lembretesDiretosAtivo: lembretesDiretosAtivo === true,
        smtpHost: smtpHost || null,
        smtpPort: smtpPort ? Number(smtpPort) : null,
        smtpUser: smtpUser || null,
        smtpPass:         smtpPass        ? encrypt(smtpPass)        : null,
        smtpFrom: smtpFrom || null,
        telefone: telefone || null,
      },
    });
    // Retorna com valores descriptografados para o frontend atualizar o form
    res.json({ tenant: decryptTenant(raw) });
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
    const { horarioInicio, horarioFim, duracaoSlot, diasUteis, antecedenciaMin, antecedenciaMax, mensagemConfirmacao, mensagemWaConfirmacao, mensagemWaLembrete, mensagemWaAdmin, whatsappAdmin, ativo,
            agendaDiaAtivo, agendaDiaEmailAtivo, agendaDiaHorario } = req.body;
    const msgFields = {
      mensagemConfirmacao: mensagemConfirmacao || null,
      mensagemWaConfirmacao: mensagemWaConfirmacao || null,
      mensagemWaLembrete: mensagemWaLembrete || null,
      mensagemWaAdmin: mensagemWaAdmin || null,
    };
    const agendaDiaFields = {
      agendaDiaAtivo: agendaDiaAtivo === true,
      agendaDiaEmailAtivo: agendaDiaEmailAtivo === true,
      agendaDiaHorario: agendaDiaHorario || '07:00',
    };
    const config = await prisma.configuracaoAgenda.upsert({
      where: { tenantId: req.user.tenantId },
      update: { horarioInicio, horarioFim, duracaoSlot: Number(duracaoSlot), diasUteis, antecedenciaMin: Number(antecedenciaMin), antecedenciaMax: Number(antecedenciaMax), ...msgFields, whatsappAdmin: whatsappAdmin || null, ativo: ativo !== false, ...agendaDiaFields },
      create: { tenantId: req.user.tenantId, horarioInicio, horarioFim, duracaoSlot: Number(duracaoSlot), diasUteis, antecedenciaMin: Number(antecedenciaMin), antecedenciaMax: Number(antecedenciaMax), ...msgFields, whatsappAdmin: whatsappAdmin || null, ...agendaDiaFields },
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
