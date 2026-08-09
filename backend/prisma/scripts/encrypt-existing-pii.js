/**
 * Script de migração única: criptografa campos PII/PCI ainda em plaintext.
 * Executar UMA VEZ em produção após deploy do Sprint 2.
 *
 * Uso: node prisma/scripts/encrypt-existing-pii.js
 *
 * PRÉ-REQUISITO: backup do banco antes de executar.
 */
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { encrypt, decrypt } = require('../../src/lib/encrypt');

const prisma = new PrismaClient();

const TENANT_FIELDS = ['cnpj', 'telefone', 'email', 'webhookSecret'];
const USER_FIELDS   = ['whatsapp'];

async function encryptField(value) {
  if (!value) return value;
  if (value.startsWith('enc:')) return value; // já criptografado
  return encrypt(value);
}

async function migrateTenants() {
  const tenants = await prisma.tenant.findMany({
    select: { id: true, cnpj: true, telefone: true, email: true, webhookSecret: true },
  });

  let updated = 0;
  for (const t of tenants) {
    const data = {};
    for (const field of TENANT_FIELDS) {
      if (t[field] && !t[field].startsWith('enc:')) {
        data[field] = await encryptField(t[field]);
      }
    }
    if (Object.keys(data).length > 0) {
      await prisma.tenant.update({ where: { id: t.id }, data });
      updated++;
    }
  }
  console.log(`Tenants: ${updated}/${tenants.length} atualizados`);
}

async function migrateUsers() {
  const users = await prisma.user.findMany({
    select: { id: true, whatsapp: true },
  });

  let updated = 0;
  for (const u of users) {
    const data = {};
    for (const field of USER_FIELDS) {
      if (u[field] && !u[field].startsWith('enc:')) {
        data[field] = await encryptField(u[field]);
      }
    }
    if (Object.keys(data).length > 0) {
      await prisma.user.update({ where: { id: u.id }, data });
      updated++;
    }
  }
  console.log(`Users: ${updated}/${users.length} atualizados`);
}

async function main() {
  console.log('Iniciando migração de PII para AES-256-GCM...');
  await migrateTenants();
  await migrateUsers();
  console.log('Concluído.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
