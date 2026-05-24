const prisma = require('../lib/prisma');
const { LIMITE_AGENDAMENTOS } = require('../config/planos');

const INCLUDE_LEAD = {
  lead:    { select: { nome: true, telefone: true, email: true } },
  servico: { select: { id: true, nome: true, duracaoMin: true } },
};

/**
 * Verifica se o tenant atingiu o limite mensal de agendamentos do seu plano.
 * Lança erro com status 402 se o limite foi atingido.
 */
async function verificarLimiteMensal(tenantId, plano) {
  // Usa data local de São Paulo para evitar bug de virada de mês em UTC
  const agora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
  const ano  = agora.getFullYear();
  const mes  = String(agora.getMonth() + 1).padStart(2, '0');
  const inicioDia1 = `${ano}-${mes}-01`;
  const ultimoDia  = new Date(ano, agora.getMonth() + 1, 0).getDate();
  const fimDia     = `${ano}-${mes}-${String(ultimoDia).padStart(2, '0')}`;

  const totalMes = await prisma.agendamento.count({
    where: { tenantId, data: { gte: inicioDia1, lte: fimDia } },
  });
  const limite = LIMITE_AGENDAMENTOS[plano] ?? 50;
  if (totalMes >= limite) {
    const err = new Error(`Limite de ${limite} agendamentos/mês do plano ${plano} atingido.`);
    err.status = 402;
    throw err;
  }
}

/**
 * Cria um agendamento dentro de uma transaction para evitar double-booking.
 * Lança erro com status 409 se o slot já estiver ocupado.
 */
async function criarComAntiDoubleBooking(dados, opts = {}) {
  const { tenantId, data, hora } = dados;
  const incluir = opts.incluir ?? INCLUDE_LEAD;

  return prisma.$transaction(async (tx) => {
    const conflito = await tx.agendamento.findFirst({
      where: { tenantId, data, hora, status: { in: ['marcado', 'confirmado'] } },
    });
    if (conflito) {
      const err = new Error('SLOT_OCUPADO');
      err.status = 409;
      throw err;
    }
    return tx.agendamento.create({ data: dados, include: incluir });
  });
}

/**
 * Fluxo completo de criação de agendamento (verificação de plano + anti-double-booking).
 * Usado pelo controller do painel admin, pela rota pública e pela rota n8n.
 *
 * @param {object} dados  - Campos do agendamento (deve incluir tenantId, data, hora, leadId)
 * @param {string} plano  - Plano do tenant ('solo' | 'pro' | 'business')
 * @param {object} [opts] - Opções: { incluir } para include do Prisma
 */
async function criar(dados, plano, opts = {}) {
  await verificarLimiteMensal(dados.tenantId, plano);
  return criarComAntiDoubleBooking(dados, opts);
}

/**
 * Resolve ou cria um lead pelo telefone (usado no fluxo público e bot WA).
 */
async function resolverLeadPorTelefone(tenantId, telefoneNorm, dadosLead = {}) {
  let lead = await prisma.lead.findFirst({ where: { tenantId, telefone: telefoneNorm } });
  if (!lead) {
    lead = await prisma.lead.create({
      data: {
        tenantId,
        nome:     dadosLead.nome     || telefoneNorm,
        telefone: telefoneNorm,
        email:    dadosLead.email    || null,
        status:   'agendado',
        fonte:    dadosLead.fonte    || 'api',
      },
    });
  }
  return lead;
}

module.exports = { criar, verificarLimiteMensal, criarComAntiDoubleBooking, resolverLeadPorTelefone };
