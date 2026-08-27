#!/usr/bin/env node
/**
 * Waypoint Ambient Phase 2 — accounts API, magic-link auth, Stripe mock webhooks, entitlement.
 */
import { createApp } from "../services/waypoint-accounts/src/app.mjs";
import { createMemoryStore } from "../services/waypoint-accounts/src/store.mjs";
import { createStripeAdapter } from "../services/waypoint-accounts/src/stripe.mjs";
import { createEmailAdapter } from "../services/waypoint-accounts/src/email.mjs";
import { hmacSha256Hex } from "../services/waypoint-accounts/src/crypto.mjs";
import { isEntitledStatus } from "../services/waypoint-accounts/src/entitlement.mjs";
import { setTimeout as delay } from "node:timers/promises";

let failed = 0;

function assert(name, cond, detail) {
  if (cond) console.log("PASS", name);
  else {
    failed += 1;
    console.log("FAIL", name, detail || "");
  }
}

function envBase(over) {
  return Object.assign(
    {
      STRIPE_MODE: "mock",
      STRIPE_WEBHOOK_SECRET: "whsec_test_secret",
      STRIPE_PRICE_ID: "price_ambient_test",
      SESSION_SECRET: "unit-session-secret",
      ALLOWED_ORIGINS: "http://127.0.0.1:8080",
      PUBLIC_APP_ORIGIN: "http://127.0.0.1:8080",
      ACCOUNTS_ORIGIN: "http://127.0.0.1:8787",
      COOKIE_SECURE: "0"
    },
    over || {}
  );
}

function harness(over) {
  const env = envBase(over);
  const store = createMemoryStore();
  const stripe = createStripeAdapter(env);
  const email = createEmailAdapter(env);
  const app = createApp({ env: env, store: store, stripe: stripe, email: email });
  return { env: env, store: store, stripe: stripe, email: email, app: app };
}

async function call(app, method, path, opts) {
  opts = opts || {};
  const headers = Object.assign({}, opts.headers || {});
  const init = { method: method, headers: headers };
  if (opts.body != null) {
    if (typeof opts.body === "string" || opts.body instanceof URLSearchParams) {
      init.body = typeof opts.body === "string" ? opts.body : opts.body.toString();
    } else {
      init.body = JSON.stringify(opts.body);
      if (!headers["Content-Type"] && !headers["content-type"]) {
        headers["Content-Type"] = "application/json";
      }
    }
    init.duplex = "half";
  }
  if (opts.cookie) headers.Cookie = opts.cookie;
  if (opts.origin) headers.Origin = opts.origin;
  if (opts.signature) headers["Stripe-Signature"] = opts.signature;
  return app.handle(new Request("http://127.0.0.1:8787" + path, init));
}

function cookieFrom(res) {
  const raw = res.headers.get("Set-Cookie") || "";
  const m = raw.match(/wp_ambient_session=([^;]+)/);
  return m ? "wp_ambient_session=" + m[1] : "";
}

const ORIGIN = "http://127.0.0.1:8080";

assert("only active is entitled", isEntitledStatus("active") === true);
assert("past_due is not entitled", isEntitledStatus("past_due") === false);
assert("canceled is not entitled", isEntitledStatus("canceled") === false);
assert("trialing is not entitled", isEntitledStatus("trialing") === false);
assert("unpaid is not entitled", isEntitledStatus("unpaid") === false);

try {
  createStripeAdapter({ STRIPE_MODE: "live", STRIPE_SECRET_KEY: "sk_test_x" });
  assert("live mode refused", false);
} catch (e) {
  assert("live mode refused", /refuses Stripe live mode/.test(String(e.message)));
}

try {
  createStripeAdapter({ STRIPE_MODE: "test", STRIPE_SECRET_KEY: "sk_live_nope" });
  assert("sk_live refused", false);
} catch (e) {
  assert("sk_live refused", /refuses Stripe live mode/.test(String(e.message)));
}

{
  const h = harness();
  const health = await (await call(h.app, "GET", "/v1/health")).json();
  assert("health ok", health.ok === true && health.liveBilling === false && health.stripe === "mock");
  const anon = await (await call(h.app, "GET", "/v1/session")).json();
  assert("anonymous session", anon.auth === "anonymous" && anon.ambient.entitled === false);
}

{
  const h = harness();
  const missingOrigin = await call(h.app, "POST", "/v1/auth/magic-link", {
    body: { email: "a@example.com" }
  });
  assert("magic-link without Origin is forbidden", missingOrigin.status === 403);

  const bad = await call(h.app, "POST", "/v1/auth/magic-link", {
    origin: ORIGIN,
    body: { email: "not-an-email" }
  });
  const badJson = await bad.json();
  const good = await call(h.app, "POST", "/v1/auth/magic-link", {
    origin: ORIGIN,
    body: { email: "person@example.com" }
  });
  const goodJson = await good.json();
  assert("invalid email uses generic message", badJson.ok === true && /If that address/.test(badJson.message));
  assert("valid email uses the same generic message", goodJson.message === badJson.message);
  assert("magic link captured", !!(h.env.__lastMagicLink && h.env.__lastMagicLink.url));
}

{
  const h = harness();
  await call(h.app, "POST", "/v1/auth/magic-link", {
    origin: ORIGIN,
    body: { email: "consume@example.com" }
  });
  const url = new URL(h.env.__lastMagicLink.url);
  const token = url.searchParams.get("token");
  const first = await call(h.app, "GET", "/v1/auth/consume?token=" + encodeURIComponent(token));
  assert("valid consume redirects", first.status === 302);
  assert("consume sets session cookie", /wp_ambient_session=/.test(first.headers.get("Set-Cookie") || ""));
  const cookie = cookieFrom(first);
  const sess = await (await call(h.app, "GET", "/v1/session", { cookie: cookie })).json();
  assert("session authenticated free", sess.auth === "authenticated" && sess.email === "consume@example.com");
  assert("new account is not entitled", sess.ambient.entitled === false && sess.ambient.surface === "none");

  const reused = await call(h.app, "GET", "/v1/auth/consume?token=" + encodeURIComponent(token));
  assert("reused link flagged", reused.status === 302 && /auth=reused/.test(reused.headers.get("Location") || ""));

  const invalid = await call(h.app, "GET", "/v1/auth/consume?token=not-a-real-token");
  assert("invalid link flagged", invalid.status === 302 && /auth=invalid/.test(invalid.headers.get("Location") || ""));

  const loggedOut = await call(h.app, "POST", "/v1/auth/logout", { origin: ORIGIN, cookie: cookie, body: {} });
  assert("logout ok", loggedOut.status === 200);
  const after = await (await call(h.app, "GET", "/v1/session", { cookie: cookie })).json();
  assert("logout invalidates session", after.auth === "anonymous");
}

{
  const h = harness({ MAGIC_TTL_MS: "1" });
  await call(h.app, "POST", "/v1/auth/magic-link", {
    origin: ORIGIN,
    body: { email: "expire@example.com" }
  });
  const token = new URL(h.env.__lastMagicLink.url).searchParams.get("token");
  await delay(20);
  const expired = await call(h.app, "GET", "/v1/auth/consume?token=" + encodeURIComponent(token));
  assert("expired link flagged", expired.status === 302 && /auth=expired/.test(expired.headers.get("Location") || ""));
}

{
  const h = harness();
  const unauth = await call(h.app, "POST", "/v1/checkout", { origin: ORIGIN, body: { priceId: "price_hack" } });
  assert("checkout requires authentication", unauth.status === 401);

  await call(h.app, "POST", "/v1/auth/magic-link", { origin: ORIGIN, body: { email: "pay@example.com" } });
  const token = new URL(h.env.__lastMagicLink.url).searchParams.get("token");
  const consumed = await call(h.app, "GET", "/v1/auth/consume?token=" + encodeURIComponent(token));
  const cookie = cookieFrom(consumed);
  const checkout = await call(h.app, "POST", "/v1/checkout", {
    origin: ORIGIN,
    cookie: cookie,
    body: { priceId: "price_hack", price: "1.00" }
  });
  const checkoutJson = await checkout.json();
  assert("authenticated checkout returns url", checkout.status === 200 && /__stripe_test_checkout/.test(checkoutJson.url));
  const sessionId = checkoutJson.id;
  const mockSession = h.stripe.sessions.get(sessionId);
  assert("checkout ignores client price", mockSession && h.stripe.subscriptions.get(mockSession.subscription).items.data[0].price.id === "price_ambient_test");

  const pay = await call(h.app, "POST", "/__stripe_test_checkout/pay", {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ session_id: sessionId })
  });
  assert("mock pay redirects to success", pay.status === 302 && /checkout=success/.test(pay.headers.get("Location") || ""));
  const active = await (await call(h.app, "GET", "/v1/session", { cookie: cookie })).json();
  assert("webhook activation entitles", active.ambient.entitled === true && active.ambient.surface === "active", JSON.stringify(active.ambient));

  const portal = await call(h.app, "POST", "/v1/portal", { origin: ORIGIN, cookie: cookie, body: {} });
  const portalJson = await portal.json();
  assert("portal url for subscriber", portal.status === 200 && /__stripe_test_portal/.test(portalJson.url));

  const customer = new URL(portalJson.url).searchParams.get("customer");
  const cancel = await call(h.app, "POST", "/__stripe_test_portal/cancel", {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ customer: customer })
  });
  assert("portal cancel redirects", cancel.status === 302);
  const inactive = await (await call(h.app, "GET", "/v1/session", { cookie: cookie })).json();
  assert("cancellation removes entitlement", inactive.ambient.entitled === false && inactive.ambient.surface === "inactive", JSON.stringify(inactive.ambient));
}

{
  const h = harness();
  await call(h.app, "POST", "/v1/auth/magic-link", { origin: ORIGIN, body: { email: "hook@example.com" } });
  const token = new URL(h.env.__lastMagicLink.url).searchParams.get("token");
  const consumed = await call(h.app, "GET", "/v1/auth/consume?token=" + encodeURIComponent(token));
  const cookie = cookieFrom(consumed);
  const account = (await h.store.dump()).accounts[0];

  const event = {
    id: "evt_test_activate",
    type: "customer.subscription.updated",
    data: {
      object: {
        id: "sub_test_1",
        object: "subscription",
        status: "active",
        customer: "cus_test_1",
        current_period_end: Math.floor(Date.now() / 1000) + 86400,
        cancel_at_period_end: false,
        items: { data: [{ price: { id: "price_ambient_test" } }] },
        metadata: { account_id: account.id }
      }
    }
  };
  const signed = await h.app.signedWebhook(event);
  const ok = await call(h.app, "POST", "/v1/stripe/webhook", {
    headers: { "Content-Type": "application/json" },
    signature: signed.header,
    body: signed.body
  });
  const okJson = await ok.json();
  assert("valid webhook accepted", ok.status === 200 && okJson.ok === true);
  const entitled = await (await call(h.app, "GET", "/v1/session", { cookie: cookie })).json();
  assert("subscription.updated activates", entitled.ambient.entitled === true);

  const dup = await call(h.app, "POST", "/v1/stripe/webhook", {
    headers: { "Content-Type": "application/json" },
    signature: signed.header,
    body: signed.body
  });
  const dupJson = await dup.json();
  assert("duplicate webhook is idempotent", dup.status === 200 && dupJson.duplicate === true);

  const badSig = await call(h.app, "POST", "/v1/stripe/webhook", {
    headers: { "Content-Type": "application/json" },
    signature: "t=1,v1=deadbeef",
    body: signed.body
  });
  assert("invalid signature rejected", badSig.status === 400);

  const pastDue = {
    id: "evt_test_pastdue",
    type: "customer.subscription.updated",
    data: {
      object: Object.assign({}, event.data.object, { status: "past_due" })
    }
  };
  const signedPast = await h.app.signedWebhook(pastDue);
  await call(h.app, "POST", "/v1/stripe/webhook", {
    headers: { "Content-Type": "application/json" },
    signature: signedPast.header,
    body: signedPast.body
  });
  const afterPast = await (await call(h.app, "GET", "/v1/session", { cookie: cookie })).json();
  assert("past_due removes entitlement", afterPast.ambient.entitled === false && afterPast.ambient.surface === "inactive");

  const cancelAtEnd = {
    id: "evt_test_cap",
    type: "customer.subscription.updated",
    data: {
      object: Object.assign({}, event.data.object, { status: "active", cancel_at_period_end: true })
    }
  };
  const signedCap = await h.app.signedWebhook(cancelAtEnd);
  await call(h.app, "POST", "/v1/stripe/webhook", {
    headers: { "Content-Type": "application/json" },
    signature: signedCap.header,
    body: signedCap.body
  });
  const stillActive = await (await call(h.app, "GET", "/v1/session", { cookie: cookie })).json();
  assert("cancel_at_period_end still entitled while active", stillActive.ambient.entitled === true);

  const deleted = {
    id: "evt_test_deleted",
    type: "customer.subscription.deleted",
    data: { object: Object.assign({}, event.data.object, { status: "canceled" }) }
  };
  const signedDel = await h.app.signedWebhook(deleted);
  await call(h.app, "POST", "/v1/stripe/webhook", {
    headers: { "Content-Type": "application/json" },
    signature: signedDel.header,
    body: signedDel.body
  });
  const gone = await (await call(h.app, "GET", "/v1/session", { cookie: cookie })).json();
  assert("subscription.deleted removes entitlement", gone.ambient.entitled === false);
}

{
  const expected = await hmacSha256Hex("whsec_test_secret", "payload");
  assert("hmac helper used by webhooks", typeof expected === "string" && expected.length === 64);
}

if (failed) {
  console.error("\nWAYPOINT ACCOUNTS: FAIL (" + failed + ")");
  process.exit(1);
}
console.log("\nWAYPOINT ACCOUNTS: PASS");
