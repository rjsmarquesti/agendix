require('../src/test/setup');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');
const { criarTenantComUser } = require('../src/test/helpers');

// Rotas novas do painel de fila detalhada + "Disparar agora" (/wa-fila) — 15/09/2026.
describe('rotas /api/wa-fila/fila-detalhada e /disparar-agora/:id', () => {
  test('GET /fila-detalhada sem auth → 401', async () => {
    const { tenant } = await criarTenantComUser('-wafila-401get');
    const res = await request(app).get('/api/wa-fila/fila-detalhada').set('X-Tenant-Slug', tenant.slug);
    expect(res.status).toBe(401);
  });

  test('POST /disparar-agora/:id sem auth → 401', async () => {
    const { tenant } = await criarTenantComUser('-wafila-401post');
    const res = await request(app).post('/api/wa-fila/disparar-agora/1').set('X-Tenant-Slug', tenant.slug);
    expect(res.status).toBe(401);
  });

  test('POST /disparar-agora/:id com usuário sem role admin → 403', async () => {
    const { tenant, user } = await criarTenantComUser('-wafila-role');
    const tokenUser = jwt.sign(
      { userId: user.id, tenantId: tenant.id, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .post('/api/wa-fila/disparar-agora/1')
      .set('Authorization', `Bearer ${tokenUser}`)
      .set('X-Tenant-Slug', tenant.slug);

    expect(res.status).toBe(403);
  });

  test('POST /disparar-agora/:id com id não numérico → 400', async () => {
    const { tenant, token } = await criarTenantComUser('-wafila-idinvalido');

    const res = await request(app)
      .post('/api/wa-fila/disparar-agora/abc')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Slug', tenant.slug);

    expect(res.status).toBe(400);
  });

  test('POST /disparar-agora/:id com id inexistente na própria fila → 404', async () => {
    const prisma = require('../src/lib/prisma');
    const { tenant, token } = await criarTenantComUser('-wafila-404');
    await prisma.tenant.update({ where: { id: tenant.id }, data: { evolutionInstance: `${tenant.slug}-inst` } });

    const res = await request(app)
      .post('/api/wa-fila/disparar-agora/999999')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Slug', tenant.slug);

    expect(res.status).toBe(404);
  });

  test('GET /fila-detalhada sem evolutionInstance configurada → configurado:false, itens:[]', async () => {
    const { tenant, token } = await criarTenantComUser('-wafila-semwa');

    const res = await request(app)
      .get('/api/wa-fila/fila-detalhada')
      .set('Authorization', `Bearer ${token}`)
      .set('X-Tenant-Slug', tenant.slug);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ configurado: false, itens: [] });
  });
});
