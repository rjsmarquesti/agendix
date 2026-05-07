const router = require('express').Router();
const prisma  = require('../lib/prisma');

const DEFAULT = { logo: null, nome: 'Agendix', corPrimaria: '#5B3DF5' };

// GET /api/public/brand?slug=xxx
router.get('/brand', async (req, res) => {
  const { slug } = req.query;
  if (!slug) return res.json(DEFAULT);
  try {
    const tenant = await prisma.tenant.findUnique({
      where: { slug },
      select: { nome: true, logo: true, corPrimaria: true, ativo: true },
    });
    if (!tenant || !tenant.ativo) return res.json(DEFAULT);
    res.json({ logo: tenant.logo || null, nome: tenant.nome, corPrimaria: tenant.corPrimaria });
  } catch {
    res.json(DEFAULT);
  }
});

module.exports = router;
