import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const parseList = (value) =>
  (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const toPositiveInteger = (value, fallback) => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.floor(parsed);
  }
  return fallback;
};

const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = parseList(process.env.CORS_ALLOWED_ORIGINS);
const allowAllOrigins =
  process.env.CORS_ALLOW_ALL === "true" || (!isProduction && allowedOrigins.length === 0);

const cookieSecure = process.env.COOKIE_SECURE === "true" || isProduction;
const sameSiteValue = process.env.COOKIE_SAMESITE || (cookieSecure ? "none" : "lax");

export const securityConfig = {
  isProduction,
  jsonLimit: process.env.REQUEST_BODY_LIMIT || "1mb",
  urlencodedLimit: process.env.REQUEST_BODY_LIMIT || "1mb",
  trustProxy: toPositiveInteger(process.env.TRUST_PROXY, 1),
  cors: {
    allowedOrigins,
    allowAllOrigins,
  },
  cookies: {
    secure: cookieSecure,
    sameSite: sameSiteValue,
    domain: process.env.COOKIE_DOMAIN || undefined,
    maxAgeMs:
      toPositiveInteger(process.env.COOKIE_MAX_AGE_MS, 7 * 24 * 60 * 60 * 1000),
  },
  rateLimits: {
    general: {
      windowMs: toPositiveInteger(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
      max: toPositiveInteger(process.env.RATE_LIMIT_MAX, 500),
    },
    auth: {
      windowMs: toPositiveInteger(
        process.env.AUTH_RATE_LIMIT_WINDOW_MS,
        15 * 60 * 1000,
      ),
      max: toPositiveInteger(process.env.AUTH_RATE_LIMIT_MAX, 20),
    },
    freeProcessing: {
      windowMs: toPositiveInteger(
        process.env.FREE_PROCESS_LIMIT_WINDOW_MS,
        60 * 60 * 1000,
      ),
      max: toPositiveInteger(process.env.FREE_PROCESS_LIMIT_MAX, 8),
    },
  },
};

export function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || typeof secret !== "string" || secret.length < 32) {
    throw new Error(
      "JWT_SECRET must be set to a string with at least 32 characters to run the server securely.",
    );
  }
  return secret;
}

export function buildCookieOptions(overrides = {}) {
  return {
    httpOnly: true,
    secure: securityConfig.cookies.secure,
    sameSite: securityConfig.cookies.sameSite,
    domain: securityConfig.cookies.domain,
    maxAge: securityConfig.cookies.maxAgeMs,
    ...overrides,
  };
}

export function isOriginAllowed(origin) {
  if (!origin) {
    return true; // same-origin or server-to-server
  }
  if (securityConfig.cors.allowAllOrigins) {
    return true;
  }
  return securityConfig.cors.allowedOrigins.includes(origin);
}

const hashIdentifier = (value) =>
  crypto.createHash("sha256").update(value).digest("hex").slice(0, 48);

export function getUserIdentity(rawValue, fallback = "anonymous") {
  const normalized =
    typeof rawValue === "string" && rawValue.trim().length > 0
      ? rawValue.trim().toLowerCase()
      : fallback;

  const storageKey = hashIdentifier(normalized);

  return {
    reference: normalized,
    storageKey,
  };
}

export function sanitizePresetInput(value) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

export function sanitizeUrlInput(value) {
  return typeof value === "string" ? value.trim() : "";
}
