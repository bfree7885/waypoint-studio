/**
 * Unified outdoor briefing — single composed narrative from OIP slices.
 * Powers the cohesive briefing document and deduplicates story/highlights.
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

  function num(val) {
    if (val == null) return null;
    if (typeof val === "number" && isFinite(val)) return val;
    if (typeof val === "object" && val.value != null) return num(val.value);
    return null;
  }

  function isNational(platform) {
    return !!(platform && platform.meta && platform.meta.contentMode === "national-educational");
  }

  function domainIntel(platform) {
    var out = { trails: null, water: null, wildlife: null, safety: null };
    var T = global.WDS && global.WDS.trailDashboardIntel;
    var W = global.WDS && global.WDS.waterDashboardIntel;
    var Wi = global.WDS && global.WDS.wildlifeDashboardIntel;
    var S = global.WDS && global.WDS.safetyDashboardIntel;
    if (T && T.analyze) {
      var ti = T.analyze(platform);
      out.trails = { intel: ti, summary: T.summary ? T.summary(ti) : null };
    }
    if (W && W.analyze) {
      var wi = W.analyze(platform);
      out.water = { intel: wi, summary: W.summary ? W.summary(wi) : null };
    }
    if (Wi && Wi.analyze) {
      var wli = Wi.analyze(platform);
      out.wildlife = { intel: wli, summary: Wi.summary ? Wi.summary(wli) : null };
    }
    if (S && S.analyze) {
      var si = S.analyze(platform);
      out.safety = { intel: si, summary: S.summary ? S.summary(si) : null };
    }
    return out;
  }

  function compose(ctx) {
    ctx = ctx || {};
    var platform = ctx.platform || {};
    var wx = platform.weatherRef;
    var hasLive = !!(wx && wx.meta && !wx.meta.isPlaceholder);
    var national = isNational(platform);
    var domains = domainIntel(platform);
    var OW = global.WDS && global.WDS.outdoorWeatherIntel;
    var intel = hasLive && OW && OW.analyze ? OW.analyze(wx, platform) : null;
    var scores = hasLive && OW && OW.scorecard ? OW.scorecard(wx, platform) : null;

    var Brief = global.WDS && global.WDS.dashboardBrief;
    var brief = Brief && Brief.build ? Brief.build(ctx) : null;

    var narrative = [];
    var notices = [];
    var evidence = [];

    if (!hasLive) {
      return {
        hasLive: false,
        headline: "Outdoor briefing",
        narrative: ["Set your location to load a live outdoor briefing for your coordinates."],
        notices: [{
          domain: "Location",
          text: "City, weather, sun/moon, and safety data require coordinates or a county selection.",
          trust: "Educational"
        }],
        evidence: [],
        brief: brief,
        intel: intel,
        scores: scores,
        domains: domains,
        provenance: { sources: ["Waypoint"], updatedAt: null }
      };
    }

    if (brief) {
      narrative.push(brief.verdictDetail || brief.verdictLabel);
    }
    if (intel && intel.recommendation && intel.recommendation.headline) {
      narrative.push(intel.recommendation.headline + ". " + (intel.recommendation.detail || ""));
    }

    var cur = wx.current || {};
    var temp = num(cur.temperature);
    var cond = (cur.conditions && cur.conditions.summary) || "";
    if (temp != null) evidence.push(Math.round(temp) + "° · " + cond);

    var dl = platform.daylight;
    if (dl && dl.goldenHour) evidence.push("Golden hour: " + dl.goldenHour);

    if (platform.airQuality && platform.airQuality.usAqi != null) {
      evidence.push("US AQI " + platform.airQuality.usAqi);
      notices.push({
        domain: "Air quality",
        text: "US AQI " + platform.airQuality.usAqi + " — " + (platform.airQuality.category || "check sensitive groups"),
        trust: "Live",
        source: "Open-Meteo Air Quality"
      });
    }

    if (platform.alerts && platform.alerts.items && platform.alerts.items.length) {
      notices.push({
        domain: "Safety",
        text: platform.alerts.items.length + " NWS alert(s) active — verify at weather.gov",
        trust: "Live",
        source: "NWS"
      });
    }

    if (intel && intel.photography) {
      notices.push({
        domain: "Photography",
        text: intel.photography.summary + (intel.photography.detail ? " — " + intel.photography.detail : ""),
        trust: "Estimated",
        source: "Open-Meteo + derived light"
      });
    }

    if (intel && intel.hiking) {
      notices.push({
        domain: "Hiking",
        text: intel.hiking.summary + (intel.hiking.detail ? " — " + intel.hiking.detail : ""),
        trust: "Estimated",
        source: "Open-Meteo"
      });
    }

    var usgs = platform.usgsWater;
    if (usgs && usgs.nearest) {
      var US = global.WDS && global.WDS.usgsWater;
      var fg = US && US.formatGauge ? US.formatGauge(usgs) : null;
      if (fg) {
        notices.push({
          domain: "Water",
          text: fg.headline + " — " + fg.detail,
          trust: "Live",
          source: "USGS IV (provisional)"
        });
      }
    } else if (domains.water && domains.water.summary) {
      notices.push({
        domain: "Water",
        text: domains.water.summary,
        trust: national ? "Educational" : "Editorial",
        source: national ? "U.S. educational hydrology" : "Regional bundle"
      });
    }

    if (domains.trails && domains.trails.summary) {
      notices.push({
        domain: "Trails",
        text: domains.trails.summary,
        trust: "Estimated",
        source: "Open-Meteo + regional notes"
      });
    } else {
      notices.push({
        domain: "Trails",
        text: national
          ? "Trail agency feeds not connected — check official park and forest service sites before you go."
          : "Trail conditions use weather inference — verify mud and closures locally.",
        trust: "Not yet available",
        source: "Recreation.gov / NPS (pending)"
      });
    }

    if (domains.wildlife && domains.wildlife.summary) {
      notices.push({
        domain: "Wildlife",
        text: domains.wildlife.summary,
        trust: national ? "Educational" : "Editorial",
        source: national ? "Climate-season guidance" : "Regional species bundle"
      });
    } else {
      notices.push({
        domain: "Wildlife",
        text: "Wildlife activity follows season and weather — eBird live feed not connected for this location.",
        trust: "Educational",
        source: "Waypoint environmental education"
      });
    }

    if (!national) {
      var species = (platform.species && platform.species.active) || [];
      if (species[0] && species[0].name) {
        notices.push({
          domain: "Ecology",
          text: "Watch for " + species[0].name + (species[0].note ? " — " + species[0].note : ""),
          trust: "Editorial",
          source: "Local field bundle"
        });
      }
    } else {
      var UN = global.WDS && global.WDS.usNational;
      if (UN && UN.weatherInterpretation && wx) {
        notices.push({
          domain: "Ecology",
          text: UN.weatherInterpretation(wx),
          trust: "Educational",
          source: "Waypoint U.S. educational"
        });
      }
    }

    var Challenge = global.WDS && global.WDS.dashboardChallenge;
    var Learn = global.WDS && global.WDS.dashboardLearn;
    var challenge = Challenge && Challenge.pickForConditions
      ? Challenge.pickForConditions(ctx, intel)
      : (Challenge && Challenge.generate ? Challenge.generate(ctx) : null);
    var learn = Learn && Learn.generate ? Learn.generate(ctx) : null;

    var sources = ["Open-Meteo"];
    if (platform.alerts && platform.alerts.items && platform.alerts.items.length) sources.push("NWS");
    if (platform.airQuality && platform.airQuality.status === "live") sources.push("Open-Meteo AQI");
    if (usgs && usgs.nearest) sources.push("USGS");

    return {
      hasLive: true,
      headline: brief ? brief.verdictLabel : "Outdoor briefing",
      verdict: brief ? brief.verdict : "caution",
      narrative: narrative,
      notices: notices,
      evidence: evidence,
      brief: brief,
      intel: intel,
      scores: scores,
      domains: domains,
      challenge: challenge,
      learn: learn,
      provenance: {
        sources: sources,
        updatedAt: wx.meta && wx.meta.fetchedAt ? wx.meta.fetchedAt : new Date().toISOString()
      }
    };
  }

  function renderNotice(n) {
    return (
      '<div class="wdb-doc__notice wdb-doc__notice--' + escapeHtml((n.trust || "educational").toLowerCase().replace(/\s+/g, "-")) + '">' +
        '<span class="wdb-doc__domain">' + escapeHtml(n.domain) + "</span>" +
        '<p class="wdb-doc__notice-text">' + escapeHtml(n.text) + "</p>" +
        '<p class="wdb-doc__notice-meta">' +
          '<span class="wdb-doc__trust">' + escapeHtml(n.trust || "Educational") + "</span>" +
          (n.source ? " · " + escapeHtml(n.source) : "") +
        "</p>" +
      "</div>"
    );
  }

  function render(ctx) {
    var doc = compose(ctx);
    var dateLine = doc.brief && doc.brief.dateLine
      ? doc.brief.dateLine
      : new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

    var narrativeHtml = doc.narrative.map(function (p) {
      return "<p class=\"wdb-doc__para\">" + escapeHtml(p) + "</p>";
    }).join("");

    var noticesHtml = doc.notices.map(renderNotice).join("");

    var actionHtml = "";
    if (doc.challenge || doc.learn) {
      actionHtml = '<div class="wdb-doc__actions">' +
        (doc.challenge
          ? '<div class="wdb-doc__action"><h3 class="wdb-doc__action-title">Today\'s challenge</h3>' +
              '<p class="wdb-doc__action-type">' + escapeHtml(doc.challenge.summary || "") + "</p>" +
              '<p class="wdb-doc__action-body">' + escapeHtml(doc.challenge.body || "") + "</p>" +
              (doc.challenge.items && doc.challenge.items[0]
                ? '<p class="wdb-doc__action-why">' + escapeHtml(doc.challenge.items[0]) + "</p>"
                : "") +
            "</div>"
          : "") +
        (doc.learn
          ? '<div class="wdb-doc__action"><h3 class="wdb-doc__action-title">Learn today</h3>' +
              '<p class="wdb-doc__action-type">' + escapeHtml(doc.learn.summary || "") + "</p>" +
              '<p class="wdb-doc__action-body">' + escapeHtml(doc.learn.body || "") + "</p>" +
            "</div>"
          : "") +
      "</div>";
    }

    var evidenceHtml = doc.evidence.length
      ? '<ul class="wdb-doc__evidence">' + doc.evidence.map(function (e) {
          return "<li>" + escapeHtml(e) + "</li>";
        }).join("") + "</ul>"
      : "";

    var updated = doc.provenance.updatedAt
      ? new Date(doc.provenance.updatedAt).toLocaleString()
      : "—";

    return (
      '<section class="wdb-doc wdb-doc--' + escapeHtml(doc.verdict || "caution") + '" aria-label="Outdoor briefing for ' + escapeHtml(dateLine) + '">' +
        '<header class="wdb-doc__head">' +
          '<h2 class="wdb-doc__title">' + escapeHtml(doc.headline) + "</h2>" +
          '<p class="wdb-doc__date">' + escapeHtml(dateLine) + "</p>" +
        "</header>" +
        '<div class="wdb-doc__narrative">' + narrativeHtml + "</div>" +
        evidenceHtml +
        '<div class="wdb-doc__notices" aria-label="Domain guidance">' + noticesHtml + "</div>" +
        actionHtml +
        '<footer class="wdb-doc__foot">' +
          '<p>Sources: ' + escapeHtml(doc.provenance.sources.join(" · ")) + " · Updated " + escapeHtml(updated) + "</p>" +
        "</footer>" +
      "</section>"
    );
  }

  function widgetStory(ctx) {
    var doc = compose(ctx);
    if (!doc.hasLive) {
      return global.WDS.dashboardStory && global.WDS.dashboardStory.generate
        ? global.WDS.dashboardStory.generate(ctx)
        : { status: "empty", summary: "Briefing pending" };
    }
    return {
      status: "ready",
      tag: { label: "Estimated", className: "wdb-widget__tag--estimated" },
      summary: doc.headline,
      body: doc.narrative.join(" "),
      items: doc.notices.slice(0, 4).map(function (n) { return n.domain + ": " + n.text; }),
      metaFooter: "Unified briefing · " + doc.provenance.sources.join(" · ")
    };
  }

  function widgetHighlights(ctx) {
    var doc = compose(ctx);
    var items = doc.notices.map(function (n) {
      return { text: n.domain + " — " + n.text, kind: n.trust === "Live" ? "observation" : "interpretation" };
    });
    if (doc.evidence.length) {
      items.unshift({ text: doc.evidence.join(" · "), kind: "forecast" });
    }
    var dateLabel = new Date().toLocaleDateString(undefined, {
      weekday: "long", month: "long", day: "numeric", year: "numeric"
    });
    return {
      status: items.length ? "ready" : "empty",
      tag: { label: "Estimated", className: "wdb-widget__tag--estimated" },
      summary: items.length + " field cues for " + dateLabel,
      items: items
    };
  }

  global.WDS = global.WDS || {};
  global.WDS.briefingPackage = {
    compose: compose,
    render: render,
    widgetStory: widgetStory,
    widgetHighlights: widgetHighlights
  };
})(window);
