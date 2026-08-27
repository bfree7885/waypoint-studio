/**
 * Dashboard Ambient — normalized snapshot composer (Phase 1).
 *
 * Pure adapter: reads already-hydrated platform + place context.
 * Does not fetch. Does not invent measurements, events, or opportunity scores.
 * Persistence and change detection live in sibling modules. This composer
 * still does not fetch, persist, or invent measurements.
 */
(function (global) {
  "use strict";

  var SCHEMA_VERSION = 1;
  var MAX_DEVELOPING = 4;

  function api(name) {
    return global.WDS && global.WDS[name] ? global.WDS[name] : null;
  }

  function asDate(v) {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    var d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  function num(v) {
    if (v == null) return null;
    if (typeof v === "number" && isFinite(v)) return v;
    if (typeof v === "object" && v.value != null) return num(v.value);
    var n = Number(v);
    if (isFinite(n)) return n;
    n = parseFloat(String(v).replace(/[^\d.-]/g, ""));
    return isFinite(n) ? n : null;
  }

  function weatherPkg(platform) {
    var wx = platform && platform.weatherRef;
    if (!wx || !wx.meta || wx.meta.isPlaceholder) return null;
    return wx;
  }

  function isWeatherLive(platform) {
    return !!weatherPkg(platform);
  }

  function isoNow(now) {
    var d = asDate(now) || new Date();
    return d.toISOString();
  }

  function minutesUntil(iso, now) {
    var t = asDate(iso);
    if (!t) return null;
    return Math.round((t.getTime() - now.getTime()) / 60000);
  }

  function formatClock(iso, timezone) {
    var d = asDate(iso);
    if (!d) return null;
    try {
      return d.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        timeZone: timezone || undefined
      });
    } catch (e) {
      try {
        return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
      } catch (e2) {
        return null;
      }
    }
  }

  function formatDuration(mins) {
    if (mins == null || !isFinite(mins)) return null;
    var abs = Math.abs(Math.round(mins));
    var h = Math.floor(abs / 60);
    var m = abs % 60;
    if (h <= 0) return m + " min";
    if (m === 0) return h + (h === 1 ? " hr" : " hrs");
    return h + "h " + m + "m";
  }

  function providerLabel(raw) {
    if (!raw) return null;
    var s = String(raw);
    if (/open-?meteo/i.test(s)) return "Open-Meteo";
    if (/nws|weather\.gov/i.test(s)) return "NWS";
    return s;
  }

  function mapSeverity(sev) {
    var s = String(sev || "info").toLowerCase();
    if (s === "high" || s === "urgent" || s === "warning" || s === "extreme") return "urgent";
    if (s === "elevated" || s === "attention" || s === "moderate" || s === "severe") return "attention";
    return "routine";
  }

  function levelRank(level) {
    var l = String(level || "").toLowerCase();
    if (l === "excellent" || l === "high") return 4;
    if (l === "good" || l === "moderate") return 3;
    if (l === "fair") return 2;
    if (l === "poor" || l === "low") return 1;
    if (l === "unavailable" || l === "unknown") return 0;
    return 0;
  }

  function composePlace(placeContext, platform) {
    var ctx = placeContext || {};
    var lat = num(ctx.lat != null ? ctx.lat : ctx.latitude);
    var lng = num(ctx.lng != null ? ctx.lng : ctx.longitude);
    var label = ctx.placeLabel || ctx.displayTitle || ctx.name || null;
    var trust = String(ctx.trust || "waiting").toLowerCase();
    if (trust === "pending") trust = "waiting";
    if (!label) {
      label = "Place not set";
      if (trust === "live" || trust === "cached" || trust === "estimated") trust = "waiting";
    }
    var tz =
      ctx.timezone ||
      (platform && platform.timezone) ||
      (platform && platform.daylight && platform.daylight.timezone) ||
      null;
    return {
      label: label,
      lat: lat,
      lng: lng,
      timezone: tz,
      trust: trust,
      source: ctx.source || null
    };
  }

  function composeConditions(platform, place, now) {
    var wx = weatherPkg(platform);
    var stale = !!(platform && platform.meta && (platform.meta.stale || platform.meta.fromCache));
    var daylight = (platform && platform.daylight) || {};
    var tz = place.timezone || daylight.timezone || null;

    if (!platform) {
      return {
        status: "waiting",
        stale: false,
        summary: null,
        temperatureF: null,
        apparentTemperatureF: null,
        windMph: null,
        precipChancePct: null,
        precipitating: null,
        headline: "Waiting for conditions",
        detail: "Live weather has not arrived yet.",
        daylight: {
          status: "unknown",
          headline: "Daylight unknown",
          sunriseLabel: null,
          sunsetLabel: null,
          remainingLabel: null
        },
        moon: { status: "unknown", phaseLabel: null, illuminationPct: null }
      };
    }

    if (!wx) {
      var wxMeta = platform.weatherRef && platform.weatherRef.meta;
      var unavailable = wxMeta && wxMeta.isPlaceholder;
      return {
        status: unavailable ? "waiting" : "unavailable",
        stale: stale,
        summary: null,
        temperatureF: null,
        apparentTemperatureF: null,
        windMph: null,
        precipChancePct: null,
        precipitating: null,
        headline: "Conditions unavailable",
        detail: unavailable
          ? "Weather is still settling for this place."
          : "Live weather could not be read for this place.",
        daylight: composeDaylight(daylight, now, tz),
        moon: composeMoon(daylight)
      };
    }

    var cur = wx.current || {};
    var tempF = num(cur.temperature != null ? cur.temperature : cur.tempF);
    var windMph = cur.wind ? num(cur.wind.speed) : num(cur.windSpeed);
    var precip =
      cur.precipitation && cur.precipitation.probability != null
        ? num(cur.precipitation.probability)
        : num(cur.precipProb);
    var precipAmt = cur.precipitation ? num(cur.precipitation.amount) : num(cur.precipAmount);
    var apparent = num(cur.feelsLike != null ? cur.feelsLike : cur.apparentTemperature);
    var summary = (cur.conditions && cur.conditions.summary) || cur.conditions || null;
    if (summary && typeof summary !== "string") summary = summary.summary || null;
    var precipitating = false;
    var summaryText = summary ? String(summary) : "";
    if (precipAmt != null && precipAmt > 0) precipitating = true;
    else if (/rain|snow|sleet|drizzle|thunder|storm|shower|hail/i.test(summaryText)) precipitating = true;
    var status = stale ? "cached" : "live";
    var supporting = [];
    if (windMph != null) supporting.push(Math.round(windMph) + " mph wind");
    if (precip != null) supporting.push(Math.round(precip) + "% rain chance");
    var headline =
      tempF != null ? Math.round(tempF) + "°" : summary ? String(summary) : "Conditions";
    var detail = supporting.length
      ? supporting.join(" · ")
      : summary
        ? ""
        : "Live weather is available.";

    return {
      status: status,
      stale: stale,
      summary: summary ? String(summary) : null,
      temperatureF: tempF,
      apparentTemperatureF: apparent,
      windMph: windMph,
      precipChancePct: precip,
      precipitating: precipitating,
      headline: headline,
      detail: detail,
      daylight: composeDaylight(daylight, now, tz),
      moon: composeMoon(daylight)
    };
  }

  function composeDaylight(daylight, now, tz) {
    var riseIso = daylight && (daylight.sunriseISO || daylight.rawSunrise || daylight.sunrise);
    var setIso = daylight && (daylight.sunsetISO || daylight.rawSunset || daylight.sunset);
    var riseLabel =
      (daylight && daylight.sunriseFormatted) || formatClock(riseIso, tz);
    var setLabel = (daylight && daylight.sunsetFormatted) || formatClock(setIso, tz);
    var rise = asDate(riseIso);
    var set = asDate(setIso);
    if (!rise || !set) {
      return {
        status: "unknown",
        headline: "Daylight unknown",
        sunriseLabel: riseLabel,
        sunsetLabel: setLabel,
        remainingLabel: null
      };
    }
    var day = now.getTime() >= rise.getTime() && now.getTime() < set.getTime();
    if (day) {
      var untilSet = minutesUntil(setIso, now);
      return {
        status: "day",
        headline: "Daylight",
        sunriseLabel: riseLabel,
        sunsetLabel: setLabel,
        remainingLabel: untilSet != null ? formatDuration(untilSet) + " until sunset" : null
      };
    }
    var untilRise = minutesUntil(riseIso, now);
    if (untilRise != null && untilRise < 0) {
      /* After sunset: next sunrise is tomorrow — duration still useful if ISO is today. */
      untilRise = null;
    }
    return {
      status: "night",
      headline: "Night",
      sunriseLabel: riseLabel,
      sunsetLabel: setLabel,
      remainingLabel: untilRise != null ? formatDuration(untilRise) + " until sunrise" : setLabel
        ? "Sunset was " + setLabel
        : null
    };
  }

  function composeMoon(daylight) {
    if (!daylight) {
      return { status: "unknown", phaseLabel: null, illuminationPct: null };
    }
    var phase = daylight.moonPhase || null;
    var illum = num(daylight.moonIllumination);
    if (!phase && illum == null) {
      return { status: "unknown", phaseLabel: null, illuminationPct: null };
    }
    return {
      status: "ready",
      phaseLabel: phase ? String(phase) : null,
      illuminationPct: illum
    };
  }

  function sourceFromEvidence(evidence) {
    if (!evidence || !evidence.length) return "intel";
    var src = evidence[0] && evidence[0].source;
    if (/nws/i.test(String(src || ""))) return "nws";
    if (/weather/i.test(String(src || ""))) return "weather";
    if (/daylight|computed/i.test(String(src || ""))) return "daylight";
    return src || "intel";
  }

  function collectHappening(platform, place, now) {
    var Intel = api("dashboardRebuildIntel");
    if (!Intel || typeof Intel.analyze !== "function" || !platform) return [];
    try {
      var analysis = Intel.analyze(platform, place, now);
      var list = (analysis && analysis.happeningNow) || [];
      return list.map(function (s) {
        return {
          id: s.id,
          kind: s.category === "alerts" ? "alert" : "happening",
          title: s.title,
          detail: s.summary || "",
          severity: mapSeverity(s.severity),
          score: s.score != null ? s.score : null,
          observedAt: isoNow(now),
          sourceId: sourceFromEvidence(s.evidence),
          evidence: s.evidence || []
        };
      });
    } catch (e) {
      return [];
    }
  }

  function collectEvents(platform, place, now, catalog) {
    var Events = api("dashboardRebuildEvents");
    if (!Events || typeof Events.resolveEvents !== "function") return [];
    try {
      var list = Events.resolveEvents({
        platform: platform,
        location: place,
        placeContext: place,
        now: now,
        catalog: catalog || null
      });
      return (list || []).map(function (item) {
        var sev = "attention";
        if (item.state === "happening") sev = "attention";
        if (item.state === "upcoming" || item.state === "soon") sev = "attention";
        return {
          id: "event:" + (item.id || item.title),
          kind: "event",
          title: item.title,
          detail: (item.copy && item.copy.lede) || item.kicker || "",
          severity: sev,
          kicker: item.kicker || null,
          observedAt: isoNow(now),
          sourceId: "natural-events",
          evidence: []
        };
      });
    } catch (e) {
      return [];
    }
  }

  function alertsTrust(platform) {
    var al = platform && platform.alerts;
    if (!al) return "unknown";
    if (al.status === "unavailable") return "unavailable";
    if (al.status === "empty") return "empty";
    if (al.status === "live") {
      return al.items && al.items.length ? "active" : "empty";
    }
    if (al.items && al.items.length) return "active";
    if (al.status) return String(al.status);
    return "unknown";
  }

  function eventsCatalogReady(options) {
    if (options && options.catalog) return true;
    var NE = api("naturalEvents");
    if (!NE) return true;
    return !!(NE.getCatalog && NE.getCatalog());
  }

  function composeDeveloping(platform, place, now, happening, events, options) {
    var items = [];
    var seen = Object.create(null);
    function push(item) {
      if (!item || !item.title || seen[item.id]) return;
      seen[item.id] = true;
      items.push(item);
    }
    happening.forEach(push);
    events.forEach(push);
    items = items.slice(0, MAX_DEVELOPING);

    var weatherLive = isWeatherLive(platform);
    var alerts = alertsTrust(platform);
    var catalogReady = eventsCatalogReady(options);
    var hasAlert = items.some(function (it) {
      return it.kind === "alert" || /warning|emergency|severe/i.test(String(it.title || "") + " " + String(it.detail || ""));
    });
    var hasUrgent = hasAlert || items.some(function (it) {
      return it.severity === "urgent";
    });
    var hasAttention = items.some(function (it) {
      return it.severity === "attention" || it.severity === "urgent";
    });

    if (hasUrgent) {
      return {
        state: "urgent",
        headline: items[0].title,
        detail: items[0].detail || "An official alert or high-severity signal is active.",
        items: items,
        gaps: []
      };
    }
    if (hasAttention || items.length) {
      return {
        state: "attention",
        headline: items[0].title,
        detail: items[0].detail || "Something nearby deserves a look.",
        items: items,
        gaps: []
      };
    }

    var gaps = [];
    if (!platform) gaps.push("weather");
    else if (!weatherLive) gaps.push("weather");
    if (alerts === "unknown" || alerts === "unavailable") gaps.push("alerts");
    if (!catalogReady) gaps.push("events");

    if (gaps.length) {
      var detail;
      if (gaps.length === 1 && gaps[0] === "events") {
        detail =
          "No ranked weather signals. The natural-event catalog has not loaded, so we cannot say the sky calendar is quiet.";
      } else if (gaps.length === 1 && gaps[0] === "alerts") {
        detail = "Weather looks routine. Official alerts could not load for this place.";
      } else if (!weatherLive) {
        detail = "Conditions are still settling — we cannot yet say whether anything is developing.";
      } else {
        detail = "Some sources have not loaded. We cannot yet say whether anything is developing.";
      }
      return {
        state: "unknown",
        headline: "Not enough to say",
        detail: detail,
        items: [],
        gaps: gaps
      };
    }

    return {
      state: "quiet",
      headline: "Nothing important is developing",
      detail: "No significant weather, alerts, or natural events are active or approaching.",
      items: [],
      gaps: []
    };
  }

  function analyzeSky(platform) {
    var Sky = api("skyDashboardIntel");
    var wx = weatherPkg(platform);
    if (!Sky || typeof Sky.analyze !== "function" || !wx) return null;
    try {
      return Sky.analyze(wx, platform);
    } catch (e) {
      return null;
    }
  }

  function pickPhotography(sky, daylight, now) {
    if (!sky) return null;
    var sunriseMins = minutesUntil(
      daylight && (daylight.sunriseISO || daylight.rawSunrise || daylight.sunrise),
      now
    );
    var sunsetMins = minutesUntil(
      daylight && (daylight.sunsetISO || daylight.rawSunset || daylight.sunset),
      now
    );
    if (sunriseMins != null && sunriseMins > -45 && sunriseMins < 150 && sky.sunriseQuality) {
      return { id: "photography-sunrise", window: "sunrise", verdict: sky.sunriseQuality };
    }
    /* Include the hour after sunset so evening still names tonight's sky, not tomorrow's dawn. */
    if (sunsetMins != null && sunsetMins > -120 && sunsetMins < 180 && sky.sunsetQuality) {
      return { id: "photography-sunset", window: "sunset", verdict: sky.sunsetQuality };
    }
    if (
      sky.fogPotential &&
      (sky.fogPotential.level === "high" || sky.fogPotential.level === "moderate")
    ) {
      return { id: "photography-fog", window: "fog", verdict: sky.fogPotential };
    }
    var candidates = [
      sky.sunriseQuality && { id: "photography-sunrise", window: "sunrise", verdict: sky.sunriseQuality },
      sky.sunsetQuality && { id: "photography-sunset", window: "sunset", verdict: sky.sunsetQuality }
    ].filter(Boolean);
    candidates.sort(function (a, b) {
      return levelRank(b.verdict.level) - levelRank(a.verdict.level);
    });
    return candidates[0] || null;
  }

  function composeOpportunities(platform, now) {
    var sky = analyzeSky(platform);
    var daylight = (platform && platform.daylight) || {};
    var weatherLive = isWeatherLive(platform);
    var out = [];

    var photo = pickPhotography(sky, daylight, now);
    if (!weatherLive) {
      out.push({
        id: "photography",
        domain: "photography",
        status: "unknown",
        headline: "Unknown",
        detail: "Photography conditions need live weather. None is available yet.",
        level: null,
        sourceId: "sky-intel"
      });
    } else if (!photo || !photo.verdict) {
      out.push({
        id: "photography",
        domain: "photography",
        status: "unknown",
        headline: "Unknown",
        detail: "Sky intelligence could not be derived from the current weather package.",
        level: null,
        sourceId: "sky-intel"
      });
    } else {
      out.push({
        id: photo.id,
        domain: "photography",
        status: "ready",
        headline: photo.verdict.headline,
        detail: photo.verdict.detail || "",
        level: photo.verdict.level,
        window: photo.window,
        sourceId: "sky-intel"
      });
    }

    if (!weatherLive || !sky || !sky.nightPhotography) {
      out.push({
        id: "astronomy",
        domain: "astronomy",
        status: "unknown",
        headline: "Unknown",
        detail: weatherLive
          ? "Night-sky photography needs moon and cloud data that has not settled."
          : "Night-sky conditions need live weather.",
        level: null,
        sourceId: "sky-intel"
      });
    } else {
      var night = sky.nightPhotography;
      out.push({
        id: "astronomy-night",
        domain: "astronomy",
        status: "ready",
        headline: night.headline,
        detail: night.detail || "",
        level: night.level,
        sourceId: "sky-intel"
      });
    }

    out.push({
      id: "foraging",
      domain: "foraging",
      status: "unknown",
      headline: "Unknown",
      detail:
        "Dashboard does not yet have a validated forage signal for this place. No species scores are shown.",
      level: null,
      sourceId: null
    });

    out.push({
      id: "sheds",
      domain: "sheds",
      status: "unknown",
      headline: "Unknown",
      detail:
        "Shed presence is not inferred from Dashboard weather. Open Sheds when you want the field map.",
      level: null,
      sourceId: null
    });

    return out;
  }

  function composeSources(platform, snapshotBits) {
    var sources = [];
    var wx = weatherPkg(platform);
    if (wx && wx.meta) {
      sources.push({
        id: "weather",
        label: providerLabel(wx.meta.provider || wx.meta.source) || "Weather",
        trust: snapshotBits.conditions && snapshotBits.conditions.status === "cached" ? "cached" : "live",
        usedFor: ["conditions", "opportunities"]
      });
    } else {
      sources.push({
        id: "weather",
        label: "Weather",
        trust: "unavailable",
        usedFor: ["conditions"]
      });
    }

    var alerts = alertsTrust(platform);
    sources.push({
      id: "nws",
      label: "NWS alerts",
      trust: alerts === "active" || alerts === "empty" ? "live" : alerts === "unavailable" ? "unavailable" : "unknown",
      usedFor: ["signals"]
    });

    sources.push({
      id: "daylight",
      label: "Daylight / moon",
      trust:
        snapshotBits.conditions &&
        snapshotBits.conditions.daylight &&
        snapshotBits.conditions.daylight.status !== "unknown"
          ? "computed"
          : "unknown",
      usedFor: ["conditions"]
    });

    var Sky = api("skyDashboardIntel");
    sources.push({
      id: "sky-intel",
      label: "Sky intelligence",
      trust: wx && Sky ? "derived" : "unavailable",
      usedFor: ["opportunities"]
    });

    sources.push({
      id: "intel",
      label: "Happening Now",
      trust: wx ? "derived" : "unavailable",
      usedFor: ["signals"]
    });

    var NE = api("naturalEvents");
    var catalog = NE && NE.getCatalog && NE.getCatalog();
    sources.push({
      id: "natural-events",
      label: "Natural events catalog",
      trust: catalog ? "catalog" : "unknown",
      usedFor: ["signals"]
    });

    return sources;
  }

  function compose(options) {
    options = options || {};
    var platform = options.platform || null;
    var placeContext = options.placeContext || options.location || {};
    var now = asDate(options.now) || new Date();
    var place = composePlace(placeContext, platform);
    var conditions = composeConditions(platform, place, now);
    var happening = collectHappening(platform, placeContext, now);
    var events = collectEvents(platform, placeContext, now, options.catalog || null);
    var developing = composeDeveloping(platform, placeContext, now, happening, events, options);
    var opportunities = composeOpportunities(platform, now);
    var signals = happening.concat(events);
    var snapshot = {
      schemaVersion: SCHEMA_VERSION,
      capturedAt: isoNow(now),
      place: place,
      conditions: conditions,
      developing: developing,
      opportunities: opportunities,
      signals: signals,
      sources: [],
      meta: {
        weatherLive: isWeatherLive(platform),
        stale: !!(platform && platform.meta && (platform.meta.stale || platform.meta.fromCache)),
        history: false,
        changeDetection: false
      }
    };
    snapshot.sources = composeSources(platform, snapshot);
    return snapshot;
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardRebuildAmbientSnapshot = {
    version: "1.5.0",
    SCHEMA_VERSION: SCHEMA_VERSION,
    compose: compose
  };
})(typeof window !== "undefined" ? window : global);
