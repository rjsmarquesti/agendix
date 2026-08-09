const { validationResult } = require('express-validator');
const prisma = require('../lib/prisma');
const { dispararWebhook } = require('../services/webhook');
const { montarDadosLead, importarLote, montarDadosImportacao } = require('../services/leadService');
const XLSX = require('xlsx');

const COLUNAS_EXPORT = [
  'nome','telefone','telefone2','email','website','status','priority','fonte','origem','observacoes',
  'nicho','categoria','subcategoria','bairro','cidade','municipio','estado','cep','logradouro','numero',
  'facebook','instagram','telegram','especialidades',
];

const HEADER_MAP = {
  nome:'Nome',telefone:'Telefone',telefone2:'Telefone 2',email:'Email',website:'Website',
  status:'Status',priority:'Prioridade',fonte:'Fonte',origem:'Origem',observacoes:'Observações',
  nicho:'Nicho',categoria:'Categoria',subcategoria:'Subcategoria',bairro:'Bairro',cidade:'Cidade',
  municipio:'Município',estado:'Estado',cep:'CEP',logradouro:'Logradouro',numero:'Número',
  facebook:'Facebook',instagram:'Instagram',telegram:'Telegram',especialidades:'Especialidades',
};

// GET /leads — listar com filtros geográficos, nicho, fonte, status
exports.listar = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const {
      busca, status, fonte, priority,
      estado, municipio, cidade, bairro,
      nicho, categoria,
      page = 1, limit = 50,
    } = req.query;

    const skip = (Number(page) - 1) * Number(limit);
    const where = { tenantId };

    if (status)    where.status    = status;
    if (fonte)     where.fonte     = fonte;
    if (priority)  where.priority  = priority;
    if (estado)    where.estado    = estado;
    if (municipio) where.municipio = { contains: municipio };
    if (cidade)    where.cidade    = { contains: cidade };
    if (bairro)    where.bairro    = { contains: bairro };
    if (nicho)     where.nicho     = nicho;
    if (categoria) where.categoria = categoria;

    if (busca) {
      where.OR = [
        { nome:     { contains: busca } },
        { telefone: { contains: busca } },
        { email:    { contains: busca } },
        { nicho:    { contains: busca } },
        { bairro:   { contains: busca } },
        { cidade:   { contains: busca } },
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.lead.count({ where }),
    ]);

    res.json({ leads, total, page: Number(page), limit: Number(limit) });
  } catch (err) { next(err); }
};

// GET /leads/nichos — lista nichos e categorias disponíveis no tenant
exports.nichos = async (req, res, next) => {
  try {
    const raw = await prisma.lead.findMany({
      where: { tenantId: req.user.tenantId, nicho: { not: null } },
      select: { nicho: true, categoria: true, subcategoria: true },
      orderBy: { nicho: 'asc' },
      take: 500,
    });

    // mapa: nicho → { categorias: Set, subcats: Map<categoria, Set<subcategoria>> }
    const mapa = {};
    raw.forEach(({ nicho, categoria, subcategoria }) => {
      if (!nicho) return;
      if (!mapa[nicho]) mapa[nicho] = { cats: new Set(), subcats: {} };
      if (categoria) {
        mapa[nicho].cats.add(categoria);
        if (subcategoria) {
          if (!mapa[nicho].subcats[categoria]) mapa[nicho].subcats[categoria] = new Set();
          mapa[nicho].subcats[categoria].add(subcategoria);
        }
      }
    });

    const data = Object.entries(mapa).map(([nicho, { cats, subcats }]) => ({
      nicho,
      categorias: Array.from(cats).sort(),
      subcategorias: Object.fromEntries(
        Object.entries(subcats).map(([cat, subs]) => [cat, Array.from(subs).sort()])
      ),
    }));

    res.json({ data });
  } catch (err) { next(err); }
};

// GET /leads/stats — contagens rápidas para o dashboard
exports.stats = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const [total, byStatus, byFonte, byNicho] = await Promise.all([
      prisma.lead.count({ where: { tenantId } }),
      prisma.lead.groupBy({ by: ['status'], where: { tenantId }, _count: true }),
      prisma.lead.groupBy({ by: ['fonte'],  where: { tenantId }, _count: true }),
      prisma.lead.groupBy({
        by: ['nicho'], where: { tenantId, nicho: { not: null } },
        _count: true, orderBy: { _count: { nicho: 'desc' } }, take: 10,
      }),
    ]);
    res.json({ total, byStatus, byFonte, byNicho });
  } catch (err) { next(err); }
};

// GET /leads/:id
exports.buscarPorId = async (req, res, next) => {
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId },
    });
    if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });
    res.json({ lead });
  } catch (err) { next(err); }
};

// POST /leads — criar lead único
exports.criar = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const lead = await prisma.lead.create({
      data: { tenantId: req.user.tenantId, ...montarDadosLead(req.body) },
    });

    dispararWebhook(req.user.tenantId, 'lead.criado', lead);
    res.status(201).json({ lead });
  } catch (err) {
    // Duplicata place_id no mesmo tenant
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Este estabelecimento já está cadastrado (place_id duplicado)' });
    }
    next(err);
  }
};

// POST /leads/importar — importação em lote (Google Maps)
exports.importar = async (req, res, next) => {
  try {
    const { leads: lista } = req.body;
    if (!Array.isArray(lista) || lista.length === 0) {
      return res.status(400).json({ error: 'Envie um array "leads" com pelo menos 1 item' });
    }
    if (lista.length > 500) {
      return res.status(400).json({ error: 'Máximo de 500 leads por importação' });
    }

    const resultado = await importarLote(req.user.tenantId, lista);
    res.json({ ok: true, ...resultado });
  } catch (err) { next(err); }
};

// PUT /leads/:id — atualizar
exports.atualizar = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const existe = await prisma.lead.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId },
    });
    if (!existe) return res.status(404).json({ error: 'Lead não encontrado' });

    const lead = await prisma.lead.update({
      where: { id: existe.id, tenantId: req.user.tenantId },
      data: montarDadosLead({ ...existe, ...req.body }),
    });

    const evento = existe.status !== lead.status ? 'lead.status_alterado' : 'lead.atualizado';
    dispararWebhook(req.user.tenantId, evento, lead);
    res.json({ lead });
  } catch (err) { next(err); }
};

// DELETE /leads/bulk — exclusão em massa
exports.deletarEmMassa = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0)
      return res.status(400).json({ error: 'Informe ao menos um ID' });

    const result = await prisma.lead.deleteMany({
      where: { id: { in: ids.map(Number) }, tenantId },
    });

    res.json({ deletados: result.count });
  } catch (err) { next(err); }
};

// DELETE /leads/:id
exports.deletar = async (req, res, next) => {
  try {
    const existe = await prisma.lead.findFirst({
      where: { id: Number(req.params.id), tenantId: req.user.tenantId },
    });
    if (!existe) return res.status(404).json({ error: 'Lead não encontrado' });

    await prisma.lead.delete({ where: { id: existe.id, tenantId: req.user.tenantId } });
    res.json({ message: 'Lead removido' });
  } catch (err) { next(err); }
};

// POST /leads/:id/converter — converte lead em cliente
exports.converterEmCliente = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const leadId = Number(req.params.id);
    const { servicosIds = [] } = req.body;

    const lead = await prisma.lead.findFirst({ where: { id: leadId, tenantId } });
    if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });

    // Busca nomes dos serviços selecionados para snapshot
    let servicosContratados = [];
    if (servicosIds.length > 0) {
      const servicos = await prisma.servico.findMany({
        where: { id: { in: servicosIds.map(Number) }, tenantId },
        select: { id: true, nome: true, preco: true },
      });
      servicosContratados = servicos.map(s => ({ id: s.id, nome: s.nome, preco: s.preco }));
    }

    const lead_atualizado = await prisma.lead.update({
      where: { id: leadId },
      data: {
        status: 'convertido',
        clienteStatus: 'ativo',
        servicosContratados,
        ultimoContato: new Date(),
      },
    });

    res.json({ lead: lead_atualizado });
  } catch (err) { next(err); }
};

// GET /leads/exportar — exporta todos os leads (com filtros) como XLSX
exports.exportar = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { busca, status, fonte, priority, estado, municipio, cidade, bairro, nicho, categoria } = req.query;

    const where = { tenantId };
    if (status)    where.status    = status;
    if (fonte)     where.fonte     = fonte;
    if (priority)  where.priority  = priority;
    if (estado)    where.estado    = estado;
    if (municipio) where.municipio = { contains: municipio };
    if (cidade)    where.cidade    = { contains: cidade };
    if (bairro)    where.bairro    = { contains: bairro };
    if (nicho)     where.nicho     = nicho;
    if (categoria) where.categoria = categoria;
    if (busca) {
      where.OR = [
        { nome: { contains: busca } }, { telefone: { contains: busca } },
        { email: { contains: busca } }, { nicho: { contains: busca } },
        { bairro: { contains: busca } }, { cidade: { contains: busca } },
      ];
    }

    const leads = await prisma.lead.findMany({ where, orderBy: { createdAt: 'desc' }, take: 10000 });

    // cabeçalho em português
    const header = COLUNAS_EXPORT.map(c => HEADER_MAP[c] || c);
    const rows = leads.map(l => COLUNAS_EXPORT.map(c => l[c] ?? ''));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    // largura das colunas
    ws['!cols'] = header.map((h, i) => ({ wch: [30,14,14,28,28,12,10,14,20,40,20,20,20,20,20,20,4,10,30,8,30,30,20,30][i] || 18 }));
    XLSX.utils.book_append_sheet(wb, ws, 'Leads');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="leads-${Date.now()}.xlsx"`);
    res.send(buf);
  } catch (err) { next(err); }
};

// POST /leads/importar-arquivo — importa leads via arquivo XLSX ou CSV (multer memoryStorage)
exports.importarArquivo = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Arquivo não enviado' });

    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if (rows.length === 0) return res.status(400).json({ error: 'Planilha vazia ou sem linhas de dados' });
    if (rows.length > 5000) return res.status(400).json({ error: 'Máximo de 5000 linhas por importação' });

    // normaliza chaves: aceita cabeçalho PT ("Nome") ou EN ("nome")
    const ALIAS = {
      'nome':'nome','name':'nome',
      'telefone':'telefone','phone':'telefone','tel':'telefone',
      'telefone 2':'telefone2','telefone2':'telefone2',
      'email':'email',
      'website':'website','site':'website',
      'status':'status',
      'prioridade':'priority','priority':'priority',
      'fonte':'fonte','source':'fonte',
      'origem':'origem','origin':'origem',
      'observações':'observacoes','observacoes':'observacoes','notas':'observacoes','notes':'observacoes',
      'nicho':'nicho','niche':'nicho',
      'categoria':'categoria','category':'categoria',
      'subcategoria':'subcategoria',
      'bairro':'bairro','neighborhood':'bairro',
      'cidade':'cidade','city':'cidade',
      'município':'municipio','municipio':'municipio',
      'estado':'estado','state':'estado','uf':'estado',
      'cep':'cep','zip':'cep',
      'logradouro':'logradouro','rua':'logradouro','street':'logradouro',
      'número':'numero','numero':'numero','number':'numero',
      'facebook':'facebook',
      'instagram':'instagram',
      'telegram':'telegram',
      'especialidades':'especialidades','specialties':'especialidades',
    };

    const lista = rows.map(row => {
      const norm = {};
      for (const [k, v] of Object.entries(row)) {
        const key = ALIAS[k.toLowerCase().trim()];
        if (key) norm[key] = String(v).trim();
      }
      return norm;
    }).filter(r => r.nome);

    if (lista.length === 0) return res.status(400).json({ error: 'Nenhuma linha com campo "Nome" preenchido encontrada' });

    const resultado = await importarLote(req.user.tenantId, lista);
    res.json({ ok: true, ...resultado });
  } catch (err) { next(err); }
};

// PATCH /leads/:id/cliente-status — atualiza status do cliente
exports.atualizarClienteStatus = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const leadId = Number(req.params.id);
    const { clienteStatus } = req.body;

    const VALIDOS = ['ativo', 'pausado', 'encerrado'];
    if (!VALIDOS.includes(clienteStatus))
      return res.status(400).json({ error: 'Status inválido. Use: ativo, pausado ou encerrado' });

    const lead = await prisma.lead.findFirst({ where: { id: leadId, tenantId } });
    if (!lead) return res.status(404).json({ error: 'Lead não encontrado' });

    const atualizado = await prisma.lead.update({
      where: { id: leadId },
      data: { clienteStatus },
    });

    res.json({ lead: atualizado });
  } catch (err) { next(err); }
};
