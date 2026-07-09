/**
 * Production outdoor briefing — live date/time, location, trust metadata.
 */
(function (global) {
  "use strict";

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function timezoneFrom(platform, loc) {
    if (platform && platform.timezone) return platform.timezone;
    if (platform && platform.daylight && platform.daylight.timezone) return platform.daylight.timezone;
    if (platform && platform.weatherRef && platform.weatherRef.meta && platform.weatherRef.meta.timezone) {
      return platform.weatherRef.meta.timezone;
    }
    if (loc && loc.timezone) return loc.timezone;
    return null;
  }

  function formatDateTime(now, tz) {
    now = now || new Date();
    var opts = { weekday: "long", month: "long", day: "numeric", year: "numeric" };
    var timeOpts = { hour: "numeric", minute: "2-digit", timeZoneName: "short" };
    if (tz) {
      opts.timeZone = tz;
      timeOpts.timeZone = tz;
    }
    try {
      return {
        dateLine: now.toLocaleDateString(undefined, opts),
        timeLine: now.toLocaleTimeString(undefined, timeOpts)
      };
    } catch (e) {
      return {
        dateLine: now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" }),
        timeLine: now.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
      };
    }
  }

  function formatCoord(val, pos, neg) {
    if (val == null || !isFinite(Number(val))) return "—";
    var n = Number(val);
    return (n >= 0 ? n.toFixed(4) + "°" + pos : Math.abs(n).toFixed(4) + "°" + neg);
  }

  function locationFields(loc) {
    loc = loc || {};
    var city = loc.city || null;
    var county = loc.county || null;
    if (!county && loc.source === "manual" && loc.name) county = loc.name;
    if (!county && loc.nearestIndexedCounty && loc.useNationalFallback) {
      county = loc.nearestIndexedCounty + " (nearest index, " + loc.distanceKm + " km)";
    }
    var state = loc.state || null;
    var stateCode = loc.stateCode || null;
    if (loc.inferredState && !state) state = loc.inferredState.name;
    if (loc.inferredState && !stateCode) stateCode = loc.inferredState.code;
    if (loc.source === "manual" && loc.name && !loc.county) county = loc.name;
    return {
      city: city || "—",
      county: county || "—",
      state: state ? (stateCode ? state + " (" + stateCode + ")" : state) : "—",
      latitude: formatCoord(loc.lat, "N", "S"),
      longitude: formatCoord(loc.lng, "E", "W"),
      elevation: loc.elevationMeters != null
        ? Math.round(loc.elevationMeters) + " m (" + Math.round(loc.elevationMeters * 3.28084) + " ft)"
        : (loc.elevation && loc.elevation.meters != null
          ? loc.elevation.meters + " m (" + loc.elevation.feet + " ft)"
          : "—"),
      elevationTrust: loc.elevation && loc.elevation.trust ? loc.elevation.trust : (loc.elevationMeters != null ? "Live" : "Not yet available"),
      source: loc.source || "unknown",
      geocodeTag: loc.geocodeAt ? "Live" : (loc.source === "geo" ? "Estimated" : "Editorial")
    };
  }

  function metaFoot(platform, kind) {
    var parts = [];
    if (kind === "location" && platform && platform.meta && platform.meta.sources) {
      if (platform.meta.sources.alerts === "nws") parts.push("NWS alerts active");
    }
    return parts.join(" · ");
  }

  function renderDateTimeBlock(dt) {
    return (
      '<div class="wdb-briefing__datetime" data-wdb-live-clock>' +
        '<time class="wdb-briefing__date" datetime="' + escapeHtml(new Date().toISOString().slice(0, 10)) + '">' +
          escapeHtml(dt.dateLine) +
        "</time>" +
        '<p class="wdb-briefing__time">' + escapeHtml(dt.timeLine) + "</p>" +
      "</div>"
    );
  }

  function renderLocationBlock(loc, platform) {
    var f = locationFields(loc);
    var geoMeta = loc && loc.geocodeAt
      ? "OpenStreetMap · Updated " + new Date(loc.geocodeAt).toLocaleString()
      : (loc && loc.source === "geo" ? "Coordinates from browser · city lookup pending" : "County or state selection");
    return (
      '<div class="wdb-briefing__location" id="wds-location-bar" data-location-source="' + escapeHtml(f.source) + '">' +
        '<h2 class="wdb-briefing__location-title">Current location</h2>' +
        '<dl class="wdb-briefing__location-grid">' +
          '<div><dt>City</dt><dd>' + escapeHtml(f.city) + "</dd></div>" +
          '<div><dt>County</dt><dd>' + escapeHtml(f.county) + "</dd></div>" +
          '<div><dt>State</dt><dd>' + escapeHtml(f.state) + "</dd></div>" +
          '<div><dt>Latitude</dt><dd>' + escapeHtml(f.latitude) + "</dd></div>" +
          '<div><dt>Longitude</dt><dd>' + escapeHtml(f.longitude) + "</dd></div>" +
          '<div><dt>Elevation</dt><dd>' + escapeHtml(f.elevation) +
            (f.elevation !== "—" ? ' <span class="wdb-briefing__tag wdb-briefing__tag--' +
              (f.elevationTrust === "Live" ? "live" : "editorial") + '">' + escapeHtml(f.elevationTrust) + "</span>" : "") +
          "</dd></div>" +
        "</dl>" +
        '<p class="wdb-briefing__meta">' +
          '<span class="wdb-briefing__tag wdb-briefing__tag--' + (f.geocodeTag === "Live" ? "live" : "editorial") + '">' +
            escapeHtml(f.geocodeTag) + "</span> · " + escapeHtml(geoMeta) +
        "</p>" +
        '<div class="wdb-briefing__location-actions">' +
          '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" id="wds-loc-retry">Use my location</button>' +
          '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" id="wds-loc-change">Change location</button>' +
        "</div>" +
        '<form class="wce-location-bar__search wds-location-search is-hidden" id="wds-loc-change-form">' +
          '<label class="wds-location-search__label" for="wds-loc-change-input">Search county or state</label>' +
          '<div class="wds-location-search__row">' +
            '<input class="wds-location-search__input" id="wds-loc-change-input" list="wds-loc-change-list" placeholder="County, ST" autocomplete="off">' +
            '<datalist id="wds-loc-change-list"></datalist>' +
            '<button type="submit" class="wds-btn wds-btn--secondary wds-btn--sm">Set</button>' +
          "</div>" +
        "</form>" +
      "</div>"
    );
  }

  function render(loc, platform) {
    var tz = timezoneFrom(platform, loc);
    var dt = formatDateTime(new Date(), tz);
    var UN = global.WDS && global.WDS.usNational;
    var trust = UN && UN.renderTrustBanner ? UN.renderTrustBanner(loc, platform) : "";

    return (
      '<header class="wdb-briefing" aria-label="Outdoor briefing">' +
        renderDateTimeBlock(dt) +
        renderLocationBlock(loc, platform) +
        trust +
        '<div class="wdb-briefing__actions">' +
          '<button type="button" class="wds-btn wds-btn--secondary wds-btn--sm wod__customize" id="wds-dashboard-settings-open">Customize</button>' +
        "</div>" +
      "</header>"
    );
  }

  function updateClock(root, tz) {
    if (!root) return;
    var block = root.querySelector("[data-wdb-live-clock]");
    if (!block) return;
    var dt = formatDateTime(new Date(), tz);
    var dateEl = block.querySelector(".wdb-briefing__date");
    var timeEl = block.querySelector(".wdb-briefing__time");
    if (dateEl) dateEl.textContent = dt.dateLine;
    if (timeEl) timeEl.textContent = dt.timeLine;
  }

  function bind(root, loc, options) {
    options = options || {};
    var tz = timezoneFrom(options.platform, loc);
    updateClock(root, tz);
    if (root._wdbClockTimer) clearInterval(root._wdbClockTimer);
    root._wdbClockTimer = setInterval(function () {
      updateClock(root, tz);
    }, 30000);

    if (global.WDS && global.WDS.location && global.WDS.location.bindBar) {
      global.WDS.location.bindBar(root, options);
    }
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardBriefing = {
    render: render,
    bind: bind,
    formatDateTime: formatDateTime,
    locationFields: locationFields,
    timezoneFrom: timezoneFrom
  };
})(window);
