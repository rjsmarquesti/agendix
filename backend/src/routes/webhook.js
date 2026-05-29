const router = require('express').Router();
const { z }  = require('zod');
const prisma = require('../lib/prisma');
const { decryptTenant } = require('../lib/encrypt');
const parseEndereco = require('../utils/parseEndereco');
const { handleMessage }    = require('../services/agentService');
const { handleBotMessage } = require('../services/botAgendamentoService');

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
router.post('/extrator/:slug', async (req, res) => {
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
    rating:         item.rating      ?? item.rating ?? '',
    reviews:        item.reviews     ?? item.reviewsCount ?? 0,
    nicho:          item.categories  || item.nicho || '',
    especialidades: item.categories  || item.especialidades || '',
    fonte_url:      item.source_url  || '',
  }));

  const nichoDefault = (req.query.nicho || '').trim();
  let inseridos = 0, ignorados = 0;
  const erros = [];

  for (const item of mapped) {
    try {
      const parsed = leadImportSchema.safeParse(item);
      if (!parsed.success) {
        erros.push({ item: item.nome_empresa || '?', erro: 'formato inválido' });
        ignorados++;
        continue;
      }
      const safeItem = parsed.data;

      const nome = (safeItem.nome_empresa || safeItem.nome || '').trim();
      if (!nome) { ignorados++; continue; }

      const addr        = parseEndereco(safeItem.endereco);
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
      else { erros.push({ item: item.nome_empresa || '?', erro: e.message }); }
    }
  }

  res.json({ ok: true, inseridos, ignorados, erros });
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

// POST /api/webhook/agente/:slug
// Recebe eventos da Evolution API — validado por slug + token da instância
router.post('/agente/:slug', async (req, res) => {
  // Valida formato do slug antes de consultar o banco
  if (!/^[a-z0-9-]+$/.test(req.params.slug)) {
    return res.status(400).json({ error: 'Slug inválido' });
  }

  res.json({ ok: true }); // responde imediatamente para a Evolution API não retentar

  try {
    const tenant = await prisma.tenant.findFirst({ where: { slug: req.params.slug, ativo: true } });
    if (!tenant) return;

    // Valida token da instância Evolution (se configurado no tenant)
    if (tenant.evolutionApiKey) {
      const apikey = req.headers['apikey'] || req.headers['x-api-key'];
      if (!apikey || apikey !== tenant.evolutionApiKey) return;
    }

    const event = req.body?.event;

    // Detecta desconexão ou ban imediatamente, sem esperar o watchdog de 15 min
    if (event === 'connection.update') {
      const data       = req.body?.data || {};
      const state      = data.state;
      const reasonCode = data.statusReason ?? data.lastDisconnect?.error?.output?.statusCode;
      const isBanned   = state === 'close' && reasonCode === 401;
      const isDown     = state === 'close' || state === 'connecting';

      if (isDown) {
        await prisma.notificacao.create({
          data: {
            tenantId: tenant.id,
            tipo:     isBanned ? 'instancia_banida' : 'instancia_desconectada',
            titulo:   isBanned ? '🚫 WhatsApp banido' : '⚠️ WhatsApp desconectado',
            corpo:    isBanned
              ? 'Seu número foi banido pelo WhatsApp. Entre em contato com o suporte para trocar o número.'
              : 'Sua conexão WhatsApp caiu. Acesse Configurações › Integração para reconectar.',
          },
        }).catch(() => {});

        const { enviarEmailAlertaWA } = require('../lib/mailer');
        const admin = await prisma.user.findFirst({
          where:   { tenantId: tenant.id, role: 'admin', ativo: true },
          orderBy: { createdAt: 'asc' },
          select:  { email: true, nome: true },
        });
        if (admin?.email) {
          await enviarEmailAlertaWA({
            para: admin.email, nome: admin.nome, tenantNome: tenant.nome, state, isBanned,
          }).catch(() => {});
        }
        console.warn(`[webhook:connection] tenant="${req.params.slug}" state="${state}" banned=${isBanned}`);
      }
      return;
    }

    if (event !== 'messages.upsert') return;

    const msg = req.body?.data;
    if (!msg || msg.key?.fromMe) return; // ignora mensagens enviadas pelo próprio número

    const remoteJid = msg.key?.remoteJid || '';
    if (remoteJid.endsWith('@g.us')) return; // ignora mensagens de grupo

    const phone = remoteJid.replace('@s.whatsapp.net', '');
    const text  = msg.message?.conversation
      || msg.message?.extendedTextMessage?.text
      || msg.message?.listResponseMessage?.singleSelectReply?.selectedRowId;

    if (!phone || !text) return;

    // Garante que qualquer contato WA vira lead (silencioso — não deve quebrar o bot)
    const telefoneNorm = phone.replace(/\D/g, '');
    prisma.lead.upsert({
      where: { telefone_tenantId: { telefone: telefoneNorm, tenantId: tenant.id } },
      update: {},
      create: {
        tenantId: tenant.id,
        nome: msg.pushName || msg.notifyName || 'Cliente WhatsApp',
        telefone: telefoneNorm,
        fonte: 'api',
        status: 'novo',
        priority: 'normal',
        origem: 'WhatsApp Bot',
      },
    }).catch(() => {});

    // Bot de agendamento tem prioridade; se não processar, cai no agente IA
    const handled = await handleBotMessage(tenant, phone, text);
    if (!handled) {
      const agenteRespondeu = await handleMessage(tenant, phone, text);

      // Nenhum módulo automático respondeu → handoff para fila humana (wa_atendimento)
      if (!agenteRespondeu) {
        const modulos = Array.isArray(tenant.modulos) ? tenant.modulos : [];
        if (modulos.includes('wa_atendimento')) {
          const telefoneNorm = phone.replace(/\D/g, '');
          const clienteNome  = msg.pushName || msg.notifyName || 'Cliente WhatsApp';

          // Abre sessão na fila — idempotente (não duplica se já existe)
          const existente = await prisma.waFila.findFirst({
            where: { tenantId: tenant.id, clienteTelefone: telefoneNorm, status: { in: ['aguardando', 'em_atendimento'] } },
          });

          if (!existente) {
            const atendentes = await prisma.waAtendente.findMany({
              where: { tenantId: tenant.id, ativo: true },
              orderBy: { cargaAtual: 'asc' },
            });
            const atendente = atendentes.find(a => a.cargaAtual < a.cargaMaxima) || null;

            await prisma.waFila.create({
              data: {
                tenantId: tenant.id,
                clienteTelefone: telefoneNorm,
                clienteNome,
                atendenteId: atendente?.id || null,
                status: atendente ? 'em_atendimento' : 'aguardando',
              },
            });

            if (atendente) {
              await prisma.waAtendente.update({
                where: { id: atendente.id },
                data: { cargaAtual: { increment: 1 } },
              });
            }

            // Notifica o tenant sobre nova sessão na fila
            await prisma.notificacao.create({
              data: {
                tenantId: tenant.id,
                tipo: 'wa_fila_nova',
                titulo: '💬 Nova sessão na fila de atendimento',
                corpo: `${clienteNome} (${telefoneNorm}) entrou na fila${atendente ? ` e foi atribuído a ${atendente.nome}` : ' aguardando atendente'}.`,
              },
            }).catch(() => {});
          }
        }
      }
    }
  } catch { /* silencioso — não expor erros internos */ }
});

module.exports = router;
