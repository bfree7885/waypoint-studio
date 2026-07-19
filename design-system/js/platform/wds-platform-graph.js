/**
 * Waypoint Studio — Shared relationship / knowledge graph helpers
 *
 * Lightweight edge store for cross-domain links. Seeds structural relationships
 * (architecture) and can derive edges from real user data without inventing facts.
 *
 *   WDS.platformGraph.relate(from, to, type, meta)
 *   WDS.platformGraph.related(nodeId, options)
 *   WDS.platformGraph.seedArchitecture()
 *   WDS.platformGraph.deriveFromObservations()
 */
(function (global) {
  "use strict";

  var KEY = "waypoint-platform-graph-edges-v1";
  var MAX_EDGES = 400;

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function write(list) {
    try {
      localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_EDGES)));
      return true;
    } catch (e) {
      return false;
    }
  }

  function edgeId(from, to, type) {
    return [from, type, to].join("::");
  }

  function relate(from, to, type, meta) {
    if (!from || !to || !type) return null;
    var id = edgeId(from, to, type);
    var all = read().filter(function (e) { return e.id !== id; });
    var row = {
      id: id,
      from: String(from),
      to: String(to),
      type: String(type),
      meta: meta || {},
      createdAt: new Date().toISOString(),
      honesty: (meta && meta.honesty) || "Structural or user-derived link — not a live detection."
    };
    all.unshift(row);
    write(all);
    return row;
  }

  function related(nodeId, options) {
    options = options || {};
    var id = String(nodeId);
    return read().filter(function (e) {
      if (options.type && e.type !== options.type) return false;
      return e.from === id || e.to === id;
    });
  }

  /**
   * Architecture seeds — product ↔ capability relationships (documentation-grade).
   */
  function seedArchitecture() {
    var seeds = [
      ["app:fieldry", "app:shed-hunting", "feeds", { why: "Wildlife observations can inform shed-hunting field notes" }],
      ["app:fieldry", "app:foragecast", "feeds", { why: "Flora / fungi notes can inform foraging education" }],
      ["app:fieldry", "app:scenes", "feeds", { why: "Encounters can inspire photographic subjects" }],
      ["app:photo-coach", "app:fieldry", "workflow", { why: "Careful looking often becomes an observation" }],
      ["app:foragecast", "app:fieldry", "workflow", { why: "Seasonal cues invite logging what you find" }],
      ["app:shed-hunting", "app:fieldry", "workflow", { why: "Sign notes belong in a private life list" }],
      ["app:dashboard", "capability:oip", "uses", { why: "Outdoor Intelligence Platform" }],
      ["app:foragecast", "capability:oip", "uses", { why: "Shared outdoor context" }],
      ["app:savant-sommelier", "capability:places", "uses", { why: "Vineyard sites are places" }],
      ["app:steepleaf", "capability:collections", "uses", { why: "Tea lists are collections" }],
      ["app:signalterrain", "app:dashboard", "workflow", { why: "Signal context may inform outdoor situational awareness later" }],
      ["app:waypoint-volunteer", "app:fieldry", "workflow", { why: "Stewardship events can become personal history" }],
      ["taxon:species", "concept:habitat", "related", { why: "Species inhabit places" }],
      ["taxon:species", "concept:weather", "related", { why: "Phenology depends on conditions" }],
      ["media:photo", "record:observation", "related", { why: "Photos evidence observations" }],
      ["record:observation", "place:location", "related", { why: "Observations happen somewhere" }],
      ["wine:region", "concept:climate", "related", { why: "Viticulture depends on climate" }],
      ["tea:origin", "concept:elevation", "related", { why: "Tea character relates to elevation" }],
      ["landscape:form", "concept:geology", "related", { why: "Landforms reflect geology" }],
      ["threat:entity", "concept:vulnerability", "related", { why: "Awareness links threats to weaknesses" }]
    ];
    seeds.forEach(function (s) {
      relate(s[0], s[1], s[2], Object.assign({ seed: true, honesty: "Architecture seed — not inferred from your data." }, s[3] || {}));
    });
    return related("app:fieldry").length > 0;
  }

  /**
   * Derive edges only from real observation envelopes (taxon ↔ app, taxon ↔ place label).
   */
  function deriveFromObservations() {
    var Obs = global.WDS && global.WDS.platformObservations;
    if (!Obs) return 0;
    var n = 0;
    Obs.list({ limit: 80 }).forEach(function (o) {
      if (o.taxonLabel) {
        var tax = "taxon:" + String(o.taxonLabel).toLowerCase().replace(/\s+/g, "-");
        relate(tax, "app:" + o.sourceApp, "observed-in", {
          honesty: "Derived from your private observation on this device.",
          observationId: o.id
        });
        n += 1;
        if (o.locationLabel) {
          relate(tax, "place:" + String(o.locationLabel).toLowerCase().replace(/\s+/g, "-"), "observed-at", {
            honesty: "Derived from your private observation location label.",
            observationId: o.id
          });
          n += 1;
        }
      }
    });
    return n;
  }

  function path(from, to, maxDepth) {
    maxDepth = maxDepth || 3;
    var edges = read();
    var queue = [{ id: from, trail: [from] }];
    var seen = {};
    seen[from] = true;
    while (queue.length) {
      var cur = queue.shift();
      if (cur.id === to) return cur.trail;
      if (cur.trail.length > maxDepth) continue;
      edges.forEach(function (e) {
        var next = null;
        if (e.from === cur.id) next = e.to;
        else if (e.to === cur.id) next = e.from;
        if (next && !seen[next]) {
          seen[next] = true;
          queue.push({ id: next, trail: cur.trail.concat([next]) });
        }
      });
    }
    return null;
  }

  global.WDS = global.WDS || {};
  global.WDS.platformGraph = {
    version: "1.0.0",
    KEY: KEY,
    relate: relate,
    related: related,
    seedArchitecture: seedArchitecture,
    deriveFromObservations: deriveFromObservations,
    path: path,
    list: read
  };
})(typeof window !== "undefined" ? window : globalThis);
