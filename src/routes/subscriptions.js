import { Router } from "express";
import {
  startSubscription,
  getSubscriptionStatus,
} from "../controllers/subscriptionController.js";

const router = Router();

router.post("/subscriptions", startSubscription);
router.get("/subscriptions/:userId/status", getSubscriptionStatus);

export default router;
