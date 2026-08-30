/**
 * Sheds V1.1 — Today's Hunt composer.
 *
 * Interprets existing channels for the hunter. Does NOT replace TIMING,
 * HABITAT MODEL, SEARCHABILITY, or OBSERVED with one opaque score.
 *
 * Band logic is rule-based and explainable via `ruleIds`.
 * Never outputs find / antler / deer probability, percent chance, or
 * “sheds are here” / “deer are here”.
 */
(function (global) {
  "use strict";

  var BANDS = Object.freeze(["Low", "Fair", "Good", "Very good"]);
  var RANK = { Low: 0, Fair: 1, Good: 2, "Very good": 3 };

  var DEEP_SWE_MM = 25;
  var MELT_SWE_MM = 8;
  var LIGHT_SWE_MM = 8;
  var PERSISTENT_SWE_MM = 15;
  var WIND_EDGE = 8;
  var WIND_STRONG = 18;
  var WIND_INCREASE = 8;
  var PRECIP_ARRIVING_MM = 0.4;
  var DAYLIGHT_CLOSE_H = 2;
  var LATER_WARM_H = 6;

  var DISCLAIMER =
    "Today’s Hunt is an interpreted assessment of season, searchability, and recent " +
    "conditions — not a find probability, and never a claim that sheds or deer are at a place.";

  var TODAY_LEAD = {
    "Very good": "Today looks worth searching.",
    Good: "Good day to search.",
    Fair: "Fair conditions today.",
    Low: "Conditions are limited today."
  };

  function getTiming() { return global.WaypointShedsTiming || null; }
  function getSearchability() { return global.WaypointShedsSearchability || null; }
  function getWeather() { return global.WaypointShedsWeather || null; }

  function minBand(a, b) {
    if (RANK[a] == null) return b;
    if (RANK[b] == null) return a;
    return RANK[a] <= RANK[b] ? a : b;
  }

  function isFiniteCoord(n) {
    return typeof n === "number" && isFinite(n);
  }

  function locationKnown(loc) {
    return !!(loc && isFiniteCoord(loc.lat) && isFiniteCoord(loc.lng));
  }

  function seasonPlain(timing) {
    if (!timing) return "Season timing unclear";
    return timing.plainLabel || timing.label || "Season timing unclear";
  }

  function seasonCategory(timing) {
    return (timing && timing.category) || "unknown";
  }

  /**
   * Searchability favorability is a condition channel — not mapped 1:1 onto
   * Today's Hunt bands. Favorable conditions start at Good, not Very good.
   */
  function baseBandFromSearchability(favorability, weatherReady) {
    if (!weatherReady) return "Low";
    if (favorability === "favorable") return "Good";
    if (favorability === "moderate") return "Fair";
    if (favorability === "limited") return "Low";
    return "Fair";
  }

  function unknownTiming() {
    return {
      channel: "timing",
      category: "unknown",
      label: "Unknown",
      plainLabel: "Season timing unclear",
      phaseId: "unknown",
      phaseLabel: "Unknown",
      supportLine: "Season timing needs a location.",
      why: ["Latitude is required for the regional search window."],
      limitations: ["Does not predict exact cast dates."],
      season: null
    };
  }

  function strongestReason(parts) {
    for (var i = 0; i < parts.length; i++) {
      if (parts[i]) return parts[i];
    }
    return "";
  }

  function laterHoursMean(times, values, nowMs, hours, currentVal) {
    if (!times || !values || times.length !== values.length) return null;
    var s = 0;
    var n = 0;
    var i;
    var until = nowMs + hours * 3600000;
    for (i = 0; i < times.length; i++) {
      var t = new Date(times[i]).getTime();
      if (!isFinite(t) || t < nowMs || t > until) continue;
      if (typeof values[i] !== "number" || !isFinite(values[i])) continue;
      s += values[i];
      n++;
    }
    if (!n) return null;
    return s / n;
  }

  function precipArriving(wx, nowMs, sunsetHour, nowHour) {
    if (!wx || !wx.hourlyTimes || !wx.hourlyPrecip) return false;
    var untilMs = nowMs + 18 * 3600000;
    if (typeof sunsetHour === "number" && typeof nowHour === "number" && sunsetHour > nowHour) {
      untilMs = nowMs + (sunsetHour - nowHour) * 3600000;
    }
    var i;
    for (i = 0; i < wx.hourlyTimes.length; i++) {
      var t = new Date(wx.hourlyTimes[i]).getTime();
      if (!isFinite(t) || t < nowMs || t > untilMs) continue;
      if (typeof wx.hourlyPrecip[i] === "number" && wx.hourlyPrecip[i] >= PRECIP_ARRIVING_MM) {
        return true;
      }
    }
    return false;
  }

  /**
   * Types of ground — never a claim that the hunter's current slope/aspect
   * is south-facing or that sheds exist there.
   */
  function composeWhere(opts) {
    var wx = opts.weather || {};
    var timing = opts.timing;
    var patterns = opts.patterns;
    var cat = seasonCategory(timing);
    var lines = [];

    if (patterns && patterns.sufficient && patterns.topHabitats && patterns.topHabitats[0]) {
      lines.push(
        "Your notes most often mention " + patterns.topHabitats[0].label +
          " — a type of ground from your records, not a find map."
      );
    }
    if (typeof wx.snowMm === "number" && wx.snowMm > MELT_SWE_MM &&
        typeof wx.tempC === "number" && wx.tempC > 0) {
      lines.push(
        "Exposed edges and south-facing ground often open first as snow recedes. " +
          "Confirm aspect on the map — this is a type of ground, not a claim about your current slope."
      );
    }
    if (typeof wx.windSpeedMs === "number" && wx.windSpeedMs >= WIND_EDGE) {
      lines.push(
        "Fence lines and lee edges can be worth checking if they exist in your Search Area."
      );
    }
    if (cat === "peak" || cat === "late" || cat === "mostly_past") {
      lines.push(
        "Winter-cover edges and travel benches are typical search types — use the map to compare them."
      );
    }
    if (!lines.length) {
      return {
        text: "Use the map to compare exposed and sheltered ground.",
        supported: false,
        ruleId: "where-map-compare"
      };
    }
    return {
      text: lines.slice(0, 2).join(" "),
      supported: true,
      ruleId: "where-supported-types"
    };
  }

  function composeWatch(opts) {
    var wx = opts.weather;
    var now = opts.now;
    if (!wx) return null;
    var nowMs = now.getTime();
    var nowHour = now.getHours() + now.getMinutes() / 60;
    var items = [];
    var Wx = getWeather();
    var laterTemp = laterHoursMean(wx.hourlyTimes, wx.hourlyTemps, nowMs, LATER_WARM_H, wx.tempC);
    if (typeof wx.tempC === "number" && laterTemp != null &&
        laterTemp - wx.tempC >= (Wx ? Wx.TEMP_TREND_THRESHOLD_C : 2)) {
      items.push("Warming later today could change searchability.");
    }
    if (precipArriving(wx, nowMs, wx.sunsetHour, nowHour) ||
        (typeof wx.precipNowMm === "number" && wx.precipNowMm >= PRECIP_ARRIVING_MM)) {
      items.push("Precipitation arriving — footing and visibility may shift.");
    }
    var laterWind = laterHoursMean(wx.hourlyTimes, wx.hourlyWinds, nowMs, LATER_WARM_H, wx.windSpeedMs);
    if (typeof wx.windSpeedMs === "number" && laterWind != null &&
        laterWind >= wx.windSpeedMs + WIND_INCREASE) {
      items.push("Wind increasing later — lee edges may matter more if they exist.");
    }
    if (typeof wx.snowMm === "number" && wx.snowMm >= PERSISTENT_SWE_MM &&
        !(typeof wx.tempC === "number" && wx.tempC > 0 && wx.snowMm > MELT_SWE_MM)) {
      items.push(
        "Snow water equivalent remains elevated — ground depth is still unknown."
      );
    }
    if (typeof wx.sunsetHour === "number" &&
        wx.sunsetHour - nowHour < DAYLIGHT_CLOSE_H && wx.sunsetHour - nowHour > 0) {
      items.push("Daylight is closing.");
    }
    if (!items.length) return null;
    return items[0];
  }

  /**
   * Compose Today's Hunt from channels already in the product.
   *
   * Rules (also in docs/sheds/SHEDS-V1-1-TODAYS-HUNT.md):
   *
   * 1. Start from SEARCHABILITY favorability as conditions, not a 0–100 hunt score.
   *    favorable → Good · moderate → Fair · limited → Low.
   * 2. TIMING is a visible modifier, never a same-day cast trigger.
   *    outside / early / mostly_past cap at Fair.
   * 3. Very good requires strong support: weather ready, location known,
   *    searchability favorable, season peak (or building with an extra melt/warming
   *    signal), SWE ≤ 25 mm, and at least one extra signal. Missing weather or
   *    location always blocks Very good.
   * 4. Deep SWE (> 25 mm water-equivalent, depth still unknown) caps at Fair.
   * 5. No weather: max Fair if season is peak/building/late and location is known;
   *    otherwise Low.
   */
  function compose(opts) {
    opts = opts || {};
    var now = opts.now instanceof Date ? opts.now : new Date(opts.now || Date.now());
    if (isNaN(now.getTime())) now = new Date();
    var loc = opts.location || null;
    var known = locationKnown(loc);
    var locSource = known ? (loc.source || "unknown") : "unknown";
    var wx = opts.weather && opts.weather.ready !== false ? opts.weather : null;
    var weatherStatus = opts.weatherStatus || (wx ? "ready" : "unavailable");
    var weatherReady = !!(wx && weatherStatus === "ready");
    var ruleIds = [];
    var missingInputs = [];
    var why = [];

    if (!known) missingInputs.push("location");
    if (!weatherReady) missingInputs.push("weather");
    if (weatherReady) {
      if (typeof wx.tempC !== "number") missingInputs.push("temperature");
      if (typeof wx.windSpeedMs !== "number") missingInputs.push("wind");
      if (typeof wx.sunriseHour !== "number" || typeof wx.sunsetHour !== "number") {
        missingInputs.push("daylight");
      }
    }

    var Timing = getTiming();
    var timing = opts.timing || null;
    if (!timing) {
      if (Timing && known) {
        timing = Timing.evaluate({ date: now, lat: loc.lat, prefs: opts.prefs || {} });
      } else {
        timing = unknownTiming();
      }
    }

    var locationStatus = !known ? "unavailable"
      : locSource === "gps" ? "ready"
        : locSource === "denied" ? "denied"
          : "ready";

    var Searchability = getSearchability();
    var searchability = opts.searchability || null;
    if (!searchability && Searchability && typeof Searchability.evaluate === "function") {
      searchability = Searchability.evaluate({
        weather: weatherReady ? wx : null,
        weatherStatus: weatherStatus,
        locationStatus: locationStatus,
        season: timing && timing.season ? timing.season : timing,
        patterns: opts.patterns || null,
        plan: opts.plan || null,
        now: now
      });
    }

    var favorability = searchability && searchability.favorability
      ? searchability.favorability
      : "uncertain";
    var snow = Searchability && typeof Searchability.snowStatus === "function"
      ? Searchability.snowStatus(wx)
      : { known: false, depthKnown: false, label: "Snow depth unavailable" };

    var WxMod = getWeather();
    var tempTrend = (wx && wx.tempTrend) || null;
    if (!tempTrend && wx && WxMod && wx.hourlyTimes && wx.hourlyTemps) {
      tempTrend = WxMod.deriveTempTrend(wx.hourlyTimes, wx.hourlyTemps, now);
    }
    if (!tempTrend) {
      tempTrend = {
        status: "unknown",
        label: "Temperature trend unknown",
        deltaC: null,
        detail: "Hourly temperatures were not available."
      };
    }
    if (tempTrend.status === "unknown" && weatherReady) {
      missingInputs.push("temperature_trend");
    }

    var cat = seasonCategory(timing);
    var band;
    var todaySpecial = null;

    var status = "ready";

    if (weatherStatus === "loading" && !wx) {
      band = "Low";
      status = "loading";
      ruleIds.push("loading");
      todaySpecial = "Reading today’s conditions…";
      why.push("Waiting on live weather — not a find estimate.");
    } else if (!known) {
      band = "Low";
      ruleIds.push("no-location");
      todaySpecial = "Share a location to judge today.";
      why.push("Today’s Hunt needs a place to read season and weather. It does not invent a town.");
    } else if (!weatherReady) {
      if (known && (cat === "peak" || cat === "building" || cat === "late")) {
        band = "Fair";
        ruleIds.push("no-weather-season-open-fair");
      } else {
        band = "Low";
        ruleIds.push("no-weather-low");
      }
      why.push("Live weather is unavailable, so searchability cannot be judged confidently.");
      if (known) why.push(seasonPlain(timing) + " — regional timing, not a same-day cast.");
    } else {
      band = baseBandFromSearchability(favorability, true);
      ruleIds.push("base-searchability-" + favorability);

      if (typeof wx.snowMm === "number" && wx.snowMm > DEEP_SWE_MM) {
        band = minBand(band, "Fair");
        ruleIds.push("cap-deep-swe");
        why.push(
          "Recent snowfall water-equivalent is elevated — ground depth is still unknown, so opportunity stays capped."
        );
      }

      if (cat === "outside" || cat === "early" || cat === "mostly_past") {
        band = minBand(band, "Fair");
        ruleIds.push("cap-season-" + cat);
      }

      var extra = false;
      if (tempTrend.status === "warming" && typeof wx.snowMm === "number" && wx.snowMm > 0.5) {
        extra = true;
        ruleIds.push("extra-warming-snow");
      }
      if (typeof wx.snowMm === "number" && wx.snowMm > MELT_SWE_MM &&
          typeof wx.tempC === "number" && wx.tempC > 0) {
        extra = true;
        ruleIds.push("extra-melt");
      }
      if (cat === "peak" && typeof wx.snowMm === "number" && wx.snowMm < LIGHT_SWE_MM &&
          (typeof wx.windSpeedMs !== "number" || wx.windSpeedMs < WIND_STRONG)) {
        extra = true;
        ruleIds.push("extra-peak-light-cover");
      }

      var hardMissing = missingInputs.filter(function (id) {
        return id === "location" || id === "weather" || id === "temperature";
      });
      var canVeryGood = weatherReady && known && hardMissing.length === 0 &&
        favorability === "favorable" &&
        (cat === "peak" || (cat === "building" && extra) || (cat === "late" && extra)) &&
        !(typeof wx.snowMm === "number" && wx.snowMm > DEEP_SWE_MM) &&
        extra;

      if (canVeryGood) {
        band = "Very good";
        ruleIds.push("very-good");
      } else {
        ruleIds.push("very-good-blocked");
      }

      if (tempTrend.status === "warming") {
        why.push("Recent warming versus yesterday — a condition trend, not a cast trigger.");
      } else if (tempTrend.status === "cooling") {
        why.push("Recent cooling versus yesterday — freeze-adjacent air can change how ground reads.");
      }
      if (favorability === "favorable") {
        why.push("Search conditions look favorable for going out — opportunity, not a find chance.");
      } else if (favorability === "moderate") {
        why.push("Search conditions are workable, not outstanding.");
      } else if (favorability === "limited") {
        why.push("Searchability is limited today — still a search window, not a closed season.");
      }
      why.push(seasonPlain(timing) + " — regional timing, not proof that casting happened here.");
      if (typeof wx.snowMm === "number" && wx.snowMm > 0.5) {
        why.push(
          "Snow signal is water-equivalent only (" +
            (Math.round(wx.snowMm * 10) / 10) +
            " mm SWE). Depth is not measured."
        );
      }
    }

    if (known && weatherReady && why.length === 0) {
      why.push("Mixed search conditions with the available weather and season context.");
    }

    why = why.slice(0, 3);

    var where = composeWhere({ weather: wx, timing: timing, patterns: opts.patterns });
    var watch = weatherReady ? composeWatch({ weather: wx, now: now }) : null;

    var supportLevel = "limited";
    if (weatherReady && known && missingInputs.filter(function (id) {
      return id !== "temperature_trend";
    }).length === 0) {
      supportLevel = "strong";
    } else if (weatherReady || known) {
      supportLevel = "partial";
    }
    if (!weatherReady || !known) {
      band = minBand(band, "Fair");
      if (band === "Very good") band = "Fair";
      ruleIds.push("cap-missing-weather-or-location");
    }

    var strongest = strongestReason(why);
    var today = todaySpecial || (TODAY_LEAD[band] + (strongest ? " " + strongest : ""));

    var locLine = !known
      ? "Location is not set — GPS or a saved Search / map center is needed."
      : locSource === "gps"
        ? "Using current location."
        : locSource === "saved-view"
          ? "Using your last map view."
          : locSource === "saved-area"
            ? "Using a saved Search Area."
            : locSource === "map-center"
              ? "Using the map center you are looking at."
              : "Using a saved place on this device.";

    return {
      status: status,
      band: band,
      today: today,
      why: why,
      where: where.text,
      whereSupported: where.supported,
      watch: watch,
      season: {
        label: seasonPlain(timing),
        category: cat,
        supportLine: timing && timing.supportLine ? timing.supportLine : ""
      },
      support: {
        level: supportLevel,
        missingInputs: missingInputs.slice(),
        locationSource: locSource,
        locationLine: locLine,
        weatherStatus: weatherStatus
      },
      disclaimer: DISCLAIMER,
      channels: {
        timing: timing,
        searchability: searchability
          ? {
              favorability: searchability.favorability,
              status: searchability.status,
              headline: searchability.headline,
              snow: snow
            }
          : null,
        tempTrend: tempTrend,
        snow: snow
      },
      ruleIds: ruleIds,
      bestWindow: searchability && searchability.brief && searchability.brief.timeWindows
        ? searchability.brief.timeWindows[0]
        : (searchability && searchability.timeWindows ? searchability.timeWindows[0] : null)
    };
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /**
   * Shared markup for overview + map briefing.
   * @param {object} hunt compose() result
   * @param {{ includeQuestion?: boolean, compact?: boolean }} [view]
   */
  function renderHuntHtml(hunt, view) {
    view = view || {};
    if (!hunt) return "";
    var band = hunt.band || "Low";
    var html = '<article class="sheds-hunt" data-band="' + escapeHtml(band) + '"' +
      (hunt.status ? ' data-status="' + escapeHtml(hunt.status) + '"' : "") + ">";
    if (view.includeQuestion !== false) {
      html += '<p class="sheds-hunt__question">Should I go shed hunting today?</p>';
    }
    if (hunt.status === "loading") {
      html += '<p class="sheds-hunt__band"><span class="sheds-hunt__band-label">…</span></p>';
    } else {
      html += '<p class="sheds-hunt__band"><span class="sheds-hunt__band-label">' +
        escapeHtml(band) + "</span></p>";
    }
    html += '<p class="sheds-hunt__today">' + escapeHtml(hunt.today) + "</p>";
    if (hunt.why && hunt.why.length) {
      html += '<section class="sheds-hunt__block"><h3 class="sheds-hunt__k">Why</h3><ul class="sheds-hunt__why">';
      hunt.why.forEach(function (line) {
        html += "<li>" + escapeHtml(line) + "</li>";
      });
      html += "</ul></section>";
    }
    if (hunt.where) {
      html += '<section class="sheds-hunt__block"><h3 class="sheds-hunt__k">Where</h3><p>' +
        escapeHtml(hunt.where) + "</p></section>";
    }
    if (hunt.watch) {
      html += '<section class="sheds-hunt__block"><h3 class="sheds-hunt__k">Watch</h3><p>' +
        escapeHtml(hunt.watch) + "</p></section>";
    }
    html += '<p class="sheds-hunt__season">Season: ' + escapeHtml(hunt.season && hunt.season.label) + "</p>";
    var supportBits = ["Evidence support: " + (hunt.support && hunt.support.level ? hunt.support.level : "limited")];
    if (hunt.support && hunt.support.locationLine) supportBits.push(hunt.support.locationLine);
    if (hunt.support && hunt.support.missingInputs && hunt.support.missingInputs.length) {
      supportBits.push("Missing: " + hunt.support.missingInputs.join(", ") + ".");
    }
    html += '<p class="sheds-hunt__support">' + escapeHtml(supportBits.join(" ")) + "</p>";
    html += '<p class="sheds-hunt__disclaimer">' + escapeHtml(hunt.disclaimer) + "</p>";
    html += "</article>";
    return html;
  }

  function fillHuntRoot(el, hunt, view) {
    if (!el) return;
    el.innerHTML = renderHuntHtml(hunt, view);
  }

  global.WaypointShedsTodayHunt = {
    BANDS: BANDS,
    DEEP_SWE_MM: DEEP_SWE_MM,
    MELT_SWE_MM: MELT_SWE_MM,
    DISCLAIMER: DISCLAIMER,
    compose: compose,
    renderHuntHtml: renderHuntHtml,
    fillHuntRoot: fillHuntRoot
  };
})(typeof window !== "undefined" ? window : globalThis);
