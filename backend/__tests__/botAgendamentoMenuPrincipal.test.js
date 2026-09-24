require('../src/test/setup');
const prisma = require('../src/lib/prisma');
const { criarTenantComUser, criarConfigAgenda } = require('../src/test/helpers');

// Feature 19/09/2026: hoje qualquer saudação cai direto no agendamento — sem
// chance de escolher atendente/IA. Menu inicial opt-in (ConfiguracaoAgenda.
// menuInicialAtivo), só oferece as opções que o tenant realmente tem.
jest.mock('../src/services/waQueue', () => ({
  enfileirar: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../src/services/agentService', () => ({
  handleMessage: jest.fn(),
  callClaude: jest.fn(),
  loadSession: jest.fn().mockResolvedValue([]),
}));
jest.mock('../src/services/waFilaHumanaService', () => ({
  encaminharParaFilaHumana: jest.fn().mockResolvedValue({ id: 1 }),
}));

const { enfileirar } = require('../src/services/waQueue');
const { loadSession } = require('../src/services/agentService');
const { encaminharParaFilaHumana } = require('../src/services/waFilaHumanaService');
const { handleBotMessage } = require('../src/services/botAgendamentoService');

// `tenant` retornado por criarTenantComUser é um snapshot — como handleBotMessage
// recebe o objeto direto (sem recarregar do banco, diferente do req.tenant real
// no webhook), qualquer alteração feita depois precisa devolver o tenant atualizado.
async function ativarWaAtendimento(tenantId) {
  return prisma.tenant.update({ where: { id: tenantId }, data: { modulos: ['leads', 'agendamentos', 'wa_atendimento'] } });
}

async function ativarAgenteIa(tenantId) {
  await prisma.agentConfig.create({ data: { tenantId, ativo: true, promptBase: 'Você é um assistente.' } });
}

describe('handleBotMessage — menu inicial (opt-in)', () => {
  afterEach(() => jest.clearAllMocks());

  test('toggle desligado (default): saudação cai direto no agendamento, sem menu', async () => {
    let { tenant } = await criarTenantComUser('-menu-off');
    await criarConfigAgenda(tenant.id); // menuInicialAtivo: false (default)
    tenant = await ativarWaAtendimento(tenant.id);
    await ativarAgenteIa(tenant.id);

    const handled = await handleBotMessage(tenant, '5511988880001', 'oi');
    expect(handled).toBe(true);

    const conversa = await prisma.conversaWhatsapp.findUnique({ where: { telefone_tenantId: { telefone: '5511988880001', tenantId: tenant.id } } });
    expect(conversa.estado).not.toBe('aguardando_menu_principal'); // foi direto pro fluxo de agendamento
  });

  test('toggle ligado, só wa_atendimento ativo (sem Agente IA): menu mostra só Agendar/Atendente', async () => {
    let { tenant } = await criarTenantComUser('-menu-so-at');
    await criarConfigAgenda(tenant.id, { menuInicialAtivo: true });
    tenant = await ativarWaAtendimento(tenant.id);

    const handled = await handleBotMessage(tenant, '5511988880002', 'oi');
    expect(handled).toBe(true);
    expect(enfileirar).toHaveBeenCalledWith(
      expect.anything(), '5511988880002',
      expect.stringContaining('2. Falar com um atendente'),
      expect.anything(),
    );
    expect(enfileirar.mock.calls[0][2]).not.toContain('Assistente virtual');

    const conversa = await prisma.conversaWhatsapp.findUnique({ where: { telefone_tenantId: { telefone: '5511988880002', tenantId: tenant.id } } });
    expect(conversa.estado).toBe('aguardando_menu_principal');
    expect(conversa.dadosJson.opcoes).toEqual({ atendente: true, ia: false });
  });

  test('toggle ligado, ambos ativos: escolher "1" entra no fluxo de agendamento', async () => {
    let { tenant } = await criarTenantComUser('-menu-opt1');
    await criarConfigAgenda(tenant.id, { menuInicialAtivo: true });
    tenant = await ativarWaAtendimento(tenant.id);
    await ativarAgenteIa(tenant.id);
    const tel = '5511988880003';

    await handleBotMessage(tenant, tel, 'oi'); // mostra o menu
    const handled = await handleBotMessage(tenant, tel, '1');
    expect(handled).toBe(true);

    const conversa = await prisma.conversaWhatsapp.findUnique({ where: { telefone_tenantId: { telefone: tel, tenantId: tenant.id } } });
    expect(conversa.estado).not.toBe('aguardando_menu_principal'); // handleInicio assumiu (virou 'inicio' ou 'aguardando_data')
    expect(encaminharParaFilaHumana).not.toHaveBeenCalled();
  });

  test('toggle ligado, ambos ativos: escolher "2" cria fila humana e não mexe em ConversaWhatsapp', async () => {
    let { tenant } = await criarTenantComUser('-menu-opt2');
    await criarConfigAgenda(tenant.id, { menuInicialAtivo: true });
    tenant = await ativarWaAtendimento(tenant.id);
    await ativarAgenteIa(tenant.id);
    const tel = '5511988880004';

    await handleBotMessage(tenant, tel, 'oi');
    const handled = await handleBotMessage(tenant, tel, '2');
    expect(handled).toBe(true);

    expect(encaminharParaFilaHumana).toHaveBeenCalledWith(
      expect.objectContaining({ id: tenant.id }), tel, 'Cliente WhatsApp', '2',
    );
    const conversa = await prisma.conversaWhatsapp.findUnique({ where: { telefone_tenantId: { telefone: tel, tenantId: tenant.id } } });
    expect(conversa).toBeNull(); // deleteConversa foi chamado
  });

  test('toggle ligado, ambos ativos: escolher "3" retorna false (deixa o Agente IA assumir)', async () => {
    let { tenant } = await criarTenantComUser('-menu-opt3');
    await criarConfigAgenda(tenant.id, { menuInicialAtivo: true });
    tenant = await ativarWaAtendimento(tenant.id);
    await ativarAgenteIa(tenant.id);
    const tel = '5511988880005';

    await handleBotMessage(tenant, tel, 'oi');
    const handled = await handleBotMessage(tenant, tel, '3');
    expect(handled).toBe(false);

    const conversa = await prisma.conversaWhatsapp.findUnique({ where: { telefone_tenantId: { telefone: tel, tenantId: tenant.id } } });
    expect(conversa).toBeNull();
  });

  test('escolha não reconhecida reenvia o menu e mantém o estado', async () => {
    let { tenant } = await criarTenantComUser('-menu-invalido');
    await criarConfigAgenda(tenant.id, { menuInicialAtivo: true });
    tenant = await ativarWaAtendimento(tenant.id);
    const tel = '5511988880006';

    await handleBotMessage(tenant, tel, 'oi');
    const handled = await handleBotMessage(tenant, tel, 'blablabla');
    expect(handled).toBe(true);

    const conversa = await prisma.conversaWhatsapp.findUnique({ where: { telefone_tenantId: { telefone: tel, tenantId: tenant.id } } });
    expect(conversa.estado).toBe('aguardando_menu_principal'); // continua esperando escolha válida
  });

  test('tenant já com sessão ativa do Agente IA: NÃO mostra o menu de novo', async () => {
    loadSession.mockResolvedValueOnce([{ role: 'user', content: 'oi' }]);
    let { tenant } = await criarTenantComUser('-menu-sessao-ia');
    await criarConfigAgenda(tenant.id, { menuInicialAtivo: true });
    tenant = await ativarWaAtendimento(tenant.id);
    await ativarAgenteIa(tenant.id);

    const handled = await handleBotMessage(tenant, '5511988880007', 'como funciona?');

    const conversa = await prisma.conversaWhatsapp.findUnique({ where: { telefone_tenantId: { telefone: '5511988880007', tenantId: tenant.id } } });
    expect(conversa?.estado).not.toBe('aguardando_menu_principal');
    expect(handled).toBe(false); // texto livre não bate nenhum intent → cai pro agentService (mockado, handled=false por padrão)
  });

  test('tenant com WaFila já aberta pro telefone: NÃO mostra o menu de novo', async () => {
    let { tenant } = await criarTenantComUser('-menu-fila-aberta');
    await criarConfigAgenda(tenant.id, { menuInicialAtivo: true });
    tenant = await ativarWaAtendimento(tenant.id);
    const tel = '5511988880008';
    await prisma.waFila.create({ data: { tenantId: tenant.id, clienteTelefone: tel, clienteNome: 'Cliente', status: 'aguardando' } });

    await handleBotMessage(tenant, tel, 'oi');

    const conversa = await prisma.conversaWhatsapp.findUnique({ where: { telefone_tenantId: { telefone: tel, tenantId: tenant.id } } });
    expect(conversa?.estado).not.toBe('aguardando_menu_principal');
  });

  test('nenhum módulo extra ativo: toggle ligado não tem efeito prático (vai direto pro agendamento)', async () => {
    let { tenant } = await criarTenantComUser('-menu-sem-opcoes');
    await criarConfigAgenda(tenant.id, { menuInicialAtivo: true }); // sem wa_atendimento nem Agente IA

    await handleBotMessage(tenant, '5511988880009', 'oi');

    const conversa = await prisma.conversaWhatsapp.findUnique({ where: { telefone_tenantId: { telefone: '5511988880009', tenantId: tenant.id } } });
    expect(conversa.estado).not.toBe('aguardando_menu_principal');
  });
});
