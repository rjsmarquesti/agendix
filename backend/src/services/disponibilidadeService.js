const prisma = require('../lib/prisma');

/**
 * Retorna os slots disponíveis para uma data em um tenant.
 * @param {number} tenantId
 * @param {string} dateStr - "YYYY-MM-DD"
 * @param {number|null} servicoId - se informado, usa duracaoMin do serviço
 * @returns {{ slots: string[], erro?: string }}
 */
async function getSlots(tenantId, dateStr, servicoId = null) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { slots: [], erro: 'Formato de data inválido. Use YYYY-MM-DD.' };
  }

  // Busca configuração do tenant (cria padrão se não existir)
  let config = await prisma.configuracaoAgenda.findUnique({ where: { tenantId } });
  if (!config) {
    config = await prisma.configuracaoAgenda.create({ data: { tenantId } });
  }

  if (!config.ativo) return { slots: [], erro: 'Agendamentos desativados para esta empresa.' };

  // Se servicoId informado, usa duracaoMin do serviço (validando que pertence ao tenant)
  let duracaoSlot = config.duracaoSlot;
  if (servicoId) {
    const servico = await prisma.servico.findFirst({
      where: { id: servicoId, tenantId, ativo: true },
      select: { duracaoMin: true },
    });
    if (servico) duracaoSlot = servico.duracaoMin;
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  const dataSolicitada = new Date(year, month - 1, day);

  // Verifica dia da semana
  const dow = dataSolicitada.getDay();
  const diasUteis = config.diasUteis.split(',').map(Number);
  if (!diasUteis.includes(dow)) {
    return { slots: [], erro: 'Data fora dos dias de atendimento.' };
  }

  // Verifica antecedência mínima
  const agora = new Date();
  const minDate = new Date(agora.getTime() + config.antecedenciaMin * 60 * 60 * 1000);
  minDate.setHours(0, 0, 0, 0);
  if (dataSolicitada < minDate) {
    return { slots: [], erro: 'Data abaixo da antecedência mínima exigida.' };
  }

  // Verifica antecedência máxima
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const maxDate = new Date(hoje.getTime() + config.antecedenciaMax * 24 * 60 * 60 * 1000);
  if (dataSolicitada > maxDate) {
    return { slots: [], erro: 'Data além do limite máximo de agendamento.' };
  }

  // Verifica bloqueios de horário para esta data
  const bloqueios = await prisma.bloqueioHorario.findMany({
    where: { tenantId, data: dateStr },
    select: { horaInicio: true, horaFim: true, motivo: true },
  });

  // Bloqueio de dia inteiro (horaInicio = null)
  const bloqueoDiaTodo = bloqueios.find(b => !b.horaInicio);
  if (bloqueoDiaTodo) {
    return { slots: [], erro: bloqueoDiaTodo.motivo || 'Dia bloqueado.' };
  }

  // Gera todos os slots
  const todosSlots = gerarSlots(config.horarioInicio, config.horarioFim, duracaoSlot);

  // Busca horários já ocupados
  const ocupados = await prisma.agendamento.findMany({
    where: { tenantId, data: dateStr, status: { in: ['marcado', 'confirmado'] } },
    select: { hora: true },
  });
  const horariosOcupados = new Set(ocupados.map(a => a.hora.substring(0, 5)));

  // Converte bloqueios de intervalo para minutos para comparação
  const intervalos = bloqueios
    .filter(b => b.horaInicio && b.horaFim)
    .map(b => ({
      inicio: toMinutos(b.horaInicio),
      fim: toMinutos(b.horaFim),
    }));

  // Filtra slots passados se é hoje
  const isHoje = dataSolicitada.getTime() === hoje.getTime();
  const horaLimite = isHoje
    ? agora.getTime() + config.antecedenciaMin * 60 * 60 * 1000
    : null;

  const slotsDisponiveis = todosSlots.filter(slot => {
    if (horariosOcupados.has(slot)) return false;

    // Verifica bloqueio de intervalo
    const slotMin = toMinutos(slot);
    if (intervalos.some(iv => slotMin >= iv.inicio && slotMin < iv.fim)) return false;

    if (horaLimite) {
      const [h, m] = slot.split(':').map(Number);
      const slotDate = new Date(year, month - 1, day, h, m);
      if (slotDate.getTime() < horaLimite) return false;
    }
    return true;
  });

  return { slots: slotsDisponiveis };
}

function gerarSlots(inicio, fim, duracaoMin) {
  const slots = [];
  const [hIni, mIni] = inicio.split(':').map(Number);
  const [hFim, mFim] = fim.split(':').map(Number);
  let atual = hIni * 60 + mIni;
  const fimMin = hFim * 60 + mFim;

  while (atual < fimMin) {
    const h = Math.floor(atual / 60);
    const m = atual % 60;
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    atual += duracaoMin;
  }
  return slots;
}

function toMinutos(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

module.exports = { getSlots };
