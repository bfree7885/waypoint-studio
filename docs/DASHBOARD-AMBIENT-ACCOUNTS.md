# Waypoint Ambient accounts — Phase 2

**Status:** Implemented in **Stripe test mode / local mock only**. Not a live-billing launch.  
**Product law:** Discover stays free. Ambient paid intelligence is persistent recent context + deterministic “what changed?”.  
**Related:** `docs/DASHBOARD-AMBIENT.md` · `docs/DASHBOARD-AMBIENT-PHASE-0.md`

This document is the architecture decision and entitlement contract for Phase 2.

---

## Architecture decision

Production frontend remains **GitHub Pages** (`waypointstudio.org`, workflow `.github/workflows/pages.yml`). There is no existing Cloudflare Worker in this repository. University `private/university/server` is owner-only password auth and is **not** a billing foundation.

**Chosen shape:**

```text
GitHub Pages  (static Dashboard)
        ↓  CORS + credentialed fetch
Cloudflare Worker  accounts.waypointstudio.org
        ↓
D1  (accounts, sessions, hashed magic links, subscription status)
        ↓
Stripe TEST  +  Resend (magic-link email)
```

Local / CI uses `services/waypoint-accounts/src/dev-server.mjs`: Node HTTP, **memory store**, **mock Stripe** stand-in pages labeled as not stripe.com.

Why this is the smallest production-suitable backend:

- Pages cannot verify webhooks or hold Stripe secrets.
- A Worker keeps the existing static site; no frontend migration.
- D1 stores only entitlement rows. Ambient snapshots stay in IndexedDB.
- Magic-link consume is a GET on the accounts origin so the session cookie is host-only on that origin.

**Rejected:** putting entitlement in `localStorage`; trusting Checkout redirect; migrating Dashboard onto Cloudflare; password accounts; live Stripe keys in this phase.

Phase 2 **throws** if `STRIPE_MODE=live` or `STRIPE_SECRET_KEY` starts with `sk_live`.

---

## Hosting requirements (owner, before live)

1. Cloudflare account + Worker `waypoint-accounts`.
2. D1 database; apply `services/waypoint-accounts/schema.sql`.
3. DNS: `accounts.waypointstudio.org` → Worker. Keep `waypointstudio.org` on GitHub Pages.
4. Stripe **test** product **Waypoint Ambient**, price **$4.99 USD / month**; webhook to `https://accounts.waypointstudio.org/v1/stripe/webhook`.
5. Resend (or equivalent) sender for magic-link email.
6. Secrets via Wrangler — never git.

Local review does not need those. `node services/waypoint-accounts/src/dev-server.mjs` is enough.

---

## Account / session architecture

Identity is **email only**. No passwords, usernames, avatars, or profile pages.

| Piece | Choice |
|-------|--------|
| Magic-link token | 32 random bytes, base64url, **hashed** with `SESSION_SECRET` pepper (`SHA-256(secret + ":magic:" + token)`). Raw token is not stored. |
| Lifetime | 15 minutes (`MAGIC_TTL_MS`) |
| Use | Single-use (`consumed_at`) |
| Enumeration | Request always returns the same generic message |
| Rate limit | 5 / email / hour and 20 / IP / hour |
| Session | 32 random bytes, hashed the same way without the `magic:` prefix |
| Cookie | `wp_ambient_session`; Path=/; HttpOnly; SameSite=**Lax**; Max-Age 30 days; **Secure** unless `COOKIE_SECURE=0` (local HTTP only) |
| CSRF | State-changing POSTs require `Origin` in `ALLOWED_ORIGINS` |
| CORS | Echo a specific allowed Origin + `Allow-Credentials: true`. Never `*` |

Cookie lives on the **accounts origin**, not Pages. The Dashboard calls the API with `credentials: "include"`. `waypointstudio.org` and `accounts.waypointstudio.org` are same-site, so Lax works. The cookie is **not** set with `Domain=.waypointstudio.org`.

Consume is GET (email click) → 302 to an allowlisted Dashboard path + `Set-Cookie`. Redirect `next` is allowlisted under `/apps/dashboard/`.

---

## Storage (minimal)

D1 / memory tables: `accounts`, `subscriptions`, `magic_links`, `sessions`, `webhook_events`, `auth_attempts`.

Stored: account id, email, Stripe customer id, Stripe subscription id, status, period end, timestamps.

**Not stored:** card numbers, Ambient snapshots, precise GPS trails.

---

## Email

Resend when `RESEND_API_KEY` is set and `STRIPE_MODE` is not `mock`. Otherwise the magic-link URL is **captured** for tests (`GET /__test/last-magic-link` exists only in mock).

---

## Stripe product

Owner creates in **Stripe Dashboard test mode**:

- Product name: **Waypoint Ambient**
- Price: **$4.99 USD / month** recurring
- Put the Price id in `STRIPE_PRICE_ID`

Checkout Sessions are created **server-side** with that price. The browser cannot choose a price. No annual plan, trial, coupon, or extra tier in Phase 2.

Customer Portal is Stripe-hosted (or the labeled local stand-in).

---

## Webhook events

Signatures verified (`Stripe-Signature`, 5-minute skew). Unknown events are recorded and ignored. Insert-first idempotency: duplicate `event.id` returns `{ duplicate: true }` without re-applying. If apply throws, the event id is deleted so Stripe can retry.

| Event | Why |
|-------|-----|
| `checkout.session.completed` | Attach Stripe customer + subscription to the account. Redirect is **not** proof of payment. |
| `customer.subscription.created` | Covers portal resubscribe and subscription objects that arrive without a new Checkout. |
| `customer.subscription.updated` | `past_due`, period end, `cancel_at_period_end` while status remains `active`. |
| `customer.subscription.deleted` | Terminal cancellation / end of paid period. |
| `invoice.payment_failed` | Retrieve the subscription if `updated` is delayed so entitlement does not stay `active` after a failed invoice. |

Not handled (not required for this product yet): `invoice.paid` (subscription.updated covers activation), trials, invoices for other products.

---

## Entitlement rules

Only Stripe status **`active`** grants paid Ambient.

Denied: `trialing` (no trial in Phase 2), `past_due`, `unpaid`, `incomplete`, `incomplete_expired`, `canceled`, `paused`, missing.

`cancel_at_period_end` with status still `active` **stays entitled** until Stripe leaves `active` or sends `customer.subscription.deleted`.

Frontend cache is **memory only**. If `/v1/session` fails, the client is **not entitled**. Discover still renders.

Conceptual states: `anonymous` · `authenticated` + `ambient.surface: none` (free) · `active` · `inactive`.

---

## Free vs paid behavior

| Viewer | Ambient |
|--------|---------|
| Anonymous | Current-state preview (NOW, current alerts/quiet DEVELOPING, opportunities). No local history write, no “what changed?”. Honest $4.99 copy. |
| Signed in, free | Same preview. Email + subscribe. |
| Active subscriber | Phase 1.5 IndexedDB history + change detection on this device. |
| Inactive / canceled | Back to preview. **IndexedDB is not deleted.** Paid processing stops. |
| Billing API down | Preview. Discover unchanged. |

History remains on-device. The server authorizes the capability; it never receives snapshots.

Checkout `?checkout=success` is **not** treated as paid. The UI says “Confirming subscription…” and polls `/v1/session`.

---

## Secrets (names only)

See `services/waypoint-accounts/.env.example`. Never commit values.

`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `STRIPE_MODE`, `SESSION_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `ALLOWED_ORIGINS`, `PUBLIC_APP_ORIGIN`, `ACCOUNTS_ORIGIN`, `COOKIE_SECURE`.

---

## Expected cost (estimates)

At Phase 2 volume, Worker + D1 stay on Cloudflare’s free/low tier. Resend’s free allowance is about 100 emails/day and 3,000/month — enough for magic links at small scale.

**Stripe** (official US standard + Billing pay-as-you-go, excluding tax):

- Payments: **2.9% + 30¢** per successful domestic card charge ([stripe.com/pricing](https://stripe.com/pricing))
- Billing: **0.7%** of Billing volume ([stripe.com/billing/pricing](https://stripe.com/billing/pricing))

On **$4.99**:

- Card: `4.99 × 0.029 + 0.30 ≈ $0.445`
- Billing: `4.99 × 0.007 ≈ $0.035`
- **Fees ≈ $0.48** · **Waypoint keeps ≈ $4.51** before tax and income tax

The **$0.30** fixed fee is material on a $4.99 price (~6% of the charge). International cards, disputes ($15), and Stripe Tax are extra and not modeled here.

LLM/radio costs are out of scope.

---

## Privacy / terms

`privacy.html` and `terms.html` now mention accounts, Stripe, on-device Ambient history, and that this is **not** a finished paid contract. **Owner and legal review is required before live charges.** Do not treat those pages as a complete subscription agreement.

---

## Out of scope (still)

Live Stripe, real charges, annual/founding/trial/coupons, cloud Ambient history, radio/SDR/Node, LLM, maps, new opportunity models, merging to `main`, production deploy of billing.
