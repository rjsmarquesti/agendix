const prisma = require('../lib/prisma');

// Extraído de routes/webhook.js (era só inline no fallback humano) — reusado
// também pelo menu inicial de roteamento (botAgendamentoService.js), quando o
// cliente escolhe "falar com atendente" em vez de cair aqui como último recurso.
async function encaminharParaFilaHumana(tenant, telefoneNorm, clienteNome, mensagemTexto) {
  let fila = await prisma.waFila.findFirst({
    where: { tenantId: tenant.id, clienteTelefone: telefoneNorm, status: { in: ['aguardando', 'em_atendimento'] } },
  });
  if (!fila) {
    const atendentes = await prisma.waAtendente.findMany({
      where: { tenantId: tenant.id, ativo: true },
      orderBy: { cargaAtual: 'asc' },
    });
    const atendente = atendentes.find(a => a.cargaAtual < a.cargaMaxima) || null;
    fila = await prisma.waFila.create({
      data: {
        tenantId: tenant.id,
        clienteTelefone: telefoneNorm,
        clienteNome,
        atendenteId: atendente?.id || null,
        status: atendente ? 'em_atendimento' : 'aguardando',
      },
    });
    if (atendente) {
      await prisma.waAtendente.update({ where: { id: atendente.id }, data: { cargaAtual: { increment: 1 } } });
    }
    prisma.notificacao.create({
      data: {
        tenantId: tenant.id,
        tipo:    'wa_fila_nova',
        titulo:  '💬 Nova sessão na fila de atendimento',
        corpo:   `${clienteNome} (${telefoneNorm}) entrou na fila${atendente ? ` e foi atribuído a ${atendente.nome}` : ' aguardando atendente'}.`,
      },
    }).catch(() => {});
  }

  // Registra a mensagem em si — sem isso, "Ver conversa" fica sempre vazio
  // (a fila só era criada/notificada na 1ª mensagem; mensagens seguintes do
  // mesmo cliente numa sessão já aberta não deixavam rastro nenhum).
  await prisma.waConversaLog.create({
    data: {
      filaId:      fila.id,
      tenantId:    tenant.id,
      direcao:     'entrada',
      deTelefone:  telefoneNorm,
      paraTelefone: tenant.evolutionInstance || tenant.slug,
      mensagem:    mensagemTexto,
      atendenteId: null,
      fonte:       'cliente',
    },
  }).catch(err => console.error('[wa_atendimento] falha ao logar mensagem de entrada:', err.message));

  return fila;
}

module.exports = { encaminharParaFilaHumana };
