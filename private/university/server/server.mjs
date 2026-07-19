#!/usr/bin/env node
/**
 * Waypoint University — private owner server (Module 5).
 * Loopback-only by default. Session cookie auth. Serves Scholar static assets.
 *
 * Usage:
 *   node server.mjs setup
 *   node server.mjs
 *
 * Env: see .env.example (loaded from server/.env — never commit).
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline";
import {
  loadEnvFile,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  parseCookies,
  sessionCookie,
  clearSessionCookie,
  csrfToken,
  writeOwnerEnv,
  COOKIE
} from "./auth.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, ".."); // private/university
const ENV_PATH = path.join(__dirname, ".env");
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".md": "text/markdown; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

const rate = new Map(); // ip -> { n, reset }

function applyEnv(fileEnv) {
  for (const [k, v] of Object.entries(fileEnv)) {
    if (process.env[k] == null) process.env[k] = v;
  }
}

function cfg() {
  return {
    bind: process.env.WU_BIND || "127.0.0.1",
    port: Number(process.env.WU_PORT || 8787),
    email: process.env.WU_OWNER_EMAIL || "owner@localhost",
    salt: process.env.WU_PASSWORD_SALT || "",
    hash: process.env.WU_PASSWORD_HASH || "",
    secret: process.env.WU_SESSION_SECRET || "",
    secure: process.env.WU_SECURE_COOKIES === "1"
  };
}

function allowRate(ip) {
  const now = Date.now();
  let row = rate.get(ip);
  if (!row || now > row.reset) {
    row = { n: 0, reset: now + 60_000 };
    rate.set(ip, row);
  }
  row.n += 1;
  return row.n <= 30; // 30 req/min per IP for auth endpoints
}

function send(res, code, body, headers = {}) {
  const buf = Buffer.from(body == null ? "" : body);
  res.writeHead(code, {
    "Content-Length": buf.length,
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "X-Frame-Options": "DENY",
    "Cache-Control": "no-store",
    ...headers
  });
  res.end(buf);
}

function loginPage(c, { error = "", email = "" } = {}) {
  const csrf = csrfToken(c.secret);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="robots" content="noindex, nofollow, noarchive"/>
  <title>Sign in · Waypoint University</title>
  <style>
    :root { color-scheme: light; --ink:#1c1f1d; --muted:#5c6560; --line:#d7ddd8; --bg:#f6f7f5; --accent:#2f5c48; }
    body { margin:0; min-height:100vh; display:grid; place-items:center; font-family:"IBM Plex Sans", system-ui, sans-serif; background:linear-gradient(160deg,#eef2ef,#f8f7f4 50%,#e8ece9); color:var(--ink); }
    .card { width:min(24rem,92vw); background:#fff; border:1px solid var(--line); border-radius:12px; padding:1.5rem 1.4rem 1.25rem; box-shadow:0 10px 30px rgba(28,31,29,.06); }
    h1 { font-family: Georgia, "Source Serif 4", serif; font-size:1.55rem; margin:0 0 .35rem; font-weight:600; }
    p { margin:.35rem 0 1rem; color:var(--muted); line-height:1.45; font-size:.95rem; }
    label { display:block; font-size:.85rem; margin:.7rem 0 .3rem; color:var(--muted); }
    input { width:100%; box-sizing:border-box; padding:.65rem .7rem; border:1px solid var(--line); border-radius:8px; font:inherit; }
    button { margin-top:1rem; width:100%; border:0; border-radius:8px; padding:.7rem 1rem; background:var(--accent); color:#fff; font:inherit; font-weight:600; cursor:pointer; }
    .err { color:#8b2e2e; background:#f8eaea; border:1px solid #e7c6c6; padding:.55rem .7rem; border-radius:8px; font-size:.9rem; }
    .foot { margin-top:1rem; font-size:.78rem; color:var(--muted); }
  </style>
</head>
<body>
  <main class="card">
    <h1>Waypoint University</h1>
    <p>Private research environment — owner sign-in only. No public registration.</p>
    ${error ? `<p class="err" role="alert">${error}</p>` : ""}
    <form method="post" action="/login" autocomplete="username">
      <input type="hidden" name="csrf" value="${csrf}"/>
      <label for="email">Owner email</label>
      <input id="email" name="email" type="email" required value="${email || c.email}" autocomplete="username"/>
      <label for="password">Password</label>
      <input id="password" name="password" type="password" required autocomplete="current-password"/>
      <button type="submit">Sign in</button>
    </form>
    <p class="foot">Bound to this machine. Data stays in your browser IndexedDB after sign-in. See ACCESS.md for recovery.</p>
  </main>
</body>
</html>`;
}

function safeJoin(root, reqPath) {
  const decoded = decodeURIComponent((reqPath || "/").split("?")[0]);
  let rel = decoded.replace(/^\/+/, "");
  if (!rel || rel.endsWith("/")) rel += "index.html";
  const full = path.normalize(path.join(root, rel));
  if (!full.startsWith(root + path.sep) && full !== root) return null;
  // Never serve server secrets
  if (full.includes(`${path.sep}server${path.sep}`) && path.basename(full) === ".env") return null;
  if (full.endsWith(`${path.sep}server${path.sep}.env`)) return null;
  return full;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on("data", (c) => {
      size += c.length;
      if (size > 64_000) {
        reject(new Error("body too large"));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function parseForm(raw) {
  const out = Object.create(null);
  String(raw || "")
    .split("&")
    .forEach((pair) => {
      const i = pair.indexOf("=");
      if (i < 0) return;
      const k = decodeURIComponent(pair.slice(0, i).replace(/\+/g, " "));
      const v = decodeURIComponent(pair.slice(i + 1).replace(/\+/g, " "));
      out[k] = v;
    });
  return out;
}

function isAuthed(req, c) {
  const cookies = parseCookies(req.headers.cookie);
  return !!verifySessionToken(c.secret, cookies[COOKIE]);
}

async function handle(req, res) {
  const c = cfg();
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const ip = req.socket.remoteAddress || "local";

  if (!c.secret || !c.hash || !c.salt) {
    send(
      res,
      503,
      "Owner credentials not configured. Run: node server.mjs setup\n",
      { "Content-Type": "text/plain; charset=utf-8" }
    );
    return;
  }

  if (url.pathname === "/login" && req.method === "GET") {
    if (isAuthed(req, c)) {
      res.writeHead(302, { Location: "/" });
      res.end();
      return;
    }
    send(res, 200, loginPage(c), { "Content-Type": "text/html; charset=utf-8" });
    return;
  }

  if (url.pathname === "/login" && req.method === "POST") {
    if (!allowRate(ip)) {
      send(res, 429, loginPage(c, { error: "Too many attempts. Wait a minute." }), {
        "Content-Type": "text/html; charset=utf-8"
      });
      return;
    }
    let form;
    try {
      form = parseForm(await readBody(req));
    } catch {
      send(res, 400, loginPage(c, { error: "Invalid request." }), {
        "Content-Type": "text/html; charset=utf-8"
      });
      return;
    }
    if (form.csrf !== csrfToken(c.secret)) {
      send(res, 403, loginPage(c, { error: "Security token mismatch. Reload and try again." }), {
        "Content-Type": "text/html; charset=utf-8"
      });
      return;
    }
    const emailOk = String(form.email || "").trim().toLowerCase() === String(c.email).trim().toLowerCase();
    const passOk = verifyPassword(form.password, c.salt, c.hash);
    if (!emailOk || !passOk) {
      // constant-ish delay
      await new Promise((r) => setTimeout(r, 250));
      send(res, 401, loginPage(c, { error: "Sign-in failed.", email: form.email || "" }), {
        "Content-Type": "text/html; charset=utf-8"
      });
      return;
    }
    const token = createSessionToken(c.secret, "owner");
    res.writeHead(302, {
      Location: "/",
      "Set-Cookie": sessionCookie(token, { secure: c.secure })
    });
    res.end();
    return;
  }

  if (url.pathname === "/logout") {
    res.writeHead(302, {
      Location: "/login",
      "Set-Cookie": clearSessionCookie({ secure: c.secure })
    });
    res.end();
    return;
  }

  if (url.pathname === "/healthz") {
    send(res, 200, JSON.stringify({ ok: true, service: "waypoint-university", authed: isAuthed(req, c) }), {
      "Content-Type": "application/json; charset=utf-8"
    });
    return;
  }

  if (!isAuthed(req, c)) {
    res.writeHead(302, { Location: "/login" });
    res.end();
    return;
  }

  // Block direct access to server secrets even when authed
  if (url.pathname.startsWith("/server/") && url.pathname.includes(".env")) {
    send(res, 404, "Not found\n", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }

  const filePath = safeJoin(ROOT, url.pathname);
  if (!filePath) {
    send(res, 400, "Bad path\n", { "Content-Type": "text/plain; charset=utf-8" });
    return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      send(res, 404, "Not found\n", { "Content-Type": "text/plain; charset=utf-8" });
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    send(res, 200, data, {
      "Content-Type": MIME[ext] || "application/octet-stream",
      "Cache-Control": ext === ".html" ? "no-store" : "private, max-age=120"
    });
  });
}

async function setup() {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) =>
    new Promise((resolve) => {
      rl.question(q, resolve);
    });
  console.log("Waypoint University — owner credential setup");
  console.log("Credentials are stored only in private/university/server/.env (gitignored).\n");
  const email = (await ask("Owner email [owner@localhost]: ")).trim() || "owner@localhost";
  const pass = await ask("Owner password (min 12 chars): ");
  const pass2 = await ask("Confirm password: ");
  rl.close();
  if (pass !== pass2) {
    console.error("Passwords do not match.");
    process.exit(1);
  }
  if (String(pass).length < 12) {
    console.error("Use at least 12 characters.");
    process.exit(1);
  }
  writeOwnerEnv(ENV_PATH, { password: pass, ownerEmail: email });
  console.log(`\nWrote ${ENV_PATH}`);
  console.log("Start with:  ./start.sh");
  console.log("Then open:   http://127.0.0.1:8787/");
}

function main() {
  applyEnv(loadEnvFile(ENV_PATH));
  if (process.argv[2] === "setup") {
    setup().catch((e) => {
      console.error(e);
      process.exit(1);
    });
    return;
  }
  const c = cfg();
  if (!c.hash || !c.salt || !c.secret) {
    console.error("Missing owner credentials.");
    console.error("Run: node server.mjs setup");
    process.exit(1);
  }
  if (c.bind !== "127.0.0.1" && c.bind !== "localhost" && c.bind !== "::1") {
    console.warn("WARNING: Binding beyond loopback. Ensure firewall + TLS. Not recommended without reverse proxy.");
  }
  const server = http.createServer((req, res) => {
    handle(req, res).catch((err) => {
      console.error(err);
      send(res, 500, "Server error\n", { "Content-Type": "text/plain; charset=utf-8" });
    });
  });
  server.listen(c.port, c.bind, () => {
    console.log(`Waypoint University (private) listening on http://${c.bind}:${c.port}/`);
    console.log("Sign in with your owner email/password. Ctrl+C to stop.");
  });
}

main();
