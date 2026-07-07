/**
 * Today's Challenge — one outdoor activity, rotated daily.
 */
(function (global) {
  "use strict";

  var CHALLENGES = [
    { type: "Photography", title: "Find three textures in one frame", body: "Photograph bark, water, and stone without moving more than ten steps. Notice how side light reveals texture.", why: "Texture exercises your eye for detail and teaches how light direction shapes surfaces." },
    { type: "Birding", title: "Five-minute sound map", body: "Stand still for five minutes. Sketch or list every bird call you hear and its direction.", why: "Sound mapping builds field awareness faster than scanning with binoculars alone." },
    { type: "Hiking", title: "Pace check on a climb", body: "On your next uphill section, count breaths per 20 steps. Slow until you can speak in full sentences.", why: "Pacing prevents overheating and keeps observation quality high on ascents." },
    { type: "Ecology", title: "Edge habitat survey", body: "Walk a forest edge or field margin. Record three plants and one sign of animal use (track, scat, browse).", why: "Edges concentrate biodiversity — they are where species from two habitats meet." },
    { type: "Nature journaling", title: "One square meter study", body: "Choose one square meter of ground. Draw it and label every living thing you can identify in ten minutes.", why: "Small-plot studies reveal complexity that wide views hide." },
    { type: "Photography", title: "Blue hour bracket", body: "Arrive 25 minutes before sunrise or after sunset. Make three exposures: -1, 0, +1 EV on the same composition.", why: "Blue hour has narrow dynamic range — bracketing teaches exposure judgment for low light." },
    { type: "Birding", title: "Silhouette ID", body: "Identify one bird by shape and flight pattern only — no color or song.", why: "Silhouette skills help in dawn fog and backlit conditions." },
    { type: "Hiking", title: "Water crossing protocol", body: "At your next stream, find the widest, shallowest crossing. Unbuckle your pack hip belt before entering.", why: "Most trail injuries near water involve slips — protocol reduces entrapment risk." },
    { type: "Ecology", title: "Phenology pin", body: "Photograph one bud, bloom, or leaf-out stage with date and GPS. Compare to last year if you have records.", why: "Phenology is one of the clearest climate signals you can record locally." },
    { type: "Nature journaling", title: "Weather sketch", body: "Draw cloud types and note wind direction, temperature, and humidity at one location.", why: "Linking sky form to felt conditions builds weather literacy in the field." },
    { type: "Photography", title: "Foreground anchor", body: "Every shot today needs a foreground element within six feet of your lens.", why: "Foreground anchors create depth and pull viewers into the frame." },
    { type: "Conservation", title: "Leave No Trace audit", body: "On your outing, pick up three pieces of litter and note one trail impact you could avoid next time.", why: "Small stewardship actions compound across millions of outdoor visits." }
  ];

  function dayIndex(date) {
    date = date || new Date();
    var start = new Date(date.getFullYear(), 0, 0);
    var diff = date - start;
    var day = Math.floor(diff / 86400000);
    return day % CHALLENGES.length;
  }

  function build(ctx) {
    var c = CHALLENGES[dayIndex()];
    var dateLabel = new Date().toLocaleDateString(undefined, {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric"
    });
    return {
      status: "ready",
      tag: { label: "Editorial", className: "wdb-widget__tag--editorial" },
      summary: c.type + " · " + c.title,
      body: c.body,
      items: ["Why: " + c.why],
      metaFooter: "Waypoint editorial · " + dateLabel
    };
  }

  function generate(ctx) {
    return build(ctx);
  }

  var MISSIONS = [
    { type: "Walking", title: "Walk 20 minutes", body: "Take a twenty-minute walk without headphones. Note one smell, one sound, and one texture.", why: "Short walks build daily outdoor rhythm without gear or planning.", tags: ["any", "walking"] },
    { type: "Photography", title: "Photograph reflections", body: "Find still water — a puddle, pond, or creek bend. Frame sky and foreground in the reflection.", why: "Reflections teach symmetry and exposure — water acts as a natural polarizer.", tags: ["photo", "water"] },
    { type: "Ecology", title: "Listen for frogs", body: "Stand near wetland, pond, or creek at dusk for five minutes. Count distinct calls.", why: "Amphibian calls indicate wetland health — timing follows temperature and rain.", tags: ["dusk", "water"] },
    { type: "Botany", title: "Find one native flower", body: "Identify one flower to genus if you can — photograph leaf, stem, and bloom together.", why: "Native blooms support specialist pollinators — three-part photos aid identification.", tags: ["spring", "summer"] },
    { type: "Weather", title: "Observe cloud types", body: "Sketch or name three cloud forms you see. Note whether they grow or flatten over 15 minutes.", why: "Cloud evolution forecasts weather faster than apps when you learn the patterns.", tags: ["any"] },
    { type: "Tracking", title: "Look for deer tracks", body: "Search soft ground along trail edges for hoof prints. Note direction and freshness (sharp vs washed).", why: "Track freshness reveals recent movement corridors — edges and water are reliable.", tags: ["mud", "any"] },
    { type: "Photography", title: "Watch sunset", body: "Arrive 20 minutes before sunset. Watch the western horizon until the last color fades.", why: "Sunset trains you to read atmospheric dust, cloud height, and color temperature.", tags: ["clear", "photo"] },
    { type: "Botany", title: "Notice milkweed", body: "Find milkweed or another host plant. Check undersides of leaves for eggs or caterpillars.", why: "Host plants connect insects to the broader food web — one leaf can tell a season's story.", tags: ["summer"] },
    { type: "Birding", title: "Five-minute sound map", body: "Stand still five minutes. List every bird call and its compass direction.", why: "Sound maps build situational awareness faster than scanning alone.", tags: ["dawn", "any"] },
    { type: "Nature journaling", title: "One square meter study", body: "Choose one square meter. Draw it and label every living thing you can in ten minutes.", why: "Small plots reveal complexity wide views hide.", tags: ["any"] },
    { type: "Hiking", title: "Pace check on a climb", body: "On the next uphill, count breaths per 20 steps. Slow until you can speak in full sentences.", why: "Pacing prevents overheating and keeps observation quality high.", tags: ["hiking"] },
    { type: "Conservation", title: "Leave No Trace audit", body: "Pick up three pieces of litter and note one trail impact you could avoid next time.", why: "Small stewardship actions compound across millions of visits.", tags: ["any"] }
  ];

  function missionDayIndex(date, offset) {
    date = date || new Date();
    var start = new Date(date.getFullYear(), 0, 0);
    var day = Math.floor((date - start) / 86400000);
    return (day + (offset || 0)) % MISSIONS.length;
  }

  function missionFromEntry(entry) {
    return {
      type: entry.type,
      title: entry.title,
      summary: entry.type + " · " + entry.title,
      body: entry.body,
      why: entry.why
    };
  }

  function generateMissions(ctx, intel, count) {
    count = count || 4;
    var picked = [];
    var used = {};
    var primary = pickForConditions(ctx, intel);
    if (primary) {
      picked.push({
        type: (primary.summary && primary.summary.split(" · ")[0]) || "Mission",
        title: (primary.summary && primary.summary.split(" · ").slice(1).join(" · ")) || primary.summary,
        summary: primary.summary,
        body: primary.body,
        why: primary.items && primary.items[0] ? primary.items[0].replace(/^Why:\s*/i, "") : ""
      });
      used[primary.summary] = true;
    }
    var cond = ((intel && intel.recommendation && intel.recommendation.verdict) || "").toLowerCase();
    var photoLevel = intel && intel.photography && intel.photography.level;
    var hikeLevel = intel && intel.hiking && intel.hiking.level;
    for (var i = 0; picked.length < count && i < MISSIONS.length * 2; i += 1) {
      var entry = MISSIONS[missionDayIndex(new Date(), i)];
      if (used[entry.title]) continue;
      if (cond === "wait" && /hiking|climb/i.test(entry.title)) continue;
      if (photoLevel === "excellent" && entry.tags && entry.tags.indexOf("photo") >= 0) {
        picked.unshift(missionFromEntry(entry));
        used[entry.title] = true;
        continue;
      }
      if ((hikeLevel === "excellent" || hikeLevel === "good") && entry.tags && entry.tags.indexOf("hiking") >= 0 && picked.length < count) {
        picked.push(missionFromEntry(entry));
        used[entry.title] = true;
        continue;
      }
      picked.push(missionFromEntry(entry));
      used[entry.title] = true;
    }
    return picked.slice(0, count);
  }

  function pickForConditions(ctx, intel) {
    var base = build(ctx);
    if (!intel) return base;
    if (intel.recommendation && intel.recommendation.verdict === "wait") {
      return {
        status: "ready",
        tag: { label: "Editorial", className: "wdb-widget__tag--editorial" },
        summary: "Safety · Storm-day protocol",
        body: "Postpone exposed hikes. Practice reading radar and identifying safe retreat routes from a window or porch.",
        items: ["Why: Building storm literacy now makes future field days safer."],
        metaFooter: base.metaFooter
      };
    }
    if (intel.photography && intel.photography.level === "excellent") {
      return {
        status: "ready",
        tag: { label: "Editorial", className: "wdb-widget__tag--editorial" },
        summary: "Photography · Light study",
        body: "Today's diffuse or dramatic light favors forest and creek work. Shoot three frames of the same subject at −1, 0, +1 EV.",
        items: ["Why: Excellent light days are rare — bracketing teaches exposure judgment fast."],
        metaFooter: base.metaFooter
      };
    }
    if (intel.hiking && (intel.hiking.level === "excellent" || intel.hiking.level === "good")) {
      return {
        status: "ready",
        tag: { label: "Editorial", className: "wdb-widget__tag--editorial" },
        summary: "Hiking · Trail journal",
        body: "On your hike, note trail surface, mud depth, and one plant in bloom. Record time and weather at each stop.",
        items: ["Why: Conditions are favorable — pairing movement with observation builds field literacy."],
        metaFooter: base.metaFooter
      };
    }
    return base;
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardChallenge = {
    build: build,
    generate: generate,
    pickForConditions: pickForConditions,
    generateMissions: generateMissions,
    all: CHALLENGES,
    missions: MISSIONS
  };
})(window);
