# PushinPay Pix Subscriptions

## Overview

The backend now supports monthly subscriptions paid via Pix using the PushinPay API. Each billing cycle issues a manual Pix charge, tracks confirmation through a webhook, and relies on a cron job to generate renewal invoices.

## Environment Variables

Set these keys in `.env` or the hosting environment:

- `PUSHINPAY_API_KEY`: Bearer token provided by PushinPay.
- `PUSHINPAY_API_BASE_URL` _(optional)_: Override default API base (`https://api.pushinpay.com.br/api`).
- `WEBHOOK_BASE_URL`: Public base URL for this backend (used to compose webhook callback URLs).
- `PUSHINPAY_WEBHOOK_SECRET`: Shared secret appended to the webhook URL and validated on receipt.
- `SUBSCRIPTION_VOZ_PRO_PRICE_CENTS` _(optional)_: Voz Pro price in cents (default `1490`).
- `SUBSCRIPTION_VOZ_MASTER_PRICE_CENTS` _(optional)_: Voz Master price in cents (default `2990`).
- `SUBSCRIPTION_CRON_SCHEDULE` _(optional)_: Cron expression for the renewal job (default `0 3 * * *`).
- `SUBSCRIPTION_CRON_TIMEZONE` _(optional)_: Timezone used by the cron job (default `America/Sao_Paulo`).
- `ENABLE_SUBSCRIPTION_CRON` _(optional)_: Set to `false` to disable the renewal job.

## API Endpoints

All routes are namespaced under `/api`.

- `POST /api/subscriptions`
  - Body: `{ userId?: string, email?: string, planType?: "voz_pro" | "voz_master" }`
  - Generates the first Pix charge. Returns Pix copy-and-paste code, QR image, and subscription identifiers.
  - If a pending charge already exists, the endpoint returns it instead of creating a duplicate.

- `GET /api/subscriptions/:userId/status`
  - `:userId` accepts either a user `_id` or an email address.
  - Responds with subscription status, next billing date, and details of the latest and pending payments.

## Webhook

- `POST /api/webhook/pushinpay`
  - PushinPay must call this endpoint when a Pix charge status changes.
  - The `secret` query string value (or `x-webhook-secret` header) must match `PUSHINPAY_WEBHOOK_SECRET`.
  - On `status: paid`, the subscription is marked as active and the next billing date is advanced by one month.
  - Failed or expired payments mark the subscription as `past_due` while keeping the pending charge record.

Expose the webhook publicly (for example, via ngrok or a production domain) using the value from `WEBHOOK_BASE_URL`.

## Billing Scheduler

`src/utils/subscriptionScheduler.js` schedules a daily task (default 03:00 local time) to:

1. Find subscriptions whose `nextBillingDate` is due.
2. Skip accounts that already have a pending Pix charge.
3. Create a new Pix charge via PushinPay and store it as a pending payment.
4. Mark the subscription as `past_due` until payment confirmation.

The scheduler starts automatically when the server boots unless `ENABLE_SUBSCRIPTION_CRON=false`.

## Data Model

`Subscription` documents track the user reference, plan metadata, billing status, and an array of Pix payments:

- `planType`: `voz_pro` ou `voz_master` alinhado ao acesso do usuário.
- `status`: `pending`, `active`, `past_due`, or `cancelled`.
- `nextBillingDate`: Date when the next charge is expected.
- `payments[]`: Records of generated Pix charges, including `pixId`, value, status, timestamps, and raw PushinPay payloads.

Each PushinPay Pix charge corresponds to exactly one payment entry, ensuring idempotent webhook processing and auditable billing history.
