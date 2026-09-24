require('../src/test/setup');

// setWebhook() precisa bater com o contrato real da instância Evolution API
// (fork "evolution_exchange" v2.3.7) rodando em produção: POST (PUT dá 404) +
// corpo aninhado sob "webhook" (a doc oficial genérica da 2.3.7 documenta corpo
// flat, mas essa instância real rejeita flat com 'instance requires property
// "webhook"' — confirmado ao vivo contra produção, tenant divulgabr).
const { setWebhook } = require('../src/services/evolutionService');

describe('evolutionService.setWebhook — contrato Evolution API v2.3.7', () => {
  let fetchSpy;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true, message: 'Webhook configured successfully' }),
    });
  });

  afterEach(() => fetchSpy.mockRestore());

  test('usa POST (não PUT) em /webhook/set/:instance', async () => {
    await setWebhook('divulgabr', null, 'https://agendix.divulgabr.com.br/api/webhook/agente/divulgabr');

    const [url, options] = fetchSpy.mock.calls[0];
    expect(url).toMatch(/\/webhook\/set\/divulgabr$/);
    expect(options.method).toBe('POST');
  });

  test('envia corpo aninhado sob "webhook" (enabled/url/events/base64)', async () => {
    await setWebhook('divulgabr', null, 'https://agendix.divulgabr.com.br/api/webhook/agente/divulgabr');

    const [, options] = fetchSpy.mock.calls[0];
    const body = JSON.parse(options.body);

    expect(body).toEqual({
      webhook: {
        enabled: true,
        url: 'https://agendix.divulgabr.com.br/api/webhook/agente/divulgabr',
        base64: false,
        events: ['MESSAGES_UPSERT', 'CONNECTION_UPDATE'],
      },
    });
  });

  test('em erro, usa data.error.message (formato v2.3.7) quando data.message não existe', async () => {
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Invalid request data. Webhook configuration is invalid.' },
      }),
    });

    await expect(
      setWebhook('divulgabr', null, 'https://agendix.divulgabr.com.br/api/webhook/agente/divulgabr')
    ).rejects.toThrow('Invalid request data. Webhook configuration is invalid.');
  });

  test('em erro, junta data.message quando vem como array (padrão de validação NestJS)', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ statusCode: 400, message: ['events must be an array'], error: 'Bad Request' }),
    });

    await expect(
      setWebhook('divulgabr', null, 'https://agendix.divulgabr.com.br/api/webhook/agente/divulgabr')
    ).rejects.toThrow('events must be an array');
  });

  test('em erro, usa data.response.message (formato real observado em produção nessa instância)', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    fetchSpy.mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({
        status: 400,
        error: 'Bad Request',
        response: { message: ['headers should not exist'], error: 'Bad Request', statusCode: 400 },
      }),
    });

    await expect(
      setWebhook('divulgabr', null, 'https://agendix.divulgabr.com.br/api/webhook/agente/divulgabr')
    ).rejects.toThrow('headers should not exist');
  });
});
