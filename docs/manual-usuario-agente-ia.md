# Guia do Usuário — Agente IA no WhatsApp
> Agendix · Disponível nos planos Premium e Business

---

## O que é o Agente IA?

O Agente IA é um assistente automático que responde seus clientes no WhatsApp 24 horas por dia, 7 dias por semana — sem você precisar fazer nada.

Ele conversa de forma natural, apresenta seus serviços ou produtos, responde dúvidas e, quando o cliente demonstra interesse, envia automaticamente o link para fechar negócio.

---

## Pré-requisito: WhatsApp conectado

Antes de configurar o Agente IA, você precisa ter o WhatsApp conectado na aba **Integração** das configurações.

Se ainda não fez isso:

**Passo 1** — Acesse **Configurações → Integração**

**Passo 2** — Clique em **Gerar QR Code**

**Passo 3** — Abra o WhatsApp no celular → **Dispositivos conectados → Conectar dispositivo**

**Passo 4** — Escaneie o QR Code exibido na tela

**Passo 5** — Aguarde o badge ficar verde: **"Conectado ✅"**

---

## Como configurar o Agente IA

**Passo 1** — Acesse **Configurações → aba Agente IA**

**Passo 2** — Preencha os campos abaixo

---

### Campo: Nome / Persona

Como o agente vai se identificar para seus clientes.

**Exemplos:**
- `Ana`
- `Suporte`
- `Assistente da Clínica X`

---

### Campo: Prompt base ⭐ (mais importante)

Aqui você escreve tudo que o agente precisa saber sobre seu negócio. Quanto mais detalhado, melhor ele vai atender seus clientes.

**O que incluir:**
- Nome da empresa e o que faz
- Serviços ou produtos oferecidos com preços
- Diferenciais do negócio
- Como funciona o atendimento
- Link para agendamento ou compra

**Exemplo para clínica de estética:**

```
Você é a Ana, assistente da Clínica Bella Estética.

A clínica fica em Brasília-DF e atende com hora marcada.

Serviços:
- Limpeza de pele: R$ 120 (60 min)
- Design de sobrancelha: R$ 60 (30 min)
- Hidratação facial: R$ 150 (90 min)

Agendamento online: https://agendix.divulgabr.com.br/agendar/bella-estetica

Como atender:
- Seja simpática e use no máximo 2 linhas por mensagem
- Faça uma pergunta por vez
- Quando o cliente demonstrar interesse em agendar, envie o link acima
- Não invente informações sobre procedimentos
```

**Exemplo para loja virtual:**

```
Você é o Carlos, assistente da Loja Moda Fácil.

Vendemos roupas femininas com frete grátis para todo o Brasil.

Promoção atual: 3 peças por R$ 99,90

Loja online: https://modafacil.com.br

Como atender:
- Seja animado e use emojis com moderação
- Se perguntarem sobre tamanhos, informe que temos P, M e G
- Quando o cliente quiser comprar, envie o link da loja
- Troca e devolução em até 30 dias
```

---

### Campo: Início e Fim do atendimento

Define o horário em que o agente responde ativamente.

**Fora desse horário**, o agente envia automaticamente a mensagem de ausência que você configurar (ou uma mensagem padrão, se deixar em branco).

**Exemplo:** Início `08:00` · Fim `18:00`

---

### Campo: Dias de atendimento

Clique nos dias em que o agente deve funcionar. Os dias selecionados ficam em azul.

---

### Campo: Mensagem fora do horário (opcional)

O que o agente responde quando alguém manda mensagem fora do seu horário de atendimento.

**Exemplo:**
```
Olá! 😊 Nosso atendimento é de segunda a sexta, das 8h às 18h.
Deixa sua mensagem que retornamos assim que possível!
```

Se deixar em branco, o sistema usa uma mensagem padrão.

---

**Passo 3** — Clique em **Salvar configurações**

**Passo 4** — Clique em **Ativar** para ligar o agente

---

## Como ligar e desligar o agente

No topo da aba Agente IA, você verá o status atual e um botão:

- **"Ativar"** → liga o agente (fica verde: "✅ Ativo — respondendo mensagens automaticamente")
- **"Desativar"** → desliga (fica cinza: "⏸ Inativo — não está respondendo")

Você pode ligar e desligar a qualquer momento sem perder as configurações.

---

## O que o agente faz automaticamente

| Situação | O que acontece |
|---|---|
| Cliente manda mensagem no seu WhatsApp | Agente responde em segundos |
| Mensagem fora do horário configurado | Agente envia a mensagem de ausência |
| Cliente demonstra interesse em comprar/agendar | Agente envia o link que você colocou no prompt |
| Conversa parada por 30 minutos | Sessão encerra; próxima mensagem começa do zero |

---

## Acompanhar resultados

No topo da aba Agente IA você vê 3 números:

| Indicador | O que significa |
|---|---|
| **Leads captados** | Quantos clientes já conversaram com o agente |
| **Checkouts enviados** | Quantas vezes o agente enviou o link de compra/agendamento |
| **Sessões ativas** | Conversas abertas no momento |

---

## Tabela de leads

Abaixo dos indicadores, você encontra a lista com todos os clientes que já falaram com o agente:

- **Telefone** — número do cliente
- **Primeira mensagem** — o que ele escreveu ao chegar
- **Checkout** — se o agente já enviou o link para ele
- **Captado em** — data do primeiro contato

---

## Dicas para um prompt eficiente

**✅ Faça:**
- Seja específico nos preços e serviços
- Inclua o link de agendamento/compra
- Oriente o tom de voz ("seja simpático", "use linguagem informal")
- Defina o que fazer quando o cliente quiser fechar negócio

**❌ Evite:**
- Deixar o prompt vago ("responda perguntas dos clientes")
- Inventar informações que não são verdadeiras
- Colocar muitas regras complexas (o agente pode se confundir)
- Esquecer de incluir o link de conversão

---

## Perguntas frequentes

**O agente responde áudios e imagens?**
Não. O agente responde apenas mensagens de texto.

**O agente interfere no bot de agendamento?**
Não. O bot de agendamento (fluxo automático de marcação de horários) tem prioridade. O Agente IA só entra quando o cliente não está em um fluxo de agendamento ativo.

**Posso ter os dois ativos ao mesmo tempo?**
Sim. O bot cuida dos agendamentos e o agente responde as demais mensagens.

**O agente aparece para clientes de grupos?**
Não. O agente ignora mensagens de grupos.

**O que acontece se eu desativar e reativar?**
Nada muda nas configurações. As conversas existentes continuam normalmente.

**Posso mudar o prompt a qualquer hora?**
Sim. As alterações valem a partir da próxima mensagem recebida.

**O agente consegue marcar agendamentos?**
Não diretamente. Para agendamentos, use o bot de agendamento (configurado na aba **Bot / n8n**) ou inclua no prompt o link público de agendamento do Agendix (`/agendar/seu-slug`).

---

## Precisa de ajuda?

Entre em contato pelo suporte: **suporte@divulgabr.com.br**
