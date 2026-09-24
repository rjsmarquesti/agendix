const router = require('express').Router();
const { z }   = require('zod');
const prisma  = require('../lib/prisma');
const { getRedis } = require('../lib/redis');
const { decryptTenant, decrypt } = require('../lib/encrypt');
const parseEndereco = require('../utils/parseEndereco');
const { extratorLimiter } = require('../middlewares/rateLimiter');
const { handleMessage }    = require('../services/agentService');
const { handleBotMessage } = require('../services/botAgendamentoService');
const { encaminharParaFilaHumana } = require('../services/waFilaHumanaService');
const { parseEvolution, parseEvolutionConnection } = require('../lib/wa/webhook/parseEvolution');
const { parseMeta, validateMetaSignature }         = require('../lib/wa/webhook/parseMeta');
const { parseTwilio, validateTwilioSignature }     = require('../lib/wa/webhook/parseTwilio');
const { parseZApi }                                = require('../lib/wa/webhook/parseZApi');
const { verificarApikeyEvolutionLog, ENFORCE_APIKEY } = require('../middlewares/webhookVerify');

const leadImportSchema = z.object({
  nome_empresa:    z.string().max(255).optional(),
  nome:            z.string().max(255).optional(),
  telefone_e164:   z.string().max(30).optional(),
  telefone:        z.string().max(30).optional(),
  website:         z.string().url().max(500).optional().or(z.literal('')),
  facebook:        z.string().max(500).optional(),
  instagram:       z.string().max(500).optional(),
  telegram:        z.string().max(100).optional(),
  especialidades:  z.string().max(1000).optional(),
  nicho:           z.string().max(100).optional(),
  categoria:       z.string().max(100).optional(),
  estado:          z.string().max(2).optional(),
  cidade:          z.string().max(100).optional(),
  bairro:          z.string().max(100).optional(),
  cep:             z.string().max(9).optional(),
  logradouro:      z.string().max(200).optional(),
  endereco:        z.string().max(300).optional(),
  rating:          z.union([z.string(), z.number()]).optional(),
  reviews:         z.union([z.string(), z.number()]).optional(),
  reviewsCount:    z.union([z.string(), z.number()]).optional(),
}).passthrough();

async function apiTokenAuth(req, res, next) {
  // Token exclusivamente via header — query param loga em access logs de proxy/CDN
  const token = req.headers['x-api-token'];
  if (!token) return res.status(401).json({ error: 'Token obrigatório (header X-API-Token)' });
  const raw = await prisma.tenant.findFirst({ where: { apiToken: token, ativo: true } });
  if (!raw) return res.status(401).json({ error: 'Token inválido ou empresa inativa' });
  req.tenant = decryptTenant(raw);
  next();
}


// POST /api/webhook/extrator/:slug
// Recebe leads da extensão "Open Maps Leads Extractor" (Agendix v1.0)
// Identificação por slug na URL — sem header de autenticação
router.post('/extrator/:slug', extratorLimiter, async (req, res) => {
  try {
  if (!/^[a-z0-9-]+$/.test(req.params.slug)) {
    return res.status(400).json({ error: 'Slug inválido' });
  }

  const raw = await prisma.tenant.findFirst({ where: { slug: req.params.slug, ativo: true } });
  if (!raw) return res.status(404).json({ error: 'Empresa não encontrada' });
  const tenant = decryptTenant(raw);
  const tenantId = tenant.id;

  // Aceita array direto ou { leads: [] }
  let lista = Array.isArray(req.body) ? req.body : req.body?.leads;
  if (!Array.isArray(lista) || lista.length === 0) {
    return res.status(400).json({ error: 'Envie um array de leads (direto ou em { leads: [] })' });
  }
  if (lista.length > 500) {
    return res.status(400).json({ error: 'Máximo de 500 leads por envio' });
  }

  // Mapeia campos da extensão nova (name/phone/categories/address) para o schema interno
  const mapped = lista.map(item => ({
    nome_empresa:   item.name        || item.nome_empresa || item.nome || '',
    telefone_e164:  item.phone_e164  || item.telefone_e164 || '',
    telefone:       item.phone       || item.telefone || '',
    endereco:       item.address     || item.endereco || '',
    website:        item.website     || '',
    rating:         item.rating      ?? '',
    reviews:        item.reviews     ?? item.reviewsCount ?? 0,
    nicho:          item.categories  || item.nicho || '',
    especialidades: item.categories  || item.especialidades || '',
  }));

  const nichoDefault = (req.query.nicho || '').trim();
  let inseridos = 0, ignorados = 0;
  const erros = [];

  for (const item of mapped) {
    let nomeItem = item.nome_empresa || '?';
    try {
      const parsed = leadImportSchema.safeParse(item);
      if (!parsed.success) {
        erros.push({ item: nomeItem, erro: 'formato inválido' });
        ignorados++;
        continue;
      }
      const safeItem = parsed.data;
      nomeItem = safeItem.nome_empresa || safeItem.nome || nomeItem;

      const nome = (safeItem.nome_empresa || safeItem.nome || '').trim();
      if (!nome) { ignorados++; continue; }

      const addr        = parseEndereco(safeItem.endereco || '');
      const estado      = (safeItem.estado    || addr.estado    || '').toUpperCase().slice(0, 2) || null;
      const cidade      = safeItem.cidade    || addr.cidade    || null;
      const bairro      = safeItem.bairro    || addr.bairro    || null;
      const cep         = safeItem.cep       || addr.cep       || null;
      const logradouro  = safeItem.logradouro || addr.logradouro || null;
      const nicho       = (safeItem.nicho || nichoDefault) || null;
      const ratingRaw   = safeItem.rating ? String(safeItem.rating).replace(',', '.') : null;
      const rating      = ratingRaw ? Number(ratingRaw) || null : null;
      const reviewsRaw  = safeItem.reviews || safeItem.reviewsCount || 0;
      const reviewsCount = Number(String(reviewsRaw).replace(/\D/g, '')) || 0;

      await prisma.lead.create({
        data: {
          tenantId,
          nome,
          telefone:       safeItem.telefone_e164 || safeItem.telefone || null,
          website:        safeItem.website        || null,
          especialidades: safeItem.especialidades || null,
          origem:         'Google Maps Extrator',
          status:         'novo',
          priority:       'normal',
          fonte:          'google_maps',
          nicho, cidade, municipio: cidade, bairro, estado, cep, logradouro,
          rating, reviewsCount,
        },
      });
      inseridos++;
    } catch (e) {
      if (e.code === 'P2002') { ignorados++; }
      else { erros.push({ item: nomeItem, erro: e.message }); }
    }
  }

  return res.json({ ok: true, inseridos, ignorados, erros });
  } catch (e) {
    console.error('[webhook/extrator] erro interno:', e.message);
    return res.status(500).json({ error: 'Erro interno ao processar leads', detalhe: e.message });
  }
});

// POST /api/webhook/gmaps
// Recebe array de leads no formato da extensão "Extrator Google Maps"
router.post('/gmaps', apiTokenAuth, async (req, res) => {
  const tenantId = req.tenant.id;

  // Aceita array direto ou { leads: [] }
  let lista = Array.isArray(req.body) ? req.body : req.body?.leads;
  if (!Array.isArray(lista) || lista.length === 0) {
    return res.status(400).json({ error: 'Envie um array de leads (direto ou em { leads: [] })' });
  }
  if (lista.length > 500) {
    return res.status(400).json({ error: 'Máximo de 500 leads por envio' });
  }

  // nicho padrão: vem em cada item (extensão atualizada) ou como query param
  const nichoDefault = (req.query.nicho || '').trim();

  let inseridos = 0, ignorados = 0;
  const erros = [];

  for (const item of lista) {
    try {
      // Valida e sanitiza cada item antes de processar
      const parsed = leadImportSchema.safeParse(item);
      if (!parsed.success) {
        erros.push({ item: item.nome_empresa || item.nome || '?', erro: 'formato inválido' });
        ignorados++;
        continue;
      }
      const safeItem = parsed.data;

      const nome = (safeItem.nome_empresa || safeItem.nome || '').trim();
      if (!nome) {
        erros.push({ item: '(sem nome)', erro: 'nome_empresa ausente' });
        continue;
      }

      const addr = parseEndereco(safeItem.endereco);
      const estado    = (safeItem.estado    || addr.estado    || '').toUpperCase().slice(0, 2) || null;
      const cidade    = safeItem.cidade    || addr.cidade    || null;
      const bairro    = safeItem.bairro    || addr.bairro    || null;
      const cep       = safeItem.cep       || addr.cep       || null;
      const logradouro = safeItem.logradouro || addr.logradouro || null;
      const nicho     = (safeItem.nicho || nichoDefault) || null;

      // Normaliza rating (pode vir como "4,5" ou "4.5")
      const ratingRaw = safeItem.rating ? String(safeItem.rating).replace(',', '.') : null;
      const rating = ratingRaw ? Number(ratingRaw) || null : null;

      // Normaliza reviews (pode vir como "1.234" com ponto de milhar)
      const reviewsRaw = safeItem.reviews || safeItem.reviewsCount || 0;
      const reviewsCount = Number(String(reviewsRaw).replace(/\D/g, '')) || 0;

      await prisma.lead.create({
        data: {
          tenantId,
          nome,
          telefone:       safeItem.telefone_e164 || safeItem.telefone || null,
          website:        safeItem.website        || null,
          facebook:       safeItem.facebook       || null,
          instagram:      safeItem.instagram      || null,
          telegram:       safeItem.telegram       || null,
          especialidades: safeItem.especialidades || null,
          origem:         'Google Maps Extrator',
          status:         'novo',
          priority:       'normal',
          fonte:          'google_maps',
          nicho,
          categoria:      safeItem.categoria      || null,
          cep,
          logradouro,
          cidade,
          municipio:      cidade,
          bairro,
          estado,
          rating,
          reviewsCount,
        },
      });
      inseridos++;
    } catch (e) {
      if (e.code === 'P2002') { ignorados++; }
      else { erros.push({ item: safeItem?.nome_empresa || safeItem?.nome || '?', erro: e.message }); }
    }
  }

  res.json({ ok: true, inseridos, ignorados, erros });
});

// ── Handler compartilhado de mensagens inbound ────────────────────────────────
// Chamado por todos os providers após normalizar { from, text, pushName, messageId }

// Instâncias Evolution self-hosted podem reenviar o mesmo evento messages.upsert
// (visto ao vivo no tenant divulgabr, 13/09/2026 — duas mensagens de confirmação
// processadas em paralelo, a segunda batendo em conflito de lead único e caindo
// no catch genérico do bot). Dedup por messageId evita a corrida: sem isso, duas
// chamadas concorrentes de handleBotMessage podem ler o mesmo estado de conversa
// antes de qualquer uma escrever, processando a mesma mensagem duas vezes.
async function jaProcessada(tenantId, messageId) {
  if (!messageId) return false; // provider não manda ID → não dá pra dedupar, segue processando
  try {
    const redis = getRedis();
    const key = `wa:msgdedup:${tenantId}:${messageId}`;
    const res = await redis.set(key, '1', 'EX', 120, 'NX');
    return res !== 'OK'; // não conseguiu setar (já existia) → é duplicata
  } catch {
    return false; // Redis indisponível → fail-open, não bloqueia o bot por causa do dedup
  }
}

async function handleInboundMessage(tenant, from, text, pushName, messageId) {
  const telefoneNorm = (from || '').replace(/\D/g, '');
  if (!telefoneNorm || !text) return;
  if (await jaProcessada(tenant.id, messageId)) return;

  // Garante que qualquer contato WA vira lead (silencioso)
  prisma.lead.upsert({
    where:  { telefone_tenantId: { telefone: telefoneNorm, tenantId: tenant.id } },
    update: {},
    create: {
      tenantId: tenant.id,
      nome:     pushName || 'Cliente WhatsApp',
      telefone: telefoneNorm,
      fonte:    'api',
      status:   'novo',
      priority: 'normal',
      origem:   'WhatsApp',
    },
  }).catch(() => {});

  // Bot de agendamento tem prioridade; se não processar, cai no agente IA
  const handled = await handleBotMessage(tenant, from, text, pushName);
  if (!handled) {
    const agenteRespondeu = await handleMessage(tenant, from, text);

    // Nenhum módulo respondeu → handoff para fila humana
    if (!agenteRespondeu) {
      const modulos = Array.isArray(tenant.modulos) ? tenant.modulos : [];
      if (modulos.includes('wa_atendimento')) {
        await encaminharParaFilaHumana(tenant, telefoneNorm, pushName || 'Cliente WhatsApp', text);
      }
    }
  }
}

// ── Evolution API webhook (mantido para retrocompatibilidade) ─────────────────

router.post('/agente/:slug', async (req, res) => {
  if (!/^[a-z0-9-]+$/.test(req.params.slug)) return res.status(400).json({ error: 'Slug inválido' });

  res.json({ ok: true }); // responde imediatamente

  try {
    const raw = await prisma.tenant.findFirst({ where: { slug: req.params.slug, ativo: true } });
    if (!raw) return;
    const tenant = decryptTenant(raw);

    // Bloqueia quando o tenant tem evolutionApiKey configurada e a key da
    // requisição não confere — protege contra mensagens forjadas via slug público.
    // Em erro inesperado da checagem, não bloqueia (evita derrubar o bot por falha própria).
    const { valido } = await verificarApikeyEvolutionLog(req, tenant).catch(() => ({ valido: true }));
    if (ENFORCE_APIKEY && !valido) return;

    // Evento de conexão (desconexão / ban)
    const connEvt = parseEvolutionConnection(req.body);
    if (connEvt) {
      if (connEvt.isDown) {
        await prisma.notificacao.create({
          data: {
            tenantId: tenant.id,
            tipo:     connEvt.isBanned ? 'instancia_banida' : 'instancia_desconectada',
            titulo:   connEvt.isBanned ? '🚫 WhatsApp banido' : '⚠️ WhatsApp desconectado',
            corpo:    connEvt.isBanned
              ? 'Seu número foi banido pelo WhatsApp. Entre em contato com o suporte para trocar o número.'
              : 'Sua conexão WhatsApp caiu. Acesse Configurações › WhatsApp para reconectar.',
          },
        }).catch(() => {});
        const { enviarEmailAlertaWA } = require('../lib/mailer');
        const admin = await prisma.user.findFirst({
          where: { tenantId: tenant.id, role: 'admin', ativo: true }, orderBy: { createdAt: 'asc' }, select: { email: true, nome: true },
        });
        if (admin?.email) await enviarEmailAlertaWA({ para: admin.email, nome: admin.nome, tenantNome: tenant.nome, state: connEvt.state, isBanned: connEvt.isBanned, tenantId: tenant.id }).catch(() => {});
      }
      return;
    }

    const parsed = parseEvolution(req.body);
    if (!parsed) return;
    await handleInboundMessage(tenant, parsed.from, parsed.text, parsed.pushName, parsed.messageId);
  } catch { /* silencioso */ }
});

// ── Meta (WhatsApp Cloud API) webhooks ───────────────────────────────────────

// GET: verificação do webhook pela Meta
router.get('/meta/:slug', async (req, res) => {
  if (!/^[a-z0-9-]+$/.test(req.params.slug)) return res.status(400).send('');
  const raw = await prisma.tenant.findFirst({ where: { slug: req.params.slug, ativo: true } });
  if (!raw) return res.status(404).send('');
  const tenant = decryptTenant(raw);
  const cfg    = tenant.waConfig || {};

  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === cfg.webhookVerifyToken) {
    return res.status(200).send(challenge);
  }
  return res.status(403).send('');
});

// POST: mensagens da Meta — body já chega como Buffer (express.raw montado no server.js antes do json global)
router.post('/meta/:slug', async (req, res) => {
    if (!/^[a-z0-9-]+$/.test(req.params.slug)) return res.status(400).json({ error: 'Slug inválido' });
    res.json({ ok: true });

    try {
      const raw    = await prisma.tenant.findFirst({ where: { slug: req.params.slug, ativo: true } });
      if (!raw) return;
      const tenant = decryptTenant(raw);
      const cfg    = tenant.waConfig || {};

      // Valida assinatura HMAC da Meta
      const sig = req.headers['x-hub-signature-256'] || '';
      if (cfg.appSecret && !validateMetaSignature(req.body, sig, cfg.appSecret)) {
        console.warn(`[webhook:meta] assinatura inválida — tenant=${req.params.slug}`);
        return;
      }

      const body   = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString('utf8')) : req.body;
      const parsed = parseMeta(body);
      if (!parsed) return;

      await handleInboundMessage(tenant, parsed.from, parsed.text, parsed.pushName);
    } catch { /* silencioso */ }
  }
);

// ── Twilio WhatsApp webhooks ──────────────────────────────────────────────────

// POST: mensagens Twilio — body form-encoded (express.urlencoded global já parseia)
router.post('/twilio/:slug', async (req, res) => {
    if (!/^[a-z0-9-]+$/.test(req.params.slug)) return res.status(400).json({ error: 'Slug inválido' });
    res.status(204).send(); // Twilio espera 2xx imediatamente

    try {
      const raw    = await prisma.tenant.findFirst({ where: { slug: req.params.slug, ativo: true } });
      if (!raw) return;
      const tenant = decryptTenant(raw);
      const cfg    = tenant.waConfig || {};

      // Valida assinatura Twilio (opcional — recomendado em produção)
      if (cfg.authToken) {
        const sig  = req.headers['x-twilio-signature'] || '';
        const url  = `${process.env.APP_URL}/api/webhook/twilio/${req.params.slug}`;
        if (!validateTwilioSignature(cfg.authToken, sig, url, req.body)) {
          console.warn(`[webhook:twilio] assinatura inválida — tenant=${req.params.slug}`);
          return;
        }
      }

      const parsed = parseTwilio(req.body);
      if (!parsed) return;

      await handleInboundMessage(tenant, parsed.from, parsed.text, parsed.pushName);
    } catch { /* silencioso */ }
  }
);

// ── Z-API webhooks ────────────────────────────────────────────────────────────

router.post('/zapi/:slug', async (req, res) => {
  if (!/^[a-z0-9-]+$/.test(req.params.slug)) return res.status(400).json({ error: 'Slug inválido' });
  res.json({ ok: true });

  try {
    const raw    = await prisma.tenant.findFirst({ where: { slug: req.params.slug, ativo: true } });
    if (!raw) return;
    const tenant = decryptTenant(raw);

    const parsed = parseZApi(req.body);
    if (!parsed) return;

    await handleInboundMessage(tenant, parsed.from, parsed.text, parsed.pushName);
  } catch { /* silencioso */ }
});

module.exports = router;
module.exports.handleInboundMessage = handleInboundMessage;
