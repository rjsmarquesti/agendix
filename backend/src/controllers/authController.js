const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { authenticator } = require('otplib');
const prisma = require('../lib/prisma');
const audit  = require('../lib/audit');
const { decrypt } = require('../lib/encrypt');

exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, senha } = req.body;
    const tenantId = req.tenant?.id || null;

    // Busca por email + tenant (ou super_admin sem tenant)
    const user = await prisma.user.findFirst({
      where: tenantId
        ? { email, tenantId }
        : { email, role: 'super_admin' },
      include: { tenant: { select: { nome: true, slug: true, corPrimaria: true, logo: true, modulos: true, plano: true, planoStatus: true, planoVencimento: true, cadastroCompleto: true } } },
    });

    if (!user) return res.status(401).json({ error: 'Email ou senha incorretos' });
    if (!user.ativo) return res.status(401).json({ error: 'Conta não ativada. Verifique seu email e WhatsApp para o link de ativação.', code: 'INACTIVE' });

    const ok = await bcrypt.compare(senha, user.senha);
    if (!ok) return res.status(401).json({ error: 'Email ou senha incorretos' });

    // 2FA obrigatório para super_admin se ativado
    if (user.role === 'super_admin' && user.totpAtivo) {
      const { totp } = req.body;
      if (!totp) return res.status(403).json({ error: '2FA obrigatório', code: 'TOTP_REQUIRED' });
      const totpValido = authenticator.verify({ token: String(totp).replace(/\s/g, ''), secret: decrypt(user.totpSecret) });
      if (!totpValido) return res.status(403).json({ error: 'Código 2FA inválido', code: 'TOTP_INVALID' });
    }

    const token = jwt.sign(
      { id: user.id, nome: user.nome, email: user.email, role: user.role, tenantId: user.tenantId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    audit.log('login', {
      entidade: 'user', entidadeId: user.id,
      tenantId: user.tenantId || null,
      userId: user.id, ip: req.ip,
      detalhes: { email: user.email, role: user.role },
    });

    res.json({
      token,
      user: { id: user.id, nome: user.nome, email: user.email, role: user.role },
      tenant: user.tenant ? {
        ...user.tenant,
        modulos: typeof user.tenant.modulos === 'string' ? JSON.parse(user.tenant.modulos || '[]') : (user.tenant.modulos || []),
      } : null,
    });
  } catch (err) { next(err); }
};

exports.me = (req, res) => res.json({ user: req.user });
