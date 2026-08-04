/**
 * Waypoint Scenes — Auto Portfolio Builder · Workspace UI
 *
 * Presentation only. Engine + session layers are pure/testable without UI.
 */
(function (global) {
  "use strict";

  var Signals = function () { return global.WaypointScenesAssistantSignals; };
  var Catalog = function () { return global.WaypointScenesBuilderCatalog; };
  var Engine = function () { return global.WaypointScenesBuilderEngine; };
  var Sessions = function () { return global.WaypointScenesBuilderSessions; };
  var AssistSessions = function () { return global.WaypointScenesAssistantSessions; };
  var PortfolioEngine = function () { return global.WaypointScenesPortfolioEngine; };
  var PL = function () { return global.WaypointPhotoLibraryStore; };

  var sessionEngine = null;
  var assistSessionEngine = null;
  var portfolioEngine = null;
  var libraryImages = [];
  var collections = [];

  var state = {
    view: "setup",
    sessionId: null,
    tab: "selection",
    previousOrder: null,
    dragFrom: null
  };

  var ROLE_OPTS = [
    "opening", "hero", "supporting", "environmental", "detail",
    "transition", "cover-candidate", "closing", "alternate", "needs-review"
  ];

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setStatus(msg, isError) {
    var el = $("pfb-status");
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

  function confLabel(c) {
    if (c === "higher") return "Higher confidence ●●●";
    if (c === "moderate") return "Moderate confidence ●●○";
    return "Lower confidence ●○○";
  }

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

  function candidateSessions() {
    try {
      return assistSessionEngine ? assistSessionEngine.list() : [];
    } catch (e) {
      return [];
    }
  }

  function sourceContext() {
    return {
      libraryImages: libraryImages,
      collections: collections,
      portfolios: portfolioEngine ? portfolioEngine.list() : [],
      candidateSessions: candidateSessions()
    };
  }

  function currentSession() {
    return state.sessionId ? sessionEngine.get(state.sessionId) : null;
  }

  function sessionImages(s) {
    var byId = {};
    libraryImages.forEach(function (img) { byId[img.id] = img; });
    return (s.imageIds || []).map(function (id) { return byId[id]; }).filter(Boolean);
  }

  function fillPurposeSelect() {
    var sel = $("pfb-purpose");
    if (!sel) return;
    sel.innerHTML = Catalog().PURPOSES.map(function (p) {
      return '<option value="' + esc(p.id) + '">' + esc(p.label) + "</option>";
    }).join("");
    updatePurposeSummary();
  }

  function fillSizeSelect() {
    var sel = $("pfb-size");
    if (!sel) return;
    sel.innerHTML = Catalog().SIZE_PRESETS.map(function (p) {
      return '<option value="' + esc(p.id) + '">' + esc(p.label) + "</option>";
    }).join("");
    sel.value = "medium";
    updateSizeGuide();
  }

  function fillSources() {
    var sel = $("pfb-source");
    if (!sel) return;
    var sources = Signals().listSources(sourceContext());
    sel.innerHTML = sources.map(function (s, i) {
      var val = s.type + "::" + (s.ref || "") + "::" + i;
      return '<option value="' + esc(val) + '" data-type="' + esc(s.type) + '" data-ref="' + esc(s.ref || "") + '">' +
        esc(s.label) + " (" + s.count + ")</option>";
    }).join("");
    $("pfb-empty-lib").hidden = libraryImages.length > 0;
  }

  function fillTargets() {
    var sel = $("pfb-target");
    if (!sel) return;
    var list = portfolioEngine.list();
    sel.innerHTML = list.length
      ? list.map(function (p) {
          return '<option value="' + esc(p.id) + '">' + esc(p.title) + " (" + (p.imageIds || []).length + ")</option>";
        }).join("")
      : '<option value="">No portfolios yet</option>';
  }

  function updatePurposeSummary() {
    var p = Catalog().purposeById($("pfb-purpose").value);
    $("pfb-purpose-summary").textContent = p.summary;
  }

  function updateSizeGuide() {
    var s = Catalog().sizeById($("pfb-size").value);
    $("pfb-size-guide").textContent = s.guide;
    $("pfb-custom-wrap").hidden = s.id !== "custom";
  }

  function updateSaveMode() {
    var mode = $("pfb-save-mode").value;
    $("pfb-target-wrap").hidden = mode !== "rebuild";
  }

  function parseSourceOption() {
    var sel = $("pfb-source");
    var opt = sel.options[sel.selectedIndex];
    if (!opt) return { type: "library", ref: null };
    return { type: opt.getAttribute("data-type") || "library", ref: opt.getAttribute("data-ref") || null };
  }

  function renderResume() {
    var box = $("pfb-resume");
    var list = $("pfb-resume-list");
    var sessions = sessionEngine.list();
    if (!sessions.length) {
      box.hidden = true;
      return;
    }
    box.hidden = false;
    list.innerHTML = sessions.slice(0, 8).map(function (s) {
      return '<li><button type="button" class="pfb-resume__open" data-id="' + esc(s.id) + '">' +
        esc(s.title) + " · " + esc(Catalog().purposeById(s.purposeId).label) +
        " · " + ((s.draft && s.draft.order) || []).length + " images</button></li>";
    }).join("");
  }

  function showView(view) {
    state.view = view;
    $("pfb-setup").hidden = view !== "setup";
    $("pfb-workspace").hidden = view !== "workspace";
  }

  function setTab(tab) {
    state.tab = tab;
    document.querySelectorAll(".pfb-tab").forEach(function (btn) {
      var on = btn.getAttribute("data-tab") === tab;
      btn.setAttribute("aria-selected", on ? "true" : "false");
    });
    document.querySelectorAll(".pfb-panel").forEach(function (panel) {
      panel.hidden = panel.getAttribute("data-panel") !== tab;
    });
    if (tab === "save") renderSavePanel();
  }

  function regenerate(mode, resetDecisions) {
    var s = currentSession();
    if (!s) return;
    if (mode === "rebuild" && !resetDecisions) {
      var ok = global.confirm(
        "Rebuild from scratch will regenerate the suggested draft. Explicit includes, excludes, pins, cover, and swaps are kept unless you confirm a full reset. Continue?"
      );
      if (!ok) return;
    }
    if (resetDecisions) {
      var ok2 = global.confirm(
        "This discards your manual decisions (includes, excludes, pins, cover, roles, swaps) and rebuilds from scratch. Continue?"
      );
      if (!ok2) return;
    }
    sessionEngine.regenerate(s.id, sessionImages(s), {
      mode: mode || "regenerate-remaining",
      resetDecisions: !!resetDecisions,
      clearManualOrder: mode === "rebuild"
    });
    setStatus(mode === "rebuild" ? "Rebuilt suggested draft." : "Regenerated remaining selections.");
    renderWorkspace();
  }

  function renderWorkspace() {
    var s = currentSession();
    if (!s || !s.draft) return;
    showView("workspace");
    $("pfb-source-label").textContent = (s.source && s.source.label) || "Source";
    $("pfb-session-message").textContent = s.draft.message || s.message || "";
    var lim = s.draft.limitations || [];
    $("pfb-draft-limitations").hidden = !lim.length;
    $("pfb-draft-limitations-list").innerHTML = lim.map(function (t) {
      return "<li>" + esc(t) + "</li>";
    }).join("");
    renderSelection(s);
    renderSequence(s);
    renderAlternatives(s);
    setTab(state.tab);
  }

  function renderSelection(s) {
    var draft = s.draft;
    var grid = $("pfb-selection-grid");
    var order = draft.order || [];
    if (!order.length) {
      grid.innerHTML = '<p class="pf-hint">No photographs in this suggested draft yet. Adjust exclusions or choose another source.</p>';
    } else {
      grid.innerHTML = order.map(function (id) {
        var img = libraryById(id);
        var ex = (draft.explanations && draft.explanations[id]) || {};
        var roles = ex.roles || draft.roles[id] || [];
        var isCover = draft.coverImageId === id;
        return '<article class="pfb-card" data-id="' + esc(id) + '" tabindex="0">' +
          '<div class="pfb-card__media">' + thumbHtml(img, img && img.filename) + "</div>" +
          "<strong>" + esc((img && img.filename) || id.slice(0, 8)) + "</strong>" +
          '<div class="pfb-card__meta">' + esc(ex.label || "Suggested draft selection") +
          (isCover ? " · Cover candidate" : "") + "</div>" +
          '<div class="pfb-conf">' + esc(confLabel(ex.confidence || "lower")) + "</div>" +
          '<div class="pfb-card__roles">' + roles.map(function (r) {
            return '<span class="pfb-role">' + esc(Catalog().roleLabel(r)) + "</span>";
          }).join("") + "</div>" +
          '<ul class="pfb-card__reasons">' + (ex.reasons || []).map(function (r) {
            return "<li>" + esc(r) + "</li>";
          }).join("") + "</ul>" +
          '<div class="pfb-card__actions">' +
          '<button type="button" data-act="exclude" data-id="' + esc(id) + '">Exclude</button>' +
          '<button type="button" data-act="cover" data-id="' + esc(id) + '">Set cover</button>' +
          '<button type="button" data-act="opening" data-id="' + esc(id) + '">Opening</button>' +
          '<button type="button" data-act="closing" data-id="' + esc(id) + '">Closing</button>' +
          '<label class="wds-sr-only" for="pfb-role-' + esc(id) + '">Role</label>' +
          '<select id="pfb-role-' + esc(id) + '" data-act="role" data-id="' + esc(id) + '">' +
          ROLE_OPTS.map(function (r) {
            var sel = roles.indexOf(r) >= 0 ? " selected" : "";
            return '<option value="' + esc(r) + '"' + sel + ">" + esc(Catalog().roleLabel(r)) + "</option>";
          }).join("") +
          "</select></div></article>";
      }).join("");
    }

    var omitted = draft.omitted || [];
    $("pfb-omitted-list").innerHTML = omitted.length
      ? omitted.slice(0, 40).map(function (om) {
          var img = libraryById(om.imageId);
          return '<div class="pfb-omitted-item">' +
            "<strong>" + esc((img && img.filename) || om.imageId.slice(0, 8)) + "</strong>" +
            "<div>" + esc(om.reason) + "</div>" +
            (om.kind === "similarity" || om.kind === "size-trim"
              ? '<button type="button" class="wds-btn wds-btn--ghost" data-act="include-omitted" data-id="' + esc(om.imageId) + '">Include anyway</button>'
              : "") +
            "</div>";
        }).join("")
      : '<p class="pf-hint">No omitted high-ranking frames for this draft.</p>';
  }

  function renderSequence(s) {
    var draft = s.draft;
    var list = $("pfb-sequence-list");
    var order = draft.order || [];
    var pinned = (s.decisions && s.decisions.pinnedOrder) || {};
    list.innerHTML = order.map(function (id, idx) {
      var img = libraryById(id);
      var isPin = pinned[id] != null;
      return '<li class="pfb-seq-item' + (isPin ? " is-pinned" : "") + '" data-id="' + esc(id) + '" draggable="true">' +
        '<span class="pfb-seq-item__pos" aria-hidden="true"></span>' +
        '<div class="pfb-seq-item__thumb">' + thumbHtml(img) + "</div>" +
        '<div class="pfb-seq-item__body"><strong>' + esc((img && img.filename) || id.slice(0, 8)) + "</strong>" +
        '<span class="pfb-card__meta">' + (draft.coverImageId === id ? "Cover · " : "") +
        esc(((draft.roles[id] || []).map(Catalog().roleLabel).join(", ")) || "Role unset") +
        "</span></div>" +
        '<div class="pfb-seq-item__controls">' +
        '<button type="button" class="pfb-seq-item__btn" data-act="move-up" data-id="' + esc(id) + '" ' + (idx === 0 ? "disabled" : "") + '>Move up</button>' +
        '<button type="button" class="pfb-seq-item__btn" data-act="move-down" data-id="' + esc(id) + '" ' + (idx === order.length - 1 ? "disabled" : "") + '>Move down</button>' +
        '<button type="button" class="pfb-seq-item__btn" data-act="pin" data-id="' + esc(id) + '">' + (isPin ? "Unpin" : "Pin") + "</button>" +
        "</div></li>";
    }).join("");
  }

  function renderAlternatives(s) {
    var alts = (s.draft && s.draft.alternatives) || [];
    var box = $("pfb-alternatives-list");
    if (!alts.length) {
      box.innerHTML = '<p class="pf-hint">No alternatives for this draft yet.</p>';
      return;
    }
    box.innerHTML = alts.map(function (alt) {
      var cands = (alt.candidates || []).filter(Boolean);
      if (!cands.length) return "";
      return '<div class="pfb-alt-block"><h3 class="pf-section-title">' + esc(alt.label) + "</h3>" +
        (alt.forImageId ? '<p class="pf-hint">For: ' + esc((libraryById(alt.forImageId) || {}).filename || alt.forImageId.slice(0, 8)) + "</p>" : "") +
        '<div class="pfb-alt-cands">' + cands.map(function (cid) {
          var img = libraryById(cid);
          return '<div class="pfb-alt-cand">' + thumbHtml(img) +
            '<button type="button" class="wds-btn wds-btn--ghost" data-act="swap" data-from="' + esc(alt.forImageId || "") + '" data-to="' + esc(cid) + '">Swap in</button></div>';
        }).join("") + "</div></div>";
    }).join("");
  }

  function renderSavePanel() {
    var s = currentSession();
    if (!s) return;
    $("pfb-save-title").value = s.title || "Untitled portfolio";
    var purpose = Catalog().purposeById(s.purposeId);
    if (!$("pfb-save-desc").value) $("pfb-save-desc").value = purpose.summary || "";
    var preview = $("pfb-rebuild-preview");
    if (s.saveMode === "rebuild" && s.targetPortfolioId) {
      var pf = portfolioEngine.get(s.targetPortfolioId);
      var diff = Engine().diffAgainstPortfolio(pf, s.draft);
      preview.hidden = false;
      $("pfb-rebuild-summary").textContent =
        "Additions: " + diff.additions.length +
        " · Removals: " + diff.removals.length +
        " · Order changes: " + (diff.orderChanged ? "yes" : "no") +
        " · Cover changes: " + (diff.coverChanged ? "yes" : "no") +
        " (" + diff.currentCount + " → " + diff.nextCount + ").";
    } else {
      preview.hidden = true;
    }
  }

  function moveInOrder(id, dir) {
    var s = currentSession();
    if (!s || !s.draft) return;
    var order = (s.draft.order || []).slice();
    var i = order.indexOf(id);
    var j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    var tmp = order[i];
    order[i] = order[j];
    order[j] = tmp;
    state.previousOrder = (s.draft.order || []).slice();
    sessionEngine.setManualOrder(s.id, order);
    renderWorkspace();
  }

  function togglePin(id) {
    var s = currentSession();
    if (!s) return;
    var pinned = Object.assign({}, s.decisions.pinnedOrder || {});
    var order = s.draft.order || [];
    if (pinned[id] != null) delete pinned[id];
    else pinned[id] = order.indexOf(id);
    sessionEngine.updateDecisions(s.id, { pinnedOrder: pinned });
    renderWorkspace();
  }

  function saveApproved() {
    var s = currentSession();
    if (!s || !s.draft || !(s.draft.order || []).length) {
      setStatus("Nothing to save — generate a draft with photographs first.", true);
      return;
    }
    var fields = {
      title: $("pfb-save-title").value.trim() || "Untitled portfolio",
      description: $("pfb-save-desc").value.trim() || null,
      notes: $("pfb-save-notes").value.trim() || null,
      purpose: Catalog().purposeById(s.purposeId).label
    };
    var input = sessionEngine.toPortfolioInput(s, fields);

    if (s.saveMode === "rebuild" && s.targetPortfolioId) {
      var ok = global.confirm(
        "Apply these approved changes to the existing portfolio? This replaces membership and order with your approved draft. Cancel leaves it untouched."
      );
      if (!ok) {
        setStatus("Rebuild cancelled — existing portfolio unchanged.");
        return;
      }
      var pf = portfolioEngine.get(s.targetPortfolioId);
      if (!pf) {
        setStatus("Target portfolio missing.", true);
        return;
      }
      // Replace membership explicitly
      var current = (pf.imageIds || []).slice();
      current.forEach(function (id) {
        if ((input.imageIds || []).indexOf(id) < 0) portfolioEngine.removeImage(pf.id, id);
      });
      portfolioEngine.addImages(pf.id, input.imageIds, { source: "suggestion", selectionRationale: "Approved builder draft" });
      portfolioEngine.reorderImages(pf.id, input.imageIds);
      if (input.coverImageId) portfolioEngine.setCover(pf.id, input.coverImageId);
      portfolioEngine.updatePortfolio(pf.id, {
        title: fields.title,
        description: fields.description,
        purpose: fields.purpose,
        notes: fields.notes
      });
      setStatus("Approved changes applied to existing portfolio.");
      global.location.href = "./";
      return;
    }

    portfolioEngine.createPortfolio(input);
    setStatus("Saved as a new portfolio.");
    global.location.href = "./";
  }

  function generateDraft() {
    var spec = parseSourceOption();
    var resolved = Signals().resolveSource(spec, sourceContext());
    if (!resolved.images.length) {
      setStatus("That source has no photographs on this device.", true);
      return;
    }
    var saveMode = $("pfb-save-mode").value;
    var targetId = saveMode === "rebuild" ? $("pfb-target").value || null : null;
    if (saveMode === "rebuild" && !targetId) {
      setStatus("Choose an existing portfolio to rebuild, or switch to save as new.", true);
      return;
    }
    var s = sessionEngine.startSession({
      source: { type: resolved.type, ref: resolved.ref, label: resolved.label },
      images: resolved.images,
      purposeId: $("pfb-purpose").value,
      sizeId: $("pfb-size").value,
      customCount: Number($("pfb-custom-count").value) || 12,
      title: "Draft · " + resolved.label,
      saveMode: saveMode,
      targetPortfolioId: targetId
    });
    state.sessionId = s.id;
    state.tab = "selection";
    state.previousOrder = null;
    setStatus("Suggested draft generated — review before saving.");
    renderWorkspace();
  }

  function bind() {
    $("pfb-purpose").addEventListener("change", updatePurposeSummary);
    $("pfb-size").addEventListener("change", updateSizeGuide);
    $("pfb-save-mode").addEventListener("change", updateSaveMode);
    $("pfb-generate").addEventListener("click", generateDraft);
    $("pfb-new").addEventListener("click", function () {
      showView("setup");
      state.sessionId = null;
      renderResume();
      setStatus("");
    });
    $("pfb-regen-remaining").addEventListener("click", function () {
      regenerate("regenerate-remaining", false);
    });
    $("pfb-rebuild").addEventListener("click", function () {
      regenerate("rebuild", false);
    });
    $("pfb-apply-seq").addEventListener("click", function () {
      var s = currentSession();
      if (!s) return;
      state.previousOrder = (s.draft.order || []).slice();
      sessionEngine.updateDecisions(s.id, { manualOrder: null, sequenceApplied: true });
      sessionEngine.regenerate(s.id, sessionImages(s), { mode: "regenerate-remaining", clearManualOrder: true });
      setStatus("Proposed sequence applied.");
      renderWorkspace();
    });
    $("pfb-undo-seq").addEventListener("click", function () {
      var s = currentSession();
      if (!s || !state.previousOrder) {
        setStatus("No previous order to restore.", true);
        return;
      }
      sessionEngine.setManualOrder(s.id, state.previousOrder.slice());
      setStatus("Restored previous order.");
      renderWorkspace();
    });
    $("pfb-regen-unpinned").addEventListener("click", function () {
      regenerate("regenerate-remaining", false);
    });
    $("pfb-save-confirm").addEventListener("click", saveApproved);
    $("pfb-save-cancel").addEventListener("click", function () {
      setStatus("Save cancelled — draft kept locally, portfolio unchanged.");
      setTab("selection");
    });

    document.querySelectorAll(".pfb-tab").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setTab(btn.getAttribute("data-tab"));
      });
    });

    $("pfb-resume-list").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-id]");
      if (!btn) return;
      state.sessionId = btn.getAttribute("data-id");
      state.tab = "selection";
      renderWorkspace();
    });

    function onAction(e) {
      var t = e.target;
      if (!t || !t.getAttribute) return;
      var act = t.getAttribute("data-act");
      if (!act) return;
      var s = currentSession();
      if (!s) return;
      var id = t.getAttribute("data-id");

      if (act === "exclude") {
        var ex = (s.decisions.excludeIds || []).slice();
        if (ex.indexOf(id) < 0) ex.push(id);
        var inc = (s.decisions.includeIds || []).filter(function (x) { return x !== id; });
        sessionEngine.updateDecisions(s.id, { excludeIds: ex, includeIds: inc });
        sessionEngine.regenerate(s.id, sessionImages(s), { mode: "regenerate-remaining" });
        renderWorkspace();
      } else if (act === "include-omitted") {
        var includeIds = (s.decisions.includeIds || []).slice();
        if (includeIds.indexOf(id) < 0) includeIds.push(id);
        var excludeIds = (s.decisions.excludeIds || []).filter(function (x) { return x !== id; });
        sessionEngine.updateDecisions(s.id, { includeIds: includeIds, excludeIds: excludeIds });
        sessionEngine.regenerate(s.id, sessionImages(s), { mode: "regenerate-remaining" });
        renderWorkspace();
      } else if (act === "cover") {
        sessionEngine.updateDecisions(s.id, { coverImageId: id });
        sessionEngine.regenerate(s.id, sessionImages(s), { mode: "regenerate-remaining" });
        renderWorkspace();
      } else if (act === "opening") {
        sessionEngine.updateDecisions(s.id, { openingImageId: id });
        sessionEngine.regenerate(s.id, sessionImages(s), { mode: "regenerate-remaining" });
        renderWorkspace();
      } else if (act === "closing") {
        sessionEngine.updateDecisions(s.id, { closingImageId: id });
        sessionEngine.regenerate(s.id, sessionImages(s), { mode: "regenerate-remaining" });
        renderWorkspace();
      } else if (act === "role") {
        var roles = Object.assign({}, s.decisions.roles || {});
        roles[id] = [t.value];
        sessionEngine.updateDecisions(s.id, { roles: roles });
        sessionEngine.regenerate(s.id, sessionImages(s), { mode: "regenerate-remaining" });
        renderWorkspace();
      } else if (act === "move-up") {
        moveInOrder(id, -1);
      } else if (act === "move-down") {
        moveInOrder(id, 1);
      } else if (act === "pin") {
        togglePin(id);
      } else if (act === "swap") {
        var fromId = t.getAttribute("data-from");
        var toId = t.getAttribute("data-to");
        sessionEngine.swapIn(s.id, fromId, toId);
        sessionEngine.regenerate(s.id, sessionImages(s), { mode: "regenerate-remaining" });
        setStatus("Alternative swapped in — persists through regeneration.");
        renderWorkspace();
      }
    }

    $("pfb-panel-selection").addEventListener("click", onAction);
    $("pfb-panel-selection").addEventListener("change", onAction);
    $("pfb-panel-sequence").addEventListener("click", onAction);
    $("pfb-panel-alternatives").addEventListener("click", onAction);

    // Drag reorder (desktop)
    var seq = $("pfb-sequence-list");
    seq.addEventListener("dragstart", function (e) {
      var li = e.target.closest(".pfb-seq-item");
      if (!li) return;
      state.dragFrom = li.getAttribute("data-id");
      e.dataTransfer.effectAllowed = "move";
    });
    seq.addEventListener("dragover", function (e) {
      e.preventDefault();
    });
    seq.addEventListener("drop", function (e) {
      e.preventDefault();
      var li = e.target.closest(".pfb-seq-item");
      if (!li || !state.dragFrom) return;
      var s = currentSession();
      if (!s) return;
      var order = (s.draft.order || []).slice();
      var from = order.indexOf(state.dragFrom);
      var to = order.indexOf(li.getAttribute("data-id"));
      if (from < 0 || to < 0 || from === to) return;
      state.previousOrder = order.slice();
      order.splice(to, 0, order.splice(from, 1)[0]);
      sessionEngine.setManualOrder(s.id, order);
      state.dragFrom = null;
      renderWorkspace();
    });
  }

  function boot() {
    loadLibrary();
    portfolioEngine = PortfolioEngine().getShared();
    return portfolioEngine.init().then(function () {
      sessionEngine = Sessions().create();
      return sessionEngine.init();
    }).then(function () {
      assistSessionEngine = AssistSessions().create();
      return assistSessionEngine.init();
    }).then(function () {
      fillPurposeSelect();
      fillSizeSelect();
      fillSources();
      fillTargets();
      updateSaveMode();
      renderResume();
      bind();
      showView("setup");
      if (!libraryImages.length) setStatus("Photo Library is empty on this device — import photographs to begin.");
    });
  }

  global.WaypointScenesPortfolioBuilderUI = { boot: boot };
})(typeof window !== "undefined" ? window : globalThis);
