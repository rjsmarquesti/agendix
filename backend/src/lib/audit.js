const prisma = require('./prisma');

const EVENTS = {
  // Auth
  LOGIN_OK:               'login_ok',
  LOGIN_FAIL:             'login_fail',
  LOGOUT:                 'logout',
  TOKEN_REFRESH:          'token_refresh',
  PASSWORD_CHANGE:        'password_change',
  PASSWORD_RESET_REQUEST: 'password_reset_request',
  PASSWORD_RESET_OK:      'password_reset_ok',
  ACTIVATION_OK:          'activation_ok',
  TWO_FA_SETUP:           'two_fa_setup',
  TWO_FA_ENABLED:         'two_fa_enabled',
  TWO_FA_DISABLED:        'two_fa_disabled',
  TWO_FA_FAIL:            'two_fa_fail',
  // Tenant admin
  TENANT_CREATE:      'tenant_create',
  TENANT_UPDATE:      'tenant_update',
  TENANT_DELETE:      'tenant_delete',
  TENANT_PLAN_CHANGE: 'tenant_plan_change',
  TENANT_FREEZE:      'tenant_freeze',
  TENANT_UNFREEZE:    'tenant_unfreeze',
  // Usuários
  USER_CREATE:      'user_create',
  USER_UPDATE:      'user_update',
  USER_DELETE:      'user_delete',
  USER_ROLE_CHANGE: 'user_role_change',
  // Dados sensíveis
  BACKUP_CREATE:   'backup_create',
  BACKUP_RESTORE:  'backup_restore',
  BACKUP_DELETE:   'backup_delete',
  BACKUP_DOWNLOAD: 'backup_download',
  // Webhooks
  WEBHOOK_FORGE_ATTEMPT: 'webhook_forge_attempt',
  WEBHOOK_VERIFIED:      'webhook_verified',
  // Segurança
  IP_BLOCKED:                 'ip_blocked',
  IP_UNBLOCKED:               'ip_unblocked',
  RATE_LIMIT_HIT:             'rate_limit_hit',
  WAF_BLOCK:                  'waf_block',
  BOT_DETECTED:               'bot_detected',
  HONEYPOT_HIT:               'honeypot_hit',
  TENANT_ISOLATION_VIOLATION: 'tenant_isolation_violation',
  // Financeiro
  PAYMENT_WEBHOOK:   'payment_webhook',
  PLAN_UPGRADE:      'plan_upgrade',
  PLAN_DOWNGRADE:    'plan_downgrade',
  SUBSCRIPTION_CANCEL: 'subscription_cancel',
};

async function log(acao, { entidade, entidadeId, tenantId, userId, ip, detalhes } = {}) {
  try {
    await prisma.auditLog.create({
      data: {
        acao,
        entidade:   entidade   || null,
        entidadeId: entidadeId != null ? String(entidadeId) : null,
        tenantId:   tenantId   || null,
        userId:     userId     || null,
        ip:         ip         || null,
        detalhes:   detalhes   || null,
      },
    });
  } catch (err) {
    console.error('[audit] Falha ao gravar log:', err.message);
  }
}

module.exports = { log, EVENTS };
