const nodemailer = require('nodemailer');

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
    subject: 'RedefiniÃ§Ã£o de senha â€” Agendix',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#2563eb;margin-bottom:8px">Redefinir senha</h2>
        <p>OlÃ¡, <strong>${nome}</strong>.</p>
        <p>Recebemos uma solicitaÃ§Ã£o para redefinir a senha da sua conta no Agendix.</p>
        <p>Clique no botÃ£o abaixo para criar uma nova senha. Este link expira em <strong>1 hora</strong>.</p>
        <a href="${link}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Redefinir senha
        </a>
        <p style="color:#6b7280;font-size:13px">Se nÃ£o foi vocÃª quem solicitou, ignore este email. Sua senha nÃ£o serÃ¡ alterada.</p>
        <p style="color:#9ca3af;font-size:12px">Link: <a href="${link}">${link}</a></p>
      </div>
    `,
  });
}

async function enviarEmailAtivacao({ para, nome, link }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@agendix.com.br';
  await transporter.sendMail({
    from: `"Agendix" <${from}>`,
    to: para,
    subject: 'Ative sua conta â€” Agendix',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#5B3DF5;margin-bottom:8px">Bem-vindo ao Agendix! ðŸŽ‰</h2>
        <p>OlÃ¡, <strong>${nome}</strong>.</p>
        <p>Sua conta foi criada com sucesso. Clique no botÃ£o abaixo para ativar e comeÃ§ar a usar o Agendix.</p>
        <p>Este link expira em <strong>24 horas</strong>.</p>
        <a href="${link}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#5B3DF5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Ativar minha conta
        </a>
        <p style="color:#6b7280;font-size:13px">Se nÃ£o foi vocÃª quem se cadastrou, ignore este email.</p>
        <p style="color:#9ca3af;font-size:12px">Link: <a href="${link}">${link}</a></p>
      </div>
    `,
  });
}

async function enviarEmailBoasVindas({ para, nome, slug }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@agendix.com.br';
  const appUrl = process.env.APP_URL || 'https://agendix.divulgabr.com.br';
  const linkAgendar = `${appUrl}/agendar/${slug}`;
  const linkConfig  = `${appUrl}/configuracoes`;
  await transporter.sendMail({
    from: `"Agendix" <${from}>`,
    to: para,
    subject: 'Sua conta estÃ¡ ativa â€” primeiros passos no Agendix',
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111">
        <h2 style="color:#5B3DF5;margin-bottom:4px">Conta ativada com sucesso! ðŸŽ‰</h2>
        <p>OlÃ¡, <strong>${nome}</strong>. Bem-vindo ao Agendix!</p>
        <p>Seu perÃ­odo de teste de <strong>30 dias</strong> jÃ¡ comeÃ§ou. Siga os passos abaixo para aproveitar ao mÃ¡ximo:</p>
        <ol style="padding-left:20px;line-height:2">
          <li>Acesse <a href="${linkConfig}">ConfiguraÃ§Ãµes â†’ Empresa</a> e personalize seu nome e logo</li>
          <li>Cadastre seus serviÃ§os em <a href="${appUrl}/servicos">ServiÃ§os</a></li>
          <li>Configure seus horÃ¡rios de atendimento em <a href="${linkConfig}">ConfiguraÃ§Ãµes â†’ Agenda</a></li>
          <li>Compartilhe seu link de agendamento com seus clientes:<br/>
            <a href="${linkAgendar}" style="color:#5B3DF5">${linkAgendar}</a>
          </li>
        </ol>
        <p>Qualquer dÃºvida, responda este email ou acesse o suporte.</p>
        <p style="color:#6b7280;font-size:13px">Equipe Agendix â€” suporte@divulgabr.com.br</p>
      </div>
    `,
  });
}

async function enviarEmailTrialD3({ para, nome, slug }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const appUrl = process.env.APP_URL || 'https://agendix.divulgabr.com.br';
  const linkDashboard = `${appUrl}/`;
  const linkServicos  = `${appUrl}/servicos`;
  const linkConfig    = `${appUrl}/configuracoes`;
  await transporter.sendMail({
    from: `"Agendix" <${from}>`,
    to: para,
    subject: `${nome}, como estÃ¡ indo seu teste? ðŸ‘‹`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111">
        <h2 style="color:#5B3DF5;margin-bottom:4px">JÃ¡ se passaram 3 dias â€” chegou a hora de configurar! âš™ï¸</h2>
        <p>OlÃ¡, <strong>${nome}</strong>!</p>
        <p>VocÃª ainda tem <strong>27 dias de teste gratuito</strong> no Agendix. Mas para aproveitar de verdade, precisa de 3 passos simples:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr>
            <td style="padding:10px;background:#f5f3ff;border-radius:8px;margin-bottom:8px;display:block">
              âœ… <strong>1. Cadastre seus serviÃ§os</strong><br/>
              <a href="${linkServicos}" style="color:#5B3DF5;font-size:13px">Ir para ServiÃ§os â†’</a>
            </td>
          </tr>
          <tr><td style="height:8px"></td></tr>
          <tr>
            <td style="padding:10px;background:#f5f3ff;border-radius:8px;display:block">
              âœ… <strong>2. Configure seus horÃ¡rios de atendimento</strong><br/>
              <a href="${linkConfig}" style="color:#5B3DF5;font-size:13px">Ir para ConfiguraÃ§Ãµes â†’</a>
            </td>
          </tr>
          <tr><td style="height:8px"></td></tr>
          <tr>
            <td style="padding:10px;background:#f5f3ff;border-radius:8px;display:block">
              âœ… <strong>3. Compartilhe seu link de agendamento com um cliente</strong><br/>
              <a href="${appUrl}/agendar/${slug}" style="color:#5B3DF5;font-size:13px">${appUrl}/agendar/${slug}</a>
            </td>
          </tr>
        </table>
        <a href="${linkDashboard}" style="display:inline-block;margin:16px 0;padding:12px 28px;background:#5B3DF5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Acessar minha conta
        </a>
        <p style="color:#6b7280;font-size:13px">DÃºvidas? Responda este email â€” estamos aqui para ajudar.</p>
        <p style="color:#9ca3af;font-size:12px">Equipe Agendix</p>
      </div>
    `,
  });
}

async function enviarEmailTrialD10({ para, nome, slug }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const appUrl = process.env.APP_URL || 'https://agendix.divulgabr.com.br';
  const linkPlano = `${appUrl}/configuracoes`;
  await transporter.sendMail({
    from: `"Agendix" <${from}>`,
    to: para,
    subject: `Faltam 2 semanas para o seu teste encerrar â€” ${nome}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111">
        <h2 style="color:#d97706;margin-bottom:4px">â³ Seu teste termina em 15 dias</h2>
        <p>OlÃ¡, <strong>${nome}</strong>!</p>
        <p>Seu perÃ­odo de teste no Agendix encerra em <strong>15 dias</strong>. ApÃ³s isso, o acesso serÃ¡ suspenso atÃ© a escolha de um plano.</p>
        <p>Com o Agendix vocÃª:</p>
        <ul style="padding-left:20px;line-height:2;color:#374151">
          <li>Recebe agendamentos pelo WhatsApp <strong>automaticamente</strong>, sem precisar responder manualmente</li>
          <li>Envia lembretes para seus clientes e reduz faltas</li>
          <li>Controla sua agenda e financeiro em um sÃ³ lugar</li>
        </ul>
        <p><strong>Planos a partir de R$ 37/mÃªs.</strong> Cancele quando quiser, sem multa.</p>
        <a href="${linkPlano}" style="display:inline-block;margin:16px 0;padding:12px 28px;background:#d97706;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Escolher meu plano
        </a>
        <p style="color:#6b7280;font-size:13px">Seu link de agendamento: <a href="${appUrl}/agendar/${slug}">${appUrl}/agendar/${slug}</a></p>
        <p style="color:#9ca3af;font-size:12px">Equipe Agendix â€” suporte@divulgabr.com.br</p>
      </div>
    `,
  });
}

async function enviarEmailTrialD13({ para, nome }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const appUrl = process.env.APP_URL || 'https://agendix.divulgabr.com.br';
  const linkPlano = `${appUrl}/configuracoes`;
  await transporter.sendMail({
    from: `"Agendix" <${from}>`,
    to: para,
    subject: `âš ï¸ Ãšltimo dia de teste, ${nome}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111">
        <h2 style="color:#dc2626;margin-bottom:4px">ðŸš¨ Seu teste encerra amanhÃ£</h2>
        <p>OlÃ¡, <strong>${nome}</strong>!</p>
        <p>AmanhÃ£ seu perÃ­odo de teste gratuito no Agendix se encerra. Para nÃ£o perder o acesso Ã  sua agenda, agendamentos e configuraÃ§Ãµes, assine um plano hoje.</p>
        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0">
          <p style="margin:0;color:#dc2626;font-weight:600">O que acontece se o teste expirar sem assinatura?</p>
          <p style="margin:8px 0 0;color:#374151;font-size:14px">Seu acesso serÃ¡ bloqueado. Seus dados ficam guardados por 30 dias â€” vocÃª pode assinar e retomar de onde parou.</p>
        </div>
        <p><strong>Planos a partir de R$ 37/mÃªs.</strong></p>
        <a href="${linkPlano}" style="display:inline-block;margin:16px 0;padding:14px 32px;background:#dc2626;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;font-size:16px">
          Assinar agora e continuar
        </a>
        <p style="color:#6b7280;font-size:13px">DÃºvidas? Responda este email â€” estamos prontos para ajudar.</p>
        <p style="color:#9ca3af;font-size:12px">Equipe Agendix â€” suporte@divulgabr.com.br</p>
      </div>
    `,
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
};


