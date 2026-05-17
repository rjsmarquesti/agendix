# Anúncios por Nicho — Agendix

---

## O que fazer DEPOIS de subir os anúncios

### Dias 1–3 — Não mexa em nada
O algoritmo do Meta precisa de pelo menos 50 cliques para aprender. Qualquer alteração nesse período reinicia o aprendizado e desperdiça os dados coletados.

### Dias 4–7 — Primeira leitura de métricas

| Métrica | Sinal ruim | O que fazer |
|---|---|---|
| CTR abaixo de 1% | Criativo fraco | Trocar imagem ou primeiro parágrafo do texto |
| CPC acima de R$ 5 | Público ou anúncio fraco | Revisar segmentação ou trocar anúncio |
| Cliques sem cadastros | Problema na landing page | Testar outro CTA ou simplificar o formulário |
| Muitos cadastros sem assinatura | Onboarding fraco | Verificar checklist e sequência de emails |

### Dias 8–14 — Decisão de verba

Compare os nichos entre si:
- Qual gerou mais trials cadastrados?
- Qual trial virou assinante pago?
- Qual teve menor custo por cadastro (CPA)?

**Regra:** o nicho com melhor CPA recebe 2x mais verba. Os piores pausam.

---

## Itens técnicos obrigatórios ANTES de subir os anúncios

### 1. Pixel do Meta (Facebook Pixel)

**O que é:** código JavaScript que o Meta instala nas suas páginas para rastrear quem visitou, clicou e se cadastrou.

**Por que é obrigatório:** sem ele o algoritmo não sabe otimizar para conversão — só para clique. Você paga por tráfego que não vira cliente.

**Como instalar:**
1. Acesse business.facebook.com → Gerenciador de Eventos
2. Clique em **"+ Conectar fontes de dados"** → Web → Pixel do Facebook
3. Dê um nome: `Agendix Pixel`
4. Copie o código base (snippet com `fbq('init', 'SEU_PIXEL_ID')`)
5. Cole dentro do `<head>` de cada uma das 5 landing pages de nicho (`nicho-esteticista.html`, `nicho-salao.html`, etc.)
6. Adicione o evento de PageView: `fbq('track', 'PageView');`

**Evento de conversão (cadastro):**
No botão "Criar conta grátis" de cada landing, adicionar:
```html
onclick="fbq('track', 'Lead')"
```
Assim o Meta sabe quando alguém clicou para se cadastrar.

---

### 2. Tag do Google (Google Tag / GA4)

**O que é:** código do Google Analytics 4 + Google Ads que rastreia visitas e conversões.

**Como instalar:**
1. Acesse analytics.google.com → Criar propriedade → Web
2. Copie o snippet com `gtag('js', ...)` e `gtag('config', 'G-XXXXXXX')`
3. Cole dentro do `<head>` de cada landing page de nicho
4. No Google Ads, vincule a conta do GA4

**Evento de conversão:**
No botão "Criar conta grátis":
```html
onclick="gtag('event', 'conversion', {'send_to': 'AW-XXXXXXX/XXXXXXX'})"
```

---

### 3. UTM Parameters — já estão prontos

Os links com UTM já estão documentados na seção abaixo. Eles permitem rastrear no GA4 de qual anúncio veio cada visita, sem precisar de configuração extra.

---

### Resumo: o que instalar em cada arquivo HTML

| Arquivo | Pixel Meta | Tag Google | Evento onclick |
|---|---|---|---|
| `nicho-esteticista.html` | ✅ no `<head>` | ✅ no `<head>` | ✅ no botão CTA |
| `nicho-salao.html` | ✅ no `<head>` | ✅ no `<head>` | ✅ no botão CTA |
| `nicho-advogado.html` | ✅ no `<head>` | ✅ no `<head>` | ✅ no botão CTA |
| `nicho-psicologo.html` | ✅ no `<head>` | ✅ no `<head>` | ✅ no botão CTA |
| `nicho-otica.html` | ✅ no `<head>` | ✅ no `<head>` | ✅ no botão CTA |

> Quando quiser implementar, é meia hora de trabalho. Basta ter o Pixel ID do Meta e o ID de medição do GA4 em mãos.

---



> Guia completo de copy e passo a passo para subir no Meta Ads (Instagram/Facebook) e Google Ads.
> NÃO subir antes de ter o pixel do Meta instalado e o público configurado.

---

## Antes de começar — Checklist obrigatório

- [ ] Conta no Meta Business Manager criada (business.facebook.com)
- [ ] Pixel do Meta instalado nas 5 landing pages
- [ ] Conta Google Ads criada (ads.google.com)
- [ ] Tag do Google instalada nas 5 landing pages
- [ ] Imagens/vídeos de cada nicho prontos (sugestões abaixo)
- [ ] Método de pagamento cadastrado nas duas plataformas
- [ ] UTM parameters definidos por nicho

---

## UTM Parameters (use em todos os links)

| Nicho | URL completa com UTM |
|---|---|
| Esteticista | `https://agendix.divulgabr.com.br/estetica?utm_source=meta&utm_medium=pago&utm_campaign=estetica` |
| Salão | `https://agendix.divulgabr.com.br/salao?utm_source=meta&utm_medium=pago&utm_campaign=salao` |
| Advogado | `https://agendix.divulgabr.com.br/advocacia?utm_source=meta&utm_medium=pago&utm_campaign=advocacia` |
| Psicólogo | `https://agendix.divulgabr.com.br/psicologia?utm_source=meta&utm_medium=pago&utm_campaign=psicologia` |
| Ótica | `https://agendix.divulgabr.com.br/otica?utm_source=meta&utm_medium=pago&utm_campaign=otica` |

---

---

# NICHO 1 — ESTETICISTA

## Meta Ads (Instagram + Facebook)

### Anúncio A — Dor principal (WhatsApp)
**Formato:** Feed do Instagram + Stories  
**Objetivo:** Leads (cliques no link)

**Texto principal:**
```
Cansada de responder WhatsApp às 23h pra confirmar horário?

Sua cliente quer agendar — mas você tá no meio de um atendimento e não consegue responder. Ela desiste. Você perde o agendamento.

O Agendix resolve isso:
✅ Bot WhatsApp que agenda por você, 24h por dia
✅ Lembretes automáticos que reduzem faltas em até 40%
✅ Clientes agendam pelo link sem precisar te chamar

Mais de 2.400 profissionais já usam.

👇 Teste grátis por 30 dias — sem cartão
```
**Título (headline):** `Esteticista: sua agenda cheia sem responder WhatsApp`  
**Descrição:** `30 dias grátis. Configura em 5 minutos.`  
**CTA:** Saiba mais  
**URL:** `/estetica?utm_source=meta&utm_medium=pago&utm_campaign=estetica`

---

### Anúncio B — Prova social (resultado)
**Formato:** Feed do Instagram  
**Objetivo:** Leads

**Texto principal:**
```
"Meu faturamento cresceu 35% porque parei de perder clientes que não conseguiam me achar no WhatsApp."
— Thaís, esteticista · Recife

Se você ainda agenda tudo pelo WhatsApp manual, tá deixando dinheiro na mesa.

O Agendix dá à sua clínica de estética:
💅 Link de agendamento profissional (coloca no Instagram)
🤖 Bot que confirma horários automaticamente
📊 Controle financeiro por procedimento

Teste 30 dias grátis 👇
```
**Título:** `+35% faturamento com agenda automática`  
**Descrição:** `Para esteticistas. Sem cartão. 30 dias grátis.`  
**CTA:** Saiba mais  

---

### Anúncio C — Stories (curto e direto)
**Formato:** Stories vertical  
**Texto no criativo:** `Sua próxima cliente está tentando te achar no WhatsApp agora. Você vai perder ela?`  
**Texto principal:**
```
O bot do Agendix responde, verifica horário e confirma o agendamento — enquanto você está atendendo.

30 dias grátis 👆
```
**CTA:** Arraste para cima / Saiba mais

---

## Google Ads (Pesquisa)

### Campanha: Busca por solução
**Palavras-chave:**
```
sistema agendamento esteticista
app agendamento clínica estética
agenda online esteticista
software para esteticista
sistema para clínica de estética
```

**Anúncio Responsivo de Pesquisa:**

Títulos (cadastre todos, o Google escolhe a combinação):
```
Agenda Online para Esteticistas
Bot WhatsApp para Clínica Estética
Sistema de Agendamento — 30 dias Grátis
Clínica de Estética Organizada
Reduza Faltas com Lembretes Automáticos
Agendix para Esteticistas
Agenda que Funciona no Celular
```

Descrições:
```
Clientes agendam pelo link, bot WhatsApp confirma, lembretes automáticos reduzem faltas. Teste grátis 30 dias.
Configure em 5 minutos. Sem cartão. Mais de 2.400 profissionais de beleza já usam o Agendix.
```

**URL de destino:** `/estetica?utm_source=google&utm_medium=pago&utm_campaign=estetica`

---

## Segmentação Meta Ads — Esteticista

| Parâmetro | Configuração |
|---|---|
| Idade | 22–50 anos |
| Gênero | Feminino (majoritário) |
| Localização | Brasil — cidades acima de 50k habitantes |
| Interesses | Estética, Beleza, Empreendedorismo, Microagulhamento, Cosmetologia |
| Comportamento | Donos de pequenas empresas, Autoempregados |
| Público excluir | Quem já visitou `/cadastro` (já é lead) |

**Orçamento sugerido para teste:** R$ 20–30/dia por 7 dias

---

---

# NICHO 2 — SALÃO DE BELEZA

## Meta Ads (Instagram + Facebook)

### Anúncio A — Dor principal (bagunça na agenda)
**Texto principal:**
```
Sua agenda de salão ainda é papel, WhatsApp e memória?

Conflito de horários entre profissionais. Cliente marca com uma, aparece esperando outra. Folhinha riscada.

O Agendix organiza tudo:
💇 Agenda online por profissional
🤖 Bot WhatsApp que confirma horários
📲 Link do seu salão pra colocar no Instagram
📊 Controle de receita por serviço

Mais de 2.400 negócios já usam. Teste grátis 30 dias.
```
**Título:** `Salão de Beleza: fim da agenda bagunçada`  
**Descrição:** `Organiza todos os profissionais. 30 dias grátis, sem cartão.`  
**CTA:** Saiba mais  
**URL:** `/salao?utm_source=meta&utm_medium=pago&utm_campaign=salao`

---

### Anúncio B — Multi-profissional
**Texto principal:**
```
Gerenciar a agenda de 4 cabeleireiras num salão era um caos.

Hoje tudo é automático — cada uma tem sua agenda, o bot WhatsApp confirma os horários, e eu acompanho tudo pelo celular.

Se o seu salão tem mais de 1 profissional, você precisa ver o Agendix.

✅ Agendas separadas por profissional
✅ Bot WA que atende clientes enquanto vocês trabalham  
✅ Lembretes que reduzem faltas
✅ Link exclusivo do seu salão

30 dias grátis 👇
```
**Título:** `Organize a agenda de todo o seu salão`  
**Descrição:** `Multi-profissional. Bot WhatsApp. 30 dias grátis.`

---

### Anúncio C — Stories
**Texto no criativo:** `Quantos clientes você perdeu essa semana por não responder a tempo?`  
**Texto principal:**
```
Bot WhatsApp do Agendix responde, verifica horário e confirma — sem você tocar no celular.

👆 30 dias grátis
```

---

## Google Ads — Salão

**Palavras-chave:**
```
sistema para salão de beleza
software agendamento salão
app para salão de beleza
agenda online salão
programa para cabeleireiro
```

**Títulos:**
```
Sistema para Salão de Beleza
Agenda Online — Salão e Barbearia
Bot WhatsApp para Salão — Grátis
Organiza Todos os Profissionais
30 dias Grátis — Sem Cartão
Agendix para Salão de Beleza
```

**Descrições:**
```
Agenda por profissional, bot WhatsApp automático e link do salão para o Instagram. Configure em 5 minutos.
Mais de 2.400 salões e barbearias usam o Agendix. Teste grátis 30 dias, sem cartão de crédito.
```

---

## Segmentação Meta Ads — Salão

| Parâmetro | Configuração |
|---|---|
| Idade | 22–55 anos |
| Gênero | Todos |
| Interesses | Salão de beleza, Cabeleireiro, Barbearia, Empreendedorismo |
| Comportamento | Donos de pequenas empresas |
| Cargo | Proprietário, Gerente de salão |

**Orçamento sugerido:** R$ 25–35/dia por 7 dias

---

---

# NICHO 3 — ADVOGADO

## Meta Ads (Instagram + Facebook)

### Anúncio A — Dor principal (telefone e confusão)
**Texto principal:**
```
Clientes ligando em hora de audiência. Agenda feita em papel ou planilha. Secretária sobrecarregada só agendando.

Existe uma forma mais profissional de gerenciar sua agenda de consultas.

O Agendix para advogados:
⚖️ Clientes marcam consulta sozinhos pelo link
📋 Lembretes automáticos 24h antes — reduz faltas
🔒 Dados com proteção LGPD
📊 Controle de honorários e recebimentos

Profissional, discreto e fácil de usar.

30 dias grátis 👇
```
**Título:** `Advogado: agenda de consultas sem secretária o dia todo`  
**Descrição:** `Clientes agendam sozinhos. LGPD. 30 dias grátis.`  
**CTA:** Saiba mais  
**URL:** `/advocacia?utm_source=meta&utm_medium=pago&utm_campaign=advocacia`

---

### Anúncio B — Credibilidade e produtividade
**Texto principal:**
```
"Antes minha secretária passava o dia agendando por telefone. Hoje os clientes agendam sozinhos e ela foca em tarefas que realmente importam."
— Dr. Ricardo, advogado trabalhista · SP

O Agendix dá ao seu escritório:
✅ Link de agendamento profissional para o site e redes sociais
✅ Histórico completo de cada cliente e processo
✅ Controle de honorários por cliente
✅ Gestão de toda a equipe — sócios, associados e estagiários

30 dias grátis — sem cartão
```
**Título:** `Escritório mais produtivo com agenda automática`  
**Descrição:** `Para advogados e escritórios. LGPD. Teste 30 dias.`

---

## Google Ads — Advogado

**Palavras-chave:**
```
sistema agendamento advogado
agenda online escritório advocacia
software jurídico agendamento
app para advogado agenda
gerenciamento consultas jurídicas
```

**Títulos:**
```
Agenda de Consultas para Advogados
Sistema para Escritório de Advocacia
Clientes Agendam Sozinhos — LGPD
Gestão de Consultas Jurídicas
30 dias Grátis — Experimente
Agendix para Advogados
Reduza Faltas em Consultas
```

**Descrições:**
```
Clientes marcam consulta pelo link, recebem lembrete automático e você só aparece na hora certa. LGPD compliant.
Agenda profissional para advogados e escritórios. Controle de honorários. Configure em 5 minutos. 30 dias grátis.
```

---

## Segmentação Meta Ads — Advogado

| Parâmetro | Configuração |
|---|---|
| Idade | 28–55 anos |
| Gênero | Todos |
| Interesses | Advocacia, Direito, OAB, Empreendedorismo |
| Comportamento | Autoempregados, Donos de pequenas empresas |
| Cargo | Advogado, Sócio, Diretor jurídico |

**Orçamento sugerido:** R$ 20–25/dia por 7 dias  
> Dica: advogados convertem menos volume mas com ticket de plano mais alto. Foque em Pro/Business.

---

---

# NICHO 4 — PSICÓLOGO E PSICANALISTA

## Meta Ads (Instagram + Facebook)

### Anúncio A — Dor principal (faltas e agenda)
**Texto principal:**
```
Paciente falta sem avisar. Você perde o horário e o dinheiro.

Com lembretes automáticos do Agendix, seus pacientes recebem aviso no WhatsApp 24h antes da sessão. As faltas caem. Sua agenda fica preenchida.

Para psicólogos e psicanalistas:
🧠 Agenda de sessões online, sem telefone
🔒 Dados dos pacientes com sigilo e LGPD
📲 Link profissional para encaminhamentos
📋 Histórico de cada paciente organizado

Discreto. Simples. Funciona no celular.

30 dias grátis 👇
```
**Título:** `Psicólogo: reduza faltas com lembretes automáticos`  
**Descrição:** `Agenda de sessões online. LGPD. 30 dias grátis.`  
**CTA:** Saiba mais  
**URL:** `/psicologia?utm_source=meta&utm_medium=pago&utm_campaign=psicologia`

---

### Anúncio B — Encaminhamentos e link profissional
**Texto principal:**
```
Quando um colega te encaminha um paciente, como ele agenda a primeira sessão?

Se a resposta for "me manda WhatsApp" — você tá perdendo pacientes que desistem antes de chegar.

O Agendix dá ao seu consultório um link profissional de agendamento. O paciente escolhe o horário, você confirma. Sem telefone, sem idas e vindas.

✅ Presencial e online na mesma agenda
✅ Lembretes automáticos antes de cada sessão
✅ Dados com proteção total — LGPD
✅ Funciona como um app, sem instalar nada

30 dias grátis — sem cartão
```
**Título:** `Consultório profissional com agenda online`  
**Descrição:** `Para psicólogos. LGPD. Sem cartão. 30 dias grátis.`

---

## Google Ads — Psicólogo

**Palavras-chave:**
```
sistema agendamento psicólogo
agenda online consultório psicologia
software para psicólogo
app agendamento psicanalista
gestão consultório psicologia
```

**Títulos:**
```
Agenda de Sessões para Psicólogos
Sistema para Consultório de Psicologia
Reduza Faltas com Lembretes Automáticos
Agenda Online — LGPD e Sigilo
30 dias Grátis — Psicólogos
Agendix para Psicólogos
Presencial e Online Integrados
```

**Descrições:**
```
Pacientes agendam sessões pelo link, recebem lembrete automático e você reduz faltas. LGPD. 30 dias grátis.
Para psicólogos e psicanalistas. Sigilo, LGPD, agenda presencial e online integradas. Configure em 5 minutos.
```

---

## Segmentação Meta Ads — Psicólogo

| Parâmetro | Configuração |
|---|---|
| Idade | 26–50 anos |
| Gênero | Todos |
| Interesses | Psicologia, Saúde Mental, CFP, Psicanálise, Terapia |
| Comportamento | Autoempregados |
| Cargo | Psicólogo, Terapeuta, Psicanalista |

**Orçamento sugerido:** R$ 20–25/dia por 7 dias

---

---

# NICHO 5 — ÓTICA

## Meta Ads (Instagram + Facebook)

### Anúncio A — Gancho do exame grátis
**Texto principal:**
```
Exame de vista GRÁTIS é a isca mais poderosa de uma ótica.

Mas de nada adianta oferecer se o cliente não consegue agendar fácil.

Com o Agendix sua ótica:
👁️ Divulga o exame grátis com link de agendamento direto
🤖 Bot WhatsApp agenda o exame automaticamente
🔔 Lembra o cliente da consulta para reduzir faltas
💰 Você faz o exame — e converte em venda de óculos

75% dos clientes que fazem o exame saem com óculos novos.

30 dias grátis 👇
```
**Título:** `Ótica: agende exames grátis e converta em vendas`  
**Descrição:** `Bot WhatsApp + agenda online. 30 dias grátis.`  
**CTA:** Saiba mais  
**URL:** `/otica?utm_source=meta&utm_medium=pago&utm_campaign=otica`

---

### Anúncio B — Recompra automática
**Texto principal:**
```
Seu cliente comprou óculos há 2 anos. Está na hora de trocar.

Mas você não tem como saber isso sem revisar cada cadastro manualmente.

O Agendix guarda a data do último exame e te avisa quando o cliente está no prazo de retorno. Você manda uma mensagem — e a venda acontece naturalmente.

✅ Histórico de cada cliente: grau, óculos, data do exame
✅ Link para agendar exame grátis direto do Instagram
✅ Bot WhatsApp que agenda automaticamente
✅ Lembretes de retorno para clientes antigos

30 dias grátis — sem cartão
```
**Título:** `Ótica: traga clientes antigos de volta automaticamente`  
**Descrição:** `CRM + agenda online + bot WA. 30 dias grátis.`

---

### Anúncio C — Stories
**Texto no criativo:** `Coloca no Instagram: "Exame de vista GRÁTIS — agende pelo link"`  
**Texto principal:**
```
O Agendix agenda o exame automaticamente. Você só aparece para atender — e vender óculos.

👆 30 dias grátis
```

---

## Google Ads — Ótica

**Palavras-chave:**
```
sistema para ótica
software agendamento ótica
agenda online para ótica
app para ótica
exame de vista agendamento online
```

**Títulos:**
```
Sistema para Ótica — 30 dias Grátis
Agende Exames de Vista Online
Bot WhatsApp para Ótica
CRM para Ótica e Optometrista
Converta Exames em Vendas
Agendix para Óticas
Mais Clientes com Exame Grátis
```

**Descrições:**
```
Clientes agendam exame grátis pelo link, bot WhatsApp confirma, você vende óculos. Configure em 5 minutos.
Histórico de grau, data do exame e alertas de retorno. Mais de 2.400 negócios usam o Agendix. 30 dias grátis.
```

---

## Segmentação Meta Ads — Ótica

| Parâmetro | Configuração |
|---|---|
| Idade | 25–60 anos |
| Gênero | Todos |
| Interesses | Óculos, Ótica, Optometria, Empreendedorismo, Varejo |
| Comportamento | Donos de pequenas empresas |
| Cargo | Proprietário, Gerente de ótica |

**Orçamento sugerido:** R$ 20–30/dia por 7 dias

---

---

# PASSO A PASSO — COMO SUBIR NO META ADS

## Passo 1 — Criar a campanha

1. Acesse business.facebook.com → Gerenciador de Anúncios
2. Clique em **"+ Criar"**
3. Escolha objetivo: **"Tráfego"** (para começar) ou **"Leads"** (se tiver formulário)
4. Nome da campanha: `Agendix - [Nicho] - [Data]` (ex: `Agendix - Esteticista - Mai2026`)
5. Orçamento da campanha: **não ative** orçamento a nível de campanha ainda

## Passo 2 — Configurar o conjunto de anúncios

1. Nome do conjunto: `[Nicho] - Interesses - BR`
2. **Conversões:** escolha seu Pixel → evento "Visualização de página" (ou Lead se configurado)
3. **Público:**
   - Localização: Brasil
   - Idade e gênero: conforme tabela do nicho acima
   - Segmentação detalhada: adicione os interesses da tabela do nicho
4. **Posicionamentos:** selecione Manual → marque Feed Instagram, Stories Instagram, Feed Facebook
5. **Orçamento diário:** valor da tabela do nicho
6. **Datas:** sem data de término nos primeiros 7 dias

## Passo 3 — Criar o anúncio

1. Nome do anúncio: `[Nicho] - Anúncio A - [Formato]`
2. **Identidade:** selecione sua página do Facebook / conta do Instagram
3. **Formato:** Imagem única (para começar)
4. **Mídia:** suba a imagem do nicho (sugestão: foto real do ambiente do nicho + texto sobreposto)
5. **Texto principal:** cole o texto do Anúncio A deste documento
6. **Título:** cole o headline
7. **Descrição:** cole a descrição
8. **URL do site:** cole a URL com UTM do nicho
9. **CTA:** selecione "Saiba mais"
10. Clique em **Publicar**

## Passo 4 — Duplicar para testar variações

1. No conjunto de anúncios, selecione o anúncio criado
2. Clique em **"Duplicar"**
3. Troque apenas o texto (use o Anúncio B)
4. Mantenha mesma imagem
5. Publique

> Resultado: 2 anúncios no mesmo conjunto competindo. O Meta vai automaticamente dar mais verba para o que converte melhor.

## Passo 5 — Repetir para cada nicho

Crie uma campanha separada para cada nicho. Não misture nichos numa campanha — métricas ficam confusas e o algoritmo não aprende direito.

---

# PASSO A PASSO — COMO SUBIR NO GOOGLE ADS

## Passo 1 — Criar a campanha

1. Acesse ads.google.com
2. Clique em **"+ Nova campanha"**
3. Objetivo: **"Tráfego do site"**
4. Tipo: **"Pesquisa"**
5. URL do site: URL com UTM do nicho
6. Nome: `Agendix - [Nicho] - Pesquisa`

## Passo 2 — Configurar segmentação

1. **Localização:** Brasil
2. **Idioma:** Português
3. **Orçamento diário:** R$ 15–25
4. **Lances:** CPC manual para começar (coloque R$ 2,50 por clique)

## Passo 3 — Criar o grupo de anúncios

1. Nome: `[Nicho] - Palavras Intenção`
2. Adicione as palavras-chave do nicho (desta planilha)
3. Use **correspondência de frase** `"palavra-chave"` para ter mais controle

## Passo 4 — Criar o anúncio responsivo

1. URL final: URL com UTM do nicho
2. Adicione todos os **títulos** listados (o Google vai testar combinações)
3. Adicione as **descrições**
4. Salve e publique

## Passo 5 — Acompanhar por 7 dias

Métricas para olhar:
- **CTR** (taxa de clique): bom acima de 3%
- **CPC médio**: ideal abaixo de R$ 3,00
- **Taxa de conversão**: bom acima de 5% (clique → cadastro trial)

---

# ORÇAMENTO INICIAL SUGERIDO

| Nicho | Meta/dia | Google/dia | Total/mês |
|---|---|---|---|
| Esteticista | R$ 25 | R$ 20 | R$ 1.350 |
| Salão | R$ 30 | R$ 20 | R$ 1.500 |
| Advogado | R$ 20 | R$ 20 | R$ 1.200 |
| Psicólogo | R$ 20 | R$ 15 | R$ 1.050 |
| Ótica | R$ 25 | R$ 20 | R$ 1.350 |
| **Total** | | | **~R$ 6.450/mês** |

> **Recomendação:** não suba os 5 nichos ao mesmo tempo. Comece com 2 (esteticista + ótica — maior potencial de conversão rápida), rode por 30 dias, analise qual converte melhor e aí expande.

---

# IMAGENS SUGERIDAS POR NICHO

| Nicho | Imagem ideal |
|---|---|
| Esteticista | Foto de atendimento de limpeza de pele ou microagulhamento, ambiente limpo e iluminado |
| Salão | Foto de cabeleireira em atendimento, cliente satisfeita no espelho |
| Advogado | Foto do profissional no escritório, ambiente sóbrio e profissional |
| Psicólogo | Foto de consultório acolhedor, poltrona e ambiente calmo |
| Ótica | Foto de cliente experimentando óculos, loja bem iluminada |

> Use fotos reais sempre que possível. Evite bancos de imagem genéricos — o algoritmo do Meta penaliza imagens muito usadas.
