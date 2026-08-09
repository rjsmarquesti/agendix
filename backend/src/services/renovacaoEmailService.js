const cron = require('node-cron');
const prisma = require('../lib/prisma');
const { enviarEmailRenovacaoAnual } = require('../lib/mailer');

const VALOR_ANUAL = { solo: '374,40', pro: '566,40', business: '950,40' };

async function processarRenovacoes() {
  const agora = new Date();
  // Janela: vence entre 28 e 31 dias a partir de agora
  const de  = new Date(agora.getTime() + 28 * 24 * 60 * 60 * 1000);
  const ate = new Date(agora.getTime() + 31 * 24 * 60 * 60 * 1000);

  const tenants = await prisma.tenant.findMany({
    where: {
      planoStatus:    'ativo',
      cicloBilhagem:  'anual',
      planoVencimento: { gte: de, lte: ate },
      renovacaoEmailEnviadoEm: null,
    },
    include: {
      users: {
        where: { role: 'admin', ativo: true },
        select: { email: true, nome: true },
        take: 1,
      },
    },
  });

  for (const tenant of tenants) {
    const admin = tenant.users[0];
    if (!admin?.email) continue;

    const diasRestantes = Math.ceil((new Date(tenant.planoVencimento) - agora) / (1000 * 60 * 60 * 24));

    try {
      await enviarEmailRenovacaoAnual({
        para:          admin.email,
        nome:          admin.nome,
        diasRestantes,
        plano:         tenant.plano,
        valorAnual:    VALOR_ANUAL[tenant.plano] || '—',
        tenantId:      tenant.id,
      });
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: { renovacaoEmailEnviadoEm: new Date() },
      });
      console.log(`[renovacaoEmail] Enviado para ${admin.email} (${diasRestantes}d)`);
    } catch (err) {
      console.error(`[renovacaoEmail] Falha ${tenant.slug}:`, err.message);
    }
  }
}

function agendarCronRenovacao() {
  cron.schedule('10 * * * *', async () => {
    try { await processarRenovacoes(); } catch (err) {
      console.error('[renovacaoEmail] Erro no cron:', err.message);
    }
  });
  console.log('[renovacaoEmail] Cron de renovação anual ativo (a cada hora, minuto 10)');
}

module.exports = { agendarCronRenovacao };
