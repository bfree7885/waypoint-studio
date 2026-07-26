/**
 * Dashboard Rebuild — functional tile payload adapters.
 * Every payload reads the one shared OIP platform package. No tile fetches on
 * its own, nothing is fabricated, and every interpretation names its inputs.
 * Authority: docs/rebuild-2026/03-dashboard-architecture.md
 */
(function (global) {
  "use strict";

  var LIVE_IDS = [
    "ph-conditions",
    "ph-hourly",
    "ph-forecast",
    "ph-wind",
    "ph-precip",
    "ph-golden",
    "ph-blue",
    "ph-photo",
    "ph-sky",
    "ph-night-photo",
    "ph-sun",
    "ph-moon",
    "ph-dark-sky",
    "ph-air",
    "ph-uv",
    "ph-exposure",
    "ph-hiking-window",
    "ph-daylight-left",
    "ph-trail-estimate",
    "ph-pack",
    "ph-river",
    "ph-rainfall",
    "ph-flood",
    "ph-birding",
    "ph-wildlife-window",
    "ph-seasonal",
    "ph-driving",
    "ph-travel-window",
    "ph-place",
    "ph-alerts",
    "ph-risk",
    "ph-freeze"
  ];
  var MAX_TODAY_LINES = 8;

  function num(val) {
    if (val == null) return null;
    if (typeof val === "number" && isFinite(val)) return val;
    if (typeof val === "object" && val.value != null) return num(val.value);
    var n = parseFloat(String(val).replace(/[^\d.-]/g, ""));
    return isFinite(n) ? n : null;
  }

  function isLiveWidget(id) {
    return LIVE_IDS.indexOf(id) >= 0;
  }

  function round(n) {
    return n == null ? null : Math.round(n);
  }

  function platformTrust(platform) {
    var Rel = global.WDS && global.WDS.dashboardReliability;
    if (Rel && Rel.classifyPackageTrust) {
      var t = Rel.classifyPackageTrust(platform);
      if (t === "live" || t === "partial" || t === "cached" || t === "offline") return t;
      if (t === "provider-unavailable" || t === "unavailable") return "unavailable";
      if (t === "estimated") return "partial";
    }
    if (!platform) return "waiting";
    if (platform.meta && platform.meta.fromCache) return "cached";
    if (platform.meta && platform.meta.stale) return "cached";
    return "partial";
  }

  function isOffline() {
    return (
      typeof global.navigator === "object" &&
      global.navigator &&
      global.navigator.onLine === false
    );
  }

  /** Honest empty/unavailable envelope — never a fabricated value. */
  function pending(platform, message) {
    if (!platform) return { trust: "waiting", status: "waiting", message: message, facts: null };
    if (isOffline()) return { trust: "offline", status: "offline", message: null, facts: null };
    return { trust: "unavailable", status: "unavailable", message: message, facts: null };
  }

  function liveTrust(platform) {
    return platform && platform.meta && platform.meta.fromCache ? "cached" : "live";
  }

  var PROVIDER_LABELS = {
    "open-meteo": "Open-Meteo",
    openmeteo: "Open-Meteo",
    nws: "NOAA / National Weather Service",
    "national-weather-service": "NOAA / National Weather Service",
    openweather: "OpenWeather",
    "openweather-onecall": "OpenWeather"
  };

  /** Attribution must name the provider that actually answered, not a default. */
  function weatherSource(platform) {
    var meta = platform && platform.weatherRef && platform.weatherRef.meta;
    var provider = meta && meta.provider ? String(meta.provider).toLowerCase() : null;
    if (!provider) return null;
    return PROVIDER_LABELS[provider] || meta.provider;
  }

  /* ————————————————————————————————————————————————————————————
   * Shared selectors — computed once per platform package so 32 tiles
   * reuse one parse instead of 32 walks of the same object.
   * ———————————————————————————————————————————————————————————— */

  var selCache = { key: null, value: null };

  function weatherCurrent(platform) {
    var wx = platform && platform.weatherRef;
    if (!wx || !wx.meta || wx.meta.isPlaceholder) return null;
    var cur = wx.current || {};
    return {
      live: true,
      tempF: num(cur.temperature),
      feelsF: num(cur.feelsLike) != null ? num(cur.feelsLike) : num(cur.temperature),
      humidity: num(cur.humidity),
      windMph: cur.wind ? num(cur.wind.speed) : null,
      windGust: cur.wind ? num(cur.wind.gust) : null,
      windDir: cur.wind && cur.wind.direction ? cur.wind.direction.label || null : null,
      cloudPct: num(cur.cloudCover),
      precipProb: cur.precipitation ? num(cur.precipitation.probability) : null,
      uvIndex: num(cur.uvIndex),
      pressure: num(cur.pressure),
      conditions: (cur.conditions && cur.conditions.summary) || "",
      meta: wx.meta || {}
    };
  }

  function hourlyRows(platform) {
    var wx = platform && platform.weatherRef;
    var rows = wx && Array.isArray(wx.hourly) ? wx.hourly : [];
    return rows
      .map(function (h) {
        var t = h && h.time ? new Date(h.time) : null;
        if (!t || isNaN(t.getTime())) return null;
        return {
          time: t,
          iso: h.time,
          tempF: num(h.temperature),
          feelsF: num(h.feelsLike),
          popPct: h.precipitation ? num(h.precipitation.probability) : null,
          precipIn: h.precipitation ? num(h.precipitation.amount) : null,
          windMph: h.wind ? num(h.wind.speed) : null,
          gustMph: h.wind ? num(h.wind.gust) : null,
          cloudPct: num(h.cloudCover),
          summary: (h.conditions && h.conditions.summary) || ""
        };
      })
      .filter(Boolean)
      .sort(function (a, b) {
        return a.time - b.time;
      });
  }

  /** Date-only strings parse as UTC midnight, which shifts the weekday west. */
  function parseDay(value) {
    if (!value) return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value));
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    var d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  function dailyRows(platform) {
    var wx = platform && platform.weatherRef;
    var rows = wx && Array.isArray(wx.daily) ? wx.daily : [];
    return rows
      .map(function (d) {
        var t = parseDay(d && d.date);
        var a = num(d.temperatureHigh);
        var b = num(d.temperatureLow);
        /* Some providers publish period pairs out of order; label by value. */
        var hi = a != null && b != null ? Math.max(a, b) : a != null ? a : b;
        var lo = a != null && b != null ? Math.min(a, b) : null;
        return {
          date: t,
          iso: d.date,
          dateOnly: /^\d{4}-\d{2}-\d{2}$/.test(String(d.date || "")),
          highF: hi,
          lowF: lo,
          popPct: d.precipitation ? num(d.precipitation.probability) : null,
          windMph: d.wind ? num(d.wind.speed) : null,
          uvIndex: num(d.uvIndex),
          summary: (d.conditions && d.conditions.summary) || ""
        };
      })
      .filter(function (d) {
        return d.date;
      });
  }

  function airSlice(platform) {
    var aq = platform && platform.airQuality;
    if (!aq || aq.status !== "live") return null;
    var aqi = aq.usAqi != null ? aq.usAqi : aq.aqi;
    if (aqi == null && !aq.category) return null;
    return {
      live: true,
      aqi: num(aqi),
      category: aq.category || null,
      pm25: aq.pm25 != null ? num(aq.pm25) : null,
      summary: aq.summary || null
    };
  }

  function alertsSlice(platform) {
    var a = platform && platform.alerts;
    if (!a) return null;
    return {
      status: a.status || null,
      items: Array.isArray(a.items) ? a.items : [],
      count: a.count != null ? a.count : (a.items || []).length,
      summary: a.summary || null
    };
  }

  function waterSlice(platform) {
    var w = platform && platform.usgsWater;
    if (!w) return null;
    return w;
  }

  function selectors(platform) {
    if (selCache.key === platform && selCache.value) return selCache.value;
    var hours = hourlyRows(platform);
    var now = new Date();
    var value = {
      now: now,
      cur: weatherCurrent(platform),
      hours: hours,
      future: hours.filter(function (h) {
        return h.time.getTime() >= now.getTime() - 30 * 60000;
      }),
      past: hours.filter(function (h) {
        return h.time.getTime() < now.getTime();
      }),
      days: dailyRows(platform),
      dl: (platform && platform.daylight) || null,
      air: airSlice(platform),
      alerts: alertsSlice(platform),
      water: waterSlice(platform),
      tz: (platform && platform.timezone) || null,
      place: platform && platform.region ? platform.region.label : null,
      elevation: (platform && platform.elevation) || null,
      season: platform && platform.calendar ? platform.calendar.season : null,
      latitude: platform && platform.location ? num(platform.location.latitude) : null
    };
    selCache = { key: platform, value: value };
    return value;
  }

  /* ————————————————————————— formatting helpers ————————————————————————— */

  function fmtClock(date, tz) {
    if (!date) return null;
    try {
      return new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone: tz || undefined
      }).format(date);
    } catch (e) {
      return null;
    }
  }

  function fmtHour(date, tz) {
    if (!date) return null;
    try {
      return new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        timeZone: tz || undefined
      }).format(date);
    } catch (e) {
      return null;
    }
  }

  function fmtWeekday(date, tz) {
    if (!date) return null;
    try {
      return new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        timeZone: tz || undefined
      }).format(date);
    } catch (e) {
      return null;
    }
  }

  function parseTime(value) {
    if (!value) return null;
    var d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  function durationLabel(ms) {
    if (ms == null || ms <= 0) return null;
    var mins = Math.round(ms / 60000);
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    if (h <= 0) return m + " min";
    if (m === 0) return h + " hr";
    return h + " hr " + m + " min";
  }

  function rangeStart(range) {
    if (!range) return null;
    var parts = String(range).split(/\s*[–—-]\s*/);
    return parts[0] ? parts[0].trim() : null;
  }

  function windLabel(mph) {
    if (mph == null) return null;
    if (mph < 8) return "light";
    if (mph < 15) return "moderate";
    return "strong";
  }

  function cloudCharacter(pct) {
    if (pct == null) return null;
    if (pct <= 15) return "Clear";
    if (pct <= 40) return "Mostly clear";
    if (pct <= 70) return "Partly cloudy";
    if (pct <= 90) return "Mostly cloudy";
    return "Overcast";
  }

  function nightSkyNote(cloudPct, illum) {
    if (cloudPct == null) return null;
    if (cloudPct <= 30 && (illum == null || illum < 40)) return "Favorable for stars";
    if (cloudPct >= 70) return "Clouds will limit the night sky";
    return "Mixed night sky";
  }

  function sumPrecip(rows) {
    var total = 0;
    var seen = false;
    rows.forEach(function (h) {
      if (h.precipIn != null) {
        total += h.precipIn;
        seen = true;
      }
    });
    return seen ? total : null;
  }

  function ok(platform, facts, extra) {
    var payload = {
      trust: liveTrust(platform),
      status: "live",
      message: null,
      facts: facts
    };
    if (extra) {
      Object.keys(extra).forEach(function (k) {
        payload[k] = extra[k];
      });
    }
    return payload;
  }

  function estimated(platform, facts, interpretation, basis, extra) {
    var payload = ok(platform, facts, extra);
    payload.trust = "estimated";
    if (interpretation) payload.interpretation = interpretation;
    if (basis) payload.basis = basis;
    return payload;
  }

  /* ————————————————————————————— Weather ————————————————————————————— */

  function conditionsPayload(platform) {
    var cur = selectors(platform).cur;
    if (!cur) return pending(platform, "Waiting for weather data.");
    var facts = [];
    if (cur.tempF != null) facts.push({ label: "Temp", value: round(cur.tempF) + "°F" });
    if (cur.feelsF != null && cur.tempF != null && round(cur.feelsF) !== round(cur.tempF)) {
      facts.push({ label: "Feels like", value: round(cur.feelsF) + "°F" });
    }
    if (cur.conditions) facts.push({ label: "Sky", value: cur.conditions });
    if (cur.windMph != null) facts.push({ label: "Wind", value: round(cur.windMph) + " mph" });
    if (cur.humidity != null) facts.push({ label: "Humidity", value: round(cur.humidity) + "%" });
    if (cur.precipProb != null) {
      facts.push({ label: "Precip chance", value: round(cur.precipProb) + "%" });
    }
    if (!facts.length) return pending(platform, "Weather temporarily unavailable.");
    return ok(platform, facts, { current: cur });
  }

  function hourlyPayload(platform) {
    var s = selectors(platform);
    if (!s.future.length) return pending(platform, "Hourly forecast unavailable for this place right now.");
    var picks = s.future.slice(0, 4);
    var facts = picks.map(function (h) {
      var bits = [];
      if (h.tempF != null) bits.push(round(h.tempF) + "°F");
      if (h.popPct != null) bits.push(round(h.popPct) + "% precip");
      else if (h.summary) bits.push(h.summary);
      return {
        label: fmtHour(h.time, s.tz) || "Next hour",
        value: bits.length ? bits.join(" · ") : "No reading"
      };
    });
    return ok(platform, facts, { hours: picks });
  }

  function forecastPayload(platform) {
    var s = selectors(platform);
    if (!s.days.length) return pending(platform, "Daily forecast unavailable for this place right now.");
    var facts = s.days.slice(0, 4).map(function (d) {
      var bits = [];
      if (d.highF != null && d.lowF != null) bits.push(round(d.highF) + "° / " + round(d.lowF) + "°");
      else if (d.highF != null) bits.push("High " + round(d.highF) + "°");
      if (d.popPct != null) bits.push(round(d.popPct) + "%");
      return {
        label: fmtWeekday(d.date, d.dateOnly ? null : s.tz) || "Day",
        value: bits.length ? bits.join(" · ") : d.summary || "No reading"
      };
    });
    return ok(platform, facts, { days: s.days });
  }

  function windPayload(platform) {
    var s = selectors(platform);
    var cur = s.cur;
    if (!cur || cur.windMph == null) {
      return pending(platform, "Wind readings unavailable for this place right now.");
    }
    var facts = [{ label: "Wind", value: round(cur.windMph) + " mph" }];
    if (cur.windGust != null) facts.push({ label: "Gusts", value: round(cur.windGust) + " mph" });
    if (cur.windDir) facts.push({ label: "Direction", value: "From the " + cur.windDir });
    var peak = null;
    s.future.slice(0, 12).forEach(function (h) {
      var v = h.gustMph != null ? h.gustMph : h.windMph;
      if (v != null && (peak == null || v > peak)) peak = v;
    });
    if (peak != null) facts.push({ label: "Next 12 hr peak", value: round(peak) + " mph" });
    var label = windLabel(cur.windMph);
    var interpretation =
      label === "light"
        ? "Light wind at the surface station."
        : label === "moderate"
          ? "Moderate wind — noticeable on exposed ground."
          : "Strong wind — exposed ridges and water will feel it most.";
    return estimated(platform, facts, interpretation, "Based on the current observation and the next 12 forecast hours.");
  }

  function precipPayload(platform) {
    var s = selectors(platform);
    if (!s.future.length) return pending(platform, "Precipitation timing unavailable for this place right now.");
    var window = s.future.slice(0, 12);
    var nextWet = null;
    var nextDry = null;
    window.forEach(function (h) {
      var wet = h.popPct != null && h.popPct >= 40;
      if (wet && !nextWet) nextWet = h;
      if (!wet && h.popPct != null && !nextDry) nextDry = h;
    });
    var facts = [];
    facts.push({
      label: "Next 12 hours",
      value: nextWet ? "Precipitation likely" : "No likely precipitation"
    });
    if (nextWet) {
      facts.push({
        label: "Starts near",
        value: fmtClock(nextWet.time, s.tz) || "soon",
        note: round(nextWet.popPct) + "% chance"
      });
    }
    if (nextDry) {
      facts.push({ label: "Drier from", value: fmtClock(nextDry.time, s.tz) || "later" });
    }
    var total = sumPrecip(window);
    if (total != null) {
      facts.push({ label: "Forecast total", value: total.toFixed(2) + " in" });
    }
    return ok(platform, facts, {
      basis: "Hourly precipitation probability for the next 12 forecast hours."
    });
  }

  /* ——————————————————————————— Photography ——————————————————————————— */

  function goldenPayload(platform) {
    var dl = selectors(platform).dl;
    if (!dl || (!dl.goldenHourMorning && !dl.goldenHourEvening && !dl.goldenHour)) {
      return pending(platform, "Golden hour will appear once sunrise and sunset arrive.");
    }
    var facts = [];
    if (dl.goldenHourMorning) facts.push({ label: "Morning", value: String(dl.goldenHourMorning) });
    if (dl.goldenHourEvening) facts.push({ label: "Evening", value: String(dl.goldenHourEvening) });
    if (!facts.length && dl.goldenHour) facts.push({ label: "Golden hour", value: String(dl.goldenHour) });
    if (dl.sunriseFormatted || dl.sunrise) {
      facts.push({ label: "Sunrise", value: String(dl.sunriseFormatted || dl.sunrise) });
    }
    if (dl.sunsetFormatted || dl.sunset) {
      facts.push({ label: "Sunset", value: String(dl.sunsetFormatted || dl.sunset) });
    }
    return estimated(
      platform,
      facts,
      null,
      "Calculated from sunrise and sunset for this location and date."
    );
  }

  function bluePayload(platform) {
    var dl = selectors(platform).dl;
    if (!dl || (!dl.blueHourMorning && !dl.blueHourEvening && !dl.blueHour)) {
      return pending(platform, "Blue hour will appear once sunrise and sunset arrive.");
    }
    var facts = [];
    if (dl.blueHourMorning) facts.push({ label: "Morning", value: String(dl.blueHourMorning) });
    if (dl.blueHourEvening) facts.push({ label: "Evening", value: String(dl.blueHourEvening) });
    if (!facts.length && dl.blueHour) facts.push({ label: "Blue hour", value: String(dl.blueHour) });
    if (dl.civilTwilightEvening) {
      facts.push({ label: "Civil twilight", value: String(dl.civilTwilightEvening) });
    }
    return estimated(
      platform,
      facts,
      null,
      "Calculated from civil twilight for this location and date."
    );
  }

  function photoPayload(platform) {
    var s = selectors(platform);
    var cur = s.cur;
    var dl = s.dl;
    if (!cur && !dl) return pending(platform, "Photography conditions need weather data for this place.");
    var facts = [];
    if (cur && cur.cloudPct != null) {
      facts.push({
        label: "Cloud cover",
        value: round(cur.cloudPct) + "%",
        note: cloudCharacter(cur.cloudPct)
      });
    }
    if (cur && cur.windMph != null) facts.push({ label: "Wind", value: round(cur.windMph) + " mph" });
    if (cur && cur.precipProb != null) {
      facts.push({ label: "Precip chance", value: round(cur.precipProb) + "%" });
    }
    if (dl && dl.goldenHourEvening) {
      facts.push({ label: "Next golden hour", value: String(dl.goldenHourEvening) });
    }
    if (!facts.length) return pending(platform, "Photography conditions need weather data for this place.");

    var reads = [];
    if (cur && cur.cloudPct != null) {
      if (cur.cloudPct >= 30 && cur.cloudPct <= 75) {
        reads.push("broken cloud may favor softer landscape light");
      } else if (cur.cloudPct > 90) {
        reads.push("overcast will flatten contrast");
      } else if (cur.cloudPct < 15) {
        reads.push("clear sky means harder light away from golden hour");
      }
    }
    if (cur && cur.windMph != null && cur.windMph >= 15) {
      reads.push("wind may limit long exposures");
    }
    if (cur && cur.precipProb != null && cur.precipProb >= 50) {
      reads.push("keep rain protection for gear");
    }
    return estimated(
      platform,
      facts,
      reads.length ? "Conditions " + reads.join("; ") + "." : null,
      "Read from cloud cover, wind, precipitation chance, and calculated light windows."
    );
  }

  function skyPayload(platform) {
    var cur = selectors(platform).cur;
    if (!cur || cur.cloudPct == null) {
      return pending(platform, "Cloud cover unavailable for this place right now.");
    }
    var facts = [
      { label: "Cloud cover", value: round(cur.cloudPct) + "%" },
      { label: "Sky", value: cloudCharacter(cur.cloudPct) }
    ];
    if (cur.conditions) facts.push({ label: "Reported", value: cur.conditions });
    if (cur.humidity != null) facts.push({ label: "Humidity", value: round(cur.humidity) + "%" });
    var dramatic =
      cur.cloudPct >= 25 && cur.cloudPct <= 80
        ? "Broken cloud can produce more texture at sunrise and sunset."
        : cur.cloudPct > 80
          ? "Heavy cover usually mutes colour at the horizon."
          : "Mostly empty sky — colour tends to be simple.";
    return estimated(platform, facts, dramatic, "Based on reported cloud cover and humidity.");
  }

  function nightPhotoPayload(platform) {
    var s = selectors(platform);
    var dl = s.dl;
    var cur = s.cur;
    var illum = dl && dl.moonIllumination != null ? num(dl.moonIllumination) : null;
    var cloud = cur && cur.cloudPct != null ? cur.cloudPct : null;
    if (illum == null && cloud == null) {
      return pending(platform, "Night conditions need moon and cloud data.");
    }
    var facts = [];
    if (dl && dl.moonPhase) facts.push({ label: "Moon", value: String(dl.moonPhase) });
    if (illum != null) facts.push({ label: "Illumination", value: round(illum) + "%" });
    if (cloud != null) facts.push({ label: "Cloud cover", value: round(cloud) + "%" });
    if (dl && dl.astronomicalTwilightEvening) {
      facts.push({ label: "Full dark after", value: String(dl.astronomicalTwilightEvening) });
    }
    var note = nightSkyNote(cloud, illum);
    return estimated(
      platform,
      facts,
      note ? note + "." : null,
      "Moon illumination is computed locally; cloud cover is from the forecast provider."
    );
  }

  /* ————————————————————————————— Astronomy ————————————————————————————— */

  function sunPayload(platform) {
    var s = selectors(platform);
    var dl = s.dl;
    if (!dl || (!dl.sunrise && !dl.sunriseFormatted && !dl.sunset && !dl.sunsetFormatted)) {
      return pending(platform, "Sun times will appear for this place shortly.");
    }
    var facts = [];
    if (dl.sunriseFormatted || dl.sunrise) {
      facts.push({ label: "Sunrise", value: String(dl.sunriseFormatted || dl.sunrise) });
    }
    if (dl.sunsetFormatted || dl.sunset) {
      facts.push({ label: "Sunset", value: String(dl.sunsetFormatted || dl.sunset) });
    }
    if (dl.dayLengthHours != null) {
      var hrs = num(dl.dayLengthHours);
      if (hrs != null) {
        var h = Math.floor(hrs);
        var m = Math.round((hrs - h) * 60);
        facts.push({ label: "Day length", value: h + " hr " + m + " min" });
      }
    }
    var rise = parseTime(dl.sunrise);
    var set = parseTime(dl.sunset);
    if (rise && set) {
      var mid = new Date((rise.getTime() + set.getTime()) / 2);
      var midLabel = fmtClock(mid, s.tz);
      if (midLabel) facts.push({ label: "Solar midpoint", value: midLabel });
    }
    if (dl.civilTwilight) facts.push({ label: "Civil twilight", value: String(dl.civilTwilight) });
    return estimated(platform, facts, null, "Sun times calculated for this location and date.");
  }

  function moonPayload(platform) {
    var dl = selectors(platform).dl;
    var illum = dl && dl.moonIllumination != null ? num(dl.moonIllumination) : null;
    if (!dl || (!dl.moonPhase && illum == null)) {
      return pending(platform, "Moon phase will appear once the date resolves.");
    }
    var facts = [];
    if (dl.moonPhase) facts.push({ label: "Phase", value: String(dl.moonPhase) });
    if (illum != null) facts.push({ label: "Illumination", value: round(illum) + "%" });
    if (illum != null) {
      facts.push({
        label: "Night brightness",
        value: illum >= 70 ? "Bright" : illum >= 30 ? "Moderate" : "Dark"
      });
    }
    return estimated(
      platform,
      facts,
      null,
      "Lunar phase computed locally from the current date. Moonrise and moonset are not published by our sources."
    );
  }

  function darkSkyPayload(platform) {
    var s = selectors(platform);
    var dl = s.dl;
    var cur = s.cur;
    if (!dl || (!dl.astronomicalTwilightEvening && !dl.astronomicalTwilight)) {
      return pending(platform, "Dark-sky context needs twilight and cloud data.");
    }
    var illum = dl.moonIllumination != null ? num(dl.moonIllumination) : null;
    var cloud = cur && cur.cloudPct != null ? cur.cloudPct : null;
    var facts = [];
    if (dl.astronomicalTwilightEvening) {
      facts.push({ label: "Full dark after", value: String(dl.astronomicalTwilightEvening) });
    }
    if (dl.astronomicalTwilightMorning) {
      facts.push({ label: "Dark until", value: String(dl.astronomicalTwilightMorning) });
    }
    if (illum != null) {
      facts.push({
        label: "Moon interference",
        value: illum >= 70 ? "High" : illum >= 30 ? "Moderate" : "Low",
        note: round(illum) + "% lit"
      });
    }
    if (cloud != null) facts.push({ label: "Cloud cover", value: round(cloud) + "%" });
    var note = nightSkyNote(cloud, illum);
    return estimated(
      platform,
      facts,
      note ? note + "." : null,
      "Astronomical twilight and moon illumination are calculated; cloud cover is forecast data."
    );
  }

  /* ———————————————————————— Air and Environment ———————————————————————— */

  function airPayload(platform) {
    var aq = selectors(platform).air;
    if (!aq) return pending(platform, "Air quality unavailable for this place right now.");
    var facts = [];
    if (aq.category) facts.push({ label: "Quality", value: String(aq.category) });
    if (aq.aqi != null) facts.push({ label: "US AQI", value: String(round(aq.aqi)) });
    if (aq.pm25 != null) facts.push({ label: "PM2.5", value: String(round(aq.pm25)) + " µg/m³" });
    return ok(platform, facts, { air: aq });
  }

  function uvCategory(uv) {
    if (uv == null) return null;
    if (uv < 3) return "Low";
    if (uv < 6) return "Moderate";
    if (uv < 8) return "High";
    if (uv < 11) return "Very high";
    return "Extreme";
  }

  function uvPayload(platform) {
    var s = selectors(platform);
    var cur = s.cur;
    var today = s.days.length ? s.days[0] : null;
    var uvNow = cur && cur.uvIndex != null ? cur.uvIndex : null;
    var uvMax = today && today.uvIndex != null ? today.uvIndex : null;
    if (uvNow == null && uvMax == null) {
      return pending(platform, "UV index unavailable for this place right now.");
    }
    var facts = [];
    if (uvNow != null) {
      facts.push({ label: "UV now", value: String(round(uvNow)), note: uvCategory(uvNow) });
    }
    if (uvMax != null) {
      facts.push({ label: "Today's max", value: String(round(uvMax)), note: uvCategory(uvMax) });
    }
    var ref = uvNow != null ? uvNow : uvMax;
    var interpretation =
      ref >= 8
        ? "Very high UV — shade and covering matter even on short outings."
        : ref >= 6
          ? "High UV during the middle of the day."
          : ref >= 3
            ? "Moderate UV."
            : "Low UV.";
    return ok(platform, facts, { interpretation: interpretation });
  }

  function exposurePayload(platform) {
    var s = selectors(platform);
    var cur = s.cur;
    var aq = s.air;
    if (!cur && !aq) return pending(platform, "Exposure summary needs air and weather data.");
    var facts = [];
    if (aq && aq.category) {
      facts.push({ label: "Air", value: String(aq.category), note: aq.aqi != null ? "AQI " + round(aq.aqi) : null });
    }
    if (cur && cur.uvIndex != null) {
      facts.push({ label: "UV", value: String(round(cur.uvIndex)), note: uvCategory(cur.uvIndex) });
    }
    if (cur && cur.feelsF != null) facts.push({ label: "Feels like", value: round(cur.feelsF) + "°F" });
    if (cur && cur.humidity != null) facts.push({ label: "Humidity", value: round(cur.humidity) + "%" });
    if (!facts.length) return pending(platform, "Exposure summary needs air and weather data.");

    var flags = [];
    if (aq && aq.aqi != null && aq.aqi > 100) flags.push("air quality above 100 AQI");
    if (cur && cur.uvIndex != null && cur.uvIndex >= 6) flags.push("high UV");
    if (cur && cur.feelsF != null && cur.feelsF >= 90) flags.push("high apparent temperature");
    if (cur && cur.feelsF != null && cur.feelsF <= 25) flags.push("low apparent temperature");
    return estimated(
      platform,
      facts,
      flags.length
        ? "Longer exposure is worth planning around: " + flags.join(", ") + "."
        : "No elevated exposure factors in the current readings.",
      "Summarized from air quality, UV index, and apparent temperature."
    );
  }

  /* ————————————————————————— Hiking and Trails ————————————————————————— */

  function hikingWindowPayload(platform) {
    var s = selectors(platform);
    if (!s.future.length) return pending(platform, "Hiking window needs hourly weather for this place.");
    var window = s.future.slice(0, 12);
    var best = null;
    window.forEach(function (h) {
      var score = 0;
      if (h.popPct != null) score += h.popPct;
      if (h.windMph != null) score += h.windMph * 2;
      if (h.tempF != null) score += Math.abs(h.tempF - 62) * 1.5;
      if (best == null || score < best.score) best = { hour: h, score: score };
    });
    if (!best) return pending(platform, "Hiking window needs hourly weather for this place.");
    var facts = [];
    facts.push({
      label: "Calmest hour ahead",
      value: fmtClock(best.hour.time, s.tz) || "Soon"
    });
    if (best.hour.tempF != null) facts.push({ label: "Temp then", value: round(best.hour.tempF) + "°F" });
    if (best.hour.popPct != null) facts.push({ label: "Precip chance", value: round(best.hour.popPct) + "%" });
    if (best.hour.windMph != null) facts.push({ label: "Wind", value: round(best.hour.windMph) + " mph" });
    var sunset = s.dl ? parseTime(s.dl.sunset) : null;
    if (sunset) {
      facts.push({
        label: "Daylight ends",
        value: fmtClock(sunset, s.tz) || String(s.dl.sunsetFormatted || "")
      });
    }
    var alertNote =
      s.alerts && s.alerts.count > 0
        ? " An official alert is active — read it before heading out."
        : "";
    return estimated(
      platform,
      facts,
      "Estimated from forecast precipitation, wind, and temperature." + alertNote,
      "Ranked across the next 12 forecast hours. This is a conditions estimate, not a trail report."
    );
  }

  function daylightLeftPayload(platform) {
    var s = selectors(platform);
    var dl = s.dl;
    var sunset = dl ? parseTime(dl.sunset) : null;
    if (!sunset) return pending(platform, "Daylight remaining needs sunset time for this place.");
    var remaining = sunset.getTime() - s.now.getTime();
    var facts = [];
    facts.push({
      label: "Until sunset",
      value: remaining > 0 ? durationLabel(remaining) || "Less than a minute" : "Sun has set"
    });
    facts.push({ label: "Sunset", value: String(dl.sunsetFormatted || fmtClock(sunset, s.tz) || "") });
    if (dl.civilTwilightEvening) {
      facts.push({ label: "Usable light until", value: String(dl.civilTwilightEvening) });
    }
    if (dl.dayLengthHours != null) {
      var hrs = num(dl.dayLengthHours);
      if (hrs != null) facts.push({ label: "Day length", value: hrs.toFixed(1) + " hr" });
    }
    return estimated(
      platform,
      facts,
      remaining > 0 && remaining < 90 * 60000
        ? "Under ninety minutes of direct daylight remain."
        : null,
      "Calculated from sunset and civil twilight for this location."
    );
  }

  function trailEstimatePayload(platform) {
    var s = selectors(platform);
    var cur = s.cur;
    if (!cur && !s.past.length) {
      return pending(platform, "Trail estimate needs recent precipitation and temperature.");
    }
    var recent = sumPrecip(s.past.slice(-24));
    var facts = [];
    if (recent != null) {
      facts.push({ label: "Rain, last 24 hr", value: recent.toFixed(2) + " in" });
    }
    if (cur && cur.tempF != null) facts.push({ label: "Temp", value: round(cur.tempF) + "°F" });

    var state = "Likely firm";
    var why = [];
    if (recent != null && recent >= 0.5) {
      state = "Likely soft or muddy";
      why.push(recent.toFixed(2) + " in of rain in the last 24 hours");
    } else if (recent != null && recent >= 0.1) {
      state = "Possibly damp";
      why.push("light recent rain");
    }
    if (cur && cur.tempF != null && cur.tempF <= 34) {
      state = "Possible ice";
      why.push("temperature near or below freezing");
    }
    if (cur && cur.feelsF != null && cur.feelsF >= 92) {
      why.push("high apparent temperature on exposed ground");
    }
    facts.push({ label: "Estimate", value: state });
    return estimated(
      platform,
      facts,
      why.length ? "Estimated from " + why.join(" and ") + "." : "Estimated from recent rainfall and temperature.",
      "This is a weather-derived estimate. It is not a trail report — check the land manager for closures and conditions."
    );
  }

  function packPayload(platform) {
    var s = selectors(platform);
    var cur = s.cur;
    if (!cur) return pending(platform, "Pack guidance needs current conditions.");
    var facts = [];
    if (cur.feelsF != null && cur.feelsF <= 40) {
      facts.push({ label: "Warmth", value: "Insulating layer", note: "feels " + round(cur.feelsF) + "°F" });
    }
    if (cur.precipProb != null && cur.precipProb >= 40) {
      facts.push({ label: "Rain", value: "Shell or cover", note: round(cur.precipProb) + "% chance" });
    }
    if (cur.windMph != null && cur.windMph >= 15) {
      facts.push({ label: "Wind", value: "Windproof layer", note: round(cur.windMph) + " mph" });
    }
    if (cur.uvIndex != null && cur.uvIndex >= 6) {
      facts.push({ label: "Sun", value: "Shade and cover", note: "UV " + round(cur.uvIndex) });
    }
    if (cur.feelsF != null && cur.feelsF >= 85) {
      facts.push({ label: "Water", value: "Extra water", note: "feels " + round(cur.feelsF) + "°F" });
    }
    var sunset = s.dl ? parseTime(s.dl.sunset) : null;
    if (sunset && sunset.getTime() - s.now.getTime() < 3 * 3600000) {
      facts.push({ label: "Light", value: "Headlamp", note: "sunset within three hours" });
    }
    if (!facts.length) {
      facts.push({ label: "Conditions", value: "No condition-driven additions" });
    }
    return estimated(
      platform,
      facts,
      null,
      "Suggestions derived from current temperature, precipitation, wind, UV, and time to sunset. Not a complete safety checklist."
    );
  }

  /* ————————————————————————— Rivers and Water ————————————————————————— */

  function riverPayload(platform) {
    var w = selectors(platform).water;
    if (!w) return pending(platform, "No USGS gauge reporting near this location.");
    if (!w.nearest) {
      return {
        trust: "unavailable",
        status: "empty",
        message: w.disclaimer || "No monitored USGS gauge near this location.",
        facts: null
      };
    }
    var n = w.nearest;
    var facts = [{ label: "Gauge", value: String(n.siteName || "USGS gauge") }];
    if (n.stageFt != null) facts.push({ label: "Gauge height", value: n.stageFt.toFixed(2) + " ft" });
    if (n.dischargeCfs != null) {
      facts.push({ label: "Discharge", value: Math.round(n.dischargeCfs).toLocaleString() + " cfs" });
    }
    if (n.distanceKm != null) {
      facts.push({ label: "Distance", value: (n.distanceKm * 0.621371).toFixed(1) + " mi away" });
    }
    return {
      trust: liveTrust(platform),
      status: "live",
      message: null,
      facts: facts,
      basis: w.disclaimer || "Provisional USGS data — subject to revision.",
      water: w
    };
  }

  function rainfallPayload(platform) {
    var s = selectors(platform);
    if (!s.past.length) return pending(platform, "Recent rainfall needs hourly precipitation data.");
    var last6 = sumPrecip(s.past.slice(-6));
    var last24 = sumPrecip(s.past.slice(-24));
    if (last6 == null && last24 == null) {
      return pending(platform, "Recent rainfall needs hourly precipitation data.");
    }
    var facts = [];
    if (last6 != null) facts.push({ label: "Last 6 hours", value: last6.toFixed(2) + " in" });
    if (last24 != null) facts.push({ label: "Last 24 hours", value: last24.toFixed(2) + " in" });
    var next12 = sumPrecip(s.future.slice(0, 12));
    if (next12 != null) facts.push({ label: "Next 12 hours", value: next12.toFixed(2) + " in" });
    var ref = last24 != null ? last24 : last6;
    var runoff =
      ref >= 1
        ? "Enough recent rain that streams and crossings may respond."
        : ref >= 0.25
          ? "Modest recent rain; small drainages may run higher."
          : "Little recent rain to drive runoff.";
    return estimated(
      platform,
      facts,
      runoff,
      "Totals from hourly forecast precipitation. Runoff wording is an estimate, not a gauge reading."
    );
  }

  function floodPayload(platform) {
    var a = selectors(platform).alerts;
    if (!a) return pending(platform, "Flood alerts unavailable for this place right now.");
    var floods = a.items.filter(function (item) {
      return /flood|flash flood|hydrologic/i.test(String(item.event || "") + " " + String(item.headline || ""));
    });
    if (!floods.length) {
      return {
        trust: liveTrust(platform),
        status: "empty",
        message: "No flood alerts for this place.",
        facts: null
      };
    }
    var facts = floods.slice(0, 3).map(function (item) {
      return {
        label: String(item.event || "Flood alert"),
        value: String(item.severity || "Unknown") + " severity",
        note: item.areaDesc ? String(item.areaDesc).split(";")[0] : null
      };
    });
    return {
      trust: liveTrust(platform),
      status: "live",
      message: null,
      facts: facts,
      basis: "Official National Weather Service flood-related alerts for this location."
    };
  }

  /* ———————————————————————— Wildlife and Birding ———————————————————————— */

  function birdingPayload(platform) {
    var s = selectors(platform);
    var cur = s.cur;
    if (!cur) return pending(platform, "Birding conditions need current weather.");
    var facts = [];
    if (cur.windMph != null) {
      facts.push({
        label: "Wind",
        value: round(cur.windMph) + " mph",
        note: windLabel(cur.windMph)
      });
    }
    if (cur.precipProb != null) facts.push({ label: "Precip chance", value: round(cur.precipProb) + "%" });
    if (cur.tempF != null) facts.push({ label: "Temp", value: round(cur.tempF) + "°F" });
    var sunrise = s.dl ? parseTime(s.dl.sunrise) : null;
    if (sunrise) {
      facts.push({ label: "Dawn chorus near", value: String(s.dl.sunriseFormatted || fmtClock(sunrise, s.tz) || "") });
    }
    var reads = [];
    if (cur.windMph != null && cur.windMph >= 15) reads.push("Higher wind may reduce comfortable bird observation");
    else if (cur.windMph != null && cur.windMph < 8) reads.push("Light wind keeps listening conditions clear");
    if (cur.precipProb != null && cur.precipProb >= 60) reads.push("rain may keep activity lower and optics wet");
    return estimated(
      platform,
      facts,
      reads.length ? reads.join("; ") + "." : null,
      "An observation aid based on wind, precipitation, and time of day. It does not predict which birds are present."
    );
  }

  function wildlifeWindowPayload(platform) {
    var s = selectors(platform);
    var dl = s.dl;
    var sunrise = dl ? parseTime(dl.sunrise) : null;
    var sunset = dl ? parseTime(dl.sunset) : null;
    if (!sunrise && !sunset) return pending(platform, "Observation windows need sunrise and sunset.");
    var facts = [];
    if (sunrise) {
      facts.push({
        label: "Dawn window",
        value:
          (fmtClock(new Date(sunrise.getTime() - 30 * 60000), s.tz) || "") +
          " – " +
          (fmtClock(new Date(sunrise.getTime() + 90 * 60000), s.tz) || "")
      });
    }
    if (sunset) {
      facts.push({
        label: "Dusk window",
        value:
          (fmtClock(new Date(sunset.getTime() - 90 * 60000), s.tz) || "") +
          " – " +
          (fmtClock(new Date(sunset.getTime() + 30 * 60000), s.tz) || "")
      });
    }
    if (s.cur && s.cur.windMph != null) {
      facts.push({ label: "Wind", value: round(s.cur.windMph) + " mph" });
    }
    if (dl && dl.moonIllumination != null) {
      facts.push({ label: "Moon", value: round(num(dl.moonIllumination)) + "% lit" });
    }
    return estimated(
      platform,
      facts,
      "Quiet light around dawn and dusk is when many species are easiest to observe.",
      "Windows calculated from sunrise and sunset. An observation aid, not a prediction that wildlife will appear."
    );
  }

  function seasonalPayload(platform) {
    var s = selectors(platform);
    var dl = s.dl;
    var facts = [];
    if (s.season) facts.push({ label: "Season", value: String(s.season) });
    if (dl && dl.localDate) facts.push({ label: "Local date", value: String(dl.localDate) });
    if (dl && dl.dayLengthHours != null) {
      var hrs = num(dl.dayLengthHours);
      if (hrs != null) facts.push({ label: "Day length", value: hrs.toFixed(1) + " hr" });
    }
    var month = s.now.getMonth();
    var lat = s.latitude;
    var northern = lat == null || lat >= 0;
    var lengthening = northern ? month >= 11 || month < 5 : month >= 5 && month < 11;
    if (dl && dl.dayLengthHours != null) {
      facts.push({ label: "Trend", value: lengthening ? "Days lengthening" : "Days shortening" });
    }
    if (!facts.length) return pending(platform, "Seasonal context needs the local date.");
    return estimated(
      platform,
      facts,
      null,
      "Season and day-length trend derived from the local date and latitude."
    );
  }

  /* ———————————————————————— Travel and Access ———————————————————————— */

  function drivingPayload(platform) {
    var s = selectors(platform);
    var cur = s.cur;
    if (!cur) return pending(platform, "Driving context needs current weather.");
    var facts = [];
    if (cur.precipProb != null) facts.push({ label: "Precip chance", value: round(cur.precipProb) + "%" });
    if (cur.tempF != null) facts.push({ label: "Temp", value: round(cur.tempF) + "°F" });
    if (cur.windMph != null) {
      facts.push({
        label: "Wind",
        value: round(cur.windMph) + " mph",
        note: cur.windGust != null ? "gusts " + round(cur.windGust) : null
      });
    }
    if (cur.conditions) facts.push({ label: "Reported", value: cur.conditions });

    var flags = [];
    if (cur.tempF != null && cur.tempF <= 34 && cur.precipProb != null && cur.precipProb >= 30) {
      flags.push("potential freezing risk based on temperature and precipitation");
    }
    if (cur.windMph != null && cur.windMph >= 25) flags.push("strong crosswind for high-profile vehicles");
    if (/fog|mist|haze/i.test(cur.conditions || "")) flags.push("reduced visibility reported");
    return estimated(
      platform,
      facts,
      flags.length ? "Watch for " + flags.join(", ") + "." : "No weather-driven travel flags in the current reading.",
      "Weather context only. Waypoint does not receive road, closure, or traffic data — check your state DOT."
    );
  }

  function travelWindowPayload(platform) {
    var s = selectors(platform);
    if (!s.future.length) return pending(platform, "Travel window needs hourly weather.");
    var window = s.future.slice(0, 12);
    var best = null;
    window.forEach(function (h) {
      var score = (h.popPct || 0) + (h.windMph || 0) * 1.5;
      if (h.tempF != null && h.tempF <= 34) score += 40;
      if (best == null || score < best.score) best = { hour: h, score: score };
    });
    var facts = [];
    if (best) {
      facts.push({ label: "Calmer departure", value: fmtClock(best.hour.time, s.tz) || "Soon" });
      if (best.hour.popPct != null) facts.push({ label: "Precip chance", value: round(best.hour.popPct) + "%" });
      if (best.hour.windMph != null) facts.push({ label: "Wind", value: round(best.hour.windMph) + " mph" });
    }
    var sunset = s.dl ? parseTime(s.dl.sunset) : null;
    if (sunset) facts.push({ label: "Daylight ends", value: fmtClock(sunset, s.tz) || "" });
    if (s.alerts && s.alerts.count > 0) {
      facts.push({ label: "Official alerts", value: String(s.alerts.count) + " active" });
    }
    if (!facts.length) return pending(platform, "Travel window needs hourly weather.");
    return estimated(
      platform,
      facts,
      null,
      "Ranked from forecast precipitation, wind, and freezing temperature across the next 12 hours. No road data is used."
    );
  }

  function placePayload(platform) {
    var s = selectors(platform);
    var facts = [];
    if (s.place) facts.push({ label: "Place", value: String(s.place) });
    if (s.tz) facts.push({ label: "Timezone", value: String(s.tz) });
    if (s.elevation && s.elevation.available && s.elevation.feet != null) {
      facts.push({ label: "Elevation", value: Math.round(s.elevation.feet).toLocaleString() + " ft" });
    }
    if (s.dl && s.dl.localDate) facts.push({ label: "Local date", value: String(s.dl.localDate) });
    if (s.dl && s.dl.utcOffset) facts.push({ label: "UTC offset", value: String(s.dl.utcOffset) });
    if (!facts.length) return pending(platform, "Location details will appear once a place is set.");
    return ok(platform, facts);
  }

  /* ———————————————————————— Alerts and Safety ———————————————————————— */

  function alertsPayload(platform) {
    var a = selectors(platform).alerts;
    if (!a) return pending(platform, "Alerts unavailable for this place right now.");
    if (a.status === "unavailable") {
      return {
        trust: "unavailable",
        status: "unavailable",
        message: "NWS alerts unavailable for this place right now.",
        facts: null
      };
    }
    if (!a.items.length) {
      return {
        trust: liveTrust(platform),
        status: "empty",
        message: "No active alerts for this place.",
        facts: null
      };
    }
    var facts = a.items.slice(0, 3).map(function (item) {
      var expires = parseTime(item.expires);
      return {
        label: String(item.event || "Weather alert"),
        value: String(item.severity || "Unknown") + " severity",
        note: expires ? "until " + (fmtClock(expires, selectors(platform).tz) || "") : null
      };
    });
    if (a.items.length > 3) {
      facts.push({ label: "More", value: a.items.length - 3 + " additional alert(s)" });
    }
    return {
      trust: liveTrust(platform),
      status: "live",
      message: null,
      facts: facts,
      basis: "Issued by the National Weather Service."
    };
  }

  function riskPayload(platform) {
    var s = selectors(platform);
    var cur = s.cur;
    var a = s.alerts;
    var aq = s.air;
    if (!cur && !a && !aq) return pending(platform, "Risk summary needs weather and alert data.");
    var reasons = [];
    var level = "Low";
    if (a && a.count > 0) {
      level = "Official alert active";
      reasons.push(a.count + " National Weather Service alert" + (a.count === 1 ? "" : "s"));
    }
    if (cur && cur.windMph != null && cur.windMph >= 25) {
      if (level === "Low") level = "Elevated";
      reasons.push("wind at " + round(cur.windMph) + " mph");
    }
    if (aq && aq.aqi != null && aq.aqi > 100) {
      if (level === "Low") level = "Elevated";
      reasons.push("air quality index " + round(aq.aqi));
    }
    if (cur && cur.feelsF != null && cur.feelsF >= 95) {
      if (level === "Low") level = "Elevated";
      reasons.push("apparent temperature " + round(cur.feelsF) + "°F");
    }
    if (cur && cur.feelsF != null && cur.feelsF <= 20) {
      if (level === "Low") level = "Elevated";
      reasons.push("apparent temperature " + round(cur.feelsF) + "°F");
    }
    var facts = [{ label: "Summary", value: level }];
    if (a) facts.push({ label: "Official alerts", value: a.count > 0 ? String(a.count) + " active" : "None active" });
    if (cur && cur.windMph != null) facts.push({ label: "Wind", value: round(cur.windMph) + " mph" });
    if (aq && aq.aqi != null) facts.push({ label: "US AQI", value: String(round(aq.aqi)) });
    if (cur && cur.feelsF != null) facts.push({ label: "Feels like", value: round(cur.feelsF) + "°F" });
    return estimated(
      platform,
      facts,
      reasons.length
        ? "Raised by " + reasons.join(", ") + "."
        : "No elevated factors in the current alert, wind, air, and temperature readings.",
      "Official alerts come from the National Weather Service; the summary level is a Waypoint calculation."
    );
  }

  function freezePayload(platform) {
    var s = selectors(platform);
    var cur = s.cur;
    if (!cur || cur.tempF == null) return pending(platform, "Freeze risk needs temperature and precipitation.");
    var window = s.future.slice(0, 12);
    var coldest = null;
    var wetCold = false;
    window.forEach(function (h) {
      if (h.tempF != null && (coldest == null || h.tempF < coldest)) coldest = h.tempF;
      if (h.tempF != null && h.tempF <= 34 && h.popPct != null && h.popPct >= 30) wetCold = true;
    });
    var facts = [{ label: "Temp now", value: round(cur.tempF) + "°F" }];
    if (coldest != null) facts.push({ label: "Low, next 12 hr", value: round(coldest) + "°F" });
    var risk =
      wetCold || (coldest != null && coldest <= 28)
        ? "Elevated"
        : coldest != null && coldest <= 34
          ? "Possible"
          : "Unlikely";
    facts.push({ label: "Freeze risk", value: risk });
    if (cur.precipProb != null) facts.push({ label: "Precip chance", value: round(cur.precipProb) + "%" });
    return estimated(
      platform,
      facts,
      wetCold
        ? "Potential freezing risk based on temperature and precipitation in the same hours."
        : risk === "Possible"
          ? "Temperature approaches freezing in the forecast window."
          : "Forecast temperatures stay above freezing.",
      "Estimated from forecast temperature and precipitation. Not a road or surface report."
    );
  }

  /* ——————————————————————————— dispatch ——————————————————————————— */

  var BUILDERS = {
    "ph-conditions": conditionsPayload,
    "ph-hourly": hourlyPayload,
    "ph-forecast": forecastPayload,
    "ph-wind": windPayload,
    "ph-precip": precipPayload,
    "ph-golden": goldenPayload,
    "ph-blue": bluePayload,
    "ph-photo": photoPayload,
    "ph-sky": skyPayload,
    "ph-night-photo": nightPhotoPayload,
    "ph-sun": sunPayload,
    "ph-moon": moonPayload,
    "ph-dark-sky": darkSkyPayload,
    "ph-air": airPayload,
    "ph-uv": uvPayload,
    "ph-exposure": exposurePayload,
    "ph-hiking-window": hikingWindowPayload,
    "ph-daylight-left": daylightLeftPayload,
    "ph-trail-estimate": trailEstimatePayload,
    "ph-pack": packPayload,
    "ph-river": riverPayload,
    "ph-rainfall": rainfallPayload,
    "ph-flood": floodPayload,
    "ph-birding": birdingPayload,
    "ph-wildlife-window": wildlifeWindowPayload,
    "ph-seasonal": seasonalPayload,
    "ph-driving": drivingPayload,
    "ph-travel-window": travelWindowPayload,
    "ph-place": placePayload,
    "ph-alerts": alertsPayload,
    "ph-risk": riskPayload,
    "ph-freeze": freezePayload
  };

  /** One tile throwing must never take the workspace down. */
  function buildWidgetPayload(id, platform) {
    var fn = BUILDERS[id];
    if (!fn) return null;
    try {
      return fn(platform);
    } catch (e) {
      return {
        trust: "unavailable",
        status: "unavailable",
        message: "This reading could not be prepared right now.",
        facts: null
      };
    }
  }

  function bannedLine(line) {
    return /you should|don't forget|do not forget|dont forget|great day for|perfect day for|do this|try |remember to|best activity|homework|assignment|go now|coaching/i.test(
      String(line || "")
    );
  }

  /**
   * Max 8 concise observational bullets from implemented widget data.
   */
  function composeTodayLines(platform) {
    var lines = [];
    var cond = conditionsPayload(platform);
    var light = goldenPayload(platform);
    var air = airPayload(platform);
    var s = selectors(platform);

    if (cond.status === "live" && cond.current) {
      var c = cond.current;
      if (c.tempF != null && c.conditions) {
        lines.push(round(c.tempF) + "°F under " + String(c.conditions).toLowerCase() + ".");
      } else if (c.tempF != null) {
        lines.push("Air temperature reads " + round(c.tempF) + "°F.");
      } else if (c.conditions) {
        lines.push("Sky looks " + String(c.conditions).toLowerCase() + ".");
      }
      if (c.feelsF != null && c.tempF != null && Math.abs(round(c.feelsF) - round(c.tempF)) >= 3) {
        lines.push("It feels closer to " + round(c.feelsF) + "°F.");
      }
      var wind = windLabel(c.windMph);
      if (wind === "light") lines.push("Winds remain light.");
      else if (wind && c.windMph != null) lines.push("Winds around " + round(c.windMph) + " mph.");
      if (c.humidity != null && c.humidity >= 70) {
        lines.push("Humidity sits near " + round(c.humidity) + "%.");
      }
      if (c.cloudPct != null && c.cloudPct >= 60) {
        lines.push("Cloud cover near " + round(c.cloudPct) + "%.");
      }
      if (c.precipProb != null && c.precipProb >= 40) {
        lines.push("Precip chance near " + round(c.precipProb) + "%.");
      }
    }

    if (light.status === "live" && s.dl) {
      var dl = s.dl;
      var ghStart = rangeStart(dl.goldenHourEvening);
      if (ghStart) lines.push("Golden hour begins at " + ghStart + ".");
      else if (dl.goldenHour) lines.push("Golden hour: " + String(dl.goldenHour) + ".");
      var bhStart = rangeStart(dl.blueHourEvening);
      if (bhStart) lines.push("Blue hour softens around " + bhStart + ".");
      var sunset = dl.sunsetFormatted || dl.sunset;
      if (sunset) lines.push("Sunset is at " + String(sunset) + ".");
      var sunrise = dl.sunriseFormatted || dl.sunrise;
      if (sunrise && lines.length < 5) lines.push("Sunrise was at " + String(sunrise) + ".");
    }

    if (air.status === "live" && air.air && air.air.category) {
      lines.push("Air quality is " + String(air.air.category) + ".");
      if (air.air.aqi != null) lines.push("US AQI reads " + round(air.air.aqi) + ".");
    }

    if (s.dl && s.dl.moonPhase) {
      lines.push("The moon is a " + String(s.dl.moonPhase).toLowerCase() + ".");
    }
    if (s.alerts && s.alerts.count > 0) {
      lines.push(
        s.alerts.count + " active National Weather Service alert" + (s.alerts.count === 1 ? "" : "s") + "."
      );
    }

    var clean = [];
    lines.forEach(function (line) {
      if (!line || bannedLine(line)) return;
      if (clean.indexOf(line) >= 0) return;
      clean.push(line);
    });
    return clean.slice(0, MAX_TODAY_LINES);
  }

  function waitingTodayLines() {
    return [
      "Summary settling as place and weather arrive.",
      "Conditions will appear here.",
      "Light and air settle independently."
    ];
  }

  function fromPlatform(platform, location) {
    var widgets = Object.create(null);
    LIVE_IDS.forEach(function (id) {
      widgets[id] = buildWidgetPayload(id, platform);
    });
    var lines = platform ? composeTodayLines(platform) : waitingTodayLines();
    if (!lines.length) lines = waitingTodayLines();
    var trust = platform ? platformTrust(platform) : "waiting";
    var liveCount = LIVE_IDS.filter(function (id) {
      return widgets[id] && widgets[id].status === "live";
    }).length;
    if (platform && liveCount > 0 && liveCount < LIVE_IDS.length && trust === "live") {
      trust = "partial";
    }
    if (platform && liveCount === 0) trust = "unavailable";

    return {
      widgets: widgets,
      today: {
        lines: lines,
        trust: trust,
        placeLabel:
          (location && (location.displayTitle || location.placeLabel || location.name)) || null
      },
      platform: platform || null,
      location: location || null
    };
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardRebuildData = {
    version: "4.0.0-tile-catalog",
    liveIds: LIVE_IDS.slice(),
    isLiveWidget: isLiveWidget,
    weatherSource: weatherSource,
    fromPlatform: fromPlatform,
    buildWidgetPayload: buildWidgetPayload,
    selectors: selectors,
    composeTodayLines: composeTodayLines,
    waitingTodayLines: waitingTodayLines,
    platformTrust: platformTrust,
    bannedLine: bannedLine
  };
})(typeof window !== "undefined" ? window : global);
