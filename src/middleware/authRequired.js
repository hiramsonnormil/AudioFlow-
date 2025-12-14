import jwt from "jsonwebtoken";
import { getJwtSecret } from "../config/security.js";

const JWT_SECRET = getJwtSecret();

export function authRequired(req, res, next) {
  try {
    const header = req.headers?.authorization || req.headers?.Authorization;
    const bearerToken = typeof header === "string" && header.startsWith("Bearer ")
      ? header.slice(7)
      : null;

    const token = bearerToken || req.cookies?.token;

    if (!token) {
      return res.status(401).json({ error: "unauthorized" });
    }

    const payload = jwt.verify(token, JWT_SECRET);

    req.user = { _id: payload._id, email: payload.email, plan: payload.plan };
    next();
  } catch (err) {
    return res.status(401).json({ error: "invalid_token" });
  }
}

/**
 * Middleware para verificar se o usuário tem assinatura ativa
 */
export const requireActiveSubscription = async (req, res, next) => {
  try {
    const { Subscription } = await import("../models/Subscription.js");

    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuário não autenticado",
      });
    }

    const subscription = await Subscription.findActiveByUser(userId);
    if (!subscription) {
      return res.status(403).json({
        success: false,
        error: "Assinatura ativa necessária",
        code: "NO_ACTIVE_SUBSCRIPTION",
      });
    }

    // Adicionar subscription ao request para uso posterior
    req.subscription = subscription;
    next();
  } catch (error) {
    console.error("[authRequired] Erro ao verificar assinatura:", error);
    return res.status(500).json({
      success: false,
      error: "Erro ao verificar assinatura",
    });
  }
};
