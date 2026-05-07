#!/usr/bin/env node
/**
 * Setup automático do Mercado Pago para o Agendix
 * Uso: MP_ACCESS_TOKEN=TEST-... node scripts/setup-mercadopago.js [APP_URL]
 *
 * Detecta automaticamente sandbox (TEST-) vs produção (APP_USR-)
 */

const https = require('https');
const crypto = require('crypto');

const TOKEN    = process.env.MP_ACCESS_TOKEN;
const APP_URL  = process.argv[2] || process.env.APP_URL || 'https://agendix.divulgabr.com.br';
const SANDBOX  = TOKEN?.startsWith('TEST-');
// back_url precisa ser público — em sandbox local usamos o domínio de produção
const BACK_URL = APP_URL.includes('localhost') ? 'https://agendix.divulgabr.com.br' : APP_URL;

if (!TOKEN) {
  console.error('\n❌ Defina MP_ACCESS_TOKEN antes de rodar:\n');
  console.error('   MP_ACCESS_TOKEN=TEST-... node scripts/setup-mercadopago.js https://SEU-NGROK.ngrok-free.app\n');
  process.exit(1);
}

const PLANOS = [
  { id: 'basico',   reason: 'Agendix Básico',   valor: 47.00  },
  { id: 'pro',      reason: 'Agendix Pro',       valor: 97.00  },
  { id: 'premium',  reason: 'Agendix Premium',   valor: 147.00 },
  { id: 'business', reason: 'Agendix Business',  valor: 247.00 },
];

function mpRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'api.mercadopago.com',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };

    const req = https.request(options, res => {
      let raw = '';
      res.on('data', chunk => { raw += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(raw);
          if (res.statusCode >= 400) reject(new Error(`MP ${res.statusCode}: ${json.message || raw}`));
          else resolve(json);
        } catch { reject(new Error(`Resposta inválida: ${raw}`)); }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function criarPlano(plano) {
  process.stdout.write(`  Criando plano "${plano.reason}"... `);
  const result = await mpRequest('POST', '/preapproval_plan', {
    reason: plano.reason,
    auto_recurring: {
      frequency: 1,
      frequency_type: 'months',
      transaction_amount: plano.valor,
      currency_id: 'BRL',
    },
    back_url: `${BACK_URL}/configuracoes`,
    status: 'active',
  });
  console.log(`✅ ID: ${result.id}`);
  return result.id;
}

async function registrarWebhook() {
  const webhookUrl = `${APP_URL}/api/payments/webhook`;
  process.stdout.write(`  Registrando webhook (${webhookUrl})... `);

  const { results } = await mpRequest('GET', '/v1/webhooks?offset=0&limit=50').catch(() => ({ results: [] }));
  const existente = results?.find(w => w.url === webhookUrl);
  if (existente) {
    console.log(`✅ já existia (ID: ${existente.id})`);
    return existente;
  }

  const result = await mpRequest('POST', '/v1/webhooks', {
    url: webhookUrl,
    events: ['subscription_preapproval', 'payment'],
  });
  console.log(`✅ criado (ID: ${result.id})`);
  return result;
}

async function main() {
  const modo = SANDBOX ? '🧪 SANDBOX (teste)' : '🚀 PRODUÇÃO';
  console.log(`\n${modo} — Setup Mercado Pago Agendix\n`);
  console.log(`   Token : ${TOKEN.slice(0, 25)}...`);
  console.log(`   APP_URL: ${APP_URL}\n`);

  if (SANDBOX && APP_URL.includes('localhost')) {
    console.log('⚠️  Atenção: APP_URL é localhost — o webhook MP não chegará até aqui.');
    console.log('   Para testar webhooks, rode: node scripts/setup-mercadopago.js https://SEU-NGROK.ngrok-free.app\n');
  }

  console.log('📦 Criando planos de assinatura...\n');
  const ids = {};
  for (const plano of PLANOS) {
    ids[plano.id] = await criarPlano(plano);
  }

  if (!APP_URL.includes('localhost')) {
    console.log('\n🔔 Registrando webhook...');
    await registrarWebhook();
  } else {
    console.log('\n🔔 Webhook pulado (localhost) — configure manualmente no painel MP após ter a URL pública.');
  }

  const secret = crypto.randomBytes(32).toString('hex');

  const sep = '─'.repeat(60);
  console.log(`\n${sep}`);
  if (SANDBOX) {
    console.log('✅ Setup SANDBOX concluído!\n');
    console.log('Adicione estas variáveis no seu .env local (backend):\n');
  } else {
    console.log('✅ Setup PRODUÇÃO concluído!\n');
    console.log('Adicione estas variáveis no EasyPanel → agendix-backend → Environment:\n');
  }

  console.log(`MP_ACCESS_TOKEN=${TOKEN}`);
  console.log(`MP_WEBHOOK_SECRET=${secret}`);
  console.log(`MP_PLAN_BASICO_ID=${ids.basico}`);
  console.log(`MP_PLAN_PRO_ID=${ids.pro}`);
  console.log(`MP_PLAN_PREMIUM_ID=${ids.premium}`);
  console.log(`MP_PLAN_BUSINESS_ID=${ids.business}`);
  console.log(sep);
  console.log('\n⚠️  Salve MP_WEBHOOK_SECRET — não é recuperável.\n');

  if (SANDBOX) {
    console.log('Próximos passos para testar localmente:');
    console.log('  1. Copie as vars acima para backend/.env');
    console.log('  2. cd backend && node server.js');
    console.log('  3. cd frontend && npm run dev');
    console.log('  4. Acesse http://localhost:5173 → Configurações → aba Plano → Assinar');
    console.log('  5. Use cartão de teste MP: 5031 4332 1540 6351 · venc: 11/25 · CVV: 123\n');
  }
}

main().catch(err => {
  console.error('\n❌ Erro:', err.message);
  process.exit(1);
});
