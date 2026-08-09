const prisma = require('./prisma');

// Registra um incidente de segurança no banco (usado pelo Grafana Alert webhook via n8n)
async function registrar({ tipo, severidade = 'medium', ip, tenantId, userId, detalhes }) {
  try {
    return await prisma.securityIncident.create({
      data: { tipo, severidade, ip: ip || null, tenantId: tenantId || null, userId: userId || null, detalhes: detalhes || null },
    });
  } catch (err) {
    console.error('[securityIncident] Falha ao registrar:', err.message);
  }
}

module.exports = { registrar };
