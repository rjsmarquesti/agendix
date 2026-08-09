const router  = require('express').Router();
const prisma  = require('../lib/prisma');
const auth    = require('../middlewares/auth');
const { registrar } = require('../lib/mensagemLog');
const nodemailer = require('nodemailer');

const evoSend = async (phone, text) => {
  const base = process.env.EVOLUTION_BASE_URL || 'https://api.divulgabr.com.br';
  const key  = process.env.EVOLUTION_GLOBAL_API_KEY;
  const inst = process.env.EVOLUTION_GLOBAL_INSTANCE;
  if (!key || !inst || !phone) throw new Error('Evolution API não configurada.');
  const num   = phone.replace(/\D/g, '');
  const waNum = num.startsWith('55') ? num : `55${num}`;
  const r = await fetch(`${base}/message/sendText/${inst}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key },
    body: JSON.stringify({ number: waNum, text }),
  });
  if (!r.ok) throw new Error(`Evolution retornou ${r.status}`);
};

function requireSuper(req, res, next) {
  if (req.user?.role !== 'super_admin') return res.status(403).json({ error: 'Acesso negado.' });
  next();
}

const PAGE_SIZE = 20;

// GET /api/admin/mensagens
router.get('/', auth, requireSuper, async (req, res, next) => {
  try {
    const { tenantId, meio, origem, de, ate, page = 1 } = req.query;

    const where = {};
    if (tenantId) where.tenantId = parseInt(tenantId);
    if (meio)     where.meio     = meio;
    if (origem)   where.origem   = origem;
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
        include: {
          tenant: { select: { id: true, nome: true, slug: true } },
          lead:   { select: { id: true, nome: true } },
        },
      }),
      prisma.mensagemLog.count({ where }),
    ]);

    res.json({ logs, total, paginas: Math.ceil(total / PAGE_SIZE) });
  } catch (err) { next(err); }
});

// POST /api/admin/mensagens/enviar-tenant — admin envia mensagem direta ao tenant
router.post('/enviar-tenant', auth, requireSuper, async (req, res, next) => {
  try {
    const { tenantId, meio, assunto, corpo } = req.body;
    if (!tenantId || !meio || !corpo)
      return res.status(400).json({ error: 'tenantId, meio e corpo são obrigatórios.' });
    if (!['email', 'whatsapp'].includes(meio))
      return res.status(400).json({ error: 'meio deve ser email ou whatsapp.' });

    const tenant = await prisma.tenant.findUnique({ where: { id: parseInt(tenantId) } });
    if (!tenant) return res.status(404).json({ error: 'Tenant não encontrado.' });

    if (meio === 'email' && !tenant.email)
      return res.status(400).json({ error: 'Tenant sem email cadastrado.' });
    if (meio === 'whatsapp' && !tenant.telefone)
      return res.status(400).json({ error: 'Tenant sem telefone cadastrado.' });

    let status = 'enviado', erroMsg;

    if (meio === 'email') {
      const from  = process.env.SMTP_FROM || process.env.SMTP_USER || 'suporte@divulgabr.com.br';
      const trans = nodemailer.createTransport({
        host:   process.env.SMTP_HOST || 'smtp.hostinger.com',
        port:   Number(process.env.SMTP_PORT || 465),
        secure: true,
        auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      try {
        await trans.sendMail({
          from: `"Agendix Admin" <${from}>`,
          to:   tenant.email,
          subject: assunto || 'Mensagem da equipe Agendix',
          html: `<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;background:#09090C;color:#EEEEF5;border-radius:12px">
            <p style="margin:0 0 8px">Olá, <strong>${tenant.nome}</strong>.</p>
            <div style="margin:16px 0;line-height:1.7">${corpo.replace(/\n/g, '<br>')}</div>
            <p style="color:#7878A0;font-size:12px;margin-top:24px">Agendix · suporte@divulgabr.com.br</p>
          </div>`,
        });
      } catch (e) {
        status = 'erro'; erroMsg = e.message;
      }
    } else {
      try {
        await evoSend(tenant.telefone, corpo);
      } catch (e) {
        status = 'erro'; erroMsg = e.message;
      }
    }

    await registrar({
      tenantId: tenant.id,
      meio,
      para: meio === 'email' ? tenant.email : tenant.telefone,
      assunto: assunto || null,
      corpo,
      origem: 'admin',
      usuarioId: req.user.id,
      status,
      erroMsg,
      _throw: true,
    });

    if (status === 'erro') return res.status(500).json({ error: erroMsg });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/admin/mensagens/:id
router.delete('/:id', auth, requireSuper, async (req, res, next) => {
  try {
    await prisma.mensagemLog.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /api/admin/mensagens — exclusão em lote { ids: [1,2,3] }
router.delete('/', auth, requireSuper, async (req, res, next) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ error: 'ids deve ser um array não vazio.' });
    const { count } = await prisma.mensagemLog.deleteMany({
      where: { id: { in: ids.map(Number) } },
    });
    res.json({ ok: true, removidos: count });
  } catch (err) { next(err); }
});

module.exports = router;
