# Etapa 1: Dependências
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app

COPY package*.json ./
# Copia o schema do Prisma e as migrações antes do npm ci (necessário para prisma generate no postinstall)
# COPY src/backend/infrastructure/repository/prisma ./src/backend/infrastructure/repository/prisma

# Usa npm ci para builds reprodutíveis. Instala exatamente o que está no package-lock.json e nunca altera o lockfile
RUN npm ci

# Etapa 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG DB_URL

# Garante que o build use variáveis adequadas de produção
ENV NODE_ENV=production 

# Usei o DB_URL aqui para não precisar fazer ENV DB_URL=$DB_URL, que deixaria a variável disponível na imagem final
RUN DB_URL=$DB_URL npm run build

# Etapa 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

# ARG DB_URL
# ARG DB_DIRECT_URL

# ENV DB_URL=$DB_URL
# ENV DB_DIRECT_URL=$DB_DIRECT_URL
ENV NODE_ENV=production
ENV PORT=8080
# Cloud Run define PORT automaticamente, então:
ENV HOSTNAME=0.0.0.0

# Cria um usuário não root
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=deps /app/node_modules ./node_modules

COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./

# Copia apenas o que é necessário para rodar
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Copia Prisma (schema, migrations e client gerado)
COPY --from=builder /app/src/backend/infrastructure/repository/prisma ./src/backend/infrastructure/repository/prisma
COPY --from=builder /app/prisma.config.ts ./

# Ajuste opcional: muda dono dos arquivos (não obrigatório, mas melhora segurança)
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 8080

ENV NODE_OPTIONS="--loader ts-node/esm"

# O arquivo gerado pelo Next standalone é server.js (no root da standalone)
# Executa migrations antes de iniciar o servidor
CMD ["npm", "start"]