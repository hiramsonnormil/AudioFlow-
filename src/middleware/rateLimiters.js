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
