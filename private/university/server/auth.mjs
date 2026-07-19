/**
 * Waypoint University — owner session helpers (Node crypto only).
 * scrypt password verify + HMAC-signed cookies. No custom crypto primitives.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const COOKIE = "wu_owner_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 14; // 14 days

export function loadEnvFile(envPath) {
  if (!fs.existsSync(envPath)) return {};
  const out = {};
  String(fs.readFileSync(envPath, "utf8"))
    .split(/\n/)
    .forEach((line) => {
      const t = line.trim();
      if (!t || t.startsWith("#")) return;
      const i = t.indexOf("=");
      if (i < 0) return;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      out[k] = v;
    });
  return out;
}

export function hashPassword(password, saltHex) {
  const salt = saltHex ? Buffer.from(saltHex, "hex") : crypto.randomBytes(16);
  const hash = crypto.scryptSync(String(password), salt, 64, { N: 16384, r: 8, p: 1 });
  return { salt: salt.toString("hex"), hash: hash.toString("hex") };
}

export function verifyPassword(password, saltHex, hashHex) {
  if (!password || !saltHex || !hashHex) return false;
  try {
    const salt = Buffer.from(saltHex, "hex");
    const expected = Buffer.from(hashHex, "hex");
    const actual = crypto.scryptSync(String(password), salt, expected.length, { N: 16384, r: 8, p: 1 });
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function createSessionToken(secret, ownerId) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const payload = Buffer.from(JSON.stringify({ sub: ownerId || "owner", exp }), "utf8").toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySessionToken(secret, token) {
  if (!secret || !token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payload, sig] = parts;
  const expect = crypto.createHmac("sha256", secret).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!data || !data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

export function parseCookies(header) {
  const out = Object.create(null);
  String(header || "")
    .split(";")
    .forEach((part) => {
      const i = part.indexOf("=");
      if (i < 0) return;
      const k = part.slice(0, i).trim();
      const v = part.slice(i + 1).trim();
      out[k] = decodeURIComponent(v);
    });
  return out;
}

export function sessionCookie(token, { secure = false } = {}) {
  const parts = [
    `${COOKIE}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${MAX_AGE_SEC}`
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie({ secure = false } = {}) {
  const parts = [`${COOKIE}=`, "Path=/", "HttpOnly", "SameSite=Strict", "Max-Age=0"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function csrfToken(secret) {
  return crypto.createHmac("sha256", secret).update("wu-csrf").digest("hex").slice(0, 32);
}

export function writeOwnerEnv(envPath, { password, ownerEmail }) {
  const { salt, hash } = hashPassword(password);
  const sessionSecret = crypto.randomBytes(32).toString("hex");
  const body = [
    "# Waypoint University — owner secrets (DO NOT COMMIT)",
    `# Created ${new Date().toISOString()}`,
    "WU_BIND=127.0.0.1",
    "WU_PORT=8787",
    `WU_OWNER_EMAIL=${ownerEmail || "owner@localhost"}`,
    `WU_PASSWORD_SALT=${salt}`,
    `WU_PASSWORD_HASH=${hash}`,
    `WU_SESSION_SECRET=${sessionSecret}`,
    "WU_SECURE_COOKIES=0",
    ""
  ].join("\n");
  fs.mkdirSync(path.dirname(envPath), { recursive: true });
  fs.writeFileSync(envPath, body, { mode: 0o600 });
  return envPath;
}

export { COOKIE, MAX_AGE_SEC };
