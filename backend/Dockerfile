FROM node:20-alpine

# OpenSSL necessário para o Prisma
RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./

# --ignore-scripts evita o postinstall (prisma generate) antes do schema existir
RUN npm install --omit=dev --ignore-scripts

COPY . .

# Gera o Prisma Client com o schema já disponível
RUN npx prisma generate

EXPOSE 3000

# Roda migrations + seed + servidor
CMD ["sh", "-c", "npx prisma migrate deploy && node prisma/seed.js && node server.js"]
