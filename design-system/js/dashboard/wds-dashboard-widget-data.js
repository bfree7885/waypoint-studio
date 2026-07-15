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

  function airQuality(ctx) {
    return platform(ctx).airQuality || null;
  }

  function alerts(ctx) {
    return platform(ctx).alerts || null;
  }

  function nwsAlertsMatching(ctx, pattern) {
    var pkg = alerts(ctx);
    if (!pkg || !hasItems(pkg.items)) return [];
    if (pkg.status !== "live" && pkg.status !== "empty") return [];
    var NWS = global.WDS && global.WDS.nwsAlerts;
    if (NWS && NWS.filterByPattern) return NWS.filterByPattern(pkg, pattern);
    return pkg.items.filter(function (item) {
      var hay = ((item.event || "") + " " + (item.headline || "")).toLowerCase();
      return pattern.test(hay);
    });
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

  function Rel() {
    return global.WDS && global.WDS.dashboardReliability;
  }

  function tagFromSource(source) {
    var R = Rel();
    if (R && R.tagFor) {
      if (source === "unavailable") return R.tagFor("provider-unavailable");
      if (source === "placeholder") return R.tagFor("estimated");
      if (source === "success") return R.tagFor("live");
      if (TAGS_SOURCE_OK(source)) return R.tagFor(source);
    }
    if (source === "live") return { label: "Live", className: "wdb-widget__tag--live" };
    if (source === "loading") return { label: "Loading", className: "wdb-widget__tag--loading" };
    if (source === "estimated") return { label: "Estimated", className: "wdb-widget__tag--estimated" };
    if (source === "unavailable") return { label: "Provider Unavailable", className: "wdb-widget__tag--unavailable" };
    if (source === "placeholder") return { label: "Estimated", className: "wdb-widget__tag--estimated" };
    if (source === "local") return { label: "Local", className: "wdb-widget__tag--local" };
    if (source === "editorial") return { label: "Regional", className: "wdb-widget__tag--editorial" };
    if (source === "partial") return { label: "Partial", className: "wdb-widget__tag--partial" };
    if (source === "cached") return { label: "Cached", className: "wdb-widget__tag--cached" };
    if (source === "offline") return { label: "Offline", className: "wdb-widget__tag--offline" };
    if (source === "error") return { label: "Error", className: "wdb-widget__tag--error" };
    return { label: "Estimated", className: "wdb-widget__tag--estimated" };
  }

  function TAGS_SOURCE_OK(source) {
    return /^(live|loading|estimated|partial|cached|offline|error|local|editorial|provider-unavailable)$/.test(String(source || ""));
  }

  function tagFromSlice(slice) {
    if (!slice) return tagFromSource("placeholder");
    if (slice.status === "live") return tagFromSource("live");
    if (slice.goldenHourStatus === "estimated" || slice.blueHourStatus === "estimated") return tagFromSource("estimated");
    if (slice.status === "editorial") return tagFromSource("editorial");
    return tagFromSource("placeholder");
  }

  function daylightData(ctx) {
    var dl = platform(ctx).daylight;
    if (!dl) return null;
    if (dl.status === "live" || dl.status === "editorial") return dl;
    return null;
  }

  function liveMount(kind, summary) {
    var R = Rel();
    var waiting = R && R.waitingCopy ? R.waitingCopy(kind) : "Waiting for outdoor data…";
    return {
      status: "loading",
      mountKind: kind,
      tag: tagFromSource("loading"),
      summary: summary || waiting
    };
  }

  function intelMount(kind, summary) {
    var R = Rel();
    var waiting = R && R.waitingCopy ? R.waitingCopy(kind) : "Waiting for outdoor data…";
    return {
      status: "loading",
      mountKind: kind,
      tag: tagFromSource("loading"),
      summary: summary || waiting
    };
  }

  function editorialReady(summary, body, items, link, tag) {
    var data = {
      status: "ready",
      tag: tag || tagFromSource("editorial"),
      summary: summary || body
    };
    if (body) data.body = body;
    if (items) data.items = items;
    if (link) data.link = link;
    return data;
  }

  function notYetAvailable(summary, detail, category) {
    var EF = global.WDS && global.WDS.educationalFallback;
    var topic = EF && EF.topicFromCategory ? EF.topicFromCategory(category) : "weather";
    var data = {
      status: "unavailable",
      tag: tagFromSource("provider-unavailable"),
      summary: summary || "Provider temporarily unavailable",
      body: detail || "Provider temporarily unavailable"
    };
    if (EF && EF.widgetData) {
      var edu = EF.widgetData(topic, { summary: summary, widgetId: category, pendingLive: false });
      data.educationalHtml = edu.educationalHtml;
      data.educationalTopic = edu.educationalTopic;
    }
    return data;
  }

  function previewData(summary, placeholder, items, category) {
    return notYetAvailable(summary || "Data currently unavailable", placeholder || "Data currently unavailable", category);
  }

  function educationalData(topicKey, options) {
    var EF = global.WDS && global.WDS.educationalFallback;
    if (EF && EF.widgetData) return EF.widgetData(topicKey, options);
    return { status: "empty", summary: options && options.summary };
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
    alerts: alerts,
    airQuality: airQuality,
    nwsAlertsMatching: nwsAlertsMatching,
    observationsMatching: observationsMatching,
    speciesGroups: speciesGroups,
    speciesActiveItems: speciesActiveItems,
    formatRainfall: formatRainfall,
    fieldryLocalStats: fieldryLocalStats,
    favoriteLocations: favoriteLocations,
    recentSpeciesViews: recentSpeciesViews,
    tagFromSource: tagFromSource,
    tagFromSlice: tagFromSlice,
    daylightData: daylightData,
    liveMount: liveMount,
    intelMount: intelMount,
    editorialReady: editorialReady,
    previewData: previewData,
    notYetAvailable: notYetAvailable,
    educationalData: educationalData,
    wxConditions: wxConditions
  };
})(window);
