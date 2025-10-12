# Etapa 1: Dependências
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package*.json ./
# Copia o schema do Prisma antes do npm ci (necessário para prisma generate no postinstall)
COPY src/backend/infrastructure/repository/prisma/schema.prisma ./src/backend/infrastructure/repository/prisma/schema.prisma
# Usa npm ci para builds reprodutíveis. Instala exatamente o que está no package-lock.json e nunca altera o lockfile
RUN npm ci

# Etapa 2: Build
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Garante que o build use variáveis adequadas de produção
ENV NODE_ENV=production
RUN npm run build

# Etapa 3: Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=8080
# Cloud Run define PORT automaticamente, então:
ENV HOSTNAME=0.0.0.0

# Cria um usuário não root
RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

# Copia apenas o que é necessário para rodar
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Ajuste opcional: muda dono dos arquivos (não obrigatório, mas melhora segurança)
RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 8080
# O arquivo gerado pelo Next standalone é server.js (no root da standalone)
CMD ["node", "server.js"]