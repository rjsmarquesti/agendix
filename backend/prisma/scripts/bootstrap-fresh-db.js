/**
 * Provisiona um banco Postgres NOVO e VAZIO (staging, disaster recovery, dev local)
 * sem reproduzir o histórico bruto de migrations.
 *
 * Motivo: a migration `20260523c_reestrutura_planos` adiciona um valor a um enum
 * Postgres e usa esse mesmo valor na sequência — Postgres proíbe isso dentro de uma
 * única transação ("unsafe use of new value... must be committed before they can be
 * used"). Como o Prisma roda cada migration.sql como uma transação só, `prisma migrate
 * deploy` sempre vai travar exatamente nessa migration ao tentar aplicar o histórico
 * completo do zero. Em produção isso nunca vai doer (a migration já foi aplicada lá
 * há muito tempo, antes de qualquer regra mais rígida de enum do Postgres se aplicar
 * a ela) — só afeta quem precisa criar um banco novo do zero.
 *
 * Este script NÃO edita nenhuma migration existente (proibido por regra do projeto
 * para migrations já aplicadas). Em vez disso:
 *   1. Sincroniza o banco alvo com o schema.prisma ATUAL via `prisma db push`
 *      (cria o estado final direto, sem replay incremental — não esbarra no
 *      problema do enum porque não recria o histórico passo a passo).
 *   2. Marca cada migration existente como "aplicada" na tabela de controle do
 *      Prisma (`prisma migrate resolve --applied`), para que `prisma migrate
 *      deploy` funcione normalmente dali em diante — só vai executar migrations
 *      NOVAS criadas depois deste baseline.
 *
 * Uso (apontando DATABASE_URL para o banco novo, nunca para produção):
 *   DATABASE_URL="postgresql://..." node prisma/scripts/bootstrap-fresh-db.js
 *
 * PRÉ-REQUISITO: rodar isso só contra um banco vazio/novo. Nunca contra produção
 * (que já tem o histórico real aplicado e não precisa deste baseline).
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');

function run(cmd) {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { stdio: 'inherit', cwd: path.join(__dirname, '..', '..') });
}

function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL não definida. Aponte para o banco NOVO antes de rodar este script.');
    process.exit(1);
  }

  console.log('Alvo:', process.env.DATABASE_URL.replace(/:[^:@]+@/, ':****@'));
  console.log('Este script assume que o banco acima está VAZIO. Não rode contra produção.');

  run('npx prisma db push --skip-generate --accept-data-loss');

  const migrations = fs.readdirSync(MIGRATIONS_DIR)
    .filter((name) => fs.statSync(path.join(MIGRATIONS_DIR, name)).isDirectory())
    .sort();

  for (const name of migrations) {
    run(`npx prisma migrate resolve --applied "${name}"`);
  }

  console.log(`\nBaseline concluído: schema sincronizado + ${migrations.length} migrations marcadas como aplicadas.`);
  console.log('A partir de agora, "prisma migrate deploy" neste banco só vai rodar migrations novas.');
}

main();
