/**
 * Dashboard Discover — upcoming natural events (bounded).
 * Curated structured catalog. No LLM-invented times. No full celestial calendar.
 * Lifecycle: upcoming → tonight → happening → ended (hidden).
 */
(function (global) {
  "use strict";

  var VERSION = "1.0.0-natural-events";
  var catalog = null;
  var loadPromise = null;
  var loadError = null;

  function parseDate(value) {
    if (!value) return null;
    if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
    var d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  function inRange(n, pair) {
    if (!pair || pair.length < 2) return false;
    var v = Number(n);
    var a = Number(pair[0]);
    var b = Number(pair[1]);
    if (!isFinite(v) || !isFinite(a) || !isFinite(b)) return false;
    return v >= Math.min(a, b) && v <= Math.max(a, b);
  }

  function locationInBoxes(lat, lng, regions) {
    if (lat == null || lng == null) return false;
    var i;
    for (i = 0; i < (regions || []).length; i++) {
      var r = regions[i];
      if (r && inRange(lat, r.lat) && inRange(lng, r.lng)) return true;
    }
    return false;
  }

  function eventVisibleAt(event, lat, lng) {
    if (!event) return { visible: false, reason: "missing-event" };
    var vis = event.visibility || {};
    if (!vis.mode || vis.mode === "global") {
      return { visible: true, reason: "global" };
    }
    if (lat == null || lng == null || !isFinite(Number(lat)) || !isFinite(Number(lng))) {
      return { visible: false, reason: "location-unknown" };
    }
    if (vis.mode === "region-boxes") {
      var ok = locationInBoxes(lat, lng, vis.regions);
      return {
        visible: ok,
        reason: ok ? "in-visibility-region" : "outside-visibility-region",
        region: ok ? "local" : null
      };
    }
    return { visible: false, reason: "unsupported-visibility-mode" };
  }

  function zoneParts(instant, timeZone) {
    if (!instant || !timeZone) return null;
    try {
      var fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: timeZone,
        weekday: "short",
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
      });
      var out = { weekday: null, month: null, day: null, year: null, hour: null, minute: null, dayPeriod: null };
      fmt.formatToParts(instant).forEach(function (p) {
        if (p.type === "weekday") out.weekday = p.value;
        else if (p.type === "month") out.month = p.value;
        else if (p.type === "day") out.day = Number(p.value);
        else if (p.type === "year") out.year = Number(p.value);
        else if (p.type === "hour") out.hour = p.value;
        else if (p.type === "minute") out.minute = p.value;
        else if (p.type === "dayPeriod") out.dayPeriod = p.value;
      });
      out.clock = out.hour + ":" + out.minute + (out.dayPeriod ? " " + out.dayPeriod : "");
      out.dateKey = out.year + "-" + out.month + "-" + out.day;
      return out;
    } catch (e) {
      return null;
    }
  }

  function formatLocal(iso, timeZone, withDate) {
    var d = parseDate(iso);
    if (!d) return null;
    var zp = timeZone ? zoneParts(d, timeZone) : null;
    if (zp) {
      if (withDate) return zp.weekday + ", " + zp.month + " " + zp.day + ", " + zp.clock;
      return zp.clock;
    }
    try {
      var opts = { hour: "numeric", minute: "2-digit" };
      if (withDate) {
        opts.weekday = "short";
        opts.month = "short";
        opts.day = "numeric";
      }
      if (timeZone) opts.timeZone = timeZone;
      return d.toLocaleString("en-US", opts);
    } catch (e) {
      return d.toISOString();
    }
  }

  function localDateKey(instant, timeZone) {
    var zp = zoneParts(instant, timeZone);
    if (zp) return zp.dateKey;
    var d = parseDate(instant);
    if (!d) return null;
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }

  function weekdayNightLabel(iso, timeZone) {
    var d = parseDate(iso);
    if (!d) return null;
    var zp = zoneParts(d, timeZone);
    var wd = zp && zp.weekday ? zp.weekday.toUpperCase() : null;
    if (!wd) {
      try {
        wd = d.toLocaleString("en-US", { weekday: "short", timeZone: timeZone || undefined }).toUpperCase();
      } catch (e) {
        return null;
      }
    }
    return wd + " NIGHT";
  }

  function eventTimes(event) {
    var w = (event && event.windows) || {};
    return {
      start: parseDate(w.penumbralStart || w.start),
      partialStart: parseDate(w.partialStart),
      greatest: parseDate(w.greatest),
      partialEnd: parseDate(w.partialEnd),
      end: parseDate(w.penumbralEnd || w.end)
    };
  }

  function lifecycle(event, now, timeZone) {
    now = parseDate(now) || new Date();
    var t = eventTimes(event);
    if (!t.start || !t.end) return "invalid";
    if (now.getTime() >= t.end.getTime()) return "ended";
    if (now.getTime() >= t.start.getTime()) return "happening";
    var horizon = Number(event.horizonHours);
    if (!isFinite(horizon) || horizon <= 0) horizon = 72;
    var hoursUntil = (t.start.getTime() - now.getTime()) / 3600000;
    if (hoursUntil > horizon) return "hidden";
    var startKey = localDateKey(t.start, timeZone);
    var greatestKey = t.greatest ? localDateKey(t.greatest, timeZone) : null;
    var nowKey = localDateKey(now, timeZone);
    if (nowKey && (nowKey === startKey || nowKey === greatestKey)) return "tonight";
    if (hoursUntil <= 18) return "tonight";
    return "upcoming";
  }

  function cloudCoverNear(platform, when) {
    var wx = platform && platform.weatherRef;
    if (!wx) return null;
    var target = parseDate(when);
    var hourly = wx.hourly || [];
    var best = null;
    var bestDelta = Infinity;
    var i;
    for (i = 0; i < hourly.length; i++) {
      var row = hourly[i];
      var ts = parseDate(row && (row.time || row.timestamp || row.start));
      if (!ts || !target) continue;
      var cloud =
        row.cloudCover != null
          ? Number(row.cloudCover)
          : row.cloudCoverPct != null
            ? Number(row.cloudCoverPct)
            : null;
      if (cloud == null || !isFinite(cloud)) continue;
      var delta = Math.abs(ts.getTime() - target.getTime());
      if (delta < bestDelta) {
        bestDelta = delta;
        best = { pct: cloud, at: ts.toISOString(), source: "hourly-forecast", deltaMs: delta };
      }
    }
    if (best && best.deltaMs <= 3 * 60 * 60 * 1000) return best;
    var cur = wx.current || {};
    var nowCloud = cur.cloudCover != null ? Number(cur.cloudCover) : null;
    if (nowCloud != null && isFinite(nowCloud)) {
      return { pct: nowCloud, at: null, source: "current", deltaMs: null };
    }
    return null;
  }

  function viewingOutlook(cloud) {
    if (!cloud || cloud.pct == null || !isFinite(cloud.pct)) return null;
    var pct = Math.round(cloud.pct);
    var forecastish = cloud.source === "hourly-forecast";
    var coverLabel = forecastish
      ? "Forecast cloud cover near " + pct + "% around maximum"
      : "Current cloud cover near " + pct + "% (not a timed forecast)";
    if (pct <= 35) {
      return {
        tone: "promising",
        text: coverLabel + ". Viewing outlook: promising.",
        uncertainty: forecastish ? "forecast" : "current"
      };
    }
    if (pct <= 70) {
      return {
        tone: "mixed",
        text: coverLabel + ". Viewing outlook: mixed — clouds may interfere.",
        uncertainty: forecastish ? "forecast" : "current"
      };
    }
    return {
      tone: "difficult",
      text: coverLabel + ". Viewing may be difficult.",
      uncertainty: forecastish ? "forecast" : "current"
    };
  }

  function kickerFor(state, event, timeZone) {
    if (state === "happening") return "HAPPENING NOW";
    if (state === "tonight") return "TONIGHT";
    var night = weekdayNightLabel(
      (event.windows && (event.windows.partialStart || event.windows.start)) || null,
      timeZone
    );
    return night ? "COMING SOON · " + night : "COMING SOON";
  }

  function summarizeEclipse(event, timeZone, vis, weather) {
    var greatest = formatLocal(event.windows.greatest, timeZone, true);
    var partialStart = formatLocal(event.windows.partialStart, timeZone, true);
    var partialEnd = formatLocal(event.windows.partialEnd, timeZone, true);
    var lines = [];
    if (event.subtype === "partial") {
      lines.push("A deep partial lunar eclipse — about " + Math.round((event.magnitude || 0) * 100) + "% of the Moon’s diameter in Earth’s umbra.");
    } else {
      lines.push(event.title || "Lunar eclipse");
    }
    if (greatest) lines.push("Maximum around " + greatest + " local time.");
    if (partialStart && partialEnd) {
      lines.push("Partial phase " + partialStart + " – " + partialEnd + ".");
    }
    if (vis && vis.visible) {
      lines.push("Visible from this region if the Moon is above the horizon.");
    }
    var outlook = viewingOutlook(weather);
    if (outlook) lines.push(outlook.text);
    return {
      lede: lines[0] || event.title,
      detail: lines.slice(1),
      outlook: outlook
    };
  }

  function evaluateEvent(event, options) {
    options = options || {};
    var now = parseDate(options.now) || new Date();
    var lat = options.lat;
    var lng = options.lng;
    var timeZone = options.timeZone || null;
    var vis = eventVisibleAt(event, lat, lng);
    if (!vis.visible) {
      return {
        id: event.id,
        state: "not-visible",
        visible: false,
        reason: vis.reason,
        event: event
      };
    }
    var state = lifecycle(event, now, timeZone);
    if (state === "ended" || state === "hidden" || state === "invalid") {
      return {
        id: event.id,
        state: state,
        visible: true,
        event: event,
        timeZone: timeZone
      };
    }
    var weather = cloudCoverNear(options.platform, event.windows && event.windows.greatest);
    var copy = summarizeEclipse(event, timeZone, vis, weather);
    return {
      id: event.id,
      type: event.type,
      subtype: event.subtype,
      title: event.title,
      significance: event.significance || "notable",
      state: state,
      visible: true,
      timeZone: timeZone,
      kicker: kickerFor(state, event, timeZone),
      local: {
        start: formatLocal(event.windows.penumbralStart || event.windows.start, timeZone, true),
        partialStart: formatLocal(event.windows.partialStart, timeZone, true),
        greatest: formatLocal(event.windows.greatest, timeZone, true),
        partialEnd: formatLocal(event.windows.partialEnd, timeZone, true),
        end: formatLocal(event.windows.penumbralEnd || event.windows.end, timeZone, true),
        nightLabel: weekdayNightLabel(event.windows.partialStart || event.windows.start, timeZone)
      },
      magnitude: event.magnitude,
      obscurationPct: event.obscurationPct,
      copy: copy,
      weather: weather,
      outlook: copy.outlook,
      sources: event.sources || [],
      topics: event.topics || [],
      confidence: event.confidence || "high",
      event: event
    };
  }

  function activeDiscoverEvents(options) {
    options = options || {};
    var list = (options.catalog || catalog || {}).events;
    if (!Array.isArray(list) || !list.length) return [];
    var out = [];
    list.forEach(function (event) {
      if (!event || !event.id) return;
      var evaluated = evaluateEvent(event, options);
      if (!evaluated) return;
      if (evaluated.state === "upcoming" || evaluated.state === "tonight" || evaluated.state === "happening") {
        out.push(evaluated);
      }
    });
    return out;
  }

  function hasDiscoverEvents(options) {
    return activeDiscoverEvents(options).length > 0;
  }

  function catalogUrl() {
    try {
      var path = (global.location && global.location.pathname) || "";
      if (/\/apps\/dashboard\//.test(path)) {
        return "../../design-system/js/dashboard/natural-events/events.json";
      }
    } catch (e) {
      /* ignore */
    }
    return "design-system/js/dashboard/natural-events/events.json";
  }

  function setCatalog(next) {
    catalog = next && typeof next === "object" ? next : null;
    loadError = null;
    loadPromise = null;
    return catalog;
  }

  function getCatalog() {
    return catalog;
  }

  function loadCatalog() {
    if (catalog) return Promise.resolve(catalog);
    if (loadPromise) return loadPromise;
    if (typeof global.fetch !== "function") {
      loadError = "fetch-unavailable";
      return Promise.resolve(null);
    }
    loadPromise = global
      .fetch(catalogUrl())
      .then(function (res) {
        if (!res || !res.ok) {
          loadError = "http-" + (res && res.status);
          catalog = null;
          return null;
        }
        return res.json();
      })
      .then(function (json) {
        if (json && Array.isArray(json.events)) {
          catalog = json;
          loadError = null;
          return catalog;
        }
        if (json) {
          loadError = "invalid-catalog";
          catalog = null;
        }
        return catalog;
      })
      .catch(function () {
        loadError = "fetch-failed";
        catalog = null;
        return null;
      })
      .then(function (result) {
        /* Failed loads must not stick: later hydrate/paint can retry. */
        if (!catalog) loadPromise = null;
        return result;
      });
    return loadPromise;
  }

  function getLoadError() {
    return loadError;
  }

  global.WDS = global.WDS || {};
  global.WDS.naturalEvents = {
    version: VERSION,
    setCatalog: setCatalog,
    getCatalog: getCatalog,
    loadCatalog: loadCatalog,
    getLoadError: getLoadError,
    eventVisibleAt: eventVisibleAt,
    lifecycle: lifecycle,
    formatLocal: formatLocal,
    evaluateEvent: evaluateEvent,
    activeDiscoverEvents: activeDiscoverEvents,
    hasDiscoverEvents: hasDiscoverEvents,
    viewingOutlook: viewingOutlook,
    cloudCoverNear: cloudCoverNear,
    catalogUrl: catalogUrl
  };
})(typeof window !== "undefined" ? window : global);
