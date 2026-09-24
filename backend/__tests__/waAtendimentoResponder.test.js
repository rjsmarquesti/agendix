require('../src/test/setup');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../server');
const prisma = require('../src/lib/prisma');
const { criarTenantComUser } = require('../src/test/helpers');

// Achado ao vivo em 18/09/2026 (Rogério perguntou como o atendente responde de
// verdade): o painel nunca teve forma de enviar mensagem — só fila/histórico.
// Decisão: reaproveitar o Role.atendente (já existe no enum User, ocioso) e o
// mesmo waQueue.enfileirar já usado pelo bot/Agente IA, sem depender do
// WhatsApp pessoal de ninguém. Ver plano completo no CLAUDE plan file.
jest.mock('../src/services/waQueue', () => ({
  enfileirar: jest.fn().mockResolvedValue(undefined),
}));
const { enfileirar } = require('../src/services/waQueue');

// criarTenantComUser assina o token com `userId` (não `id`) — real login usa `id`
// (ver authController.js/generateAccessToken). Pra rotas que leem req.user.id
// (esta é a 1ª no módulo wa-atendimento a precisar disso), assinar manualmente.
function tokenPara(user, tenantId) {
  return jwt.sign({ id: user.id, role: user.role, tenantId }, process.env.JWT_SECRET, { expiresIn: '1h' });
}

async function criarAtendenteUser(tenantId, slugSuffix) {
  const user = await prisma.user.create({
    data: { nome: `Atendente ${slugSuffix}`, email: `atendente-${Date.now()}${slugSuffix}@test.com`, senha: 'x', role: 'atendente', tenantId },
  });
  return { user, token: tokenPara(user, tenantId) };
}

async function criarSessao(tenantId, overrides = {}) {
  return prisma.waFila.create({
    data: { tenantId, clienteTelefone: '5511988880001', clienteNome: 'Cliente Teste', status: 'aguardando', ...overrides },
  });
}

describe('POST /api/wa-atendimento/fila/:id/responder', () => {
  afterEach(() => jest.clearAllMocks());

  test('sem mensagem retorna 400', async () => {
    const { tenant, token } = await criarTenantComUser('-resp-400');
    const sessao = await criarSessao(tenant.id);
    const res = await request(app)
      .post(`/api/wa-atendimento/fila/${sessao.id}/responder`)
      .set('Authorization', `Bearer ${token}`).set('X-Tenant-Slug', tenant.slug)
      .send({ mensagem: '   ' });
    expect(res.status).toBe(400);
    expect(enfileirar).not.toHaveBeenCalled();
  });

  test('sessão de outro tenant retorna 404', async () => {
    const { tenant: tenantA } = await criarTenantComUser('-resp-404a');
    const { tenant: tenantB, token: tokenB } = await criarTenantComUser('-resp-404b');
    const sessaoA = await criarSessao(tenantA.id);
    const res = await request(app)
      .post(`/api/wa-atendimento/fila/${sessaoA.id}/responder`)
      .set('Authorization', `Bearer ${tokenB}`).set('X-Tenant-Slug', tenantB.slug)
      .send({ mensagem: 'oi' });
    expect(res.status).toBe(404);
  });

  test('sessão encerrada retorna 400', async () => {
    const { tenant, token } = await criarTenantComUser('-resp-enc');
    const sessao = await criarSessao(tenant.id, { status: 'encerrado', fechadaEm: new Date() });
    const res = await request(app)
      .post(`/api/wa-atendimento/fila/${sessao.id}/responder`)
      .set('Authorization', `Bearer ${token}`).set('X-Tenant-Slug', tenant.slug)
      .send({ mensagem: 'oi' });
    expect(res.status).toBe(400);
    expect(enfileirar).not.toHaveBeenCalled();
  });

  test('admin responde com sucesso: cria log saida/humano/enviado, chama enfileirar prioritario, sessão vira em_atendimento', async () => {
    const { tenant, token } = await criarTenantComUser('-resp-admin');
    const sessao = await criarSessao(tenant.id, { status: 'aguardando' });

    const res = await request(app)
      .post(`/api/wa-atendimento/fila/${sessao.id}/responder`)
      .set('Authorization', `Bearer ${token}`).set('X-Tenant-Slug', tenant.slug)
      .send({ mensagem: 'Olá, em que posso ajudar?' });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const log = await prisma.waConversaLog.findUnique({ where: { id: res.body.logId } });
    expect(log.direcao).toBe('saida');
    expect(log.fonte).toBe('humano');
    expect(log.status).toBe('enviado');
    expect(log.mensagem).toBe('Olá, em que posso ajudar?');
    expect(log.atendenteId).toBeNull();

    expect(enfileirar).toHaveBeenCalledWith(
      expect.objectContaining({ id: tenant.id }), sessao.clienteTelefone, 'Olá, em que posso ajudar?',
      { prioritario: true },
    );

    const sessaoAtualizada = await prisma.waFila.findUnique({ where: { id: sessao.id } });
    expect(sessaoAtualizada.status).toBe('em_atendimento');
    expect(sessaoAtualizada.atendenteId).toBeNull(); // sem auto-atribuição (decisão confirmada)
  });

  test('falha assíncrona do enfileirar marca o log como erro', async () => {
    enfileirar.mockRejectedValueOnce(new Error('instância suspensa'));
    const { tenant, token } = await criarTenantComUser('-resp-erro');
    const sessao = await criarSessao(tenant.id, { status: 'em_atendimento' });

    const res = await request(app)
      .post(`/api/wa-atendimento/fila/${sessao.id}/responder`)
      .set('Authorization', `Bearer ${token}`).set('X-Tenant-Slug', tenant.slug)
      .send({ mensagem: 'oi' });
    expect(res.status).toBe(200);

    let log = null;
    for (let i = 0; i < 20 && log?.status !== 'erro'; i++) {
      await new Promise(r => setTimeout(r, 50));
      log = await prisma.waConversaLog.findUnique({ where: { id: res.body.logId } });
    }
    expect(log.status).toBe('erro');
  });

  test('atendente vinculado responde sessão própria com sucesso', async () => {
    const { tenant } = await criarTenantComUser('-resp-at-ok');
    const { user, token } = await criarAtendenteUser(tenant.id, '-ok');
    const waAtendente = await prisma.waAtendente.create({
      data: { tenantId: tenant.id, nome: user.nome, telefone: '5511900000001', userId: user.id },
    });
    const sessao = await criarSessao(tenant.id, { status: 'em_atendimento', atendenteId: waAtendente.id });

    const res = await request(app)
      .post(`/api/wa-atendimento/fila/${sessao.id}/responder`)
      .set('Authorization', `Bearer ${token}`).set('X-Tenant-Slug', tenant.slug)
      .send({ mensagem: 'Pode falar' });

    expect(res.status).toBe(200);
    const log = await prisma.waConversaLog.findUnique({ where: { id: res.body.logId } });
    expect(log.atendenteId).toBe(waAtendente.id);
  });

  test('atendente vinculado responde sessão de OUTRO atendente: 403', async () => {
    const { tenant } = await criarTenantComUser('-resp-at-403');
    const { user: userA } = await criarAtendenteUser(tenant.id, '-a');
    const { user: userB, token: tokenB } = await criarAtendenteUser(tenant.id, '-b');
    const atendenteA = await prisma.waAtendente.create({
      data: { tenantId: tenant.id, nome: userA.nome, telefone: '5511900000002', userId: userA.id },
    });
    await prisma.waAtendente.create({
      data: { tenantId: tenant.id, nome: userB.nome, telefone: '5511900000003', userId: userB.id },
    });
    const sessao = await criarSessao(tenant.id, { status: 'em_atendimento', atendenteId: atendenteA.id });

    const res = await request(app)
      .post(`/api/wa-atendimento/fila/${sessao.id}/responder`)
      .set('Authorization', `Bearer ${tokenB}`).set('X-Tenant-Slug', tenant.slug)
      .send({ mensagem: 'oi' });

    expect(res.status).toBe(403);
    expect(enfileirar).not.toHaveBeenCalled();
  });

  test('atendente vinculado responde sessão não atribuída (aguardando): 200, sem auto-atribuição', async () => {
    const { tenant } = await criarTenantComUser('-resp-at-livre');
    const { user, token } = await criarAtendenteUser(tenant.id, '-livre');
    await prisma.waAtendente.create({
      data: { tenantId: tenant.id, nome: user.nome, telefone: '5511900000004', userId: user.id },
    });
    const sessao = await criarSessao(tenant.id, { status: 'aguardando' });

    const res = await request(app)
      .post(`/api/wa-atendimento/fila/${sessao.id}/responder`)
      .set('Authorization', `Bearer ${token}`).set('X-Tenant-Slug', tenant.slug)
      .send({ mensagem: 'oi' });

    expect(res.status).toBe(200);
    const sessaoAtualizada = await prisma.waFila.findUnique({ where: { id: sessao.id } });
    expect(sessaoAtualizada.status).toBe('em_atendimento');
    expect(sessaoAtualizada.atendenteId).toBeNull();
  });
});

describe('GET /api/wa-atendimento/fila — RBAC por role', () => {
  test('atendente vinculado só vê sessões próprias e não atribuídas; admin vê tudo', async () => {
    const { tenant, token: tokenAdmin } = await criarTenantComUser('-fila-rbac');
    const { user, token: tokenAtendente } = await criarAtendenteUser(tenant.id, '-rbac');
    const meuAtendente = await prisma.waAtendente.create({
      data: { tenantId: tenant.id, nome: user.nome, telefone: '5511900000005', userId: user.id },
    });
    const outroAtendente = await prisma.waAtendente.create({
      data: { tenantId: tenant.id, nome: 'Outro', telefone: '5511900000006' },
    });

    const minha = await criarSessao(tenant.id, { clienteTelefone: '5511977770001', status: 'em_atendimento', atendenteId: meuAtendente.id });
    const semDono = await criarSessao(tenant.id, { clienteTelefone: '5511977770002', status: 'aguardando' });
    const deOutro = await criarSessao(tenant.id, { clienteTelefone: '5511977770003', status: 'em_atendimento', atendenteId: outroAtendente.id });

    const resAtendente = await request(app).get('/api/wa-atendimento/fila')
      .set('Authorization', `Bearer ${tokenAtendente}`).set('X-Tenant-Slug', tenant.slug);
    const idsVistos = resAtendente.body.fila.map(f => f.id).sort();
    expect(idsVistos).toEqual([minha.id, semDono.id].sort());
    expect(idsVistos).not.toContain(deOutro.id);

    const resAdmin = await request(app).get('/api/wa-atendimento/fila')
      .set('Authorization', `Bearer ${tokenAdmin}`).set('X-Tenant-Slug', tenant.slug);
    expect(resAdmin.body.fila.map(f => f.id).sort()).toEqual([minha.id, semDono.id, deOutro.id].sort());
  });
});
