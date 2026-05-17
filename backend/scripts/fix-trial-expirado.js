/**
 * Corrige tenants com planoStatus='trial' vencido que deveriam estar ativos.
 * Uso: node scripts/fix-trial-expirado.js [--fix]
 * Sem --fix: apenas lista os afetados (modo dry-run).
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const fix = process.argv.includes('--fix');
  const agora = new Date();

  const todos = await prisma.tenant.findMany({
    select: { id: true, slug: true, nome: true, plano: true, planoStatus: true, planoVencimento: true },
    orderBy: { createdAt: 'asc' },
  });

  console.log('\n=== Todos os tenants ===');
  todos.forEach(t => {
    const venc = t.planoVencimento ? t.planoVencimento.toISOString().slice(0, 10) : 'null';
    const expirado = t.planoVencimento && agora > new Date(t.planoVencimento);
    const flag = t.planoStatus === 'trial' && expirado ? ' ⚠️  BLOQUEADO' : '';
    console.log(`${t.slug.padEnd(20)} ${t.plano.padEnd(10)} ${t.planoStatus.padEnd(22)} venc:${venc}${flag}`);
  });

  const bloqueados = todos.filter(t => t.planoStatus === 'trial' && t.planoVencimento && agora > new Date(t.planoVencimento));

  console.log(`\n=== Tenants bloqueados (trial expirado): ${bloqueados.length} ===`);
  bloqueados.forEach(t => console.log(` - ${t.slug} (${t.nome}) | plano: ${t.plano}`));

  if (fix && bloqueados.length > 0) {
    console.log('\nCorrigindo...');
    for (const t of bloqueados) {
      await prisma.tenant.update({
        where: { id: t.id },
        data: {
          planoStatus: 'ativo',
          planoVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 dias
        },
      });
      console.log(` ✅ ${t.slug} → ativo`);
    }
    console.log('Pronto!');
  } else if (bloqueados.length > 0) {
    console.log('\nRode com --fix para corrigir automaticamente.');
  }
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
