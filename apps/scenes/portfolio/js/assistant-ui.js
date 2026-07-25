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
  var PortfolioEngine = function () { return global.WaypointScenesPortfolioEngine; };
  var PL = function () { return global.WaypointPhotoLibraryStore; };

  var sessionEngine = null;
  var portfolioEngine = null;
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
    presetSource: null
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

    wrap.innerHTML =
      '<div class="pfa-group__head">' +
      "<h2 class=\"pf-section-title\">Compare similar frames</h2>" +
      '<button type="button" class="wds-btn wds-btn--ghost" id="pfa-group-close">Close</button>' +
      "</div>" +
      '<p class="pf-hint">' + esc(group.reason) + " Choose a preferred frame, keep several, or dismiss — nothing is deleted.</p>" +
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
            '<button type="button" class="wds-btn wds-btn--ghost pf-danger" data-mark="excluded" data-id="' + esc(id) + '">Dismiss</button>' +
            "</div>" +
            "</li>";
        })
        .join("") +
      "</ul>";
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

  function addToPortfolio(imageId) {
    var sel = $("pfa-add-select");
    var choice = sel ? sel.value : "";
    if (!choice) { setStatus("Choose a portfolio first.", true); return; }
    var session = currentSession();
    var rec = session && session.recommendations[imageId];
    var rationale = rec && rec.rationale && rec.rationale.length ? rec.rationale[0] : null;

    var portfolioId = choice;
    if (choice === "__new__") {
      var created = portfolioEngine.createPortfolio({ title: (session.source && session.source.label) || "New portfolio" });
      portfolioId = created.id;
    }
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
      state.view = "start"; state.sessionId = null; state.groupOpenId = null; render();
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

    return Promise.all([sessionEngine.init(), portfolioEngine.init()]).then(function () {
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
