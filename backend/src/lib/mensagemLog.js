const prisma = require('./prisma');

async function registrar({ tenantId, leadId, meio, para, assunto, corpo, origem = 'manual', usuarioId, status = 'enviado', erroMsg, _throw = false } = {}) {
  try {
    await prisma.mensagemLog.create({
      data: {
        tenantId:  tenantId  ?? null,
        leadId:    leadId    ?? null,
        usuarioId: usuarioId ?? null,
        meio,
        para,
        assunto:  assunto  ?? null,
        corpo,
        origem,
        status,
        erroMsg:  erroMsg  ?? null,
      },
    });
  } catch (e) {
    console.error('[mensagemLog] falha ao registrar:', e.message);
    if (_throw) throw e;
  }
}

module.exports = { registrar };
