const { verifyAccessToken } = require('../lib/tokenService');

// Rotas de auth management isentas do guard TOTP
const TOTP_EXEMPT_PATHS = ['/2fa/', '/logout', '/refresh', '/senha', '/perfil', '/login'];

async function authMiddleware(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'Token não fornecido' });

  const token = header.startsWith('Bearer ') ? header.slice(7) : header;
  try {
    req.user = await verifyAccessToken(token);

    // Se o tenant já foi resolvido (tenantMiddleware rodou antes nesta rota), precisa bater
    // com o tenant do JWT — senão qualquer usuário logado poderia acessar dados de outro
    // tenant só trocando X-Tenant-Slug (achado C2 da auditoria de 31/07/2026).
    if (req.tenant && req.user.tenantId !== req.tenant.id) {
      return res.status(403).json({ error: 'Acesso negado: tenant não corresponde ao usuário autenticado.' });
    }

    // TOTP obrigatório para admin/super_admin (ativado via TOTP_MANDATORY=true no EasyPanel)
    if (process.env.TOTP_MANDATORY === 'true') {
      const { role, totpAtivo } = req.user;
      if ((role === 'admin' || role === 'super_admin') && !totpAtivo) {
        const isExempt = TOTP_EXEMPT_PATHS.some(p => req.path.includes(p));
        if (!isExempt) {
          return res.status(403).json({
            error: '2FA obrigatório para administradores. Configure em Configurações > Segurança.',
            code: 'TOTP_SETUP_REQUIRED',
            setupUrl: '/configuracoes?tab=seguranca',
          });
        }
      }
    }

    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado', code: 'TOKEN_EXPIRED' });
    }
    res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (req.user?.role === 'super_admin') return next();
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    next();
  };
}

module.exports = authMiddleware;
module.exports.requireRole = requireRole;
