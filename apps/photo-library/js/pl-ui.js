/**
 * Photo Library UI — grid/list, detail panel, filters, collections, selection
 */
(function (global) {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function $(id) {
    return document.getElementById(id);
  }

  function formatDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso).slice(0, 16);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  function thumbSrc(img) {
    if (img.media && img.media.thumbnailDataUrl) return img.media.thumbnailDataUrl;
    return "";
  }

  function mount(engine) {
    var state = {
      view: "grid",
      query: "",
      sort: "import-desc",
      filters: {},
      selectedId: null,
      selectionMode: false,
      selectedIds: Object.create(null),
      detailOpen: true
    };

    var els = {
      toolbar: $("pl-toolbar"),
      status: $("pl-status"),
      grid: $("pl-grid"),
      empty: $("pl-empty"),
      detail: $("pl-detail"),
      fileInput: $("pl-file-input"),
      search: $("pl-search"),
      sort: $("pl-sort"),
      filters: $("pl-filters"),
      collections: $("pl-collections"),
      count: $("pl-count")
    };

    function setStatus(msg, isError) {
      if (!els.status) return;
      els.status.textContent = msg || "";
      els.status.hidden = !msg;
      els.status.classList.toggle("pl-status--error", !!isError);
    }

    function currentList() {
      return engine.search({
        query: state.query,
        sort: state.sort,
        filters: state.filters
      });
    }

    function renderCollections() {
      if (!els.collections) return;
      var cols = engine.listCollections();
      var shoots = engine.listShoots ? engine.listShoots() : [];
      els.collections.innerHTML =
        '<button type="button" class="pl-chip' + (!state.filters.collectionId && !state.filters.shootId ? " is-active" : "") +
        '" data-collection="">All photographs</button>' +
        (shoots.length
          ? shoots.slice(0, 8).map(function (s) {
              var active = state.filters.shootId === s.id;
              return '<button type="button" class="pl-chip' + (active ? " is-active" : "") +
                '" data-shoot="' + esc(s.id) + '">Shoot · ' + s.count + "</button>";
            }).join("")
          : "") +
        cols.map(function (c) {
          var active = state.filters.collectionId === c.id;
          return '<button type="button" class="pl-chip' + (active ? " is-active" : "") +
            '" data-collection="' + esc(c.id) + '">' + esc(c.name) +
            " · " + (c.imageIds || []).length + "</button>";
        }).join("") +
        '<button type="button" class="pl-chip pl-chip--action" id="pl-new-collection">+ Collection</button>';

      els.collections.querySelectorAll("[data-collection]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var id = btn.getAttribute("data-collection");
          delete state.filters.shootId;
          if (!id) delete state.filters.collectionId;
          else state.filters.collectionId = id;
          refresh();
        });
      });
      els.collections.querySelectorAll("[data-shoot]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var id = btn.getAttribute("data-shoot");
          delete state.filters.collectionId;
          if (state.filters.shootId === id) delete state.filters.shootId;
          else state.filters.shootId = id;
          refresh();
        });
      });
      var neu = $("pl-new-collection");
      if (neu) {
        neu.addEventListener("click", function () {
          var name = global.prompt("Collection name", "New collection");
          if (!name) return;
          engine.createCollection(name.trim());
          refresh();
        });
      }
    }

    function renderFilters() {
      if (!els.filters) return;
      var defs = [
        { key: "favorite", label: "Favorites" },
        { key: "keep", label: "Keep" },
        { key: "maybe", label: "Maybe" },
        { key: "reject", label: "Reject" },
        { key: "analyzed", label: "Analyzed" },
        { key: "notAnalyzed", label: "Not yet analyzed" },
        { key: "hasExif", label: "Has EXIF" },
        { key: "hiddenLandscapes", label: "Open in Hidden Landscapes" }
      ];
      var subjects = (engine.SUBJECT_FILTERS || []).map(function (s) {
        return { key: "subject:" + s, label: s.charAt(0).toUpperCase() + s.slice(1), subject: s };
      });

      function chip(def, active) {
        return '<button type="button" class="pl-chip' + (active ? " is-active" : "") +
          '" data-filter-key="' + esc(def.key) + '"' +
          (def.subject ? ' data-subject="' + esc(def.subject) + '"' : "") +
          ">" + esc(def.label) + "</button>";
      }

      els.filters.innerHTML =
        defs.map(function (d) {
          return chip(d, !!state.filters[d.key]);
        }).join("") +
        subjects.map(function (d) {
          return chip(d, state.filters.subject === d.subject);
        }).join("");

      els.filters.querySelectorAll("[data-filter-key]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var key = btn.getAttribute("data-filter-key");
          var subject = btn.getAttribute("data-subject");
          if (subject) {
            if (state.filters.subject === subject) delete state.filters.subject;
            else state.filters.subject = subject;
          } else {
            if (state.filters[key]) delete state.filters[key];
            else state.filters[key] = true;
            if (key === "analyzed") delete state.filters.notAnalyzed;
            if (key === "notAnalyzed") delete state.filters.analyzed;
          }
          refresh();
        });
      });
    }

    function renderGrid() {
      var list = currentList();
      if (els.count) els.count.textContent = list.length + " photograph" + (list.length === 1 ? "" : "s");
      if (!list.length) {
        if (els.grid) els.grid.innerHTML = "";
        if (els.empty) els.empty.hidden = false;
        return;
      }
      if (els.empty) els.empty.hidden = true;

      if (state.view === "list") {
        els.grid.className = "pl-results pl-results--list";
        els.grid.innerHTML = list.map(function (img) {
          var active = state.selectedId === img.id;
          var checked = !!state.selectedIds[img.id];
          return '<button type="button" class="pl-row' + (active ? " is-active" : "") +
            '" data-id="' + esc(img.id) + '" aria-current="' + (active ? "true" : "false") + '">' +
            (state.selectionMode
              ? '<span class="pl-check" aria-hidden="true">' + (checked ? "✓" : "") + "</span>"
              : "") +
            (thumbSrc(img)
              ? '<img class="pl-row__thumb" src="' + esc(thumbSrc(img)) + '" alt="">'
              : '<span class="pl-row__thumb pl-row__thumb--empty"></span>') +
            '<span class="pl-row__meta"><strong>' + esc(img.filename) + "</strong>" +
            "<span>" + esc(formatDate(img.captureDate || img.importDate)) + "</span></span>" +
            (img.favorite || img.selectionLabel === "favorite" ? '<span class="pl-badge">★</span>' : "") +
            "</button>";
        }).join("");
      } else {
        els.grid.className = "pl-results pl-results--grid";
        els.grid.innerHTML = list.map(function (img) {
          var active = state.selectedId === img.id;
          var checked = !!state.selectedIds[img.id];
          return '<button type="button" class="pl-card' + (active ? " is-active" : "") +
            '" data-id="' + esc(img.id) + '" aria-label="' + esc(img.filename) + '">' +
            (state.selectionMode
              ? '<span class="pl-check pl-check--card" aria-hidden="true">' + (checked ? "✓" : "") + "</span>"
              : "") +
            (thumbSrc(img)
              ? '<img src="' + esc(thumbSrc(img)) + '" alt="" loading="lazy" decoding="async">'
              : '<span class="pl-card__empty">No preview</span>') +
            '<span class="pl-card__caption">' + esc(img.filename) + "</span>" +
            "</button>";
        }).join("");
      }

      els.grid.querySelectorAll("[data-id]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var id = btn.getAttribute("data-id");
          if (state.selectionMode) {
            if (state.selectedIds[id]) delete state.selectedIds[id];
            else state.selectedIds[id] = true;
            renderGrid();
            return;
          }
          state.selectedId = id;
          renderGrid();
          renderDetail();
        });
      });
    }

    function cameraLine(img) {
      var c = img.camera || {};
      var bits = [c.make, c.model].filter(Boolean);
      return bits.length ? bits.join(" ") : "—";
    }

    function renderDetail() {
      if (!els.detail) return;
      var img = state.selectedId ? engine.get(state.selectedId) : null;
      if (!img) {
        els.detail.innerHTML = '<div class="pl-detail__empty"><p>Select a photograph to see details.</p></div>';
        return;
      }
      var coach = (img.moduleRefs && img.moduleRefs.photoCoach) || {};
      var cols = (img.collectionIds || []).map(function (cid) {
        var c = engine.getCollection(cid);
        return c ? c.name : null;
      }).filter(Boolean);

      var canOpenMedia = !!(img.media && (img.media.hasOriginal || img.media.hasThumbnail || img.media.thumbnailDataUrl));

      els.detail.innerHTML =
        '<div class="pl-detail__preview">' +
          (thumbSrc(img)
            ? '<img src="' + esc(thumbSrc(img)) + '" alt="' + esc(img.filename) + '">'
            : '<p class="pl-detail__empty">No large preview yet. Import the original to store it locally.</p>') +
        "</div>" +
        "<h2 class=\"pl-detail__title\">" + esc(img.filename) + "</h2>" +
        '<dl class="pl-detail__meta">' +
          "<div><dt>Captured</dt><dd>" + esc(formatDate(img.captureDate)) + "</dd></div>" +
          "<div><dt>Imported</dt><dd>" + esc(formatDate(img.importDate)) + "</dd></div>" +
          "<div><dt>Camera</dt><dd>" + esc(cameraLine(img)) + "</dd></div>" +
          "<div><dt>Lens</dt><dd>" + esc((img.camera && img.camera.lens) || "—") + "</dd></div>" +
          "<div><dt>Focal length</dt><dd>" +
            esc(img.camera && img.camera.focalLengthMm != null ? img.camera.focalLengthMm + "mm" : "—") +
          "</dd></div>" +
          "<div><dt>Exposure</dt><dd>" +
            esc([
              img.camera && img.camera.fNumber != null ? "f/" + img.camera.fNumber : null,
              img.camera && img.camera.exposureTimeSec != null ? img.camera.exposureTimeSec + "s" : null,
              img.camera && img.camera.iso != null ? "ISO " + img.camera.iso : null
            ].filter(Boolean).join(" · ") || "—") +
          "</dd></div>" +
          "<div><dt>Orientation</dt><dd>" + esc(img.orientation || "—") + "</dd></div>" +
          "<div><dt>Resolution</dt><dd>" +
            esc(img.width && img.height ? img.width + " × " + img.height : "—") +
          "</dd></div>" +
          "<div><dt>Analysis</dt><dd>" + esc(coach.analysisStatus || "not-analyzed") +
            (coach.letterGrade ? " · " + esc(coach.letterGrade) : "") +
            (coach.confidenceTier ? " · " + esc(coach.confidenceTier) + " confidence" : "") +
          "</dd></div>" +
          (coach.narrativeSummary || img.coachSummary
            ? "<div><dt>Coach summary</dt><dd>" + esc(coach.narrativeSummary || img.coachSummary) + "</dd></div>"
            : "") +
          (coach.shootId
            ? "<div><dt>Shoot</dt><dd><a href=\"../photo-coach/?shootId=" + encodeURIComponent(coach.shootId) +
              "\">Open shoot summary</a></dd></div>"
            : "") +
          (img.outdoorContext
            ? "<div><dt>Outdoor context</dt><dd>Stored field snapshot (not invented)</dd></div>"
            : "") +
          "<div><dt>Collections</dt><dd>" + esc(cols.join(", ") || "None yet") + "</dd></div>" +
          "<div><dt>Tags</dt><dd>" + esc((img.tags || []).join(", ") || "—") + "</dd></div>" +
          "<div><dt>Label</dt><dd>" + esc(img.selectionLabel || (img.favorite ? "favorite" : "—")) + "</dd></div>" +
        "</dl>" +
        '<label class="pl-notes-label" for="pl-notes">Photographer notes</label>' +
        '<textarea id="pl-notes" class="pl-notes" rows="3" aria-label="Photographer notes">' +
          esc(img.photographerNotes || "") +
        "</textarea>" +
        '<div class="pl-actions" role="group" aria-label="Quick actions">' +
          '<a class="wds-btn wds-btn--primary wds-btn--sm" href="../photo-coach/?libraryId=' +
            encodeURIComponent(img.id) + '">Open Coach result</a>' +
          (coach.shootId
            ? '<a class="wds-btn wds-btn--ghost wds-btn--sm" href="../photo-coach/?shootId=' +
              encodeURIComponent(coach.shootId) + '">Return to shoot</a>'
            : "") +
          '<a class="wds-btn wds-btn--secondary wds-btn--sm' + (canOpenMedia ? "" : " is-disabled") +
            '" href="../hidden-landscapes/?libraryId=' + encodeURIComponent(img.id) + '"' +
            (canOpenMedia ? "" : " aria-disabled=\"true\"") +
            ">Open in Hidden Landscapes</a>" +
        "</div>" +
        '<div class="pl-label-row" role="group" aria-label="Private labels">' +
          ["keep", "maybe", "reject", "favorite"].map(function (lab) {
            var on = img.selectionLabel === lab || (lab === "favorite" && img.favorite);
            return '<button type="button" class="pl-chip' + (on ? " is-active" : "") +
              '" data-label="' + lab + '">' + lab.charAt(0).toUpperCase() + lab.slice(1) + "</button>";
          }).join("") +
          '<button type="button" class="pl-chip" data-label="">Clear</button>' +
        "</div>" +
        '<div class="pl-detail__modules">' +
          "<h3>Modules using this photograph</h3>" +
          "<ul>" +
            "<li>Photo Coach — " + esc(coach.analysisStatus || "not-analyzed") + "</li>" +
            "<li>Hidden Landscapes — " +
              (img.moduleRefs.hiddenLandscapes && img.moduleRefs.hiddenLandscapes.available
                ? "linked"
                : canOpenMedia ? "ready to open" : "needs original") +
            "</li>" +
            "<li>Living Scenes — " +
              (img.moduleRefs.livingScenes && img.moduleRefs.livingScenes.created ? "created" : "not yet") +
            "</li>" +
            "<li>Scene Builder — " +
              (img.moduleRefs.sceneBuilder && img.moduleRefs.sceneBuilder.created ? "created" : "not yet") +
            "</li>" +
          "</ul>" +
        "</div>";

      var notes = $("pl-notes");
      if (notes) {
        notes.addEventListener("change", function () {
          engine.updateImage(img.id, { photographerNotes: notes.value || null });
        });
      }
      els.detail.querySelectorAll("[data-label]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          var lab = btn.getAttribute("data-label");
          if (lab === "") {
            engine.updateImage(img.id, { selectionLabel: null, favorite: false });
          } else {
            engine.updateImage(img.id, {
              selectionLabel: lab,
              favorite: lab === "favorite"
            });
          }
          refresh();
        });
      });
    }

    function refresh() {
      renderCollections();
      renderFilters();
      renderGrid();
      renderDetail();
    }

    function bindToolbar() {
      document.querySelectorAll("[data-pl-view]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          state.view = btn.getAttribute("data-pl-view") || "grid";
          document.querySelectorAll("[data-pl-view]").forEach(function (b) {
            b.setAttribute("aria-pressed", b === btn ? "true" : "false");
          });
          refresh();
        });
      });
      var selBtn = $("pl-selection-mode");
      if (selBtn) {
        selBtn.addEventListener("click", function () {
          state.selectionMode = !state.selectionMode;
          selBtn.setAttribute("aria-pressed", state.selectionMode ? "true" : "false");
          if (!state.selectionMode) state.selectedIds = Object.create(null);
          refresh();
        });
      }
      var importBtn = $("pl-import");
      if (importBtn && els.fileInput) {
        importBtn.addEventListener("click", function () { els.fileInput.click(); });
        els.fileInput.addEventListener("change", function () {
          if (!els.fileInput.files || !els.fileInput.files.length) return;
          setStatus("Importing…");
          engine.importFiles(els.fileInput.files).then(function (res) {
            els.fileInput.value = "";
            var msg = "Imported " + res.imported.length;
            if (res.skippedDuplicates) msg += " · skipped " + res.skippedDuplicates + " duplicate(s)";
            if (res.errors.length) msg += " · " + res.errors.length + " error(s)";
            setStatus(msg, !!res.errors.length && !res.imported.length);
            if (res.imported[0]) state.selectedId = res.imported[0].id;
            refresh();
          });
        });
      }
      if (els.search) {
        els.search.addEventListener("input", function () {
          state.query = els.search.value || "";
          refresh();
        });
      }
      if (els.sort) {
        els.sort.addEventListener("change", function () {
          state.sort = els.sort.value || "import-desc";
          refresh();
        });
      }
      var drop = $("pl-drop");
      if (drop) {
        drop.addEventListener("dragover", function (e) {
          e.preventDefault();
          drop.classList.add("is-dragover");
        });
        drop.addEventListener("dragleave", function () {
          drop.classList.remove("is-dragover");
        });
        drop.addEventListener("drop", function (e) {
          e.preventDefault();
          drop.classList.remove("is-dragover");
          if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
            setStatus("Importing…");
            engine.importFiles(e.dataTransfer.files).then(function (res) {
              setStatus("Imported " + res.imported.length + (res.skippedDuplicates ? " · skipped duplicates" : ""));
              if (res.imported[0]) state.selectedId = res.imported[0].id;
              refresh();
            });
          }
        });
      }
    }

    bindToolbar();
    refresh();
    return { refresh: refresh, getState: function () { return state; } };
  }

  global.WaypointPhotoLibraryUI = { mount: mount };
})(typeof window !== "undefined" ? window : globalThis);
