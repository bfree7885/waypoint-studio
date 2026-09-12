#!/usr/bin/env node
/**
 * Summit AI proxy. Keys stay on the server. Browser talks only to this loopback API.
 *
 *   SUMMIT_API_KEY=... SUMMIT_AI_URL=... SUMMIT_AI_MODEL=... node terrainbound/server/summit-proxy.mjs
 *
 * OpenAI-compatible upstream (Groq, OpenAI, Ollama /v1/chat/completions).
 * Default: unconfigured — the game stays fully playable without this process.
 *
 * Dev-only logging: SUMMIT_DEBUG=1 writes redacted meta (not student prose) to
 * terrainbound/server/.summit-debug.log  (gitignored).
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.SUMMIT_PROXY_PORT || 8787);
const UPSTREAM = process.env.SUMMIT_AI_URL || "";
const KEY = process.env.SUMMIT_API_KEY || "";
const MODEL = process.env.SUMMIT_AI_MODEL || "llama-3.1-8b-instant";
const DEBUG = process.env.SUMMIT_DEBUG === "1";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)));
const DEBUG_LOG = path.join(ROOT, ".summit-debug.log");

export const SUMMIT_REPLY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    response: { type: "string" },
    concept: { type: "string" },
    referencedEvidence: { type: "array", items: { type: "string" } },
    suggestedAction: { type: "string" },
    supportLevel: { type: "number" },
    offTopic: { type: "boolean" },
    agreesWithStudentPremise: { type: "boolean" }
  },
  required: [
    "response",
    "concept",
    "referencedEvidence",
    "suggestedAction",
    "supportLevel",
    "offTopic",
    "agreesWithStudentPremise"
  ]
};

const server = http.createServer(async (req, res) => {
  const origin = String(req.headers.origin || "");
  if (/^http:\/\/127\.0\.0\.1:\d+$/.test(origin) || /^http:\/\/localhost:\d+$/.test(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Headers", "content-type");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.method === "GET" && (req.url === "/health" || req.url === "/summit-ai/health")) {
    json(res, KEY && UPSTREAM ? 200 : 503, {
      ok: Boolean(KEY && UPSTREAM),
      model: MODEL,
      configured: Boolean(KEY && UPSTREAM)
    });
    return;
  }
  if (req.method !== "POST" || req.url !== "/summit-ai") {
    json(res, 404, { error: "not-found" });
    return;
  }
  if (!KEY || !UPSTREAM) {
    json(res, 503, { error: "unconfigured" });
    return;
  }
  const body = await readBody(req);
  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    json(res, 400, { error: "malformed" });
    return;
  }
  const started = Date.now();
  try {
    let retried = false;
    let upstream = await callUpstream(payload, "json_schema");
    let parsed = parseUpstream(upstream);
    if ((!upstream.ok || !parsed || !String(parsed.response || "").trim()) && upstream.status !== 429) {
      retried = true;
      upstream = await callUpstream(
        {
          ...payload,
          question: `${payload.question || ""}\n\nWrite a 1-3 sentence tutoring reply in JSON field "response". Never leave it empty.`
        },
        "json_object"
      );
      parsed = parseUpstream(upstream);
    }
    if ((!upstream.ok || !parsed || !String(parsed.response || "").trim()) && upstream.status !== 429) {
      retried = true;
      upstream = await callUpstream(payload, "plain");
      parsed = parseUpstream(upstream);
    }
    const data = upstream.data;
    const latencyMs = Date.now() - started;
    if (upstream.status === 429) {
      debug({ event: "rate-limit", latencyMs, status: 429 });
      json(res, 429, { error: "rate-limit" });
      return;
    }
    if (!upstream.ok) {
      debug({ event: "upstream-http", latencyMs, status: upstream.status });
      json(res, 502, { error: "upstream" });
      return;
    }
    if (!parsed || !String(parsed.response || "").trim()) {
      debug({ event: "malformed-model", latencyMs, model: MODEL });
      json(res, 502, { error: "malformed" });
      return;
    }
    const usage = data.usage || {
      prompt_tokens: data.prompt_eval_count || 0,
      completion_tokens: data.eval_count || 0,
      total_tokens: (data.prompt_eval_count || 0) + (data.eval_count || 0)
    };
    debug({
      event: "ok",
      latencyMs,
      model: data.model || MODEL,
      promptTokens: usage.prompt_tokens || usage.input_tokens || 0,
      completionTokens: usage.completion_tokens || usage.output_tokens || 0,
      promptChars: String(payload.prompt || "").length,
      questionChars: String(payload.question || "").length
    });
    json(res, 200, {
      ...parsed,
      usage: {
        promptTokens: usage.prompt_tokens || usage.input_tokens || 0,
        completionTokens: usage.completion_tokens || usage.output_tokens || 0,
        totalTokens: usage.total_tokens || 0,
        latencyMs,
        model: data.model || MODEL,
        retried
      }
    });
  } catch {
    debug({ event: "upstream-throw", latencyMs: Date.now() - started });
    json(res, 502, { error: "upstream" });
  }
});

export function upstreamBody(payload, mode = "json_schema") {
  const body = {
    model: MODEL,
    temperature: 0.2,
    max_tokens: Number(process.env.SUMMIT_MAX_TOKENS || 400),
    messages: [
      { role: "system", content: String(payload.prompt || "") },
      { role: "user", content: String(payload.question || payload.action || "") }
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
  const id = String(MODEL).toLowerCase();
  if (id.includes("qwen")) {
    body.reasoning_effort = "none";
    if (body.response_format) body.reasoning_format = "hidden";
  } else if (id.includes("gpt-oss")) {
    body.reasoning_effort = process.env.SUMMIT_REASONING_EFFORT || "low";
    body.include_reasoning = false;
  }
  return body;
}

function parseUpstream(upstream) {
  const data = upstream?.data || {};
  const text =
    data.choices?.[0]?.message?.content ||
    data.response ||
    data.message?.content ||
    data.error?.failed_generation ||
    "";
  return normalizeReply(coerceJson(text));
}

function normalizeReply(parsed) {
  if (!parsed || typeof parsed !== "object") return parsed;
  if (typeof parsed.response === "string" && parsed.response.trim()) {
    return { ...parsed, response: parsed.response.trim() };
  }
  const alt = parsed.message || parsed.text || parsed.answer || parsed.content;
  if (typeof alt === "string" && alt.trim()) {
    return { ...parsed, response: alt.trim() };
  }
  return parsed;
}

async function callUpstream(payload, mode) {
  const res = await fetch(UPSTREAM, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${KEY}`
    },
    body: JSON.stringify(upstreamBody(payload, mode))
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
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

function json(res, status, obj) {
  res.writeHead(status, { "content-type": "application/json" });
  res.end(JSON.stringify(obj));
}

function debug(row) {
  if (!DEBUG) return;
  try {
    fs.appendFileSync(DEBUG_LOG, JSON.stringify({ ts: new Date().toISOString(), ...row }) + "\n");
  } catch {
    /* ignore */
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  server.listen(PORT, "127.0.0.1", () => {
    console.log(`Summit proxy on 127.0.0.1:${PORT} (configured=${Boolean(KEY && UPSTREAM)} model=${MODEL})`);
  });
}

export { server };
