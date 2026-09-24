require('../src/test/setup');
const prisma = require('../src/lib/prisma');
const { getRedis, closeRedis } = require('../src/lib/redis');
const { criarTenantComUser, criarConfigAgenda, dataFutura } = require('../src/test/helpers');

// Reproduz ao vivo em 13/09/2026 (tenant divulgabr): a Evolution reenviou o mesmo
// evento messages.upsert, o bot processou a confirmação duas vezes em paralelo,
// e a segunda chamada bateu no unique constraint de lead (telefone+tenantId) —
// gerando "Ocorreu um erro ao confirmar" pro cliente mesmo o agendamento já
// tendo sido criado com sucesso na primeira chamada. Fix: dedup por messageId.
jest.mock('../src/services/waQueue', () => ({
  enfileirar: jest.fn().mockResolvedValue({ ok: true }),
}));

const { handleInboundMessage } = require('../src/routes/webhook');

describe('handleInboundMessage — dedup de mensagem duplicada da Evolution', () => {
  let tenant;
  const telefone = '5511999990099';

  beforeEach(async () => {
    ({ tenant } = await criarTenantComUser());
    await criarConfigAgenda(tenant.id);
  });

  afterAll(() => closeRedis());

  test('mesma messageId processada 2x em paralelo só cria 1 agendamento', async () => {
    const data = dataFutura(3);
    await prisma.conversaWhatsapp.create({
      data: {
        tenantId: tenant.id,
        telefone,
        estado: 'aguardando_confirmacao',
        dadosJson: { nome: 'Cliente Dedup', data, slotEscolhido: '10:00' },
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const messageId = 'WAMSG-DUPLICADA-123';
    await Promise.all([
      handleInboundMessage(tenant, telefone, 'sim', 'Cliente Dedup', messageId),
      handleInboundMessage(tenant, telefone, 'sim', 'Cliente Dedup', messageId),
    ]);

    const agendamentos = await prisma.agendamento.findMany({
      where: { tenantId: tenant.id, data, hora: '10:00' },
    });
    expect(agendamentos).toHaveLength(1);
  });

  test('messageId diferente não é bloqueado pelo dedup (comportamento normal preservado)', async () => {
    const redis = getRedis();
    await redis.set(`wa:msgdedup:${tenant.id}:WAMSG-OUTRA`, '', 'PX', 1); // garante chave livre
    const data = dataFutura(3);
    await prisma.conversaWhatsapp.create({
      data: {
        tenantId: tenant.id,
        telefone,
        estado: 'aguardando_confirmacao',
        dadosJson: { nome: 'Cliente Normal', data, slotEscolhido: '11:00' },
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await handleInboundMessage(tenant, telefone, 'sim', 'Cliente Normal', 'WAMSG-OUTRA');

    const ag = await prisma.agendamento.findFirst({ where: { tenantId: tenant.id, data, hora: '11:00' } });
    expect(ag).not.toBeNull();
  });
});
