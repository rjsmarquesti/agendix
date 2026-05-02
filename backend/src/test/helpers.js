const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

// Data futura suficiente para passar na antecedência mínima
function dataFutura(diasAFrente = 5) {
  const d = new Date();
  d.setDate(d.getDate() + diasAFrente);
  // Garante que é dia útil (segunda a sexta)
  while ([0, 6].includes(d.getDay())) d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

async function criarTenantComUser(slugSuffix = '') {
  const slug = `test-${Date.now()}${slugSuffix}`;
  const apiToken = `tok-${Math.random().toString(36).slice(2)}`;
  const tenant = await prisma.tenant.create({
    data: { nome: 'Tenant Teste', slug, corPrimaria: '#2563eb', plano: 'pro', modulos: ['leads', 'agendamentos'], apiToken, ativo: true },
  });
  const senha = await bcrypt.hash('senha123', 10);
  const user = await prisma.user.create({
    data: { nome: 'Admin Teste', email: `admin-${slug}@test.com`, senha, role: 'admin', tenantId: tenant.id },
  });
  const token = jwt.sign({ userId: user.id, tenantId: tenant.id, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '1h' });
  return { tenant, user, token, apiToken };
}

async function criarConfigAgenda(tenantId, overrides = {}) {
  return prisma.configuracaoAgenda.create({
    data: {
      tenantId,
      horarioInicio: '08:00',
      horarioFim: '18:00',
      duracaoSlot: 60,
      diasUteis: '1,2,3,4,5',
      antecedenciaMin: 0,
      antecedenciaMax: 60,
      ativo: true,
      ...overrides,
    },
  });
}

module.exports = { dataFutura, criarTenantComUser, criarConfigAgenda };
