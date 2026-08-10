import { readJson, writeJson, nowIso } from "./io.mjs";
import { getStateDir } from "./paths.mjs";
import path from "path";

/**
 * Honest role attestations for policy criteria.
 * Never auto-fabricate — operator/agent must record explicitly.
 */
export function getAttestationsPath() {
  return path.join(getStateDir(), "attestations.json");
}

export const DEFAULT_ATTESTATIONS = Object.freeze({
  version: 1,
  updatedAt: null,
  records: []
});

export function loadAttestations() {
  return readJson(getAttestationsPath(), DEFAULT_ATTESTATIONS);
}

export function saveAttestations(doc) {
  doc.updatedAt = nowIso();
  writeJson(getAttestationsPath(), doc);
  return doc;
}

export function recordAttestation({
  criterionId,
  role,
  verdict,
  notes = "",
  campaign = null
}) {
  if (!criterionId) throw new Error("criterionId required");
  if (!role) throw new Error("role required");
  if (!["pass", "fail", "waive"].includes(verdict)) {
    throw new Error('verdict must be "pass", "fail", or "waive"');
  }
  if (verdict === "waive" && !String(notes).trim()) {
    throw new Error("waive requires recorded notes (owner decision)");
  }

  const doc = loadAttestations();
  // Replace prior attestation for same criterion+campaign.
  doc.records = (doc.records || []).filter(
    (r) =>
      !(
        r.criterionId === criterionId &&
        (r.campaign || null) === (campaign || null)
      )
  );
  const record = {
    id: `AT-${String((doc.records?.length || 0) + 1).padStart(3, "0")}`,
    criterionId,
    role,
    verdict,
    notes: String(notes || "").trim(),
    campaign: campaign || null,
    at: nowIso()
  };
  doc.records.push(record);
  saveAttestations(doc);
  return record;
}

export function attestationFor(criterionId, campaign = null) {
  const doc = loadAttestations();
  const matches = (doc.records || []).filter(
    (r) =>
      r.criterionId === criterionId &&
      (r.campaign || null) === (campaign || null)
  );
  return matches.sort((a, b) => String(b.at).localeCompare(String(a.at)))[0] || null;
}

export function requiredAttestationsStatus(criteria, campaign = null) {
  const required = (criteria || []).filter(
    (c) => c.kind === "policy" && c.required !== false
  );
  const pending = [];
  const failed = [];
  const passed = [];
  for (const c of required) {
    const att = attestationFor(c.id, campaign);
    if (!att || att.verdict === undefined) {
      pending.push(c.id);
    } else if (att.verdict === "fail") {
      failed.push({ id: c.id, attestation: att });
    } else if (att.verdict === "pass" || att.verdict === "waive") {
      passed.push({ id: c.id, attestation: att });
    } else {
      pending.push(c.id);
    }
  }
  return {
    complete: pending.length === 0 && failed.length === 0,
    pending,
    failed,
    passed
  };
}
