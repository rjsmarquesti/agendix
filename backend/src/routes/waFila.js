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

// GET /api/wa-fila/fila-detalhada — lista as mensagens pendentes individualmente
// (endpoint separado de /stats: evita custo de cálculo de ETA em toda chamada
// de polling de 30s do painel já existente, e isola qualquer bug daqui do que
// já está em produção)
router.get('/fila-detalhada', ...protect, (req, res) => {
  try {
    const { listarFilaDetalhada } = require('../services/waQueue');
    const instance = req.tenant.evolutionInstance;
    if (!instance) return res.json({ configurado: false, itens: [] });
    res.json({ configurado: true, instance, itens: listarFilaDetalhada(instance) });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// POST /api/wa-fila/disparar-agora/:id — admin força envio imediato de 1 mensagem
// da fila, ignorando janela horária, rate limit, circuit breaker, reputação e
// dedup — escape hatch administrativo (decisão consciente, ver AP-027/AP-028).
router.post('/disparar-agora/:id', ...protect, auth.requireRole('admin', 'super_admin'), async (req, res) => {
  try {
    const { forcarDisparoImediato } = require('../services/waQueue');
    const instance = req.tenant.evolutionInstance;
    if (!instance) return res.status(400).json({ error: 'Instância WA não configurada' });

    const itemId = Number(req.params.id);
    if (!Number.isInteger(itemId)) return res.status(400).json({ error: 'id inválido' });

    const resultado = await forcarDisparoImediato(instance, itemId);
    if (!resultado.ok && (resultado.motivo === 'item_nao_encontrado' || resultado.motivo === 'fila_nao_encontrada')) {
      return res.status(404).json({ error: 'Mensagem não encontrada na fila (já enviada, expirada ou de outra instância)' });
    }
    res.json(resultado);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
