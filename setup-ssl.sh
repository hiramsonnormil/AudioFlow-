#!/bin/bash

# ================================================
# Script de Configuração SSL com Certbot
# ================================================

set -e

echo "🔒 Configurando SSL com Let's Encrypt..."

# Instalar Certbot
echo "📦 Instalando Certbot..."
sudo apt-get update
sudo apt-get install -y certbot python3-certbot-nginx

# Solicitar domínio
read -p "Digite seu domínio (ex: api.seu-dominio.com): " DOMAIN
read -p "Digite seu email: " EMAIL

echo "🚀 Obtendo certificado SSL para $DOMAIN..."

# Obter certificado
sudo certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL

echo "✅ SSL configurado com sucesso!"
echo "📝 O certificado será renovado automaticamente"

# Testar renovação
sudo certbot renew --dry-run

echo "✨ Configuração completa!"
