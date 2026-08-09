const { MercadoPagoConfig, PreApproval, PreApprovalPlan } = require('mercadopago');
const crypto = require('crypto');

const PLANO_MP_ID = {
  solo:     process.env.MP_PLAN_SOLO_ID,
  pro:      process.env.MP_PLAN_PRO_ID,
  business: process.env.MP_PLAN_BUSINESS_ID,
};

const PLANO_MP_ID_ANUAL = {
  solo:     process.env.MP_PLAN_SOLO_ANUAL_ID,
  pro:      process.env.MP_PLAN_PRO_ANUAL_ID,
  business: process.env.MP_PLAN_BUSINESS_ANUAL_ID,
};

function getClient() {
  if (!process.env.MP_ACCESS_TOKEN) throw new Error('MP_ACCESS_TOKEN não configurado');
  return new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
}

// Valores por plano/ciclo (inline — não depende de planos cadastrados no MP)
const PRECOS = {
  solo:     { mensal: 39.00,   anual: 374.40 },
  pro:      { mensal: 59.00,   anual: 566.40 },
  business: { mensal: 99.00,   anual: 950.40 },
};

const RAZOES = {
  solo:     { mensal: 'Agendix Solo — R$39/mês',    anual: 'Agendix Solo Anual — R$374,40/ano' },
  pro:      { mensal: 'Agendix Pro — R$59/mês',     anual: 'Agendix Pro Anual — R$566,40/ano' },
  business: { mensal: 'Agendix Business — R$99/mês', anual: 'Agendix Business Anual — R$950,40/ano' },
};

async function criarAssinatura(tenant, plano, payerEmail, ciclo = 'mensal') {
  if (!PRECOS[plano]) throw new Error(`Plano inválido: ${plano}`);

  const token = process.env.APP_URL ? process.env.MP_ACCESS_TOKEN : null;
  const accessToken = token || process.env.MP_ACCESS_TOKEN;
  if (!accessToken) throw new Error('MP_ACCESS_TOKEN não configurado');

  const valor = PRECOS[plano][ciclo];
  const razao = RAZOES[plano][ciclo];
  const freq  = ciclo === 'anual' ? 12 : 1;

  // Assinatura inline — gera init_point sem depender de plano cadastrado no MP
  const appUrl = process.env.APP_URL || 'https://agendix.divulgabr.com.br';
  const payload = {
    reason:             razao,
    payer_email:        payerEmail,
    external_reference: String(tenant.id),
    back_url:           `${appUrl}/pagamento/retorno?status=approved`,
    notification_url:   `${appUrl}/api/payments/webhook`,
    status:             'pending',
    auto_recurring: {
      frequency:          freq,
      frequency_type:     'months',
      transaction_amount: valor,
      currency_id:        'BRL',
    },
  };

  console.log('[MP criarAssinatura] payload:', JSON.stringify(payload));

  const res = await fetch('https://api.mercadopago.com/preapproval', {
    method: 'POST',
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  console.log('[MP criarAssinatura] resposta:', JSON.stringify({ status: res.status, id: data.id, init_point: data.init_point, message: data.message }));

  if (!res.ok) {
    const err = new Error(data.message || `MP API ${res.status}`);
    err.status = res.status;
    err.body = data;
    throw err;
  }

  return { id: data.id, init_point: data.init_point };
}

// Verifica se os planos MP estão acessíveis com o token atual
async function verificarPlanos() {
  const client = getClient();
  const plan = new PreApprovalPlan(client);
  const results = { mensal: {}, anual: {} };
  for (const [nome, id] of Object.entries(PLANO_MP_ID)) {
    if (!id) { results.mensal[nome] = { ok: false, error: 'ID não configurado' }; continue; }
    try {
      const r = await plan.get({ id });
      results.mensal[nome] = { ok: true, status: r.status, name: r.reason };
    } catch (e) {
      results.mensal[nome] = { ok: false, error: e.message, status: e.status };
    }
  }
  for (const [nome, id] of Object.entries(PLANO_MP_ID_ANUAL)) {
    if (!id) { results.anual[nome] = { ok: false, error: 'ID não configurado' }; continue; }
    try {
      const r = await plan.get({ id });
      results.anual[nome] = { ok: true, status: r.status, name: r.reason };
    } catch (e) {
      results.anual[nome] = { ok: false, error: e.message, status: e.status };
    }
  }
  return results;
}

function getPlanNameFromId(planId) {
  if (!planId) return null;
  const entry = Object.entries(PLANO_MP_ID).find(([, id]) => id && id === planId);
  return entry ? entry[0] : null;
}

async function cancelarAssinatura(subscriptionId) {
  const client = getClient();
  const preApproval = new PreApproval(client);
  await preApproval.update({ id: subscriptionId, body: { status: 'cancelled' } });
}

async function buscarAssinatura(subscriptionId) {
  const client = getClient();
  const preApproval = new PreApproval(client);
  return preApproval.get({ id: subscriptionId });
}

// Valida a assinatura HMAC-SHA256 enviada pelo MP no header x-signature
function verificarWebhookSignature(req) {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('MP_WEBHOOK_SECRET não configurado em produção');
    }
    return true; // aceita apenas em dev/test
  }

  const xSignature = req.headers['x-signature'];
  const xRequestId = req.headers['x-request-id'];
  if (!xSignature) return false;

  const parts = Object.fromEntries(xSignature.split(',').map(p => p.split('=')));
  const ts = parts['ts'];
  const v1 = parts['v1'];
  if (!ts || !v1) return false;

  const dataId = req.query['data.id'] || req.query.id || '';
  const template = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const computed = crypto.createHmac('sha256', secret).update(template).digest('hex');

  return crypto.timingSafeEqual(Buffer.from(v1), Buffer.from(computed));
}

module.exports = { criarAssinatura, cancelarAssinatura, buscarAssinatura, verificarWebhookSignature, getPlanNameFromId, verificarPlanos };
