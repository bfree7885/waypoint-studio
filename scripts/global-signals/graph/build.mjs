#!/usr/bin/env node
/** Build live canonical graph + activate entities from live events. */
import path from "node:path";
import { ROOT, nowIso, readJson, writeJson } from "../lib/io.mjs";
import { SEED_ENTITIES, ENTITY_TYPES, buildSeedEdges, ACTIVATION_RULES } from "./canonical-seed.mjs";

const PATHS = {
  events: path.join(ROOT, "data/global-signals/production/events/events.json"),
  graph: path.join(ROOT, "data/global-signals/production/graph/graph.json"),
  graphCompat: path.join(ROOT, "data/global-signals/relationship-graph/graph.json"),
  relationshipsCompat: path.join(ROOT, "data/global-signals/relationships/relationships.json")
};

function activateFromEvents(events, now) {
  const activated = new Map();
  for (const ev of events || []) {
    const blob = `${ev.title} ${ev.summary} ${ev.eventType} ${(ev.entities || []).join(" ")}`;
    for (const rule of ACTIVATION_RULES) {
      // Explicit coded rules only: require pattern match on source text.
      if (!rule.pattern.test(blob)) continue;
      for (const entityId of rule.entityIds) {
        const prev = activated.get(entityId) || { entityId, eventIds: [], activatedAt: now };
        if (!prev.eventIds.includes(ev.id)) prev.eventIds.push(ev.id);
        activated.set(entityId, prev);
      }
    }
  }
  return activated;
}

export function buildLiveGraph({ eventsPayload } = {}) {
  const now = nowIso();
  const eventsDoc = eventsPayload || readJson(PATHS.events, { events: [], mode: "live-empty" });
  const events = eventsDoc.events || [];
  const edges = buildSeedEdges(now);
  const activated = activateFromEvents(events, now);

  const nodes = SEED_ENTITIES.map((e) => {
    const act = activated.get(e.id);
    return {
      ...e,
      active: Boolean(act),
      activatingEventIds: act?.eventIds || [],
      focusable: true
    };
  });

  // Highlight edges touching activated entities.
  const liveEdges = edges.map((edge) => {
    const hot = activated.has(edge.from) || activated.has(edge.to);
    return {
      ...edge,
      active: hot,
      activationReason: hot ? "connected_to_activated_entity" : null
    };
  });

  const graph = {
    version: "1.0.0",
    mode: "live",
    modeLabel: "Live canonical knowledge graph",
    updatedAt: now,
    honesty: {
      banner:
        "Live graph combines evidence-backed structural relationships with activation from real ingested events. Edges are not AI guesses. Active highlighting means an event matched an explicit activation rule.",
      confidenceRules:
        "Observed only for authoritative institutional/geographic facts. Derived impacts must not use Observed."
    },
    entityTypes: ENTITY_TYPES,
    counts: {
      entities: nodes.length,
      relationships: liveEdges.length,
      activeEntities: nodes.filter((n) => n.active).length,
      activeRelationships: liveEdges.filter((e) => e.active).length,
      activatingEvents: events.length
    },
    nodes,
    edges: liveEdges,
    activations: [...activated.values()]
  };

  // Explorer-compatible projection
  const relationshipsDoc = {
    version: "1.0.0",
    mode: "live",
    modeLabel: "Live relationships",
    updatedAt: now,
    honesty: graph.honesty,
    entityTypes: ENTITY_TYPES,
    entities: nodes.map((n) => ({
      id: n.id,
      type: n.type.toLowerCase().replace(/\s+/g, "_"),
      label: n.label,
      summary: n.summary,
      selectable: true,
      active: n.active,
      activatingEventIds: n.activatingEventIds
    })),
    relationships: liveEdges.map((e) => ({
      id: e.id,
      from: e.from,
      to: e.to,
      relationType: e.relationshipType,
      why: e.evidence?.notes || e.evidence?.label || e.relationshipType,
      confidence: e.confidence,
      timeHorizon: "Long-term",
      evidence: e.evidence,
      derivationMethod: e.derivationMethod,
      lastVerifiedAt: e.lastVerifiedAt,
      updatedAt: e.updatedAt,
      active: e.active,
      direction: e.direction
    })),
    cascades: []
  };

  writeJson(PATHS.graph, graph);
  writeJson(PATHS.graphCompat, graph);
  writeJson(PATHS.relationshipsCompat, relationshipsDoc);
  return { graph, relationshipsDoc, activated };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]).endsWith("graph/build.mjs");
if (isMain) {
  const { graph } = buildLiveGraph();
  console.log(JSON.stringify(graph.counts, null, 2));
}
