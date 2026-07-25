/**
 * Waypoint Scenes — Portfolio Assistant · Workspace UI (presentation only)
 *
 * Photograph-first candidate review. Reads the pure logic layers
 * (signals → recommend → session) and renders a calm, restrained workspace.
 * Distinguishes assistant suggestions from user decisions, keeps photos
 * dominant, and never deletes or alters originals.
 */
(function (global) {
  "use strict";

  var Signals = function () { return global.WaypointScenesAssistantSignals; };
  var Recommend = function () { return global.WaypointScenesAssistantRecommend; };
  var Sessions = function () { return global.WaypointScenesAssistantSessions; };
  var CoachStore = function () { return global.WaypointScenesCoachStore; };
  var PortfolioEngine = function () { return global.WaypointScenesPortfolioEngine; };
  var PL = function () { return global.WaypointPhotoLibraryStore; };

  var sessionEngine = null;
  var portfolioEngine = null;
  var coachEngine = null;
  var libraryImages = [];
  var collections = [];

  var state = {
    view: "start", // start | session
    sessionId: null,
    activeImageId: null,
    filters: { category: "all", confidence: "all", showExcluded: true },
    sort: "recommended",
    groupOpenId: null,
    presetPortfolioId: null,
    presetSource: null,
    /** Manual multi-select for coaching (max 2). */
    compareSelect: [],
    /** Active Portfolio Coach session id (local coach store). */
    coachSessionId: null,
    /** Mobile coach pane: photos | points | decide */
    coachTab: "photos",
    /** Expanded evidence point id */
    coachEvidenceId: null
  };

  var ROLE_OPTIONS = [
    "",
    "hero-or-subject",
    "supporting",
    "cover-or-opening",
    "detail-or-supporting",
    "environmental-or-establishing",
    "undecided"
  ];

  var ROLE_LABEL = {
    "hero-or-subject": "Hero / subject",
    supporting: "Supporting",
    "cover-or-opening": "Cover / opening",
    "detail-or-supporting": "Detail / supporting",
    "environmental-or-establishing": "Environmental / establishing",
    undecided: "Undecided"
  };

  var COACH_CAT_LABEL = {
    "technical-clarity": "Technical clarity",
    "subject-presentation": "Subject presentation",
    composition: "Composition",
    "timing-and-gesture": "Timing and gesture",
    "environmental-context": "Environmental context",
    "visual-variety": "Visual variety",
    "portfolio-repetition": "Portfolio repetition",
    "narrative-role": "Narrative role",
    "cover-suitability": "Cover suitability",
    "sequence-contribution": "Sequence contribution",
    "insufficient-evidence": "Insufficient evidence"
  };

  // ---- helpers -----------------------------------------------------------

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setStatus(msg, isError) {
    var el = $("pfa-status");
    if (!el) return;
    if (!msg) { el.hidden = true; el.textContent = ""; return; }
    el.hidden = false;
    el.textContent = msg;
    el.classList.toggle("is-error", !!isError);
  }

  function libraryById(id) {
    for (var i = 0; i < libraryImages.length; i++) if (libraryImages[i].id === id) return libraryImages[i];
    return null;
  }

  function thumbHtml(img, alt, cls) {
    cls = cls || "";
    if (img && img.media && img.media.thumbnailDataUrl) {
      return '<img class="' + cls + '" src="' + esc(img.media.thumbnailDataUrl) + '" alt="' +
        esc(alt || img.filename || "Photograph") + '" loading="lazy" decoding="async">';
    }
    return '<div class="pf-thumb-fallback ' + cls + '" role="img" aria-label="' +
      esc(alt || (img && img.filename) || "Photograph") + '">' +
      esc((img && img.filename) || "No preview") + "</div>";
  }

  var CAT_LABEL = {
    "strong-candidate": "Strong candidate",
    "supporting-image": "Supporting image",
    "similar-frame": "Similar frame",
    "needs-review": "Needs review"
  };

  var CONF_LABEL = { higher: "Higher confidence", moderate: "Moderate confidence", lower: "Lower confidence" };
  var CONF_DOTS = { higher: "●●●", moderate: "●●○", lower: "●○○" };

  function subKindLabel(rec) {
    if (!rec) return "";
    if (rec.subKind === "possible-duplicate") return "Possible duplicate";
    if (rec.subKind === "burst") return "Burst frame";
    if (rec.subKind === "framing") return "Similar framing";
    if (rec.subKind === "conflict") return "Conflicting signals";
    if (rec.subKind === "insufficient") return "Insufficient evidence";
    return "";
  }

  // ---- data plumbing -----------------------------------------------------

  function loadLibrary() {
    libraryImages = [];
    collections = [];
    try {
      if (PL() && PL().loadIndex) libraryImages = PL().loadIndex() || [];
      if (PL() && PL().loadCollections) collections = PL().loadCollections() || [];
    } catch (e) {
      libraryImages = [];
      collections = [];
    }
  }

  function sourceContext() {
    return {
      libraryImages: libraryImages,
      collections: collections,
      portfolios: portfolioEngine.list()
    };
  }

  function currentSession() {
    return state.sessionId ? sessionEngine.get(state.sessionId) : null;
  }

  function imagesForSession(session) {
    return (session.imageIds || []).map(libraryById).filter(Boolean);
  }

  // ---- start view --------------------------------------------------------

  function renderSourceOptions() {
    var sel = $("pfa-source");
    if (!sel) return;
    var sources = Signals().listSources(sourceContext());
    sel.innerHTML = sources
      .map(function (s) {
        var value = s.type + "::" + (s.ref || "");
        return '<option value="' + esc(value) + '">' + esc(s.label) + " · " + s.count +
          " photograph" + (s.count === 1 ? "" : "s") + "</option>";
      })
      .join("");
    if (state.presetSource) sel.value = state.presetSource;
  }

  function renderResume() {
    var wrap = $("pfa-resume");
    var list = $("pfa-resume-list");
    if (!wrap || !list) return;
    var sessions = sessionEngine.list();
    if (!sessions.length) { wrap.hidden = true; list.innerHTML = ""; return; }
    wrap.hidden = false;
    list.innerHTML = sessions
      .map(function (s) {
        var decided = Object.keys(s.decisions || {}).length;
        return '<li class="pfa-resume__item">' +
          '<button type="button" class="pfa-resume__open" data-resume="' + esc(s.id) + '">' +
          "<strong>" + esc(s.title) + "</strong>" +
          '<span class="pfa-resume__meta">' + (s.imageIds || []).length + " photographs · " +
          decided + " decided · updated " + esc((s.updatedAt || "").slice(0, 10)) + "</span>" +
          "</button>" +
          '<button type="button" class="wds-btn wds-btn--ghost pf-danger" data-delete-session="' + esc(s.id) + '">Delete</button>' +
          "</li>";
      })
      .join("");
  }

  function renderStart() {
    $("pfa-start").hidden = false;
    $("pfa-workspace").hidden = true;
    var emptyLib = $("pfa-empty-lib");
    var begin = $("pfa-begin");
    if (emptyLib) emptyLib.hidden = libraryImages.length > 0;
    if (begin) begin.disabled = libraryImages.length === 0;
    renderSourceOptions();
    renderResume();
  }

  // ---- session workspace -------------------------------------------------

  function effectiveCategory(session, id) {
    return sessionEngine.effectiveCategory(session, id);
  }

  function visibleIds(session) {
    var ids = state.sort === "recommended" && session.order && session.order.length
      ? session.order.slice()
      : (session.imageIds || []).slice();

    if (state.sort === "category") {
      var weight = { "strong-candidate": 0, "similar-frame": 1, "supporting-image": 2, "needs-review": 3 };
      ids.sort(function (a, b) { return (weight[effectiveCategory(session, a)] || 9) - (weight[effectiveCategory(session, b)] || 9); });
    } else if (state.sort === "filename") {
      ids.sort(function (a, b) {
        var ia = libraryById(a), ib = libraryById(b);
        return String(ia && ia.filename).localeCompare(String(ib && ib.filename));
      });
    }

    return ids.filter(function (id) {
      var dec = session.decisions[id];
      if (!state.filters.showExcluded && dec && dec.status === "excluded") return false;
      if (state.filters.category !== "all" && effectiveCategory(session, id) !== state.filters.category) return false;
      if (state.filters.confidence !== "all") {
        var rec = session.recommendations[id];
        if (!rec || rec.confidence !== state.filters.confidence) return false;
      }
      return true;
    });
  }

  function categoryChip(cat, extra) {
    return '<span class="pfa-chip" data-cat="' + esc(cat) + '">' + esc(CAT_LABEL[cat] || cat) +
      (extra ? ' <span class="pfa-chip__sub">· ' + esc(extra) + "</span>" : "") + "</span>";
  }

  function confidenceBadge(conf) {
    return '<span class="pfa-conf" data-conf="' + esc(conf) + '">' +
      '<span class="pfa-conf__dots" aria-hidden="true">' + (CONF_DOTS[conf] || "") + "</span>" +
      '<span class="pfa-conf__label">' + esc(CONF_LABEL[conf] || conf) + "</span></span>";
  }

  function renderFilmstrip(session) {
    var strip = $("pfa-filmstrip");
    if (!strip) return;
    var ids = visibleIds(session);
    if (!ids.length) {
      strip.innerHTML = '<p class="pf-hint">No photographs match these filters. Clear a filter to see more.</p>';
      return;
    }
    if (!state.activeImageId || ids.indexOf(state.activeImageId) < 0) state.activeImageId = ids[0];

    strip.innerHTML = ids
      .map(function (id) {
        var img = libraryById(id);
        var cat = effectiveCategory(session, id);
        var dec = session.decisions[id];
        var isActive = id === state.activeImageId;
        var excluded = dec && dec.status === "excluded";
        return '<button type="button" role="option" aria-selected="' + (isActive ? "true" : "false") +
          '" class="pfa-cell' + (isActive ? " is-active" : "") + (excluded ? " is-excluded" : "") +
          '" data-focus="' + esc(id) + '">' +
          '<span class="pfa-cell__media">' + thumbHtml(img, img && img.filename) + "</span>" +
          '<span class="pfa-cell__tag" data-cat="' + esc(cat) + '">' + esc(CAT_LABEL[cat] || cat) + "</span>" +
          (dec && dec.category ? '<span class="pfa-cell__mine" title="Your decision">Your pick</span>' : "") +
          (dec && dec.preferredInGroup ? '<span class="pfa-cell__pref" title="Preferred in group">Preferred</span>' : "") +
          "</button>";
      })
      .join("");
  }

  function portfolioOptions(selectedId) {
    var list = portfolioEngine.list();
    var opts = list
      .map(function (p) {
        return '<option value="' + esc(p.id) + '"' + (p.id === selectedId ? " selected" : "") + ">" + esc(p.title) + "</option>";
      })
      .join("");
    return '<option value="">Choose a portfolio…</option>' + opts +
      '<option value="__new__">+ New portfolio from this review</option>';
  }

  function renderPreview(session) {
    var pane = $("pfa-preview");
    if (!pane) return;
    var id = state.activeImageId;
    if (!id) { pane.innerHTML = '<p class="pf-hint">Select a photograph to review it.</p>'; return; }
    var img = libraryById(id);
    var rec = session.recommendations[id] || { category: "needs-review", confidence: "lower", rationale: [] };
    var dec = session.decisions[id] || null;
    var effCat = effectiveCategory(session, id);

    var missing = !img || (img.media && !img.media.thumbnailDataUrl && !img.media.hasOriginal && !img.media.hasThumbnail);

    var rationale = (rec.rationale && rec.rationale.length)
      ? '<ul class="pfa-why">' + rec.rationale.map(function (r) { return "<li>" + esc(r) + "</li>"; }).join("") + "</ul>"
      : '<p class="pf-hint">No specific evidence for this frame yet — review it manually.</p>';

    var groupBtn = "";
    if (rec.groupId && rec.relatedImageIds && rec.relatedImageIds.length) {
      groupBtn = '<button type="button" class="wds-btn wds-btn--ghost" data-open-group="' + esc(rec.groupId) +
        '">Compare similar frames (' + (rec.relatedImageIds.length + 1) + ")</button>";
      var other = rec.relatedImageIds[0];
      if (other) {
        groupBtn += '<button type="button" class="wds-btn wds-btn--primary" data-coach-pair data-a="' + esc(id) +
          '" data-b="' + esc(other) + '" data-group="' + esc(rec.groupId) +
          '">Open Portfolio Coach</button>';
      }
    }

    var inCompare = state.compareSelect.indexOf(id) >= 0;
    var compareBtn =
      '<button type="button" class="wds-btn wds-btn--ghost' + (inCompare ? " is-on" : "") +
      '" data-coach-pick="' + esc(id) + '" aria-pressed="' + (inCompare ? "true" : "false") + '">' +
      (inCompare ? "Selected for coach" : "Select for coach") + "</button>";
    if (state.compareSelect.length === 2) {
      compareBtn +=
        '<button type="button" class="wds-btn wds-btn--primary" data-coach-manual>Open Portfolio Coach with selection</button>';
    }

    // Nearby frame: previous/next in session order for candidate + nearby
    var order = session.order && session.order.length ? session.order : session.imageIds || [];
    var oi = order.indexOf(id);
    var nearbyBtn = "";
    if (oi >= 0 && order.length > 1) {
      var nearId = oi < order.length - 1 ? order[oi + 1] : order[oi - 1];
      if (nearId) {
        nearbyBtn =
          '<button type="button" class="wds-btn wds-btn--ghost" data-coach-pair data-a="' + esc(id) +
          '" data-b="' + esc(nearId) + '" data-source="nearby">Coach with nearby frame</button>';
      }
    }

    // Portfolio image + alternative: if active is in a portfolio, offer coach vs first related or strong alt
    var pfBtn = "";
    var pf = activePortfolio();
    if (pf && (pf.imageIds || []).indexOf(id) >= 0) {
      var alt = (rec.relatedImageIds && rec.relatedImageIds[0]) || null;
      if (!alt) {
        var candidates = (session.imageIds || []).filter(function (x) { return x !== id && (pf.imageIds || []).indexOf(x) < 0; });
        alt = candidates[0] || null;
      }
      if (alt) {
        pfBtn =
          '<button type="button" class="wds-btn wds-btn--ghost" data-coach-pair data-a="' + esc(id) +
          '" data-b="' + esc(alt) + '" data-source="portfolio-alt">Coach: portfolio image vs alternative</button>';
      }
    }

    var decidedNote = "";
    if (dec && dec.category && dec.category !== rec.category) {
      decidedNote = '<p class="pfa-decided">Assistant suggested <strong>' + esc(CAT_LABEL[rec.category]) +
        "</strong>. You changed it to <strong>" + esc(CAT_LABEL[dec.category]) + "</strong>.</p>";
    } else if (dec && dec.status) {
      decidedNote = '<p class="pfa-decided">Your decision: <strong>' + esc(dec.status) + "</strong>.</p>";
    }

    pane.innerHTML =
      '<figure class="pfa-figure">' +
      '<div class="pfa-figure__media">' + thumbHtml(img, img && img.filename, "pfa-figure__img") + "</div>" +
      '<figcaption class="pfa-figure__cap">' + esc((img && img.filename) || "Missing library image") + "</figcaption>" +
      "</figure>" +
      '<div class="pfa-detail">' +
      '<div class="pfa-detail__head">' + categoryChip(effCat, subKindLabel(rec)) + confidenceBadge(rec.confidence) + "</div>" +
      (missing ? '<p class="pf-hint">This reference is missing its local image data. You can still decide, but check your library.</p>' : "") +
      '<h3 class="pfa-detail__title">Why this suggestion</h3>' +
      rationale +
      decidedNote +
      '<div class="pfa-actions" role="group" aria-label="Your decision for this photograph">' +
      '<button type="button" class="wds-btn wds-btn--ghost pfa-mark" data-mark="strong" data-id="' + esc(id) + '">Mark strong</button>' +
      '<button type="button" class="wds-btn wds-btn--ghost pfa-mark" data-mark="supporting" data-id="' + esc(id) + '">Mark supporting</button>' +
      '<button type="button" class="wds-btn wds-btn--ghost pfa-mark" data-mark="later" data-id="' + esc(id) + '">Later review</button>' +
      '<button type="button" class="wds-btn wds-btn--ghost pfa-mark" data-mark="excluded" data-id="' + esc(id) + '">Exclude from review</button>' +
      (dec ? '<button type="button" class="wds-btn wds-btn--ghost" data-clear="' + esc(id) + '">Clear my decision</button>' : "") +
      groupBtn +
      compareBtn +
      nearbyBtn +
      pfBtn +
      "</div>" +
      '<div class="pfa-add">' +
      '<label for="pfa-add-select" class="wds-sr-only">Add to portfolio</label>' +
      '<select id="pfa-add-select" class="pfa-select pfa-select--sm">' + portfolioOptions(state.presetPortfolioId) + "</select>" +
      '<button type="button" class="wds-btn wds-btn--primary" data-add="' + esc(id) + '">Add to portfolio</button>' +
      (dec && dec.addedToPortfolioIds && dec.addedToPortfolioIds.length
        ? '<p class="pfa-added">Added to ' + dec.addedToPortfolioIds.length + " portfolio" + (dec.addedToPortfolioIds.length === 1 ? "" : "s") + "."
          + "</p>"
        : "") +
      "</div>" +
      "</div>";
  }

  function renderGroup(session) {
    var wrap = $("pfa-group");
    if (!wrap) return;
    if (!state.groupOpenId) { wrap.hidden = true; wrap.innerHTML = ""; return; }
    var group = (session.groups || []).filter(function (g) { return g.id === state.groupOpenId; })[0];
    if (!group) { wrap.hidden = true; wrap.innerHTML = ""; return; }
    wrap.hidden = false;

    var coachPairBtn = "";
    if (group.imageIds.length >= 2) {
      coachPairBtn =
        '<button type="button" class="wds-btn wds-btn--primary" data-coach-group="' + esc(group.id) +
        '" data-a="' + esc(group.imageIds[0]) + '" data-b="' + esc(group.imageIds[1]) +
        '">Open Portfolio Coach</button>';
    }

    wrap.innerHTML =
      '<div class="pfa-group__head">' +
      "<h2 class=\"pf-section-title\">Compare similar frames</h2>" +
      '<button type="button" class="wds-btn wds-btn--ghost" id="pfa-group-close">Close</button>' +
      "</div>" +
      '<p class="pf-hint">' + esc(group.reason) + " Choose a preferred frame, keep several, open Portfolio Coach, or dismiss — nothing is deleted.</p>" +
      '<div class="pfa-group__coach-launch">' + coachPairBtn + "</div>" +
      '<ul class="pfa-group__grid">' +
      group.imageIds
        .map(function (id) {
          var img = libraryById(id);
          var dec = session.decisions[id];
          var pref = dec && dec.preferredInGroup;
          return '<li class="pfa-group__item' + (pref ? " is-preferred" : "") + '">' +
            '<div class="pfa-group__media">' + thumbHtml(img, img && img.filename) +
            (pref ? '<span class="pf-shot__badge">Preferred</span>' : "") + "</div>" +
            "<p>" + esc((img && img.filename) || "Missing") + "</p>" +
            '<div class="pfa-group__actions">' +
            '<button type="button" class="wds-btn wds-btn--ghost" data-prefer="' + esc(id) + '" data-group="' + esc(group.id) + '"' + (pref ? " disabled" : "") + ">Prefer this</button>" +
            '<button type="button" class="wds-btn wds-btn--ghost" data-add="' + esc(id) + '">Add</button>' +
            '<button type="button" class="wds-btn wds-btn--ghost" data-coach-pick="' + esc(id) + '">Select for coach</button>' +
            '<button type="button" class="wds-btn wds-btn--ghost pf-danger" data-mark="excluded" data-id="' + esc(id) + '">Dismiss</button>' +
            "</div>" +
            "</li>";
        })
        .join("") +
      "</ul>";
  }

  // ---- Portfolio Coach presentation --------------------------------------

  function activePortfolio() {
    if (state.presetPortfolioId) return portfolioEngine.get(state.presetPortfolioId);
    var session = currentSession();
    if (session && session.destinationPortfolioIds && session.destinationPortfolioIds[0]) {
      return portfolioEngine.get(session.destinationPortfolioIds[0]);
    }
    var list = portfolioEngine.list();
    return list.length ? list[0] : null;
  }

  function openCoach(imageIdA, imageIdB, source, group) {
    if (!imageIdA || !imageIdB || imageIdA === imageIdB) {
      setStatus("Select two different photographs to open Portfolio Coach.", true);
      return;
    }
    var imgA = libraryById(imageIdA);
    var imgB = libraryById(imageIdB);
    if (!imgA && !imgB) {
      setStatus("Those photograph references are missing from the library.", true);
      return;
    }
    var pf = activePortfolio();
    var coachSession = coachEngine.openComparison({
      imgA: imgA || { id: imageIdA, filename: "Missing A" },
      imgB: imgB || { id: imageIdB, filename: "Missing B" },
      portfolio: pf,
      libraryImages: libraryImages,
      group: group || null,
      source: source || "manual",
      assistantSessionId: state.sessionId,
      portfolioId: pf ? pf.id : null
    });
    state.coachSessionId = coachSession.id;
    state.coachTab = "photos";
    state.coachEvidenceId = null;
    state.groupOpenId = null;
    setStatus("Portfolio Coach is ready — photographs stay dominant; you decide.");
    render();
    var panel = $("pfc-coach");
    if (panel && panel.scrollIntoView) panel.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleCompareSelect(imageId) {
    var idx = state.compareSelect.indexOf(imageId);
    if (idx >= 0) {
      state.compareSelect.splice(idx, 1);
    } else {
      if (state.compareSelect.length >= 2) state.compareSelect.shift();
      state.compareSelect.push(imageId);
    }
    if (state.compareSelect.length === 2) {
      setStatus("Two photographs selected — open Portfolio Coach when ready.");
    } else {
      setStatus(state.compareSelect.length === 1 ? "Select one more photograph for Portfolio Coach." : "");
    }
    render();
  }

  function confidenceBadgeCoach(conf) {
    return '<span class="pfa-conf" data-conf="' + esc(conf) + '">' +
      '<span class="pfa-conf__dots" aria-hidden="true">' + (CONF_DOTS[conf] || "") + "</span>" +
      '<span class="pfa-conf__label">' + esc(CONF_LABEL[conf] || conf) + "</span></span>";
  }

  function roleSelectHtml(side, current) {
    var opts = ROLE_OPTIONS.map(function (r) {
      var label = r ? (ROLE_LABEL[r] || r) : "No role set";
      return '<option value="' + esc(r) + '"' + (r === (current || "") ? " selected" : "") + ">" + esc(label) + "</option>";
    }).join("");
    return '<label class="pfc-role"><span class="wds-sr-only">Role for frame ' + side.toUpperCase() + "</span>" +
      '<select class="pfa-select pfa-select--sm" data-role-side="' + side + '">' + opts + "</select></label>";
  }

  function renderCoachPoint(p, decision) {
    var dismissed = decision && decision.dismissedPointIds.indexOf(p.id) >= 0;
    var helpful = decision && decision.helpfulPointIds.indexOf(p.id) >= 0;
    if (dismissed) return "";
    var evidenceOpen = state.coachEvidenceId === p.id;
    var evidence = (p.evidence || [])
      .map(function (e) {
        return "<li><strong>" + esc(e.label || e.signal) + "</strong>: " +
          (e.valueA != null ? "A · " + esc(String(e.valueA)) : "") +
          (e.valueA != null && e.valueB != null ? " · " : "") +
          (e.valueB != null ? "B · " + esc(String(e.valueB)) : "") +
          "</li>";
      })
      .join("");
    return '<article class="pfc-point" data-kind="' + esc(p.kind || "mixed") + '" data-cat="' + esc(p.category) + '">' +
      '<header class="pfc-point__head">' +
      '<span class="pfc-cat">' + esc(COACH_CAT_LABEL[p.category] || p.category) + "</span>" +
      '<span class="pfc-mode">' + esc(p.mode) + "</span>" +
      confidenceBadgeCoach(p.confidence) +
      (p.kind === "technical" ? '<span class="pfc-kind">Technical</span>' : "") +
      (p.kind === "creative" ? '<span class="pfc-kind pfc-kind--creative">Creative (cautious)</span>' : "") +
      "</header>" +
      '<p class="pfc-obs">' + esc(p.observation) + "</p>" +
      '<p class="pfc-why"><span class="pfc-label">Why it may matter</span> ' + esc(p.whyItMayMatter) + "</p>" +
      '<p class="pfc-trade"><span class="pfc-label">Tradeoff</span> ' + esc(p.tradeoff) + "</p>" +
      (p.portfolioContext ? '<p class="pfc-pfx"><span class="pfc-label">Portfolio context</span> ' + esc(p.portfolioContext) + "</p>" : "") +
      '<p class="pfc-ask"><span class="pfc-label">Your call</span> ' + esc(p.decisionPrompt) + "</p>" +
      '<div class="pfc-point__actions">' +
      '<button type="button" class="wds-btn wds-btn--ghost" data-coach-evidence="' + esc(p.id) + '" aria-expanded="' +
      (evidenceOpen ? "true" : "false") + '">' + (evidenceOpen ? "Hide evidence" : "Show evidence") + "</button>" +
      '<button type="button" class="wds-btn wds-btn--ghost" data-coach-helpful="' + esc(p.id) + '"' +
      (helpful ? " disabled" : "") + ">" + (helpful ? "Marked helpful" : "Mark helpful") + "</button>" +
      '<button type="button" class="wds-btn wds-btn--ghost" data-coach-dismiss-point="' + esc(p.id) + '">Dismiss</button>' +
      "</div>" +
      (evidenceOpen
        ? '<div class="pfc-evidence" role="region" aria-label="Evidence for this coaching point"><ul>' +
          (evidence || "<li>No structured evidence rows for this point.</li>") +
          '</ul><p class="pf-hint">Weak or incomplete signals are shown honestly. This is not pixel analysis.</p></div>'
        : "") +
      "</article>";
  }

  function renderCoach() {
    var wrap = $("pfc-coach");
    if (!wrap) return;
    if (!state.coachSessionId) { wrap.hidden = true; wrap.innerHTML = ""; return; }
    var cs = coachEngine.get(state.coachSessionId);
    if (!cs) { wrap.hidden = true; wrap.innerHTML = ""; state.coachSessionId = null; return; }
    wrap.hidden = false;

    var imgA = libraryById(cs.imageIdA);
    var imgB = libraryById(cs.imageIdB);
    var decision = cs.decision || {};
    var pref = decision.preference;
    var notes = coachEngine.notesForSession(cs.id);
    var pointsHtml = (cs.points || []).map(function (p) { return renderCoachPoint(p, decision); }).join("");
    if (!pointsHtml) {
      pointsHtml = '<p class="pf-hint">All coaching points were dismissed. Manual comparison remains available.</p>';
    }

    var tab = state.coachTab || "photos";
    wrap.innerHTML =
      '<div class="pfc-head">' +
      "<div>" +
      '<h2 class="pf-section-title">Portfolio Coach</h2>' +
      '<p class="pf-hint">' + esc(cs.message || "Assistant recommends. Coach explains. You decide.") + "</p>" +
      "</div>" +
      '<button type="button" class="wds-btn wds-btn--ghost" id="pfc-close">Close coach</button>' +
      "</div>" +
      '<div class="pfc-tabs" role="tablist" aria-label="Coach views">' +
      '<button type="button" role="tab" class="pfc-tab' + (tab === "photos" ? " is-active" : "") + '" data-coach-tab="photos" aria-selected="' + (tab === "photos") + '">Photographs</button>' +
      '<button type="button" role="tab" class="pfc-tab' + (tab === "points" ? " is-active" : "") + '" data-coach-tab="points" aria-selected="' + (tab === "points") + '">Coaching</button>' +
      '<button type="button" role="tab" class="pfc-tab' + (tab === "decide" ? " is-active" : "") + '" data-coach-tab="decide" aria-selected="' + (tab === "decide") + '">Your decision</button>' +
      "</div>" +
      '<div class="pfc-body" data-tab="' + esc(tab) + '">' +
      '<div class="pfc-photos' + (tab === "photos" ? " is-shown" : "") + '" role="tabpanel">' +
      '<figure class="pfc-fig' + (pref === "prefer-a" ? " is-preferred" : "") + '">' +
      '<div class="pfc-fig__media">' + thumbHtml(imgA, imgA && imgA.filename, "pfc-fig__img") + "</div>" +
      '<figcaption><span class="pfc-fig__tag">A</span> ' + esc((imgA && imgA.filename) || cs.imageIdA || "Missing") + "</figcaption>" +
      "</figure>" +
      '<figure class="pfc-fig' + (pref === "prefer-b" ? " is-preferred" : "") + '">' +
      '<div class="pfc-fig__media">' + thumbHtml(imgB, imgB && imgB.filename, "pfc-fig__img") + "</div>" +
      '<figcaption><span class="pfc-fig__tag">B</span> ' + esc((imgB && imgB.filename) || cs.imageIdB || "Missing") + "</figcaption>" +
      "</figure>" +
      "</div>" +
      '<div class="pfc-points' + (tab === "points" ? " is-shown" : "") + '" role="tabpanel">' +
      pointsHtml +
      "</div>" +
      '<div class="pfc-decide' + (tab === "decide" ? " is-shown" : "") + '" role="tabpanel">' +
      '<div class="pfc-pref" role="group" aria-label="Preference for this comparison">' +
      '<button type="button" class="wds-btn wds-btn--ghost' + (pref === "prefer-a" ? " is-on" : "") + '" data-coach-pref="prefer-a">Prefer A</button>' +
      '<button type="button" class="wds-btn wds-btn--ghost' + (pref === "prefer-b" ? " is-on" : "") + '" data-coach-pref="prefer-b">Prefer B</button>' +
      '<button type="button" class="wds-btn wds-btn--ghost' + (pref === "keep-both" ? " is-on" : "") + '" data-coach-pref="keep-both">Keep both</button>' +
      '<button type="button" class="wds-btn wds-btn--ghost' + (pref === "keep-neither" ? " is-on" : "") + '" data-coach-pref="keep-neither">Keep neither this session</button>' +
      "</div>" +
      '<div class="pfc-roles">' +
      "<p class=\"pfc-label\">Assign different roles (optional)</p>" +
      '<div class="pfc-roles__row"><span>A</span> ' + roleSelectHtml("a", decision.roles && decision.roles.a) +
      "<span>B</span> " + roleSelectHtml("b", decision.roles && decision.roles.b) + "</div>" +
      "</div>" +
      '<div class="pfc-portfolio-actions">' +
      '<label for="pfc-add-select" class="wds-sr-only">Portfolio for coach actions</label>' +
      '<select id="pfc-add-select" class="pfa-select pfa-select--sm">' + portfolioOptions(state.presetPortfolioId) + "</select>" +
      '<button type="button" class="wds-btn wds-btn--ghost" data-coach-add="a">Add A</button>' +
      '<button type="button" class="wds-btn wds-btn--ghost" data-coach-add="b">Add B</button>' +
      '<button type="button" class="wds-btn wds-btn--ghost" data-coach-add="both">Add both</button>' +
      '<button type="button" class="wds-btn wds-btn--ghost" data-coach-replace="a">Replace portfolio image with A…</button>' +
      '<button type="button" class="wds-btn wds-btn--ghost" data-coach-replace="b">Replace portfolio image with B…</button>' +
      "</div>" +
      '<div class="pfc-note">' +
      '<label for="pfc-note-input">Personal note</label>' +
      '<textarea id="pfc-note-input" class="pfc-note__input" rows="2" maxlength="500" placeholder="What you noticed — saved on this device only."></textarea>' +
      '<button type="button" class="wds-btn wds-btn--ghost" id="pfc-note-save">Save note</button>' +
      (notes.length
        ? '<ul class="pfc-note__list">' + notes.map(function (n) {
            return "<li><time datetime=\"" + esc(n.createdAt) + "\">" + esc((n.createdAt || "").slice(0, 10)) +
              "</time> " + esc(n.text) + "</li>";
          }).join("") + "</ul>"
        : '<p class="pf-hint">Notes stay local for your future learning history — no lessons or streaks.</p>') +
      "</div>" +
      '<p class="pf-hint">Portfolio changes never happen silently. Originals are never deleted or altered.</p>' +
      "</div>" +
      "</div>";
  }

  function renderWorkspace() {
    var session = currentSession();
    if (!session) { state.view = "start"; render(); return; }
    $("pfa-start").hidden = true;
    $("pfa-workspace").hidden = false;

    var srcLabel = $("pfa-source-label");
    if (srcLabel) srcLabel.textContent = session.source ? session.source.label : "";
    var msg = $("pfa-session-message");
    if (msg) msg.textContent = session.message || "";

    $("pfa-filter-category").value = state.filters.category;
    $("pfa-filter-confidence").value = state.filters.confidence;
    $("pfa-sort").value = state.sort;
    $("pfa-show-excluded").checked = state.filters.showExcluded;

    renderFilmstrip(session);
    renderPreview(session);
    renderGroup(session);
    renderCoach();
  }

  function render() {
    if (state.view === "session" && state.sessionId) renderWorkspace();
    else renderStart();
  }

  // ---- actions -----------------------------------------------------------

  function beginSession(spec) {
    var resolved = Signals().resolveSource(spec, sourceContext());
    if (!resolved.images.length) {
      setStatus("That source has no photographs to review yet.", false);
      return;
    }
    var session = sessionEngine.startSession({
      source: { type: resolved.type, ref: resolved.ref, label: resolved.label },
      images: resolved.images,
      destinationPortfolioIds: state.presetPortfolioId ? [state.presetPortfolioId] : []
    });
    state.view = "session";
    state.sessionId = session.id;
    state.activeImageId = null;
    state.groupOpenId = null;
    setStatus("");
    render();
  }

  function reanalyze() {
    var session = currentSession();
    if (!session) return;
    loadLibrary();
    sessionEngine.reanalyze(session.id, imagesForSession(session));
    setStatus("Re-analyzed. Your decisions were kept.");
    render();
  }

  function resolvePortfolioChoice(selectId) {
    var sel = $(selectId) || $("pfa-add-select");
    var choice = sel ? sel.value : "";
    if (!choice) return null;
    if (choice === "__new__") {
      var session = currentSession();
      var created = portfolioEngine.createPortfolio({
        title: (session && session.source && session.source.label) || "New portfolio"
      });
      state.presetPortfolioId = created.id;
      return created.id;
    }
    return choice;
  }

  function coachAdd(side) {
    var cs = coachEngine.get(state.coachSessionId);
    if (!cs) return;
    var portfolioId = resolvePortfolioChoice("pfc-add-select");
    if (!portfolioId) { setStatus("Choose a portfolio first.", true); return; }
    var ids = [];
    if (side === "a" || side === "both") ids.push(cs.imageIdA);
    if (side === "b" || side === "both") ids.push(cs.imageIdB);
    ids.forEach(function (imageId) {
      if (!imageId) return;
      portfolioEngine.addImages(portfolioId, [imageId], { source: "suggestion", selectionRationale: "Added from Portfolio Coach comparison." });
      coachEngine.recordAdded(cs.id, imageId);
      if (state.sessionId) sessionEngine.recordAddedToPortfolio(state.sessionId, imageId, portfolioId);
    });
    state.presetPortfolioId = portfolioId;
    setStatus("Added to portfolio from Portfolio Coach. Originals stay in your library.");
    render();
  }

  function coachReplace(side) {
    var cs = coachEngine.get(state.coachSessionId);
    if (!cs) return;
    var portfolioId = resolvePortfolioChoice("pfc-add-select");
    if (!portfolioId) { setStatus("Choose a portfolio first.", true); return; }
    var pf = portfolioEngine.get(portfolioId);
    if (!pf || !(pf.imageIds || []).length) {
      setStatus("That portfolio has no image to replace yet. Add instead.", true);
      return;
    }
    var addId = side === "a" ? cs.imageIdA : cs.imageIdB;
    var removeId = pf.coverImageId && pf.coverImageId !== addId
      ? pf.coverImageId
      : (pf.imageIds.filter(function (id) { return id !== addId; })[0] || null);
    if (!removeId) {
      setStatus("Could not find a different portfolio image to replace.", true);
      return;
    }
    var label = (libraryById(removeId) && libraryById(removeId).filename) || removeId;
    if (global.confirm && !global.confirm("Replace “" + label + "” in the portfolio with frame " + side.toUpperCase() + "? The original file stays in Photo Library.")) {
      return;
    }
    portfolioEngine.removeImage(portfolioId, removeId);
    portfolioEngine.addImages(portfolioId, [addId], { source: "suggestion", selectionRationale: "Replaced via Portfolio Coach." });
    coachEngine.recordReplace(cs.id, removeId, addId);
    if (state.sessionId) sessionEngine.recordAddedToPortfolio(state.sessionId, addId, portfolioId);
    state.presetPortfolioId = portfolioId;
    setStatus("Portfolio membership updated. Original files were not deleted.");
    render();
  }

  function addToPortfolio(imageId) {
    var portfolioId = resolvePortfolioChoice("pfa-add-select");
    if (!portfolioId) { setStatus("Choose a portfolio first.", true); return; }
    var session = currentSession();
    var rec = session && session.recommendations[imageId];
    var rationale = rec && rec.rationale && rec.rationale.length ? rec.rationale[0] : null;

    portfolioEngine.addImages(portfolioId, [imageId], { source: "suggestion", selectionRationale: rationale });
    sessionEngine.recordAddedToPortfolio(session.id, imageId, portfolioId);
    state.presetPortfolioId = portfolioId;
    setStatus("Added to portfolio. The original stays in your library.");
    render();
  }

  function mark(imageId, kind) {
    var session = currentSession();
    if (!session) return;
    var patch;
    if (kind === "strong") patch = { status: "strong", category: "strong-candidate", dismissed: false };
    else if (kind === "supporting") patch = { status: "supporting", category: "supporting-image", dismissed: false };
    else if (kind === "later") patch = { status: "later", category: "needs-review", dismissed: false };
    else if (kind === "excluded") patch = { status: "excluded", dismissed: true };
    else return;
    sessionEngine.setDecision(session.id, imageId, patch);
    setStatus("Your decision was saved on this device.");
    render();
  }

  // ---- events ------------------------------------------------------------

  function bind() {
    var begin = $("pfa-begin");
    if (begin) {
      begin.addEventListener("click", function () {
        var val = $("pfa-source").value || "library::";
        var parts = val.split("::");
        beginSession({ type: parts[0], ref: parts[1] || null });
      });
    }

    var newBtn = $("pfa-new");
    if (newBtn) newBtn.addEventListener("click", function () {
      state.view = "start";
      state.sessionId = null;
      state.groupOpenId = null;
      state.coachSessionId = null;
      state.compareSelect = [];
      render();
    });

    var reBtn = $("pfa-reanalyze");
    if (reBtn) reBtn.addEventListener("click", reanalyze);

    ["pfa-filter-category", "pfa-filter-confidence", "pfa-sort"].forEach(function (fid) {
      var el = $(fid);
      if (!el) return;
      el.addEventListener("change", function () {
        if (fid === "pfa-filter-category") state.filters.category = el.value;
        else if (fid === "pfa-filter-confidence") state.filters.confidence = el.value;
        else if (fid === "pfa-sort") state.sort = el.value;
        render();
      });
    });

    var showExcluded = $("pfa-show-excluded");
    if (showExcluded) showExcluded.addEventListener("change", function () {
      state.filters.showExcluded = showExcluded.checked;
      render();
    });

    document.addEventListener("click", function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;

      var resume = t.closest("[data-resume]");
      if (resume) {
        state.view = "session";
        state.sessionId = resume.getAttribute("data-resume");
        state.activeImageId = null;
        state.groupOpenId = null;
        render();
        return;
      }
      var delSess = t.closest("[data-delete-session]");
      if (delSess) {
        if (global.confirm && !global.confirm("Delete this review session? Your photographs and portfolios are not affected.")) return;
        sessionEngine.deleteSession(delSess.getAttribute("data-delete-session"));
        setStatus("Review session deleted.");
        render();
        return;
      }
      var focus = t.closest("[data-focus]");
      if (focus) {
        state.activeImageId = focus.getAttribute("data-focus");
        render();
        return;
      }
      var openGroup = t.closest("[data-open-group]");
      if (openGroup) { state.groupOpenId = openGroup.getAttribute("data-open-group"); render(); return; }
      if (t.id === "pfa-group-close") { state.groupOpenId = null; render(); return; }

      var prefer = t.closest("[data-prefer]");
      if (prefer) {
        sessionEngine.setPreferredInGroup(state.sessionId, prefer.getAttribute("data-group"), prefer.getAttribute("data-prefer"));
        setStatus("Preferred frame set.");
        render();
        return;
      }
      var markBtn = t.closest("[data-mark]");
      if (markBtn) { mark(markBtn.getAttribute("data-id"), markBtn.getAttribute("data-mark")); return; }
      var clearBtn = t.closest("[data-clear]");
      if (clearBtn) {
        sessionEngine.clearDecision(state.sessionId, clearBtn.getAttribute("data-clear"));
        setStatus("Cleared — showing the assistant suggestion again.");
        render();
        return;
      }
      var addBtn = t.closest("[data-add]");
      if (addBtn) { addToPortfolio(addBtn.getAttribute("data-add")); return; }

      // ---- Portfolio Coach controls ----
      var coachPair = t.closest("[data-coach-pair]");
      if (coachPair) {
        var session = currentSession();
        var gid = coachPair.getAttribute("data-group");
        var group = gid && session ? (session.groups || []).filter(function (g) { return g.id === gid; })[0] : null;
        openCoach(
          coachPair.getAttribute("data-a"),
          coachPair.getAttribute("data-b"),
          coachPair.getAttribute("data-source") || (group ? "similar-group" : "manual"),
          group || null
        );
        return;
      }
      var coachGroup = t.closest("[data-coach-group]");
      if (coachGroup) {
        var sess2 = currentSession();
        var g2 = sess2 ? (sess2.groups || []).filter(function (g) { return g.id === coachGroup.getAttribute("data-coach-group"); })[0] : null;
        openCoach(coachGroup.getAttribute("data-a"), coachGroup.getAttribute("data-b"), "similar-group", g2 || null);
        return;
      }
      var coachPick = t.closest("[data-coach-pick]");
      if (coachPick) { toggleCompareSelect(coachPick.getAttribute("data-coach-pick")); return; }
      if (t.closest("[data-coach-manual]")) {
        if (state.compareSelect.length === 2) {
          openCoach(state.compareSelect[0], state.compareSelect[1], "manual", null);
          state.compareSelect = [];
        }
        return;
      }
      if (t.id === "pfc-close") {
        state.coachSessionId = null;
        setStatus("Returned to candidate review.");
        render();
        return;
      }
      var coachTab = t.closest("[data-coach-tab]");
      if (coachTab) {
        state.coachTab = coachTab.getAttribute("data-coach-tab");
        render();
        return;
      }
      var coachPref = t.closest("[data-coach-pref]");
      if (coachPref && state.coachSessionId) {
        coachEngine.setPreference(state.coachSessionId, coachPref.getAttribute("data-coach-pref"));
        // Mirror prefer into assistant preferred-in-group when a group exists
        var csPref = coachEngine.get(state.coachSessionId);
        if (csPref && csPref.groupId && state.sessionId) {
          var prefId = csPref.decision.preference === "prefer-a" ? csPref.imageIdA
            : csPref.decision.preference === "prefer-b" ? csPref.imageIdB : null;
          if (prefId) sessionEngine.setPreferredInGroup(state.sessionId, csPref.groupId, prefId);
        }
        setStatus("Your coaching preference was saved on this device.");
        render();
        return;
      }
      var helpful = t.closest("[data-coach-helpful]");
      if (helpful && state.coachSessionId) {
        coachEngine.markPoint(state.coachSessionId, helpful.getAttribute("data-coach-helpful"), "helpful");
        setStatus("Marked coaching point helpful.");
        render();
        return;
      }
      var dismissPt = t.closest("[data-coach-dismiss-point]");
      if (dismissPt && state.coachSessionId) {
        coachEngine.markPoint(state.coachSessionId, dismissPt.getAttribute("data-coach-dismiss-point"), "dismiss");
        setStatus("Coaching point dismissed for this comparison.");
        render();
        return;
      }
      var evid = t.closest("[data-coach-evidence]");
      if (evid) {
        var eid = evid.getAttribute("data-coach-evidence");
        state.coachEvidenceId = state.coachEvidenceId === eid ? null : eid;
        render();
        return;
      }
      var coachAddBtn = t.closest("[data-coach-add]");
      if (coachAddBtn) { coachAdd(coachAddBtn.getAttribute("data-coach-add")); return; }
      var coachReplaceBtn = t.closest("[data-coach-replace]");
      if (coachReplaceBtn) { coachReplace(coachReplaceBtn.getAttribute("data-coach-replace")); return; }
      if (t.id === "pfc-note-save" && state.coachSessionId) {
        var noteEl = $("pfc-note-input");
        var text = noteEl ? noteEl.value : "";
        var note = coachEngine.addNote(state.coachSessionId, text);
        if (!note) { setStatus("Write a short note first.", true); return; }
        setStatus("Personal note saved on this device.");
        render();
        return;
      }
    });

    document.addEventListener("change", function (ev) {
      var t = ev.target;
      if (!t) return;
      if (t.getAttribute && t.getAttribute("data-role-side") && state.coachSessionId) {
        var cs = coachEngine.get(state.coachSessionId);
        if (!cs) return;
        var side = t.getAttribute("data-role-side");
        var roles = {
          a: side === "a" ? t.value : (cs.decision.roles && cs.decision.roles.a) || null,
          b: side === "b" ? t.value : (cs.decision.roles && cs.decision.roles.b) || null
        };
        coachEngine.setRoles(state.coachSessionId, roles.a, roles.b, true);
        setStatus("Role override saved — coaching suggestions do not overwrite it.");
        render();
      }
    });

    var strip = $("pfa-filmstrip");
    if (strip) {
      strip.addEventListener("keydown", function (ev) {
        if (ev.key !== "ArrowRight" && ev.key !== "ArrowLeft") return;
        var session = currentSession();
        if (!session) return;
        var ids = visibleIds(session);
        var i = ids.indexOf(state.activeImageId);
        if (i < 0) i = 0;
        i = ev.key === "ArrowRight" ? Math.min(ids.length - 1, i + 1) : Math.max(0, i - 1);
        state.activeImageId = ids[i];
        ev.preventDefault();
        render();
      });
    }
  }

  function boot() {
    loadLibrary();
    sessionEngine = Sessions().getShared();
    portfolioEngine = PortfolioEngine().getShared();
    coachEngine = CoachStore().getShared();

    return Promise.all([sessionEngine.init(), portfolioEngine.init(), coachEngine.init()]).then(function () {
      bind();
      try {
        var params = new URLSearchParams(global.location.search);
        var sid = params.get("session");
        var portfolioId = params.get("portfolio");
        var source = params.get("source");
        if (portfolioId && portfolioEngine.get(portfolioId)) {
          state.presetPortfolioId = portfolioId;
          state.presetSource = "library::";
        }
        if (source) state.presetSource = source;
        if (sid && sessionEngine.get(sid)) {
          state.view = "session";
          state.sessionId = sid;
        }
      } catch (e) { /* ignore */ }

      render();
      if (!libraryImages.length) {
        setStatus("Your Photo Library looks empty on this device. Import in Photo Library or review a shoot first — the assistant never invents photographs.");
      }
    });
  }

  global.WaypointScenesPortfolioAssistantUI = {
    boot: boot,
    render: render,
    getState: function () { return state; }
  };
})(typeof window !== "undefined" ? window : globalThis);
