const prisma = require('../lib/prisma');

/**
 * Dispara um evento para o webhook n8n do tenant (fire-and-forget).
 * @param {number} tenantId
 * @param {string} evento  ex: 'lead.criado', 'lead.atualizado', 'agendamento.criado'
 * @param {object} payload dados do evento
 */
async function dispararWebhook(tenantId, evento, payload) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { n8nWebhookUrl: true, n8nApiKey: true, slug: true },
    });

    if (!tenant?.n8nWebhookUrl) return;

    const headers = { 'Content-Type': 'application/json' };
    if (tenant.n8nApiKey) headers['Authorization'] = `Bearer ${tenant.n8nApiKey}`;

    await fetch(tenant.n8nWebhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ evento, tenant: tenant.slug, dados: payload, timestamp: new Date().toISOString() }),
    });
  } catch (_) {
    // falha silenciosa — não quebra o fluxo principal
  }
}

async function dispararWebhookAgendamento(tenantId, agendamento) {
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { n8nWebhookUrl: true, n8nApiKey: true, id: true, nome: true, slug: true, apiToken: true, nichoLabel: true, evolutionInstance: true, evolutionApiKey: true, evolutionBaseUrl: true },
    });
    if (!tenant?.n8nWebhookUrl) return;

    const config = await prisma.configuracaoAgenda.findUnique({ where: { tenantId } });

    const headers = { 'Content-Type': 'application/json' };
    if (tenant.n8nApiKey) headers['X-N8N-API-Key'] = tenant.n8nApiKey;

    await fetch(tenant.n8nWebhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        evento: 'agendamento_criado',
        agendamento,
        tenant: { id: tenant.id, nome: tenant.nome, slug: tenant.slug, apiToken: tenant.apiToken || '', nichoLabel: tenant.nichoLabel || 'atendimento', evolutionInstance: tenant.evolutionInstance || null, evolutionApiKey: tenant.evolutionApiKey || null, evolutionBaseUrl: tenant.evolutionBaseUrl || 'https://api.divulgabr.com.br' },
        config: { whatsappAdmin: config?.whatsappAdmin || null },
      }),
    });
  } catch (_) {}
}

module.exports = { dispararWebhook, dispararWebhookAgendamento };
