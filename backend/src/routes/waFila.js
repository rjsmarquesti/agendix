const router  = require('express').Router();
const auth    = require('../middlewares/auth');
const tenant  = require('../middlewares/tenant');

const protect = [tenant, auth];

// GET /api/wa-fila/stats — stats da fila + reputação da própria instância do tenant
router.get('/stats', ...protect, (req, res) => {
  try {
    const { statsInstanciaCompleto } = require('../services/waQueue');
    const { statsInstanciaWatchdog } = require('../services/waWatchdogService');
    const rep                        = require('../services/waReputacao');

    const instance = req.tenant.evolutionInstance;
    if (!instance) return res.json({ configurado: false });

    const threshold  = Number(req.query.threshold || 70);
    const fila       = statsInstanciaCompleto(instance, threshold);
    const watchdog   = statsInstanciaWatchdog(instance);
    const numeros    = rep.listarInstancia(instance, threshold);
    const bloqueados = numeros.filter(n => n.bloqueado);

    res.json({
      configurado: true,
      instance,
      fila:        fila || { pendentes: 0, sentThisHour: 0, sentToday: 0, limiteHora: 30, limiteDia: 200, processing: false, dentroJanela: false },
      circuitBreaker: watchdog,
      numeros,
      bloqueados,
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// DELETE /api/wa-fila/numeros/:telefone — admin do tenant desbloqueia número
router.delete('/numeros/:telefone', ...protect, auth.requireRole('admin', 'super_admin'), (req, res) => {
  try {
    const rep      = require('../services/waReputacao');
    const instance = req.tenant.evolutionInstance;
    if (!instance) return res.status(400).json({ error: 'Instância WA não configurada' });
    const desbloqueou = rep.resetNumero(instance, req.params.telefone);
    res.json({ ok: true, desbloqueou });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
