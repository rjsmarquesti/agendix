# Skill: Deploy

Workflow de build e push de imagens Docker para o Agendix.

## Identificar o que buildar

- Mudanças em `backend/` → buildar `agendix-backend`
- Mudanças em `frontend/` → buildar `agendix-frontend`
- Mudanças em ambos → buildar ambos (backend primeiro)

## Gerar a tag

Formato: `YYYYMMDD[letra]`
- Data de hoje no formato compacto (ex: `20260509`)
- Letra sequencial: `a`, `b`, `c`... (verificar a última tag usada e incrementar)
- Exemplo: se a última foi `20260508l`, a próxima para hoje é `20260509a`

## Comandos (backend)

```bash
cd C:\Users\Rogério\agendix\backend
docker build -t rjsmarquesti/agendix-backend:[TAG] .
docker push rjsmarquesti/agendix-backend:[TAG]
```

## Comandos (frontend)

```bash
cd C:\Users\Rogério\agendix\frontend
docker build -t rjsmarquesti/agendix-frontend:[TAG] .
docker push rjsmarquesti/agendix-frontend:[TAG]
```

## Após o push

1. Informar as tags geradas ao usuário
2. Instruir: no EasyPanel → projeto `desenvolvimento` → serviço `agendix-backend` ou `agendix-frontend` → atualizar imagem para a nova tag → redeploy
3. Atualizar `MEMORY/wake-up.md` com as novas tags em "Último deploy"
