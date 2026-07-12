/**
 * Waypoint Knowledge Platform — shared search
 * One search architecture for every application.
 */
(function (global) {
  "use strict";

  function norm(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function tokens(q) {
    return norm(q).split(" ").filter(Boolean);
  }

  function haystack(entry) {
    var names = entry.names || {};
    var parts = [
      entry.id,
      names.common,
      names.scientific,
      (names.aliases || []).join(" "),
      (names.synonyms || []).join(" "),
      entry.description,
      (entry.categories || []).join(" "),
      (entry.tags || []).join(" "),
      (entry.domains || []).join(" "),
      entry.kind,
      ((entry.search && entry.search.keywords) || []).join(" ")
    ];
    if (entry.taxonomy) {
      parts.push(
        entry.taxonomy.family,
        entry.taxonomy.genus,
        entry.taxonomy.species,
        entry.taxonomy.kingdom
      );
    }
    if (entry.geography) {
      parts.push(entry.geography.distribution);
      parts.push((entry.geography.regions || []).join(" "));
      parts.push((entry.geography.countries || []).join(" "));
    }
    return norm(parts.filter(Boolean).join(" "));
  }

  function scoreEntry(entry, toks) {
    if (!toks.length) return 0;
    var hay = haystack(entry);
    var score = 0;
    var names = entry.names || {};
    toks.forEach(function (t) {
      if (norm(names.common) === t) score += 12;
      else if (norm(names.common).indexOf(t) >= 0) score += 8;
      if (names.scientific && norm(names.scientific).indexOf(t) >= 0) score += 10;
      (names.aliases || []).forEach(function (a) {
        if (norm(a).indexOf(t) >= 0) score += 7;
      });
      if ((entry.tags || []).some(function (tag) { return norm(tag) === t; })) score += 5;
      if ((entry.categories || []).some(function (c) { return norm(c) === t; })) score += 5;
      if (hay.indexOf(t) >= 0) score += 2;
    });
    var boost = (entry.search && entry.search.boost) || 1;
    return score * boost;
  }

  function matchesGeo(entry, geo) {
    if (!geo) return true;
    var g = entry.geography || {};
    if (geo.region) {
      var regions = g.regions || [];
      if (regions.indexOf(geo.region) < 0 && norm(g.distribution || "").indexOf(norm(geo.region)) < 0) {
        return false;
      }
    }
    if (geo.country) {
      var countries = g.countries || [];
      if (countries.indexOf(geo.country) < 0) return false;
    }
    return true;
  }

  /**
   * @param {string} query
   * @param {object} options domain, category, kind, tag, region, country, limit
   */
  function search(query, options) {
    options = options || {};
    var K = global.WDS && global.WDS.knowledge;
    if (!K) return Promise.resolve([]);

    var toks = tokens(query);
    var limit = options.limit != null ? options.limit : 25;

    return K.list({
      domain: options.domain,
      category: options.category,
      kind: options.kind,
      tag: options.tag
    }).then(function (entries) {
      var ranked = entries
        .filter(function (e) { return matchesGeo(e, options); })
        .map(function (e) {
          return { entry: e, score: toks.length ? scoreEntry(e, toks) : 1 };
        })
        .filter(function (r) { return r.score > 0; })
        .sort(function (a, b) { return b.score - a.score; })
        .slice(0, limit);

      return ranked.map(function (r) {
        return {
          id: r.entry.id,
          score: Math.round(r.score * 10) / 10,
          kind: r.entry.kind,
          domains: r.entry.domains,
          categories: r.entry.categories,
          names: r.entry.names,
          description: r.entry.description,
          wskbId: r.entry.wskbId || null,
          entry: r.entry
        };
      });
    });
  }

  // Attach onto knowledge API when present
  function attach() {
    if (!global.WDS) return;
    global.WDS.knowledgeSearch = { search: search, scoreEntry: scoreEntry, tokens: tokens };
    if (global.WDS.knowledge) {
      global.WDS.knowledge.search = search;
    }
  }

  attach();
  global.WDS = global.WDS || {};
  if (!global.WDS.knowledgeSearch) {
    global.WDS.knowledgeSearch = { search: search, scoreEntry: scoreEntry, tokens: tokens };
  }
})(typeof window !== "undefined" ? window : global);
