/**
 * Hidden Landscapes Studio — museum / field-lab / light-table UI
 */
(function (global) {
  "use strict";

  var Models = null;
  var Analyze = null;
  var Animal = null;
  var Discoveries = null;
  var Export = null;

  function $(id) { return document.getElementById(id); }

  function mount() {
    Models = global.WaypointHLModels;
    Analyze = global.WaypointHLAnalyze;
    Animal = global.WaypointHLAnimal;
    Discoveries = global.WaypointHLDiscoveries;
    Export = global.WaypointHLExport;

    var state = {
      catalog: null,
      species: null,
      source: Models.emptySource(),
      originalUrl: null,
      editUrl: null,
      originalImg: null,
      editImg: null,
      analysis: null,
      animalCache: {},
      pillar: "light",
      view: "luminance",
      compare: "slider",
      showingSim: true,
      highlightRegion: null,
      busy: false,
      exif: null
    };

    var root = $("hl-studio");
    if (!root) return;

    function setStatus(msg, isError) {
      var el = $("hl-status");
      if (!el) return;
      el.textContent = msg || "";
      el.hidden = !msg;
      el.classList.toggle("hl-status--error", !!isError);
    }

    function revoke(url) {
      if (url) try { URL.revokeObjectURL(url); } catch (e) { /* ignore */ }
    }

    function readExifLite(file) {
      // Best-effort: prefer library camera fields; otherwise leave null (never invent).
      return Promise.resolve(null);
    }

    function updateSourceBadge() {
      var el = $("hl-source-badge");
      if (!el) return;
      el.textContent = Models.sourceLabel(state.source);
      var choice = $("hl-source-choice");
      if (choice) {
        choice.hidden = !state.source.hasEdit;
        var origBtn = choice.querySelector('[data-source="original"]');
        var editBtn = choice.querySelector('[data-source="edit"]');
        if (origBtn) origBtn.setAttribute("aria-pressed", state.source.sourceChoice === "original" ? "true" : "false");
        if (editBtn) editBtn.setAttribute("aria-pressed", state.source.sourceChoice === "edit" ? "true" : "false");
      }
    }

    function activeImage() {
      if (state.source.sourceChoice === "edit" && state.editImg) return state.editImg;
      return state.originalImg;
    }

    function renderPillars() {
      var host = $("hl-pillars");
      if (!host || !state.catalog) return;
      host.innerHTML = state.catalog.pillars.map(function (p) {
        var on = p.id === state.pillar;
        return '<button type="button" class="hl-pillar' + (on ? " is-active" : "") +
          '" data-pillar="' + Models.esc(p.id) + '" aria-pressed="' + on + '">' +
          Models.esc(p.name) + "</button>";
      }).join("");
    }

    function defaultViewForPillar(pid) {
      if (pid === "light") return "luminance";
      if (pid === "color") return "families";
      if (pid === "structure") return "edges";
      if (pid === "animal") return "deer";
      return "photo";
    }

    function renderViews() {
      var host = $("hl-views");
      if (!host || !state.catalog) return;
      var pillar = state.catalog.pillars.find(function (p) { return p.id === state.pillar; });
      if (!pillar) return;
      host.innerHTML = pillar.views.map(function (v) {
        var on = v.id === state.view;
        var ep = Models.epistemic(v.epistemic);
        return '<button type="button" class="hl-view' + (on ? " is-active" : "") +
          '" data-view="' + Models.esc(v.id) + '" aria-pressed="' + on + '">' +
          '<span class="hl-view__name">' + Models.esc(v.name) + "</span>" +
          '<span class="hl-ep ' + ep.className + '">' + Models.esc(ep.label) + "</span>" +
          '<span class="hl-view__short">' + Models.esc(v.short) + "</span>" +
          "</button>";
      }).join("");
      var q = $("hl-pillar-question");
      if (q) q.textContent = pillar.question || "";
    }

    function currentViewMeta() {
      return Models.findView(state.catalog, state.pillar, state.view);
    }

    function renderExplain() {
      var panel = $("hl-explain");
      if (!panel) return;
      var meta = currentViewMeta();
      if (!meta) { panel.innerHTML = ""; return; }
      var v = meta.view;
      var ep = Models.epistemic(v.epistemic);
      var animalExtra = "";
      if (state.pillar === "animal" && (state.view === "deer" || state.view === "canine")) {
        var sp = (state.species.shipped || []).find(function (s) { return s.id === state.view; });
        if (sp) {
          animalExtra =
            '<div class="hl-what-changed"><h4>What changed</h4><ul>' +
            sp.whatChanged.map(function (w) {
              return "<li><strong>" + Models.esc(w.aspect) + "</strong> — " + Models.esc(w.change) + "</li>";
            }).join("") +
            "</ul><p class=\"hl-display-limit\">" + Models.esc(state.species.displayLimitation) + "</p></div>";
        }
      }
      if (state.pillar === "animal" && (state.view === "bee-uv" || state.view === "bird-uv")) {
        animalExtra = '<p class="hl-unavailable-note" role="status">Educational unavailable state — UV was not measured by this photograph.</p>';
      }
      panel.innerHTML =
        '<div class="hl-explain__ep ' + ep.className + '"><span class="hl-ep">' + Models.esc(ep.label) + "</span></div>" +
        "<h3>" + Models.esc(v.name) + "</h3>" +
        '<dl class="hl-explain__dl">' +
          "<div><dt>What you're seeing</dt><dd>" + Models.esc(v.what) + "</dd></div>" +
          "<div><dt>Why it matters</dt><dd>" + Models.esc(v.why) + "</dd></div>" +
          "<div><dt>What Waypoint measured</dt><dd>" + Models.esc(v.measured) + "</dd></div>" +
        "</dl>" + animalExtra;
    }

    function renderSpectralUnavailable() {
      var host = $("hl-spectral");
      if (!host || !state.catalog) return;
      host.innerHTML = (state.catalog.spectralUnavailable || []).map(function (s) {
        return '<article class="hl-spectral__item"><h3>' + Models.esc(s.title) +
          ' <span class="hl-ep hl-ep--unavailable">UNAVAILABLE</span></h3><p>' +
          Models.esc(s.summary) + "</p></article>";
      }).join("");
    }

    function renderExif() {
      var host = $("hl-exif");
      if (!host) return;
      var ex = state.source.exif;
      if (!ex) {
        host.innerHTML = "<p>No camera EXIF available for this source.</p>";
        return;
      }
      var parts = [];
      if (ex.make || ex.model) parts.push(Models.esc([ex.make, ex.model].filter(Boolean).join(" ")));
      if (ex.lens) parts.push(Models.esc(ex.lens));
      if (ex.focalLengthMm != null) parts.push(Models.esc(ex.focalLengthMm + "mm"));
      if (ex.fNumber != null) parts.push("f/" + Models.esc(ex.fNumber));
      if (ex.exposureTimeSec != null) parts.push(Models.esc(ex.exposureTimeSec) + "s");
      if (ex.iso != null) parts.push("ISO " + Models.esc(ex.iso));
      host.innerHTML = parts.length
        ? "<p>" + parts.join(" · ") + "</p>"
        : "<p>No camera EXIF available for this source.</p>";
    }

    function getAnimalResult() {
      if (state.pillar !== "animal") return null;
      if (state.view === "human" || state.view === "photo") return null;
      return state.animalCache[state.view] || null;
    }

    function renderDiscoveries() {
      var host = $("hl-discoveries");
      if (!host || !Discoveries) return;
      if (!state.analysis) {
        host.innerHTML = "<p class=\"hl-muted\">Open a photograph to surface discoveries from its pixels.</p>";
        return;
      }
      var list = Discoveries.buildDiscoveries(state.analysis, getAnimalResult(), state.pillar, state.view);
      if (!list.length) {
        host.innerHTML = "<p class=\"hl-muted\">No strong, evidence-backed discoveries for this view yet.</p>";
        return;
      }
      host.innerHTML = '<ul class="hl-disc-list">' + list.map(function (d) {
        var ep = Models.epistemic(d.epistemic);
        var btn = d.region
          ? ' <button type="button" class="hl-disc-region" data-region="' + Models.esc(d.id) + '">Highlight region</button>'
          : "";
        return '<li data-disc="' + Models.esc(d.id) + '"><span class="hl-ep ' + ep.className + '">' +
          Models.esc(ep.label) + "</span> " + Models.esc(d.text) + btn + "</li>";
      }).join("") + "</ul>";
      state._discMap = {};
      list.forEach(function (d) { state._discMap[d.id] = d; });
    }

    function blit(fromData, canvas) {
      if (!fromData || !canvas) return;
      canvas.width = fromData.width;
      canvas.height = fromData.height;
      canvas.getContext("2d").putImageData(fromData, 0, 0);
    }

    function drawHighlight(ctx, region, w, h) {
      if (!region || !ctx) return;
      ctx.save();
      ctx.strokeStyle = "rgba(232, 230, 223, 0.95)";
      ctx.lineWidth = Math.max(2, Math.round(w * 0.004));
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(region.x, region.y, region.w, region.h);
      ctx.restore();
    }

    function currentVizData() {
      if (!state.analysis) return null;
      if (state.pillar === "animal") {
        if (state.view === "human") return state.analysis.views.photo;
        var res = state.animalCache[state.view];
        if (res && res.status === "unavailable") return null;
        if (res && res.imageData) return res.imageData;
        return state.analysis.views.photo;
      }
      return state.analysis.views[state.view] || state.analysis.views.photo;
    }

    function syncStage() {
      var empty = $("hl-empty");
      var work = $("hl-workspace");
      var has = !!state.analysis;
      if (empty) empty.hidden = has;
      if (work) work.hidden = !has;
      if (!has) return;

      var photo = state.analysis.views.photo;
      var viz = currentVizData();
      var unavailable = state.pillar === "animal" && state.animalCache[state.view] &&
        state.animalCache[state.view].status === "unavailable";

      var note = $("hl-unavailable-banner");
      if (note) {
        if (unavailable) {
          note.hidden = false;
          note.textContent = state.animalCache[state.view].message;
        } else {
          note.hidden = true;
        }
      }

      var showViz = unavailable ? photo : (viz || photo);
      var origC = $("hl-canvas-original");
      var resultC = $("hl-canvas-result");
      var base = $("hl-canvas-slider-base");
      var top = $("hl-canvas-slider-top");
      var toggle = $("hl-canvas-toggle");

      blit(photo, origC);
      blit(showViz, resultC);
      blit(photo, base);
      blit(showViz, top);
      blit(state.showingSim ? showViz : photo, toggle);

      // Region overlay on result
      if (state.highlightRegion && resultC) {
        var ctx = resultC.getContext("2d");
        drawHighlight(ctx, state.highlightRegion, resultC.width, resultC.height);
      }

      var stage = $("hl-stage");
      if (stage) stage.setAttribute("data-compare", state.compare);
      var label = $("hl-view-label");
      if (label) {
        if (unavailable) label.textContent = "Source photograph — UV/spectral signal unavailable";
        else if (state.compare === "side") label.textContent = "Photograph and exploration view side by side";
        else if (state.compare === "toggle") label.textContent = state.showingSim ? "Showing exploration view" : "Showing photograph";
        else label.textContent = "Drag the slider to compare photograph and exploration view";
      }

      var slider = $("hl-slider");
      var wrap = document.querySelector(".hl-slider-wrap");
      if (wrap && slider) wrap.style.setProperty("--hl-split", slider.value + "%");
      if (top && base) {
        top.style.width = (base.clientWidth || base.width) + "px";
        top.style.height = "100%";
      }

      var exportBtn = $("hl-export");
      if (exportBtn) exportBtn.disabled = unavailable || !showViz;
    }

    function ensureAnimal(viewId) {
      if (viewId === "human") return Promise.resolve(null);
      if (state.animalCache[viewId]) return Promise.resolve(state.animalCache[viewId]);
      if (!state.analysis) return Promise.resolve(null);
      return new Promise(function (resolve) {
        // Yield so UI can paint "Working…"
        setTimeout(function () {
          var res = Animal.simulateSpecies(state.analysis.views.photo, viewId);
          state.animalCache[viewId] = res;
          resolve(res);
        }, 16);
      });
    }

    function runAnalysis() {
      var img = activeImage();
      if (!img) return Promise.resolve();
      state.busy = true;
      root.setAttribute("aria-busy", "true");
      setStatus("Analyzing on this device…");
      state.animalCache = {};
      state.highlightRegion = null;
      return new Promise(function (resolve) {
        setTimeout(function () {
          try {
            if (state.analysis && state.analysis.release) state.analysis.release();
            state.analysis = Analyze.analyzeImage(img, {
              analysisMaxEdge: 560,
              displayMaxEdge: Math.min(1600, (global.innerWidth > 900 ? 1600 : 1100))
            });
            setStatus("");
          } catch (e) {
            setStatus("Analysis failed: " + (e && e.message ? e.message : "unknown"), true);
            state.analysis = null;
          }
          state.busy = false;
          root.setAttribute("aria-busy", "false");
          resolve();
        }, 20);
      }).then(function () {
        if (state.pillar === "animal" && state.view !== "human") {
          return ensureAnimal(state.view);
        }
      }).then(function () {
        renderExplain();
        renderDiscoveries();
        renderExif();
        syncStage();
        showWorkspace(!!state.analysis);
      });
    }

    function showWorkspace(on) {
      var empty = $("hl-empty");
      var work = $("hl-workspace");
      if (empty) empty.hidden = !!on;
      if (work) work.hidden = !on;
      var resetBtn = $("hl-reset");
      if (resetBtn) resetBtn.disabled = !on;
    }

    function loadFile(file, meta) {
      meta = meta || {};
      revoke(state.originalUrl);
      if (!state.editUrl || meta.replaceEdit) revoke(state.editUrl);
      var url = URL.createObjectURL(file);
      state.originalUrl = url;
      state.source.file = file;
      state.source.filename = meta.filename || file.name || "photo.jpg";
      state.source.kind = meta.kind || "import";
      state.source.libraryId = meta.libraryId || null;
      state.source.originalAssetId = meta.originalAssetId || meta.libraryId || null;
      state.source.editAssetId = meta.editAssetId || null;
      state.source.hasEdit = !!meta.hasEdit;
      state.source.sourceChoice = meta.sourceChoice || "original";
      state.source.exif = meta.exif || null;
      updateSourceBadge();

      return new Promise(function (resolve, reject) {
        var img = new Image();
        img.onload = function () {
          state.originalImg = img;
          state.source.width = img.naturalWidth;
          state.source.height = img.naturalHeight;
          resolve();
        };
        img.onerror = function () { reject(new Error("Could not decode photograph.")); };
        img.src = url;
      }).then(function () {
        if (meta.editFile) {
          revoke(state.editUrl);
          state.editUrl = URL.createObjectURL(meta.editFile);
          return new Promise(function (resolve, reject) {
            var img = new Image();
            img.onload = function () { state.editImg = img; resolve(); };
            img.onerror = function () { state.editImg = null; resolve(); };
            img.src = state.editUrl;
          });
        }
        state.editImg = null;
      }).then(runAnalysis);
    }

    function loadFromLibrary(libraryId) {
      var Client = global.WaypointPhotoLibraryClient;
      var engine = global.WaypointPhotoLibraryEngine && global.WaypointPhotoLibraryEngine.get();
      if (!Client || !engine) {
        setStatus("Library handoff is unavailable.", true);
        return Promise.resolve();
      }
      var ready = engine.isReady() ? Promise.resolve() : engine.init();
      return ready.then(function () {
        return Client.resolveLibraryFile(libraryId);
      }).then(function (resolved) {
        if (!resolved || !resolved.file) {
          setStatus("That photograph’s original is not stored locally yet.", true);
          return null;
        }
        var img = resolved.image || {};
        var originalId = (img.role === "waypoint-edit" || img.role === "moving-scene") && img.originalAssetId
          ? img.originalAssetId
          : resolved.id;
        function fromOriginal(orig) {
          var oImg = orig.image || {};
          var auto = (oImg.moduleRefs && oImg.moduleRefs.autoEdit) || {};
          var hasEdit = !!(auto.hasEdit && auto.editAssetId);
          var exif = null;
          if (oImg.camera && (oImg.camera.iso != null || oImg.camera.make || oImg.camera.model)) {
            exif = {
              make: oImg.camera.make || null,
              model: oImg.camera.model || null,
              lens: oImg.camera.lens || null,
              focalLengthMm: oImg.camera.focalLengthMm,
              fNumber: oImg.camera.fNumber,
              exposureTimeSec: oImg.camera.exposureTimeSec,
              iso: oImg.camera.iso
            };
          }
          var pack = {
            kind: "library",
            libraryId: orig.id,
            originalAssetId: orig.id,
            hasEdit: hasEdit,
            editAssetId: auto.editAssetId || null,
            sourceChoice: "original",
            filename: oImg.filename,
            exif: exif
          };
          if (!hasEdit) return loadFile(orig.file, pack);
          return Client.resolveLibraryFile(auto.editAssetId).then(function (editPack) {
            pack.editFile = editPack && editPack.file ? editPack.file : null;
            return loadFile(orig.file, pack);
          }).catch(function () {
            pack.hasEdit = false;
            return loadFile(orig.file, pack);
          });
        }
        if (originalId !== resolved.id) {
          return Client.resolveLibraryFile(originalId).then(function (orig) {
            if (!orig || !orig.file) {
              setStatus("That photograph’s original is not stored locally yet.", true);
              return null;
            }
            return fromOriginal(orig);
          });
        }
        return fromOriginal(resolved);
      }).then(function () {
        if (state.source.originalAssetId && global.WaypointPhotoLibraryEngine) {
          try {
            global.WaypointPhotoLibraryEngine.get().markHiddenLandscapes(state.source.originalAssetId, true);
          } catch (e) { /* ignore */ }
        }
      });
    }

    function onPillar(id) {
      state.pillar = id;
      state.view = defaultViewForPillar(id);
      state.highlightRegion = null;
      renderPillars();
      renderViews();
      var p = ensureAnimal(state.view);
      Promise.resolve(p).then(function () {
        renderExplain();
        renderDiscoveries();
        syncStage();
      });
    }

    function onView(id) {
      state.view = id;
      state.highlightRegion = null;
      renderViews();
      var p = state.pillar === "animal" ? ensureAnimal(id) : Promise.resolve();
      p.then(function () {
        renderExplain();
        renderDiscoveries();
        syncStage();
      });
    }

    // Events
    root.addEventListener("click", function (ev) {
      var t = ev.target.closest("[data-pillar]");
      if (t) { onPillar(t.getAttribute("data-pillar")); return; }
      t = ev.target.closest("[data-view]");
      if (t) { onView(t.getAttribute("data-view")); return; }
      t = ev.target.closest("[data-hl-compare]");
      if (t) {
        state.compare = t.getAttribute("data-hl-compare");
        root.querySelectorAll("[data-hl-compare]").forEach(function (b) {
          b.setAttribute("aria-pressed", b === t ? "true" : "false");
        });
        syncStage();
        return;
      }
      t = ev.target.closest("[data-source]");
      if (t && state.source.hasEdit) {
        state.source.sourceChoice = t.getAttribute("data-source");
        updateSourceBadge();
        runAnalysis();
        return;
      }
      t = ev.target.closest(".hl-disc-region");
      if (t && state._discMap) {
        var d = state._discMap[t.getAttribute("data-region")];
        state.highlightRegion = d && d.region ? d.region : null;
        syncStage();
        return;
      }
      if (ev.target.id === "hl-toggle-view") {
        state.showingSim = !state.showingSim;
        syncStage();
        return;
      }
      if (ev.target.id === "hl-export") {
        var data = currentVizData();
        if (!data) return;
        var c = document.createElement("canvas");
        Analyze.putView(c, data);
        var meta = currentViewMeta();
        var ep = meta ? meta.view.epistemic : "computed";
        var label = Models.epistemic(ep).label + " · " + (meta ? meta.view.name : "Hidden Landscapes") +
          " · Waypoint Hidden Landscapes";
        if (state.pillar === "animal" && state.animalCache[state.view] && state.animalCache[state.view].label) {
          label = state.animalCache[state.view].label + " · Waypoint Hidden Landscapes";
        }
        Export.exportLabeled(c, {
          label: label,
          baseName: state.source.filename,
          viewId: state.view,
          epistemic: ep
        }).then(function () {
          setStatus("Saved labeled preview on this device.");
        }).catch(function (e) {
          setStatus(e.message || "Export failed", true);
        });
        return;
      }
      if (ev.target.id === "hl-reset") {
        revoke(state.originalUrl);
        revoke(state.editUrl);
        state.source = Models.emptySource();
        state.originalUrl = null;
        state.editUrl = null;
        state.originalImg = null;
        state.editImg = null;
        state.analysis = null;
        state.animalCache = {};
        state.highlightRegion = null;
        updateSourceBadge();
        showWorkspace(false);
        renderDiscoveries();
        setStatus("");
        var file = $("hl-file");
        if (file) file.value = "";
        return;
      }
    });

    var slider = $("hl-slider");
    if (slider) {
      slider.addEventListener("input", function () {
        var wrap = document.querySelector(".hl-slider-wrap");
        if (wrap) wrap.style.setProperty("--hl-split", slider.value + "%");
        slider.setAttribute("aria-valuenow", slider.value);
      });
    }

    var drop = $("hl-drop");
    var fileInput = $("hl-file");
    function ingestFiles(files) {
      var f = files && files[0];
      if (!f) return;
      loadFile(f, { kind: "import", sourceChoice: "original" }).catch(function (e) {
        setStatus(e.message || "Could not open photograph", true);
      });
    }
    if (fileInput) fileInput.addEventListener("change", function () { ingestFiles(fileInput.files); });
    if (drop) {
      drop.addEventListener("click", function () { if (fileInput) fileInput.click(); });
      drop.addEventListener("keydown", function (ev) {
        if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); if (fileInput) fileInput.click(); }
      });
      drop.addEventListener("dragover", function (ev) { ev.preventDefault(); drop.classList.add("is-drag"); });
      drop.addEventListener("dragleave", function () { drop.classList.remove("is-drag"); });
      drop.addEventListener("drop", function (ev) {
        ev.preventDefault();
        drop.classList.remove("is-drag");
        ingestFiles(ev.dataTransfer.files);
      });
    }

    // Boot: load catalogs
    Promise.all([
      fetch("data/modes.json").then(function (r) { return r.json(); }),
      fetch("data/species.json").then(function (r) { return r.json(); })
    ]).then(function (pair) {
      state.catalog = pair[0];
      state.species = pair[1];
      var honesty = $("hl-honesty");
      if (honesty) honesty.textContent = state.catalog.mission;
      renderPillars();
      renderViews();
      renderExplain();
      renderSpectralUnavailable();
      renderDiscoveries();
      updateSourceBadge();
      root.setAttribute("aria-busy", "false");

      // Deep link pillar
      try {
        var q = new URLSearchParams(global.location.search || "");
        var pillar = q.get("pillar") || q.get("mode");
        if (pillar === "animal-vision") pillar = "animal";
        if (pillar && ["light", "color", "structure", "animal"].indexOf(pillar) >= 0) {
          state.pillar = pillar;
          state.view = defaultViewForPillar(pillar);
          renderPillars();
          renderViews();
          renderExplain();
        }
        var lib = q.get("libraryId") || q.get("photoId");
        if (lib) return loadFromLibrary(lib);
      } catch (e) { /* ignore */ }
    }).catch(function (e) {
      setStatus("Could not load Hidden Landscapes catalog.", true);
      root.setAttribute("aria-busy", "false");
    });

    // Mobile default compare
    if (global.matchMedia && global.matchMedia("(max-width: 719px)").matches) {
      state.compare = "toggle";
      root.querySelectorAll("[data-hl-compare]").forEach(function (b) {
        b.setAttribute("aria-pressed", b.getAttribute("data-hl-compare") === "toggle" ? "true" : "false");
      });
    }
  }

  global.WaypointHLStudio = { mount: mount };
})(typeof window !== "undefined" ? window : globalThis);
