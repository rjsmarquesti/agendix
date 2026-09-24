const prisma = require('../lib/prisma');
const { getSlots } = require('./disponibilidadeService');
const { LIMITE_AGENDAMENTOS } = require('../config/planos');
// Usa a fila Sprint 3 — janela 08-20h, dedup, circuit breaker, reputação
const { enfileirar, registrarEnvioDireto } = require('./waQueue');
const { getWaProvider, getProviderKey } = require('../lib/wa/index');
const { registrar: logMensagem } = require('../lib/mensagemLog');
const { callClaude } = require('./agentService');

const TTL_MS = 30 * 60 * 1000; // 30 minutos

// ─── Envio via waQueue (anti-ban) ────────────────────────────────────────────

async function sendWA(tenant, phone, text, { leadId, origem } = {}) {
  // Resposta a conversa que o próprio cliente iniciou agora — pula a janela
  // horária da fila anti-ban (essa proteção é pra disparo em massa, não reply).
  // `enfileirar` (waQueue.js) resolve a Promise SEM VALOR em todo caminho de
  // sucesso (envio ok, bounce, dedup, bloqueio de reputação) e só rejeita em
  // falha real — nunca resolve com `{ ok }`. Não desestruturar o resultado.
  await enfileirar(tenant, phone, text, { prioritario: true });
  logMensagem({ tenantId: tenant.id, leadId: leadId || null, meio: 'whatsapp', para: phone, corpo: text, origem: origem || 'confirmacao' });
  return { ok: true };
}

async function sendWAList(tenant, phone, slots, data) {
  const emojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟',
                  '1️⃣1️⃣','1️⃣2️⃣','1️⃣3️⃣','1️⃣4️⃣','1️⃣5️⃣','1️⃣6️⃣','1️⃣7️⃣','1️⃣8️⃣','1️⃣9️⃣','2️⃣0️⃣',
                  '2️⃣1️⃣','2️⃣2️⃣','2️⃣3️⃣','2️⃣4️⃣','2️⃣5️⃣','2️⃣6️⃣','2️⃣7️⃣','2️⃣8️⃣','2️⃣9️⃣','3️⃣0️⃣','3️⃣1️⃣'];

  // Fora de 08h-20h BRT usa lista em texto simples em vez do template rico da
  // Evolution (só estética — o envio em si já é prioritário e sai na hora,
  // ver sendWA). Depende do container rodar com TZ=America/Sao_Paulo.
  const hora = new Date().getHours();
  if (hora < 8 || hora >= 20) {
    // Fora da janela — usa fallback de texto simples (já passa pelo waQueue com delay correto)
    const lista = slots.map((s, i) => `${emojis[i] || (i + 1) + '.'} ${s}`).join('\n');
    await sendWA(tenant, phone, `📅 Horários disponíveis para *${formatDataBR(data)}*:\n\n${lista}\n\nDigite o número ou o horário desejado.`);
    return;
  }

  // Verifica hard limit e rate limit antes de enviar via adapter
  const instanceKey = getProviderKey(tenant);
  if (!registrarEnvioDireto(instanceKey)) {
    const lista = slots.map((s, i) => `${emojis[i] || (i + 1) + '.'} ${s}`).join('\n');
    await sendWA(tenant, phone, `📅 Horários disponíveis para *${formatDataBR(data)}*:\n\n${lista}\n\nDigite o número ou o horário desejado.`);
    return;
  }

  let ok = false;
  try {
    const adapter = getWaProvider(tenant);
    await adapter.sendList(phone, slots, formatDataBR(data));
    ok = true;
  } catch (e) {
    console.error('[sendWAList] erro:', e.message);
  }

  // Fallback para texto simples se sendList falhar
  if (!ok) {
    const lista = slots.map((s, i) => `${emojis[i] || (i + 1) + '.'} ${s}`).join('\n');
    await sendWA(tenant, phone, `📅 Horários disponíveis para *${formatDataBR(data)}*:\n\n${lista}\n\nDigite o número ou o horário desejado.`);
  }
}

// ─── Conversa (CRUD) ─────────────────────────────────────────────────────────

async function getConversa(tenantId, phone) {
  const c = await prisma.conversaWhatsapp.findUnique({
    where: { telefone_tenantId: { telefone: phone, tenantId } },
  });
  if (!c) return null;
  if (new Date() > c.expiresAt) {
    await prisma.conversaWhatsapp.delete({ where: { telefone_tenantId: { telefone: phone, tenantId } } });
    return null;
  }
  return c;
}

async function saveConversa(tenantId, phone, estado, dadosJson) {
  const expiresAt = new Date(Date.now() + TTL_MS);
  return prisma.conversaWhatsapp.upsert({
    where:  { telefone_tenantId: { telefone: phone, tenantId } },
    update: { estado, dadosJson, expiresAt },
    create: { tenantId, telefone: phone, estado, dadosJson, expiresAt },
  });
}

async function deleteConversa(tenantId, phone) {
  await prisma.conversaWhatsapp.deleteMany({ where: { tenantId, telefone: phone } });
}

// ─── Parsers de entrada ───────────────────────────────────────────────────────

function parseData(text) {
  const t = text.trim().toLowerCase();
  const hoje = new Date();

  if (/^amanh[aã]$/.test(t)) {
    const d = new Date(hoje); d.setDate(d.getDate() + 1);
    return toISO(d);
  }
  if (/^hoje$/.test(t)) return toISO(hoje);

  // DD/MM ou DD-MM
  const dmMatch = t.match(/^(\d{1,2})[\/\-](\d{1,2})$/);
  if (dmMatch) {
    const [, d, m] = dmMatch;
    return `${hoje.getFullYear()}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }

  // DD/MM/AAAA ou DD-MM-AAAA
  const dmaMatch = t.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmaMatch) {
    const [, d, m, a] = dmaMatch;
    return `${a}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }

  // AAAA-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;

  return null;
}

function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDataBR(iso) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function parseSlot(text, slots) {
  const t = text.trim();
  // número ordinal
  const num = parseInt(t, 10);
  if (!isNaN(num) && num >= 1 && num <= slots.length) return slots[num - 1];
  // horário direto (HH:MM)
  const horario = t.match(/^(\d{1,2}):(\d{2})$/);
  if (horario) {
    const h = horario[1].padStart(2, '0');
    const norm = `${h}:${horario[2]}`;
    if (slots.includes(norm)) return norm;
  }
  return null;
}

function isSim(text) {
  return /(^|\s)(s|sim|yes|confirmo|ok|isso|certo|pode|quero|vamos)(\s|$)/i.test(text);
}

function isNao(text) {
  return /(^|\s)(n|não|nao|cancel|cancelar|desistir|pare|sair)(\s|$)/i.test(text);
}

function isAgendarIntent(text) {
  return /(agendar|marcar|quero\s+um\s+horário|horário|reservar|consulta|atendimento)/i.test(text);
}

function isCancelarIntent(text) {
  return /(cancelar|desmarcar|n[ãa]o\s+vou\s+poder)/i.test(text);
}

function isConsultarIntent(text) {
  return /(meu\s+hor[aá]rio|quando\s+[eé]|meu\s+agendamento|marcado\s+pr?a)/i.test(text);
}

// Classificação de intenção em linguagem livre via LLM — só chamada quando os
// regex acima já falharam, pra manter custo/latência baixos (mesmo padrão de
// fallback em camadas usado em handleInboundMessage: bot → agente IA → fila humana).
async function classificarIntencaoLLM(text) {
  try {
    const resposta = await callClaude(
      'Classifique a intenção do cliente numa dessas 4 palavras, responda só a palavra: agendar, cancelar, consultar, outros.',
      [{ role: 'user', content: text }]
    );
    const intent = resposta.trim().toLowerCase().replace(/[^a-zà-ú]/g, '');
    if (['agendar', 'cancelar', 'consultar', 'outros'].includes(intent)) return intent;
    return 'outros';
  } catch {
    return 'outros';
  }
}

// ─── Criação do agendamento ───────────────────────────────────────────────────

async function criarAgendamento(tenant, dados) {
  const { nome, telefone, data, hora, servicoId, servicoNome } = dados;
  const plano = tenant.plano || 'solo';
  const limite = LIMITE_AGENDAMENTOS[plano] ?? 100;

  if (limite !== Infinity) {
    const mes = data.substring(0, 7); // YYYY-MM
    const count = await prisma.agendamento.count({
      where: { tenantId: tenant.id, data: { startsWith: mes }, status: { in: ['marcado','confirmado'] } },
    });
    if (count >= limite) throw new Error('limite_plano');
  }

  return prisma.$transaction(async (tx) => {
    const conflito = await tx.agendamento.findFirst({
      where: { tenantId: tenant.id, data, hora, status: { in: ['marcado','confirmado'] } },
    });
    if (conflito) throw new Error('slot_ocupado');

    let lead = await tx.lead.findFirst({ where: { tenantId: tenant.id, telefone } });
    if (!lead) {
      lead = await tx.lead.create({
        data: { tenantId: tenant.id, nome, telefone, status: 'novo', origem: 'WhatsApp Bot' },
      });
    }

    return tx.agendamento.create({
      data: {
        tenantId: tenant.id,
        leadId:   lead.id,
        data,
        hora,
        tipo:        servicoNome || 'Agendamento',
        status:      'marcado',
        canalOrigem: 'whatsapp',
        servicoId:   servicoId || null,
      },
    });
  });
}

// ─── Cancelar / Consultar próximo agendamento ────────────────────────────────

async function buscarProximoAgendamento(tenantId, phone) {
  const dataHoje = toISO(new Date());
  return prisma.agendamento.findFirst({
    where: {
      tenantId,
      status: { in: ['marcado', 'confirmado'] },
      data: { gte: dataHoje },
      lead: { telefone: phone },
    },
    orderBy: [{ data: 'asc' }, { hora: 'asc' }],
    include: { lead: { select: { nome: true, telefone: true } }, servico: { select: { nome: true } } },
  });
}

// ─── Mensagens padrão ─────────────────────────────────────────────────────────

function msgBoasVindas(tenantNome, servicos) {
  if (servicos.length > 0) {
    const lista = servicos.map((s, i) => `${i + 1}. ${s.nome}`).join('\n');
    return `Olá! 👋 Seja bem-vindo(a) à *${tenantNome}*!\n\nNossos serviços:\n${lista}\n\nDigite o número do serviço desejado ou "agendar" para continuar.`;
  }
  return `Olá! 👋 Seja bem-vindo(a) à *${tenantNome}*!\n\nPara agendar, me diga: qual data você prefere? (ex: amanhã, 15/06)`;
}

function msgEscolhaData(servicoNome) {
  return `Ótimo! *${servicoNome}* selecionado. 📅\n\nQual data você prefere?\n(ex: amanhã, 15/06, 20/06/2026)`;
}


function msgPedirNome() {
  return 'Perfeito! 😊 Qual o seu nome completo?';
}

function msgConfirmacao(dados) {
  const { nome, data, hora, servicoNome } = dados;
  return `Confirmação do agendamento:\n\n👤 Nome: *${nome}*\n📅 Data: *${formatDataBR(data)}*\n🕐 Horário: *${hora}*${servicoNome ? `\n💼 Serviço: *${servicoNome}*` : ''}\n\nConfirma? (sim/não)`;
}

function msgProximoAgendamento(ag) {
  const servico = ag.servico?.nome || ag.tipo || 'atendimento';
  return `📅 Seu próximo agendamento:\n\n🗓️ Data: *${formatDataBR(ag.data)}*\n🕐 Horário: *${ag.hora}*\n💼 Serviço: *${servico}*`;
}

function msgNenhumAgendamento() {
  return 'Não encontrei nenhum agendamento futuro no seu nome. Quer marcar um agora? É só me chamar! 😊';
}

function msgConfirmarCancelamento(ag) {
  const servico = ag.servico?.nome || ag.tipo || 'atendimento';
  return `Encontrei seu agendamento:\n\n🗓️ ${formatDataBR(ag.data)} às ${ag.hora}\n💼 ${servico}\n\nConfirma o cancelamento? (sim/não)`;
}

function msgCancelado() {
  return 'Pronto, seu agendamento foi cancelado. Se quiser marcar outro, é só chamar! 😊';
}

function msgAgendado(dados, config) {
  const base = config?.mensagemWaConfirmacao;
  if (base) {
    return base
      .replace('{{nome}}', dados.nome)
      .replace('{{data}}', formatDataBR(dados.data))
      .replace('{{hora}}', dados.hora)
      .replace('{{servico}}', dados.servicoNome || '');
  }
  return `✅ Agendamento confirmado!\n\n👤 ${dados.nome}\n📅 ${formatDataBR(dados.data)} às ${dados.hora}${dados.servicoNome ? `\n💼 ${dados.servicoNome}` : ''}\n\nTe esperamos! 😊`;
}

async function iniciarCancelamento(tenant, phone) {
  const ag = await buscarProximoAgendamento(tenant.id, phone);
  if (!ag) {
    await sendWA(tenant, phone, msgNenhumAgendamento());
    return true;
  }
  await saveConversa(tenant.id, phone, 'aguardando_confirmacao_cancelamento', { agendamentoId: ag.id });
  await sendWA(tenant, phone, msgConfirmarCancelamento(ag));
  return true;
}

async function responderConsulta(tenant, phone) {
  const ag = await buscarProximoAgendamento(tenant.id, phone);
  await sendWA(tenant, phone, ag ? msgProximoAgendamento(ag) : msgNenhumAgendamento());
  return true;
}

async function handleAguardandoConfirmacaoCancelamento(tenant, phone, text, conversa) {
  const { agendamentoId } = conversa.dadosJson || {};

  if (isSim(text)) {
    try {
      const result = await prisma.agendamento.updateMany({
        where: { id: agendamentoId, tenantId: tenant.id, status: { in: ['marcado', 'confirmado'] } },
        data: { status: 'cancelado' },
      });
      await deleteConversa(tenant.id, phone);
      if (result.count > 0) {
        await sendWA(tenant, phone, msgCancelado());
        // Notifica admin se configurado — best-effort (ver AP-029): falha aqui
        // nunca pode virar "erro ao cancelar" pro cliente, o cancelamento já
        // foi efetivado e confirmado a ele.
        const config = await prisma.configuracaoAgenda.findUnique({ where: { tenantId: tenant.id } });
        if (config?.whatsappAdmin) {
          sendWA(tenant, config.whatsappAdmin, `❌ Agendamento cancelado via WhatsApp pelo cliente ${phone}.`).catch(err => {
            console.error(`[botAgendamentoService] falha ao notificar admin (${config.whatsappAdmin}):`, err.message);
          });
        }
      } else {
        await sendWA(tenant, phone, 'Esse agendamento já não está mais ativo.');
      }
    } catch (err) {
      console.error(`[botAgendamentoService] handleAguardandoConfirmacaoCancelamento falhou (tenant=${tenant.id}, phone=${phone}):`, err.stack || err.message);
      await deleteConversa(tenant.id, phone);
      await sendWA(tenant, phone, 'Ocorreu um erro ao cancelar. Por favor, tente novamente ou fale com a gente diretamente.');
    }
  } else if (isNao(text)) {
    await deleteConversa(tenant.id, phone);
    await sendWA(tenant, phone, 'Ok, mantive seu agendamento. 😊');
  } else {
    await sendWA(tenant, phone, 'Por favor, responda *sim* para confirmar o cancelamento ou *não* para manter.');
  }
}

// ─── Resposta ao lembrete de confirmação de presença (1 dia antes) ────────────
// Não usa ConversaWhatsapp/estado — identifica a resposta pela combinação
// telefone + agendamento de amanhã já lembrado. Isso expira naturalmente: se o
// cliente responder dias depois, "amanhã" não bate mais com o agendamento
// antigo. Mesma data de referência (toISOString, UTC) usada pelo
// notificacaoService.js — precisa bater com o "amanhã" de quando o
// lembrete1dEnviado foi marcado.
function amanhaISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

async function handleRespostaConfirmacaoLembrete(tenant, phone, text) {
  const config = await prisma.configuracaoAgenda.findUnique({ where: { tenantId: tenant.id } });
  if (!config?.confirmacaoLembreteAtiva) return false;

  const ag = await prisma.agendamento.findFirst({
    where: {
      tenantId: tenant.id,
      data: amanhaISO(),
      lembrete1dEnviado: true,
      status: { in: ['marcado', 'confirmado'] },
      OR: [{ clienteTelefone: phone }, { lead: { telefone: phone } }],
    },
    include: { lead: true },
  });
  if (!ag) return false;

  if (isSim(text)) {
    await prisma.agendamento.updateMany({
      where: { id: ag.id, tenantId: tenant.id, status: { in: ['marcado', 'confirmado'] } },
      data: { status: 'confirmado' },
    });
    await sendWA(tenant, phone, `Perfeito! Confirmado pra amanhã às ${ag.hora}. Te esperamos! 😊`);
  } else if (isNao(text)) {
    await prisma.agendamento.updateMany({
      where: { id: ag.id, tenantId: tenant.id, status: { in: ['marcado', 'confirmado'] } },
      data: { status: 'cancelado' },
    });
    await sendWA(tenant, phone, 'Tudo bem! Cancelamos seu horário de amanhã. Se quiser remarcar, é só chamar. 😊');
    // Notifica admin se configurado — best-effort (ver AP-029/AP-030): falha
    // aqui nunca pode virar "erro" pro cliente, o cancelamento já foi feito.
    if (config.whatsappAdmin) {
      const nome = ag.clienteNome || ag.lead?.nome || phone;
      sendWA(tenant, config.whatsappAdmin, `❌ Cliente avisou que NÃO vai comparecer amanhã: ${nome} — ${ag.data} às ${ag.hora}.`).catch(err => {
        console.error(`[botAgendamentoService] falha ao notificar admin (${config.whatsappAdmin}):`, err.message);
      });
    }
  } else {
    return false;
  }
  return true;
}

// ─── Máquina de estados ───────────────────────────────────────────────────────

async function handleInicio(tenant, phone, text) {
  const servicos = await prisma.servico.findMany({
    where: { tenantId: tenant.id, ativo: true },
    orderBy: { ordem: 'asc' },
    select: { id: true, nome: true },
  });

  if (servicos.length > 0) {
    // Verifica se já mandou um número de serviço
    const num = parseInt(text.trim(), 10);
    if (!isNaN(num) && num >= 1 && num <= servicos.length) {
      const servico = servicos[num - 1];
      await saveConversa(tenant.id, phone, 'aguardando_data', { servicoId: servico.id, servicoNome: servico.nome });
      await sendWA(tenant, phone, msgEscolhaData(servico.nome));
      return;
    }
    // Envia menu de serviços
    await saveConversa(tenant.id, phone, 'inicio', {});
    await sendWA(tenant, phone, msgBoasVindas(tenant.nome, servicos));
  } else {
    // Sem serviços → pede data direto
    await saveConversa(tenant.id, phone, 'aguardando_data', {});
    await sendWA(tenant, phone, msgBoasVindas(tenant.nome, []));
  }
}

async function handleAguardandoData(tenant, phone, text, conversa) {
  const dados = conversa.dadosJson || {};

  // Se ainda está no menu de serviços (inicio com servicos)
  if (Object.keys(dados).length === 0 || (!dados.servicoId && !dados.aguardandoDataJaEnviado)) {
    const servicos = await prisma.servico.findMany({
      where: { tenantId: tenant.id, ativo: true },
      orderBy: { ordem: 'asc' },
      select: { id: true, nome: true },
    });
    const num = parseInt(text.trim(), 10);
    if (servicos.length > 0 && !isNaN(num) && num >= 1 && num <= servicos.length) {
      const servico = servicos[num - 1];
      await saveConversa(tenant.id, phone, 'aguardando_data', { servicoId: servico.id, servicoNome: servico.nome, aguardandoDataJaEnviado: true });
      await sendWA(tenant, phone, msgEscolhaData(servico.nome));
      return;
    }
  }

  const dataISO = parseData(text);
  if (!dataISO) {
    await sendWA(tenant, phone, 'Não entendi a data. 😅 Tente assim: *amanhã*, *15/06* ou *20/06/2026*');
    return;
  }

  const { slots, erro } = await getSlots(tenant.id, dataISO, dados.servicoId || null);

  if (erro || slots.length === 0) {
    const motivo = erro || 'Não há horários disponíveis nesta data.';
    await sendWA(tenant, phone, `${motivo}\n\nTente outra data.`);
    return;
  }

  const novosDados = { ...dados, data: dataISO, slots };
  await saveConversa(tenant.id, phone, 'aguardando_slot', novosDados);
  await sendWAList(tenant, phone, slots, dataISO);
}

async function handleAguardandoSlot(tenant, phone, text, conversa) {
  const dados = conversa.dadosJson || {};
  const slots = dados.slots || [];

  const slotEscolhido = parseSlot(text, slots);
  if (!slotEscolhido) {
    await sendWAList(tenant, phone, slots, dados.data);
    return;
  }

  const novosDados = { ...dados, slotEscolhido };
  await saveConversa(tenant.id, phone, 'aguardando_nome', novosDados);
  await sendWA(tenant, phone, msgPedirNome());
}

async function handleAguardandoNome(tenant, phone, text, conversa) {
  const nome = text.trim();
  if (nome.length < 2) {
    await sendWA(tenant, phone, 'Por favor, informe seu nome completo.');
    return;
  }

  const dados = { ...conversa.dadosJson, nome };
  await saveConversa(tenant.id, phone, 'aguardando_confirmacao', dados);
  await sendWA(tenant, phone, msgConfirmacao({ ...dados, hora: dados.slotEscolhido }));
}

async function handleAguardandoConfirmacao(tenant, phone, text, conversa) {
  const dados = conversa.dadosJson || {};

  if (isSim(text)) {
    try {
      await criarAgendamento(tenant, {
        nome:       dados.nome,
        telefone:   phone,
        data:       dados.data,
        hora:       dados.slotEscolhido,
        servicoId:  dados.servicoId || null,
        servicoNome: dados.servicoNome || null,
      });

      const config = await prisma.configuracaoAgenda.findUnique({ where: { tenantId: tenant.id } });
      await saveConversa(tenant.id, phone, 'concluida', dados);
      await sendWA(tenant, phone, msgAgendado({ ...dados, hora: dados.slotEscolhido }, config));

      // Notifica admin se configurado — best-effort: o agendamento já foi
      // criado e o cliente já foi avisado, então uma falha aqui (instância
      // suspensa, número do admin inválido) nunca pode virar "erro ao
      // confirmar" para o cliente (ver catch abaixo).
      const whatsappAdmin = config?.whatsappAdmin;
      if (whatsappAdmin) {
        const adminMsg = `📅 Novo agendamento via WhatsApp:\n👤 ${dados.nome}\n📞 ${phone}\n📅 ${formatDataBR(dados.data)} às ${dados.slotEscolhido}${dados.servicoNome ? `\n💼 ${dados.servicoNome}` : ''}`;
        sendWA(tenant, whatsappAdmin, adminMsg).catch(err => {
          console.error(`[botAgendamentoService] falha ao notificar admin (${whatsappAdmin}):`, err.message);
        });
      }

      await deleteConversa(tenant.id, phone);
    } catch (err) {
      console.error(`[botAgendamentoService] handleAguardandoConfirmacao falhou (tenant=${tenant.id}, phone=${phone}):`, err.stack || err.message);
      if (err.message === 'slot_ocupado') {
        await saveConversa(tenant.id, phone, 'aguardando_data', { servicoId: dados.servicoId, servicoNome: dados.servicoNome });
        await sendWA(tenant, phone, 'Ops! Esse horário acabou de ser reservado por outra pessoa. 😔\n\nMe diga outra data para verificarmos a disponibilidade.');
      } else if (err.message === 'limite_plano') {
        await deleteConversa(tenant.id, phone);
        await sendWA(tenant, phone, 'Não foi possível confirmar o agendamento no momento. Entre em contato conosco diretamente.');
      } else {
        await deleteConversa(tenant.id, phone);
        await sendWA(tenant, phone, 'Ocorreu um erro ao confirmar. Por favor, tente novamente.');
      }
    }
  } else if (isNao(text)) {
    await deleteConversa(tenant.id, phone);
    await sendWA(tenant, phone, 'Tudo bem! Agendamento cancelado. Se quiser remarcar, é só chamar. 😊');
  } else {
    await sendWA(tenant, phone, 'Por favor, responda *sim* para confirmar ou *não* para cancelar.');
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

async function opcoesMenuDisponiveis(tenant) {
  const modulos = Array.isArray(tenant.modulos) ? tenant.modulos : [];
  const agentConfig = await prisma.agentConfig.findUnique({ where: { tenantId: tenant.id } });
  return { atendente: modulos.includes('wa_atendimento'), ia: !!agentConfig?.ativo };
}

function msgMenuPrincipal(tenantNome, opcoes) {
  const linhas = ['1. Agendar um horário'];
  if (opcoes.atendente) linhas.push('2. Falar com um atendente');
  if (opcoes.ia) linhas.push(`${opcoes.atendente ? '3' : '2'}. Assistente virtual`);
  return `Olá! 👋 Seja bem-vindo(a) à *${tenantNome}*!\n\nComo posso te ajudar?\n${linhas.join('\n')}\n\nDigite o número da opção.`;
}

// Menu inicial de roteamento (opt-in, ConfiguracaoAgenda.menuInicialAtivo) — feature
// 19/09/2026: hoje qualquer saudação cai direto no agendamento, sem chance de
// escolher atendente/IA. Só oferece as opções que o tenant realmente tem.
async function handleMenuPrincipal(tenant, phone, text, conversa, pushName) {
  const opcoes = conversa.dadosJson?.opcoes || {};
  const escolha = text.trim().toLowerCase();

  if (escolha === '1' || escolha.includes('agend')) {
    await deleteConversa(tenant.id, phone);
    await handleInicio(tenant, phone, text);
    return true;
  }
  if (opcoes.atendente && (escolha === '2' || escolha.includes('atend') || escolha.includes('human'))) {
    await deleteConversa(tenant.id, phone);
    const { encaminharParaFilaHumana } = require('./waFilaHumanaService');
    await encaminharParaFilaHumana(tenant, phone, pushName || 'Cliente WhatsApp', text);
    await sendWA(tenant, phone, 'Você foi encaminhado a um de nossos atendentes. Aguarde só um momento! 🙋');
    return true;
  }
  if (opcoes.ia && (escolha === '3' || escolha.includes('assist') || escolha.includes('ia'))) {
    await deleteConversa(tenant.id, phone);
    return false; // webhook.js chama agentService.handleMessage em seguida
  }

  await sendWA(tenant, phone, msgMenuPrincipal(tenant.nome, opcoes)); // não reconheceu — reenvia
  return true;
}

async function handleBotMessage(tenant, phone, text, pushName = null) {
  // Checado ANTES do gate de plano de propósito: mesmo tenants no plano solo
  // (sem bot conversacional) devem poder usar essa redução de no-show, já que
  // não depende de ConversaWhatsapp/estado — só entra em jogo quando NÃO há
  // conversa ativa, pra nunca sequestrar um "sim/não" que é resposta de um
  // fluxo de agendar/cancelar já em andamento.
  const conversaAtiva = await getConversa(tenant.id, phone);
  if (!conversaAtiva && (isSim(text) || isNao(text))) {
    if (await handleRespostaConfirmacaoLembrete(tenant, phone, text)) return true;
  }

  const plano = tenant.plano || 'solo';
  const { BOT_WHATSAPP } = require('../config/planos');
  if (!BOT_WHATSAPP[plano]) return false; // plano sem bot → não processa
  if (BOT_WHATSAPP[plano] === 'confirmacao') return false; // solo: só envia confirmação, não processa conversa

  const conversa = conversaAtiva;

  // Sem conversa ativa: cancelar/consultar são atendidos direto; agendar inicia o fluxo;
  // qualquer outra coisa tenta a classificação por LLM antes de desistir pro agentService.
  if (!conversa) {
    if (isCancelarIntent(text)) return await iniciarCancelamento(tenant, phone);
    if (isConsultarIntent(text)) return await responderConsulta(tenant, phone);

    const configMenu = await prisma.configuracaoAgenda.findUnique({ where: { tenantId: tenant.id } });
    if (configMenu?.menuInicialAtivo) {
      const opcoes = await opcoesMenuDisponiveis(tenant);
      if (opcoes.atendente || opcoes.ia) {
        const { loadSession } = require('./agentService');
        const semSessaoIA = (await loadSession(tenant.id, phone)).length === 0;
        const semFilaAberta = !(await prisma.waFila.findFirst({
          where: { tenantId: tenant.id, clienteTelefone: phone, status: { in: ['aguardando', 'em_atendimento'] } },
        }));
        if (semSessaoIA && semFilaAberta) {
          await saveConversa(tenant.id, phone, 'aguardando_menu_principal', { opcoes });
          await sendWA(tenant, phone, msgMenuPrincipal(tenant.nome, opcoes));
          return true;
        }
      }
    }

    const ehSaudacao = ['oi','olá','ola','bom dia','boa tarde','boa noite','hey','hello'].some(s => text.trim().toLowerCase().startsWith(s));
    if (!isAgendarIntent(text) && !ehSaudacao) {
      const intent = await classificarIntencaoLLM(text);
      if (intent === 'cancelar')  return await iniciarCancelamento(tenant, phone);
      if (intent === 'consultar') return await responderConsulta(tenant, phone);
      if (intent !== 'agendar')   return false; // 'outros' → deixa o agentService responder
    }
    await handleInicio(tenant, phone, text);
    return true;
  }

  // Conversa ativa → processa conforme estado
  if (conversa.estado === 'aguardando_menu_principal') {
    return await handleMenuPrincipal(tenant, phone, text, conversa, pushName);
  }
  switch (conversa.estado) {
    case 'inicio':
      await handleInicio(tenant, phone, text);
      break;
    case 'aguardando_data':
      await handleAguardandoData(tenant, phone, text, conversa);
      break;
    case 'aguardando_slot':
      await handleAguardandoSlot(tenant, phone, text, conversa);
      break;
    case 'aguardando_nome':
      await handleAguardandoNome(tenant, phone, text, conversa);
      break;
    case 'aguardando_confirmacao':
      await handleAguardandoConfirmacao(tenant, phone, text, conversa);
      break;
    case 'aguardando_confirmacao_cancelamento':
      await handleAguardandoConfirmacaoCancelamento(tenant, phone, text, conversa);
      break;
    default:
      await deleteConversa(tenant.id, phone);
      return false;
  }
  return true;
}

module.exports = { handleBotMessage, isCancelarIntent, isConsultarIntent, classificarIntencaoLLM, buscarProximoAgendamento };
