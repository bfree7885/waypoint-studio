/**
 * Deterministic Summit portrait expressions.
 * The LLM never chooses a face. Missing art falls back to neutral.
 */

export const SUMMIT_EXPRESSIONS = ["neutral", "thinking", "notice", "explain"];
export const SUMMIT_PORTRAIT_DIR = "./assets/summit";

export function summitPortraitSrc(expression) {
  const key = SUMMIT_EXPRESSIONS.includes(expression) ? expression : "neutral";
  return `${SUMMIT_PORTRAIT_DIR}/summit-${key}.svg`;
}

export function chooseSummitExpression({ pending = false, intent = "", routeReason = "", misconceptionId = "" } = {}) {
  if (pending) return "thinking";
  if (routeReason === "notice" || intent === "notice") return "notice";
  if (
    misconceptionId ||
    intent === "explain" ||
    routeReason === "science-talk" ||
    routeReason === "fair-test" ||
    routeReason === "rephrase"
  ) {
    return "explain";
  }
  return "neutral";
}
