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
const audit = require('../lib/audit');
const {
  generateAccessToken, generateRefreshToken,
  verifyRefreshToken, blacklistToken,
} = require('../lib/tokenService');

const validarLogin = [
  body('email').isEmail().withMessage('Email inválido'),
  body('senha').notEmpty().withMessage('Senha obrigatória'),
];

// Cadastro público — cria tenant + admin com trial de 14 dias (conta inativa até confirmação)
router.post('/register', async (req, res, next) => {
  try {
    const { nomeEmpresa, nomeCompleto, email, whatsapp, senha } = req.body;

    if (!nomeEmpresa || !nomeCompleto || !email || !whatsapp || !senha)
      return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    if (senha.length < 6)
      return res.status(400).json({ error: 'Senha mínimo 6 caracteres' });

    const whatsappNorm = whatsapp.replace(/\D/g, '');
    if (whatsappNorm.length < 10)
      return res.status(400).json({ error: 'WhatsApp inválido' });

    // Gera slug único a partir do nome da empresa
    let baseSlug = nomeEmpresa.toLowerCase()
      .normalize('NFD').replace(/̀-ͯ/gu, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);
    let slug = baseSlug;
    let tentativa = 1;
    while (await prisma.tenant.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${++tentativa}`;
    }

    const trialVencimento = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
    // Trial PRO: todos os módulos disponíveis — usuário pode testar tudo antes de assinar
    const modulosTrial = ['leads', 'agendamentos', 'financeiro', 'wa_atendimento', 'agente_ia',
      'fichas', 'anamnese', 'prontuarios', 'orcamentos', 'documentos'];

    const tenant = await prisma.tenant.create({
      data: {
        nome: nomeEmpresa,
        slug,
        plano: 'pro',
        planoStatus: 'trial',
        planoVencimento: trialVencimento,
        modulos: modulosTrial,
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
    enviarEmailAtivacao({ para: email, nome: nomeCompleto, link: linkAtivacao, tenantId: tenant.id }).catch(e =>
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
      tenantId: userAtivado.tenantId,
    }).catch(e => console.error('[ativar] email boas-vindas:', e.message));

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

    enviarEmailRedefinicao({ para: user.email, nome: user.nome, link, tenantId: user.tenantId }).catch(e =>
      console.error('[forgot-password] email:', e.message)
    );

    // Enviar também via WhatsApp (instância global) se o usuário tiver número
    if (user.whatsapp) {
      const evoBase = process.env.EVOLUTION_BASE_URL || 'https://api.divulgabr.com.br';
      const evoInst = process.env.EVOLUTION_GLOBAL_INSTANCE;
      const evoKey  = process.env.EVOLUTION_GLOBAL_API_KEY;
      if (evoInst && evoKey) {
        const waMsg = `🔐 *Redefinição de senha — Agendix*\n\nClique no link para criar uma nova senha:\n${link}\n\n_Este link expira em 1 hora._`;
        fetch(`${evoBase}/message/sendText/${evoInst}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', apikey: evoKey },
          body: JSON.stringify({ number: user.whatsapp, text: waMsg }),
        }).catch(() => {});
      }
    }

    res.json({ message: 'Se o email estiver cadastrado, você receberá um link em instantes.' });
  } catch (err) { next(err); }
});

// Redefinir senha com token
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, novaSenha } = req.body;
    if (!token || !novaSenha) return res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
    if (novaSenha.length < 6) return res.status(400).json({ error: 'Senha mínimo 6 caracteres' });

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

// POST /auth/refresh — renova accessToken usando refreshToken (cookie httpOnly)
router.post('/refresh', async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken;
    if (!refreshToken) return res.status(401).json({ error: 'Refresh token não fornecido', code: 'NO_REFRESH_TOKEN' });

    let decoded;
    try {
      decoded = await verifyRefreshToken(refreshToken);
    } catch {
      res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
      return res.status(401).json({ error: 'Refresh token inválido ou expirado', code: 'INVALID_REFRESH_TOKEN' });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user || !user.ativo) return res.status(401).json({ error: 'Usuário inativo' });

    // Rotação: blacklista o refresh token usado
    if (decoded.jti) {
      const ttl = Math.max(decoded.exp - Math.floor(Date.now() / 1000), 1);
      await blacklistToken(decoded.jti, ttl);
    }

    // totpAtivo incluído para que o guard TOTP_MANDATORY funcione sem nova DB query
    const accessToken  = generateAccessToken({
      id: user.id, nome: user.nome, email: user.email,
      role: user.role, tenantId: user.tenantId, totpAtivo: user.totpAtivo,
    });
    const newRefreshToken = generateRefreshToken(user.id);

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true, secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth/refresh',
    });

    audit.log(audit.EVENTS.TOKEN_REFRESH, {
      entidade: 'user', entidadeId: user.id, userId: user.id, ip: req.ip,
    });

    res.json({ accessToken, expiresIn: 900 });
  } catch (err) { next(err); }
});

// POST /auth/login/totp — valida código TOTP pós-login (fluxo dois passos futuro)
// Atualmente o login já aceita `totp` no body; esta rota fica disponível para evolução futura
router.post('/login/totp', async (req, res, next) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) return res.status(400).json({ error: 'tempToken e code são obrigatórios' });

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ error: 'Token temporário inválido ou expirado' });
    }
    if (decoded.type !== 'temp_totp') return res.status(401).json({ error: 'Token inválido' });

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user || !user.ativo || !user.totpAtivo) return res.status(401).json({ error: 'Usuário inválido' });

    const valid = authenticator.verify({ token: String(code).replace(/\s/g, ''), secret: decrypt(user.totpSecret) });
    if (!valid) {
      audit.log(audit.EVENTS.TWO_FA_FAIL, { entidade: 'user', entidadeId: user.id, userId: user.id, ip: req.ip });
      return res.status(403).json({ error: 'Código 2FA inválido', code: 'TOTP_INVALID' });
    }

    const accessToken  = generateAccessToken({
      id: user.id, nome: user.nome, email: user.email,
      role: user.role, tenantId: user.tenantId, totpAtivo: user.totpAtivo,
    });
    const refreshToken = generateRefreshToken(user.id);

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true, secure: isProd,
      sameSite: isProd ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth/refresh',
    });

    audit.log(audit.EVENTS.LOGIN_OK, {
      entidade: 'user', entidadeId: user.id, userId: user.id,
      tenantId: user.tenantId, ip: req.ip,
      detalhes: { email: user.email, role: user.role, via: 'totp_step2' },
    });

    res.json({ token: accessToken, accessToken, expiresIn: 900,
      user: { id: user.id, nome: user.nome, email: user.email, role: user.role } });
  } catch (err) { next(err); }
});

// POST /auth/logout — blacklista os tokens ativos
router.post('/logout', async (req, res, next) => {
  try {
    // Blacklista access token (opcional — pode estar expirado já)
    const header = req.headers['authorization'];
    if (header) {
      const token = header.startsWith('Bearer ') ? header.slice(7) : header;
      try {
        const decoded = jwt.decode(token);
        if (decoded?.jti && decoded?.exp) {
          const ttl = Math.max(decoded.exp - Math.floor(Date.now() / 1000), 1);
          await blacklistToken(decoded.jti, ttl);
        }
        if (decoded?.id) {
          audit.log(audit.EVENTS.LOGOUT, {
            entidade: 'user', entidadeId: decoded.id, userId: decoded.id,
            tenantId: decoded.tenantId, ip: req.ip,
          });
        }
      } catch { /* token inválido — ignora */ }
    }

    // Blacklista refresh token
    const refreshToken = req.cookies?.refreshToken;
    if (refreshToken) {
      try {
        const decoded = jwt.decode(refreshToken);
        if (decoded?.jti && decoded?.exp) {
          const ttl = Math.max(decoded.exp - Math.floor(Date.now() / 1000), 1);
          await blacklistToken(decoded.jti, ttl);
        }
      } catch { /* ignora */ }
    }

    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// ── 2FA TOTP (super_admin e admin) ──────────────────────────────────────────
const { authenticator } = require('otplib');
const QRCode = require('qrcode');

// GET /auth/2fa/setup — gera secret + QR code
router.get('/2fa/setup', auth, async (req, res, next) => {
  try {
    const role = req.user.role;
    if (role !== 'super_admin' && role !== 'admin') {
      return res.status(403).json({ error: 'Apenas admin e super_admin podem configurar 2FA' });
    }

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(req.user.email, 'Agendix', secret);
    const qrcode  = await QRCode.toDataURL(otpauth);

    await prisma.user.update({ where: { id: req.user.id }, data: { totpSecret: encrypt(secret), totpAtivo: false } });

    audit.log(audit.EVENTS.TWO_FA_SETUP, {
      entidade: 'user', entidadeId: req.user.id, userId: req.user.id, ip: req.ip,
    });

    res.json({ secret, qrcode });
  } catch (err) { next(err); }
});

// POST /auth/2fa/verify — confirma código e ativa 2FA
router.post('/2fa/verify', auth, async (req, res, next) => {
  try {
    const role = req.user.role;
    if (role !== 'super_admin' && role !== 'admin') {
      return res.status(403).json({ error: 'Apenas admin e super_admin podem configurar 2FA' });
    }
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Código obrigatório' });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user.totpSecret) return res.status(400).json({ error: '2FA não configurado. Acesse /auth/2fa/setup primeiro.' });

    const valid = authenticator.verify({ token: String(code).replace(/\s/g, ''), secret: decrypt(user.totpSecret) });
    if (!valid) {
      audit.log(audit.EVENTS.TWO_FA_FAIL, { entidade: 'user', entidadeId: req.user.id, userId: req.user.id, ip: req.ip });
      return res.status(400).json({ error: 'Código inválido' });
    }

    await prisma.user.update({ where: { id: req.user.id }, data: { totpAtivo: true } });
    audit.log(audit.EVENTS.TWO_FA_ENABLED, { entidade: 'user', entidadeId: req.user.id, userId: req.user.id, ip: req.ip });
    res.json({ ok: true, message: '2FA ativado com sucesso' });
  } catch (err) { next(err); }
});

// POST /auth/2fa/disable — desativa 2FA (requer código válido)
router.post('/2fa/disable', auth, async (req, res, next) => {
  try {
    const role = req.user.role;
    if (role !== 'super_admin' && role !== 'admin') {
      return res.status(403).json({ error: 'Apenas admin e super_admin' });
    }
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Código obrigatório para desativar 2FA' });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user.totpAtivo) return res.status(400).json({ error: '2FA não está ativo' });

    const valid = authenticator.verify({ token: String(code).replace(/\s/g, ''), secret: decrypt(user.totpSecret) });
    if (!valid) {
      audit.log(audit.EVENTS.TWO_FA_FAIL, { entidade: 'user', entidadeId: req.user.id, userId: req.user.id, ip: req.ip });
      return res.status(400).json({ error: 'Código inválido' });
    }

    await prisma.user.update({ where: { id: req.user.id }, data: { totpSecret: null, totpAtivo: false } });
    audit.log(audit.EVENTS.TWO_FA_DISABLED, { entidade: 'user', entidadeId: req.user.id, userId: req.user.id, ip: req.ip });
    res.json({ ok: true, message: '2FA desativado' });
  } catch (err) { next(err); }
});

module.exports = router;

