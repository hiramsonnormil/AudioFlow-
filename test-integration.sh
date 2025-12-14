#!/bin/bash

# Script para teste rápido do sistema PIX integrado
# Execute após iniciar o servidor com: npm run dev

echo "🧪 Teste de Integração Frontend + Backend PIX"
echo "=============================================="
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📋 Checklist Pré-teste:${NC}"
echo "  1. Servidor rodando? (npm run dev)"
echo "  2. MongoDB conectado?"
echo "  3. Variáveis ENV configuradas?"
echo ""

read -p "Tudo OK? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Configure o ambiente e tente novamente."
    exit 1
fi

echo ""
echo -e "${YELLOW}📝 Passos do teste:${NC}"
echo ""
echo "1️⃣  Abra o navegador em: http://localhost:8080/plans"
echo ""
echo "2️⃣  Faça login ou cadastre-se"
echo ""
echo "3️⃣  Clique em 'Assinar Voz Master' (R$ 59,90)"
echo ""
echo "4️⃣  Observe o modal com QR Code"
echo ""
echo "5️⃣  Abra o Console do Browser (F12) e copie o Transaction ID"
echo "    Deve aparecer algo como:"
echo "    '🆕 Cobrança PIX criada: { transactionId: \"uuid-aqui\" }'"
echo ""

read -p "Copiou o Transaction ID? Cole aqui: " TRANSACTION_ID

if [ -z "$TRANSACTION_ID" ]; then
    echo -e "${YELLOW}⚠ Transaction ID vazio. Tente novamente.${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🔔 Simulando webhook de confirmação...${NC}"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8080/api/webhooks/pushinpay \
  -H "X-Webhook-Signature: 56562|LrztYKxUlEw6B9SKHHUh4AQPKgXN3IuCVxipHYBVa70758d6" \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"$TRANSACTION_ID\",
    \"status\": \"paid\",
    \"end_to_end_id\": \"E12345678901234567890123456789012\",
    \"payer_name\": \"Teste Automático\",
    \"payer_national_registration\": \"12345678900\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Webhook processado com sucesso!${NC}"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
else
    echo -e "${YELLOW}⚠ Erro: HTTP $HTTP_CODE${NC}"
    echo "$BODY"
    exit 1
fi

echo ""
echo -e "${BLUE}🔍 Verificando no navegador...${NC}"
echo ""
echo "Volte ao navegador e observe:"
echo "  - Modal deve mostrar '✓ Pagamento Confirmado!'"
echo "  - Botão 'Começar a usar' aparece"
echo "  - Após clicar, deve redirecionar para /html/index.html"
echo ""
echo -e "${GREEN}✅ Teste completo!${NC}"
echo ""
echo "📊 Para verificar no banco de dados:"
echo "  - Abra MongoDB Compass ou mongosh"
echo "  - Banco: audioflow"
echo "  - Collection: payments → deve ter status 'paid'"
echo "  - Collection: subscriptions → deve ter status 'active'"
echo "  - Collection: users → plano deve ser 'voz_master'"
echo ""
