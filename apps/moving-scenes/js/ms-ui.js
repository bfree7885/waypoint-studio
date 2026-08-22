/**
 * Waypoint Moving Scenes — main UI controller
 */
(function (global) {
  "use strict";

  var state = {
    sourceBlob: null,
    sourceAssetId: null,
    originalAssetId: null,
    sourceRole: "original",
    sourceFilename: "photo.jpg",
    hasWaypointEdit: false,
    editBlob: null,
    editAssetId: null,
    analysis: null,
    choice: null,
    recipe: null,
    honesty: [],
    compare: null,
    renderer: null,
    assist: null,
    strength: "natural",
    directionDeg: null,
    busy: false,
    reducedMotion: false,
    userClearedMotion: false
  };

  function $(id) { return document.getElementById(id); }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setStatus(msg, isError) {
    var el = $("ms-status");
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

  function setBusy(busy) {
    state.busy = busy;
    document.querySelectorAll("[data-ms-action]").forEach(function (btn) {
      btn.disabled = !!busy;
    });
  }

  function prefersReducedMotion() {
    return !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function showWorkspace(show) {
    var empty = $("ms-empty");
    var ws = $("ms-workspace");
    if (empty) empty.hidden = !!show;
    if (ws) ws.hidden = !show;
  }

  function renderSourcePicker() {
    var host = $("ms-source");
    if (!host) return;
    if (!state.originalAssetId) {
      host.innerHTML = "<p class=\"ms-muted\">Direct import — source is the photograph you opened.</p>";
      return;
    }
    var preferEdit = state.hasWaypointEdit;
    host.innerHTML =
      '<p class="ms-panel__lede">Choose which photograph to animate. Waypoint never swaps silently.</p>' +
      '<div class="ms-source-row" role="radiogroup" aria-label="Source photograph">' +
        '<button type="button" class="ms-source-btn' + (state.sourceRole === "original" ? " is-active" : "") +
          '" data-source="original" role="radio" aria-checked="' + (state.sourceRole === "original") + '">' +
          "<strong>Original</strong><span>Preserved master</span></button>" +
        '<button type="button" class="ms-source-btn' + (state.sourceRole === "waypoint-edit" ? " is-active" : "") +
          (preferEdit ? "" : " is-disabled") +
          '" data-source="waypoint-edit" role="radio" aria-checked="' + (state.sourceRole === "waypoint-edit") + '"' +
          (preferEdit ? "" : " disabled") + ">" +
          "<strong>Waypoint Edit</strong><span>" +
          (preferEdit ? "Preferred when approved" : "No edit saved yet") +
          "</span></button>" +
      "</div>";
    host.querySelectorAll("[data-source]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var role = btn.getAttribute("data-source");
        if (role === "waypoint-edit" && !state.hasWaypointEdit) return;
        switchSource(role);
      });
    });
  }

  function renderChoice() {
    var host = $("ms-choice-summary");
    if (!host) return;
    if (!state.choice) {
      host.innerHTML = "<p>Open a photograph — Waypoint Choice looks for believable environmental motion.</p>";
      return;
    }
    var c = state.choice;
    host.innerHTML =
      '<p class="ms-summary-lead">' + escapeHtml(c.summary) + "</p>" +
      (c.noMotion ? '<p class="ms-badge">No motion found</p>' : "") +
      "<ul class=\"ms-class-list\">" +
        (c.selected && c.selected.length
          ? c.selected.map(function (s) {
              return "<li><strong>" + escapeHtml(s.label) + "</strong> · " +
                Math.round(s.confidence * 100) + "% confidence" +
                (s.waterType ? " · " + escapeHtml(s.waterType) : "") +
                "</li>";
            }).join("")
          : "<li>Nothing automatic selected.</li>") +
      "</ul>" +
      (c.deferred && c.deferred.length
        ? '<details class="ms-deferred"><summary>Deferred classes</summary><ul>' +
          c.deferred.slice(0, 8).map(function (d) {
            return "<li>" + escapeHtml((global.WaypointMovingScenesModels.CLASS_META[d.id] || {}).label || d.id) +
              " — " + escapeHtml(d.reason || "Deferred") + "</li>";
          }).join("") +
          "</ul></details>"
        : "");
  }

  function renderHonesty() {
    var host = $("ms-honesty");
    if (!host) return;
    var notes = state.honesty || [];
    host.innerHTML = notes.length
      ? "<ul>" + notes.map(function (n) { return "<li>" + escapeHtml(n) + "</li>"; }).join("") + "</ul>"
      : "";
  }

  function renderStrength() {
    var host = $("ms-strength");
    if (!host || !global.WaypointMovingScenesModels) return;
    host.innerHTML = global.WaypointMovingScenesModels.STRENGTHS.map(function (s) {
      var on = s.id === state.strength;
      return '<button type="button" class="ms-chip' + (on ? " is-active" : "") +
        '" data-strength="' + s.id + '" aria-pressed="' + on + '">' + s.label + "</button>";
    }).join("");
    host.querySelectorAll("[data-strength]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.strength = btn.getAttribute("data-strength");
        if (state.choice) state.choice.strength = state.strength;
        if (state.renderer) state.renderer.setStrength(state.strength);
        renderStrength();
        if (state.renderer && !state.renderer.isPlaying() && !state.reducedMotion) {
          // nudge one frame
          state.renderer.renderAt(0.15);
        }
      });
    });
  }

  function ensureCompare() {
    if (state.compare) return state.compare;
    var mount = $("ms-compare-mount");
    if (!mount || !global.WaypointMovingScenesCompare) return null;
    state.compare = global.WaypointMovingScenesCompare.mountCompare(mount);
    var assistCanvas = $("ms-assist-canvas");
    if (assistCanvas && global.WaypointMovingScenesAssist) {
      state.assist = global.WaypointMovingScenesAssist.createAssist(assistCanvas);
    }
    return state.compare;
  }

  function applyPipelineResult(result) {
    state.analysis = result.analysis;
    state.choice = result.choice;
    state.recipe = result.recipe;
    state.honesty = result.honestyNotes;
    state.strength = result.choice.strength || "natural";

    var compare = ensureCompare();
    if (!compare) return;

    compare.setStill(state.sourceBlob);
    if (state.renderer) {
      state.renderer.destroy();
      state.renderer = null;
    }
    state.renderer = global.WaypointMovingScenesRender.createRenderer(compare.canvas, {
      preview: true
    });
    state.renderer.prepare(
      result.image,
      result.analysis,
      result.choice,
      assistMaskArg()
    );
    if (state.assist) {
      var sz = state.renderer.getSize();
      state.assist.resize(sz.w, sz.h);
    }

    renderChoice();
    renderHonesty();
    renderStrength();
    renderSourcePicker();
    updatePlayChrome();

    if (!result.choice.noMotion && !state.reducedMotion) {
      // Autoplay only when motion is OK — reduced-motion users get explicit Play
      state.renderer.play();
    } else if (!result.choice.noMotion && state.reducedMotion) {
      setStatus("Reduced motion is on — press Play when you want to see movement.");
    }
  }

  function updatePlayChrome() {
    var play = document.querySelector('[data-ms-action="play"]');
    var pause = document.querySelector('[data-ms-action="pause"]');
    var playing = state.renderer && state.renderer.isPlaying();
    if (play) play.hidden = !!playing;
    if (pause) pause.hidden = !playing;
  }

  function assistMaskArg() {
    if (!state.assist || !state.assist.isDirty()) return null;
    var sz = state.assist.getSize();
    if (!sz.w || !sz.h) return null;
    return { data: state.assist.getMask(), width: sz.w, height: sz.h };
  }

  function hasExportableMotion() {
    if (!state.renderer || !state.choice) return false;
    if (state.choice.noMotion && !(state.assist && state.assist.hasInclude())) return false;
    return true;
  }

  function pipelineOptions(extra) {
    extra = extra || {};
    return Object.assign({
      originalAssetId: state.originalAssetId,
      sourceAssetId: state.sourceAssetId,
      sourceRole: state.sourceRole,
      strength: state.strength,
      directionDeg: state.directionDeg,
      userMask: assistMaskArg(),
      userMaskDirty: !!(state.assist && state.assist.isDirty()),
      userClearedMotion: !!state.userClearedMotion
    }, extra);
  }

  function runFinalExport() {
    state.renderer.setPreview(false);
    return global.WaypointMovingScenesPipeline.process(state.sourceBlob, pipelineOptions({
      forceClasses: state.choice && state.choice.classes
    })).then(function (result) {
      state.analysis = result.analysis;
      state.choice = result.choice;
      state.recipe = result.recipe;
      state.honesty = result.honestyNotes;
      state.renderer.prepare(
        result.image,
        result.analysis,
        result.choice,
        assistMaskArg()
      );
      return global.WaypointMovingScenesExport.exportLoop(state.renderer, {
        durationSec: result.choice.durationSec,
        fps: 24
      }).then(function (exported) {
        return { exported: exported, result: result };
      });
    });
  }

  function restorePreviewAfterExport() {
    if (state.renderer) state.renderer.setPreview(true);
    return runPipeline();
  }

  function runPipeline() {
    if (!state.sourceBlob || !global.WaypointMovingScenesPipeline) return Promise.resolve();
    setBusy(true);
    setStatus("Looking for natural motion on this device…");
    return global.WaypointMovingScenesPipeline.process(state.sourceBlob, pipelineOptions()).then(function (result) {
      applyPipelineResult(result);
      setStatus(result.choice.noMotion
        ? "No natural motion confidently detected."
        : "Waypoint Choice ready — motion stays inside moving regions.");
      showWorkspace(true);
    }).catch(function (err) {
      setStatus((err && err.message) || "Could not analyze this photograph.", true);
    }).then(function () {
      setBusy(false);
      updatePlayChrome();
    });
  }

  function switchSource(role) {
    if (role === state.sourceRole) return;
    if (role === "waypoint-edit") {
      if (!state.editBlob) {
        setStatus("No Waypoint Edit is available for this photograph.", true);
        return;
      }
      state.sourceRole = "waypoint-edit";
      state.sourceBlob = state.editBlob;
      state.sourceAssetId = state.editAssetId;
    } else {
      // Reload original from library if needed — kept in state.originalBlob
      if (!state._originalBlob) {
        setStatus("Original photograph is not loaded.", true);
        return;
      }
      state.sourceRole = "original";
      state.sourceBlob = state._originalBlob;
      state.sourceAssetId = state.originalAssetId;
    }
    runPipeline();
  }

  function openBlob(blob, meta) {
    meta = meta || {};
    if (state.renderer) {
      state.renderer.destroy();
      state.renderer = null;
    }
    state.sourceBlob = blob;
    state._originalBlob = meta.originalBlob || blob;
    state.sourceFilename = meta.filename || "photo.jpg";
    state.originalAssetId = meta.originalAssetId || null;
    state.sourceAssetId = meta.sourceAssetId || meta.originalAssetId || null;
    state.sourceRole = meta.sourceRole || "original";
    state.hasWaypointEdit = !!meta.hasWaypointEdit;
    state.editBlob = meta.editBlob || null;
    state.editAssetId = meta.editAssetId || null;
    state.userClearedMotion = false;
    return runPipeline();
  }

  function loadFromLibrary(libraryId) {
    var Client = global.WaypointPhotoLibraryClient;
    var engine = global.WaypointPhotoLibraryEngine && global.WaypointPhotoLibraryEngine.get();
    if (!Client || !engine) {
      setStatus("Photo Library is not available.", true);
      return Promise.resolve();
    }
    setBusy(true);
    setStatus("Opening from Photo Library…");
    return engine.init().then(function () {
      return Client.resolveLibraryFile(libraryId);
    }).then(function (resolved) {
      if (!resolved || !resolved.file) throw new Error("Could not open that Library photograph.");
      var img = resolved.image || engine.get(resolved.id) || engine.get(libraryId);
      var originalId = img && img.role === "waypoint-edit" && img.originalAssetId
        ? img.originalAssetId
        : (img && img.id) || resolved.id || libraryId;
      var original = engine.get(originalId) || img;
      var autoEdit = (original && original.moduleRefs && original.moduleRefs.autoEdit) || {};
      var preferEdit = !!autoEdit.hasEdit && !!autoEdit.editBlobKey;
      var editP = preferEdit && global.WaypointAutoEditStore
        ? global.WaypointAutoEditStore.loadEditBlob(autoEdit.editBlobKey)
        : Promise.resolve(null);

      // Always load original file for source switcher
      return Client.resolveLibraryFile(originalId).then(function (origResolved) {
        return editP.then(function (editBlob) {
          var useEdit = preferEdit && editBlob;
          var originalFile = (origResolved && origResolved.file) || resolved.file;
          return openBlob(useEdit ? editBlob : originalFile, {
            filename: (original && original.filename) || (resolved.image && resolved.image.filename) || "photo.jpg",
            originalAssetId: originalId,
            sourceAssetId: useEdit ? autoEdit.editAssetId : originalId,
            sourceRole: useEdit ? "waypoint-edit" : "original",
            hasWaypointEdit: !!editBlob,
            editBlob: editBlob,
            editAssetId: autoEdit.editAssetId || null,
            originalBlob: originalFile
          });
        });
      });
    }).catch(function (err) {
      setStatus((err && err.message) || "Library open failed.", true);
      setBusy(false);
    });
  }

  function saveMoving() {
    if (!state.renderer || !state.recipe) {
      setStatus("Nothing to save yet.", true);
      return;
    }
    if (!hasExportableMotion()) {
      setStatus("No motion to save — Waypoint Choice found nothing confident.", true);
      return;
    }
    if (!state.originalAssetId) {
      setStatus("Save to Library needs a Library photograph. You can still download the export.", true);
      return;
    }
    setBusy(true);
    setStatus("Recording Moving Scene on this device…");
    runFinalExport().then(function (pack) {
      var result = pack.result;
      var exported = pack.exported;
      var recipe = Object.assign({}, result.recipe, {
        classes: result.choice.classes,
        strength: state.strength,
        directionDeg: state.directionDeg
      });
      return global.WaypointMovingScenesStore.persistMoving(
        state.originalAssetId,
        exported.blob,
        recipe,
        {
          ext: exported.ext,
          width: state.renderer.getSize().w,
          height: state.renderer.getSize().h,
          posterBlob: exported.posterBlob
        }
      ).then(function (saved) {
        setStatus(
          saved.warning
            ? saved.warning
            : "Moving Scene saved beside your original. Original and Waypoint Edit stay untouched."
        );
        return restorePreviewAfterExport();
      });
    }).catch(function (err) {
      setStatus((err && err.message) || "Could not save Moving Scene.", true);
    }).then(function () {
      setBusy(false);
    });
  }

  function downloadExport() {
    if (!hasExportableMotion()) {
      setStatus("Nothing to download — no confident motion yet.", true);
      return;
    }
    setBusy(true);
    setStatus("Preparing download…");
    runFinalExport().then(function (pack) {
      var exported = pack.exported;
      var name = global.WaypointMovingScenesModels.movingFilename(state.sourceFilename, exported.ext);
      global.WaypointMovingScenesExport.downloadBlob(exported.blob, name);
      setStatus(exported.note || "Download started — processed on this device.");
      return restorePreviewAfterExport();
    }).catch(function (err) {
      setStatus((err && err.message) || "Export failed.", true);
    }).then(function () {
      setBusy(false);
    });
  }

  function wireActions() {
    document.querySelectorAll("[data-ms-action]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var action = btn.getAttribute("data-ms-action");
        if (action === "play") {
          if (state.renderer) state.renderer.play();
          updatePlayChrome();
        } else if (action === "pause") {
          if (state.renderer) state.renderer.pause();
          updatePlayChrome();
        } else if (action === "save") {
          saveMoving();
        } else if (action === "export") {
          downloadExport();
        } else if (action === "reanalyze") {
          state.userClearedMotion = false;
          runPipeline();
        } else if (action === "clear-motion") {
          state.userClearedMotion = true;
          if (state.choice) {
            state.choice.classes = [];
            state.choice.noMotion = true;
            state.choice.summary = "No motion";
          }
          if (state.assist) state.assist.clear();
          runPipeline();
        } else if (action === "assist-paint") {
          if (state.assist) state.assist.setMode("paint");
          document.body.setAttribute("data-ms-assist", "paint");
        } else if (action === "assist-erase") {
          if (state.assist) state.assist.setMode("erase");
          document.body.setAttribute("data-ms-assist", "erase");
        } else if (action === "assist-apply") {
          runPipeline();
        } else if (action === "dir-left") {
          state.directionDeg = 180;
          if (state.renderer) state.renderer.setDirection(180);
        } else if (action === "dir-right") {
          state.directionDeg = 0;
          if (state.renderer) state.renderer.setDirection(0);
        } else if (action === "dir-auto") {
          state.directionDeg = null;
          if (state.renderer) state.renderer.setDirection(null);
        }
      });
    });
  }

  function wireDrop() {
    var drop = $("ms-drop");
    var input = $("ms-file-input");
    if (!drop || !input) return;
    function pick() { input.click(); }
    drop.addEventListener("click", pick);
    drop.addEventListener("keydown", function (ev) {
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        pick();
      }
    });
    drop.addEventListener("dragover", function (ev) {
      ev.preventDefault();
      drop.classList.add("is-drag");
    });
    drop.addEventListener("dragleave", function () { drop.classList.remove("is-drag"); });
    drop.addEventListener("drop", function (ev) {
      ev.preventDefault();
      drop.classList.remove("is-drag");
      var file = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
      if (file) openBlob(file, { filename: file.name });
    });
    input.addEventListener("change", function () {
      var file = input.files && input.files[0];
      if (file) openBlob(file, { filename: file.name });
      input.value = "";
    });
  }

  function boot() {
    state.reducedMotion = prefersReducedMotion();
    if (global.matchMedia) {
      global.matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change", function (ev) {
        state.reducedMotion = !!ev.matches;
        if (state.reducedMotion && state.renderer) {
          state.renderer.pause();
          updatePlayChrome();
          setStatus("Reduced motion is on — press Play when you want movement.");
        }
      });
    }
    wireActions();
    wireDrop();
    renderStrength();
    document.body.setAttribute("data-ms-assist", "paint");

    var q = new URLSearchParams(global.location.search);
    var libraryId = q.get("libraryId") || q.get("photoId");
    if (libraryId) {
      loadFromLibrary(libraryId);
    }
  }

  global.WaypointMovingScenesUI = {
    boot: boot,
    openBlob: openBlob,
    loadFromLibrary: loadFromLibrary
  };
})(typeof window !== "undefined" ? window : globalThis);
