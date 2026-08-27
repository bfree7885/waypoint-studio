import { hmacSha256Hex, timingSafeEqual } from "./crypto.mjs";

export async function verifyStripeSignature(rawBody, header, secret, nowMs) {
  if (!header || !secret) return false;
  const parts = String(header)
    .split(",")
    .map(function (p) {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    });
  let t = 0;
  const v1s = [];
  parts.forEach(function (kv) {
    if (kv[0] === "t") t = Number(kv[1]);
    if (kv[0] === "v1" && kv[1]) v1s.push(kv[1]);
  });
  if (!t || !v1s.length) return false;
  const skew = Math.abs(nowMs / 1000 - t);
  if (skew > 300) return false;
  const expected = await hmacSha256Hex(secret, t + "." + rawBody);
  for (let i = 0; i < v1s.length; i++) {
    if (timingSafeEqual(expected, v1s[i])) return true;
  }
  return false;
}

export function createStripeAdapter(env) {
  const mode = String(env.STRIPE_MODE || "mock").toLowerCase();
  const key = String(env.STRIPE_SECRET_KEY || "");
  if (mode === "live" || key.indexOf("sk_live") === 0) {
    throw new Error("Phase 2 refuses Stripe live mode");
  }
  if (mode === "mock" || !key) return createMockStripe(env);
  return createLiveTestStripe(env);
}

function createLiveTestStripe(env) {
  const key = env.STRIPE_SECRET_KEY;
  const priceId = env.STRIPE_PRICE_ID;
  async function stripe(method, path, body) {
    const res = await fetch("https://api.stripe.com/v1" + path, {
      method: method,
      headers: {
        Authorization: "Bearer " + key,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: body ? new URLSearchParams(body).toString() : undefined
    });
    const json = await res.json();
    if (!res.ok) {
      const err = new Error((json && json.error && json.error.message) || "Stripe error");
      err.status = res.status;
      err.payload = json;
      throw err;
    }
    return json;
  }
  return {
    kind: "stripe-test",
    async createCheckoutSession(opts) {
      const params = {
        mode: "subscription",
        client_reference_id: opts.accountId,
        success_url: opts.successUrl,
        cancel_url: opts.cancelUrl,
        "line_items[0][price]": priceId,
        "line_items[0][quantity]": "1",
        "metadata[account_id]": opts.accountId,
        "subscription_data[metadata][account_id]": opts.accountId
      };
      if (opts.customerId) params.customer = opts.customerId;
      else params.customer_email = opts.email;
      return stripe("POST", "/checkout/sessions", params);
    },
    async createPortalSession(opts) {
      return stripe("POST", "/billing_portal/sessions", {
        customer: opts.customerId,
        return_url: opts.returnUrl
      });
    },
    async retrieveSubscription(id) {
      return stripe("GET", "/subscriptions/" + encodeURIComponent(id));
    }
  };
}

export function createMockStripe(env) {
  const sessions = new Map();
  const subscriptions = new Map();
  const customers = new Map();
  let n = 1;
  function id(prefix) {
    return prefix + "_mock_" + n++;
  }
  const origin = env.ACCOUNTS_ORIGIN || "http://127.0.0.1:8787";
  return {
    kind: "mock",
    sessions: sessions,
    subscriptions: subscriptions,
    customers: customers,
    async createCheckoutSession(opts) {
      const sessionId = id("cs");
      const customerId = opts.customerId || id("cus");
      const subId = id("sub");
      const row = {
        id: sessionId,
        object: "checkout.session",
        mode: "subscription",
        status: "open",
        client_reference_id: opts.accountId,
        customer: customerId,
        customer_email: opts.email,
        subscription: subId,
        metadata: { account_id: opts.accountId },
        success_url: opts.successUrl,
        cancel_url: opts.cancelUrl,
        url: origin + "/__stripe_test_checkout?session_id=" + sessionId
      };
      sessions.set(sessionId, row);
      customers.set(customerId, { id: customerId, email: opts.email, accountId: opts.accountId });
      subscriptions.set(subId, {
        id: subId,
        object: "subscription",
        status: "incomplete",
        customer: customerId,
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 3600,
        cancel_at_period_end: false,
        items: { data: [{ price: { id: env.STRIPE_PRICE_ID || "price_ambient_test" } }] },
        metadata: { account_id: opts.accountId }
      });
      return row;
    },
    async createPortalSession(opts) {
      return {
        id: id("bps"),
        url: origin + "/__stripe_test_portal?customer=" + encodeURIComponent(opts.customerId),
        customer: opts.customerId,
        return_url: opts.returnUrl
      };
    },
    async retrieveSubscription(id) {
      return subscriptions.get(id) || null;
    },
    completeCheckout(sessionId) {
      const session = sessions.get(sessionId);
      if (!session) return null;
      session.status = "complete";
      const sub = subscriptions.get(session.subscription);
      if (sub) sub.status = "active";
      return { session: session, subscription: sub };
    },
    cancelSubscription(subId) {
      const sub = subscriptions.get(subId);
      if (!sub) return null;
      sub.status = "canceled";
      sub.cancel_at_period_end = false;
      return sub;
    },
    failSubscription(subId, status) {
      const sub = subscriptions.get(subId);
      if (!sub) return null;
      sub.status = status || "past_due";
      return sub;
    }
  };
}

export function periodEndIso(sub) {
  if (!sub) return null;
  const n = sub.current_period_end;
  if (n == null) return null;
  if (typeof n === "string" && n.indexOf("T") >= 0) return n;
  const ms = Number(n) * (Number(n) > 1e12 ? 1 : 1000);
  if (!isFinite(ms)) return null;
  return new Date(Number(n) > 1e12 ? Number(n) : Number(n) * 1000).toISOString();
}

export function priceIdFromSubscription(sub) {
  try {
    return sub.items.data[0].price.id;
  } catch (e) {
    return sub && sub.stripe_price_id ? sub.stripe_price_id : null;
  }
}
