const router = require('express').Router();
const prisma = require('../lib/prisma');
const parseEndereco = require('../utils/parseEndereco');
const { handleMessage } = require('../services/agentService');

async function apiTokenAuth(req, res, next) {
  const token = req.headers['x-api-token'] || req.query.token;
  if (!token) return res.status(401).json({ error: 'Token obrigatório (header X-API-Token ou ?token=)' });
  const tenant = await prisma.tenant.findFirst({ where: { apiToken: token, ativo: true } });
  if (!tenant) return res.status(401).json({ error: 'Token inválido ou empresa inativa' });
  req.tenant = tenant;
  next();
}


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
      const nome = (item.nome_empresa || item.nome || '').trim();
      if (!nome) {
        erros.push({ item: '(sem nome)', erro: 'nome_empresa ausente' });
        continue;
      }

      const addr = parseEndereco(item.endereco);
      const estado    = (item.estado    || addr.estado    || '').toUpperCase().slice(0, 2) || null;
      const cidade    = item.cidade    || addr.cidade    || null;
      const bairro    = item.bairro    || addr.bairro    || null;
      const cep       = item.cep       || addr.cep       || null;
      const logradouro = item.logradouro || addr.logradouro || null;
      const nicho     = (item.nicho || nichoDefault) || null;

      // Normaliza rating (pode vir como "4,5" ou "4.5")
      const ratingRaw = item.rating ? String(item.rating).replace(',', '.') : null;
      const rating = ratingRaw ? Number(ratingRaw) || null : null;

      // Normaliza reviews (pode vir como "1.234" com ponto de milhar)
      const reviewsRaw = item.reviews || item.reviewsCount || 0;
      const reviewsCount = Number(String(reviewsRaw).replace(/\D/g, '')) || 0;

      await prisma.lead.create({
        data: {
          tenantId,
          nome,
          telefone:       item.telefone_e164 || item.telefone || null,
          website:        item.website        || null,
          facebook:       item.facebook       || null,
          instagram:      item.instagram      || null,
          telegram:       item.telegram       || null,
          especialidades: item.especialidades || null,
          origem:         'Google Maps Extrator',
          status:         'novo',
          priority:       'normal',
          fonte:          'google_maps',
          nicho,
          categoria:      item.categoria      || null,
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
      else { erros.push({ item: item.nome_empresa || item.nome || '?', erro: e.message }); }
    }
  }

  res.json({ ok: true, inseridos, ignorados, erros });
});

// POST /api/webhook/agente/:slug
// Recebe eventos da Evolution API — sem JWT, validado por slug
router.post('/agente/:slug', async (req, res) => {
  res.json({ ok: true }); // responde imediatamente para a Evolution API não retentar

  try {
    const tenant = await prisma.tenant.findFirst({ where: { slug: req.params.slug, ativo: true } });
    if (!tenant) return;

    const event = req.body?.event;
    if (event !== 'messages.upsert') return;

    const msg = req.body?.data;
    if (!msg || msg.key?.fromMe) return; // ignora mensagens enviadas pelo próprio número

    const phone = msg.key?.remoteJid?.replace('@s.whatsapp.net', '');
    const text  = msg.message?.conversation || msg.message?.extendedTextMessage?.text;

    if (!phone || !text) return;

    await handleMessage(tenant, phone, text);
  } catch { /* silencioso — não expor erros internos */ }
});

module.exports = router;
