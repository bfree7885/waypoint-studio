/**
 * Unified outdoor briefing — presentation layer for Outdoor Intelligence Engine v1.
 * compose() delegates to WDS.outdoorIntelligenceEngine; render() is UI only.
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

  function compose(ctx) {
    ctx = ctx || {};
    var OIE = global.WDS && global.WDS.outdoorIntelligenceEngine;
    if (OIE && OIE.build && OIE.toLegacyCompose) {
      var briefing = OIE.build(ctx);
      var EB = global.WDS && global.WDS.ecosystemBridge;
      if (EB && EB.saveFromBriefing) {
        try { EB.saveFromBriefing(briefing, ctx.location); } catch (e) { /* noop */ }
      } else if (EB && EB.save && ctx.platform) {
        try { EB.save(ctx.platform, ctx.location); } catch (e) { /* noop */ }
      }
      var legacy = OIE.toLegacyCompose(briefing);
      legacy._briefing = briefing;
      return legacy;
    }
    return {
      hasLive: false,
      headline: "Outdoor briefing",
      narrative: ["Outdoor Intelligence Engine loading — refresh if this persists."],
      notices: [],
      evidence: [],
      missions: [],
      todayInNature: [],
      photoFieldGuide: [],
      provenance: { sources: ["Waypoint"], updatedAt: null }
    };
  }

  function renderNotice(n) {
    var fields = [];
    if (n.what) fields.push('<p class="wdb-doc__what"><strong>What:</strong> ' + escapeHtml(n.what) + "</p>");
    if (n.why) fields.push('<p class="wdb-doc__why"><strong>Why:</strong> ' + escapeHtml(n.why) + "</p>");
    if (n.matters) fields.push('<p class="wdb-doc__matters"><strong>Why it matters:</strong> ' + escapeHtml(n.matters) + "</p>");
    if (n.doAction) fields.push('<p class="wdb-doc__do"><strong>What to do:</strong> ' + escapeHtml(n.doAction) + "</p>");
    if (n.watch) fields.push('<p class="wdb-doc__watch"><strong>What to notice:</strong> ' + escapeHtml(n.watch) + "</p>");
    return (
      '<article class="wdb-doc__notice wdb-doc__notice--' + escapeHtml((n.trust || "Unavailable").toLowerCase().replace(/\s+/g, "-")) + '">' +
        '<header class="wdb-doc__notice-head">' +
          '<span class="wdb-doc__domain">' + escapeHtml(n.domain) + "</span>" +
          '<span class="wdb-doc__trust">' + escapeHtml(n.trust || "Unavailable") + "</span>" +
        "</header>" +
        fields.join("") +
        (n.source ? '<p class="wdb-doc__notice-meta">Source: ' + escapeHtml(n.source) + "</p>" : "") +
      "</article>"
    );
  }

  function render(ctx) {
    var doc = compose(ctx);
    var dateLine = doc.brief && doc.brief.dateLine
      ? doc.brief.dateLine
      : new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

    var MB = global.WDS && global.WDS.morningBriefing;
    var morningHtml = "";
    if (doc.morningAnswers && MB && MB.renderMorningHero) {
      morningHtml = MB.renderMorningHero(doc.morningAnswers, doc.headline, dateLine);
    }

    var narrativeHtml = (doc.narrative || []).map(function (p) {
      return "<p class=\"wdb-doc__para\">" + escapeHtml(p) + "</p>";
    }).join("");

    var noticesHtml = (doc.notices || []).map(renderNotice).join("");

    var evidenceHtml = doc.evidence && doc.evidence.length
      ? '<ul class="wdb-doc__evidence">' + doc.evidence.map(function (e) {
          return "<li>" + escapeHtml(e) + "</li>";
        }).join("") + "</ul>"
      : "";

    var updatedIso = doc.provenance && doc.provenance.updatedAt;
    var updated = updatedIso
      ? new Date(updatedIso).toLocaleString()
      : "—";
    var liveMeta = ctx && ctx.platform && ctx.platform.meta;
    if (liveMeta && (liveMeta.liveUpdatedAt || (liveMeta.liveFeed && liveMeta.hydratedAt))) {
      updatedIso = liveMeta.liveUpdatedAt || liveMeta.hydratedAt;
      try { updated = new Date(updatedIso).toLocaleString(); } catch (e) { /* keep */ }
    }

    var detailsHtml = noticesHtml
      ? '<div class="wdb-doc__notices" aria-label="Operational outdoor blocks">' + noticesHtml + "</div>"
      : '<div class="wdb-doc__notices" aria-label="Operational outdoor blocks">' +
          '<article class="wdb-doc__notice wdb-doc__notice--unavailable">' +
            '<header class="wdb-doc__notice-head"><span class="wdb-doc__domain">readiness</span><span class="wdb-doc__trust">Unavailable</span></header>' +
            '<p class="wdb-doc__what"><strong>What:</strong> Data currently unavailable</p>' +
          "</article></div>";

    return (
      '<section class="wdb-doc wdb-doc--' + escapeHtml(doc.verdict || "caution") + '" aria-label="Outdoor briefing for ' + escapeHtml(dateLine) + '">' +
        morningHtml +
        (narrativeHtml || evidenceHtml
          ? '<div class="wdb-doc__synthesis">' + narrativeHtml + evidenceHtml + "</div>"
          : "") +
        detailsHtml +
        '<footer class="wdb-doc__foot">' +
          '<p>Sources: ' + escapeHtml((doc.provenance && doc.provenance.sources || []).join(" · ")) +
            ' · <span class="wdb-doc__last-updated">Last updated <time datetime="' + escapeHtml(updatedIso || "") + '">' + escapeHtml(updated) + "</time></span></p>" +
        "</footer>" +
      "</section>"
    );
  }

  function widgetStory(ctx) {
    var doc = compose(ctx);
    var notices = doc.notices || [];
    var trust = doc.hasLive ? "Estimated" : "Unavailable";
    return {
      status: notices.length ? "ready" : "unavailable",
      tag: { label: trust, className: "wdb-widget__tag--" + trust.toLowerCase() },
      summary: doc.headline || (doc.hasLive ? "Outdoor readiness" : "Data currently unavailable"),
      body: (doc.narrative || []).join(" ") || "Data currently unavailable",
      items: notices.slice(0, 6).map(function (n) { return n.domain + ": " + (n.text || n.what); }),
      metaFooter: "OIE · " + (doc.provenance && doc.provenance.sources || []).join(" · ")
    };
  }

  function widgetHighlights(ctx) {
    var doc = compose(ctx);
    var items = (doc.notices || []).map(function (n) {
      return { text: n.domain + " — " + n.text, kind: n.trust === "Live" ? "observation" : "interpretation" };
    });
    if (doc.evidence && doc.evidence.length) {
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

  function replaceInRoot(root, ctx) {
    var scope = root && root.querySelector ? root : document;
    var el = scope.querySelector(".wdb-doc");
    if (!el) return false;
    var html = render(ctx);
    var wrap = document.createElement("div");
    wrap.innerHTML = html;
    var next = wrap.firstElementChild;
    if (next) el.replaceWith(next);
    return !!next;
  }

  function resolveContext(ctx) {
    ctx = ctx || {};
    if (!ctx.platform) {
      var OIP = global.WDS && global.WDS.outdoorIntelligence;
      ctx.platform = OIP && OIP.getLast ? OIP.getLast() : null;
    }
    if (!ctx.location && global.WDS && global.WDS.location && global.WDS.location.getState) {
      ctx.location = global.WDS.location.getState();
    }
    return ctx;
  }

  function refresh(root, ctx) {
    return replaceInRoot(root, resolveContext(ctx));
  }

  function bind(root, ctx) {
    if (!bind._wired && global.document) {
      bind._wired = true;
      global.document.addEventListener("wds:outdoor-intelligence-change", function (e) {
        var loc = global.WDS && global.WDS.location && global.WDS.location.getState
          ? global.WDS.location.getState()
          : null;
        var mount = document.querySelector("[data-wds-dashboard-root]");
        replaceInRoot(mount && mount.closest("#main") || document, {
          platform: e.detail,
          location: loc
        });
      });
    }
    refresh(root, ctx);
  }

  global.WDS = global.WDS || {};
  global.WDS.briefingPackage = {
    compose: compose,
    render: render,
    refresh: refresh,
    bind: bind,
    widgetStory: widgetStory,
    widgetHighlights: widgetHighlights
  };
})(window);
