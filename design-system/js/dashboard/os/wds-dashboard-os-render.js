/**
 * Outdoor OS — Outside screen + detail sheets HTML.
 * Spec: DASHBOARD-SCREEN-SPECIFICATION.md §1–§5.
 */
(function (global) {
  "use strict";

  function esc(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderChrome() {
    return (
      '<header class="wdb-os__chrome" data-wdb-os-region="chrome">' +
        '<p class="wdb-os__brand">Outside</p>' +
        '<div class="wdb-os__chrome-actions">' +
          '<button type="button" class="wdb-os__quiet-btn" data-wdb-os-open="location">Place</button>' +
          '<button type="button" class="wdb-os__quiet-btn" data-wdb-os-action="prefs">Prefs</button>' +
        "</div>" +
      "</header>"
    );
  }

  function renderAlert(alert) {
    if (!alert) return "";
    return (
      '<button type="button" class="wdb-os__alert" data-wdb-os-region="alert" data-wdb-os-open="alerts" aria-label="Open alert details">' +
        '<span class="wdb-os__alert-text">' + esc(alert.text) + "</span>" +
        (alert.more ? '<span class="wdb-os__alert-more">' + esc(alert.more) + "</span>" : "") +
      "</button>"
    );
  }

  function renderNoLocation() {
    return (
      '<div class="wdb-os__empty" data-wdb-os-region="empty-location">' +
        "<p class=\"wdb-os__empty-title\">We need a place to brief what’s outside near you.</p>" +
        '<div class="wdb-os__empty-actions">' +
          '<button type="button" class="wdb-os__btn" data-wdb-os-action="use-location">Use my location</button>' +
          '<button type="button" class="wdb-os__btn wdb-os__btn--ghost" data-wdb-os-open="location">Choose a place</button>' +
        "</div>" +
        '<p class="wdb-os__empty-note">Until then, we won’t invent a hometown.</p>' +
      "</div>"
    );
  }

  function renderLoadingBody() {
    return (
      '<div class="wdb-os__loading" data-wdb-os-region="loading" role="status">' +
        '<p class="wdb-os__place-time wdb-os__skel-line" aria-hidden="true"></p>' +
        '<p class="wdb-os__loading-copy">Finding today’s conditions…</p>' +
        '<div class="wdb-os__skel-block" aria-hidden="true"></div>' +
        '<div class="wdb-os__skel-block wdb-os__skel-block--sm" aria-hidden="true"></div>' +
        '<div class="wdb-os__skel-block wdb-os__skel-block--sm" aria-hidden="true"></div>' +
        "<p class=\"wdb-os__loading-detail\">Live data will fill in without freezing.</p>" +
      "</div>"
    );
  }

  function renderMatters(matters) {
    if (!matters || !matters.length) return "";
    return (
      '<section class="wdb-os__matters" data-wdb-os-region="matters" aria-label="What matters">' +
        '<h2 class="wdb-os__label">What matters</h2>' +
        "<ol class=\"wdb-os__matters-list\">" +
        matters
          .map(function (m, i) {
            return (
              '<li class="wdb-os__matters-item' +
              (i === 0 ? " is-primary" : "") +
              '">' +
              '<button type="button" class="wdb-os__matters-btn" data-wdb-os-open="' +
              esc(m.panel) +
              '">' +
              esc(m.text) +
              "</button>" +
              "</li>"
            );
          })
          .join("") +
        "</ol>" +
      "</section>"
    );
  }

  function renderDo(plan) {
    if (!plan) return "";
    return (
      '<section class="wdb-os__do" data-wdb-os-region="do" aria-label="Do this">' +
        '<h2 class="wdb-os__label">Do this</h2>' +
        '<button type="button" class="wdb-os__do-primary" data-wdb-os-open="plan">' +
        esc(plan.primary) +
        "</button>" +
        (plan.alternate
          ? '<button type="button" class="wdb-os__do-alt" data-wdb-os-open="plan">' +
            esc(plan.alternate) +
            "</button>"
          : "") +
      "</section>"
    );
  }

  function renderDayArcPeek(beats) {
    if (!beats || !beats.length) return "";
    return (
      '<button type="button" class="wdb-os__dayarc" data-wdb-os-region="day-arc" data-wdb-os-open="day-arc" aria-label="Open day arc">' +
        '<span class="wdb-os__label">Day arc</span>' +
        '<span class="wdb-os__dayarc-beats">' +
        beats
          .map(function (b) {
            var clock = b.time
              ? '<span class="wdb-os__beat-time">' + esc(b.time) + "</span> "
              : "";
            return (
              '<span class="wdb-os__beat' +
              (b.best ? " is-best" : "") +
              '">' +
              clock +
              '<span class="wdb-os__beat-label">' +
              esc(b.label) +
              "</span>" +
              "</span>"
            );
          })
          .join('<span class="wdb-os__beat-sep" aria-hidden="true">·</span>') +
        "</span>" +
      "</button>"
    );
  }

  function renderScroll(view) {
    var html = "";
    // Day arc peek + sources cue live in first-viewport composition (Screen Spec §1.2 [H][I]).
    if (view.notice) {
      html +=
        '<p class="wdb-os__notice" data-wdb-os-region="notice">' +
        '<button type="button" class="wdb-os__notice-btn" data-wdb-os-open="' +
        esc(view.notice.panel) +
        '">' +
        esc(view.notice.text) +
        "</button></p>";
    }
    if (view.constraints) {
      html +=
        '<p class="wdb-os__constraints" data-wdb-os-region="constraints">' +
        esc(view.constraints.text) +
        "</p>";
    }
    if (view.gateways && view.gateways.length) {
      html +=
        '<nav class="wdb-os__gateways" data-wdb-os-region="gateways" aria-label="Look closer">' +
        '<p class="wdb-os__label">Look closer</p>' +
        '<ul class="wdb-os__gateway-list">' +
        view.gateways
          .map(function (g) {
            return (
              '<li><button type="button" class="wdb-os__gateway" data-wdb-os-open="' +
              esc(g.id) +
              '">' +
              esc(g.label) +
              "</button></li>"
            );
          })
          .join("") +
        "</ul></nav>";
    }
    html +=
      '<button type="button" class="wdb-os__prefs-foot" data-wdb-os-action="prefs">Preferences</button>';
    return html;
  }

  function renderSourcesCue(view) {
    var trustBits = [view.trust.status];
    if (view.trust.detail) trustBits.push(view.trust.detail);
    return (
      '<button type="button" class="wdb-os__sources-cue" data-wdb-os-region="sources" data-wdb-os-open="sources">' +
      esc(trustBits.join(" · ")) +
      "</button>"
    );
  }

  function renderBriefing(view) {
    return (
      renderAlert(view.alert) +
      renderChrome() +
      '<div class="wdb-os__composition" data-wdb-os-region="composition">' +
        '<button type="button" class="wdb-os__place-time" data-wdb-os-region="place-time" data-wdb-os-open="location">' +
        esc(view.placeTime) +
        "</button>" +
        '<section class="wdb-os__happening" data-wdb-os-region="happening">' +
          '<button type="button" class="wdb-os__happening-btn" data-wdb-os-open="conditions">' +
            '<h2 class="wdb-os__happening-headline">' +
            esc(view.happening.headline) +
            "</h2>" +
            '<p class="wdb-os__happening-support">' +
            esc(view.happening.support) +
            "</p>" +
          "</button>" +
        "</section>" +
        renderMatters(view.matters) +
        renderDo(view.do) +
        renderDayArcPeek(view.dayArcPeek) +
        renderSourcesCue(view) +
      "</div>" +
      '<div class="wdb-os__after" data-wdb-os-region="after-scroll">' +
        renderScroll(view) +
      "</div>"
    );
  }

  function renderScreen(view) {
    view = view || { mode: "loading" };
    var body = "";
    if (view.mode === "no-location") {
      body = renderChrome() + renderNoLocation();
    } else if (view.mode === "loading") {
      body =
        renderChrome() +
        (view.placeTime
          ? '<p class="wdb-os__place-time">' + esc(view.placeTime) + "</p>"
          : "") +
        renderLoadingBody();
    } else {
      body = renderBriefing(view);
    }

    return (
      '<div class="wdb-os" data-wdb-os data-wdb-os-mode="' +
      esc(view.mode) +
      '" data-wdb-os-atmosphere="' +
      esc(view.atmosphere || "neutral") +
      '">' +
        '<div class="wdb-os__atmosphere" aria-hidden="true"></div>' +
        '<div class="wdb-os__sheet">' +
          body +
        "</div>" +
        '<div class="wdb-os__panel-host" data-wdb-os-panel-host hidden></div>' +
      "</div>"
    );
  }

  function panelShell(title, bodyHtml) {
    var titleId = "wdb-os-panel-title";
    return (
      '<button type="button" class="wdb-os__panel-backdrop" data-wdb-os-panel-backdrop tabindex="-1" aria-label="Close panel"></button>' +
      '<div class="wdb-os-panel" role="dialog" aria-modal="true" aria-labelledby="' +
      titleId +
      '">' +
        '<div class="wdb-os-panel__handle" aria-hidden="true"></div>' +
        '<header class="wdb-os-panel__head">' +
          '<h2 class="wdb-os-panel__title" id="' +
          titleId +
          '">' +
          esc(title) +
          "</h2>" +
          '<button type="button" class="wdb-os-panel__close" data-wdb-os-panel-close aria-label="Close">' +
          '<span aria-hidden="true">×</span>' +
          "</button>" +
        "</header>" +
        '<div class="wdb-os-panel__body">' +
        bodyHtml +
        "</div>" +
      "</div>"
    );
  }

  function renderPanel(id, view) {
    var model = view.model || {};
    var c = (model.weather && model.weather.current) || {};
    if (id === "alerts") {
      var items = (view.alert && view.alert.items) || (model.alerts && model.alerts.items) || [];
      if (!items.length) {
        return panelShell("Alerts", "<p>None active.</p>");
      }
      return panelShell(
        "Alerts",
        items
          .map(function (a) {
            return (
              '<article class="wdb-os-panel__block">' +
              "<h3>" +
              esc(a.event || "Alert") +
              "</h3>" +
              "<p>" +
              esc(a.headline || a.summary || "") +
              "</p>" +
              (a.severity ? "<p class=\"wdb-os-panel__meta\">" + esc(a.severity) + "</p>" : "") +
              "</article>"
            );
          })
          .join("")
      );
    }
    if (id === "conditions") {
      var rows = [];
      if (c.tempF != null) rows.push("Temperature " + Math.round(c.tempF) + "°");
      if (c.feelsF != null) rows.push("Feels like " + Math.round(c.feelsF) + "°");
      if (c.windMph != null) rows.push("Wind near " + Math.round(c.windMph) + " mph");
      if (c.precipProb != null) rows.push("Precip chance " + Math.round(c.precipProb) + "%");
      if (c.conditions) rows.push(c.conditions);
      if (!rows.length) rows.push("Condition numbers are not available yet.");
      var changes =
        view.briefing && view.briefing.sections && view.briefing.sections.changes
          ? view.briefing.sections.changes.body
          : "";
      return panelShell(
        "Conditions",
        "<ul class=\"wdb-os-panel__list\"><li>" +
          rows.map(esc).join("</li><li>") +
          "</li></ul>" +
          (changes ? "<p>" + esc(changes) + "</p>" : "")
      );
    }
    if (id === "light") {
      var dl = model.daylight || {};
      var photo = model.photography || {};
      var bits = [];
      if (dl.sunrise) bits.push("Sunrise " + dl.sunrise);
      if (dl.sunset) bits.push("Sunset " + dl.sunset);
      if (dl.goldenHour) bits.push("Golden hour " + dl.goldenHour);
      if (c.uv != null) bits.push("UV " + c.uv);
      var photoLine = "";
      if (!photo.live || /poor|unavailable|unknown/i.test(String(photo.level || ""))) {
        photoLine = "<p>No standout light window today.</p>";
      } else if (photo.summary) {
        photoLine = "<p>" + esc(photo.summary) + "</p>";
      }
      if (!bits.length) bits.push("Daylight detail is not available yet.");
      return panelShell(
        "Light",
        "<ul class=\"wdb-os-panel__list\"><li>" + bits.map(esc).join("</li><li>") + "</li></ul>" + photoLine
      );
    }
    if (id === "air") {
      var air = model.air || {};
      if (!air.live && air.aqi == null) {
        return panelShell("Air", "<p>We don’t have air quality for this place right now.</p>");
      }
      return panelShell(
        "Air",
        "<p>AQI " +
          esc(air.aqi != null ? Math.round(air.aqi) : "—") +
          (air.category ? " · " + esc(air.category) : "") +
          "</p>"
      );
    }
    if (id === "water") {
      var sites = (model.rivers && model.rivers.sites) || [];
      if (!sites.length) {
        return panelShell("Water", "<p>No nearby water data for this place.</p>");
      }
      return panelShell(
        "Water",
        sites
          .slice(0, 4)
          .map(function (s) {
            return (
              "<p><strong>" +
              esc(s.name) +
              "</strong> — " +
              esc(
                [
                  s.stageFt != null ? s.stageFt + " ft" : "",
                  s.flowCfs != null ? s.flowCfs + " cfs" : "",
                  s.trend || ""
                ]
                  .filter(Boolean)
                  .join(" · ")
              ) +
              "</p>"
            );
          })
          .join("")
      );
    }
    if (id === "day-arc") {
      var beats = view.dayArc || [];
      if (!beats.length) {
        return panelShell("Day arc", "<p>Hourly timing will appear once weather loads.</p>");
      }
      return panelShell(
        "Day arc",
        '<ol class="wdb-os-panel__timeline">' +
          beats
            .map(function (b) {
              return (
                '<li class="wdb-os-panel__beat' +
                (b.best ? " is-best" : "") +
                '">' +
                (b.time
                  ? '<span class="wdb-os-panel__beat-time">' + esc(b.time) + "</span>"
                  : '<span class="wdb-os-panel__beat-time is-empty" aria-hidden="true">—</span>') +
                '<span class="wdb-os-panel__beat-copy">' +
                '<span class="wdb-os-panel__beat-label">' +
                esc(b.label) +
                "</span>" +
                (b.detail
                  ? '<span class="wdb-os-panel__beat-detail">' + esc(b.detail) + "</span>"
                  : "") +
                "</span></li>"
              );
            })
            .join("") +
          "</ol>"
      );
    }
    if (id === "plan") {
      var plan = view.do || {};
      return panelShell(
        "Plan",
        "<p class=\"wdb-os-panel__lead\">" +
          esc(plan.primary || "") +
          "</p>" +
          (plan.alternate ? "<p>" + esc(plan.alternate) + "</p>" : "") +
          "<ul class=\"wdb-os-panel__list\"><li>" +
          (plan.rationale || []).map(esc).join("</li><li>") +
          "</li></ul>"
      );
    }
    if (id === "sources") {
      var rows = view.providers || [];
      var trust = view.trust || {};
      var head =
        '<p class="wdb-os-panel__trust">' +
        '<span class="wdb-os-panel__trust-status">' +
        esc(trust.status || "Partial") +
        "</span>" +
        (trust.detail
          ? '<span class="wdb-os-panel__trust-detail">' + esc(trust.detail) + "</span>"
          : "") +
        "</p>";
      if (!rows.length) {
        return panelShell("Sources", head + "<p>Provider detail will appear when the briefing hydrates.</p>");
      }
      return panelShell(
        "Sources",
        head +
          '<ul class="wdb-os-panel__sources">' +
          rows
            .map(function (r) {
              var st = String(r.status || "").toLowerCase();
              var tone = /live|fresh|ok/.test(st)
                ? "is-live"
                : /unavail|error|fail|offline|stale|missing/.test(st)
                  ? "is-quiet"
                  : "is-partial";
              return (
                '<li class="wdb-os-panel__source ' +
                tone +
                '">' +
                '<span class="wdb-os-panel__source-name">' +
                esc(r.provider || r.id) +
                "</span>" +
                '<span class="wdb-os-panel__source-meta">' +
                esc(r.status) +
                (r.age && r.age !== "—" ? " · " + esc(r.age) : "") +
                "</span></li>"
              );
            })
            .join("") +
          "</ul>"
      );
    }
    if (id === "location") {
      var loc = model.location || {};
      var currentLabel = loc.label || "No place set";
      var coordsOk = !!loc.coordsOk;
      var uncertainty = coordsOk
        ? "This briefing uses the place above."
        : "We don’t have a confirmed near-me place yet.";
      return panelShell(
        "Location",
        '<p class="wdb-os-panel__lead" data-wdb-os-loc-current>' +
          esc(currentLabel) +
          "</p>" +
          '<p class="wdb-os-panel__meta">' +
          esc(uncertainty) +
          "</p>" +
          '<p class="wdb-os-panel__meta">Coordinates stay on this device unless you later choose to share observations elsewhere. Outside never invents a hometown.</p>' +
          '<div class="wdb-os-loc-actions">' +
            '<button type="button" class="wdb-os__btn" data-wdb-os-loc="geo">Use my location</button>' +
          "</div>" +
          '<form class="wdb-os-loc-search" data-wdb-os-loc-search>' +
            '<label class="wdb-os-panel__meta" for="wdb-os-loc-q">Search county or state</label>' +
            '<div class="wdb-os-loc-search__row">' +
              '<input id="wdb-os-loc-q" name="q" type="search" autocomplete="off" placeholder="e.g. Pike County, PA" />' +
              '<button type="submit" class="wdb-os__btn">Set</button>' +
            "</div>" +
            '<p class="wdb-os-panel__meta" data-wdb-os-loc-status role="status"></p>' +
          "</form>" +
          '<div class="wdb-os-loc-actions">' +
            '<button type="button" class="wdb-os__btn wdb-os__btn--ghost" data-wdb-os-panel-close>Cancel</button>' +
          "</div>"
      );
    }
    if (id === "prefs") {
      var prefs = view.prefs || {};
      var acts = (prefs.activities || []).filter(function (a) {
        return a !== "volunteer";
      });
      var catalog = ["walk", "hike", "run", "photography", "wildlife", "birding", "fishing", "stargazing"];
      return panelShell(
        "Preferences",
        "<p class=\"wdb-os-panel__meta\">Tune what “Do this” prefers. Local only — no account.</p>" +
          '<form class="wdb-os-prefs" data-wdb-os-prefs>' +
          catalog
            .map(function (aid) {
              var on = acts.indexOf(aid) >= 0;
              return (
                '<label class="wdb-os-prefs__row"><input type="checkbox" name="activity" value="' +
                esc(aid) +
                '"' +
                (on ? " checked" : "") +
                "> " +
                esc(aid.charAt(0).toUpperCase() + aid.slice(1)) +
                "</label>"
              );
            })
            .join("") +
          '<label class="wdb-os-prefs__row"><input type="checkbox" name="airQualitySensitive"' +
          (prefs.airQualitySensitive ? " checked" : "") +
          "> Air-sensitive</label>" +
          '<label class="wdb-os-prefs__row"><input type="checkbox" name="uvSensitive"' +
          (prefs.uvSensitive ? " checked" : "") +
          "> UV-sensitive</label>" +
          '<button type="submit" class="wdb-os__btn">Save</button>' +
          "</form>"
      );
    }
    return panelShell("Detail", "<p>Nothing to show.</p>");
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardOSRender = {
    renderScreen: renderScreen,
    renderPanel: renderPanel,
    escapeHtml: esc
  };
})(window);
