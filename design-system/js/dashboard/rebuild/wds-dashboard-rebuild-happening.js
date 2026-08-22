/**
 * Dashboard Rebuild — Happening Now discovery layer.
 * Surfaces ranked noteworthy signals from dashboardRebuildIntel (no second engine).
 * Empty list → render nothing (calm Dashboard).
 */
(function (global) {
  "use strict";

  var VERSION = "1.0.0-happening-now-layer";
  var MAX_VISIBLE = 4;

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function evidenceLabel(metric) {
    var m = String(metric || "");
    var map = {
      "alerts.count": "Active alerts",
      "alert.event": "Alert",
      "precip.probability.now": "Precip chance now",
      "precip.probability.elevated": "Elevated precip chance",
      "precip.probability.later": "Precip chance later",
      "precip.elevatedAt": "Elevated around",
      "precip.amount": "Precip amount",
      "precip.intensity": "Intensity",
      conditions: "Conditions",
      minutesUntil: "Minutes until rise",
      "wind.gustMph": "Wind gust",
      "wind.speedMph": "Wind speed",
      temperatureF: "Temperature",
      apparentF: "Feels like",
      humidityPct: "Humidity",
      aqi: "US AQI",
      category: "Air category",
      pm25: "PM2.5",
      minutesToSunset: "Minutes to sunset",
      minutesToSunrise: "Minutes to sunrise",
      sunset: "Sunset",
      "light.kind": "Light period",
      uvIndex: "UV index",
      "moon.illuminationPct": "Moon illumination",
      "moon.phase": "Moon phase",
      cloudCoverPct: "Cloud cover"
    };
    return map[m] || m.replace(/\./g, " ");
  }

  function formatEvidenceValue(e) {
    if (!e || e.value == null || e.value === "") return null;
    var metric = String(e.metric || "");
    var v = e.value;
    if (typeof v === "number" && isFinite(v)) {
      if (/illumination|probability|humidity|cloud/i.test(metric)) return Math.round(v) + "%";
      if (/temperature|apparent|temp/i.test(metric) && !/until/i.test(metric)) {
        return Math.round(v) + "°F";
      }
      if (/aqi|uvIndex|minutes|count/i.test(metric)) return String(Math.round(v));
      if (/gust|speed|Mph/i.test(metric)) return Math.round(v) + " mph";
      if (/pm25/i.test(metric)) return Math.round(v) + " µg/m³";
      return String(Math.round(v * 10) / 10);
    }
    var s = String(v);
    if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
      try {
        var d = new Date(s);
        if (!isNaN(d.getTime())) {
          return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
        }
      } catch (err) {
        /* fall through */
      }
    }
    return s;
  }

  function contextLine(signal) {
    if (!signal) return "";
    if (signal.summary) return String(signal.summary).replace(/\.$/, "");
    var bits = [];
    var evid = signal.evidence || [];
    var i;
    for (i = 0; i < evid.length && bits.length < 2; i++) {
      var formatted = formatEvidenceValue(evid[i]);
      if (formatted == null) continue;
      bits.push(evidenceLabel(evid[i].metric) + " " + formatted);
    }
    return bits.join(" · ");
  }

  function scenesActionLabel(link) {
    var reason = String((link && link.reason) || "").toLowerCase();
    if (/dark|sky|star/i.test(reason)) return "Explore in Scenes";
    if (/photo|golden|blue|morning|evening|light/i.test(reason)) return "Photo opportunity";
    return "Open Scenes";
  }

  function relatedInstrument(signal) {
    var ids = (signal && signal.relatedInstrumentIds) || [];
    var prefer = {
      alerts: "ph-alerts",
      precipitation: "ph-precip-window",
      wind: "ph-wind",
      temperature: "ph-conditions",
      air: "ph-air",
      light: "ph-light",
      astronomy: "ph-astronomy"
    };
    var want = prefer[signal.category];
    if (want && ids.indexOf(want) >= 0) return want;
    for (var i = 0; i < ids.length; i++) {
      if (ids[i] && ids[i] !== "ph-doorway") return ids[i];
    }
    return null;
  }

  function severityLabel(sev) {
    var s = String(sev || "info").toLowerCase();
    if (s === "high") return "Urgent";
    if (s === "elevated") return "Elevated";
    return "Notable";
  }

  function filterDisplayable(signals, now) {
    var when = now instanceof Date ? now : new Date(now || Date.now());
    var out = [];
    (signals || []).forEach(function (s) {
      if (!s || !s.title) return;
      if (!Array.isArray(s.evidence) || !s.evidence.length) return;
      if (s.validUntil) {
        var until = new Date(s.validUntil);
        if (!isNaN(until.getTime()) && until.getTime() < when.getTime()) return;
      }
      if (s.validFrom) {
        var from = new Date(s.validFrom);
        if (!isNaN(from.getTime()) && from.getTime() > when.getTime()) return;
      }
      out.push(s);
    });
    return out.slice(0, MAX_VISIBLE);
  }

  function resolveSignals(ctx) {
    ctx = ctx || {};
    if (Array.isArray(ctx.signals) && ctx.signals.length) {
      return filterDisplayable(ctx.signals, ctx.now);
    }
    var intel = ctx.intel;
    if (intel && Array.isArray(intel.happeningNow)) {
      return filterDisplayable(intel.happeningNow, ctx.now);
    }
    var platform = ctx.platform;
    var Intel = global.WDS && global.WDS.dashboardRebuildIntel;
    if (platform && Intel && typeof Intel.analyze === "function") {
      try {
        var analysis = Intel.analyze(platform, ctx.location || ctx.placeContext || null, ctx.now);
        return filterDisplayable((analysis && analysis.happeningNow) || [], ctx.now);
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  function renderEvidence(signal) {
    var rows = (signal.evidence || [])
      .map(function (e) {
        var val = formatEvidenceValue(e);
        if (val == null) return "";
        return (
          "<div class=\"wdb-r-hn__evidence-row\">" +
          "<dt>" +
          escapeHtml(evidenceLabel(e.metric)) +
          "</dt>" +
          "<dd>" +
          escapeHtml(val) +
          (e.source
            ? ' <span class="wdb-r-hn__evidence-src">' + escapeHtml(String(e.source)) + "</span>"
            : "") +
          "</dd>" +
          "</div>"
        );
      })
      .filter(Boolean)
      .join("");
    if (!rows) return "";
    return (
      '<div class="wdb-r-hn__evidence" hidden data-wdb-r-hn-evidence>' +
      '<p class="wdb-r-hn__evidence-label">Why</p>' +
      '<dl class="wdb-r-hn__evidence-list">' +
      rows +
      "</dl>" +
      "</div>"
    );
  }

  function renderItem(signal, index) {
    var context = contextLine(signal);
    var sev = String(signal.severity || "info").toLowerCase();
    var instrument = relatedInstrument(signal);
    var scenes = ((signal.toolLinks || []).filter(function (l) {
      return l && l.id === "scenes" && l.href;
    })[0] || null);

    var actions = "";
    if (scenes) {
      actions +=
        '<a class="wdb-r-hn__action" href="' +
        escapeHtml(scenes.href) +
        '" data-wdb-r-hn-scenes>' +
        escapeHtml(scenesActionLabel(scenes)) +
        "</a>";
    }
    if (instrument) {
      actions +=
        '<button type="button" class="wdb-r-hn__action wdb-r-hn__action--quiet" data-wdb-r-hn-focus="' +
        escapeHtml(instrument) +
        '">View instrument</button>';
    }
    actions +=
      '<button type="button" class="wdb-r-hn__why" data-wdb-r-hn-why aria-expanded="false" aria-controls="wdb-r-hn-ev-' +
      index +
      '">Why?</button>';

    var evidence = renderEvidence(signal);
    if (evidence) {
      evidence = evidence.replace(
        'data-wdb-r-hn-evidence>',
        'data-wdb-r-hn-evidence id="wdb-r-hn-ev-' + index + '">'
      );
    }

    return (
      '<li class="wdb-r-hn__item" data-signal-id="' +
      escapeHtml(signal.id) +
      '" data-category="' +
      escapeHtml(signal.category || "") +
      '" data-severity="' +
      escapeHtml(sev) +
      '">' +
      '<div class="wdb-r-hn__main">' +
      '<p class="wdb-r-hn__title">' +
      escapeHtml(signal.title) +
      ' <span class="wdb-r-hn__sev" data-severity="' +
      escapeHtml(sev) +
      '">' +
      escapeHtml(severityLabel(sev)) +
      "</span></p>" +
      (context ? '<p class="wdb-r-hn__context">' + escapeHtml(context) + "</p>" : "") +
      '<div class="wdb-r-hn__actions">' +
      actions +
      "</div>" +
      evidence +
      "</div>" +
      "</li>"
    );
  }

  /**
   * @returns {string} HTML or "" when nothing noteworthy (hide section entirely).
   */
  function render(ctx) {
    var signals = resolveSignals(ctx);
    if (!signals.length) return "";

    return (
      '<section class="wdb-r-hn" data-wdb-r-hn aria-labelledby="wdb-r-hn-title">' +
      '<header class="wdb-r-hn__header">' +
      '<h2 id="wdb-r-hn-title" class="wdb-r-hn__title-block">Happening Now</h2>' +
      '<p class="wdb-r-hn__lede">Worth noticing outside right now or soon.</p>' +
      "</header>" +
      '<ol class="wdb-r-hn__list" data-wdb-r-hn-list>' +
      signals.map(renderItem).join("") +
      "</ol>" +
      "</section>"
    );
  }

  function bind(host) {
    if (!host || typeof host.querySelectorAll !== "function") return;
    var root = host.querySelector("[data-wdb-r-hn]");
    if (!root) return;

    root.addEventListener("click", function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;

      var whyBtn = t.closest("[data-wdb-r-hn-why]");
      if (whyBtn) {
        ev.preventDefault();
        var item = whyBtn.closest(".wdb-r-hn__item");
        var panel = item && item.querySelector("[data-wdb-r-hn-evidence]");
        if (!panel) return;
        var open = whyBtn.getAttribute("aria-expanded") === "true";
        whyBtn.setAttribute("aria-expanded", open ? "false" : "true");
        if (open) panel.setAttribute("hidden", "");
        else panel.removeAttribute("hidden");
        return;
      }

      var focusBtn = t.closest("[data-wdb-r-hn-focus]");
      if (focusBtn) {
        ev.preventDefault();
        var id = focusBtn.getAttribute("data-wdb-r-hn-focus");
        if (!id) return;
        var Depth = global.WDS && global.WDS.dashboardRebuildDepth;
        if (Depth && typeof Depth.openWidget === "function" && Depth.openWidget(host, id)) {
          return;
        }
        var widget =
          host.querySelector('.wdb-r-widget[data-widget-id="' + id + '"]') ||
          document.querySelector('.wdb-r-widget[data-widget-id="' + id + '"]');
        if (!widget) return;
        try {
          widget.scrollIntoView({ behavior: "smooth", block: "center" });
        } catch (e) {
          widget.scrollIntoView(true);
        }
        widget.classList.add("wdb-r-widget--hn-focus");
        global.setTimeout(function () {
          widget.classList.remove("wdb-r-widget--hn-focus");
        }, 2200);
        if (typeof widget.focus === "function") {
          if (!widget.hasAttribute("tabindex")) widget.setAttribute("tabindex", "-1");
          try {
            widget.focus({ preventScroll: true });
          } catch (e2) {
            widget.focus();
          }
        }
      }
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardRebuildHappening = {
    version: VERSION,
    maxVisible: MAX_VISIBLE,
    render: render,
    bind: bind,
    resolveSignals: resolveSignals,
    filterDisplayable: filterDisplayable,
    contextLine: contextLine
  };
})(typeof window !== "undefined" ? window : global);
