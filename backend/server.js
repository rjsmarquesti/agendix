require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');

const requestLogger = require('./src/middlewares/requestLogger');
const { loginLimiter, agendamentoPublicoLimiter, n8nLimiter, apiGeralLimiter } = require('./src/middlewares/rateLimiter');

const app = express();

// CSP restritivo para rotas de API; desativado para o formulário público (agendar.html usa scripts inline)
app.use((req, res, next) => {
  if (req.path === '/agendar.html' || req.path === '/sw.js' || req.path === '/manifest.json') {
    return helmet({ contentSecurityPolicy: false })(req, res, next);
  }
  return helmet()(req, res, next);
});
app.use(cors({ exposedHeaders: ['X-Tenant-Slug', 'X-Correlation-Id'] }));
// Webhook MP precisa de body raw para validar assinatura HMAC
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use(requestLogger);
app.use(express.static(require('path').join(__dirname, 'public')));
app.use('/uploads', express.static(require('path').join(__dirname, 'uploads')));

// Rate limiting por grupo de rota
app.use('/api/auth/login',             loginLimiter);
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

app.use(require('./src/middlewares/errorHandler'));

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  const { agendarCron } = require('./src/services/notificacaoService');
  agendarCron();
  app.listen(PORT, () => console.log(`Backend rodando na porta ${PORT}`));
}

module.exports = app;
