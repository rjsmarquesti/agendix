require('../src/test/setup');
const prisma = require('../src/lib/prisma');
const { getSlots } = require('../src/services/disponibilidadeService');
const { criarTenantComUser, criarConfigAgenda, dataFutura } = require('../src/test/helpers');

let tenant;

beforeEach(async () => {
  ({ tenant } = await criarTenantComUser());
  await criarConfigAgenda(tenant.id);
});

test('gera slots corretos para config padrão (08:00–18:00, 60 min)', async () => {
  const data = dataFutura(3);
  const { slots, erro } = await getSlots(tenant.id, data);
  expect(erro).toBeUndefined();
  expect(slots).toContain('08:00');
  expect(slots).toContain('17:00');
  expect(slots).not.toContain('18:00');
  expect(slots.length).toBe(10);
});

test('exclui slots já ocupados', async () => {
  const data = dataFutura(3);
  const lead = await prisma.lead.create({ data: { tenantId: tenant.id, nome: 'Lead Teste', status: 'novo' } });
  await prisma.agendamento.create({ data: { tenantId: tenant.id, leadId: lead.id, data, hora: '09:00', tipo: 'consulta', status: 'marcado' } });

  const { slots } = await getSlots(tenant.id, data);
  expect(slots).not.toContain('09:00');
  expect(slots).toContain('10:00');
});

test('retorna erro para dia fora dos diasUteis', async () => {
  // Usa data local (não UTC) para evitar bug de timezone GMT-3
  const d = new Date();
  if (d.getDay() === 0) d.setDate(d.getDate() + 1); // sai do domingo se hoje for
  while (d.getDay() !== 0) d.setDate(d.getDate() + 1); // avança até domingo
  d.setDate(d.getDate() + 7); // domingo da semana seguinte
  // Formata em YYYY-MM-DD local (não toISOString que usa UTC)
  const data = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const { slots, erro } = await getSlots(tenant.id, data);
  expect(slots).toHaveLength(0);
  expect(erro).toMatch(/dias de atendimento/i);
});

test('retorna erro para formato de data inválido', async () => {
  const { slots, erro } = await getSlots(tenant.id, '2026/05/01');
  expect(slots).toHaveLength(0);
  expect(erro).toMatch(/formato/i);
});

test('bloqueia dia inteiro com BloqueioHorario sem hora', async () => {
  const data = dataFutura(3);
  await prisma.bloqueioHorario.create({ data: { tenantId: tenant.id, data, motivo: 'Feriado Teste' } });

  const { slots, erro } = await getSlots(tenant.id, data);
  expect(slots).toHaveLength(0);
  expect(erro).toMatch(/feriado teste/i);
});

test('bloqueia intervalo com BloqueioHorario com hora', async () => {
  const data = dataFutura(3);
  await prisma.bloqueioHorario.create({ data: { tenantId: tenant.id, data, horaInicio: '12:00', horaFim: '14:00' } });

  const { slots } = await getSlots(tenant.id, data);
  expect(slots).not.toContain('12:00');
  expect(slots).not.toContain('13:00');
  expect(slots).toContain('11:00');
  expect(slots).toContain('14:00');
});

test('usa duracaoMin do Servico se servicoId fornecido', async () => {
  const data = dataFutura(3);
  const servico = await prisma.servico.create({ data: { tenantId: tenant.id, nome: 'Rápido', duracaoMin: 30, ativo: true } });

  const { slots } = await getSlots(tenant.id, data, servico.id);
  // Com slots de 30 min das 08:00 às 18:00 → 20 slots
  expect(slots.length).toBe(20);
  expect(slots).toContain('08:00');
  expect(slots).toContain('08:30');
  expect(slots).toContain('09:00');
});
