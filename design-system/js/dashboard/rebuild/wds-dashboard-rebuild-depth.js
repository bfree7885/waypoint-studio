/**
 * Dashboard Rebuild — instrument depth (in-tile disclosure).
 * Collapsed = glance. Expanded = supporting timing/trend/evidence/source.
 * No second data engine; reuses widget payloads + platform slices already fetched.
 */
(function (global) {
  "use strict";

  var VERSION = "1.0.0-instrument-depth";
  var FEELS_DELTA_MIN = 3;
  var GUST_DELTA_MIN = 4;

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function num(v) {
    if (v == null) return null;
    if (typeof v === "number" && isFinite(v)) return v;
    if (typeof v === "object" && v.value != null) return num(v.value);
    var n = Number(v);
    return isFinite(n) ? n : null;
  }

  function round(v, d) {
    if (v == null || !isFinite(v)) return null;
    var f = Math.pow(10, d == null ? 0 : d);
    return Math.round(v * f) / f;
  }

  function platformMeta(platform) {
    var meta = (platform && platform.meta) || {};
    var wx = platform && platform.weatherRef && platform.weatherRef.meta;
    return {
      fromCache: !!(meta.fromCache || (wx && wx.fromCache)),
      stale: !!(meta.stale || (wx && wx.stale)),
      hydratedAt: meta.hydratedAt || (wx && wx.hydratedAt) || null,
      source: (wx && (wx.provider || wx.source)) || meta.source || "live providers"
    };
  }

  function formatTime(iso) {
    if (!iso) return null;
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso);
      return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    } catch (e) {
      return String(iso);
    }
  }

  function freshnessRows(platform, data) {
    var rows = [];
    var meta = platformMeta(platform);
    if (meta.hydratedAt) {
      rows.push({ label: "Updated", value: formatTime(meta.hydratedAt) || String(meta.hydratedAt) });
    }
    if (meta.fromCache || (data && data.trust === "cached")) {
      rows.push({ label: "Freshness", value: meta.stale ? "Cached (may be stale)" : "Cached" });
    } else if (data && data.trust) {
      rows.push({ label: "Trust", value: String(data.trust) });
    }
    if (meta.source) rows.push({ label: "Source", value: String(meta.source) });
    return rows;
  }

  function sparkline(values, opts) {
    opts = opts || {};
    var nums = (values || []).map(num).filter(function (v) {
      return v != null;
    });
    if (nums.length < 2) return "";
    var w = opts.width || 160;
    var h = opts.height || 36;
    var min = Math.min.apply(null, nums);
    var max = Math.max.apply(null, nums);
    if (max === min) max = min + 1;
    var pts = nums
      .map(function (v, i) {
        var x = (i / (nums.length - 1)) * (w - 4) + 2;
        var y = h - 2 - ((v - min) / (max - min)) * (h - 4);
        return x.toFixed(1) + "," + y.toFixed(1);
      })
      .join(" ");
    return (
      '<svg class="wdb-r-depth__spark" viewBox="0 0 ' +
      w +
      " " +
      h +
      '" width="' +
      w +
      '" height="' +
      h +
      '" role="img" aria-label="' +
      escapeHtml(opts.label || "Trend") +
      '"><polyline fill="none" stroke="currentColor" stroke-width="1.5" points="' +
      pts +
      '"/></svg>'
    );
  }

  function row(label, value, note) {
    if (value == null || value === "") return null;
    return { label: label, value: String(value), note: note || null };
  }

  function hoursFromPlatform(platform, count) {
    var Data = global.WDS && global.WDS.dashboardRebuildData;
    if (Data && typeof Data.upcomingHours === "function") {
      return Data.upcomingHours(platform, count || 8) || [];
    }
    /* Fallback if helper not exported */
    var wx = platform && platform.weatherRef;
    if (!wx || !Array.isArray(wx.hourly)) return [];
    return wx.hourly.slice(0, count || 8).map(function (h) {
      return {
        time: h.time,
        label: h.time,
        tempF: num(h.temperature),
        precipProb: h.precipitation ? num(h.precipitation.probability) : null,
        windMph: h.wind ? num(h.wind.speed) : null,
        windGust: h.wind ? num(h.wind.gust) : null,
        uvIndex: num(h.uvIndex),
        conditions: (h.conditions && h.conditions.summary) || ""
      };
    });
  }

  function changeHeadline(hours, cur) {
    if (!hours || !hours.length) return null;
    var first = hours[0];
    var elevated = null;
    for (var i = 0; i < hours.length; i++) {
      if (hours[i].precipProb != null && hours[i].precipProb >= 40) {
        elevated = hours[i];
        break;
      }
    }
    if (elevated && (cur == null || cur < 40)) {
      return "Chance rises around " + (elevated.label || "soon");
    }
    var last = hours[Math.min(hours.length - 1, 5)];
    if (first.tempF != null && last.tempF != null && Math.abs(last.tempF - first.tempF) >= 6) {
      var dir = last.tempF < first.tempF ? "falls" : "rises";
      return (
        "Temperature " +
        dir +
        " about " +
        Math.round(Math.abs(last.tempF - first.tempF)) +
        "° by " +
        (last.label || "later")
      );
    }
    var gustRise = null;
    for (var j = 1; j < hours.length; j++) {
      var g0 = hours[0].windGust != null ? hours[0].windGust : hours[0].windMph;
      var gj = hours[j].windGust != null ? hours[j].windGust : hours[j].windMph;
      if (g0 != null && gj != null && gj - g0 >= 8) {
        gustRise = hours[j];
        break;
      }
    }
    if (gustRise) return "Winds strengthen around " + (gustRise.label || "later");
    return "Conditions look steady through the next few hours";
  }

  function precipHeadline(data, platform) {
    var cur = data && data.current;
    var nowProb = cur && cur.precipProb != null ? cur.precipProb : null;
    var intensity = cur && cur.precipIntensity;
    var amt = cur && cur.precipAmt;
    var raining =
      (amt != null && amt >= 0.01) ||
      /rain|drizzle|shower|storm|snow/i.test(String((cur && cur.conditions) || ""));
    if (raining || (intensity && /moderate|heavy/i.test(String(intensity)))) {
      return "Precipitation occurring now";
    }
    var hours = hoursFromPlatform(platform, 12);
    var elev = null;
    for (var i = 0; i < hours.length; i++) {
      if (hours[i].precipProb != null && hours[i].precipProb >= 40) {
        elev = hours[i];
        break;
      }
    }
    if (elev) return "Chance rises around " + (elev.label || "later");
    if (nowProb != null && nowProb <= 10) return "Dry for the next few hours";
    if (nowProb != null) return "Low rain chance now (" + Math.round(nowProb) + "%)";
    return null;
  }

  function lightPhaseLabel(data, platform) {
    var g = data && data.graphic;
    var state = g && g.state ? String(g.state) : "";
    var map = {
      sunrise: "Sunrise window",
      golden: "Golden hour",
      sunset: "Sunset window",
      "blue-hour": "Blue hour",
      night: "Night",
      day: "Daylight"
    };
    if (map[state]) return map[state];
    var Intel = global.WDS && global.WDS.dashboardRebuildIntel;
    if (Intel && platform) {
      try {
        var a = Intel.analyze(platform, null);
        var sig = (a.happeningNow || []).filter(function (s) {
          return s.category === "light";
        })[0];
        if (sig) return sig.title;
      } catch (e) {
        /* ignore */
      }
    }
    return "Natural light";
  }

  function scenesLinkFor(widgetId, platform) {
    var Intel = global.WDS && global.WDS.dashboardRebuildIntel;
    if (!Intel || !platform) return null;
    try {
      var a = Intel.analyze(platform, null);
      var want =
        widgetId === "ph-light"
          ? ["light-golden-approaching", "light-blue-hour", "light-sunrise-soon"]
          : widgetId === "ph-astronomy"
            ? ["astro-dark-moon-clear"]
            : [];
      for (var i = 0; i < (a.happeningNow || []).length; i++) {
        var s = a.happeningNow[i];
        if (want.indexOf(s.id) < 0) continue;
        var link = (s.toolLinks || []).filter(function (l) {
          return l && l.id === "scenes";
        })[0];
        if (link) return link;
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  function buildDepthModel(widgetId, data, platform) {
    data = data || {};
    var rows = [];
    var spark = "";
    var headline = null;
    var actions = [];

    if (widgetId === "ph-conditions" && data.current) {
      var c = data.current;
      headline = c.conditions || "Current conditions";
      rows.push(row("Temperature", c.tempF != null ? Math.round(c.tempF) + "°F" : null));
      if (c.feelsF != null && c.tempF != null && Math.abs(Math.round(c.feelsF) - Math.round(c.tempF)) >= FEELS_DELTA_MIN) {
        rows.push(
          row(
            "Feels like",
            Math.round(c.feelsF) + "°F",
            Math.round(c.feelsF) > Math.round(c.tempF) ? "Warmer than air" : "Cooler than air"
          )
        );
      }
      rows.push(row("Humidity", c.humidity != null ? Math.round(c.humidity) + "%" : null));
      rows.push(row("Dew point", c.dewPointF != null ? Math.round(c.dewPointF) + "°F" : null));
      rows.push(row("Cloud cover", c.cloudPct != null ? Math.round(c.cloudPct) + "%" : null));
      rows.push(row("Visibility", c.visibilityMi != null ? round(c.visibilityMi, 1) + " mi" : null));
      rows.push(row("Wind", c.windMph != null ? Math.round(c.windMph) + " mph" : null));
      if (c.windGust != null && (c.windMph == null || Math.round(c.windGust) - Math.round(c.windMph) >= GUST_DELTA_MIN)) {
        rows.push(row("Gusts", Math.round(c.windGust) + " mph"));
      }
      rows.push(row("Precip chance", c.precipProb != null ? Math.round(c.precipProb) + "%" : null));
      if (c.precipAmt != null && c.precipAmt > 0) {
        rows.push(row("Observed precip", round(c.precipAmt, 2) + " in", "Observed"));
      }
      rows.push(row("Pressure", c.pressure != null ? Math.round(c.pressure) + " mb" : null));
      rows.push(row("UV", c.uvIndex != null ? String(round(c.uvIndex, 1)) : null));
      var day = platform && platform.weatherRef && platform.weatherRef.daily && platform.weatherRef.daily[0];
      if (day) {
        var hi = num(day.temperatureHigh);
        var lo = num(day.temperatureLow);
        if (hi != null) rows.push(row("Today high", Math.round(hi) + "°F"));
        if (lo != null) rows.push(row("Today low", Math.round(lo) + "°F"));
      }
    } else if (widgetId === "ph-next-hours") {
      var hours = data.hours && data.hours.length ? data.hours : hoursFromPlatform(platform, 8);
      var curP = data.current && data.current.precipProb;
      headline = data.changeHeadline || changeHeadline(hours, curP);
      hours.slice(0, 8).forEach(function (h) {
        var bits = [];
        if (h.tempF != null) bits.push(Math.round(h.tempF) + "°");
        if (h.precipProb != null) bits.push(Math.round(h.precipProb) + "% precip");
        if (h.windMph != null) bits.push(Math.round(h.windMph) + " mph");
        if (h.conditions) bits.push(String(h.conditions));
        rows.push(row(h.label || "Hour", bits.join(" · ") || null));
      });
      spark = sparkline(
        hours.map(function (h) {
          return h.tempF;
        }),
        { label: "Temperature trend" }
      );
    } else if (widgetId === "ph-precip-window") {
      var ph = (data.hours && data.hours.length ? data.hours : hoursFromPlatform(platform, 12)).slice(0, 12);
      var wxCur = data.current || null;
      if (
        !wxCur &&
        global.WDS.dashboardRebuildData &&
        global.WDS.dashboardRebuildData.weatherCurrent
      ) {
        wxCur = global.WDS.dashboardRebuildData.weatherCurrent(platform);
      }
      headline = data.timingHeadline || precipHeadline({ current: wxCur }, platform);
      if (wxCur && wxCur.precipProb != null) {
        rows.push(row("Now (probability)", Math.round(wxCur.precipProb) + "%", "Probability"));
      }
      if (wxCur && wxCur.precipAmt != null && wxCur.precipAmt > 0) {
        rows.push(row("Observed now", round(wxCur.precipAmt, 2) + " in", "Observed"));
      } else if (wxCur && wxCur.precipProb != null && wxCur.precipProb <= 10) {
        rows.push(row("Observed now", "None reported", "Observed"));
      }
      var elev = null;
      var peak = null;
      ph.forEach(function (h) {
        if (h.precipProb == null) return;
        if (!peak || h.precipProb > peak.precipProb) peak = h;
        if (h.precipProb >= 40 && !elev) elev = h;
      });
      if (elev) rows.push(row("First elevated", Math.round(elev.precipProb) + "% around " + elev.label));
      if (peak) rows.push(row("Peak (12h)", Math.round(peak.precipProb) + "% around " + peak.label));
      var ending = null;
      if (elev) {
        for (var ei = ph.indexOf(elev) + 1; ei < ph.length; ei++) {
          if (ph[ei].precipProb != null && ph[ei].precipProb < 25) {
            ending = ph[ei];
            break;
          }
        }
      }
      if (ending) rows.push(row("Easing toward", ending.label + " (" + Math.round(ending.precipProb) + "%)"));
      spark = sparkline(
        ph.map(function (h) {
          return h.precipProb;
        }),
        { label: "Precipitation probability" }
      );
    } else if (widgetId === "ph-wind") {
      var wc =
        global.WDS.dashboardRebuildData && global.WDS.dashboardRebuildData.weatherCurrent
          ? global.WDS.dashboardRebuildData.weatherCurrent(platform)
          : null;
      if (wc) {
        rows.push(row("Sustained", wc.windMph != null ? Math.round(wc.windMph) + " mph" : null));
        if (wc.windGust != null && (wc.windMph == null || Math.round(wc.windGust) - Math.round(wc.windMph) >= GUST_DELTA_MIN)) {
          rows.push(row("Gusts", Math.round(wc.windGust) + " mph"));
        }
        if (wc.windDir != null) rows.push(row("Direction", Math.round(wc.windDir) + "°"));
      }
      var wh = hoursFromPlatform(platform, 8);
      var maxG = null;
      wh.forEach(function (h) {
        var g = h.windGust != null ? h.windGust : h.windMph;
        if (g == null) return;
        if (!maxG || g > maxG.g) maxG = { g: g, label: h.label };
        var windBits = [];
        if (h.windMph != null) windBits.push(Math.round(h.windMph) + " mph");
        if (h.windGust != null && (h.windMph == null || h.windGust - h.windMph >= GUST_DELTA_MIN)) {
          windBits.push("gust " + Math.round(h.windGust));
        }
        rows.push(row(h.label || "Hour", windBits.join(" · ") || null));
      });
      if (maxG) rows.push(row("Strongest soon", Math.round(maxG.g) + " mph around " + maxG.label));
      spark = sparkline(
        wh.map(function (h) {
          return h.windGust != null ? h.windGust : h.windMph;
        }),
        { label: "Wind / gust trend" }
      );
    } else if (widgetId === "ph-air" && data.air) {
      var aq = data.air;
      rows.push(row("US AQI", aq.aqi != null ? String(Math.round(aq.aqi)) : null));
      rows.push(row("Category", aq.category));
      rows.push(row("PM2.5", aq.pm25 != null ? Math.round(aq.pm25) + " µg/m³" : null));
      if (aq.category) {
        var explain =
          /good/i.test(aq.category)
            ? "Air quality is generally acceptable for outdoor time."
            : /moderate/i.test(aq.category)
              ? "Sensitive groups may notice outdoor air more than usual."
              : /unhealthy/i.test(aq.category)
                ? "Outdoor air may be concerning for more people — check official guidance."
                : null;
        if (explain) rows.push(row("Meaning", explain, "Derived"));
      }
    } else if (widgetId === "ph-uv") {
      (data.facts || []).forEach(function (f) {
        rows.push(row(f.label, f.value, f.note));
      });
      var uh = hoursFromPlatform(platform, 10);
      var peakUv = null;
      uh.forEach(function (h) {
        if (h.uvIndex == null) return;
        if (!peakUv || h.uvIndex > peakUv.uvIndex) peakUv = h;
      });
      if (peakUv) rows.push(row("Approx. peak timing", peakUv.label + " · UV " + round(peakUv.uvIndex, 1)));
      spark = sparkline(
        uh.map(function (h) {
          return h.uvIndex;
        }),
        { label: "UV progression" }
      );
    } else if (widgetId === "ph-light") {
      headline = lightPhaseLabel(data, platform);
      var dl = data.daylight || {};
      rows.push(row("Sunrise", dl.sunriseFormatted || formatTime(dl.sunriseISO || dl.sunrise)));
      rows.push(row("Sunset", dl.sunsetFormatted || formatTime(dl.sunsetISO || dl.sunset)));
      if (dl.goldenHourEvening || dl.goldenHour) {
        rows.push(
          row("Golden hour", String(dl.goldenHourEvening || dl.goldenHour), dl.goldenHourStatus === "estimated" ? "Estimated" : null)
        );
      }
      if (dl.blueHourEvening || dl.blueHour) {
        rows.push(
          row("Blue hour", String(dl.blueHourEvening || dl.blueHour), dl.blueHourStatus === "estimated" ? "Estimated" : null)
        );
      }
      var wc2 =
        global.WDS.dashboardRebuildData && global.WDS.dashboardRebuildData.weatherCurrent
          ? global.WDS.dashboardRebuildData.weatherCurrent(platform)
          : null;
      if (wc2 && wc2.cloudPct != null) rows.push(row("Cloud cover", Math.round(wc2.cloudPct) + "%"));
      var scenes = scenesLinkFor("ph-light", platform);
      if (scenes) actions.push(scenes);
    } else if (widgetId === "ph-astronomy") {
      var moon = data.moon || {};
      rows.push(row("Phase", moon.phase));
      rows.push(row("Illumination", moon.illumination != null ? Math.round(moon.illumination) + "%" : null, "Computed"));
      if (moon.phaseValue != null) {
        rows.push(row("Cycle", moon.phaseValue <= 0.5 ? "Waxing" : "Waning", "Derived"));
      }
      if (moon.rise) rows.push(row("Moonrise", String(moon.rise)));
      if (moon.set) rows.push(row("Moonset", String(moon.set)));
      if (data.nightSky) rows.push(row("Sky context", data.nightSky, "Derived"));
      (data.facts || []).forEach(function (f) {
        if (/cloud/i.test(f.label)) rows.push(row(f.label, f.value, f.note));
      });
      var scenesA = scenesLinkFor("ph-astronomy", platform);
      if (scenesA) actions.push(scenesA);
    } else if (widgetId === "ph-alerts") {
      var items = (data.alerts && data.alerts.items) || [];
      if (!items.length) {
        rows.push(row("Status", "No active alerts"));
      } else {
        items.forEach(function (item, idx) {
          var title = item.event || item.headline || "Weather alert";
          rows.push(row(idx === 0 ? "Alert" : "Also", title));
          if (item.severity) rows.push(row("Severity", String(item.severity)));
          if (item.onset || item.effective || item.starts) {
            rows.push(row("Effective", formatTime(item.onset || item.effective || item.starts) || String(item.onset || item.effective || item.starts)));
          }
          if (item.ends || item.expires || item.expiry) {
            rows.push(row("Expires", formatTime(item.ends || item.expires || item.expiry) || String(item.ends || item.expires || item.expiry)));
          }
          if (item.description || item.instruction || item.summary) {
            var desc = String(item.description || item.instruction || item.summary);
            if (desc.length > 220) desc = desc.slice(0, 217) + "…";
            rows.push(row("Detail", desc, "Official"));
          }
          if (item.url || item.link || item.web) {
            actions.push({ id: "alert-source", label: "Official detail", href: item.url || item.link || item.web });
          }
        });
      }
      rows.push(row("Source", "NWS / official alerts"));
    } else if (widgetId === "ph-day-range") {
      (data.facts || []).forEach(function (f) {
        rows.push(row(f.label, f.value, f.note));
      });
      var wc3 =
        global.WDS.dashboardRebuildData && global.WDS.dashboardRebuildData.weatherCurrent
          ? global.WDS.dashboardRebuildData.weatherCurrent(platform)
          : null;
      var day2 = platform && platform.weatherRef && platform.weatherRef.daily && platform.weatherRef.daily[0];
      var high = day2 ? num(day2.temperatureHigh) : null;
      var low = day2 ? num(day2.temperatureLow) : null;
      if (wc3 && wc3.tempF != null && high != null && low != null && high !== low) {
        var pct = Math.round(((wc3.tempF - low) / (high - low)) * 100);
        pct = Math.max(0, Math.min(100, pct));
        rows.push(row("Now in range", Math.round(wc3.tempF) + "°F · ~" + pct + "% through today's span", "Derived"));
        spark =
          '<div class="wdb-r-depth__range" role="img" aria-label="Current temperature within today\'s range">' +
          '<span class="wdb-r-depth__range-track"><span class="wdb-r-depth__range-fill" style="width:' +
          pct +
          '%"></span></span></div>';
      }
    } else if (widgetId === "ph-comfort") {
      (data.facts || []).forEach(function (f) {
        rows.push(row(f.label, f.value, f.note));
      });
      rows.push(row("Note", "Comfort detail also appears inside Conditions depth.", "Derived"));
    } else if (widgetId === "ph-doorway") {
      (data.facts || []).forEach(function (f) {
        rows.push(row(f.label, f.value, f.note));
      });
      if (data.brief) rows.push(row("Brief", data.brief, "Derived"));
    } else {
      (data.facts || []).forEach(function (f) {
        rows.push(row(f.label, f.value, f.note));
      });
    }

    freshnessRows(platform, data).forEach(function (r) {
      rows.push(r);
    });

    rows = rows.filter(Boolean);
    /* Deduplicate freshness/source labels keeping first; allow repeated
       instrument labels (e.g. per-alert Severity / Detail). */
    var uniqueOnce = { updated: 1, freshness: 1, trust: 1, source: 1 };
    var seen = Object.create(null);
    rows = rows.filter(function (r) {
      var k = String(r.label).toLowerCase();
      if (!uniqueOnce[k]) return true;
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    });

    return {
      id: widgetId,
      headline: headline,
      rows: rows,
      spark: spark,
      actions: actions,
      hasContent: rows.length > 0 || !!spark
    };
  }

  function renderDepthPanel(widget, data, platform) {
    widget = widget || {};
    if (!data || data.status === "waiting" || data.status === "unavailable") return "";
    if (widget.id === "ph-doorway") return ""; /* Before You Go already is synthesized depth */
    var model = buildDepthModel(widget.id, data, platform);
    if (!model.hasContent) return "";
    var panelId = "wdb-r-depth-" + String(widget.id).replace(/[^a-z0-9-]/gi, "");
    var actionsHtml = (model.actions || [])
      .map(function (a) {
        if (!a || !a.href) return "";
        return (
          '<a class="wdb-r-depth__action" href="' +
          escapeHtml(a.href) +
          '">' +
          escapeHtml(a.label || "Open") +
          "</a>"
        );
      })
      .join("");
    return (
      '<div class="wdb-r-depth" data-wdb-r-depth>' +
      '<button type="button" class="wdb-r-depth__toggle" data-wdb-r-depth-toggle aria-expanded="false" aria-controls="' +
      escapeHtml(panelId) +
      '">Details</button>' +
      '<div class="wdb-r-depth__panel" id="' +
      escapeHtml(panelId) +
      '" data-wdb-r-depth-panel hidden>' +
      (model.headline
        ? '<p class="wdb-r-depth__headline">' + escapeHtml(model.headline) + "</p>"
        : "") +
      (model.spark || "") +
      (model.rows.length
        ? '<dl class="wdb-r-depth__facts">' +
          model.rows
            .map(function (r) {
              return (
                '<div class="wdb-r-depth__fact"><dt>' +
                escapeHtml(r.label) +
                "</dt><dd>" +
                escapeHtml(r.value) +
                (r.note
                  ? ' <span class="wdb-r-widget__note">' + escapeHtml(r.note) + "</span>"
                  : "") +
                "</dd></div>"
              );
            })
            .join("") +
          "</dl>"
        : "") +
      (actionsHtml ? '<div class="wdb-r-depth__actions">' + actionsHtml + "</div>" : "") +
      '<button type="button" class="wdb-r-depth__close" data-wdb-r-depth-close>Close details</button>' +
      "</div></div>"
    );
  }

  function setOpen(article, open, opts) {
    opts = opts || {};
    if (!article) return false;
    var btn = article.querySelector("[data-wdb-r-depth-toggle]");
    var panel = article.querySelector("[data-wdb-r-depth-panel]");
    if (!btn || !panel) return false;
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      panel.removeAttribute("hidden");
      article.setAttribute("data-depth-open", "true");
      if (opts.focusClose) {
        var close = panel.querySelector("[data-wdb-r-depth-close]");
        if (close && close.focus) {
          try {
            close.focus({ preventScroll: true });
          } catch (e) {
            close.focus();
          }
        }
      }
    } else {
      panel.setAttribute("hidden", "");
      article.removeAttribute("data-depth-open");
      if (opts.restoreFocus && btn.focus) {
        try {
          btn.focus({ preventScroll: true });
        } catch (e2) {
          btn.focus();
        }
      }
    }
    return true;
  }

  function openWidget(host, widgetId) {
    if (!host || !widgetId) return false;
    var article =
      host.querySelector('.wdb-r-widget[data-widget-id="' + widgetId + '"]') ||
      document.querySelector('.wdb-r-widget[data-widget-id="' + widgetId + '"]');
    if (!article) return false;
    if (!setOpen(article, true, { focusClose: true })) return false;
    try {
      article.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (e) {
      article.scrollIntoView(true);
    }
    article.classList.add("wdb-r-widget--hn-focus");
    global.setTimeout(function () {
      article.classList.remove("wdb-r-widget--hn-focus");
    }, 2200);
    if (!article.hasAttribute("tabindex")) article.setAttribute("tabindex", "-1");
    return true;
  }

  function bind(host) {
    if (!host || host.__wdbDepthBound) return;
    host.__wdbDepthBound = true;

    host.addEventListener("click", function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;
      if (host.querySelector && host.getAttribute && host.getAttribute("data-view") === "customize") return;
      /* Guard: ignore clicks originating in customize controls */
      if (t.closest(".wdb-r-widget__controls")) return;

      var toggle = t.closest("[data-wdb-r-depth-toggle]");
      if (toggle) {
        ev.preventDefault();
        var article = toggle.closest(".wdb-r-widget");
        var open = toggle.getAttribute("aria-expanded") === "true";
        setOpen(article, !open, { focusClose: !open, restoreFocus: open });
        return;
      }
      var close = t.closest("[data-wdb-r-depth-close]");
      if (close) {
        ev.preventDefault();
        setOpen(close.closest(".wdb-r-widget"), false, { restoreFocus: true });
      }
    });

    host.addEventListener("keydown", function (ev) {
      if (ev.key !== "Escape" && ev.keyCode !== 27) return;
      var openArticle = host.querySelector('.wdb-r-widget[data-depth-open="true"]');
      if (!openArticle) return;
      ev.preventDefault();
      setOpen(openArticle, false, { restoreFocus: true });
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardRebuildDepth = {
    version: VERSION,
    feelsDeltaMin: FEELS_DELTA_MIN,
    gustDeltaMin: GUST_DELTA_MIN,
    buildDepthModel: buildDepthModel,
    renderDepthPanel: renderDepthPanel,
    changeHeadline: changeHeadline,
    precipHeadline: precipHeadline,
    bind: bind,
    openWidget: openWidget,
    setOpen: setOpen
  };
})(typeof window !== "undefined" ? window : global);
