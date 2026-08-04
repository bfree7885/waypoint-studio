/**
 * Scene Detail / Shoot Review Workspace UI.
 *
 * Includes a windowed (virtualized) photo grid so large shoots never load
 * hundreds of full-resolution images at once — only visible thumbnails plus a
 * small buffer are materialized in the DOM.
 */
(function (global) {
  "use strict";

  var F = null;
  var Engine = null;
  var Models = null;

  var state = {
    scene: null,
    summary: null,
    selectedId: null,
    thumbSize: "md", // sm | md | lg
    visibleStart: 0,
    visibleEnd: 0
  };

  var mounts = {};
  var GRID = {
    sm: { min: 72, gap: 6 },
    md: { min: 110, gap: 8 },
    lg: { min: 160, gap: 10 }
  };
  var BUFFER_ROWS = 2;

  function $(id) { return global.document.getElementById(id); }

  function sceneIdFromUrl() {
    try {
      var q = new URLSearchParams(global.location.search);
      return q.get("id") || q.get("sceneId");
    } catch (e) {
      return null;
    }
  }

  /* ---------- Header / summary / actions ---------- */

  function renderHero(scene) {
    if (!mounts.hero) return;
    var cover = scene.coverImageUrl || scene.thumbnailUrl || "";
    var fav = scene.favoriteImageId
      ? '<span class="sd-hero__fav" title="Favorite frame marked">★ Favorite marked</span>'
      : "";
    mounts.hero.innerHTML =
      '<div class="sd-hero__cover" style="background-image:url(\'' + F.escapeHtml(cover) + '\')" role="img" aria-label="Cover photograph for ' + F.escapeHtml(scene.title) + '"></div>' +
      '<div class="sd-hero__copy">' +
        '<p class="sd-hero__eyebrow"><a href="../library/">Scene Library</a> · Shoot Review</p>' +
        '<h1 class="sd-hero__title">' + F.escapeHtml(scene.title) + "</h1>" +
        '<p class="sd-hero__meta">' +
          F.escapeHtml(F.photoCountLabel(scene.photoCount)) +
          (scene.camera ? " · " + F.escapeHtml(scene.camera) : "") +
          " · " + F.escapeHtml(F.formatLongDate(scene.captureDate || scene.createdDate)) +
        "</p>" +
        (scene.location ? '<p class="sd-hero__meta">' + F.escapeHtml(scene.location) + "</p>" : "") +
        fav +
      "</div>";
  }

  function renderQuickSummary(scene, summary) {
    if (!mounts.summary) return;
    var rows = [];
    rows.push(["Photographs", String(summary.photoCount)]);
    if (scene.camera) rows.push(["Camera", scene.camera]);
    if (scene.lens) rows.push(["Lens", scene.lens]);
    if (summary.timeText) {
      rows.push(["Time span", "Mostly photographed between " + summary.timeText + "."]);
    }
    if (summary.focalLengths && summary.focalLengths.length) {
      rows.push(["Primary focal lengths", summary.focalLengths.map(function (f) { return f + "mm"; }).join(" · ")]);
    }
    if (summary.isoRange) {
      rows.push(["ISO", summary.isoRange.min + "–" + summary.isoRange.max]);
    }
    if (scene.location) rows.push(["Location", scene.location]);
    if (scene.favoriteImageId) {
      var fav = Models.findPhoto(scene, scene.favoriteImageId);
      rows.push(["Favorite image", fav ? fav.filename : "Marked"]);
    }
    rows.push(["Weather", "Placeholder — not available yet"]);
    rows.push(["AI observations", "Placeholder — not available yet"]);

    mounts.summary.innerHTML =
      '<h2 class="sd-section-title" id="sd-summary-title">Quick summary</h2>' +
      '<dl class="sd-summary">' +
        rows.map(function (r) {
          return "<div><dt>" + F.escapeHtml(r[0]) + "</dt><dd>" + F.escapeHtml(r[1]) + "</dd></div>";
        }).join("") +
      "</dl>" +
      (summary.subjectsAvailable
        ? '<p class="sd-subjects"><strong>Common subjects:</strong> ' +
          F.escapeHtml(summary.subjects.join(", ")) + "</p>"
        : '<p class="sd-subjects sd-subjects--placeholder">Common subjects: placeholder — derived once subject tagging lands.</p>');
  }

  function renderActions(scene) {
    if (!mounts.actions) return;
    var id = encodeURIComponent(scene.id);
    mounts.actions.innerHTML =
      '<h2 class="sd-section-title" id="sd-actions-title">Primary actions</h2>' +
      '<nav class="sd-actions" aria-labelledby="sd-actions-title">' +
        '<a class="wds-btn wds-btn--primary" href="#sd-grid" id="sd-action-review">Review Shoot</a>' +
        '<a class="wds-btn wds-btn--secondary" href="/apps/photo-coach/?sceneId=' + id + '">Photo Coach</a>' +
        '<a class="wds-btn wds-btn--secondary" href="/apps/scenes/portfolio/assistant.html?sceneId=' + id + '">Portfolio Assistant</a>' +
        '<a class="wds-btn wds-btn--secondary" href="/apps/scenes/portfolio/?sceneId=' + id + '">Portfolios</a>' +
        '<a class="wds-btn wds-btn--secondary" href="../create/?sceneId=' + id + '">Living Scenes</a>' +
        '<a class="wds-btn wds-btn--secondary" href="../remember/?sceneId=' + id + '">Outdoor Journals</a>' +
        '<a class="wds-btn wds-btn--ghost" href="../export/?sceneId=' + id + '">Export</a>' +
      "</nav>" +
      '<p class="sd-actions__note">Every action is real. Unfinished paths open an honest foundation page — never a dead button.</p>';
  }

  /* ---------- Virtualized photo grid ---------- */

  function measureColumns() {
    if (!mounts.grid) return 4;
    var width = mounts.grid.clientWidth || 800;
    var cfg = GRID[state.thumbSize] || GRID.md;
    var cols = Math.max(2, Math.floor((width + cfg.gap) / (cfg.min + cfg.gap)));
    return cols;
  }

  function photoCell(photo, index) {
    var selected = photo.id === state.selectedId ? " is-selected" : "";
    var fav = photo.favorite ? '<span class="sd-thumb__fav" aria-hidden="true">★</span>' : "";
    var flag = photo.flag
      ? '<span class="sd-thumb__flag sd-thumb__flag--' + F.escapeHtml(photo.flag) + '" aria-hidden="true"></span>'
      : "";
    var src = photo.thumbnailUrl || "";
    return '<button type="button" class="sd-thumb' + selected + '" data-photo-id="' +
      F.escapeHtml(photo.id) + '" data-index="' + index + '"' +
      ' aria-label="' + F.escapeHtml(photo.filename) + (photo.favorite ? " — favorite" : "") + '"' +
      ' style="background-image:url(\'' + F.escapeHtml(src) + '\')">' +
      fav + flag +
    "</button>";
  }

  function renderGridWindow() {
    if (!mounts.grid || !state.scene) return;
    var photos = state.scene.photos || [];
    var cols = measureColumns();
    var cfg = GRID[state.thumbSize] || GRID.md;
    var rowHeight = cfg.min + cfg.gap;
    var totalRows = Math.ceil(photos.length / cols) || 1;
    var viewport = mounts.gridScroll || mounts.grid;
    var scrollTop = viewport.scrollTop || 0;
    var viewH = viewport.clientHeight || 600;

    var firstRow = Math.max(0, Math.floor(scrollTop / rowHeight) - BUFFER_ROWS);
    var visibleRows = Math.ceil(viewH / rowHeight) + BUFFER_ROWS * 2;
    var lastRow = Math.min(totalRows, firstRow + visibleRows);

    state.visibleStart = firstRow * cols;
    state.visibleEnd = Math.min(photos.length, lastRow * cols);

    var topPad = firstRow * rowHeight;
    var bottomPad = Math.max(0, (totalRows - lastRow) * rowHeight);

    var cells = [];
    for (var i = state.visibleStart; i < state.visibleEnd; i++) {
      cells.push(photoCell(photos[i], i));
    }

    mounts.grid.innerHTML =
      '<div class="sd-grid__pad" style="height:' + topPad + 'px" aria-hidden="true"></div>' +
      '<div class="sd-grid__window sd-grid__window--' + state.thumbSize + '" role="list" aria-label="Photographs in this Scene" style="--sd-cols:' + cols + '">' +
        cells.join("") +
      "</div>" +
      '<div class="sd-grid__pad" style="height:' + bottomPad + 'px" aria-hidden="true"></div>';

    if (mounts.gridMeta) {
      mounts.gridMeta.textContent =
        "Showing " + (state.visibleEnd - state.visibleStart) + " of " +
        photos.length + " loaded frames · Scene reports " +
        state.scene.photoCount + " total";
    }
  }

  function bindGrid() {
    if (!mounts.grid) return;
    mounts.grid.addEventListener("click", function (e) {
      var btn = e.target.closest(".sd-thumb");
      if (!btn) return;
      selectPhoto(btn.getAttribute("data-photo-id"));
    });
    mounts.grid.addEventListener("keydown", function (e) {
      var btn = e.target.closest(".sd-thumb");
      if (!btn) return;
      var idx = Number(btn.getAttribute("data-index"));
      var cols = measureColumns();
      var next = idx;
      if (e.key === "ArrowRight") next = idx + 1;
      else if (e.key === "ArrowLeft") next = idx - 1;
      else if (e.key === "ArrowDown") next = idx + cols;
      else if (e.key === "ArrowUp") next = idx - cols;
      else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        selectPhoto(btn.getAttribute("data-photo-id"));
        return;
      } else return;
      e.preventDefault();
      var photos = state.scene.photos;
      if (next < 0 || next >= photos.length) return;
      selectPhoto(photos[next].id);
      var el = mounts.grid.querySelector('[data-photo-id="' + photos[next].id + '"]');
      if (el) el.focus();
    });

    var scroller = mounts.gridScroll || mounts.grid;
    var ticking = false;
    scroller.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      global.requestAnimationFrame(function () {
        renderGridWindow();
        ticking = false;
      });
    }, { passive: true });

    global.addEventListener("resize", function () {
      renderGridWindow();
    });
  }

  /* ---------- Photo detail panel ---------- */

  function renderPhotoDetail(photo) {
    if (!mounts.detail) return;
    if (!photo) {
      mounts.detail.hidden = true;
      mounts.detail.innerHTML = "";
      return;
    }
    mounts.detail.hidden = false;
    var cam = photo.camera || {};
    var id = encodeURIComponent(state.scene.id);
    var pid = encodeURIComponent(photo.id);
    mounts.detail.innerHTML =
      '<div class="sd-detail__preview" style="background-image:url(\'' + F.escapeHtml(photo.thumbnailUrl || "") + '\')" role="img" aria-label="' + F.escapeHtml(photo.filename) + '"></div>' +
      '<div class="sd-detail__body">' +
        '<h2 class="sd-detail__title">' + F.escapeHtml(photo.filename) + "</h2>" +
        '<dl class="sd-detail__exif">' +
          "<div><dt>Camera</dt><dd>" + F.escapeHtml([cam.make, cam.model].filter(Boolean).join(" ") || "—") + "</dd></div>" +
          "<div><dt>Lens</dt><dd>" + F.escapeHtml(cam.lens || "—") + "</dd></div>" +
          "<div><dt>ISO</dt><dd>" + F.escapeHtml(cam.iso != null ? String(cam.iso) : "—") + "</dd></div>" +
          "<div><dt>Shutter</dt><dd>" + F.escapeHtml(cam.shutter || "—") + "</dd></div>" +
          "<div><dt>Aperture</dt><dd>" + F.escapeHtml(cam.aperture != null ? "f/" + cam.aperture : "—") + "</dd></div>" +
          "<div><dt>Focal length</dt><dd>" + F.escapeHtml(cam.focalLengthMm != null ? cam.focalLengthMm + "mm" : "—") + "</dd></div>" +
          "<div><dt>Captured</dt><dd>" + F.escapeHtml(F.formatLongDate(photo.captureTime)) + "</dd></div>" +
          "<div><dt>Histogram</dt><dd>Placeholder — not available yet</dd></div>" +
        "</dl>" +
        '<div class="sd-detail__actions">' +
          '<button type="button" class="wds-btn wds-btn--secondary wds-btn--sm" id="sd-fav-btn">' +
            (photo.favorite ? "Unfavorite" : "Favorite") +
          "</button>" +
          '<a class="wds-btn wds-btn--secondary wds-btn--sm" href="/apps/photo-coach/?sceneId=' + id + "&photoId=" + pid + '">Photo Coach</a>' +
          '<a class="wds-btn wds-btn--ghost wds-btn--sm" href="/apps/scenes/portfolio/assistant.html?sceneId=' + id + "&photoId=" + pid + '">Portfolio</a>' +
        "</div>" +
        '<p class="sd-detail__notes"><strong>Notes</strong> — placeholder. Per-photo notes land in a later sprint.</p>' +
        '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" id="sd-detail-close">Close</button>' +
      "</div>";

    var favBtn = $("sd-fav-btn");
    if (favBtn) {
      favBtn.addEventListener("click", function () {
        var next = !photo.favorite;
        Engine.updatePhoto(state.scene.id, photo.id, { favorite: next });
        if (next) Engine.setFavoriteImage(state.scene.id, photo.id);
        else if (state.scene.favoriteImageId === photo.id) Engine.setFavoriteImage(state.scene.id, null);
        reload();
        selectPhoto(photo.id);
      });
    }
    var close = $("sd-detail-close");
    if (close) close.addEventListener("click", function () {
      state.selectedId = null;
      renderPhotoDetail(null);
      renderGridWindow();
    });
  }

  function selectPhoto(photoId) {
    state.selectedId = photoId;
    var photo = Models.findPhoto(state.scene, photoId);
    renderPhotoDetail(photo);
    renderGridWindow();
  }

  /* ---------- Toolbar ---------- */

  function bindToolbar() {
    var size = $("sd-thumb-size");
    if (size) {
      size.addEventListener("change", function () {
        state.thumbSize = size.value || "md";
        renderGridWindow();
      });
    }
  }

  /* ---------- Boot ---------- */

  function notFound(id) {
    if (!mounts.main) return;
    mounts.main.innerHTML =
      '<div class="sd-missing" role="status">' +
        "<h1>Scene not found</h1>" +
        "<p>No Scene matches <code>" + F.escapeHtml(id || "") + "</code>.</p>" +
        '<a class="wds-btn wds-btn--primary" href="../library/">Back to Scene Library</a>' +
      "</div>";
  }

  function reload() {
    state.scene = Engine.get(state.scene.id);
    state.summary = Engine.buildShootSummary(state.scene);
  }

  function mount() {
    F = global.WaypointSceneFormat;
    Engine = global.WaypointSceneEngine;
    Models = global.WaypointSceneModels;
    if (!F || !Engine || !Models) {
      console.error("Scene Detail UI missing dependencies");
      return null;
    }
    Engine.init({ seedDemo: true });

    mounts.main = $("sd-main");
    mounts.hero = $("sd-hero");
    mounts.summary = $("sd-summary-mount");
    mounts.actions = $("sd-actions-mount");
    mounts.grid = $("sd-grid");
    mounts.gridScroll = $("sd-grid-scroll");
    mounts.gridMeta = $("sd-grid-meta");
    mounts.detail = $("sd-detail");

    var id = sceneIdFromUrl();
    if (!id) {
      notFound(id);
      return null;
    }
    var scene = Engine.touchOpened(id) || Engine.get(id);
    if (!scene) {
      notFound(id);
      return null;
    }
    state.scene = scene;
    state.summary = Engine.buildShootSummary(scene);

    renderHero(scene);
    renderQuickSummary(scene, state.summary);
    renderActions(scene);
    bindToolbar();
    bindGrid();
    renderGridWindow();
    return {
      getState: function () { return state; },
      selectPhoto: selectPhoto,
      renderGridWindow: renderGridWindow
    };
  }

  global.WaypointSceneDetailUI = {
    mount: mount,
    sceneIdFromUrl: sceneIdFromUrl
  };
})(typeof window !== "undefined" ? window : globalThis);
