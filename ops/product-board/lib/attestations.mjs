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
  campaign = null,
  evidenceRefs = null,
  commercialVisual = null
}) {
  if (!criterionId) throw new Error("criterionId required");
  if (!role) throw new Error("role required");
  if (!["pass", "fail", "waive"].includes(verdict)) {
    throw new Error('verdict must be "pass", "fail", or "waive"');
  }
  if (verdict === "waive" && !String(notes).trim()) {
    throw new Error("waive requires recorded notes (owner decision)");
  }

  const noteText = String(notes || "").trim();

  // Permanent anti-theater: visual-review pass requires substantive analysis notes
  // + evidence refs. Escaped twice on Sheds when "CDP screenshots" was attested as pass.
  if (criterionId === "visual-review" && verdict === "pass") {
    if (noteText.length < 160) {
      throw new Error(
        "visual-review pass requires ≥160 chars of explicit observations (clipping, truncation, hierarchy, controls, markers) — screenshot mention alone is insufficient"
      );
    }
    if (
      /screenshot|cdp|capture/i.test(noteText) &&
      !/observ|clip|truncat|overlap|hierarch|marker|control|oscillat|prototype|commercial|density|crowded/i.test(
        noteText
      )
    ) {
      throw new Error(
        "visual-review pass cannot cite screenshots without written analysis of what they show"
      );
    }
    if (
      !evidenceRefs ||
      !Array.isArray(evidenceRefs) ||
      !evidenceRefs.some((r) =>
        /screenshot_analysis|dynamic_visual/i.test(String(r.kind || r))
      )
    ) {
      throw new Error(
        "visual-review pass requires evidenceRefs including screenshot_analysis and (for map/geo) dynamic_visual_review"
      );
    }
  }

  if (criterionId === "commercial-review" && verdict === "pass") {
    if (
      !commercialVisual ||
      commercialVisual.wouldSupportPricing == null ||
      !commercialVisual.productFeel
    ) {
      throw new Error(
        "commercial-review pass requires commercialVisual answers: wouldSupportPricing + productFeel (commercial|prototype)"
      );
    }
    if (/prototype/i.test(String(commercialVisual.productFeel))) {
      throw new Error(
        "commercial-review cannot pass while productFeel is prototype"
      );
    }
    if (
      commercialVisual.wouldSupportPricing === false ||
      commercialVisual.wouldSupportPricing === "no"
    ) {
      throw new Error(
        "commercial-review cannot pass when wouldSupportPricing is false"
      );
    }
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
    notes: noteText,
    campaign: campaign || null,
    evidenceRefs: evidenceRefs || null,
    commercialVisual: commercialVisual || null,
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
  const byCriterion = {};
  for (const c of required) {
    const att = attestationFor(c.id, campaign);
    if (att) byCriterion[c.id] = att;
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
    passed,
    byCriterion
  };
}
