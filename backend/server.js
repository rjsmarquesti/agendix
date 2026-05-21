require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');

const requestLogger = require('./src/middlewares/requestLogger');
const { loginLimiter, forgotPasswordLimiter, agendamentoPublicoLimiter, n8nLimiter, apiGeralLimiter } = require('./src/middlewares/rateLimiter');

const app = express();

// Necessário para o rate-limit funcionar corretamente atrás do proxy Traefik/EasyPanel
app.set('trust proxy', 1);

// CSP restritivo para rotas de API; desativado para o formulário público (agendar.html usa scripts inline)
app.use((req, res, next) => {
  if (req.path === '/agendar.html' || req.path === '/sw.js' || req.path === '/manifest.json') {
    return helmet({ contentSecurityPolicy: false })(req, res, next);
  }
  return helmet()(req, res, next);
});
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(',').map(o => o.trim());
app.use(cors({
  origin: (origin, cb) => {
    // Permite requisições sem origin (mobile apps, curl, Postman, webhooks server-to-server)
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origem não permitida — ${origin}`));
  },
  credentials: true,
  exposedHeaders: ['X-Tenant-Slug', 'X-Correlation-Id'],
}));
// Webhook MP precisa de body raw para validar assinatura HMAC
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(requestLogger);
app.use(express.static(require('path').join(__dirname, 'public')));
app.use('/uploads',     express.static(require('path').join(__dirname, 'uploads')));
app.use('/api/uploads', express.static(require('path').join(__dirname, 'uploads')));

// Rate limiting por grupo de rota
app.use('/api/auth/login',             loginLimiter);
app.use('/api/auth/forgot-password',   forgotPasswordLimiter);
app.use('/api/public/:slug/agendar',   agendamentoPublicoLimiter);
app.use('/api/n8n',                    n8nLimiter);
app.use('/api',                        apiGeralLimiter);

// Brand info pública (sem auth) — deve vir antes de /:slug para não ser capturado
app.use('/api/public', require('./src/routes/publicBrand'));

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
app.use('/api/agente-ia',   tenantMiddleware, require('./src/routes/agenteIa'));
app.use('/api/push',        tenantMiddleware, require('./src/routes/push'));

app.use(require('./src/middlewares/errorHandler'));

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  // Variáveis obrigatórias em produção — boot falha se ausentes
  if (process.env.NODE_ENV === 'production') {
    const REQUIRED_ENV = [
      'DATABASE_URL', 'JWT_SECRET', 'MP_ACCESS_TOKEN', 'MP_WEBHOOK_SECRET',
      'MP_PLAN_BASICO_ID', 'MP_PLAN_PRO_ID', 'MP_PLAN_PREMIUM_ID', 'MP_PLAN_BUSINESS_ID',
      'SMTP_USER', 'SMTP_PASS', 'ENCRYPTION_KEY', 'APP_URL',
    ];
    const missing = REQUIRED_ENV.filter(k => !process.env[k]);
    if (missing.length) {
      console.error(`[FATAL] Variáveis de ambiente obrigatórias não configuradas: ${missing.join(', ')}`);
      process.exit(1);
    }
  }

  const { agendarCron } = require('./src/services/notificacaoService');
  const { agendarCronTrial } = require('./src/services/trialEmailService');
  const { agendarWatchdog } = require('./src/services/watchdogService');
  agendarCron();
  agendarCronTrial();
  agendarWatchdog();
  app.listen(PORT, () => console.log(`Backend rodando na porta ${PORT}`));
}

module.exports = app;
