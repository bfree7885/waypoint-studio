/**
 * U.S. Department of State public RSS (category feed).
 * Filtered to conflict / sanctions / travel / security signals only.
 */
import { fetchText, nowIso } from "../../lib/io.mjs";
import { makeProvenance } from "../../lib/provenance.mjs";
import { makeEventId, parseRssItems } from "./_rss.mjs";

const URL = "https://www.state.gov/rss/?cat=822";

const RELEVANT =
  /\b(sanction|conflict|war|military|ceasefire|embassy|travel advisory|terrorism|security|ukraine|gaza|israel|taiwan|china|iran|north korea|russia)\b/i;

function eventTypeFrom(text) {
  const t = text.toLowerCase();
  if (/sanction/.test(t)) return "sanctions";
  if (/conflict|war|military|ceasefire|terrorism/.test(t)) return "armed_conflict";
  if (/travel advisory/.test(t)) return "government_policy";
  return "government_policy";
}

export async function fetchStateDept({ timeoutMs = 25000, max = 15 } = {}) {
  const retrievedAt = nowIso();
  try {
    const res = await fetchText(URL, {
      timeoutMs,
      accept: "application/rss+xml, application/xml, text/xml, */*"
    });
    if (!res.ok) {
      return {
        adapter: "state-dept",
        events: [],
        sourceHealth: {
          ok: 0,
          attempted: 1,
          failures: [{ adapter: "state-dept", error: `HTTP ${res.status}`, at: retrievedAt }]
        }
      };
    }
    const items = parseRssItems(res.text, { max: 80 });
    const events = [];
    for (const item of items) {
      if (!item.link) continue;
      const blob = `${item.title} ${item.summary}`;
      if (!RELEVANT.test(blob)) continue;
      events.push({
        id: makeEventId("state", item.guid || item.link, item.title),
        title: item.title,
        summary: (item.summary || item.title).slice(0, 600),
        eventType: eventTypeFrom(blob),
        entities: ["U.S. Department of State"],
        countries: ["United States"],
        regions: [],
        occurredAt: item.publishedAt,
        publishedAt: item.publishedAt,
        evidence: [{ kind: "official_rss", label: "State Department release", url: item.link }],
        status: "active",
        provenance: makeProvenance({
          source: "state-dept",
          sourceUrl: item.link,
          publisher: "U.S. Department of State",
          publishedAt: item.publishedAt,
          retrievedAt
        }),
        sourceRefs: [{ adapter: "state-dept", guid: item.guid }]
      });
      if (events.length >= max) break;
    }
    return {
      adapter: "state-dept",
      events,
      sourceHealth: { ok: 1, attempted: 1, failures: [] }
    };
  } catch (err) {
    return {
      adapter: "state-dept",
      events: [],
      sourceHealth: {
        ok: 0,
        attempted: 1,
        failures: [{ adapter: "state-dept", error: String(err.message || err), at: retrievedAt }]
      }
    };
  }
}
