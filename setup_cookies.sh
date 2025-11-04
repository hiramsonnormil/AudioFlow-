#!/bin/bash

# Script para configurar cookies do YouTube para yt-dlp
# Coloque este arquivo na raiz do projeto e execute: bash setup_cookies.sh

echo "🍪 Configurador de Cookies do YouTube para yt-dlp"
echo "=================================================="
echo ""

# Verificar se yt-dlp está instalado
if ! command -v yt-dlp &> /dev/null; then
    echo "❌ yt-dlp não encontrado. Instalando..."
    pip install yt-dlp
fi

echo "Escolha seu navegador:"
echo "1. Firefox"
echo "2. Chrome/Chromium"
echo "3. Safari (macOS)"
echo ""
read -p "Digite o número (1-3): " choice

case $choice in
    1)
        echo "📦 Extraindo cookies do Firefox..."
        yt-dlp --cookies-from-browser firefox --cookies cookies.txt https://www.youtube.com
        ;;
    2)
        echo "📦 Extraindo cookies do Chrome/Chromium..."
        yt-dlp --cookies-from-browser chrome --cookies cookies.txt https://www.youtube.com
        ;;
    3)
        echo "📦 Extraindo cookies do Safari..."
        yt-dlp --cookies-from-browser safari --cookies cookies.txt https://www.youtube.com
        ;;
    *)
        echo "❌ Opção inválida"
        exit 1
        ;;
esac

if [ -f "cookies.txt" ]; then
    echo ""
    echo "✅ Arquivo cookies.txt criado com sucesso!"
    echo "📍 Localização: $(pwd)/cookies.txt"
    echo ""
    echo "💡 Teste com:"
    echo "   yt-dlp --cookies cookies.txt 'https://www.youtube.com/watch?v=VIDEO_ID'"
else
    echo "❌ Falha ao criar cookies.txt"
    exit 1
fi
