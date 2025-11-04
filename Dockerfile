FROM node:18-alpine

# Instalar FFmpeg 6.1 e yt-dlp (dependências necessárias)
RUN apk add --no-cache ffmpeg python3 py3-pip && \
    pip3 install --no-cache-dir yt-dlp

WORKDIR /app

# Copiar package.json e instalar dependências
COPY package*.json ./
RUN npm ci --production

# Copiar arquivos da aplicação
COPY server.js .
COPY public/ public/

# Criar diretórios de armazenamento
RUN mkdir -p storage/in storage/meta storage/out

# Porta padrão
EXPOSE 8080

# Variáveis de ambiente
ENV NODE_ENV=production
ENV PORT=8080

# Iniciar servidor
CMD ["node", "server.js"]
