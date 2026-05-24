const nodemailer = require('nodemailer');

/* ── Cores do design system (espelha a landing page) ── */
const C = {
  bg:      '#09090C',
  surface: '#111118',
  g:       '#00C97A',
  gDim:    'rgba(0,201,122,0.1)',
  gBorder: 'rgba(0,201,122,0.25)',
  a:       '#E8860A',
  aDim:    'rgba(232,134,10,0.1)',
  aBorder: 'rgba(232,134,10,0.25)',
  tx:      '#EEEEF5',
  txMd:    '#B0B0C8',
  mt:      '#7878A0',
  bd:      'rgba(255,255,255,0.08)',
};

/* ── Layout base de email ── */
function emailBase({ title, preheader = '', body }) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title}</title>
  <style>
    body{margin:0;padding:0;background:${C.bg};font-family:'Helvetica Neue',Arial,sans-serif;color:${C.tx}}
    a{color:${C.g};text-decoration:none}
    .wrap{max-width:520px;margin:0 auto;padding:32px 16px}
    .card{background:${C.surface};border:1px solid ${C.bd};border-radius:16px;padding:36px 32px}
    .logo{display:block;margin:0 auto 28px;height:36px;width:auto}
    .divider{height:1px;background:${C.bd};margin:24px 0}
    .btn{display:inline-block;padding:13px 28px;background:${C.g};color:#08080C!important;border-radius:10px;font-weight:700;font-size:15px;text-decoration:none}
    .footer{text-align:center;margin-top:24px;font-size:12px;color:${C.mt}}
    .step{display:flex;align-items:flex-start;gap:12px;margin-bottom:14px}
    .step-num{min-width:26px;height:26px;background:${C.gDim};border:1px solid ${C.gBorder};border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:${C.g}}
    .step-text{font-size:14px;color:${C.txMd};line-height:1.6}
    .alert{background:${C.aDim};border:1px solid ${C.aBorder};border-radius:10px;padding:14px 16px;margin:20px 0}
    .badge{display:inline-block;background:${C.gDim};border:1px solid ${C.gBorder};color:${C.g};border-radius:6px;padding:3px 10px;font-size:12px;font-weight:600}
  </style>
</head>
<body>
  ${preheader ? `<div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:${C.bg}">${preheader}</div>` : ''}
  <div class="wrap">
    <div class="card">
      <img src="https://agendix.divulgabr.com.br/logo-agendix-dark.png" alt="Agendix" class="logo"/>
      ${body}
    </div>
    <div class="footer">
      © 2026 Agendix · DivulgaBR<br/>
      <a href="mailto:suporte@divulgabr.com.br" style="color:${C.mt}">suporte@divulgabr.com.br</a>
    </div>
  </div>
</body>
</html>`;
}

function criarTransporter(cfg = {}) {
  return nodemailer.createTransport({
    host:   cfg.smtpHost || process.env.SMTP_HOST   || 'smtp.hostinger.com',
    port:   Number(cfg.smtpPort || process.env.SMTP_PORT || 465),
    secure: true,
    auth: {
      user: cfg.smtpUser || process.env.SMTP_USER || 'suporte@divulgabr.com.br',
      pass: cfg.smtpPass || process.env.SMTP_PASS,
    },
  });
}

const transporter = criarTransporter();

async function enviarEmailTenant(tenant, { para, assunto, html }) {
  const t = criarTransporter(tenant);
  const from = tenant.smtpFrom || tenant.smtpUser || process.env.SMTP_FROM || process.env.SMTP_USER;
  await t.sendMail({ from: `"${tenant.nome}" <${from}>`, to: para, subject: assunto, html });
}

async function enviarEmailRedefinicao({ para, nome, link }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@agendix.com.br';
  await transporter.sendMail({
    from: `"Agendix" <${from}>`,
    to: para,
    subject: 'Redefinição de senha — Agendix',
    html: emailBase({
      title: 'Redefinição de senha',
      preheader: 'Clique no link para criar uma nova senha no Agendix.',
      body: `
        <h2 style="margin:0 0 6px;font-size:20px;color:${C.tx}">Redefinir senha</h2>
        <p style="color:${C.txMd};font-size:14px;margin:0 0 20px">Olá, <strong style="color:${C.tx}">${nome}</strong>.</p>
        <p style="color:${C.txMd};font-size:14px;margin:0 0 8px">Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para criar uma nova senha.</p>
        <p style="color:${C.txMd};font-size:13px;margin:0 0 28px">Este link expira em <strong style="color:${C.tx}">1 hora</strong>.</p>
        <div style="text-align:center;margin:28px 0">
          <a href="${link}" class="btn">Redefinir minha senha</a>
        </div>
        <div class="divider"></div>
        <p style="color:${C.mt};font-size:12px;margin:0">Se não foi você quem solicitou, ignore este email. Sua senha não será alterada.</p>
      `,
    }),
  });
}

async function enviarEmailAtivacao({ para, nome, link }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@agendix.com.br';
  await transporter.sendMail({
    from: `"Agendix" <${from}>`,
    to: para,
    subject: 'Ative sua conta — Agendix',
    html: emailBase({
      title: 'Ative sua conta',
      preheader: 'Sua conta foi criada! Clique para ativar e começar seu teste grátis.',
      body: `
        <h2 style="margin:0 0 6px;font-size:20px;color:${C.tx}">Bem-vindo ao Agendix! 🎉</h2>
        <p style="color:${C.txMd};font-size:14px;margin:0 0 16px">Olá, <strong style="color:${C.tx}">${nome}</strong>. Sua conta foi criada com sucesso.</p>
        <p style="color:${C.txMd};font-size:14px;margin:0 0 8px">Clique no botão abaixo para ativar sua conta e iniciar seu <strong style="color:${C.tx}">período de teste de 30 dias</strong>.</p>
        <p style="color:${C.txMd};font-size:13px;margin:0 0 28px">Este link expira em <strong style="color:${C.tx}">24 horas</strong>.</p>
        <div style="text-align:center;margin:28px 0">
          <a href="${link}" class="btn">Ativar minha conta</a>
        </div>
        <div class="divider"></div>
        <p style="color:${C.mt};font-size:12px;margin:0">Se não foi você quem se cadastrou, ignore este email.</p>
      `,
    }),
  });
}

async function enviarEmailBoasVindas({ para, nome, slug }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@agendix.com.br';
  const appUrl = process.env.APP_URL || 'https://agendix.divulgabr.com.br';
  const linkAgendar = `${appUrl}/agendar/${slug}`;
  const linkConfig  = `${appUrl}/configuracoes`;

  const steps = [
    { n: 1, text: `Acesse <a href="${linkConfig}">Configurações → Empresa</a> e personalize seu nome e logo` },
    { n: 2, text: `Cadastre seus serviços em <a href="${appUrl}/servicos">Serviços</a>` },
    { n: 3, text: `Configure seus horários em <a href="${linkConfig}">Configurações → Agenda</a>` },
    { n: 4, text: `Compartilhe seu link: <a href="${linkAgendar}">${linkAgendar}</a>` },
  ];

  await transporter.sendMail({
    from: `"Agendix" <${from}>`,
    to: para,
    subject: 'Sua conta está ativa — primeiros passos no Agendix',
    html: emailBase({
      title: 'Conta ativada — primeiros passos',
      preheader: 'Seu período de 30 dias começou. Veja como configurar tudo rapidamente.',
      body: `
        <span class="badge">✓ Conta ativada</span>
        <h2 style="margin:12px 0 6px;font-size:20px;color:${C.tx}">Tudo pronto, ${nome}!</h2>
        <p style="color:${C.txMd};font-size:14px;margin:0 0 24px">Seu período de teste de <strong style="color:${C.tx}">30 dias</strong> já começou. Siga os passos abaixo:</p>
        ${steps.map(s => `
          <div class="step">
            <div class="step-num">${s.n}</div>
            <div class="step-text">${s.text}</div>
          </div>
        `).join('')}
        <div style="text-align:center;margin:28px 0">
          <a href="${appUrl}" class="btn">Acessar minha conta</a>
        </div>
        <div class="divider"></div>
        <p style="color:${C.mt};font-size:12px;margin:0">Equipe Agendix — suporte@divulgabr.com.br</p>
      `,
    }),
  });
}

async function enviarEmailTrialD3({ para, nome, slug }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const appUrl = process.env.APP_URL || 'https://agendix.divulgabr.com.br';

  const steps = [
    { n: 1, text: `<strong style="color:${C.tx}">Cadastre seus serviços</strong> — <a href="${appUrl}/servicos">Ir para Serviços →</a>` },
    { n: 2, text: `<strong style="color:${C.tx}">Configure seus horários</strong> — <a href="${appUrl}/configuracoes">Ir para Configurações →</a>` },
    { n: 3, text: `<strong style="color:${C.tx}">Compartilhe seu link</strong> com um cliente — <a href="${appUrl}/agendar/${slug}">${appUrl}/agendar/${slug}</a>` },
  ];

  await transporter.sendMail({
    from: `"Agendix" <${from}>`,
    to: para,
    subject: `${nome}, como está indo seu teste? 👋`,
    html: emailBase({
      title: '3 dias de Agendix — hora de configurar',
      preheader: 'Você ainda tem 27 dias de teste. Configure em 3 passos simples.',
      body: `
        <h2 style="margin:0 0 6px;font-size:20px;color:${C.tx}">Já se passaram 3 dias ⚙️</h2>
        <p style="color:${C.txMd};font-size:14px;margin:0 0 20px">Olá, <strong style="color:${C.tx}">${nome}</strong>! Você ainda tem <strong style="color:${C.tx}">27 dias de teste gratuito</strong>. Para aproveitar de verdade, complete 3 passos simples:</p>
        ${steps.map(s => `
          <div class="step">
            <div class="step-num">${s.n}</div>
            <div class="step-text">${s.text}</div>
          </div>
        `).join('')}
        <div style="text-align:center;margin:28px 0">
          <a href="${appUrl}" class="btn">Acessar minha conta</a>
        </div>
        <div class="divider"></div>
        <p style="color:${C.mt};font-size:12px;margin:0">Dúvidas? Responda este email — estamos aqui para ajudar.</p>
      `,
    }),
  });
}

async function enviarEmailTrialD10({ para, nome, slug }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const appUrl = process.env.APP_URL || 'https://agendix.divulgabr.com.br';
  const linkPlano = `${appUrl}/configuracoes`;

  await transporter.sendMail({
    from: `"Agendix" <${from}>`,
    to: para,
    subject: `Faltam 2 semanas para o seu teste encerrar — ${nome}`,
    html: emailBase({
      title: '15 dias restantes no seu teste',
      preheader: 'Seu teste termina em 15 dias. Conheça os planos a partir de R$ 49/mês.',
      body: `
        <div class="alert">
          <p style="margin:0;font-weight:600;color:${C.a}">⏳ Seu teste termina em 15 dias</p>
        </div>
        <h2 style="margin:0 0 6px;font-size:20px;color:${C.tx}">Hora de escolher seu plano</h2>
        <p style="color:${C.txMd};font-size:14px;margin:0 0 20px">Olá, <strong style="color:${C.tx}">${nome}</strong>! Com o Agendix você:</p>
        <ul style="padding-left:20px;line-height:2;color:${C.txMd};font-size:14px">
          <li>Recebe agendamentos pelo WhatsApp <strong style="color:${C.tx}">automaticamente</strong></li>
          <li>Envia lembretes para seus clientes e reduz faltas</li>
          <li>Controla agenda e financeiro em um só lugar</li>
        </ul>
        <p style="color:${C.txMd};font-size:14px;margin:20px 0"><strong style="color:${C.tx}">Planos a partir de R$ 49/mês.</strong> Cancele quando quiser, sem multa.</p>
        <div style="text-align:center;margin:28px 0">
          <a href="${linkPlano}" class="btn">Escolher meu plano</a>
        </div>
        <div class="divider"></div>
        <p style="color:${C.mt};font-size:12px;margin:0">Seu link de agendamento: <a href="${appUrl}/agendar/${slug}">${appUrl}/agendar/${slug}</a></p>
      `,
    }),
  });
}

async function enviarEmailTrialD13({ para, nome }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const appUrl = process.env.APP_URL || 'https://agendix.divulgabr.com.br';
  const linkPlano = `${appUrl}/configuracoes`;

  await transporter.sendMail({
    from: `"Agendix" <${from}>`,
    to: para,
    subject: `⚠️ Último dia de teste, ${nome}`,
    html: emailBase({
      title: 'Último dia de teste',
      preheader: 'Amanhã seu teste encerra. Assine agora e mantenha seu acesso.',
      body: `
        <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.2);border-radius:10px;padding:14px 16px;margin-bottom:20px">
          <p style="margin:0;font-weight:700;color:#f87171;font-size:15px">🚨 Seu teste encerra amanhã</p>
        </div>
        <h2 style="margin:0 0 6px;font-size:20px;color:${C.tx}">Não perca seu acesso</h2>
        <p style="color:${C.txMd};font-size:14px;margin:0 0 16px">Olá, <strong style="color:${C.tx}">${nome}</strong>! Amanhã seu período de teste gratuito encerra. Para não perder o acesso à sua agenda e configurações, assine um plano hoje.</p>
        <div style="background:rgba(239,68,68,0.06);border:1px solid rgba(239,68,68,0.15);border-radius:10px;padding:16px;margin:16px 0">
          <p style="margin:0;color:#f87171;font-weight:600;font-size:14px">O que acontece se o teste expirar?</p>
          <p style="margin:8px 0 0;color:${C.txMd};font-size:13px">Seu acesso será bloqueado. Seus dados ficam guardados por 30 dias — você pode assinar e retomar de onde parou.</p>
        </div>
        <p style="color:${C.txMd};font-size:14px;margin:0 0 28px"><strong style="color:${C.tx}">Planos a partir de R$ 49/mês.</strong></p>
        <div style="text-align:center;margin:28px 0">
          <a href="${linkPlano}" class="btn">Assinar agora e continuar</a>
        </div>
        <div class="divider"></div>
        <p style="color:${C.mt};font-size:12px;margin:0">Dúvidas? Responda este email — estamos prontos para ajudar.</p>
      `,
    }),
  });
}

const PLANO_LABEL = { solo: 'Solo', pro: 'Pro', business: 'Business' };
const PLANO_RECURSOS = {
  solo:     ['100 agendamentos/mês', '1 usuário', 'Confirmação WA automática', 'Agendamento público online'],
  pro:      ['Agendamentos ilimitados', '5 usuários', 'Bot WA completo', 'Financeiro básico'],
  business: ['Agendamentos ilimitados', 'Usuários ilimitados', 'Bot WA + Agente IA', 'Financeiro completo'],
};

async function enviarEmailOnboardingPago({ para, nome, slug, plano }) {
  const from    = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@agendix.com.br';
  const appUrl  = process.env.APP_URL || 'https://agendix.divulgabr.com.br';
  const recursos = (PLANO_RECURSOS[plano] || [])
    .map(r => `<li style="color:${C.txMd};font-size:14px;line-height:2">${r}</li>`).join('');

  await transporter.sendMail({
    from: `"Agendix" <${from}>`,
    to: para,
    subject: `Assinatura confirmada — Agendix ${PLANO_LABEL[plano] || plano}`,
    html: emailBase({
      title: 'Assinatura confirmada',
      preheader: `Seu plano ${PLANO_LABEL[plano] || plano} está ativo. Veja os próximos passos.`,
      body: `
        <span class="badge">✓ Plano ${PLANO_LABEL[plano] || plano} ativo</span>
        <h2 style="margin:12px 0 6px;font-size:20px;color:${C.tx}">Assinatura ativada! 🎉</h2>
        <p style="color:${C.txMd};font-size:14px;margin:0 0 16px">Olá, <strong style="color:${C.tx}">${nome}</strong>. Seu plano está ativo. Recursos incluídos:</p>
        <ul style="padding-left:20px">${recursos}</ul>
        <p style="color:${C.txMd};font-size:14px;margin:20px 0 8px"><strong style="color:${C.tx}">Próximos passos:</strong></p>
        <div class="step"><div class="step-num">1</div><div class="step-text">Configure sua agenda em <a href="${appUrl}/configuracoes">Configurações → Agenda</a></div></div>
        <div class="step"><div class="step-num">2</div><div class="step-text">Conecte seu WhatsApp em <a href="${appUrl}/configuracoes">Configurações → Integração</a></div></div>
        <div class="step"><div class="step-num">3</div><div class="step-text">Compartilhe seu link: <a href="${appUrl}/agendar/${slug}">${appUrl}/agendar/${slug}</a></div></div>
        <div style="text-align:center;margin:28px 0">
          <a href="${appUrl}" class="btn">Acessar minha conta</a>
        </div>
        <div class="divider"></div>
        <p style="color:${C.mt};font-size:12px;margin:0">Equipe Agendix — suporte@divulgabr.com.br</p>
      `,
    }),
  });
}

async function enviarEmailAdminNovoPagamento({ tenantNome, tenantSlug, plano, adminEmail }) {
  const from    = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@agendix.com.br';
  const destino = process.env.SMTP_FROM || process.env.SMTP_USER;
  const appUrl  = process.env.APP_URL || 'https://agendix.divulgabr.com.br';

  if (!destino) return;

  await transporter.sendMail({
    from: `"Agendix Monitor" <${from}>`,
    to: destino,
    subject: `💰 Novo pagamento — ${tenantNome} (${PLANO_LABEL[plano] || plano})`,
    html: emailBase({
      title: 'Novo cliente pagante',
      body: `
        <span class="badge">💰 Novo pagamento</span>
        <h2 style="margin:12px 0 20px;font-size:20px;color:${C.tx}">Novo cliente pagante</h2>
        <table style="width:100%;border-collapse:collapse;font-size:14px">
          <tr><td style="padding:8px 0;color:${C.mt};width:110px">Empresa</td><td style="padding:8px 0"><strong style="color:${C.tx}">${tenantNome}</strong></td></tr>
          <tr><td style="padding:8px 0;color:${C.mt}">Slug</td><td style="padding:8px 0;font-family:monospace;color:${C.txMd}">${tenantSlug}</td></tr>
          <tr><td style="padding:8px 0;color:${C.mt}">Plano</td><td style="padding:8px 0;color:${C.txMd}">${PLANO_LABEL[plano] || plano}</td></tr>
          <tr><td style="padding:8px 0;color:${C.mt}">Email admin</td><td style="padding:8px 0;color:${C.txMd}">${adminEmail || '—'}</td></tr>
        </table>
        <div class="divider"></div>
        <div style="background:${C.gDim};border:1px solid ${C.gBorder};border-radius:10px;padding:14px 16px;font-size:13px;color:${C.txMd}">
          <strong style="color:${C.g}">Ação necessária:</strong> configure WhatsApp e n8n para este tenant no
          <a href="${appUrl}/admin/clientes">painel admin → Clientes</a>.
        </div>
      `,
    }),
  });
}

module.exports = {
  enviarEmailRedefinicao,
  enviarEmailAtivacao,
  enviarEmailBoasVindas,
  enviarEmailTrialD3,
  enviarEmailTrialD10,
  enviarEmailTrialD13,
  enviarEmailTenant,
  enviarEmailOnboardingPago,
  enviarEmailAdminNovoPagamento,
};
