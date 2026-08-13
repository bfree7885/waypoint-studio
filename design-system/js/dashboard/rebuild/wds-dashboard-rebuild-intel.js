/**
 * Dashboard Rebuild — environmental intelligence (deterministic, evidence-backed).
 * Normalizes OIP/platform weather into a state layer, derives signals, and
 * composes Before You Go briefs. No LLM. No fabricated measurements.
 */
(function (global) {
  "use strict";

  function num(v) {
    if (v == null) return null;
    if (typeof v === "number" && isFinite(v)) return v;
    if (typeof v === "object" && v.value != null) return num(v.value);
    var n = Number(v);
    if (isFinite(n)) return n;
    n = parseFloat(String(v).replace(/[^\d.-]/g, ""));
    return isFinite(n) ? n : null;
  }

  function asDate(v) {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    var d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  function weatherPkg(platform) {
    if (!platform) return null;
    var w = platform.weatherRef || null;
    if (w && w.meta && w.meta.isPlaceholder) return null;
    return w;
  }

  function current(platform) {
    var w = weatherPkg(platform);
    return (w && w.current) || null;
  }

  function hourly(platform) {
    var w = weatherPkg(platform);
    return (w && Array.isArray(w.hourly) && w.hourly) || [];
  }

  function daily(platform) {
    var w = weatherPkg(platform);
    return (w && Array.isArray(w.daily) && w.daily) || [];
  }

  function precipOf(obj) {
    if (!obj) return { probability: null, amount: null, intensity: null };
    var p = obj.precipitation || {};
    return {
      probability: num(p.probability != null ? p.probability : obj.precipProb),
      amount: num(p.amount != null ? p.amount : obj.precipAmt),
      intensity: p.intensity || obj.precipIntensity || null
    };
  }

  function windOf(obj) {
    if (!obj) return { speed: null, gust: null, direction: null };
    var wind = obj.wind || {};
    return {
      speed: num(wind.speed != null ? wind.speed : obj.windSpeed),
      gust: num(wind.gust != null ? wind.gust : obj.windGust),
      direction: num(wind.direction != null ? wind.direction : obj.windDir)
    };
  }

  function evidence(metric, value, source) {
    return { metric: metric, value: value, source: source || "live" };
  }

  function signal(partial) {
    return {
      id: partial.id,
      category: partial.category || "general",
      title: partial.title,
      summary: partial.summary,
      severity: partial.severity || "info",
      confidence: partial.confidence || "high",
      noteworthy: partial.noteworthy !== false,
      score: partial.score != null ? partial.score : 0,
      evidence: partial.evidence || [],
      validFrom: partial.validFrom || null,
      validUntil: partial.validUntil || null,
      relatedInstrumentIds: partial.relatedInstrumentIds || [],
      toolLinks: partial.toolLinks || []
    };
  }

  /**
   * Normalize platform + location into one intelligence input object.
   * Missing fields stay null — never invented.
   */
  function normalizeEnvState(platform, location, now) {
    var when = asDate(now) || new Date();
    var cur = current(platform);
    var hours = hourly(platform);
    var days = daily(platform);
    var day0 = days[0] || null;
    var precip = precipOf(cur);
    var wind = windOf(cur);
    var air = platform && platform.airQuality && platform.airQuality.status === "live"
      ? platform.airQuality
      : null;
    var alerts = platform && platform.alerts ? platform.alerts : null;
    var alertsStatus = alerts && alerts.status ? String(alerts.status) : null;
    var daylight = platform && platform.daylight ? platform.daylight : null;
    var cond =
      (cur && cur.conditions && (cur.conditions.summary || cur.conditions.text)) ||
      (cur && cur.conditions) ||
      null;
    if (cond && typeof cond === "object") cond = cond.summary || cond.text || null;

    var nextElevated = null;
    var peakHour = null;
    var hour2 = hours[1] || hours[0] || null;
    var hour3 = hours[2] || hour2;
    hours.slice(0, 12).forEach(function (h) {
      var pp = precipOf(h).probability;
      if (pp == null) return;
      var t = asDate(h.time || h.start);
      if (!peakHour || pp > precipOf(peakHour).probability) peakHour = h;
      if (pp >= 40 && !nextElevated) nextElevated = { hour: h, probability: pp, at: t };
    });
    var laterProb = precipOf(hour3).probability;
    if (laterProb == null) laterProb = precipOf(hour2).probability;

    var moonIllum = null;
    var moonPhase = null;
    var moonPhaseValue = null;
    if (daylight) {
      moonIllum = num(daylight.moonIllumination != null ? daylight.moonIllumination : daylight.illumination);
      moonPhase = daylight.moonPhase || daylight.phase || null;
      moonPhaseValue = num(daylight.moonPhaseValue != null ? daylight.moonPhaseValue : daylight.phaseValue);
    }
    if (cur) {
      if (moonIllum == null) moonIllum = num(cur.moonIllumination);
      if (moonPhase == null) moonPhase = cur.moonPhase || null;
    }

    return {
      asOf: when.toISOString(),
      location: {
        label:
          (location && (location.displayTitle || location.placeLabel || location.name)) || null,
        lat: location && num(location.lat),
        lng: location && num(location.lng),
        timezone: (location && location.timezone) || (weatherPkg(platform) && weatherPkg(platform).meta && weatherPkg(platform).meta.timezone) || null
      },
      weather: {
        temperatureF: cur && num(cur.temperature != null ? cur.temperature : cur.tempF),
        apparentF: cur && num(cur.feelsLike != null ? cur.feelsLike : cur.apparentTemperature),
        humidityPct: cur && num(cur.humidity),
        dewPointF: cur && num(cur.dewPoint),
        cloudCoverPct: cur && num(cur.cloudCover != null ? cur.cloudCover : cur.cloud),
        visibilityMi: cur && num(cur.visibility),
        pressureMb: cur && num(cur.pressure != null ? cur.pressure : cur.pressureMb),
        uvIndex: cur && num(cur.uvIndex),
        conditions: cond ? String(cond) : null,
        precipProbabilityPct: precip.probability,
        precipAmountIn: precip.amount,
        precipIntensity: precip.intensity,
        windMph: wind.speed,
        windGustMph: wind.gust,
        windDirDeg: wind.direction,
        highF: day0 && num(day0.temperatureHigh != null ? day0.temperatureHigh : day0.tempMax),
        lowF: day0 && num(day0.temperatureLow != null ? day0.temperatureLow : day0.tempMin),
        uvMax: day0 && num(day0.uvIndex)
      },
      precipWindow: {
        nextElevatedProbPct: nextElevated ? nextElevated.probability : null,
        nextElevatedAt: nextElevated && nextElevated.at ? nextElevated.at.toISOString() : null,
        peakProbPct: peakHour ? precipOf(peakHour).probability : null,
        peakAt:
          peakHour && asDate(peakHour.time || peakHour.start)
            ? asDate(peakHour.time || peakHour.start).toISOString()
            : null,
        laterProbPct: laterProb
      },
      air: air
        ? {
            aqi: num(air.usAqi != null ? air.usAqi : air.aqi),
            category: air.category || null,
            pm25: num(air.pm25)
          }
        : { aqi: null, category: null, pm25: null },
      light: {
        sunrise: daylight && (daylight.sunriseISO || daylight.sunrise || null),
        sunset: daylight && (daylight.sunsetISO || daylight.sunset || null),
        sunriseFormatted: daylight && (daylight.sunriseFormatted || null),
        sunsetFormatted: daylight && (daylight.sunsetFormatted || null),
        solarElevationDeg: daylight && num(daylight.solarElevation),
        kind: daylight && (daylight.kind || daylight.period || null)
      },
      astronomy: {
        illuminationPct: moonIllum,
        phase: moonPhase ? String(moonPhase) : null,
        phaseValue: moonPhaseValue
      },
      alerts: {
        status: alertsStatus,
        count: alerts && alerts.items ? alerts.items.length : alerts && num(alerts.count),
        items: (alerts && alerts.items) || []
      },
      meta: {
        fromCache: !!(platform && platform.meta && platform.meta.fromCache),
        stale: !!(platform && platform.meta && platform.meta.stale),
        hasWeather: !!cur
      }
    };
  }

  function minutesUntil(iso, now) {
    var t = asDate(iso);
    if (!t) return null;
    return Math.round((t.getTime() - now.getTime()) / 60000);
  }

  /**
   * Calendar-day sunrise/sunset: night is after sunset or before sunrise.
   * Missing sun times are not treated as night (avoids daytime false positives).
   */
  function isNightNow(light, now) {
    light = light || {};
    var rise = asDate(light.sunrise);
    var set = asDate(light.sunset);
    if (rise && set) {
      var t = now.getTime();
      var riseT = rise.getTime();
      var setT = set.getTime();
      if (setT < riseT) return t >= setT || t < riseT;
      return t < riseT || t >= setT;
    }
    if (set) return now.getTime() >= set.getTime();
    if (rise) return now.getTime() < rise.getTime();
    var kind = String(light.kind || "").toLowerCase();
    if (kind.indexOf("night") >= 0) return true;
    if (light.solarElevationDeg != null) return light.solarElevationDeg < 0;
    return false;
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
      return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    }
  }

  function rainingNow(state) {
    var w = state.weather || {};
    if (w.precipAmountIn != null && w.precipAmountIn >= 0.01) return true;
    var intensity = String(w.precipIntensity || "").toLowerCase();
    if (intensity === "heavy" || intensity === "moderate") return true;
    return /rain|drizzle|shower|storm|snow|sleet/i.test(String(w.conditions || ""));
  }

  function deriveSignals(state, now) {
    state = state || {};
    var when = asDate(now) || (state.asOf ? asDate(state.asOf) : new Date()) || new Date();
    var out = [];
    var w = state.weather || {};
    var light = state.light || {};
    var astro = state.astronomy || {};
    var air = state.air || {};
    var alerts = state.alerts || {};
    var precipWindow = state.precipWindow || {};
    var tz = state.location && state.location.timezone;

    /* Alerts first */
    var alertItems = alerts.items || [];
    if (alertItems.length) {
      var first = alertItems[0] || {};
      var title = first.event || first.headline || "Weather alert";
      out.push(
        signal({
          id: "alert-active",
          category: "alerts",
          title: "Active alert",
          summary: String(title),
          severity: /warning|emergency/i.test(String(first.severity || title)) ? "high" : "elevated",
          score: 100,
          evidence: [
            evidence("alerts.count", alertItems.length, "nws"),
            evidence("alert.event", title, "nws")
          ],
          relatedInstrumentIds: ["ph-alerts", "ph-doorway"],
          toolLinks: []
        })
      );
    } else if (alerts.status === "live" || alerts.status === "empty") {
      out.push(
        signal({
          id: "alert-none",
          category: "alerts",
          title: "No active alerts",
          summary: "No official weather alerts for this place right now.",
          severity: "info",
          noteworthy: false,
          score: 5,
          evidence: [evidence("alerts.count", 0, "nws")],
          relatedInstrumentIds: ["ph-alerts", "ph-doorway"]
        })
      );
    }

    /* Precipitation */
    var nowProb = w.precipProbabilityPct;
    var elevProb = precipWindow.nextElevatedProbPct;
    var elevAt = precipWindow.nextElevatedAt;
    var elevMins = minutesUntil(elevAt, when);
    if (rainingNow(state)) {
      out.push(
        signal({
          id: "precip-active",
          category: "precipitation",
          title: "Precipitation underway",
          summary: "Precipitation is occurring now.",
          severity: "elevated",
          score: 78,
          evidence: [
            evidence("conditions", w.conditions, "weather"),
            evidence("precip.amount", w.precipAmountIn, "weather"),
            evidence("precip.intensity", w.precipIntensity, "weather")
          ],
          relatedInstrumentIds: ["ph-precip-window", "ph-conditions", "ph-doorway"]
        })
      );
      var later = precipWindow.laterProbPct;
      if (later != null && later < 30) {
        out.push(
          signal({
            id: "precip-ending",
            category: "precipitation",
            title: "Precipitation easing",
            summary: "Rain chance falls toward " + Math.round(later) + "% in the next few hours.",
            severity: "info",
            score: 42,
            evidence: [
              evidence("precip.probability.later", later, "weather.hourly"),
              evidence("conditions", w.conditions, "weather")
            ],
            relatedInstrumentIds: ["ph-precip-window", "ph-next-hours", "ph-doorway"]
          })
        );
      }
    } else if (
      nowProb != null &&
      nowProb >= 50 &&
      precipWindow.laterProbPct != null &&
      precipWindow.laterProbPct < 25
    ) {
      out.push(
        signal({
          id: "precip-ending",
          category: "precipitation",
          title: "Precipitation ending",
          summary: "Rain chance falls off in the coming hours.",
          severity: "info",
          score: 40,
          evidence: [
            evidence("precip.probability.now", nowProb, "weather"),
            evidence("precip.probability.later", precipWindow.laterProbPct, "weather.hourly")
          ],
          relatedInstrumentIds: ["ph-precip-window", "ph-doorway"]
        })
      );
    } else if (nowProb != null && nowProb <= 10 && (elevProb == null || elevProb < 40)) {
      out.push(
        signal({
          id: "precip-dry-now",
          category: "precipitation",
          title: "Dry now",
          summary: "Little chance of rain in the immediate conditions.",
          severity: "info",
          noteworthy: false,
          score: 12,
          evidence: [evidence("precip.probability.now", nowProb, "weather")],
          relatedInstrumentIds: ["ph-precip-window", "ph-doorway"]
        })
      );
    } else if (elevProb != null && elevProb >= 40 && elevMins != null && elevMins >= 0 && elevMins <= 180) {
      out.push(
        signal({
          id: "precip-soon",
          category: "precipitation",
          title: "Rain likely soon",
          summary:
            "Elevated precipitation chance around " +
            (formatClock(elevAt, tz) || "the next few hours") +
            " (" +
            Math.round(elevProb) +
            "%).",
          severity: elevProb >= 60 ? "elevated" : "info",
          score: 55 + Math.min(25, Math.round(elevProb / 4)),
          evidence: [
            evidence("precip.probability.elevated", elevProb, "weather.hourly"),
            evidence("precip.elevatedAt", elevAt, "weather.hourly"),
            evidence("minutesUntil", elevMins, "computed")
          ],
          validUntil: elevAt,
          relatedInstrumentIds: ["ph-precip-window", "ph-next-hours", "ph-doorway"]
        })
      );
    }

    /* Wind */
    var wind = w.windMph;
    var gust = w.windGustMph;
    if (gust != null && gust >= 30) {
      out.push(
        signal({
          id: "wind-gusts",
          category: "wind",
          title: "Strong gusts",
          summary: "Gusts near " + Math.round(gust) + " mph — take care on exposed ground.",
          severity: gust >= 40 ? "high" : "elevated",
          score: 60 + Math.min(20, Math.round((gust - 30) / 2)),
          evidence: [evidence("wind.gustMph", gust, "weather"), evidence("wind.speedMph", wind, "weather")],
          relatedInstrumentIds: ["ph-wind", "ph-doorway", "ph-conditions"]
        })
      );
    } else if (wind != null && wind >= 18) {
      out.push(
        signal({
          id: "wind-breezy",
          category: "wind",
          title: "Breezy",
          summary: "Sustained wind near " + Math.round(wind) + " mph.",
          severity: "info",
          score: 28,
          evidence: [evidence("wind.speedMph", wind, "weather")],
          relatedInstrumentIds: ["ph-wind", "ph-doorway"]
        })
      );
    } else if (wind != null && wind <= 6) {
      out.push(
        signal({
          id: "wind-calm",
          category: "wind",
          title: "Calm air",
          summary: "Winds remain light.",
          severity: "info",
          noteworthy: false,
          score: 8,
          evidence: [evidence("wind.speedMph", wind, "weather")],
          relatedInstrumentIds: ["ph-wind", "ph-doorway"]
        })
      );
    }

    /* Temperature / comfort */
    var temp = w.temperatureF;
    var apparent = w.apparentF != null ? w.apparentF : temp;
    var humidity = w.humidityPct;
    if (temp != null && temp <= 32) {
      out.push(
        signal({
          id: "temp-freezing",
          category: "temperature",
          title: "Freezing conditions",
          summary: "Air temperature at or below freezing (" + Math.round(temp) + "°F).",
          severity: "elevated",
          score: 70,
          evidence: [evidence("temperatureF", temp, "weather")],
          relatedInstrumentIds: ["ph-conditions", "ph-comfort", "ph-doorway"]
        })
      );
    } else if (apparent != null && apparent >= 90) {
      out.push(
        signal({
          id: "temp-heat",
          category: "temperature",
          title: "Heat concern",
          summary: "It feels like " + Math.round(apparent) + "°F.",
          severity: apparent >= 100 ? "high" : "elevated",
          score: 62,
          evidence: [
            evidence("apparentF", apparent, "weather"),
            evidence("temperatureF", temp, "weather"),
            evidence("humidityPct", humidity, "weather")
          ],
          relatedInstrumentIds: ["ph-conditions", "ph-comfort", "ph-doorway"]
        })
      );
    } else if (temp != null && humidity != null && temp >= 72 && humidity >= 70) {
      out.push(
        signal({
          id: "comfort-humid",
          category: "temperature",
          title: "Warm and humid",
          summary: Math.round(temp) + "°F with humidity near " + Math.round(humidity) + "%.",
          severity: "info",
          score: 22,
          evidence: [evidence("temperatureF", temp, "weather"), evidence("humidityPct", humidity, "weather")],
          relatedInstrumentIds: ["ph-comfort", "ph-conditions", "ph-doorway"]
        })
      );
    }

    /* Air */
    var aqi = air.aqi;
    if (aqi != null) {
      if (aqi <= 50) {
        out.push(
          signal({
            id: "air-good",
            category: "air",
            title: "Good outdoor air",
            summary: "Air quality is in the good range (AQI " + Math.round(aqi) + ").",
            severity: "info",
            noteworthy: false,
            score: 10,
            evidence: [evidence("aqi", aqi, "air"), evidence("category", air.category, "air")],
            relatedInstrumentIds: ["ph-air", "ph-doorway"]
          })
        );
      } else if (aqi <= 100) {
        out.push(
          signal({
            id: "air-moderate",
            category: "air",
            title: "Moderate air quality",
            summary: "AQI " + Math.round(aqi) + " — sensitive groups may notice it outdoors.",
            severity: "info",
            score: 34,
            evidence: [evidence("aqi", aqi, "air"), evidence("category", air.category, "air")],
            relatedInstrumentIds: ["ph-air", "ph-doorway"]
          })
        );
      } else {
        out.push(
          signal({
            id: "air-unhealthy",
            category: "air",
            title: "Air quality concern",
            summary: "AQI " + Math.round(aqi) + (air.category ? " (" + air.category + ")" : "") + ".",
            severity: aqi >= 150 ? "high" : "elevated",
            score: 72,
            evidence: [evidence("aqi", aqi, "air"), evidence("pm25", air.pm25, "air")],
            relatedInstrumentIds: ["ph-air", "ph-doorway", "ph-alerts"]
          })
        );
      }
    }

    /* Light / photography windows */
    var sunsetMins = minutesUntil(light.sunset, when);
    var sunriseMins = minutesUntil(light.sunrise, when);
    var cloud = w.cloudCoverPct;
    if (sunsetMins != null && sunsetMins >= 0 && sunsetMins <= 75) {
      var photoOk = cloud == null || cloud <= 70;
      out.push(
        signal({
          id: "light-golden-approaching",
          category: "light",
          title: sunsetMins <= 45 ? "Golden hour window" : "Golden hour approaching",
          summary:
            "Sunset in about " +
            sunsetMins +
            " minutes" +
            (light.sunsetFormatted || light.sunset
              ? " (" + (light.sunsetFormatted || formatClock(light.sunset, tz)) + ")"
              : "") +
            ".",
          severity: "info",
          score: photoOk ? 48 : 30,
          evidence: [
            evidence("minutesToSunset", sunsetMins, "computed"),
            evidence("sunset", light.sunset || light.sunsetFormatted, "daylight"),
            evidence("cloudCoverPct", cloud, "weather")
          ],
          relatedInstrumentIds: ["ph-light", "ph-doorway", "ph-uv"],
          toolLinks: photoOk
            ? [{ id: "scenes", label: "Scenes", href: "/apps/scenes/", reason: "Favorable evening light window" }]
            : []
        })
      );
    } else if (String(light.kind || "").toLowerCase().indexOf("blue") >= 0) {
      out.push(
        signal({
          id: "light-blue-hour",
          category: "light",
          title: "Blue hour",
          summary: "In the blue-hour window.",
          severity: "info",
          score: 40,
          evidence: [evidence("light.kind", light.kind, "daylight")],
          relatedInstrumentIds: ["ph-light", "ph-doorway"],
          toolLinks: [{ id: "scenes", label: "Scenes", href: "/apps/scenes/", reason: "Blue-hour light" }]
        })
      );
    } else if (w.uvIndex != null && w.uvIndex >= 6) {
      out.push(
        signal({
          id: "uv-high",
          category: "light",
          title: "Strong sunlight",
          summary: "UV index near " + (Math.round(w.uvIndex * 10) / 10) + ".",
          severity: w.uvIndex >= 8 ? "elevated" : "info",
          score: 36,
          evidence: [evidence("uvIndex", w.uvIndex, "weather")],
          relatedInstrumentIds: ["ph-uv", "ph-doorway"]
        })
      );
    }

    /* Astronomy */
    var illum = astro.illuminationPct;
    if (illum != null && illum <= 5 && (cloud == null || cloud <= 45) && isNightNow(light, when)) {
      out.push(
        signal({
          id: "astro-dark-moon-clear",
          category: "astronomy",
          title: "Dark-moon night",
          summary:
            "Near-new moon (" +
            Math.round(illum) +
            "% lit)" +
            (cloud != null ? " with cloud cover near " + Math.round(cloud) + "%" : "") +
            ".",
          severity: "info",
          score: cloud != null && cloud <= 30 ? 44 : 26,
          evidence: [
            evidence("moon.illuminationPct", illum, "astronomy"),
            evidence("moon.phase", astro.phase, "astronomy"),
            evidence("cloudCoverPct", cloud, "weather")
          ],
          relatedInstrumentIds: ["ph-astronomy", "ph-doorway"],
          toolLinks:
            cloud != null && cloud <= 35
              ? [{ id: "scenes", label: "Scenes", href: "/apps/scenes/", reason: "Dark-sky opportunity" }]
              : []
        })
      );
    } else if (illum != null && illum >= 90 && cloud != null && cloud >= 70) {
      out.push(
        signal({
          id: "astro-bright-moon-cloudy",
          category: "astronomy",
          title: "Bright moon, cloudy sky",
          summary: "Nearly full moon under a heavy cloud deck — sky viewing is limited.",
          severity: "info",
          noteworthy: false,
          score: 14,
          evidence: [
            evidence("moon.illuminationPct", illum, "astronomy"),
            evidence("cloudCoverPct", cloud, "weather")
          ],
          relatedInstrumentIds: ["ph-astronomy"]
        })
      );
    }

    /* Daylight remaining (practical, not always noteworthy) */
    if (sunsetMins != null && sunsetMins > 75 && sunsetMins <= 240) {
      out.push(
        signal({
          id: "light-daylight-remaining",
          category: "light",
          title: "Daylight remaining",
          summary: "About " + Math.round(sunsetMins / 60 * 10) / 10 + " hours of daylight left.",
          severity: "info",
          noteworthy: false,
          score: 11,
          evidence: [evidence("minutesToSunset", sunsetMins, "computed")],
          relatedInstrumentIds: ["ph-light", "ph-doorway"]
        })
      );
    } else if (sunriseMins != null && sunriseMins >= 0 && sunriseMins <= 90) {
      out.push(
        signal({
          id: "light-sunrise-soon",
          category: "light",
          title: "Sunrise approaching",
          summary: "Sunrise in about " + sunriseMins + " minutes.",
          severity: "info",
          score: 38,
          evidence: [evidence("minutesToSunrise", sunriseMins, "computed")],
          relatedInstrumentIds: ["ph-light", "ph-doorway"],
          toolLinks: [{ id: "scenes", label: "Scenes", href: "/apps/scenes/", reason: "Morning light window" }]
        })
      );
    }

    return out;
  }

  function rankSignals(signals, options) {
    options = options || {};
    var minScore = options.minScore != null ? options.minScore : 0;
    var noteworthyOnly = !!options.noteworthyOnly;
    var limit = options.limit != null ? options.limit : 8;
    var list = (signals || []).slice().filter(function (s) {
      if (!s) return false;
      if (noteworthyOnly && !s.noteworthy) return false;
      return (s.score || 0) >= minScore;
    });
    list.sort(function (a, b) {
      if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
      var sev = { high: 3, elevated: 2, info: 1 };
      return (sev[b.severity] || 0) - (sev[a.severity] || 0);
    });
    return list.slice(0, limit);
  }

  function pickBeforeYouGoSignals(signals) {
    var ranked = rankSignals(signals, { limit: 12 });
    var chosen = [];
    var cats = Object.create(null);
    ranked.forEach(function (s) {
      if (chosen.length >= 4) return;
      if (s.id === "alert-none") return;
      if (s.id === "precip-dry-now" && chosen.length) return;
      if (s.id === "wind-calm" && chosen.length >= 2) return;
      if (s.id === "air-good" && chosen.length >= 2) return;
      if (s.id === "light-daylight-remaining" && chosen.length >= 2) return;
      if (cats[s.category] && s.severity === "info" && !s.noteworthy) return;
      chosen.push(s);
      cats[s.category] = true;
    });
    return chosen;
  }

  function composeBeforeYouGoBrief(state, signals) {
    state = state || {};
    var w = state.weather || {};
    var chosen = pickBeforeYouGoSignals(signals || []);
    var parts = [];

    var temp = w.temperatureF;
    var humidity = w.humidityPct;
    var wind = w.windMph;
    var comfort = chosen.filter(function (s) {
      return s.category === "temperature";
    })[0];
    if (comfort) {
      parts.push(comfort.summary.replace(/\.$/, ""));
    } else if (temp != null) {
      var feel =
        temp <= 40 ? "Cold" : temp <= 55 ? "Cool" : temp <= 72 ? "Mild" : temp <= 84 ? "Warm" : "Hot";
      var hum =
        humidity != null && humidity >= 70 ? " and humid" : humidity != null && humidity <= 35 ? " and dry" : "";
      parts.push(feel + hum + " (" + Math.round(temp) + "°F)");
    }

    var precip = chosen.filter(function (s) {
      return s.category === "precipitation";
    })[0];
    if (precip && precip.id !== "precip-dry-now") {
      parts.push(precip.summary.replace(/\.$/, ""));
    } else if (precip && precip.id === "precip-dry-now" && parts.length < 2) {
      parts.push("Little rain risk right now");
    }

    var windSig = chosen.filter(function (s) {
      return s.category === "wind";
    })[0];
    if (windSig && windSig.id !== "wind-calm") {
      parts.push(windSig.summary.replace(/\.$/, ""));
    } else if (wind != null && wind <= 6 && parts.length < 3) {
      parts.push("no significant wind");
    }

    var airSig = chosen.filter(function (s) {
      return s.category === "air" && s.id !== "air-good";
    })[0];
    if (airSig) parts.push(airSig.summary.replace(/\.$/, ""));

    var alertSig = chosen.filter(function (s) {
      return s.category === "alerts" && s.id !== "alert-none";
    })[0];
    if (alertSig) parts.unshift(alertSig.summary.replace(/\.$/, ""));

    var lightSig = chosen.filter(function (s) {
      return s.category === "light" && s.noteworthy;
    })[0];
    if (lightSig && parts.length < 4) parts.push(lightSig.summary.replace(/\.$/, ""));

    var astroSig = chosen.filter(function (s) {
      return s.category === "astronomy" && s.noteworthy && (s.score || 0) >= 40;
    })[0];
    if (astroSig && parts.length < 4) parts.push(astroSig.summary.replace(/\.$/, ""));

    if (!parts.length) {
      return {
        brief: "Conditions are settling for this place.",
        facts: [],
        signals: chosen,
        evidence: []
      };
    }

    var brief = parts
      .slice(0, 3)
      .join(". ")
      .replace(/\s+/g, " ")
      .trim();
    if (!/[.!?]$/.test(brief)) brief += ".";
    brief = brief.charAt(0).toUpperCase() + brief.slice(1);

    var facts = [];
    if (alertSig) facts.push({ label: "Alerts", value: alertSig.title, note: "Live" });
    if (precip && precip.id !== "precip-dry-now") {
      facts.push({ label: "Precip", value: precip.title, note: "Derived" });
    } else if (w.precipProbabilityPct != null && w.precipProbabilityPct >= 20) {
      facts.push({
        label: "Precip now",
        value: Math.round(w.precipProbabilityPct) + "%",
        note: "Live"
      });
    }
    if (windSig && windSig.id !== "wind-calm") {
      facts.push({ label: "Wind", value: windSig.title, note: "Derived" });
    } else if (wind != null) {
      facts.push({ label: "Wind", value: Math.round(wind) + " mph", note: "Live" });
    }
    if (airSig) facts.push({ label: "Air", value: airSig.title, note: "Derived" });
    if (lightSig) facts.push({ label: "Light", value: lightSig.title, note: "Derived" });

    var evidence = [];
    chosen.forEach(function (s) {
      (s.evidence || []).forEach(function (e) {
        evidence.push(e);
      });
    });

    return {
      brief: brief,
      facts: facts.slice(0, 4),
      signals: chosen,
      evidence: evidence
    };
  }

  function happeningNow(state, options) {
    var signals = deriveSignals(state);
    return rankSignals(signals, {
      noteworthyOnly: true,
      minScore: options && options.minScore != null ? options.minScore : 25,
      limit: options && options.limit != null ? options.limit : 5
    });
  }

  function contextualLinksFor(signals) {
    var seen = Object.create(null);
    var links = [];
    (signals || []).forEach(function (s) {
      (s.toolLinks || []).forEach(function (link) {
        if (!link || !link.id || seen[link.id]) return;
        /* Only surface known live tools with justified reasons */
        if (link.id !== "scenes") return;
        seen[link.id] = true;
        links.push(link);
      });
    });
    return links;
  }

  function analyze(platform, location, now) {
    var state = normalizeEnvState(platform, location, now);
    var signals = deriveSignals(state, now);
    var brief = composeBeforeYouGoBrief(state, signals);
    var notable = happeningNow(state, { minScore: 25, limit: 5 });
    return {
      state: state,
      signals: signals,
      beforeYouGo: brief,
      happeningNow: notable,
      toolLinks: contextualLinksFor(notable.length ? notable : brief.signals)
    };
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardRebuildIntel = {
    version: "1.0.0-instrument-intelligence",
    normalizeEnvState: normalizeEnvState,
    deriveSignals: deriveSignals,
    rankSignals: rankSignals,
    composeBeforeYouGoBrief: composeBeforeYouGoBrief,
    happeningNow: happeningNow,
    contextualLinksFor: contextualLinksFor,
    analyze: analyze
  };
})(typeof window !== "undefined" ? window : global);
