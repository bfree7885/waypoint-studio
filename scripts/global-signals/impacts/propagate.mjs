#!/usr/bin/env node
/**
 * Transparent rule/graph-based impact propagation.
 * NOT unrestricted AI prediction. Confidence decays with causal distance.
 */
import path from "node:path";
import { ROOT, nowIso, readJson, writeJson, contentHash } from "../lib/io.mjs";
import { decayConfidence } from "../lib/provenance.mjs";
import { validateImpact } from "../lib/validate.mjs";

const PATHS = {
  events: path.join(ROOT, "data/global-signals/production/events/events.json"),
  graph: path.join(ROOT, "data/global-signals/production/graph/graph.json"),
  impacts: path.join(ROOT, "data/global-signals/production/impacts/impacts.json"),
  impactsCompat: path.join(ROOT, "data/global-signals/impacts/impacts.json"),
  industriesCompat: path.join(ROOT, "data/global-signals/industries/live-impacts.json"),
  citizenCompat: path.join(ROOT, "data/global-signals/citizen-impact/live-impacts.json")
};

const INDUSTRY_TYPES = new Set(["Industry"]);
const CITIZEN_TYPES = new Set(["Citizen Impact"]);

const ORDER_HORIZON = {
  1: "Days",
  2: "Weeks",
  3: "Months"
};

function adjacency(edges) {
  const out = new Map();
  for (const e of edges || []) {
    if (!out.has(e.from)) out.set(e.from, []);
    out.get(e.from).push(e);
  }
  return out;
}

function impactDirection(relationshipType) {
  if (/constrains|disrupts|threatens/.test(relationshipType)) return "negative";
  if (/produces|feeds|inputs|transports|carries|exports|affects/.test(relationshipType)) return "exposure";
  return "exposure";
}

export function propagateImpacts({ eventsPayload, graphPayload, maxOrder = 3 } = {}) {
  const now = nowIso();
  const eventsDoc = eventsPayload || readJson(PATHS.events, { events: [] });
  const graph = graphPayload || readJson(PATHS.graph, { nodes: [], edges: [], activations: [] });
  const events = eventsDoc.events || [];
  const nodesById = new Map((graph.nodes || []).map((n) => [n.id, n]));
  const adj = adjacency(graph.edges || []);
  const impacts = [];

  const seeds = [];
  for (const act of graph.activations || []) {
    for (const eventId of act.eventIds || []) {
      seeds.push({ entityId: act.entityId, eventId });
    }
  }

  for (const seed of seeds) {
    const origin = events.find((e) => e.id === seed.eventId);
    if (!origin) continue;
    const queue = [{ entityId: seed.entityId, order: 0, path: [], edgeConfidence: "High" }];
    const seen = new Set([`${seed.eventId}|${seed.entityId}|0`]);

    while (queue.length) {
      const cur = queue.shift();
      for (const edge of adj.get(cur.entityId) || []) {
        const nextOrder = cur.order + 1;
        if (nextOrder > maxOrder) continue;
        const key = `${seed.eventId}|${edge.to}|${nextOrder}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const target = nodesById.get(edge.to);
        if (!target) continue;
        const conf = decayConfidence(edge.confidence || cur.edgeConfidence, nextOrder);
        const path = [
          ...cur.path,
          {
            from: edge.from,
            to: edge.to,
            relationshipType: edge.relationshipType,
            evidence: edge.evidence,
            confidence: conf,
            order: nextOrder
          }
        ];

        const interesting = INDUSTRY_TYPES.has(target.type) || CITIZEN_TYPES.has(target.type);
        if (interesting) {
          const imp = {
            id: `gsi_${contentHash([seed.eventId, edge.to, String(nextOrder), edge.id])}`,
            originEvent: seed.eventId,
            originEventTitle: origin.title,
            path,
            affectedEntity: edge.to,
            affectedEntityLabel: target.label,
            affectedEntityType: target.type,
            impactDirection: impactDirection(edge.relationshipType),
            order: nextOrder,
            orderLabel: nextOrder === 1 ? "FIRST-ORDER" : nextOrder === 2 ? "SECOND-ORDER" : "THIRD-ORDER",
            confidence: conf,
            timeHorizon: ORDER_HORIZON[nextOrder] || "Unknown",
            evidence: [
              {
                kind: "graph_edge",
                label: edge.evidence?.label || edge.relationshipType,
                url: edge.evidence?.url || null,
                notes: edge.evidence?.notes || null
              },
              {
                kind: "origin_event",
                label: origin.title,
                url: origin.sourceUrl,
                notes: "Source event used for activation; impact is derived, not Observed."
              }
            ],
            whyThisIsShowing:
              `An ingested event activated "${nodesById.get(seed.entityId)?.label || seed.entityId}", and a coded graph path of length ${nextOrder} reaches "${target.label}".`,
            updatedAt: now,
            status: "calculated"
          };
          const errors = validateImpact(imp);
          if (!errors.length) impacts.push(imp);
        }

        queue.push({
          entityId: edge.to,
          order: nextOrder,
          path,
          edgeConfidence: conf
        });
      }
    }
  }

  // Dedup by origin+entity+order keeping higher confidence
  const rank = { High: 3, Medium: 2, Low: 1, Unknown: 0 };
  const best = new Map();
  for (const imp of impacts) {
    const k = `${imp.originEvent}|${imp.affectedEntity}|${imp.order}`;
    const prev = best.get(k);
    if (!prev || (rank[imp.confidence] || 0) > (rank[prev.confidence] || 0)) best.set(k, imp);
  }
  const unique = [...best.values()];

  const industryImpacts = unique.filter((i) => i.affectedEntityType === "Industry");
  const citizenImpacts = unique.filter((i) => i.affectedEntityType === "Citizen Impact");

  const payload = {
    version: "1.0.0",
    mode: unique.length ? "live" : "live-empty",
    modeLabel: "Live calculated impacts",
    updatedAt: now,
    honesty: {
      banner:
        "Impacts are calculated from live events + evidence-backed graph edges. They are ANALYSIS / exposure paths, never Observed facts. Empty means no activation path reached an industry or citizen node.",
      confidenceRules:
        "Confidence decays with causal distance (order). Predicted impacts must never be labeled Observed."
    },
    counts: {
      total: unique.length,
      firstOrder: unique.filter((i) => i.order === 1).length,
      secondOrder: unique.filter((i) => i.order === 2).length,
      thirdOrder: unique.filter((i) => i.order === 3).length,
      industries: industryImpacts.length,
      citizen: citizenImpacts.length,
      eventsProcessed: new Set(unique.map((i) => i.originEvent)).size
    },
    impacts: unique,
    industries: industryImpacts,
    citizen: citizenImpacts
  };

  writeJson(PATHS.impacts, payload);
  writeJson(PATHS.impactsCompat, payload);
  writeJson(PATHS.industriesCompat, {
    version: "1.0.0",
    mode: payload.mode,
    updatedAt: now,
    honesty: payload.honesty,
    impacts: industryImpacts
  });
  writeJson(PATHS.citizenCompat, {
    version: "1.0.0",
    mode: payload.mode,
    updatedAt: now,
    honesty: payload.honesty,
    impacts: citizenImpacts
  });

  return payload;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]).endsWith("impacts/propagate.mjs");
if (isMain) {
  const payload = propagateImpacts();
  console.log(JSON.stringify(payload.counts, null, 2));
}
