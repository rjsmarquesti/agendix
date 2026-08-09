// Modelos que obrigatoriamente devem ter tenantId em qualquer query
// audit é carregado via lazy require para evitar dependência circular:
// prisma.js → prismaMiddleware.js → audit.js → prisma.js
const TENANT_MODELS = [
  'Lead', 'Agendamento', 'Servico', 'BloqueioHorario',
  'ConversaWhatsapp', 'LancamentoFinanceiro', 'Notificacao',
  'AgentConfig', 'AgentSession', 'AgentLead', 'ConfiguracaoAgenda',
  'FichaCliente', 'Anamnese', 'Orcamento', 'Prontuario', 'Documento',
  'WaAtendente', 'WaFila', 'WaConversaLog',
];

// Apenas operações de massa requerem tenantId: leitura/escrita que afetam múltiplos registros.
// update/delete/findFirst por ID são seguros (um registro) — tenant validado no findFirst anterior.
const GUARDED_ACTIONS = ['findMany', 'create', 'createMany', 'updateMany', 'deleteMany'];

function tenantIsolationMiddleware(params, next) {
  if (
    TENANT_MODELS.includes(params.model) &&
    GUARDED_ACTIONS.includes(params.action)
  ) {
    const where = params.args?.where;
    const data  = params.args?.data;

    // Queries de sistema (crons cross-tenant) podem passar _skipTenantCheck: true no where
    if (where?._skipTenantCheck) {
      delete where._skipTenantCheck;
      return next(params);
    }

    // Verifica se tenantId está presente em where OU em data (para creates)
    const hasTenantInWhere = where && (where.tenantId !== undefined || where.tenant !== undefined);
    const hasTenantInData  = data  && (data.tenantId  !== undefined || data.tenant  !== undefined);

    const isCreate = params.action === 'create' || params.action === 'createMany';
    const hasTenant = isCreate ? (hasTenantInData || hasTenantInWhere) : hasTenantInWhere;

    if (!hasTenant) {
      throw new Error(`TENANT_ISOLATION_VIOLATION: ${params.model}.${params.action} sem tenantId`);
    }
  }
  return next(params);
}

module.exports = { tenantIsolationMiddleware };
