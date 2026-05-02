const router = require('express').Router();
const { body } = require('express-validator');
const ctrl = require('../controllers/authController');
const auth = require('../middlewares/auth');
const tenantMiddleware = require('../middlewares/tenant');
const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');

const validarLogin = [
  body('email').isEmail().withMessage('Email inválido'),
  body('senha').notEmpty().withMessage('Senha obrigatória'),
];

// Login de tenant (requer X-Tenant-Slug)
router.post('/login', tenantMiddleware, validarLogin, ctrl.login);

// Login super admin (sem tenant)
router.post('/super-login', validarLogin, ctrl.login);

// Dados do usuário logado
router.get('/me', auth, ctrl.me);

// Trocar própria senha
router.put('/senha', auth, async (req, res, next) => {
  try {
    const { senhaAtual, novaSenha } = req.body;
    if (!novaSenha || novaSenha.length < 6) return res.status(400).json({ error: 'Nova senha mínimo 6 caracteres' });

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    const ok = await bcrypt.compare(senhaAtual, user.senha);
    if (!ok) return res.status(400).json({ error: 'Senha atual incorreta' });

    const hash = await bcrypt.hash(novaSenha, 10);
    await prisma.user.update({ where: { id: req.user.id }, data: { senha: hash } });
    res.json({ message: 'Senha atualizada com sucesso' });
  } catch (err) { next(err); }
});

// Atualizar perfil (nome + email) do usuário logado
router.put('/perfil', auth, async (req, res, next) => {
  try {
    const { nome, email } = req.body;
    if (!nome || !email) return res.status(400).json({ error: 'Nome e email são obrigatórios' });

    const existe = await prisma.user.findFirst({ where: { email, NOT: { id: req.user.id } } });
    if (existe) return res.status(400).json({ error: 'Email já está em uso por outro usuário' });

    const updated = await prisma.user.update({ where: { id: req.user.id }, data: { nome, email } });
    res.json({ message: 'Perfil atualizado com sucesso', user: { id: updated.id, nome: updated.nome, email: updated.email, role: updated.role } });
  } catch (err) { next(err); }
});

module.exports = router;
