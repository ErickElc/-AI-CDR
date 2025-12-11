FROM node:20-alpine AS builder

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./
COPY tsconfig.json ./

# Instalar dependências
RUN npm ci

# Copiar código fonte
COPY src ./src

# Compilar TypeScript
RUN npm run build

# Copiar data para raiz (necessário para scripts compilados)
RUN cp -r src/data ./data || mkdir -p ./data && cp -r src/data/* ./data/ 2>/dev/null || true

# Stage de produção
FROM node:20-alpine

WORKDIR /app

# Copiar apenas dependências de produção e código compilado
COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/data ./data

# Expor porta
EXPOSE 3000

# Variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=3000

# Comando para iniciar
CMD ["node", "dist/server.js"]

