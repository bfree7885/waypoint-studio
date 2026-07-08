/**
 * Outdoor Intelligence Engine — core reasoning primitives.
 * Every observation is a block: WHAT, WHY, WHY IT MATTERS, WHAT TO DO, WHAT TO LOOK FOR.
 */
(function (global) {
  "use strict";

  var VERSION = "1.0.0";

  function num(val) {
    if (val == null) return null;
    if (typeof val === "number" && isFinite(val)) return val;
    if (typeof val === "object" && val.value != null) return num(val.value);
    return null;
  }

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  function block(opts) {
    opts = opts || {};
    return {
      id: opts.id || null,
      category: opts.category || "general",
      tags: opts.tags || [],
      what: opts.what || "",
      why: opts.why || "",
      whyItMatters: opts.whyItMatters || opts.matters || "",
      whatToDo: opts.whatToDo || opts.doAction || "",
      whatToLookFor: opts.whatToLookFor || opts.watch || "",
      trust: opts.trust || "Estimated",
      source: opts.source || "",
      confidence: opts.confidence != null ? opts.confidence : confidenceFromTrust(opts.trust),
      text: opts.what || ""
    };
  }

  function confidenceFromTrust(trust) {
    var map = { Live: 0.95, Estimated: 0.75, Educational: 0.6, Editorial: 0.65, "Not yet available": 0.2 };
    return map[trust] != null ? map[trust] : 0.5;
  }

  function mergeBlocks(blocks, opts) {
    opts = opts || {};
    var sep = opts.separator || " ";
    var fields = ["what", "why", "whyItMatters", "whatToDo", "whatToLookFor"];
    var out = block({ category: opts.category, trust: opts.trust || "Estimated" });
    fields.forEach(function (f) {
      var parts = [];
      blocks.forEach(function (b) {
        if (b && b[f]) parts.push(b[f]);
      });
      out[f] = parts.filter(Boolean).join(sep);
    });
    out.text = out.what;
    if (blocks.length) {
      out.trust = blocks[0].trust;
      out.source = blocks.map(function (b) { return b.source; }).filter(Boolean).join(" · ");
      out.confidence = blocks.reduce(function (a, b) { return a + (b.confidence || 0.5); }, 0) / blocks.length;
    }
    return out;
  }

  function synthesizeProse(blocks, field, maxParts) {
    maxParts = maxParts || 3;
    var parts = [];
    blocks.forEach(function (b) {
      if (b && b[field] && parts.indexOf(b[field]) < 0) parts.push(b[field]);
    });
    return parts.slice(0, maxParts).join(". ") + (parts.length ? "." : "");
  }

  function applyRules(ctx, rules) {
    var matched = [];
    (rules || []).forEach(function (rule) {
      try {
        if (rule && typeof rule.when === "function" && rule.when(ctx)) {
          var result = typeof rule.block === "function" ? rule.block(ctx) : rule.block;
          if (!result) return;
          if (Array.isArray(result)) matched = matched.concat(result);
          else matched.push(Object.assign({ id: rule.id, category: rule.category, tags: rule.tags || [] }, result));
        }
      } catch (e) { /* rule failure must not break engine */ }
    });
    return matched;
  }

  function section(domain, blocks, fallback) {
    if (!blocks || !blocks.length) return fallback || null;
    return mergeBlocks(blocks, { category: domain });
  }

  function buildContext(input) {
    input = input || {};
    var platform = input.platform || {};
    var loc = input.location || {};
    var wx = platform.weatherRef;
    var cur = (wx && wx.current) || {};
    var today = (wx && wx.daily && wx.daily[0]) || {};
    var dl = platform.daylight;
    var month = new Date().getMonth() + 1;
    var lat = num(loc.lat != null ? loc.lat : (platform.location && platform.location.latitude));
    var cond = ((cur.conditions && cur.conditions.summary) || "").toLowerCase();
    var UN = global.WDS && global.WDS.usNational;

    var humidity = num(cur.humidity);
    var wind = cur.wind && num(cur.wind.speed);
    var temp = num(cur.temperature);
    var feels = num(cur.feelsLike) != null ? num(cur.feelsLike) : temp;
    var cloud = num(cur.cloudCover);
    var uv = num(cur.uvIndex);
    if (uv == null && today) uv = num(today.uvIndex);
    var pop = num(cur.precipitation && cur.precipitation.probability);
    if (pop == null && today.precipitation) pop = num(today.precipitation.probability);
    var precipAmt = today.precipitation && num(today.precipitation.amount && today.precipitation.amount);
    var aqi = platform.airQuality
      ? (platform.airQuality.usAqi != null ? platform.airQuality.usAqi : platform.airQuality.aqi)
      : null;

    var season;
    if (UN && UN.seasonLabel && lat != null) season = UN.seasonLabel(lat, month);
    else if (month >= 3 && month <= 5) season = "spring";
    else if (month >= 6 && month <= 8) season = "summer";
    else if (month >= 9 && month <= 11) season = "fall";
    else season = "winter";

    var national = !!(platform.meta && platform.meta.contentMode === "national-educational");
    var hasLiveWeather = !!(wx && wx.meta && !wx.meta.isPlaceholder);
    var hasLiveFeeds = !!(
      hasLiveWeather ||
      (platform.airQuality && platform.airQuality.status === "live") ||
      (platform.alerts && (platform.alerts.status === "live" || platform.alerts.status === "empty")) ||
      (platform.usgsWater && platform.usgsWater.nearest) ||
      (platform.daylight && (platform.daylight.status === "live" || platform.daylight.sunrise || platform.daylight.sunset)) ||
      (platform.meta && platform.meta.hydratedAt)
    );
    // Operational dashboards proceed with partial feeds — weather alone must not gate the load.
    var hasLive = hasLiveFeeds;
    var alerts = (platform.alerts && platform.alerts.items) || [];
    var species = (platform.species && platform.species.active) || [];
    var moonIllum = dl && dl.moonIllumination;

    return {
      platform: platform,
      location: loc,
      wx: wx,
      hasLive: hasLive,
      hasLiveWeather: hasLiveWeather,
      national: national,
      month: month,
      season: season,
      lat: lat,
      cond: cond,
      temp: temp,
      feels: feels,
      humidity: humidity,
      wind: wind,
      cloud: cloud,
      uv: uv,
      pop: pop,
      precipAmt: precipAmt,
      aqi: aqi,
      dl: dl,
      alerts: alerts,
      alertCount: alerts.length,
      species: species,
      moonIllum: moonIllum,
      usgs: platform.usgsWater,
      isFog: /fog|mist/.test(cond),
      isRain: /rain|drizzle|shower/.test(cond),
      isStorm: /thunder|lightning|storm/.test(cond),
      isClear: /clear|mainly clear/.test(cond),
      isSnow: /snow|ice|freez/.test(cond),
      isOvercast: /overcast/.test(cond) || (cloud != null && cloud > 75),
      isDiffuse: cloud != null && cloud >= 35 && cloud <= 85,
      hour: new Date().getHours()
    };
  }

  global.WDS = global.WDS || {};
  global.WDS.oieCore = {
    VERSION: VERSION,
    num: num,
    clamp: clamp,
    block: block,
    mergeBlocks: mergeBlocks,
    synthesizeProse: synthesizeProse,
    applyRules: applyRules,
    section: section,
    buildContext: buildContext,
    confidenceFromTrust: confidenceFromTrust
  };
})(window);
