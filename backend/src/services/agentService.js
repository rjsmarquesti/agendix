const https = require('https');
const prisma = require('../lib/prisma');
const { registrar: logMensagem } = require('../lib/mensagemLog');
const { enfileirar } = require('./waQueue');

const SESSION_TTL_MS = 30 * 60 * 1000; // 30 minutos

function isOpen(config) {
  const now = new Date();
  const day = now.getDay(); // 0=dom...6=sab
  const dias = config.diasUteis ? config.diasUteis.split(',').map(Number) : [1,2,3,4,5];
  if (!dias.includes(day)) return false;

  const [hIni, mIni] = config.horarioInicio.split(':').map(Number);
  const [hFim, mFim] = config.horarioFim.split(':').map(Number);
  const minAtual = now.getHours() * 60 + now.getMinutes();
  return minAtual >= hIni * 60 + mIni && minAtual < hFim * 60 + mFim;
}

function isPurchaseIntent(text) {
  const lower = text.toLowerCase();
  const kw = ['quero', 'compra', 'valor', 'preço', 'quanto', 'custa', 'funciona', 'começar', 'assinar', 'plano'];
  return kw.some(k => lower.includes(k));
}

function callClaude(systemPrompt, messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 200,
      system: systemPrompt,
      messages,
    });

    const req = https.request({
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.content?.[0]?.text || 'Desculpe, não consegui responder agora.');
        } catch { resolve('Desculpe, não consegui responder agora.'); }
      });
    });

    req.on('error', () => resolve('Desculpe, não consegui responder agora.'));
    req.write(body);
    req.end();
  });
}


async function loadSession(tenantId, phone) {
  const now = new Date();
  const session = await prisma.agentSession.findUnique({
    where: { id_tenantId: { id: phone, tenantId } },
  });

  if (!session) return [];

  const expired = now - new Date(session.lastActivity) > SESSION_TTL_MS;
  if (expired) {
    await prisma.agentSession.delete({ where: { id_tenantId: { id: phone, tenantId } } });
    return [];
  }

  return session.messagesJson || [];
}

async function saveSession(tenantId, phone, messages) {
  await prisma.agentSession.upsert({
    where: { id_tenantId: { id: phone, tenantId } },
    update: { messagesJson: messages, lastActivity: new Date() },
    create: { id: phone, tenantId, messagesJson: messages, lastActivity: new Date() },
  });
}

async function upsertLead(tenantId, phone, firstMsg) {
  return prisma.agentLead.upsert({
    where: { tenantId_telefone: { tenantId, telefone: phone } },
    update: { updatedAt: new Date() },
    create: { tenantId, telefone: phone, primeiraMsg: firstMsg },
  });
}

async function markCheckoutSent(tenantId, phone) {
  await prisma.agentLead.updateMany({
    where: { tenantId, telefone: phone },
    data: { sentCheckout: true },
  });
}

async function handleMessage(tenant, phone, text) {
  const config = await prisma.agentConfig.findUnique({ where: { tenantId: tenant.id } });
  if (!config || !config.ativo) return false;

  // Fora do horário
  if (!isOpen(config)) {
    const msg = config.msgForaHorario ||
      `Olá! No momento estou fora do horário de atendimento. Retorno em breve! 😊`;
    await enfileirar(tenant, phone, msg);
    return true; // respondeu (msg fora de horário), não escalar para fila
  }

  const messages = await loadSession(tenant.id, phone);
  const isNew = messages.length === 0;

  if (isNew) await upsertLead(tenant.id, phone, text);

  messages.push({ role: 'user', content: text });

  // Detectar intenção de compra após 4+ trocas
  const lead = await prisma.agentLead.findUnique({
    where: { tenantId_telefone: { tenantId: tenant.id, telefone: phone } },
  });

  if (!lead?.sentCheckout && messages.length >= 8 && isPurchaseIntent(text)) {
    await markCheckoutSent(tenant.id, phone);
    await saveSession(tenant.id, phone, messages);
    // Prioriza checkoutUrl dedicada; fallback para primeira URL encontrada no prompt
    const checkoutLink = config.checkoutUrl?.trim()
      || config.promptBase.match(/https?:\/\/\S+/)?.[0]
      || '';
    const checkoutMsg = checkoutLink
      ? `Ótimo! Aqui está o link para você começar:\n\n${checkoutLink}\n\nQualquer dúvida, é só chamar! 💪`
      : `Ótimo! Para começar, entre em contato com a gente pelo nosso atendimento. Qualquer dúvida, é só chamar! 💪`;
    await enfileirar(tenant, phone, checkoutMsg);
    return true;
  }

  const reply = await callClaude(config.promptBase, messages);
  messages.push({ role: 'assistant', content: reply });
  await saveSession(tenant.id, phone, messages);
  await enfileirar(tenant, phone, reply);
  logMensagem({ tenantId: tenant.id, meio: 'whatsapp', para: phone, corpo: reply, origem: 'agente_ia' });
  return true;
}

module.exports = { handleMessage };
