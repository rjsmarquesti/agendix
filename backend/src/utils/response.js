/**
 * Utilitários para padronizar respostas da API.
 * Uso: const { success, error, paginated } = require('../utils/response');
 */

function success(res, data, status = 200) {
  return res.status(status).json(data);
}

function error(res, message, status = 400) {
  return res.status(status).json({ error: message });
}

function paginated(res, data, total, page, limit) {
  return res.json({ data, total, page: Number(page), limit: Number(limit) });
}

module.exports = { success, error, paginated };
