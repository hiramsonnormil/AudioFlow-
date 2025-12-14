# Sistema de Pagamentos PIX - PushinPay

## 📋 Visão Geral

Sistema completo de pagamentos PIX integrado com PushinPay, seguindo arquitetura limpa e separação de responsabilidades.

**Princípios fundamentais:**
- Webhook é a fonte da verdade
- Consulta manual apenas como fallback
- Pagamento NÃO libera acesso automaticamente
- Assinatura governa permissões

---

## 🏗️ Arquitetura

```
src/
├── models/
│   ├── Payment.js         # Modelo de pagamento
│   └── Subscription.js    # Modelo de assinatura
├── services/
│   ├── PushinPayService.js   # Cliente HTTP para API PushinPay
│   └── PaymentService.js     # Lógica de negócio
├── controllers/
│   └── PixController.js      # Handlers de requisições
└── routes/
    ├── pix.js             # Rotas de pagamento
    └── webhooks.js        # Rotas de webhook
```

---

## 🔐 Variáveis de Ambiente

```bash
# PushinPay
PUSHINPAY_API_KEY=55153|lWfzCI7oclviTRQaIv0htHFCnPNlasZnjnz150Bcab2c3313
PUSHINPAY_BASE_URL=https://api.pushinpay.com.br/api
PUSHINPAY_WEBHOOK_SECRET=56562|LrztYKxUlEw6B9SKHHUh4AQPKgXN3IuCVxipHYBVa70758d6

# Webhook
WEBHOOK_BASE_URL=http://localhost:8080

# Planos (valores em centavos)
SUBSCRIPTION_VOZ_PLUS_MASTER_PRICE_CENTS=5990
SUBSCRIPTION_VOZ_PRO_PRICE_CENTS=2990
SUBSCRIPTION_VOZ_MASTER_PRICE_CENTS=4990
```

---

## 📡 Endpoints

### 1. Criar Cobrança PIX

```http
POST /api/pix/create
Authorization: Bearer {token}
Content-Type: application/json

{
  "plan": "voz_plus_master"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "paymentId": "6789...",
    "transactionId": "uuid-pushinpay",
    "subscriptionId": "6789...",
    "qrCode": "00020126...",
    "qrCodeBase64": "data:image/png;base64,...",
    "value": 5990,
    "status": "created",
    "createdAt": "2025-12-13T..."
  }
}
```

**Rate Limit:** 5 cobranças por hora

---

### 2. Webhook PushinPay (Automático)

```http
POST /api/webhooks/pushinpay
X-Webhook-Signature: {PUSHINPAY_WEBHOOK_SECRET}
Content-Type: application/json

{
  "id": "uuid-transaction",
  "status": "paid",
  "end_to_end_id": "E12345678...",
  "payer_name": "João Silva",
  "payer_national_registration": "12345678900"
}
```

**Response 200:**
```json
{
  "success": true,
  "received": true,
  "alreadyProcessed": false
}
```

**⚠️ Importante:**
- Sempre responde 200 (mesmo em erro interno)
- Validação por assinatura no header
- Idempotente (pode ser reenviado até 3x)

---

### 3. Consultar Status Manualmente

```http
GET /api/pix/check/:transactionId
Authorization: Bearer {token}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "status": "paid",
    "payment": { ... }
  }
}
```

**⚠️ Uso:**
- APENAS quando usuário clicar "Já paguei"
- Rate limit: 1 requisição por minuto
- Nunca usar polling automático

---

### 4. Listar Pagamentos

```http
GET /api/pix/payments?status=paid
Authorization: Bearer {token}
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "6789...",
      "transactionId": "uuid",
      "value": 5990,
      "status": "paid",
      "createdAt": "2025-12-13T...",
      "subscriptionId": { ... }
    }
  ]
}
```

---

## 🔄 Fluxo Completo

### 1️⃣ Criação da Cobrança

```
Frontend                Backend                PushinPay
   |                      |                        |
   |--POST /api/pix/create-->                      |
   |                      |                        |
   |                      |--Cria Subscription---->| (status: pending)
   |                      |                        |
   |                      |--POST /pix/cashIn----->|
   |                      |                        |
   |                      |<-----QR Code-----------|
   |                      |                        |
   |                      |--Salva Payment-------->| (status: created)
   |                      |                        |
   |<----QR Code + Base64-|                        |
   |                      |                        |
```

### 2️⃣ Confirmação via Webhook

```
PushinPay              Backend                 Database
   |                      |                        |
   |--POST /webhooks/pushinpay------------------>  |
   |  {status: "paid"}    |                        |
   |                      |                        |
   |                      |--Valida assinatura---->|
   |                      |                        |
   |                      |--Busca Payment-------->|
   |                      |                        |
   |                      |--Atualiza status------>| paid
   |                      |                        |
   |                      |--Ativa Subscription--->| active
   |                      |                        |
   |                      |--Atualiza User.plan--->| voz_master
   |                      |                        |
   |<--------200 OK-------|                        |
```

### 3️⃣ Consulta Manual (Fallback)

```
Frontend                Backend                PushinPay
   |                      |                        |
   |--Usuário clica      |                        |
   |  "Já paguei"------->|                        |
   |                      |                        |
   |--GET /api/pix/check/:id------------------->  |
   |                      |                        |
   |                      |--GET /transactions/id->|
   |                      |                        |
   |                      |<----status: paid-------|
   |                      |                        |
   |                      |--Se paid, ativa------->|
   |                      |  assinatura            |
   |                      |                        |
   |<----status atualizado|                        |
```

---

## 🗄️ Modelos de Dados

### Payment

```javascript
{
  provider: "pushinpay",
  transactionId: String,        // ID retornado pela PushinPay
  subscriptionId: ObjectId,     // Referência à Subscription
  userId: ObjectId,             // Referência ao User
  value: Number,                // Valor em centavos
  status: "created" | "paid" | "expired" | "canceled",
  endToEndId: String,           // ID E2E do PIX (após pagamento)
  payer: {
    name: String,               // Nome do pagador
    document: String            // CPF/CNPJ
  },
  qrCode: String,               // EMV do QR Code
  qrCodeBase64: String,         // Imagem base64
  rawPayload: Object,           // Response completo da PushinPay
  createdAt: Date,
  updatedAt: Date
}
```

### Subscription

```javascript
{
  userId: ObjectId,
  plan: "voz_plus_master" | "voz_pro" | "voz_master",
  status: "pending" | "active" | "expired" | "canceled",
  value: Number,                // Valor pago
  startedAt: Date,              // Data de ativação
  expiresAt: Date,              // Data de expiração (30 dias após ativação)
  canceledAt: Date,
  metadata: Object,
  createdAt: Date,
  updatedAt: Date
}
```

---

## ⚠️ Regras Críticas

### ✅ SEMPRE

1. **Validar assinatura do webhook** antes de processar
2. **Responder 200** ao webhook (mesmo em erro interno)
3. **Implementar idempotência** no processamento
4. **Salvar rawPayload** para auditoria
5. **Ativar assinatura APENAS** quando `status === "paid"`

### ❌ NUNCA

1. Ativar assinatura no endpoint de criação
2. Fazer polling automático de status
3. Confiar em status sem validação
4. Ignorar webhook duplicado sem verificar
5. Misturar lógica de negócio no controller

---

## 🧪 Testes

### Criar cobrança de teste

```bash
curl -X POST http://localhost:8080/api/pix/create \
  -H "Authorization: Bearer {seu-token}" \
  -H "Content-Type: application/json" \
  -d '{"plan": "voz_plus_master"}'
```

### Simular webhook (desenvolvimento)

```bash
curl -X POST http://localhost:8080/api/webhooks/pushinpay \
  -H "X-Webhook-Signature: 56562|LrztYKxUlEw6B9SKHHUh4AQPKgXN3IuCVxipHYBVa70758d6" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "transaction-id-aqui",
    "status": "paid",
    "end_to_end_id": "E12345678901234567890123456789012",
    "payer_name": "João Teste",
    "payer_national_registration": "12345678900"
  }'
```

---

## 🛡️ Segurança

### Rate Limits

- **Criação PIX:** 5 por hora
- **Consulta manual:** 1 por minuto
- **Webhook:** Sem limite (validado por assinatura)

### Validações

1. Autenticação JWT em rotas protegidas
2. Validação de assinatura no webhook
3. Sanitização de dados de entrada
4. Valor mínimo: 50 centavos

---

## 📊 Logs e Monitoramento

### Eventos Importantes

```javascript
// Pagamento criado
console.log('[PaymentService] Cobrança criada:', { transactionId, value });

// Pagamento confirmado
console.log('[PaymentService] ✅ Pagamento confirmado. Assinatura ativada.');

// Pagamento já processado
console.log('[PaymentService] Payment já está pago. Ignorando.');

// Webhook recebido
console.log('[PixController] Webhook recebido:', { transactionId, status });

// Webhook com assinatura inválida
console.warn('[PixController] ⚠️ Assinatura inválida no webhook');
```

---

## 🔧 Troubleshooting

### Webhook não está chegando

1. Verificar `WEBHOOK_BASE_URL` no .env
2. Confirmar que servidor está acessível publicamente
3. Verificar logs do PushinPay no painel deles
4. Testar webhook com ngrok/localtunnel em desenvolvimento

### Pagamento não ativa assinatura

1. Verificar logs: `[PaymentService]`
2. Confirmar que webhook foi recebido com status `paid`
3. Verificar se `Payment.status` foi atualizado
4. Verificar se `Subscription.status === "active"`

### Erro de validação

1. Confirmar `PUSHINPAY_WEBHOOK_SECRET` correto
2. Verificar header `X-Webhook-Signature`
3. Testar manualmente com curl

---

## 📚 Documentação PushinPay

### API Base

- **Produção:** `https://api.pushinpay.com.br/api`
- **Sandbox:** `https://api-sandbox.pushinpay.com.br/api`

### Headers Obrigatórios

```
Authorization: Bearer {PUSHINPAY_API_KEY}
Accept: application/json
Content-Type: application/json
```

### Endpoints Utilizados

- `POST /pix/cashIn` - Criar cobrança
- `GET /transactions/{id}` - Consultar status

---

## ✅ Checklist de Implementação

- [x] Modelo `Payment` criado
- [x] Modelo `Subscription` criado
- [x] `PushinPayService` (cliente HTTP)
- [x] `PaymentService` (lógica de negócio)
- [x] `PixController` (handlers)
- [x] Rotas configuradas
- [x] Middleware de autenticação
- [x] Rate limiters
- [x] Webhook endpoint
- [x] Validação de assinatura
- [x] Idempotência implementada
- [x] Variáveis ENV configuradas
- [x] Documentação completa

---

## 🚀 Próximos Passos

1. **Frontend:**
   - Interface para seleção de plano
   - Display do QR Code
   - Botão "Já paguei"
   - Feedback visual de confirmação

2. **Melhorias:**
   - Notificações por email após confirmação
   - Dashboard de pagamentos para usuário
   - Relatórios administrativos
   - Logs estruturados (Winston/Pino)

3. **Produção:**
   - Configurar webhook em servidor público
   - Testar com valores reais
   - Monitorar taxa de conversão
   - Implementar retry logic robusto

---

**Desenvolvido com base nas melhores práticas de segurança e arquitetura limpa.**
