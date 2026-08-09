const prisma = require('../lib/prisma');
const { enviarEmailTenant } = require('../lib/mailer');
const { decrypt } = require('../lib/encrypt');
const { registrarEnvioDireto } = require('../services/waQueue');

// Cores do design system (igual ao mailer.js)
const C = {
  bg: '#09090C', surface: '#111118', g: '#00C97A',
  gDim: 'rgba(0,201,122,0.1)', gBorder: 'rgba(0,201,122,0.25)',
  tx: '#EEEEF5', txMd: '#B0B0C8', mt: '#7878A0', bd: 'rgba(255,255,255,0.08)',
};

function gerarNumero(id) {
  const ano = new Date().getFullYear();
  return `ORC-${ano}-${String(id).padStart(4, '0')}`;
}

function calcularTotal(itens) {
  if (!Array.isArray(itens)) return 0;
  return itens.reduce((acc, item) => {
    const qtd = Number(item.qtd) || 0;
    const val = Number(item.valorUnit) || 0;
    return acc + qtd * val;
  }, 0);
}

// GET /api/orcamentos?search=&status=&page=1
exports.listar = async (req, res, next) => {
  try {
    const { search, status, page = 1 } = req.query;
    const take = 20;
    const skip = (Number(page) - 1) * take;

    const where = { tenantId: req.user.tenantId };
    if (status) where.status = status;
    if (search) where.OR = [
      { clienteNome: { contains: search, mode: 'insensitive' } },
      { numero:      { contains: search, mode: 'insensitive' } },
    ];

    const [orcamentos, total] = await Promise.all([
      prisma.orcamento.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take,
        include: { lead: { select: { id: true, nome: true } } },
      }),
      prisma.orcamento.count({ where }),
    ]);

    res.json({ orcamentos, total, page: Number(page), pages: Math.ceil(total / take) });
  } catch (err) { next(err); }
};

// GET /api/orcamentos/:id
exports.buscar = async (req, res, next) => {
  try {
    const orc = await prisma.orcamento.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId },
      include: { lead: { select: { id: true, nome: true, telefone: true } } },
    });
    if (!orc) return res.status(404).json({ error: 'Orçamento não encontrado' });
    res.json({ orcamento: orc });
  } catch (err) { next(err); }
};

// POST /api/orcamentos
exports.criar = async (req, res, next) => {
  try {
    const { clienteNome, clienteTel, descricao, itens, validadeAte, observacoes, leadId } = req.body;
    if (!clienteNome?.trim()) return res.status(400).json({ error: 'Nome do cliente obrigatório' });

    const itensValidos = Array.isArray(itens) ? itens : [];
    const valorTotal   = calcularTotal(itensValidos);

    // Cria primeiro para obter o id e gerar número sequencial
    const orc = await prisma.orcamento.create({
      data: {
        tenantId:    req.user.tenantId,
        numero:      'ORC-TEMP',
        clienteNome: clienteNome.trim(),
        clienteTel:  clienteTel  || null,
        descricao:   descricao   || null,
        itens:       itensValidos,
        valorTotal,
        validadeAte: validadeAte || null,
        observacoes: observacoes || null,
        leadId:      leadId ? Number(leadId) : null,
      },
    });

    // Atualiza com número definitivo
    const atualizado = await prisma.orcamento.update({
      where: { id: orc.id },
      data:  { numero: gerarNumero(orc.id) },
    });

    res.status(201).json({ orcamento: atualizado });
  } catch (err) { next(err); }
};

// PUT /api/orcamentos/:id
exports.atualizar = async (req, res, next) => {
  try {
    const { clienteNome, clienteTel, descricao, itens, status, validadeAte, observacoes, leadId } = req.body;

    const existe = await prisma.orcamento.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId },
    });
    if (!existe) return res.status(404).json({ error: 'Orçamento não encontrado' });

    const itensValidos = itens !== undefined ? (Array.isArray(itens) ? itens : []) : existe.itens;
    const valorTotal   = calcularTotal(itensValidos);

    const orc = await prisma.orcamento.update({
      where: { id: Number(req.params.id) },
      data: {
        clienteNome: clienteNome?.trim()  || existe.clienteNome,
        clienteTel:  clienteTel  !== undefined ? (clienteTel  || null) : existe.clienteTel,
        descricao:   descricao   !== undefined ? (descricao   || null) : existe.descricao,
        itens:       itensValidos,
        valorTotal,
        status:      status      !== undefined ? status      : existe.status,
        validadeAte: validadeAte !== undefined ? (validadeAte || null) : existe.validadeAte,
        observacoes: observacoes !== undefined ? (observacoes || null) : existe.observacoes,
        leadId:      leadId      !== undefined ? (leadId ? Number(leadId) : null) : existe.leadId,
      },
    });
    res.json({ orcamento: orc });
  } catch (err) { next(err); }
};

// POST /api/orcamentos/:id/enviar-wa
exports.enviarPorWA = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const orc = await prisma.orcamento.findFirst({
      where: { id: Number(req.params.id), tenantId },
      include: { lead: { select: { nome: true, telefone: true } } },
    });
    if (!orc) return res.status(404).json({ error: 'Orçamento não encontrado' });

    const { telefone: telParam } = req.body;
    const tel = telParam || orc.clienteTel || orc.lead?.telefone;
    if (!tel) return res.status(400).json({ error: 'Nenhum telefone disponível para envio' });

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant?.evolutionInstance) return res.status(400).json({ error: 'WhatsApp não configurado neste tenant' });

    // Monta mensagem
    const moeda = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const itensTexto = Array.isArray(orc.itens) && orc.itens.length > 0
      ? orc.itens.map((it, i) => `${i + 1}. ${it.descricao} — ${it.qtd}x ${moeda(it.valorUnit)} = ${moeda((it.qtd || 1) * (it.valorUnit || 0))}`).join('\n')
      : '(sem itens)';

    const validade = orc.validadeAte
      ? `\n📅 Válido até: ${new Date(orc.validadeAte).toLocaleDateString('pt-BR')}`
      : '';

    const mensagem = [
      `Olá${orc.clienteNome ? ', ' + orc.clienteNome : ''}! 👋`,
      ``,
      `Segue o orçamento *${orc.numero}* de *${tenant.nome}*:`,
      ``,
      orc.descricao ? `📋 ${orc.descricao}\n` : '',
      `*Itens:*`,
      itensTexto,
      ``,
      `💰 *Total: ${moeda(orc.valorTotal)}*${validade}`,
      orc.observacoes ? `\n📝 ${orc.observacoes}` : '',
    ].filter(l => l !== null && l !== undefined).join('\n').trim();

    // Envio manual pelo operador — direto para feedback imediato, mas conta nos limites anti-ban
    const base   = tenant.evolutionBaseUrl || process.env.EVOLUTION_BASE_URL || 'https://api.divulgabr.com.br';
    const apikey = decrypt(tenant.evolutionApiKey) || process.env.EVOLUTION_GLOBAL_API_KEY;
    const telLimpo = tel.replace(/\D/g, '');

    if (!registrarEnvioDireto(tenant.evolutionInstance)) {
      return res.status(429).json({ error: 'Limite diário ou por hora de mensagens WhatsApp atingido.' });
    }

    const resp = await fetch(`${base}/message/sendText/${tenant.evolutionInstance}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey },
      body: JSON.stringify({ number: telLimpo, text: mensagem }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      return res.status(502).json({ error: `Erro Evolution API: ${err.slice(0, 200)}` });
    }

    // Atualiza status para "enviado" se ainda for rascunho
    if (orc.status === 'rascunho') {
      await prisma.orcamento.update({ where: { id: orc.id }, data: { status: 'enviado' } });
    }

    res.json({ ok: true, canal: 'whatsapp', status: 'enviado' });
  } catch (err) { next(err); }
};

// POST /api/orcamentos/:id/enviar-email
exports.enviarPorEmail = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const orc = await prisma.orcamento.findFirst({
      where: { id: Number(req.params.id), tenantId },
    });
    if (!orc) return res.status(404).json({ error: 'Orçamento não encontrado' });

    const { email: emailParam } = req.body;
    if (!emailParam?.includes('@')) return res.status(400).json({ error: 'E-mail inválido' });

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

    const moeda = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const itensRows = Array.isArray(orc.itens) && orc.itens.length > 0
      ? orc.itens.map(it => `
          <tr>
            <td style="padding:10px 12px;color:${C.tx};border-bottom:1px solid ${C.bd}">${it.descricao}</td>
            <td style="padding:10px 12px;color:${C.txMd};border-bottom:1px solid ${C.bd};text-align:center">${it.qtd}</td>
            <td style="padding:10px 12px;color:${C.txMd};border-bottom:1px solid ${C.bd};text-align:right">${moeda(it.valorUnit)}</td>
            <td style="padding:10px 12px;color:${C.tx};border-bottom:1px solid ${C.bd};text-align:right">${moeda((it.qtd || 1) * (it.valorUnit || 0))}</td>
          </tr>`).join('')
      : `<tr><td colspan="4" style="padding:12px;color:${C.mt};text-align:center">(sem itens)</td></tr>`;

    const validadeHtml = orc.validadeAte
      ? `<p style="color:${C.txMd};font-size:13px;margin:12px 0 0">📅 Válido até: <strong style="color:${C.tx}">${new Date(orc.validadeAte).toLocaleDateString('pt-BR')}</strong></p>`
      : '';
    const obsHtml = orc.observacoes
      ? `<div style="margin-top:20px;padding:14px;background:rgba(255,255,255,0.03);border:1px solid ${C.bd};border-radius:10px;color:${C.txMd};font-size:13px">📝 ${orc.observacoes}</div>`
      : '';

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:'Helvetica Neue',Arial,sans-serif;color:${C.tx}">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <div style="background:${C.surface};border:1px solid ${C.bd};border-radius:16px;padding:36px 32px">
      <h2 style="margin:0 0 4px;font-size:22px;color:${C.tx}">Orçamento ${orc.numero}</h2>
      <p style="margin:0 0 24px;font-size:14px;color:${C.txMd}">${tenant.nome}</p>
      ${orc.descricao ? `<p style="margin:0 0 20px;color:${C.txMd};font-size:14px">${orc.descricao}</p>` : ''}
      <table style="width:100%;border-collapse:collapse;font-size:14px;border:1px solid ${C.bd};border-radius:10px;overflow:hidden">
        <thead>
          <tr style="background:rgba(255,255,255,0.04)">
            <th style="padding:10px 12px;text-align:left;color:${C.mt};font-weight:600;font-size:12px;text-transform:uppercase">Descrição</th>
            <th style="padding:10px 12px;text-align:center;color:${C.mt};font-weight:600;font-size:12px;text-transform:uppercase">Qtd</th>
            <th style="padding:10px 12px;text-align:right;color:${C.mt};font-weight:600;font-size:12px;text-transform:uppercase">Unit.</th>
            <th style="padding:10px 12px;text-align:right;color:${C.mt};font-weight:600;font-size:12px;text-transform:uppercase">Total</th>
          </tr>
        </thead>
        <tbody>${itensRows}</tbody>
        <tfoot>
          <tr style="background:${C.gDim}">
            <td colspan="3" style="padding:12px;font-weight:700;color:${C.g};text-align:right">Total geral</td>
            <td style="padding:12px;font-weight:700;color:${C.g};text-align:right;font-size:16px">${moeda(orc.valorTotal)}</td>
          </tr>
        </tfoot>
      </table>
      ${validadeHtml}
      ${obsHtml}
      <p style="margin:28px 0 0;color:${C.mt};font-size:12px;text-align:center">
        Em caso de dúvidas, entre em contato com <strong style="color:${C.txMd}">${tenant.nome}</strong>.
      </p>
    </div>
    <div style="text-align:center;margin-top:20px;font-size:12px;color:${C.mt}">
      Enviado via <a href="https://agendix.divulgabr.com.br" style="color:${C.mt}">Agendix</a>
    </div>
  </div>
</body></html>`;

    const tenantComSmtp = {
      ...tenant,
      smtpPass: decrypt(tenant.smtpPass),
    };

    await enviarEmailTenant(tenantComSmtp, {
      para: emailParam,
      assunto: `Orçamento ${orc.numero} — ${tenant.nome}`,
      html,
    });

    // Atualiza status para "enviado" se ainda for rascunho
    if (orc.status === 'rascunho') {
      await prisma.orcamento.update({ where: { id: orc.id }, data: { status: 'enviado' } });
    }

    res.json({ ok: true, canal: 'email', status: 'enviado' });
  } catch (err) { next(err); }
};

// DELETE /api/orcamentos/:id
exports.deletar = async (req, res, next) => {
  try {
    const existe = await prisma.orcamento.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId },
    });
    if (!existe) return res.status(404).json({ error: 'Orçamento não encontrado' });
    await prisma.orcamento.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Orçamento removido' });
  } catch (err) { next(err); }
};
