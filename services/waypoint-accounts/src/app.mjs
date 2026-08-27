import { hashSecret, isLikelyEmail, newId, normalizeEmail, randomToken } from "./crypto.mjs";
import { sessionView, isEntitledStatus } from "./entitlement.mjs";
import { periodEndIso, priceIdFromSubscription, verifyStripeSignature } from "./stripe.mjs";

const DEFAULT_MAGIC_TTL_MS = 15 * 60 * 1000;
const DEFAULT_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const ATTEMPT_WINDOW_MS = 60 * 60 * 1000;
const EMAIL_ATTEMPT_MAX = 5;
const IP_ATTEMPT_MAX = 20;
const COOKIE = "wp_ambient_session";

const SAFE_NEXT = [
  "/apps/dashboard/",
  "/apps/dashboard/#/",
  "/apps/dashboard/#/ambient",
  "/apps/dashboard/#/ambient?checkout=success",
  "/apps/dashboard/#/ambient?checkout=cancel"
];

export function createApp(deps) {
  const env = deps.env || {};
  const store = deps.store;
  const stripe = deps.stripe;
  const email = deps.email;
  const MAGIC_TTL_MS = Number(env.MAGIC_TTL_MS) > 0 ? Number(env.MAGIC_TTL_MS) : DEFAULT_MAGIC_TTL_MS;
  const SESSION_TTL_MS = Number(env.SESSION_TTL_MS) > 0 ? Number(env.SESSION_TTL_MS) : DEFAULT_SESSION_TTL_MS;

  async function handle(request) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return cors(request, new Response(null, { status: 204 }));

    try {
      if (url.pathname === "/v1/health" && request.method === "GET") {
        return json(request, { ok: true, service: "waypoint-accounts", stripe: stripe.kind, liveBilling: false });
      }
      if (url.pathname === "/v1/session" && request.method === "GET") return sessionGet(request);
      if (url.pathname === "/v1/auth/magic-link" && request.method === "POST") return magicLink(request);
      if (url.pathname === "/v1/auth/consume" && request.method === "GET") return consume(request, url);
      if (url.pathname === "/v1/auth/logout" && request.method === "POST") return logout(request);
      if (url.pathname === "/v1/checkout" && request.method === "POST") return checkout(request);
      if (url.pathname === "/v1/portal" && request.method === "POST") return portal(request);
      if (url.pathname === "/v1/stripe/webhook" && request.method === "POST") return webhook(request);

      if (stripe.kind === "mock") {
        if (url.pathname === "/__stripe_test_checkout" && request.method === "GET") return mockCheckoutPage(url);
        if (url.pathname === "/__stripe_test_checkout/pay" && request.method === "POST") return mockCheckoutPay(request);
        if (url.pathname === "/__stripe_test_portal" && request.method === "GET") return mockPortalPage(url);
        if (url.pathname === "/__stripe_test_portal/cancel" && request.method === "POST") return mockPortalCancel(request);
        if (url.pathname === "/__test/last-magic-link" && request.method === "GET") {
          return json(request, env.__lastMagicLink || { url: null });
        }
      }

      return json(request, { error: "not_found" }, 404);
    } catch (err) {
      return json(request, { error: "server_error" }, 500);
    }
  }

  function allowedOrigins() {
    return String(env.ALLOWED_ORIGINS || "https://waypointstudio.org")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function originOk(request) {
    const origin = request.headers.get("Origin") || request.headers.get("origin");
    if (!origin) return { ok: true, origin: null };
    return { ok: allowedOrigins().indexOf(origin) >= 0, origin: origin };
  }

  function cors(request, response) {
    const origin = request.headers.get("Origin");
    const headers = new Headers(response.headers);
    if (origin && allowedOrigins().indexOf(origin) >= 0) {
      headers.set("Access-Control-Allow-Origin", origin);
      headers.set("Vary", "Origin");
      headers.set("Access-Control-Allow-Credentials", "true");
      headers.set("Access-Control-Allow-Headers", "Content-Type");
      headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    }
    headers.set("Cache-Control", "no-store");
    return new Response(response.body, { status: response.status, headers: headers });
  }

  function json(request, body, status) {
    return cors(
      request,
      new Response(JSON.stringify(body), {
        status: status || 200,
        headers: { "Content-Type": "application/json; charset=utf-8" }
      })
    );
  }

  function requireSameOriginPost(request) {
    const origin = request.headers.get("Origin");
    if (!origin) return false;
    return allowedOrigins().indexOf(origin) >= 0;
  }

  function cookieToken(request) {
    const raw = request.headers.get("Cookie") || "";
    const parts = raw.split(";").map((p) => p.trim());
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].indexOf(COOKIE + "=") === 0) return decodeURIComponent(parts[i].slice(COOKIE.length + 1));
    }
    return null;
  }

  function sessionCookie(token, maxAge) {
    const secure = String(env.COOKIE_SECURE || "1") !== "0";
    const parts = [
      COOKIE + "=" + encodeURIComponent(token),
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      "Max-Age=" + String(maxAge)
    ];
    if (secure) parts.push("Secure");
    return parts.join("; ");
  }

  async function loadSession(request) {
    const token = cookieToken(request);
    if (!token) return null;
    const hash = await hashSecret(env.SESSION_SECRET, token);
    const row = await store.getSessionByHash(hash);
    if (!row || row.revoked_at) return null;
    if (Date.parse(row.expires_at) <= Date.now()) return null;
    const account = await store.getAccountById(row.account_id);
    if (!account) return null;
    const sub = await store.getSubscription(account.id);
    return { token: token, row: row, account: account, subscription: sub };
  }

  async function sessionGet(request) {
    const sess = await loadSession(request);
    return json(request, sessionView(sess && sess.account, sess && sess.subscription));
  }

  async function magicLink(request) {
    if (!requireSameOriginPost(request)) return json(request, { error: "forbidden" }, 403);
    let body = {};
    try {
      body = await request.json();
    } catch (e) {
      body = {};
    }
    const address = String(body.email || "").trim();
    const generic = {
      ok: true,
      message: "If that address can receive mail, we sent a sign-in link."
    };
    if (!isLikelyEmail(address)) return json(request, generic);
    const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "local";
    const nowIso = new Date().toISOString();
    const emailCount = await store.bumpAttempt("email:" + normalizeEmail(address), nowIso, nowIso, ATTEMPT_WINDOW_MS);
    const ipCount = await store.bumpAttempt("ip:" + ip, nowIso, nowIso, ATTEMPT_WINDOW_MS);
    if (emailCount > EMAIL_ATTEMPT_MAX || ipCount > IP_ATTEMPT_MAX) return json(request, generic);

    const token = randomToken(32);
    const hash = await hashSecret(env.SESSION_SECRET, "magic:" + token);
    const next = sanitizeNext(body.next);
    await store.putMagicLink({
      id: newId("ml"),
      email_normalized: normalizeEmail(address),
      token_hash: hash,
      expires_at: new Date(Date.now() + MAGIC_TTL_MS).toISOString(),
      consumed_at: null,
      created_at: nowIso,
      redirect_path: next
    });
    const consume = new URL("/v1/auth/consume", env.ACCOUNTS_ORIGIN || request.url);
    consume.searchParams.set("token", token);
    if (next) consume.searchParams.set("next", next);
    const sent = await email.sendMagicLink({ to: normalizeEmail(address), url: consume.toString() });
    if (!sent.ok) return json(request, { error: "email_failed" }, 503);
    return json(request, generic);
  }

  function sanitizeNext(next) {
    const raw = String(next || "/apps/dashboard/#/ambient");
    if (SAFE_NEXT.indexOf(raw) >= 0) return raw;
    if (raw.indexOf("/apps/dashboard/#/ambient") === 0 && raw.length < 80) return "/apps/dashboard/#/ambient";
    return "/apps/dashboard/#/ambient";
  }

  async function consume(request, url) {
    const token = url.searchParams.get("token") || "";
    const appOrigin = env.PUBLIC_APP_ORIGIN || "https://waypointstudio.org";
    const fail = appOrigin + "/apps/dashboard/#/ambient?auth=invalid";
    if (!token) return redirect(fail);
    const hash = await hashSecret(env.SESSION_SECRET, "magic:" + token);
    const link = await store.getMagicLinkByHash(hash);
    const now = Date.now();
    if (!link) return redirect(appOrigin + "/apps/dashboard/#/ambient?auth=invalid");
    if (link.consumed_at) return redirect(appOrigin + "/apps/dashboard/#/ambient?auth=reused");
    if (Date.parse(link.expires_at) <= now) return redirect(appOrigin + "/apps/dashboard/#/ambient?auth=expired");

    await store.consumeMagicLink(link.id, new Date(now).toISOString());
    let account = await store.getAccountByEmail(link.email_normalized);
    if (!account) {
      account = await store.putAccount({
        id: newId("acct"),
        email: link.email_normalized,
        email_normalized: link.email_normalized,
        stripe_customer_id: null,
        created_at: new Date(now).toISOString(),
        updated_at: new Date(now).toISOString()
      });
    }
    const sessionToken = randomToken(32);
    const sessionHash = await hashSecret(env.SESSION_SECRET, sessionToken);
    await store.putSession({
      id: newId("sess"),
      account_id: account.id,
      token_hash: sessionHash,
      expires_at: new Date(now + SESSION_TTL_MS).toISOString(),
      created_at: new Date(now).toISOString(),
      revoked_at: null
    });
    const next = sanitizeNext(url.searchParams.get("next") || link.redirect_path);
    const dest = appOrigin + next;
    const headers = new Headers({ Location: dest });
    headers.append("Set-Cookie", sessionCookie(sessionToken, Math.floor(SESSION_TTL_MS / 1000)));
    return cors(request, new Response(null, { status: 302, headers: headers }));
  }

  async function logout(request) {
    if (!requireSameOriginPost(request)) return json(request, { error: "forbidden" }, 403);
    const sess = await loadSession(request);
    if (sess) await store.revokeSession(sess.row.id, new Date().toISOString());
    const headers = new Headers({ "Content-Type": "application/json; charset=utf-8" });
    headers.append("Set-Cookie", sessionCookie("deleted", 0));
    return cors(request, new Response(JSON.stringify({ ok: true }), { status: 200, headers: headers }));
  }

  async function checkout(request) {
    if (!requireSameOriginPost(request)) return json(request, { error: "forbidden" }, 403);
    const sess = await loadSession(request);
    if (!sess) return json(request, { error: "unauthenticated" }, 401);
    const appOrigin = env.PUBLIC_APP_ORIGIN || "https://waypointstudio.org";
    try {
      const session = await stripe.createCheckoutSession({
        accountId: sess.account.id,
        email: sess.account.email,
        customerId: sess.account.stripe_customer_id || null,
        successUrl: appOrigin + "/apps/dashboard/#/ambient?checkout=success",
        cancelUrl: appOrigin + "/apps/dashboard/#/ambient?checkout=cancel"
      });
      return json(request, { url: session.url, id: session.id });
    } catch (e) {
      return json(request, { error: "stripe_unavailable" }, 503);
    }
  }

  async function portal(request) {
    if (!requireSameOriginPost(request)) return json(request, { error: "forbidden" }, 403);
    const sess = await loadSession(request);
    if (!sess) return json(request, { error: "unauthenticated" }, 401);
    if (!sess.account.stripe_customer_id) return json(request, { error: "no_customer" }, 409);
    const appOrigin = env.PUBLIC_APP_ORIGIN || "https://waypointstudio.org";
    try {
      const portalSession = await stripe.createPortalSession({
        customerId: sess.account.stripe_customer_id,
        returnUrl: appOrigin + "/apps/dashboard/#/ambient"
      });
      return json(request, { url: portalSession.url });
    } catch (e) {
      return json(request, { error: "portal_unavailable" }, 503);
    }
  }

  async function webhook(request) {
    const raw = await request.text();
    const header = request.headers.get("Stripe-Signature") || request.headers.get("stripe-signature") || "";
    const ok = await verifyStripeSignature(raw, header, env.STRIPE_WEBHOOK_SECRET, Date.now());
    if (!ok) return json(request, { error: "invalid_signature" }, 400);
    let event;
    try {
      event = JSON.parse(raw);
    } catch (e) {
      return json(request, { error: "invalid_json" }, 400);
    }
    if (!event || !event.id || !event.type) return json(request, { error: "invalid_event" }, 400);
    const rec = await store.putWebhookEvent({
      stripe_event_id: event.id,
      type: event.type,
      processed_at: new Date().toISOString()
    });
    if (!rec.inserted) return json(request, { ok: true, duplicate: true });
    try {
      await applyStripeEvent(event);
    } catch (err) {
      await store.deleteWebhookEvent(event.id);
      throw err;
    }
    return json(request, { ok: true });
  }

  async function applyStripeEvent(event) {
    const type = event.type;
    const obj = event.data && event.data.object ? event.data.object : {};
    if (type === "checkout.session.completed") {
      await onCheckoutCompleted(obj);
      return;
    }
    if (type === "customer.subscription.created" || type === "customer.subscription.updated") {
      await upsertSubscriptionFromStripe(obj);
      return;
    }
    if (type === "customer.subscription.deleted") {
      const copy = Object.assign({}, obj, { status: "canceled" });
      await upsertSubscriptionFromStripe(copy);
      return;
    }
    if (type === "invoice.payment_failed") {
      const subId = typeof obj.subscription === "string" ? obj.subscription : obj.subscription && obj.subscription.id;
      if (subId && stripe.retrieveSubscription) {
        const sub = await stripe.retrieveSubscription(subId);
        if (sub) await upsertSubscriptionFromStripe(sub);
      }
    }
  }

  async function onCheckoutCompleted(session) {
    if (session.mode && session.mode !== "subscription") return;
    const accountId = session.client_reference_id || (session.metadata && session.metadata.account_id);
    let account = accountId ? await store.getAccountById(accountId) : null;
    const customerId = typeof session.customer === "string" ? session.customer : session.customer && session.customer.id;
    if (!account && customerId) account = await store.getAccountByCustomer(customerId);
    if (!account) return;
    if (customerId && account.stripe_customer_id !== customerId) {
      account.stripe_customer_id = customerId;
      account.updated_at = new Date().toISOString();
      await store.putAccount(account);
    }
    const subId = typeof session.subscription === "string" ? session.subscription : session.subscription && session.subscription.id;
    if (subId && stripe.retrieveSubscription) {
      const sub = await stripe.retrieveSubscription(subId);
      if (sub) await upsertSubscriptionFromStripe(sub, account.id);
    }
  }

  async function upsertSubscriptionFromStripe(sub, accountIdHint) {
    const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer && sub.customer.id;
    let account = null;
    const metaId = sub.metadata && sub.metadata.account_id;
    if (accountIdHint) account = await store.getAccountById(accountIdHint);
    if (!account && metaId) account = await store.getAccountById(metaId);
    if (!account && customerId) account = await store.getAccountByCustomer(customerId);
    if (!account && sub.id) {
      const existing = await store.getSubscriptionByStripeId(sub.id);
      if (existing) account = await store.getAccountById(existing.account_id);
    }
    if (!account) return;
    if (customerId && account.stripe_customer_id !== customerId) {
      account.stripe_customer_id = customerId;
      account.updated_at = new Date().toISOString();
      await store.putAccount(account);
    }
    await store.putSubscription({
      account_id: account.id,
      stripe_subscription_id: sub.id,
      stripe_price_id: priceIdFromSubscription(sub),
      status: String(sub.status || "none").toLowerCase(),
      current_period_end: periodEndIso(sub),
      cancel_at_period_end: !!sub.cancel_at_period_end,
      updated_at: new Date().toISOString()
    });
  }

  async function signedWebhook(event) {
    const body = JSON.stringify(event);
    const t = Math.floor(Date.now() / 1000);
    const v1 = await (await import("./crypto.mjs")).hmacSha256Hex(env.STRIPE_WEBHOOK_SECRET, t + "." + body);
    return { body: body, header: "t=" + t + ",v1=" + v1 };
  }

  function escapeAttr(s) {
    return String(s || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  }

  async function mockCheckoutPage(url) {
    const sessionId = url.searchParams.get("session_id") || "";
    const html =
      "<!doctype html><html><head><meta charset='utf-8'><title>Stripe test stand-in</title></head><body style='font-family:sans-serif;background:#0a2540;color:#fff;padding:2rem'>" +
      "<p>STRIPE TEST-MODE STAND-IN</p><p>Not stripe.com. Local verification only. No real charge.</p>" +
      "<h1>Waypoint Ambient</h1><p>$4.99 / month</p>" +
      "<form method='post' action='/__stripe_test_checkout/pay'><input type='hidden' name='session_id' value='" +
      escapeAttr(sessionId) +
      "'><button type='submit' style='font-size:1.1rem;padding:.6rem 1rem'>Pay with test card</button></form>" +
      "<p>Use Stripe test cards only when talking to real Stripe test mode.</p></body></html>";
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  async function mockCheckoutPay(request) {
    const form = await request.formData();
    const sessionId = String(form.get("session_id") || "");
    const completed = stripe.completeCheckout(sessionId);
    if (!completed) return new Response("missing session", { status: 400 });
    const eventId = "evt_mock_" + sessionId + "_complete";
    await applySignedMockEvent({
      id: eventId,
      type: "checkout.session.completed",
      data: { object: completed.session }
    });
    await applySignedMockEvent({
      id: eventId + "_sub",
      type: "customer.subscription.updated",
      data: { object: completed.subscription }
    });
    return redirect(completed.session.success_url);
  }

  async function mockPortalPage(url) {
    const customer = url.searchParams.get("customer") || "";
    const html =
      "<!doctype html><html><head><meta charset='utf-8'><title>Stripe portal stand-in</title></head><body style='font-family:sans-serif;background:#0a2540;color:#fff;padding:2rem'>" +
      "<p>STRIPE CUSTOMER PORTAL STAND-IN</p>" +
      "<h1>Manage Waypoint Ambient</h1>" +
      "<form method='post' action='/__stripe_test_portal/cancel'><input type='hidden' name='customer' value='" +
      escapeAttr(customer) +
      "'><button type='submit'>Cancel subscription</button></form></body></html>";
    return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
  }

  async function mockPortalCancel(request) {
    const form = await request.formData();
    const customerId = String(form.get("customer") || "");
    const account = await store.getAccountByCustomer(customerId);
    const subRow = account ? await store.getSubscription(account.id) : null;
    const sub = subRow && stripe.cancelSubscription ? stripe.cancelSubscription(subRow.stripe_subscription_id) : null;
    if (sub) {
      await applySignedMockEvent({
        id: "evt_mock_cancel_" + sub.id,
        type: "customer.subscription.deleted",
        data: { object: sub }
      });
    }
    const appOrigin = env.PUBLIC_APP_ORIGIN || "https://waypointstudio.org";
    return redirect(appOrigin + "/apps/dashboard/#/ambient?portal=canceled");
  }

  async function applySignedMockEvent(event) {
    const rec = await store.putWebhookEvent({
      stripe_event_id: event.id,
      type: event.type,
      processed_at: new Date().toISOString()
    });
    if (!rec.inserted) return;
    try {
      await applyStripeEvent(event);
    } catch (err) {
      await store.deleteWebhookEvent(event.id);
      throw err;
    }
  }

  function redirect(to) {
    return new Response(null, { status: 302, headers: { Location: to } });
  }

  return {
    handle: handle,
    loadSession: loadSession,
    applyStripeEvent: applyStripeEvent,
    signedWebhook: signedWebhook,
    isEntitledStatus: isEntitledStatus,
    COOKIE: COOKIE
  };
}
