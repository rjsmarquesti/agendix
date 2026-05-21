/**
 * Circuit breaker por instância Evolution API.
 *
 * Detecta padrões de ban/rate-limit e suspende a instância antes que o
 * WhatsApp tome uma ação permanente. Após o tempo de cooldown, libera
 * automaticamente e notifica o admin por email.
 *
 * Estados por instância:
 *   ok         → enviando normalmente
 *   suspended  → suspensa por SUSPEND_DURATION_MS após THRESHOLD erros
 */

const nodemailer = require('nodemailer');

const THRESHOLD        = 5;               // erros consecutivos antes de suspender
const SUSPEND_DURATION = 2 * 60 * 60 * 1000; // 2 horas de cooldown

// Map<instanceName, { errors: number, suspendedUntil: number|null }>
const state = new Map();

function getState(instance) {
  if (!state.has(instance)) state.set(instance, { errors: 0, suspendedUntil: null });
  return state.get(instance);
}

function isSuspensa(instance) {
  const s = getState(instance);
  if (!s.suspendedUntil) return false;
  if (Date.now() < s.suspendedUntil) return true;
  // Cooldown expirou — libera
  s.suspendedUntil = null;
  s.errors = 0;
  console.log(`[waWatchdog] ${instance} liberada após cooldown`);
  return false;
}

function registrarSucesso(instance) {
  const s = getState(instance);
  s.errors = 0;
}

function registrarErro(instance, tenantNome) {
  const s = getState(instance);
  s.errors++;

  console.warn(`[waWatchdog] ${instance} erro #${s.errors} (threshold ${THRESHOLD})`);

  if (s.errors >= THRESHOLD && !s.suspendedUntil) {
    s.suspendedUntil = Date.now() + SUSPEND_DURATION;
    const liberaEm = new Date(s.suspendedUntil).toLocaleString('pt-BR');
    console.error(`[waWatchdog] ${instance} SUSPENSA até ${liberaEm}`);
    notificarAdmin(instance, tenantNome, liberaEm).catch(err =>
      console.error('[waWatchdog] falha ao notificar admin:', err.message)
    );
  }
}

async function notificarAdmin(instance, tenantNome, liberaEm) {
  const from   = process.env.SMTP_FROM || process.env.SMTP_USER;
  const destino = process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!from || !destino || !process.env.SMTP_PASS) return;

  const t = nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.hostinger.com',
    port:   Number(process.env.SMTP_PORT || 465),
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await t.sendMail({
    from: `"Agendix Monitor" <${from}>`,
    to:   destino,
    subject: `🚨 Instância WA suspensa — ${tenantNome || instance}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;padding:24px;border:2px solid #dc2626;border-radius:12px">
        <h2 style="color:#dc2626;margin:0 0 12px">Instância suspensa por erros consecutivos</h2>
        <table style="width:100%;font-size:14px;border-collapse:collapse">
          <tr><td style="padding:6px 0;color:#6b7280">Tenant</td><td style="padding:6px 0"><strong>${tenantNome || '—'}</strong></td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Instância</td><td style="padding:6px 0;font-family:monospace">${instance}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Suspensa até</td><td style="padding:6px 0">${liberaEm}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Erros</td><td style="padding:6px 0">${THRESHOLD} consecutivos</td></tr>
        </table>
        <div style="margin-top:16px;padding:12px;background:#fef2f2;border-radius:8px;font-size:13px;color:#991b1b">
          <strong>Ação recomendada:</strong> verifique se o número foi banido ou está com restrição temporária no WhatsApp.
          Acesse o painel admin → Clientes → WhatsApp para reconectar após o cooldown.
        </div>
      </div>
    `,
  });
}

/**
 * Wrapper sobre a Evolution API com circuit breaker integrado.
 * Use este no lugar de chamar fetch diretamente.
 */
async function enviarMensagemWA(tenant, telefone, mensagem) {
  const instance = tenant.evolutionInstance;
  const base     = tenant.evolutionBaseUrl || process.env.EVOLUTION_BASE_URL || 'https://api.divulgabr.com.br';
  const apikey   = tenant.evolutionApiKey;

  const res = await fetch(`${base}/message/sendText/${instance}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey },
    body: JSON.stringify({ number: telefone, text: mensagem }),
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    registrarErro(instance, tenant.nome);
    throw new Error(`Evolution API ${res.status}: ${txt}`);
  }

  registrarSucesso(instance);
}

module.exports = { enviarMensagemWA, isSuspensa, registrarErro, registrarSucesso };
