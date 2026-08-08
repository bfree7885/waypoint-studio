import { contentHash } from "../lib/io.mjs";

function tokenize(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);
}

function jaccard(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  if (!A.size || !B.size) return 0;
  let inter = 0;
  for (const x of A) if (B.has(x)) inter += 1;
  return inter / (A.size + B.size - inter);
}

/**
 * Deduplicate overlapping reports while preserving multiple sourceRefs.
 */
export function dedupeEvents(events) {
  const groups = [];
  for (const ev of events || []) {
    const tokens = tokenize(`${ev.title} ${ev.summary}`);
    let matched = null;
    for (const g of groups) {
      const sameType = g.event.eventType === ev.eventType;
      const score = jaccard(g.tokens, tokens);
      const sameDay =
        g.event.publishedAt &&
        ev.publishedAt &&
        g.event.publishedAt.slice(0, 10) === ev.publishedAt.slice(0, 10);
      if (sameType && score >= 0.55 && (sameDay || score >= 0.72)) {
        matched = g;
        break;
      }
    }
    if (!matched) {
      groups.push({ event: { ...ev, sourceRefs: [...(ev.sourceRefs || [])] }, tokens });
      continue;
    }
    // Preserve additional sources on the kept event.
    const refs = matched.event.sourceRefs || [];
    for (const ref of ev.sourceRefs || []) {
      const key = contentHash([ref.adapter, ref.documentNumber || ref.guid || ref.featureId || ev.sourceUrl]);
      if (!refs.some((r) => contentHash([r.adapter, r.documentNumber || r.guid || r.featureId || ""]) === key)) {
        refs.push(ref);
      }
    }
    matched.event.sourceRefs = refs;
    if (ev.sourceUrl && ev.sourceUrl !== matched.event.sourceUrl) {
      matched.event.evidence = [
        ...(matched.event.evidence || []),
        {
          kind: "corroborating_source",
          label: ev.publisher || ev.source,
          url: ev.sourceUrl
        }
      ];
    }
    // Prefer longer factual summary when available.
    if ((ev.summary || "").length > (matched.event.summary || "").length) {
      matched.event.summary = ev.summary;
    }
  }
  return groups.map((g) => g.event);
}
