import { paymentService } from "../services/PaymentService.js";
import { pushinPayService } from "../services/PushinPayService.js";

/**
 * Controller para endpoints de pagamento PIX
 * Responsabilidade: Validar request, chamar service, retornar response
 * SEM lógica de negócio
 */
export class PixController {
  /**
   * POST /api/pix/create
   * Criar cobrança PIX
   *
   * Body:
   * {
   *   "plan": "voz_plus_master"
   * }
   */
  async createCharge(req, res) {
    try {
      const { plan } = req.body;
      // authRequired middleware já garante que req.user existe
      const userId = req.user._id;

      if (!plan) {
        return res.status(400).json({
          success: false,
          error: "Plano é obrigatório",
        });
      }

      // Mapear valor do plano
      const planPrices = {
        voz_plus_master: parseInt(process.env.SUBSCRIPTION_VOZ_PLUS_MASTER_PRICE_CENTS, 10),
        voz_pro: parseInt(process.env.SUBSCRIPTION_VOZ_PRO_PRICE_CENTS || "2990", 10),
        voz_master: parseInt(process.env.SUBSCRIPTION_VOZ_MASTER_PRICE_CENTS || "100", 10),
      };

      const value = planPrices[plan];
      if (!value) {
        return res.status(400).json({
          success: false,
          error: "Plano inválido",
        });
      }

      // Chamar serviço
      const result = await paymentService.createPixCharge({
        userId,
        plan,
        value,
      });

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("[PixController] Erro ao criar cobrança:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao criar cobrança PIX",
      });
    }
  }

  /**
   * POST /api/webhooks/pushinpay
   * Webhook PushinPay - FONTE DA VERDADE
   *
   * Headers:
   * X-Webhook-Signature: {secret}
   *
   * Body:
   * {
   *   "id": "uuid",
   *   "status": "paid",
   *   "end_to_end_id": "...",
   *   "payer_name": "...",
   *   "payer_national_registration": "..."
   * }
   */
  async handleWebhook(req, res) {
    try {
      const signature = req.headers["x-webhook-signature"];
      const payload = req.body;

      console.log("[PixController] Webhook recebido:", {
        transactionId: payload.id,
        status: payload.status,
      });

      // Validar assinatura
      if (!signature || !pushinPayService.validateWebhookSignature(signature, payload)) {
        console.warn("[PixController] ⚠️ Assinatura inválida no webhook");
        return res.status(401).json({
          success: false,
          error: "Assinatura inválida",
        });
      }

      // Processar pagamento
      const result = await paymentService.processPaymentConfirmation({
        transactionId: payload.id,
        status: payload.status,
        endToEndId: payload.end_to_end_id,
        payerName: payload.payer_name,
        payerDocument: payload.payer_national_registration,
      });

      // Responder 200 SEMPRE para PushinPay não reenviar
      return res.status(200).json({
        success: true,
        received: true,
        alreadyProcessed: result.alreadyProcessed || false,
      });
    } catch (error) {
      console.error("[PixController] Erro no webhook:", error);

      // IMPORTANTE: Responder 200 mesmo com erro interno
      // para evitar reenvios desnecessários
      return res.status(200).json({
        success: false,
        error: "Erro interno, mas webhook foi recebido",
      });
    }
  }

  /**
   * GET /api/pix/check/:transactionId
   * Consulta manual de status PIX
   *
   * ⚠️ USAR APENAS quando usuário clicar "Já paguei"
   * Rate limit: 1 req/min por usuário
   */
  async checkStatus(req, res) {
    try {
      const { transactionId } = req.params;
      // authRequired middleware já garante que req.user existe
      const userId = req.user._id;

      if (!transactionId) {
        return res.status(400).json({
          success: false,
          error: "transactionId é obrigatório",
        });
      }

      // Consultar status
      const result = await paymentService.checkPaymentStatus(transactionId);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("[PixController] Erro ao consultar status:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao consultar status do pagamento",
      });
    }
  }

  /**
   * GET /api/pix/payments
   * Listar pagamentos do usuário autenticado
   */
  async listPayments(req, res) {
    try {
      // authRequired middleware já garante que req.user existe
      const userId = req.user._id;

      const { status } = req.query;
      const filters = status ? { status } : {};

      const payments = await paymentService.getUserPayments(userId, filters);

      return res.status(200).json({
        success: true,
        data: payments,
      });
    } catch (error) {
      console.error("[PixController] Erro ao listar pagamentos:", error);
      return res.status(500).json({
        success: false,
        error: error.message || "Erro ao listar pagamentos",
      });
    }
  }
}

// Export singleton
export const pixController = new PixController();
