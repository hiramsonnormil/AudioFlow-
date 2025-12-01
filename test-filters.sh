#!/bin/bash
# Script de teste para validar filtros FFmpeg do Phona
# Testa a sintaxe de cada filtro sem processar áudio real

echo "🧪 Testando Filtros FFmpeg - Phona"
echo "===================================="
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Contador de testes
TOTAL=0
PASSED=0
FAILED=0

# Função para testar um filtro
test_filter() {
    local name=$1
    local filter=$2
    
    TOTAL=$((TOTAL + 1))
    echo -n "Testing $name... "
    
    # Testar sintaxe do filtro (sem processar arquivo real)
    if ffmpeg -f lavfi -i "sine=frequency=1000:duration=1" -af "$filter" -f null - 2>&1 | grep -q "Output #0"; then
        echo -e "${GREEN}✓ PASS${NC}"
        PASSED=$((PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC}"
        FAILED=$((FAILED + 1))
        return 1
    fi
}

echo "📋 Testando sintaxe dos filtros FFmpeg..."
echo ""

# 1. SLOWED
test_filter "SLOWED" "atempo=0.75,loudnorm=I=-14:TP=-1.0"

# 2. SPEED UP
test_filter "SPEED_125" "atempo=1.5,loudnorm=I=-14:TP=-1.0"

# 3. NIGHTCORE
test_filter "NIGHTCORE" "asetrate=44100*1.25,aresample=44100,loudnorm=I=-14:TP=-1.0"

# 5. DAYCORE
test_filter "DAYCORE" "asetrate=44100*0.80,aresample=44100,loudnorm=I=-14:TP=-1.0"

# 6. MUFFLED SLOWED
test_filter "MUFFLED_SLOWED" "lowpass=f=3000,atempo=0.75,loudnorm=I=-14:TP=-1.0"

# 7. MUFFLED SPEED
test_filter "MUFFLED_SPEED" "lowpass=f=3000,atempo=1.5,loudnorm=I=-14:TP=-1.0"

# 8. PHONA
test_filter "PHONA" "highpass=f=300,lowpass=f=3400,loudnorm=I=-14:TP=-1.0"

# 9. ECHO
test_filter "ECHO" "aecho=0.6:0.5:800:0.3,loudnorm=I=-14:TP=-1.0"

# 10. REVERB
test_filter "REVERB" "aecho=0.5:0.6:40|60|80:0.4|0.3|0.2,loudnorm=I=-14:TP=-1.0"

# 11. BASS BOOST
test_filter "BASS_BOOST" "bass=g=12:f=100:w=0.6,loudnorm=I=-14:TP=-1.0"

# 12. ROBOT VOICE
test_filter "ROBOT_VOICE" "afftfilt=real='hypot(re,im)*cos(0)':imag='hypot(re,im)*sin(0)',aecho=0.3:0.4:50:0.2,loudnorm=I=-14:TP=-1.0"

# 13. 8D AUDIO
test_filter "8D" "apulsator=mode=sine:hz=0.125:width=0.9,loudnorm=I=-14:TP=-1.0"

echo ""
echo "===================================="
echo "📊 Resultados:"
echo "   Total:  $TOTAL testes"
echo -e "   ${GREEN}Passou: $PASSED${NC}"
echo -e "   ${RED}Falhou: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ Todos os filtros estão funcionando!${NC}"
    exit 0
else
    echo -e "${RED}❌ Alguns filtros falharam. Verifique os erros acima.${NC}"
    exit 1
fi
