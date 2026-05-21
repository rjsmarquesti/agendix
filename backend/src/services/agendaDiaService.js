const PDFDocument = require('pdfkit');
const https = require('https');
const http = require('http');
const prisma = require('../lib/prisma');
const { enviarEmailTenant } = require('../lib/mailer');
const { enviarMensagemWA } = require('./waWatchdogService');

function hoje() {
  return new Date().toISOString().split('T')[0];
}

function horaAtual() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

async function baixarImagem(url) {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, (res) => {
      if (res.statusCode !== 200) { res.resume(); return resolve(null); }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', () => resolve(null));
    }).on('error', () => resolve(null));
  });
}

async function gerarPdfAgenda(tenant, agendamentos, dataFormatada) {
  return new Promise(async (resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks = [];
    doc.on('data', c => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Logo
    if (tenant.logo) {
      const imgBuf = await baixarImagem(tenant.logo).catch(() => null);
      if (imgBuf) {
        try {
          doc.image(imgBuf, 40, 30, { height: 50, fit: [180, 50] });
        } catch (_) {}
      }
    }

    // Cabeçalho
    doc.fontSize(18).fillColor('#1e293b').text(tenant.nome, 230, 40, { align: 'right' });
    doc.fontSize(11).fillColor('#64748b').text(`Agenda do dia — ${dataFormatada}`, 230, 62, { align: 'right' });
    doc.moveDown(3);

    // Linha separadora
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#e2e8f0').stroke();
    doc.moveDown(0.5);

    if (agendamentos.length === 0) {
      doc.fontSize(13).fillColor('#64748b').text('Nenhum atendimento agendado para hoje.', { align: 'center' });
    } else {
      // Cabeçalho da tabela
      const cols = { hora: 40, cliente: 110, servico: 320 };
      doc.fontSize(10).fillColor('#475569').font('Helvetica-Bold');
      doc.text('Horário', cols.hora, doc.y, { width: 60 });
      doc.text('Cliente', cols.cliente, doc.y - doc.currentLineHeight(), { width: 200 });
      doc.text('Serviço / Tipo', cols.servico, doc.y - doc.currentLineHeight(), { width: 200 });
      doc.moveDown(0.3);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#cbd5e1').stroke();
      doc.moveDown(0.3);

      doc.font('Helvetica').fillColor('#1e293b');
      for (const ag of agendamentos) {
        const y = doc.y;
        const nome = ag.clienteNome || ag.lead?.nome || '—';
        const servico = ag.servico?.nome || ag.tipo || '—';
        doc.fontSize(10).text(ag.hora || '—', cols.hora, y, { width: 60 });
        doc.text(nome, cols.cliente, y, { width: 200 });
        doc.text(servico, cols.servico, y, { width: 200 });
        doc.moveDown(0.2);
        doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#f1f5f9').stroke();
        doc.moveDown(0.2);
      }
    }

    // Rodapé
    doc.fontSize(9).fillColor('#94a3b8').text('Gerado por Agendix — agendix.divulgabr.com.br', 40, 780, { align: 'center', width: 515 });
    doc.end();
  });
}

function gerarHtmlAgenda(tenant, agendamentos, dataFormatada) {
  const linhas = agendamentos.map(ag => {
    const nome = ag.clienteNome || ag.lead?.nome || '—';
    const servico = ag.servico?.nome || ag.tipo || '—';
    return `<tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${ag.hora}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${nome}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9">${servico}</td></tr>`;
  }).join('');

  return `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1e293b">
    ${tenant.logo ? `<img src="${tenant.logo}" height="50" style="margin-bottom:16px"/>` : ''}
    <h2 style="color:#1e293b">Agenda do dia — ${dataFormatada}</h2>
    <p style="color:#64748b">${tenant.nome}</p>
    <table style="width:100%;border-collapse:collapse;margin-top:16px">
      <thead><tr style="background:#f8fafc">
        <th style="padding:8px 12px;text-align:left;color:#475569;font-size:13px">Horário</th>
        <th style="padding:8px 12px;text-align:left;color:#475569;font-size:13px">Cliente</th>
        <th style="padding:8px 12px;text-align:left;color:#475569;font-size:13px">Serviço</th>
      </tr></thead>
      <tbody>${linhas}</tbody>
    </table>
    <p style="color:#94a3b8;font-size:12px;margin-top:24px">Gerado por Agendix</p>
  </div>`;
}

async function enviarPdfViaWhatsApp(tenant, telefone, pdfBuffer, dataFormatada) {
  const base = tenant.evolutionBaseUrl || 'https://api.divulgabr.com.br';
  const base64 = pdfBuffer.toString('base64');
  const res = await fetch(`${base}/message/sendMedia/${tenant.evolutionInstance}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: tenant.evolutionApiKey },
    body: JSON.stringify({
      number: telefone,
      mediatype: 'document',
      mimetype: 'application/pdf',
      caption: `📅 Agenda do dia — ${dataFormatada}`,
      media: base64,
      fileName: `agenda-${dataFormatada.replace(/\//g, '-')}.pdf`,
    }),
  });
  if (!res.ok) throw new Error(`Evolution ${res.status}`);
}

async function enviarTextoWA(tenant, telefone, mensagem) {
  await enviarMensagemWA(tenant, telefone, mensagem);
}

async function enviarAgendaDiaTenant(tenant, config) {
  const dataHoje = hoje();
  const dataFormatada = dataHoje.split('-').reverse().join('/');

  const agendamentos = await prisma.agendamento.findMany({
    where: { tenantId: tenant.id, data: dataHoje, status: { in: ['marcado', 'confirmado'] } },
    include: {
      lead:    { select: { nome: true } },
      servico: { select: { nome: true } },
    },
    orderBy: { hora: 'asc' },
  });

  const usuarios = await prisma.user.findMany({
    where: { tenantId: tenant.id, ativo: true },
    select: { email: true, whatsapp: true, nome: true },
  });

  const semAgendamentos = agendamentos.length === 0;
  const msgSemAgenda = `📅 *Agenda de ${dataFormatada}*\n\nNenhum atendimento agendado para hoje.`;

  const pdfBuffer = semAgendamentos ? null : await gerarPdfAgenda(tenant, agendamentos, dataFormatada).catch(() => null);

  for (const usuario of usuarios) {
    if (tenant.evolutionInstance && tenant.evolutionApiKey && usuario.whatsapp) {
      if (semAgendamentos) {
        await enviarTextoWA(tenant, usuario.whatsapp, msgSemAgenda).catch(() => {});
      } else if (pdfBuffer) {
        await enviarPdfViaWhatsApp(tenant, usuario.whatsapp, pdfBuffer, dataFormatada).catch(() => {});
      }
    }

    if (config.agendaDiaEmailAtivo && usuario.email) {
      const html = semAgendamentos
        ? `<p style="font-family:sans-serif">Sem atendimentos agendados para ${dataFormatada}.</p>`
        : gerarHtmlAgenda(tenant, agendamentos, dataFormatada);
      await enviarEmailTenant(tenant, {
        para: usuario.email,
        assunto: `📅 Agenda do dia — ${dataFormatada}`,
        html,
      }).catch(() => {});
    }
  }

  // Marcar como enviado hoje
  await prisma.configuracaoAgenda.update({
    where: { tenantId: tenant.id },
    data: { agendaDiaEnviadoEm: dataHoje },
  });
}

async function executarAgendaDia() {
  const hora = horaAtual();

  const configs = await prisma.configuracaoAgenda.findMany({
    where: { agendaDiaAtivo: true },
    include: { tenant: true },
  });

  const dataHoje = hoje();

  for (const config of configs) {
    try {
      if (config.agendaDiaEnviadoEm === dataHoje) continue;
      if (config.agendaDiaHorario !== hora) continue;

      await enviarAgendaDiaTenant(config.tenant, config);
    } catch (err) {
      console.error(`[agendaDia] Erro tenant ${config.tenant.slug}:`, err.message);
    }
  }
}

module.exports = { executarAgendaDia };
