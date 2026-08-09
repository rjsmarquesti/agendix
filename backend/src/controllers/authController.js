const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const { authenticator } = require('otplib');
const prisma = require('../lib/prisma');
const audit  = require('../lib/audit');
const { decrypt, normalizarModulos } = require('../lib/encrypt');
const { generateAccessToken, generateRefreshToken } = require('../lib/tokenService');

function setRefreshCookie(res, token) {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/auth/refresh',
  });
}

exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, senha } = req.body;
    const tenantId = req.tenant?.id || null;

    const user = await prisma.user.findFirst({
      where: tenantId
        ? { email, tenantId }
        : { email, role: 'super_admin' },
      include: { tenant: { select: { nome: true, slug: true, corPrimaria: true, logo: true, modulos: true, plano: true, planoStatus: true, planoVencimento: true, cadastroCompleto: true } } },
    });

    if (!user) {
      audit.log(audit.EVENTS.LOGIN_FAIL, { ip: req.ip, detalhes: { email, motivo: 'usuario_nao_encontrado' } });
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }
    if (!user.ativo) return res.status(401).json({ error: 'Conta não ativada. Verifique seu email e WhatsApp para o link de ativação.', code: 'INACTIVE' });

    const ok = await bcrypt.compare(senha, user.senha);
    if (!ok) {
      audit.log(audit.EVENTS.LOGIN_FAIL, { entidade: 'user', entidadeId: user.id, tenantId: user.tenantId, ip: req.ip, detalhes: { email } });
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    // TOTP obrigatório para super_admin e admin (quando totpAtivo = true)
    if ((user.role === 'super_admin' || user.role === 'admin') && user.totpAtivo) {
      const { totp } = req.body;
      if (!totp) return res.status(403).json({ error: '2FA obrigatório', code: 'TOTP_REQUIRED' });
      const totpValido = authenticator.verify({ token: String(totp).replace(/\s/g, ''), secret: decrypt(user.totpSecret) });
      if (!totpValido) {
        audit.log(audit.EVENTS.TWO_FA_FAIL, { entidade: 'user', entidadeId: user.id, userId: user.id, ip: req.ip });
        return res.status(403).json({ error: 'Código 2FA inválido', code: 'TOTP_INVALID' });
      }
    }

    // totpAtivo incluído no payload para o guard TOTP_MANDATORY funcionar sem DB query
    const accessToken = generateAccessToken({
      id: user.id, nome: user.nome, email: user.email,
      role: user.role, tenantId: user.tenantId, totpAtivo: user.totpAtivo,
    });
    const refreshToken = generateRefreshToken(user.id);

    setRefreshCookie(res, refreshToken);

    audit.log(audit.EVENTS.LOGIN_OK, {
      entidade: 'user', entidadeId: user.id,
      tenantId: user.tenantId || null,
      userId: user.id, ip: req.ip,
      detalhes: { email: user.email, role: user.role },
    });

    res.json({
      token: accessToken,
      accessToken,
      expiresIn: 900,
      user: { id: user.id, nome: user.nome, email: user.email, role: user.role },
      tenant: user.tenant ? {
        ...user.tenant,
        modulos: normalizarModulos(user.tenant.modulos),
      } : null,
    });
  } catch (err) { next(err); }
};

exports.me = (req, res) => res.json({ user: req.user });
