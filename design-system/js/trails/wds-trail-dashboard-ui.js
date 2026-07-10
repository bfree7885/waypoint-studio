/**
 * Live Trail Conditions dashboard — nearby trails, weather impacts, advisories.
 */
(function (global) {
  "use strict";

  var STATUS_LABELS = {
    clear: "Clear",
    caution: "Caution",
    closed: "Closed",
    unknown: "No feed",
    minimal: "Low",
    low: "Low",
    moderate: "Moderate",
    high: "High"
  };

  var SOURCE_LABELS = {
    live: "Live",
    editorial: "Regional",
    expected: "Inferred",
    educational: "Regional",
    future: "Future feed",
    estimated: "Estimated",
    seasonal: "Seasonal"
  };

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function eduPanel(pending) {
    var EF = global.WDS && global.WDS.educationalFallback;
    return EF ? (pending ? EF.renderPending("trails") : EF.render("trails")) : "";
  }

  function renderLoading() {
    return eduPanel(true) || (
      '<div class="wtrail wtrail--loading" aria-busy="true">' +
        '<p class="wtrail__loading-text">Loading trail conditions…</p>' +
      "</div>"
    );
  }

  function renderError(title, detail) {
    return eduPanel(false) || (
      '<div class="wtrail wtrail--error" role="alert">' +
        '<p class="wtrail__error-title">' + escapeHtml(title) + "</p>" +
        '<p class="wtrail__error-detail">' + escapeHtml(detail || "Trail conditions unavailable.") + "</p>" +
      "</div>"
    );
  }

  function impactChip(chip) {
    if (!chip) return "";
    var cls = "wtrail-chip--" + (chip.status || "minimal");
    return (
      '<span class="wtrail-chip ' + cls + '" title="' + escapeHtml(chip.label) + '">' +
        '<span class="wtrail-chip__label">' + escapeHtml(chip.label) + "</span>" +
        '<span class="wtrail-chip__value">' + escapeHtml(STATUS_LABELS[chip.status] || chip.status) + "</span>" +
      "</span>"
    );
  }

  function trailStat(label, value) {
    if (value == null || value === "") return "";
    return '<span class="wtrail-trail__stat"><span class="wtrail-trail__stat-k">' + escapeHtml(label) +
      '</span> ' + escapeHtml(String(value)) + "</span>";
  }

  function renderTrailCard(trail) {
    if (!trail) return "";
    var stats = [
      trailStat("Dist", trail.distanceMi != null ? trail.distanceMi + " mi" : null),
      trailStat("Length", trail.lengthMi != null ? trail.lengthMi + " mi" : null),
      trailStat("Gain", trail.elevationGainFt != null ? trail.elevationGainFt + " ft" : null),
      trailStat("Time", trail.estimatedTime),
      trailStat("Grade", trail.difficulty),
      trailStat("Surface", trail.surface),
      trailStat("Dogs", trail.dogFriendly),
      trailStat("Bikes", trail.bikeFriendly),
      trailStat("Access", trail.wheelchair)
    ].filter(Boolean).join("");
    return (
      '<article class="wtrail-trail">' +
        '<header class="wtrail-trail__head">' +
          '<h4 class="wtrail-trail__name">' + escapeHtml(trail.name) + "</h4>" +
          (trail.operator ? '<span class="wtrail-trail__operator">' + escapeHtml(trail.operator) + "</span>" : "") +
        "</header>" +
        (stats ? '<div class="wtrail-trail__stats">' + stats + "</div>" : "") +
        (trail.weatherImpacts && trail.weatherImpacts.length
          ? '<div class="wtrail-trail__impacts">' + trail.weatherImpacts.map(impactChip).join("") + "</div>"
          : "") +
        '<footer class="wtrail-trail__foot"><span class="wtrail-trail__source">OpenStreetMap</span></footer>' +
      "</article>"
    );
  }

  function renderLiveSection(live) {
    if (!live) return "";
    var parts = [];

    parts.push(
      '<section class="wtrail-live" aria-label="Live trail conditions">' +
        '<header class="wtrail-live__head">' +
          '<h3 class="wtrail-live__title">Nearby trails</h3>' +
          '<span class="wtrail-live__badge wtrail-live__badge--' + escapeHtml(live.status) + '">' +
            escapeHtml(live.status === "live" ? "Live" : live.status === "empty" ? "None found" : "Unavailable") +
          "</span>" +
        "</header>"
    );

    if (live.trails && live.trails.length) {
      parts.push('<div class="wtrail-trail-list">' + live.trails.map(renderTrailCard).join("") + "</div>");
    } else if (live.status === "empty") {
      parts.push('<p class="wtrail-live__empty">No named trails in OpenStreetMap within ~20 mi. Unnamed paths may still exist.</p>');
    } else if (live.status === "unavailable") {
      parts.push('<p class="wtrail-live__empty">Trail lookup unavailable' +
        (live.trailMeta && live.trailMeta.lastError ? " — " + escapeHtml(live.trailMeta.lastError) : "") +
        ".</p>");
    }

    if (live.weatherImpacts && live.weatherImpacts.length) {
      parts.push(
        '<div class="wtrail-live__block">' +
          '<h4 class="wtrail-live__label">Weather impact</h4>' +
          '<div class="wtrail-chip-row">' + live.weatherImpacts.map(impactChip).join("") + "</div>" +
        "</div>"
      );
    }

    if (live.hikingWindow && live.hikingWindow.status !== "unavailable") {
      parts.push(
        '<div class="wtrail-live__block wtrail-live__block--window">' +
          '<h4 class="wtrail-live__label">Hiking window</h4>' +
          '<p class="wtrail-live__line">' + escapeHtml(live.hikingWindow.summary) + "</p>" +
          (live.hikingWindow.goldenHour
            ? '<p class="wtrail-live__sub">Golden hour · ' + escapeHtml(live.hikingWindow.goldenHour) + "</p>"
            : "") +
        "</div>"
      );
    }

    if (live.crossingWarnings && live.crossingWarnings.length) {
      parts.push(
        '<div class="wtrail-live__block">' +
          '<h4 class="wtrail-live__label">Crossings</h4>' +
          live.crossingWarnings.map(function (w) {
            return '<p class="wtrail-live__alert wtrail-live__alert--' + escapeHtml(w.status) + '">' +
              '<strong>' + escapeHtml(w.headline) + "</strong> · " + escapeHtml(w.detail) + "</p>";
          }).join("") +
        "</div>"
      );
    }

    if (live.closures && live.closures.length) {
      parts.push(
        '<div class="wtrail-live__block">' +
          '<h4 class="wtrail-live__label">Closures &amp; park notices</h4>' +
          live.closures.map(function (n) {
            return '<p class="wtrail-live__alert wtrail-live__alert--' + escapeHtml(n.status) + '">' +
              '<strong>' + escapeHtml(n.headline) + "</strong>" +
              (n.detail ? " · " + escapeHtml(n.detail) : "") +
              (n.agency ? ' <span class="wtrail-live__agency">(' + escapeHtml(n.agency) + ")</span>" : "") +
              "</p>";
          }).join("") +
        "</div>"
      );
    }

    if (live.advisories && live.advisories.length) {
      parts.push(
        '<div class="wtrail-live__block">' +
          '<h4 class="wtrail-live__label">Trail advisories</h4>' +
          live.advisories.map(function (a) {
            return '<p class="wtrail-live__line"><strong>' + escapeHtml(a.headline) + "</strong>" +
              (a.detail ? " · " + escapeHtml(a.detail) : "") + "</p>";
          }).join("") +
        "</div>"
      );
    }

    if (live.photoOps && live.photoOps.length) {
      parts.push(
        '<div class="wtrail-live__block">' +
          '<h4 class="wtrail-live__label">Photo opportunities</h4>' +
          '<div class="wtrail-photo-row">' +
          live.photoOps.map(function (op) {
            return '<span class="wtrail-photo-pill" title="' + escapeHtml(op.detail) + '">' +
              escapeHtml(op.label) + "</span>";
          }).join("") +
          "</div>" +
        "</div>"
      );
    }

    var cached = live.trailMeta && live.trailMeta.cached;
    parts.push(
      '<footer class="wtrail-live__foot">' +
        '<span class="wtrail-live__attr">' + escapeHtml(live.attribution || "OpenStreetMap") +
          (cached ? " · cached" : "") + "</span>" +
        (live.summary ? '<span class="wtrail-live__summary">' + escapeHtml(live.summary) + "</span>" : "") +
      "</footer></section>"
    );

    return parts.join("");
  }

  function opsCard(data) {
    if (!data) return "";
    var statusClass = "wtrail-card--" + (data.status || "unknown");
    var statusLabel = STATUS_LABELS[data.status] || "No feed";
    var sourceLabel = SOURCE_LABELS[data.source] || "Regional";
    return (
      '<article class="wtrail-card ' + statusClass + '" data-trail-card="' + escapeHtml(data.id) + '">' +
        '<header class="wtrail-card__head">' +
          '<span class="wtrail-card__icon" aria-hidden="true">' + escapeHtml(data.icon) + "</span>" +
          '<div class="wtrail-card__titles">' +
            '<h4 class="wtrail-card__label">' + escapeHtml(data.label) + "</h4>" +
            '<span class="wtrail-card__status wtrail-card__status--' + escapeHtml(data.status) + '">' +
              escapeHtml(statusLabel) + "</span>" +
          "</div>" +
        "</header>" +
        '<p class="wtrail-card__headline">' + escapeHtml(data.headline) + "</p>" +
        (data.detail ? '<p class="wtrail-card__detail">' + escapeHtml(data.detail) + "</p>" : "") +
        '<footer class="wtrail-card__foot">' +
          '<span class="wtrail-card__source">' + escapeHtml(sourceLabel) + "</span>" +
        "</footer>" +
      "</article>"
    );
  }

  function opsBanner(intel) {
    var status = intel.overallStatus || "unknown";
    var label = STATUS_LABELS[status] || "No feed";
    return (
      '<div class="wtrail__ops-bar wtrail__ops-bar--' + escapeHtml(status) + '" role="status">' +
        '<span class="wtrail__ops-label">Regional ops</span>' +
        '<span class="wtrail__ops-status">' + escapeHtml(label) + "</span>" +
        '<span class="wtrail__ops-note">' +
          escapeHtml(
            intel.hasLiveTrails
              ? "Live trails + " + (intel.hasLiveWeather ? "weather" : "regional") + " context"
              : intel.hasLiveWeather
                ? "Live weather · regional trail notes"
                : "Regional editorial context"
          ) +
        "</span>" +
      "</div>"
    );
  }

  function render(intel) {
    if (!intel) {
      return renderError("Trail conditions unavailable", "Set your location to load nearby trails.");
    }
    var compactOps = [
      intel.cards.trailConditions,
      intel.cards.mudPotential,
      intel.cards.recentRainImpact,
      intel.cards.trailClosures
    ].filter(Boolean);
    return (
      '<div class="wtrail" data-trail-live="' + (intel.hasLiveTrails ? "trails" : intel.hasLiveWeather ? "weather" : "regional") + '">' +
        renderLiveSection(intel.live) +
        opsBanner(intel) +
        '<div class="wtrail__grid wtrail__grid--compact">' +
          compactOps.map(opsCard).join("") +
        "</div>" +
        '<footer class="wtrail__foot">' +
          '<p class="wtrail__attribution">' +
            escapeHtml("Verify trail status with managing agencies before you go") +
            (intel.regionLabel ? " · " + intel.regionLabel : "") +
          "</p>" +
        "</footer>" +
      "</div>"
    );
  }

  function coordsFromPlatform(platform) {
    if (!platform) return null;
    var loc = platform.location || {};
    var lat = loc.lat != null ? Number(loc.lat) : Number(loc.latitude);
    var lng = loc.lng != null ? Number(loc.lng) : Number(loc.longitude);
    if (!isFinite(lat) || !isFinite(lng)) {
      var LS = global.WDS && global.WDS.location && global.WDS.location.getState
        ? global.WDS.location.getState() : null;
      if (LS && isFinite(Number(LS.lat)) && isFinite(Number(LS.lng))) {
        return { lat: Number(LS.lat), lng: Number(LS.lng) };
      }
      return null;
    }
    return { lat: lat, lng: lng };
  }

  function needsTrailRefetch(platform) {
    var tc = platform && platform.trailConditions;
    if (tc && (tc.status === "live" || tc.status === "empty")) return false;
    return !!coordsFromPlatform(platform);
  }

  function refetchTrailsIfNeeded(platform, onReady) {
    if (!needsTrailRefetch(platform)) return;
    var TC = global.WDS && global.WDS.trailConditions;
    var coords = coordsFromPlatform(platform);
    if (!TC || !TC.fetchNearby || !coords) return;
    TC.fetchNearby(coords).then(function (trailPkg) {
      if (!trailPkg || (trailPkg.status !== "live" && trailPkg.status !== "empty")) return;
      onReady(Object.assign({}, platform, { trailConditions: trailPkg }));
    }).catch(function () { /* independent module */ });
  }

  function mount(el, options) {
    if (!el) return Promise.resolve(null);
    options = options || {};
    var Intel = global.WDS && global.WDS.trailDashboardIntel;
    var WUI = global.WDS && global.WDS.weatherUI;
    var root = options.root || el.closest("#main") || document;
    var widgetId = el.closest("[data-widget-id]") &&
      el.closest("[data-widget-id]").getAttribute("data-widget-id");

    function finish(platform) {
      var intel = Intel && Intel.analyze ? Intel.analyze(platform) : null;
      if (!intel) {
        el.innerHTML = renderError("Trail conditions unavailable");
        el.removeAttribute("aria-busy");
        if (WUI && widgetId) WUI.updateDashCardTag(root, widgetId, "educational");
        return null;
      }
      el.innerHTML = render(intel);
      el.removeAttribute("aria-busy");
      if (WUI && widgetId) {
        var tag = intel.hasLiveTrails ? "live" : (intel.hasLiveWeather ? "estimated" : "educational");
        WUI.updateDashCardTag(root, widgetId, tag);
        var sum = Intel.summary ? Intel.summary(intel) : null;
        if (sum) WUI.updateWidgetSummary(root, widgetId, sum);
      }
      refetchTrailsIfNeeded(platform, finish);
      return intel;
    }

    var platform = options.platform;
    if (platform) {
      return Promise.resolve(finish(platform));
    }

    el.setAttribute("aria-busy", "true");
    el.innerHTML = renderLoading();
    if (WUI && widgetId) WUI.updateDashCardTag(root, widgetId, "loading");

    var OIP = global.WDS && global.WDS.outdoorIntelligence;
    if (!OIP || !OIP.get) {
      el.innerHTML = renderError("Location required", "Outdoor intelligence unavailable.");
      el.removeAttribute("aria-busy");
      if (WUI && widgetId) WUI.updateDashCardTag(root, widgetId, "educational");
      return Promise.resolve(null);
    }

    return OIP.get({
      location: options.location,
      contentEngineBase: options.base || "design-system/content-engine/",
      includeWeather: true
    }).then(finish).catch(function () {
      el.innerHTML = renderError("Trail conditions unavailable");
      el.removeAttribute("aria-busy");
      if (WUI && widgetId) WUI.updateDashCardTag(root, widgetId, "educational");
      return null;
    });
  }

  function mountAll(root, options) {
    if (!root) return Promise.resolve([]);
    options = options || {};
    var nodes = root.querySelectorAll('[data-wds-weather-mount="trail-dashboard"]');
    var jobs = [];
    for (var i = 0; i < nodes.length; i += 1) {
      jobs.push(mount(nodes[i], options));
    }
    return Promise.all(jobs);
  }

  global.WDS = global.WDS || {};
  global.WDS.trailDashboardUI = {
    render: render,
    renderLoading: renderLoading,
    mount: mount,
    mountAll: mountAll
  };
})(window);
