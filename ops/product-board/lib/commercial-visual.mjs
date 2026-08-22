import { nowIso } from "./io.mjs";
import { VERDICTS } from "./verdicts.mjs";

/**
 * Permanent commercial visual gate — independent of engineering green checks.
 * Prototype-quality UI → fail Subscriber Ready even if workflows function.
 */

export const COMMERCIAL_VISUAL_QUESTIONS = Object.freeze([
  {
    id: "pricing-page-support",
    text: "Would screenshots + a short screen recording of this exact production build support asking customers to pay on the pricing page?"
  },
  {
    id: "finished-vs-prototype",
    text: "Does this feel like finished commercial software, or a functional prototype?"
  }
]);

/**
 * @param {object} answers
 * @param {boolean|string} answers.wouldSupportPricing - true/"yes" pass; false/"no" fail
 * @param {"commercial"|"prototype"|string} answers.productFeel
 * @param {string} [answers.notes]
 */
export function evaluateCommercialVisual(answers = {}) {
  const findings = [];
  const support = normalizeYes(answers.wouldSupportPricing);
  const feel = String(answers.productFeel || answers.finishedOrPrototype || "")
    .trim()
    .toLowerCase();

  if (support == null) {
    findings.push({
      id: "commercial-visual:pricing-unanswered",
      severity: "P0",
      message: COMMERCIAL_VISUAL_QUESTIONS[0].text + " — unanswered."
    });
  } else if (support === false) {
    findings.push({
      id: "commercial-visual:would-not-support-pricing",
      severity: "P0",
      message:
        "Commercial visual gate: production screenshots/recording would not support asking customers to pay."
    });
  }

  if (!feel) {
    findings.push({
      id: "commercial-visual:feel-unanswered",
      severity: "P0",
      message: COMMERCIAL_VISUAL_QUESTIONS[1].text + " — unanswered."
    });
  } else if (/prototype|mvp|alpha|beta.?ui|rough|unfinished|demo.?feel/i.test(feel)) {
    findings.push({
      id: "commercial-visual:prototype-quality",
      severity: "P0",
      message:
        "Commercial visual gate: product feels like a functional prototype — fails Subscriber Ready."
    });
  } else if (!/commercial|finished|ship.?ready|production.?quality/i.test(feel)) {
    findings.push({
      id: "commercial-visual:feel-ambiguous",
      severity: "P1",
      message: `Commercial visual feel answer ambiguous ("${feel}") — require commercial|finished or prototype.`
    });
  }

  const hard = findings.filter((f) => ["P0", "P1"].includes(f.severity));
  const fail = hard.length > 0;
  return {
    evaluatedAt: nowIso(),
    kind: "commercial_visual",
    questions: COMMERCIAL_VISUAL_QUESTIONS,
    status: fail ? "fail" : "pass",
    wouldCancel: fail,
    findings,
    summary: fail
      ? "Commercial visual gate failed — prototype quality or not pricing-supportable."
      : "Commercial visual gate passed — production visuals support paid expectation.",
    blocksVerdict: fail ? VERDICTS.NOT_READY : null,
    notes: String(answers.notes || "").trim()
  };
}

function normalizeYes(v) {
  if (v === true || v === false) return v;
  if (v == null || v === "") return null;
  const s = String(v).trim().toLowerCase();
  if (["yes", "y", "true", "pass", "support"].includes(s)) return true;
  if (["no", "n", "false", "fail"].includes(s)) return false;
  return null;
}
