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
      list.forEach(function (obs) {
        var sp = obs.taxon && (obs.taxon.commonName || obs.taxon.scientificName);
        if (sp) species[sp.toLowerCase()] = true;
        var c = obs.location && obs.location.county;
        if (c) counties[c.toLowerCase()] = true;
      });
      return {
        total: list.length,
        speciesCount: Object.keys(species).length,
        countyCount: Object.keys(counties).length
      };
    } catch (e) {
      return null;
    }
  }

  function tagFromSource(source) {
    if (source === "live") return { label: "Live", className: "wdb-widget__tag--live" };
    if (source === "placeholder") return { label: "Preview", className: "wdb-widget__tag--preview" };
    return { label: "Editorial", className: "wdb-widget__tag--editorial" };
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardWidgetData = {
    sliceReady: sliceReady,
    hasItems: hasItems,
    platform: platform,
    bundle: bundle,
    observationsMatching: observationsMatching,
    speciesGroups: speciesGroups,
    formatRainfall: formatRainfall,
    fieldryLocalStats: fieldryLocalStats,
    tagFromSource: tagFromSource
  };
})(window);
