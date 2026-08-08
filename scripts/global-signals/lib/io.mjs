/** Shared filesystem helpers for Global Signals live-data pipelines. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(__dirname, "../../..");

export function nowIso() {
  return new Date().toISOString();
}

export function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

export function readJson(file, fallback = null) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function writeJson(file, obj) {
  ensureDir(path.dirname(file));
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify(obj, null, 2)}\n`, "utf8");
  fs.renameSync(tmp, file);
}

export function contentHash(parts) {
  const s = Array.isArray(parts) ? parts.join("|") : String(parts || "");
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export const USER_AGENT =
  "WaypointStudio-GlobalSignals/1.0 (+https://waypointstudio.org/side-trails/global-signals/; respectful public-data ingest; no scraping of prohibited sites)";

export async function fetchText(url, { timeoutMs = 20000, accept } = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        Accept: accept || "application/json, application/xml, text/xml, application/rss+xml, */*",
        "User-Agent": USER_AGENT
      }
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text, url: res.url || url };
  } finally {
    clearTimeout(t);
  }
}

export async function fetchJson(url, opts = {}) {
  const res = await fetchText(url, { ...opts, accept: "application/json, */*" });
  if (!res.ok) return { ...res, json: null };
  try {
    return { ...res, json: JSON.parse(res.text) };
  } catch {
    return { ...res, ok: false, json: null, parseError: true };
  }
}
