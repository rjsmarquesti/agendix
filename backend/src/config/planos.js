module.exports = {
  LIMITE_USUARIOS:     { solo: 1,             pro: 5,          business: Infinity, trial: 3          },
  LIMITE_AGENDAMENTOS: { solo: 100,           pro: Infinity,   business: Infinity, trial: 100        },
  // false = sem bot; 'confirmacao' = só envia confirmação de agendamento; 'completo' = fluxo conversacional
  BOT_WHATSAPP:        { solo: 'confirmacao', pro: 'completo', business: 'completo', trial: 'completo' },
  // false = sem acesso; 'basico' = lançamentos + saldo; 'completo' = DRE + relatórios
  MODULO_FINANCEIRO:   { solo: false,         pro: 'basico',   business: 'completo', trial: 'basico'  },
  AGENTE_IA:           { solo: false,         pro: false,      business: true,       trial: false      },
  ATENDIMENTO_WA:      { solo: false,         pro: true,       business: true,       trial: true       },
};
