#!/usr/bin/env node
/**
 * Global Signals live ingestion: SOURCE → ADAPTER → NORMALIZED EVENT.
 * Writes production artifacts only. Never fabricates events.
 */
import path from "node:path";
import { ROOT, nowIso, writeJson, readJson } from "../lib/io.mjs";
import { normalizeEvents } from "./normalize.mjs";
import { dedupeEvents } from "./dedupe.mjs";
import { fetchFederalRegister } from "./adapters/federal-register.mjs";
import { fetchUsgsEarthquakes } from "./adapters/usgs-earthquakes.mjs";
import { fetchNoaaNews } from "./adapters/noaa-news.mjs";
import { fetchStateDept } from "./adapters/state-dept.mjs";

const OUT = {
  events: path.join(ROOT, "data/global-signals/production/events/events.json"),
  // Compat path used by existing UI mount points
  eventsCompat: path.join(ROOT, "data/global-signals/events/events.json"),
  status: path.join(ROOT, "data/global-signals/ingestion/status.json"),
  registry: path.join(ROOT, "data/global-signals/sources/registry.json")
};

const ADAPTERS = [
  { id: "federal-register", run: fetchFederalRegister },
  { id: "usgs-earthquakes", run: fetchUsgsEarthquakes },
  { id: "noaa-news", run: fetchNoaaNews },
  { id: "state-dept", run: fetchStateDept }
];

export async function runIngestion({ maxEvents = 80 } = {}) {
  const startedAt = nowIso();
  const adapterResults = [];
  const raw = [];
  const failures = [];
  let sourcesOk = 0;
  let sourcesAttempted = 0;

  for (const adapter of ADAPTERS) {
    const result = await adapter.run({});
    adapterResults.push({
      id: adapter.id,
      eventCount: (result.events || []).length,
      health: result.sourceHealth
    });
    sourcesAttempted += result.sourceHealth?.attempted || 1;
    sourcesOk += result.sourceHealth?.ok || 0;
    for (const f of result.sourceHealth?.failures || []) failures.push(f);
    raw.push(...(result.events || []));
  }

  const { events: normalized, rejected } = normalizeEvents(raw);
  const deduped = dedupeEvents(normalized).slice(0, maxEvents);
  const finishedAt = nowIso();

  const payload = {
    version: "1.0.0",
    mode: deduped.length ? "live" : "live-empty",
    modeLabel: deduped.length ? "Live ingested events" : "Live path — no events yet",
    updatedAt: finishedAt,
    honesty: {
      banner: deduped.length
        ? "Live events from approved public government sources. Summaries are truncated source text — not republished full articles. Downstream impacts are not facts."
        : "Live ingestion path is empty after this run. Empty is honest — no demo events were substituted.",
      confidenceRules:
        "Observed is reserved for source-reported facts. Predicted impacts must never use Observed."
    },
    counts: {
      raw: raw.length,
      normalized: normalized.length,
      deduped: deduped.length,
      rejected: rejected.length
    },
    events: deduped
  };

  writeJson(OUT.events, payload);
  writeJson(OUT.eventsCompat, payload);

  const registry = {
    version: "1.0.0",
    updatedAt: finishedAt,
    sources: ADAPTERS.map((a) => {
      const r = adapterResults.find((x) => x.id === a.id);
      return {
        id: a.id,
        enabled: true,
        lastEventCount: r?.eventCount || 0,
        lastOk: (r?.health?.ok || 0) > 0,
        notes: "Approved public government feed/API — no prohibited scraping."
      };
    })
  };
  writeJson(OUT.registry, registry);

  const status = {
    version: "1.0.0",
    mode: "live",
    updatedAt: finishedAt,
    lastSuccessfulIngestion: sourcesOk > 0 ? finishedAt : readJson(OUT.status)?.lastSuccessfulIngestion || null,
    lastAttemptAt: finishedAt,
    startedAt,
    activeSources: sourcesOk,
    sourcesAttempted,
    eventsIngested: deduped.length,
    rawEvents: raw.length,
    rejectedCount: rejected.length,
    sourceFailures: failures,
    adapters: adapterResults,
    artifactPaths: {
      events: "data/global-signals/production/events/events.json",
      status: "data/global-signals/ingestion/status.json",
      registry: "data/global-signals/sources/registry.json"
    },
    refreshCadence: "Every 6 hours via GitHub Actions (global-signals-ingest.yml)"
  };
  writeJson(OUT.status, status);

  return { payload, status, adapterResults, failures, rejected };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]).endsWith("ingest/run.mjs");
if (isMain) {
  runIngestion()
    .then(({ payload, status }) => {
      console.log(
        JSON.stringify(
          {
            mode: payload.mode,
            events: payload.counts.deduped,
            activeSources: status.activeSources,
            failures: status.sourceFailures.length,
            adapters: status.adapters
          },
          null,
          2
        )
      );
      if (status.activeSources === 0) process.exitCode = 2;
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
