const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { normalizarModulos } = require('../lib/encrypt');
const { provisionarWorkflows, removerWorkflows, desativarWorkflows, ativarWorkflows } = require('../services/n8nProvisioningService');
const { createInstance, deleteInstance, setWebhook } = require('../services/evolutionService');
const audit = require('../lib/audit');

exports.listar = async (req, res, next) => {
  try {
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { users: true, leads: true } },
        users: { where: { role: 'admin' }, select: { email: true, whatsapp: true }, take: 1 },
      },
    });
    // Preenche email/telefone do tenant a partir do usuário admin se não preenchidos diretamente
    const result = tenants.map(t => ({
      ...t,
      email:    t.email    || t.users?.[0]?.email    || null,
      telefone: t.telefone || t.users?.[0]?.whatsapp || null,
    }));
    res.json({ tenants: result });
  } catch (err) { next(err); }
};

exports.buscarPorId = async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: Number(req.params.id) },
      include: {
        _count: { select: { users: true, leads: true, agendamentos: true } },
        users: { select: { id: true, nome: true, email: true, role: true, ativo: true } },
      },
    });
    if (!tenant) return res.status(404).json({ error: 'Empresa não encontrada' });
    res.json({ tenant });
  } catch (err) { next(err); }
};

// Módulos adicionais liberados por padrão conforme plano
function modulosPorPlano(plano) {
  const base = [];
  if (['pro', 'business'].includes(plano))          base.push('financeiro');
  if (['pro', 'business', 'trial'].includes(plano)) base.push('wa_atendimento', 'agente_ia');
  return base;
}

exports.criar = async (req, res, next) => {
  try {
    const { nome, slug, logo, corPrimaria, plano, modulos } = req.body;
    const planoFinal = plano || 'solo';
    const modulosBase = modulos || ['leads', 'agendamentos'];
    // Adiciona módulos extras do plano que ainda não estejam na lista
    const extras = modulosPorPlano(planoFinal).filter(m => !modulosBase.includes(m));
    const tenant = await prisma.tenant.create({
      data: {
        nome, slug,
        logo: logo || null,
        corPrimaria: corPrimaria || '#2563eb',
        plano: planoFinal,
        modulos: [...modulosBase, ...extras],
      },
    });
    // Provisioning n8n — fire-and-forget
    if (process.env.N8N_BASE_URL && process.env.N8N_API_KEY) {
      provisionarWorkflows(tenant)
        .then(async ({ waId, notifId, webhookUrl }) => {
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: { n8nWorkflowWaId: waId, n8nWorkflowNotifId: notifId, n8nWebhookUrl: webhookUrl },
          });
        })
        .catch(err => console.error(`[n8n] Falha ao provisionar tenant ${tenant.slug}:`, err.message));
    }

    // Criação da instância Evolution — fire-and-forget
    if (process.env.EVOLUTION_GLOBAL_API_KEY) {
      createInstance(tenant.slug)
        .then(async (result) => {
          const apiKey = result?.hash?.apikey || result?.apikey || null;
          const baseUrl = process.env.EVOLUTION_BASE_URL || 'https://api.divulgabr.com.br';
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: {
              evolutionInstance: tenant.slug,
              evolutionApiKey: apiKey,
              evolutionBaseUrl: baseUrl,
            },
          });
          // Configura webhook para receber connection.update e messages.upsert
          const appUrl = process.env.APP_URL || '';
          if (appUrl && apiKey) {
            await setWebhook(tenant.slug, apiKey, `${appUrl}/api/webhook/agente/${tenant.slug}`).catch(
              err => console.error(`[evolution] Falha ao configurar webhook ${tenant.slug}:`, err.message)
            );
          }
        })
        .catch(err => console.error(`[evolution] Falha ao criar instância ${tenant.slug}:`, err.message));
    }

    audit.log('tenant_criado', { entidade: 'tenant', entidadeId: tenant.id, userId: req.user?.id, ip: req.ip, detalhes: { nome: tenant.nome, slug: tenant.slug } });
    res.status(201).json({ tenant });
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Slug já em uso' });
    next(err);
  }
};

exports.atualizar = async (req, res, next) => {
  try {
    const { nome, slug, logo, corPrimaria, plano, modulos, ativo, planoStatus, planoVencimento, n8nAtivo,
            email, telefone, cnpj, razaoSocial, logradouro, numero, complemento, bairro, cidade, estado, cep, cadastroCompleto,
            nicho, subnicho } = req.body;
    const id = Number(req.params.id);

    const tenantAntes = await prisma.tenant.findUnique({
      where: { id },
      select: { n8nAtivo: true, n8nWorkflowWaId: true, n8nWorkflowNotifId: true, slug: true, nome: true },
    });

    // Monta objeto de update apenas com campos presentes no body
    const updateData = {};
    if (nome       !== undefined) updateData.nome        = nome;
    if (slug       !== undefined) updateData.slug        = slug;
    if (logo       !== undefined) updateData.logo        = logo || null;
    if (corPrimaria!== undefined) updateData.corPrimaria = corPrimaria;
    if (plano      !== undefined) updateData.plano       = plano;
    // Nicho primeiro: auto-popula módulos base; override manual de modulos vem logo depois
    if (nicho !== undefined) {
      updateData.nichoLabel = nicho || null;
      if (nicho) {
        const { modulosPorNicho } = require('../config/nichos');
        updateData.modulos = modulosPorNicho(nicho);
      }
    }
    if (modulos    !== undefined) {
      // Garante que modulos é sempre um array válido para o campo Json do Prisma
      updateData.modulos = normalizarModulos(modulos);
    }
    if (ativo      !== undefined) updateData.ativo       = ativo;
    if (planoStatus!== undefined) updateData.planoStatus = planoStatus;
    if (planoVencimento !== undefined) {
      const d = planoVencimento ? new Date(planoVencimento) : null;
      updateData.planoVencimento = d && !isNaN(d.getTime()) ? d : null;
    }
    if (n8nAtivo        !== undefined) updateData.n8nAtivo        = Boolean(n8nAtivo);
    if (email           !== undefined) updateData.email           = email || null;
    if (telefone        !== undefined) updateData.telefone        = telefone || null;
    if (cnpj            !== undefined) updateData.cnpj            = cnpj || null;
    if (razaoSocial     !== undefined) updateData.razaoSocial     = razaoSocial || null;
    if (logradouro      !== undefined) updateData.logradouro      = logradouro || null;
    if (numero          !== undefined) updateData.numero          = numero || null;
    if (complemento     !== undefined) updateData.complemento     = complemento || null;
    if (bairro          !== undefined) updateData.bairro          = bairro || null;
    if (cidade          !== undefined) updateData.cidade          = cidade || null;
    if (estado          !== undefined) updateData.estado          = estado || null;
    if (cep             !== undefined) updateData.cep             = cep || null;
    if (cadastroCompleto!== undefined) updateData.cadastroCompleto = Boolean(cadastroCompleto);
    if (subnicho        !== undefined) updateData.subnicho         = subnicho || null;

    const tenant = await prisma.tenant.update({ where: { id }, data: updateData });

    // Audit: mudança de plano registrada separadamente para facilitar rastreio financeiro
    if (plano !== undefined && plano !== tenantAntes?.plano) {
      audit.log('plano_alterado', {
        entidade: 'tenant', entidadeId: id,
        userId: req.user?.id, ip: req.ip,
        detalhes: { de: tenantAntes?.plano, para: plano },
      });
    }

    // Provisionamento automático sempre que n8nAtivo=true e ainda sem workflows
    const semWorkflows = !tenantAntes?.n8nWorkflowWaId && !tenantAntes?.n8nWorkflowNotifId;
    const ativandoN8n  = n8nAtivo !== undefined && Boolean(n8nAtivo) === true;
    const desativandoN8n = n8nAtivo !== undefined && Boolean(n8nAtivo) === false;

    if (ativandoN8n && semWorkflows && process.env.N8N_BASE_URL && process.env.N8N_API_KEY) {
      try {
        const { waId, notifId, webhookUrl } = await provisionarWorkflows(tenant);
        await prisma.tenant.update({
          where: { id },
          data: { n8nWorkflowWaId: waId, n8nWorkflowNotifId: notifId, n8nWebhookUrl: webhookUrl },
        });
        tenant.n8nWorkflowWaId    = waId;
        tenant.n8nWorkflowNotifId = notifId;
        tenant.n8nWebhookUrl      = webhookUrl;
      } catch (errProv) {
        console.error('[n8n] Falha ao provisionar automaticamente:', errProv.message);
        tenant._n8nError = errProv.message;
      }
    }

    // Ativar/desativar workflows no n8n conforme toggle
    if (process.env.N8N_BASE_URL && process.env.N8N_API_KEY) {
      if (ativandoN8n && !semWorkflows) {
        ativarWorkflows(tenant).catch(e => console.error('[n8n] Falha ao ativar workflows:', e.message));
      } else if (desativandoN8n) {
        desativarWorkflows(tenant).catch(e => console.error('[n8n] Falha ao desativar workflows:', e.message));
      }
    }

    res.json({ tenant });
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Slug já em uso' });
    next(err);
  }
};

exports.deletar = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (tenant && (tenant.n8nWorkflowWaId || tenant.n8nWorkflowNotifId)) {
      try {
        await removerWorkflows(tenant);
      } catch (err) {
        console.error(`[n8n] Falha ao remover workflows de ${tenant.slug}:`, err.message);
      }
    }
    if (tenant?.evolutionInstance) {
      try {
        await deleteInstance(tenant.evolutionInstance, tenant.evolutionApiKey);
      } catch (err) {
        console.error(`[evolution] Falha ao deletar instância de ${tenant.slug}:`, err.message);
      }
    }
    // Deleta usuários do tenant antes de deletar o tenant (schema usa onDelete: SetNull)
    await prisma.user.deleteMany({ where: { tenantId: id } });
    await prisma.tenant.delete({ where: { id } });
    audit.log('tenant_deletado', { entidade: 'tenant', entidadeId: id, userId: req.user?.id, ip: req.ip, detalhes: { nome: tenant?.nome, slug: tenant?.slug } });
    res.json({ message: 'Empresa removida' });
  } catch (err) { next(err); }
};

// Criar usuário admin para um tenant
exports.criarUsuario = async (req, res, next) => {
  try {
    const { nome, email, senha, role } = req.body;
    const tenantId = Number(req.params.id);

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) return res.status(404).json({ error: 'Empresa não encontrada' });

    const senhaHash = await bcrypt.hash(senha, 10);
    const user = await prisma.user.create({
      data: { tenantId, nome, email, senha: senhaHash, role: role || 'admin' },
      select: { id: true, nome: true, email: true, role: true, ativo: true },
    });
    res.status(201).json({ user });
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Email já cadastrado nesta empresa' });
    next(err);
  }
};

// Criar/recriar instância Evolution para um tenant
exports.criarEvolution = async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { id: Number(req.params.id) } });
    if (!tenant) return res.status(404).json({ error: 'Empresa não encontrada' });
    // Garante que instância anterior seja removida antes de criar (evita conflito no Evolution API)
    // Usa a global key como fallback para garantir que o delete funcione mesmo sem evolutionApiKey
    const { decrypt } = require('../lib/encrypt');
    const instApiKey = decrypt(tenant.evolutionApiKey);
    const globalKey  = process.env.EVOLUTION_GLOBAL_API_KEY;
    // Tenta deletar com a key do tenant e depois com a global (Evolution retorna 403 em create se instância já existe)
    await deleteInstance(tenant.slug, instApiKey).catch(() => {});
    await deleteInstance(tenant.slug, globalKey).catch(() => {});
    const result = await createInstance(tenant.slug);
    const apiKey = result?.hash?.apikey || result?.apikey || null;
    const updated = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        evolutionInstance: tenant.slug,
        evolutionApiKey: apiKey,
        evolutionBaseUrl: process.env.EVOLUTION_BASE_URL || 'https://api.divulgabr.com.br',
      },
    });

    const appUrl = process.env.APP_URL || '';
    if (appUrl && apiKey) {
      await setWebhook(tenant.slug, apiKey, `${appUrl}/api/webhook/agente/${tenant.slug}`).catch(
        err => console.error(`[evolution] Falha ao configurar webhook ${tenant.slug}:`, err.message)
      );
    }

    res.json({ tenant: updated });
  } catch (err) { next(err); }
};

// Reconfigurar webhook Evolution para um tenant já existente
exports.reconfigurarWebhook = async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUnique({ where: { id: Number(req.params.id) } });
    if (!tenant) return res.status(404).json({ error: 'Empresa não encontrada' });
    if (!tenant.evolutionInstance || !tenant.evolutionApiKey) {
      return res.status(400).json({ error: 'Tenant sem instância Evolution configurada' });
    }

    const appUrl = process.env.APP_URL || '';
    if (!appUrl) return res.status(500).json({ error: 'APP_URL não configurada no servidor' });

    await setWebhook(
      tenant.evolutionInstance,
      tenant.evolutionApiKey,
      `${appUrl}/api/webhook/agente/${tenant.slug}`
    );

    res.json({ ok: true, webhook: `${appUrl}/api/webhook/agente/${tenant.slug}` });
  } catch (err) { next(err); }
};

// Resetar senha de um usuário
exports.resetarSenha = async (req, res, next) => {
  try {
    const { novaSenha } = req.body;
    if (!novaSenha || novaSenha.length < 6) return res.status(400).json({ error: 'Senha mínimo 6 caracteres' });

    const userId = Number(req.params.userId);
    const senhaHash = await bcrypt.hash(novaSenha, 10);
    await prisma.user.update({ where: { id: userId }, data: { senha: senhaHash } });
    audit.log('senha_resetada_admin', {
      entidade: 'user', entidadeId: userId,
      userId: req.user?.id, ip: req.ip,
      detalhes: { resetadoPor: req.user?.email },
    });
    res.json({ message: 'Senha atualizada' });
  } catch (err) { next(err); }
};
