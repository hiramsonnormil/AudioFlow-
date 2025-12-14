import axios from "axios";

/**
 * Serviço para comunicação com a API PushinPay
 * Responsabilidade: APENAS fazer chamadas HTTP
 * NÃO contém lógica de negócio
 */
export class PushinPayService {
  constructor() {
    this.apiKey = process.env.PUSHINPAY_API_KEY;
    this.baseUrl = process.env.PUSHINPAY_BASE_URL || "https://api.pushinpay.com.br/api";
    this.webhookSecret = process.env.PUSHINPAY_WEBHOOK_SECRET;

    if (!this.apiKey) {
      throw new Error("PUSHINPAY_API_KEY não configurado");
    }

    if (!this.webhookSecret) {
      throw new Error("PUSHINPAY_WEBHOOK_SECRET não configurado");
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      timeout: 30000, // 30 segundos
    });

    // Interceptor para logs (opcional, útil para debug)
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response) {
          console.error("[PushinPay] Erro HTTP:", {
            status: error.response.status,
            data: error.response.data,
            url: error.config.url,
          });
        } else if (error.request) {
          console.error("[PushinPay] Sem resposta:", error.message);
        } else {
          console.error("[PushinPay] Erro ao configurar request:", error.message);
        }
        throw error;
      }
    );
  }

  /**
   * Criar cobrança PIX
   * POST /pix/cashIn
   *
   * @param {Object} data
   * @param {number} data.value - Valor em centavos (mínimo 50)
   * @param {string} [data.webhook_url] - URL do webhook
   * @param {Array} [data.split_rules] - Regras de split (máx 50%)
   * @returns {Promise<Object>}
   */
  async createPixCharge(data) {
    if (!data.value || data.value < 50) {
      throw new Error("Valor mínimo é 50 centavos");
    }

    try {
      const response = await this.client.post("/pix/cashIn", {
        value: data.value,
        webhook_url: data.webhook_url || null,
        split_rules: data.split_rules || [],
      });

      return response.data;
    } catch (error) {
      if (error.response?.status === 422) {
        throw new Error("Dados inválidos: " + JSON.stringify(error.response.data));
      }
      if (error.response?.status === 401) {
        throw new Error("Token de autenticação inválido");
      }
      if (error.response?.status === 429) {
        throw new Error("Rate limit excedido. Tente novamente em alguns segundos");
      }
      throw error;
    }
  }

  /**
   * Consultar status de transação PIX
   * GET /transactions/{id}
   *
   * ⚠️ USAR APENAS QUANDO:
   * - Usuário clicar em "Já paguei"
   * - Webhook não chegou
   * - Respeitar rate limit (1 req/min)
   *
   * @param {string} transactionId
   * @returns {Promise<Object|null>}
   */
  async getTransaction(transactionId) {
    try {
      const response = await this.client.get(`/transactions/${transactionId}`);

      // Response 200 com array vazio = não encontrado
      if (Array.isArray(response.data) && response.data.length === 0) {
        return null;
      }

      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Validar assinatura do webhook
   *
   * @param {string} signature - Assinatura recebida no header
   * @param {Object} payload - Corpo do webhook
   * @returns {boolean}
   */
  validateWebhookSignature(signature, payload) {
    // PushinPay usa webhook_secret como validação
    // Ajustar conforme documentação real se necessário
    return signature === this.webhookSecret;
  }

  /**
   * Verificar disponibilidade da API (healthcheck)
   * @returns {Promise<boolean>}
   */
  async healthCheck() {
    try {
      await this.client.get("/health", { timeout: 5000 });
      return true;
    } catch {
      return false;
    }
  }
}

// Export singleton
export const pushinPayService = new PushinPayService();
