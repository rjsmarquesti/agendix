const { z } = require('zod');

const STATUS_LEAD  = ['novo','contato','qualificado','proposta','agendado','convertido','perdido'];
const PRIORITY     = ['baixa','normal','alta','urgente'];
const FONTE        = ['google_maps','manual','csv_import','api'];
const ESTADOS_BR   = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const leadSchema = z.object({
  nome:        z.string().min(1, 'nome obrigatório').max(150),
  telefone:    z.string().max(20).optional().nullable(),
  telefone2:   z.string().max(20).optional().nullable(),
  email:       z.string().email('E-mail inválido').optional().nullable(),
  website:     z.string().url('URL inválida').optional().nullable(),
  origem:      z.string().max(50).optional().nullable(),
  status:      z.enum(STATUS_LEAD).optional(),
  priority:    z.enum(PRIORITY).optional(),
  fonte:       z.enum(FONTE).optional(),
  observacoes: z.string().optional().nullable(),

  // Endereço
  cep:         z.string().max(9).optional().nullable(),
  logradouro:  z.string().max(200).optional().nullable(),
  numero:      z.string().max(20).optional().nullable(),
  complemento: z.string().max(100).optional().nullable(),
  bairro:      z.string().max(100).optional().nullable(),
  cidade:      z.string().max(100).optional().nullable(),
  municipio:   z.string().max(100).optional().nullable(),
  estado:      z.enum(ESTADOS_BR).optional().nullable(),

  // Google Maps
  nicho:        z.string().max(100).optional().nullable(),
  categoria:    z.string().max(100).optional().nullable(),
  subcategoria: z.string().max(100).optional().nullable(),
  placeId:      z.string().max(255).optional().nullable(),
  rating:       z.number().min(0).max(5).optional().nullable(),
  reviewsCount: z.number().int().min(0).optional().nullable(),
});

module.exports = { leadSchema };
