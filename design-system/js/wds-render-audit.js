/**
 * Runtime render audit — traces visible location-sensitive values to source packages.
 */
(function (global) {
  "use strict";

  var audit = {
    startedAt: new Date().toISOString(),
    domWrites: [],
    valueTraces: [],
    observers: []
  };

  function activeCoords() {
    var ctx = global.WDS && global.WDS.locationContext && global.WDS.locationContext.getActive
      ? global.WDS.locationContext.getActive()
      : null;
    if (ctx) return { lat: ctx.lat, lng: ctx.lng, contextId: ctx.id, timezone: ctx.timezone };
    var loc = global.WDS && global.WDS.location && global.WDS.location.getState
      ? global.WDS.location.getState()
      : null;
    if (loc && isFinite(Number(loc.lat))) {
      return { lat: Number(loc.lat), lng: Number(loc.lng), contextId: null, timezone: loc.timezone || null };
    }
    return null;
  }

  function platformSnapshot() {
    var platform = global.WDS && global.WDS.outdoorIntelligence && global.WDS.outdoorIntelligence.getLast
      ? global.WDS.outdoorIntelligence.getLast()
      : null;
    if (!platform) return null;
    var dl = platform.daylight || {};
    var usgs = platform.usgsWater || {};
    return {
      contentSource: platform.meta && platform.meta.contentSource,
      liveFeed: platform.meta && platform.meta.liveFeed,
      daylight: {
        sunriseFormatted: dl.sunriseFormatted || null,
        sunsetFormatted: dl.sunsetFormatted || null,
        rawSunrise: dl.rawSunrise || dl.sunrise || null,
        rawSunset: dl.rawSunset || dl.sunset || null,
        locationContextId: dl.locationContextId || null,
        requestLat: dl.requestLat,
        requestLng: dl.requestLng,
        sourceClassification: dl.sourceClassification || null
      },
      usgs: {
        siteName: usgs.nearest && usgs.nearest.siteName ? usgs.nearest.siteName : null,
        requestLat: usgs.requestLat,
        requestLng: usgs.requestLng,
        locationContextId: usgs.locationContextId || null,
        sourceClassification: usgs.sourceClassification || null
      },
      guardAudit: platform._locationGuardAudit || null
    };
  }

  function pushDomWrite(target, oldValue, newValue, renderer) {
    audit.domWrites.push({
      at: new Date().toISOString(),
      target: target,
      oldValue: oldValue,
      newValue: newValue,
      active: activeCoords(),
      renderer: renderer || "unknown",
      platform: platformSnapshot()
    });
    if (audit.domWrites.length > 200) audit.domWrites.shift();
    publish();
  }

  function traceVisibleValues() {
    var traces = [];
    var sunriseEl = document.querySelector('.wsky-time--hero .wsky-time__value, .wsky-time__value');
    var sunsetEl = document.querySelectorAll('.wsky-time__value')[1];
    var body = document.body ? document.body.innerText : "";
    var platform = platformSnapshot();

    if (sunriseEl) {
      traces.push({
        field: "sunriseDom",
        visible: sunriseEl.textContent.trim(),
        platform: platform && platform.daylight,
        renderer: "wds-sky-dashboard-ui.renderSunMoon"
      });
    }
    if (sunsetEl) {
      traces.push({
        field: "sunsetDom",
        visible: sunsetEl.textContent.trim(),
        platform: platform && platform.daylight,
        renderer: "wds-sky-dashboard-ui.renderSunMoon"
      });
    }
    if (/WHITE ROCK C NR BURR OAK, KS/i.test(body)) {
      traces.push({
        field: "riverDom",
        visible: "WHITE ROCK C NR BURR OAK, KS",
        platform: platform && platform.usgs,
        renderer: "wds-morning-briefing / wds-water-dashboard-intel"
      });
    }
    audit.valueTraces = traces;
    publish();
  }

  function publish() {
    global.__WAYPOINT_RENDER_AUDIT__ = {
      startedAt: audit.startedAt,
      build: global.__WAYPOINT_BUILD__ || null,
      active: activeCoords(),
      platform: platformSnapshot(),
      scriptLoads: global.WDS && global.WDS.build && global.WDS.build.getScriptLoads
        ? global.WDS.build.getScriptLoads()
        : [],
      domWrites: audit.domWrites.slice(),
      valueTraces: audit.valueTraces.slice()
    };
  }

  function observeSelector(selector, label) {
    if (!global.MutationObserver) return;
    var obs = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        if (m.type !== "characterData" && m.type !== "childList") return;
        var el = m.target.nodeType === 3 ? m.target.parentElement : m.target;
        if (!el || !el.matches || !el.matches(selector)) {
          if (el && el.querySelector) el = el.querySelector(selector);
        }
        if (!el) return;
        pushDomWrite(label, m.oldValue || "", el.textContent.trim(), label);
      });
      traceVisibleValues();
    });
  }

  function installObservers() {
    [
      { sel: ".wsky-time__value", label: "sun-moon-value" },
      { sel: ".wdb-nature__text", label: "nature-card-text" },
      { sel: ".wdb-morning__pulse-value", label: "morning-pulse" },
      { sel: "#swk-river", label: "kiosk-river" }
    ].forEach(function (cfg) {
      document.querySelectorAll(cfg.sel).forEach(function (node) {
        var obs = new MutationObserver(function (mutations) {
          mutations.forEach(function (m) {
            var el = m.target.nodeType === 3 ? m.target.parentElement : m.target;
            if (!el) return;
            pushDomWrite(cfg.label, "", el.textContent.trim(), cfg.label);
          });
          traceVisibleValues();
        });
        obs.observe(node, { childList: true, subtree: true, characterData: true });
        audit.observers.push(cfg.label);
      });
    });

    var mount = document.getElementById("wds-content-engine") || document.body;
    if (mount && global.MutationObserver) {
      var rootObs = new MutationObserver(function () {
        setTimeout(traceVisibleValues, 400);
      });
      rootObs.observe(mount, { childList: true, subtree: true, characterData: true });
    }
  }

  function init() {
    publish();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        installObservers();
        setInterval(traceVisibleValues, 5000);
      });
    } else {
      installObservers();
      setInterval(traceVisibleValues, 5000);
    }
  }

  global.WDS = global.WDS || {};
  global.WDS.renderAudit = {
    init: init,
    traceVisibleValues: traceVisibleValues,
    publish: publish
  };

  init();
})(window);
