/**
 * PaymentRecoveryService
 * Serviço para recuperar pagamentos que foram feitos enquanto o servidor estava offline
 * ou quando o webhook falhou
 */

import { Subscription } from "../models/Subscription.js";
import { getTransactionById } from "./pushinpayService.js";
import { processPayment } from "../controllers/webhookController.js";

/**
 * Verifica pagamentos pendentes e atualiza status via API da PushinPay
 */
export async function checkPendingPayments() {
  try {
    console.log("🔍 Iniciando verificação de pagamentos pendentes...");

    // Buscar todas as assinaturas com pagamentos pendentes
    const subscriptions = await Subscription.find({
      "payments.status": "pending",
    });

    if (subscriptions.length === 0) {
      console.log("✅ Nenhum pagamento pendente encontrado");
      return { checked: 0, updated: 0, expired: 0 };
    }

    console.log(`📋 Encontradas ${subscriptions.length} assinaturas com pagamentos pendentes`);

    let checked = 0;
    let updated = 0;
    let expired = 0;

    for (const subscription of subscriptions) {
      // Buscar apenas pagamentos pendentes (ignorar cancelados)
      const pendingPayments = subscription.payments.filter((p) => p.status === "pending");

      for (const payment of pendingPayments) {
        checked++;
        const pixId = payment.pixId;

        if (!pixId) {
          console.warn(`⚠️ Pagamento sem pixId na assinatura ${subscription._id}`);
          continue;
        }

        try {
          // Verificar se o pagamento expirou (mais de 15 minutos)
          const createdAt = payment.createdAt || payment.payload?.created_at;
          if (createdAt) {
            const expiresAt = new Date(new Date(createdAt).getTime() + 15 * 60 * 1000);
            const now = new Date();

            if (now > expiresAt) {
              // Pagamento expirado
              console.log(`⏰ Pagamento expirado - PixID: ${pixId}`);
              await processPayment(subscription, payment, "expired");
              expired++;
              continue;
            }
          }

          // Consultar status na API da PushinPay
          console.log(`🔎 Consultando status - PixID: ${pixId}`);
          const transactionData = await getTransactionById(pixId);

          if (transactionData && transactionData.status) {
            const wasUpdated = await processPayment(
              subscription,
              payment,
              transactionData.status,
              transactionData
            );

            if (wasUpdated) {
              updated++;
              console.log(
                `✅ Pagamento atualizado - PixID: ${pixId}, Status: ${transactionData.status}`
              );
            }
          }
        } catch (error) {
          console.error(`❌ Erro ao verificar pagamento ${pixId}:`, error.message);
        }

        // Delay entre requisições para não sobrecarregar a API
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    console.log(`✅ Verificação concluída - Checados: ${checked}, Atualizados: ${updated}, Expirados: ${expired}`);
    return { checked, updated, expired };
  } catch (error) {
    console.error("❌ Erro na verificação de pagamentos pendentes:", error);
    throw error;
  }
}

/**
 * Verifica se há assinaturas duplicadas para o mesmo usuário
 * e garante que apenas uma esteja ativa
 */
export async function preventDuplicateSubscriptions() {
  try {
    console.log("🔍 Verificando assinaturas duplicadas...");

    const subscriptions = await Subscription.find({ status: "active" });
    const userMap = new Map();

    let duplicatesFound = 0;

    for (const sub of subscriptions) {
      const userId = String(sub.userId);
      
      if (userMap.has(userId)) {
        // Usuário tem múltiplas assinaturas ativas
        const existing = userMap.get(userId);
        
        // Manter a mais recente
        if (new Date(sub.lastPaymentAt) > new Date(existing.lastPaymentAt)) {
          // Desativar a antiga
          existing.status = "cancelled";
          await existing.save();
          userMap.set(userId, sub);
          console.log(`⚠️ Assinatura duplicada removida - User: ${userId}`);
        } else {
          // Desativar a nova
          sub.status = "cancelled";
          await sub.save();
          console.log(`⚠️ Assinatura duplicada removida - User: ${userId}`);
        }
        duplicatesFound++;
      } else {
        userMap.set(userId, sub);
      }
    }

    if (duplicatesFound === 0) {
      console.log("✅ Nenhuma assinatura duplicada encontrada");
    } else {
      console.log(`✅ ${duplicatesFound} assinaturas duplicadas corrigidas`);
    }

    return duplicatesFound;
  } catch (error) {
    console.error("❌ Erro ao verificar duplicatas:", error);
    throw error;
  }
}
