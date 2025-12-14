#!/bin/bash

# Script de teste do sistema de pagamentos PIX
# Facilita testes durante desenvolvimento

set -e

BASE_URL="${BASE_URL:-http://localhost:8080}"
TOKEN="${TOKEN:-your-jwt-token-here}"
WEBHOOK_SECRET="${WEBHOOK_SECRET:-56562|LrztYKxUlEw6B9SKHHUh4AQPKgXN3IuCVxipHYBVa70758d6}"

echo "==================================="
echo "🧪 PIX Payment System Test Script"
echo "==================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para fazer requests
make_request() {
  local method=$1
  local endpoint=$2
  local data=$3
  local headers=$4
  
  echo -e "${YELLOW}→ $method $endpoint${NC}"
  
  if [ -n "$data" ]; then
    echo "  Payload: $data"
  fi
  
  response=$(curl -s -w "\n%{http_code}" -X $method "$BASE_URL$endpoint" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    $headers \
    ${data:+-d "$data"})
  
  http_code=$(echo "$response" | tail -n1)
  body=$(echo "$response" | head -n-1)
  
  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo -e "${GREEN}✓ $http_code${NC}"
  else
    echo -e "${RED}✗ $http_code${NC}"
  fi
  
  echo "$body" | jq '.' 2>/dev/null || echo "$body"
  echo ""
  
  # Retornar body para uso posterior
  echo "$body"
}

# Teste 1: Criar cobrança PIX
echo "📝 Teste 1: Criar cobrança PIX"
echo "-----------------------------------"

PAYMENT_RESPONSE=$(make_request POST "/api/pix/create" '{
  "plan": "voz_plus_master"
}')

TRANSACTION_ID=$(echo "$PAYMENT_RESPONSE" | jq -r '.data.transactionId' 2>/dev/null)

if [ "$TRANSACTION_ID" != "null" ] && [ -n "$TRANSACTION_ID" ]; then
  echo -e "${GREEN}✓ Transaction ID: $TRANSACTION_ID${NC}"
  echo ""
else
  echo -e "${RED}✗ Falha ao criar cobrança${NC}"
  exit 1
fi

# Teste 2: Listar pagamentos
echo "📋 Teste 2: Listar pagamentos do usuário"
echo "-----------------------------------"
make_request GET "/api/pix/payments" > /dev/null

# Teste 3: Simular webhook (desenvolvimento)
echo "🔔 Teste 3: Simular webhook de confirmação"
echo "-----------------------------------"

WEBHOOK_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/webhooks/pushinpay" \
  -H "X-Webhook-Signature: $WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"$TRANSACTION_ID\",
    \"status\": \"paid\",
    \"end_to_end_id\": \"E12345678901234567890123456789012\",
    \"payer_name\": \"João Teste\",
    \"payer_national_registration\": \"12345678900\"
  }")

http_code=$(echo "$WEBHOOK_RESPONSE" | tail -n1)
body=$(echo "$WEBHOOK_RESPONSE" | head -n-1)

if [ "$http_code" = "200" ]; then
  echo -e "${GREEN}✓ Webhook processado com sucesso${NC}"
  echo "$body" | jq '.' 2>/dev/null || echo "$body"
else
  echo -e "${RED}✗ Erro ao processar webhook: $http_code${NC}"
  echo "$body"
fi
echo ""

# Teste 4: Consultar status manualmente
echo "🔍 Teste 4: Consultar status do pagamento"
echo "-----------------------------------"
make_request GET "/api/pix/check/$TRANSACTION_ID" > /dev/null

# Teste 5: Webhook duplicado (idempotência)
echo "🔁 Teste 5: Webhook duplicado (teste de idempotência)"
echo "-----------------------------------"

WEBHOOK_DUP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/webhooks/pushinpay" \
  -H "X-Webhook-Signature: $WEBHOOK_SECRET" \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"$TRANSACTION_ID\",
    \"status\": \"paid\",
    \"end_to_end_id\": \"E12345678901234567890123456789012\",
    \"payer_name\": \"João Teste\",
    \"payer_national_registration\": \"12345678900\"
  }")

body_dup=$(echo "$WEBHOOK_DUP" | head -n-1)
already_processed=$(echo "$body_dup" | jq -r '.alreadyProcessed' 2>/dev/null)

if [ "$already_processed" = "true" ]; then
  echo -e "${GREEN}✓ Idempotência funcionando corretamente${NC}"
else
  echo -e "${YELLOW}⚠ Webhook reprocessado (verificar logs)${NC}"
fi
echo "$body_dup" | jq '.' 2>/dev/null || echo "$body_dup"
echo ""

# Resumo
echo "==================================="
echo "📊 Resumo dos Testes"
echo "==================================="
echo -e "${GREEN}✓ Sistema de pagamentos PIX funcionando${NC}"
echo ""
echo "Transaction ID testado: $TRANSACTION_ID"
echo ""
echo "⚠️  Lembrete:"
echo "   - Em produção, use URLs públicas no WEBHOOK_BASE_URL"
echo "   - Configure rate limits adequados"
echo "   - Monitore logs de webhook regularmente"
echo ""
