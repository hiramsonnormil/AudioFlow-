# Security Hardening Overview

This document summarizes the main controls introduced to keep AudioFlow secure and resilient.

## Runtime Requirements
- `JWT_SECRET` **must** be defined with at least 32 random characters. The server refuses to start without it.
- Configure `CORS_ALLOWED_ORIGINS` (comma‑separated) or set `CORS_ALLOW_ALL=true` only in trusted development environments.
- Use `COOKIE_SESSION=true` when the frontend restores sessions from HTTP-only cookies. Production deployments should also set `COOKIE_SECURE=true` when traffic passes through HTTPS.
- Optional rate-limit tuning through `RATE_LIMIT_*`, `AUTH_RATE_LIMIT_*` and `FREE_PROCESS_LIMIT_*` environment variables.

## HTTP Surface
- Helmet, CORS, HPP, XSS cleaning, Mongo sanitization and compression are enabled globally.
- API entrypoints are rate-limited, and sensitive authentication/processing routes have dedicated buckets.
- Request bodies are capped via `REQUEST_BODY_LIMIT` to prevent payload abuse.

## Authentication
- Signup/login flows enforce strong validation (email format, username whitelist, password complexity) and never fall back to insecure JWT secrets.
- Session cookies are always `httpOnly` with centralized options; OAuth flows set a cookie even if REST tokens are disabled so the frontend can restore the session securely.

## Data Hygiene
- User identifiers stored in jobs/R2 paths are hashed so PII never leaks through file structures.
- Processing endpoints validate URLs/presets, reuse the same sanitization helpers, and share the hashed identifiers with storage cleanup routines.
- Background audio processing re-validates identifiers before writing to disk or object storage.

Keep these guarantees in mind when adding new endpoints: reuse the helpers in `src/config/security.js`, apply an appropriate rate limiter, and validate every external input before persisting or executing it.
