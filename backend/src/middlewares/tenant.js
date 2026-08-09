const prisma = require('../lib/prisma');
const { decryptTenant } = require('../lib/encrypt');

module.exports = async (req, res, next) => {
  try {
    // 1. Tenta pelo header (dev local / API calls)
    let slug = req.headers['x-tenant-slug'];

    // 2. Tenta pelo subdomínio (produção: empresa.seudominio.com)
    if (!slug) {
      const host = req.headers.host || '';
      const partes = host.split('.');
      if (partes.length >= 3) slug = partes[0];
    }

    if (!slug) return res.status(400).json({ error: 'Tenant não identificado' });

    // Valida formato do slug — apenas letras minúsculas, números e hífens
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({ error: 'Tenant inválido' });
    }

    const tenant = decryptTenant(await prisma.tenant.findUnique({ where: { slug } }));
    if (!tenant) return res.status(404).json({ error: 'Empresa não encontrada' });
    if (!tenant.ativo) return res.status(403).json({ error: 'Empresa inativa' });
    if (
      tenant.planoStatus === 'expirado' ||
      (tenant.planoStatus === 'trial' && tenant.planoVencimento && new Date() > new Date(tenant.planoVencimento))
    ) {
      return res.status(402).json({ error: 'Período de teste encerrado. Escolha um plano para continuar.' });
    }
    if (tenant.planoStatus === 'cancelado') {
      return res.status(402).json({ error: 'Assinatura cancelada. Entre em contato com o suporte.' });
    }
    if (tenant.planoStatus === 'inadimplente') {
      res.setHeader('X-Plano-Aviso', 'Pagamento em atraso. Acesso será suspenso em breve.');
    }

    // Se o usuário já foi autenticado (auth rodou antes nesta rota), o tenant do header
    // precisa bater com o tenant do JWT — senão qualquer usuário logado poderia acessar
    // dados de outro tenant só trocando X-Tenant-Slug (achado C2 da auditoria de 31/07/2026).
    if (req.user && req.user.tenantId !== tenant.id) {
      return res.status(403).json({ error: 'Acesso negado: tenant não corresponde ao usuário autenticado.' });
    }

    req.tenant = tenant;
    next();
  } catch (err) {
    next(err);
  }
};
