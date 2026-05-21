# Manual do Administrador — Agendix
> Painel Super Admin · Versão 1.2

---

## 1. Acesso ao Painel

**URL:** `https://agendix.divulgabr.com.br/admin/login`

| Campo | Valor |
|-------|-------|
| Email | suporte@divulgabr.com.br |
| Senha | *(configurada no seed — altere após o primeiro acesso)* |

> O painel `/admin` é isolado do login dos tenants. Credenciais não se misturam.

---

## 2. Dashboard

Tela inicial com visão consolidada da plataforma:

- **Total de tenants** — empresas cadastradas
- **Ativos / Trial / Inadimplentes** — distribuição por status de plano
- **MRR estimado** — receita recorrente mensal
- **Clientes recentes** — últimos cadastrados com plano e status

---

## 3. Gerenciar Clientes (`/admin/clientes`)

### 3.1 Criar novo tenant

Clique em **+ Novo Cliente** e preencha:

| Campo | Descrição |
|-------|-----------|
| Nome da empresa | Nome exibido no CRM do cliente |
| Slug | Identificador único na URL (ex: `clinica-silva`) |
| Plano | Básico / Pro / Premium / Business |
| Cor primária | Hex da marca (ex: `#2563eb`) |
| Ativo | Se o cliente pode fazer login imediatamente |

Após criar, o sistema provisiona automaticamente a instância WhatsApp (Evolution API) se o tenant tiver plano com Bot WA.

### 3.2 Editar tenant

Clique no **lápis**. Campos disponíveis para edição incluem nome, slug, plano, cor, email e telefone de contato.

### 3.3 Upgrade / Downgrade de plano

- **Upgrade:** abre o checkout do Mercado Pago em nova aba; o plano é atualizado automaticamente pelo webhook após o pagamento.
- **Downgrade:** agendado para o fim do ciclo atual. Um badge amarelo aparece na listagem indicando o plano que entrará na próxima renovação. Para cancelar o downgrade, clique no badge.

### 3.4 Ativar / Desativar tenant

No modal de edição, desmaque **Ativo** para bloquear todos os usuários daquele tenant. Os dados são preservados.

### 3.5 Deletar tenant

Ação irreversível. Remove o tenant e todos os dados vinculados. Confirme com cuidado.

---

## 4. Gerenciar Usuários dos Tenants

### 4.1 Criar usuário

1. Na tabela de clientes, clique no ícone **pessoa+**
2. Preencha nome, email, WhatsApp, senha e papel

**Papéis:**

| Papel | Permissões |
|-------|-----------|
| `admin` | Acesso total ao CRM, usuários e configurações |
| `atendente` | Acesso apenas a leads e agendamentos |

> O backend valida o limite de usuários do plano antes de criar.

### 4.2 Editar usuário

Clique em **Editar** na linha do usuário (dentro do modal de detalhes do tenant). Permite alterar nome, email, WhatsApp, papel e status ativo/inativo.

### 4.3 Resetar senha de usuário

1. Abra o modal de detalhes do tenant (ícone **olho**)
2. Na lista de usuários, clique em **Enviar link de reset**
3. O sistema envia um email de redefinição ao endereço cadastrado

---

## 5. WhatsApp & n8n por Tenant

Na coluna de ações do tenant, há botões específicos para integração:

- **QR Code WA** — exibe o QR Code para conectar o número WhatsApp da instância do tenant
- **Status WA** — mostra se a instância está conectada
- **Ativar n8n** — ao marcar `n8nAtivo`, o sistema provisiona automaticamente os workflows de automação (bot WA + lembretes) no n8n

> Após provisionar o n8n, oriente o tenant a configurar o webhook URL e API token na aba **Bot/n8n** das configurações.

---

## 6. Financeiro da Plataforma (`/admin/financeiro`)

### 6.1 Dashboard Financeiro

- **MRR** — receita recorrente mensal somada dos planos ativos
- **Tabela de pagamentos** — histórico de assinaturas por tenant com valor, status e data

### 6.2 Lançamentos (`/admin/financeiro/lancamentos`)

CRUD de lançamentos da plataforma (custos de servidor, despesas operacionais, receitas extras). Filtros por tipo, categoria e período.

### 6.3 Fluxo de Caixa (`/admin/financeiro/fluxo-caixa`)

Gráfico de barras com 12 meses de receitas e despesas + tabela acumulada mês a mês.

---

## 7. Backups (`/admin/backups`)

| Ação | Descrição |
|------|-----------|
| **Criar backup** | Gera um arquivo JSON completo (admin ou por tenant) |
| **Baixar** | Download autenticado do arquivo JSON |
| **Restaurar** | Aplica o backup em transaction completa |
| **Excluir** | Remove o arquivo do volume |

> Backups ficam no volume `agendix-backups` (`/app/backups` no container).

---

## 8. Consumo de Recursos (`/admin/consumo`)

Barras de progresso mostrando uso vs. limite do plano para cada tenant:
- **Agendamentos no mês** vs. limite do plano
- **Usuários cadastrados** vs. limite do plano

Útil para identificar tenants próximos do limite e sugerir upgrade.

---

## 9. Logs de Auditoria (`/admin/logs`)

Registro de todas as ações críticas do sistema. Filtros por:
- **Ação** — login, tenant_criado, backup_criado, plano_alterado, etc.
- **Tenant** — filtrar por empresa específica
- **Período** — data início e fim

Clique em uma linha para expandir os detalhes JSON da ação.

**Ações auditadas:**
`login`, `tenant_criado`, `tenant_deletado`, `backup_criado`, `backup_restaurado`, `plano_alterado`, `senha_resetada_admin`, `assinatura_ativa`, `assinatura_cancelada`, `assinatura_inadimplente`

---

## 10. Planos e Limites

| Plano | Preço | Agend./mês | Usuários | Bot WA | Financeiro |
|-------|-------|-----------|----------|--------|-----------|
| Trial | grátis 14d | 60 | 1 | ❌ | ❌ |
| Básico | R$ 37/mês | 60 | 1 | ❌ | ❌ |
| Pro | R$ 57/mês | 300 | 5 | ✅ | básico |
| Premium | R$ 97/mês | ∞ | ∞ | ✅ + Agente IA | básico |
| Business | R$ 127/mês | ∞ | ∞ | ✅ + Agente IA | completo |

---

## 11. Boas Práticas

- Crie um usuário `admin` para cada tenant imediatamente após criar a empresa
- Use slugs curtos e sem espaços (ex: `clinica-silva`, `salao-ana`)
- Para bloquear acesso temporário, desative o tenant em vez de deletar
- Antes de restaurar um backup, faça um novo backup do estado atual
- Monitore a tela de Consumo semanalmente para antecipar upgrades

---

*Agendix · Suporte: suporte@divulgabr.com.br*
