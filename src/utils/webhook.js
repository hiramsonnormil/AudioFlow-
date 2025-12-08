export function getPushinpayWebhookSecret() {
  return process.env.PUSHINPAY_WEBHOOK_SECRET || process.env.WEBHOOK_SECRET || "";
}

export function buildPushinpayWebhookUrl() {
  const baseUrl = process.env.WEBHOOK_BASE_URL || process.env.APP_BASE_URL;
  const secret = getPushinpayWebhookSecret();
  if (!baseUrl) {
    throw new Error("WEBHOOK_BASE_URL is not configured");
  }
  if (!secret) {
    throw new Error("PUSHINPAY_WEBHOOK_SECRET is not configured");
  }
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBase}/api/webhook/pushinpay?secret=${encodeURIComponent(secret)}`;
}
