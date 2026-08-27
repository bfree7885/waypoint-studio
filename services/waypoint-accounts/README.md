# Waypoint Ambient accounts

See `docs/DASHBOARD-AMBIENT-ACCOUNTS.md` for architecture, webhooks, entitlement, cost, and secrets.

## Local (mock Stripe, memory store)

```bash
node services/waypoint-accounts/src/dev-server.mjs
```

Listens on `http://127.0.0.1:8787`. Checkout and Customer Portal are labeled
**stand-ins**, not stripe.com.

## Production-shaped deploy (owner, later)

1. Create D1: `wrangler d1 create waypoint-accounts`
2. Apply `schema.sql`
3. Put **test** secrets with `wrangler secret put`
4. Route `accounts.waypointstudio.org` to this Worker
5. Keep `waypointstudio.org` on GitHub Pages

Do not enable live keys in this phase.
