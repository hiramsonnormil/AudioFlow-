import { Subscription } from "../models/Subscription.js";
import { User } from "../models/User.js";
import { advanceBillingCycle } from "./subscriptionController.js";
import { getPushinpayWebhookSecret } from "../utils/webhook.js";

// Normaliza o status vindo do provedor para um conjunto previsível
function normalizeStatus(status) {
  const s = String(status || "").trim().toLowerCase();
  if (!s) return "unknown";
  const success = new Set(["paid", "approved", "completed", "confirmed", "success", "concluded"]);
  const expired = new Set(["expired", "timeout"]);
  const cancelled = new Set(["cancelled", "canceled", "void", "refunded", "chargeback"]);
  if (success.has(s)) return "paid";
  if (expired.has(s)) return "expired";
  if (cancelled.has(s)) return "cancelled";
  return s;
}

function validateSecret(req) {
  const expected = getPushinpayWebhookSecret();
  if (!expected) {
    return false;
  }
  const secretFromQuery = req.query?.secret;
  const secretFromHeader = req.headers["x-webhook-secret"];
  return secretFromQuery === expected || secretFromHeader === expected;
}

function extractPixId(body) {
  if (!body) {
    return null;
  }
  return body.id || body.pix_id || body.transaction_id || null;
}

/**
 * Processa um pagamento e atualiza o plano do usuário
 * Função reutilizável para webhook e cron job
 */
export async function processPayment(subscription, payment, pixStatus, webhookData = null) {
  if (!subscription || !payment) {
    return false;
  }

  // PROTEÇÃO: Não processar pagamentos cancelados
  if (payment.status === "cancelled") {
    console.log(`🚫 Tentativa de processar pagamento cancelado bloqueada - PixID: ${payment.pixId}`);
    return false;
  }

  const pixStatusLower = normalizeStatus(pixStatus);
  
  // Atualizar payload se fornecido
  if (webhookData) {
    // Se houver token esperado e o dado externo trouxer token diferente, rejeitar
    try {
      const expectedToken = payment?.payload?.metadata?.webhookToken;
      const providedToken = webhookData?.metadata?.webhookToken;
      if (expectedToken && expectedToken !== providedToken) {
        console.warn(`⚠️ Dados de pagamento rejeitados: token inválido para PixID ${payment.pixId}`);
        return false;
      }
    } catch {}
    payment.payload = webhookData;
  }

  let updated = false;

  if (pixStatusLower === "paid") {
    if (payment.status !== "paid") {
      payment.status = "paid";
      payment.paidAt = new Date();

      // Verificar se é um pagamento de UPGRADE
      const isUpgrade = payment.payload?.isUpgrade || payment.payload?.metadata?.isUpgrade;
      const targetPlanType = payment.payload?.metadata?.planType || payment.payload?.planType;

      if (isUpgrade && targetPlanType) {
        // UPGRADE: Mudar plano imediatamente sem avançar billing cycle
        console.log(`📈 Processando UPGRADE: ${subscription.planType} → ${targetPlanType}`);
        subscription.planType = targetPlanType;
        subscription.status = "active";
        
        // NÃO avança o billing cycle - mantém a data atual
        console.log(`   Mantendo nextBillingDate: ${subscription.nextBillingDate}`);
        
        // Atualizar plano do usuário imediatamente
        if (subscription.userId) {
          await User.findByIdAndUpdate(subscription.userId, {
            plan: targetPlanType,
          }).exec();
          console.log(`✅ Upgrade concluído! Plano atualizado para ${targetPlanType} - User: ${subscription.userId}`);
        }
      } else {
        // Pagamento normal (primeira assinatura ou renovação)
        const paymentPlanType = payment.payload?.metadata?.planType || payment.payload?.planType;
        
        // Se o pagamento especifica um plano, usar ele
        if (paymentPlanType) {
          subscription.planType = paymentPlanType;
        }
        
        advanceBillingCycle(subscription);

        // Atualizar plano do usuário
        if (subscription.userId) {
          await User.findByIdAndUpdate(subscription.userId, {
            plan: subscription.planType,
          }).exec();
          console.log(`✅ Plano ${subscription.planType} ativado - User: ${subscription.userId}`);
        }
      }
      
      updated = true;
    }
  } else if (["expired", "cancelled", "canceled", "failed"].includes(pixStatusLower)) {
    if (payment.status === "pending") {
      payment.status = "expired";
      subscription.status = "past_due";

      // Garantir que usuário volta para plano free
      if (subscription.userId) {
        await User.findByIdAndUpdate(subscription.userId, { plan: "free" }).exec();
        console.log(`⚠️ Pagamento expirado - User ${subscription.userId} voltou para free`);
      }
      updated = true;
    }
  }

  if (updated) {
    await subscription.save();
  }

  return updated;
}

export async function handlePushinpayWebhook(req, res) {
  try {
    // Validar secret do webhook
    if (!validateSecret(req)) {
      console.warn("⚠️ Webhook rejeitado: secret inválido");
      return res.status(401).json({ error: "unauthorized" });
    }

    // Log estruturado do webhook (payload cru + headers essenciais)
    try {
      const shouldLog = process.env.LOG_WEBHOOKS !== "false";
      if (shouldLog) {
        const safeBody = JSON.stringify(req.body).slice(0, 5000);
        console.log("📦 Webhook RAW payload:", safeBody);
        console.log("🧾 Webhook headers:", JSON.stringify({
          "content-type": req.headers["content-type"],
          "user-agent": req.headers["user-agent"],
          "x-forwarded-for": req.headers["x-forwarded-for"],
        }));
        console.log("🔗 Webhook query:", JSON.stringify(req.query));
      }
    } catch (e) {
      console.warn("⚠️ Falha ao logar webhook:", e?.message);
    }

    const pixId = extractPixId(req.body);
    if (!pixId) {
      console.warn("⚠️ Webhook sem pixId:", req.body);
      return res.status(400).json({ error: "missing_pix_id" });
    }

    console.log(`📥 Webhook recebido - PixID: ${pixId}, Status: ${req.body.status}`);

    const subscription = await Subscription.findOne({ "payments.pixId": pixId });
    if (!subscription) {
      console.log(`ℹ️ Nenhuma assinatura encontrada para pixId: ${pixId}`);
      return res.sendStatus(200);
    }

    const payment = subscription.payments.find((entry) => entry.pixId === pixId);
    if (!payment) {
      console.log(`ℹ️ Pagamento não encontrado na assinatura: ${pixId}`);
      return res.sendStatus(200);
    }

    // Verificação de reforço: token de webhook por transação
    const expectedToken = payment?.payload?.metadata?.webhookToken;
    const providedToken = req.body?.metadata?.webhookToken;
    if (expectedToken && expectedToken !== providedToken) {
      console.warn(`⚠️ Webhook rejeitado: token inválido para PixID ${pixId}`);
      return res.status(401).json({ error: "unauthorized" });
    }

    const pixStatus = req.body.status;
    const wasProcessed = await processPayment(subscription, payment, pixStatus, req.body);

    if (wasProcessed) {
      console.log(`✅ Webhook processado com sucesso - PixID: ${pixId}`);
    } else {
      console.log(`ℹ️ Webhook recebido mas não processado - PixID: ${pixId}`);
    }

    return res.sendStatus(200);
  } catch (error) {
    console.error("❌ Erro no webhook:", error);
    return res.sendStatus(500);
  }
}
