const { validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { dispararWebhookAgendamento } = require('../services/webhook');
const { criar: criarAgendamento } = require('../services/agendamentoService');

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

    const { lead_id, data, hora, tipo, status, observacoes } = req.body;

    const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenantId }, select: { plano: true } });

    const agendamento = await criarAgendamento(
      { tenantId: req.user.tenantId, leadId: Number(lead_id), data, hora, tipo: tipo || 'reunião', status: status || 'marcado', observacoes },
      tenant.plano,
      { incluir: incluirLead }
    );
    dispararWebhookAgendamento(req.user.tenantId, agendamento).catch(err => console.error('[webhook]', err.message));
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
