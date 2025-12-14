# Sistema de Pagamento e Assinaturas - Arquitetura Sincronizada

## 🎯 Visão Geral

Sistema completamente automatizado onde **Payment → Subscription → User** se sincronizam automaticamente via hooks do Mongoose.

## 📊 Fluxo Automático

```
1. Usuário cria PIX
   ↓
2. Payment (status: created) + Subscription (status: pending)
   ↓
3. Webhook PushinPay confirma pagamento
   ↓
4. Payment.markAsPaid() → status = "paid"
   ↓
5. 🔄 HOOK automático: Payment.activateSubscription()
   ↓
6. Subscription.activate() → status = "active", expiresAt definido
   ↓
7. 🔄 HOOK automático: Subscription.syncWithUser()
   ↓
8. User.updatePlanFromSubscription() → plan atualizado
   ↓
9. ✅ Tudo sincronizado automaticamente!
```

## 🗄️ Estrutura dos Models

### User
```javascript
{
  email: String,
  plan: "free" | "voz_pro" | "voz_master" | "voz_plus_master",
  
  // Campos de cache (sincronizados automaticamente)
  activeSubscription: ObjectId,          // Ref para Subscription ativa
  subscriptionStatus: "none" | "active" | "pending" | "expired",
  subscriptionExpiresAt: Date,
  
  // Métodos
  updatePlanFromSubscription(subscription) // Sincroniza com Subscription
}
```

### Subscription
```javascript
{
  userId: ObjectId,
  plan: "voz_pro" | "voz_master" | "voz_plus_master",
  status: "pending" | "active" | "expired" | "canceled",
  value: Number,
  startedAt: Date,
  expiresAt: Date,
  activatingPaymentId: ObjectId,         // Payment que ativou
  renewalHistory: [],                     // Histórico de renovações
  
  // Métodos
  activate(days, paymentId)               // Ativa e sincroniza com User
  renew(days, paymentId)                  // Renova assinatura ativa
  cancel()                                // Cancela e reseta User
  expire()                                // Expira e reseta User
  syncWithUser()                          // Sincroniza com User
}
```

### Payment
```javascript
{
  userId: ObjectId,
  subscriptionId: ObjectId,
  plan: "voz_pro" | "voz_master" | "voz_plus_master",
  value: Number,
  status: "created" | "pending" | "paid" | "expired",
  transactionId: String,
  paidAt: Date,
  qrCode: String,
  qrCodeBase64: String,
  
  // Métodos
  markAsPaid(data)                        // Marca como pago e ATIVA automaticamente
  activateSubscription()                  // Ativa Subscription relacionada
}
```

## 🔄 Hooks Automáticos

### Payment (post-save)
Quando `status` muda para "paid":
```javascript
SubscriptionSchema.post('save', async function(doc) {
  if (doc.status === 'paid' && !doc.paidAt) {
    await doc.activateSubscription();  // Ativa Subscription
  }
});
```

### Subscription (post-save)
Quando `status` ou `expiresAt` mudam:
```javascript
SubscriptionSchema.post('save', async function(doc) {
  if (doc.isModified('status') || doc.isModified('expiresAt')) {
    await doc.syncWithUser();  // Sincroniza com User
  }
});
```

## 🚀 Uso Prático

### 1. Criar Cobrança PIX
```javascript
// POST /api/pix/create
const result = await paymentService.createPixCharge({
  userId: "xxx",
  plan: "voz_plus_master",
  value: 5990
});

// Resultado:
// - Payment (status: created)
// - Subscription (status: pending)
// - QR Code gerado
```

### 2. Webhook Confirma Pagamento
```javascript
// POST /api/webhooks/pushinpay
// Body: { id: "xxx", status: "paid" }

await paymentService.processPaymentConfirmation({
  transactionId: "xxx",
  status: "paid"
});

// 🔄 Automático:
// 1. Payment → status = "paid"
// 2. Hook ativa Subscription
// 3. Subscription → status = "active"
// 4. Hook sincroniza User
// 5. User → plan = "voz_plus_master"
```

### 3. Consulta Manual (fallback)
```javascript
// GET /api/pix/check/:transactionId
// Para quando usuário clica "Já paguei"

await paymentService.checkPaymentStatus(transactionId);

// Consulta PushinPay e processa se pago
```

## 📋 Endpoints da API

### Criar PIX
```
POST /api/pix/create
Authorization: Bearer {token}

Body:
{
  "plan": "voz_plus_master"
}

Response:
{
  "success": true,
  "data": {
    "paymentId": "xxx",
    "transactionId": "xxx",
    "subscriptionId": "xxx",
    "qrCode": "00020101...",
    "qrCodeBase64": "data:image/png;base64...",
    "value": 5990,
    "status": "created"
  }
}
```

### Webhook PushinPay
```
POST /api/webhooks/pushinpay
X-Webhook-Signature: {secret}

Body:
{
  "id": "transaction-id",
  "status": "paid",
  "end_to_end_id": "...",
  "payer_name": "...",
  "payer_national_registration": "..."
}

Response:
{
  "success": true,
  "received": true
}
```

### Consultar Status
```
GET /api/pix/check/:transactionId
Authorization: Bearer {token}

Response:
{
  "success": true,
  "data": {
    "status": "paid",
    "payment": { ... }
  }
}
```

### Status da Conta
```
GET /api/account/status
Authorization: Bearer {token}

Response:
{
  "user": {
    "id": "xxx",
    "email": "user@example.com",
    "plan": "voz_plus_master",
    "memberSince": "2025-11-19T21:06:38.127Z"
  },
  "subscription": {
    "plan": "voz_plus_master",
    "status": "active",
    "expiresAt": "2026-01-12T21:48:39.626Z",
    "daysRemaining": 30
  },
  "paymentHistory": [...]
}
```

### Sincronizar Plano Manual
```
POST /api/account/sync-plan
Authorization: Bearer {token}

Response:
{
  "success": true,
  "oldPlan": "free",
  "newPlan": "voz_plus_master"
}
```

## 🛠️ Manutenção

### Migrar Dados Existentes
```bash
node migrate-sync-structure.js
```

Isso vai:
- Adicionar campo `plan` aos Payments antigos
- Sincronizar todos os Users com suas Subscriptions
- Expirar Subscriptions vencidas
- Gerar relatório completo

### Cron Job Automático
```bash
# Adicionar ao crontab (executa a cada hora)
0 * * * * cd /path/to/project && node cron-sync-subscriptions.js >> logs/cron-sync.log 2>&1
```

Isso vai:
- Expirar assinaturas vencidas automaticamente
- Sincronizar users com assinaturas expiradas
- Resetar para "free" quem não tem assinatura ativa

## ✅ Garantias de Consistência

1. **Idempotência**: Webhook pode ser chamado múltiplas vezes sem problema
2. **Transações**: Cada operação valida estado antes de processar
3. **Sincronização automática**: Hooks garantem que User sempre reflete Subscription
4. **Cache otimizado**: User tem campos de cache para queries rápidas
5. **Limpeza automática**: Cron job expira assinaturas vencidas

## 🎯 Próximos Passos

1. ✅ Executar migração: `node migrate-sync-structure.js`
2. ✅ Testar fluxo de pagamento completo
3. ✅ Configurar cron job no servidor
4. ✅ Monitorar logs de sincronização

## 📝 Notas Importantes

- **NUNCA** atualizar `User.plan` manualmente - sempre via `updatePlanFromSubscription()`
- **NUNCA** ativar Subscription fora do método `activate()` ou `renew()`
- **SEMPRE** deixar os hooks fazerem o trabalho de sincronização
- **WEBHOOK** é a fonte da verdade, consulta manual é apenas fallback
