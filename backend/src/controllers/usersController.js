const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { LIMITE_USUARIOS } = require('../config/planos');

exports.listar = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { tenantId: req.user.tenantId },
      select: { id: true, nome: true, email: true, role: true, ativo: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ users });
  } catch (err) { next(err); }
};

exports.criar = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    // Verificar limite do plano
    const tenant = await prisma.tenant.findUnique({ where: { id: req.user.tenantId } });
    const total = await prisma.user.count({ where: { tenantId: req.user.tenantId } });
    const limite = LIMITE_USUARIOS[tenant.plano] ?? 1;

    if (total >= limite) {
      return res.status(403).json({ error: `Plano ${tenant.plano} permite no máximo ${limite} usuário(s). Faça upgrade.` });
    }

    const { nome, email, senha, role } = req.body;
    const senhaHash = await bcrypt.hash(senha, 10);
    const user = await prisma.user.create({
      data: { tenantId: req.user.tenantId, nome, email, senha: senhaHash, role: role || 'atendente' },
      select: { id: true, nome: true, email: true, role: true, ativo: true, createdAt: true },
    });
    res.status(201).json({ user });
  } catch (err) {
    if (err.code === 'P2002') return res.status(400).json({ error: 'Email já cadastrado nesta empresa' });
    next(err);
  }
};

exports.atualizar = async (req, res, next) => {
  try {
    const { nome, email, role, ativo, senha } = req.body;
    const data = { nome, email, role, ativo };
    if (senha) data.senha = await bcrypt.hash(senha, 10);

    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data,
      select: { id: true, nome: true, email: true, role: true, ativo: true },
    });
    res.json({ user });
  } catch (err) { next(err); }
};

exports.deletar = async (req, res, next) => {
  try {
    if (Number(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'Não é possível deletar seu próprio usuário' });
    }
    await prisma.user.delete({ where: { id: Number(req.params.id) } });
    res.json({ message: 'Usuário removido' });
  } catch (err) { next(err); }
};
