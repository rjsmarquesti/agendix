/**
 * Score de reputação por número de destinatário — escopado por instância Evolution.
 *
 * Chave interna: `${instance}:${telefone_normalizado}`
 * Isso garante que erros de uma instância não bloqueiem o número em outras instâncias.
 *
 * Score 0–100:
 *   100 = sem falhas históricas
 *   decai 10 pts por falha total acumulada (piso 0)
 *   recupera 5 pts por envio bem-sucedido (teto 100)
 */

const BOUNCE_THRESHOLD = 3;                    // falhas consecutivas → bloquear
const COOLDOWN_MS      = 24 * 60 * 60 * 1000; // 24h de cooldown por número

// Map<`${instance}:${telefone_normalizado}`, ReputacaoEntry>
const reputacao = new Map();

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizar(tel) {
  return String(tel).replace(/\D/g, '');
}

function makeKey(instance, tel) {
  return `${instance}:${normalizar(tel)}`;
}

function getEntry(instance, tel) {
  const k = makeKey(instance, tel);
  if (!reputacao.has(k)) {
    reputacao.set(k, { consecutivas: 0, total: 0, successTotal: 0, bloqueadoAte: null });
  }
  return reputacao.get(k);
}

// ── API pública ───────────────────────────────────────────────────────────────

function estaBloqueado(instance, tel) {
  const e = getEntry(instance, tel);
  if (!e.bloqueadoAte) return false;
  if (Date.now() < e.bloqueadoAte) return true;
  e.bloqueadoAte = null;
  e.consecutivas = 0;
  console.log(`[waReputacao] ${instance}:${normalizar(tel)} desbloqueado após cooldown`);
  return false;
}

function registrarFalha(instance, tel) {
  const e = getEntry(instance, tel);
  e.consecutivas++;
  e.total++;

  if (e.consecutivas >= BOUNCE_THRESHOLD && !e.bloqueadoAte) {
    e.bloqueadoAte = Date.now() + COOLDOWN_MS;
    const liberaEm = new Date(e.bloqueadoAte).toLocaleString('pt-BR');
    console.warn(
      `[waReputacao] ${instance}:${normalizar(tel)} bloqueado por ${BOUNCE_THRESHOLD} falhas ` +
      `consecutivas. Libera em ${liberaEm}`
    );
    return true;
  }
  return false;
}

function registrarSucesso(instance, tel) {
  const e = getEntry(instance, tel);
  e.consecutivas  = 0;
  e.successTotal  = (e.successTotal || 0) + 1;
  e.total = Math.max(0, e.total - 0.5);
}

function score(instance, tel) {
  const e = getEntry(instance, tel);
  return Math.max(0, Math.round(100 - Math.min(e.total, 10) * 10));
}

/** Desbloqueia manualmente um número numa instância específica. */
function resetNumero(instance, tel) {
  const k = makeKey(instance, tel);
  if (reputacao.has(k)) {
    const e = reputacao.get(k);
    e.bloqueadoAte = null;
    e.consecutivas = 0;
    console.log(`[waReputacao] ${k} desbloqueado manualmente`);
    return true;
  }
  return false;
}

/** Retorna stats completas de um número em uma instância. */
function statsNumero(instance, tel) {
  const e = getEntry(instance, tel);
  return {
    instance,
    telefone:      normalizar(tel),
    consecutivas:  e.consecutivas,
    totalFalhas:   Math.round(e.total),
    totalSucessos: e.successTotal || 0,
    score:         score(instance, tel),
    bloqueadoAte:  e.bloqueadoAte ? new Date(e.bloqueadoAte).toISOString() : null,
    bloqueado:     estaBloqueado(instance, tel),
  };
}

/** Lista todos os números de uma instância com score abaixo do threshold. */
function listarInstancia(instance, threshold = 70) {
  const resultado = [];
  for (const [key] of reputacao) {
    if (!key.startsWith(instance + ':')) continue;
    const tel = key.slice(instance.length + 1);
    const s   = score(instance, tel);
    if (s < threshold) resultado.push(statsNumero(instance, tel));
  }
  return resultado.sort((a, b) => a.score - b.score);
}

/** Lista números com score baixo em TODAS as instâncias (visão super_admin). */
function numerosComBaixoScore(threshold = 70) {
  const resultado = [];
  for (const [key] of reputacao) {
    const colonIdx = key.indexOf(':');
    const instance = key.slice(0, colonIdx);
    const tel      = key.slice(colonIdx + 1);
    const s        = score(instance, tel);
    if (s < threshold) resultado.push(statsNumero(instance, tel));
  }
  return resultado.sort((a, b) => a.score - b.score);
}

/** Retorna contagem resumida por instância para o painel admin. */
function resumoPorInstancia() {
  const porInstancia = {};
  for (const [key, entry] of reputacao) {
    const colonIdx = key.indexOf(':');
    const instance = key.slice(0, colonIdx);
    const tel      = key.slice(colonIdx + 1);
    if (!porInstancia[instance]) {
      porInstancia[instance] = { instance, total: 0, bloqueados: 0, baixoScore: 0 };
    }
    const stats = porInstancia[instance];
    stats.total++;
    if (entry.bloqueadoAte && Date.now() < entry.bloqueadoAte) stats.bloqueados++;
    if (score(instance, tel) < 70) stats.baixoScore++;
  }
  return Object.values(porInstancia);
}

module.exports = {
  estaBloqueado,
  registrarFalha,
  registrarSucesso,
  score,
  resetNumero,
  statsNumero,
  listarInstancia,
  numerosComBaixoScore,
  resumoPorInstancia,
};
