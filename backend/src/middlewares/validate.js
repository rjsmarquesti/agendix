const { ZodError } = require('zod');

/**
 * Middleware factory para validação com Zod.
 * Uso: router.post('/', validate(meuSchema), controller)
 *
 * Retorna 422 com lista de erros se a validação falhar.
 * Passa os dados parseados/transformados em req.body se válido.
 */
function validate(schema) {
  return (req, res, next) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(422).json({
          error: 'Dados inválidos',
          detalhes: err.errors.map(e => ({ campo: e.path.join('.'), mensagem: e.message })),
        });
      }
      next(err);
    }
  };
}

module.exports = validate;
