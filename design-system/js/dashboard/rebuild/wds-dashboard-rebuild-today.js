/**
 * Dashboard Rebuild — Today Outside (RC3 Outdoor Intelligence surface).
 * Flagship briefing: summary bullets + Outdoor Score + activities + windows + Take.
 * Evolves the Phase 3 panel — does not create a competing section.
 * Authority: docs/rebuild-2026/03-dashboard-architecture.md + RC3 Sprint 1
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

  function placeLabel(ctx) {
    ctx = ctx || {};
    if (ctx.placeLabel) return String(ctx.placeLabel);
    if (ctx.displayTitle) return String(ctx.displayTitle);
    if (ctx.name) return String(ctx.name);
    return "Place not set";
  }

  function timeContext(now) {
    now = now || new Date();
    try {
      return now.toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit"
      });
    } catch (e) {
      return now.toISOString();
    }
  }

  function trustLabel(trust) {
    var t = String(trust || "waiting").toLowerCase();
    if (t === "live") return "Live";
    if (t === "cached") return "Cached";
    if (t === "partial") return "Partial";
    if (t === "offline") return "Offline";
    if (t === "estimated") return "Estimated";
    if (t === "unavailable") return "Unavailable";
    if (t === "pending" || t === "waiting") return "Waiting";
    return "Waiting";
  }

  function trustAttr(trust) {
    var t = String(trust || "waiting").toLowerCase();
    if (t === "pending") return "waiting";
    if (t === "unavailable") return "unavailable";
    return t || "waiting";
  }

  function defaultLines() {
    var Data = global.WDS && global.WDS.dashboardRebuildData;
    if (Data && Data.waitingTodayLines) return Data.waitingTodayLines();
    return [
      "Summary settling as place and weather arrive.",
      "Conditions will appear here.",
      "Light and air settle independently."
    ];
  }

  var BANNED_LINE =
    /you should|don't forget|do not forget|dont forget|great day for|perfect day for|do this|try |remember to|homework|assignment|go now|coaching|best activity/i;

  function intelligence() {
    return global.WDS && global.WDS.dashboardRebuildIntelligence;
  }

  function resolveBrief(ctx) {
    ctx = ctx || {};
    var Intel = intelligence();
    if (Intel && Intel.generate && ctx.platform) {
      try {
        return Intel.generate(ctx.platform, { now: ctx.now });
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  function resolveLines(ctx, brief) {
    ctx = ctx || {};
    /* Prefer intelligence brief lines when ready — flagship surface owns summary. */
    if (brief && brief.ready && Array.isArray(brief.lines) && brief.lines.length) {
      return brief.lines.filter(function (line) {
        return line && !BANNED_LINE.test(String(line));
      });
    }
    if (Array.isArray(ctx.lines) && ctx.lines.length) {
      return ctx.lines.slice(0, 8).filter(function (line) {
        return line && !BANNED_LINE.test(String(line));
      });
    }
    if (brief && Array.isArray(brief.lines) && brief.lines.length) {
      return brief.lines.filter(function (line) {
        return line && !BANNED_LINE.test(String(line));
      });
    }
    var Data = global.WDS && global.WDS.dashboardRebuildData;
    if (ctx.platform && Data && Data.composeTodayLines) {
      var composed = Data.composeTodayLines(ctx.platform);
      if (composed && composed.length) return composed;
    }
    return defaultLines();
  }

  function levelClass(level) {
    var l = String(level || "").toLowerCase();
    if (l === "excellent") return "excellent";
    if (l === "good") return "good";
    if (l === "fair") return "fair";
    if (l === "poor") return "poor";
    return "fair";
  }

  function confClass(conf) {
    var c = String(conf || "").toLowerCase();
    if (c === "high") return "high";
    if (c === "moderate" || c === "medium") return "moderate";
    return "limited";
  }

  function renderScore(score) {
    if (!score || score.value == null) {
      return (
        '<div class="wdb-r-today__score wdb-r-today__score--waiting" data-wdb-r-score>' +
        '<p class="wdb-r-today__score-label">Outdoor Score</p>' +
        '<p class="wdb-r-today__score-value" aria-live="polite">Settling</p>' +
        '<p class="wdb-r-today__score-note">Waiting on live weather.</p>' +
        "</div>"
      );
    }
    return (
      '<div class="wdb-r-today__score" data-wdb-r-score data-level="' +
      escapeHtml(levelClass(score.label)) +
      '">' +
      '<p class="wdb-r-today__score-label">Outdoor Score</p>' +
      '<p class="wdb-r-today__score-value">' +
      '<span class="wdb-r-today__score-num">' +
      escapeHtml(String(score.value)) +
      "</span>" +
      '<span class="wdb-r-today__score-den" aria-hidden="true">/100</span>' +
      '<span class="wds-sr-only"> out of 100</span>' +
      "</p>" +
      '<p class="wdb-r-today__score-meta">' +
      '<span class="wdb-r-today__pill" data-level="' +
      escapeHtml(levelClass(score.label)) +
      '">' +
      escapeHtml(score.label) +
      "</span>" +
      '<span class="wdb-r-today__conf" data-confidence="' +
      escapeHtml(confClass(score.confidence)) +
      '">' +
      escapeHtml(score.confidence) +
      " confidence</span>" +
      "</p>" +
      "</div>"
    );
  }

  function renderTake(take) {
    if (!take || !take.text) return "";
    return (
      '<div class="wdb-r-today__take" data-wdb-r-take>' +
      '<h3 class="wdb-r-today__subhead" id="wdb-r-today-take-title">Waypoint\'s Take</h3>' +
      '<p class="wdb-r-today__take-text">' +
      escapeHtml(take.text) +
      "</p>" +
      (take.confidence
        ? '<p class="wdb-r-today__conf" data-confidence="' +
          escapeHtml(confClass(take.confidence)) +
          '">' +
          escapeHtml(take.confidence) +
          " confidence</p>"
        : "") +
      "</div>"
    );
  }

  function renderActivities(activities) {
    if (!activities || !activities.length) return "";
    var items = activities
      .map(function (a) {
        if (!a) return "";
        var avail = a.available !== false;
        return (
          '<li class="wdb-r-today__activity" data-activity="' +
          escapeHtml(a.id) +
          '" data-level="' +
          escapeHtml(levelClass(a.level)) +
          '"' +
          (avail ? "" : ' data-limited="true"') +
          ">" +
          '<div class="wdb-r-today__activity-row">' +
          '<span class="wdb-r-today__activity-name">' +
          escapeHtml(a.label) +
          "</span>" +
          '<span class="wdb-r-today__pill" data-level="' +
          escapeHtml(levelClass(a.level)) +
          '">' +
          escapeHtml(a.level) +
          "</span>" +
          "</div>" +
          '<p class="wdb-r-today__activity-why">' +
          escapeHtml(a.explanation || "") +
          "</p>" +
          '<p class="wdb-r-today__conf" data-confidence="' +
          escapeHtml(confClass(a.confidence)) +
          '">' +
          escapeHtml(a.confidence) +
          " confidence</p>" +
          "</li>"
        );
      })
      .join("");
    return (
      '<div class="wdb-r-today__activities" data-wdb-r-activities>' +
      '<h3 class="wdb-r-today__subhead" id="wdb-r-today-activities-title">Activity guide</h3>' +
      '<ul class="wdb-r-today__activity-list" aria-labelledby="wdb-r-today-activities-title">' +
      items +
      "</ul>" +
      "</div>"
    );
  }

  function renderWindows(windows) {
    if (!windows || !windows.length) return "";
    var items = windows
      .map(function (w) {
        return (
          '<li class="wdb-r-today__window" data-window="' +
          escapeHtml(w.id) +
          '">' +
          '<div class="wdb-r-today__activity-row">' +
          '<span class="wdb-r-today__activity-name">' +
          escapeHtml(w.label) +
          "</span>" +
          '<span class="wdb-r-today__window-band">' +
          escapeHtml(w.window) +
          "</span>" +
          "</div>" +
          '<p class="wdb-r-today__activity-why">' +
          escapeHtml(w.explanation || "") +
          "</p>" +
          '<p class="wdb-r-today__conf" data-confidence="' +
          escapeHtml(confClass(w.confidence)) +
          '">' +
          escapeHtml(w.confidence) +
          " confidence · practical band</p>" +
          "</li>"
        );
      })
      .join("");
    return (
      '<div class="wdb-r-today__windows" data-wdb-r-windows>' +
      '<h3 class="wdb-r-today__subhead" id="wdb-r-today-windows-title">Best time windows</h3>' +
      '<ul class="wdb-r-today__window-list" aria-labelledby="wdb-r-today-windows-title">' +
      items +
      "</ul>" +
      "</div>"
    );
  }

  function renderExplain(explanation, score) {
    if (!explanation) return "";
    var factors = (explanation.contributing || [])
      .map(function (f) {
        return (
          "<li><strong>" +
          escapeHtml(f.factor) +
          "</strong> (weight ~" +
          escapeHtml(String(f.weightShare)) +
          "%): " +
          escapeHtml(String(f.score)) +
          " — " +
          escapeHtml(f.note || "") +
          "</li>"
        );
      })
      .join("");
    var missing =
      explanation.missing && explanation.missing.length
        ? "<p class=\"wdb-r-today__explain-missing\">Missing inputs (weights redistributed): " +
          escapeHtml(explanation.missing.join(", ")) +
          ".</p>"
        : "";
    var weights = explanation.weights
      ? Object.keys(explanation.weights)
          .map(function (k) {
            return escapeHtml(k) + " " + escapeHtml(String(explanation.weights[k])) + "%";
          })
          .join(" · ")
      : "";
    return (
      '<details class="wdb-r-today__explain" data-wdb-r-explain>' +
      "<summary>Explain why" +
      (score && score.confidence
        ? ' <span class="wdb-r-today__conf" data-confidence="' +
          escapeHtml(confClass(score.confidence)) +
          '">' +
          escapeHtml(score.confidence) +
          "</span>"
        : "") +
      "</summary>" +
      '<div class="wdb-r-today__explain-body">' +
      '<p class="wdb-r-today__explain-summary">' +
      escapeHtml(explanation.summary || "") +
      "</p>" +
      (factors
        ? '<h4 class="wdb-r-today__explain-h">Contributing factors</h4><ul class="wdb-r-today__explain-list">' +
          factors +
          "</ul>"
        : "") +
      missing +
      (weights
        ? '<p class="wdb-r-today__explain-weights"><span class="wdb-r-today__explain-h">Base weights</span> — ' +
          weights +
          ". Missing factors are dropped and remaining weights renormalized.</p>"
        : "") +
      '<p class="wdb-r-today__explain-note">Time windows use practical bands (not minute-level precision). Low confidence is stated when hourly or river data is thin.</p>' +
      "</div>" +
      "</details>"
    );
  }

  function renderIntelligence(brief) {
    if (!brief) return "";
    return (
      '<div class="wdb-r-today__intel" data-wdb-r-intel>' +
      renderScore(brief.score) +
      renderTake(brief.take) +
      renderActivities(brief.activities) +
      renderWindows(brief.windows) +
      renderExplain(brief.explanation, brief.score) +
      "</div>"
    );
  }

  function render(ctx) {
    ctx = ctx || {};
    var place = placeLabel(ctx);
    var when = timeContext(ctx.now);
    var trust = trustAttr(ctx.trust || "waiting");
    var brief = resolveBrief(ctx);
    var lines = resolveLines(ctx, brief);
    var intelHtml = renderIntelligence(brief);
    return (
      '<section class="wdb-r-today" data-wdb-r-today aria-labelledby="wdb-r-today-title">' +
      '<header class="wdb-r-today__header">' +
      "<div>" +
      '<h2 id="wdb-r-today-title" class="wdb-r-today__title">Today Outside</h2>' +
      "</div>" +
      '<p class="wdb-r-today__meta">' +
      '<span class="wdb-r-today__place">' +
      escapeHtml(place) +
      "</span>" +
      '<span class="wdb-r-today__sep" aria-hidden="true"> · </span>' +
      '<span class="wdb-r-today__time">' +
      escapeHtml(when) +
      "</span>" +
      '<span class="wdb-r-today__sep" aria-hidden="true"> · </span>' +
      '<span class="wds-trust-chip" data-trust="' +
      escapeHtml(trust) +
      '">' +
      escapeHtml(trustLabel(trust)) +
      "</span>" +
      "</p>" +
      "</header>" +
      '<div class="wdb-r-today__body" data-wdb-r-today-body>' +
      '<ul class="wdb-r-today__lines">' +
      lines
        .map(function (line) {
          return "<li>" + escapeHtml(line) + "</li>";
        })
        .join("") +
      "</ul>" +
      intelHtml +
      "</div>" +
      '<div class="wdb-r-today__alerts" data-wdb-r-today-alerts hidden></div>' +
      "</section>"
    );
  }

  function mount(host, ctx) {
    if (!host) return null;
    host.innerHTML = render(ctx);
    return host.querySelector("[data-wdb-r-today]");
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardRebuildToday = {
    version: "4.0.0-rc3-s1",
    render: render,
    mount: mount,
    placeLabel: placeLabel,
    timeContext: timeContext,
    resolveLines: resolveLines,
    resolveBrief: resolveBrief
  };
})(typeof window !== "undefined" ? window : global);
