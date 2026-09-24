require('../src/test/setup');

// Painel de fila detalhada + "Disparar agora" (/wa-fila) — 15/09/2026.
// Achado ao vivo: envio manual via /mensagens fora da janela 08h-20h BRT fica
// preso na fila (não é prioritario) sem nenhuma visibilidade de quais mensagens
// estão presas nem opção de forçar o envio. listarFilaDetalhada() expõe a fila
// de forma serializável (nunca vazando resolve/reject/tenant); forcarDisparoImediato()
// é um escape hatch administrativo que ignora TODAS as proteções (janela, rate
// limit/hora, limite diário, circuit breaker, bloqueio por reputação, dedup) —
// decisão consciente do Rogério.
jest.mock('../src/services/waWatchdogService', () => ({
  enviarMensagemWA: jest.fn().mockResolvedValue(undefined),
  isSuspensa: jest.fn().mockReturnValue(false),
}));
jest.mock('../src/services/waReputacao', () => ({
  estaBloqueado: jest.fn().mockReturnValue(false),
  registrarSucesso: jest.fn(),
  registrarFalha: jest.fn().mockReturnValue(false),
  listarInstancia: jest.fn().mockReturnValue([]),
}));
jest.mock('../src/lib/wa/index', () => ({
  getProviderKey: jest.fn(tenant => tenant.evolutionInstance || tenant.slug),
}));

const { enviarMensagemWA, isSuspensa } = require('../src/services/waWatchdogService');
const rep = require('../src/services/waReputacao');
const {
  enfileirar,
  statsInstancia,
  listarFilaDetalhada,
  forcarDisparoImediato,
} = require('../src/services/waQueue');

function resetMocksParaPadrao() {
  jest.clearAllMocks();
  jest.useRealTimers();
  jest.restoreAllMocks();
  // clearAllMocks() não desfaz mockReturnValue setado em testes anteriores —
  // sem isso, `isSuspensa`/`estaBloqueado` continuariam `true` para os testes seguintes.
  isSuspensa.mockReturnValue(false);
  rep.estaBloqueado.mockReturnValue(false);
  rep.registrarFalha.mockReturnValue(false);
}

describe('waQueue — listarFilaDetalhada', () => {
  afterEach(resetMocksParaPadrao);

  test('retorna forma serializável, sem vazar resolve/reject/tenant', async () => {
    jest.useFakeTimers();
    jest.spyOn(Date.prototype, 'getHours').mockImplementation(() => 21); // fora da janela — fica presa

    const tenant = { id: 1, slug: 'teste-fila-detalhada', evolutionInstance: 'teste-fila-detalhada' };
    const mensagemLonga = 'x'.repeat(120);

    enfileirar(tenant, '5511988880001', mensagemLonga).catch(() => {});
    enfileirar(tenant, '5511988880002', 'curta', { prioritario: true }).catch(() => {});
    await jest.advanceTimersByTimeAsync(10);

    const itens = listarFilaDetalhada('teste-fila-detalhada');

    expect(itens).toHaveLength(2);
    const [item1, item2] = itens;

    expect(item1.telefone).toBe('5511988880001');
    expect(item1.preview).toBe('x'.repeat(80) + '…');
    expect(item1.prioritario).toBe(false);
    expect(typeof item1.id).toBe('number');
    expect(typeof item1.enqueuedAt).toBe('string');
    expect(typeof item1.aguardandoMs).toBe('number');
    expect(item1.etaStatus).toBe('estimado');
    expect(typeof item1.etaMs).toBe('number');

    expect(item2.prioritario).toBe(true);

    // Segurança: nunca vazar a Promise nem o tenant inteiro (evolutionApiKey etc).
    for (const item of itens) {
      expect(item.resolve).toBeUndefined();
      expect(item.reject).toBeUndefined();
      expect(item.tenant).toBeUndefined();
      expect(item.mensagem).toBeUndefined(); // só `preview`, nunca o corpo completo
    }
  });

  test('instância inexistente retorna [] sem criar entrada no Map', () => {
    expect(listarFilaDetalhada('instancia-nunca-usada-xyz')).toEqual([]);
    expect(statsInstancia('instancia-nunca-usada-xyz')).toBeNull();
  });

  test('etaStatus é "suspensa" quando o circuit breaker está suspenso', async () => {
    jest.useFakeTimers();
    jest.spyOn(Date.prototype, 'getHours').mockImplementation(() => 21);
    isSuspensa.mockReturnValue(true);

    const tenant = { id: 1, slug: 'teste-fila-suspensa', evolutionInstance: 'teste-fila-suspensa' };
    enfileirar(tenant, '5511988880003', 'msg').catch(() => {});
    await jest.advanceTimersByTimeAsync(10);

    const [item] = listarFilaDetalhada('teste-fila-suspensa');
    expect(item.etaStatus).toBe('suspensa');
    expect(item.etaMs).toBeNull();
  });
});

describe('waQueue — forcarDisparoImediato (escape hatch administrativo)', () => {
  afterEach(resetMocksParaPadrao);

  test('dispara imediatamente ignorando a janela horária (fora de 8h-20h)', async () => {
    jest.useFakeTimers();
    jest.spyOn(Date.prototype, 'getHours').mockImplementation(() => 21);

    const tenant = { id: 1, slug: 'forcar-janela', evolutionInstance: 'forcar-janela' };
    enfileirar(tenant, '5511988880010', 'preso na janela').catch(() => {});
    await jest.advanceTimersByTimeAsync(10);

    const [item] = listarFilaDetalhada('forcar-janela');
    const resultado = await forcarDisparoImediato('forcar-janela', item.id);

    expect(resultado.ok).toBe(true);
    expect(enviarMensagemWA).toHaveBeenCalledWith(tenant, '5511988880010', 'preso na janela');
    expect(listarFilaDetalhada('forcar-janela')).toHaveLength(0);
  });

  test('dispara imediatamente ignorando rate limit/hora e limite diário', async () => {
    jest.useFakeTimers();
    jest.spyOn(Date.prototype, 'getHours').mockImplementation(() => 10); // dentro da janela

    const tenant = { id: 1, slug: 'forcar-rate-limit', evolutionInstance: 'forcar-rate-limit' };

    // Lota o rate limit/hora (30) e o limite diário processando mensagens normais.
    for (let i = 0; i < 30; i++) {
      const p = enfileirar(tenant, `5511987000${i}`, 'lote');
      await jest.advanceTimersByTimeAsync(20_000);
      await p;
    }
    expect(enviarMensagemWA).toHaveBeenCalledTimes(30);

    // A próxima mensagem fica presa esperando o reset da hora.
    enfileirar(tenant, '5511988880099', 'presa no rate limit').catch(() => {});
    await jest.advanceTimersByTimeAsync(100);
    expect(listarFilaDetalhada('forcar-rate-limit')).toHaveLength(1);

    const [item] = listarFilaDetalhada('forcar-rate-limit');
    const resultado = await forcarDisparoImediato('forcar-rate-limit', item.id);

    expect(resultado.ok).toBe(true);
    expect(enviarMensagemWA).toHaveBeenCalledWith(tenant, '5511988880099', 'presa no rate limit');
    expect(enviarMensagemWA).toHaveBeenCalledTimes(31);
  });

  test('dispara imediatamente mesmo com a instância suspensa pelo circuit breaker', async () => {
    jest.useFakeTimers();
    // Fora da janela: o item fica parado no gate de horário ANTES de chegar no
    // check de isSuspensa do processQueue normal — necessário pra ter um item
    // "parado" pra forçar (dentro da janela ele seria processado/rejeitado
    // sincronamente pelo loop normal antes do teste conseguir pegá-lo).
    jest.spyOn(Date.prototype, 'getHours').mockImplementation(() => 21);
    isSuspensa.mockReturnValue(true);

    const tenant = { id: 1, slug: 'forcar-suspensa', evolutionInstance: 'forcar-suspensa' };
    enfileirar(tenant, '5511988880020', 'presa por suspensao').catch(() => {});
    await jest.advanceTimersByTimeAsync(10);

    const [item] = listarFilaDetalhada('forcar-suspensa');
    const resultado = await forcarDisparoImediato('forcar-suspensa', item.id);

    expect(resultado.ok).toBe(true);
    expect(enviarMensagemWA).toHaveBeenCalledWith(tenant, '5511988880020', 'presa por suspensao');
  });

  test('dispara imediatamente mesmo com o número bloqueado por reputação', async () => {
    jest.useFakeTimers();
    jest.spyOn(Date.prototype, 'getHours').mockImplementation(() => 21); // fora da janela — item fica parado
    rep.estaBloqueado.mockReturnValue(true);

    const tenant = { id: 1, slug: 'forcar-reputacao', evolutionInstance: 'forcar-reputacao' };
    enfileirar(tenant, '5511988880030', 'numero bloqueado').catch(() => {});
    await jest.advanceTimersByTimeAsync(10);

    const [item] = listarFilaDetalhada('forcar-reputacao');
    const resultado = await forcarDisparoImediato('forcar-reputacao', item.id);

    expect(resultado.ok).toBe(true);
    expect(enviarMensagemWA).toHaveBeenCalledWith(tenant, '5511988880030', 'numero bloqueado');
    expect(rep.registrarSucesso).toHaveBeenCalledWith('forcar-reputacao', '5511988880030');
  });

  test('não duplica envio nem quebra o resto da fila — dispara a do meio, deixa as outras seguirem o fluxo normal', async () => {
    jest.useFakeTimers();
    let horaAtual = 21; // fora da janela — todas ficam presas inicialmente
    jest.spyOn(Date.prototype, 'getHours').mockImplementation(() => horaAtual);

    const tenant = { id: 1, slug: 'forcar-meio-da-fila', evolutionInstance: 'forcar-meio-da-fila' };
    const p1 = enfileirar(tenant, '5511988880041', 'primeira');
    const p2 = enfileirar(tenant, '5511988880042', 'meio');
    const p3 = enfileirar(tenant, '5511988880043', 'terceira');
    await jest.advanceTimersByTimeAsync(10);

    const itens = listarFilaDetalhada('forcar-meio-da-fila');
    const doMeio = itens.find(i => i.telefone === '5511988880042');

    const resultado = await forcarDisparoImediato('forcar-meio-da-fila', doMeio.id);
    expect(resultado.ok).toBe(true);
    expect(enviarMensagemWA).toHaveBeenCalledTimes(1);

    horaAtual = 9; // janela abre — as outras duas seguem o fluxo normal
    await jest.advanceTimersByTimeAsync(60_000); // acorda o loop e processa item1 (primeiro da fila)
    await jest.advanceTimersByTimeAsync(20_000); // delay aleatório (7-20s) até processar item3

    await p1;
    await p3;
    await expect(p2).resolves.toBeUndefined();

    expect(enviarMensagemWA).toHaveBeenCalledTimes(3);
    expect(enviarMensagemWA).toHaveBeenCalledWith(tenant, '5511988880041', 'primeira');
    expect(enviarMensagemWA).toHaveBeenCalledWith(tenant, '5511988880043', 'terceira');
  });

  test('isolamento multi-tenant: id de outra instância nunca é encontrado', async () => {
    jest.useFakeTimers();
    jest.spyOn(Date.prototype, 'getHours').mockImplementation(() => 21);

    const tenantA = { id: 1, slug: 'instancia-a', evolutionInstance: 'instancia-a' };
    enfileirar(tenantA, '5511988880050', 'da instancia a').catch(() => {});
    await jest.advanceTimersByTimeAsync(10);

    const [itemA] = listarFilaDetalhada('instancia-a');

    const resultado = await forcarDisparoImediato('instancia-b-nunca-existiu', itemA.id);
    expect(resultado).toEqual({ ok: false, motivo: 'fila_nao_encontrada' });

    // Mesmo criando a instância B (com outro item), o id de A não existe lá.
    const tenantB = { id: 2, slug: 'instancia-b', evolutionInstance: 'instancia-b' };
    enfileirar(tenantB, '5511988880051', 'da instancia b').catch(() => {});
    await jest.advanceTimersByTimeAsync(10);

    const resultado2 = await forcarDisparoImediato('instancia-b', itemA.id);
    expect(resultado2).toEqual({ ok: false, motivo: 'item_nao_encontrado' });
  });

  test('id inexistente na mesma instância retorna item_nao_encontrado', async () => {
    const tenant = { id: 1, slug: 'forcar-id-invalido', evolutionInstance: 'forcar-id-invalido' };
    // Precisa existir a fila (Map) — força criação enfileirando e deixando processar.
    jest.spyOn(Date.prototype, 'getHours').mockImplementation(() => 10);
    await enfileirar(tenant, '5511988880060', 'processada normalmente');

    const resultado = await forcarDisparoImediato('forcar-id-invalido', 999999);
    expect(resultado).toEqual({ ok: false, motivo: 'item_nao_encontrado' });
  });

  test('bounce do destinatário resolve a Promise original sem propagar erro', async () => {
    jest.useFakeTimers();
    jest.spyOn(Date.prototype, 'getHours').mockImplementation(() => 21); // fora da janela — item fica parado
    enviarMensagemWA.mockRejectedValueOnce(new Error('invalid number'));
    rep.registrarFalha.mockReturnValueOnce(false);

    const tenant = { id: 1, slug: 'forcar-bounce', evolutionInstance: 'forcar-bounce' };
    const promise = enfileirar(tenant, '5511988880070', 'vai dar bounce');
    await jest.advanceTimersByTimeAsync(10);

    const [item] = listarFilaDetalhada('forcar-bounce');
    const resultado = await forcarDisparoImediato('forcar-bounce', item.id);

    expect(resultado.ok).toBe(true);
    expect(resultado.aviso).toBe('bounce_destinatario');
    await expect(promise).resolves.toBeUndefined();
    expect(rep.registrarFalha).toHaveBeenCalledWith('forcar-bounce', '5511988880070');
  });

  test('erro de instância/rede rejeita a Promise original', async () => {
    jest.useFakeTimers();
    jest.spyOn(Date.prototype, 'getHours').mockImplementation(() => 21); // fora da janela — item fica parado
    enviarMensagemWA.mockRejectedValueOnce(new Error('timeout de rede'));

    const tenant = { id: 1, slug: 'forcar-erro-rede', evolutionInstance: 'forcar-erro-rede' };
    const promise = enfileirar(tenant, '5511988880080', 'vai dar erro de rede');
    promise.catch(() => {}); // evita unhandled rejection antes do assert
    await jest.advanceTimersByTimeAsync(10);

    const [item] = listarFilaDetalhada('forcar-erro-rede');
    const resultado = await forcarDisparoImediato('forcar-erro-rede', item.id);

    expect(resultado.ok).toBe(false);
    expect(resultado.motivo).toBe('erro_instancia');
    await expect(promise).rejects.toThrow('timeout de rede');
  });
});
