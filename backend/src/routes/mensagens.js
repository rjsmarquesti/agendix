const router  = require('express').Router();
const prisma  = require('../lib/prisma');
const auth    = require('../middlewares/auth');
const tenant  = require('../middlewares/tenant');
const { registrar } = require('../lib/mensagemLog');
const { enviarEmailTenant } = require('../lib/mailer');
const { enfileirar } = require('../services/waQueue');

const PAGE_SIZE = 20;

// GET /api/mensagens — histórico do tenant (enviados por ele + sistema→tenant)
router.get('/', tenant, auth, async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const { meio, origem, leadId, de, ate, page = 1 } = req.query;

    const where = { tenantId };
    if (meio)    where.meio   = meio;
    if (origem)  where.origem = origem;
    if (leadId)  where.leadId = parseInt(leadId);
    if (de || ate) {
      where.criadoEm = {};
      if (de)  where.criadoEm.gte = new Date(de);
      if (ate) where.criadoEm.lte = new Date(ate + 'T23:59:59');
    }

    const [logs, total] = await Promise.all([
      prisma.mensagemLog.findMany({
        where,
        orderBy: { criadoEm: 'desc' },
        skip: (parseInt(page) - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        include: { lead: { select: { id: true, nome: true } } },
      }),
      prisma.mensagemLog.count({ where }),
    ]);

    res.json({ logs, total, paginas: Math.ceil(total / PAGE_SIZE) });
  } catch (err) { next(err); }
});

// POST /api/mensagens/enviar — envio manual para um lead
router.post('/enviar', tenant, auth, async (req, res, next) => {
  try {
    const tenantData = req.tenant;
    const { leadId, meio, assunto, corpo } = req.body;

    if (!leadId || !meio || !corpo)
      return res.status(400).json({ error: 'leadId, meio e corpo são obrigatórios.' });
    if (!['email', 'whatsapp'].includes(meio))
      return res.status(400).json({ error: 'meio deve ser email ou whatsapp.' });

    const lead = await prisma.lead.findFirst({
      where: { id: parseInt(leadId), tenantId: tenantData.id },
    });
    if (!lead) return res.status(404).json({ error: 'Lead não encontrado.' });

    if (meio === 'email') {
      if (!lead.email)       return res.status(400).json({ error: 'Lead sem email cadastrado.' });
      if (!tenantData.smtpUser) return res.status(400).json({ error: 'SMTP não configurado. Acesse Configurações → SMTP.' });
    }
    if (meio === 'whatsapp') {
      if (!lead.telefone)            return res.status(400).json({ error: 'Lead sem telefone cadastrado.' });
      if (!tenantData.evolutionInstance) return res.status(400).json({ error: 'WhatsApp não configurado.' });
    }

    if (meio === 'email') {
      try {
        await enviarEmailTenant(tenantData, {
          para: lead.email,
          assunto: assunto || '(sem assunto)',
          html: corpo,
          leadId: lead.id,
          usuarioId: req.user.id,
          origem: 'manual',
        });
        return res.json({ ok: true });
      } catch (e) {
        return res.status(500).json({ error: e.message });
      }
    }

    // WhatsApp — fire-and-forget (não bloqueia o HTTP response aguardando fila anti-ban)
    const log = await prisma.mensagemLog.create({
      data: {
        tenantId: tenantData.id,
        leadId: lead.id,
        usuarioId: req.user.id,
        meio: 'whatsapp',
        para: lead.telefone,
        corpo,
        origem: 'manual',
        status: 'enviado',
        erroMsg: null,
      },
    });

    enfileirar(tenantData, lead.telefone, corpo).catch(e => {
      prisma.mensagemLog.update({
        where: { id: log.id },
        data: { status: 'erro', erroMsg: e.message },
      }).catch(() => {});
    });

    return res.json({ ok: true, logId: log.id });
  } catch (err) { next(err); }
});

module.exports = router;
