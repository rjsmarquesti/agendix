FROM node:20-alpine

# OpenSSL necessário para o Prisma
RUN apk add --no-cache openssl

ENV NODE_ENV=production

WORKDIR /app

COPY package*.json ./

# --ignore-scripts evita o postinstall (prisma generate) antes do schema existir
RUN npm install --omit=dev --ignore-scripts

# Scan de vulnerabilidades — loga mas não quebra o build
RUN npm audit --audit-level=high || true

COPY . .

# Gera o Prisma Client com o schema já disponível
RUN npx prisma generate

# Garante que os diretórios necessários existem
RUN mkdir -p uploads/logos backups

EXPOSE 3000

# Roda migrations + seed + servidor
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Usuário não-root — reduz o raio de impacto de um RCE no processo Node
RUN addgroup -g 1001 -S nodeapp \
  && adduser -S nodeapp -u 1001 -G nodeapp \
  && chown -R nodeapp:nodeapp /app

USER nodeapp

CMD ["/entrypoint.sh"]
