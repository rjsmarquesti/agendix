const prisma = require('./prisma');

// Matriz de permissões padrão por role
const DEFAULT_PERMISSIONS = {
  super_admin: '*', // acesso total
  admin: {
    leads:        ['view', 'create', 'edit', 'delete'],
    agendamentos: ['view', 'create', 'edit', 'delete'],
    financeiro:   ['view', 'create', 'edit'],
    users:        ['view', 'create', 'edit'],
    settings:     ['view', 'edit'],
    backup:       ['view', 'create'],
  },
  atendente: {
    leads:        ['view', 'create', 'edit'],
    agendamentos: ['view', 'create', 'edit'],
    financeiro:   [],
    users:        [],
    settings:     ['view'],
    backup:       [],
  },
};

// Middleware factory: checkPermission('leads', 'delete')
// Fluxo: super_admin → passa | override no banco → respeita | fallback default
function checkPermission(resource, action) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Não autenticado' });

    const { role, id: userId } = req.user;
    if (role === 'super_admin') return next();

    try {
      // Verifica override individual no banco
      const override = await prisma.userPermission.findUnique({
        where: { userId_resource_action: { userId, resource, action } },
      });
      if (override !== null) {
        return override.granted
          ? next()
          : res.status(403).json({ error: 'Acesso negado' });
      }

      // Fallback: matriz default
      const perms = DEFAULT_PERMISSIONS[role];
      if (!perms) return res.status(403).json({ error: 'Acesso negado' });

      const allowed = perms[resource];
      if (!Array.isArray(allowed) || !allowed.includes(action)) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

// Lista todas as permissões de um usuário (default + overrides)
async function listarPermissoes(userId, role) {
  const defaults = DEFAULT_PERMISSIONS[role];
  if (defaults === '*') return { role, permissions: '*' };

  const overrides = await prisma.userPermission.findMany({ where: { userId } });
  const overrideMap = {};
  for (const o of overrides) {
    if (!overrideMap[o.resource]) overrideMap[o.resource] = {};
    overrideMap[o.resource][o.action] = o.granted;
  }

  const result = {};
  for (const [resource, actions] of Object.entries(defaults || {})) {
    result[resource] = {};
    for (const action of ['view', 'create', 'edit', 'delete']) {
      const override = overrideMap[resource]?.[action];
      if (override !== undefined) {
        result[resource][action] = override;
      } else {
        result[resource][action] = actions.includes(action);
      }
    }
  }
  return { role, permissions: result };
}

module.exports = { checkPermission, listarPermissoes, DEFAULT_PERMISSIONS };
