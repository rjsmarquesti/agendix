const https = require('https');
const prisma = require('../lib/prisma');
const { getSlots } = require('./disponibilidadeService');
const { LIMITE_AGENDAMENTOS } = require('../config/planos');

const TTL_MS = 30 * 60 * 1000; // 30 minutos

// ─── Envio Evolution API ─────────────────────────────────────────────────────

async function sendWA(tenant, phone, text) {
  const instance = tenant.evolutionInstance;
  const apiKey   = tenant.evolutionApiKey;
  const baseUrl  = tenant.evolutionBaseUrl || 'https://api.divulgabr.com.br';
  if (!instance || !apiKey) return;

  const body = JSON.stringify({ number: phone, text });
  const url  = new URL(`${baseUrl}/message/sendText/${instance}`);

  return new Promise(resolve => {
    const req = https.request({
      hostname: url.hostname,
      path:     url.pathname,
      method:   'POST',
      headers: { apikey: apiKey, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
    }, res => { res.resume(); res.on('end', resolve); });
    req.on('error', resolve);
    req.write(body);
    req.end();
  });
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

// ─── Criação do agendamento ───────────────────────────────────────────────────

async function criarAgendamento(tenant, dados) {
  const { nome, telefone, data, hora, servicoId, servicoNome } = dados;
  const plano = tenant.plano || 'basico';
  const limite = LIMITE_AGENDAMENTOS[plano] ?? 60;

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

function msgSlotsDisponiveis(slots, data) {
  const lista = slots.map((s, i) => `${i + 1}. ${s}`).join('\n');
  return `Horários disponíveis para *${formatDataBR(data)}*:\n\n${lista}\n\nDigite o número ou o horário desejado.`;
}

function msgPedirNome() {
  return 'Perfeito! 😊 Qual o seu nome completo?';
}

function msgConfirmacao(dados) {
  const { nome, data, hora, servicoNome } = dados;
  return `Confirmação do agendamento:\n\n👤 Nome: *${nome}*\n📅 Data: *${formatDataBR(data)}*\n🕐 Horário: *${hora}*${servicoNome ? `\n💼 Serviço: *${servicoNome}*` : ''}\n\nConfirma? (sim/não)`;
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
  await sendWA(tenant, phone, msgSlotsDisponiveis(slots, dataISO));
}

async function handleAguardandoSlot(tenant, phone, text, conversa) {
  const dados = conversa.dadosJson || {};
  const slots = dados.slots || [];

  const slotEscolhido = parseSlot(text, slots);
  if (!slotEscolhido) {
    await sendWA(tenant, phone, `Horário não encontrado. Digite o número da lista ou o horário (ex: 09:00).\n\n${msgSlotsDisponiveis(slots, dados.data)}`);
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

      // Notifica admin se configurado
      const whatsappAdmin = config?.whatsappAdmin;
      if (whatsappAdmin) {
        const adminMsg = `📅 Novo agendamento via WhatsApp:\n👤 ${dados.nome}\n📞 ${phone}\n📅 ${formatDataBR(dados.data)} às ${dados.slotEscolhido}${dados.servicoNome ? `\n💼 ${dados.servicoNome}` : ''}`;
        await sendWA(tenant, whatsappAdmin, adminMsg);
      }

      await deleteConversa(tenant.id, phone);
    } catch (err) {
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

async function handleBotMessage(tenant, phone, text) {
  const plano = tenant.plano || 'basico';
  const { BOT_WHATSAPP } = require('../config/planos');
  if (!BOT_WHATSAPP[plano]) return false; // plano sem bot → não processa

  const conversa = await getConversa(tenant.id, phone);

  // Sem conversa ativa: só inicia se houver intenção de agendar
  if (!conversa) {
    if (!isAgendarIntent(text) && !['oi','olá','ola','bom dia','boa tarde','boa noite','hey','hello'].some(s => text.trim().toLowerCase().startsWith(s))) {
      return false; // não é intenção de agendamento → deixa o agentService responder
    }
    await handleInicio(tenant, phone, text);
    return true;
  }

  // Conversa ativa → processa conforme estado
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
    default:
      await deleteConversa(tenant.id, phone);
      return false;
  }
  return true;
}

module.exports = { handleBotMessage };
