const { validationResult } = require('express-validator');
const { randomUUID } = require('crypto');
const prisma = require('../lib/prisma');
const { criar: criarAgendamento } = require('../services/agendamentoService');
const { notificarAgendamento } = require('../services/notificacaoService');
const { enviarPushParaTenant } = require('../lib/pushService');

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

    // Recorrência
    const { recorrencia } = req.body; // { tipo: 'semanal'|'mensal', ocorrencias: 2..52 }
    if (recorrencia?.tipo && recorrencia?.ocorrencias > 1) {
      const tipo_r = recorrencia.tipo;
      const qtd    = Math.min(Math.max(parseInt(recorrencia.ocorrencias) || 2, 2), 52);
      const rid    = randomUUID(); // id de grupo

      const agendamentos = [];
      let dataAtual = data;

      for (let i = 0; i < qtd; i++) {
        try {
          const ag = await criarAgendamento(
            {
              tenantId, leadId, data: dataAtual, hora,
              tipo: tipo || 'reunião', status: status || 'marcado', observacoes,
              cancelToken: randomUUID(),
              recorrenciaId: rid,
              recorrenciaTipo: tipo_r,
            },
            tenant.plano,
            { incluir: incluirLead }
          );
          agendamentos.push(ag);
        } catch (err) {
          if (err.status === 409) { /* slot ocupado nessa data — pula */ }
          else throw err;
        }
        // Avança data
        const d = new Date(dataAtual + 'T12:00:00');
        if (tipo_r === 'semanal') d.setDate(d.getDate() + 7);
        else d.setMonth(d.getMonth() + 1);
        dataAtual = d.toISOString().split('T')[0];
      }

      if (agendamentos[0]) {
        notificarAgendamento(tenant, agendamentos[0]).catch(() => {});
      }
      return res.status(201).json({ agendamentos, recorrenciaId: rid, criados: agendamentos.length });
    }

    // Agendamento simples (sem recorrência)
    const agendamento = await criarAgendamento(
      { tenantId, leadId, data, hora, tipo: tipo || 'reunião', status: status || 'marcado', observacoes, cancelToken: randomUUID() },
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

    // Re-valida double-booking se data ou hora mudaram
    const novaData = data || existe.data;
    const novaHora = hora || existe.hora;
    if ((data && data !== existe.data) || (hora && hora !== existe.hora)) {
      const conflito = await prisma.agendamento.findFirst({
        where: {
          tenantId: req.user.tenantId,
          data: novaData,
          hora: novaHora,
          status: { in: ['marcado', 'confirmado'] },
          id: { not: existe.id },
        },
      });
      if (conflito) return res.status(409).json({ error: 'Horário já reservado. Escolha outro.' });
    }

    const agendamento = await prisma.agendamento.update({
      where: { id: existe.id, tenantId: req.user.tenantId },
      data: { leadId: Number(lead_id), data: novaData, hora: novaHora, tipo, status, observacoes },
      include: incluirLead,
    });
    if (status === 'confirmado' && existe.status !== 'confirmado') {
      const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenantId } });
      notificarAgendamento(tenant, agendamento).catch(err => console.error('[notificar]', err.message));
    }
    if (status === 'cancelado' && existe.status !== 'cancelado') {
      const nomeCliente = agendamento.lead?.nome || agendamento.clienteNome || 'Cliente';
      enviarPushParaTenant(req.user.tenantId, {
        title: 'Agendamento cancelado',
        body:  `${nomeCliente} • ${agendamento.data} às ${agendamento.hora}`,
        url:   '/agendamentos',
        icon:  '/logo.png',
      }).catch(err => console.error('[push/cancelado]', err.message));
    }
    res.json({ agendamento });
  } catch (err) { next(err); }
};

exports.deletar = async (req, res, next) => {
  try {
    const existe = await prisma.agendamento.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId },
      include: { lead: { select: { nome: true } } },
    });
    if (!existe) return res.status(404).json({ error: 'Agendamento não encontrado' });

    await prisma.agendamento.delete({ where: { id: Number(req.params.id), tenantId: req.user.tenantId } });

    const nomeCliente = existe.lead?.nome || existe.clienteNome || 'Cliente';
    enviarPushParaTenant(req.user.tenantId, {
      title: 'Agendamento removido',
      body:  `${nomeCliente} • ${existe.data} às ${existe.hora}`,
      url:   '/agendamentos',
      icon:  '/logo.png',
    }).catch(err => console.error('[push/deletar]', err.message));

    res.json({ message: 'Agendamento removido' });
  } catch (err) { next(err); }
};

// DELETE /agendamentos/:id/serie — cancela este e todos os seguintes da mesma série
exports.deletarSerie = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const id = Number(req.params.id);

    const origem = await prisma.agendamento.findFirst({
      where: { id, tenantId },
    });
    if (!origem) return res.status(404).json({ error: 'Agendamento não encontrado' });
    if (!origem.recorrenciaId) return res.status(400).json({ error: 'Este agendamento não faz parte de uma série.' });

    // Cancela este e todos os da série com data >= este
    const result = await prisma.agendamento.updateMany({
      where: {
        tenantId,
        recorrenciaId: origem.recorrenciaId,
        data: { gte: origem.data },
        status: { notIn: ['cancelado', 'realizado'] },
      },
      data: { status: 'cancelado' },
    });

    res.json({ message: `${result.count} agendamento(s) da série cancelado(s).`, count: result.count });
  } catch (err) { next(err); }
};
