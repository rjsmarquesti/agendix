require('../src/test/setup');
const request = require('supertest');
const app = require('../server');
const prisma = require('../src/lib/prisma');
const { criarTenantComUser } = require('../src/test/helpers');

// Achado ao vivo em 16/09/2026 (tenant divulgabr): clicar "Ver conversa" no
// módulo Atendimento humano sempre dava "Erro ao carregar logs" — o backend
// disparava TENANT_ISOLATION_VIOLATION porque waConversaLog.findMany não tinha
// tenantId no where (prismaMiddleware.js guarda esse model+ação). Nunca
// detectado porque "Ver conversa" nunca tinha sido clicado antes em produção.
describe('GET /api/wa-atendimento/fila/:id/logs', () => {
  test('retorna os logs da sessão sem lançar TENANT_ISOLATION_VIOLATION', async () => {
    const { tenant, token } = await criarTenantComUser('-walogs');

    const fila = await prisma.waFila.create({
      data: { tenantId: tenant.id, clienteTelefone: '5511999990001', clienteNome: 'Cliente Teste', status: 'em_atendimento' },
    });
    await prisma.waConversaLog.create({
      data: {
        filaId: fila.id, tenantId: tenant.id, direcao: 'entrada',
        deTelefone: '5511999990001', paraTelefone: tenant.slug,
        mensagem: 'Fazem manutenção de site?', fonte: 'cliente',
      },
    });

    const res = await request(app)
      .get(`/api/wa-atendimento/fila/${fila.id}/logs`)
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Slug', tenant.slug);

    expect(res.status).toBe(200);
    expect(res.body.logs).toHaveLength(1);
    expect(res.body.logs[0].mensagem).toBe('Fazem manutenção de site?');
  });

  test('isolamento: sessão de outro tenant retorna 404, não vaza logs', async () => {
    const { tenant: tenantA } = await criarTenantComUser('-walogs-a');
    const { tenant: tenantB, token: tokenB } = await criarTenantComUser('-walogs-b');

    const filaA = await prisma.waFila.create({
      data: { tenantId: tenantA.id, clienteTelefone: '5511999990002', clienteNome: 'Cliente A', status: 'em_atendimento' },
    });
    await prisma.waConversaLog.create({
      data: {
        filaId: filaA.id, tenantId: tenantA.id, direcao: 'entrada',
        deTelefone: '5511999990002', paraTelefone: tenantA.slug,
        mensagem: 'Mensagem sigilosa do tenant A', fonte: 'cliente',
      },
    });

    const res = await request(app)
      .get(`/api/wa-atendimento/fila/${filaA.id}/logs`)
      .set('Authorization', `Bearer ${tokenB}`)
      .set('X-Tenant-Slug', tenantB.slug);

    expect(res.status).toBe(404);
  });
});
