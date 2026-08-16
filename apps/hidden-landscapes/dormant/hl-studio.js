/**
 * Hidden Landscapes Studio — UI
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

  function accuracyLabel(catalog, type) {
    var cats = (catalog.honesty && catalog.honesty.categories) || [];
    for (var i = 0; i < cats.length; i++) {
      if (cats[i].id === type) return cats[i];
    }
    return { id: type, label: type, meaning: "" };
  }

  function mountStudio() {
    var root = document.getElementById("hl-studio");
    if (!root) return;

    var catalog = null;
    var engine = null;
    var compareMode = (global.matchMedia && global.matchMedia("(max-width: 719px)").matches) ? "toggle" : "slider";
    var showingTransformed = true;

    function setStatus(msg, isError) {
      var el = document.getElementById("hl-status");
      if (!el) return;
      el.textContent = msg || "";
      el.classList.toggle("hl-status--error", !!isError);
    }

    function renderModes() {
      var host = document.getElementById("hl-modes");
      if (!host || !catalog) return;
      var state = engine ? engine.getState() : { modeId: "original" };
      host.innerHTML = catalog.transformations.map(function (t) {
        var pressed = t.id === state.modeId;
        return (
          '<button type="button" class="hl-mode' + (pressed ? " is-active" : "") + '" data-mode="' + esc(t.id) + '" aria-pressed="' + pressed + '">' +
            "<span class=\"hl-mode__name\">" + esc(t.name) + "</span>" +
            "<span class=\"hl-mode__short\">" + esc(t.shortDescription) + "</span>" +
          "</button>"
        );
      }).join("");
    }

    function renderExplain() {
      var panel = document.getElementById("hl-explain");
      if (!panel || !catalog) return;
      var state = engine ? engine.getState() : null;
      var mode = (state && state.mode) || catalog.transformations[0];
      var acc = accuracyLabel(catalog, mode.accuracyType);
      panel.innerHTML =
        '<div class="hl-realism" data-accuracy="' + esc(acc.id) + '">' +
          '<p class="hl-realism__label">How real is this?</p>' +
          "<p class=\"hl-realism__value\">" + esc(acc.label) + "</p>" +
          "<p class=\"hl-realism__meaning\">" + esc(acc.meaning) + "</p>" +
        "</div>" +
        "<h3>" + esc(mode.name) + "</h3>" +
        "<p>" + esc(mode.longDescription) + "</p>" +
        '<div class="hl-capture">' +
          "<h4>Capture requirements</h4>" +
          "<p>" +
            (mode.requiresSpecialCapture
              ? "True results in this family of looks usually need specialized capture equipment (converted camera and/or wavelength filters). This preview remains a creative simulation from your RGB file."
              : mode.id === "original"
                ? "No special equipment — this is your original visible-light photograph."
                : "This creative simulation does not require special gear. Specialized spectral capture is a separate, future path.") +
          "</p>" +
        "</div>" +
        "<p class=\"hl-edu-note\">" + esc(mode.educationalNotes) + "</p>";
    }

    function syncCanvasesToView() {
      var state = engine.getState();
      if (!state.hasImage) return;
      var origView = document.getElementById("hl-canvas-original");
      var resultView = document.getElementById("hl-canvas-result");
      var sliderBase = document.getElementById("hl-canvas-slider-base");
      var sliderTop = document.getElementById("hl-canvas-slider-top");
      var toggleView = document.getElementById("hl-canvas-toggle");

      function blit(from, to) {
        if (!from || !to || !from.width) return;
        to.width = from.width;
        to.height = from.height;
        to.getContext("2d").drawImage(from, 0, 0);
      }

      blit(state.originalCanvas, origView);
      blit(state.resultCanvas || state.originalCanvas, resultView);
      blit(state.originalCanvas, sliderBase);
      blit(state.resultCanvas || state.originalCanvas, sliderTop);
      blit(showingTransformed ? (state.resultCanvas || state.originalCanvas) : state.originalCanvas, toggleView);

      if (sliderTop && sliderBase) {
        var w = sliderBase.clientWidth || sliderBase.width;
        sliderTop.style.width = w + "px";
        sliderTop.style.height = "100%";
      }
      var wrap = document.querySelector(".hl-slider-wrap");
      var slider = document.getElementById("hl-slider");
      if (wrap && slider) wrap.style.setProperty("--hl-split", slider.value + "%");

      var label = document.getElementById("hl-view-label");
      if (label) {
        if (compareMode === "side") label.textContent = "Original and transformation side by side";
        else if (compareMode === "toggle") label.textContent = showingTransformed ? "Showing transformation" : "Showing original";
        else label.textContent = "Drag the slider to compare original and transformation";
      }
    }

    function showWorkspace(on) {
      var empty = document.getElementById("hl-empty");
      var work = document.getElementById("hl-workspace");
      if (empty) empty.hidden = !!on;
      if (work) work.hidden = !on;
      var intensity = document.getElementById("hl-intensity");
      var exportBtn = document.getElementById("hl-export");
      var resetBtn = document.getElementById("hl-reset");
      if (intensity) intensity.disabled = !on;
      if (exportBtn) exportBtn.disabled = !on;
      if (resetBtn) resetBtn.disabled = !on;
    }

    function afterRender() {
      syncCanvasesToView();
      renderModes();
      renderExplain();
      var intensity = document.getElementById("hl-intensity");
      var state = engine.getState();
      if (intensity && state) {
        intensity.value = String(Math.round((state.intensity || 0) * 100));
        var out = document.getElementById("hl-intensity-val");
        if (out) out.textContent = Math.round((state.intensity || 0) * 100) + "%";
        intensity.disabled = !state.hasImage || state.modeId === "original";
      }
    }

    function runMode(modeId, intensity) {
      if (!engine.getState().hasImage) return;
      setStatus("Rendering…");
      engine.applyTransformation(modeId, intensity).then(function () {
        setStatus("Processed locally · creative simulation");
        afterRender();
      }).catch(function (err) {
        setStatus(err.message || "Processing failed.", true);
      });
    }

    function onFile(file) {
      if (!file) return;
      setStatus("Loading photograph…");
      engine.loadImage(file).then(function (meta) {
        showWorkspace(true);
        setStatus(
          "Loaded " + meta.fileName + " · preview " + meta.processWidth + "×" + meta.processHeight +
          (meta.naturalWidth > meta.processWidth ? " (downscaled for safe processing)" : "")
        );
        return engine.applyTransformation("original", 1);
      }).then(function () {
        afterRender();
      }).catch(function (err) {
        showWorkspace(false);
        setStatus(err.message || "Could not load image.", true);
      });
    }

    function bind() {
      var drop = document.getElementById("hl-drop");
      var file = document.getElementById("hl-file");
      if (drop && file) {
        drop.addEventListener("click", function () { file.click(); });
        drop.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            file.click();
          }
        });
        drop.addEventListener("dragover", function (e) {
          e.preventDefault();
          drop.classList.add("is-drag");
        });
        drop.addEventListener("dragleave", function () { drop.classList.remove("is-drag"); });
        drop.addEventListener("drop", function (e) {
          e.preventDefault();
          drop.classList.remove("is-drag");
          var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
          if (f) onFile(f);
        });
        file.addEventListener("change", function () {
          var f = file.files && file.files[0];
          if (f) onFile(f);
        });
      }

      document.getElementById("hl-modes").addEventListener("click", function (e) {
        var btn = e.target.closest("[data-mode]");
        if (!btn) return;
        runMode(btn.getAttribute("data-mode"));
      });

      var intensity = document.getElementById("hl-intensity");
      var intensityTimer = null;
      intensity.addEventListener("input", function () {
        var v = Number(intensity.value) / 100;
        var out = document.getElementById("hl-intensity-val");
        if (out) out.textContent = Math.round(v * 100) + "%";
        clearTimeout(intensityTimer);
        intensityTimer = setTimeout(function () {
          if (!engine.getState().hasImage) return;
          runMode(engine.getState().modeId, v);
        }, 80);
      });

      document.querySelectorAll("[data-hl-compare]").forEach(function (btn) {
        btn.addEventListener("click", function () {
          compareMode = btn.getAttribute("data-hl-compare");
          document.querySelectorAll("[data-hl-compare]").forEach(function (b) {
            b.setAttribute("aria-pressed", b === btn ? "true" : "false");
          });
          var stage = document.getElementById("hl-stage");
          if (stage) stage.setAttribute("data-compare", compareMode);
          syncCanvasesToView();
        });
      });

      var toggleBtn = document.getElementById("hl-toggle-view");
      if (toggleBtn) {
        toggleBtn.addEventListener("click", function () {
          showingTransformed = !showingTransformed;
          syncCanvasesToView();
        });
      }

      var slider = document.getElementById("hl-slider");
      var clip = document.getElementById("hl-slider-clip");
      var wrap = document.querySelector(".hl-slider-wrap");
      if (slider && clip) {
        function syncSlider() {
          var pct = Number(slider.value);
          if (wrap) wrap.style.setProperty("--hl-split", pct + "%");
          clip.style.width = pct + "%";
          slider.setAttribute("aria-valuenow", String(pct));
        }
        slider.addEventListener("input", syncSlider);
        syncSlider();
      }

      document.getElementById("hl-reset").addEventListener("click", function () {
        engine.reset();
        showWorkspace(false);
        file.value = "";
        setStatus("Ready for another photograph.");
        renderModes();
        renderExplain();
      });

      document.getElementById("hl-export").addEventListener("click", function () {
        engine.exportImage({ format: "jpeg" }).then(function (res) {
          setStatus("Saved locally as " + res.filename);
        }).catch(function (err) {
          setStatus(err.message || "Export failed.", true);
        });
      });
    }

    function renderEducation() {
      var host = document.getElementById("hl-education");
      if (!host || !catalog) return;
      host.innerHTML = (catalog.education || []).map(function (item) {
        return (
          "<article class=\"hl-edu-card\">" +
            "<h3>" + esc(item.title) + "</h3>" +
            "<p>" + esc(item.body) + "</p>" +
          "</article>"
        );
      }).join("");
    }

    fetch("data/transformations.json")
      .then(function (r) {
        if (!r.ok) throw new Error("catalog");
        return r.json();
      })
      .then(function (data) {
        catalog = data;
        engine = HiddenLandscapesVision.createVisionEngine({ catalog: catalog });
        global.HiddenLandscapesStudioEngine = engine;
        global.WaypointScenesEngines = global.WaypointScenesEngines || {};
        global.WaypointScenesEngines.VisionEngine = engine;
        var honesty = document.getElementById("hl-honesty");
        if (honesty && catalog.honesty) honesty.textContent = catalog.honesty.summary;
        renderModes();
        renderExplain();
        renderEducation();
        bind();
        showWorkspace(false);
        var stage = document.getElementById("hl-stage");
        if (stage) stage.setAttribute("data-compare", compareMode);
        document.querySelectorAll("[data-hl-compare]").forEach(function (b) {
          b.setAttribute("aria-pressed", b.getAttribute("data-hl-compare") === compareMode ? "true" : "false");
        });
        root.removeAttribute("aria-busy");
        setStatus("Upload a landscape photograph to begin. Processing stays on this device.");

        // Photo Library deep-link
        var LibClient = global.WaypointPhotoLibraryClient;
        if (LibClient && LibClient.resolveLibraryFile) {
          LibClient.resolveLibraryFile().then(function (pack) {
            if (pack && pack.file) {
              onFile(pack.file);
              if (pack.id && global.WaypointPhotoLibraryEngine) {
                try {
                  global.WaypointPhotoLibraryEngine.get().markHiddenLandscapes(pack.id, true);
                } catch (e) { /* optional */ }
              }
            }
          }).catch(function () { /* ignore */ });
        }
      })
      .catch(function () {
        root.innerHTML = '<p class="wds-body" role="alert">Could not load Hidden Landscapes transformations.</p>';
      });
  }

  global.HiddenLandscapesStudio = { mount: mountStudio };

  if (document.getElementById("hl-studio")) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mountStudio);
    else mountStudio();
  }
})(typeof window !== "undefined" ? window : globalThis);
