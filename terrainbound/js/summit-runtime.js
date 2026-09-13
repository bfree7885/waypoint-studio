/**
 * Summit runtime: production vs local vs opt-in field test.
 * The Groq key never belongs here.
 */

export const PRODUCTION_HOSTS = ["terrainbound.org", "www.terrainbound.org"];
export const PRODUCTION_ENDPOINT = "https://summit.terrainbound.org/summit";

export function resolveSummitRuntime({ hostname = "", search = "", cfg = {} } = {}) {
  const params = new URLSearchParams(String(search || "").replace(/^\?/, ""));
  const flag = params.get("summit");
  const host = String(hostname || "").toLowerCase();
  const productionHost = PRODUCTION_HOSTS.includes(host);
  if (flag === "local" || flag === "off") {
    return { mode: "offline", endpoint: "", fieldTest: false };
  }
  if (flag === "fieldtest") {
    return { mode: "fieldtest", endpoint: cfg.proxyEndpoint || "", fieldTest: true };
  }
  if (productionHost && (cfg.productionEndpoint || PRODUCTION_ENDPOINT)) {
    return { mode: "production", endpoint: cfg.productionEndpoint || PRODUCTION_ENDPOINT, fieldTest: false };
  }
  if (cfg.endpoint) {
    return { mode: "direct", endpoint: cfg.endpoint, fieldTest: false };
  }
  if (flag === "ai" && cfg.proxyEndpoint) {
    return { mode: "local-ai", endpoint: cfg.proxyEndpoint, fieldTest: false };
  }
  return { mode: "offline", endpoint: "", fieldTest: false };
}

export function useSummitProxy(cfg, loc = typeof location === "undefined" ? {} : location) {
  return Boolean(resolveSummitRuntime({ hostname: loc.hostname || "", search: loc.search || "", cfg }).endpoint);
}

export function toGatewayBody({ packet, prompt, question } = {}) {
  const facts = packet?.facts && typeof packet.facts === "object" ? packet.facts : {};
  const tutoring = packet?.tutoring && typeof packet.tutoring === "object" ? packet.tutoring : {};
  const recent = Array.isArray(packet?.recent) ? packet.recent : [];
  return {
    prompt: String(prompt || "").slice(0, 6000),
    question: String(question || "").slice(0, 240),
    packet: {
      facts: {
        region: facts.region || "",
        puzzle: facts.puzzle || "",
        stage: facts.stage || "",
        near: Array.isArray(facts.near) ? facts.near.slice(0, 3) : [],
        inspectedHighLook: Boolean(facts.inspectedHighLook),
        fairTrialCount: Number(facts.fairTrialCount) || 0,
        measurements: Array.isArray(facts.measurements) ? facts.measurements.slice(0, 6) : [],
        numbers: Array.isArray(facts.numbers) ? facts.numbers.slice(0, 6) : [],
        clearance: Boolean(facts.clearance),
        supportLevel: Number(facts.supportLevel) || 0,
        known: Array.isArray(facts.known) ? facts.known.slice(0, 8) : [],
        expected: Array.isArray(facts.expected) ? facts.expected.slice(0, 8) : [],
        unknown: Array.isArray(facts.unknown) ? facts.unknown.slice(0, 8) : [],
        science: Array.isArray(facts.science) ? facts.science.slice(0, 8) : [],
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
        ladder: tutoring.ladder || "",
        doNotRevealCards: true,
        doNotGrantClearance: true
      },
      recent: recent.slice(-4).map((row) => ({
        role: row?.role === "student" ? "student" : "summit",
        text: String(row?.text || "").slice(0, 220)
      }))
    }
  };
}
