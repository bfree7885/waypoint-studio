#!/usr/bin/env node
/**
 * Build live Global Signals articles from ingested events + impacts + graph.
 * Does not republish full copyrighted text. Moves demo data out of production.
 */
import path from "node:path";
import { ROOT, nowIso, readJson, writeJson, contentHash } from "../lib/io.mjs";
import { buildWaypointTake } from "./take.mjs";

const PATHS = {
  events: path.join(ROOT, "data/global-signals/production/events/events.json"),
  graph: path.join(ROOT, "data/global-signals/production/graph/graph.json"),
  impacts: path.join(ROOT, "data/global-signals/production/impacts/impacts.json"),
  status: path.join(ROOT, "data/global-signals/ingestion/status.json"),
  articlesProd: path.join(ROOT, "data/global-signals/production/articles/articles.json"),
  articlesCompat: path.join(ROOT, "data/global-signals/articles/articles.json")
};

const EVENT_TYPE_LABEL = {
  sanctions: "Sanctions",
  tariffs: "Tariffs",
  trade_policy: "Trade policy",
  export_import_controls: "Export / import controls",
  armed_conflict: "Armed conflict",
  port_shipping_disruption: "Port / shipping disruption",
  energy: "Energy",
  industrial_strike: "Industrial strike",
  cyber: "Cyber",
  natural_disaster: "Natural disaster",
  government_policy: "Government policy",
  critical_infrastructure: "Critical infrastructure",
  other: "Other"
};

function articleId(eventId) {
  return `gsa_live_${contentHash([eventId])}`;
}

function impactPathFromImpacts(imps) {
  if (!imps.length) return [];
  // Prefer the longest first path as a preview chain
  const sorted = [...imps].sort((a, b) => b.path.length - a.path.length);
  const path = sorted[0].path || [];
  const steps = [];
  if (sorted[0].originEventTitle) {
    steps.push({
      label: sorted[0].originEventTitle.slice(0, 80),
      type: "event",
      confidence: "High",
      timeframe: "Immediate",
      explanation: "Originating ingested event (source-backed)."
    });
  }
  for (const hop of path) {
    steps.push({
      label: hop.to,
      type: hop.relationshipType,
      confidence: hop.confidence,
      timeframe: hop.order === 1 ? "Days" : hop.order === 2 ? "Weeks" : "Months",
      explanation: `Coded ${hop.relationshipType} edge (order ${hop.order}); derived exposure, not Observed.`
    });
  }
  return steps.slice(0, 8);
}

export function buildLiveArticles({
  eventsPayload,
  impactsPayload,
  graphPayload,
  statusPayload,
  maxArticles = 40
} = {}) {
  const now = nowIso();
  const eventsDoc = eventsPayload || readJson(PATHS.events, { events: [] });
  const impactsDoc = impactsPayload || readJson(PATHS.impacts, { impacts: [], industries: [], citizen: [] });
  const graph = graphPayload || readJson(PATHS.graph, { edges: [], nodes: [] });
  const status = statusPayload || readJson(PATHS.status, null);
  // Prefer trade/security/disaster signals over soft features when timestamps tie.
  const TYPE_RANK = {
    sanctions: 0,
    tariffs: 1,
    export_import_controls: 2,
    trade_policy: 3,
    armed_conflict: 4,
    port_shipping_disruption: 5,
    energy: 6,
    natural_disaster: 7,
    cyber: 8,
    critical_infrastructure: 9,
    industrial_strike: 10,
    government_policy: 11,
    other: 12
  };
  const events = [...(eventsDoc.events || [])].sort((a, b) => {
    const tr = (TYPE_RANK[a.eventType] ?? 99) - (TYPE_RANK[b.eventType] ?? 99);
    if (tr !== 0) return tr;
    return String(b.publishedAt || "").localeCompare(String(a.publishedAt || ""));
  });

  const nodeLabel = new Map((graph.nodes || []).map((n) => [n.id, n.label]));
  const articles = [];
  let takesGenerated = 0;

  for (const event of events.slice(0, maxArticles)) {
    const relatedIndustry = (impactsDoc.industries || []).filter((i) => i.originEvent === event.id);
    const relatedCitizen = (impactsDoc.citizen || []).filter((i) => i.originEvent === event.id);
    const activeEdges = (graph.edges || []).filter((e) => e.active);
    const take = buildWaypointTake({
      event,
      industryImpacts: relatedIndustry,
      citizenImpacts: relatedCitizen,
      activeEdges
    });
    if (take) takesGenerated += 1;

    // Resolve entity ids in path labels to human labels for UI
    const path = impactPathFromImpacts([...relatedIndustry, ...relatedCitizen]).map((step) => ({
      ...step,
      label: nodeLabel.get(step.label) || step.label
    }));

    const countries = [...new Set([...(event.countries || [])])];
    // Prefer human labels from impacts
    const industries = [...new Set(relatedIndustry.map((i) => i.affectedEntityLabel))];
    const citizenImpacts = [...new Set(relatedCitizen.map((i) => i.affectedEntityLabel))];

    // Article-level confidence refers to the factual summary (source-backed → Observed).
    // Pathway hop confidence lives on likelyImpactPath steps (never Observed).
    articles.push({
      id: articleId(event.id),
      headline: event.title,
      publisher: event.publisher || event.source,
      date: (event.publishedAt || "").slice(0, 10) || null,
      publishedAt: event.publishedAt,
      factualSummary: event.summary,
      sourceUrl: event.sourceUrl,
      eventType: EVENT_TYPE_LABEL[event.eventType] || event.eventType,
      relatedEventId: event.id,
      waypointsTake: take,
      affectedCountries: countries,
      affectedIndustries: industries,
      affectedCommodities: [],
      citizenImpacts,
      timeHorizon: path[1]?.timeframe || "Days",
      confidence: "Observed",
      likelyImpactPath: path,
      provenance: event.provenance,
      retrievedAt: event.retrievedAt || event.provenance?.retrievedAt || now
    });
  }

  const newest = articles.map((a) => a.publishedAt).filter(Boolean).sort().slice(-1)[0] || null;

  const payload = {
    version: "1.0.0",
    mode: articles.length ? "live" : "live-empty",
    modeLabel: articles.length ? "Live intelligence feed" : "Live path — awaiting events",
    updatedAt: now,
    freshness: {
      state: articles.length ? "LIVE" : "EMPTY",
      lastSuccessfulRefresh: status?.lastSuccessfulIngestion || now,
      sourceCount: status?.activeSources ?? null,
      sourcesAttempted: status?.sourcesAttempted ?? null,
      sourceHealth:
        (status?.sourceFailures || []).length === 0
          ? "healthy"
          : status?.activeSources > 0
            ? "degraded"
            : "unavailable",
      eventsIngested: status?.eventsIngested ?? articles.length,
      newestEventAt: newest
    },
    honesty: {
      banner: articles.length
        ? "LIVE feed from approved public government sources. Factual summaries are truncated source text — full copyrighted articles are not republished. Waypoint's Take is deterministic ANALYSIS over graph paths, never invented facts."
        : "Live articles path is empty. Demo articles are not shown here — they live under data/global-signals/fixtures/ for tests only.",
      confidenceRules:
        "Observed is reserved for source-reported facts. Takes and pathway hops are ANALYSIS and must not use Observed."
    },
    counts: {
      articles: articles.length,
      withTake: takesGenerated,
      withoutTake: articles.length - takesGenerated
    },
    articles
  };

  writeJson(PATHS.articlesProd, payload);
  writeJson(PATHS.articlesCompat, payload);
  return payload;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]).endsWith("articles/build.mjs");
if (isMain) {
  const payload = buildLiveArticles();
  console.log(JSON.stringify({ mode: payload.mode, ...payload.counts, freshness: payload.freshness }, null, 2));
}
