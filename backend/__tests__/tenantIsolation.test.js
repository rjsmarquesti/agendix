require('../src/test/setup');
const request = require('supertest');
const app = require('../server');
const prisma = require('../src/lib/prisma');
const { criarTenantComUser, criarConfigAgenda, dataFutura } = require('../src/test/helpers');

test('Tenant A não vê agendamentos do Tenant B', async () => {
  const { tenant: tenantA, token: tokenA } = await criarTenantComUser('-a');
  const { tenant: tenantB } = await criarTenantComUser('-b');

  const leadB = await prisma.lead.create({ data: { tenantId: tenantB.id, nome: 'Lead B', status: 'novo' } });
  await prisma.agendamento.create({ data: { tenantId: tenantB.id, leadId: leadB.id, data: dataFutura(2), hora: '09:00', tipo: 'consulta', status: 'marcado' } });

  const res = await request(app)
    .get('/api/agendamentos')
    .set('Authorization', `Bearer ${tokenA}`)
    .set('X-Tenant-Slug', tenantA.slug);

  expect(res.status).toBe(200);
  expect(res.body.agendamentos.every(a => a.tenantId === tenantA.id || !('tenantId' in a))).toBe(true);
  expect(res.body.agendamentos).toHaveLength(0);
});

test('Bloqueio de Tenant A não afeta disponibilidade de Tenant B', async () => {
  const { tenant: tenantA } = await criarTenantComUser('-a2');
  const { tenant: tenantB } = await criarTenantComUser('-b2');
  await criarConfigAgenda(tenantA.id);
  await criarConfigAgenda(tenantB.id);

  const data = dataFutura(5);
  await prisma.bloqueioHorario.create({ data: { tenantId: tenantA.id, data, motivo: 'Feriado A' } });

  const resA = await request(app).get(`/api/public/${tenantA.slug}/disponibilidade?data=${data}`);
  const resB = await request(app).get(`/api/public/${tenantB.slug}/disponibilidade?data=${data}`);

  expect(resA.body.slots).toHaveLength(0);
  expect(resB.body.slots.length).toBeGreaterThan(0);
});

test('Serviço do Tenant A não aparece em Tenant B', async () => {
  const { tenant: tenantA } = await criarTenantComUser('-a3');
  const { tenant: tenantB } = await criarTenantComUser('-b3');
  await criarConfigAgenda(tenantA.id);
  await criarConfigAgenda(tenantB.id);

  await prisma.servico.create({ data: { tenantId: tenantA.id, nome: 'Serviço Exclusivo A', ativo: true } });

  const res = await request(app).get(`/api/public/${tenantB.slug}/config`);
  expect(res.body.servicos.some(s => s.nome === 'Serviço Exclusivo A')).toBe(false);
});
