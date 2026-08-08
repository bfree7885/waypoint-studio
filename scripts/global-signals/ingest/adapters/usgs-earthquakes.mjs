/** USGS significant earthquakes GeoJSON — major natural disasters. */
import { fetchJson, nowIso } from "../../lib/io.mjs";
import { makeProvenance } from "../../lib/provenance.mjs";
import { makeEventId } from "./_rss.mjs";

const URL =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson";

export async function fetchUsgsEarthquakes({ timeoutMs = 20000, minMag = 6 } = {}) {
  const retrievedAt = nowIso();
  const failures = [];
  try {
    const res = await fetchJson(URL, { timeoutMs });
    if (!res.ok || !res.json) {
      return {
        adapter: "usgs-earthquakes",
        events: [],
        sourceHealth: {
          ok: 0,
          attempted: 1,
          failures: [{ adapter: "usgs-earthquakes", error: `HTTP ${res.status}`, at: retrievedAt }]
        }
      };
    }
    const features = res.json.features || [];
    const events = [];
    for (const f of features) {
      const p = f.properties || {};
      const mag = Number(p.mag);
      if (!Number.isFinite(mag) || mag < minMag) continue;
      const title = String(p.title || `M${mag} earthquake`).trim();
      const sourceUrl = p.url || null;
      if (!sourceUrl) continue;
      const publishedAt = p.time ? new Date(p.time).toISOString() : null;
      const place = String(p.place || "").trim();
      const countries = [];
      const regions = [];
      if (place) regions.push(place);
      events.push({
        id: makeEventId("usgs", String(f.id || sourceUrl), title),
        title,
        summary: `USGS reports a magnitude ${mag} earthquake${place ? ` near ${place}` : ""}. This is an official geophysical observation, not an impact forecast.`,
        eventType: "natural_disaster",
        entities: ["USGS", "Earthquake"].concat(place ? [place] : []),
        countries,
        regions,
        occurredAt: publishedAt,
        publishedAt,
        evidence: [{ kind: "official_observation", label: "USGS earthquake event page", url: sourceUrl }],
        status: "active",
        provenance: makeProvenance({
          source: "usgs-earthquakes",
          sourceUrl,
          publisher: "U.S. Geological Survey",
          publishedAt,
          retrievedAt
        }),
        sourceRefs: [{ adapter: "usgs-earthquakes", featureId: f.id, mag }]
      });
    }
    return {
      adapter: "usgs-earthquakes",
      events,
      sourceHealth: { ok: 1, attempted: 1, failures }
    };
  } catch (err) {
    return {
      adapter: "usgs-earthquakes",
      events: [],
      sourceHealth: {
        ok: 0,
        attempted: 1,
        failures: [{ adapter: "usgs-earthquakes", error: String(err.message || err), at: retrievedAt }]
      }
    };
  }
}
