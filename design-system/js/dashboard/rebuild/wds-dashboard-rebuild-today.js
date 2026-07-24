/**
 * Dashboard Rebuild — Today Outside (RC3 Outdoor Intelligence surface).
 * Flagship briefing: summary + Daily Brief + Discovery + Outdoor Score + activities + windows.
 * Evolves the Phase 3 panel — does not create a competing section.
 * Authority: docs/rebuild-2026/03-dashboard-architecture.md + RC3 Sprint 5
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

  /**
   * Prefer a hydrated brief from the data pack (one generate per hydrate).
   * Fall back to generate only when platform is present without a brief.
   */
  function resolveBrief(ctx) {
    ctx = ctx || {};
    if (ctx.intelligence && ctx.intelligence.version) {
      return ctx.intelligence;
    }
    var Intel = intelligence();
    if (Intel && Intel.generate && ctx.platform) {
      try {
        var Prefs = global.WDS && global.WDS.dashboardRebuildPrefs;
        var interests =
          ctx.interests ||
          (Prefs && Prefs.load ? Prefs.load().interests : null) ||
          Intel.DEFAULT_INTERESTS;
        return Intel.generate(ctx.platform, { now: ctx.now, interests: interests });
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
    if (l === "exceptional") return "exceptional";
    if (l === "excellent") return "excellent";
    if (l === "good") return "good";
    if (l === "mixed" || l === "fair") return "mixed";
    if (l === "challenging" || l === "poor") return "challenging";
    return "mixed";
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

  function renderListBlock(titleId, title, items, listClass, emptyText) {
    var rows = (items || [])
      .filter(Boolean)
      .map(function (item) {
        return "<li>" + escapeHtml(item) + "</li>";
      })
      .join("");
    if (!rows && emptyText) {
      rows = "<li>" + escapeHtml(emptyText) + "</li>";
    }
    if (!rows) return "";
    return (
      '<div class="wdb-r-today__brief-block">' +
      '<h4 class="wdb-r-today__brief-h" id="' +
      escapeHtml(titleId) +
      '">' +
      escapeHtml(title) +
      "</h4>" +
      '<ul class="wdb-r-today__brief-list ' +
      escapeHtml(listClass || "") +
      '" aria-labelledby="' +
      escapeHtml(titleId) +
      '">' +
      rows +
      "</ul>" +
      "</div>"
    );
  }

  function renderDailyBrief(dailyBrief, take) {
    if (!dailyBrief && !(take && take.text)) return "";
    var db = dailyBrief || {};
    var takeObj = (db.take && db.take.text ? db.take : null) || take || null;
    var outlook =
      db.outlook ||
      (!dailyBrief ? null : "Outlook settles once live weather arrives for this place.");

    return (
      '<section class="wdb-r-today__brief" data-wdb-r-brief aria-labelledby="wdb-r-today-brief-title">' +
      '<h3 class="wdb-r-today__subhead" id="wdb-r-today-brief-title">Daily Brief</h3>' +
      (outlook
        ? '<div class="wdb-r-today__brief-block wdb-r-today__brief-outlook">' +
          '<h4 class="wdb-r-today__brief-h" id="wdb-r-today-outlook-title">Today\'s Outlook</h4>' +
          '<p class="wdb-r-today__brief-text" aria-labelledby="wdb-r-today-outlook-title">' +
          escapeHtml(outlook) +
          "</p>" +
          "</div>"
        : "") +
      renderListBlock(
        "wdb-r-today-opportunities-title",
        "Opportunity Highlights",
        db.opportunities,
        "wdb-r-today__brief-list--opportunities",
        dailyBrief && dailyBrief.ready
          ? "No standout opportunities from the signals currently available."
          : null
      ) +
      renderListBlock(
        "wdb-r-today-watch-title",
        "Things to Watch",
        db.watch,
        "wdb-r-today__brief-list--watch",
        null
      ) +
      (db.interesting
        ? '<div class="wdb-r-today__brief-block">' +
          '<h4 class="wdb-r-today__brief-h" id="wdb-r-today-interesting-title">Why Today Is Interesting</h4>' +
          '<p class="wdb-r-today__brief-text" aria-labelledby="wdb-r-today-interesting-title">' +
          escapeHtml(db.interesting) +
          "</p>" +
          "</div>"
        : "") +
      (takeObj && takeObj.text
        ? '<div class="wdb-r-today__take" data-wdb-r-take>' +
          '<h4 class="wdb-r-today__brief-h" id="wdb-r-today-take-title">Waypoint\'s Take</h4>' +
          '<p class="wdb-r-today__take-text">' +
          escapeHtml(takeObj.text) +
          "</p>" +
          (takeObj.confidence
            ? '<p class="wdb-r-today__conf" data-confidence="' +
              escapeHtml(confClass(takeObj.confidence)) +
              '">' +
              escapeHtml(takeObj.confidence) +
              " confidence</p>"
            : "") +
          "</div>"
        : "") +
      "</section>"
    );
  }

  function renderDiscovery(discovery) {
    if (!discovery) return "";
    var cards = Array.isArray(discovery.cards) ? discovery.cards : [];
    var edu = discovery.educationalMoment;
    var week = discovery.thisWeekOutside;
    var hasEdu = edu && edu.ready && edu.text;
    var hasWeek = week && week.ready && (week.summary || (week.changes && week.changes.length));
    if (!cards.length && !hasEdu && !hasWeek) return "";

    var cardHtml = cards
      .map(function (card) {
        if (!card || !card.text) return "";
        return (
          '<article class="wdb-r-today__discover-card" role="listitem" data-discover-card="' +
          escapeHtml(card.id || "") +
          '">' +
          '<h4 class="wdb-r-today__brief-h" id="wdb-r-discover-' +
          escapeHtml(card.id || "card") +
          '-title">' +
          escapeHtml(card.title || "Note") +
          "</h4>" +
          '<p class="wdb-r-today__brief-text" aria-labelledby="wdb-r-discover-' +
          escapeHtml(card.id || "card") +
          '-title">' +
          escapeHtml(card.text) +
          "</p>" +
          (card.confidence
            ? '<p class="wdb-r-today__conf" data-confidence="' +
              escapeHtml(confClass(card.confidence)) +
              '">' +
              escapeHtml(card.confidence) +
              " confidence</p>"
            : "") +
          "</article>"
        );
      })
      .join("");

    var eduHtml = hasEdu
      ? '<div class="wdb-r-today__discover-edu" data-wdb-r-edu data-topic="' +
        escapeHtml(edu.topic || "") +
        '">' +
        '<h4 class="wdb-r-today__brief-h" id="wdb-r-today-edu-title">' +
        escapeHtml(edu.title || "Educational Moment") +
        "</h4>" +
        '<p class="wdb-r-today__brief-text" aria-labelledby="wdb-r-today-edu-title">' +
        escapeHtml(edu.text) +
        "</p>" +
        "</div>"
      : "";

    var weekChanges =
      hasWeek && week.changes && week.changes.length
        ? '<ul class="wdb-r-today__brief-list wdb-r-today__discover-week-list" aria-labelledby="wdb-r-today-week-title">' +
          week.changes
            .map(function (c) {
              return "<li>" + escapeHtml(c) + "</li>";
            })
            .join("") +
          "</ul>"
        : "";
    var weekHtml = hasWeek
      ? '<div class="wdb-r-today__discover-week" data-wdb-r-week>' +
        '<h4 class="wdb-r-today__brief-h" id="wdb-r-today-week-title">' +
        escapeHtml(week.title || "This Week Outside") +
        "</h4>" +
        (week.summary
          ? '<p class="wdb-r-today__brief-text" aria-labelledby="wdb-r-today-week-title">' +
            escapeHtml(week.summary) +
            "</p>"
          : "") +
        weekChanges +
        (week.confidence
          ? '<p class="wdb-r-today__conf" data-confidence="' +
            escapeHtml(confClass(week.confidence)) +
            '">' +
            escapeHtml(week.confidence) +
            " confidence</p>"
          : "") +
        "</div>"
      : "";

    return (
      '<section class="wdb-r-today__discover" data-wdb-r-discover aria-labelledby="wdb-r-today-discover-title">' +
      '<h3 class="wdb-r-today__subhead" id="wdb-r-today-discover-title">Discovery</h3>' +
      (cardHtml
        ? '<div class="wdb-r-today__discover-cards" role="list">' + cardHtml + "</div>"
        : "") +
      eduHtml +
      weekHtml +
      "</section>"
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
          '<span class="wdb-r-today__activity-lead">' +
          '<span class="wdb-r-today__activity-icon" aria-hidden="true">' +
          escapeHtml(a.icon || "○") +
          "</span>" +
          '<span class="wdb-r-today__activity-name">' +
          escapeHtml(a.label) +
          "</span>" +
          "</span>" +
          '<span class="wdb-r-today__pill" data-level="' +
          escapeHtml(levelClass(a.level)) +
          '">' +
          escapeHtml(a.level) +
          "</span>" +
          "</div>" +
          (a.bestWindow
            ? '<p class="wdb-r-today__activity-window">' +
              '<span class="wds-sr-only">Best time: </span>' +
              escapeHtml(a.bestWindow) +
              (a.bestWindowConfidence
                ? ' <span class="wdb-r-today__conf" data-confidence="' +
                  escapeHtml(confClass(a.bestWindowConfidence)) +
                  '">' +
                  escapeHtml(a.bestWindowConfidence) +
                  "</span>"
                : "") +
              "</p>"
            : "") +
          '<p class="wdb-r-today__activity-why">' +
          escapeHtml(a.explanation || a.recommendation || "") +
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
        var precisionNote =
          w.precision === "range" ? "hourly range" : "practical band";
        return (
          '<li class="wdb-r-today__window" data-window="' +
          escapeHtml(w.id) +
          '" data-precision="' +
          escapeHtml(w.precision || "band") +
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
          " confidence · " +
          escapeHtml(precisionNote) +
          "</p>" +
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
          escapeHtml(f.label || f.factor) +
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
    var educational = (explanation.educational || [])
      .map(function (e) {
        return (
          "<li><strong>" +
          escapeHtml(e.label || e.id) +
          "</strong> — " +
          escapeHtml(e.text || "") +
          "</li>"
        );
      })
      .join("");
    var confReasons = (explanation.confidenceReasons || (score && score.confidenceReasons) || [])
      .map(function (r) {
        return "<li>" + escapeHtml(r) + "</li>";
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
      (confReasons
        ? '<h4 class="wdb-r-today__explain-h">Why confidence is ' +
          escapeHtml((score && score.confidence) || explanation.confidence || "Limited") +
          "</h4><ul class=\"wdb-r-today__explain-list\">" +
          confReasons +
          "</ul>"
        : "") +
      (factors
        ? '<h4 class="wdb-r-today__explain-h">Contributing factors</h4><ul class="wdb-r-today__explain-list">' +
          factors +
          "</ul>"
        : "") +
      (educational
        ? '<h4 class="wdb-r-today__explain-h">What the instruments suggest</h4><ul class="wdb-r-today__explain-list">' +
          educational +
          "</ul>"
        : "") +
      missing +
      (weights
        ? '<p class="wdb-r-today__explain-weights"><span class="wdb-r-today__explain-h">Base weights</span> — ' +
          weights +
          ". Missing factors are dropped and remaining weights renormalized.</p>"
        : "") +
      '<p class="wdb-r-today__explain-note">Clock ranges appear only when hourly coverage is reliable; otherwise windows use broader bands (Early Morning, Near Sunset). Low confidence is stated when hourly or river data is thin.</p>' +
      "</div>" +
      "</details>"
    );
  }

  function renderIntelligence(brief) {
    if (!brief) return "";
    return (
      '<div class="wdb-r-today__intel" data-wdb-r-intel>' +
      renderScore(brief.score) +
      renderDailyBrief(brief.dailyBrief, brief.take) +
      renderDiscovery(brief.discovery) +
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
    version: "4.4.0-rc3-s5",
    render: render,
    mount: mount,
    placeLabel: placeLabel,
    timeContext: timeContext,
    resolveLines: resolveLines,
    resolveBrief: resolveBrief
  };
})(typeof window !== "undefined" ? window : global);
