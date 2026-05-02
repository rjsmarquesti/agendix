require('../src/test/setup');
const request = require('supertest');
const app = require('../server');
const prisma = require('../src/lib/prisma');
const { criarTenantComUser, criarConfigAgenda, dataFutura } = require('../src/test/helpers');

let tenant, apiToken;

beforeEach(async () => {
  ({ tenant, apiToken } = await criarTenantComUser());
  await criarConfigAgenda(tenant.id);
});

test('POST /api/n8n/agendamentos cria com canalOrigem whatsapp', async () => {
  const data = dataFutura(3);
  const slotsRes = await request(app)
    .get(`/api/n8n/disponibilidade?data=${data}`)
    .set('X-API-Token', apiToken);
  const hora = slotsRes.body.slots[0];

  const res = await request(app)
    .post('/api/n8n/agendamentos')
    .set('X-API-Token', apiToken)
    .send({ cliente_nome: 'WA User', cliente_telefone: '11999880001', data, hora });

  expect(res.status).toBe(201);
  expect(res.body.agendamento.canalOrigem).toBe('whatsapp');
  expect(res.body.agendamento.data).toBe(data);
});

test('GET /api/n8n/agendamentos?lembrete=pendente retorna só os corretos', async () => {
  const amanha = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const lead = await prisma.lead.create({ data: { tenantId: tenant.id, nome: 'Lead Lembrete', status: 'novo' } });
  await prisma.agendamento.create({
    data: { tenantId: tenant.id, leadId: lead.id, data: amanha, hora: '10:00', tipo: 'consulta', status: 'marcado', lembreteEnviado: false },
  });

  const res = await request(app)
    .get('/api/n8n/agendamentos?lembrete=pendente')
    .set('X-API-Token', apiToken);

  expect(res.status).toBe(200);
  expect(res.body.agendamentos.length).toBeGreaterThan(0);
  expect(res.body.agendamentos.every(a => a.lembreteEnviado === false)).toBe(true);
});

test('PATCH /api/n8n/agendamentos/:id atualiza lembreteEnviado', async () => {
  const lead = await prisma.lead.create({ data: { tenantId: tenant.id, nome: 'Lead PATCH', status: 'novo' } });
  const ag = await prisma.agendamento.create({
    data: { tenantId: tenant.id, leadId: lead.id, data: dataFutura(2), hora: '09:00', tipo: 'consulta', status: 'marcado', lembreteEnviado: false },
  });

  const res = await request(app)
    .patch(`/api/n8n/agendamentos/${ag.id}`)
    .set('X-API-Token', apiToken)
    .send({ lembreteEnviado: true });

  expect(res.status).toBe(200);
  expect(res.body.agendamento.lembreteEnviado).toBe(true);
});

test('Conversas: PUT cria, GET busca, DELETE remove', async () => {
  const tel = '5511999990099';

  // PUT cria
  const putRes = await request(app)
    .put(`/api/n8n/conversas/${tel}`)
    .set('X-API-Token', apiToken)
    .send({ estado: 'aguardando_data', dadosJson: { nome: 'Fulano' } });
  expect(putRes.status).toBe(200);
  expect(putRes.body.conversa.estado).toBe('aguardando_data');

  // GET busca
  const getRes = await request(app)
    .get(`/api/n8n/conversas/${tel}`)
    .set('X-API-Token', apiToken);
  expect(getRes.status).toBe(200);
  expect(getRes.body.conversa.dadosJson.nome).toBe('Fulano');

  // DELETE remove
  const delRes = await request(app)
    .delete(`/api/n8n/conversas/${tel}`)
    .set('X-API-Token', apiToken);
  expect(delRes.status).toBe(200);

  // GET após delete → 404
  const getRes2 = await request(app)
    .get(`/api/n8n/conversas/${tel}`)
    .set('X-API-Token', apiToken);
  expect(getRes2.status).toBe(404);
});

test('n8n com token inválido retorna 401', async () => {
  const res = await request(app)
    .get('/api/n8n/leads')
    .set('X-API-Token', 'token-invalido');
  expect(res.status).toBe(401);
});
