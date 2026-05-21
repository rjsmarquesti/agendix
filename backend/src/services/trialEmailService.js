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
    await enviarEmailTrialD3({ para: adminEmail, nome: adminNome, slug });
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { trialEmailD3EnviadoEm: new Date() },
    });
    console.log(`[trialEmail] D3 enviado → ${adminEmail}`);
    return;
  }

  // D15: entre 15 e 16 dias após criação
  if (dias >= 15 && dias < 16 && !tenant.trialEmailD10EnviadoEm) {
    await enviarEmailTrialD10({ para: adminEmail, nome: adminNome, slug });
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { trialEmailD10EnviadoEm: new Date() },
    });
    console.log(`[trialEmail] D15 enviado → ${adminEmail}`);
    return;
  }

  // D28: entre 28 e 29 dias após criação
  if (dias >= 28 && dias < 29 && !tenant.trialEmailD13EnviadoEm) {
    await enviarEmailTrialD13({ para: adminEmail, nome: adminNome });
    await prisma.tenant.update({
      where: { id: tenant.id },
      data: { trialEmailD13EnviadoEm: new Date() },
    });
    console.log(`[trialEmail] D28 enviado → ${adminEmail}`);
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
  // Roda uma vez por dia às 10h
  cron.schedule('0 10 * * *', () => {
    executarEmailsTrial().catch(err =>
      console.error('[trialEmail] Erro no cron:', err.message)
    );
  });
  console.log('[trialEmail] Cron de emails de trial agendado (diário às 10h)');
}

module.exports = { agendarCronTrial, executarEmailsTrial };
