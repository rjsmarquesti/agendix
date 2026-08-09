module.exports = {
  LIMITE_USUARIOS:     { solo: 1,             pro: 5,          business: Infinity, trial: 5          },
  LIMITE_AGENDAMENTOS: { solo: Infinity,       pro: Infinity,   business: Infinity, trial: Infinity   },
  // false = sem bot; 'confirmacao' = só envia confirmação de agendamento; 'completo' = fluxo conversacional
  BOT_WHATSAPP:        { solo: 'confirmacao', pro: 'completo', business: 'completo', trial: 'completo' },
  // false = sem acesso; 'basico' = lançamentos + saldo; 'completo' = DRE + relatórios
  MODULO_FINANCEIRO:   { solo: false,         pro: 'basico',   business: 'completo', trial: 'basico'  },
  AGENTE_IA:           { solo: false,         pro: true,       business: true,       trial: true       },
  ATENDIMENTO_WA:      { solo: false,         pro: true,       business: true,       trial: true       },
};
