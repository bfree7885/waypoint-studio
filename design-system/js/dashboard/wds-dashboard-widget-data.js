/**
 * Dashboard widget data layer — reads Outdoor Intelligence Platform only.
 * Widgets never call APIs; engine passes context.platform.
 */
(function (global) {
  "use strict";

  function sliceReady(slice) {
    if (!slice) return false;
    return slice.status === "live" || slice.status === "editorial";
  }

  function hasItems(list) {
    return Array.isArray(list) && list.length > 0;
  }

  function platform(ctx) {
    return (ctx && ctx.platform) || {};
  }

  function bundle(ctx) {
    return (ctx && ctx.bundle) || {};
  }

  function weather(ctx) {
    return platform(ctx).weather;
  }

  function daylight(ctx) {
    return platform(ctx).daylight;
  }

  function rainfall(ctx) {
    return platform(ctx).rainfall;
  }

  function observationsMatching(p, pattern) {
    var obs = p.observations;
    if (!sliceReady(obs) || !hasItems(obs.items)) return [];
    return obs.items.filter(function (item) {
      var haystack = ((item.title || "") + " " + (item.body || "")).toLowerCase();
      return pattern.test(haystack);
    });
  }

  function speciesGroups(p) {
    var watch = p.phenology && p.phenology.watch;
    var RI = global.WDS && (global.WDS.researchIntegrity || global.WDS.provenance);
    function gl(key) {
      return RI && RI.groupLabel ? RI.groupLabel(key) : key;
    }
    if (watch && (hasItems(watch.activeNow) || hasItems(watch.ending) || hasItems(watch.comingSoon))) {
      return [
        hasItems(watch.activeNow) ? { label: gl("activeNow"), items: watch.activeNow } : null,
        hasItems(watch.ending) ? { label: gl("ending"), items: watch.ending } : null,
        hasItems(watch.comingSoon) ? { label: gl("comingSoon"), items: watch.comingSoon } : null
      ].filter(Boolean);
    }
    var sp = p.species;
    if (sliceReady(sp)) {
      return [
        hasItems(sp.active) ? { label: gl("activeNow"), items: sp.active } : null,
        hasItems(sp.ending) ? { label: gl("ending"), items: sp.ending } : null,
        hasItems(sp.comingSoon) ? { label: gl("comingSoon"), items: sp.comingSoon } : null
      ].filter(Boolean);
    }
    return null;
  }

  function formatRainfall(rainfall) {
    if (!rainfall || !rainfall.recent) return null;
    var r = rainfall.recent;
    var parts = [];
    if (r.summary) parts.push(r.summary);
    if (r.amount != null) {
      parts.push(r.amount + " " + (r.unit || "in") + " in " + (r.periodDays || 7) + " days");
    }
    return parts.join(" · ");
  }

  function fieldryLocalStats() {
    try {
      var raw = localStorage.getItem("waypoint-fieldry-observations-v1");
      if (!raw) return null;
      var list = JSON.parse(raw);
      if (!Array.isArray(list)) return null;
      var species = {};
      var counties = {};
      var recent = list.slice().sort(function (a, b) {
        return String(b.recordedAt || "").localeCompare(String(a.recordedAt || ""));
      }).slice(0, 3);
      list.forEach(function (obs) {
        var sp = obs.taxon && (obs.taxon.commonName || obs.taxon.scientificName);
        if (sp) species[sp.toLowerCase()] = true;
        var c = obs.location && obs.location.county;
        if (c) counties[c.toLowerCase()] = true;
      });
      return {
        total: list.length,
        speciesCount: Object.keys(species).length,
        countyCount: Object.keys(counties).length,
        recent: recent
      };
    } catch (e) {
      return null;
    }
  }

  function favoriteLocations() {
    try {
      var raw = localStorage.getItem("waypoint-dashboard-favorites-v1");
      if (!raw) return [];
      var list = JSON.parse(raw);
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function recentSpeciesViews() {
    try {
      var raw = localStorage.getItem("waypoint-wskb-recent-v1");
      if (!raw) return [];
      var list = JSON.parse(raw);
      return Array.isArray(list) ? list.slice(0, 5) : [];
    } catch (e) {
      return [];
    }
  }

  function tagFromSource(source) {
    if (source === "live") return { label: "Live", className: "wdb-widget__tag--live" };
    if (source === "placeholder") return { label: "Preview", className: "wdb-widget__tag--preview" };
    if (source === "local") return { label: "Local", className: "wdb-widget__tag--local" };
    return { label: "Editorial", className: "wdb-widget__tag--editorial" };
  }

  function liveMount(kind, summary) {
    return {
      status: "loading",
      mountKind: kind,
      tag: tagFromSource("live"),
      summary: summary || "Loading live data…"
    };
  }

  function editorialReady(summary, body, items, link) {
    var data = {
      status: "ready",
      tag: tagFromSource("editorial"),
      summary: summary || body
    };
    if (body) data.body = body;
    if (items) data.items = items;
    if (link) data.link = link;
    return data;
  }

  function previewData(summary, placeholder, items) {
    return {
      status: "placeholder",
      tag: tagFromSource("placeholder"),
      summary: summary,
      placeholder: placeholder,
      items: items
    };
  }

  function wxConditions(ctx) {
    var w = weather(ctx);
    if (sliceReady(w) && w.conditions) return w.conditions;
    return null;
  }

  function speciesActiveItems(p, limit, filter) {
    var sp = p.species;
    if (!sliceReady(sp) || !hasItems(sp.active)) return [];
    var list = sp.active;
    if (filter) list = list.filter(filter);
    return list.slice(0, limit || 5).map(function (s) {
      return s.name + (s.note ? " — " + s.note : "");
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardWidgetData = {
    sliceReady: sliceReady,
    hasItems: hasItems,
    platform: platform,
    bundle: bundle,
    weather: weather,
    daylight: daylight,
    rainfall: rainfall,
    observationsMatching: observationsMatching,
    speciesGroups: speciesGroups,
    speciesActiveItems: speciesActiveItems,
    formatRainfall: formatRainfall,
    fieldryLocalStats: fieldryLocalStats,
    favoriteLocations: favoriteLocations,
    recentSpeciesViews: recentSpeciesViews,
    tagFromSource: tagFromSource,
    liveMount: liveMount,
    editorialReady: editorialReady,
    previewData: previewData,
    wxConditions: wxConditions
  };
})(window);
