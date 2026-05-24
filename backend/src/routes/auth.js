const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/authController');
const auth = require('../middlewares/auth');
const tenantMiddleware = require('../middlewares/tenant');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { enviarEmailRedefinicao, enviarEmailAtivacao, enviarEmailBoasVindas } = require('../lib/mailer');
const { encrypt, decrypt } = require('../lib/encrypt');

const validarLogin = [
  body('email').isEmail().withMessage('Email invÃ¡lido'),
  body('senha').notEmpty().withMessage('Senha obrigatÃ³ria'),
];

// Cadastro pÃºblico â€” cria tenant + admin com trial de 30 dias (conta inativa atÃ© confirmaÃ§Ã£o)
router.post('/register', async (req, res, next) => {
  try {
    const { nomeEmpresa, nomeCompleto, email, whatsapp, senha } = req.body;

    if (!nomeEmpresa || !nomeCompleto || !email || !whatsapp || !senha)
      return res.status(400).json({ error: 'Todos os campos sÃ£o obrigatÃ³rios' });
    if (senha.length < 6)
      return res.status(400).json({ error: 'Senha mÃ­nimo 6 caracteres' });

    const whatsappNorm = whatsapp.replace(/\D/g, '');
    if (whatsappNorm.length < 10)
      return res.status(400).json({ error: 'WhatsApp invÃ¡lido' });

    // Gera slug Ãºnico a partir do nome da empresa
    let baseSlug = nomeEmpresa.toLowerCase()
      .normalize('NFD').replace(/̀-ͯ/gu, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
    let slug = baseSlug;
    let tentativa = 1;
    while (await prisma.tenant.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${++tentativa}`;
    }

    const trialVencimento = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const tenant = await prisma.tenant.create({
      data: {
        nome: nomeEmpresa,
        slug,
        plano: 'solo',
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

    // Envia email de ativaÃ§Ã£o (fire-and-forget)
    enviarEmailAtivacao({ para: email, nome: nomeCompleto, link: linkAtivacao }).catch(e =>
      console.error('[register] email ativacao:', e.message)
    );

    // Envia WhatsApp de ativaÃ§Ã£o via Evolution API global (fire-and-forget)
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
    if (err.code === 'P2002') return res.status(400).json({ error: 'Email jÃ¡ cadastrado para esta empresa' });
    next(err);
  }
});

// Ativar conta via token
router.get('/ativar', async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) return res.status(400).json({ error: 'Token invÃ¡lido' });

    const user = await prisma.user.findFirst({
      where: { activationToken: token, activationExpires: { gt: new Date() } },
    });

    if (!user) return res.status(400).json({ error: 'Link de ativaÃ§Ã£o invÃ¡lido ou expirado' });

    const userAtivado = await prisma.user.update({
      where: { id: user.id },
      data: { ativo: true, activationToken: null, activationExpires: null },
      include: { tenant: { select: { slug: true } } },
    });

    // Email de boas-vindas com primeiros passos (fire-and-forget)
    enviarEmailBoasVindas({
      para: userAtivado.email,
      nome: userAtivado.nome,
      slug: userAtivado.tenant?.slug || '',
    }).catch(e => console.error('[ativar] email boas-vindas:', e.message));

    res.json({ ok: true, message: 'Conta ativada com sucesso!' });
  } catch (err) { next(err); }
});

// Login de tenant (requer X-Tenant-Slug)
router.post('/login', tenantMiddleware, validarLogin, ctrl.login);

// Login super admin (sem tenant)
router.post('/super-login', validarLogin, ctrl.login);

// Dados do usuÃ¡rio logado
router.get('/me', auth, ctrl.me);

// Trocar prÃ³pria senha
router.put('/senha', auth, async (req, res, next) => {
  try {
    const { senhaAtual, novaSenha } = req.body;
    if (!novaSenha || novaSenha.length < 6) return res.status(400).json({ error: 'Nova senha mÃ­nimo 6 caracteres' });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const ok = await bcrypt.compare(senhaAtual, user.senha);
    if (!ok) return res.status(400).json({ error: 'Senha atual incorreta' });

    const hash = await bcrypt.hash(novaSenha, 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { senha: hash } });
    res.json({ message: 'Senha atualizada com sucesso' });
  } catch (err) { next(err); }
});

// Atualizar perfil (nome + email) do usuÃ¡rio logado
router.put('/perfil', auth, async (req, res, next) => {
  try {
    const { nome, email } = req.body;
    if (!nome || !email) return res.status(400).json({ error: 'Nome e email sÃ£o obrigatÃ³rios' });

    const existe = await prisma.user.findFirst({ where: { email, NOT: { id: req.user.id } } });
    if (existe) return res.status(400).json({ error: 'Email jÃ¡ estÃ¡ em uso por outro usuÃ¡rio' });

    const updated = await prisma.user.update({ where: { id: req.user.id }, data: { nome, email } });
    res.json({ message: 'Perfil atualizado com sucesso', user: { id: updated.id, nome: updated.nome, email: updated.email, role: updated.role } });
  } catch (err) { next(err); }
});

// Solicitar redefiniÃ§Ã£o de senha
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email obrigatÃ³rio' });

    // Suporta tenant (X-Tenant-Slug) ou super admin (sem header)
    const slug = req.headers['x-tenant-slug'];
    let tenantId = null;
    if (slug) {
      const tenant = await prisma.tenant.findUnique({ where: { slug } });
      if (!tenant) return res.status(400).json({ error: 'Empresa nÃ£o encontrada' });
      tenantId = tenant.id;
    }

    const user = await prisma.user.findFirst({
      where: { email, tenantId: tenantId ?? null },
    });

    // Resposta genÃ©rica para nÃ£o revelar se o email existe
    if (!user || !user.ativo) {
      return res.json({ message: 'Se o email estiver cadastrado, vocÃª receberÃ¡ um link em instantes.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetToken: token, passwordResetExpires: expires },
    });

    const appUrl = process.env.APP_URL || 'http://localhost:5173';
    const link = `${appUrl}/redefinir-senha?token=${token}`;

    enviarEmailRedefinicao({ para: user.email, nome: user.nome, link }).catch(e =>
      console.error('[forgot-password] email:', e.message)
    );

    // Enviar tambÃ©m via WhatsApp (instÃ¢ncia global) se o usuÃ¡rio tiver nÃºmero
    if (user.whatsapp) {
      const evoBase = process.env.EVOLUTION_BASE_URL || 'https://api.divulgabr.com.br';
      const evoInst = process.env.EVOLUTION_GLOBAL_INSTANCE;
      const evoKey  = process.env.EVOLUTION_GLOBAL_API_KEY;
      if (evoInst && evoKey) {
        const waMsg = `ðŸ” *RedefiniÃ§Ã£o de senha â€” Agendix*\n\nClique no link para criar uma nova senha:\n${link}\n\n_Este link expira em 1 hora._`;
        fetch(`${evoBase}/message/sendText/${evoInst}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: evoKey },
          body: JSON.stringify({ number: user.whatsapp, text: waMsg }),
        }).catch(() => {});
      }
    }

    res.json({ message: 'Se o email estiver cadastrado, vocÃª receberÃ¡ um link em instantes.' });
  } catch (err) { next(err); }
});

// Redefinir senha com token
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, novaSenha } = req.body;
    if (!token || !novaSenha) return res.status(400).json({ error: 'Token e nova senha sÃ£o obrigatÃ³rios' });
    if (novaSenha.length < 6) return res.status(400).json({ error: 'Senha mÃ­nimo 6 caracteres' });

    // Valida existência antes de gastar CPU no bcrypt
    const user = await prisma.user.findFirst({
      where: { passwordResetToken: token, passwordResetExpires: { gt: new Date() } },
      select: { id: true },
    });
    if (!user) return res.status(400).json({ error: 'Token inválido ou expirado' });

    const hash = await bcrypt.hash(novaSenha, 10);

    // updateMany com o token no WHERE é atômico: só um request concorrente terá count=1
    const resultado = await prisma.user.updateMany({
      where: { id: user.id, passwordResetToken: token, passwordResetExpires: { gt: new Date() } },
      data: { senha: hash, passwordResetToken: null, passwordResetExpires: null },
    });

    if (resultado.count === 0) {
      return res.status(400).json({ error: 'Token inválido ou expirado' });
    }

    res.json({ message: 'Senha redefinida com sucesso. Faça login com sua nova senha.' });
  } catch (err) { next(err); }
});

// ── 2FA TOTP (apenas super_admin) ───────────────────────────────────────────
const { authenticator } = require('otplib');
const QRCode = require('qrcode');

// GET /auth/2fa/setup — gera secret + QR code para configurar no Google Authenticator
router.get('/2fa/setup', auth, async (req, res, next) => {
  try {
    if (req.user.role !== 'super_admin') return res.status(403).json({ error: 'Apenas super_admin pode configurar 2FA' });

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(req.user.email, 'Agendix Admin', secret);
    const qrcode  = await QRCode.toDataURL(otpauth);

    // Salva o secret criptografado (ainda não ativo — só ativa após confirmar o primeiro código)
    await prisma.user.update({ where: { id: req.user.id }, data: { totpSecret: encrypt(secret), totpAtivo: false } });

    res.json({ secret, qrcode });
  } catch (err) { next(err); }
});

// POST /auth/2fa/verify — confirma o primeiro código e ativa o 2FA
router.post('/2fa/verify', auth, async (req, res, next) => {
  try {
    if (req.user.role !== 'super_admin') return res.status(403).json({ error: 'Apenas super_admin pode configurar 2FA' });
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Código obrigatório' });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user.totpSecret) return res.status(400).json({ error: '2FA não configurado. Acesse /auth/2fa/setup primeiro.' });

    const valid = authenticator.verify({ token: String(code).replace(/\s/g, ''), secret: decrypt(user.totpSecret) });
    if (!valid) return res.status(400).json({ error: 'Código inválido' });

    await prisma.user.update({ where: { id: req.user.id }, data: { totpAtivo: true } });
    res.json({ ok: true, message: '2FA ativado com sucesso' });
  } catch (err) { next(err); }
});

// POST /auth/2fa/disable — desativa o 2FA (requer código válido para confirmar)
router.post('/2fa/disable', auth, async (req, res, next) => {
  try {
    if (req.user.role !== 'super_admin') return res.status(403).json({ error: 'Apenas super_admin' });
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Código obrigatório para desativar 2FA' });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user.totpAtivo) return res.status(400).json({ error: '2FA não está ativo' });

    const valid = authenticator.verify({ token: String(code).replace(/\s/g, ''), secret: decrypt(user.totpSecret) });
    if (!valid) return res.status(400).json({ error: 'Código inválido' });

    await prisma.user.update({ where: { id: req.user.id }, data: { totpSecret: null, totpAtivo: false } });
    res.json({ ok: true, message: '2FA desativado' });
  } catch (err) { next(err); }
});

module.exports = router;

