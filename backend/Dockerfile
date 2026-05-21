FROM node:20-alpine

# OpenSSL necessário para o Prisma
RUN apk add --no-cache openssl

ENV NODE_ENV=production

WORKDIR /app

COPY package*.json ./

# --ignore-scripts evita o postinstall (prisma generate) antes do schema existir
RUN npm install --omit=dev --ignore-scripts

COPY . .

# Gera o Prisma Client com o schema já disponível
RUN npx prisma generate

# Garante que os diretórios necessários existem
RUN mkdir -p uploads/logos backups

EXPOSE 3000

# Roda migrations + seed + servidor
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
CMD ["/entrypoint.sh"]
