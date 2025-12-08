import { Router } from "express";
import { handlePushinpayWebhook } from "../controllers/webhookController.js";

const router = Router();

router.post("/webhook/pushinpay", handlePushinpayWebhook);

export default router;
