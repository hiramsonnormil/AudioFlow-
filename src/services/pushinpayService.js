import axios from "axios";

const DEFAULT_BASE_URL = "https://api.pushinpay.com.br/api";

function getApiKey() {
  const apiKey = process.env.PUSHINPAY_API_KEY;
  if (!apiKey) {
    throw new Error("PUSHINPAY_API_KEY is not configured");
  }
  return apiKey;
}

function getBaseUrl() {
  return process.env.PUSHINPAY_API_BASE_URL || process.env.PUSHINPAY_API_URL || DEFAULT_BASE_URL;
}

function getCommonHeaders() {
  return {
    Authorization: `Bearer ${getApiKey()}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

export async function createPixCharge({ value, webhookUrl, description, metadata, expiresInMinutes = 15 }) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error("Pix value must be a positive integer (in cents)");
  }
  if (!webhookUrl) {
    throw new Error("webhookUrl is required to create a Pix charge");
  }

  // Calcular data de expiração (15 minutos por padrão)
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  const payload = {
    value,
    webhook_url: webhookUrl,
    expires_at: expiresAt.toISOString(),
    ...(description ? { description } : {}),
    ...(metadata ? { metadata } : {}),
  };

  try {
    const { data } = await axios.post(`${getBaseUrl()}/pix/cashIn`, payload, {
      headers: getCommonHeaders(),
      timeout: 15000,
    });
    return data;
  } catch (error) {
    const message = error.response?.data || error.message;
    console.error("createPixCharge error", message);
    throw new Error("pushinpay_pix_creation_failed");
  }
}

export async function getTransactionById(transactionId) {
  if (!transactionId) {
    throw new Error("transactionId is required");
  }
  try {
    const { data } = await axios.get(`${getBaseUrl()}/transactions/${transactionId}`, {
      headers: getCommonHeaders(),
      timeout: 10000,
    });
    return data;
  } catch (error) {
    const message = error.response?.data || error.message;
    console.error("getTransactionById error", message);
    throw new Error("pushinpay_transaction_lookup_failed");
  }
}
