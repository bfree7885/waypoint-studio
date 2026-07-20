/**
 * Today Outside — interpretive outdoor intelligence briefing (Product Recovery).
 * Explains what matters and why. Does not duplicate gauge numbers from other tabs.
 */
(function (global) {
  "use strict";

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function parseNum(val) {
    if (val == null) return null;
    if (typeof val === "number" && isFinite(val)) return val;
    if (typeof val === "object" && val.value != null) return parseNum(val.value);
    var n = parseFloat(String(val).replace(/[^\d.-]/g, ""));
    return isFinite(n) ? n : null;
  }

  function pushUnique(list, entry) {
    if (!entry || !entry.text) return;
    var t = String(entry.text).replace(/\s+/g, " ").trim();
    if (!t) return;
    var why = entry.why ? String(entry.why).replace(/\s+/g, " ").trim() : "";
    var lc = t.toLowerCase();
    for (var i = 0; i < list.length; i++) {
      if (list[i].text.toLowerCase() === lc) return;
      if (list[i].text.toLowerCase().slice(0, 28) === lc.slice(0, 28)) return;
    }
    list.push({
      text: t,
      why: why,
      priority: entry.priority == null ? 50 : entry.priority
    });
  }

  function windMph(wind) {
    if (!wind) return null;
    if (typeof wind.speed === "number") return wind.speed;
    if (wind.speed && wind.speed.value != null) return parseNum(wind.speed.value);
    return parseNum(wind.speed);
  }

  /**
   * Build interpretive bullets from live OIP. Never invents readings.
   */
  function buildBullets(ctx) {
    ctx = ctx || {};
    var platform = ctx.platform || {};
    var bullets = [];
    var hasLive = !!(platform.weatherRef && platform.weatherRef.meta && !platform.weatherRef.meta.isPlaceholder);
    var pending = !platform.meta || !platform.meta.hydratedAt;
    var locPending = platform.location && (platform.location.source === "pending" ||
      platform.meta && platform.meta.contentMode === "national-educational");

    if (pending && !hasLive) {
      return {
        ready: false,
        headline: "Reading outdoor conditions…",
        bullets: [{
          text: "Weather, light, air, and water cues appear here as soon as live data arrives.",
          why: "Each provider loads independently — the briefing updates as pieces arrive.",
          priority: 1
        }],
        verdict: "loading"
      };
    }

    var wx = platform.weatherRef;
    var cur = wx && wx.current;
    var today = wx && wx.daily && wx.daily[0];
    var dl = platform.daylight;
    var OW = global.WDS && global.WDS.outdoorWeatherIntel;
    var hike = OW && OW.hikingComfort && hasLive ? OW.hikingComfort(wx) : null;
    var photo = OW && OW.photographyConditions && hasLive ? OW.photographyConditions(wx, platform) : null;
    var walk = OW && OW.walkingComfort && hasLive ? OW.walkingComfort(wx) : null;

    var alerts = platform.alerts;
    var alertItems = alerts && alerts.items ? alerts.items : [];
    if (alerts && alerts.status === "live" && alertItems.length) {
      var first = alertItems[0];
      pushUnique(bullets, {
        text: "Active alert: " + (first.event || first.headline || "NWS advisory") + ".",
        why: "Official National Weather Service guidance — check the Alerts tab before exposed plans.",
        priority: 5
      });
    }

    if (hike && hike.summary) {
      pushUnique(bullets, {
        text: hike.summary.replace(/\.*$/, "") + ".",
        why: hike.detail || "Comfort blends temperature, wind, humidity, and sun for trail time today.",
        priority: 10
      });
    } else if (walk && walk.summary) {
      pushUnique(bullets, {
        text: walk.summary.replace(/\.*$/, "") + ".",
        why: walk.detail || "A short outdoor check-in based on current conditions.",
        priority: 11
      });
    }

    var rain = cur && parseNum(cur.precipitation && cur.precipitation.probability);
    if (rain == null && today && today.precipitation) rain = parseNum(today.precipitation.probability);
    if (rain != null && rain >= 45) {
      pushUnique(bullets, {
        text: "Rain is likely enough to plan around (" + rain + "% chance).",
        why: "A shell keeps you comfortable; trails and rocks may be slick after showers.",
        priority: 15
      });
    }

    if (dl && dl.goldenHour) {
      var gh = String(dl.goldenHour).trim().replace(/\.*$/, "");
      pushUnique(bullets, {
        text: /^golden hour/i.test(gh) ? gh + "." : "Golden hour: " + gh + ".",
        why: "Low-angle light is softer for landscapes and wildlife — see Photography for quality notes.",
        priority: 20
      });
    } else if (dl && dl.sunsetFormatted) {
      pushUnique(bullets, {
        text: "Sunset around " + dl.sunsetFormatted + ".",
        why: "Plan last light and a buffer for the walk back; exact times live under Sun & Moon.",
        priority: 22
      });
    }

    var uv = cur && parseNum(cur.uvIndex);
    if (uv == null && today) uv = parseNum(today.uvIndex);
    if (uv != null && uv >= 6) {
      pushUnique(bullets, {
        text: "UV becomes high after mid-morning.",
        why: "Shade, sunscreen, and hat matter on open ridges — peak UV usually arrives late morning.",
        priority: 25
      });
    } else if (uv != null && uv >= 3) {
      pushUnique(bullets, {
        text: "Moderate UV today.",
        why: "Sun protection is still worthwhile if you will be out for hours.",
        priority: 26
      });
    }

    var humidity = cur && parseNum(cur.humidity);
    if (humidity != null && humidity >= 85) {
      pushUnique(bullets, {
        text: "Morning fog is possible.",
        why: "Humidity near " + Math.round(humidity) + "% often means low valleys hold mist until the sun mixes the air.",
        priority: 27
      });
    } else if (humidity != null && humidity <= 30 && hasLive) {
      pushUnique(bullets, {
        text: "Air feels dry outdoors.",
        why: "Low humidity can make lips and gear dry out faster on longer walks.",
        priority: 27
      });
    }

    var mph = windMph(cur && cur.wind);
    if (mph != null && mph >= 18) {
      pushUnique(bullets, {
        text: "Wind may complicate long telephoto wildlife photography.",
        why: "Around " + Math.round(mph) + " mph, vibration and subject movement rise — shorter lenses or bracing help.",
        priority: 29
      });
    } else if (mph != null && mph >= 12) {
      pushUnique(bullets, {
        text: "A steady breeze is in the mix.",
        why: "Expect cooler feel on ridges and more leaf motion in photos.",
        priority: 30
      });
    }

    var aqi = platform.airQuality
      ? (platform.airQuality.usAqi != null ? platform.airQuality.usAqi : platform.airQuality.aqi)
      : null;
    var aqiCat = platform.airQuality && platform.airQuality.category;
    if (aqi != null) {
      if (aqi <= 50) {
        pushUnique(bullets, {
          text: "Air quality is excellent" + (aqiCat ? " (" + aqiCat + ")" : "") + ".",
          why: "Good day for longer outdoor exertion for most people.",
          priority: 31
        });
      } else if (aqi <= 100) {
        pushUnique(bullets, {
          text: "Sensitive individuals may notice reduced air quality.",
          why: "AQI is moderate — consider easier pacing if you have asthma or similar concerns.",
          priority: 31
        });
      } else {
        pushUnique(bullets, {
          text: "Elevated air quality concern outdoors.",
          why: "Shorter outings or lower intensity are wiser until conditions improve (see Air tab).",
          priority: 28
        });
      }
    }

    var water = platform.water || platform.usgsWater;
    if (water && water.status === "live" && water.sites && water.sites[0]) {
      var site = water.sites[0];
      var stage = parseNum(site.gageHeight != null ? site.gageHeight : site.stage);
      var riverText = site.interpretation || null;
      if (!riverText && stage != null) {
        riverText = "Nearby river gage around " + stage.toFixed(1) + " ft";
      }
      if (riverText) {
        pushUnique(bullets, {
          text: riverText.replace(/\.*$/, "") + ".",
          why: "Levels after rain can stay elevated — confirm crossings locally before committing.",
          priority: 35
        });
      }
    }

    if ((!alerts || !alertItems.length) && (hasLive || (alerts && alerts.status === "live"))) {
      pushUnique(bullets, {
        text: "No active weather alerts.",
        why: "Still confirm local forecasts for fast-changing cells.",
        priority: 40
      });
    }

    if (dl && dl.sunriseFormatted) {
      pushUnique(bullets, {
        text: "Deer and other wildlife often move near sunrise and again near sunset.",
        why: "Quiet edges and soft light around " + dl.sunriseFormatted + " reward patient observation.",
        priority: 45
      });
    }

    if (photo && photo.summary) {
      if (photo.level === "excellent" || photo.level === "good") {
        pushUnique(bullets, {
          text: "Photography light looks favorable.",
          why: photo.summary + (photo.detail ? " " + photo.detail : ""),
          priority: 48
        });
      } else if (photo.level === "poor" || photo.level === "fair") {
        pushUnique(bullets, {
          text: "Photography light is challenging right now.",
          why: photo.detail || photo.summary || "Cloud, wind, or harsh sun may limit soft-light windows.",
          priority: 48
        });
      }
    }

    var temp = cur && parseNum(cur.temperature);
    if (temp != null && temp >= 88) {
      pushUnique(bullets, {
        text: "Heat may reduce afternoon hiking comfort.",
        why: "Start earlier, carry more water, and favor shaded routes after mid-day.",
        priority: 14
      });
    }

    var species = (platform.species && platform.species.active) ||
      (platform.phenology && platform.phenology.watch && platform.phenology.watch.activeNow) || [];
    if (species[0] && species[0].name) {
      pushUnique(bullets, {
        text: "Seasonal watch: " + species[0].name + ".",
        why: species[0].note || "Phenology cues are regional estimates — verify what you see in the field.",
        priority: 55
      });
    }

    if (locPending && hasLive) {
      pushUnique(bullets, {
        text: "Location is still approximate.",
        why: "Allow precise location or set a place for tighter river and alert context.",
        priority: 8
      });
    }

    bullets.sort(function (a, b) { return a.priority - b.priority; });
    if (bullets.length > 8) bullets = bullets.slice(0, 8);

    var Brief = global.WDS && global.WDS.dashboardBrief;
    var brief = Brief && Brief.build ? Brief.build(ctx) : null;
    var headline = (brief && brief.verdictLabel) || (hike && hike.summary) || "Outdoor conditions";
    var verdict = (brief && brief.verdict) || (hike && hike.level) || "go";

    return {
      ready: true,
      headline: headline,
      detail: brief && brief.verdictDetail ? brief.verdictDetail : "",
      bullets: bullets,
      preview: bullets.slice(0, 3),
      verdict: verdict,
      dateLine: brief && brief.dateLine ? brief.dateLine : ""
    };
  }

  function renderBulletList(items, className) {
    items = items || [];
    if (!items.length) return "";
    return (
      '<ul class="' + escapeHtml(className || "wdb-today-summary__list") + '">' +
      items.map(function (b) {
        return (
          "<li>" +
          '<p class="wdb-today-summary__point">' + escapeHtml(b.text) + "</p>" +
          (b.why
            ? '<p class="wdb-today-summary__why"><span class="wdb-today-summary__why-label">Why</span> ' +
              escapeHtml(b.why) +
              "</p>"
            : "") +
          "</li>"
        );
      }).join("") +
      "</ul>"
    );
  }

  function render(ctx) {
    var s = buildBullets(ctx);
    return (
      '<section class="wdb-today-summary wdb-today-summary--' + escapeHtml(s.verdict || "go") +
        '" aria-labelledby="wdb-today-summary-title" data-wdb-today-summary>' +
        '<header class="wdb-today-summary__head">' +
          '<p class="wdb-today-summary__eyebrow">Today Outside</p>' +
          '<h2 class="wdb-today-summary__title" id="wdb-today-summary-title">' + escapeHtml(s.headline) + "</h2>" +
          (s.dateLine ? '<p class="wdb-today-summary__date">' + escapeHtml(s.dateLine) + "</p>" : "") +
          (s.detail
            ? '<p class="wdb-today-summary__lede">' + escapeHtml(s.detail) + "</p>"
            : (!s.ready
              ? '<p class="wdb-today-summary__lede">Live conditions will fill in momentarily.</p>'
              : "")) +
        "</header>" +
        (s.ready && s.preview && s.preview.length
          ? renderBulletList(s.preview, "wdb-today-summary__list wdb-today-summary__list--preview")
          : "") +
        '<p class="wdb-today-summary__cue">Open <strong>Today</strong> for the full briefing — other tabs hold gauges and detail.</p>' +
      "</section>"
    );
  }

  function renderTodayPanel(ctx) {
    var s = buildBullets(ctx);
    if (!s.ready) {
      return (
        '<div class="wdb-tab-panel-inner wdb-tab-panel-inner--today" data-wdb-today-panel>' +
          '<p class="wdb-today-summary__empty">Building today’s outdoor interpretation…</p>' +
        "</div>"
      );
    }
    return (
      '<div class="wdb-tab-panel-inner wdb-tab-panel-inner--today" data-wdb-today-panel>' +
        '<p class="wdb-tab-panel__intro">What is happening outside, why it matters, and what to consider today — not a second copy of every gauge.</p>' +
        (s.bullets && s.bullets.length
          ? renderBulletList(s.bullets, "wdb-today-summary__list wdb-today-summary__list--panel")
          : '<p class="wdb-today-summary__empty">No interpretive cues yet for this location.</p>') +
      "</div>"
    );
  }

  global.WDS = global.WDS || {};
  global.WDS.todaySummary = {
    buildBullets: buildBullets,
    render: render,
    renderTodayPanel: renderTodayPanel
  };
})(window);
