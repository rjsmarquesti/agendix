# Skill: Safe Development

Fluxo obrigatório para qualquer modificação de código no Agendix:

1. **Ler antes de modificar** — leia o arquivo completo e os arquivos relacionados (rotas, controller, schema) antes de editar qualquer coisa
2. **Verificar auth** — se a modificação envolve rota nova ou alterada, confirmar que `authenticateToken` + middleware de role está presente
3. **Verificar tenant isolation** — queries de tenant devem sempre filtrar por `tenantId`; nunca retornar dados de outros tenants
4. **Verificar plano** — se a feature é restrita por plano, verificar guard em `planos.js` no backend E no frontend
5. **Checar sintaxe** — após editar arquivos `.js` do backend, rodar `node --check [arquivo]` para garantir zero erros de sintaxe
6. **Não deixar estado quebrado** — se a implementação está incompleta, avisar o usuário antes de parar; nunca salvar código que quebra o servidor
7. **Credenciais** — toda chave de API, senha ou token DEVE vir de variável de ambiente; jamais hardcodar
