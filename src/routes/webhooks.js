import { Router } from "express";
import { pixController } from "../controllers/PixController.js";

const router = Router();

/**
 * POST /api/webhooks/pushinpay
 * Webhook PushinPay - Fonte da verdade para confirmação de pagamentos
 *
 * Headers esperados:
 * - X-Webhook-Signature: {PUSHINPAY_WEBHOOK_SECRET}
 *
 * Body:
 * {
 *   "id": "uuid",
 *   "status": "paid" | "canceled" | "expired",
 *   "end_to_end_id": "...",
 *   "payer_name": "...",
 *   "payer_national_registration": "..."
 * }
 */
router.post("/pushinpay", (req, res) => pixController.handleWebhook(req, res));

export default router;
