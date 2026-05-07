const { MercadoPagoConfig, PreApproval, PreApprovalPlan } = require('mercadopago');
const crypto = require('crypto');

const PLANO_MP_ID = {
  basico:   process.env.MP_PLAN_BASICO_ID,
  pro:      process.env.MP_PLAN_PRO_ID,
  premium:  process.env.MP_PLAN_PREMIUM_ID,
  business: process.env.MP_PLAN_BUSINESS_ID,
};

function getClient() {
  if (!process.env.MP_ACCESS_TOKEN) throw new Error('MP_ACCESS_TOKEN não configurado');
  return new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
}

async function criarAssinatura(tenant, plano) {
  const planId = PLANO_MP_ID[plano];
  if (!planId) throw new Error(`Plano MP não configurado para: ${plano}`);

  const client = getClient();
  const preApproval = new PreApproval(client);

  const result = await preApproval.create({
    body: {
      preapproval_plan_id: planId,
      external_reference: String(tenant.id),
      back_url: `${process.env.APP_URL}/configuracoes?status=approved`,
    },
  });

  return { id: result.id, init_point: result.init_point };
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
  if (!secret) return true; // sem secret configurado, aceita (ambiente dev)

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

module.exports = { criarAssinatura, cancelarAssinatura, buscarAssinatura, verificarWebhookSignature, getPlanNameFromId };
