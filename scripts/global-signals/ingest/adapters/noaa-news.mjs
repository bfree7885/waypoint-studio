/** NOAA public RSS — weather/climate/oceans official features. */
import { fetchText, nowIso } from "../../lib/io.mjs";
import { makeProvenance } from "../../lib/provenance.mjs";
import { makeEventId, parseRssItems } from "./_rss.mjs";

const URL = "https://www.noaa.gov/rss.xml";

const RELEVANT =
  /\b(hurricane|tropical storm|typhoon|flood|drought|wildfire|heat wave|extreme weather|tsunami|tornado|marine heat|storm surge)\b/i;
const IRRELEVANT =
  /\b(education|award|small business|internship|classroom|lesson plan|anniversary celebration)\b/i;

export async function fetchNoaaNews({ timeoutMs = 20000, max = 20 } = {}) {
  const retrievedAt = nowIso();
  try {
    const res = await fetchText(URL, {
      timeoutMs,
      accept: "application/rss+xml, application/xml, text/xml, */*"
    });
    if (!res.ok) {
      return {
        adapter: "noaa-news",
        events: [],
        sourceHealth: {
          ok: 0,
          attempted: 1,
          failures: [{ adapter: "noaa-news", error: `HTTP ${res.status}`, at: retrievedAt }]
        }
      };
    }
    const items = parseRssItems(res.text, { max: max * 2 });
    const events = [];
    for (const item of items) {
      if (!item.link) continue;
      const blob = `${item.title} ${item.summary}`;
      if (!RELEVANT.test(blob) || IRRELEVANT.test(blob)) continue;
      const eventType = "natural_disaster";
      events.push({
        id: makeEventId("noaa", item.guid || item.link, item.title),
        title: item.title,
        summary: item.summary || item.title,
        eventType,
        entities: ["NOAA"],
        countries: ["United States"],
        regions: ["Global"],
        occurredAt: item.publishedAt,
        publishedAt: item.publishedAt,
        evidence: [{ kind: "official_rss", label: "NOAA news feature", url: item.link }],
        status: "active",
        provenance: makeProvenance({
          source: "noaa-news",
          sourceUrl: item.link,
          publisher: "NOAA",
          publishedAt: item.publishedAt,
          retrievedAt
        }),
        sourceRefs: [{ adapter: "noaa-news", guid: item.guid }]
      });
      if (events.length >= max) break;
    }
    return {
      adapter: "noaa-news",
      events,
      sourceHealth: { ok: 1, attempted: 1, failures: [] }
    };
  } catch (err) {
    return {
      adapter: "noaa-news",
      events: [],
      sourceHealth: {
        ok: 0,
        attempted: 1,
        failures: [{ adapter: "noaa-news", error: String(err.message || err), at: retrievedAt }]
      }
    };
  }
}
