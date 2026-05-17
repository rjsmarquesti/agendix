# Skill: Code Review

Checklist de revisão para o Agendix. Aplicar aos arquivos alterados na sessão.

## Categorias de análise

### 🔴 CRITICAL (bloqueia — deve ser corrigido antes de continuar)
- Auth guard ausente em rota de tenant ou admin
- Credencial, API key ou senha hardcoded no código
- Query sem filtro por `tenantId` em operação de tenant
- Input de usuário usado em `prisma.$queryRaw` sem sanitização
- Senha ou token retornado em resposta de API

### 🟡 WARNING (deve ser corrigido, mas não bloqueia imediatamente)
- Lógica de negócio colocada diretamente na rota (deveria estar no controller)
- Guard de plano aplicado só no frontend e não no backend
- Variável de ambiente usada sem fallback ou validação de presença
- Error handling genérico que pode expor stack trace ao cliente

### 🔵 INFO (sugestão de melhoria, opcional)
- Código duplicado que poderia ser extraído para utilitário
- Nome de variável pouco descritivo
- Comentário ausente em lógica não-óbvia

## Formato do report

```
Arquivo: [caminho/arquivo.js]
Linha [N]: [CRITICAL|WARNING|INFO] — [descrição do problema]
Sugestão: [correção concreta]
```

Se nenhum finding: "LGTM — sem violações encontradas nos arquivos revisados."
