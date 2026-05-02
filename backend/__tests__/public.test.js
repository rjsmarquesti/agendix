require('../src/test/setup');
const request = require('supertest');
const app = require('../server');
const prisma = require('../src/lib/prisma');
const { criarTenantComUser, criarConfigAgenda, dataFutura } = require('../src/test/helpers');

let tenant, slug;

beforeEach(async () => {
  ({ tenant } = await criarTenantComUser());
  slug = tenant.slug;
  await criarConfigAgenda(tenant.id);
});

test('GET /api/public/:slug/config retorna branding e serviços', async () => {
  await prisma.servico.create({ data: { tenantId: tenant.id, nome: 'Consulta', duracaoMin: 60, ativo: true } });

  const res = await request(app).get(`/api/public/${slug}/config`);
  expect(res.status).toBe(200);
  expect(res.body.tenantNome).toBe('Tenant Teste');
  expect(res.body.servicos).toHaveLength(1);
  expect(res.body.servicos[0].nome).toBe('Consulta');
});

test('GET /api/public/:slug/disponibilidade retorna slots', async () => {
  const data = dataFutura(3);
  const res = await request(app).get(`/api/public/${slug}/disponibilidade?data=${data}`);
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body.slots)).toBe(true);
  expect(res.body.slots.length).toBeGreaterThan(0);
});

test('POST /api/public/:slug/agendar cria agendamento com canalOrigem web', async () => {
  const data = dataFutura(3);
  const slotsRes = await request(app).get(`/api/public/${slug}/disponibilidade?data=${data}`);
  const hora = slotsRes.body.slots[0];

  const res = await request(app)
    .post(`/api/public/${slug}/agendar`)
    .send({ nome: 'Teste Cliente', telefone: '11999990001', data, hora });

  expect(res.status).toBe(201);
  expect(res.body.agendamento.canalOrigem).toBe('web');
  expect(res.body.agendamento.data).toBe(data);
  expect(res.body.agendamento.hora).toBe(hora);
});

test('POST /api/public/:slug/agendar retorna 409 para slot ocupado', async () => {
  const data = dataFutura(3);
  const slotsRes = await request(app).get(`/api/public/${slug}/disponibilidade?data=${data}`);
  const hora = slotsRes.body.slots[0];

  // Primeiro agendamento
  await request(app).post(`/api/public/${slug}/agendar`).send({ nome: 'A', telefone: '11999990002', data, hora });

  // Segundo no mesmo slot
  const res = await request(app).post(`/api/public/${slug}/agendar`).send({ nome: 'B', telefone: '11999990003', data, hora });
  expect(res.status).toBe(409);
});

test('POST /api/public/:slug/agendar cria lead se não existir', async () => {
  const data = dataFutura(3);
  const slotsRes = await request(app).get(`/api/public/${slug}/disponibilidade?data=${data}`);
  const hora = slotsRes.body.slots[0];

  await request(app).post(`/api/public/${slug}/agendar`).send({ nome: 'Novo Lead', telefone: '11999990004', data, hora });

  const lead = await prisma.lead.findFirst({ where: { tenantId: tenant.id, telefone: '11999990004' } });
  expect(lead).not.toBeNull();
  expect(lead.nome).toBe('Novo Lead');
});

test('POST /api/public/:slug/agendar com servicoId válido persiste servicoId', async () => {
  const data = dataFutura(3);
  const servico = await prisma.servico.create({ data: { tenantId: tenant.id, nome: 'Retorno', duracaoMin: 30, ativo: true } });
  const slotsRes = await request(app).get(`/api/public/${slug}/disponibilidade?data=${data}&servicoId=${servico.id}`);
  const hora = slotsRes.body.slots[0];

  const res = await request(app)
    .post(`/api/public/${slug}/agendar`)
    .send({ nome: 'C', telefone: '11999990005', data, hora, servicoId: servico.id });

  expect(res.status).toBe(201);
  expect(res.body.agendamento.servicoId).toBe(servico.id);
});

test('GET /api/public/:slug/config retorna 404 para slug inexistente', async () => {
  const res = await request(app).get('/api/public/nao-existe-xyzabc/config');
  expect(res.status).toBe(404);
});
