const { z } = require('zod');

const DATA_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const HORA_REGEX = /^\d{2}:\d{2}$/;

const agendamentoSchema = z.object({
  lead_id:     z.number({ required_error: 'lead_id obrigatório' }).int().positive(),
  data:        z.string().regex(DATA_REGEX, 'Data deve estar no formato YYYY-MM-DD'),
  hora:        z.string().regex(HORA_REGEX, 'Hora deve estar no formato HH:MM'),
  tipo:        z.string().max(100).optional(),
  status:      z.enum(['marcado','confirmado','cancelado','realizado']).optional(),
  observacoes: z.string().optional().nullable(),
  servicoId:   z.number().int().positive().optional().nullable(),
});

const agendamentoPublicoSchema = z.object({
  nome:        z.string().min(1, 'nome obrigatório').max(150),
  telefone:    z.string().min(10, 'Telefone inválido').max(20),
  email:       z.string().email('E-mail inválido').optional().nullable(),
  data:        z.string().regex(DATA_REGEX, 'Data deve estar no formato YYYY-MM-DD'),
  hora:        z.string().regex(HORA_REGEX, 'Hora deve estar no formato HH:MM'),
  tipo:        z.string().max(100).optional(),
  servicoId:   z.number().int().positive().optional().nullable(),
  observacoes: z.string().optional().nullable(),
});

module.exports = { agendamentoSchema, agendamentoPublicoSchema };
