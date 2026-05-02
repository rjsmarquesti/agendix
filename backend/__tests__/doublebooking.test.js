require('../src/test/setup');
const request = require('supertest');
const app = require('../server');
const { criarTenantComUser, criarConfigAgenda, dataFutura } = require('../src/test/helpers');

test('segundo agendamento no mesmo slot retorna 409', async () => {
  const { tenant } = await criarTenantComUser();
  await criarConfigAgenda(tenant.id);
  const slug = tenant.slug;

  const data = dataFutura(4);
  const slotsRes = await request(app).get(`/api/public/${slug}/disponibilidade?data=${data}`);
  const hora = slotsRes.body.slots[0];

  // Primeiro agendamento — deve funcionar
  const res1 = await request(app)
    .post(`/api/public/${slug}/agendar`)
    .send({ nome: 'P1', telefone: '11900000001', data, hora });
  expect(res1.status).toBe(201);

  // Segundo no mesmo slot — deve ser rejeitado (slot já não aparece como disponível)
  const res2 = await request(app)
    .post(`/api/public/${slug}/agendar`)
    .send({ nome: 'P2', telefone: '11900000002', data, hora });
  expect(res2.status).toBe(409);
});
