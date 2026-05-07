const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST   || 'smtp.hostinger.com',
  port:   Number(process.env.SMTP_PORT || 465),
  secure: process.env.SMTP_SECURE !== 'false', // true por padrão (porta 465 = SSL)
  auth: {
    user: process.env.SMTP_USER || 'suporte@divulgabr.com.br',
    pass: process.env.SMTP_PASS,
  },
});

async function enviarEmailRedefinicao({ para, nome, link }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@agendix.com.br';
  await transporter.sendMail({
    from: `"Agendix" <${from}>`,
    to: para,
    subject: 'Redefinição de senha — Agendix',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#2563eb;margin-bottom:8px">Redefinir senha</h2>
        <p>Olá, <strong>${nome}</strong>.</p>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta no Agendix.</p>
        <p>Clique no botão abaixo para criar uma nova senha. Este link expira em <strong>1 hora</strong>.</p>
        <a href="${link}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Redefinir senha
        </a>
        <p style="color:#6b7280;font-size:13px">Se não foi você quem solicitou, ignore este email. Sua senha não será alterada.</p>
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
    subject: 'Ative sua conta — Agendix',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px">
        <h2 style="color:#5B3DF5;margin-bottom:8px">Bem-vindo ao Agendix! 🎉</h2>
        <p>Olá, <strong>${nome}</strong>.</p>
        <p>Sua conta foi criada com sucesso. Clique no botão abaixo para ativar e começar a usar o Agendix.</p>
        <p>Este link expira em <strong>24 horas</strong>.</p>
        <a href="${link}" style="display:inline-block;margin:24px 0;padding:12px 28px;background:#5B3DF5;color:#fff;border-radius:8px;text-decoration:none;font-weight:600">
          Ativar minha conta
        </a>
        <p style="color:#6b7280;font-size:13px">Se não foi você quem se cadastrou, ignore este email.</p>
        <p style="color:#9ca3af;font-size:12px">Link: <a href="${link}">${link}</a></p>
      </div>
    `,
  });
}

module.exports = { enviarEmailRedefinicao, enviarEmailAtivacao };
