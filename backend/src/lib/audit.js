const prisma = require('./prisma');

async function log(acao, { entidade, entidadeId, tenantId, userId, ip, detalhes } = {}) {
  try {
    await prisma.auditLog.create({
      data: {
        acao,
        entidade: entidade || null,
        entidadeId: entidadeId != null ? String(entidadeId) : null,
        tenantId: tenantId || null,
        userId: userId || null,
        ip: ip || null,
        detalhes: detalhes || null,
      },
    });
  } catch (err) {
    console.error('[audit] Falha ao gravar log:', err.message);
  }
}

module.exports = { log };
