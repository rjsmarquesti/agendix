const cron = require('node-cron');
const prisma = require('../lib/prisma');
const { executarAgendaDia } = require('./agendaDiaService');
const { enfileirar } = require('./waQueue');

function hoje() {
  return new Date().toISOString().split('T')[0];
}

function amanha() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function montarMensagem(template, agendamento) {
  const data = agendamento.data?.split('-').reverse().join('/') || '';
  const hora = agendamento.hora || '';
  const nome = agendamento.clienteNome || agendamento.lead?.nome || '';
  const servico = agendamento.servico?.nome || agendamento.tipo || 'atendimento';
  return (template || 'Olá {{nome}}! Lembrete do seu {{servico}} em {{data}} às {{hora}}.')
    .replace(/\{\{nome\}\}/g, nome)
    .replace(/\{\{data\}\}/g, data)
    .replace(/\{\{hora\}\}/g, hora)
    .replace(/\{\{servico\}\}/g, servico);
}


async function criarNotificacao(tenantId, tipo, titulo, corpo) {
  await prisma.notificacao.create({ data: { tenantId, tipo, titulo, corpo } });
}

async function processarTenant(tenant) {
  const config = await prisma.configuracaoAgenda.findUnique({
    where: { tenantId: tenant.id },
  });

  const dataHoje = hoje();
  const dataAmanha = amanha();

  const agendamentos = await prisma.agendamento.findMany({
    where: {
      tenantId: tenant.id,
      status: { in: ['marcado', 'confirmado'] },
      OR: [
        { data: dataAmanha, lembrete1dEnviado: false },
        { data: dataHoje,   lembreteDiaEnviado: false },
      ],
    },
    include: {
      lead:    { select: { nome: true, telefone: true } },
      servico: { select: { nome: true } },
    },
  });

  for (const ag of agendamentos) {
    const telefone = ag.clienteTelefone || ag.lead?.telefone;
    if (!telefone) continue;

    const isHoje   = ag.data === dataHoje;
    const template = config?.mensagemWaLembrete;
    const mensagem = montarMensagem(template, ag);

    try {
      await enfileirar(tenant, telefone, mensagem);

      await prisma.agendamento.update({
        where: { id: ag.id },
        data: isHoje ? { lembreteDiaEnviado: true } : { lembrete1dEnviado: true },
      });

      const nomeCliente = ag.clienteNome || ag.lead?.nome || telefone;
      await criarNotificacao(
        tenant.id,
        'lembrete_enviado',
        `Lembrete enviado para ${nomeCliente}`,
        `Agendamento ${ag.data} às ${ag.hora}`,
      );
    } catch (err) {
      await criarNotificacao(
        tenant.id,
        'lembrete_falhou',
        `Falha ao enviar lembrete`,
        `${ag.clienteNome || ag.lead?.nome || telefone} — ${ag.data} ${ag.hora}: ${err.message}`,
      );
    }
  }
}

async function executarLembretes() {
  const tenants = await prisma.tenant.findMany({
    where: {
      ativo: true,
      lembretesDiretosAtivo: true,
      evolutionInstance: { not: null },
      evolutionApiKey:   { not: null },
    },
  });

  for (const tenant of tenants) {
    try {
      await processarTenant(tenant);
    } catch (err) {
      console.error(`[notificacaoService] Erro processando tenant ${tenant.slug}:`, err.message);
    }
  }
}

function agendarCron() {
  cron.schedule('0 * * * *', () => {
    executarLembretes().catch(err =>
      console.error('[notificacaoService] Erro no cron:', err.message)
    );
  });
  cron.schedule('0,30 * * * *', () => {
    executarAgendaDia().catch(err =>
      console.error('[agendaDia] Erro no cron:', err.message)
    );
  });
  console.log('[notificacaoService] Crons agendados (lembretes a cada hora, agenda dia a cada 30 min)');
}

async function notificarAgendamento(tenant, agendamento) {
  if (!tenant.evolutionInstance || !tenant.evolutionApiKey) return;

  const config = await prisma.configuracaoAgenda.findUnique({ where: { tenantId: tenant.id } });
  if (!config) return;

  const dataBr = agendamento.data ? agendamento.data.split('-').reverse().join('/') : '';
  const hora   = agendamento.hora || '';
  const nomeCliente = agendamento.lead?.nome || agendamento.clienteNome || '';
  const nomeServico = agendamento.servico?.nome || agendamento.tipo || '';

  const phoneCliente = agendamento.lead?.telefone || agendamento.clienteTelefone;
  if (phoneCliente && config.mensagemWaConfirmacao) {
    const msg = config.mensagemWaConfirmacao
      .replace(/\{\{nome\}\}/g, nomeCliente)
      .replace(/\{\{data\}\}/g, dataBr)
      .replace(/\{\{hora\}\}/g, hora)
      .replace(/\{\{servico\}\}/g, nomeServico);
    enfileirar(tenant, phoneCliente, msg).catch(e =>
      console.error('[notificarAgendamento] cliente:', e.message)
    );
  }

  if (config.whatsappAdmin) {
    const adminMsg = `📅 Novo agendamento!\n\n👤 ${nomeCliente}\n🗂️ ${nomeServico}\n📆 ${dataBr} às ${hora}`;
    enfileirar(tenant, config.whatsappAdmin, adminMsg).catch(e =>
      console.error('[notificarAgendamento] admin:', e.message)
    );
  }
}

module.exports = { agendarCron, executarLembretes, notificarAgendamento };
