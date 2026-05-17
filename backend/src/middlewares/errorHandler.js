module.exports = (err, req, res, next) => {
  console.error('[Erro]', err.message);
  // Nunca propagar 401 de APIs externas — causaria logout indevido no frontend
  const status = err.status === 401 ? 502 : (err.status || 500);
  res.status(status).json({ error: err.message || 'Erro interno do servidor' });
};
