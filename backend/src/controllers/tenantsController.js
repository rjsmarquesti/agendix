const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { provisionarWorkflows, removerWorkflows } = require('../services/n8nProvisioningService');

exports.listar = async (req, res, next) => {
  try {
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { users: true, leads: true } } },
    });
    res.json({ tenants });
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

exports.criar = async (req, res, next) => {
  try {
    const { nome, slug, logo, corPrimaria, plano, modulos } = req.body;
    const tenant = await prisma.tenant.create({
      data: {
        nome, slug,
        logo: logo || null,
        corPrimaria: corPrimaria || '#2563eb',
        plano: plano || 'basico',
        modulos: modulos || ['leads', 'agendamentos'],
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

    res.status(201).json({ tenant });
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Slug já em uso' });
    next(err);
  }
};

exports.atualizar = async (req, res, next) => {
  try {
    const { nome, slug, logo, corPrimaria, plano, modulos, ativo, planoStatus, planoVencimento, asaasCustomerId } = req.body;
    const tenant = await prisma.tenant.update({
      where: { id: Number(req.params.id) },
      data: {
        nome, slug, logo: logo || null, corPrimaria, plano, modulos, ativo,
        planoStatus: planoStatus || undefined,
        planoVencimento: planoVencimento ? new Date(planoVencimento) : undefined,
        asaasCustomerId: asaasCustomerId || undefined,
      },
    });
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
    await prisma.tenant.delete({ where: { id } });
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

// Resetar senha de um usuário
exports.resetarSenha = async (req, res, next) => {
  try {
    const { novaSenha } = req.body;
    if (!novaSenha || novaSenha.length < 6) return res.status(400).json({ error: 'Senha mínimo 6 caracteres' });

    const senhaHash = await bcrypt.hash(novaSenha, 10);
    await prisma.user.update({ where: { id: Number(req.params.userId) }, data: { senha: senhaHash } });
    res.json({ message: 'Senha atualizada' });
  } catch (err) { next(err); }
};
