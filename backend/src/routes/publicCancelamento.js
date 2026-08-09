/**
 * Rota pública de cancelamento de agendamento pelo cliente.
 * Identificada por token único (UUID), sem slug nem autenticação.
 *
 * GET  /api/public/cancelar/:token  — consulta dados do agendamento
 * POST /api/public/cancelar/:token  — efetua o cancelamento
 */
const router = require('express').Router();
const prisma = require('../lib/prisma');

// GET /api/public/cancelar/:token
router.get('/:token', async (req, res, next) => {
  try {
    const ag = await prisma.agendamento.findUnique({
      where: { cancelToken: req.params.token },
      include: {
        tenant: { select: { nome: true, logo: true, corPrimaria: true, slug: true } },
        servico: { select: { nome: true } },
      },
    });

    if (!ag) return res.status(404).json({ error: 'Link inválido ou expirado.' });

    res.json({
      agendamento: {
        id:          ag.id,
        data:        ag.data,
        hora:        ag.hora,
        tipo:        ag.tipo,
        status:      ag.status,
        clienteNome: ag.clienteNome,
        servico:     ag.servico?.nome || ag.tipo,
        tenant:      ag.tenant,
      },
      jaCancelado: ag.status === 'cancelado',
      podeCancel:  !['cancelado', 'realizado', 'nao_compareceu'].includes(ag.status),
    });
  } catch (err) { next(err); }
});

// POST /api/public/cancelar/:token
router.post('/:token', async (req, res, next) => {
  try {
    const ag = await prisma.agendamento.findUnique({
      where: { cancelToken: req.params.token },
      include: { lead: { select: { nome: true } } },
    });

    if (!ag) return res.status(404).json({ error: 'Link inválido ou expirado.' });
    if (ag.status === 'cancelado') {
      return res.status(409).json({ error: 'Este agendamento já foi cancelado.' });
    }
    if (['realizado', 'nao_compareceu'].includes(ag.status)) {
      return res.status(409).json({ error: 'Não é possível cancelar um agendamento já realizado.' });
    }

    await prisma.agendamento.update({
      where: { id: ag.id },
      data: { status: 'cancelado' },
    });

    // Push notification para o tenant (fire-and-forget)
    try {
      const { enviarPushParaTenant } = require('../services/pushService');
      const nomeCliente = ag.clienteNome || ag.lead?.nome || 'Cliente';
      enviarPushParaTenant(ag.tenantId, {
        title: '❌ Agendamento cancelado pelo cliente',
        body:  `${nomeCliente} • ${ag.data} às ${ag.hora}`,
        url:   '/agendamentos',
        icon:  '/logo.png',
      }).catch(() => {});
    } catch {}

    res.json({ ok: true, mensagem: 'Agendamento cancelado com sucesso.' });
  } catch (err) { next(err); }
});

module.exports = router;
