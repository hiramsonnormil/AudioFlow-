import { Router } from "express";
import {
  startSubscription,
  getSubscriptionStatus,
} from "../controllers/subscriptionController.js";
import { authRequired } from "../middleware/authRequired.js";
import { pixCreateLimiter } from "../middleware/rateLimiters.js";

const router = Router();

// Base path is mounted at /api/subscriptions in server.js
// Keep endpoints relative to that base and require authentication
// Apply strict rate limit (5/min) only to PIX creation
router.post("/", authRequired, pixCreateLimiter, startSubscription);
router.get("/:userId/status", authRequired, getSubscriptionStatus);

export default router;
