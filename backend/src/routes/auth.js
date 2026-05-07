const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/authController');
const auth = require('../middlewares/auth');
const tenantMiddleware = require('../middlewares/tenant');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { enviarEmailRedefinicao, enviarEmailAtivacao } = require('../lib/mailer');

const validarLogin = [
  body('email').isEmail().withMessage('Email inválido'),
  body('senha').notEmpty().withMessage('Senha obrigatória'),
];

// Cadastro público — cria tenant + admin com trial de 14 dias (conta inativa até confirmação)
router.post('/register', async (req, res, next) => {
  try {
    const { nomeEmpresa, nomeCompleto, email, confirmEmail, whatsapp, senha } = req.body;

    if (!nomeEmpresa || !nomeCompleto || !email || !confirmEmail || !whatsapp || !senha)
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    if (email !== confirmEmail)
      return res.status(400).json({ error: 'Os emails não coincidem' });
    if (senha.length < 6)
      return res.status(400).json({ error: 'Senha mínimo 6 caracteres' });

    const whatsappNorm = whatsapp.replace(/\D/g, '');
    if (whatsappNorm.length < 10)
      return res.status(400).json({ error: 'WhatsApp inválido' });

    // Gera slug único a partir do nome da empresa
    let baseSlug = nomeEmpresa.toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
    let slug = baseSlug;
    let tentativa = 1;
    while (await prisma.tenant.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${++tentativa}`;
    }

    const trialVencimento = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    const tenant = await prisma.tenant.create({
      data: {
        nome: nomeEmpresa,
        slug,
        plano: 'basico',
        planoStatus: 'trial',
        planoVencimento: trialVencimento,
        modulos: ['leads', 'agendamentos'],
        whatsappResponsavel: whatsappNorm,
      },
    });

    const activationToken = crypto.randomBytes(32).toString('hex');
    const activationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const hash = await bcrypt.hash(senha, 10);
    const user = await prisma.user.create({
      data: {
        nome: nomeCompleto,
        email,
        senha: hash,
        role: 'admin',
        tenantId: tenant.id,
        ativo: false,
        whatsapp: whatsappNorm,
        activationToken,
        activationExpires,
      },
    });

    const appUrl = process.env.APP_URL || 'https://agendix.divulgabr.com.br';
    const linkAtivacao = `${appUrl}/ativar?token=${activationToken}`;

    // Envia email de ativação (fire-and-forget)
    enviarEmailAtivacao({ para: email, nome: nomeCompleto, link: linkAtivacao }).catch(e =>
      console.error('[register] email ativacao:', e.message)
    );

    // Envia WhatsApp de ativação via Evolution API global (fire-and-forget)
    const evoBase = process.env.EVOLUTION_BASE_URL || 'https://api.divulgabr.com.br';
    const evoKey  = process.env.EVOLUTION_GLOBAL_API_KEY;
    const evoInst = process.env.EVOLUTION_GLOBAL_INSTANCE;
    if (evoKey && evoInst) {
      const waNum = whatsappNorm.startsWith('55') ? whatsappNorm : `55${whatsappNorm}`;
      const waMsg = `Olá, *${nomeCompleto}*! 👋\n\nSua conta no *Agendix* foi criada com sucesso.\n\nClique no link abaixo para ativar sua conta e começar a usar:\n\n${linkAtivacao}\n\n_Este link expira em 24 horas._`;
      fetch(`${evoBase}/message/sendText/${evoInst}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', apikey: evoKey },
        body: JSON.stringify({ number: waNum, text: waMsg }),
      }).catch(e => console.error('[register] whatsapp ativacao:', e.message));
    }

    res.status(201).json({
      message: 'Conta criada! Verifique seu email e WhatsApp para ativar.',
    });
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Email já cadastrado para esta empresa' });
    next(err);
  }
});

// Ativar conta via token
router.get('/ativar', async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token inválido' });

    const user = await prisma.user.findFirst({
      where: { activationToken: token, activationExpires: { gt: new Date() } },
    });

    if (!user) return res.status(400).json({ error: 'Link de ativação inválido ou expirado' });

    await prisma.user.update({
      where: { id: user.id },
      data: { ativo: true, activationToken: null, activationExpires: null },
    });

    res.json({ ok: true, message: 'Conta ativada com sucesso!' });
  } catch (err) { next(err); }
});

// Login de tenant (requer X-Tenant-Slug)
router.post('/login', tenantMiddleware, validarLogin, ctrl.login);

// Login super admin (sem tenant)
router.post('/super-login', validarLogin, ctrl.login);

// Dados do usuário logado
router.get('/me', auth, ctrl.me);

// Trocar própria senha
router.put('/senha', auth, async (req, res, next) => {
  try {
    const { senhaAtual, novaSenha } = req.body;
    if (!novaSenha || novaSenha.length < 6) return res.status(400).json({ error: 'Nova senha mínimo 6 caracteres' });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const ok = await bcrypt.compare(senhaAtual, user.senha);
    if (!ok) return res.status(400).json({ error: 'Senha atual incorreta' });

    const hash = await bcrypt.hash(novaSenha, 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { senha: hash } });
    res.json({ message: 'Senha atualizada com sucesso' });
  } catch (err) { next(err); }
});

// Atualizar perfil (nome + email) do usuário logado
router.put('/perfil', auth, async (req, res, next) => {
  try {
    const { nome, email } = req.body;
    if (!nome || !email) return res.status(400).json({ error: 'Nome e email são obrigatórios' });

    const existe = await prisma.user.findFirst({ where: { email, NOT: { id: req.user.id } } });
    if (existe) return res.status(400).json({ error: 'Email já está em uso por outro usuário' });

    const updated = await prisma.user.update({ where: { id: req.user.id }, data: { nome, email } });
    res.json({ message: 'Perfil atualizado com sucesso', user: { id: updated.id, nome: updated.nome, email: updated.email, role: updated.role } });
  } catch (err) { next(err); }
});

// Solicitar redefinição de senha
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email obrigatório' });

    // Suporta tenant (X-Tenant-Slug) ou super admin (sem header)
    const slug = req.headers['x-tenant-slug'];
    let tenantId = null;
    if (slug) {
      const tenant = await prisma.tenant.findUnique({ where: { slug } });
      if (!tenant) return res.status(400).json({ error: 'Empresa não encontrada' });
      tenantId = tenant.id;
    }

    const user = await prisma.user.findFirst({
      where: { email, tenantId: tenantId ?? null },
    });

    // Resposta genérica para não revelar se o email existe
    if (!user || !user.ativo) {
      return res.json({ message: 'Se o email estiver cadastrado, você receberá um link em instantes.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpires: expires },
    });

    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const link = `${appUrl}/redefinir-senha?token=${token}`;

    await enviarEmailRedefinicao({ para: user.email, nome: user.nome, link });

    res.json({ message: 'Se o email estiver cadastrado, você receberá um link em instantes.' });
  } catch (err) { next(err); }
});

// Redefinir senha com token
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, novaSenha } = req.body;
    if (!token || !novaSenha) return res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
    if (novaSenha.length < 6) return res.status(400).json({ error: 'Senha mínimo 6 caracteres' });

    const user = await prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: { gt: new Date() },
      },
    });

    if (!user) return res.status(400).json({ error: 'Token inválido ou expirado' });

    const hash = await bcrypt.hash(novaSenha, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { senha: hash, passwordResetToken: null, passwordResetExpires: null },
    });

    res.json({ message: 'Senha redefinida com sucesso. Faça login com sua nova senha.' });
  } catch (err) { next(err); }
});

module.exports = router;
