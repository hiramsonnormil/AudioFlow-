#!/bin/bash

# ================================================
# AudioFlow - Deploy Script para Digital Ocean
# ================================================
# Este script automatiza o deploy da aplicação no Digital Ocean
# Certifique-se de ter acesso SSH configurado antes de executar

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configurações - EDITE ESTES VALORES
SERVER_IP="your-server-ip"
SERVER_USER="root"
APP_DIR="/var/www/audioflow"
REPO_URL="https://github.com/hiramsonnormil/AudioFlow-.git"
BRANCH="main"

echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}  AudioFlow - Deploy para Digital Ocean${NC}"
echo -e "${GREEN}================================================${NC}"

# Função para mostrar erro e sair
error_exit() {
    echo -e "${RED}ERRO: $1${NC}" 1>&2
    exit 1
}

# Verificar se as variáveis foram configuradas
if [ "$SERVER_IP" = "your-server-ip" ]; then
    error_exit "Configure SERVER_IP no script antes de executar!"
fi

echo -e "\n${YELLOW}1. Conectando ao servidor...${NC}"
ssh -T $SERVER_USER@$SERVER_IP << 'ENDSSH'

set -e

# Cores para output SSH
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}Conectado ao servidor!${NC}"

# Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}2. Instalando Node.js...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo -e "${GREEN}Node.js já instalado: $(node -v)${NC}"
fi

# Verificar se PM2 está instalado
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}3. Instalando PM2...${NC}"
    sudo npm install -g pm2
else
    echo -e "${GREEN}PM2 já instalado: $(pm2 -v)${NC}"
fi

# Verificar se Nginx está instalado
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}4. Instalando Nginx...${NC}"
    sudo apt-get update
    sudo apt-get install -y nginx
else
    echo -e "${GREEN}Nginx já instalado: $(nginx -v 2>&1)${NC}"
fi

# Instalar dependências do sistema
echo -e "${YELLOW}5. Instalando dependências do sistema...${NC}"
sudo apt-get install -y ffmpeg python3 python3-pip git curl

# Instalar yt-dlp
if ! command -v yt-dlp &> /dev/null; then
    echo -e "${YELLOW}6. Instalando yt-dlp...${NC}"
    sudo pip3 install --break-system-packages yt-dlp
else
    echo -e "${GREEN}yt-dlp já instalado${NC}"
fi

ENDSSH

echo -e "\n${YELLOW}7. Enviando código para o servidor...${NC}"

# Criar diretório da aplicação se não existir
ssh $SERVER_USER@$SERVER_IP "mkdir -p $APP_DIR"

# Clone ou pull do repositório
ssh $SERVER_USER@$SERVER_IP << ENDSSH
cd $APP_DIR

if [ -d ".git" ]; then
    echo -e "${YELLOW}Atualizando código existente...${NC}"
    git fetch origin
    git checkout $BRANCH
    git pull origin $BRANCH
else
    echo -e "${YELLOW}Clonando repositório...${NC}"
    cd ..
    rm -rf audioflow
    git clone -b $BRANCH $REPO_URL audioflow
    cd audioflow
fi

# Criar diretórios necessários
mkdir -p storage/in storage/meta storage/out logs

ENDSSH

echo -e "\n${YELLOW}8. Instalando dependências...${NC}"
ssh $SERVER_USER@$SERVER_IP "cd $APP_DIR && npm install --production"

echo -e "\n${YELLOW}9. Configurando variáveis de ambiente...${NC}"
echo -e "${RED}IMPORTANTE: Configure o arquivo .env no servidor!${NC}"
ssh $SERVER_USER@$SERVER_IP << ENDSSH
cd $APP_DIR

if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Criando arquivo .env a partir do .env.example...${NC}"
    cp .env.example .env
    echo -e "${RED}ATENÇÃO: Edite o arquivo .env com suas credenciais!${NC}"
    echo -e "${RED}Execute: nano /var/www/audioflow/.env${NC}"
else
    echo -e "${GREEN}.env já existe${NC}"
fi

ENDSSH

echo -e "\n${YELLOW}10. Configurando PM2...${NC}"
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'
cd /var/www/audioflow

# Parar processo existente se houver
pm2 delete audioflow 2>/dev/null || true

# Iniciar aplicação com PM2
pm2 start ecosystem.config.js

# Salvar configuração do PM2
pm2 save

# Configurar PM2 para iniciar no boot
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME

echo -e "${GREEN}Aplicação iniciada com PM2!${NC}"
pm2 status

ENDSSH

echo -e "\n${YELLOW}11. Configurando firewall...${NC}"
ssh $SERVER_USER@$SERVER_IP << 'ENDSSH'

# Configurar UFW se disponível
if command -v ufw &> /dev/null; then
    sudo ufw allow 22/tcp
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    sudo ufw --force enable
    echo -e "${GREEN}Firewall configurado!${NC}"
fi

ENDSSH

echo -e "\n${GREEN}================================================${NC}"
echo -e "${GREEN}  Deploy concluído com sucesso!${NC}"
echo -e "${GREEN}================================================${NC}"
echo -e "\n${YELLOW}Próximos passos:${NC}"
echo -e "1. Configure o arquivo .env no servidor:"
echo -e "   ${YELLOW}ssh $SERVER_USER@$SERVER_IP 'nano $APP_DIR/.env'${NC}"
echo -e "\n2. Configure o Nginx (veja nginx.conf)"
echo -e "\n3. Configure SSL com Certbot:"
echo -e "   ${YELLOW}ssh $SERVER_USER@$SERVER_IP 'sudo certbot --nginx -d your-domain.com'${NC}"
echo -e "\n4. Reinicie a aplicação:"
echo -e "   ${YELLOW}ssh $SERVER_USER@$SERVER_IP 'cd $APP_DIR && pm2 restart audioflow'${NC}"
echo -e "\n5. Monitore logs:"
echo -e "   ${YELLOW}ssh $SERVER_USER@$SERVER_IP 'pm2 logs audioflow'${NC}"
echo -e "\n${GREEN}Aplicação disponível em: http://$SERVER_IP:8080${NC}"
