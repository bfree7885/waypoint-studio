/**
 * Scenes Portfolio workspace UI
 */
(function (global) {
  "use strict";

  var engine = null;
  var libraryImages = [];
  var state = {
    view: "list", // list | editor
    activeId: null,
    status: "",
    pickerOpen: false,
    confirmDeleteId: null
  };

  function $(id) {
    return document.getElementById(id);
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setStatus(msg, isError) {
    var el = $("pf-status");
    if (!el) return;
    if (!msg) {
      el.hidden = true;
      el.textContent = "";
      return;
    }
    el.hidden = false;
    el.textContent = msg;
    el.classList.toggle("is-error", !!isError);
  }

  function libraryById(id) {
    for (var i = 0; i < libraryImages.length; i++) {
      if (libraryImages[i].id === id) return libraryImages[i];
    }
    return null;
  }

  function thumbHtml(img, alt) {
    if (img && img.media && img.media.thumbnailDataUrl) {
      return (
        '<img src="' +
        esc(img.media.thumbnailDataUrl) +
        '" alt="' +
        esc(alt || img.filename || "Photograph") +
        '" loading="lazy" decoding="async">'
      );
    }
    return (
      '<div class="pf-thumb-fallback" role="img" aria-label="' +
      esc(alt || (img && img.filename) || "Photograph") +
      '">' +
      esc((img && img.filename) || "No preview") +
      "</div>"
    );
  }

  function loadLibrary() {
    libraryImages = [];
    try {
      var Store = global.WaypointPhotoLibraryStore;
      var Models = global.WaypointPhotoLibraryModels;
      if (Store && Store.loadIndex) {
        libraryImages = Store.loadIndex() || [];
      } else if (Models && Models.createLibraryImage) {
        libraryImages = [];
      }
    } catch (e) {
      libraryImages = [];
    }
  }

  function renderList() {
    var root = $("pf-list");
    var empty = $("pf-empty");
    var editor = $("pf-editor");
    if (!root || !empty || !editor) return;

    editor.hidden = true;
    root.hidden = false;

    var list = engine.list();
    if (!list.length) {
      empty.hidden = false;
      root.innerHTML = "";
      return;
    }
    empty.hidden = true;
    root.innerHTML = list
      .map(function (p) {
        var cover = p.coverImageId ? libraryById(p.coverImageId) : null;
        return (
          '<article class="pf-card">' +
          '<button type="button" class="pf-card__open" data-open="' +
          esc(p.id) +
          '">' +
          '<div class="pf-card__media">' +
          thumbHtml(cover, p.title) +
          "</div>" +
          '<div class="pf-card__body">' +
          "<h3>" +
          esc(p.title) +
          "</h3>" +
          (p.purpose
            ? '<p class="pf-card__purpose">' + esc(p.purpose) + "</p>"
            : "") +
          '<p class="pf-card__meta">' +
          p.imageIds.length +
          " photograph" +
          (p.imageIds.length === 1 ? "" : "s") +
          " · updated " +
          esc((p.updatedAt || "").slice(0, 10) || "—") +
          "</p>" +
          "</div>" +
          "</button>" +
          '<div class="pf-card__actions">' +
          '<button type="button" class="wds-btn wds-btn--ghost" data-open="' +
          esc(p.id) +
          '">Open</button>' +
          '<button type="button" class="wds-btn wds-btn--ghost pf-danger" data-delete="' +
          esc(p.id) +
          '">Delete</button>' +
          "</div>" +
          "</article>"
        );
      })
      .join("");
  }

  function renderEditor() {
    var p = engine.get(state.activeId);
    var root = $("pf-list");
    var empty = $("pf-empty");
    var editor = $("pf-editor");
    if (!p || !editor) {
      state.view = "list";
      render();
      return;
    }
    if (root) root.hidden = true;
    if (empty) empty.hidden = true;
    editor.hidden = false;

    $("pf-title").value = p.title || "";
    $("pf-purpose").value = p.purpose || "";
    $("pf-description").value = p.description || "";
    $("pf-notes").value = p.notes || "";

    var reviewLink = $("pf-review-candidates");
    if (reviewLink) {
      reviewLink.setAttribute("href", "assistant.html?portfolio=" + encodeURIComponent(p.id));
    }

    var grid = $("pf-selected");
    if (!p.imageIds.length) {
      grid.innerHTML =
        '<p class="pf-hint">No photographs in this portfolio yet. Add from your library — suggestions appear when labels or analysis exist.</p>';
    } else {
      grid.innerHTML = p.imageIds
        .map(function (id, index) {
          var img = libraryById(id);
          var isCover = p.coverImageId === id;
          var item = (p.items || []).filter(function (it) {
            return it.imageId === id;
          })[0];
          return (
            '<li class="pf-shot" data-image-id="' +
            esc(id) +
            '">' +
            '<div class="pf-shot__media">' +
            thumbHtml(img, img && img.filename) +
            (isCover ? '<span class="pf-shot__badge">Cover</span>' : "") +
            "</div>" +
            '<div class="pf-shot__meta">' +
            "<strong>" +
            esc((img && img.filename) || "Missing library image") +
            "</strong>" +
            (item && item.selectionRationale
              ? '<p class="pf-shot__why">' + esc(item.selectionRationale) + "</p>"
              : "") +
            (!img
              ? '<p class="pf-shot__why">This reference is missing from the local library.</p>'
              : "") +
            "</div>" +
            '<div class="pf-shot__actions">' +
            '<button type="button" class="wds-btn wds-btn--ghost" data-cover="' +
            esc(id) +
            '" ' +
            (isCover ? "disabled" : "") +
            ">Set cover</button>" +
            '<button type="button" class="wds-btn wds-btn--ghost" data-up="' +
            esc(id) +
            '" ' +
            (index === 0 ? "disabled" : "") +
            ' aria-label="Move earlier">↑</button>' +
            '<button type="button" class="wds-btn wds-btn--ghost" data-down="' +
            esc(id) +
            '" ' +
            (index === p.imageIds.length - 1 ? "disabled" : "") +
            ' aria-label="Move later">↓</button>' +
            '<button type="button" class="wds-btn wds-btn--ghost pf-danger" data-remove="' +
            esc(id) +
            '">Remove</button>' +
            "</div>" +
            "</li>"
          );
        })
        .join("");
    }

    renderSuggestions();
    renderPicker();
  }

  function renderSuggestions() {
    var box = $("pf-suggestions");
    if (!box) return;
    var result = engine.suggestForPortfolio(state.activeId, libraryImages);
    if (result.status === "insufficient-data") {
      box.innerHTML =
        '<p class="pf-hint" role="status">' + esc(result.message) + "</p>";
      return;
    }
    if (!result.suggestions.length) {
      box.innerHTML =
        '<p class="pf-hint" role="status">' + esc(result.message) + "</p>";
      return;
    }
    box.innerHTML =
      '<p class="pf-hint">' +
      esc(result.message) +
      "</p>" +
      '<ul class="pf-suggest-list">' +
      result.suggestions
        .slice(0, 12)
        .map(function (s) {
          var img = libraryById(s.imageId);
          return (
            '<li class="pf-suggest">' +
            '<div class="pf-suggest__media">' +
            thumbHtml(img, img && img.filename) +
            "</div>" +
            '<div class="pf-suggest__body">' +
            '<p class="pf-suggest__label">' +
            esc(s.label) +
            "</p>" +
            "<p>" +
            esc(s.explanation) +
            "</p>" +
            '<button type="button" class="wds-btn wds-btn--primary" data-add-suggest="' +
            esc(s.imageId) +
            '" data-rationale="' +
            esc(s.explanation) +
            '">Add to portfolio</button>' +
            "</div>" +
            "</li>"
          );
        })
        .join("") +
      "</ul>";
  }

  function renderPicker() {
    var panel = $("pf-picker");
    if (!panel) return;
    panel.hidden = !state.pickerOpen;
    if (!state.pickerOpen) return;

    var p = engine.get(state.activeId);
    var selected = {};
    if (p) {
      p.imageIds.forEach(function (id) {
        selected[id] = true;
      });
    }

    if (!libraryImages.length) {
      panel.innerHTML =
        '<p class="pf-hint">Your Photo Library is empty on this device. <a href="../../photo-library/">Import photographs</a> first, then return here.</p>';
      return;
    }

    panel.innerHTML =
      '<div class="pf-picker__toolbar">' +
      '<p class="pf-hint">Choose from your private library. Rejected frames stay hidden unless you clear that label in the library.</p>' +
      '<button type="button" class="wds-btn wds-btn--ghost" id="pf-picker-close">Close</button>' +
      "</div>" +
      '<ul class="pf-picker__grid">' +
      libraryImages
        .filter(function (img) {
          return img.selectionLabel !== "reject";
        })
        .map(function (img) {
          var inSet = !!selected[img.id];
          return (
            '<li class="pf-picker__item' +
            (inSet ? " is-in" : "") +
            '">' +
            '<div class="pf-picker__media">' +
            thumbHtml(img, img.filename) +
            "</div>" +
            "<p>" +
            esc(img.filename) +
            "</p>" +
            (inSet
              ? '<span class="pf-pill">In portfolio</span>'
              : '<button type="button" class="wds-btn wds-btn--ghost" data-add-manual="' +
                esc(img.id) +
                '">Add</button>') +
            "</li>"
          );
        })
        .join("") +
      "</ul>";
  }

  function renderConfirm() {
    var dlg = $("pf-confirm");
    if (!dlg) return;
    if (!state.confirmDeleteId) {
      dlg.hidden = true;
      return;
    }
    var p = engine.get(state.confirmDeleteId);
    dlg.hidden = false;
    $("pf-confirm-text").textContent = p
      ? 'Delete “' + p.title + '”? This removes the portfolio only — photographs stay in your library.'
      : "Delete this portfolio? Photographs stay in your library.";
  }

  function render() {
    if (state.view === "editor" && state.activeId) renderEditor();
    else renderList();
    renderConfirm();
  }

  function saveFields() {
    if (!state.activeId) return;
    engine.updatePortfolio(state.activeId, {
      title: $("pf-title").value,
      purpose: $("pf-purpose").value,
      description: $("pf-description").value,
      notes: $("pf-notes").value
    });
    setStatus("Saved on this device.");
  }

  function openPortfolio(id) {
    state.view = "editor";
    state.activeId = id;
    state.pickerOpen = false;
    setStatus("");
    render();
    var title = $("pf-title");
    if (title) title.focus();
  }

  function bind() {
    var createBtn = $("pf-create");
    if (createBtn) {
      createBtn.addEventListener("click", function () {
        var p = engine.createPortfolio({
          title: "New portfolio",
          purpose: ""
        });
        openPortfolio(p.id);
        setStatus("Portfolio created. Name it and add photographs.");
      });
    }

    var back = $("pf-back");
    if (back) {
      back.addEventListener("click", function () {
        saveFields();
        state.view = "list";
        state.activeId = null;
        state.pickerOpen = false;
        render();
      });
    }

    ["pf-title", "pf-purpose", "pf-description", "pf-notes"].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener("change", saveFields);
      el.addEventListener("blur", saveFields);
    });

    var saveBtn = $("pf-save");
    if (saveBtn) saveBtn.addEventListener("click", saveFields);

    var addBtn = $("pf-open-picker");
    if (addBtn) {
      addBtn.addEventListener("click", function () {
        state.pickerOpen = true;
        renderPicker();
      });
    }

    document.addEventListener("click", function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;
      var open = t.closest("[data-open]");
      if (open) {
        openPortfolio(open.getAttribute("data-open"));
        return;
      }
      var del = t.closest("[data-delete]");
      if (del) {
        state.confirmDeleteId = del.getAttribute("data-delete");
        renderConfirm();
        return;
      }
      if (t.id === "pf-confirm-cancel") {
        state.confirmDeleteId = null;
        renderConfirm();
        return;
      }
      if (t.id === "pf-confirm-ok") {
        if (state.confirmDeleteId) {
          engine.deletePortfolio(state.confirmDeleteId);
          if (state.activeId === state.confirmDeleteId) {
            state.activeId = null;
            state.view = "list";
          }
          state.confirmDeleteId = null;
          setStatus("Portfolio deleted. Photographs remain in your library.");
          render();
        }
        return;
      }
      if (t.id === "pf-picker-close") {
        state.pickerOpen = false;
        renderPicker();
        return;
      }
      var addM = t.closest("[data-add-manual]");
      if (addM) {
        engine.addImages(state.activeId, [addM.getAttribute("data-add-manual")], {
          source: "manual"
        });
        setStatus("Photograph added.");
        render();
        return;
      }
      var addS = t.closest("[data-add-suggest]");
      if (addS) {
        engine.addImages(state.activeId, [addS.getAttribute("data-add-suggest")], {
          source: "suggestion",
          selectionRationale: addS.getAttribute("data-rationale") || null
        });
        setStatus("Suggested photograph added.");
        render();
        return;
      }
      var rem = t.closest("[data-remove]");
      if (rem) {
        engine.removeImage(state.activeId, rem.getAttribute("data-remove"));
        setStatus("Removed from portfolio.");
        render();
        return;
      }
      var cover = t.closest("[data-cover]");
      if (cover) {
        engine.setCover(state.activeId, cover.getAttribute("data-cover"));
        setStatus("Cover updated.");
        render();
        return;
      }
      var up = t.closest("[data-up]");
      if (up) {
        engine.moveImage(state.activeId, up.getAttribute("data-up"), -1);
        render();
        return;
      }
      var down = t.closest("[data-down]");
      if (down) {
        engine.moveImage(state.activeId, down.getAttribute("data-down"), 1);
        render();
      }
    });
  }

  function boot() {
    loadLibrary();
    engine = global.WaypointScenesPortfolioEngine.getShared();
    return engine.init().then(function () {
      bind();
      // Deep link ?id=
      try {
        var params = new URLSearchParams(global.location.search);
        var id = params.get("id");
        if (id && engine.get(id)) {
          state.view = "editor";
          state.activeId = id;
        }
      } catch (e) {
        /* ignore */
      }
      render();
      setStatus(
        libraryImages.length
          ? ""
          : "Library looks empty on this device. Import in Photo Library when you’re ready — portfolios never invent photographs."
      );
    });
  }

  global.WaypointScenesPortfolioUI = {
    boot: boot,
    render: render,
    getState: function () {
      return state;
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
