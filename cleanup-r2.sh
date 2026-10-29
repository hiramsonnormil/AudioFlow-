#!/bin/bash

#########################################################
# Script de limpeza automática de arquivos expirados   #
# Cloudflare R2                                         #
#                                                       #
# Este script deve ser executado periodicamente via     #
# cron job para limpar arquivos com mais de 24 horas   #
#########################################################

# Configurações
API_BASE_URL="${API_BASE_URL:-http://localhost:3000}"
LOG_FILE="/var/log/phona-r2-cleanup.log"

# Função de log
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

log "========================================"
log "Iniciando limpeza de arquivos expirados"
log "========================================"

# Lista de usuários a limpar (você precisa adaptar isso ao seu sistema)
# Exemplo: buscar do banco de dados, arquivo, etc
# Por enquanto, vamos fazer uma limpeza geral

# Opção 1: Se você mantém uma lista de usuários
USERS_FILE="/tmp/r2-users.txt"

if [ -f "$USERS_FILE" ]; then
    log "Limpando arquivos de usuários listados em $USERS_FILE"
    
    while IFS= read -r user_id; do
        if [ -n "$user_id" ]; then
            log "Processando usuário: $user_id"
            
            response=$(curl -s -X POST "$API_BASE_URL/api/r2-test/cleanup" \
                -H "Content-Type: application/json" \
                -d "{\"userId\": \"$user_id\"}")
            
            deleted=$(echo "$response" | jq -r '.deleted // 0')
            errors=$(echo "$response" | jq -r '.errors // 0')
            
            log "  → Deletados: $deleted | Erros: $errors"
        fi
    done < "$USERS_FILE"
else
    log "AVISO: Arquivo $USERS_FILE não encontrado"
fi

# Opção 2: Limpeza via API que varre todos os prefixos
# (você precisaria implementar um endpoint /api/r2-test/cleanup-all)

log "========================================"
log "Limpeza concluída"
log "========================================"
log ""

# Exemplo de saída de log:
# [2025-11-20 10:30:00] ========================================
# [2025-11-20 10:30:00] Iniciando limpeza de arquivos expirados
# [2025-11-20 10:30:00] ========================================
# [2025-11-20 10:30:01] Processando usuário: user-123
# [2025-11-20 10:30:02]   → Deletados: 3 | Erros: 0
# [2025-11-20 10:30:03] Processando usuário: user-456
# [2025-11-20 10:30:04]   → Deletados: 1 | Erros: 0
# [2025-11-20 10:30:05] ========================================
# [2025-11-20 10:30:05] Limpeza concluída
# [2025-11-20 10:30:05] ========================================
