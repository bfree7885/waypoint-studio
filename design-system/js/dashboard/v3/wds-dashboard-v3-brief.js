/**
 * Dashboard V3 — Today's Outdoor Brief (hero intelligence summary).
 * Reusable bullet-list component. Source: Waypoint's Take rules (placeholder/rule-based OK).
 * Answers: "I'm heading outside today. What should I know?" in <30 seconds.
 */
(function (global) {
  "use strict";

  function esc(s) {
    var M = global.WDS && global.WDS.dashboardV2Model;
    return M && M.escapeHtml ? M.escapeHtml(s) : String(s == null ? "" : s);
  }

  /**
   * Build brief payload from model / take engine.
   * @returns {{ title: string, subtitle: string, bullets: string[], trustNote: string|null, generatedAt: string }}
   */
  function build(input) {
    input = input || {};
    var model = input.model || input;
    var Take = global.WDS && global.WDS.dashboardV2Take;
    var take = input.take || null;

    if (!take && Take && Take.generateWaypointsTake) {
      take = Take.generateWaypointsTake({
        model: model,
        weather: model.weather,
        hourly: model.weather && model.weather.hourly,
        alerts: model.alerts,
        astronomy: { daylight: model.daylight, moon: model.moon },
        photography: model.photography,
        airQuality: model.air,
        uv: model.weather && model.weather.current && model.weather.current.uv,
        rivers: model.rivers,
        seasonal: { season: model.season },
        trust: model.provider && model.provider.trust,
        location: model.location,
        currentTime: input.currentTime || new Date()
      });
    }

    take = take || { bullets: [], trustNote: null };
    var bullets = (take.bullets || []).slice(0, 8);
    if (!bullets.length) {
      bullets = [
        "Shell is ready — live outdoor cues will fill this brief as providers respond.",
        "Open Customize Dashboard to choose the widgets that matter for today’s plans.",
        "Slow providers never block this page; each widget loads on its own."
      ];
    }

    var place = model && model.location && model.location.label ? model.location.label : "your area";
    return {
      title: "Today’s Outdoor Brief",
      subtitle: "What you should know before heading outside near " + place + ".",
      bullets: bullets,
      trustNote: take.trustNote || null,
      generatedAt: take.generatedAt || new Date().toISOString(),
      count: bullets.length
    };
  }

  /**
   * Reusable intelligence summary — bullet list hero.
   */
  function render(brief, opts) {
    opts = opts || {};
    brief = brief || build({});
    var idPrefix = opts.idPrefix || "wdb-v3-brief";
    var compact = !!opts.compact;

    return (
      '<section class="wdb-v3-brief' +
      (compact ? " wdb-v3-brief--compact" : "") +
      '" data-wdb-v3-brief aria-labelledby="' +
      idPrefix +
      '-title">' +
      '<div class="wdb-v3-brief__intro">' +
      '<p class="wdb-v3-brief__eyebrow">Interpretation over information</p>' +
      '<h2 class="wdb-v3-brief__title" id="' +
      idPrefix +
      '-title">' +
      esc(brief.title || "Today’s Outdoor Brief") +
      "</h2>" +
      (brief.subtitle
        ? '<p class="wdb-v3-brief__subtitle">' + esc(brief.subtitle) + "</p>"
        : "") +
      (brief.trustNote
        ? '<p class="wdb-v3-brief__note" role="note">' + esc(brief.trustNote) + "</p>"
        : "") +
      "</div>" +
      '<ul class="wdb-v3-brief__list">' +
      (brief.bullets || [])
        .map(function (b) {
          return "<li>" + esc(b) + "</li>";
        })
        .join("") +
      "</ul>" +
      "</section>"
    );
  }

  /**
   * Standalone helper for short intelligence summaries anywhere in the product.
   */
  function renderSummaryList(bullets, opts) {
    opts = opts || {};
    var title = opts.title || "Summary";
    var id = opts.id || "wdb-v3-summary";
    bullets = bullets || [];
    return (
      '<section class="wdb-v3-brief wdb-v3-brief--compact" aria-labelledby="' +
      id +
      '">' +
      '<h3 class="wdb-v3-brief__title" id="' +
      id +
      '">' +
      esc(title) +
      "</h3>" +
      '<ul class="wdb-v3-brief__list">' +
      bullets
        .map(function (b) {
          return "<li>" + esc(b) + "</li>";
        })
        .join("") +
      "</ul></section>"
    );
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardV3Brief = {
    VERSION: "3.0.0",
    build: build,
    render: render,
    renderSummaryList: renderSummaryList
  };
})(window);
