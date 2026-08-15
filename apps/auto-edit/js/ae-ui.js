/**
 * Waypoint Auto Edit — main UI controller
 */
(function (global) {
  "use strict";

  var state = {
    originalFile: null,
    originalBlob: null,
    originalAssetId: null,
    originalFilename: "photo.jpg",
    editedBlob: null,
    recipe: null,
    strategy: null,
    signals: null,
    honesty: [],
    intent: "waypoint-choice",
    compare: null,
    objectUrls: [],
    batch: null,
    busy: false,
    cropApproved: false,
    exif: null,
    coachObservations: null
  };

  function $(id) { return document.getElementById(id); }

  function offerMakeItMove() {
    var note = document.querySelector(".ae-move-note");
    if (!note || !state.originalAssetId) return;
    note.innerHTML =
      'Ready for motion: <a class="wds-btn wds-btn--secondary wds-btn--sm" href="../moving-scenes/?libraryId=' +
      encodeURIComponent(state.originalAssetId) +
      '">Make it move</a> — opens without re-upload.';
  }

  function setStatus(msg, isError) {
    var el = $("ae-status");
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

  function trackUrl(url) {
    state.objectUrls.push(url);
    return url;
  }

  function revokeAll() {
    state.objectUrls.forEach(function (u) {
      try { URL.revokeObjectURL(u); } catch (e) { /* ignore */ }
    });
    state.objectUrls = [];
  }

  function renderIntents() {
    var host = $("ae-intents");
    if (!host || !global.WaypointAutoEditStrategy) return;
    host.innerHTML = global.WaypointAutoEditStrategy.INTENTS.map(function (intent) {
      var on = intent.id === state.intent;
      return '<button type="button" class="ae-intent' + (on ? " is-active" : "") +
        '" data-intent="' + intent.id + '" aria-pressed="' + (on ? "true" : "false") + '">' +
        "<strong>" + intent.label + "</strong>" +
        "<span>" + intent.blurb + "</span></button>";
    }).join("");
    host.querySelectorAll("[data-intent]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        state.intent = btn.getAttribute("data-intent");
        renderIntents();
        if (state.originalBlob) runEdit();
      });
    });
  }

  function renderHonesty() {
    var host = $("ae-honesty");
    if (!host) return;
    var notes = state.honesty || [];
    host.innerHTML = notes.length
      ? "<ul>" + notes.map(function (n) { return "<li>" + escapeHtml(n) + "</li>"; }).join("") + "</ul>"
      : "";
  }

  function renderRecipeSummary() {
    var host = $("ae-recipe-summary");
    if (!host) return;
    if (!state.strategy) {
      host.innerHTML = "<p>Choose a photograph to finish. Waypoint Choice needs no sliders.</p>";
      return;
    }
    var ops = (state.strategy.ops || []).filter(function (o) { return o.id !== "noop"; });
    host.innerHTML =
      "<p class=\"ae-summary-lead\">" + escapeHtml(state.strategy.summary || "") + "</p>" +
      (state.strategy.doLess ? '<p class="ae-badge">Do less — already strong</p>' : "") +
      "<ul class=\"ae-ops\">" +
        (ops.length
          ? ops.map(function (o) {
              return "<li><strong>" + escapeHtml(o.id) + "</strong> — " + escapeHtml(o.reason || "") + "</li>";
            }).join("")
          : "<li>No global finish applied.</li>") +
      "</ul>" +
      (state.strategy.cropSuggestion
        ? '<div class="ae-crop">' +
            "<p>" + escapeHtml(state.strategy.cropSuggestion.note) + "</p>" +
            '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" id="ae-crop-approve">Approve suggested straighten</button>' +
            (state.cropApproved ? "<p>Straighten approved for next export pass (composition still user-owned).</p>" : "") +
          "</div>"
        : "");
    var cropBtn = $("ae-crop-approve");
    if (cropBtn) {
      cropBtn.addEventListener("click", function () {
        state.cropApproved = true;
        setStatus("Straighten suggestion noted. Auto Edit still will not silently crop without your say.");
        renderRecipeSummary();
      });
    }
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setBusy(busy) {
    state.busy = busy;
    document.querySelectorAll("[data-ae-action]").forEach(function (btn) {
      btn.disabled = !!busy;
    });
  }

  function runEdit(refineId) {
    if (!state.originalBlob || !global.WaypointAutoEditPipeline) return Promise.resolve();
    setBusy(true);
    setStatus(refineId ? "Refining on this device…" : "Finishing on this device…");
    return global.WaypointAutoEditPipeline.process(state.originalBlob, {
      intent: state.intent,
      refineId: refineId || null,
      originalAssetId: state.originalAssetId,
      exif: state.exif,
      coachObservations: state.coachObservations,
      cropApproved: state.cropApproved,
      preview: false
    }).then(function (result) {
      state.editedBlob = result.editedBlob;
      state.recipe = result.recipe;
      state.strategy = result.strategy;
      state.signals = result.signals;
      state.honesty = result.honestyNotes;
      if (state.compare) state.compare.setImages(state.originalBlob, state.editedBlob);
      renderHonesty();
      renderRecipeSummary();
      setStatus("Waypoint Edit ready. Original preserved.");
      setBusy(false);
      return result;
    }).catch(function (err) {
      setBusy(false);
      setStatus((err && err.message) || "Could not finish this photograph.", true);
    });
  }

  function ingestFile(file, meta) {
    meta = meta || {};
    revokeAll();
    if (state.compare) state.compare.destroy();
    state.originalFile = file;
    state.originalBlob = file;
    state.originalFilename = file.name || meta.filename || "photo.jpg";
    state.originalAssetId = meta.originalAssetId || null;
    state.exif = meta.exif || null;
    state.coachObservations = meta.coachObservations || null;
    state.cropApproved = false;
    state.editedBlob = null;
    state.recipe = null;
    state.compare = global.WaypointAutoEditCompare.mountCompare($("ae-compare-mount"));
    $("ae-workspace").hidden = false;
    $("ae-empty").hidden = true;
    return runEdit();
  }

  function saveToLibrary() {
    if (!state.editedBlob || !state.recipe) {
      setStatus("Finish a photograph before saving.", true);
      return;
    }
    if (!state.originalAssetId) {
      // Import original into library first, then link edit
      var engine = global.WaypointPhotoLibraryEngine && global.WaypointPhotoLibraryEngine.get();
      if (!engine) {
        setStatus("Photo Library is not available in this session.", true);
        return;
      }
      setBusy(true);
      setStatus("Saving original + Waypoint Edit to Photo Library…");
      var ready = engine.isReady() ? Promise.resolve() : engine.init();
      ready.then(function () {
        return engine.importFiles([state.originalFile || state.originalBlob]);
      }).then(function (report) {
        var imported = report && report.imported && report.imported[0];
        if (!imported || !imported.id) throw new Error("Could not import the original into Photo Library.");
        state.originalAssetId = imported.id;
        return global.WaypointAutoEditStore.persistEdit(
          state.originalAssetId,
          state.editedBlob,
          state.recipe,
          { width: state.signals && state.signals.width, height: state.signals && state.signals.height }
        );
      }).then(function (res) {
        setBusy(false);
        if (res.warning) setStatus(res.warning, true);
        else {
          setStatus("Saved. Original kept. Waypoint Edit linked in Photo Library.");
          offerMakeItMove();
        }
      }).catch(function (err) {
        setBusy(false);
        setStatus((err && err.message) || "Save failed.", true);
      });
      return;
    }

    setBusy(true);
    global.WaypointAutoEditStore.persistEdit(
      state.originalAssetId,
      state.editedBlob,
      state.recipe,
      { width: state.signals && state.signals.width, height: state.signals && state.signals.height }
    ).then(function (res) {
      setBusy(false);
      if (res.warning) setStatus(res.warning, true);
      else {
        setStatus("Saved. Original kept. Waypoint Edit linked in Photo Library.");
        offerMakeItMove();
      }
    }).catch(function (err) {
      setBusy(false);
      setStatus((err && err.message) || "Save failed.", true);
    });
  }

  function exportDownload() {
    if (!state.editedBlob) {
      setStatus("Nothing to export yet.", true);
      return;
    }
    var info = global.WaypointAutoEditExport.exportEdited(state.editedBlob, state.originalFilename);
    setStatus("Downloaded " + info.filename + ". " + info.note);
  }

  function parseQuery() {
    try {
      return new URLSearchParams(global.location.search || "");
    } catch (e) {
      return new URLSearchParams();
    }
  }

  function failMissingOriginal() {
    state.editedBlob = null;
    state.originalAssetId = null;
    setStatus("That photograph’s original is not stored locally yet.", true);
    return null;
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
        return failMissingOriginal();
      }
      var img = resolved.image || {};
      // If user opened an edit sibling, finish from the true original
      var originalId = img.role === "waypoint-edit" && img.originalAssetId ? img.originalAssetId : resolved.id;
      if (originalId !== resolved.id) {
        return Client.resolveLibraryFile(originalId).then(function (orig) {
          if (!orig || !orig.file) return failMissingOriginal();
          return ingestFile(orig.file, {
            originalAssetId: orig.id,
            filename: (orig.image && orig.image.filename) || img.filename,
            exif: mapExif(orig.image),
            coachObservations: mapCoach(orig.image)
          });
        });
      }
      return ingestFile(resolved.file, {
        originalAssetId: originalId,
        filename: img.filename,
        exif: mapExif(img),
        coachObservations: mapCoach(img)
      });
    });
  }

  function mapExif(img) {
    if (!img || !img.camera) return null;
    var c = img.camera;
    if (c.iso == null && c.exposureTimeSec == null && c.fNumber == null) return null;
    return {
      iso: c.iso,
      exposureTimeSec: c.exposureTimeSec,
      fNumber: c.fNumber
    };
  }

  function mapCoach(img) {
    if (!img || !img.moduleRefs || !img.moduleRefs.photoCoach) return null;
    var pc = img.moduleRefs.photoCoach;
    if (pc.analysisStatus !== "analyzed") return null;
    return {
      subjectHint: (img.subjectHints && img.subjectHints[0]) || null,
      sharpnessTier: pc.confidenceTier || null,
      letterGrade: pc.letterGrade || null
    };
  }

  function batchEditKeepers() {
    var engine = global.WaypointPhotoLibraryEngine && global.WaypointPhotoLibraryEngine.get();
    if (!engine) {
      setStatus("Photo Library is required for batch finishing.", true);
      return;
    }
    var ready = engine.isReady() ? Promise.resolve() : engine.init();
    ready.then(function () {
      var keepers = engine.list().filter(function (img) {
        if (img.role === "waypoint-edit") return false;
        if (img.selectionLabel === "reject") return false;
        return img.selectionLabel === "keep" || img.selectionLabel === "favorite" || img.favorite;
      });
      if (!keepers.length) {
        setStatus("No Keepers or Favorites found (Rejects are excluded).", true);
        return null;
      }
      state.batch = { total: keepers.length, index: 0, ids: keepers.map(function (k) { return k.id; }) };
      return runBatchStep();
    });
  }

  function runBatchStep() {
    if (!state.batch) return Promise.resolve();
    var i = state.batch.index;
    if (i >= state.batch.total) {
      setStatus("Batch complete — finished " + state.batch.total + " keepers on this device.");
      state.batch = null;
      setBusy(false);
      return Promise.resolve();
    }
    setBusy(true);
    setStatus("Editing " + (i + 1) + " of " + state.batch.total + "…");
    var id = state.batch.ids[i];
    return loadFromLibrary(id).then(function (result) {
      if (!result || !state.editedBlob || state.originalAssetId !== id) {
        state.batch.index += 1;
        return runBatchStep();
      }
      return global.WaypointAutoEditStore.persistEdit(
        state.originalAssetId,
        state.editedBlob,
        state.recipe,
        { width: state.signals && state.signals.width, height: state.signals && state.signals.height }
      ).then(function () {
        state.batch.index += 1;
        // Yield to UI so the page stays responsive
        return new Promise(function (resolve) {
          setTimeout(function () { resolve(runBatchStep()); }, 40);
        });
      });
    }).catch(function (err) {
      setStatus((err && err.message) || "Batch step failed — continuing.", true);
      state.batch.index += 1;
      return new Promise(function (resolve) {
        setTimeout(function () { resolve(runBatchStep()); }, 40);
      });
    });
  }

  function bind() {
    var fileInput = $("ae-file-input");
    var drop = $("ae-drop");
    if (fileInput) {
      fileInput.addEventListener("change", function () {
        var f = fileInput.files && fileInput.files[0];
        if (f) ingestFile(f);
      });
    }
    if (drop) {
      drop.addEventListener("click", function () { fileInput && fileInput.click(); });
      drop.addEventListener("dragover", function (e) { e.preventDefault(); drop.classList.add("is-drag"); });
      drop.addEventListener("dragleave", function () { drop.classList.remove("is-drag"); });
      drop.addEventListener("drop", function (e) {
        e.preventDefault();
        drop.classList.remove("is-drag");
        var f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (f) ingestFile(f);
      });
    }

    document.querySelectorAll("[data-ae-action]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var act = btn.getAttribute("data-ae-action");
        if (act === "save") saveToLibrary();
        else if (act === "export") exportDownload();
        else if (act === "batch") batchEditKeepers();
        else if (act === "reset") {
          state.intent = "waypoint-choice";
          renderIntents();
          runEdit("reset");
        } else if (act.indexOf("refine:") === 0) {
          runEdit(act.slice(7));
        }
      });
    });
  }

  function boot() {
    renderIntents();
    bind();
    var q = parseQuery();
    var libraryId = q.get("libraryId") || q.get("photoId");
    var batch = q.get("batch");
    var engine = global.WaypointPhotoLibraryEngine && global.WaypointPhotoLibraryEngine.get();
    var start = engine && !engine.isReady() ? engine.init() : Promise.resolve();
    start.then(function () {
      if (batch === "keepers") return batchEditKeepers();
      if (libraryId) return loadFromLibrary(libraryId);
      return null;
    }).catch(function (err) {
      setStatus((err && err.message) || "Auto Edit could not start.", true);
    });
  }

  global.WaypointAutoEditUI = {
    boot: boot,
    ingestFile: ingestFile,
    runEdit: runEdit
  };
})(typeof window !== "undefined" ? window : globalThis);
