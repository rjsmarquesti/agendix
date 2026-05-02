# Manual do Administrador — Divulga BR CRM
> Painel Super Admin · Versão 1.0

---

## 1. Acesso ao Painel

**URL:** `https://crm.divulgabr.com.br/admin/login`

| Campo | Valor padrão |
|-------|-------------|
| Email | super@crm.com |
| Senha | superadmin123 |

> **Importante:** Altere a senha padrão assim que possível.

---

## 2. Dashboard

Ao entrar, você verá a tela de **visão geral** com:

- **Total de clientes** — quantidade de empresas cadastradas
- **Ativos** — clientes com acesso liberado
- **Inativos** — clientes bloqueados
- **Total de leads** — soma de todos os leads de todos os clientes

Também há dois painéis:
- **Clientes por plano** — distribuição entre Básico, Pro e Premium
- **Clientes recentes** — últimos cadastrados com plano e status

---

## 3. Gerenciar Clientes

Acesse pelo menu lateral: **Clientes**

### 3.1 Listar clientes
A tabela exibe: nome, slug, plano, status (ativo/inativo) e quantidade de leads.

Use a **barra de busca** para filtrar por nome ou slug.

### 3.2 Criar novo cliente

Clique em **+ Novo Cliente** e preencha:

| Campo | Descrição |
|-------|-----------|
| Nome da empresa | Nome exibido no CRM do cliente |
| Identificador (slug) | URL de acesso, ex: `minha-empresa` (apenas letras, números e hífen) |
| Plano | Básico / Pro / Premium |
| Cor primária | Cor da marca do cliente (hex, ex: `#2563eb`) |
| Módulos ativos | Quais seções o cliente pode ver |
| Ativo | Se o cliente pode fazer login |

**Módulos disponíveis:**
- `leads` — Gestão de leads
- `agendamentos` — Agenda de atendimentos
- `usuarios` — Gerenciar usuários internos
- `configuracoes` — Configurações da conta

**Limites por plano:**

| Plano | Usuários |
|-------|----------|
| Básico | 1 |
| Pro | 5 |
| Premium | Ilimitado |

### 3.3 Editar cliente

Clique no ícone de **lápis** na linha do cliente para abrir o modal de edição. Todos os campos podem ser alterados.

### 3.4 Ativar / Desativar cliente

No modal de edição, desmarque o campo **Ativo** para bloquear o acesso de todos os usuários daquele cliente.

### 3.5 Ver detalhes e usuários

Clique no ícone de **olho** para ver os dados completos do cliente e a lista de usuários cadastrados.

---

## 4. Gerenciar Usuários dos Clientes

### 4.1 Criar usuário para um cliente

1. Na tabela de clientes, clique no ícone de **pessoa com +**
2. Preencha nome, email, senha e papel (função)
3. Clique em **Criar Usuário**

**Papéis disponíveis:**

| Papel | Permissões |
|-------|-----------|
| `admin` | Acesso total ao CRM do cliente, incluindo usuários e configurações |
| `atendente` | Acesso apenas a leads e agendamentos |

> O sistema verifica o limite de usuários do plano antes de criar.

### 4.2 Resetar senha de usuário

1. Clique no ícone de **olho** do cliente
2. Na lista de usuários, clique em **Resetar Senha**
3. Digite a nova senha e confirme

---

## 5. Como o cliente acessa o sistema

O cliente acessa em: `https://crm.divulgabr.com.br/login`

Na tela de login, ele preenche:
- **Identificador da empresa** — o slug cadastrado (ex: `minha-empresa`)
- **Email e senha** — do usuário criado por você

---

## 6. Identidade visual por cliente

Cada cliente pode ter:
- **Cor primária** — aplicada na sidebar e elementos de destaque do CRM
- **Nome exibido** — aparece no topo do painel do cliente

Isso garante uma experiência white-label para cada empresa.

---

## 7. Boas práticas

- Crie um usuário `admin` para cada cliente logo após criar a empresa
- Defina uma cor primária alinhada à marca do cliente
- Use slugs curtos e sem espaços (ex: `clinica-silva`, `auto-center`)
- Clientes Básico têm apenas 1 usuário — escolha bem qual criar
- Para revogar acesso temporariamente, desative o cliente em vez de deletar

---

*Divulga BR — Sistema de CRM · Suporte interno*
