const waTemplate = require('../../n8n/agendamento-whatsapp.json');
const notifTemplate = require('../../n8n/agendamento-notificacoes.json');

const N8N_BASE = () => process.env.N8N_BASE_URL;
const N8N_KEY  = () => process.env.N8N_API_KEY;
const CRM_BASE = () => process.env.CRM_BASE_URL || 'https://crm.divulgabr.com.br';
const MASTER   = () => process.env.MASTER_API_TOKEN;

async function n8nFetch(method, path, body) {
  const res = await fetch(`${N8N_BASE()}/api/v1${path}`, {
    method,
    headers: {
      'X-N8N-API-KEY': N8N_KEY(),
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`n8n API ${method} ${path} → ${res.status}: ${text}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

function buildWorkflow(template, slug, name) {
  let str = JSON.stringify(JSON.parse(JSON.stringify(template)));

  const replacements = {
    'https://crm.divulgabr.com.br': CRM_BASE(),
    [MASTER()]: MASTER(), // mantém — já está correto no template
  };

  // Substitui URL do CRM se diferente do template
  if (CRM_BASE() !== 'https://crm.divulgabr.com.br') {
    str = str.split('https://crm.divulgabr.com.br').join(CRM_BASE());
  }

  // Path único por slug (webhook)
  str = str.split('"path":"agendamento-whatsapp"').join(`"path":"agendamento-whatsapp-${slug}"`);
  str = str.split('"path":"agendamento-notificacoes"').join(`"path":"agendamento-notificacoes-${slug}"`);

  const wf = JSON.parse(str);
  wf.name = name;
  return wf;
}

async function provisionarWorkflows(tenant) {
  const { slug, nome } = tenant;

  // Workflow WhatsApp bot
  const waWf = buildWorkflow(waTemplate, slug, `CRM Agendamento WA — ${nome}`);
  const waCreated = await n8nFetch('POST', '/workflows', {
    name: waWf.name,
    nodes: waWf.nodes,
    connections: waWf.connections,
    settings: waWf.settings || { executionOrder: 'v1' },
  });
  await n8nFetch('POST', `/workflows/${waCreated.id}/activate`);

  // Workflow Notificações
  const notifWf = buildWorkflow(notifTemplate, slug, `CRM Notificações — ${nome}`);
  const notifCreated = await n8nFetch('POST', '/workflows', {
    name: notifWf.name,
    nodes: notifWf.nodes,
    connections: notifWf.connections,
    settings: notifWf.settings || { executionOrder: 'v1' },
  });
  await n8nFetch('POST', `/workflows/${notifCreated.id}/activate`);

  const webhookUrl = `${N8N_BASE()}/webhook/agendamento-notificacoes-${slug}`;

  return {
    waId: String(waCreated.id),
    notifId: String(notifCreated.id),
    webhookUrl,
  };
}

async function removerWorkflows(tenant) {
  const ids = [tenant.n8nWorkflowWaId, tenant.n8nWorkflowNotifId].filter(Boolean);

  for (const id of ids) {
    try {
      await n8nFetch('POST', `/workflows/${id}/deactivate`);
    } catch (_) {
      // ignora se já inativo
    }
    await n8nFetch('DELETE', `/workflows/${id}`);
  }
}

module.exports = { provisionarWorkflows, removerWorkflows };
