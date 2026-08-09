const { PrismaClient } = require('@prisma/client');
const { tenantIsolationMiddleware } = require('./prismaMiddleware');

const prisma = new PrismaClient();

// Sprint 2: middleware de isolamento multi-tenant
prisma.$use(tenantIsolationMiddleware);

module.exports = prisma;
