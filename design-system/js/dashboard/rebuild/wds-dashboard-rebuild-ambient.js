/**
 * Dashboard Ambient Mode — glanceable NOW / DEVELOPING / OPPORTUNITIES.
 * Consumes a normalized Ambient snapshot. Does not call weather APIs.
 * Dedicated-display first: large type, high contrast, three regions.
 */
(function (global) {
  "use strict";

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function api(name) {
    return global.WDS && global.WDS[name] ? global.WDS[name] : null;
  }

  function clockLabel(iso, timezone) {
    var d = iso ? new Date(iso) : new Date();
    if (isNaN(d.getTime())) d = new Date();
    try {
      return d.toLocaleString(undefined, {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
        timeZone: timezone || undefined
      });
    } catch (e) {
      try {
        return d.toLocaleString(undefined, { weekday: "short", hour: "numeric", minute: "2-digit" });
      } catch (e2) {
        return d.toISOString();
      }
    }
  }

  function trustLabel(trust) {
    var t = String(trust || "waiting").toLowerCase();
    if (t === "live") return "Live";
    if (t === "cached") return "Cached";
    if (t === "partial") return "Partial";
    if (t === "estimated") return "Estimated";
    if (t === "unavailable") return "Unavailable";
    if (t === "computed" || t === "derived" || t === "catalog") return "Derived";
    if (t === "unknown") return "Unknown";
    return "Waiting";
  }

  function developingKicker(state) {
    if (state === "urgent") return "Needs attention";
    if (state === "attention") return "Developing";
    if (state === "quiet") return "Quiet";
    return "Unknown";
  }

  function opportunityLevelLabel(level) {
    if (!level) return "";
    var l = String(level).toLowerCase();
    if (l === "excellent" || l === "high") return "Strong";
    if (l === "good" || l === "moderate") return "Useful";
    if (l === "fair") return "Mixed";
    if (l === "poor" || l === "low") return "Limited";
    if (l === "unavailable") return "Unknown";
    return "";
  }

  function domainLabel(domain) {
    if (domain === "photography") return "Photography";
    if (domain === "astronomy") return "Night sky";
    if (domain === "foraging") return "Foraging";
    if (domain === "sheds") return "Sheds";
    return domain || "Opportunity";
  }

  function renderNow(snapshot) {
    var c = snapshot.conditions || {};
    var place = snapshot.place || {};
    var temp =
      c.temperatureF != null && isFinite(c.temperatureF) ? String(Math.round(c.temperatureF)) + "°" : "—";
    var daylight = c.daylight || {};
    var moon = c.moon || {};
    var moonLine = "";
    if (moon.status === "ready") {
      var moonBits = [];
      if (moon.phaseLabel) moonBits.push(moon.phaseLabel);
      if (moon.illuminationPct != null) moonBits.push(Math.round(moon.illuminationPct) + "% lit");
      moonLine = moonBits.join(" · ");
    } else {
      moonLine = "Moon unknown";
    }
    var sunLine = daylight.remainingLabel || daylight.headline || "Daylight unknown";
    if (daylight.sunsetLabel && daylight.status === "day") {
      sunLine = (daylight.remainingLabel || "Daylight") + " · sunset " + daylight.sunsetLabel;
    } else if (daylight.sunriseLabel && daylight.status === "night") {
      sunLine = daylight.remainingLabel || "Night · sunrise " + daylight.sunriseLabel;
    }
    var factLine = c.detail || c.headline || "Conditions unavailable";
    return (
      '<section class="wdb-r-ambient__region wdb-r-ambient__now" data-ambient-region="now" aria-labelledby="wdb-r-ambient-now-title">' +
      '<p class="wdb-r-ambient__kicker">Now</p>' +
      '<h2 id="wdb-r-ambient-now-title" class="wdb-r-ambient__region-title">Around you</h2>' +
      '<p class="wdb-r-ambient__place">' +
      escapeHtml(place.label || "Place not set") +
      "</p>" +
      '<p class="wdb-r-ambient__temp" data-ambient-temp data-status="' +
      escapeHtml(c.status || "waiting") +
      '">' +
      escapeHtml(temp) +
      "</p>" +
      '<p class="wdb-r-ambient__summary">' +
      escapeHtml(c.summary || (c.status === "live" || c.status === "cached" ? factLine : "Waiting for live conditions")) +
      "</p>" +
      (c.detail
        ? '<p class="wdb-r-ambient__facts">' + escapeHtml(c.detail) + "</p>"
        : "") +
      '<p class="wdb-r-ambient__sun" data-ambient-daylight data-status="' +
      escapeHtml(daylight.status || "unknown") +
      '">' +
      escapeHtml(sunLine) +
      "</p>" +
      '<p class="wdb-r-ambient__moon" data-ambient-moon data-status="' +
      escapeHtml(moon.status || "unknown") +
      '">' +
      escapeHtml(moonLine) +
      "</p>" +
      '<p class="wdb-r-ambient__trust">' +
      escapeHtml(trustLabel(c.status)) +
      (c.stale ? " · may be stale" : "") +
      "</p>" +
      "</section>"
    );
  }

  function renderDeveloping(snapshot) {
    var d = snapshot.developing || {};
    var state = d.state || "unknown";
    var items = d.items || [];
    var list = "";
    if (items.length) {
      list =
        '<ol class="wdb-r-ambient__signals">' +
        items
          .map(function (item) {
            return (
              '<li class="wdb-r-ambient__signal" data-kind="' +
              escapeHtml(item.kind || "") +
              '" data-severity="' +
              escapeHtml(item.severity || "routine") +
              '">' +
              (item.kicker
                ? '<span class="wdb-r-ambient__signal-kicker">' + escapeHtml(item.kicker) + "</span>"
                : "") +
              '<span class="wdb-r-ambient__signal-title">' +
              escapeHtml(item.title) +
              "</span>" +
              (item.detail
                ? '<span class="wdb-r-ambient__signal-detail">' + escapeHtml(item.detail) + "</span>"
                : "") +
              "</li>"
            );
          })
          .join("") +
        "</ol>";
    }
    return (
      '<section class="wdb-r-ambient__region wdb-r-ambient__developing" data-ambient-region="developing" data-state="' +
      escapeHtml(state) +
      '" aria-labelledby="wdb-r-ambient-dev-title">' +
      '<p class="wdb-r-ambient__kicker">' +
      escapeHtml(developingKicker(state)) +
      "</p>" +
      '<h2 id="wdb-r-ambient-dev-title" class="wdb-r-ambient__region-title">Developing</h2>' +
      '<p class="wdb-r-ambient__headline">' +
      escapeHtml(d.headline || "Not enough to say") +
      "</p>" +
      '<p class="wdb-r-ambient__lede">' +
      escapeHtml(d.detail || "") +
      "</p>" +
      list +
      "</section>"
    );
  }

  function renderOpportunities(snapshot) {
    var list = snapshot.opportunities || [];
    var cards = list
      .map(function (op) {
        var status = op.status || "unknown";
        var level = opportunityLevelLabel(op.level);
        return (
          '<article class="wdb-r-ambient__opp" data-domain="' +
          escapeHtml(op.domain || "") +
          '" data-status="' +
          escapeHtml(status) +
          '">' +
          '<p class="wdb-r-ambient__opp-domain">' +
          escapeHtml(domainLabel(op.domain)) +
          (level ? " · " + escapeHtml(level) : status === "unknown" ? " · Unknown" : "") +
          "</p>" +
          '<p class="wdb-r-ambient__opp-headline">' +
          escapeHtml(op.headline || "Unknown") +
          "</p>" +
          '<p class="wdb-r-ambient__opp-detail">' +
          escapeHtml(op.detail || "") +
          "</p>" +
          "</article>"
        );
      })
      .join("");
    return (
      '<section class="wdb-r-ambient__region wdb-r-ambient__opportunities" data-ambient-region="opportunities" aria-labelledby="wdb-r-ambient-opp-title">' +
      '<p class="wdb-r-ambient__kicker">Worth a look</p>' +
      '<h2 id="wdb-r-ambient-opp-title" class="wdb-r-ambient__region-title">Opportunities</h2>' +
      '<div class="wdb-r-ambient__opp-list">' +
      cards +
      "</div>" +
      "</section>"
    );
  }

  function renderSources(snapshot) {
    var sources = snapshot.sources || [];
    var live = sources.filter(function (s) {
      return s && (s.trust === "live" || s.trust === "derived" || s.trust === "computed" || s.trust === "catalog");
    });
    var labels = live
      .map(function (s) {
        return s.label;
      })
      .filter(Boolean);
    var line = labels.length ? "Based on " + labels.join(" · ") : "Sources have not settled.";
    return '<p class="wdb-r-ambient__sources">' + escapeHtml(line) + "</p>";
  }

  function ensureSnapshot(input) {
    if (input && input.schemaVersion && input.conditions) return input;
    var Snap = api("dashboardRebuildAmbientSnapshot");
    if (Snap && typeof Snap.compose === "function") {
      return Snap.compose(input && input.platform ? input : input || {});
    }
    return {
      schemaVersion: 1,
      capturedAt: new Date().toISOString(),
      place: { label: "Place not set", trust: "waiting" },
      conditions: {
        status: "waiting",
        headline: "Waiting for conditions",
        detail: "Live weather has not arrived yet.",
        daylight: { status: "unknown" },
        moon: { status: "unknown" }
      },
      developing: {
        state: "unknown",
        headline: "Not enough to say",
        detail: "Conditions are still settling — we cannot yet say whether anything is developing.",
        items: []
      },
      opportunities: [],
      sources: [],
      signals: []
    };
  }

  function render(snapshot) {
    snapshot = ensureSnapshot(snapshot);
    var state = (snapshot.developing && snapshot.developing.state) || "unknown";
    var cond = (snapshot.conditions && snapshot.conditions.status) || "waiting";
    return (
      '<div class="wdb-r-ambient" data-wdb-r-ambient data-developing="' +
      escapeHtml(state) +
      '" data-conditions="' +
      escapeHtml(cond) +
      '">' +
      '<header class="wdb-r-ambient__mast">' +
      '<p class="wdb-r-ambient__brand">Ambient</p>' +
      '<p class="wdb-r-ambient__clock">' +
      escapeHtml(clockLabel(snapshot.capturedAt, snapshot.place && snapshot.place.timezone)) +
      "</p>" +
      '<p class="wdb-r-ambient__question">What is happening around me, what is changing, and what is worth my attention?</p>' +
      "</header>" +
      '<div class="wdb-r-ambient__grid">' +
      renderNow(snapshot) +
      renderDeveloping(snapshot) +
      renderOpportunities(snapshot) +
      "</div>" +
      renderSources(snapshot) +
      "</div>"
    );
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardRebuildAmbient = {
    version: "1.0.0-phase1",
    render: render
  };
})(typeof window !== "undefined" ? window : global);
