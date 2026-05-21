const cron = require('node-cron');
const prisma = require('../lib/prisma');
const { getConnectionState } = require('./evolutionService');
const nodemailer = require('nodemailer');

// Tenants que já foram alertados neste ciclo (evita spam por cada tick)
// Chave: tenantId, Valor: timestamp do último alerta
const alertadoEm = new Map();
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hora entre alertas do mesmo tenant

function transporter() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST || 'smtp.hostinger.com',
    port:   Number(process.env.SMTP_PORT || 465),
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function enviarAlertaEmail(tenant) {
  const adminEmail = process.env.SMTP_FROM || process.env.SMTP_USER;
  if (!adminEmail) return;

  await transporter().sendMail({
    from: `"Agendix Monitor" <${adminEmail}>`,
    to:   adminEmail,
    subject: `⚠️ WhatsApp desconectado — ${tenant.nome}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #f59e0b;border-radius:12px">
        <h2 style="color:#d97706;margin:0 0 12px">WhatsApp desconectado</h2>
        <p>A instância WhatsApp do tenant <strong>${tenant.nome}</strong> (slug: <code>${tenant.slug}</code>) está desconectada ou com erro.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
          <tr><td style="padding:6px 0;color:#6b7280">Instância</td><td style="padding:6px 0;font-family:monospace">${tenant.evolutionInstance}</td></tr>
          <tr><td style="padding:6px 0;color:#6b7280">Detectado em</td><td style="padding:6px 0">${new Date().toLocaleString('pt-BR')}</td></tr>
        </table>
        <p style="color:#6b7280;font-size:13px">Acesse o painel admin → Clientes → WhatsApp para reconectar.</p>
      </div>
    `,
  });
}

async function verificarInstancias() {
  try {
    const tenants = await prisma.tenant.findMany({
      where: { evolutionInstance: { not: null }, ativo: true },
      select: { id: true, nome: true, slug: true, evolutionInstance: true, evolutionApiKey: true },
    });

    if (!tenants.length) return;

    const results = await Promise.allSettled(
      tenants.map(t => getConnectionState(t.evolutionInstance, t.evolutionApiKey))
    );

    for (let i = 0; i < tenants.length; i++) {
      const tenant = tenants[i];
      const r = results[i];
      const state = r.status === 'fulfilled'
        ? (r.value?.instance?.state || r.value?.state || 'unknown')
        : 'error';

      if (state !== 'open') {
        const ultimo = alertadoEm.get(tenant.id) || 0;
        if (Date.now() - ultimo > COOLDOWN_MS) {
          alertadoEm.set(tenant.id, Date.now());
          console.warn(`[watchdog] ${tenant.nome} (${tenant.slug}) WA state=${state} — enviando alerta`);
          enviarAlertaEmail(tenant).catch(err =>
            console.error(`[watchdog] falha ao enviar email para ${tenant.slug}:`, err.message)
          );
        }
      } else {
        // Reconectou — limpa o cooldown para alertar novamente se cair
        alertadoEm.delete(tenant.id);
      }
    }
  } catch (err) {
    console.error('[watchdog] erro ao verificar instâncias:', err.message);
  }
}

function agendarWatchdog() {
  // Roda a cada 15 minutos
  cron.schedule('*/15 * * * *', verificarInstancias);
  console.log('[watchdog] Evolution API watchdog ativo — verificação a cada 15 min');
}

module.exports = { agendarWatchdog, verificarInstancias };
