# Manual do Usuário — Agendix
> Guia de uso do sistema · Versão 1.2

---

## 1. Acesso ao Sistema

**URL:** `https://agendix.divulgabr.com.br/login`

Preencha com seu email e senha. Se tiver **2FA ativado**, um campo de código TOTP será exibido após a senha.

> Caso não tenha login, fale com o administrador da sua conta ou cadastre-se em `/cadastro` (trial gratuito de 14 dias).

### 1.1 Esqueci minha senha

1. Clique em **Esqueci minha senha** na tela de login
2. Informe seu email
3. Acesse o link enviado para redefinir a senha
4. O link expira em 1 hora

---

## 2. Dashboard

Resumo do negócio em tempo real:

- **Total de leads** — contatos no funil
- **Agendamentos hoje** — compromissos do dia
- **Receita do mês** *(planos Pro+)* — total de receitas lançadas
- **Leads por status** — distribuição visual do funil

---

## 3. Leads

> Menu lateral: **Leads**

### 3.1 Criar lead

Clique em **+ Novo Lead** e preencha:

| Campo | Descrição |
|-------|-----------|
| Nome | Nome completo do contato |
| Telefone | WhatsApp ou telefone |
| Email | Email do lead (opcional) |
| Status | Etapa atual no funil |
| Observações | Informações adicionais |

### 3.2 Status do funil

| Status | Significado |
|--------|-------------|
| Novo | Recém cadastrado |
| Contato feito | Já houve interação inicial |
| Proposta enviada | Orçamento encaminhado |
| Fechado | Venda concluída |
| Perdido | Lead descartado |

### 3.3 Editar / Excluir lead

- **Editar:** ícone de lápis na linha do lead
- **Excluir:** ícone de lixeira (irreversível)

---

## 4. Agendamentos

> Menu lateral: **Agendamentos**

### 4.1 Visualizar

A tela exibe um **calendário** com todos os agendamentos. Alterne entre vista mensal e semanal.

### 4.2 Criar agendamento

Clique em **+ Novo Agendamento**:

| Campo | Descrição |
|-------|-----------|
| Serviço | Selecione o serviço a realizar |
| Lead | Selecione um lead cadastrado (auto-preenche nome, telefone e email) |
| Nome do cliente | Preenchido automaticamente ao selecionar lead |
| Telefone | Preenchido automaticamente |
| Data e horário | Baseado nos slots disponíveis |
| Canal | Manual / Web / WhatsApp |
| Observações | Notas internas |

### 4.3 Status dos agendamentos

| Status | Significado |
|--------|-------------|
| Agendado | Compromisso marcado |
| Realizado | Atendimento concluído |
| Cancelado | Compromisso desmarcado |
| Faltou | Cliente não compareceu |

### 4.4 Lembretes automáticos

Se configurado, o sistema envia lembretes ao cliente via WhatsApp:
- 3 dias antes
- 1 dia antes
- No dia do agendamento

---

## 5. Agenda Hoje / Agenda do Dia

> Menu lateral: **Agenda Hoje**

View simplificada com os agendamentos do dia atual em ordem cronológica.

Na **Agenda do Dia** é possível:
- Exportar a lista em **PDF**
- Enviar o PDF por **email** para o administrador

---

## 6. Serviços

> Menu lateral: **Serviços** *(apenas admins)*

Cadastre os serviços oferecidos pela empresa:

| Campo | Descrição |
|-------|-----------|
| Nome | Nome do serviço |
| Duração | Em minutos (ex: 60) |
| Preço | Valor cobrado |
| Ordem | Ordem de exibição na página pública |

---

## 7. Usuários

> Menu lateral: **Usuários** *(apenas admins)*

### 7.1 Criar usuário

Clique em **+ Novo Usuário**: nome, email, WhatsApp, senha e papel.

**Papéis:**
- **Admin** — acesso completo, incluindo configurações e usuários
- **Atendente** — acesso apenas a leads e agendamentos

> O limite de usuários depende do seu plano.

### 7.2 Ativar / Desativar

Usuários inativos não conseguem fazer login, mas os dados são preservados.

---

## 8. Financeiro

> Menu lateral: **Financeiro** *(planos Pro, Premium e Business)*

### 8.1 Lançamentos

Registre receitas e despesas vinculadas ao negócio:

| Campo | Descrição |
|-------|-----------|
| Tipo | Receita ou Despesa |
| Valor | Valor em reais |
| Descrição | Descrição do lançamento |
| Lead | Vincula a um cliente (opcional) |
| Serviço | Vincula a um serviço (opcional) |
| Data | Data do lançamento |
| Status | Pago / Pendente |

### 8.2 Dashboard Financeiro

- **Receita do mês** — total de receitas lançadas
- **Despesas do mês** — total de despesas
- **Saldo** — receitas menos despesas
- **Pendências** — valores ainda não pagos

---

## 9. Configurações

> Menu lateral: **Configurações** *(apenas admins)*

### Aba Empresa
- Nome, logo (upload ≤ 2 MB), cor primária
- Nicho de atuação
- Lembretes diretos ativados/desativados

### Aba Agenda
- Horário de funcionamento (início e fim)
- Duração padrão dos slots
- Dias úteis ativos
- Antecedência mínima de agendamento
- Datas bloqueadas (feriados, férias)
- Mensagens WhatsApp de confirmação e lembrete

### Aba Integração — WhatsApp
- Status da conexão (conectado / desconectado)
- **QR Code** para conectar o número (atualiza a cada 5 segundos)
- Badge verde ao conectar com sucesso

### Aba Bot / n8n
- Webhook URL e API token do n8n
- Ativar/desativar bot de atendimento automático

### Aba Plano
- Plano atual e vencimento
- Botão **Assinar** — abre o checkout do Mercado Pago
- Botão **Cancelar assinatura** — agendado para o fim do ciclo

### Aba Dados
- **Exportar backup** — baixa um arquivo JSON completo dos dados da empresa
- **Importar backup** — restaura a partir de um arquivo JSON (operação em transaction)

---

## 10. Página Pública de Agendamento

Cada empresa tem uma página pública sem necessidade de login:

```
https://agendix.divulgabr.com.br/agendar/SEU-SLUG
```

O cliente percorre 4 etapas:
1. Seleciona o serviço
2. Escolhe a data no calendário
3. Escolhe o horário disponível
4. Preenche nome, telefone e email → confirma

O sistema valida a disponibilidade em tempo real e envia confirmação por WhatsApp (se configurado).

---

## 11. Perguntas Frequentes

**Esqueci minha senha.**
Acesse `/esqueci-senha` e informe seu email. Um link de redefinição será enviado.

**Não consigo acessar determinados menus.**
Depende do seu papel (admin ou atendente) e do plano contratado. Fale com seu administrador.

**O limite de agendamentos foi atingido.**
O sistema bloqueia novos agendamentos (via painel e página pública) quando o limite do mês é atingido. Faça upgrade do plano nas Configurações → Aba Plano.

**Como conectar o WhatsApp?**
Acesse Configurações → Integração → clique em **Conectar** e escaneie o QR Code com o WhatsApp do número da empresa.

**Como configurar horários bloqueados?**
Acesse Configurações → Agenda → seção Bloqueios. Adicione datas específicas ou intervalos.

---

*Para suporte, entre em contato: suporte@divulgabr.com.br*
