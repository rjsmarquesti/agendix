const prisma = require('../lib/prisma');
const { enviarEmailTenant } = require('../lib/mailer');
const { decrypt } = require('../lib/encrypt');
const { registrarEnvioDireto } = require('../services/waQueue');

const C = {
  bg: '#09090C', surface: '#111118', g: '#00C97A',
  gDim: 'rgba(0,201,122,0.1)', gBorder: 'rgba(0,201,122,0.25)',
  tx: '#EEEEF5', txMd: '#B0B0C8', mt: '#7878A0', bd: 'rgba(255,255,255,0.08)',
};

function gerarNumero(id) {
  const ano = new Date().getFullYear();
  return `OS-${ano}-${String(id).padStart(4, '0')}`;
}

function calcularTotal(itens) {
  if (!Array.isArray(itens)) return 0;
  return itens.reduce((acc, item) => {
    return acc + (Number(item.qtd) || 0) * (Number(item.valorUnit) || 0);
  }, 0);
}

const STATUS_LABEL = {
  aberta: 'Aberta', em_andamento: 'Em andamento',
  aguardando_peca: 'Aguardando peça', concluida: 'Concluída', cancelada: 'Cancelada',
};

// GET /api/ordem-servico?search=&status=&page=1
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

    const [ordens, total] = await Promise.all([
      prisma.ordemServico.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take,
        include: { lead: { select: { id: true, nome: true } } },
      }),
      prisma.ordemServico.count({ where }),
    ]);

    res.json({ ordens, total, page: Number(page), pages: Math.ceil(total / take) });
  } catch (err) { next(err); }
};

// GET /api/ordem-servico/:id
exports.buscar = async (req, res, next) => {
  try {
    const os = await prisma.ordemServico.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId },
      include: { lead: { select: { id: true, nome: true, telefone: true } } },
    });
    if (!os) return res.status(404).json({ error: 'Ordem de serviço não encontrada' });
    res.json({ ordem: os });
  } catch (err) { next(err); }
};

// POST /api/ordem-servico
exports.criar = async (req, res, next) => {
  try {
    const { clienteNome, clienteTel, clienteEndereco, descricaoServico, itens,
            dataAbertura, dataPrevista, tecnicoNome, garantiaDias, observacoes, leadId } = req.body;
    if (!clienteNome?.trim()) return res.status(400).json({ error: 'Nome do cliente obrigatório' });

    const itensValidos = Array.isArray(itens) ? itens : [];
    const valorTotal   = calcularTotal(itensValidos);

    const os = await prisma.ordemServico.create({
      data: {
        tenantId:        req.user.tenantId,
        numero:          'OS-TEMP',
        clienteNome:     clienteNome.trim(),
        clienteTel:      clienteTel       || null,
        clienteEndereco: clienteEndereco  || null,
        descricaoServico: descricaoServico || null,
        itens:           itensValidos,
        valorTotal,
        dataAbertura:    dataAbertura     || null,
        dataPrevista:    dataPrevista     || null,
        tecnicoNome:     tecnicoNome      || null,
        garantiaDias:    garantiaDias     ? Number(garantiaDias) : null,
        observacoes:     observacoes      || null,
        leadId:          leadId           ? Number(leadId) : null,
      },
    });

    const atualizado = await prisma.ordemServico.update({
      where: { id: os.id },
      data:  { numero: gerarNumero(os.id) },
    });

    res.status(201).json({ ordem: atualizado });
  } catch (err) { next(err); }
};

// PUT /api/ordem-servico/:id
exports.atualizar = async (req, res, next) => {
  try {
    const { clienteNome, clienteTel, clienteEndereco, descricaoServico, itens, status,
            dataAbertura, dataPrevista, dataConclusao, tecnicoNome, garantiaDias, observacoes, leadId } = req.body;

    const existe = await prisma.ordemServico.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId },
    });
    if (!existe) return res.status(404).json({ error: 'Ordem de serviço não encontrada' });

    const itensValidos = itens !== undefined ? (Array.isArray(itens) ? itens : []) : existe.itens;
    const valorTotal   = calcularTotal(itensValidos);

    const os = await prisma.ordemServico.update({
      where: { id: Number(req.params.id) },
      data: {
        clienteNome:      clienteNome?.trim()         || existe.clienteNome,
        clienteTel:       clienteTel       !== undefined ? (clienteTel       || null) : existe.clienteTel,
        clienteEndereco:  clienteEndereco  !== undefined ? (clienteEndereco  || null) : existe.clienteEndereco,
        descricaoServico: descricaoServico !== undefined ? (descricaoServico || null) : existe.descricaoServico,
        itens:            itensValidos,
        valorTotal,
        status:           status           !== undefined ? status            : existe.status,
        dataAbertura:     dataAbertura     !== undefined ? (dataAbertura     || null) : existe.dataAbertura,
        dataPrevista:     dataPrevista     !== undefined ? (dataPrevista     || null) : existe.dataPrevista,
        dataConclusao:    dataConclusao    !== undefined ? (dataConclusao    || null) : existe.dataConclusao,
        tecnicoNome:      tecnicoNome      !== undefined ? (tecnicoNome      || null) : existe.tecnicoNome,
        garantiaDias:     garantiaDias     !== undefined ? (garantiaDias ? Number(garantiaDias) : null) : existe.garantiaDias,
        observacoes:      observacoes      !== undefined ? (observacoes      || null) : existe.observacoes,
        leadId:           leadId           !== undefined ? (leadId ? Number(leadId) : null) : existe.leadId,
      },
    });
    res.json({ ordem: os });
  } catch (err) { next(err); }
};

// POST /api/ordem-servico/:id/enviar-wa
exports.enviarPorWA = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const os = await prisma.ordemServico.findFirst({
      where: { id: Number(req.params.id), tenantId },
      include: { lead: { select: { nome: true, telefone: true } } },
    });
    if (!os) return res.status(404).json({ error: 'Ordem de serviço não encontrada' });

    const tel = req.body.telefone || os.clienteTel || os.lead?.telefone;
    if (!tel) return res.status(400).json({ error: 'Nenhum telefone disponível' });

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant?.evolutionInstance) return res.status(400).json({ error: 'WhatsApp não configurado' });

    const moeda = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    const itensTexto = Array.isArray(os.itens) && os.itens.length > 0
      ? os.itens.map((it, i) => `${i + 1}. ${it.descricao} — ${it.qtd}x ${moeda(it.valorUnit)} = ${moeda((it.qtd || 1) * (it.valorUnit || 0))}`).join('\n')
      : '(sem itens)';

    const mensagem = [
      `Olá${os.clienteNome ? ', ' + os.clienteNome : ''}! 👋`,
      ``,
      `Segue a Ordem de Serviço *${os.numero}* de *${tenant.nome}*:`,
      ``,
      os.descricaoServico ? `🔧 ${os.descricaoServico}\n` : '',
      `*Itens:*`,
      itensTexto,
      ``,
      `💰 *Total: ${moeda(os.valorTotal)}*`,
      os.dataPrevista ? `📅 Previsão de conclusão: ${os.dataPrevista}` : '',
      os.garantiaDias ? `🛡️ Garantia: ${os.garantiaDias} dias` : '',
      os.observacoes  ? `\n📝 ${os.observacoes}` : '',
    ].filter(Boolean).join('\n').trim();

    const base   = tenant.evolutionBaseUrl || process.env.EVOLUTION_BASE_URL || 'https://api.divulgabr.com.br';
    const apikey = decrypt(tenant.evolutionApiKey) || process.env.EVOLUTION_GLOBAL_API_KEY;
    const telLimpo = tel.replace(/\D/g, '');

    // Envio manual pelo operador — direto para feedback imediato, mas conta nos limites anti-ban
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

    if (os.status === 'aberta') {
      await prisma.ordemServico.update({ where: { id: os.id }, data: { status: 'em_andamento' } });
    }

    res.json({ ok: true, canal: 'whatsapp' });
  } catch (err) { next(err); }
};

// POST /api/ordem-servico/:id/enviar-email
exports.enviarPorEmail = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const os = await prisma.ordemServico.findFirst({
      where: { id: Number(req.params.id), tenantId },
    });
    if (!os) return res.status(404).json({ error: 'Ordem de serviço não encontrada' });

    const { email: emailParam } = req.body;
    if (!emailParam?.includes('@')) return res.status(400).json({ error: 'E-mail inválido' });

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const moeda = v => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    const itensRows = Array.isArray(os.itens) && os.itens.length > 0
      ? os.itens.map(it => `
          <tr>
            <td style="padding:10px 12px;color:${C.tx};border-bottom:1px solid ${C.bd}">${it.descricao}</td>
            <td style="padding:10px 12px;color:${C.txMd};border-bottom:1px solid ${C.bd};text-align:center">${it.qtd}</td>
            <td style="padding:10px 12px;color:${C.txMd};border-bottom:1px solid ${C.bd};text-align:right">${moeda(it.valorUnit)}</td>
            <td style="padding:10px 12px;color:${C.tx};border-bottom:1px solid ${C.bd};text-align:right">${moeda((it.qtd || 1) * (it.valorUnit || 0))}</td>
          </tr>`).join('')
      : `<tr><td colspan="4" style="padding:12px;color:${C.mt};text-align:center">(sem itens)</td></tr>`;

    const html = `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:${C.bg};font-family:'Helvetica Neue',Arial,sans-serif;color:${C.tx}">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px">
    <div style="background:${C.surface};border:1px solid ${C.bd};border-radius:16px;padding:36px 32px">
      <h2 style="margin:0 0 4px;font-size:22px;color:${C.tx}">Ordem de Serviço ${os.numero}</h2>
      <p style="margin:0 0 24px;font-size:14px;color:${C.txMd}">${tenant.nome}</p>
      ${os.descricaoServico ? `<p style="margin:0 0 20px;color:${C.txMd};font-size:14px">🔧 ${os.descricaoServico}</p>` : ''}
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
            <td style="padding:12px;font-weight:700;color:${C.g};text-align:right;font-size:16px">${moeda(os.valorTotal)}</td>
          </tr>
        </tfoot>
      </table>
      ${os.dataPrevista ? `<p style="color:${C.txMd};font-size:13px;margin:12px 0 0">📅 Previsão: <strong style="color:${C.tx}">${os.dataPrevista}</strong></p>` : ''}
      ${os.garantiaDias ? `<p style="color:${C.txMd};font-size:13px;margin:8px 0 0">🛡️ Garantia: <strong style="color:${C.tx}">${os.garantiaDias} dias</strong></p>` : ''}
      ${os.observacoes  ? `<div style="margin-top:20px;padding:14px;background:rgba(255,255,255,0.03);border:1px solid ${C.bd};border-radius:10px;color:${C.txMd};font-size:13px">📝 ${os.observacoes}</div>` : ''}
      <p style="margin:28px 0 0;color:${C.mt};font-size:12px;text-align:center">
        Em caso de dúvidas, entre em contato com <strong style="color:${C.txMd}">${tenant.nome}</strong>.
      </p>
    </div>
    <div style="text-align:center;margin-top:20px;font-size:12px;color:${C.mt}">
      Enviado via <a href="https://agendix.divulgabr.com.br" style="color:${C.mt}">Agendix</a>
    </div>
  </div>
</body></html>`;

    const tenantComSmtp = { ...tenant, smtpPass: decrypt(tenant.smtpPass) };
    await enviarEmailTenant(tenantComSmtp, {
      para: emailParam,
      assunto: `OS ${os.numero} — ${tenant.nome}`,
      html,
    });

    if (os.status === 'aberta') {
      await prisma.ordemServico.update({ where: { id: os.id }, data: { status: 'em_andamento' } });
    }

    res.json({ ok: true, canal: 'email' });
  } catch (err) { next(err); }
};

// DELETE /api/ordem-servico/:id
exports.deletar = async (req, res, next) => {
  try {
    const existe = await prisma.ordemServico.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId },
    });
    if (!existe) return res.status(404).json({ error: 'Ordem de serviço não encontrada' });
    await prisma.ordemServico.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Ordem de serviço removida' });
  } catch (err) { next(err); }
};
