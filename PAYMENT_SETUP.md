# Configuração de Pagamento - PushinPay

## Variáveis de Ambiente Necessárias

Adicione as seguintes variáveis no seu arquivo `.env`:

```env
# PushinPay API Configuration
PUSHINPAY_BASE_URL=https://api.pushinpay.com.br
PUSHINPAY_API_KEY=sua_chave_api_aqui

# Base URL para webhooks (use sua URL de produção)
BASE_URL=https://seudominio.com
```

## Funcionalidades Implementadas

### Backend

1. **Modelo Subscription** (`src/models/Subscription.js`)
   - Rastreia assinaturas de 30 dias
   - Suporta PIX e cartão de crédito
   - Status: pending, active, expired, cancelled

2. **Modelo User Atualizado** (`src/models/User.js`)
   - Campo `plan`: "free" ou "premium"
   - Campo `subscriptionId`: referência à assinatura ativa
   - Campo `premiumExpiresAt`: data de expiração do premium

3. **Service PushinPay** (`src/services/PushinPayService.js`)
   - `createPixPayment()`: Cria pagamento PIX
   - `createCardPayment()`: Cria pagamento com cartão
   - `checkPixStatus()`: Consulta status PIX
   - `checkCardStatus()`: Consulta status cartão

4. **Controller de Pagamento** (`src/controllers/paymentController.js`)
   - `createPixSubscription()`: Inicia assinatura via PIX
   - `createCardSubscription()`: Inicia assinatura via cartão
   - `checkPaymentStatus()`: Consulta status do pagamento
   - `handleWebhook()`: Processa notificações do PushinPay
   - `getActiveSubscription()`: Obtém assinatura ativa do usuário

5. **Rotas de API** (`src/routes/payment.js`)
   - `POST /api/payment/pix` - Criar pagamento PIX
   - `POST /api/payment/card` - Criar pagamento com cartão
   - `GET /api/payment/subscription/active` - Obter assinatura ativa
   - `GET /api/payment/subscription/:id/status` - Consultar status
   - `POST /api/payment/webhook` - Webhook do PushinPay

### Frontend

1. **Modal de Pagamento** (`public/js/payment-modal.js`)
   - Suporte a PIX e cartão de crédito
   - Geração de QR Code PIX
   - Formulário de cartão de crédito
   - Verificação automática de status
   - Feedback visual de sucesso/erro

2. **Página de Planos Atualizada** (`public/html/plans.html`)
   - Modal de pagamento integrado
   - Botão Premium abre modal de pagamento

3. **Estilos CSS** (`public/css/plans.css`)
   - Estilos para modal de pagamento
   - Layout responsivo
   - Animações e transições

## Fluxo de Pagamento

### PIX
1. Usuário clica em "Assinar Premium"
2. Seleciona método PIX no modal
3. Clica em "Gerar QR Code PIX"
4. Sistema cria pagamento via PushinPay
5. QR Code e código copia-e-cola são exibidos
6. Sistema verifica status a cada 5 segundos
7. Quando pagamento confirmado, assinatura é ativada
8. Usuário é redirecionado

### Cartão de Crédito
1. Usuário clica em "Assinar Premium"
2. Seleciona método Cartão no modal
3. Preenche dados do cartão
4. Clica em "Finalizar pagamento"
5. Sistema processa pagamento via PushinPay
6. Se aprovado imediatamente, assinatura é ativada
7. Se pendente, sistema verifica status periodicamente
8. Usuário é redirecionado quando confirmado

## Webhook

O webhook está configurado em `/api/payment/webhook` e processa automaticamente:
- Confirmação de pagamento PIX
- Confirmação de pagamento com cartão
- Ativação automática de assinatura
- Atualização de status

**Importante**: Configure a URL do webhook no painel do PushinPay:
```
https://seudominio.com/api/payment/webhook
```

## Preço

O plano Premium de 30 dias está configurado para **R$ 19,90** (1990 centavos).

Para alterar, edite a constante `PREMIUM_30_DAYS_PRICE` em `src/controllers/paymentController.js`.

## Testes

Após configurar as variáveis de ambiente:

1. Inicie o servidor
2. Acesse `/plans`
3. Faça login
4. Clique em "Assinar Premium"
5. Teste o fluxo de pagamento

## Notas Importantes

- A API do PushinPay pode retornar dados em formatos diferentes
- O código está preparado para normalizar diferentes formatos de resposta
- O webhook é essencial para confirmação automática de pagamentos PIX
- Pagamentos com cartão podem ser confirmados imediatamente ou requerer verificação











