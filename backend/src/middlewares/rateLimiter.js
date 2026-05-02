const rateLimit = require('express-rate-limit');

const mensagemPadrao = (limite) =>
  `Muitas requisições. Limite: ${limite} por minuto. Tente novamente em breve.`;

// Rotas de login — proteção contra brute force
const loginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: mensagemPadrao(10) },
});

// Agendamento público — proteção contra abuso
const agendamentoPublicoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: mensagemPadrao(20) },
});

// Rotas n8n — tolerância alta (automação legítima)
const n8nLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: mensagemPadrao(200) },
});

// Rotas gerais da API — proteção base
const apiGeralLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: mensagemPadrao(300) },
});

module.exports = { loginLimiter, agendamentoPublicoLimiter, n8nLimiter, apiGeralLimiter };
