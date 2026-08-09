# Manual do Administrador do Sistema — Agendix

> **Nível de acesso:** Super Admin  
> **Painel:** `/admin` — exclusivo para a equipe interna da Agendix  
> Acesso via login com role `superadmin`.

---

## 1. Visão Geral

O painel de super admin gerencia todos os tenants (clientes) da plataforma. Aqui você cria contas, define planos, ativa módulos por nicho, monitora uso e faz manutenção operacional.

---

## 2. Gestão de Clientes (Tenants)

### 2.1 Criar novo cliente

1. Acesse **Admin → Clientes**
2. Clique em **Novo cliente**
3. Preencha os campos obrigatórios:

| Campo | Descrição |
|---|---|
| **Nome** | Nome da empresa/profissional |
| **Slug** | Identificador único na URL (ex: `clinica-ana`) — sem espaços ou acentos |
| **E-mail** | E-mail de contato do tenant |
| **Plano** | `Solo`, `Pro` ou `Business` |
| **Status do plano** | `Trial`, `Ativo`, `Inadimplente`, `Cancelado` |
| **Nicho** | Segmento da empresa — define módulos extras automaticamente |
| **Tipo de negócio** | Subnicho (aparece após selecionar o nicho) |

4. Ao selecionar o **nicho**, os módulos extras são marcados automaticamente:
   - Beleza e Estética → Fichas + Anamnese
   - Saúde e Bem-estar → Prontuários + Anamnese
   - Fitness → Fichas + Anamnese
   - Pet → Fichas + Anamnese
   - Automotivo → Orçamentos
   - Serviços Técnicos Residenciais → Orçamentos
   - Serviços Profissionais → Documentos
5. Você pode **marcar/desmarcar módulos manualmente** sobrescrevendo a seleção automática
6. Clique em **Salvar**

### 2.2 Criar usuário administrador do tenant

Após criar o tenant:

1. Localize o cliente na lista → clique no ícone **Usuário**
2. Preencha nome, e-mail e senha provisória
3. Role: `admin`
4. Salvar — o tenant já pode fazer login

### 2.3 Editar cliente existente

1. Clique no ícone **Editar** (lápis)
2. Qualquer campo pode ser alterado, incluindo plano e módulos
3. Ao trocar de nicho, os módulos são recalculados automaticamente; ajuste manualmente se necessário
4. Salvar

### 2.4 Ativar / Desativar

- Botão de toggle na lista desativa o tenant sem excluir dados
- Tenant desativado não consegue fazer login

---

## 3. Planos e Cobrança

### 3.1 Alterar plano manualmente

1. No card do tenant → clique no ícone de **plano** (cifrão)
2. Selecione o novo plano: `Solo`, `Pro` ou `Business`
3. Confirmar — o sistema registra a mudança no log de auditoria

### 3.2 Tabela de limites por plano

| Recurso | Solo | Pro | Business |
|---|---|---|---|
| Agendamentos/mês | 100 | 500 | Ilimitado |
| Usuários | 2 | 5 | 15 |
| WhatsApp Bot | ❌ | ✅ | ✅ |
| Atendimento WA | ❌ | ✅ | ✅ |
| Agente IA | ❌ | ✅ | ✅ |
| Relatórios avançados | ❌ | ✅ | ✅ |

### 3.3 Status do plano

| Status | Comportamento |
|---|---|
| `trial` | Acesso completo por período determinado |
| `ativo` | Assinatura paga e vigente |
| `inadimplente` | Login permitido, funcionalidades bloqueadas |
| `aguardando_pagamento` | Processamento em andamento |
| `cancelado` | Acesso negado |

---

## 4. WhatsApp — Instância Evolution API

### 4.1 Criar instância

1. No card do tenant → ícone **WhatsApp** (verde)
2. Clique em **Criar instância**
3. O sistema registra a instância na Evolution API e gera o QR Code
4. O tenant escaneia o QR code em **Configurações → WhatsApp** no painel deles

### 4.2 Verificar status

- No card do tenant aparece o status atual: `Conectado`, `Desconectado`, `Sem instância`
- Clique no ícone WA para ver detalhes e forçar reconexão se necessário

### 4.3 Diagnóstico de falha 403

Se a criação de instância retornar erro 403, significa que a instância já existe na Evolution API com outro estado. O sistema automaticamente:
1. Tenta deletar a instância anterior usando a API key do tenant (ou a global como fallback)
2. Recria a instância limpa

---

## 5. Atendimento WhatsApp (módulo Pro/Business)

O módulo **Atendimento WA** transforma o WhatsApp do tenant em uma central de atendimento com fila e distribuição automática. Como admin do sistema você:

- Confirma que o tenant tem plano `Pro` ou `Business` (trial também tem acesso)
- Verifica se a instância Evolution está conectada
- Monitora o painel de consumo para alertas de volume

Configuração interna do módulo é feita pelo **admin do tenant** (ver manual correspondente).

---

## 6. Financeiro Administrativo

Em **Admin → Financeiro** você visualiza:
- Receita total por período
- Distribuição por plano
- Tenants inadimplentes
- Histórico de pagamentos via Mercado Pago

---

## 7. Logs e Monitoramento

**Admin → Logs** exibe:
- Requisições com erro (4xx, 5xx)
- Ações administrativas (criação de tenant, troca de plano)
- Webhooks recebidos

**Admin → Consumo**:
- Agendamentos por tenant no mês
- Mensagens WA enviadas
- Alertas de limite próximo

---

## 8. Backups

**Admin → Backups** — executa dump do banco de dados PostgreSQL manualmente ou agenda via cron. Armazenado localmente em `/backups/`.

---

## 9. Checklist de onboarding de novo tenant

```
[ ] 1. Criar tenant com slug único
[ ] 2. Definir nicho e subnicho
[ ] 3. Confirmar módulos extras marcados corretamente
[ ] 4. Criar usuário admin com senha provisória
[ ] 5. Definir plano e data de vencimento
[ ] 6. Criar instância WhatsApp (se plano Pro/Business)
[ ] 7. Passar credenciais ao cliente
[ ] 8. Orientar o cliente a trocar a senha no primeiro login
[ ] 9. Orientar a escanear o QR Code do WhatsApp
```

---

## 10. Campos de endereço e dados fiscais

Disponíveis na edição do tenant para emissão de nota fiscal / contrato:
`CNPJ / CPF`, `Razão Social`, `Logradouro`, `Número`, `Complemento`, `Bairro`, `Cidade`, `Estado`, `CEP`

---

*Versão do documento: 1.0 — Agendix v1.5.x*
