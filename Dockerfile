# Multi-stage build para reduzir tamanho da imagem
FROM node:18-slim AS builder

WORKDIR /app

# Copiar apenas arquivos de dependências primeiro (cache layer)
COPY package*.json ./
RUN npm ci --production --ignore-scripts

# Imagem final
FROM node:18-slim

# Instalar dependências do sistema (Debian)
RUN apt-get update && \
    apt-get install -y ffmpeg python3 python3-pip curl && \
    rm -rf /var/lib/apt/lists/*

# Instalar yt-dlp
RUN pip3 install --no-cache-dir --break-system-packages yt-dlp

# Criar usuário não-root para segurança
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs

WORKDIR /app

# Copiar dependências do builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules

# Copiar arquivos da aplicação
COPY --chown=nodejs:nodejs server.js ./
COPY --chown=nodejs:nodejs src/ ./src/
COPY --chown=nodejs:nodejs public/ ./public/
COPY --chown=nodejs:nodejs package*.json ./

# Criar diretórios de armazenamento com permissões corretas
RUN mkdir -p storage/in storage/meta storage/out && \
    chown -R nodejs:nodejs storage

# Mudar para usuário não-root
USER nodejs

# Expor porta
EXPOSE 8080

# Variáveis de ambiente
ENV NODE_ENV=production \
    PORT=8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Iniciar servidor
CMD ["node", "server.js"]
