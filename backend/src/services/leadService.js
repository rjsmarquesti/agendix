const prisma = require('../lib/prisma');

const CAMPOS_ENDERECO = ['cep','logradouro','numero','complemento','bairro','cidade','municipio','estado'];
const CAMPOS_MAPS     = ['nicho','categoria','subcategoria','googleMapsUrl','placeId','rating','reviewsCount','website','facebook','instagram','telegram','especialidades'];
const CAMPOS_FUNIL    = ['ultimoContato','proximoContato'];

/**
 * Filtra campos do body e retorna apenas os presentes (undefined = não sobrescreve).
 */
function extrairCampos(body, lista) {
  return Object.fromEntries(
    lista
      .map(k => [k, body[k] !== undefined ? body[k] || null : undefined])
      .filter(([, v]) => v !== undefined)
  );
}

/**
 * Monta o objeto de dados para criação/atualização de lead a partir do body da requisição.
 */
function montarDadosLead(body) {
  const { nome, telefone, telefone2, email, website, origem, status, priority, fonte, observacoes } = body;
  return {
    nome,
    telefone:    telefone    || null,
    telefone2:   telefone2   || null,
    email:       email       || null,
    website:     website     || null,
    origem:      origem      || null,
    status:      status      || 'novo',
    priority:    priority    || 'normal',
    fonte:       fonte       || 'manual',
    observacoes: observacoes || null,
    ...extrairCampos(body, CAMPOS_ENDERECO),
    ...extrairCampos(body, CAMPOS_MAPS),
    ...extrairCampos(body, CAMPOS_FUNIL),
  };
}

/**
 * Monta dados de um item para importação em lote (Google Maps / CSV).
 * Normaliza estado para 2 letras maiúsculas.
 */
function montarDadosImportacao(item) {
  return {
    nome:          item.nome,
    telefone:      item.telefone      || null,
    telefone2:     item.telefone2     || null,
    email:         item.email         || null,
    website:       item.website       || null,
    origem:        item.origem        || 'Google Maps',
    status:        item.status        || 'novo',
    priority:      item.priority      || 'normal',
    fonte:         item.fonte         || 'google_maps',
    observacoes:   item.observacoes   || null,
    cep:           item.cep           || null,
    logradouro:    item.logradouro    || null,
    numero:        item.numero        || null,
    complemento:   item.complemento   || null,
    bairro:        item.bairro        || null,
    cidade:        item.cidade        || null,
    municipio:     item.municipio     || null,
    estado:        item.estado ? item.estado.toUpperCase().slice(0, 2) : null,
    nicho:         item.nicho         || null,
    categoria:     item.categoria     || null,
    subcategoria:  item.subcategoria  || null,
    googleMapsUrl: item.googleMapsUrl || item.google_maps_url || null,
    placeId:       item.placeId       || item.place_id        || null,
    rating:        item.rating        ? Number(item.rating)   : null,
    reviewsCount:  item.reviewsCount  ? Number(item.reviewsCount) : 0,
    facebook:      item.facebook      || null,
    instagram:     item.instagram     || null,
    telegram:      item.telegram      || null,
    especialidades: item.especialidades || null,
  };
}

/**
 * Importa uma lista de leads em lote para um tenant.
 * Ignora duplicatas (placeId único por tenant) e retorna contagens.
 */
async function importarLote(tenantId, lista) {
  let inseridos = 0, ignorados = 0;
  const erros = [];

  for (const item of lista) {
    if (!item.nome || !item.estado || !item.nicho) {
      erros.push({ item: item.nome || '?', erro: 'nome, estado e nicho são obrigatórios' });
      continue;
    }
    try {
      await prisma.lead.create({ data: { tenantId, ...montarDadosImportacao(item) } });
      inseridos++;
    } catch (e) {
      if (e.code === 'P2002') { ignorados++; }
      else erros.push({ item: item.nome, erro: e.message });
    }
  }

  return { inseridos, ignorados, erros };
}

module.exports = { montarDadosLead, montarDadosImportacao, importarLote, extrairCampos };
