/**
 * Outdoor Brief Intelligence Engine — interpretation over information.
 * Collects plugin observations → priority sort → theme dedupe → max 8 bullets
 * with High | Medium | Low confidence. No paid AI required.
 *
 * API: WDS.outdoorBriefEngine.generate(input)
 * Widget helper: takesForModule(moduleId, input) → 1–3 statements
 */
(function (global) {
  "use strict";

  var VERSION = "1.0.0";

  function registry() {
    return global.WDS && global.WDS.outdoorBriefRegistry;
  }

  function buildContext(input) {
    input = input || {};
    var model = input.model || input;
    return {
      model: model,
      weather: input.weather || model.weather || {},
      hourly: input.hourly || (model.weather && model.weather.hourly) || [],
      alerts: input.alerts || model.alerts || { items: [] },
      astronomy: input.astronomy || {
        daylight: model.daylight,
        moon: model.moon
      },
      photography: input.photography || model.photography || {},
      hiking: input.hiking || null,
      airQuality: input.airQuality || model.air || {},
      uv: input.uv != null ? input.uv : model.weather && model.weather.current && model.weather.current.uv,
      rivers: input.rivers || model.rivers || {},
      seasonal: input.seasonal || { season: model.season },
      trust: input.trust || (model.provider && model.provider.trust) || "partial",
      location: input.location || model.location || {},
      currentTime: input.currentTime ? new Date(input.currentTime) : new Date()
    };
  }

  /**
   * Priority score: band * 100 + confidence weight (High first within band).
   * Lower score = more important.
   */
  function priorityScore(obs) {
    var R = registry();
    var band = obs.priority != null ? Number(obs.priority) : 5;
    var confW = 1;
    if (obs.confidence === (R && R.CONFIDENCE.HIGH) || obs.confidence === "High") confW = 0;
    else if (obs.confidence === (R && R.CONFIDENCE.LOW) || obs.confidence === "Low") confW = 2;
    return band * 100 + confW;
  }

  function sortObservations(list) {
    return list.slice().sort(function (a, b) {
      return priorityScore(a) - priorityScore(b);
    });
  }

  /**
   * Keep first observation per theme (after priority sort). Exact text also deduped.
   */
  function dedupeThemes(list) {
    var seenTheme = {};
    var seenText = {};
    var out = [];
    list.forEach(function (obs) {
      if (!obs || !obs.text) return;
      var theme = String(obs.theme || obs.id || "").toLowerCase();
      var textKey = String(obs.text).toLowerCase().replace(/\s+/g, " ").trim();
      if (theme && seenTheme[theme]) return;
      if (seenText[textKey]) return;
      if (theme) seenTheme[theme] = true;
      seenText[textKey] = true;
      out.push(obs);
    });
    return out;
  }

  function trustNoteFor(ctx) {
    var trust = ctx.trust;
    var model = ctx.model || {};
    var weather = ctx.weather || {};
    if (trust === "offline") return "Offline — showing cached or incomplete cues only.";
    if (trust === "cached" || (model.provider && model.provider.fromCache && !weather.live)) {
      return "Cached data — live providers have not refreshed yet.";
    }
    if (
      trust === "partial" ||
      trust === "provider-unavailable" ||
      (!weather.live && trust !== "live")
    ) {
      return "Partial data — some providers are still loading or unavailable.";
    }
    return null;
  }

  function padMinimum(items, ctx, min, max) {
    var R = registry();
    var weather = ctx.weather || {};
    var out = items.slice();
    while (out.length < min && out.length < max) {
      var text = !weather.live
        ? "Waiting on live weather to refine outdoor guidance for this hour."
        : "Conditions look ordinary for the hour — use the selected widgets for detail.";
      var id = "pad-" + out.length;
      if (out.some(function (o) { return o.text === text; })) {
        text = "Re-check alerts and air quality if plans extend past midday.";
      }
      out.push(
        R.observation({
          id: id,
          theme: "pad-" + out.length,
          module: "core",
          priority: R.PRIORITY.ENVIRONMENT,
          confidence: R.CONFIDENCE.LOW,
          text: text,
          source: "engine"
        })
      );
      if (out.length >= min) break;
    }
    return out;
  }

  /**
   * @returns {{
   *   title: string,
   *   bullets: string[],
   *   items: object[],
   *   traces: object[],
   *   trustNote: string|null,
   *   count: number,
   *   generatedAt: string,
   *   maxBullets: number
   * }}
   */
  function generate(input) {
    var R = registry();
    if (!R) {
      return {
        title: "Today’s Outdoor Brief",
        bullets: [],
        items: [],
        traces: [],
        trustNote: "Intelligence engine not loaded.",
        count: 0,
        generatedAt: new Date().toISOString(),
        maxBullets: 8
      };
    }

    var ctx = buildContext(input);
    var max = R.MAX_BULLETS;
    var hasHazard = ((ctx.alerts && ctx.alerts.items) || []).length > 0;
    /* Soft cap stays at 8; hazards still compete via priority, not extra slots */
    var min = hasHazard ? 3 : 3;

    var collected = R.collectFromPlugins(ctx);
    collected = R.runEnrichers(collected, ctx);
    var ranked = dedupeThemes(sortObservations(collected));
    ranked = ranked.slice(0, max);
    if (ranked.length < min) {
      ranked = padMinimum(ranked, ctx, min, max).slice(0, max);
    }

    var bullets = ranked.map(function (o) {
      return o.statement || o.text + " [" + o.confidence + "]";
    });

    var traces = ranked.map(function (o) {
      return {
        rule: o.id,
        theme: o.theme,
        module: o.module,
        priority: o.priority,
        confidence: o.confidence,
        text: o.text,
        data: o.evidence || null
      };
    });

    return {
      title: "Today’s Outdoor Brief",
      bullets: bullets,
      items: ranked,
      traces: traces,
      trustNote: trustNoteFor(ctx),
      count: bullets.length,
      generatedAt: ctx.currentTime.toISOString(),
      maxBullets: max,
      engine: "outdoorBriefEngine",
      version: VERSION
    };
  }

  /**
   * Compatibility shape for Waypoint’s Take / V2 consumers.
   */
  function generateWaypointsTake(input) {
    var brief = generate(input);
    return {
      title: "Waypoint’s Take",
      bullets: brief.bullets,
      items: brief.items,
      traces: brief.traces,
      trustNote: brief.trustNote,
      count: brief.count,
      generatedAt: brief.generatedAt,
      engine: brief.engine
    };
  }

  /**
   * Widget-level Takes: up to 3 statements for a module (photography, trail, …).
   */
  function takesForModule(moduleId, input, limit) {
    limit = limit == null ? 3 : Math.min(3, Math.max(1, limit));
    var brief = generate(input);
    var mod = String(moduleId || "").toLowerCase();
    var categoryMap = {
      emergency: "emergency",
      alerts: "emergency",
      weather: "weather",
      photography: "photography",
      hiking: "trail",
      trail: "trail",
      rivers: "rivers",
      air: "air",
      astronomy: "astronomy",
      wildlife: "astronomy",
      travel: "weather",
      favorites: "core"
    };
    var want = categoryMap[mod] || mod;
    return brief.items
      .filter(function (o) {
        return o.module === want || o.theme === want;
      })
      .slice(0, limit)
      .map(function (o) {
        return o.statement || o.text + " [" + o.confidence + "]";
      });
  }

  /**
   * Pure helpers exposed for tests / docs.
   */
  function scoreAndSelect(observations, opts) {
    opts = opts || {};
    var R = registry();
    var max = opts.max != null ? opts.max : (R && R.MAX_BULLETS) || 8;
    return dedupeThemes(sortObservations(observations || [])).slice(0, max);
  }

  global.WDS = global.WDS || {};
  global.WDS.outdoorBriefEngine = {
    VERSION: VERSION,
    generate: generate,
    generateWaypointsTake: generateWaypointsTake,
    takesForModule: takesForModule,
    buildContext: buildContext,
    priorityScore: priorityScore,
    sortObservations: sortObservations,
    dedupeThemes: dedupeThemes,
    scoreAndSelect: scoreAndSelect
  };
})(typeof window !== "undefined" ? window : globalThis);
