import { Payment } from "../models/Payment.js";
import { Subscription } from "../models/Subscription.js";
import { User } from "../models/User.js";
import { pushinPayService } from "./PushinPayService.js";
import { isValidUpgrade, arePlansEqual, getPlanName } from "../utils/planComparison.js";

/**
 * Serviço de lógica de negócio para pagamentos
 * Responsabilidade: Orquestrar Payment + Subscription + User
 */
export class PaymentService {
  /**
   * Criar uma nova cobrança PIX
   * NUNCA ativa assinatura aqui
   *
   * @param {Object} data
   * @param {string} data.userId
   * @param {string} data.plan - ex: "voz_plus_master"
   * @param {number} data.value - em centavos
   * @returns {Promise<Object>}
   */
  async createPixCharge({ userId, plan, value }) {
    // Validações
    if (!userId || !plan || !value) {
      throw new Error("userId, plan e value são obrigatórios");
    }

    if (value < 50) {
      throw new Error("Valor mínimo é 50 centavos");
    }

    // Verificar se usuário existe
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("Usuário não encontrado");
    }

    // Verificar se há assinatura ativa
    const activeSubscription = await Subscription.findOne({
      userId,
      status: 'active',
      expiresAt: { $gt: new Date() }
    });

    if (activeSubscription) {
      const currentPlan = activeSubscription.plan;
      
      // Bloquear se tentar comprar o mesmo plano
      if (arePlansEqual(plan, currentPlan)) {
        throw new Error(
          `Você já possui uma assinatura ativa do plano ${getPlanName(plan)}. ` +
          `Aguarde a renovação automática ou escolha um plano superior.`
        );
      }

      // Bloquear se tentar comprar um plano inferior
      if (!isValidUpgrade(currentPlan, plan)) {
        throw new Error(
          `Não é possível fazer downgrade de ${getPlanName(currentPlan)} para ${getPlanName(plan)}. ` +
          `Você só pode fazer upgrade para planos superiores.`
        );
      }

      console.log(`[PaymentService] Upgrade detectado: ${currentPlan} → ${plan}`);
    }

    // Criar Subscription PENDING
    const subscription = await Subscription.create({
      userId,
      plan,
      value,
      status: "pending",
    });

    // Construir webhook URL
    const webhookUrl = process.env.WEBHOOK_BASE_URL
      ? `${process.env.WEBHOOK_BASE_URL.replace(/\/$/, "")}/api/webhooks/pushinpay`
      : null;

    // Chamar PushinPay
    const pixResponse = await pushinPayService.createPixCharge({
      value,
      webhook_url: webhookUrl,
      split_rules: [],
    });

    // Salvar Payment no banco
    const payment = await Payment.create({
      provider: "pushinpay",
      transactionId: pixResponse.id,
      subscriptionId: subscription._id,
      userId,
      plan,
      value,
      status: "created",
      qrCode: pixResponse.qr_code,
      qrCodeBase64: pixResponse.qr_code_base64,
      metadata: {
        expiresAt: pixResponse.expires_at,
        pixId: pixResponse.id,
        correlationId: pixResponse.correlation_id,
      },
      rawPayload: pixResponse,
    });

    return {
      paymentId: payment._id,
      transactionId: payment.transactionId,
      subscriptionId: subscription._id,
      qrCode: payment.qrCode,
      qrCodeBase64: payment.qrCodeBase64,
      value: payment.value,
      status: payment.status,
      createdAt: payment.createdAt,
    };
  }

  /**
   * Processar confirmação de pagamento
   * FONTE DA VERDADE: Webhook ou consulta manual
   *
   * Esta função apenas marca o pagamento como pago
   * A ativação da assinatura e sincronização é AUTOMÁTICA via hooks dos models
   *
   * @param {Object} data
   * @param {string} data.transactionId
   * @param {string} data.status - "paid", "canceled", "expired"
   * @param {string} [data.endToEndId]
   * @param {string} [data.payerName]
   * @param {string} [data.payerDocument]
   * @returns {Promise<Object>}
   */
  async processPaymentConfirmation({ transactionId, status, endToEndId, payerName, payerDocument }) {
    // Buscar Payment
    const payment = await Payment.findOne({ transactionId });
    if (!payment) {
      throw new Error("Pagamento não encontrado");
    }

    // Idempotência: Se já está pago, ignorar
    if (payment.isPaid()) {
      return {
        alreadyProcessed: true,
        payment: payment.toObject(),
      };
    }

    // Buscar Subscription
    const subscription = await Subscription.findById(payment.subscriptionId);
    if (!subscription) {
      throw new Error("Assinatura não encontrada");
    }

    // Processar baseado no status
    if (status === "paid") {
      // Marcar Payment como pago
      // O hook do Payment vai automaticamente:
      // 1. Ativar a Subscription
      // 2. A Subscription vai sincronizar com o User
      // 3. Tudo em cascata automática!
      await payment.markAsPaid({
        endToEndId,
        payerName,
        payerDocument,
      });

      // Recarregar dados atualizados
      await payment.populate('subscriptionId');
      const updatedUser = await User.findById(payment.userId);

      return {
        success: true,
        payment: payment.toObject(),
        subscription: subscription.toObject(),
        user: {
          id: updatedUser._id,
          email: updatedUser.email,
          plan: updatedUser.plan,
          subscriptionStatus: updatedUser.subscriptionStatus,
        }
      };
    }

    if (status === "expired" || status === "canceled") {
      payment.status = status;
      await payment.save();

      // Cancelar subscription
      await subscription.cancel();

      return {
        success: false,
        payment: payment.toObject(),
        subscription: subscription.toObject(),
      };
    }

    throw new Error(`Status desconhecido: ${status}`);
  }

  /**
   * Consultar status manual (fallback)
   * USAR APENAS quando usuário clicar "Já paguei"
   *
   * @param {string} transactionId
   * @returns {Promise<Object>}
   */
  async checkPaymentStatus(transactionId) {
    // Buscar no banco primeiro
    const payment = await Payment.findOne({ transactionId });
    if (!payment) {
      throw new Error("Pagamento não encontrado");
    }

    // Se já está pago, retornar
    if (payment.isPaid()) {
      return {
        status: "paid",
        payment: payment.toObject(),
      };
    }

    // Consultar PushinPay
    const externalStatus = await pushinPayService.getTransaction(transactionId);
    if (!externalStatus) {
      return {
        status: "not_found",
        payment: payment.toObject(),
      };
    }

    // Se retornou "paid", processar
    if (externalStatus.status === "paid") {
      await this.processPaymentConfirmation({
        transactionId,
        status: "paid",
        endToEndId: externalStatus.end_to_end_id,
        payerName: externalStatus.payer_name,
        payerDocument: externalStatus.payer_national_registration,
      });

      return {
        status: "paid",
        payment: (await Payment.findOne({ transactionId })).toObject(),
      };
    }

    // Atualizar status local se necessário
    if (externalStatus.status !== payment.status) {
      payment.status = externalStatus.status;
      await payment.save();
    }

    return {
      status: externalStatus.status,
      payment: payment.toObject(),
    };
  }

  /**
   * Buscar pagamentos de um usuário
   * @param {string} userId
   * @param {Object} filters
   * @returns {Promise<Array>}
   */
  async getUserPayments(userId, filters = {}) {
    const query = { userId, ...filters };
    return Payment.find(query).sort({ createdAt: -1 }).populate("subscriptionId").lean();
  }

  /**
   * Helper: Mapear duração do plano
   * @private
   */
  _getPlanDuration(plan) {
    const durations = {
      voz_plus_master: 30,
      voz_pro: 30,
      voz_master: 30,
    };
    return durations[plan] || 30;
  }

  /**
   * Helper: Mapear plano para User.plan
   * @private
   */
  _mapPlanToUserPlan(plan) {
    const mapping = {
      voz_plus_master: "voz_master",
      voz_pro: "voz_pro",
      voz_master: "voz_master",
      plano_plus_master: "voz_master",
    };
    return mapping[plan] || "free";
  }
}

// Export singleton
export const paymentService = new PaymentService();
