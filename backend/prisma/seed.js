const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  // Super admin (sem tenant)
  const superAdmin = await prisma.user.findFirst({ where: { role: 'super_admin' } });
  if (!superAdmin) {
    const senha = await bcrypt.hash('An@Beatriz270172', 10);
    await prisma.user.create({
      data: { nome: 'Super Admin', email: 'suporte@divulgabr.com.br', senha, role: 'super_admin', tenantId: null },
    });
    console.log('✅ Super Admin criado: suporte@divulgabr.com.br');
  } else if (superAdmin.email !== 'suporte@divulgabr.com.br') {
    const senha = await bcrypt.hash('An@Beatriz270172', 10);
    await prisma.user.update({
      where: { id: superAdmin.id },
      data: { email: 'suporte@divulgabr.com.br', senha },
    });
    console.log('✅ Super Admin atualizado: suporte@divulgabr.com.br');
  }

  // Tenant demo
  let tenant = await prisma.tenant.findUnique({ where: { slug: 'demo' } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        nome: 'Empresa Demo',
        slug: 'demo',
        corPrimaria: '#2563eb',
        plano: 'pro',
        modulos: ['leads', 'agendamentos'],
      },
    });
    console.log('✅ Tenant "demo" criado');
  }

  // Admin do tenant demo
  const adminExiste = await prisma.user.findFirst({ where: { email: 'admin@crm.com', tenantId: tenant.id } });
  if (!adminExiste) {
    const senha = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: { nome: 'Administrador', email: 'admin@crm.com', senha, role: 'admin', tenantId: tenant.id },
    });
    console.log('✅ Admin demo criado: admin@crm.com / admin123');
  }

  // Leads de exemplo
  const totalLeads = await prisma.lead.count({ where: { tenantId: tenant.id } });
  if (totalLeads === 0) {
    const leads = await prisma.lead.createMany({
      data: [
        { tenantId: tenant.id, nome: 'Maria Silva',    telefone: '(11) 98765-4321', email: 'maria@email.com',    origem: 'Instagram', status: 'novo',       observacoes: 'Interessada no plano básico' },
        { tenantId: tenant.id, nome: 'João Santos',    telefone: '(11) 91234-5678', email: 'joao@email.com',     origem: 'Indicação', status: 'contato',    observacoes: 'Preferir contato pela manhã' },
        { tenantId: tenant.id, nome: 'Ana Costa',      telefone: '(21) 99999-1111', email: 'ana@email.com',      origem: 'Site',      status: 'agendado',   observacoes: 'Agendou consulta para segunda' },
        { tenantId: tenant.id, nome: 'Carlos Lima',    telefone: '(31) 98888-2222', email: null,                 origem: 'WhatsApp',  status: 'convertido', observacoes: 'Fechou contrato em março' },
        { tenantId: tenant.id, nome: 'Fernanda Rocha', telefone: '(41) 97777-3333', email: 'fernanda@email.com', origem: 'Google',    status: 'perdido',    observacoes: 'Desistiu após proposta' },
      ],
    });
    console.log(`✅ ${leads.count} leads criados`);

    const hoje = new Date().toISOString().split('T')[0];
    const amanha = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const lead1 = await prisma.lead.findFirst({ where: { tenantId: tenant.id, nome: 'Ana Costa' } });
    const lead2 = await prisma.lead.findFirst({ where: { tenantId: tenant.id, nome: 'Maria Silva' } });
    const lead3 = await prisma.lead.findFirst({ where: { tenantId: tenant.id, nome: 'João Santos' } });

    await prisma.agendamento.createMany({
      data: [
        { tenantId: tenant.id, leadId: lead1.id, data: hoje,   hora: '09:00', tipo: 'Consulta', status: 'confirmado', canalOrigem: 'manual',    observacoes: 'Primeira consulta presencial' },
        { tenantId: tenant.id, leadId: lead2.id, data: hoje,   hora: '14:30', tipo: 'Reunião',  status: 'marcado',    canalOrigem: 'web',       observacoes: 'Apresentar proposta' },
        { tenantId: tenant.id, leadId: lead3.id, data: amanha, hora: '10:00', tipo: 'Ligação',  status: 'marcado',    canalOrigem: 'whatsapp',  observacoes: 'Follow-up' },
      ],
    });
    console.log('✅ Agendamentos criados');
  }

  // ConfiguracaoAgenda padrão para o tenant demo
  const configExiste = await prisma.configuracaoAgenda.findUnique({ where: { tenantId: tenant.id } });
  if (!configExiste) {
    await prisma.configuracaoAgenda.create({
      data: {
        tenantId: tenant.id,
        horarioInicio: '08:00',
        horarioFim: '18:00',
        duracaoSlot: 60,
        diasUteis: '1,2,3,4,5',
        antecedenciaMin: 2,
        antecedenciaMax: 30,
        mensagemConfirmacao: 'Entraremos em contato para confirmar sua presença. Até lá!',
        ativo: true,
      },
    });
    console.log('✅ ConfiguracaoAgenda criada para tenant demo');
  }

  // Serviços de exemplo para o tenant demo
  const totalServicos = await prisma.servico.count({ where: { tenantId: tenant.id } });
  if (totalServicos === 0) {
    await prisma.servico.createMany({
      data: [
        { tenantId: tenant.id, nome: 'Consulta',   descricao: 'Consulta inicial de 60 minutos',    duracaoMin: 60,  preco: null,   ordem: 1 },
        { tenantId: tenant.id, nome: 'Retorno',    descricao: 'Retorno rápido de acompanhamento',  duracaoMin: 30,  preco: null,   ordem: 2 },
        { tenantId: tenant.id, nome: 'Avaliação',  descricao: 'Avaliação completa 90 minutos',     duracaoMin: 90,  preco: 150.00, ordem: 3 },
      ],
    });
    console.log('✅ Serviços criados para tenant demo');
  }

  // Bloqueio de exemplo (Dia do Trabalho)
  const bloqueioExiste = await prisma.bloqueioHorario.findFirst({ where: { tenantId: tenant.id, data: '2026-05-01' } });
  if (!bloqueioExiste) {
    await prisma.bloqueioHorario.create({
      data: { tenantId: tenant.id, data: '2026-05-01', motivo: 'Feriado — Dia do Trabalho' },
    });
    console.log('✅ Bloqueio de feriado criado');
  }
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
