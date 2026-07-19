/**
 * Waypoint Studio — Global Search architecture
 *
 * Indexes products, places, collections, observations, and knowledge (when loaded).
 * Apps may register additional providers. No fabricated results.
 *
 *   WDS.platformSearch.search(query, options) → { query, groups, total, honesty }
 *   WDS.platformSearch.register(provider)
 */
(function (global) {
  "use strict";

  var providers = [];

  function tokenize(q) {
    return String(q || "")
      .toLowerCase()
      .replace(/[^\w\s\-']/g, " ")
      .split(/\s+/)
      .filter(Boolean);
  }

  function scoreText(text, tokens) {
    text = String(text || "").toLowerCase();
    if (!text || !tokens.length) return 0;
    var score = 0;
    tokens.forEach(function (t) {
      if (text === t) score += 8;
      else if (text.indexOf(t) === 0) score += 5;
      else if (text.indexOf(t) >= 0) score += 2;
    });
    return score;
  }

  function hit(partial) {
    return {
      id: partial.id,
      group: partial.group,
      title: partial.title,
      subtitle: partial.subtitle || null,
      href: partial.href || null,
      score: partial.score || 0,
      source: partial.source || null,
      honesty: partial.honesty || null
    };
  }

  function depthHref(depth, rootPath, appsPath) {
    // Caller may pass absolute-from-root paths; resolve later in UI
    return { rootPath: rootPath, appsPath: appsPath, depth: depth };
  }

  function catalogProvider(query, tokens, options) {
    var Cat = global.WDS && global.WDS.platformCatalog;
    if (!Cat || !Cat.PRODUCTS) return [];
    var depth = options.depth != null ? options.depth : 0;
    var H = Cat.hrefs ? Cat.hrefs(depth) : { root: "./", apps: "apps/" };
    return Cat.PRODUCTS.map(function (p) {
      var blob = [p.name, p.shortName, p.description, p.id].join(" ");
      var s = scoreText(blob, tokens);
      if (s <= 0) return null;
      var href =
        p.id === "studio"
          ? H.root
          : p.pathFromRoot
            ? (depth === 0 ? p.pathFromRoot : (Cat.resolveHref ? Cat.resolveHref(p, depth) : p.pathFromRoot))
            : H.apps + p.id + "/";
      if (Cat.resolveHref) {
        try { href = Cat.resolveHref(p, depth); } catch (e) { /* keep */ }
      }
      return hit({
        id: "product:" + p.id,
        group: "apps",
        title: p.name,
        subtitle: p.description,
        href: href,
        score: s + 1,
        source: "catalog",
        honesty: "Studio application"
      });
    }).filter(Boolean);
  }

  function placesProvider(query, tokens) {
    var Places = global.WDS && global.WDS.platformPlaces;
    if (!Places) return [];
    var rows = []
      .concat(Places.saved ? Places.saved() : [])
      .concat(Places.recent ? Places.recent() : []);
    return rows.map(function (p) {
      var blob = [p.label, p.city, p.county, p.state].join(" ");
      var s = scoreText(blob, tokens);
      if (s <= 0) return null;
      return hit({
        id: "place:" + (p.id || p.label),
        group: "locations",
        title: p.label || "Saved place",
        subtitle: [p.city, p.county, p.state].filter(Boolean).join(", ") || null,
        href: null,
        score: s,
        source: "places",
        honesty: "Private place on this device"
      });
    }).filter(Boolean);
  }

  function collectionsProvider(query, tokens) {
    var S = global.WDS && global.WDS.platform && global.WDS.platform.Collections;
    if (!S) return [];
    return S.list().map(function (c) {
      var blob = [c.title, c.kind, c.appId].join(" ");
      var s = scoreText(blob, tokens);
      if (s <= 0) return null;
      return hit({
        id: "collection:" + c.id,
        group: "collections",
        title: c.title,
        subtitle: (c.kind || "collection") + (c.appId ? " · " + c.appId : ""),
        href: c.appId === "fieldry" ? "apps/fieldry/#/collections" : null,
        score: s,
        source: "collections",
        honesty: "Private collection on this device"
      });
    }).filter(Boolean);
  }

  function observationsProvider(query, tokens, options) {
    var Obs = global.WDS && global.WDS.platformObservations;
    if (!Obs) return [];
    var limit = options.observationLimit != null ? options.observationLimit : 40;
    return Obs.list({ limit: limit }).map(function (o) {
      var blob = [o.title, o.subtitle, o.taxonLabel, o.locationLabel, o.sourceApp, o.kind].join(" ");
      var s = scoreText(blob, tokens);
      if (s <= 0) return null;
      return hit({
        id: "obs:" + o.sourceApp + ":" + o.id,
        group: "observations",
        title: o.title,
        subtitle: [o.sourceApp, o.locationLabel].filter(Boolean).join(" · "),
        href: o.href,
        score: s,
        source: o.sourceApp,
        honesty: o.honesty
      });
    }).filter(Boolean);
  }

  function knowledgeProvider(query, tokens, options) {
    var K = global.WDS && global.WDS.knowledge;
    if (!K || typeof K.search !== "function") return [];
    try {
      var res = K.search(query, { limit: options.knowledgeLimit || 8 });
      var rows = Array.isArray(res) ? res : (res && res.results) || [];
      return rows.map(function (r, i) {
        var title = r.title || r.name || r.id || "Knowledge";
        return hit({
          id: "knowledge:" + (r.id || i),
          group: "knowledge",
          title: title,
          subtitle: r.summary || r.domain || null,
          href: "knowledge.html",
          score: (r.score != null ? r.score : 3) + scoreText(title, tokens),
          source: "knowledge",
          honesty: "Shared knowledge reference — not live detection"
        });
      });
    } catch (e) {
      return [];
    }
  }

  function settingsProvider(query, tokens, options) {
    var topics = [
      { id: "privacy", title: "Privacy", href: "privacy.html" },
      { id: "settings", title: "Studio settings", href: "settings.html" },
      { id: "support", title: "Support", href: "support.html" },
      { id: "contact", title: "Contact", href: "contact.html" }
    ];
    return topics.map(function (t) {
      var s = scoreText(t.title + " " + t.id, tokens);
      if (s <= 0) return null;
      var href = t.href;
      if (options.depth === 1) href = "../../" + t.href;
      if (options.depth === 2) href = "../../../" + t.href;
      return hit({
        id: "settings:" + t.id,
        group: "settings",
        title: t.title,
        subtitle: "Platform",
        href: href,
        score: s,
        source: "platform",
        honesty: null
      });
    }).filter(Boolean);
  }

  // Built-in providers
  providers.push(
    { id: "catalog", search: catalogProvider },
    { id: "places", search: placesProvider },
    { id: "collections", search: collectionsProvider },
    { id: "observations", search: observationsProvider },
    { id: "knowledge", search: knowledgeProvider },
    { id: "settings", search: settingsProvider }
  );

  function register(provider) {
    if (!provider || !provider.id || typeof provider.search !== "function") return false;
    providers = providers.filter(function (p) { return p.id !== provider.id; });
    providers.push(provider);
    return true;
  }

  function search(query, options) {
    options = options || {};
    var q = String(query || "").trim();
    var tokens = tokenize(q);
    if (!tokens.length) {
      return { query: q, groups: {}, total: 0, honesty: "Enter a term to search this device and Studio catalog." };
    }
    var hits = [];
    providers.forEach(function (p) {
      try {
        hits = hits.concat(p.search(q, tokens, options) || []);
      } catch (e) { /* ignore */ }
    });
    hits.sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
    if (options.limit) hits = hits.slice(0, options.limit);

    var groups = {};
    hits.forEach(function (h) {
      var g = h.group || "other";
      if (!groups[g]) groups[g] = [];
      groups[g].push(h);
    });

    return {
      query: q,
      groups: groups,
      results: hits,
      total: hits.length,
      honesty: "Results are local catalog, private device data, and shared knowledge — never invented live detections."
    };
  }

  global.WDS = global.WDS || {};
  global.WDS.platformSearch = {
    version: "1.0.0",
    search: search,
    register: register,
    providers: function () {
      return providers.map(function (p) { return p.id; });
    },
    depthHref: depthHref
  };
})(typeof window !== "undefined" ? window : globalThis);
