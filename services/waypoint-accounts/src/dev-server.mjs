#!/usr/bin/env node
/**
 * Local Node stand-in for the Cloudflare Worker (memory store + mock Stripe).
 * Used by CI and owner review when wrangler/D1/Stripe secrets are not present.
 */
import http from "node:http";
import { createApp } from "./app.mjs";
import { createMemoryStore } from "./store.mjs";
import { createStripeAdapter } from "./stripe.mjs";
import { createEmailAdapter } from "./email.mjs";

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || "127.0.0.1";

const env = {
  STRIPE_MODE: process.env.STRIPE_MODE || "mock",
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY || "",
  STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET || "whsec_mock_local",
  STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID || "price_ambient_test",
  SESSION_SECRET: process.env.SESSION_SECRET || "dev-session-secret-not-for-production",
  RESEND_API_KEY: process.env.RESEND_API_KEY || "",
  EMAIL_FROM: process.env.EMAIL_FROM || "Waypoint Ambient <ambient@waypointstudio.org>",
  ALLOWED_ORIGINS:
    process.env.ALLOWED_ORIGINS ||
    "http://127.0.0.1:8080,http://localhost:8080,http://127.0.0.1:8765,http://localhost:8765,https://waypointstudio.org",
  PUBLIC_APP_ORIGIN: process.env.PUBLIC_APP_ORIGIN || "http://127.0.0.1:8080",
  ACCOUNTS_ORIGIN: process.env.ACCOUNTS_ORIGIN || "http://" + HOST + ":" + PORT,
  COOKIE_SECURE: process.env.COOKIE_SECURE || "0",
  MAGIC_TTL_MS: process.env.MAGIC_TTL_MS || "",
  SESSION_TTL_MS: process.env.SESSION_TTL_MS || ""
};

const store = createMemoryStore();
const stripe = createStripeAdapter(env);
const email = createEmailAdapter(env);
const app = createApp({ env: env, store: store, stripe: stripe, email: email });

function collectBody(req) {
  return new Promise(function (resolve, reject) {
    const chunks = [];
    req.on("data", function (c) {
      chunks.push(c);
    });
    req.on("end", function () {
      resolve(Buffer.concat(chunks));
    });
    req.on("error", reject);
  });
}

async function toFetchRequest(req) {
  const host = req.headers.host || HOST + ":" + PORT;
  const url = "http://" + host + req.url;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : String(value));
  }
  const init = { method: req.method, headers: headers };
  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await collectBody(req);
    init.duplex = "half";
  }
  return new Request(url, init);
}

const server = http.createServer(function (req, res) {
  toFetchRequest(req)
    .then(function (request) {
      return app.handle(request);
    })
    .then(async function (response) {
      const headers = {};
      const cookies = [];
      response.headers.forEach(function (value, key) {
        if (key.toLowerCase() === "set-cookie") cookies.push(value);
        else headers[key] = value;
      });
      if (cookies.length === 1) headers["Set-Cookie"] = cookies[0];
      if (cookies.length > 1) headers["Set-Cookie"] = cookies;
      const buf = Buffer.from(await response.arrayBuffer());
      res.writeHead(response.status, headers);
      res.end(buf);
    })
    .catch(function (err) {
      res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "server_error" }));
      void err;
    });
});

server.listen(PORT, HOST, function () {
  console.log("waypoint-accounts mock listening on http://" + HOST + ":" + PORT);
  console.log("stripe adapter:", stripe.kind, "liveBilling: false");
});
