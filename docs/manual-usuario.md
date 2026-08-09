# Manual do Usuário (Atendente / Operador) — Agendix

> **Nível de acesso:** Atendente  
> **Painel:** `/` — painel principal do Agendix  
> Acesso via login com role `atendente`.

---

## 1. O que você pode fazer

Como atendente você opera o dia a dia da empresa: registra agendamentos, atende clientes pelo WhatsApp, cria fichas, anamneses e orçamentos. Você **não tem acesso** a configurações da empresa, usuários, financeiro ou relatórios avançados.

---

## 2. Primeiro acesso

1. Acesse o link fornecido pelo administrador da empresa
2. Insira o e-mail e a senha provisória
3. **Troque a senha imediatamente** em **Meu Perfil → Alterar senha**
4. Familiarize-se com o menu lateral — os módulos disponíveis dependem do nicho da empresa

---

## 3. Agenda e Agendamentos

### 3.1 Ver a agenda do dia

**Menu → Agenda**

- A visualização padrão mostra o dia atual
- Use os botões de navegação (← →) para avançar ou recuar dias
- Clique em um agendamento para ver os detalhes do cliente e serviço

### 3.2 Criar agendamento manual

1. Clique em um horário vago no calendário **ou** clique em **Novo agendamento**
2. Preencha:
   - **Cliente:** nome (ou busque um lead existente)
   - **Serviço:** selecione da lista cadastrada pelo admin
   - **Data e hora**
   - **Observações** (opcional)
3. Salvar — o cliente recebe confirmação via WhatsApp (se conectado)

### 3.3 Status de agendamento

| Status | Significado |
|---|---|
| `confirmado` | Agendado e confirmado |
| `pendente` | Aguardando confirmação do cliente |
| `concluído` | Atendimento realizado |
| `cancelado` | Cancelado pelo cliente ou empresa |
| `faltou` | Cliente não compareceu |

Para alterar o status, abra o agendamento e clique no status desejado.

---

## 4. Leads

**Menu → Leads**

### 4.1 O que é um lead

É qualquer pessoa que entrou em contato ou se cadastrou pelo formulário público, mas ainda não é necessariamente um cliente ativo.

### 4.2 Trabalhar com leads

1. A lista mostra todos os leads com nome, telefone e status no funil
2. Clique no lead para ver o histórico completo
3. Avance o status conforme o relacionamento progride:
   ```
   Novo → Contato realizado → Em negociação → Convertido (virou cliente)
                                             ↘ Perdido
   ```
4. Registre observações sobre cada contato feito

### 4.3 Converter lead em agendamento

No perfil do lead → clique em **Agendar** → cria agendamento já vinculado ao lead.

---

## 5. Atendimento WhatsApp

> **Disponível apenas se** a empresa tiver plano Pro ou Business e WhatsApp conectado.

### 5.1 Como você recebe atendimentos

Quando um cliente envia mensagem no WhatsApp da empresa, o sistema coloca na fila automaticamente. Se você for o atendente com menor carga, **receberá uma notificação no seu WhatsApp pessoal** com os dados do cliente.

### 5.2 Acompanhar a fila

**Menu → Atendimento WA → aba Fila**

- Veja as conversas atribuídas a você
- Coluna **Status**: Aguardando · Em atendimento · Encerrado
- Clique em qualquer conversa para ver o histórico de mensagens

### 5.3 Iniciar o atendimento

1. Receba a notificação no seu WhatsApp pessoal com o número do cliente
2. Inicie a conversa diretamente pelo WhatsApp
3. No sistema, o status da sessão muda automaticamente para **Em atendimento**

### 5.4 Encerrar o atendimento

Após resolver a demanda:
1. No sistema, localize a sessão na aba **Fila**
2. Clique em **Encerrar atendimento**
3. O status muda para **Encerrado** e a sessão vai para o histórico

### 5.5 Ver histórico

**Menu → Atendimento WA → aba Histórico**

- Acesso ao histórico completo de conversas anteriores
- Útil para contexto quando o mesmo cliente volta

---

## 6. Ficha de Cliente

> **Disponível para:** Beleza e Estética, Saúde, Fitness, Pet

### 6.1 O que é

A ficha é o cadastro completo do cliente com informações permanentes: dados pessoais e informações do nicho (fototipo de pele, dados de saúde, dados do animal, etc.).

### 6.2 Criar ficha nova

**Menu → Fichas** (pode ter outro nome dependendo do nicho)

1. Clique em **Nova ficha**
2. Preencha **nome, telefone e e-mail** do cliente
3. Preencha os **campos do nicho** — eles variam conforme a área da empresa:
   - **Beleza:** fototipo de pele, alergias, produtos em uso, procedimentos anteriores
   - **Saúde:** convênio, contato de emergência, profissão
   - **Fitness:** peso, altura, IMC, objetivo, nível de atividade
   - **Pet:** espécie, raça, sexo, tutor, microchip
4. Adicione observações gerais se necessário
5. Salvar

### 6.3 Buscar ficha existente

- Use a barra de busca no topo da página (busca por nome)
- Clique no ícone **olho** para visualizar todos os dados
- Clique no ícone **lápis** para editar

### 6.4 Imprimir / Exportar PDF

1. Abra a ficha (ícone olho)
2. Clique em **Exportar PDF**
3. Um PDF profissional é gerado automaticamente com:
   - Logo e dados da empresa no cabeçalho
   - Dados do cliente organizados
   - Campos específicos do nicho
   - Campos de assinatura
4. O arquivo é baixado automaticamente para o seu computador
5. Imprima e peça ao cliente assinar na primeira consulta

---

## 7. Anamnese

> **Disponível para:** Beleza e Estética, Saúde, Fitness, Pet

### 7.1 O que é

A anamnese é o questionário de saúde e pré-atendimento preenchido antes de cada procedimento. Enquanto a ficha é criada uma vez, a anamnese pode ser feita a cada sessão para registrar o estado atual do cliente.

### 7.2 Quando preencher

- Antes do primeiro procedimento (obrigatório)
- Quando o cliente relatar mudanças de saúde
- Periodicamente (ex.: a cada 3 ou 6 meses)
- Sempre que for aplicar um procedimento novo

### 7.3 Criar anamnese

**Menu → Anamnese**

1. Clique em **Nova anamnese**
2. Informe o **nome do cliente**
3. Se já existe uma ficha cadastrada para este cliente, vincule no campo **Ficha**
4. Responda o questionário com o cliente (presencialmente ou por WhatsApp):

**Exemplos de perguntas por nicho:**

> **Beleza e Estética:**  
> Está gestante ou amamentando? Tem fotossensibilidade? Usa algum medicamento? Tem tendência a queloides? Tem rosácea ou acne ativa?

> **Saúde:**  
> Qual é a queixa principal? Tem histórico de cirurgias? Usa medicamentos? Tem alergias? Histórico familiar relevante?

> **Fitness:**  
> Tem problemas cardíacos? Pressão alta ou baixa? É diabético? Fuma? Tem lesões ou limitações físicas?

> **Pet:**  
> Vacinas em dia? Vermifugação em dia? Tem alergias? Como é a alimentação? O animal apresenta comportamentos incomuns?

5. Registre observações do profissional no campo final
6. Salvar

### 7.4 Exportar PDF para assinatura

1. Abra a anamnese (ícone olho)
2. Clique em **Exportar PDF**
3. O PDF inclui uma declaração que o cliente assina confirmando a veracidade das informações
4. **Imprima, peça para o cliente assinar e arquive o documento físico** — especialmente importante para procedimentos estéticos e de saúde

---

## 8. Orçamentos

> **Disponível para:** Automotivo, Serviços Técnicos Residenciais

### 8.1 O que é

Um orçamento é uma proposta formal com lista de serviços/produtos, quantidades, valores unitários e total. Quando aprovado pelo cliente, serve de referência para o serviço a ser executado.

### 8.2 Criar orçamento

**Menu → Orçamentos**

1. Clique em **Novo orçamento**
2. Preencha os dados do cliente:
   - **Nome do cliente** (obrigatório)
   - **Telefone** (para contato e envio)
3. **Descrição do serviço:** descreva resumidamente o que será feito (ex: "Revisão completa com troca de óleo e filtros")
4. **Itens do orçamento:** para cada item:
   - Descrição detalhada (ex: "Óleo motor sintético 5W30")
   - Quantidade (ex: 4)
   - Valor unitário (ex: 45,00)
   - O subtotal é calculado automaticamente
5. Use **+ Adicionar item** para incluir mais linhas
6. **Válido até:** informe a data de validade da proposta
7. **Observações:** condições de pagamento, prazo de execução, garantia
8. Salvar — número gerado automaticamente (`ORC-2026-0001`)

### 8.3 Enviar para o cliente

Após criar:
1. Abra o orçamento (ícone olho)
2. Clique em **Exportar PDF**
3. Envie o PDF pelo WhatsApp ou e-mail para o cliente
4. Mude o status para **Enviado**

### 8.4 Acompanhar a resposta

Quando o cliente responder:
- **Aprovado:** mude o status para `Aprovado` — registra formalmente a aceitação
- **Recusado:** mude para `Recusado` — mantém histórico para análise
- **Sem resposta no prazo:** mude para `Expirado`

### 8.5 Alterar status

No modal de visualização do orçamento, na seção **Alterar status**, clique no status desejado. A mudança é salva imediatamente.

### 8.6 O PDF do orçamento inclui

- Logo e dados da empresa no cabeçalho
- Número do orçamento e data de emissão
- Dados do cliente
- **Tabela detalhada** com todos os itens, quantidades e valores
- **Total destacado** em destaque visual
- Condições gerais
- Campo de assinatura (em orçamentos Enviados e Aprovados)

---

## 9. Notificações

**Menu → Notificações** (sino no topo)

- Novos agendamentos recebidos pelo formulário público
- Lembretes de agendamentos próximos
- Mensagens de atendimento WA recebidas

---

## 10. Dúvidas frequentes

**O PDF não está baixando**  
Verifique se o navegador não está bloqueando pop-ups. Permita pop-ups para o domínio do sistema.

**O nome no PDF está errado**  
Os dados do cabeçalho vêm das configurações da empresa (admin configura). Informe ao administrador para atualizar.

**Não estou recebendo atendimentos WA**  
Verifique com o administrador se seu número de atendente está cadastrado corretamente e se a carga máxima não foi atingida.

**Não encontro o módulo de Fichas / Anamnese / Orçamentos**  
Esses módulos dependem do nicho configurado para a empresa. Fale com o administrador para verificar se estão ativados.

**Esqueci a senha**  
Na tela de login clique em **Esqueci minha senha** → informe o e-mail → verifique a caixa de entrada.

---

*Versão do documento: 1.0 — Agendix v1.5.x*
