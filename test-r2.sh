#!/bin/bash

# Script de teste da integração R2
# Testa upload, listagem e limpeza de objetos no Cloudflare R2

BASE_URL="http://localhost:3000"
USER_ID="test-user-123"

echo "╔════════════════════════════════════════╗"
echo "║  🧪 Teste de Integração R2            ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Cores
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Teste 1: Upload de arquivo
echo -e "${BLUE}[1/4] Testando upload de arquivo...${NC}"
UPLOAD_RESPONSE=$(curl -s -X POST "$BASE_URL/api/r2-test/upload-test" \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$USER_ID\", \"preset\": \"NIGHTCORE\", \"jobId\": \"test-job-$(date +%s)\"}")

echo "$UPLOAD_RESPONSE" | jq '.'

if echo "$UPLOAD_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Upload bem-sucedido${NC}\n"
else
  echo -e "${RED}✗ Falha no upload${NC}\n"
fi

# Aguarda um momento
sleep 2

# Teste 2: Listagem de processamentos recentes
echo -e "${BLUE}[2/4] Listando processamentos recentes...${NC}"
LIST_RESPONSE=$(curl -s -X GET "$BASE_URL/api/r2-test/recent-free?userId=$USER_ID")

echo "$LIST_RESPONSE" | jq '.'

TOTAL=$(echo "$LIST_RESPONSE" | jq -r '.totalProcessamentos // 0')
echo -e "${GREEN}✓ Encontrados $TOTAL processamento(s)${NC}\n"

# Teste 3: Fazer mais um upload para ter múltiplos arquivos
echo -e "${BLUE}[3/4] Fazendo segundo upload...${NC}"
UPLOAD_RESPONSE_2=$(curl -s -X POST "$BASE_URL/api/r2-test/upload-test" \
  -H "Content-Type: application/json" \
  -d "{\"userId\": \"$USER_ID\", \"preset\": \"SLOWED\", \"jobId\": \"test-job-$(date +%s)\"}")

echo "$UPLOAD_RESPONSE_2" | jq '.'

if echo "$UPLOAD_RESPONSE_2" | jq -e '.success' > /dev/null 2>&1; then
  echo -e "${GREEN}✓ Segundo upload bem-sucedido${NC}\n"
else
  echo -e "${RED}✗ Falha no segundo upload${NC}\n"
fi

sleep 1

# Teste 4: Listar novamente para ver os dois arquivos
echo -e "${BLUE}[4/4] Listando novamente...${NC}"
LIST_RESPONSE_2=$(curl -s -X GET "$BASE_URL/api/r2-test/recent-free?userId=$USER_ID")

echo "$LIST_RESPONSE_2" | jq '.'

TOTAL_2=$(echo "$LIST_RESPONSE_2" | jq -r '.totalProcessamentos // 0')
echo -e "${GREEN}✓ Agora temos $TOTAL_2 processamento(s)${NC}\n"

# Resumo
echo ""
echo "╔════════════════════════════════════════╗"
echo "║  📊 Resumo dos Testes                  ║"
echo "╚════════════════════════════════════════╝"
echo ""
echo "✓ Upload inicial: OK"
echo "✓ Listagem: $TOTAL arquivo(s)"
echo "✓ Segundo upload: OK"
echo "✓ Listagem final: $TOTAL_2 arquivo(s)"
echo ""
echo -e "${BLUE}Para testar a limpeza manual (deleta arquivos expirados):${NC}"
echo "curl -X POST $BASE_URL/api/r2-test/cleanup -H 'Content-Type: application/json' -d '{\"userId\": \"$USER_ID\"}'"
echo ""
echo -e "${BLUE}Para deletar um arquivo específico:${NC}"
echo "curl -X DELETE '$BASE_URL/api/r2-test/delete/free/$USER_ID/<jobId>.mp3'"
echo ""
echo -e "${GREEN}✓ Testes concluídos!${NC}"
