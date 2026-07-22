# ==========================================
# Build Stage
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Instalar dependências
COPY package.json package-lock.json* ./
RUN npm ci

# Copiar o restante do código
COPY . .

# Fazer o build do frontend (Vite) e do backend (esbuild)
RUN npm run build

# ==========================================
# Production Stage
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copiar apenas os arquivos necessários do builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json

# Instalar apenas dependências de produção
RUN npm ci --omit=dev

# Expor a porta
EXPOSE 3000

# Comando para iniciar o servidor (conforme definido no package.json)
CMD ["npm", "run", "start"]
