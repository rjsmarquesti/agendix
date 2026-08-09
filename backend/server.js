require('dotenv').config();
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const cookieParser = require('cookie-parser');

const requestLogger = require('./src/middlewares/requestLogger');
const { loginLimiter, forgotPasswordLimiter, agendamentoPublicoLimiter, n8nLimiter, apiGeralLimiter, registerLimiter, cancelarLimiter } = require('./src/middlewares/rateLimiter');
const { checkIpBlock } = require('./src/lib/ipBlocker');
const waf = require('./src/middlewares/waf');

const app = express();

// Necessário para o rate-limit funcionar corretamente atrás do proxy Traefik/EasyPanel
app.set('trust proxy', 1);

// Honeypots ANTES de qualquer rota real — ban imediato 24h em qualquer hit
app.use(require('./src/routes/honeypot'));

// Bloqueio de IPs banidos
app.use(checkIpBlock);

// WAF ANTES dos body parsers (exceto /api/payments/webhook que precisa de body raw)
app.use(waf);

// Helmet + CSP completo (Sprint 5)
const appUrl = process.env.APP_URL || 'https://agendix.divulgabr.com.br';
app.use((req, res, next) => {
  const isPublicPage = req.path === '/agendar.html' || req.path === '/sw.js' || req.path === '/manifest.json';
  if (isPublicPage) return helmet({ contentSecurityPolicy: false })(req, res, next);
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc:     ["'self'"],
        scriptSrc:      ["'self'"],
        styleSrc:       ["'self'", "'unsafe-inline'"],
        imgSrc:         ["'self'", 'data:', 'https:'],
        connectSrc:     ["'self'", appUrl],
        frameAncestors: ["'none'"],
        formAction:     ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    permittedCrossDomainPolicies: false,
  })(req, res, next);
});
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(',').map(o => o.trim());

// CORS unificado: webhooks públicos aceitam qualquer origem; demais rotas são restritas
app.use((req, res, next) => {
  const origin = req.headers.origin || '';
  const isWebhook = req.path.startsWith('/api/webhook') || req.path.startsWith('/webhook');

  if (isWebhook) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,X-Api-Token');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    return next();
  }

  // Rotas protegidas: apenas origens permitidas
  if (!origin || allowedOrigins.includes(origin)) {
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Expose-Headers', 'X-Tenant-Slug,X-Correlation-Id');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Tenant-Slug');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    return next();
  }

  next(new Error(`CORS: origem não permitida — ${origin}`));
});
// Webhooks que precisam de body raw para validar assinatura HMAC
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use('/api/webhook/meta',     express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(requestLogger);
app.use(express.static(require('path').join(__dirname, 'public')));
app.use('/uploads',     express.static(require('path').join(__dirname, 'uploads')));
app.use('/api/uploads', express.static(require('path').join(__dirname, 'uploads')));

// Rate limiting por grupo de rota
app.use('/api/auth/login',             loginLimiter);
app.use('/api/auth/register',          registerLimiter);
app.use('/api/auth/forgot-password',   forgotPasswordLimiter);
app.use('/api/public/:slug/agendar',   agendamentoPublicoLimiter);
app.use('/api/public/cancelar',        cancelarLimiter);
app.use('/api/n8n',                    n8nLimiter);
app.use('/api',                        apiGeralLimiter);

// Nichos — rota pública (usada pelo painel admin sem contexto de tenant)
app.get('/api/nichos', (req, res) => {
  const { NICHOS } = require('./src/config/nichos');
  res.json(Object.entries(NICHOS).map(([id, n]) => ({
    id, label: n.label, modulosExtras: n.modulosExtras || [], subnichos: n.subnichos || [],
  })));
});

// Brand info pública (sem auth) — deve vir antes de /:slug para não ser capturado
app.use('/api/public', require('./src/routes/publicBrand'));

// Cancelamento público por token (sem slug) — deve vir antes de /:slug
app.use('/api/public/cancelar', require('./src/routes/publicCancelamento'));

// Webhook Agente IA (Evolution API → sem auth JWT, identificado pelo slug)
app.use('/api/agente-ia', require('./src/routes/agenteIa'));

// Rotas de agendamento público (sem autenticação, por slug)
app.use('/api/public/:slug', require('./src/routes/public'));

// Rotas públicas
app.use('/api/auth', require('./src/routes/auth'));

// Rotas super admin (sem tenant middleware)
app.use('/api/admin/tenants',    require('./src/routes/tenants'));
app.use('/api/admin/financeiro', require('./src/routes/adminFinanceiro'));
app.use('/api/admin/backups',    require('./src/routes/adminBackups'));
app.use('/api/admin/consumo',    require('./src/routes/adminConsumo'));
app.use('/api/admin/logs',       require('./src/routes/adminLogs'));
app.use('/api/admin/usuarios',   require('./src/routes/adminUsuarios'));
app.use('/api/admin/mensagens',  require('./src/routes/adminMensagens'));

// Rotas de integração n8n (autenticadas por API token, sem tenant middleware JWT)
app.use('/api/n8n',     require('./src/routes/n8n'));
app.use('/api/webhook', require('./src/routes/webhook'));

// Pagamentos Mercado Pago (webhook público + rotas protegidas por JWT)
app.use('/api/payments', require('./src/routes/payments'));

// Rotas protegidas por tenant
const tenantMiddleware = require('./src/middlewares/tenant');
app.use('/api/leads',        tenantMiddleware, require('./src/routes/leads'));
app.use('/api/agendamentos', tenantMiddleware, require('./src/routes/agendamentos'));
app.use('/api/servicos',     tenantMiddleware, require('./src/routes/servicos'));
app.use('/api/bloqueios',    tenantMiddleware, require('./src/routes/bloqueios'));
app.use('/api/dashboard',    tenantMiddleware, require('./src/routes/dashboard'));
app.use('/api/settings',     tenantMiddleware, require('./src/routes/settings'));
app.use('/api/users',        tenantMiddleware, require('./src/routes/users'));
app.use('/api/financeiro',    tenantMiddleware, require('./src/routes/financeiro'));
app.use('/api/notificacoes', tenantMiddleware, require('./src/routes/notificacoes'));
// /api/agente-ia já montado acima (antes do tenantMiddleware, pois tem webhook público)
app.use('/api/wa-atendimento',  tenantMiddleware, require('./src/routes/waAtendimento'));
app.use('/api/push',        tenantMiddleware, require('./src/routes/push'));
app.use('/api/fichas',      tenantMiddleware, require('./src/routes/fichas'));
app.use('/api/anamnese',    tenantMiddleware, require('./src/routes/anamnese'));
app.use('/api/orcamentos',     tenantMiddleware, require('./src/routes/orcamentos'));
app.use('/api/ordem-servico', tenantMiddleware, require('./src/routes/ordemServico'));
app.use('/api/prontuarios',  tenantMiddleware, require('./src/routes/prontuarios'));
app.use('/api/documentos',   tenantMiddleware, require('./src/routes/documentos'));
app.use('/api/processos',    tenantMiddleware, require('./src/routes/processos'));
app.use('/api/prospeccao',   tenantMiddleware, require('./src/routes/prospeccao'));
app.use('/api/mensagens',    require('./src/routes/mensagens'));
app.use('/api/wa-fila',      require('./src/routes/waFila'));

app.use(require('./src/middlewares/errorHandler'));

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  // Variáveis obrigatórias em produção — boot falha se ausentes
  if (process.env.NODE_ENV === 'production') {
    const REQUIRED_ENV = [
      'DATABASE_URL', 'JWT_SECRET', 'MP_ACCESS_TOKEN', 'MP_WEBHOOK_SECRET',
      'MP_PLAN_SOLO_ID', 'MP_PLAN_PRO_ID', 'MP_PLAN_BUSINESS_ID',
      'SMTP_USER', 'SMTP_PASS', 'ENCRYPTION_KEY', 'APP_URL',
      'VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY',
    ];
    const missing = REQUIRED_ENV.filter(k => !process.env[k]);
    if (missing.length) {
      console.error(`[FATAL] Variáveis de ambiente obrigatórias não configuradas: ${missing.join(', ')}`);
      process.exit(1);
    }
  }

  // Aviso se ALLOWED_ORIGINS contiver localhost em produção
  const origins = process.env.ALLOWED_ORIGINS || '';
  if (origins.includes('localhost')) {
    console.warn('[SECURITY] ALLOWED_ORIGINS contém localhost em produção — revise a configuração');
  }

  const { agendarCron } = require('./src/services/notificacaoService');
  const { agendarCronTrial } = require('./src/services/trialEmailService');
  const { agendarWatchdog } = require('./src/services/watchdogService');
  const { agendarCronRenovacao } = require('./src/services/renovacaoEmailService');
  agendarCron();
  agendarCronTrial();
  agendarWatchdog();
  agendarCronRenovacao();
  app.listen(PORT, () => console.log(`Backend rodando na porta ${PORT}`));
}

module.exports = app;
