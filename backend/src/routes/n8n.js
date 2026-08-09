/**
 * Rotas de integração n8n → CRM.
 * Autenticação via header: X-API-Token: <token>
 */
const router = require('express').Router();
const prisma = require('../lib/prisma');
const { decryptTenant } = require('../lib/encrypt');
const { getSlots } = require('../services/disponibilidadeService');
const parseEndereco = require('../utils/parseEndereco');
const { localDateStr } = require('../utils/dateUtils');
const { LIMITE_AGENDAMENTOS, BOT_WHATSAPP } = require('../config/planos');

// ── Middleware de autenticação por API token ─────────────────────────────────
async function apiTokenAuth(req, res, next) {
  const token = req.headers['x-api-token'];
  if (!token) return res.status(401).json({ error: 'X-API-Token obrigatório' });
  const raw = await prisma.tenant.findFirst({ where: { apiToken: token, ativo: true } });
  if (!raw) return res.status(401).json({ error: 'Token inválido ou empresa inativa' });
  req.tenant = decryptTenant(raw);
  next();
}

// ── Middleware de autenticação master (todos os tenants) ──────────────────────
function masterTokenAuth(req, res, next) {
  const token = req.headers['x-master-token'];
  if (!token || token !== process.env.MASTER_API_TOKEN) {
    return res.status(401).json({ error: 'Master token inválido' });
  }
  next();
}

// ══════════════════════════════════════════════════════════════════════════════
// LEADS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/n8n/leads — listar leads do tenant
router.get('/leads', apiTokenAuth, async (req, res, next) => {
  try {
    const { status, telefone, limite = 50 } = req.query;
    const where = { tenantId: req.tenant.id };
    if (status)   where.status = status;
    if (telefone) {
      const tel = telefone.replace(/\D/g, '');
      const telSem55 = tel.startsWith('55') && tel.length > 11 ? tel.slice(2) : tel;
      const telCom55 = tel.startsWith('55') ? tel : '55' + tel;
      // endsWith cobre formatos como "+021..." gravados pelo extrator Google Maps
      where.OR = [
        { telefone: tel },
        { telefone: telSem55 },
        { telefone: telCom55 },
        { telefone: { endsWith: telSem55 } },
      ];
    }
    const leads = await prisma.lead.findMany({ where, orderBy: { createdAt: 'desc' }, take: Number(limite) });
    res.json({ leads });
  } catch (err) { next(err); }
});

// POST /api/n8n/leads — criar lead via n8n
router.post('/leads', apiTokenAuth, async (req, res, next) => {
  try {
    const { nome, telefone, email, origem, status, observacoes, cep, logradouro, numero, complemento, bairro, cidade, estado } = req.body;
    if (!nome) return res.status(400).json({ error: 'Campo nome é obrigatório' });
    const lead = await prisma.lead.create({
      data: { tenantId: req.tenant.id, nome, telefone: telefone?.replace(/\D/g,''), email, origem, status: status || 'novo', observacoes, cep, logradouro, numero, complemento, bairro, cidade, estado, fonte: 'api' },
    });
    res.status(201).json({ lead });
  } catch (err) { next(err); }
});

// POST /api/n8n/migrar-enderecos — one-shot: extrai endereço de observacoes → campos corretos
router.post('/migrar-enderecos', apiTokenAuth, async (req, res, next) => {
  try {
    // Busca leads google_maps sem cidade (null OU string vazia) que tenham observacoes
    const leads = await prisma.lead.findMany({
      where: {
        tenantId: req.tenant.id,
        fonte: 'google_maps',
        OR: [{ cidade: null }, { cidade: '' }],
        observacoes: { not: null },
      },
    });

    let atualizados = 0, ignorados = 0;
    const detalhes = [];
    for (const lead of leads) {
      // aceita ENDEREÇO ou ENDERECO (com ou sem cedilha)
      const endMatch = lead.observacoes?.match(/ENDERE.{0,2}O:\s*([^|]+)/i);
      if (!endMatch) { ignorados++; detalhes.push({ id: lead.id, motivo: 'sem ENDEREÇO na observacoes' }); continue; }
      const enderecoRaw = endMatch[1].trim();
      const addr = parseEndereco(enderecoRaw);
      if (!addr.cidade && !addr.estado) { ignorados++; detalhes.push({ id: lead.id, motivo: 'parse falhou', endereco: enderecoRaw }); continue; }

      await prisma.lead.update({
        where: { id: lead.id },
        data: {
          cidade:     addr.cidade     || undefined,
          municipio:  addr.cidade     || undefined,
          estado:     addr.estado     || undefined,
          bairro:     addr.bairro     || undefined,
          cep:        addr.cep        || undefined,
          logradouro: addr.logradouro || undefined,
          origem:     lead.origem === 'Google Maps' ? 'Google Maps Extrator' : undefined,
        },
      });
      atualizados++;
    }
    res.json({ ok: true, atualizados, ignorados, total: leads.length, detalhes });
  } catch (err) { next(err); }
});

// PATCH /api/n8n/leads/:id — atualizar lead via n8n
router.patch('/leads/:id', apiTokenAuth, async (req, res, next) => {
  try {
    const result = await prisma.lead.updateMany({
      where: { id: Number(req.params.id), tenantId: req.tenant.id },
      data: req.body,
    });
    if (result.count === 0) return res.status(404).json({ error: 'Lead não encontrado' });
    const lead = await prisma.lead.findUnique({ where: { id: Number(req.params.id) } });
    res.json({ lead });
  } catch (err) { next(err); }
});

// ══════════════════════════════════════════════════════════════════════════════
// AGENDAMENTOS
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/n8n/agendamentos — listar agendamentos (filtros: data, status, telefone, proximos)
router.get('/agendamentos', apiTokenAuth, async (req, res, next) => {
  try {
    const { data, status, telefone, proximos, lembrete } = req.query;
    const where = { tenantId: req.tenant.id };

    if (data)   where.data = data;
    if (status) where.status = status;
    if (proximos === 'true') {
      const hoje = localDateStr();
      where.data = { gte: hoje };
      where.status = { in: ['marcado', 'confirmado'] };
    }
    if (lembrete === 'pendente') {
      const hoje = localDateStr();
      const amanha = (() => { const d = new Date(); d.setDate(d.getDate() + 1); return localDateStr(d); })();
      where.lembreteEnviado = false;
      where.data = { gte: hoje, lte: amanha };
      where.status = { in: ['marcado', 'confirmado'] };
    }

    // Filtro por telefone do lead
    if (telefone) {
      const tel = telefone.replace(/\D/g, '');
      where.lead = { telefone: tel };
    }

    const agendamentos = await prisma.agendamento.findMany({
      where,
      orderBy: [{ data: 'asc' }, { hora: 'asc' }],
      take: 50,
      include: { lead: { select: { nome: true, telefone: true, email: true } } },
    });
    res.json({ agendamentos });
  } catch (err) { next(err); }
});

// POST /api/n8n/agendamentos — criar agendamento via WhatsApp bot
router.post('/agendamentos', apiTokenAuth, async (req, res, next) => {
  try {
    if (!BOT_WHATSAPP[req.tenant.plano]) {
      return res.status(403).json({ error: 'Bot WhatsApp não disponível no plano atual. Faça upgrade.' });
    }

    const { lead_id, cliente_nome, cliente_telefone, data, hora, tipo, observacoes, servicoId } = req.body;
    if (!data || !hora) return res.status(400).json({ error: 'Campos "data" e "hora" obrigatórios.' });

    // Verificar limite de agendamentos/mês do plano
    const mesAtual = new Date().toISOString().slice(0, 7);
    const totalMes = await prisma.agendamento.count({ where: { tenantId: req.tenant.id, data: { startsWith: mesAtual } } });
    const limiteAg = LIMITE_AGENDAMENTOS[req.tenant.plano] ?? 50;
    if (totalMes >= limiteAg) {
      return res.status(403).json({ error: `Limite de ${limiteAg} agendamentos/mês atingido.` });
    }

    const svcId = servicoId ? parseInt(servicoId) : null;

    // Verifica disponibilidade (considera duração do serviço se informado)
    const slotResult = await getSlots(req.tenant.id, data, svcId);
    if (slotResult.erro) return res.status(400).json({ error: slotResult.erro });
    if (!slotResult.slots.includes(hora)) {
      return res.status(409).json({ error: 'Horário indisponível.' });
    }

    // Resolve lead: usa lead_id, ou busca/cria pelo telefone
    let leadId = lead_id ? Number(lead_id) : null;
    if (!leadId && cliente_telefone) {
      const tel = cliente_telefone.replace(/\D/g, '');
      let lead = await prisma.lead.findFirst({ where: { tenantId: req.tenant.id, telefone: tel } });
      if (!lead) {
        lead = await prisma.lead.create({
          data: { tenantId: req.tenant.id, nome: cliente_nome || 'Cliente WhatsApp', telefone: tel, status: 'agendado', fonte: 'api' },
        });
      }
      leadId = lead.id;
    }
    if (!leadId) return res.status(400).json({ error: 'Informe "lead_id" ou "cliente_telefone".' });

    const agendamento = await prisma.$transaction(async (tx) => {
      const conflito = await tx.agendamento.findFirst({
        where: { tenantId: req.tenant.id, data, hora, status: { in: ['marcado', 'confirmado'] } },
      });
      if (conflito) { const e = new Error('SLOT_OCUPADO'); e.status = 409; throw e; }

      return tx.agendamento.create({
        data: {
          tenantId: req.tenant.id, leadId, servicoId: svcId, data, hora,
          tipo: tipo || 'consulta', status: 'marcado', canalOrigem: 'whatsapp',
          clienteNome: cliente_nome || null, clienteTelefone: cliente_telefone?.replace(/\D/g,'') || null,
          observacoes: observacoes || null,
        },
        include: { lead: { select: { nome: true, telefone: true, email: true } } },
      });
    });

    res.status(201).json({ agendamento });
  } catch (err) {
    if (err.message === 'SLOT_OCUPADO' || err.status === 409) {
      return res.status(409).json({ error: 'Horário foi reservado por outra pessoa. Tente outro.' });
    }
    next(err);
  }
});

// PATCH /api/n8n/agendamentos/:id — atualizar status ou marcar lembrete enviado
router.patch('/agendamentos/:id', apiTokenAuth, async (req, res, next) => {
  try {
    const existe = await prisma.agendamento.findFirst({ where: { id: Number(req.params.id), tenantId: req.tenant.id } });
    if (!existe) return res.status(404).json({ error: 'Agendamento não encontrado' });
    const { tipoLembrete, ...rest } = req.body;
    const data = { ...rest };
    if (tipoLembrete === '3d')  data.lembrete3dEnviado  = true;
    if (tipoLembrete === '1d')  data.lembrete1dEnviado  = true;
    if (tipoLembrete === 'dia') data.lembreteDiaEnviado = true;
    const agendamento = await prisma.agendamento.update({
      where: { id: Number(req.params.id) },
      data,
      include: { lead: { select: { nome: true, telefone: true, email: true } } },
    });
    res.json({ agendamento });
  } catch (err) { next(err); }
});

// ══════════════════════════════════════════════════════════════════════════════
// DISPONIBILIDADE
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/n8n/disponibilidade?data=YYYY-MM-DD
router.get('/disponibilidade', apiTokenAuth, async (req, res, next) => {
  try {
    const { data, servicoId } = req.query;
    if (!data) return res.status(400).json({ error: 'Parâmetro "data" obrigatório.' });

    const resultado = await getSlots(req.tenant.id, data, servicoId ? parseInt(servicoId) : null);
    if (resultado.erro) return res.status(400).json({ error: resultado.erro, slots: [] });

    res.json({ data, slots: resultado.slots, total: resultado.slots.length });
  } catch (err) { next(err); }
});

// ══════════════════════════════════════════════════════════════════════════════
// CONVERSAS WHATSAPP (estado da conversa do bot)
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/n8n/conversas/:telefone
router.get('/conversas/:telefone', apiTokenAuth, async (req, res, next) => {
  try {
    if (BOT_WHATSAPP[req.tenant.plano] !== 'completo') {
      return res.status(403).json({ error: 'Bot WhatsApp conversacional disponível a partir do plano Pro.' });
    }
    const telefone = req.params.telefone.replace(/\D/g, '');
    const conversa = await prisma.conversaWhatsapp.findUnique({
      where: { telefone_tenantId: { telefone, tenantId: req.tenant.id } },
    });

    if (!conversa) return res.status(404).json({ error: 'Conversa não encontrada.' });

    // Verifica TTL
    if (new Date() > new Date(conversa.expiresAt)) {
      await prisma.conversaWhatsapp.delete({
        where: { telefone_tenantId: { telefone, tenantId: req.tenant.id } },
      });
      return res.status(404).json({ error: 'Conversa expirada.' });
    }

    res.json({ conversa });
  } catch (err) { next(err); }
});

// PUT /api/n8n/conversas/:telefone — cria ou atualiza conversa
router.put('/conversas/:telefone', apiTokenAuth, async (req, res, next) => {
  try {
    if (BOT_WHATSAPP[req.tenant.plano] !== 'completo') {
      return res.status(403).json({ error: 'Bot WhatsApp conversacional disponível a partir do plano Pro.' });
    }
    const telefone = req.params.telefone.replace(/\D/g, '');
    const { estado, dadosJson } = req.body;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min

    const conversa = await prisma.conversaWhatsapp.upsert({
      where: { telefone_tenantId: { telefone, tenantId: req.tenant.id } },
      update: { estado: estado || 'inicio', dadosJson: dadosJson || {}, expiresAt },
      create: { tenantId: req.tenant.id, telefone, estado: estado || 'inicio', dadosJson: dadosJson || {}, expiresAt },
    });

    res.json({ conversa });
  } catch (err) { next(err); }
});

// DELETE /api/n8n/conversas/:telefone — encerra conversa
router.delete('/conversas/:telefone', apiTokenAuth, async (req, res, next) => {
  try {
    if (BOT_WHATSAPP[req.tenant.plano] !== 'completo') {
      return res.status(403).json({ error: 'Bot WhatsApp conversacional disponível a partir do plano Pro.' });
    }
    const telefone = req.params.telefone.replace(/\D/g, '');
    await prisma.conversaWhatsapp.deleteMany({
      where: { telefone, tenantId: req.tenant.id },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ══════════════════════════════════════════════════════════════════════════════
// SETTINGS (templates de mensagem e nicho para uso nos workflows n8n)
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/n8n/settings — retorna templates de mensagem e nichoLabel do tenant
router.get('/settings', apiTokenAuth, async (req, res, next) => {
  try {
    const config = await prisma.configuracaoAgenda.findUnique({ where: { tenantId: req.tenant.id } });
    res.json({
      tenantNome: req.tenant.nome,
      telefone:   req.tenant.telefone   || null,
      nichoLabel: req.tenant.nichoLabel || 'atendimento',
      evolutionInstance: req.tenant.evolutionInstance || null,
      evolutionApiKey:   req.tenant.evolutionApiKey   || null,
      evolutionBaseUrl:  req.tenant.evolutionBaseUrl  || 'https://api.divulgabr.com.br',
      mensagemWaConfirmacao: config?.mensagemWaConfirmacao || null,
      mensagemWaLembrete: config?.mensagemWaLembrete || null,
      mensagemWaAdmin: config?.mensagemWaAdmin || null,
    });
  } catch (err) { next(err); }
});

// ══════════════════════════════════════════════════════════════════════════════
// LEMBRETES GLOBAIS (todos os tenants — autenticado por MASTER_API_TOKEN)
// ══════════════════════════════════════════════════════════════════════════════

// GET /api/n8n/lembretes-globais — lembretes pendentes de TODOS os tenants ativos
router.get('/lembretes-globais', masterTokenAuth, async (req, res, next) => {
  try {
    function localDate(offsetDays = 0) {
      const d = new Date();
      d.setDate(d.getDate() + offsetDays);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }
    const hoje = localDate(0);
    const em1d  = localDate(1);
    const em3d  = localDate(3);

    const include = {
      lead: { select: { nome: true, telefone: true } },
      tenant: { select: { nome: true, apiToken: true, configuracaoAgenda: { select: { whatsappAdmin: true } } } },
    };
    const statusFiltro = { in: ['marcado', 'confirmado'] };

    const [ags3d, ags1d, agsDia] = await Promise.all([
      prisma.agendamento.findMany({ where: { lembrete3dEnviado: false,  data: em3d,  status: statusFiltro, tenant: { ativo: true } }, include, orderBy: [{ hora: 'asc' }] }),
      prisma.agendamento.findMany({ where: { lembrete1dEnviado: false,  data: em1d,  status: statusFiltro, tenant: { ativo: true } }, include, orderBy: [{ hora: 'asc' }] }),
      prisma.agendamento.findMany({ where: { lembreteDiaEnviado: false, data: hoje, status: statusFiltro, tenant: { ativo: true } }, include, orderBy: [{ hora: 'asc' }] }),
    ]);

    function mapAg(ag, tipoLembrete) {
      const digits = (ag.lead?.telefone || '').replace(/\D/g, '');
      const phoneWA = digits.length >= 10 ? (digits.startsWith('55') ? digits : '55' + digits) : '';
      return { agendamentoId: ag.id, data: ag.data, hora: ag.hora, leadNome: ag.lead?.nome || '', phoneWA, tenantNome: ag.tenant?.nome || '', whatsappAdmin: ag.tenant?.configuracaoAgenda?.whatsappAdmin || '', apiToken: ag.tenant?.apiToken || '', tipoLembrete };
    }

    const lembretes = [
      ...ags3d.map(ag => mapAg(ag, '3d')),
      ...ags1d.map(ag => mapAg(ag, '1d')),
      ...agsDia.map(ag => mapAg(ag, 'dia')),
    ].filter(l => l.phoneWA && l.apiToken);

    res.json({ lembretes });
  } catch (err) { next(err); }
});

// GET /api/n8n/tenant-by-slug/:slug — resolve apiToken pelo slug da instância Evolution
router.get('/tenant-by-slug/:slug', masterTokenAuth, async (req, res, next) => {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: req.params.slug },
      select: { apiToken: true, nichoLabel: true, nome: true, ativo: true },
    });
    if (!tenant || !tenant.ativo) return res.status(404).json({ error: 'Tenant não encontrado' });
    res.json({ apiToken: tenant.apiToken, nichoLabel: tenant.nichoLabel || 'atendimento', tenantNome: tenant.nome });
  } catch (err) { next(err); }
});

module.exports = router;
