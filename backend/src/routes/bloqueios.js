const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const auth = require('../middlewares/auth');
const { requireRole } = require('../middlewares/auth');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// GET /api/bloqueios?mes=YYYY-MM — listar bloqueios (mês atual se omitido)
router.get('/', auth, async (req, res, next) => {
  try {
    const { mes } = req.query;
    const tenantId = req.user.tenantId;
    let where = { tenantId };

    if (mes && /^\d{4}-\d{2}$/.test(mes)) {
      where.data = { startsWith: mes };
    }

    const bloqueios = await prisma.bloqueioHorario.findMany({
      where,
      orderBy: { data: 'asc' },
    });
    res.json({ bloqueios });
  } catch (err) { next(err); }
});

// POST /api/bloqueios — criar bloqueio
router.post('/',
  auth, requireRole('admin', 'super_admin'),
  [
    body('data').matches(/^\d{4}-\d{2}-\d{2}$/).withMessage('Data inválida (use YYYY-MM-DD)'),
    body('horaInicio').optional({ nullable: true }).matches(/^\d{2}:\d{2}$/).withMessage('Hora inválida'),
    body('horaFim').optional({ nullable: true }).matches(/^\d{2}:\d{2}$/).withMessage('Hora inválida'),
    body('motivo').optional().isLength({ max: 200 }),
  ],
  validate,
  async (req, res, next) => {
    try {
      const { data, horaInicio, horaFim, motivo } = req.body;

      // Valida que horaFim > horaInicio se ambos informados
      if (horaInicio && horaFim) {
        const ini = horaInicio.replace(':', '');
        const fim = horaFim.replace(':', '');
        if (fim <= ini) return res.status(400).json({ error: 'Hora fim deve ser após hora início.' });
      }

      // Se informou apenas um dos horários, rejeita
      if ((horaInicio && !horaFim) || (!horaInicio && horaFim)) {
        return res.status(400).json({ error: 'Informe hora início e fim juntos, ou nenhum (bloqueio de dia inteiro).' });
      }

      const bloqueio = await prisma.bloqueioHorario.create({
        data: {
          tenantId: req.user.tenantId,
          data,
          horaInicio: horaInicio || null,
          horaFim: horaFim || null,
          motivo: motivo || null,
        },
      });
      res.status(201).json({ bloqueio });
    } catch (err) { next(err); }
  }
);

// DELETE /api/bloqueios/:id — remover bloqueio
router.delete('/:id',
  auth, requireRole('admin', 'super_admin'),
  async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const existing = await prisma.bloqueioHorario.findFirst({ where: { id, tenantId: req.user.tenantId } });
      if (!existing) return res.status(404).json({ error: 'Bloqueio não encontrado.' });

      await prisma.bloqueioHorario.delete({ where: { id } });
      res.json({ message: 'Bloqueio removido.' });
    } catch (err) { next(err); }
  }
);

module.exports = router;
