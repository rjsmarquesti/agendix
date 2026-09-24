require('../src/test/setup');
const prisma = require('../src/lib/prisma');
const { criarTenantComUser, criarConfigAgenda } = require('../src/test/helpers');

// dataFutura() de test/helpers.js pula fim de semana (pra testes de agenda) — aqui
// precisamos do dia exato +N (mesma aritmética de hoje()/amanha()/em3Dias() do
// notificacaoService.js), senão o teste fica instável perto de sexta/sábado.
function diasAFrenteExato(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

// Evita qualquer chamada real à fila anti-ban / Evolution API durante os testes.
jest.mock('../src/services/waQueue', () => ({
  enfileirar: jest.fn().mockResolvedValue({ ok: true }),
}));

const { enfileirar } = require('../src/services/waQueue');
const { processarTenant } = require('../src/services/notificacaoService');

describe('processarTenant — lembrete de 3 dias (novo, antes só existia no n8n)', () => {
  let tenant;

  beforeEach(async () => {
    ({ tenant } = await criarTenantComUser());
    await criarConfigAgenda(tenant.id);
    jest.clearAllMocks();
  });

  test('envia lembrete e marca lembrete3dEnviado para agendamento em 3 dias', async () => {
    const lead = await prisma.lead.create({ data: { tenantId: tenant.id, nome: 'Cliente 3d', telefone: '5511988880001', status: 'agendado' } });
    const ag = await prisma.agendamento.create({
      data: { tenantId: tenant.id, leadId: lead.id, data: diasAFrenteExato(3), hora: '11:00', tipo: 'Consulta', status: 'marcado' },
    });

    await processarTenant(tenant);

    expect(enfileirar).toHaveBeenCalledTimes(1);
    const atualizado = await prisma.agendamento.findUnique({ where: { id: ag.id } });
    expect(atualizado.lembrete3dEnviado).toBe(true);
    expect(atualizado.lembrete1dEnviado).toBe(false);
    expect(atualizado.lembreteDiaEnviado).toBe(false);
  });

  test('não reenvia lembrete de 3 dias já marcado como enviado', async () => {
    const lead = await prisma.lead.create({ data: { tenantId: tenant.id, nome: 'Cliente 3d', telefone: '5511988880002', status: 'agendado' } });
    await prisma.agendamento.create({
      data: { tenantId: tenant.id, leadId: lead.id, data: diasAFrenteExato(3), hora: '11:00', tipo: 'Consulta', status: 'marcado', lembrete3dEnviado: true },
    });

    await processarTenant(tenant);

    expect(enfileirar).not.toHaveBeenCalled();
  });

  test('não mistura o lembrete de 3 dias com o de 1 dia/no dia', async () => {
    const lead1 = await prisma.lead.create({ data: { tenantId: tenant.id, nome: 'Cliente 1d', telefone: '5511988880003', status: 'agendado' } });
    const amanha = diasAFrenteExato(1);
    const ag1d = await prisma.agendamento.create({
      data: { tenantId: tenant.id, leadId: lead1.id, data: amanha, hora: '09:00', tipo: 'Consulta', status: 'marcado' },
    });

    await processarTenant(tenant);

    const atualizado = await prisma.agendamento.findUnique({ where: { id: ag1d.id } });
    expect(atualizado.lembrete1dEnviado).toBe(true);
    expect(atualizado.lembrete3dEnviado).toBe(false);
  });
});

describe('processarTenant — lembrete de 1 dia com confirmação de presença (confirmacaoLembreteAtiva)', () => {
  let tenant;

  beforeEach(async () => {
    ({ tenant } = await criarTenantComUser());
    jest.clearAllMocks();
  });

  test('toggle ligado: mensagem de 1 dia pergunta e pede sim/não', async () => {
    await criarConfigAgenda(tenant.id, { confirmacaoLembreteAtiva: true });
    const lead = await prisma.lead.create({ data: { tenantId: tenant.id, nome: 'Cliente Confirma', telefone: '5511988880010', status: 'agendado' } });
    await prisma.agendamento.create({
      data: { tenantId: tenant.id, leadId: lead.id, data: diasAFrenteExato(1), hora: '10:00', tipo: 'Consulta', status: 'marcado' },
    });

    await processarTenant(tenant);

    expect(enfileirar).toHaveBeenCalledTimes(1);
    const [, , mensagem] = enfileirar.mock.calls[0];
    expect(mensagem.toLowerCase()).toEqual(expect.stringContaining('sim'));
    expect(mensagem.toLowerCase()).toEqual(expect.stringContaining('não'));
  });

  test('toggle desligado (padrão): mensagem de 1 dia continua só avisando, sem pedir resposta', async () => {
    await criarConfigAgenda(tenant.id); // confirmacaoLembreteAtiva: false (default)
    const lead = await prisma.lead.create({ data: { tenantId: tenant.id, nome: 'Cliente Padrão', telefone: '5511988880011', status: 'agendado' } });
    await prisma.agendamento.create({
      data: { tenantId: tenant.id, leadId: lead.id, data: diasAFrenteExato(1), hora: '10:00', tipo: 'Consulta', status: 'marcado' },
    });

    await processarTenant(tenant);

    expect(enfileirar).toHaveBeenCalledTimes(1);
    const [, , mensagem] = enfileirar.mock.calls[0];
    expect(mensagem.toLowerCase()).not.toEqual(expect.stringContaining('responda'));
  });

  test('toggle ligado não afeta o lembrete de 3 dias (continua só aviso)', async () => {
    await criarConfigAgenda(tenant.id, { confirmacaoLembreteAtiva: true });
    const lead = await prisma.lead.create({ data: { tenantId: tenant.id, nome: 'Cliente 3d', telefone: '5511988880012', status: 'agendado' } });
    await prisma.agendamento.create({
      data: { tenantId: tenant.id, leadId: lead.id, data: diasAFrenteExato(3), hora: '10:00', tipo: 'Consulta', status: 'marcado' },
    });

    await processarTenant(tenant);

    expect(enfileirar).toHaveBeenCalledTimes(1);
    const [, , mensagem] = enfileirar.mock.calls[0];
    expect(mensagem.toLowerCase()).not.toEqual(expect.stringContaining('responda'));
  });
});
