/**
 * Waypoint Content Engine
 * Regional field-guide content renderer — no APIs, no feeds, private by default.
 *
 * WDS.contentEngine.init({ region: 'pike-county-pa', mount: '#wds-content-engine', base: 'design-system/content-engine/' });
 */
(function (global) {
  "use strict";

  var engineBase = "content-engine/";
  var bundleCache = {};

  var SECTION_ORDER = [
    "this-week-outdoors",
    "regional-field-notes",
    "seasonal-watch",
    "species-spotlight",
    "teachers-notebook",
    "research-brief",
    "featured-video",
    "photo-essay",
    "weekend-field-investigation",
    "conservation-update"
  ];

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function resolveEngineBase(options) {
    if (options && options.base) return options.base.replace(/\/?$/, "/");
    return engineBase;
  }

  function fetchJson(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error("WDS.contentEngine: failed to load " + url);
      return res.json();
    });
  }

  function blockHead(eyebrow, title, lead) {
    return (
      '<div class="ws-block__head">' +
        (eyebrow ? '<p class="ws-block__eyebrow">' + escapeHtml(eyebrow) + "</p>" : "") +
        '<h2 class="ws-block__title">' + escapeHtml(title) + "</h2>" +
        (lead ? '<p class="ws-block__lead">' + escapeHtml(lead) + "</p>" : "") +
      "</div>"
    );
  }

  function mediaSlot(label, hint) {
    return (
      '<div class="ws-media-slot" role="img" aria-label="' + escapeHtml(label) + '">' +
        '<span class="ws-media-slot__label">' + escapeHtml(label) + "</span>" +
        (hint ? '<p class="ws-media-slot__hint">' + escapeHtml(hint) + "</p>" : "") +
      "</div>"
    );
  }

  function renderMeta(item) {
    if (!item) return "";
    var parts = [];
    if (item.outdoorChallenge) parts.push("<p><strong>Outdoor:</strong> " + escapeHtml(item.outdoorChallenge) + "</p>");
    if (item.citizenScience) parts.push("<p><strong>Citizen science (optional):</strong> " + escapeHtml(item.citizenScience) + "</p>");
    if (item.subscriptionValue) parts.push("<p><strong>Subscribers:</strong> " + escapeHtml(item.subscriptionValue) + "</p>");
    if (!parts.length) return "";
    return '<div class="wce-meta">' + parts.join("") + "</div>";
  }

  function renderRegionTag(region, weekOf, season) {
    return (
      '<span class="wce-region-tag">' + escapeHtml(region.name) + ", " + escapeHtml(region.state) +
      " · Week of " + escapeHtml(weekOf) + " · " + escapeHtml(season) + "</span>"
    );
  }

  function renderThisWeekOutdoors(data) {
    var w = data.thisWeekOutdoors;
    if (!w) return "";
    var blocks = (w.blocks || []).map(function (b) {
      return (
        '<div class="wce-week-block">' +
          '<p class="wce-week-block__label">' + escapeHtml(b.label) + "</p>" +
          '<p class="wce-week-block__text">' + escapeHtml(b.text) + "</p>" +
        "</div>"
      );
    }).join("");
    return (
      '<section class="ws-block" id="this-week-outdoors" aria-labelledby="wce-two-title">' +
        renderRegionTag(data.region, data.weekOf, data.season) +
        blockHead("Start here", "This week outdoors", "Learn during the week. Test what you learned outside on the weekend.") +
        '<article class="wce-week-banner">' +
          '<h3 class="wce-week-banner__title" id="wce-two-title">' + escapeHtml(w.title) + "</h3>" +
          '<p class="wce-week-banner__summary">' + escapeHtml(w.summary) + "</p>" +
          mediaSlot("Hero photograph · placeholder", w.photography && w.photography.caption) +
          '<div class="wce-week-grid">' + blocks + "</div>" +
          '<div class="wce-week-split">' +
            '<div><p class="wce-week-split__label">Weekdays · learn</p><p class="wce-week-split__text">' + escapeHtml(w.weekdayFocus) + "</p></div>" +
            '<div><p class="wce-week-split__label">Weekend · go</p><p class="wce-week-split__text">' + escapeHtml(w.weekendPrompt) + "</p></div>" +
          "</div>" +
          renderMeta(w) +
        "</article>" +
      "</section>"
    );
  }

  function renderRegionalFieldNotes(data) {
    var notes = data.regionalFieldNotes || [];
    if (!notes.length) return "";
    var list = notes.map(function (n) {
      return (
        '<article class="wce-field-note">' +
          '<div class="wce-field-note__meta">' +
            "<time>" + escapeHtml(n.date) + "</time>" +
            '<span class="wce-scope">' + escapeHtml(n.scope) + "</span>" +
          "</div>" +
          '<h3 class="wce-field-note__title">' + escapeHtml(n.title) + "</h3>" +
          '<p class="wce-field-note__body">' + escapeHtml(n.body) + "</p>" +
          (n.tryThis ? '<p class="wce-field-note__try">Try this: ' + escapeHtml(n.tryThis) + "</p>" : "") +
        "</article>"
      );
    }).join("");
    return (
      '<section class="ws-block" id="regional-field-notes" aria-labelledby="wce-rfn-title">' +
        blockHead("News", "Regional field notes", "Trail, weather, wildlife, and phenology — ranger bulletin style. Not a feed.") +
        '<div class="wce-field-notes">' + list + "</div>" +
      "</section>"
    );
  }

  function renderSeasonalWatch(data) {
    var sw = data.seasonalWatch;
    if (!sw) return "";
    var items = (sw.items || []).map(function (it) {
      return (
        '<div class="wce-seasonal-item">' +
          '<p class="wce-seasonal-item__name">' + escapeHtml(it.name) + "</p>" +
          '<span class="wce-seasonal-item__status">' + escapeHtml((it.status || "").replace(/-/g, " ")) + "</span>" +
          '<p class="wce-seasonal-item__note">' + escapeHtml(it.note) + "</p>" +
        "</div>"
      );
    }).join("");
    return (
      '<section class="ws-block" id="seasonal-watch" aria-labelledby="wce-sw-title">' +
        blockHead("Phenology", "Seasonal watch", escapeHtml(sw.title)) +
        '<div class="wce-seasonal-grid">' + items + "</div>" +
        renderMeta(sw) +
      "</section>"
    );
  }

  function renderWeekendInvestigation(data) {
    var inv = data.weekendFieldInvestigation;
    if (!inv) return "";
    var steps = (inv.steps || []).map(function (s) { return "<li>" + escapeHtml(s) + "</li>"; }).join("");
    return (
      '<section class="ws-block" id="weekend-field-investigation" aria-labelledby="wce-wfi-title">' +
        blockHead("Weekend", "Field investigation", "The capstone — take what you learned and test it outside.") +
        '<article class="wce-investigation">' +
          '<p class="wds-eyebrow">' + escapeHtml(inv.when) + " · " + escapeHtml(inv.duration) + "</p>" +
          '<h3 class="wds-display-md" id="wce-wfi-title" style="margin:0 0 var(--wds-space-2);">' + escapeHtml(inv.title) + "</h3>" +
          '<p class="wce-investigation__question">' + escapeHtml(inv.drivingQuestion) + "</p>" +
          '<div class="wce-investigation__meta">' +
            "<span>Place: " + escapeHtml(inv.place) + "</span>" +
            "<span>Materials: " + escapeHtml((inv.materials || []).join(", ")) + "</span>" +
          "</div>" +
          '<ol class="wce-investigation__steps">' + steps + "</ol>" +
          renderMeta(inv) +
        "</article>" +
      "</section>"
    );
  }

  function renderResearchBrief(data) {
    var rb = data.researchBrief;
    if (!rb) return "";
    return (
      '<section class="ws-block" id="research-brief" aria-labelledby="wce-rb-title">' +
        blockHead("Research", "Research brief", "Plain language — with a local application paragraph.") +
        '<article class="ws-research-card">' +
          '<span class="wce-scope">' + escapeHtml(rb.scope) + "</span>" +
          '<h3 class="wds-display-md" id="wce-rb-title" style="margin:var(--wds-space-2) 0;">' + escapeHtml(rb.title) + "</h3>" +
          '<p class="wds-body">' + escapeHtml(rb.summary) + "</p>" +
          '<p class="wds-body" style="margin-top:var(--wds-space-3);"><strong>Local:</strong> ' + escapeHtml(rb.localApplication) + "</p>" +
          (rb.source ? '<p class="ws-research-card__source">' + escapeHtml(rb.source) + "</p>" : "") +
          renderMeta(rb) +
        "</article>" +
      "</section>"
    );
  }

  function renderFeaturedVideo(data) {
    var v = data.featuredVideo;
    if (!v) return "";
    return (
      '<section class="ws-block" id="featured-video" aria-labelledby="wce-vid-title">' +
        blockHead("Videos", "Featured video", "Click to play — never autoplay.") +
        '<div class="ws-video-feature">' +
          '<div class="ws-video-feature__thumb" role="img" aria-label="Video placeholder">' +
            '<span class="ws-video-feature__play" aria-hidden="true">▶</span>' +
            '<span class="ws-media-slot__label">' + escapeHtml(v.durationMinutes) + " min · " + escapeHtml(v.scope) + " · placeholder</span>" +
          "</div>" +
          "<div>" +
            '<h3 class="wds-display-md" id="wce-vid-title" style="margin:0 0 var(--wds-space-2);">' + escapeHtml(v.title) + "</h3>" +
            '<p class="wds-body">' + escapeHtml(v.summary) + "</p>" +
            renderMeta(v) +
          "</div>" +
        "</div>" +
      "</section>"
    );
  }

  function renderPhotoEssay(data) {
    var pe = data.photoEssay;
    if (!pe) return "";
    var frames = (pe.frames || []).map(function (f) {
      return (
        '<figure class="wce-essay-frame">' +
          '<div class="ws-media-slot wce-essay-frame__slot" role="img" aria-label="Photo placeholder">' +
            '<span class="ws-media-slot__label">Photo essay frame · placeholder</span>' +
            '<p class="ws-media-slot__hint">' + escapeHtml(f.caption) + "</p>" +
          "</div>" +
          "<figcaption>" + escapeHtml(f.caption) + "</figcaption>" +
        "</figure>"
      );
    }).join("");
    return (
      '<section class="ws-block" id="photo-essay" aria-labelledby="wce-pe-title">' +
        blockHead("Gallery", "Photo essay", escapeHtml(pe.summary)) +
        '<h3 class="wds-display-md" id="wce-pe-title" style="margin:0 0 var(--wds-space-4);">' + escapeHtml(pe.title) + "</h3>" +
        '<div class="wce-essay-frames">' + frames + "</div>" +
        renderMeta(pe) +
      "</section>"
    );
  }

  function renderSpeciesSpotlight(data) {
    var sp = data.speciesSpotlight;
    if (!sp) return "";
    var idList = (sp.identification || []).map(function (b) { return "<li>" + escapeHtml(b) + "</li>"; }).join("");
    return (
      '<section class="ws-block" id="species-spotlight" aria-labelledby="wce-ss-title">' +
        blockHead("Species", "Species spotlight", "One organism — observe ethically, identify carefully.") +
        '<div class="ws-spotlight">' +
          '<figure class="ws-spotlight__plate">' + mediaSlot("Species plate · placeholder", sp.commonName) + "</figure>" +
          "<div>" +
            '<p class="wds-eyebrow"><em>' + escapeHtml(sp.scientificName) + "</em> · " + escapeHtml(sp.scope) + "</p>" +
            '<h3 class="wds-display-md" id="wce-ss-title" style="margin:0 0 var(--wds-space-2);">' + escapeHtml(sp.title) + "</h3>" +
            '<p class="wds-body">' + escapeHtml(sp.summary) + "</p>" +
            '<div class="wce-species-id"><strong>Field marks</strong><ul>' + idList + "</ul></div>" +
            (sp.ethics ? '<p class="wds-caption" style="margin-top:var(--wds-space-3);">' + escapeHtml(sp.ethics) + "</p>" : "") +
            renderMeta(sp) +
          "</div>" +
        "</div>" +
      "</section>"
    );
  }

  function renderTeachersNotebook(data) {
    var tn = data.teachersNotebook;
    if (!tn) return "";
    var objs = (tn.objectives || []).map(function (o) { return "<li>" + escapeHtml(o) + "</li>"; }).join("");
    var proc = (tn.procedure || []).map(function (p) { return "<li>" + escapeHtml(p) + "</li>"; }).join("");
    return (
      '<section class="ws-block" id="teachers-notebook" aria-labelledby="wce-tn-title">' +
        blockHead("Learn", "Teacher's notebook", "Field-tested lab — most of the time outdoors.") +
        '<article class="wce-teacher">' +
          '<p class="wds-eyebrow">' + escapeHtml(tn.gradeBand) + " · " + escapeHtml(tn.scope) + "</p>" +
          '<h3 class="wds-display-md" id="wce-tn-title" style="margin:0 0 var(--wds-space-3);">' + escapeHtml(tn.title) + "</h3>" +
          "<strong>Objectives</strong><ul class=\"wce-teacher__objectives\">" + objs + "</ul>" +
          "<strong>Procedure</strong><ol class=\"wce-investigation__steps\">" + proc + "</ol>" +
          (tn.safety ? "<p class=\"wds-caption\">Safety: " + escapeHtml(tn.safety.join("; ")) + "</p>" : "") +
          renderMeta(tn) +
        "</article>" +
      "</section>"
    );
  }

  function renderConservationUpdate(data) {
    var cu = data.conservationUpdate;
    if (!cu) return "";
    return (
      '<section class="ws-block" id="conservation-update" aria-labelledby="wce-cu-title">' +
        blockHead("Stewardship", "Conservation update", "Real place, honest hope — local action.") +
        '<article class="wce-conservation">' +
          '<span class="wce-scope">' + escapeHtml(cu.scope) + "</span>" +
          '<h3 class="wds-display-md" id="wce-cu-title" style="margin:var(--wds-space-2) 0;">' + escapeHtml(cu.title) + "</h3>" +
          '<p class="wds-body">' + escapeHtml(cu.summary) + "</p>" +
          (cu.whatYouCanDo ? '<p class="wds-body" style="margin-top:var(--wds-space-3);"><strong>What you can do:</strong> ' + escapeHtml(cu.whatYouCanDo) + "</p>" : "") +
          renderMeta(cu) +
        "</article>" +
      "</section>"
    );
  }

  function renderCitizenScience(privacyHref) {
    var href = privacyHref || "docs/WAYPOINT-STUDIO-CONSTITUTION.md#privacy-philosophy";
    return (
      '<section class="ws-block" id="citizen-science" aria-labelledby="wce-cs-title">' +
        blockHead("Privacy", "Private by default", "Your notes and photographs are yours.") +
        '<div class="ws-citizen">' +
          "<p class=\"wds-body\"><strong>You own your observations.</strong> Citizen science is always optional. Identity never required. Location privacy respected.</p>" +
          "<p class=\"wds-body\" style=\"margin-top:var(--wds-space-3);\">No comments, likes, profiles, or feeds — a field guide, not social media.</p>" +
          '<p class="wds-caption" style="margin-top:var(--wds-space-4);"><a href="' + escapeHtml(href) + '">Privacy Philosophy</a></p>' +
        "</div>" +
      "</section>"
    );
  }

  var RENDERERS = {
    "this-week-outdoors": renderThisWeekOutdoors,
    "regional-field-notes": renderRegionalFieldNotes,
    "seasonal-watch": renderSeasonalWatch,
    "species-spotlight": renderSpeciesSpotlight,
    "teachers-notebook": renderTeachersNotebook,
    "research-brief": renderResearchBrief,
    "featured-video": renderFeaturedVideo,
    "photo-essay": renderPhotoEssay,
    "weekend-field-investigation": renderWeekendInvestigation,
    "conservation-update": renderConservationUpdate
  };

  function loadRegion(regionId, base) {
    var key = base + regionId;
    if (bundleCache[key]) return Promise.resolve(bundleCache[key]);
    return fetchJson(base + "regions/" + regionId + ".json").then(function (data) {
      bundleCache[key] = data;
      return data;
    });
  }

  function renderHome(data, options) {
    options = options || {};
    var sections = options.sections || SECTION_ORDER;
    var html = sections.map(function (id) {
      var fn = RENDERERS[id];
      return fn ? fn(data) : "";
    }).join("");
    if (options.includeCitizenScience !== false) {
      html += renderCitizenScience(options.privacyHref);
    }
    return html;
  }

  function init(options) {
    options = options || {};
    var base = resolveEngineBase(options);
    var regionId = options.region ||
      (options.mount && options.mount.getAttribute("data-wds-region")) ||
      "pike-county-pa";
    var mount = options.mount || document.getElementById("wds-content-engine");
    if (!mount) return Promise.reject(new Error("WDS.contentEngine: no mount element"));

    mount.setAttribute("aria-busy", "true");

    return loadRegion(regionId, base).then(function (data) {
      var inner = renderHome(data, options);
      mount.innerHTML = options.wrapMain !== false ? '<main id="main">' + inner + "</main>" : inner;
      mount.removeAttribute("aria-busy");
      return data;
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.contentEngine = {
    init: init,
    loadRegion: loadRegion,
    renderHome: renderHome,
    SECTION_ORDER: SECTION_ORDER
  };
})(window);
