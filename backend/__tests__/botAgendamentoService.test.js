require('../src/test/setup');
const prisma = require('../src/lib/prisma');
const { criarTenantComUser, criarConfigAgenda, dataFutura } = require('../src/test/helpers');

// Evita qualquer chamada real à fila anti-ban / Evolution API durante os testes.
// IMPORTANTE: o `enfileirar` real (src/services/waQueue.js) resolve a Promise
// SEM NENHUM VALOR em todo caminho (sucesso, bounce, dedup, bloqueio de
// reputação) — nunca com `{ ok: true }`. O mock replica isso de propósito
// (ver bug real: sendWA fazia `result.ok` e explodia com "Cannot read
// properties of undefined" toda vez que uma mensagem passava pela fila real).
jest.mock('../src/services/waQueue', () => ({
  enfileirar: jest.fn().mockResolvedValue(undefined),
  registrarEnvioDireto: jest.fn().mockReturnValue(true),
}));

// Evita qualquer chamada real à Claude API — cada teste do LLM define o retorno esperado.
jest.mock('../src/services/agentService', () => ({
  handleMessage: jest.fn(),
  callClaude: jest.fn(),
}));

const { enfileirar } = require('../src/services/waQueue');
const { callClaude } = require('../src/services/agentService');
const {
  handleBotMessage,
  isCancelarIntent,
  isConsultarIntent,
  classificarIntencaoLLM,
  buscarProximoAgendamento,
} = require('../src/services/botAgendamentoService');

describe('isCancelarIntent / isConsultarIntent (regex — sem DB)', () => {
  test('reconhece frases de cancelamento', () => {
    expect(isCancelarIntent('quero cancelar meu horário')).toBe(true);
    expect(isCancelarIntent('preciso desmarcar')).toBe(true);
    expect(isCancelarIntent('não vou poder ir')).toBe(true);
    expect(isCancelarIntent('quero agendar um horário')).toBe(false);
  });

  test('reconhece frases de consulta', () => {
    expect(isConsultarIntent('qual meu horário?')).toBe(true);
    expect(isConsultarIntent('quando é minha consulta')).toBe(true);
    expect(isConsultarIntent('estou marcado pra quando')).toBe(true);
    expect(isConsultarIntent('quero agendar um horário')).toBe(false);
  });
});

describe('classificarIntencaoLLM (Claude mockado — sem rede real)', () => {
  afterEach(() => jest.clearAllMocks());

  test('normaliza resposta da LLM pra uma das 4 categorias', async () => {
    callClaude.mockResolvedValueOnce('cancelar');
    expect(await classificarIntencaoLLM('poxa preciso remarcar')).toBe('cancelar');
  });

  test('cai em "outros" se a LLM responder algo fora do esperado', async () => {
    callClaude.mockResolvedValueOnce('não sei');
    expect(await classificarIntencaoLLM('blablabla')).toBe('outros');
  });

  test('cai em "outros" se a chamada à LLM falhar', async () => {
    callClaude.mockRejectedValueOnce(new Error('timeout'));
    expect(await classificarIntencaoLLM('oi')).toBe('outros');
  });
});

describe('buscarProximoAgendamento (integração — precisa de Postgres real)', () => {
  let tenant;
  const telefone = '5511999990001';

  beforeEach(async () => {
    ({ tenant } = await criarTenantComUser());
    await criarConfigAgenda(tenant.id);
  });

  test('retorna null quando não há agendamento futuro', async () => {
    const ag = await buscarProximoAgendamento(tenant.id, telefone);
    expect(ag).toBeNull();
  });

  test('retorna o próximo agendamento ativo do telefone', async () => {
    const lead = await prisma.lead.create({ data: { tenantId: tenant.id, nome: 'Cliente Teste', telefone, status: 'agendado' } });
    const data = dataFutura(3);
    await prisma.agendamento.create({
      data: { tenantId: tenant.id, leadId: lead.id, data, hora: '10:00', tipo: 'Corte', status: 'marcado' },
    });

    const ag = await buscarProximoAgendamento(tenant.id, telefone);
    expect(ag).not.toBeNull();
    expect(ag.data).toBe(data);
    expect(ag.hora).toBe('10:00');
  });

  test('ignora agendamento já cancelado', async () => {
    const lead = await prisma.lead.create({ data: { tenantId: tenant.id, nome: 'Cliente Teste', telefone, status: 'agendado' } });
    await prisma.agendamento.create({
      data: { tenantId: tenant.id, leadId: lead.id, data: dataFutura(3), hora: '10:00', tipo: 'Corte', status: 'cancelado' },
    });

    const ag = await buscarProximoAgendamento(tenant.id, telefone);
    expect(ag).toBeNull();
  });
});

describe('handleBotMessage — fluxo de cancelamento via WhatsApp (integração)', () => {
  let tenant;
  const telefone = '5511999990002';

  beforeEach(async () => {
    ({ tenant } = await criarTenantComUser()); // plano 'pro' → BOT_WHATSAPP.pro === 'completo'
    await criarConfigAgenda(tenant.id);
    jest.clearAllMocks();
  });

  test('cliente pede pra cancelar, bot confirma e cancela o agendamento', async () => {
    const lead = await prisma.lead.create({ data: { tenantId: tenant.id, nome: 'Cliente Teste', telefone, status: 'agendado' } });
    const ag = await prisma.agendamento.create({
      data: { tenantId: tenant.id, leadId: lead.id, data: dataFutura(3), hora: '14:00', tipo: 'Corte', status: 'marcado' },
    });

    // 1ª mensagem: intenção de cancelar → bot pergunta confirmação
    const handled1 = await handleBotMessage(tenant, telefone, 'quero cancelar meu horário');
    expect(handled1).toBe(true);
    expect(enfileirar).toHaveBeenCalledTimes(1);

    const conversa = await prisma.conversaWhatsapp.findUnique({
      where: { telefone_tenantId: { telefone, tenantId: tenant.id } },
    });
    expect(conversa.estado).toBe('aguardando_confirmacao_cancelamento');

    // 2ª mensagem: confirma
    const handled2 = await handleBotMessage(tenant, telefone, 'sim');
    expect(handled2).toBe(true);

    const agAtualizado = await prisma.agendamento.findUnique({ where: { id: ag.id } });
    expect(agAtualizado.status).toBe('cancelado');
  });

  test('cliente pergunta o próximo agendamento e recebe a resposta sem exigir confirmação', async () => {
    const lead = await prisma.lead.create({ data: { tenantId: tenant.id, nome: 'Cliente Teste', telefone, status: 'agendado' } });
    await prisma.agendamento.create({
      data: { tenantId: tenant.id, leadId: lead.id, data: dataFutura(3), hora: '16:00', tipo: 'Corte', status: 'confirmado' },
    });

    const handled = await handleBotMessage(tenant, telefone, 'quando é meu horário?');
    expect(handled).toBe(true);
    expect(enfileirar).toHaveBeenCalledTimes(1);

    const conversa = await prisma.conversaWhatsapp.findUnique({
      where: { telefone_tenantId: { telefone, tenantId: tenant.id } },
    });
    expect(conversa).toBeNull(); // consulta não deixa conversa pendente
  });
});

describe('handleAguardandoConfirmacao — falha ao avisar admin não pode ser reportada como erro ao cliente', () => {
  const telefoneCliente = '5511999990099';
  const telefoneAdmin = '5511888887777';
  let tenant;

  beforeEach(async () => {
    ({ tenant } = await criarTenantComUser());
    await criarConfigAgenda(tenant.id, { whatsappAdmin: telefoneAdmin });
    await prisma.conversaWhatsapp.create({
      data: {
        tenantId: tenant.id,
        telefone: telefoneCliente,
        estado: 'aguardando_confirmacao',
        dadosJson: { nome: 'Cliente Teste', data: dataFutura(3), slotEscolhido: '10:00', servicoNome: 'Corte' },
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
  });

  afterEach(() => jest.clearAllMocks());

  test('agendamento é criado e cliente recebe confirmação mesmo se o aviso ao admin falhar', async () => {
    enfileirar.mockImplementation((_tenant, telefone) => {
      if (telefone === telefoneAdmin) {
        return Promise.reject(new Error('Instância suspensa por erros consecutivos'));
      }
      return Promise.resolve({ ok: true });
    });

    await handleBotMessage(tenant, telefoneCliente, 'sim');

    const agendamento = await prisma.agendamento.findFirst({ where: { tenantId: tenant.id } });
    expect(agendamento).not.toBeNull();

    const mensagensParaCliente = enfileirar.mock.calls
      .filter(([, telefone]) => telefone === telefoneCliente)
      .map(([, , mensagem]) => mensagem);

    expect(mensagensParaCliente.some(m => m.includes('confirmado'))).toBe(true);
    expect(mensagensParaCliente.some(m => m.includes('Ocorreu um erro'))).toBe(false);
  });
});

describe('handleAguardandoConfirmacaoCancelamento — mesmo bug do AP-029 no fluxo de cancelamento', () => {
  const telefoneCliente = '5511999990098';
  const telefoneAdmin = '5511888887777';
  let tenant, agendamento;

  beforeEach(async () => {
    ({ tenant } = await criarTenantComUser());
    await criarConfigAgenda(tenant.id, { whatsappAdmin: telefoneAdmin });
    const lead = await prisma.lead.create({ data: { tenantId: tenant.id, nome: 'Cliente Teste', telefone: telefoneCliente, status: 'agendado' } });
    agendamento = await prisma.agendamento.create({
      data: { tenantId: tenant.id, leadId: lead.id, data: dataFutura(3), hora: '09:00', tipo: 'Automação', status: 'marcado' },
    });
    await prisma.conversaWhatsapp.create({
      data: {
        tenantId: tenant.id,
        telefone: telefoneCliente,
        estado: 'aguardando_confirmacao_cancelamento',
        dadosJson: { agendamentoId: agendamento.id },
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });
  });

  afterEach(() => jest.clearAllMocks());

  test('agendamento é cancelado e cliente recebe confirmação mesmo se o aviso ao admin falhar', async () => {
    enfileirar.mockImplementation((_tenant, telefone) => {
      if (telefone === telefoneAdmin) {
        return Promise.reject(new Error('Instância suspensa por erros consecutivos'));
      }
      return Promise.resolve({ ok: true });
    });

    await handleBotMessage(tenant, telefoneCliente, 'sim');

    const agAtualizado = await prisma.agendamento.findUnique({ where: { id: agendamento.id } });
    expect(agAtualizado.status).toBe('cancelado');

    const mensagensParaCliente = enfileirar.mock.calls
      .filter(([, telefone]) => telefone === telefoneCliente)
      .map(([, , mensagem]) => mensagem);

    expect(mensagensParaCliente.some(m => m.includes('cancelado'))).toBe(true);
    expect(mensagensParaCliente.some(m => m.includes('Ocorreu um erro'))).toBe(false);
  });
});

describe('handleRespostaConfirmacaoLembrete — confirmação de presença 1 dia antes (reduzir no-show)', () => {
  const telefone = '5511999990097';
  let tenant;

  // Mesma aritmética (UTC via toISOString) do amanhaISO() em botAgendamentoService.js
  // e do amanha() em notificacaoService.js — precisa bater exatamente.
  function amanhaISO() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }

  beforeEach(async () => {
    ({ tenant } = await criarTenantComUser());
    jest.clearAllMocks();
  });

  test('toggle ligado + "sim": confirma o agendamento de amanhã sem precisar de conversa ativa', async () => {
    await criarConfigAgenda(tenant.id, { confirmacaoLembreteAtiva: true });
    const lead = await prisma.lead.create({ data: { tenantId: tenant.id, nome: 'Cliente Lembrete', telefone, status: 'agendado' } });
    const ag = await prisma.agendamento.create({
      data: { tenantId: tenant.id, leadId: lead.id, data: amanhaISO(), hora: '15:00', tipo: 'Consulta', status: 'marcado', lembrete1dEnviado: true },
    });

    const handled = await handleBotMessage(tenant, telefone, 'sim');

    expect(handled).toBe(true);
    const agAtualizado = await prisma.agendamento.findUnique({ where: { id: ag.id } });
    expect(agAtualizado.status).toBe('confirmado');

    const mensagens = enfileirar.mock.calls.filter(([, tel]) => tel === telefone).map(([, , m]) => m);
    expect(mensagens.some(m => m.toLowerCase().includes('confirmado'))).toBe(true);
  });

  test('toggle ligado + "não": cancela o agendamento de amanhã e avisa o admin sem gerar erro falso', async () => {
    const admin = '5511888887777';
    await criarConfigAgenda(tenant.id, { confirmacaoLembreteAtiva: true, whatsappAdmin: admin });
    const lead = await prisma.lead.create({ data: { tenantId: tenant.id, nome: 'Cliente Lembrete', telefone, status: 'agendado' } });
    const ag = await prisma.agendamento.create({
      data: { tenantId: tenant.id, leadId: lead.id, data: amanhaISO(), hora: '15:00', tipo: 'Consulta', status: 'marcado', lembrete1dEnviado: true },
    });

    const handled = await handleBotMessage(tenant, telefone, 'não');

    expect(handled).toBe(true);
    const agAtualizado = await prisma.agendamento.findUnique({ where: { id: ag.id } });
    expect(agAtualizado.status).toBe('cancelado');

    const mensagensCliente = enfileirar.mock.calls.filter(([, tel]) => tel === telefone).map(([, , m]) => m);
    expect(mensagensCliente.some(m => m.includes('cancelamos') || m.toLowerCase().includes('cancel'))).toBe(true);
    expect(mensagensCliente.some(m => m.includes('Ocorreu um erro'))).toBe(false);
  });

  test('toggle desligado: "sim"/"não" não mexe no agendamento de amanhã (zero regressão)', async () => {
    await criarConfigAgenda(tenant.id); // confirmacaoLembreteAtiva: false (default)
    const lead = await prisma.lead.create({ data: { tenantId: tenant.id, nome: 'Cliente Lembrete', telefone, status: 'agendado' } });
    const ag = await prisma.agendamento.create({
      data: { tenantId: tenant.id, leadId: lead.id, data: amanhaISO(), hora: '15:00', tipo: 'Consulta', status: 'marcado', lembrete1dEnviado: true },
    });

    await handleBotMessage(tenant, telefone, 'sim');

    const agAtualizado = await prisma.agendamento.findUnique({ where: { id: ag.id } });
    expect(agAtualizado.status).toBe('marcado');
  });

  test('sem agendamento de amanhã correspondente: não interfere, não quebra', async () => {
    await criarConfigAgenda(tenant.id, { confirmacaoLembreteAtiva: true });
    callClaude.mockResolvedValueOnce('outros'); // "sim" sozinho, sem lembrete pendente, cai na classificação LLM

    // Não deve lançar exceção — sem agendamento de amanhã, handleRespostaConfirmacaoLembrete
    // retorna false e o fluxo cai no comportamento normal (classificação → 'outros' → false).
    await expect(handleBotMessage(tenant, telefone, 'sim')).resolves.toBe(false);
  });
});
