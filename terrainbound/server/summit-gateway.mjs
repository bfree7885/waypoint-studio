/**
 * Production Summit gateway (Web Fetch API).
 * Groq credential stays in env. Student utterances are not logged.
 *
 * Routes:
 *   GET  /health
 *   POST /summit
 *   POST /summit-ai   (local/compat)
 */

export const PRODUCTION_ORIGINS = Object.freeze([
  "https://terrainbound.org",
  "https://www.terrainbound.org"
]);

export const FIELDTEST_MODEL = "openai/gpt-oss-20b";
export const MAX_BODY_BYTES = 8192;
export const MAX_PROMPT_CHARS = 6000;
export const MAX_QUESTION_CHARS = 240;
export const MAX_RECENT_TURNS = 4;
export const MAX_TURN_CHARS = 220;
export const MAX_EXPLANATION_CHARS = 800;
export const RATE_WINDOW_MS = 60_000;
export const RATE_MAX = 12;
export const BURST_WINDOW_MS = 10_000;
export const BURST_MAX = 4;

export const SUMMIT_REPLY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    explanation: { type: "string" },
    followUpQuestion: { type: "string" },
    concept: { type: "string" },
    supportLevel: { type: "number" },
    offTopic: { type: "boolean" }
  },
  required: ["explanation", "followUpQuestion", "concept", "supportLevel", "offTopic"]
};

const FORBIDDEN_INBOUND = /email|school|studentName|fullName|fingerprint|deviceId|ipAddress|latitude|longitude/i;

export function createRateLimiter({
  windowMs = RATE_WINDOW_MS,
  max = RATE_MAX,
  burstWindowMs = BURST_WINDOW_MS,
  burstMax = BURST_MAX
} = {}) {
  const hits = new Map();
  return {
    allow(id, now = Date.now()) {
      const key = String(id || "anon");
      let row = hits.get(key);
      if (!row) {
        row = { windowStart: now, count: 0, burstStart: now, burstCount: 0 };
        hits.set(key, row);
      }
      if (now - row.windowStart >= windowMs) {
        row.windowStart = now;
        row.count = 0;
      }
      if (now - row.burstStart >= burstWindowMs) {
        row.burstStart = now;
        row.burstCount = 0;
      }
      row.count += 1;
      row.burstCount += 1;
      if (row.burstCount > burstMax || row.count > max) {
        const retryAfter = Math.ceil(Math.max(windowMs - (now - row.windowStart), burstWindowMs - (now - row.burstStart), 1000) / 1000);
        return { ok: false, retryAfter };
      }
      return { ok: true, remaining: Math.max(0, max - row.count) };
    },
    size() {
      return hits.size;
    }
  };
}

const defaultLimiter = createRateLimiter();

export function allowOrigin(origin, { allowLocal = false } = {}) {
  const value = String(origin || "");
  if (PRODUCTION_ORIGINS.includes(value)) return value;
  if (allowLocal && /^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(value)) return value;
  return "";
}

export function corsHeaders(origin, extra = {}) {
  const headers = {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    vary: "Origin",
    ...extra
  };
  if (origin) {
    headers["access-control-allow-origin"] = origin;
    headers["access-control-allow-headers"] = "content-type";
    headers["access-control-allow-methods"] = "GET, POST, OPTIONS";
    headers["access-control-max-age"] = "600";
  }
  return headers;
}

function jsonResponse(status, body, origin, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(origin, extraHeaders)
  });
}

export function compactPacket(packet) {
  const src = packet && typeof packet === "object" ? packet : {};
  const facts = src.facts && typeof src.facts === "object" ? src.facts : {};
  const tutoring = src.tutoring && typeof src.tutoring === "object" ? src.tutoring : {};
  const recent = Array.isArray(src.recent) ? src.recent : [];
  return {
    facts: {
      region: String(facts.region || "").slice(0, 40),
      puzzle: String(facts.puzzle || "").slice(0, 80),
      stage: String(facts.stage || "").slice(0, 40),
      near: Array.isArray(facts.near) ? facts.near.slice(0, 3).map((row) => String(row).slice(0, 40)) : [],
      inspectedHighLook: Boolean(facts.inspectedHighLook),
      fairTrialCount: Number(facts.fairTrialCount) || 0,
      measurements: Array.isArray(facts.measurements)
        ? facts.measurements.slice(0, 6).map((row) => ({
            slope: String(row?.slope || "").slice(0, 16),
            seconds: Number(row?.seconds),
            water: String(row?.water || "one-cup").slice(0, 16)
          }))
        : [],
      numbers: Array.isArray(facts.numbers) ? facts.numbers.slice(0, 6).map((n) => Number(n)).filter(Number.isFinite) : [],
      clearance: Boolean(facts.clearance),
      supportLevel: Number(facts.supportLevel) || 0,
      known: Array.isArray(facts.known) ? facts.known.slice(0, 8).map((row) => String(row).slice(0, 160)) : [],
      expected: Array.isArray(facts.expected) ? facts.expected.slice(0, 8).map((row) => String(row).slice(0, 160)) : [],
      unknown: Array.isArray(facts.unknown) ? facts.unknown.slice(0, 8).map((row) => String(row).slice(0, 160)) : [],
      science: Array.isArray(facts.science) ? facts.science.slice(0, 8).map((row) => String(row).slice(0, 160)) : [],
      comparisonReady: Boolean(facts.comparisonStatus?.comparisonReady || facts.comparisonReady),
      comparisonStatus: facts.comparisonStatus
        ? {
            comparisonReady: Boolean(facts.comparisonStatus.comparisonReady),
            steepMeasured: Boolean(facts.comparisonStatus.steepMeasured),
            gentleMeasured: Boolean(facts.comparisonStatus.gentleMeasured)
          }
        : undefined
    },
    tutoring: {
      allowedLevel: Number(tutoring.allowedLevel) || 0,
      ladder: String(tutoring.ladder || "").slice(0, 24),
      doNotRevealCards: true,
      doNotGrantClearance: true
    },
    recent: recent.slice(-MAX_RECENT_TURNS).map((row) => ({
      role: row?.role === "student" ? "student" : "summit",
      text: String(row?.text || "").slice(0, MAX_TURN_CHARS)
    }))
  };
}

export function sanitizeInbound(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  if (FORBIDDEN_INBOUND.test(JSON.stringify(Object.keys(src)))) {
    /* still drop those keys below */
  }
  return {
    prompt: String(src.prompt || "").slice(0, MAX_PROMPT_CHARS),
    question: String(src.question || src.action || "").slice(0, MAX_QUESTION_CHARS),
    packet: compactPacket(src.packet)
  };
}

export function coerceJson(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : raw;
  try {
    const parsed = JSON.parse(candidate);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

function replyText(parsed) {
  if (!parsed || typeof parsed !== "object") return "";
  const candidates = [parsed.explanation, parsed.response, parsed.answer, parsed.text];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function normalizeReply(parsed) {
  if (!parsed || typeof parsed !== "object") return parsed;
  const explanation = replyText(parsed).slice(0, MAX_EXPLANATION_CHARS);
  if (explanation) {
    return {
      explanation,
      response: explanation,
      followUpQuestion: String(parsed.followUpQuestion || "").slice(0, 180),
      concept: String(parsed.concept || "").slice(0, 40),
      supportLevel: Number(parsed.supportLevel) || 0,
      offTopic: Boolean(parsed.offTopic)
    };
  }
  return parsed;
}

export function upstreamBody(payload, mode = "json_schema", env = {}) {
  const model = env.SUMMIT_AI_MODEL || FIELDTEST_MODEL;
  const body = {
    model,
    temperature: 0.2,
    max_tokens: Number(env.SUMMIT_MAX_TOKENS || 120),
    messages: [
      { role: "system", content: String(payload.prompt || "") },
      { role: "user", content: String(payload.question || "") }
    ]
  };
  if (mode === "json_schema") {
    body.response_format = {
      type: "json_schema",
      json_schema: { name: "summit_reply", schema: SUMMIT_REPLY_SCHEMA, strict: true }
    };
  } else if (mode === "json_object") {
    body.response_format = { type: "json_object" };
  }
  const id = String(model).toLowerCase();
  if (id.includes("gpt-oss")) {
    body.reasoning_effort = env.SUMMIT_REASONING_EFFORT || "low";
    body.include_reasoning = false;
  }
  return body;
}

function parseUpstream(data) {
  const text =
    data?.choices?.[0]?.message?.content ||
    data?.response ||
    data?.message?.content ||
    data?.error?.failed_generation ||
    "";
  return normalizeReply(coerceJson(text));
}

async function clientKey(request) {
  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local";
  try {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
  } catch {
    return "local";
  }
}

function opsLog(log, row) {
  if (typeof log !== "function") return;
  log(
    JSON.stringify({
      ts: new Date().toISOString(),
      ...row
    })
  );
}

function pathOf(request) {
  try {
    return new URL(request.url).pathname;
  } catch {
    return "";
  }
}

async function callUpstream(payload, mode, env, fetchImpl, timeoutMs, signal) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  const onClient = () => ctrl.abort();
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener("abort", onClient, { once: true });
  }
  try {
    const res = await fetchImpl(env.SUMMIT_AI_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.SUMMIT_API_KEY}`
      },
      body: JSON.stringify(upstreamBody(payload, mode, env)),
      signal: ctrl.signal
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    if (err?.name === "AbortError") {
      return { ok: false, status: 504, data: { error: "upstream-timeout" } };
    }
    throw err;
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener("abort", onClient);
  }
}

export async function handleSummitRequest(request, env = {}, opts = {}) {
  const allowLocal = Boolean(opts.allowLocal) || env.SUMMIT_ALLOW_LOCAL === "1";
  const origin = allowOrigin(request.headers.get("origin") || "", { allowLocal });
  const limiter = opts.limiter || defaultLimiter;
  const fetchImpl = opts.fetchImpl || fetch;
  const log = opts.log;
  const started = Date.now();
  const path = pathOf(request);
  const method = request.method || "GET";

  if (method === "OPTIONS") {
    if (!origin && request.headers.get("origin")) {
      return jsonResponse(403, { error: "forbidden" }, "");
    }
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (method === "GET" && (path === "/health" || path === "/summit/health" || path === "/summit-ai/health")) {
    const configured = Boolean(env.SUMMIT_API_KEY && env.SUMMIT_AI_URL);
    return jsonResponse(configured ? 200 : 503, { ok: configured, configured }, origin);
  }

  const postPath = path === "/summit" || path === "/summit-ai";
  if (method !== "POST" || !postPath) {
    return jsonResponse(404, { error: "not-found" }, origin);
  }

  if (!origin && request.headers.get("origin")) {
    opsLog(log, { event: "cors-deny", status: 403, latencyMs: Date.now() - started });
    return jsonResponse(403, { error: "forbidden" }, "");
  }

  if (!env.SUMMIT_API_KEY || !env.SUMMIT_AI_URL) {
    return jsonResponse(503, { error: "unavailable" }, origin);
  }

  const key = await clientKey(request);
  const budget = limiter.allow(key, opts.now ? opts.now() : Date.now());
  if (!budget.ok) {
    opsLog(log, { event: "rate-limit", status: 429, latencyMs: Date.now() - started });
    return jsonResponse(429, { error: "rate-limit" }, origin, {
      "retry-after": String(budget.retryAfter || 30)
    });
  }

  const rawText = await request.text();
  if (new TextEncoder().encode(rawText).length > MAX_BODY_BYTES) {
    opsLog(log, { event: "oversized", status: 413, latencyMs: Date.now() - started });
    return jsonResponse(413, { error: "unavailable" }, origin);
  }

  let raw;
  try {
    raw = JSON.parse(rawText);
  } catch {
    opsLog(log, { event: "malformed", status: 400, latencyMs: Date.now() - started });
    return jsonResponse(400, { error: "unavailable" }, origin);
  }

  const payload = sanitizeInbound(raw);
  if (!payload.prompt && !payload.question) {
    return jsonResponse(400, { error: "unavailable" }, origin);
  }

  const timeoutMs = Number(env.SUMMIT_UPSTREAM_TIMEOUT_MS || 4000);
  const budgetMs = Number(env.SUMMIT_MODE_BUDGET_MS || 4500);
  try {
    let retried = false;
    let upstream = await callUpstream(payload, "json_schema", env, fetchImpl, timeoutMs, request.signal);
    let parsed = parseUpstream(upstream.data);
    const remaining = () => budgetMs - (Date.now() - started);
    if (
      remaining() > 800 &&
      (!upstream.ok || !parsed || !replyText(parsed)) &&
      upstream.status !== 429 &&
      upstream.status !== 504
    ) {
      retried = true;
      upstream = await callUpstream(payload, "json_object", env, fetchImpl, timeoutMs, request.signal);
      parsed = parseUpstream(upstream.data);
    }
    const latencyMs = Date.now() - started;
    if (upstream.status === 429) {
      opsLog(log, { event: "upstream-429", status: 429, latencyMs, retried });
      return jsonResponse(429, { error: "rate-limit" }, origin);
    }
    if (!upstream.ok) {
      const timeout = upstream.status === 504;
      opsLog(log, { event: timeout ? "timeout" : "upstream", status: timeout ? 504 : 502, latencyMs, retried });
      return jsonResponse(timeout ? 504 : 502, { error: timeout ? "timeout" : "unavailable" }, origin);
    }
    if (!parsed || !replyText(parsed)) {
      opsLog(log, { event: "malformed-model", status: 502, latencyMs, retried });
      return jsonResponse(502, { error: "unavailable" }, origin);
    }
    const usage = upstream.data.usage || {};
    opsLog(log, {
      event: "ok",
      status: 200,
      latencyMs,
      retried,
      promptTokens: usage.prompt_tokens || usage.input_tokens || 0,
      completionTokens: usage.completion_tokens || usage.output_tokens || 0
    });
    return jsonResponse(
      200,
      {
        ...parsed,
        usage: {
          promptTokens: usage.prompt_tokens || usage.input_tokens || 0,
          completionTokens: usage.completion_tokens || usage.output_tokens || 0,
          totalTokens: usage.total_tokens || 0,
          latencyMs,
          retried
        }
      },
      origin
    );
  } catch (err) {
    const timeout = err?.name === "AbortError";
    opsLog(log, { event: timeout ? "timeout" : "throw", status: 502, latencyMs: Date.now() - started });
    return jsonResponse(502, { error: timeout ? "timeout" : "unavailable" }, origin);
  }
}

export default {
  async fetch(request, env) {
    return handleSummitRequest(request, env, { allowLocal: env?.SUMMIT_ALLOW_LOCAL === "1" });
  }
};
