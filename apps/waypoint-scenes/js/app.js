(function () {
  "use strict";

  var imageUrl = null;
  var imageLoaded = false;
  var parallaxImageUrl = null;
  var parallaxImageLoaded = false;
  var parallaxActivePresetId = "gentle-drift";
  var exportPreviewTimer = null;

  var PARALLAX_SLIDER_KEYS = ["sensitivity", "strength", "depthStrength", "smoothing", "zoom"];

  var STUDIO_PARAMS = [
    { key: "intensity", label: "Amount" },
    { key: "speed", label: "Pace" },
    { key: "opacity", label: "Opacity" },
    { key: "scale", label: "Size" },
    { key: "randomness", label: "Variation" }
  ];

  var CAMERA_PARAMS = [
    { key: "zoomAmount", label: "Near" },
    { key: "horizontalDrift", label: "Wander" },
    { key: "verticalDrift", label: "Lift" },
    { key: "rotation", label: "Tilt" }
  ];

  var SCENE_PRESETS = [];

  var els = {};

  function $(id) {
    return document.getElementById(id);
  }

  function init() {
    els.fileInput = $("file-input");
    els.uploadError = $("upload-error");
    els.hero = $("hero");
    els.workspace = $("workspace");
    els.previewShell = $("preview-shell");
    els.previewEmpty = $("preview-empty");
    els.sceneFrame = $("scene-frame");
    els.sceneImg = $("scene-img");
    els.sceneStage = $("scene-stage");
    els.sceneBgInner = $("scene-bg-inner");
    els.sceneBgMotion = $("scene-bg-motion");
    els.effectLayers = $("effect-layers");
    els.canvasEffects = $("canvas-effects");
    els.previewMeta = $("preview-meta");
    els.exportCanvas = $("export-canvas");
    els.comingSoonMount = $("coming-soon-mount");
    els.effectsGrid = $("effects-grid");
    els.cameraSliders = $("camera-sliders");
    els.effectsStudio = $("effects-studio");
    els.presetRecommendations = $("preset-recommendations");
    els.analysisSummary = $("analysis-summary");
    els.analysisTags = $("analysis-tags");
    els.recommendationList = $("recommendation-list");
    els.parallaxShell = $("parallax-shell");
    els.parallaxEmpty = $("parallax-empty");
    els.parallaxFrame = $("parallax-frame");
    els.parallaxViewport = $("parallax-viewport");
    els.parallaxMeta = $("parallax-meta");
    els.parallaxFileInput = $("parallax-file-input");
    els.parallaxControls = $("parallax-controls");
    els.parallaxPresetsGrid = $("parallax-presets-grid");
    els.parallaxTiltHint = $("parallax-tilt-hint");
    els.parallaxStage = $("parallax-stage");
    els.workspaceUploadError = $("workspace-upload-error");
    els.livingSidebar = $("living-sidebar");
    els.exportDownloadBtn = $("btn-export-download");

    loadPresets();
    buildCameraSliders();
    buildEffectModules();
    buildPresets();
    buildParallaxPresets();
    buildComingSoon();
    bindUpload();
    bindParallax();
    bindStudio();
    bindTabs();
    bindExport();
    bindResize();
    setWorkspaceState(false);
    setParallaxState(false);
    initParallaxEngine();
    initPhotography();
    if (window.WaypointLearn) window.WaypointLearn.init();
    updateSidebarAwaitingImage();
    updateExportActions();
  }

  function validateUploadFile(file) {
    return window.WaypointFileUpload
      ? window.WaypointFileUpload.validate(file)
      : { ok: true };
  }

  function resetFileInput(input) {
    if (window.WaypointFileUpload) window.WaypointFileUpload.resetInput(input);
    else if (input) input.value = "";
  }

  function revokeIfBlob(url) {
    if (window.WaypointFileUpload) window.WaypointFileUpload.revokeIfBlob(url);
    else if (url && url.indexOf("blob:") === 0) URL.revokeObjectURL(url);
  }

  function updateSidebarAwaitingImage() {
    if (!els.livingSidebar) return;
    var awaiting = !imageLoaded;
    els.livingSidebar.classList.toggle("is-awaiting-image", awaiting);
  }

  function updateWorkspaceContentState() {
    if (!els.workspace) return;
    els.workspace.classList.toggle("has-content", imageLoaded || parallaxImageLoaded);
  }

  function updateExportActions() {
    if (!els.exportDownloadBtn) return;
    els.exportDownloadBtn.disabled = !imageLoaded;
  }

  function bindExport() {
    if (!els.exportDownloadBtn) return;
    els.exportDownloadBtn.addEventListener("click", function () {
      if (!imageLoaded || !els.exportCanvas || !window.WaypointExport) return;
      updateExportPreview();
      var name = (els.previewMeta && els.previewMeta.textContent)
        ? els.previewMeta.textContent.replace(/\.[^.]+$/, "") + "-scene.png"
        : "scene.png";
      window.WaypointExport.downloadSnapshot(els.exportCanvas, name);
    });
  }

  function initPhotography() {
    if (window.WaypointPhotography) {
      window.WaypointPhotography.init({ mount: $("tab-photography") });
    }
  }

  function getModuleMeta() {
    return window.WaypointEffects ? window.WaypointEffects.getModuleMeta() : [];
  }

  function sliderHtml(prefix, key, label, value) {
    return (
      '<div class="fx-param">' +
        '<div class="fx-param-head">' +
          '<label for="' + prefix + "-" + key + '">' + label + "</label>" +
          '<span class="fx-param-val" data-val="' + prefix + ":" + key + '">' + value + "%</span>" +
        "</div>" +
        '<input type="range" class="range-slider range-slider-sm" id="' + prefix + "-" + key + '" ' +
          'data-param="' + prefix + ":" + key + '" min="0" max="100" value="' + value + '">' +
      "</div>"
    );
  }

  function buildCameraSliders() {
    if (!els.cameraSliders || !window.WaypointEffects) return;
    var defaults = window.WaypointEffects.getDefaultCamera();
    els.cameraSliders.innerHTML = CAMERA_PARAMS.map(function (p) {
      return sliderHtml("cam", p.key, p.label, defaults[p.key]);
    }).join("");
  }

  function buildEffectModules() {
    if (!els.effectsGrid || !window.WaypointEffects) return;
    els.effectsGrid.innerHTML = "";

    getModuleMeta().forEach(function (def) {
      var defaults = window.WaypointEffects.getDefaultStateForId(def.id);
      var card = document.createElement("div");
      card.className = "effect-module";
      card.setAttribute("data-effect", def.id);

      var sliders = STUDIO_PARAMS.map(function (p) {
        return sliderHtml("fx-" + def.id, p.key, p.label, defaults[p.key]);
      }).join("");

      card.innerHTML =
        '<div class="effect-module-head">' +
          '<label class="effect-toggle-row effect-module-toggle">' +
            '<input type="checkbox" name="fx-enabled" data-fx="' + def.id + '">' +
            '<span class="effect-toggle-track"><span class="effect-toggle-thumb"></span></span>' +
            '<span class="effect-toggle-copy">' +
              '<span class="effect-name">' + def.name + '</span>' +
              '<span class="effect-desc">' + (def.description || "") + "</span>" +
            "</span>" +
          "</label>" +
        "</div>" +
        '<div class="effect-module-params" hidden>' + sliders + "</div>";

      els.effectsGrid.appendChild(card);
    });
  }

  function readSlider(prefix, key, fallback) {
    var input = document.querySelector('[data-param="' + prefix + ":" + key + '"]');
    if (!input) return fallback;
    var val = parseInt(input.value, 10);
    var valEl = document.querySelector('[data-val="' + prefix + ":" + key + '"]');
    if (valEl && !isNaN(val)) valEl.textContent = val + "%";
    return isNaN(val) ? fallback : val;
  }

  function getCameraState() {
    var defaults = window.WaypointEffects.getDefaultCamera();
    var state = {};
    CAMERA_PARAMS.forEach(function (p) {
      state[p.key] = readSlider("cam", p.key, defaults[p.key]);
    });
    return state;
  }

  function getEffectState() {
    var state = {};
    getModuleMeta().forEach(function (def) {
      var id = def.id;
      var enabledInput = document.querySelector('[data-fx="' + id + '"]');
      var defaults = window.WaypointEffects.getDefaultStateForId(id);
      var prefix = "fx-" + id;
      state[id] = {
        enabled: enabledInput ? enabledInput.checked : false,
        intensity: readSlider(prefix, "intensity", defaults.intensity),
        speed: readSlider(prefix, "speed", defaults.speed),
        opacity: readSlider(prefix, "opacity", defaults.opacity),
        scale: readSlider(prefix, "scale", defaults.scale),
        randomness: readSlider(prefix, "randomness", defaults.randomness)
      };
    });
    return state;
  }

  function getEngineConfig() {
    return {
      stage: els.sceneStage,
      domRoot: els.effectLayers,
      canvas: els.canvasEffects,
      bgInner: els.sceneBgInner,
      bgMotion: els.sceneBgMotion,
      sceneImg: els.sceneImg,
      exportCanvas: els.exportCanvas,
      camera: getCameraState(),
      effectState: getEffectState()
    };
  }

  function findPresetById(id) {
    return SCENE_PRESETS.find(function (p) {
      return p.id === id;
    });
  }

  function analyzePhoto(img) {
    if (!window.WaypointSceneAnalyzer || !window.WaypointPresetRecommendations) {
      hideRecommendations();
      return;
    }

    var analysis = window.WaypointSceneAnalyzer.analyze(img);
    var recs = window.WaypointPresetRecommendations.recommend(analysis);
    renderRecommendations(analysis, recs);
  }

  function hideRecommendations() {
    if (els.presetRecommendations) els.presetRecommendations.hidden = true;
    if (els.analysisTags) els.analysisTags.innerHTML = "";
    if (els.recommendationList) els.recommendationList.innerHTML = "";
  }

  function renderRecommendations(analysis, recs) {
    if (!els.presetRecommendations) return;

    if (!recs.length) {
      hideRecommendations();
      return;
    }

    els.presetRecommendations.hidden = false;

    if (els.analysisSummary && window.WaypointPresetRecommendations.depthSummary) {
      els.analysisSummary.textContent = window.WaypointPresetRecommendations.depthSummary(analysis.depth);
    }

    if (els.analysisTags) {
      els.analysisTags.innerHTML = "";
      analysis.labels.forEach(function (item) {
        var tag = document.createElement("span");
        tag.className = "analysis-tag";
        tag.textContent = item.label;
        els.analysisTags.appendChild(tag);
      });
    }

    if (els.recommendationList) {
      els.recommendationList.innerHTML = "";
      recs.forEach(function (rec, index) {
        var preset = findPresetById(rec.presetId);
        if (!preset) return;

        var btn = document.createElement("button");
        btn.type = "button";
        btn.className = "recommendation-card";
        btn.setAttribute("data-preset", rec.presetId);

        var copy = document.createElement("span");
        copy.className = "recommendation-copy";

        var title = document.createElement("span");
        title.className = "recommendation-name";
        title.textContent = preset.name;

        var reason = document.createElement("span");
        reason.className = "recommendation-reason";
        reason.textContent = rec.reason;

        copy.appendChild(title);
        copy.appendChild(reason);
        btn.appendChild(copy);

        btn.addEventListener("click", function () {
          applyPreset(rec.presetId);
        });

        els.recommendationList.appendChild(btn);
      });
    }
  }

  function buildPresets() {
    var container = $("presets-grid");
    if (!container) return;
    container.innerHTML = "";

    SCENE_PRESETS.forEach(function (preset) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "preset-card";
      btn.setAttribute("data-preset", preset.id);
      btn.setAttribute("aria-pressed", "false");

      var title = document.createElement("span");
      title.className = "preset-name";
      title.textContent = preset.name;

      var desc = document.createElement("span");
      desc.className = "preset-desc";
      desc.textContent = preset.description;

      btn.appendChild(title);
      btn.appendChild(desc);
      btn.addEventListener("click", function () {
        applyPreset(preset.id);
      });
      container.appendChild(btn);
    });
  }

  function setSlider(prefix, key, value) {
    var input = document.querySelector('[data-param="' + prefix + ":" + key + '"]');
    if (input) input.value = String(value);
    var valEl = document.querySelector('[data-val="' + prefix + ":" + key + '"]');
    if (valEl) valEl.textContent = value + "%";
  }

  function loadPresets() {
    SCENE_PRESETS = window.WaypointScenePresets
      ? window.WaypointScenePresets.all()
      : [];
  }

  function setModuleState(id, config) {
    var input = document.querySelector('[data-fx="' + id + '"]');
    if (!input) return;
    var enabled = !!config.enabled;
    input.checked = enabled;
    var card = input.closest(".effect-module");
    if (card) {
      var params = card.querySelector(".effect-module-params");
      if (params) params.hidden = !enabled;
    }
    var prefix = "fx-" + id;
    STUDIO_PARAMS.forEach(function (p) {
      if (config[p.key] != null) {
        setSlider(prefix, p.key, config[p.key]);
      }
    });
  }

  function applyPreset(presetId) {
    var preset = SCENE_PRESETS.find(function (p) {
      return p.id === presetId;
    });
    if (!preset) return;

    if (preset.camera) {
      CAMERA_PARAMS.forEach(function (p) {
        if (preset.camera[p.key] != null) {
          setSlider("cam", p.key, preset.camera[p.key]);
        }
      });
    }

    getModuleMeta().forEach(function (def) {
      var fx = preset.effects && preset.effects[def.id];
      if (fx) {
        setModuleState(def.id, fx);
      } else {
        setModuleState(def.id, {
          enabled: false,
          intensity: 18,
          speed: 20,
          opacity: 12,
          scale: 28,
          randomness: 15
        });
      }
    });

    syncPresetHighlight();
    applyEffects();
  }

  function presetMatchesCurrent(preset) {
    var cam = getCameraState();
    var camMatch = CAMERA_PARAMS.every(function (p) {
      return cam[p.key] === preset.camera[p.key];
    });
    if (!camMatch) return false;

    var state = getEffectState();
    return getModuleMeta().every(function (def) {
      var expected = preset.effects[def.id];
      if (!expected) return false;
      if (!!expected.enabled !== state[def.id].enabled) return false;
      if (!expected.enabled) return true;
      return STUDIO_PARAMS.every(function (p) {
        return state[def.id][p.key] === expected[p.key];
      });
    });
  }

  function syncPresetHighlight() {
    var container = $("presets-grid");
    if (!container) return;

    var matchedId = null;
    SCENE_PRESETS.forEach(function (preset) {
      if (presetMatchesCurrent(preset)) matchedId = preset.id;
    });

    container.querySelectorAll(".preset-card").forEach(function (btn) {
      var on = btn.getAttribute("data-preset") === matchedId;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function bindStudio() {
    if (els.effectsStudio) {
      els.effectsStudio.addEventListener("change", function (e) {
        if (e.target.matches('[name="fx-enabled"]')) {
          var card = e.target.closest(".effect-module");
          if (card) {
            var params = card.querySelector(".effect-module-params");
            if (params) params.hidden = !e.target.checked;
          }
        }
        applyEffects();
      });

      els.effectsStudio.addEventListener("input", function (e) {
        if (e.target.matches("[data-param]")) applyEffects();
      });
    }
  }

  function readParallaxSlider(key, fallback) {
    return readSlider("px", key, fallback);
  }

  function getParallaxSettings() {
    return {
      sensitivity: readParallaxSlider("sensitivity", 28),
      strength: readParallaxSlider("strength", 20),
      depthStrength: readParallaxSlider("depthStrength", 40),
      smoothing: readParallaxSlider("smoothing", 78),
      zoom: readParallaxSlider("zoom", 26),
      autoDrift: $("px-auto-drift") ? $("px-auto-drift").checked : true,
      tiltEnabled: $("px-tilt-enabled") ? $("px-tilt-enabled").checked : false
    };
  }

  function setParallaxControl(key, value) {
    if (key === "autoDrift") {
      var drift = $("px-auto-drift");
      if (drift) drift.checked = !!value;
      return;
    }
    if (PARALLAX_SLIDER_KEYS.indexOf(key) !== -1) {
      setSlider("px", key, value);
    }
  }

  function buildParallaxPresets() {
    if (!els.parallaxPresetsGrid || !window.WaypointParallaxPresets) return;
    els.parallaxPresetsGrid.innerHTML = "";

    window.WaypointParallaxPresets.all().forEach(function (preset) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "parallax-preset-card";
      btn.setAttribute("data-parallax-preset", preset.id);
      btn.setAttribute("aria-pressed", preset.id === parallaxActivePresetId ? "true" : "false");

      var title = document.createElement("span");
      title.className = "parallax-preset-name";
      title.textContent = preset.name;

      var desc = document.createElement("span");
      desc.className = "parallax-preset-desc";
      desc.textContent = preset.description;

      btn.appendChild(title);
      btn.appendChild(desc);
      btn.addEventListener("click", function () {
        applyParallaxPreset(preset.id);
      });
      els.parallaxPresetsGrid.appendChild(btn);
    });

    syncParallaxPresetHighlight();
  }

  function applyParallaxPreset(presetId) {
    var preset = window.WaypointParallaxPresets
      ? window.WaypointParallaxPresets.get(presetId)
      : null;
    if (!preset) return;

    parallaxActivePresetId = preset.id;
    PARALLAX_SLIDER_KEYS.forEach(function (key) {
      if (preset[key] != null) setParallaxControl(key, preset[key]);
    });
    setParallaxControl("autoDrift", !!preset.autoDrift);
    syncParallaxPresetHighlight();
  }

  function parallaxMatchesPreset(preset) {
    var settings = getParallaxSettings();
    var slidersMatch = PARALLAX_SLIDER_KEYS.every(function (key) {
      return settings[key] === preset[key];
    });
    return slidersMatch && settings.autoDrift === !!preset.autoDrift;
  }

  function syncParallaxPresetHighlight() {
    if (!els.parallaxPresetsGrid || !window.WaypointParallaxPresets) return;

    var matchedId = null;
    window.WaypointParallaxPresets.all().forEach(function (preset) {
      if (parallaxMatchesPreset(preset)) matchedId = preset.id;
    });
    if (matchedId) parallaxActivePresetId = matchedId;

    els.parallaxPresetsGrid.querySelectorAll(".parallax-preset-card").forEach(function (btn) {
      var on = btn.getAttribute("data-parallax-preset") === parallaxActivePresetId && matchedId;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-pressed", on ? "true" : "false");
    });
  }

  function updateParallaxTiltHint() {
    if (!els.parallaxTiltHint || !window.WaypointParallax) return;

    var tiltInput = $("px-tilt-enabled");
    var enabled = tiltInput && tiltInput.checked;
    var available = window.WaypointParallax.isTiltAvailable();

    if (!enabled) {
      els.parallaxTiltHint.hidden = true;
      els.parallaxTiltHint.textContent = "";
      return;
    }

    if (!available) {
      els.parallaxTiltHint.hidden = false;
      els.parallaxTiltHint.textContent = "Tilt unavailable — using pointer input.";
      return;
    }

    if (window.WaypointParallax.isTiltActive()) {
      els.parallaxTiltHint.hidden = false;
      els.parallaxTiltHint.textContent = "Tilt active.";
      return;
    }

    els.parallaxTiltHint.hidden = false;
    els.parallaxTiltHint.textContent = "Awaiting orientation permission.";
  }

  function initParallaxEngine() {
    if (!window.WaypointParallax || !els.parallaxViewport) return;
    window.WaypointParallax.init({
      viewport: els.parallaxViewport,
      stage: els.parallaxStage,
      layers: [
        { el: document.querySelector(".parallax-layer-bg"), img: $("parallax-img-bg") },
        { el: document.querySelector(".parallax-layer-mid"), img: $("parallax-img-mid") },
        { el: document.querySelector(".parallax-layer-fg"), img: $("parallax-img-fg") }
      ],
      getSettings: getParallaxSettings
    });
    applyParallaxPreset("gentle-drift");
    updateParallaxTiltHint();
  }

  function bindParallax() {
    var uploadBtns = [
      $("btn-upload-parallax"),
      $("btn-upload-parallax-empty")
    ];

    uploadBtns.forEach(function (btn) {
      if (btn && els.parallaxFileInput) {
        btn.addEventListener("click", function () { els.parallaxFileInput.click(); });
      }
    });

    if (els.parallaxFileInput) {
      els.parallaxFileInput.addEventListener("change", function () {
        if (els.parallaxFileInput.files && els.parallaxFileInput.files[0]) {
          loadParallaxFile(els.parallaxFileInput.files[0]);
        }
        resetFileInput(els.parallaxFileInput);
      });
    }

    if (els.parallaxShell) {
      els.parallaxShell.addEventListener("dragover", function (e) {
        e.preventDefault();
        els.parallaxShell.classList.add("is-dragover");
      });
      els.parallaxShell.addEventListener("dragleave", function () {
        els.parallaxShell.classList.remove("is-dragover");
      });
      els.parallaxShell.addEventListener("drop", function (e) {
        e.preventDefault();
        els.parallaxShell.classList.remove("is-dragover");
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          loadParallaxFile(e.dataTransfer.files[0]);
        }
      });
    }

    if (els.parallaxControls) {
      els.parallaxControls.addEventListener("input", function (e) {
        if (e.target.matches("[data-param^='px:']")) {
          var parts = e.target.getAttribute("data-param").split(":");
          readSlider(parts[0], parts[1], 0);
          syncParallaxPresetHighlight();
        }
      });

      els.parallaxControls.addEventListener("change", function (e) {
        if (e.target.id === "px-auto-drift") {
          syncParallaxPresetHighlight();
          return;
        }
        if (e.target.id === "px-tilt-enabled" && window.WaypointParallax) {
          var enabled = e.target.checked;
          window.WaypointParallax.setTiltEnabled(enabled).then(function () {
            updateParallaxTiltHint();
          });
        }
      });
    }

    var resetBtn = $("btn-parallax-reset");
    if (resetBtn && window.WaypointParallax) {
      resetBtn.addEventListener("click", function () {
        window.WaypointParallax.reset();
      });
    }
  }

  function bindTabs() {
    if (!window.WaypointTabs) return;

    window.WaypointTabs.init({
      tablist: $("workspace-tabs"),
      onChange: handleTabChange
    });

    document.querySelectorAll(".topbar-tab-link, .learn-goto").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var tabId = btn.getAttribute("data-tab");
        if (tabId) {
          window.WaypointTabs.switchTo(tabId);
          scrollToWorkspace();
        }
      });
    });
  }

  function loadPhotoForLivingScene(url, title) {
    hideError();
    var label = title || "Photograph";
    var img = new Image();
    img.onload = function () {
      revokeIfBlob(imageUrl);
      imageUrl = url;
      imageLoaded = true;
      setSceneImage(url, label);
      setWorkspaceState(true);
      syncParallaxFromLivingScene(label);
      analyzePhoto(img);
      startLivingScene();
      if (window.WaypointTabs) window.WaypointTabs.switchTo("living-scene");
      scrollToWorkspace();
    };
    img.onerror = function () {
      showError("This file couldn't be opened.");
    };
    img.src = url;
  }

  function loadPhotoForParallax(url, title) {
    hideError();
    var label = title || "Photograph";
    var img = new Image();
    img.onload = function () {
      revokeIfBlob(imageUrl);
      imageUrl = url;
      imageLoaded = true;
      setSceneImage(url, label);
      setWorkspaceState(true);

      if (parallaxImageUrl && parallaxImageUrl !== imageUrl) revokeIfBlob(parallaxImageUrl);
      parallaxImageUrl = url;
      if (window.WaypointParallax) window.WaypointParallax.setImage(url);
      setParallaxState(true, label);
      if (window.WaypointTabs) window.WaypointTabs.switchTo("parallax");
      scrollToWorkspace();
    };
    img.onerror = function () {
      showError("This file couldn't be opened.");
    };
    img.src = url;
  }

  function handleTabChange(fromTab, toTab) {
    if (fromTab === "photography" && window.WaypointPhotography) {
      window.WaypointPhotography.closeDetail();
    }
    if (fromTab === "living-scene" && window.WaypointEffects) {
      window.WaypointEffects.stopAll();
    }
    if (fromTab === "parallax" && window.WaypointParallax) {
      window.WaypointParallax.stop();
    }
    if (toTab === "living-scene" && imageLoaded) {
      applyEffects();
    }
    if (toTab === "parallax" && parallaxImageLoaded && window.WaypointParallax) {
      window.WaypointParallax.start();
      updateParallaxTiltHint();
    }
    if (toTab === "export" && imageLoaded) {
      updateExportPreview();
    }
  }

  function bindUpload() {
    if (!els.fileInput) return;

    [$("btn-upload-hero"), $("btn-upload-empty")].forEach(function (btn) {
      if (btn) btn.addEventListener("click", function () { els.fileInput.click(); });
    });

    var navUpload = $("btn-upload-nav");
    if (navUpload) {
      navUpload.addEventListener("click", function () {
        if (window.WaypointTabs && window.WaypointTabs.getActive() === "parallax" && els.parallaxFileInput) {
          els.parallaxFileInput.click();
        } else if (els.fileInput) {
          els.fileInput.click();
        }
      });
    }

    els.fileInput.addEventListener("change", function () {
      if (els.fileInput.files && els.fileInput.files[0]) loadFile(els.fileInput.files[0]);
      resetFileInput(els.fileInput);
    });

    if (els.previewShell) {
      els.previewShell.addEventListener("dragover", function (e) {
        e.preventDefault();
        els.previewShell.classList.add("is-dragover");
      });
      els.previewShell.addEventListener("dragleave", function () {
        els.previewShell.classList.remove("is-dragover");
      });
      els.previewShell.addEventListener("drop", function (e) {
        e.preventDefault();
        els.previewShell.classList.remove("is-dragover");
        if (e.dataTransfer.files && e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]);
      });
    }
  }

  function loadFile(file) {
    hideError();
    var check = validateUploadFile(file);
    if (!check.ok) {
      showError(check.message);
      return;
    }

    revokeIfBlob(imageUrl);
    imageUrl = URL.createObjectURL(file);
    imageLoaded = false;

    var img = new Image();
    img.onload = function () {
      imageLoaded = true;
      setSceneImage(imageUrl, file.name);
      setWorkspaceState(true);
      syncParallaxFromLivingScene(file.name);
      analyzePhoto(img);
      startLivingScene();
      if (window.WaypointTabs) window.WaypointTabs.switchTo("living-scene");
      scrollToWorkspace();
    };
    img.onerror = function () {
      showError("This file couldn't be opened.");
      imageLoaded = false;
      hideRecommendations();
      setWorkspaceState(false);
    };
    img.src = imageUrl;
  }

  function setSceneImage(src, fileName) {
    if (!els.sceneImg) return;
    els.sceneImg.src = src;
    els.sceneImg.hidden = false;
    els.sceneImg.alt = fileName || "Scene preview";
    if (els.previewMeta && fileName) els.previewMeta.textContent = fileName;
  }

  function setWorkspaceState(hasImage) {
    if (els.workspace) els.workspace.classList.toggle("has-image", hasImage);
    if (els.previewEmpty) els.previewEmpty.hidden = hasImage;
    if (els.sceneFrame) els.sceneFrame.hidden = !hasImage;
    if (els.hero) els.hero.classList.toggle("is-compact", hasImage || parallaxImageLoaded);
    updateSidebarAwaitingImage();
    updateWorkspaceContentState();
    updateExportActions();
  }

  function setParallaxState(hasImage, fileName) {
    parallaxImageLoaded = !!hasImage;
    if (els.parallaxEmpty) els.parallaxEmpty.hidden = hasImage;
    if (els.parallaxFrame) els.parallaxFrame.hidden = !hasImage;
    if (els.parallaxMeta && fileName) els.parallaxMeta.textContent = fileName;
    if (els.hero) els.hero.classList.toggle("is-compact", hasImage || imageLoaded);
    updateWorkspaceContentState();
    if (hasImage && window.WaypointTabs && window.WaypointTabs.getActive() === "parallax" && window.WaypointParallax) {
      window.WaypointParallax.start();
      updateParallaxTiltHint();
    }
  }

  function syncParallaxFromLivingScene(fileName) {
    if (!window.WaypointParallax || !imageUrl) return;
    parallaxImageUrl = imageUrl;
    window.WaypointParallax.setImage(imageUrl);
    setParallaxState(true, fileName);
  }

  function loadParallaxFile(file) {
    hideError();
    var check = validateUploadFile(file);
    if (!check.ok) {
      showError(check.message);
      return;
    }

    if (parallaxImageUrl && parallaxImageUrl !== imageUrl) {
      revokeIfBlob(parallaxImageUrl);
    }
    parallaxImageUrl = URL.createObjectURL(file);

    var img = new Image();
    img.onload = function () {
      if (window.WaypointParallax) {
        window.WaypointParallax.setImage(parallaxImageUrl);
      }
      if (parallaxImageUrl !== imageUrl) revokeIfBlob(imageUrl);
      imageUrl = parallaxImageUrl;
      imageLoaded = true;
      setSceneImage(imageUrl, file.name);
      setWorkspaceState(true);
      setParallaxState(true, file.name);
      if (window.WaypointTabs) window.WaypointTabs.switchTo("parallax");
      scrollToWorkspace();
    };
    img.onerror = function () {
      showError("This file couldn't be opened.");
      setParallaxState(false);
    };
    img.src = parallaxImageUrl;
  }

  function scrollToWorkspace() {
    if (!els.workspace) return;
    requestAnimationFrame(function () {
      els.workspace.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function showError(msg) {
    if (els.uploadError) {
      els.uploadError.textContent = msg;
      els.uploadError.hidden = false;
    }
    if (els.workspaceUploadError) {
      els.workspaceUploadError.textContent = msg;
      els.workspaceUploadError.hidden = false;
    }
  }

  function hideError() {
    if (els.uploadError) els.uploadError.hidden = true;
    if (els.workspaceUploadError) els.workspaceUploadError.hidden = true;
  }

  function applyEffects() {
    syncPresetHighlight();
    if (!imageLoaded || !window.WaypointEffects) return;
    window.WaypointEffects.apply(getEngineConfig());
    scheduleExportPreview();
  }

  function scheduleExportPreview() {
    if (exportPreviewTimer) clearTimeout(exportPreviewTimer);
    exportPreviewTimer = setTimeout(updateExportPreview, 80);
  }

  function startLivingScene() {
    if (!window.WaypointEffects || !imageLoaded) return;
    if (els.sceneImg && imageUrl) els.sceneImg.src = imageUrl;
    applyEffects();
    if (!startLivingScene.previewInterval) {
      startLivingScene.previewInterval = setInterval(updateExportPreview, 3000);
    }
  }

  function buildComingSoon() {
    if (window.WaypointComingSoon && els.comingSoonMount) {
      window.WaypointComingSoon.buildPanel(els.comingSoonMount);
    }
  }

  function updateExportPreview() {
    if (!window.WaypointEffects || !imageLoaded) return;
    window.WaypointEffects.captureFrame(getEngineConfig());
  }

  var resizeTimer;
  function bindResize() {
    if (!window.WaypointEffects) return;
    var handler = window.WaypointEffects.onResize(
      {
        stage: els.sceneStage,
        domRoot: els.effectLayers,
        canvas: els.canvasEffects,
        bgInner: els.sceneBgInner,
        bgMotion: els.sceneBgMotion
      },
      getEngineConfig
    );
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        handler();
        updateExportPreview();
      }, 150);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  window.WaypointSceneApp = {
    loadPhotoForLivingScene: loadPhotoForLivingScene,
    loadPhotoForParallax: loadPhotoForParallax
  };
})();
