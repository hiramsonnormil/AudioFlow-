#!/bin/bash
# TESTE RÁPIDO DO PROCESSAMENTO EM MASSA

echo "🧪 TESTE DE PROCESSAMENTO EM MASSA"
echo "=================================="
echo ""

# Verificar se o servidor está rodando
if ! curl -s http://localhost:8080 > /dev/null; then
  echo "❌ Servidor não está rodando!"
  echo "Inicie com: npm start"
  exit 1
fi

echo "✅ Servidor está online"
echo ""

# Teste 1: Criar um job
echo "📝 Teste 1: Criando job..."
JOB=$(curl -s -X POST http://localhost:8080/process \
  -H "Content-Type: application/json" \
  -d '{"url":"https://youtu.be/dQw4w9WgXcQ","preset":"SLOWED"}')

JOB_ID=$(echo $JOB | grep -o '"id":"[^"]*' | cut -d'"' -f4)

if [ -z "$JOB_ID" ]; then
  echo "❌ Erro ao criar job"
  echo "Resposta: $JOB"
  exit 1
fi

echo "✅ Job criado: $JOB_ID"
echo ""

# Teste 2: Verificar status
echo "📊 Teste 2: Verificando status..."
sleep 1
STATUS=$(curl -s http://localhost:8080/status/$JOB_ID)
echo "Status inicial: $STATUS"
echo ""

# Teste 3: Obter estatísticas da fila
echo "📈 Teste 3: Estatísticas da fila..."
STATS=$(curl -s http://localhost:8080/queue-stats)
echo "$STATS" | jq '.'
echo ""

# Teste 4: Múltiplos jobs
echo "🔢 Teste 4: Criando múltiplos jobs (3x)..."
for i in {1..3}; do
  curl -s -X POST http://localhost:8080/process \
    -H "Content-Type: application/json" \
    -d "{\"url\":\"https://youtu.be/dQw4w9WgXcQ\",\"preset\":\"NIGHTCORE\"}" > /dev/null
  echo "  ✅ Job $i criado"
done

echo ""
echo "📈 Fila final:"
curl -s http://localhost:8080/queue-stats | jq '.'

echo ""
echo "✨ Todos os testes concluídos!"
echo ""
echo "💡 Dica: Acesse http://localhost:8080/batch.html para testar a UI"
