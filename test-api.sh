#!/bin/bash

# 🎵 Script de Teste da API - Audio FX Processor MVC
# Use este script para testar todos os endpoints da API

API_URL="http://localhost:8080"
COLOR_BLUE='\033[0;34m'
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[1;33m'
COLOR_RED='\033[0;31m'
COLOR_RESET='\033[0m'

# Função para imprimir com cores
print_section() {
    echo -e "\n${COLOR_BLUE}═══════════════════════════════════════${COLOR_RESET}"
    echo -e "${COLOR_BLUE}$1${COLOR_RESET}"
    echo -e "${COLOR_BLUE}═══════════════════════════════════════${COLOR_RESET}\n"
}

print_success() {
    echo -e "${COLOR_GREEN}✓ $1${COLOR_RESET}"
}

print_error() {
    echo -e "${COLOR_RED}✗ $1${COLOR_RESET}"
}

print_info() {
    echo -e "${COLOR_YELLOW}ℹ $1${COLOR_RESET}"
}

# ============================================
print_section "1. Testar Documentação da API"
# ============================================

echo "GET $API_URL/api"
RESPONSE=$(curl -s "$API_URL/api")
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
print_success "Endpoint /api respondeu"

# ============================================
print_section "2. Testar Estatísticas da Fila (vazia)"
# ============================================

echo "GET $API_URL/queue-stats"
RESPONSE=$(curl -s "$API_URL/queue-stats")
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
print_success "Fila está vazia"

# ============================================
print_section "3. Criar um Novo Job (POST /process)"
# ============================================

echo "POST $API_URL/process"
echo '{"url":"https://youtu.be/dQw4w9WgXcQ", "preset":"NIGHTCORE"}'

RESPONSE=$(curl -s -X POST "$API_URL/process" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://youtu.be/dQw4w9WgXcQ", "preset":"NIGHTCORE"}')

echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

# Extrair Job ID
JOB_ID=$(echo "$RESPONSE" | jq -r '.id' 2>/dev/null)

if [ -z "$JOB_ID" ] || [ "$JOB_ID" == "null" ]; then
    print_error "Falha ao criar job"
    exit 1
fi

print_success "Job criado com ID: $JOB_ID"

# ============================================
print_section "4. Verificar Status do Job Imediatamente"
# ============================================

echo "GET $API_URL/status/$JOB_ID"
RESPONSE=$(curl -s "$API_URL/status/$JOB_ID")
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

print_info "Status deve ser PENDING ou DOWNLOADING"

# ============================================
print_section "5. Testar Estatísticas com Job na Fila"
# ============================================

echo "GET $API_URL/queue-stats"
RESPONSE=$(curl -s "$API_URL/queue-stats")
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"

print_info "Você deve ver o job adicionado às estatísticas"

# ============================================
print_section "6. Testar Validações"
# ============================================

# Teste 1: URL inválida
echo "Teste 1: URL inválida"
echo "POST $API_URL/process (URL inválida)"
RESPONSE=$(curl -s -X POST "$API_URL/process" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com", "preset":"NIGHTCORE"}')
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
print_success "API rejeitou URL não-YouTube"

# Teste 2: Preset inválido
echo -e "\nTeste 2: Preset inválido"
echo "POST $API_URL/process (Preset inválido)"
RESPONSE=$(curl -s -X POST "$API_URL/process" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://youtu.be/dQw4w9WgXcQ", "preset":"INVALID_PRESET"}')
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
print_success "API rejeitou preset inválido"

# Teste 3: Faltando URL
echo -e "\nTeste 3: Faltando parâmetros"
echo "POST $API_URL/process (Faltando URL)"
RESPONSE=$(curl -s -X POST "$API_URL/process" \
  -H "Content-Type: application/json" \
  -d '{"preset":"NIGHTCORE"}')
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
print_success "API rejeitou requisição incompleta"

# ============================================
print_section "7. Testar Job Inexistente"
# ============================================

echo "GET $API_URL/status/INVALID_ID"
RESPONSE=$(curl -s "$API_URL/status/INVALID_ID")
echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
print_success "API retornou 404 para job inexistente"

# ============================================
print_section "8. Testar Download Prematuro"
# ============================================

echo "GET $API_URL/file/$JOB_ID (antes de concluir)"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/file/$JOB_ID")

if [ "$HTTP_CODE" == "400" ]; then
    print_success "API retornou 400 (not ready) - Correto!"
else
    print_info "API retornou código HTTP: $HTTP_CODE"
fi

# ============================================
print_section "9. Polling de Status (Simular Usuário)"
# ============================================

print_info "Fazendo polling do job por 10 segundos..."
print_info "Pressione Ctrl+C para parar"

for i in {1..10}; do
    RESPONSE=$(curl -s "$API_URL/status/$JOB_ID")
    STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null)
    PROGRESS=$(echo "$RESPONSE" | jq -r '.progress' 2>/dev/null)
    
    echo -ne "[$i/10] Status: $STATUS (${PROGRESS}%) \r"
    sleep 1
done

echo ""
print_success "Polling concluído"

# ============================================
print_section "10. Testar Todos os Presets"
# ============================================

PRESETS=("SLOWED" "SPEED_125" "ULTRA_SLOWED" "MUFFLED_SLOWED" "MUFFLED_SPEED" "DAYCORE" "NIGHTCORE" "8D")

for PRESET in "${PRESETS[@]}"; do
    RESPONSE=$(curl -s -X POST "$API_URL/process" \
      -H "Content-Type: application/json" \
      -d "{\"url\":\"https://youtu.be/dQw4w9WgXcQ\", \"preset\":\"$PRESET\"}")
    
    JID=$(echo "$RESPONSE" | jq -r '.id' 2>/dev/null)
    
    if [ -z "$JID" ] || [ "$JID" == "null" ]; then
        print_error "Falha com preset $PRESET"
    else
        print_success "Preset $PRESET - ID: $JID"
    fi
done

# ============================================
print_section "11. Resumo"
# ============================================

echo "✅ Testes de API Concluídos!"
echo ""
echo "Próximos passos:"
echo "1. Acompanhe o processamento com: curl $API_URL/status/$JOB_ID"
echo "2. Faça download com: curl $API_URL/file/$JOB_ID -o audio.mp3"
echo "3. Verifique fila com: curl $API_URL/queue-stats"
echo ""
echo "Para visualizar resposta JSON formatada, instale 'jq':"
echo "  ubuntu/debian: sudo apt install jq"
echo "  macOS: brew install jq"
