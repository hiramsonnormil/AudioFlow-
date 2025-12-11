import rateLimit from "express-rate-limit";
import { securityConfig } from "../config/security.js";

const createLimiter = (options = {}) =>
  rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "too_many_requests" },
    ...options,
  });

export const apiLimiter = createLimiter({
  windowMs: securityConfig.rateLimits.general.windowMs,
  max: securityConfig.rateLimits.general.max,
});

export const authLimiter = createLimiter({
  windowMs: securityConfig.rateLimits.auth.windowMs,
  max: securityConfig.rateLimits.auth.max,
});

export const freeProcessLimiter = createLimiter({
  windowMs: securityConfig.rateLimits.freeProcessing.windowMs,
  max: securityConfig.rateLimits.freeProcessing.max,
});

export const validationLimiter = createLimiter({
  windowMs: securityConfig.rateLimits.validation.windowMs,
  max: securityConfig.rateLimits.validation.max,
  message: { 
    error: "too_many_requests",
    message: "Muitas validações em pouco tempo. Aguarde um momento."
  },
});

export const downloadLimiter = createLimiter({
  windowMs: securityConfig.rateLimits.download.windowMs,
  max: securityConfig.rateLimits.download.max,
  message: { 
    error: "too_many_requests",
    message: "Muitos downloads em pouco tempo. Aguarde um momento."
  },
});

export const subscriptionLimiter = createLimiter({
  windowMs: securityConfig.rateLimits.subscription.windowMs,
  max: securityConfig.rateLimits.subscription.max,
  message: { 
    error: "too_many_requests",
    message: "Muitas operações de assinatura. Aguarde um momento."
  },
});

// Limite específico para criação de PIX (assinaturas): 5 por minuto por usuário (fallback por IP)
export const pixCreateLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: 5,
  keyGenerator: (req) => String(req.user?._id || req.ip || "anon"),
  message: {
    error: "too_many_requests",
    message: "Você gerou muitos PIX em pouco tempo. Tente novamente em instantes.",
  },
});
