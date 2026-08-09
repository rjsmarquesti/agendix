const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const prisma = require('../lib/prisma');
const authMiddleware = require('../middlewares/auth');
const { requireRole } = require('../middlewares/auth');
const audit = require('../lib/audit');

const BACKUP_DIR = path.join(__dirname, '..', '..', 'backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });

router.use(authMiddleware, requireRole('super_admin'));

const strip = ({ id, tenantId, createdAt, updatedAt, ...rest }) => rest;

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function gerarBackupTenant(tenant) {
  const tenantId = tenant.id;
  const [leads, agendamentos, servicos, config, bloqueios, lancamentos] = await Promise.all([
    prisma.lead.findMany({ where: { tenantId } }),
    prisma.agendamento.findMany({ where: { tenantId } }),
    prisma.servico.findMany({ where: { tenantId } }),
    prisma.configuracaoAgenda.findFirst({ where: { tenantId } }),
    prisma.bloqueioHorario.findMany({ where: { tenantId } }),
    prisma.lancamentoFinanceiro.findMany({ where: { tenantId } }),
  ]);
  return { version: 1, exportedAt: new Date(), tenant: tenant.slug, leads, agendamentos, servicos, config, bloqueios, lancamentos };
}

async function gerarBackupAdmin() {
  const lancamentos = await prisma.adminLancamento.findMany({
    include: { tenant: { select: { id: true, nome: true, slug: true } } },
  });
  return { version: 1, exportedAt: new Date(), tipo: 'admin', lancamentos };
}

async function restaurarTenant(tenantId, data) {
  const { version, leads = [], agendamentos = [], servicos = [], config, bloqueios = [], lancamentos = [] } = data;
  if (version !== 1) throw new Error('Formato de backup inválido.');

  await prisma.$transaction(async (tx) => {
    await tx.lancamentoFinanceiro.deleteMany({ where: { tenantId } });
    await tx.agendamento.deleteMany({ where: { tenantId } });
    await tx.lead.deleteMany({ where: { tenantId } });
    await tx.servico.deleteMany({ where: { tenantId } });
    await tx.bloqueioHorario.deleteMany({ where: { tenantId } });

    for (const s of servicos) await tx.servico.create({ data: { ...strip(s), tenantId } });
    for (const l of leads) await tx.lead.create({ data: { ...strip(l), tenantId } });
    for (const a of agendamentos) {
      const { servicoId, leadId, ...rest } = strip(a);
      await tx.agendamento.create({ data: { ...rest, tenantId } });
    }
    for (const b of bloqueios) await tx.bloqueioHorario.create({ data: { ...strip(b), tenantId } });
    for (const lf of lancamentos) await tx.lancamentoFinanceiro.create({ data: { ...strip(lf), tenantId } });

    if (config) {
      const { id, tenantId: _t, createdAt, updatedAt, ...configData } = config;
      await tx.configuracaoAgenda.upsert({
        where: { tenantId },
        create: { ...configData, tenantId },
        update: configData,
      });
    }
  });
}

async function restaurarAdmin(data) {
  const { version, lancamentos = [] } = data;
  if (version !== 1) throw new Error('Formato de backup inválido.');

  await prisma.$transaction(async (tx) => {
    await tx.adminLancamento.deleteMany({});
    for (const l of lancamentos) {
      const { id, tenant, createdAt, updatedAt, ...rest } = l;
      await tx.adminLancamento.create({ data: rest });
    }
  });
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

// GET /api/admin/backups — listar backups
router.get('/', async (req, res) => {
  try {
    const backups = await prisma.backup.findMany({
      include: { tenant: { select: { id: true, nome: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json(backups);
  } catch (err) {
    console.error('[adminBackups/listar]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/backups — criar backup
router.post('/', async (req, res) => {
  try {
    const { tipo, tenantId, descricao } = req.body;
    if (!['admin', 'tenant'].includes(tipo)) return res.status(400).json({ error: 'tipo deve ser admin ou tenant' });
    if (tipo === 'tenant' && !tenantId) return res.status(400).json({ error: 'tenantId obrigatório para backup de tenant' });

    let conteudo;
    let tenant = null;
    let nomeArquivo;

    if (tipo === 'tenant') {
      tenant = await prisma.tenant.findUnique({ where: { id: parseInt(tenantId) } });
      if (!tenant) return res.status(404).json({ error: 'Tenant não encontrado' });
      conteudo = await gerarBackupTenant(tenant);
      nomeArquivo = `tenant-${tenant.slug}-${Date.now()}.json`;
    } else {
      conteudo = await gerarBackupAdmin();
      nomeArquivo = `admin-${Date.now()}.json`;
    }

    const filePath = path.join(BACKUP_DIR, nomeArquivo);
    const json = JSON.stringify(conteudo, null, 2);
    fs.writeFileSync(filePath, json, 'utf8');

    const tamanhoBytes = Buffer.byteLength(json, 'utf8');

    const backup = await prisma.backup.create({
      data: {
        tipo,
        tenantId: tenant?.id || null,
        nomeArquivo,
        tamanhoBytes,
        descricao: descricao || null,
      },
      include: { tenant: { select: { id: true, nome: true, slug: true } } },
    });

    await audit.log('backup_criado', {
      entidade: tipo,
      entidadeId: tenant?.id || 'admin',
      tenantId: tenant?.id || null,
      userId: req.user?.id,
      ip: req.ip,
      detalhes: { nomeArquivo, tamanhoBytes },
    });

    res.status(201).json(backup);
  } catch (err) {
    console.error('[adminBackups/criar]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/backups/:id/download — baixar arquivo JSON
router.get('/:id/download', async (req, res) => {
  try {
    const backup = await prisma.backup.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!backup) return res.status(404).json({ error: 'Backup não encontrado' });

    const filePath = path.join(BACKUP_DIR, backup.nomeArquivo);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Arquivo de backup não encontrado no disco' });

    res.setHeader('Content-Disposition', `attachment; filename="${backup.nomeArquivo}"`);
    res.setHeader('Content-Type', 'application/json');
    fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    console.error('[adminBackups/download]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/backups/:id/restaurar — restaurar backup
router.post('/:id/restaurar', async (req, res) => {
  try {
    const backup = await prisma.backup.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { tenant: { select: { id: true, nome: true, slug: true } } },
    });
    if (!backup) return res.status(404).json({ error: 'Backup não encontrado' });

    const filePath = path.join(BACKUP_DIR, backup.nomeArquivo);
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Arquivo de backup não encontrado no disco' });

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (backup.tipo === 'tenant') {
      if (!backup.tenantId) return res.status(400).json({ error: 'Backup sem tenant vinculado' });
      await restaurarTenant(backup.tenantId, data);
    } else {
      await restaurarAdmin(data);
    }

    await audit.log('backup_restaurado', {
      entidade: backup.tipo,
      entidadeId: backup.tenantId || 'admin',
      tenantId: backup.tenantId || null,
      userId: req.user?.id,
      ip: req.ip,
      detalhes: { backupId: backup.id, nomeArquivo: backup.nomeArquivo },
    });

    res.json({ message: 'Backup restaurado com sucesso.' });
  } catch (err) {
    console.error('[adminBackups/restaurar]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/backups/:id — excluir backup
router.delete('/:id', async (req, res) => {
  try {
    const backup = await prisma.backup.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!backup) return res.status(404).json({ error: 'Backup não encontrado' });

    const filePath = path.join(BACKUP_DIR, backup.nomeArquivo);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await prisma.backup.delete({ where: { id: backup.id } });

    res.json({ ok: true });
  } catch (err) {
    console.error('[adminBackups/deletar]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
