module.exports = {
  LIMITE_USUARIOS:     { basico: 1,     pro: 5,    premium: Infinity, business: Infinity },
  LIMITE_AGENDAMENTOS: { basico: 100,   pro: 300,  premium: Infinity, business: Infinity },
  BOT_WHATSAPP:        { basico: false, pro: true, premium: true,     business: true },
  // 'basico' = lançamentos + saldo; 'completo' = DRE + relatórios; false = sem acesso
  MODULO_FINANCEIRO:   { basico: false, pro: 'basico', premium: 'basico', business: 'completo' },
  AGENTE_IA:           { basico: false, pro: false, premium: true, business: true },
  ATENDIMENTO_WA:      { basico: false, pro: true,  premium: true, business: true },
};
