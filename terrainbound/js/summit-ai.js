/**
 * AIProvider. The model writes Earth Science language. TerrainBound owns facts and actions.
 * No API keys here. A remote adapter must talk to a server-side proxy.
 */

import { selectSummitPacket } from "./summit-packet.js";
import { validateSummitOutput } from "./summit-validate.js";
import { composeStudentVisible } from "./summit-compose.js";
import { SUMMIT_VOICE_SPEC } from "./summit-character.js";
import { toGatewayBody } from "./summit-runtime.js";

export const SUMMIT_MODEL_REQUIREMENTS = {
  inexpensive: true,
  lowLatency: true,
  structuredOutput: true,
  instructionalLanguage: true,
  basicEarthScience: true,
  shortContext: true
};

export function buildSummitPrompt(packet, request) {
  const facts = packet.facts || {};
  const tutoring = packet.tutoring || {};
  const recent = (packet.recent || [])
    .map((row) => `${row.role === "student" ? "Student" : "Summit"}: ${row.text}`)
    .join("\n");
  return [
    ...SUMMIT_VOICE_SPEC,
    "Write 1-2 short sentences that explain science. Do not give game instructions.",
    "Stay on slope, gravity, runoff speed, and fair tests unless the student asks a related Earth Science question.",
    "Do not wander into seepage, glaciers, or other regions.",
    "Do not mention buttons, clicks, taps, cards to pin, walking destinations, Wren permission, or starting trials.",
    "Do not invent measurements, visits, rainfall, water-level changes, or clearance.",
    "Use KNOWN for measured facts, EXPECTED_BY_SCIENCE for predictions, UNKNOWN for what this experiment has not tested.",
    "Do not treat two steep trials as steep versus gentle.",
    "Do not explain steepness as a longer path.",
    "If comparisonReady is false, do not say the experiment already showed steep is faster than gentle.",
    "Steeper slopes tend to make runoff faster, not slower — as science, not as a logged result unless comparisonReady is true.",
    `Support level ${tutoring.allowedLevel} (${tutoring.ladder}). Stay at or below that level.`,
    `Puzzle: ${facts.puzzle}. Stage: ${facts.stage || "field work"}.`,
    `KNOWN (measured):\n- ${(facts.known || []).join("\n- ") || "none"}`,
    `EXPECTED_BY_SCIENCE (not a result from this log unless comparisonReady):\n- ${(facts.expected || []).join("\n- ") || "none"}`,
    `UNKNOWN:\n- ${(facts.unknown || facts.doNotClaim || []).join("\n- ")}`,
    `SCIENCE YOU MAY TEACH:\n- ${(facts.science || []).join("\n- ")}`,
    `comparisonReady: ${facts.comparisonStatus?.comparisonReady ? "true" : "false"} (steepMeasured=${Boolean(facts.comparisonStatus?.steepMeasured)} gentleMeasured=${Boolean(facts.comparisonStatus?.gentleMeasured)})`,
    facts.evidenceStatus
      ? `EVIDENCE STATUS: observed=${(facts.evidenceStatus.observed || []).join("; ") || "none"}; predicted=${facts.evidenceStatus.predicted || ""}; notYetTested=${(facts.evidenceStatus.notYetTested || []).join("; ") || "none"}`
      : "",
    recent ? `Recent:\n${recent}` : "",
    `Student: ${request.question || request.action || ""}`,
    'Reply JSON only: {"explanation":"","followUpQuestion":"","concept":"","supportLevel":0,"offTopic":false}'
  ]
    .filter(Boolean)
    .join("\n");
}

export function createAiProvider({ adapter, timeoutMs = 3500, cacheSize = 24 } = {}) {
  const cache = new Map();
  return {
    id: "ai",
    adapterId: adapter?.id || "none",
    adapterKind: adapter?.kind || "unknown",
    async respond(request) {
      if (!adapter || typeof adapter.complete !== "function") {
        const err = new Error("unavailable");
        err.code = "unavailable";
        throw err;
      }
      const packet = request.packet || selectSummitPacket(request);
      const prompt = buildSummitPrompt(packet, request);
      const hit = cache.get(prompt);
      if (hit) return { ...hit, cached: true };
      const raw = await withTimeout(
        adapter.complete({
          packet,
          prompt,
          question: request.question || "",
          recent: packet.recent
        }),
        timeoutMs
      );
      const parsed = typeof raw === "string" ? parseJson(raw) : raw;
      const checked = validateSummitOutput(parsed, packet, request);
      if (!checked.ok) {
        const err = new Error(checked.reason);
        err.code = checked.reason;
        err.raw = parsed;
        throw err;
      }
      const follow = checked.reply.followUpQuestion || "";
      const spoken = composeStudentVisible(checked.reply.text, packet, {
        ...request,
        followUpQuestion: follow
      });
      checked.reply.text = spoken;
      checked.reply.provider = "ai";
      checked.reply.adapterId = adapter.id || "ai";
      checked.reply.rawModel = parsed;
      if (cacheSize > 0) {
        cache.set(prompt, { ...checked.reply });
        if (cache.size > cacheSize) cache.delete(cache.keys().next().value);
      }
      return checked.reply;
    }
  };
}

export function createHttpAdapter({ endpoint, timeoutMs = 3500, retry429 = 0, retry429WaitMs = 15000 } = {}) {
  return {
    id: "http",
    kind: "remote",
    async complete({ packet, prompt, question }) {
      if (!endpoint) {
        const err = new Error("unavailable");
        err.code = "unavailable";
        throw err;
      }
      let lastErr = null;
      for (let attempt = 0; attempt <= retry429; attempt++) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(toGatewayBody({ packet, prompt, question })),
            signal: ctrl.signal
          });
          if (res.status === 429) {
            lastErr = Object.assign(new Error("rate-limit"), { code: "rate-limit" });
            if (attempt < retry429) {
              await new Promise((r) => setTimeout(r, retry429WaitMs));
              continue;
            }
            throw lastErr;
          }
          const body = await res.json().catch(() => ({}));
          if (!res.ok) {
            const code = body.error === "timeout" || body.error === "malformed" ? body.error : "http";
            const err = new Error(code);
            err.code = code;
            throw err;
          }
          return body;
        } catch (err) {
          if (err?.name === "AbortError") {
            const timeout = new Error("timeout");
            timeout.code = "timeout";
            throw timeout;
          }
          throw err;
        } finally {
          clearTimeout(timer);
        }
      }
      throw lastErr || Object.assign(new Error("rate-limit"), { code: "rate-limit" });
    }
  };
}

export function createFixtureAdapter(handler) {
  return {
    id: "fixture",
    kind: "test",
    complete(payload) {
      return handler(payload);
    }
  };
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const err = new Error("malformed");
    err.code = "malformed";
    throw err;
  }
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      const err = new Error("timeout");
      err.code = "timeout";
      reject(err);
    }, ms);
    Promise.resolve(promise).then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}
