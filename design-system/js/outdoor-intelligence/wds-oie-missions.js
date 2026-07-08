/**
 * OIE mission engine — curiosity-driven outdoor activities from conditions.
 */
(function (global) {
  "use strict";

  var C = global.WDS && global.WDS.oieCore;
  var b = C ? C.block : function (x) { return x; };

  var MISSIONS = [
    { type: "Photography", title: "Photograph moving water", body: "Find a creek or small fall. Use 1/4 s shutter for silk water or 1/500 s to freeze droplets — compare both.", why: "Shutter speed is the primary creative lever on water.", tags: ["photo", "water", "rain"] },
    { type: "Weather", title: "Watch clouds before sunset", body: "Spend ten minutes watching the western sky. Sketch cloud types and note whether they grow or flatten.", why: "Cloud evolution forecasts tomorrow's weather faster than apps once you learn patterns.", tags: ["any", "clear"] },
    { type: "Ecology", title: "Listen for frogs after dark", body: "Stand near wetland or pond at dusk for five minutes. Count distinct calls.", why: "Amphibian calls indicate wetland health and season.", tags: ["dusk", "water", "rain"] },
    { type: "Botany", title: "Find one native flower", body: "Identify one flower to genus if you can — photograph leaf, stem, and bloom together.", why: "Three-part photos build identification skill.", tags: ["spring", "summer"] },
    { type: "Ecology", title: "Observe one pollinator", body: "Watch one flower for three minutes. Note every insect that visits.", why: "Pollinator specialization links plants to broader food webs.", tags: ["summer"] },
    { type: "Walking", title: "Walk twenty minutes without headphones", body: "Note one smell, one sound, and one texture.", why: "Sensory walks build outdoor attention faster than distance goals.", tags: ["any", "walking"] },
    { type: "Photography", title: "Photograph reflections", body: "Frame sky and foreground in still water.", why: "Reflections teach symmetry and exposure.", tags: ["photo", "water", "calm"] },
    { type: "Birding", title: "Five-minute sound map", body: "List every bird call and its compass direction.", why: "Sound maps beat scanning alone in dense cover.", tags: ["dawn", "any"] },
    { type: "Tracking", title: "Look for deer tracks", body: "Search soft ground along trail edges. Note direction and freshness.", why: "Tracks reveal movement corridors.", tags: ["mud", "any"] },
    { type: "Photography", title: "Watch sunset", body: "Arrive 20 minutes early. Stay until last color fades.", why: "Sunset trains color temperature reading.", tags: ["clear", "photo"] },
    { type: "Botany", title: "Notice milkweed", body: "Check milkweed leaves for eggs or caterpillars.", why: "Host plants connect insects to conservation stories.", tags: ["summer"] },
    { type: "Nature journaling", title: "One square meter study", body: "Draw one square meter and label every living thing in ten minutes.", why: "Small plots reveal hidden complexity.", tags: ["any"] },
    { type: "Conservation", title: "Leave No Trace audit", body: "Pick up three litter items; note one impact you could avoid next time.", why: "Stewardship compounds across visits.", tags: ["any"] },
    { type: "Weather", title: "Observe cloud types", body: "Name three cloud forms and watch one for fifteen minutes.", why: "Cloud literacy is field weather forecasting.", tags: ["any"] },
    { type: "Hiking", title: "Pace check on a climb", body: "Count breaths per 20 steps uphill. Slow until you can speak in sentences.", why: "Pacing prevents overheating and keeps observation quality high.", tags: ["hiking"] }
  ];

  function dayIndex(date, offset) {
    date = date || new Date();
    var start = new Date(date.getFullYear(), 0, 0);
    return (Math.floor((date - start) / 86400000) + (offset || 0)) % MISSIONS.length;
  }

  function scoreMission(m, ctx) {
    var score = 0;
    if (!ctx) return score;
    if (ctx.isStorm && /hiking|water|climb/i.test(m.title)) score -= 10;
    if (ctx.isStorm && m.type === "Safety") score += 5;
    if (ctx.isDiffuse && m.tags.indexOf("photo") >= 0) score += 3;
    if (ctx.wind != null && ctx.wind < 8 && m.tags.indexOf("water") >= 0) score += 2;
    if (ctx.isRain && m.tags.indexOf("rain") >= 0) score += 3;
    if (ctx.isClear && m.tags.indexOf("clear") >= 0) score += 2;
    if (ctx.wind != null && ctx.wind < 5 && m.tags.indexOf("calm") >= 0) score += 2;
    if (ctx.season === "spring" && m.tags.indexOf("spring") >= 0) score += 2;
    if (ctx.season === "summer" && m.tags.indexOf("summer") >= 0) score += 2;
    if (ctx.hour >= 17 && /sunset|dusk|frog/i.test(m.title)) score += 3;
    if (ctx.hour < 9 && m.tags.indexOf("dawn") >= 0) score += 3;
    return score;
  }

  function generate(ctx, count) {
    count = count || 4;
    ctx = ctx || {};
    var picked = [];
    var used = {};
    var ranked = MISSIONS.map(function (m, i) {
      return { m: m, i: i, score: scoreMission(m, ctx) + (dayIndex(new Date(), i) % 3) };
    }).sort(function (a, b) { return b.score - a.score; });

    if (ctx.isStorm) {
      picked.push({
        type: "Safety",
        title: "Storm-day protocol",
        body: "Postpone exposed hikes. Practice reading radar and identifying safe retreat routes from shelter.",
        why: "Building storm literacy makes future field days safer.",
        trust: "Editorial"
      });
      used["Storm-day protocol"] = true;
    }

    ranked.forEach(function (r) {
      if (picked.length >= count) return;
      if (used[r.m.title]) return;
      if (ctx.isStorm && /hiking|climb/i.test(r.m.title)) return;
      picked.push({
        type: r.m.type,
        title: r.m.title,
        summary: r.m.type + " · " + r.m.title,
        body: r.m.body,
        why: r.m.why,
        trust: "Editorial"
      });
      used[r.m.title] = true;
    });

    for (var j = 0; picked.length < count && j < MISSIONS.length; j++) {
      var m = MISSIONS[dayIndex(new Date(), j)];
      if (used[m.title]) continue;
      picked.push({
        type: m.type,
        title: m.title,
        summary: m.type + " · " + m.title,
        body: m.body,
        why: m.why,
        trust: "Editorial"
      });
      used[m.title] = true;
    }

    return picked.slice(0, count);
  }

  function educationalFallback(count) {
    count = count || 3;
    return MISSIONS.slice(0, count).map(function (m) {
      return {
        type: m.type,
        title: m.title,
        summary: m.type + " · " + m.title,
        body: m.body,
        why: m.why,
        trust: "Educational"
      };
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.oieMissions = {
    generate: generate,
    educationalFallback: educationalFallback,
    all: MISSIONS
  };
})(window);
