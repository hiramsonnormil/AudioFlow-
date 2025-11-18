#!/bin/bash

# =============================================================================
# AudioFlow - MongoDB Atlas Setup Script
# Facilita a configuração do ambiente local com Atlas
# =============================================================================

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  🎵 AudioFlow - MongoDB Atlas Setup                          ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir status
print_status() {
  echo -e "${BLUE}→${NC} $1"
}

print_success() {
  echo -e "${GREEN}✓${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

# 1. Verificar Node.js e npm
print_status "Verificando Node.js e npm..."
if ! command -v node &> /dev/null; then
  print_error "Node.js não encontrado! Instale em: https://nodejs.org/"
  exit 1
fi
print_success "Node.js $(node -v) encontrado"

if ! command -v npm &> /dev/null; then
  print_error "npm não encontrado!"
  exit 1
fi
print_success "npm $(npm -v) encontrado"

# 2. Verificar/Criar .env
print_status "Verificando arquivo .env..."
if [ -f ".env" ]; then
  print_success ".env já existe"
  print_warning "Verifique se contém MONGODB_URI correto"
else
  print_status "Criando .env..."
  cat > .env << 'EOF'
# ===== MONGODB ATLAS =====
MONGODB_URI=mongodb+srv://hiramsonnormil00_db_user:SEU_PASSWORD_AQUI@cluster0.6xlfrnb.mongodb.net/audioflow?retryWrites=true&w=majority&appName=Cluster0

# ===== SERVER =====
PORT=8080
NODE_ENV=development

# ===== JWT (Para autenticação futura) =====
JWT_SECRET=seu_super_secret_jwt_key_aqui_mude_em_producao

# ===== AUDIO PROCESSING =====
MAX_CONCURRENT_JOBS=10
CLEANUP_OLD_JOBS_HOURS=24
EOF
  print_success ".env criado com configurações padrão"
  print_warning "IMPORTANTE: Atualize MONGODB_URI com sua senha real!"
fi

# 3. Instalar dependências
print_status "Instalando dependências npm..."
if npm install; then
  print_success "Dependências instaladas"
else
  print_error "Erro ao instalar dependências"
  exit 1
fi

# 4. Criar pasta storage se não existir
print_status "Verificando estrutura de armazenamento..."
mkdir -p storage/{in,out,meta}
print_success "Pastas criadas: storage/{in,out,meta}"

# 5. Verificar MongoDB Atlas
print_status "Próximos passos para MongoDB Atlas:"
echo ""
echo "1️⃣  Acesse: https://www.mongodb.com/cloud/atlas"
echo "2️⃣  Crie um Free Shared Cluster"
echo "3️⃣  Crie um usuário: hiramsonnormil00_db_user"
echo "4️⃣  Adicione seu IP em 'Network Access'"
echo "5️⃣  Copie a connection string"
echo "6️⃣  Cole a senha real no .env:"
echo ""
echo "   MONGODB_URI=mongodb+srv://hiramsonnormil00_db_user:SEU_PASSWORD@cluster0.6xlfrnb.mongodb.net/audioflow"
echo ""

# 6. Ofercer para editar .env
read -p "Deseja editar o .env agora? (s/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
  if command -v code &> /dev/null; then
    code .env
  elif command -v nano &> /dev/null; then
    nano .env
  else
    vi .env
  fi
fi

# 7. Resumo
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║  📋 Setup Completo!                                           ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
print_success "Ambiente pronto para desenvolvimento"
echo ""
echo "Próximos passos:"
echo "  1. Atualize .env com sua senha do MongoDB Atlas"
echo "  2. Execute: npm start"
echo "  3. Abra: http://localhost:8080"
echo "  4. Veja a documentação em: ATLAS_SETUP.md"
echo ""
echo "Comandos úteis:"
echo "  npm start     → Iniciar servidor"
echo "  npm run dev   → Iniciar com nodemon (reload automático)"
echo "  curl http://localhost:8080/health/db → Testar conexão"
echo ""
