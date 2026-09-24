require('../src/test/setup');
const prisma = require('../src/lib/prisma');
const { criarTenantComUser } = require('../src/test/helpers');

// Achado ao vivo em 16/09/2026 (tenant divulgabr, teste do módulo Atendimento
// humano): mensagens do cliente que caem no fallback (bot não entendeu, Agente
// IA inativo) nunca eram registradas em waConversaLog — a fila era criada/
// notificada só na 1ª mensagem, e a partir da 2ª (sessão já aberta) a mensagem
// desaparecia sem deixar rastro nenhum. "Ver conversa" ficava sempre vazio.
jest.mock('../src/services/agentService', () => ({
  handleMessage: jest.fn(),
  callClaude: jest.fn(),
}));
jest.mock('../src/services/waQueue', () => ({
  enfileirar: jest.fn().mockResolvedValue(undefined),
}));

const { handleMessage } = require('../src/services/agentService');
const { callClaude } = require('../src/services/agentService');
const { handleInboundMessage } = require('../src/routes/webhook');

describe('handleInboundMessage — log de mensagens no fallback de Atendimento humano', () => {
  let tenant;
  const telefone = '5511999998888';
  const textoFallback = 'Fazem manutenção de site?'; // não é agendar/cancelar/consultar/saudação

  beforeEach(async () => {
    ({ tenant } = await criarTenantComUser());
    await prisma.tenant.update({ where: { id: tenant.id }, data: { modulos: ['leads', 'agendamentos', 'wa_atendimento'] } });
    tenant.modulos = ['leads', 'agendamentos', 'wa_atendimento'];
    handleMessage.mockResolvedValue(false); // Agente IA inativo/não configurado
    callClaude.mockResolvedValue('outros'); // LLM classifica como "outros" → bot não processa
  });

  afterEach(() => jest.clearAllMocks());

  test('1ª mensagem: cria a fila E registra o conteúdo em waConversaLog', async () => {
    await handleInboundMessage(tenant, telefone, textoFallback, 'Cliente Teste', 'MSG-1');

    const fila = await prisma.waFila.findFirst({ where: { tenantId: tenant.id, clienteTelefone: telefone } });
    expect(fila).not.toBeNull();

    const logs = await prisma.waConversaLog.findMany({ where: { filaId: fila.id, tenantId: tenant.id } });
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      direcao: 'entrada',
      fonte: 'cliente',
      mensagem: textoFallback,
      deTelefone: telefone,
    });
  });

  test('2ª mensagem (sessão já aberta): NÃO cria fila nova, mas registra a mensagem', async () => {
    await handleInboundMessage(tenant, telefone, textoFallback, 'Cliente Teste', 'MSG-1');
    await handleInboundMessage(tenant, telefone, 'Qual o valor de vocês?', 'Cliente Teste', 'MSG-2');

    const filas = await prisma.waFila.findMany({ where: { tenantId: tenant.id, clienteTelefone: telefone } });
    expect(filas).toHaveLength(1); // não duplicou a fila

    const logs = await prisma.waConversaLog.findMany({
      where: { filaId: filas[0].id, tenantId: tenant.id },
      orderBy: { criadoEm: 'asc' },
    });
    expect(logs).toHaveLength(2);
    expect(logs[1].mensagem).toBe('Qual o valor de vocês?');
  });

  test('tenant sem módulo wa_atendimento: não cria fila nem log', async () => {
    await prisma.tenant.update({ where: { id: tenant.id }, data: { modulos: ['leads', 'agendamentos'] } });
    tenant.modulos = ['leads', 'agendamentos'];

    await handleInboundMessage(tenant, telefone, textoFallback, 'Cliente Teste', 'MSG-3');

    const fila = await prisma.waFila.findFirst({ where: { tenantId: tenant.id, clienteTelefone: telefone } });
    expect(fila).toBeNull();
  });
});
