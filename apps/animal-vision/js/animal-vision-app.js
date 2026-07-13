/**
 * Animal Vision — UI: upload, species select, compare, explain, export.
 * All processing stays in the browser.
 */
(function (global) {
  "use strict";

  var AV = global.WaypointAnimalVision;
  var state = {
    objectUrl: null,
    fileName: "photo",
    image: null,
    speciesId: null,
    result: null,
    compareMode: "side",
    showOriginal: false,
    busy: false
  };

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setStatus(msg, isError) {
    var el = $("#av-status");
    if (!el) return;
    el.textContent = msg || "";
    el.classList.toggle("is-error", !!isError);
  }

  function revokeUrl() {
    if (state.objectUrl) {
      URL.revokeObjectURL(state.objectUrl);
      state.objectUrl = null;
    }
  }

  function renderSpeciesOptions() {
    var host = $("#av-species");
    if (!host || !AV.species) return;
    var list = AV.species.list();
    host.innerHTML = list.map(function (sp, idx) {
      var checked = (!state.speciesId && idx === 0) || state.speciesId === sp.id;
      if (checked) state.speciesId = sp.id;
      return (
        '<label class="av-species">' +
          '<input type="radio" name="av-species" value="' + esc(sp.id) + '"' +
            (checked ? " checked" : "") + ">" +
          '<span class="av-species__body">' +
            "<strong>" + esc(sp.commonName) + "</strong>" +
            "<em>" + esc(sp.scientificName) + "</em>" +
            "<span>" + esc(sp.visionSummary) + "</span>" +
          "</span>" +
        "</label>"
      );
    }).join("");
  }

  function renderExplanation(species) {
    var host = $("#av-explain");
    if (!host) return;
    if (!species) {
      host.innerHTML = "<p class=\"av-muted\">Choose a species and generate an interpretation to read the research notes.</p>";
      return;
    }
    var changes = (species.educationalNotes || []).map(function (n) {
      return "<li>" + esc(n) + "</li>";
    }).join("");
    var cannot = (species.cannotRepresent || []).map(function (n) {
      return "<li>" + esc(n) + "</li>";
    }).join("");
    var inspire = (species.photographyInspiration || []).map(function (n) {
      return "<li>" + esc(n) + "</li>";
    }).join("");
    var beeNote = species.id === "honeybee"
      ? '<p class="av-callout" role="note"><strong>UV-inspired educational interpretation.</strong> Ordinary photographs contain no ultraviolet channel — nothing UV is recovered from your file.</p>'
      : "";

    host.innerHTML =
      "<h2>What changed — and why</h2>" +
      beeNote +
      "<p>" + esc(species.visionSummary) + "</p>" +
      "<h3>Applied visual changes</h3><ul>" + changes + "</ul>" +
      "<h3>What cannot be represented here</h3><ul>" + cannot + "</ul>" +
      "<h3>Photography inspiration</h3><ul>" + inspire + "</ul>" +
      '<p class="av-disclaimer">' + esc(AV.species.disclaimer()) + "</p>";
  }

  function syncCompareChrome() {
    var stage = $("#av-stage");
    if (!stage) return;
    stage.setAttribute("data-compare", state.compareMode);
    stage.classList.toggle("is-showing-original", state.showOriginal);
    var label = $("#av-view-label");
    if (label) {
      if (state.compareMode === "toggle") {
        label.textContent = state.showOriginal ? "Showing original" : "Showing interpretation";
      } else if (state.compareMode === "slider") {
        label.textContent = "Drag the slider to compare";
      } else {
        label.textContent = "Original and interpretation side by side";
      }
    }
  }

  function syncSliderOverlay() {
    var base = $("#av-canvas-slider-base");
    var top = $("#av-canvas-slider-top");
    var wrap = $("#av-slider-clip");
    var range = $("#av-slider");
    if (!base || !top || !wrap) return;
    var w = base.clientWidth || base.width;
    var h = base.clientHeight || base.height;
    top.style.width = w + "px";
    top.style.height = h + "px";
    if (range) {
      wrap.style.setProperty("--av-split", range.value + "%");
      range.setAttribute("aria-valuenow", range.value);
    }
  }

  function paintCanvases() {
    if (!state.result || !AV.transforms) return;
    var original = $("#av-canvas-original");
    var interpreted = $("#av-canvas-interpreted");
    var sliderBase = $("#av-canvas-slider-base");
    var sliderTop = $("#av-canvas-slider-top");
    AV.transforms.paintData(original, state.result.originalData);
    AV.transforms.paintData(interpreted, state.result.interpretedData);
    AV.transforms.paintData(sliderBase, state.result.originalData);
    AV.transforms.paintData(sliderTop, state.result.interpretedData);
    var toggle = $("#av-canvas-toggle");
    AV.transforms.paintData(
      toggle,
      state.showOriginal ? state.result.originalData : state.result.interpretedData
    );
    syncCompareChrome();
    requestAnimationFrame(syncSliderOverlay);
  }

  function setBusy(busy) {
    state.busy = !!busy;
    var btn = $("#av-generate");
    if (btn) {
      btn.disabled = busy || !state.image || !state.speciesId;
      btn.textContent = busy ? "Working…" : "Generate interpretation";
    }
    document.documentElement.classList.toggle("av-busy", state.busy);
  }

  function generate() {
    if (!state.image || !state.speciesId || state.busy) return;
    var species = AV.species.byId(state.speciesId);
    if (!species) {
      setStatus("Choose a species first.", true);
      return;
    }
    setBusy(true);
    setStatus("Building a research-informed interpretation…");
    var start = performance.now();
    // Yield so the UI can paint the busy state before heavy pixel work.
    setTimeout(function () {
      AV.transforms.applySpecies(state.image, species).then(function (result) {
        state.result = result;
        paintCanvases();
        renderExplanation(species);
        $("#av-workspace").hidden = false;
        $("#av-empty").hidden = true;
        setStatus(
          "Ready · " + species.commonName + " · " +
          Math.round(performance.now() - start) + " ms · local only"
        );
        setBusy(false);
      }).catch(function () {
        setStatus("Could not interpret this photograph. Try another image.", true);
        setBusy(false);
      });
    }, 30);
  }

  function loadFile(file) {
    if (!file || !/^image\//.test(file.type)) {
      setStatus("Please choose a JPG, PNG, or WebP photograph.", true);
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setStatus("Please keep files under 20 MB.", true);
      return;
    }
    revokeUrl();
    state.objectUrl = URL.createObjectURL(file);
    state.fileName = file.name || "photo";
    state.result = null;
    var img = new Image();
    img.onload = function () {
      state.image = img;
      setStatus("Photograph ready · " + file.name + " · stays on this device");
      setBusy(false);
      if (state.speciesId) generate();
    };
    img.onerror = function () {
      setStatus("That file could not be read as an image.", true);
      setBusy(false);
    };
    img.src = state.objectUrl;
  }

  function bindUpload() {
    var input = $("#av-file");
    var zone = $("#av-drop");
    if (!input || !zone) return;

    function onFiles(files) {
      if (files && files[0]) loadFile(files[0]);
    }

    input.addEventListener("change", function () {
      onFiles(input.files);
    });

    zone.addEventListener("click", function (e) {
      if (e.target === input) return;
      input.click();
    });

    zone.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        input.click();
      }
    });

    ["dragenter", "dragover"].forEach(function (type) {
      zone.addEventListener(type, function (e) {
        e.preventDefault();
        zone.classList.add("is-drag");
      });
    });
    ["dragleave", "drop"].forEach(function (type) {
      zone.addEventListener(type, function (e) {
        e.preventDefault();
        zone.classList.remove("is-drag");
        if (type === "drop") onFiles(e.dataTransfer && e.dataTransfer.files);
      });
    });
  }

  function bindControls() {
    var speciesHost = $("#av-species");
    if (speciesHost) {
      speciesHost.addEventListener("change", function (e) {
        var t = e.target;
        if (t && t.name === "av-species") {
          state.speciesId = t.value;
          if (state.image) generate();
          else renderExplanation(AV.species.byId(state.speciesId));
        }
      });
    }

    var gen = $("#av-generate");
    if (gen) gen.addEventListener("click", generate);

    document.querySelectorAll("[data-av-compare]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.compareMode = btn.getAttribute("data-av-compare");
        document.querySelectorAll("[data-av-compare]").forEach(function (b) {
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        syncCompareChrome();
        paintCanvases();
      });
    });

    var toggleBtn = $("#av-toggle-view");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", function () {
        state.showOriginal = !state.showOriginal;
        paintCanvases();
      });
    }

    var resetBtn = $("#av-reset");
    if (resetBtn) {
      resetBtn.addEventListener("click", function () {
        state.result = null;
        state.image = null;
        state.fileName = "photo";
        revokeUrl();
        var input = $("#av-file");
        if (input) input.value = "";
        $("#av-workspace").hidden = true;
        $("#av-empty").hidden = false;
        renderExplanation(AV.species.byId(state.speciesId));
        setStatus("Ready for a new photograph.");
        setBusy(false);
      });
    }

    var range = $("#av-slider");
    if (range) {
      range.addEventListener("input", function () {
        var wrap = $("#av-slider-clip");
        if (wrap) wrap.style.setProperty("--av-split", range.value + "%");
        range.setAttribute("aria-valuenow", range.value);
        syncSliderOverlay();
      });
      range.dispatchEvent(new Event("input"));
    }

    window.addEventListener("resize", function () {
      if (state.result) syncSliderOverlay();
    });

    var exportJpeg = $("#av-export-jpeg");
    var exportPng = $("#av-export-png");
    function doExport(format) {
      if (!state.result) {
        setStatus("Generate an interpretation before exporting.", true);
        return;
      }
      var species = AV.species.byId(state.speciesId);
      var canvas = document.createElement("canvas");
      AV.transforms.paintData(canvas, state.result.interpretedData);
      AV.export.exportInterpretation(canvas, {
        format: format,
        baseName: state.fileName,
        speciesSlug: species && species.filenameSlug
      }).then(function (info) {
        setStatus("Exported " + info.filename + " · stayed on this device");
      }).catch(function () {
        setStatus("Export failed.", true);
      });
    }
    if (exportJpeg) exportJpeg.addEventListener("click", function () { doExport("jpeg"); });
    if (exportPng) exportPng.addEventListener("click", function () { doExport("png"); });
  }

  function init() {
    if (!AV || !AV.species || !AV.transforms || !AV.export) {
      setStatus("Animal Vision modules failed to load.", true);
      return;
    }
    var privacy = $("#av-privacy");
    if (privacy) privacy.textContent = AV.species.privacyNote();
    var disc = $("#av-disclaimer-static");
    if (disc) disc.textContent = AV.species.disclaimer();

    renderSpeciesOptions();
    renderExplanation(AV.species.byId(state.speciesId));
    bindUpload();
    bindControls();
    syncCompareChrome();
    setStatus("Choose a photograph to begin. Everything stays on your device.");
    setBusy(false);
  }

  global.WaypointAnimalVision = AV || {};
  global.WaypointAnimalVision.app = { init: init, _state: state };
})(typeof window !== "undefined" ? window : globalThis);
