/**
 * Scene Library page UI — card grid with search, sort, filter, and import.
 */
(function (global) {
  "use strict";

  var F = null;
  var Engine = null;
  var Ingest = null;
  var state = {
    q: "",
    sort: "recent",
    favoriteOnly: false,
    scenes: []
  };
  var mounts = {};

  function $(id) { return global.document.getElementById(id); }

  function cardHtml(scene) {
    var cover = scene.coverImageUrl || scene.thumbnailUrl || "";
    var badge = F.analysisBadge(scene.analysisStatus);
    var favorite = scene.favoriteImageId
      ? '<span class="sl-card__favorite" title="Has a favorite frame" aria-label="Has a favorite frame">★</span>'
      : "";
    var sample = scene.isSample
      ? '<span class="sl-card__sample">Sample</span>'
      : "";

    return '<article class="sl-card" data-scene-id="' + F.escapeHtml(scene.id) + '">' +
      '<a class="sl-card__link" href="../scene/?id=' + encodeURIComponent(scene.id) + '" aria-label="Open Scene: ' + F.escapeHtml(scene.title) + '">' +
        '<div class="sl-card__cover" style="background-image:url(\'' + F.escapeHtml(cover) + '\')">' +
          favorite + sample +
        "</div>" +
        '<div class="sl-card__body">' +
          '<h2 class="sl-card__title">' + F.escapeHtml(scene.title) + "</h2>" +
          '<p class="sl-card__meta">' + F.escapeHtml(F.formatLongDate(scene.captureDate || scene.createdDate)) + "</p>" +
          '<p class="sl-card__meta">' +
            F.escapeHtml(F.photoCountLabel(scene.photoCount)) +
            (scene.camera ? " · " + F.escapeHtml(scene.camera) : "") +
          "</p>" +
          (scene.location ? '<p class="sl-card__meta sl-card__meta--loc">' + F.escapeHtml(scene.location) + "</p>" : "") +
          '<div class="sl-card__foot">' +
            '<span class="sl-badge ' + badge.className + '">' + F.escapeHtml(badge.label) + "</span>" +
            '<span class="sl-card__opened">' + F.escapeHtml(F.formatRelative(scene.lastOpenedAt)) + "</span>" +
          "</div>" +
        "</div>" +
      "</a>" +
      '<div class="sl-card__actions">' +
        '<a class="wds-btn wds-btn--primary wds-btn--sm" href="../scene/?id=' + encodeURIComponent(scene.id) + '">Open Scene</a>' +
      "</div>" +
    "</article>";
  }

  function emptyHtml() {
    return '<div class="sl-empty" role="status">' +
      "<h2>No Scenes yet</h2>" +
      "<p>Import a folder of photographs from a walk, or open a sample Scene to explore the workspace.</p>" +
      '<button type="button" class="wds-btn wds-btn--primary" id="sl-empty-import">Import a folder</button>' +
    "</div>";
  }

  function render() {
    if (!mounts.grid) return;
    state.scenes = Engine.query({
      q: state.q,
      sort: state.sort,
      favoriteOnly: state.favoriteOnly
    });
    if (mounts.count) {
      mounts.count.textContent = state.scenes.length +
        (state.scenes.length === 1 ? " Scene" : " Scenes");
    }
    if (!state.scenes.length) {
      mounts.grid.innerHTML = emptyHtml();
      var emptyBtn = $("sl-empty-import");
      if (emptyBtn) emptyBtn.addEventListener("click", triggerImport);
      return;
    }
    mounts.grid.innerHTML = state.scenes.map(cardHtml).join("");
  }

  function triggerImport() {
    var input = $("sl-folder-input");
    if (input) input.click();
  }

  function libraryImagesFromIndex() {
    try {
      if (global.WaypointPhotoLibraryEngine) {
        var eng = global.WaypointPhotoLibraryEngine.get && global.WaypointPhotoLibraryEngine.get();
        if (eng && eng.list) return eng.list() || [];
      }
      if (global.WaypointPhotoLibraryStore && global.WaypointPhotoLibraryStore.loadIndex) {
        return global.WaypointPhotoLibraryStore.loadIndex() || [];
      }
      var raw = global.localStorage && global.localStorage.getItem("waypoint-photo-library-index-v1");
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];
    }
  }

  function ingestFromPhotoLibrary() {
    var Ingest = global.WaypointSceneIngest;
    if (!Ingest || !Ingest.ingestFromLibraryFolder) {
      if (mounts.status) {
        mounts.status.hidden = false;
        mounts.status.textContent = "Scene ingest is unavailable.";
      }
      return;
    }
    var images = libraryImagesFromIndex();
    if (!images.length) {
      if (mounts.status) {
        mounts.status.hidden = false;
        mounts.status.textContent =
          "Photo Library index is empty on this device. Import photographs first, then create a Scene.";
      }
      return;
    }
    var result = Ingest.ingestFromLibraryFolder({
      title: "From Photo Library",
      importSource: (global.WaypointSceneModels && global.WaypointSceneModels.SOURCE &&
        global.WaypointSceneModels.SOURCE.importedLibrary) || "imported-library",
      images: images.slice(0, 200)
    });
    if (!result.ok) {
      if (mounts.status) {
        mounts.status.hidden = false;
        mounts.status.textContent = result.error || "Could not build a Scene from the library.";
      }
      return;
    }
    if (mounts.status) {
      mounts.status.hidden = false;
      mounts.status.textContent =
        "Created Scene from Photo Library — " + result.photoCount + " photographs.";
    }
    global.location.href = "../scene/?id=" + encodeURIComponent(result.scene.id);
  }

  function onFolderSelected(ev) {
    var files = ev.target.files;
    if (!files || !files.length) return;
    var result = Ingest.ingestFromFolderFiles(files, {
      importSource: global.WaypointSceneModels.SOURCE.manualFolder
    });
    if (!result.ok) {
      if (mounts.status) {
        mounts.status.hidden = false;
        mounts.status.textContent = result.error || "Import failed.";
      }
      return;
    }
    if (mounts.status) {
      mounts.status.hidden = false;
      mounts.status.textContent = "Imported “" + result.scene.title + "” — " +
        result.photoCount + " photographs.";
    }
    render();
    // Navigate into the new Scene so the user lands in the workspace.
    global.location.href = "../scene/?id=" + encodeURIComponent(result.scene.id);
  }

  function bind() {
    var search = $("sl-search");
    if (search) {
      search.addEventListener("input", function () {
        state.q = search.value;
        render();
      });
    }
    var sort = $("sl-sort");
    if (sort) {
      sort.addEventListener("change", function () {
        state.sort = sort.value;
        render();
      });
    }
    var fav = $("sl-filter-favorites");
    if (fav) {
      fav.addEventListener("change", function () {
        state.favoriteOnly = !!fav.checked;
        render();
      });
    }
    var importBtn = $("sl-import-btn");
    if (importBtn) importBtn.addEventListener("click", triggerImport);
    var fromLib = $("sl-from-library-btn");
    if (fromLib) fromLib.addEventListener("click", ingestFromPhotoLibrary);
    var input = $("sl-folder-input");
    if (input) input.addEventListener("change", onFolderSelected);

    // Drag / drop folders onto the library surface.
    var drop = $("sl-drop");
    if (drop) {
      ["dragenter", "dragover"].forEach(function (evt) {
        drop.addEventListener(evt, function (e) {
          e.preventDefault();
          drop.classList.add("is-dragover");
        });
      });
      ["dragleave", "drop"].forEach(function (evt) {
        drop.addEventListener(evt, function (e) {
          e.preventDefault();
          drop.classList.remove("is-dragover");
        });
      });
      drop.addEventListener("drop", function (e) {
        var files = e.dataTransfer && e.dataTransfer.files;
        if (!files || !files.length) return;
        var result = Ingest.ingestFromFolderFiles(files, {
          importSource: global.WaypointSceneModels.SOURCE.dragDrop
        });
        if (result.ok) {
          global.location.href = "../scene/?id=" + encodeURIComponent(result.scene.id);
        } else if (mounts.status) {
          mounts.status.hidden = false;
          mounts.status.textContent = result.error || "Drop import failed.";
        }
      });
    }
  }

  function mount() {
    F = global.WaypointSceneFormat;
    Engine = global.WaypointSceneEngine;
    Ingest = global.WaypointSceneIngest;
    if (!F || !Engine || !Ingest) {
      console.error("Scene Library UI missing dependencies");
      return null;
    }
    Engine.init({ seedDemo: true });
    mounts.grid = $("sl-grid");
    mounts.count = $("sl-count");
    mounts.status = $("sl-status");
    bind();
    render();
    return { refresh: render, getState: function () { return state; } };
  }

  global.WaypointSceneLibraryUI = { mount: mount };
})(typeof window !== "undefined" ? window : globalThis);
