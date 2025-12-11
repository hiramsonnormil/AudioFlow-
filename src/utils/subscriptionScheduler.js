import cron from "node-cron";
import crypto from "crypto";
import { Subscription } from "../models/Subscription.js";
import { createPixCharge } from "../services/pushinpayService.js";
import { buildPushinpayWebhookUrl } from "./webhook.js";
import { 
  checkPendingPayments, 
  preventDuplicateSubscriptions 
} from "../services/PaymentRecoveryService.js";

let schedulerInitialized = false;

function hasPendingPayment(payments) {
  return payments?.some((payment) => payment.status === "pending") || false;
}

export function initSubscriptionScheduler() {
  if (schedulerInitialized) {
    return;
  }

  if (process.env.ENABLE_SUBSCRIPTION_CRON === "false") {
    console.info("Subscription cron disabled by environment flag");
    schedulerInitialized = true;
    return;
  }

  const cronExpression = process.env.SUBSCRIPTION_CRON_SCHEDULE || "0 3 * * *";
  const timezone = process.env.SUBSCRIPTION_CRON_TIMEZONE || "America/Sao_Paulo";

  // ========================================
  // CRON 1: Verificar pagamentos pendentes a cada 5 minutos
  // ========================================
  cron.schedule(
    "*/5 * * * *", // A cada 5 minutos
    async () => {
      try {
        await checkPendingPayments();
        await preventDuplicateSubscriptions();
      } catch (error) {
        console.error("[PaymentRecovery] Erro na verificação:", error.message);
      }
    },
    { timezone }
  );
  console.info("[PaymentRecovery] Cron ativo - verifica a cada 5 minutos");

  // ========================================
  // CRON 2: Renovação mensal de assinaturas
  // ========================================

  cron.schedule(
    cronExpression,
    async () => {
      const now = new Date();
      try {
        const subscriptions = await Subscription.find({
          status: { $in: ["active", "past_due"] },
          nextBillingDate: { $lte: now },
        });

        if (!subscriptions.length) {
          return;
        }

        const webhookUrl = buildPushinpayWebhookUrl();

        for (const subscription of subscriptions) {
          if (hasPendingPayment(subscription.payments)) {
            continue;
          }

          try {
            const webhookToken = crypto.randomBytes(16).toString("hex");
            const pixResponse = await createPixCharge({
              value: subscription.monthlyAmount,
              webhookUrl,
              description: `Renovação ${subscription.planType}`,
              metadata: {
                subscriptionId: String(subscription._id),
                userId: String(subscription.userId),
                planType: subscription.planType,
                webhookToken,
              },
            });

            if (!pixResponse?.id) {
              throw new Error("Pix response without id");
            }

            subscription.payments.push({
              pixId: pixResponse.id,
              value: subscription.monthlyAmount,
              status: "pending",
              payload: {
                ...pixResponse,
                metadata: { ...(pixResponse?.metadata || {}), subscriptionId: String(subscription._id), userId: String(subscription.userId), planType: subscription.planType, webhookToken },
              },
            });
            subscription.status = "past_due";
            await subscription.save();

            console.info(
              `[SubscriptionCron] Nova cobrança Pix gerada para assinatura ${subscription._id}`
            );
          } catch (error) {
            console.error(
              `[SubscriptionCron] Falha ao gerar cobrança para assinatura ${subscription._id}`,
              error.message
            );
          }
        }
      } catch (error) {
        console.error("[SubscriptionCron] Erro geral na execução", error.message);
      }
    },
    { timezone }
  );

  schedulerInitialized = true;
  console.info(`[SubscriptionCron] Agendador ativo (${cronExpression}, ${timezone})`);
}
