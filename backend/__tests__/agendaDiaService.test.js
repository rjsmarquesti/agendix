jest.mock('../src/lib/prisma', () => ({
  configuracaoAgenda: { findMany: jest.fn(), update: jest.fn() },
  agendamento: { findMany: jest.fn() },
  user: { findMany: jest.fn() },
}));
jest.mock('../src/lib/mailer', () => ({ enviarEmailTenant: jest.fn() }));
jest.mock('../src/services/waQueue', () => ({
  enfileirar: jest.fn(),
  registrarEnvioDireto: jest.fn(),
}));

const prisma = require('../src/lib/prisma');
const { enviarEmailTenant } = require('../src/lib/mailer');
const { executarAgendaDia } = require('../src/services/agendaDiaService');

const tenant = { id: 1, slug: 'acme', nome: 'Acme' };
const config = {
  tenantId: 1, tenant, agendaDiaAtivo: true, agendaDiaEmailAtivo: true,
  agendaDiaHorario: '12:00', agendaDiaEnviadoEm: null,
};

let errorSpy;

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(new Date('2026-09-23T12:00:00'));
  jest.clearAllMocks();
  errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  prisma.configuracaoAgenda.findMany.mockResolvedValue([config]);
  prisma.configuracaoAgenda.update.mockResolvedValue({});
  prisma.agendamento.findMany.mockResolvedValue([]);
  prisma.user.findMany.mockResolvedValue([{ email: 'a@acme.com', whatsapp: null, nome: 'A' }]);
});

afterEach(() => {
  jest.useRealTimers();
  errorSpy.mockRestore();
});

describe('agendaDiaService — envio de e-mail', () => {
  test('envia com origem "agenda_dia" e marca o dia como enviado', async () => {
    enviarEmailTenant.mockResolvedValue();
    await executarAgendaDia();
    expect(enviarEmailTenant).toHaveBeenCalledWith(tenant, expect.objectContaining({
      para: 'a@acme.com', origem: 'agenda_dia',
    }));
    expect(prisma.configuracaoAgenda.update).toHaveBeenCalledTimes(1);
  });

  test('falha em todos os envios: loga o erro e NÃO marca como enviado', async () => {
    enviarEmailTenant.mockRejectedValue(new Error('535 auth failed'));
    await executarAgendaDia();
    expect(prisma.configuracaoAgenda.update).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('acme'), expect.stringContaining('535'));
  });

  test('um destinatário falha e outro funciona: marca como enviado', async () => {
    prisma.user.findMany.mockResolvedValue([
      { email: 'a@acme.com', whatsapp: null, nome: 'A' },
      { email: 'b@acme.com', whatsapp: null, nome: 'B' },
    ]);
    enviarEmailTenant.mockRejectedValueOnce(new Error('falhou')).mockResolvedValueOnce();
    await executarAgendaDia();
    expect(prisma.configuracaoAgenda.update).toHaveBeenCalledTimes(1);
  });
});
