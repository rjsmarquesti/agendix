# Manual do Administrador do Tenant — Agendix

> **Nível de acesso:** Admin da empresa  
> **Painel:** `/` — painel principal do Agendix  
> Acesso via login com role `admin` dentro do seu tenant.

---

## 1. Visão Geral

Como administrador do tenant você configura e opera toda a plataforma para a sua empresa. Você tem acesso a todos os módulos contratados, pode gerenciar usuários, personalizar a aparência, configurar o WhatsApp e gerar relatórios.

---

## 2. Configurações Iniciais

### 2.1 Personalização da empresa

**Menu → Configurações → Geral**

| Campo | Descrição |
|---|---|
| **Nome da empresa** | Aparece em PDFs, e-mails e no formulário público |
| **Logo** | Upload de imagem (PNG/JPG, máx. 2 MB) — aparece no cabeçalho dos PDFs |
| **Cor primária** | Cor dos botões, cabeçalhos de PDF e detalhes visuais |
| **Telefone / E-mail** | Exibidos no cabeçalho dos documentos PDF |
| **Cidade / Estado** | Exibidos no rodapé dos PDFs |

> ⚠️ Logo e dados completos melhoram muito a aparência dos PDFs exportados. Configure antes de começar a usar.

### 2.2 Horários de atendimento

**Configurações → Horários**

- Defina os dias da semana e horários de abertura/fechamento
- Intervalos de almoço e breaks podem ser configurados
- Feriados bloqueados manualmente em **Agenda → Bloqueios**

### 2.3 Serviços oferecidos

**Menu → Serviços**

1. Clique em **Novo serviço**
2. Preencha: nome, duração (minutos), valor, descrição
3. Cada serviço aparece no formulário público de agendamento

---

## 3. Gestão de Usuários

**Configurações → Usuários**

### Papéis disponíveis

| Role | O que pode fazer |
|---|---|
| `admin` | Acesso total — configurações, relatórios, todos os módulos |
| `atendente` | Agenda, leads, atendimento WA — sem acesso a configurações e financeiro |

### Criar usuário

1. **Novo usuário** → nome, e-mail, WhatsApp, senha, role
2. O usuário recebe e-mail de boas-vindas (se SMTP configurado)
3. Pode trocar a própria senha em **Meu Perfil**

---

## 4. Módulo: Atendimento WhatsApp

> **Requer:** Plano Pro ou Business + WhatsApp conectado

O Atendimento WA transforma seu WhatsApp em uma central com fila e distribuição automática para atendentes humanos.

### 4.1 Conectar o WhatsApp

1. **Configurações → WhatsApp**
2. Clique em **Gerar QR Code**
3. Abra o WhatsApp no celular → **Dispositivos conectados → Conectar dispositivo**
4. Escaneie o QR Code exibido na tela
5. Aguarde confirmar `Conectado` (ícone verde)

> ⚠️ Use um número de WhatsApp **exclusivo** para a empresa. Não use número pessoal — o número ficará vinculado ao sistema.

### 4.2 Cadastrar atendentes

**Menu → Atendimento WA → aba Atendentes**

1. Clique em **Novo atendente**
2. Preencha:
   - **Nome:** nome de exibição na fila
   - **Telefone:** número WhatsApp do atendente (com DDI: `5561999990000`)
   - **Carga máxima:** quantos atendimentos simultâneos este atendente aceita (padrão: 5)
3. Salvar

> O atendente será acionado automaticamente quando uma conversa entrar na fila.

### 4.3 Como funciona a fila

```
Cliente envia mensagem no WA da empresa
         ↓
Sistema cria sessão na fila (status: Aguardando)
         ↓
Distribuído ao atendente com menor carga
         ↓
Atendente recebe notificação no WhatsApp pessoal
         ↓
Atendimento realizado diretamente pelo WA do atendente
         ↓
Sessão encerrada (status: Encerrado)
```

### 4.4 Acompanhar a fila

**Menu → Atendimento WA → aba Fila**

- Lista todas as conversas ativas com status e atendente responsável
- Clique em uma conversa para ver o histórico de mensagens
- **Status possíveis:** Aguardando · Em atendimento · Encerrado · Abandonado

### 4.5 Dashboard de atendimento

**Menu → Atendimento WA → aba Dashboard**

Métricas em tempo real:
- Total de atendimentos no dia/semana/mês
- Tempo médio de espera
- Atendimentos por atendente
- Taxa de abandono

### 4.6 Histórico

**Menu → Atendimento WA → aba Histórico**

- Busca por cliente ou período
- Exportar conversas em PDF (em desenvolvimento)

---

## 5. Módulo: Ficha de Cliente

> **Disponível para:** Beleza e Estética, Saúde, Fitness, Pet

A Ficha de Cliente é o prontuário básico do seu cliente. Contém dados pessoais e informações específicas do seu nicho.

### 5.1 Criar ficha

**Menu → Fichas** (ou o nome específico do seu nicho: "Ficha do Animal", "Ficha do Aluno", etc.)

1. Clique em **Nova ficha**
2. Preencha os **dados básicos:** nome, telefone, e-mail
3. Preencha os **campos do nicho** (variam conforme sua área):

| Nicho | Campos extras |
|---|---|
| Beleza e Estética | Fototipo Fitzpatrick, condições de pele, alergias, procedimentos anteriores, produtos em uso |
| Saúde | Convênio, nº carteirinha, profissão, estado civil, contato de emergência |
| Fitness | Peso, altura, IMC, % gordura, massa magra, objetivo, nível de atividade |
| Pet | Espécie, raça, sexo, castrado, peso, pelagem, microchip, nome do tutor |

4. Observações livres no campo final
5. Salvar

### 5.2 Visualizar e imprimir

1. Clique no ícone de **olho** na ficha desejada
2. Revise todas as informações
3. Clique em **Exportar PDF** para baixar o documento profissional com:
   - Cabeçalho com logo e dados da empresa
   - Dados do cliente organizados por seção
   - Campos específicos do nicho
   - Campo de assinatura do profissional e do cliente
   - Rodapé com data de emissão

### 5.3 Vincular ficha a um lead

Na criação ou edição da ficha, selecione o lead correspondente no campo **Vincular a Lead**. Isso une o histórico de agendamentos com a ficha clínica.

---

## 6. Módulo: Anamnese

> **Disponível para:** Beleza e Estética, Saúde, Fitness, Pet

A anamnese é o questionário de saúde e pré-atendimento preenchido antes de cada procedimento. Diferente da ficha (cadastro permanente), a anamnese pode ser repetida a cada sessão.

### 6.1 Criar anamnese

**Menu → Anamnese** (ou "Triagem", "Avaliação" conforme o nicho)

1. Clique em **Nova anamnese**
2. Informe o **nome do cliente**
3. Vincule a uma **ficha existente** (opcional, mas recomendado)
4. Responda o **questionário específico do nicho:**

| Nicho | Perguntas principais |
|---|---|
| Beleza e Estética | Gestante/lactante, medicamentos em uso, fotossensibilidade, queloides, rosácea/acne, contraindicações |
| Saúde | Queixa principal, histórico clínico, medicamentos, alergias, cirurgias, histórico familiar, hábitos |
| Fitness | Problemas cardiovasculares, pressão arterial, diabetes, fumante, lesões, frequência de exercício |
| Pet | Vacinas em dia, vermifugação, doenças anteriores, alimentação, alergias, comportamento, queixa atual |

5. Observações do profissional no campo final
6. Salvar

### 6.2 Exportar PDF

1. Clique no ícone de **olho** na anamnese
2. Clique em **Exportar PDF** — o documento inclui:
   - Cabeçalho com logo e dados da empresa
   - Identificação do cliente e ficha vinculada
   - Todas as respostas do questionário
   - Declaração de veracidade das informações
   - Campo de assinatura do cliente
   - Rodapé com data de emissão

> 💡 **Boa prática:** Imprima a anamnese, peça ao cliente assinar e arquive. Em procedimentos estéticos e de saúde, isso tem valor legal.

### 6.3 Diferença: Ficha × Anamnese

| | Ficha | Anamnese |
|---|---|---|
| **Frequência** | Uma vez por cliente | Por sessão/procedimento |
| **Conteúdo** | Cadastro e dados fixos | Questionário de saúde e pré-atendimento |
| **Assinatura** | Profissional + cliente | Cliente (declaração de veracidade) |

---

## 7. Módulo: Orçamentos

> **Disponível para:** Automotivo, Serviços Técnicos Residenciais

O módulo de Orçamentos permite criar propostas profissionais com itens, valores e prazo de validade.

### 7.1 Criar orçamento

**Menu → Orçamentos**

1. Clique em **Novo orçamento**
2. Preencha:
   - **Cliente:** nome e telefone
   - **Descrição do serviço:** resumo do que será feito
   - **Itens:** adicione cada item com descrição, quantidade e valor unitário
   - **Válido até:** prazo de validade da proposta
   - **Observações:** condições, garantias, prazo de execução
3. O **total é calculado automaticamente**
4. O status inicial é **Rascunho** — o orçamento ainda não foi enviado ao cliente
5. Salvar — número sequencial gerado automaticamente (`ORC-2026-0001`)

### 7.2 Fluxo de status

```
Rascunho → Enviado → Aprovado
                  ↘ Recusado
                  ↘ Expirado (prazo venceu)
```

Para alterar o status:
1. Abra o orçamento (ícone olho)
2. Na seção **Alterar status**, clique no novo status desejado

### 7.3 Exportar PDF do orçamento

1. Abra o orçamento (ícone olho)
2. Clique em **Exportar PDF** — o documento inclui:
   - Cabeçalho com logo e dados da empresa
   - Dados do cliente e número do orçamento
   - Tabela detalhada de itens com quantidade, valor unitário e subtotal
   - **Bloco de total destacado** com a cor da empresa
   - Condições gerais
   - Campo de assinatura (para orçamentos Enviados ou Aprovados)
   - Rodapé com data de emissão e número de página

### 7.4 Boas práticas

- Sempre defina um **prazo de validade** (ex: 7 ou 15 dias)
- Após aprovação do cliente, mude o status para **Aprovado** para rastreabilidade
- Use o campo observações para registrar condições de pagamento e garantia

---

## 8. Leads e Agendamentos

### 8.1 Leads

**Menu → Leads** — lista de contatos que demonstraram interesse.

- Capture leads pelo formulário público (`seusite.agendix.com.br/agendar`)
- Status de funil: `novo → contato → negociação → convertido → perdido`
- Vincule leads a fichas, anamneses e orçamentos

### 8.2 Agendamentos

**Menu → Agenda** — calendário com todos os agendamentos.

- Clique em um horário para criar agendamento manual
- Clientes podem agendar pelo link público
- Notificações automáticas por WhatsApp (se conectado)

---

## 9. Financeiro

**Menu → Financeiro**

- Registro de receitas e despesas por agendamento
- Relatórios por período
- Exportação para planilha

---

## 10. Dashboard

**Menu → Dashboard** — visão geral do negócio:
- Agendamentos do dia/semana
- Taxa de ocupação
- Receita do mês
- Leads novos

---

*Versão do documento: 1.0 — Agendix v1.5.x*
