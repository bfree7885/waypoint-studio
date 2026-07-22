/**
 * Outdoor OS — Waypoint Intelligence (Milestone 2).
 * PriorityRanker + interpretation: Happening / What matters / Best window.
 *
 * Deterministic, traced, never fabricates. Voice: quiet outdoor guide.
 * Spec budgets: Happening ≤30 words; Matters ≤3 × ≤14 words; Do primary ≤16 + alt ≤14.
 *
 * Authority: Manifesto → Screen Spec → Architecture Reset (PriorityRanker).
 */
(function (global) {
  "use strict";

  /* ─── utilities ─── */

  function wordCount(s) {
    return String(s || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
  }

  function clipWords(s, max) {
    var parts = String(s || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length <= max) return parts.join(" ");
    return parts.slice(0, max).join(" ");
  }

  function num(v) {
    if (v == null || v === "") return null;
    var n = Number(v);
    return isNaN(n) ? null : n;
  }

  function isNightLocal(now) {
    var h = (now || new Date()).getHours();
    return h < 5 || h >= 21;
  }

  function condStr(model) {
    return String((model.weather && model.weather.current && model.weather.current.conditions) || "").toLowerCase();
  }

  /** Rough dew point (°F) from temp + RH — estimate only; never present as observed. */
  function estimateDewPointF(tempF, rh) {
    tempF = num(tempF);
    rh = num(rh);
    if (tempF == null || rh == null || rh < 1 || rh > 100) return null;
    // Magnus approximation via Celsius
    var tC = (tempF - 32) * (5 / 9);
    var a = 17.27;
    var b = 237.7;
    var alpha = (a * tC) / (b + tC) + Math.log(rh / 100);
    var dpC = (b * alpha) / (a - alpha);
    return Math.round(dpC * (9 / 5) + 32);
  }

  /**
   * Prefer trusted provider dew point; else calculate only from fresh valid temp+RH.
   * Derived values are marked internally and never treated as observed.
   */
  function resolveDewPoint(model, flags) {
    flags = flags || {};
    var c = (model.weather && model.weather.current) || {};
    var providerDew = num(c.dewPointF);
    if (providerDew == null && flags.dewPointF != null) providerDew = num(flags.dewPointF);
    if (providerDew != null && providerDew >= -40 && providerDew <= 95) {
      return { value: Math.round(providerDew), derived: false, source: "provider" };
    }
    if (!model.weather || !model.weather.live) {
      return { value: null, derived: false, source: null, skipped: "not-live" };
    }
    if (flags.staleWeather || (model.provider && (model.provider.fromCache || model.provider.trust === "cached"))) {
      return { value: null, derived: false, source: null, skipped: "stale" };
    }
    var temp = c.tempF != null ? c.tempF : c.feelsF;
    var est = estimateDewPointF(temp, c.humidity);
    if (est == null) return { value: null, derived: false, source: null, skipped: "invalid" };
    return { value: est, derived: true, source: "calculated" };
  }

  function hourLabel(d) {
    if (!d || !d.toLocaleTimeString) return "";
    try {
      return d
        .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
        .toLowerCase()
        .replace(/\s/g, "");
    } catch (e) {
      return "";
    }
  }

  /** Parse a clock hour (0–23) from a display string; null if unparseable. */
  function parseClockHour(label) {
    if (!label) return null;
    var s = String(label);
    var m = s.match(/(\d{1,2})(?::(\d{2}))?\s*([ap]m)/i);
    if (!m) return null;
    var hr = Number(m[1]);
    var isPm = /pm/i.test(m[3]);
    if (hr === 12) hr = isPm ? 12 : 0;
    else if (isPm) hr += 12;
    return hr;
  }

  /**
   * Practical timing windows only — no false precision (e.g. 8:13–9:47).
   * Allowed bands: early morning, through late morning, before noon, early afternoon,
   * after 4 PM, near sunset, this evening. Exact sunrise/sunset strings stay as-is.
   */
  function practicalWindow(label, model, opts) {
    opts = opts || {};
    if (!label) return null;
    var s = String(label).trim();
    if (!s) return null;
    if (/sunrise|sunset|dawn|dusk/i.test(s) && opts.allowAstronomical !== false) {
      return clipWords(s.replace(/\s+/g, " "), 6);
    }
    var hr = parseClockHour(s);
    if (hr == null) {
      // Already a practical phrase?
      if (
        /early morning|late morning|before noon|early afternoon|after 4|near sunset|this evening|late afternoon|midday/i.test(
          s
        )
      ) {
        return clipWords(s, 5);
      }
      return clipWords(s.replace(/\s+/g, " "), 5);
    }
    if (hr < 8) return "early morning";
    if (hr < 11) return "through late morning";
    if (hr < 12) return "before noon";
    if (hr < 14) return "early afternoon";
    if (hr < 16) return "early afternoon";
    if (hr < 17) return "after 4 PM";
    if (hr < 19) {
      if (model && model.daylight && model.daylight.goldenHour) return "near sunset";
      return "after 4 PM";
    }
    if (hr < 21) return "near sunset";
    return "this evening";
  }

  function humanWindow(label) {
    return practicalWindow(label, null, { allowAstronomical: true });
  }

  function goldenPractical(dl) {
    if (!dl || !dl.goldenHour) return "near sunset";
    var g = String(dl.goldenHour);
    if (/sunrise|sunset/i.test(g)) return clipWords(g, 4);
    return "near sunset";
  }

  function goldenShort(dl) {
    return goldenPractical(dl);
  }

  /** Banned promotional / hype phrases (owner voice). */
  var BANNED_PHRASES = [
    /\bperfect\b/i,
    /\bamazing\b/i,
    /\bideal\b/i,
    /you should definitely/i,
    /don['’]t miss/i,
    /\badventure\b/i,
    /\bmust[- ]see\b/i,
    /\bepic\b/i
  ];

  function assertCalmVoice(text) {
    var s = String(text || "");
    for (var i = 0; i < BANNED_PHRASES.length; i++) {
      if (BANNED_PHRASES[i].test(s)) return false;
    }
    return true;
  }

  /* ─── rule catalog (exported for owner review) ─── */

  var RULES = [
    {
      id: "H1",
      domain: "happening",
      name: "Character from sky + feel + air motion",
      detail:
        "Headline uses sensory outdoor character (sky, temp band, wind), never raw provider sentence dump. Max 8 words."
    },
    {
      id: "H2",
      domain: "happening",
      name: "Support is consequence, not echo",
      detail:
        "Support line (≤18 words) states what the character means for being outside — trajectory or constraint — not a second weather label."
    },
    {
      id: "H3",
      domain: "happening",
      name: "Trajectory over snapshot",
      detail:
        "When hourly POP/temp/cloud show a clear shift (rain starting, clearing, heat peak), support names the shift."
    },
    {
      id: "H4",
      domain: "happening",
      name: "Hazard character wins",
      detail:
        "Storm, smoke/AQI, fog, flood-elevated water, or extreme heat/cold reshape the headline before mild comfort language."
    },
    {
      id: "H5",
      domain: "happening",
      name: "Night labeling",
      detail: "After dark, character and support speak to tonight vs tomorrow — never a noon picnic."
    },
    {
      id: "H6",
      domain: "happening",
      name: "Honest pending",
      detail: "Without live weather (and no usable cached feel), say conditions are still arriving — never invent sky."
    },
    {
      id: "M1",
      domain: "matters",
      name: "Alert outranks opportunity",
      detail: "Official NWS alerts always claim Matters #1 when present. Prefer ≤2 matters on alert-dominant days."
    },
    {
      id: "M2",
      domain: "matters",
      name: "Safety > change > opportunity",
      detail:
        "Rank: alerts → storms → flood/water → AQI/smoke → heat/cold → wind → UV/rain timing → light/photo → ordinary timing."
    },
    {
      id: "M3",
      domain: "matters",
      name: "Consequence phrasing",
      detail: "Each matter answers why care (limit exertion, avoid crossings, shade, wait for light) — not weather echo."
    },
    {
      id: "M4",
      domain: "matters",
      name: "Max three; prefer fewer",
      detail: "Never pad to 3 with trivia. Conflict days may use one item to name the tension."
    },
    {
      id: "M5",
      domain: "matters",
      name: "Omit unknown domains",
      detail: "No air/water/photo matter without live or honest derived signal for that domain."
    },
    {
      id: "M6",
      domain: "matters",
      name: "Conflict naming",
      detail: "When opportunity and hazard coexist (good light + poor air, clear + rising water), name the tension explicitly."
    },
    {
      id: "R1",
      domain: "ranking",
      name: "Activity ranking order",
      detail:
        "Safety/constraints → exceptional time-sensitive opportunity → broadly useful outdoor action → photography ONLY when genuinely notable photo advantage (light/cloud/fog/wildlife/seasonal/visibility/water). Ordinary calm days prefer a general outdoor recommendation (walk). No activity-preference UI in M2."
    },
    {
      id: "R2",
      domain: "ranking",
      name: "Heat primary threshold (conservative band)",
      detail:
        "Heat is primary when trusted feels/temp ≥90°F, or Heat Advisory/Excessive Heat Warning is active, or humid oppressive air (derived/provider dew ≥70°F) coincides with feels ≥88°F. Warm days below that band are not framed as heat limitation. Drought alone never equals avoid-outdoors."
    },
    {
      id: "D1",
      domain: "do",
      name: "One primary posture",
      detail: "Single imperative ≤16 words; include a practical timing window when timing drives the decision."
    },
    {
      id: "D2",
      domain: "do",
      name: "Alternate optional",
      detail: "At most one quieter alternate ≤14 words, prefixed Alternate:."
    },
    {
      id: "D3",
      domain: "do",
      name: "Safety-first Do on alert/storm/severe AQI",
      detail:
        "Storm Warning / Flood Warning / active flooding / severe AQI: postpone or constrain firmly. Flood Watch alone: precautionary water language — never stay-home unless warning or observed flooding justifies escalation."
    },
    {
      id: "D4",
      domain: "do",
      name: "Evidence from activity + signals",
      detail: "Primary Do must trace to activity suitability and/or ranked signals — never invented confidence."
    },
    {
      id: "D5",
      domain: "do",
      name: "Admit uncertainty",
      detail:
        "Material provider disagreement (timing/severity/safety/action) → plain uncertainty + resilient action. Minor differences stay silent in the triad (precedence/confidence only). Never name providers in Happening/Matters/Do."
    },
    {
      id: "D6",
      domain: "do",
      name: "No fake photo pitch",
      detail:
        "Do not recommend photography on ordinary calm/good-light days. Photography only when excellent/notable photo advantage is evidenced."
    },
    {
      id: "D7",
      domain: "do",
      name: "Night Do horizon",
      detail: "At night, primary names tomorrow’s stronger window; alternate may describe tonight’s quieter conditions."
    },
    {
      id: "D8",
      domain: "do",
      name: "Practical timing windows",
      detail:
        "Windows only when data supports. Use practical bands (early morning, through late morning, before noon, early afternoon, after 4 PM, near sunset, this evening). Exact astronomical sunrise/sunset OK. No false precision (8:13–9:47)."
    },
    {
      id: "D9",
      domain: "do",
      name: "Flood Watch precautionary wording",
      detail:
        "Preferred Flood Watch Do: Avoid low crossings and check local updates before heading near streams. Escalate only for Flood Warning or observed active flooding."
    },
    {
      id: "T1",
      domain: "trust",
      name: "Never fabricate",
      detail: "Missing domains omitted. No invented AQI, hometown, Live label, or golden-hour pitch."
    },
    {
      id: "T2",
      domain: "trust",
      name: "Provider conflict is information",
      detail:
        "Material disagreement → uncertainty language in triad without provider names. Minor differences → no triad clutter. Sources panel only for provider identity."
    },
    {
      id: "T3",
      domain: "trust",
      name: "Traces required",
      detail: "Every Happening/Matters/Do decision records rule ids and input keys used."
    },
    {
      id: "T4",
      domain: "trust",
      name: "Dew point honesty",
      detail:
        "Prefer trusted provider dew point. Else calculate only from fresh valid temp+RH; mark derived internally; never present as observed; use qualitative copy (e.g. humid air may support fog); skip if stale/invalid."
    },
    {
      id: "V1",
      domain: "voice",
      name: "Calm field voice",
      detail:
        "Calm, observational, specific, literate, brief, scientifically honest. Ban: Perfect/Amazing/Ideal (unless unusually strong evidence)/You should/Don’t miss/Adventure/homework/assignment/Do this/promotional filler. Pattern: Observation → consequence → possible window. Never assign tasks."
    }
  ];

  /* ─── signal extraction ─── */

  function hourlyTrajectory(model) {
    var hourly = (model.weather && model.weather.hourly) || [];
    var now = Date.now();
    var rainStart = null;
    var rainEase = null;
    var maxTemp = null;
    var maxTempAt = null;
    var maxUv = null;
    var maxUvAt = null;
    var clearing = false;
    var buildingCloud = false;
    var maxWind = null;

    hourly.forEach(function (h) {
      var t = h.time ? new Date(h.time) : null;
      if (!t) return;
      var ts = t.getTime();
      if (ts < now - 3600000 || ts > now + 86400000) return;
      var pop = h.precipitation ? num(h.precipitation.probability) : null;
      var temp = num(h.temperature);
      var wind = h.wind ? num(h.wind.speed) : null;
      var uv = num(h.uvIndex);
      var cloud = num(h.cloudCover);
      if (pop != null && pop >= 50 && !rainStart) rainStart = t;
      if (rainStart && pop != null && pop < 30) rainEase = t;
      if (temp != null && (maxTemp == null || temp > maxTemp)) {
        maxTemp = temp;
        maxTempAt = t;
      }
      if (uv != null && (maxUv == null || uv > maxUv)) {
        maxUv = uv;
        maxUvAt = t;
      }
      if (wind != null && (maxWind == null || wind > maxWind)) maxWind = wind;
      if (cloud != null && cloud < 40 && t.getHours() >= 11) clearing = true;
      if (cloud != null && cloud >= 70 && t.getHours() >= 12 && t.getHours() <= 18) buildingCloud = true;
    });

    return {
      rainStart: rainStart,
      rainEase: rainEase,
      maxTemp: maxTemp,
      maxTempAt: maxTempAt,
      maxUv: maxUv,
      maxUvAt: maxUvAt,
      maxWind: maxWind,
      clearing: clearing,
      buildingCloud: buildingCloud
    };
  }

  function uncertaintyState(model, flags) {
    flags = flags || {};
    var reasons = [];
    var level = "low"; // low | moderate | high
    var provider = model.provider || {};
    var trust = provider.trust || "unknown";
    var materialConflict = !!(flags.materialConflict || flags.materialProviderConflict);
    var minorDiff = !!(flags.minorProviderDifference || flags.minorProviderDiff);

    if (!model.weather || !model.weather.live) {
      reasons.push("weather-not-live");
      level = "high";
    }
    if (provider.fromCache || trust === "cached" || flags.staleWeather) {
      reasons.push("cached");
      if (level === "low") level = "moderate";
    }
    if (trust === "partial" || trust === "offline" || trust === "unknown") {
      reasons.push("trust-" + trust);
      level = trust === "offline" ? "high" : level === "low" ? "moderate" : level;
    }
    if (flags.partialProviderFailure) {
      reasons.push("partial-provider-failure");
      if (level === "low") level = "moderate";
    }
    // Material disagreement (timing/severity/safety/action) elevates; minor diffs stay quiet.
    if (materialConflict || ((flags.providerConflict || flags.conflictingProviders) && !minorDiff)) {
      reasons.push("provider-conflict");
      level = "high";
      materialConflict = true;
    } else if (minorDiff) {
      reasons.push("minor-provider-diff");
      // Do not elevate triad uncertainty for minor differences.
    }
    if (flags.lowForecastConfidence) {
      reasons.push("low-forecast-confidence");
      if (level === "low") level = "moderate";
      else level = "high";
    }
    // Domain disagreement: current precip vs hourly → material
    var c = (model.weather && model.weather.current) || {};
    var traj = hourlyTrajectory(model);
    var raining = /rain|drizzle|shower|thunder|storm/.test(condStr(model));
    if (raining && traj.rainStart == null && c.precipProb != null && c.precipProb < 30) {
      reasons.push("precip-signal-conflict");
      materialConflict = true;
      if (level === "low") level = "moderate";
      else level = "high";
    }
    if (model.weather && model.weather.live && model.air && !model.air.live && model.air.aqi == null) {
      reasons.push("air-missing");
      if (level === "low") level = "moderate";
    }
    return { level: level, reasons: reasons, materialConflict: materialConflict, minorDiff: minorDiff };
  }

  function classifyFloodAlert(event, headline) {
    var text = String(event || "") + " " + String(headline || "");
    if (!/flood/i.test(text)) return null;
    if (/warning|emergency|flash flood warning/i.test(text)) return "flood-warning";
    if (/watch/i.test(text)) return "flood-watch";
    return "flood-watch";
  }

  function extractSignals(model, briefing, activities, flags) {
    flags = flags || {};
    var signals = [];
    var c = (model.weather && model.weather.current) || {};
    var cond = condStr(model);
    var temp = c.feelsF != null ? c.feelsF : c.tempF;
    var dewInfo = resolveDewPoint(model, flags);
    var dew = dewInfo.value;
    var traj = hourlyTrajectory(model);
    var unc = uncertaintyState(model, flags);
    var night = isNightLocal(flags.now ? new Date(flags.now) : undefined);

    function add(sig) {
      if (!sig || !sig.id) return;
      signals.push(sig);
    }

    // Alerts — distinguish Flood Watch (precautionary) vs Flood Warning / active flooding
    var alerts = (model.alerts && model.alerts.items) || [];
    var floodAlertKind = null;
    if (alerts.length) {
      var top = alerts.slice().sort(function (a, b) {
        function rank(s) {
          s = String(s || "").toLowerCase();
          if (/extreme|severe/.test(s)) return 0;
          if (/moderate|warning/.test(s)) return 1;
          if (/minor|watch|advisory/.test(s)) return 2;
          return 3;
        }
        return rank(a.severity) - rank(b.severity);
      })[0];
      floodAlertKind = classifyFloodAlert(top.event, top.headline);
      var alertKind = floodAlertKind || "alert";
      add({
        id: "alert",
        kind: alertKind,
        weight: 100,
        panel: "alerts",
        consequence: clipWords((top.event || "Official alert") + " shapes today’s plan", 14),
        inputs: {
          event: top.event,
          severity: top.severity,
          headline: top.headline,
          floodClass: floodAlertKind
        },
        rules: ["M1", "M2", "D3"]
      });
    }

    // Storms
    if (/thunder|lightning|storm/.test(cond) || flags.storm) {
      add({
        id: "storm",
        kind: "storm",
        weight: 95,
        panel: "conditions",
        consequence: "Storm timing — stay near shelter while cells pass",
        inputs: { conditions: c.conditions },
        rules: ["M2", "M3", "H4"]
      });
    }

    // Rain active / approaching — distinguish light vs heavy
    var heavyRain =
      flags.heavyRain ||
      /heavy rain|downpour|torrential/i.test(cond) ||
      (c.precipAmt != null && c.precipAmt >= 0.3);
    if (/rain|drizzle|shower/.test(cond) && !/thunder|storm/.test(cond)) {
      add({
        id: heavyRain ? "rain-heavy" : "rain-now",
        kind: "rain",
        weight: heavyRain ? 85 : 78,
        panel: "conditions",
        consequence: heavyRain
          ? "Heavy rain — expect pooling water and poor footing"
          : "Light rain — wet surfaces and shorter outdoor windows",
        inputs: { conditions: c.conditions, precipProb: c.precipProb, heavy: !!heavyRain },
        rules: ["M2", "M3"]
      });
    } else if (traj.rainStart && !night) {
      add({
        id: "rain-later",
        kind: "rain",
        weight: 72,
        panel: "conditions",
        consequence: "Rain risk rises later — plan an earlier window",
        inputs: { rainStart: traj.rainStart.toISOString() },
        rules: ["M2", "H3", "D8"]
      });
    }

    // Snow / ice
    if (/snow|sleet|ice|wintry|freez/.test(cond) || flags.snow) {
      add({
        id: "snow",
        kind: "snow",
        weight: 86,
        panel: "conditions",
        consequence: "Snow or ice underfoot — slow travel and watch footing",
        inputs: { conditions: c.conditions },
        rules: ["M2", "M3", "H4"]
      });
    }

    // Fog — likely vs uncertain
    var fogLikely =
      /fog|mist/.test(cond) || (c.visibilityMi != null && c.visibilityMi < 1) || flags.fog;
    var fogUncertain =
      flags.fogUncertain ||
      (!fogLikely &&
        dew != null &&
        dew >= 60 &&
        c.humidity != null &&
        c.humidity >= 90 &&
        c.windMph != null &&
        c.windMph <= 5 &&
        (c.visibilityMi == null || c.visibilityMi >= 2));
    if (fogLikely) {
      add({
        id: "fog",
        kind: "fog",
        weight: 74,
        panel: "conditions",
        consequence: "Low visibility — keep routes short and familiar",
        inputs: { conditions: c.conditions, visibilityMi: c.visibilityMi },
        rules: ["M2", "H4"]
      });
    } else if (fogUncertain) {
      add({
        id: "fog-uncertain",
        kind: "fog-uncertain",
        weight: 55,
        panel: "conditions",
        consequence: dewInfo.derived
          ? "Humid air may support fog — verify visibility before long drives"
          : "Humid still air may support fog — verify visibility locally",
        inputs: {
          dewPointF: dew,
          dewDerived: !!dewInfo.derived,
          humidity: c.humidity,
          visibilityMi: c.visibilityMi
        },
        rules: ["M3", "T4"]
      });
    }

    // Air quality / smoke
    var aqi = model.air && model.air.live ? num(model.air.aqi) : null;
    if (aqi == null && flags.aqi != null) aqi = num(flags.aqi);
    var smoke =
      flags.wildfireSmoke ||
      /smoke|haze|wildfire/i.test(cond) ||
      /smoke|haze/i.test(String((model.air && model.air.category) || ""));
    if (aqi != null && aqi >= 150) {
      add({
        id: "aqi-poor",
        kind: smoke ? "wildfire-smoke" : "aqi",
        weight: 92,
        panel: "air",
        consequence: clipWords(
          (smoke ? "Smoke-thick air" : "Poor air") + " (AQI " + Math.round(aqi) + ") — limit outdoor exertion",
          14
        ),
        inputs: { aqi: aqi, smoke: !!smoke, category: model.air && model.air.category },
        rules: ["M2", "M3", "M5"]
      });
    } else if (aqi != null && aqi >= 100) {
      add({
        id: "aqi-elevated",
        kind: smoke ? "wildfire-smoke" : "aqi",
        weight: 84,
        panel: "air",
        consequence: clipWords(
          (smoke ? "Hazy smoke" : "Elevated AQI") + " (" + Math.round(aqi) + ") — ease longer efforts",
          14
        ),
        inputs: { aqi: aqi, smoke: !!smoke },
        rules: ["M2", "M3", "M5"]
      });
    }

    // Heat / cold — R2 conservative band (≥90°F feels; or ≥88°F with oppressive humidity)
    var heatAlert = alerts.some(function (a) {
      return /heat advisory|excessive heat/i.test(String(a.event || "") + " " + String(a.headline || ""));
    });
    var oppressive = dew != null && dew >= 70;
    if (heatAlert || (temp != null && temp >= 90) || (temp != null && temp >= 88 && oppressive)) {
      add({
        id: "heat",
        kind: "heat",
        weight: 88,
        panel: "conditions",
        consequence: "Heat stress risk — shade, water, and shorter midday effort",
        inputs: { feelsF: temp, dewPointF: dew, dewDerived: !!dewInfo.derived, heatAlert: !!heatAlert },
        rules: ["M2", "M3", "R2"]
      });
    } else if (temp != null && temp <= 25) {
      add({
        id: "cold",
        kind: "cold",
        weight: 87,
        panel: "conditions",
        consequence: "Hard cold — layer for wind and keep outings short",
        inputs: { feelsF: temp },
        rules: ["M2", "M3"]
      });
    }

    // Wind
    if (c.windMph != null && c.windMph >= 25) {
      add({
        id: "wind",
        kind: "wind",
        weight: 82,
        panel: "conditions",
        consequence: clipWords("Strong wind (~" + Math.round(c.windMph) + " mph) on open ground", 14),
        inputs: { windMph: c.windMph, windGust: c.windGust },
        rules: ["M2", "M3"]
      });
    } else if (c.windMph != null && c.windMph >= 18) {
      add({
        id: "breeze",
        kind: "wind",
        weight: 48,
        panel: "conditions",
        consequence: "Breezy open ground — expect more effort on ridges",
        inputs: { windMph: c.windMph },
        rules: ["M3"]
      });
    }

    // UV
    var uv = c.uv != null ? c.uv : traj.maxUv;
    if (uv != null && uv >= 8 && !night) {
      add({
        id: "uv-very-high",
        kind: "uv",
        weight: 70,
        panel: "light",
        consequence: "Very high UV — shade longer midday walks",
        inputs: { uv: uv, at: traj.maxUvAt },
        rules: ["M2", "M3", "D8"]
      });
    } else if (uv != null && uv >= 6 && !night) {
      add({
        id: "uv-high",
        kind: "uv",
        weight: 62,
        panel: "light",
        consequence: "UV climbs after late morning — shade for longer walks",
        inputs: { uv: uv },
        rules: ["M2"]
      });
    }

    // Dew point / humidity comfort — qualitative only; never present derived as observed
    if (dew != null && dew >= 70) {
      add({
        id: "oppressive-humid",
        kind: "humidity",
        weight: 58,
        panel: "conditions",
        consequence: "Oppressive humidity — lighter effort and more water",
        inputs: {
          dewPointF: dew,
          humidity: c.humidity,
          derived: !!dewInfo.derived,
          source: dewInfo.source,
          observed: !dewInfo.derived
        },
        rules: ["M3", "T4"]
      });
    } else if (dew != null && dew >= 65) {
      add({
        id: "muggy",
        kind: "humidity",
        weight: 42,
        panel: "conditions",
        consequence: dewInfo.derived
          ? "Humid air may feel heavier than the thermometer suggests"
          : "Muggy air — pace slower than the thermometer suggests",
        inputs: {
          dewPointF: dew,
          humidity: c.humidity,
          derived: !!dewInfo.derived,
          source: dewInfo.source,
          observed: !dewInfo.derived
        },
        rules: ["M3", "T4"]
      });
    }

    // Rivers / flood / drought
    var rivers = model.rivers || {};
    var activeFlooding = !!flags.activeFlooding;
    if (rivers.live && rivers.sites && rivers.sites[0]) {
      var site = rivers.sites[0];
      var trend = String(site.trend || "").toLowerCase();
      if (
        /flood|rapid|\bhigh\b|ris(e|ing)|above normal/.test(trend) ||
        flags.floodWatch ||
        flags.floodWarning ||
        activeFlooding
      ) {
        if (/flood|above flood|major flood/i.test(trend) || flags.floodWarning || activeFlooding) {
          activeFlooding = true;
        }
        add({
          id: "river-high",
          kind: activeFlooding || floodAlertKind === "flood-warning" ? "flood-active" : "flood",
          weight: 90,
          panel: "water",
          consequence: activeFlooding || floodAlertKind === "flood-warning"
            ? "Active high water — avoid flooded roads and crossings"
            : "Nearby water rising or high — avoid low crossings",
          inputs: { site: site.name, trend: site.trend, stageFt: site.stageFt, activeFlooding: activeFlooding },
          rules: ["M2", "M3", "M5", "D9"]
        });
      } else if (/drought|low|below normal/.test(trend) || flags.drought) {
        add({
          id: "river-low",
          kind: "drought",
          weight: 45,
          panel: "water",
          consequence: "Low water nearby — expect exposed banks and warm shallows",
          inputs: { site: site.name, trend: site.trend },
          rules: ["M5", "R2"]
        });
      }
    } else if (flags.floodWarning || flags.activeFlooding) {
      add({
        id: "flood-active-flag",
        kind: "flood-active",
        weight: 90,
        panel: "water",
        consequence: "Active flooding risk — stay clear of flooded roads and streams",
        inputs: { flag: "floodWarning" },
        rules: ["M2", "D9"]
      });
    } else if (flags.floodWatch) {
      add({
        id: "flood-flag",
        kind: "flood-watch",
        weight: 88,
        panel: "water",
        consequence: "Flood Watch — avoid low crossings; check local updates",
        inputs: { flag: "floodWatch" },
        rules: ["M2", "D9"]
      });
    } else if (flags.drought) {
      add({
        id: "drought-flag",
        kind: "drought",
        weight: 44,
        panel: "water",
        consequence: "Dry spell — pack water; soils and shallows may run thin",
        inputs: { flag: "drought" },
        rules: ["M5", "R2"]
      });
    }

    // Photography / light — notable advantage only for Do ranking (R1/D6)
    var photo = model.photography || {};
    var dl = model.daylight || {};
    var photoLevel = String(photo.level || "").toLowerCase();
    var photoGood =
      photo.live &&
      (/excellent|good/.test(photoLevel) || flags.excellentPhotography) &&
      !/poor|unavailable|unknown/.test(photoLevel);
    var photoPoor = flags.poorPhotography || /poor/.test(photoLevel);
    var photoExcellent =
      flags.excellentPhotography || (photoGood && photoLevel.indexOf("excellent") >= 0);
    // Notable photo advantage: excellent level, or explicit notable flags (fog light, wildlife, water glare, etc.)
    var photoNotable =
      photoExcellent ||
      !!(flags.notablePhotoAdvantage || flags.exceptionalPhotography);

    // Skip light/photo opportunity when a stronger outdoor hazard already owns the day
    // (air hazards still allow photo for conflict naming below).
    var hazardOwns =
      /thunder|storm|rain|drizzle|shower|snow|sleet|ice|fog|mist|smoke/.test(cond) ||
      flags.storm ||
      flags.snow ||
      flags.fog ||
      flags.wildfireSmoke ||
      (temp != null && (temp >= 90 || temp <= 25)) ||
      (c.windMph != null && c.windMph >= 25) ||
      alerts.length > 0;
    var airHazard = aqi != null && aqi >= 100;

    // Conflict: good light + poor air (named before separate photo/air padding)
    if (airHazard && (photoGood || photoExcellent) && !night) {
      add({
        id: "conflict-air-light",
        kind: "conflict",
        weight: 93,
        panel: "air",
        consequence: "Good light, poor air — short looks only, skip long shoots",
        inputs: { tension: "light-vs-air", aqi: aqi, photoLevel: photo.level },
        rules: ["M6", "M4", "R1"]
      });
    } else if (photoNotable && !night && !hazardOwns && !airHazard) {
      add({
        id: "photo-good",
        kind: "photo-excellent",
        weight: 66,
        panel: "light",
        consequence: "Notable light advantage near sunset",
        inputs: { level: photo.level, summary: photo.summary, goldenHour: dl.goldenHour, notable: true },
        rules: ["M2", "M5", "D6", "R1"]
      });
    } else if (photoGood && !photoNotable && !night && !hazardOwns && !airHazard) {
      // Ordinary good light — signal for Matters optionally, but weight below walk/outdoor action
      add({
        id: "photo-ordinary",
        kind: "photo-ordinary",
        weight: 32,
        panel: "light",
        consequence: "Light is fine — not a standout photo day",
        inputs: { level: photo.level, summary: photo.summary },
        rules: ["D6", "R1"]
      });
    } else if (photoPoor && photo.live && !hazardOwns && !airHazard) {
      add({
        id: "photo-poor",
        kind: "photo-poor",
        weight: 28,
        panel: "light",
        consequence: "No standout light window — skip a photo outing",
        inputs: { level: photo.level, summary: photo.summary },
        rules: ["D6", "M5"]
      });
    } else if (
      dl.goldenHour &&
      !night &&
      model.weather &&
      model.weather.live &&
      !photoPoor &&
      !hazardOwns &&
      !airHazard &&
      !photoGood
    ) {
      add({
        id: "light-window",
        kind: "light",
        weight: 36,
        panel: "light",
        consequence: "Light softens near sunset",
        inputs: { goldenHour: dl.goldenHour },
        rules: ["M5", "D8"]
      });
    }

    // Uncertainty as a matter when high — never name providers in triad
    if (unc.level === "high" && unc.materialConflict) {
      add({
        id: "uncertainty",
        kind: "uncertainty",
        weight: 76,
        panel: "sources",
        consequence: "Sources disagree on timing — keep plans flexible",
        inputs: { level: unc.level, reasons: unc.reasons, material: true },
        rules: ["T2", "D5", "M3"]
      });
    } else if (unc.level === "high") {
      add({
        id: "uncertainty",
        kind: "uncertainty",
        weight: 76,
        panel: "sources",
        consequence: "Forecast confidence is limited — treat plans as provisional",
        inputs: { level: unc.level, reasons: unc.reasons },
        rules: ["T2", "D5", "M3"]
      });
    }
    // Minor provider diffs: intentionally omitted from triad (T2)

    // Conflict: clear sky + rising water
    var hasWater = signals.some(function (s) {
      return s.kind === "flood" || s.kind === "flood-watch" || s.kind === "flood-active" || s.kind === "flood-warning";
    });
    var clearish = (c.cloudPct != null && c.cloudPct < 40) || /clear|sunny|fair/.test(cond);
    if (hasWater && clearish) {
      add({
        id: "conflict-sky-water",
        kind: "conflict",
        weight: 94,
        panel: "water",
        consequence: "Clear sky, rising water — enjoy views; skip crossings",
        inputs: { tension: "sky-vs-water" },
        rules: ["M6"]
      });
    }

    // Ordinary calm fallback signal (low weight)
    if (!signals.length && model.weather && model.weather.live) {
      add({
        id: "ordinary",
        kind: "ordinary",
        weight: 20,
        panel: "day-arc",
        consequence: night
          ? "Tonight is quiet — tomorrow’s window matters more"
          : "Ordinary day — timing still shapes how long you stay out",
        inputs: { conditions: c.conditions, temp: temp },
        rules: ["M4", "R1"]
      });
    }

    // Sort by weight desc
    signals.sort(function (a, b) {
      return (b.weight || 0) - (a.weight || 0);
    });

    return {
      signals: signals,
      trajectory: traj,
      dewPointF: dew,
      dewPointMeta: dewInfo,
      uncertainty: unc,
      night: night,
      floodAlertKind: floodAlertKind
    };
  }

  /* ─── Happening synthesis ─── */

  function tempBand(temp) {
    if (temp == null) return null;
    if (temp < 35) return "cold";
    if (temp < 50) return "cool";
    if (temp < 68) return "mild";
    if (temp < 82) return "warm";
    return "hot";
  }

  function skyCharacter(model, flags, night) {
    flags = flags || {};
    var c = (model.weather && model.weather.current) || {};
    var cond = condStr(model);
    if (flags.wildfireSmoke || /smoke/.test(cond)) return "Smoke-hazed";
    if (flags.storm || /thunder|storm/.test(cond)) return "Stormy";
    if (flags.snow || /snow|sleet|ice/.test(cond)) return "Snowy";
    if (flags.fog || /fog|mist/.test(cond) || (c.visibilityMi != null && c.visibilityMi < 1)) return "Foggy";
    if (/rain|drizzle|shower/.test(cond)) return "Rainy";
    if (c.cloudPct != null && c.cloudPct >= 85) return "Heavy overcast";
    if (c.cloudPct != null && c.cloudPct >= 70) return "Soft overcast";
    if (c.cloudPct != null && c.cloudPct >= 35) return "Broken cloud";
    if (/clear|sunny|fair/.test(cond) || (c.cloudPct != null && c.cloudPct < 25)) {
      return night ? "Clear night" : "Clear";
    }
    if (cond) {
      // Shorten provider text to character words — do not echo long phrases
      if (/cloud/.test(cond)) return "Cloudy";
      if (/overcast/.test(cond)) return "Overcast";
      return clipWords(c.conditions, 2);
    }
    return night ? "Night air" : "Open sky";
  }

  function windPhrase(c) {
    if (c.windMph == null) return null;
    if (c.windMph < 6) return "light air";
    if (c.windMph >= 25) return "hard wind";
    if (c.windMph >= 18) return "breezy";
    return null;
  }

  function buildHappening(model, briefing, extracted, flags) {
    flags = flags || {};
    var traces = [];
    var night = extracted.night;
    var unc = extracted.uncertainty;

    if (!model.weather || !model.weather.live) {
      var feel =
        briefing && briefing.sections && briefing.sections.feel ? briefing.sections.feel.body : "";
      if (briefing && briefing.partial && feel) {
        traces.push({ rule: "H6", note: "cached-feel", inputs: ["briefing.feel"] });
        return {
          headline: clipWords(skyCharacter(model, flags, night) + ", " + (tempBand((model.weather.current || {}).feelsF) || "quiet"), 8),
          support: clipWords("Based on saved conditions — verify before long plans.", 18),
          panel: "conditions",
          traces: traces
        };
      }
      traces.push({ rule: "H6", note: "pending", inputs: [] });
      return {
        headline: "Finding today’s conditions",
        support: "Live outdoor character will fill in without inventing a place.",
        panel: "conditions",
        traces: traces
      };
    }

    var c = model.weather.current || {};
    var temp = c.feelsF != null ? c.feelsF : c.tempF;
    var band = tempBand(temp);
    var sky = skyCharacter(model, flags, night);
    var wind = windPhrase(c);
    var top = extracted.signals[0];

    // H4 — hazard character overrides mild comfort stacking
    var parts = [sky];
    if (band) parts.push(band);
    if (wind) parts.push(wind);
    if (extracted.dewPointF != null && extracted.dewPointF >= 70 && parts.length < 4) {
      parts.push("muggy");
    }

    var headline = clipWords(parts.join(", "), 8);
    if (wordCount(headline) < 3) headline = clipWords(headline + " outside", 8);
    traces.push({
      rule: "H1",
      note: "character",
      inputs: {
        sky: sky,
        band: band,
        windMph: c.windMph,
        dewPointF: extracted.dewPointF,
        dewDerived: extracted.dewPointMeta && extracted.dewPointMeta.derived
      }
    });

    // Support: consequence / trajectory
    var support = "";
    var traj = extracted.trajectory;

    if (night) {
      support = "Night near you — tonight stays quiet, or tomorrow’s first window may stand out.";
      traces.push({ rule: "H5", note: "night", inputs: {} });
    } else if (top && top.kind === "flood-warning") {
      support = "Flooding risk is elevated — treat low ground as off-limits.";
      traces.push({ rule: "H4", note: "flood-warning", inputs: top.inputs });
    } else if (top && (top.kind === "storm" || top.kind === "alert")) {
      support = "Exposed travel can wait until the hazard eases.";
      traces.push({ rule: "H4", note: top.kind, inputs: top.inputs });
    } else if (top && (top.kind === "wildfire-smoke" || top.kind === "aqi")) {
      support = "Long exertion outdoors asks more of your lungs today.";
      traces.push({ rule: "H4", note: "air", inputs: top.inputs });
    } else if (top && top.kind === "conflict") {
      support = "Opportunity and constraint share the same hours — pick the safer side.";
      traces.push({ rule: "M6", note: "conflict-support", inputs: top.inputs });
    } else if (top && top.kind === "fog") {
      support = "Near views only until the fog lifts.";
      traces.push({ rule: "H4", note: "fog", inputs: top.inputs });
    } else if (top && top.kind === "fog-uncertain") {
      support = "Humid air may support fog — check visibility before you commit.";
      traces.push({ rule: "T4", note: "fog-uncertain", inputs: top.inputs });
    } else if (
      top &&
      (top.kind === "snow" ||
        extracted.signals.some(function (s) {
          return s.kind === "snow";
        }))
    ) {
      support = "Footing and travel time matter more than the forecast text.";
      traces.push({ rule: "H4", note: "snow", inputs: top.inputs });
    } else if (top && (top.kind === "flood" || top.kind === "flood-watch" || top.kind === "flood-active")) {
      support =
        top.kind === "flood-active"
          ? "Water levels are the binding constraint today."
          : "Water deserves caution more than the sky does today.";
      traces.push({ rule: "H4", note: "water", inputs: top.inputs });
    } else if (top && top.kind === "heat") {
      support = "Midday heat will cut into how long you can comfortably stay out.";
      traces.push({ rule: "H2", note: "heat", inputs: top.inputs });
    } else if (top && top.kind === "cold") {
      support = "You’ll feel the air quickly — dress for it before you linger.";
      traces.push({ rule: "H2", note: "cold", inputs: top.inputs });
    } else if (top && top.kind === "wind") {
      support = "Open ground will ask more effort — use cover when you can.";
      traces.push({ rule: "H2", note: "wind", inputs: top.inputs });
    } else if (top && top.kind === "rain" && traj.rainStart && top.id === "rain-later") {
      support = "A dry window closes as showers build later.";
      traces.push({ rule: "H3", note: "rain-later", inputs: top.inputs });
    } else if (top && top.kind === "rain" && top.id === "rain-heavy") {
      support = "Heavy rain will shorten every outdoor window.";
      traces.push({ rule: "H2", note: "rain-heavy", inputs: top.inputs });
    } else if (top && top.kind === "rain") {
      support = "Wet ground and short windows — keep plans flexible.";
      traces.push({ rule: "H2", note: "rain-now", inputs: top.inputs });
    } else if (top && top.kind === "uncertainty") {
      support = unc.materialConflict
        ? "Signals disagree — keep today’s plan flexible and verify outside."
        : "Signals are incomplete — treat today’s plan as provisional.";
      traces.push({ rule: "T2", note: "uncertainty", inputs: unc });
    } else if (top && top.kind === "photo-excellent") {
      support = "Light quality is the quiet advantage of the day.";
      traces.push({ rule: "H2", note: "photo", inputs: top.inputs });
    } else if (traj.clearing && (top == null || top.weight < 55)) {
      support = "Clouds should thin later — afternoons open up for longer time outside.";
      traces.push({ rule: "H3", note: "clearing", inputs: {} });
    } else if (traj.buildingCloud && /clear|sunny|fair/.test(condStr(model)) && (!top || top.weight < 55)) {
      support = "Morning clarity may give way to thicker afternoon cloud.";
      traces.push({ rule: "H3", note: "building-cloud", inputs: {} });
    } else if (unc.level === "high") {
      support = "Signals are incomplete — treat today’s plan as provisional.";
      traces.push({ rule: "T2", note: "uncertainty", inputs: unc });
    } else if (band === "mild" || band === "warm") {
      support = "An easy day to be outside if you mind the usual sun and timing.";
      traces.push({ rule: "H2", note: "calm", inputs: { band: band } });
    } else if (band === "cool" || band === "cold") {
      support = "You’ll feel the air quickly — dress for it before you linger.";
      traces.push({ rule: "H2", note: "cool", inputs: { band: band } });
    } else {
      support = "The day near you sets the tone for time outside.";
      traces.push({ rule: "H2", note: "default", inputs: {} });
    }

    support = clipWords(support, 18);
    if (wordCount(headline) + wordCount(support) > 30) {
      support = clipWords(support, Math.max(8, 30 - wordCount(headline)));
    }

    return { headline: headline, support: support, panel: "conditions", traces: traces };
  }

  /* ─── Matters ranking ─── */

  function buildMatters(extracted, flags) {
    flags = flags || {};
    var night = extracted.night;
    var signals = extracted.signals.slice();
    var matters = [];
    var traces = [];
    var alertDominant = signals.some(function (s) {
      return s.id === "alert" || s.kind === "storm";
    });
    var maxItems = alertDominant ? 2 : 3;

    // Dedupe by kind family: keep highest weight
    var seen = {};
    signals.forEach(function (s) {
      var family = s.kind === "conflict" ? s.id : s.kind;
      // Prefer conflict items over their components
      if (s.kind === "conflict") {
        // drop lower component kinds later via filter
      }
      if (seen[family] && seen[family].weight >= s.weight) return;
      seen[family] = s;
    });
    var ranked = Object.keys(seen)
      .map(function (k) {
        return seen[k];
      })
      .sort(function (a, b) {
        return b.weight - a.weight;
      });

    // If conflict signal present, prefer it and suppress redundant components
    var conflict = ranked.filter(function (s) {
      return s.kind === "conflict";
    })[0];
    if (conflict) {
      ranked = [conflict].concat(
        ranked.filter(function (s) {
          if (s.id === conflict.id) return false;
          if (conflict.inputs && conflict.inputs.tension === "light-vs-air") {
            if (s.kind === "aqi" || s.kind === "wildfire-smoke" || s.kind === "photo-good" || s.kind === "photo-excellent")
              return false;
          }
          if (conflict.inputs && conflict.inputs.tension === "sky-vs-water") {
            if (s.kind === "flood" || s.kind === "flood-watch") return false;
          }
          return true;
        })
      );
    }

    // Night: drop midday UV / daytime photo fluff
    if (night) {
      ranked = ranked.filter(function (s) {
        if (s.kind === "uv") return false;
        if (s.kind === "photo-good" || s.kind === "photo-excellent" || s.kind === "light") return false;
        if (s.kind === "heat") return false;
        return true;
      });
    }

    // Drop weak photo-poor unless nothing else
    if (ranked.length > 1) {
      ranked = ranked.filter(function (s) {
        return s.kind !== "photo-poor";
      });
    }

    // Drop ordinary / photo-ordinary if we have anything more decisive
    if (ranked.length > 1) {
      ranked = ranked.filter(function (s) {
        return s.kind !== "ordinary" && s.kind !== "photo-ordinary";
      });
    }

    ranked.slice(0, maxItems).forEach(function (s, idx) {
      matters.push({
        text: clipWords(s.consequence, 14),
        panel: s.panel || "conditions",
        rank: idx + 1,
        signalId: s.id,
        kind: s.kind,
        weight: s.weight
      });
      traces.push({
        rule: (s.rules && s.rules[0]) || "M2",
        note: s.id,
        inputs: s.inputs,
        weight: s.weight
      });
    });

    if (!matters.length) {
      matters.push({
        text: night
          ? "Tonight is quiet — tomorrow’s window matters more"
          : "Conditions look ordinary — timing still shapes the day",
        panel: "day-arc",
        rank: 1,
        signalId: "ordinary-fallback",
        kind: "ordinary",
        weight: 10
      });
      traces.push({ rule: "M4", note: "fallback", inputs: {} });
    }

    traces.push({ rule: "M4", note: "count", inputs: { count: matters.length, alertDominant: alertDominant } });
    return { matters: matters, traces: traces };
  }

  /* ─── Best window (observational; never homework) ─── */

  function CopyApi() {
    return global.WDS && global.WDS.dashboardOSCopy;
  }

  function pickActivity(activities, preferIds) {
    activities = activities || [];
    var order = preferIds || [];
    var i;
    var a;
    for (i = 0; i < order.length; i++) {
      for (var j = 0; j < activities.length; j++) {
        a = activities[j];
        if (a.id === order[i] && (a.suitability === "excellent" || a.suitability === "good")) return a;
      }
    }
    for (i = 0; i < activities.length; i++) {
      a = activities[i];
      if (a.suitability === "excellent" || a.suitability === "good") return a;
    }
    for (i = 0; i < activities.length; i++) {
      a = activities[i];
      if (a.suitability !== "avoid" && a.suitability !== "insufficient" && a.suitability !== "poor") return a;
    }
    return null;
  }

  function soften(text, unc) {
    var Copy = CopyApi();
    if (Copy && Copy.softenObservational) {
      var softened = Copy.softenObservational(text, unc);
      return unc && unc.level === "high" ? clipWords(softened, 16) : softened;
    }
    if (!unc || unc.level === "low") return text;
    if (/based on|if (the )?forecast|provisional|if conditions hold|may /i.test(text)) return text;
    if (unc.level === "high") return clipWords("If conditions hold: " + text.replace(/^If conditions hold:\s*/i, ""), 16);
    return text;
  }

  function altLine(text) {
    var Copy = CopyApi();
    if (Copy && Copy.alternateLine) return Copy.alternateLine(text);
    if (!text) return null;
    return "Also worth noticing: " + String(text).replace(/^alternate:\s*/i, "");
  }

  function packPlan(primary, alternate, rationale, traces) {
    var alt = null;
    if (alternate) {
      alt = altLine(alternate);
      if (alt) alt = clipWords(alt, 16);
    }
    return {
      primary: primary,
      alternate: alt,
      rationale: rationale || [],
      traces: traces || []
    };
  }

  function preferDaytimeWindow(label, model) {
    return practicalWindow(label, model, { allowAstronomical: true });
  }

  function bandIsMildOrWarm(model) {
    var c = (model.weather && model.weather.current) || {};
    var temp = c.feelsF != null ? c.feelsF : c.tempF;
    if (temp == null) return true;
    return temp >= 50 && temp < 90;
  }

  function buildDo(model, briefing, activities, windows, extracted, flags) {
    flags = flags || {};
    var traces = [];
    var night = extracted.night;
    var unc = extracted.uncertainty;
    var signals = extracted.signals;
    var top = signals[0];
    var rationale = [];

    function hasKind(k) {
      return signals.some(function (s) {
        return s.kind === k || s.id === k;
      });
    }

    function hasFloodWatch() {
      return signals.some(function (s) {
        return (
          s.kind === "flood-watch" ||
          (s.id === "alert" && s.inputs && s.inputs.floodClass === "flood-watch")
        );
      });
    }

    function hasFloodWarningOrActive() {
      return signals.some(function (s) {
        return (
          s.kind === "flood-warning" ||
          s.kind === "flood-active" ||
          (s.id === "alert" && s.inputs && s.inputs.floodClass === "flood-warning") ||
          (s.inputs && s.inputs.activeFlooding)
        );
      });
    }

    // Flood Warning / active flooding — escalate
    if (hasFloodWarningOrActive()) {
      traces.push({ rule: "D3", note: "flood-warning", inputs: top && top.inputs });
      traces.push({ rule: "D9", note: "escalated" });
      return packPlan(
        clipWords(soften("Flooded roads and low crossings remain unsafe", unc), 16),
        "Official local updates matter before any stream travel",
        ["Flood Warning or active high water outranks recreation."],
        traces.concat([{ rule: "D1", note: "primary" }, { rule: "D2", note: "alternate" }])
      );
    }

    // Flood Watch alone — precautionary (not stay-home)
    if (hasFloodWatch() && !hasKind("storm")) {
      traces.push({ rule: "D9", note: "flood-watch-precaution", inputs: top && top.inputs });
      return packPlan(
        clipWords(
          soften("Low crossings warrant caution — local updates matter near streams", unc),
          16
        ),
        "High-ground walks away from creeks look quieter",
        ["Flood Watch is precautionary — not a stay-home order."],
        traces.concat([{ rule: "D1", note: "primary" }, { rule: "D2", note: "alternate" }])
      );
    }

    // Alert / storm safety (non-flood-watch)
    if (hasKind("alert") || hasKind("storm")) {
      var primary = "Exposed travel looks poor until the alert eases";
      if (hasKind("storm") && !hasKind("alert")) {
        primary = "Short outings near shelter fit while storms pass";
      }
      traces.push({ rule: "D3", note: "safety", inputs: top && top.inputs });
      return packPlan(
        clipWords(soften(primary, unc), 16),
        "A short sheltered look nearby remains available",
        [top && top.consequence, "Safety outranks opportunity today."].filter(Boolean),
        traces.concat([{ rule: "D1", note: "primary" }, { rule: "D2", note: "alternate" }])
      );
    }

    if (night) {
      var dl = model.daylight || {};
      var nightAlt =
        model.moon && model.moon.phase
          ? clipWords("Tonight remains quiet under " + String(model.moon.phase), 14)
          : "Tonight remains quiet and overcast";
      traces.push({
        rule: "D7",
        note: "night",
        inputs: { sunrise: dl.sunrise, phase: model.moon && model.moon.phase }
      });
      return packPlan(
        "Tomorrow morning looks more promising",
        nightAlt,
        ["Night briefing — tomorrow’s window stands out over tonight."],
        traces
      );
    }

    // Conflict air vs light — safety outranks attractive opportunity
    if (hasKind("conflict") && signals.some(function (s) {
      return s.id === "conflict-air-light" || (s.inputs && s.inputs.tension === "light-vs-air");
    })) {
      var cAir = signals.filter(function (s) {
        return s.id === "conflict-air-light" || (s.inputs && s.inputs.tension === "light-vs-air");
      })[0];
      traces.push({ rule: "M6", note: "do-resolve-air-light", inputs: cAir && cAir.inputs });
      traces.push({ rule: "R1", note: "safety-over-opportunity" });
      return packPlan(
        clipWords(soften("A brief outdoor look fits better than a long photo session", unc), 16),
        "Cleaner air another day may open a stronger photo window",
        ["Light is good; air is not.", "Air quality wins the tradeoff."],
        traces
      );
    }

    // Conflict sky vs water
    if (hasKind("conflict") && signals.some(function (s) {
      return s.id === "conflict-sky-water" || (s.inputs && s.inputs.tension === "sky-vs-water");
    })) {
      traces.push({ rule: "M6", note: "do-resolve-sky-water", inputs: top && top.inputs });
      traces.push({ rule: "R1", note: "safety-over-opportunity" });
      return packPlan(
        clipWords(soften("High ground looks safer than fords and low crossings", unc), 16),
        "A viewpoint from a safe bank remains an option",
        ["Clear sky does not make crossings safe."],
        traces
      );
    }

    // Severe AQI / smoke
    if (hasKind("wildfire-smoke") || hasKind("aqi")) {
      var aqiSig = signals.filter(function (s) {
        return s.kind === "aqi" || s.kind === "wildfire-smoke";
      })[0];
      var aqiVal = aqiSig && aqiSig.inputs && aqiSig.inputs.aqi;
      var severe = aqiVal != null && aqiVal >= 150;
      traces.push({ rule: "D3", note: "air", inputs: aqiSig && aqiSig.inputs });
      return packPlan(
        clipWords(
          soften(
            severe
              ? "Long outdoor exertion looks poor until air improves"
              : "Short, easy outdoor effort fits today’s air",
            unc
          ),
          16
        ),
        severe ? null : "A quieter indoor stretch may follow a brief look",
        [aqiSig && aqiSig.consequence, "Air quality is the binding constraint."].filter(Boolean),
        traces
      );
    }

    // Rising water without watch/warning alert path already handled
    if (hasKind("flood") || hasKind("flood-active")) {
      traces.push({ rule: "D3", note: "water", inputs: top && top.inputs });
      return packPlan(
        clipWords(soften("High ground looks safer than fords and low crossings", unc), 16),
        "A viewpoint from a safe bank remains an option",
        ["Nearby water is elevated.", "Clear sky does not make crossings safe."],
        traces
      );
    }

    // Fog
    if (hasKind("fog")) {
      traces.push({ rule: "D4", note: "fog", inputs: top && top.inputs });
      return packPlan(
        clipWords(soften("Familiar short routes fit until visibility improves", unc), 16),
        "A longer outing may open once fog lifts",
        ["Low visibility favors short known routes."],
        traces
      );
    }

    if (hasKind("fog-uncertain")) {
      traces.push({ rule: "T4", note: "fog-uncertain-do", inputs: top && top.inputs });
      return packPlan(
        clipWords(soften("Local visibility is worth confirming before a long drive or hike", unc), 16),
        "A short familiar first outing remains the quieter choice",
        ["Fog is possible, not confirmed."],
        traces
      );
    }

    // Snow
    if (hasKind("snow")) {
      traces.push({ rule: "D4", note: "snow", inputs: top && top.inputs });
      return packPlan(
        clipWords(soften("Treated or packed paths look more reliable underfoot", unc), 16),
        "Surfaces may settle into a stronger window later",
        ["Snow/ice underfoot drives footing risk."],
        traces
      );
    }

    // Heat
    if (hasKind("heat")) {
      traces.push({ rule: "D1", note: "heat-window" });
      traces.push({ rule: "D8", note: "practical-window" });
      traces.push({ rule: "R2", note: "heat-primary" });
      return packPlan(
        clipWords(soften("Shade favors early morning or after 4 PM", unc), 16),
        "Midday heat favors a quieter indoor stretch",
        ["Heat stress risk midday."],
        traces
      );
    }

    // Rain later — practical window
    if (hasKind("rain") && extracted.trajectory.rainStart && !signals.some(function (s) { return s.id === "rain-now" || s.id === "rain-heavy"; })) {
      traces.push({ rule: "H3", note: "do-before-rain", inputs: { rainStart: extracted.trajectory.rainStart } });
      traces.push({ rule: "D8", note: "practical-window" });
      var rainHr = extracted.trajectory.rainStart.getHours();
      var beforeBand = "early afternoon";
      if (rainHr <= 12) beforeBand = "through late morning";
      else if (rainHr <= 14) beforeBand = "before noon";
      else if (rainHr <= 17) beforeBand = "early afternoon";
      return packPlan(
        clipWords(soften("The stronger outdoor window looks " + beforeBand + ", before rain builds", unc), 16),
        "A short covered walk remains if showers arrive",
        ["Hourly rain risk rises later.", "Earlier window is the safer plan."],
        traces
      );
    }

    if (hasKind("rain")) {
      var heavy = signals.some(function (s) {
        return s.id === "rain-heavy";
      });
      traces.push({ rule: "D4", note: heavy ? "rain-heavy" : "rain-now" });
      return packPlan(
        clipWords(
          soften(
            heavy
              ? "Heaviest rain favors short covered walks only"
              : "A rain-ready short walk, or a dry gap later",
            unc
          ),
          16
        ),
        "An indoor stretch until showers ease remains available",
        [heavy ? "Heavy rain shortens every outdoor window." : "Active precipitation shortens outdoor windows."],
        traces
      );
    }

    // Photography — ONLY when genuinely notable (excellent / notable advantage). R1/D6.
    var photoExcellent = hasKind("photo-excellent") || flags.excellentPhotography || flags.notablePhotoAdvantage;
    var photoPoor = hasKind("photo-poor") || flags.poorPhotography;
    if (photoPoor) {
      traces.push({ rule: "D6", note: "no-photo" });
      return packPlan(
        clipWords(soften("Mildest hours look like the stronger window", unc), 16),
        null,
        ["No standout light window — not pitching photography."],
        traces
      );
    }

    if (photoExcellent) {
      traces.push({
        rule: "D4",
        note: "photo-notable",
        inputs: { level: model.photography && model.photography.level }
      });
      traces.push({ rule: "D6", note: "photo-earned" });
      traces.push({ rule: "R1", note: "notable-photo" });
      traces.push({ rule: "D8", note: "near-sunset" });
      return packPlan(
        clipWords(soften("Soft light near sunset is worth noticing for photography", unc), 16),
        "An easy walk while air and sky stay kind",
        [model.photography && model.photography.summary, "Notable light advantage."].filter(Boolean),
        traces
      );
    }

    // Drought — still go outdoors; pack water (never avoid-outdoors for drought alone)
    if (hasKind("drought")) {
      traces.push({ rule: "D4", note: "drought" });
      traces.push({ rule: "R2", note: "drought-not-avoid" });
      return packPlan(
        clipWords(soften("Walk or easy hike looks fine — extra water helps in dry air", unc), 16),
        "A shorter loop near reliable shade remains available",
        ["Dry spell — personal water matters more; outdoors still fine."],
        traces
      );
    }

    // High UV without heat — shade counsel, still go
    if (hasKind("uv") && !hasKind("heat")) {
      traces.push({ rule: "D4", note: "uv-shade" });
      traces.push({ rule: "R1", note: "outdoor-action" });
      return packPlan(
        clipWords(soften("Late morning looks open; shade matters after midday", unc), 16),
        "A shorter shaded loop if UV feels sharp",
        ["UV is meaningful; heat is not the binding limit."],
        traces
      );
    }

    // Default: broadly useful outdoor possibility — walk first (R1); never default to photography
    var topAct = pickActivity(activities, ["walk", "hike"]);
    var windowLabel = null;
    if (windows && windows.length && windows[0].display) windowLabel = windows[0].display;
    else if (topAct && topAct.bestWindow) windowLabel = topAct.bestWindow;
    var prac = preferDaytimeWindow(windowLabel, model);

    var primaryDo;
    if (hasKind("wind")) {
      primaryDo = prac
        ? "Cover favors a walk " + prac
        : "Cover favors a walk on open ground";
      traces.push({ rule: "R1", note: "wind-walk" });
    } else {
      primaryDo = prac
        ? "Conditions favor a walk " + prac
        : "Mildest hours look like the stronger window";
      traces.push({ rule: "R1", note: "calm-walk" });
    }
    primaryDo = clipWords(soften(primaryDo, unc), 16);

    var alternate = null;
    if (activities && activities.length > 1 && topAct) {
      for (var k = 0; k < activities.length; k++) {
        var altA = activities[k];
        if (altA.id === topAct.id) continue;
        if (altA.id === "photography") continue;
        if (altA.suitability === "good" || altA.suitability === "excellent" || altA.suitability === "fair") {
          alternate = clipWords(
            altA.label + (altA.bestWindow ? " " + practicalWindow(altA.bestWindow, model) : "") + " may also fit",
            14
          );
          break;
        }
      }
    }

    if (topAct && topAct.positives && topAct.positives[0]) rationale.push(topAct.positives[0]);
    if (topAct && topAct.limits && topAct.limits[0]) rationale.push(topAct.limits[0]);
    if (unc.level !== "low") rationale.push("Uncertainty: " + unc.reasons.join(", "));
    if (!rationale.length) rationale.push("Ranked from live outdoor intelligence near you.");

    traces.push({
      rule: "D4",
      note: "activity",
      inputs: {
        activityId: topAct && topAct.id,
        suitability: topAct && topAct.suitability,
        window: windowLabel,
        practical: prac,
        uncertainty: unc.level
      }
    });
    if (prac) traces.push({ rule: "D8", note: "practical-window", inputs: { practical: prac } });
    if (unc.level !== "low") traces.push({ rule: "D5", note: "softened", inputs: unc });

    return packPlan(primaryDo, alternate, rationale.slice(0, 4), traces);
  }

  /* ─── Constraints (conflict days) ─── */

  function buildConstraints(extracted, plan) {
    var conflict = extracted.signals.filter(function (s) {
      return s.kind === "conflict";
    })[0];
    if (!conflict) return null;
    return {
      text: clipWords("Worth knowing: " + conflict.consequence, 30),
      signalId: conflict.id
    };
  }

  /* ─── public API ─── */

  function synthesize(payload) {
    payload = payload || {};
    var model = payload.model || {};
    var briefing = payload.briefing || {};
    var activities = payload.activities || [];
    var windows = payload.windows || [];
    var flags = payload.flags || payload.interpretationFlags || {};

    var extracted = extractSignals(model, briefing, activities, flags);
    var happening = buildHappening(model, briefing, extracted, flags);
    var mattersPack = buildMatters(extracted, flags);
    var plan = buildDo(model, briefing, activities, windows, extracted, flags);
    var constraints = buildConstraints(extracted, plan);

    var allTraces = []
      .concat(happening.traces || [])
      .concat(mattersPack.traces || [])
      .concat(plan.traces || []);

    return {
      happening: {
        headline: happening.headline,
        support: happening.support,
        panel: happening.panel
      },
      matters: mattersPack.matters.map(function (m) {
        return { text: m.text, panel: m.panel, rank: m.rank };
      }),
      do: {
        primary: plan.primary,
        alternate: plan.alternate,
        rationale: plan.rationale || []
      },
      constraints: constraints,
      signals: extracted.signals,
      uncertainty: extracted.uncertainty,
      dewPointF: extracted.dewPointF,
      dewPointMeta: extracted.dewPointMeta,
      trajectory: {
        rainStart: extracted.trajectory.rainStart
          ? extracted.trajectory.rainStart.toISOString()
          : null,
        rainEase: extracted.trajectory.rainEase ? extracted.trajectory.rainEase.toISOString() : null,
        clearing: extracted.trajectory.clearing,
        maxUv: extracted.trajectory.maxUv
      },
      traces: allTraces,
      rulesApplied: allTraces.map(function (t) {
        return t.rule;
      }).filter(function (r, i, arr) {
        return r && arr.indexOf(r) === i;
      }),
      meta: {
        night: extracted.night,
        wordCounts: {
          happening: wordCount(happening.headline) + wordCount(happening.support),
          matters: mattersPack.matters.reduce(function (n, m) {
            return n + wordCount(m.text);
          }, 0),
          doPrimary: wordCount(plan.primary),
          doAlternate: wordCount(plan.alternate)
        }
      }
    };
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardOSInterpret = {
    synthesize: synthesize,
    extractSignals: extractSignals,
    RULES: RULES,
    estimateDewPointF: estimateDewPointF,
    resolveDewPoint: resolveDewPoint,
    practicalWindow: practicalWindow,
    assertCalmVoice: assertCalmVoice,
    clipWords: clipWords,
    wordCount: wordCount
  };
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : this);
