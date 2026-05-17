const { validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { criar: criarAgendamento } = require('../services/agendamentoService');
const { notificarAgendamento } = require('../services/notificacaoService');

const incluirLead = {
  lead: { select: { nome: true, telefone: true, email: true } },
  servico: { select: { id: true, nome: true, duracaoMin: true } },
};

exports.listar = async (req, res, next) => {
  try {
    const where = { tenantId: req.user.tenantId };
    if (req.query.data)       where.data        = req.query.data;
    if (req.query.status)     where.status      = req.query.status;
    if (req.query.lead_id)    where.leadId      = Number(req.query.lead_id);
    if (req.query.canal)      where.canalOrigem = req.query.canal;
    // Filtro de intervalo de datas (para modo semana no calendário)
    if (req.query.dataInicio && req.query.dataFim) {
      where.data = { gte: req.query.dataInicio, lte: req.query.dataFim };
    }

    const agendamentos = await prisma.agendamento.findMany({
      where, orderBy: [{ data: 'asc' }, { hora: 'asc' }], include: incluirLead,
    });
    res.json({ agendamentos });
  } catch (err) { next(err); }
};

exports.buscarPorId = async (req, res, next) => {
  try {
    const agendamento = await prisma.agendamento.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId }, include: incluirLead,
    });
    if (!agendamento) return res.status(404).json({ error: 'Agendamento não encontrado' });
    res.json({ agendamento });
  } catch (err) { next(err); }
};

exports.criar = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { lead_id, nome, telefone, email, data, hora, tipo, status, observacoes } = req.body;
    const tenantId = req.user.tenantId;

    let leadId = lead_id ? Number(lead_id) : null;

    if (!leadId) {
      if (!nome || !telefone) {
        return res.status(400).json({ error: 'Informe lead_id ou nome + telefone.' });
      }
      const fone = telefone.replace(/\D/g, '');
      let lead = await prisma.lead.findFirst({ where: { tenantId, telefone: fone } });
      if (!lead) {
        lead = await prisma.lead.create({
          data: { tenantId, nome: nome.trim(), telefone: fone,
                  email: email?.trim() || null, status: 'agendado', fonte: 'manual', origem: 'CRM' },
        });
      }
      leadId = lead.id;
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

    const agendamento = await criarAgendamento(
      { tenantId, leadId, data, hora, tipo: tipo || 'reunião', status: status || 'marcado', observacoes },
      tenant.plano,
      { incluir: incluirLead }
    );
    notificarAgendamento(tenant, agendamento).catch(err => console.error('[notificar]', err.message));
    res.status(201).json({ agendamento });
  } catch (err) {
    if (err.status === 402) return res.status(402).json({ error: err.message + ' Faça upgrade.' });
    if (err.status === 409 || err.message === 'SLOT_OCUPADO') {
      return res.status(409).json({ error: 'Horário já reservado. Escolha outro.' });
    }
    next(err);
  }
};

exports.atualizar = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { lead_id, data, hora, tipo, status, observacoes } = req.body;
    const existe = await prisma.agendamento.findFirst({ where: { id: Number(req.params.id), tenantId: req.user.tenantId } });
    if (!existe) return res.status(404).json({ error: 'Agendamento não encontrado' });

    const agendamento = await prisma.agendamento.update({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId },
      data: { leadId: Number(lead_id), data, hora, tipo, status, observacoes },
      include: incluirLead,
    });
    if (status === 'confirmado' && existe.status !== 'confirmado') {
      const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenantId } });
      notificarAgendamento(tenant, agendamento).catch(err => console.error('[notificar]', err.message));
    }
    res.json({ agendamento });
  } catch (err) { next(err); }
};

exports.deletar = async (req, res, next) => {
  try {
    const existe = await prisma.agendamento.findFirst({ where: { id: Number(req.params.id), tenantId: req.user.tenantId } });
    if (!existe) return res.status(404).json({ error: 'Agendamento não encontrado' });

    await prisma.agendamento.delete({ where: { id: Number(req.params.id), tenantId: req.user.tenantId } });
    res.json({ message: 'Agendamento removido' });
  } catch (err) { next(err); }
};
