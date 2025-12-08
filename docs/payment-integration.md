# Fluxo de Pagamento Pix - Phona

## 🎯 Integração Completa Frontend + Backend

Este documento explica o fluxo completo de pagamento via Pix implementado no projeto.

---

## 📋 Arquitetura

### Backend (Node.js + Express)
- **Rota**: `POST /api/subscriptions`
- **Controller**: `src/controllers/subscriptionController.js`
- **Service**: `src/services/pushinpayService.js`
- **Webhook**: `POST /api/webhook/pushinpay`
- **Scheduler**: `src/utils/subscriptionScheduler.js` (cron diário)

### Frontend (Vanilla JS)
- **Página**: `/plans` → `public/html/plans.html`
- **Script**: `public/js/plans.js`
- **Modal**: Sistema de modal dinâmico com QR Code e copia-e-cola

---

## 🔄 Fluxo Completo

### 1. Usuário clica em "Assinar" na página de planos

```javascript
// public/js/plans.js
handlePlanClick(event) → startSubscriptionFlow(planType)
```

### 2. Frontend chama API de criação de assinatura

```javascript
POST /api/subscriptions
Body: {
  userId: "user_id",
  email: "user@example.com",
  planType: "voz_pro" // ou "voz_master"
}
```

### 3. Backend cria cobrança Pix via PushinPay

```javascript
// src/services/pushinpayService.js
createPixCharge({
  value: 1490, // centavos (R$ 14,90)
  webhookUrl: "https://seu-dominio.com/api/webhook/pushinpay",
  description: "Assinatura mensal Voz Pro"
})
```

### 4. Backend retorna dados do Pix

```json
{
  "subscriptionId": "sub_id",
  "userId": "user_id",
  "status": "pending",
  "planType": "voz_pro",
  "pixCopyAndPaste": "00020126580014br.gov.bcb...",
  "pixQrCodeBase64": "iVBORw0KGgoAAAANSUh...",
  "transactionId": "pix_id"
}
```

### 5. Frontend exibe modal com QR Code e código Pix

- QR Code renderizado em `<img>` com base64
- Código copia-e-cola com botão de copiar
- Instruções de pagamento
- Status visual "Aguardando pagamento"

### 6. Polling automático do status

```javascript
// A cada 3 segundos
GET /api/subscriptions/{userId}/status

// Verifica se status mudou para "active"
```

### 7. Usuário paga via app do banco

- Escaneia QR Code ou cola código Pix
- Confirma pagamento de R$ 14,90 ou R$ 29,90

### 8. PushinPay envia webhook

```javascript
POST /api/webhook/pushinpay
Body: {
  event: "pix_payment",
  status: "paid",
  id: "pix_id",
  // ... outros dados
}
```

### 9. Backend processa webhook

```javascript
// src/controllers/webhookController.js
handlePushinpayWebhook()
  → Valida secret
  → Atualiza status do pagamento na Subscription
  → Atualiza campo user.plan
  → Calcula nextBillingDate
```

### 10. Frontend detecta pagamento confirmado

```javascript
// Polling detecta status "active"
→ showSuccessMessage()
→ setTimeout(() => window.location.reload(), 3000)
```

---

## 🎨 Estilo Visual

### Paleta de Cores Phona (Copper Theme)
```css
--copper: #c28c66
--copper-light: #d4a378
--copper-dark: #a67351
--peach: #e8b4a0
--bg-primary: #0d0d0d
--bg-card: #1f1f1f
--text-primary: #f5f1ed
```

### Modal de Pagamento
- Background escuro com blur (`backdrop-filter: blur(12px)`)
- Card com border copper e sombra suave
- Animações: `fadeIn`, `slideUp`, `pulse`
- QR Code em background branco
- Botão "Copiar" com feedback visual
- Status dot animado enquanto aguarda pagamento

---

## 🔒 Segurança

1. **Webhook Secret**: Validação obrigatória via `PUSHINPAY_WEBHOOK_SECRET`
2. **Authentication**: Token JWT nas requisições
3. **Sanitização**: mongo-sanitize, xss-clean, hpp
4. **Rate Limiting**: API limitada a 100 req/15min
5. **CORS**: Origem validada via whitelist

---

## 📦 Variáveis de Ambiente

```bash
# PushinPay API
PUSHINPAY_API_KEY=seu_api_key_aqui
PUSHINPAY_WEBHOOK_SECRET=seu_secret_aqui
PUSHINPAY_BASE_URL=https://api.pushinpay.com.br/api

# Preços (centavos)
SUBSCRIPTION_VOZ_PRO_PRICE_CENTS=1490
SUBSCRIPTION_VOZ_MASTER_PRICE_CENTS=2990

# Webhook URL (produção)
WEBHOOK_BASE_URL=https://seu-dominio.com
```

---

## 🧪 Como Testar

### 1. Desenvolvimento Local

```bash
# Terminal 1: Iniciar servidor
npm run dev

# Terminal 2: Ngrok para webhook
ngrok http 8080
```

### 2. Configurar webhook no .env

```bash
WEBHOOK_BASE_URL=https://abc123.ngrok.io
```

### 3. Acessar página de planos

```
http://localhost:8080/plans
```

### 4. Fluxo de teste

1. Fazer login/signup
2. Clicar em "Assinar Voz Pro" ou "Assinar Voz Master"
3. Visualizar modal com QR Code
4. Usar app PushinPay de sandbox para simular pagamento
5. Aguardar confirmação automática

---

## 🔄 Cobrança Recorrente

### Scheduler Automático (Cron)

```javascript
// src/utils/subscriptionScheduler.js
cron.schedule('0 3 * * *', async () => {
  // Todo dia às 3h da manhã
  // Busca assinaturas com nextBillingDate <= hoje
  // Gera nova cobrança Pix via PushinPay
  // Atualiza nextBillingDate para +30 dias
})
```

### Fluxo de Renovação

1. **Dia 1**: Usuário paga R$ 14,90 → `nextBillingDate = Dia 31`
2. **Dia 31**: Scheduler cria novo Pix automaticamente
3. **Dia 31-33**: Usuário tem 3 dias para pagar
4. **Dia 34**: Se não pagou → `user.plan = 'free'` (downgrade)

---

## 📊 Status do Pagamento

| Status | Descrição | Ação |
|--------|-----------|------|
| `pending` | Pix gerado, aguardando pagamento | Polling ativo |
| `paid` | Pagamento confirmado | Ativar assinatura |
| `expired` | Pix expirado (>3 dias) | Downgrade para free |
| `cancelled` | Usuário cancelou | Manter até fim do período |

---

## 🎯 Planos Disponíveis

### Free
- **Preço**: R$ 0
- **Presets**: Slowed, Slowed + Reverb (2)
- **Limite**: 3 processamentos a cada 2 dias
- **Cancelamento**: N/A

### Voz Pro
- **Preço**: R$ 14,90/mês
- **Presets**: 11 incluídos
- **Limite**: 60 processamentos/dia
- **Cancelamento**: Sem fidelidade

### Voz Master
- **Preço**: R$ 29,90/mês
- **Presets**: Todos disponíveis
- **Limite**: 60 processamentos/dia
- **Extras**: Presets exclusivos, acesso antecipado

---

## 🚀 Deploy

### Checklist de Produção

- [ ] Configurar `PUSHINPAY_API_KEY` na hospedagem
- [ ] Configurar `PUSHINPAY_WEBHOOK_SECRET`
- [ ] Definir `WEBHOOK_BASE_URL` com domínio real
- [ ] Testar webhook com Pix real
- [ ] Verificar cron scheduler está ativo
- [ ] Monitorar logs de pagamento
- [ ] Configurar alertas para pagamentos falhados

---

## 📞 Suporte

Para dúvidas sobre integração PushinPay:
- Documentação: https://docs.pushinpay.com.br
- Email: suporte@pushinpay.com.br

---

**Desenvolvido com 🎵 por Phona Team**
