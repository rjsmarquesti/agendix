require('dotenv').config();
const prisma = require('../lib/prisma');

beforeEach(async () => {
  // Limpa em ordem de FK (filhos antes de pais)
  await prisma.conversaWhatsapp.deleteMany({ where: { tenant: { slug: { startsWith: 'test-' } } } });
  await prisma.agendamento.deleteMany({ where: { tenant: { slug: { startsWith: 'test-' } } } });
  await prisma.servico.deleteMany({ where: { tenant: { slug: { startsWith: 'test-' } } } });
  await prisma.bloqueioHorario.deleteMany({ where: { tenant: { slug: { startsWith: 'test-' } } } });
  await prisma.lead.deleteMany({ where: { tenant: { slug: { startsWith: 'test-' } } } });
  await prisma.configuracaoAgenda.deleteMany({ where: { tenant: { slug: { startsWith: 'test-' } } } });
  await prisma.user.deleteMany({ where: { tenant: { slug: { startsWith: 'test-' } } } });
  await prisma.tenant.deleteMany({ where: { slug: { startsWith: 'test-' } } });
});

afterAll(async () => {
  await prisma.$disconnect();
});
