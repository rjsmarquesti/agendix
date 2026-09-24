require('../src/test/setup');

// Achado ao vivo em 13/09/2026 (tenant divulgabr): a fila anti-ban bloqueava
// TODA mensagem fora de 08h-20h BRT, inclusive resposta a conversa que o
// próprio cliente acabou de iniciar (bot de agendamento) — cliente escrevia
// às 21h e só recebia resposta no dia seguinte de manhã. Fix: mensagens
// marcadas como `prioritario` pulam a janela; disparo em massa continua preso a ela.
jest.mock('../src/services/waWatchdogService', () => ({
  enviarMensagemWA: jest.fn().mockResolvedValue(undefined),
  isSuspensa: jest.fn().mockReturnValue(false),
}));
jest.mock('../src/services/waReputacao', () => ({
  estaBloqueado: jest.fn().mockReturnValue(false),
  registrarSucesso: jest.fn(),
  registrarFalha: jest.fn(),
  listarInstancia: jest.fn().mockReturnValue([]),
}));
jest.mock('../src/lib/wa/index', () => ({
  getProviderKey: jest.fn(tenant => tenant.evolutionInstance || tenant.slug),
}));

const { enviarMensagemWA } = require('../src/services/waWatchdogService');
const { enfileirar } = require('../src/services/waQueue');

describe('waQueue — mensagem prioritária pula a janela horária anti-ban', () => {
  const tenant = { id: 1, slug: 'teste-dedup-janela', evolutionInstance: 'teste-dedup-janela' };

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('mensagem prioritária é enviada mesmo fora da janela (21h)', async () => {
    // getHours() é comparado direto contra HORA_INICIO/HORA_FIM (8/20) — em
    // produção isso só é BRT de verdade com TZ=America/Sao_Paulo setado no container.
    jest.spyOn(Date.prototype, 'getHours').mockReturnValue(21); // fora de 8h-20h

    await enfileirar(tenant, '5511988887777', 'confirmação de agendamento', { prioritario: true });

    expect(enviarMensagemWA).toHaveBeenCalledTimes(1);
    expect(enviarMensagemWA).toHaveBeenCalledWith(tenant, '5511988887777', 'confirmação de agendamento');
  });

  test('mensagem não-prioritária (lembrete em massa) espera a janela abrir', async () => {
    jest.useFakeTimers();
    let horaAtual = 21; // fora da janela
    jest.spyOn(Date.prototype, 'getHours').mockImplementation(() => horaAtual);

    const promise = enfileirar(tenant, '5511988886666', 'lembrete de amanhã'); // sem prioritario

    await jest.advanceTimersByTimeAsync(500);
    expect(enviarMensagemWA).not.toHaveBeenCalled();

    horaAtual = 9; // janela abriu
    await jest.advanceTimersByTimeAsync(60_000); // completa o ciclo de checagem de até 60s

    await promise;
    expect(enviarMensagemWA).toHaveBeenCalledTimes(1);
  });
});
