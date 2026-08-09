const cron = require('node-cron');
const prisma = require('../lib/prisma');
const {
  enviarEmailTrialD3,
  enviarEmailTrialD10,
  enviarEmailTrialD13,
} = require('../lib/mailer');

function diasDesde(data) {
  const diff = Date.now() - new Date(data).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

async function processarTenant(tenant, adminEmail, adminNome) {
  const dias = diasDesde(tenant.createdAt);
  const slug = tenant.slug;

  // D3: entre 3 e 4 dias após criação
  if (dias >= 3 && dias < 4 && !tenant.trialEmailD3EnviadoEm) {
    await enviarEmailTrialD3({ para: adminEmail, nome: adminNome, slug, tenantId: tenant.id });
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { trialEmailD3EnviadoEm: new Date() },
    });
    console.log(`[trialEmail] D3 enviado → ${adminEmail}`);
    return;
  }

  // D7: entre 7 e 8 dias após criação (metade do trial)
  if (dias >= 7 && dias < 8 && !tenant.trialEmailD10EnviadoEm) {
    await enviarEmailTrialD10({ para: adminEmail, nome: adminNome, slug, tenantId: tenant.id });
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { trialEmailD10EnviadoEm: new Date() },
    });
    console.log(`[trialEmail] D7 enviado → ${adminEmail}`);
    return;
  }

  // D12: entre 12 e 13 dias após criação (2 dias antes do fim do trial de 14d)
  if (dias >= 12 && dias < 13 && !tenant.trialEmailD13EnviadoEm) {
    await enviarEmailTrialD13({ para: adminEmail, nome: adminNome, tenantId: tenant.id });
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { trialEmailD13EnviadoEm: new Date() },
    });
    console.log(`[trialEmail] D12 enviado → ${adminEmail}`);
  }
}

async function executarEmailsTrial() {
  // Marca trials vencidos como "expirado" para manter banco consistente com o middleware
  await prisma.tenant.updateMany({
    where: { planoStatus: 'trial', planoVencimento: { lt: new Date() } },
    data: { planoStatus: 'expirado' },
  });

  // Apenas tenants em trial ativo
  const tenants = await prisma.tenant.findMany({
    where: { ativo: true, planoStatus: 'trial' },
    include: {
      users: {
        where: { role: 'admin', ativo: true },
        orderBy: { createdAt: 'asc' },
        take: 1,
      },
    },
  });

  for (const tenant of tenants) {
    const admin = tenant.users[0];
    if (!admin?.email) continue;

    try {
      await processarTenant(tenant, admin.email, admin.nome);
    } catch (err) {
      console.error(`[trialEmail] Erro no tenant ${tenant.slug}:`, err.message);
    }
  }
}

function agendarCronTrial() {
  // Roda a cada hora — garante que trials expirados sejam bloqueados em até 1h (não 24h)
  cron.schedule('5 * * * *', () => {
    executarEmailsTrial().catch(err =>
      console.error('[trialEmail] Erro no cron:', err.message)
    );
  });
  console.log('[trialEmail] Cron de trial agendado (a cada hora, no minuto 5)');
}

module.exports = { agendarCronTrial, executarEmailsTrial };
