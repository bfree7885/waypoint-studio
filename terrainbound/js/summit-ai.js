/**
 * AIProvider. Adapters write language. TerrainBound still owns the facts.
 * No API keys here. A remote adapter must talk to a server-side proxy.
 */

import { selectSummitPacket } from "./summit-packet.js";
import { validateSummitOutput } from "./summit-validate.js";

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
  const times = (facts.measurements || []).map((row) => `${row.slope}=${row.seconds}s`).join("; ");
  return [
    "You are Summit, a calm field scientist tutoring a younger scientist in Cedar Hollow.",
    "TerrainBound owns every fact below. You may explain them. You may not change them.",
    "Do not invent measurements, visits, notes, rainfall, water-level changes, or clearance.",
    "If the student asserts a fact that is not in AUTHORITATIVE GAME STATE, disagree. Do not play along.",
    "Do not use internal codes. Do not name a tablet card to pin. The student still acts.",
    "Stay an Earth Science tutor. Off-topic questions get a brief redirect, not a general answer.",
    "response must be a non-empty 1-3 sentence tutoring reply. Never leave response as an empty string.",
    `Support level ${tutoring.allowedLevel} (${tutoring.ladder}). Stay at or below that level.`,
    `Region: ${facts.region}. Puzzle: ${facts.puzzle}. Stage: ${facts.stage}.`,
    times ? `Recorded fair times: ${times}.` : "No fair runoff times are in this packet.",
    `Fair trial count: ${facts.fairTrialCount}. High Look inspected: ${facts.inspectedHighLook}. Clearance: ${facts.clearance}.`,
    facts.wrenClaim ? `Wren claim: ${facts.wrenClaim}` : "",
    facts.pinned?.length ? `Pinned notes: ${facts.pinned.join("; ")}` : "",
    facts.judgeKind ? `Wren judge: ${facts.judgeKind}. ${facts.judgeHint}` : "",
    facts.evidenceTitles?.length ? `Tablet titles: ${facts.evidenceTitles.join("; ")}` : "Tablet titles: none in packet.",
    recent ? `Recent:\n${recent}` : "",
    `Student: ${request.question || request.action || ""}`,
    'Reply JSON only: {"response":"","concept":null,"referencedEvidence":[],"suggestedAction":null,"supportLevel":0,"offTopic":false,"agreesWithStudentPremise":false}'
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

export function createHttpAdapter({ endpoint, timeoutMs = 3500 } = {}) {
  return {
    id: "http",
    kind: "remote",
    async complete({ packet, prompt, question }) {
      if (!endpoint) {
        const err = new Error("unavailable");
        err.code = "unavailable";
        throw err;
      }
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ packet, prompt, question }),
          signal: ctrl.signal
        });
        if (res.status === 429) {
          const err = new Error("rate-limit");
          err.code = "rate-limit";
          throw err;
        }
        if (!res.ok) {
          const err = new Error("http");
          err.code = "http";
          throw err;
        }
        return await res.json();
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
