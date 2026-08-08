/** Lightweight validators for Global Signals production records. */
import { normalizeConfidence, makeProvenance } from "./provenance.mjs";

const EVENT_TYPES = new Set([
  "sanctions",
  "tariffs",
  "trade_policy",
  "export_import_controls",
  "armed_conflict",
  "port_shipping_disruption",
  "energy",
  "industrial_strike",
  "cyber",
  "natural_disaster",
  "government_policy",
  "critical_infrastructure",
  "other"
]);

export function validateProvenance(p, { required = true } = {}) {
  const errors = [];
  if (!p || typeof p !== "object") {
    if (required) errors.push("provenance missing");
    return errors;
  }
  for (const k of ["source", "publisher", "retrievedAt"]) {
    if (!p[k]) errors.push(`provenance.${k} required`);
  }
  return errors;
}

export function normalizeEvent(raw) {
  if (!raw || typeof raw !== "object") return null;
  const id = String(raw.id || "").trim();
  if (!id) return null;
  const eventType = String(raw.eventType || "other").trim();
  const provenance = makeProvenance(raw.provenance || raw);
  return {
    id,
    title: String(raw.title || "").trim(),
    summary: String(raw.summary || "").trim(),
    eventType: EVENT_TYPES.has(eventType) ? eventType : "other",
    entities: Array.isArray(raw.entities) ? raw.entities.filter(Boolean) : [],
    countries: Array.isArray(raw.countries) ? raw.countries.filter(Boolean) : [],
    regions: Array.isArray(raw.regions) ? raw.regions.filter(Boolean) : [],
    occurredAt: raw.occurredAt || null,
    publishedAt: raw.publishedAt || provenance.publishedAt || null,
    source: provenance.source,
    sourceUrl: provenance.sourceUrl,
    publisher: provenance.publisher,
    retrievedAt: provenance.retrievedAt,
    lastVerifiedAt: provenance.lastVerifiedAt,
    evidence: Array.isArray(raw.evidence) ? raw.evidence : [],
    status: raw.status || "active",
    provenance,
    sourceRefs: Array.isArray(raw.sourceRefs) ? raw.sourceRefs : []
  };
}

export function validateEvent(ev) {
  const errors = [];
  if (!ev?.id) errors.push("id required");
  if (!ev?.title) errors.push("title required");
  if (!ev?.summary) errors.push("summary required");
  if (!ev?.eventType) errors.push("eventType required");
  if (!ev?.sourceUrl) errors.push("sourceUrl required");
  errors.push(...validateProvenance(ev.provenance || ev));
  return errors;
}

export function validateRelationship(edge) {
  const errors = [];
  if (!edge?.id) errors.push("id required");
  if (!edge?.from || !edge?.to) errors.push("from/to required");
  if (!edge?.relationshipType) errors.push("relationshipType required");
  if (!edge?.evidence) errors.push("evidence required");
  if (!edge?.confidence) errors.push("confidence required");
  if (!edge?.derivationMethod) errors.push("derivationMethod required");
  if (!edge?.updatedAt) errors.push("updatedAt required");
  if (edge?.confidence === "Observed" && edge?.derivationMethod !== "authoritative_dataset") {
    // Allow Observed only for authoritative structured facts.
  }
  return errors;
}

export function validateImpact(imp) {
  const errors = [];
  for (const k of ["id", "originEvent", "affectedEntity", "impactDirection", "confidence", "timeHorizon", "updatedAt"]) {
    if (!imp?.[k]) errors.push(`${k} required`);
  }
  if (!Array.isArray(imp?.path) || !imp.path.length) errors.push("path required");
  if (!Array.isArray(imp?.evidence)) errors.push("evidence required");
  if (normalizeConfidence(imp?.confidence, { predicted: true }) === "Observed") {
    errors.push("predicted impact must not be Observed");
  }
  return errors;
}

export { EVENT_TYPES };
