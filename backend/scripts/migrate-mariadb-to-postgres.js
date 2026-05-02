/**
 * Script de migração: MariaDB → PostgreSQL
 *
 * Roda DENTRO do container backend (acesso à rede interna do EasyPanel).
 *
 * Uso:
 *   MARIADB_URL="mysql://user:pass@host:3306/db" \
 *   POSTGRES_URL="postgresql://user:pass@host:5432/db" \
 *   node scripts/migrate-mariadb-to-postgres.js
 *
 * Dependências: mysql2 (leitura MariaDB) + @prisma/client PostgreSQL (escrita)
 */


const mysql  = require('mysql2/promise');
const prisma = require('../src/lib/prisma');

// ─── Configuração ─────────────────────────────────────────────────────────────

const MARIADB_URL  = process.env.MARIADB_URL;
const POSTGRES_URL = process.env.POSTGRES_URL || process.env.DATABASE_URL;

if (!MARIADB_URL) {
  console.error('ERRO: defina MARIADB_URL. Ex: MARIADB_URL="mysql://user:pass@host:3306/db"');
  process.exit(1);
}

// Substitui protocolo mariadb:// por mysql:// (mysql2 não aceita mariadb://)
const mysqlUrl = MARIADB_URL.replace(/^mariadb:\/\//, 'mysql://');

function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }

// ─── Leitura do MariaDB ────────────────────────────────────────────────────────

async function lerTabela(conn, tabela) {
  const [rows] = await conn.query(`SELECT * FROM \`${tabela}\``);
  return rows;
}

// ─── Mapeamento: coluna snake_case do MariaDB → campo camelCase do Prisma ─────

function mapTenant(r) {
  return {
    id:                  r.id,
    nome:                r.nome,
    slug:                r.slug,
    logo:                r.logo           || null,
    corPrimaria:         r.cor_primaria   || '#2563eb',
    plano:               r.plano          || 'basico',
    modulos:             typeof r.modulos === 'string' ? JSON.parse(r.modulos) : r.modulos,
    ativo:               Boolean(r.ativo),
    n8nWebhookUrl:       r.n8n_webhook_url       || null,
    n8nApiKey:           r.n8n_api_key            || null,
    apiToken:            r.api_token              || null,
    nichoLabel:          r.nicho_label            || null,
    evolutionInstance:   r.evolution_instance     || null,
    evolutionApiKey:     r.evolution_api_key      || null,
    evolutionBaseUrl:    r.evolution_base_url     || null,
    planoStatus:         r.plano_status           || 'trial',
    planoVencimento:     r.plano_vencimento       || null,
    asaasCustomerId:     r.asaas_customer_id      || null,
    n8nWorkflowWaId:     r.n8n_workflow_wa_id     || null,
    n8nWorkflowNotifId:  r.n8n_workflow_notif_id  || null,
    createdAt:           r.created_at,
  };
}

function mapUser(r) {
  return {
    id:        r.id,
    tenantId:  r.tenant_id  || null,
    nome:      r.nome,
    email:     r.email,
    senha:     r.senha,
    role:      r.role        || 'atendente',
    ativo:     Boolean(r.ativo),
    createdAt: r.created_at,
  };
}

function mapLead(r) {
  return {
    id:            r.id,
    tenantId:      r.tenant_id,
    nome:          r.nome,
    telefone:      r.telefone       || null,
    telefone2:     r.telefone2      || null,
    email:         r.email          || null,
    origem:        r.origem         || null,
    status:        r.status         || 'novo',
    priority:      r.priority       || 'normal',
    observacoes:   r.observacoes    || null,
    fonte:         r.fonte          || 'manual',
    cep:           r.cep            || null,
    logradouro:    r.logradouro     || null,
    numero:        r.numero         || null,
    complemento:   r.complemento    || null,
    bairro:        r.bairro         || null,
    cidade:        r.cidade         || null,
    municipio:     r.municipio      || null,
    estado:        r.estado         || null,
    nicho:         r.nicho          || null,
    categoria:     r.categoria      || null,
    subcategoria:  r.subcategoria   || null,
    googleMapsUrl: r.google_maps_url || null,
    placeId:       r.place_id        || null,
    rating:        r.rating          != null ? Number(r.rating) : null,
    reviewsCount:  r.reviews_count   != null ? Number(r.reviews_count) : 0,
    website:       r.website         || null,
    facebook:      r.facebook        || null,
    instagram:     r.instagram       || null,
    telegram:      r.telegram        || null,
    especialidades: r.especialidades || null,
    disparo:       r.disparo         || null,
    mensagem:      r.mensagem        || null,
    ultimoContato:  r.ultimo_contato  || null,
    proximoContato: r.proximo_contato || null,
    createdAt:     r.created_at,
    updatedAt:     r.updated_at,
  };
}

function mapServico(r) {
  return {
    id:         r.id,
    tenantId:   r.tenant_id,
    nome:       r.nome,
    descricao:  r.descricao   || null,
    duracaoMin: r.duracao_min || 60,
    preco:      r.preco       != null ? Number(r.preco) : null,
    ativo:      Boolean(r.ativo),
    ordem:      r.ordem       || 0,
    createdAt:  r.created_at,
  };
}

function mapConfigAgenda(r) {
  return {
    id:                   r.id,
    tenantId:             r.tenant_id,
    horarioInicio:        r.horario_inicio        || '08:00',
    horarioFim:           r.horario_fim           || '18:00',
    duracaoSlot:          r.duracao_slot          || 60,
    diasUteis:            r.dias_uteis            || '1,2,3,4,5',
    antecedenciaMin:      r.antecedencia_min      || 2,
    antecedenciaMax:      r.antecedencia_max      || 30,
    mensagemConfirmacao:  r.mensagem_confirmacao   || null,
    mensagemWaConfirmacao: r.mensagem_wa_confirmacao || null,
    mensagemWaLembrete:   r.mensagem_wa_lembrete  || null,
    mensagemWaAdmin:      r.mensagem_wa_admin     || null,
    whatsappAdmin:        r.whatsapp_admin        || null,
    ativo:                Boolean(r.ativo),
  };
}

function mapBloqueio(r) {
  return {
    id:         r.id,
    tenantId:   r.tenant_id,
    data:       r.data,
    horaInicio: r.hora_inicio || null,
    horaFim:    r.hora_fim    || null,
    motivo:     r.motivo      || null,
    createdAt:  r.created_at,
  };
}

function mapAgendamento(r) {
  return {
    id:                  r.id,
    tenantId:            r.tenant_id,
    leadId:              r.lead_id,
    servicoId:           r.servico_id             || null,
    data:                r.data,
    hora:                r.hora,
    tipo:                r.tipo                   || null,
    status:              r.status                 || 'marcado',
    observacoes:         r.observacoes            || null,
    canalOrigem:         r.canal_origem           || 'manual',
    clienteNome:         r.cliente_nome           || null,
    clienteTelefone:     r.cliente_telefone       || null,
    lembreteEnviado:     Boolean(r.lembrete_enviado),
    lembrete3dEnviado:   Boolean(r.lembrete_3d_enviado),
    lembrete1dEnviado:   Boolean(r.lembrete_1d_enviado),
    lembreteDiaEnviado:  Boolean(r.lembrete_dia_enviado),
    createdAt:           r.created_at,
    updatedAt:           r.updated_at,
  };
}

function mapConversa(r) {
  return {
    id:        r.id,
    tenantId:  r.tenant_id,
    telefone:  r.telefone,
    estado:    r.estado    || 'inicio',
    dadosJson: r.dados_json ? (typeof r.dados_json === 'string' ? JSON.parse(r.dados_json) : r.dados_json) : null,
    expiresAt: r.expires_at,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// ─── Migração de uma tabela ────────────────────────────────────────────────────

async function migrar(nome, rows, upsertFn) {
  log(`→ ${nome}: ${rows.length} registro(s)`);
  let ok = 0, erros = 0;
  for (const row of rows) {
    try {
      await upsertFn(row);
      ok++;
    } catch (e) {
      console.error(`  [ERRO id=${row.id}]`, e.message);
      erros++;
    }
  }
  log(`  ✓ ${ok} ok${erros ? `  ✗ ${erros} erro(s)` : ''}`);
  return { ok, erros };
}

// ─── Sincronizar sequences ────────────────────────────────────────────────────

async function sincronizarSequences() {
  const tabelas = [
    'tenants', 'users', 'leads', 'servicos',
    'configuracoes_agenda', 'bloqueios_horario',
    'agendamentos', 'conversas_whatsapp',
  ];
  for (const t of tabelas) {
    await prisma.$executeRawUnsafe(
      `SELECT setval('${t}_id_seq', COALESCE((SELECT MAX(id) FROM ${t}), 1))`
    );
  }
  log('  ✓ Sequences sincronizadas');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  log('=== Migração MariaDB → PostgreSQL ===\n');

  const conn = await mysql.createConnection(mysqlUrl);
  log('Conectado ao MariaDB ✓');
  log('Conectado ao PostgreSQL ✓\n');

  const resultados = {};

  // 1. Tenants
  resultados.tenants = await migrar('tenants', await lerTabela(conn, 'tenants'), (r) =>
    prisma.tenant.upsert({ where: { id: r.id }, update: mapTenant(r), create: mapTenant(r) })
  );

  // 2. Users
  resultados.users = await migrar('users', await lerTabela(conn, 'users'), (r) =>
    prisma.user.upsert({ where: { id: r.id }, update: mapUser(r), create: mapUser(r) })
  );

  // 3. Leads
  resultados.leads = await migrar('leads', await lerTabela(conn, 'leads'), (r) =>
    prisma.lead.upsert({ where: { id: r.id }, update: mapLead(r), create: mapLead(r) })
  );

  // 4. Serviços
  resultados.servicos = await migrar('servicos', await lerTabela(conn, 'servicos'), (r) =>
    prisma.servico.upsert({ where: { id: r.id }, update: mapServico(r), create: mapServico(r) })
  );

  // 5. ConfiguracaoAgenda
  resultados.config = await migrar('configuracoes_agenda', await lerTabela(conn, 'configuracoes_agenda'), (r) =>
    prisma.configuracaoAgenda.upsert({ where: { id: r.id }, update: mapConfigAgenda(r), create: mapConfigAgenda(r) })
  );

  // 6. BloqueioHorario
  resultados.bloqueios = await migrar('bloqueios_horario', await lerTabela(conn, 'bloqueios_horario'), (r) =>
    prisma.bloqueioHorario.upsert({ where: { id: r.id }, update: mapBloqueio(r), create: mapBloqueio(r) })
  );

  // 7. Agendamentos
  resultados.agendamentos = await migrar('agendamentos', await lerTabela(conn, 'agendamentos'), (r) =>
    prisma.agendamento.upsert({ where: { id: r.id }, update: mapAgendamento(r), create: mapAgendamento(r) })
  );

  // 8. ConversaWhatsapp
  resultados.conversas = await migrar('conversas_whatsapp', await lerTabela(conn, 'conversas_whatsapp'), (r) =>
    prisma.conversaWhatsapp.upsert({ where: { id: r.id }, update: mapConversa(r), create: mapConversa(r) })
  );

  log('\nSincronizando sequences...');
  await sincronizarSequences();

  // Resumo
  console.log('\n=== RESUMO ===');
  let totalOk = 0, totalErros = 0;
  for (const [tabela, r] of Object.entries(resultados)) {
    console.log(`  ${tabela.padEnd(18)} ok=${r.ok}  erros=${r.erros}`);
    totalOk    += r.ok;
    totalErros += r.erros;
  }
  console.log(`\n  TOTAL: ${totalOk} migrado(s), ${totalErros} erro(s)`);
  console.log(totalErros > 0
    ? '\n⚠️  Investigue os erros antes do cutover em produção.'
    : '\n✅  Migração concluída sem erros!'
  );

  await conn.end();
}

main()
  .catch((e) => { console.error('ERRO FATAL:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
