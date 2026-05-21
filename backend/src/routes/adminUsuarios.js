const router = require('express').Router();
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middlewares/auth');
const { requireRole } = require('../middlewares/auth');
const { enviarEmailRedefinicao } = require('../lib/mailer');

router.use(authMiddleware, requireRole('super_admin'));

const evoSend = async (phone, text) => {
  const base = process.env.EVOLUTION_BASE_URL || 'https://api.divulgabr.com.br';
  const key  = process.env.EVOLUTION_GLOBAL_API_KEY;
  const inst = process.env.EVOLUTION_GLOBAL_INSTANCE;
  if (!key || !inst || !phone) return;
  const num = phone.replace(/\D/g, '');
  const waNum = num.startsWith('55') ? num : `55${num}`;
  await fetch(`${base}/message/sendText/${inst}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: key },
    body: JSON.stringify({ number: waNum, text }),
  });
};

// GET /api/admin/usuarios
router.get('/', async (req, res) => {
  try {
    const { tenantId, role, ativo, q } = req.query;
    const where = {};
    if (tenantId) where.tenantId = Number(tenantId);
    if (role) where.role = role;
    if (ativo !== undefined) where.ativo = ativo === 'true';
    if (q) where.OR = [
      { nome:  { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
    ];

    const usuarios = await prisma.user.findMany({
      where,
      select: {
        id: true, nome: true, email: true, whatsapp: true, role: true, ativo: true,
        tenant: { select: { id: true, nome: true, slug: true } },
      },
      orderBy: [{ tenantId: 'asc' }, { nome: 'asc' }],
    });
    res.json(usuarios);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// PUT /api/admin/usuarios/:id
router.put('/:id', async (req, res) => {
  try {
    const { ativo, role, nome, email, whatsapp } = req.body;
    const data = {};
    if (ativo     !== undefined) data.ativo    = Boolean(ativo);
    if (role)                    data.role     = role;
    if (nome)                    data.nome     = nome;
    if (email)                   data.email    = email;
    if (whatsapp  !== undefined) data.whatsapp = whatsapp || null;
    const user = await prisma.user.update({ where: { id: Number(req.params.id) }, data });
    res.json({ ok: true, user: { id: user.id, nome: user.nome, email: user.email, whatsapp: user.whatsapp, ativo: user.ativo, role: user.role } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/admin/usuarios/:id/reset-senha
router.post('/:id/reset-senha', async (req, res) => {
  try {
    const { via } = req.body; // "email" | "whatsapp" | "ambos"
    const user = await prisma.user.findUnique({ where: { id: Number(req.params.id) } });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpires: expires },
    });

    const appUrl = process.env.APP_URL || 'https://agendix.divulgabr.com.br';
    const link = `${appUrl}/redefinir-senha?token=${token}`;

    if (via === 'email' || via === 'ambos') {
      await enviarEmailRedefinicao({ para: user.email, nome: user.nome, link }).catch(e =>
        console.error('[admin/reset-senha] email:', e.message)
      );
    }
    if (via === 'whatsapp' || via === 'ambos') {
      const msg = `Olá, *${user.nome}*! 👋\n\nO administrador gerou um link para você redefinir sua senha no Agendix.\n\nClique aqui para criar uma nova senha:\n${link}\n\n_Este link expira em 1 hora._`;
      await evoSend(user.whatsapp, msg).catch(e =>
        console.error('[admin/reset-senha] whatsapp:', e.message)
      );
    }

    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/admin/usuarios/:id/mensagem
router.post('/:id/mensagem', async (req, res) => {
  try {
    const { canal, assunto, mensagem } = req.body;
    if (!canal || !mensagem) return res.status(400).json({ error: 'canal e mensagem são obrigatórios' });

    const user = await prisma.user.findUnique({ where: { id: Number(req.params.id) } });
    if (!user) return res.status(404).json({ error: 'Usuário não encontrado' });

    if (canal === 'email') {
      const { createTransport } = require('nodemailer');
      const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@agendix.com.br';
      const transporter = createTransport({
        host:   process.env.SMTP_HOST   || 'smtp.hostinger.com',
        port:   Number(process.env.SMTP_PORT || 465),
        secure: process.env.SMTP_SECURE !== 'false',
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      });
      await transporter.sendMail({
        from: `"Agendix Admin" <${from}>`,
        to: user.email,
        subject: assunto || 'Mensagem do Agendix',
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px"><p>Olá, <strong>${user.nome}</strong>.</p><p>${mensagem.replace(/\n/g, '<br>')}</p><p style="color:#9ca3af;font-size:12px">Agendix — suporte@divulgabr.com.br</p></div>`,
      });
    } else if (canal === 'whatsapp') {
      await evoSend(user.whatsapp, mensagem);
    } else {
      return res.status(400).json({ error: 'canal deve ser "email" ou "whatsapp"' });
    }

    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
