# Integração Frontend → Backend PIX

## ✅ Alterações Realizadas

### 1. **Frontend atualizado** (`public/js/plans.js`)

#### Endpoint de criação alterado:
- **Antes:** `POST /api/subscriptions`
- **Agora:** `POST /api/pix/create`

**Payload enviado:**
```javascript
{
  "plan": "voz_pro" | "voz_plus_master"
}
```

**Response esperado:**
```javascript
{
  "success": true,
  "data": {
    "paymentId": "...",
    "transactionId": "uuid",
    "subscriptionId": "...",
    "qrCode": "00020126...",
    "qrCodeBase64": "data:image/png;base64,...",
    "value": 5990,
    "status": "created"
  }
}
```

#### Verificação de status alterada:
- **Antes:** `GET /api/subscriptions/:userId/status`
- **Agora:** `GET /api/pix/payments` (lista todos os pagamentos e verifica se há algum pago)

#### Botão "Já paguei" adicionado:
- Chama `GET /api/pix/check/:transactionId`
- Rate limit: 1 req/min (definido no backend)
- Feedback visual imediato

---

### 2. **HTML atualizado** (`public/html/plans.html`)

**Correções:**
- Plano "Voz Master" → `data-plan="voz_plus_master"` (antes era `voz_master`)
- Preço corrigido: R$ 59,90 (antes R$ 1,50)
- Botão atualizado: `data-plan-target="voz_plus_master"`

---

### 3. **Preços configurados no .env**

```bash
SUBSCRIPTION_VOZ_PLUS_MASTER_PRICE_CENTS=5990  # R$ 59,90
SUBSCRIPTION_VOZ_PRO_PRICE_CENTS=2990          # R$ 29,90
SUBSCRIPTION_VOZ_MASTER_PRICE_CENTS=4990       # R$ 49,90
```

---

## 🔄 Fluxo Completo

### 1. Usuário clica em "Assinar Voz Master"

```
Frontend → POST /api/pix/create
Body: { "plan": "voz_plus_master" }
```

### 2. Backend cria cobrança

```javascript
1. Cria Subscription (status: pending)
2. Chama PushinPay POST /pix/cashIn
3. Salva Payment (status: created)
4. Retorna QR Code
```

### 3. Frontend exibe modal

```
- QR Code em base64
- Código Pix Copia e Cola
- Botão "Copiar"
- Botão "Já paguei"
- Polling automático (3 em 3 segundos)
```

### 4. Usuário paga via PIX

```
App do banco → Escaneia QR Code → Confirma pagamento
```

### 5. PushinPay envia webhook

```
POST /api/webhooks/pushinpay
Header: X-Webhook-Signature
Body: {
  "id": "transaction-id",
  "status": "paid",
  "end_to_end_id": "E123...",
  "payer_name": "João Silva"
}
```

### 6. Backend processa webhook

```javascript
1. Valida assinatura
2. Busca Payment pelo transactionId
3. Atualiza Payment → status: paid
4. Ativa Subscription → status: active, expiresAt: +30 dias
5. Atualiza User → plan: voz_master
6. Responde 200 OK
```

### 7. Frontend detecta mudança

```javascript
- Polling encontra payment com status 'paid'
- Atualiza localStorage
- Exibe mensagem de sucesso
- Para o polling
```

---

## 🧪 Como Testar

### 1. Inicie o servidor

```bash
npm run dev
```

### 2. Acesse a página de planos

```
http://localhost:8080/plans
```

### 3. Faça login/cadastro

### 4. Clique em "Assinar Voz Master"

### 5. Simule o webhook (em outro terminal)

```bash
curl -X POST http://localhost:8080/api/webhooks/pushinpay \
  -H "X-Webhook-Signature: 56562|LrztYKxUlEw6B9SKHHUh4AQPKgXN3IuCVxipHYBVa70758d6" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "TRANSACTION_ID_AQUI",
    "status": "paid",
    "end_to_end_id": "E12345678901234567890123456789012",
    "payer_name": "Teste",
    "payer_national_registration": "12345678900"
  }'
```

**⚠️ Substitua `TRANSACTION_ID_AQUI` pelo ID retornado no console do browser**

### 6. Verifique o resultado

- Modal deve mostrar "Pagamento Confirmado!"
- Usuário redirecionado para `/html/index.html`
- Plano atualizado no localStorage e no banco

---

## 📊 Endpoints Disponíveis

| Método | Endpoint | Descrição | Auth |
|--------|----------|-----------|------|
| POST | `/api/pix/create` | Criar cobrança PIX | ✅ |
| GET | `/api/pix/payments` | Listar pagamentos do usuário | ✅ |
| GET | `/api/pix/check/:id` | Verificar status manual | ✅ |
| POST | `/api/webhooks/pushinpay` | Webhook PushinPay | ❌* |

*Autenticado por assinatura no header

---

## 🔒 Segurança

✅ Webhook validado por assinatura  
✅ Rate limit: 5 cobranças/hora  
✅ Rate limit: 1 consulta/minuto  
✅ JWT obrigatório em rotas protegidas  
✅ Idempotência no processamento de webhook  
✅ Valor mínimo: 50 centavos  

---

## 🐛 Troubleshooting

### Modal não abre
- Verifique console do browser
- Confirme que JWT está no localStorage: `phona:token`
- Verifique autenticação no backend

### QR Code não aparece
- Verifique response da API no Network tab
- Confirme que `qrCodeBase64` está presente
- Verifique logs do servidor

### Pagamento não confirma
- Verifique se webhook foi recebido (logs do servidor)
- Simule webhook manualmente com curl
- Verifique `PUSHINPAY_WEBHOOK_SECRET` no .env
- Confirme que `transactionId` está correto

### Polling não para
- Verifique se status está sendo atualizado no banco
- Confirme que polling está buscando o endpoint correto
- Veja logs do browser console

---

## 📝 Notas Importantes

1. **Webhook é prioritário**: Nunca dependa apenas do polling
2. **Valor sempre em centavos**: Backend espera `5990` = R$ 59,90
3. **Expira em 15 minutos**: QR Code PIX tem validade curta
4. **Idempotente**: Webhook pode chegar várias vezes
5. **Status inicial sempre `created`**: Nunca ative plano antes de `paid`

---

## ✨ Próximos Passos

- [ ] Testar em produção com valores reais
- [ ] Configurar webhook público (ngrok/servidor)
- [ ] Adicionar notificação por email
- [ ] Dashboard de pagamentos
- [ ] Relatórios administrativos
- [ ] Cancelamento de assinatura
- [ ] Renovação automática

---

**Sistema pronto para uso! 🚀**
