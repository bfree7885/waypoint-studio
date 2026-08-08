import { normalizeEvent, validateEvent } from "../lib/validate.mjs";

export function normalizeEvents(rawEvents) {
  const out = [];
  const rejected = [];
  for (const raw of rawEvents || []) {
    const ev = normalizeEvent(raw);
    if (!ev) {
      rejected.push({ reason: "normalize_failed", rawId: raw?.id || null });
      continue;
    }
    // Do not invent summaries — require source-backed text.
    if (!ev.title || !ev.summary || !ev.sourceUrl) {
      rejected.push({ reason: "incomplete", id: ev.id });
      continue;
    }
    const errors = validateEvent(ev);
    if (errors.length) {
      rejected.push({ reason: "validation", id: ev.id, errors });
      continue;
    }
    out.push(ev);
  }
  return { events: out, rejected };
}
