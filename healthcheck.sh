#!/bin/bash

# ================================================
# Script de Health Check para Monitoramento
# ================================================

set -e

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🔍 AudioFlow - Health Check${NC}\n"

# Verificar se servidor está respondendo
echo -e "${YELLOW}1. Verificando API...${NC}"
API_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/health || echo "000")

if [ "$API_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✓ API está respondendo (HTTP $API_RESPONSE)${NC}"
else
    echo -e "${RED}✗ API não está respondendo (HTTP $API_RESPONSE)${NC}"
fi

# Verificar PM2
echo -e "\n${YELLOW}2. Verificando PM2...${NC}"
if command -v pm2 &> /dev/null; then
    PM2_STATUS=$(pm2 list | grep -c "online" || echo "0")
    echo -e "${GREEN}✓ PM2 instalado - $PM2_STATUS processos online${NC}"
    pm2 status
else
    echo -e "${RED}✗ PM2 não está instalado${NC}"
fi

# Verificar Nginx
echo -e "\n${YELLOW}3. Verificando Nginx...${NC}"
if systemctl is-active --quiet nginx; then
    echo -e "${GREEN}✓ Nginx está rodando${NC}"
else
    echo -e "${RED}✗ Nginx não está rodando${NC}"
fi

# Verificar espaço em disco
echo -e "\n${YELLOW}4. Verificando espaço em disco...${NC}"
DISK_USAGE=$(df -h / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ "$DISK_USAGE" -lt 80 ]; then
    echo -e "${GREEN}✓ Espaço em disco OK ($DISK_USAGE% usado)${NC}"
else
    echo -e "${RED}✗ Pouco espaço em disco ($DISK_USAGE% usado)${NC}"
fi

# Verificar memória
echo -e "\n${YELLOW}5. Verificando memória...${NC}"
free -h

# Verificar últimos logs
echo -e "\n${YELLOW}6. Últimas linhas do log:${NC}"
if [ -f "./logs/pm2-error.log" ]; then
    tail -n 5 ./logs/pm2-error.log
else
    echo "Arquivo de log não encontrado"
fi

echo -e "\n${GREEN}✅ Health check completo!${NC}"
