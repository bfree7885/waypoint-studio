/**
 * Photo Coach — Upload. Grade. Improve. Bring it to Life.
 */
(function (global) {
  "use strict";

  var imageUrl = null;
  var currentFile = null;
  var currentExif = null;
  var currentCritique = null;
  var currentSessionId = null;
  var els = {};

  function $(id) {
    return document.getElementById(id);
  }

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function validateFile(file) {
    if (global.WaypointFileUpload) return global.WaypointFileUpload.validate(file);
    if (!file) return { ok: false, message: "No file selected." };
    return { ok: true };
  }

  function revokeUrl() {
    if (imageUrl && imageUrl.indexOf("blob:") === 0) URL.revokeObjectURL(imageUrl);
    imageUrl = null;
  }

  function renderExifPanel(exif) {
    var E = global.WaypointExifReader;
    if (!exif || !exif.hasExif) {
      return '<div class="coach-card coach-card--meta"><h3 class="coach-card__title">Capture metadata</h3>' +
        '<p class="coach-muted">No EXIF in this file — metadata appears when embedded in JPEG.</p></div>';
    }
    var lines = E && E.formatMeta ? E.formatMeta(exif) : [];
    return '<div class="coach-card coach-card--meta"><h3 class="coach-card__title">Capture metadata ' +
      '<span class="coach-trust coach-trust--live">Live</span></h3>' +
      '<ul class="coach-meta-list">' + lines.map(function (l) {
        return "<li>" + escapeHtml(l) + "</li>";
      }).join("") + "</ul></div>";
  }

  function renderFieldInsights(critique) {
    var Outdoor = global.WaypointPhotoCoachOutdoorContext;
    var fi = critique && critique.fieldInsights;
    if (fi && fi.available) {
      return '<div class="coach-card coach-card--field"><h3 class="coach-card__title">Field insights ' +
        '<span class="coach-trust coach-trust--live">From Dashboard</span></h3>' +
        '<p class="coach-field-loc">' + escapeHtml(fi.location) + "</p>" +
        '<ul class="coach-field-list">' + (fi.lines || []).map(function (l) {
          return "<li>" + escapeHtml(l) + "</li>";
        }).join("") + "</ul>" +
        '<p class="coach-field-impact">' + escapeHtml(fi.photoImpact) + "</p></div>";
    }
    if (Outdoor) {
      return Outdoor.render();
    }
    return '<div class="coach-card coach-card--field"><h3 class="coach-card__title">Field insights</h3>' +
      '<p class="coach-muted">Open the <a href="../../">Waypoint Dashboard</a> to attach weather, light, and challenge context.</p></div>';
  }

  function renderGradeCard(c) {
    var g = c.overallGrade || {};
    var badge = c.isDemo || c.isSample
      ? '<span class="coach-trust coach-trust--demo">Demo Analysis</span>'
      : '<span class="coach-trust coach-trust--live">AI Analysis</span>';
    return '<section class="coach-grade-card" aria-labelledby="coach-grade-title">' +
      '<div class="coach-grade-card__head">' +
        '<h2 class="coach-grade-card__title" id="coach-grade-title">Overall grade</h2>' + badge +
      "</div>" +
      '<div class="coach-grade-card__score">' +
        '<span class="coach-grade-letter" aria-label="Letter grade">' + escapeHtml(g.letter || "—") + "</span>" +
        '<span class="coach-grade-num">' + escapeHtml(String(g.score != null ? g.score : c.overallScore || "—")) +
          '<span class="coach-grade-max">/100</span></span>' +
      "</div>" +
      '<p class="coach-grade-summary">' + escapeHtml(g.summary || "") + "</p>" +
      '<dl class="coach-grade-meta">' +
        "<div><dt>Portfolio</dt><dd>" + escapeHtml(g.portfolioPotential || "—") + "</dd></div>" +
        "<div><dt>Print</dt><dd>" + escapeHtml(g.printPotential || "—") + "</dd></div>" +
        "<div><dt>Confidence</dt><dd>" + escapeHtml(g.confidence || "Demo signals") + "</dd></div>" +
      "</dl>" +
      (c.engineStatus === "disconnected"
        ? '<p class="coach-engine-note" role="status">Vision API not connected — analysis uses local pixel sampling and field context. Always labeled Demo Analysis.</p>'
        : "") +
    "</section>";
  }

  function renderBreakdown(c) {
    var rows = c.scoreBreakdown || [];
    if (!rows.length) return "";
    return '<section class="coach-card" aria-labelledby="coach-breakdown-title">' +
      '<h3 class="coach-card__title" id="coach-breakdown-title">Score breakdown</h3>' +
      '<ul class="coach-breakdown">' + rows.map(function (r) {
        return '<li class="coach-breakdown__row">' +
          '<div class="coach-breakdown__head">' +
            '<span class="coach-breakdown__cat">' + escapeHtml(r.category) + "</span>" +
            '<span class="coach-breakdown__score">' + escapeHtml(String(r.score)) + "</span>" +
          "</div>" +
          '<div class="coach-breakdown__bar" aria-hidden="true">' +
            '<div class="coach-breakdown__fill" style="width:' + clamp(r.score, 0, 100) + '%"></div>' +
          "</div>" +
          '<p class="coach-breakdown__reason">' + escapeHtml(r.reason) + "</p>" +
        "</li>";
      }).join("") + "</ul></section>";
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function renderStrengths(c) {
    var list = c.strengths || [];
    if (!list.length) return "";
    return '<section class="coach-card" aria-labelledby="coach-strengths-title">' +
      '<h3 class="coach-card__title" id="coach-strengths-title">What works</h3>' +
      '<ul class="coach-coach-cards">' + list.map(function (s) {
        return '<li class="coach-coach-card coach-coach-card--good">' +
          '<h4>' + escapeHtml(s.title) + "</h4>" +
          '<p><strong>Why:</strong> ' + escapeHtml(s.whyItWorks) + "</p>" +
          '<p><strong>Preserve:</strong> ' + escapeHtml(s.preserveInEdit) + "</p>" +
        "</li>";
      }).join("") + "</ul></section>";
  }

  function renderImprovements(c) {
    var list = c.improvements || [];
    if (!list.length) return "";
    return '<section class="coach-card" aria-labelledby="coach-improve-title">' +
      '<h3 class="coach-card__title" id="coach-improve-title">What to improve & why</h3>' +
      '<ul class="coach-coach-cards">' + list.map(function (s) {
        return '<li class="coach-coach-card coach-coach-card--grow">' +
          '<h4>' + escapeHtml(s.issue) + "</h4>" +
          '<p><strong>Why it matters:</strong> ' + escapeHtml(s.whyItMatters) + "</p>" +
          '<p><strong>What to do:</strong> ' + escapeHtml(s.whatToDo) + "</p>" +
          '<p><strong>Expected:</strong> ' + escapeHtml(s.expectedImprovement) + "</p>" +
        "</li>";
      }).join("") + "</ul></section>";
  }

  function renderCrop(c) {
    var crop = c.suggestedCrop;
    if (!crop) return "";
    var overlay = crop.showOverlay
      ? '<div class="coach-crop-overlay" aria-hidden="true">' +
          '<div class="coach-crop-thirds-h"></div><div class="coach-crop-thirds-v"></div>' +
        "</div>"
      : "";
    return '<section class="coach-card coach-card--crop" aria-labelledby="coach-crop-title">' +
      '<h3 class="coach-card__title" id="coach-crop-title">Crop recommendation</h3>' +
      '<div class="coach-crop-preview">' + overlay +
        '<span class="coach-crop-ratio">' + escapeHtml(crop.aspectRatio) + "</span>" +
      "</div>" +
      '<p>' + escapeHtml(crop.reasoning) + "</p>" +
      '<p class="coach-muted"><strong>Horizon:</strong> ' + escapeHtml(crop.horizonNote) + "</p>" +
      '<p class="coach-muted"><strong>Subject:</strong> ' + escapeHtml(crop.subjectPlacement) + "</p>" +
    "</section>";
  }

  function renderPrint(c) {
    var p = c.printRecommendation;
    if (!p || typeof p === "string") {
      return '<section class="coach-card"><h3 class="coach-card__title">Print recommendation</h3><p>' +
        escapeHtml(typeof p === "string" ? p : "—") + "</p></section>";
    }
    return '<section class="coach-card" aria-labelledby="coach-print-title">' +
      '<h3 class="coach-card__title" id="coach-print-title">Print recommendation</h3>' +
      '<p class="coach-print-worthy">' + escapeHtml(p.worthyLabel) + "</p>" +
      '<dl class="coach-print-meta">' +
        "<div><dt>Size</dt><dd>" + escapeHtml(p.recommendedSize) + "</dd></div>" +
        "<div><dt>Medium</dt><dd>" + escapeHtml(p.medium) + "</dd></div>" +
        "<div><dt>Mat</dt><dd>" + escapeHtml(p.matSuggestion) + "</dd></div>" +
      "</dl>" +
      '<p class="coach-muted">' + escapeHtml(p.why) + "</p></section>";
  }

  function renderChallenge(c) {
    return '<section class="coach-card coach-card--accent" aria-labelledby="coach-challenge-title">' +
      '<h3 class="coach-card__title" id="coach-challenge-title">Next time challenge</h3>' +
      '<p>' + escapeHtml(c.nextShootChallenge || c.fieldAssignment || "—") + "</p>" +
      (c.learningNote ? '<p class="coach-muted">' + escapeHtml(c.learningNote) + "</p>" : "") +
    "</section>";
  }

  function renderCenter(critique) {
    return renderGradeCard(critique) +
      renderBreakdown(critique) +
      renderStrengths(critique) +
      renderImprovements(critique) +
      '<div class="coach-actions coach-actions--center">' +
        '<button type="button" class="btn btn-secondary" id="btn-coach-save-session">Save session</button>' +
      "</div>";
  }

  function renderRight(critique) {
    var edits = global.WaypointPhotoCoachEditIntel && global.WaypointPhotoCoachEditIntel.renderHtml
      ? global.WaypointPhotoCoachEditIntel.renderHtml(critique.editIntelligence)
      : "";
    var scene = global.WaypointPhotoCoachSceneBridge && global.WaypointPhotoCoachSceneBridge.renderBringToLife
      ? global.WaypointPhotoCoachSceneBridge.renderBringToLife(critique)
      : "";
    return edits + renderCrop(critique) + renderPrint(critique) + renderChallenge(critique) + scene;
  }

  function renderAnalyzing() {
    var html = '<div class="coach-analyzing" role="status" aria-live="polite">' +
      '<p class="coach-analyzing__title">Analyzing…</p>' +
      '<p class="coach-muted">Sampling pixels and field context — Demo Analysis.</p></div>';
    if (els.centerMount) els.centerMount.innerHTML = html;
    if (els.rightMount) {
      els.rightMount.innerHTML = "";
      els.rightMount.hidden = true;
    }
  }

  function renderCritique(critique) {
    if (!critique) return;
    currentCritique = critique;
    if (els.centerMount) {
      els.centerMount.innerHTML = renderCenter(critique);
      els.centerMount.hidden = false;
    }
    if (els.rightMount) {
      els.rightMount.innerHTML = renderRight(critique);
      els.rightMount.hidden = false;
    }
    if (els.dashboard) els.dashboard.classList.add("has-results");
    bindResultActions();
  }

  function bindResultActions() {
    var saveBtn = $("btn-coach-save-session");
    if (saveBtn) {
      saveBtn.onclick = function () { saveCurrentSession(); };
    }
    var Bridge = global.WaypointPhotoCoachSceneBridge;
    if (Bridge && Bridge.bindActions && els.rightMount) {
      Bridge.bindActions(els.rightMount, {
        onSendBuilder: function (action) {
          if (action === "parallax" && global.WaypointSceneApp && global.WaypointSceneApp.loadPhotoForParallax) {
            global.WaypointSceneApp.setProductMode("builder");
            global.WaypointSceneApp.loadPhotoForParallax(imageUrl, currentFile ? currentFile.name : "photo");
            markSceneSent();
            return;
          }
          if (Bridge.sendToBuilder(imageUrl, currentFile, currentCritique, currentExif)) {
            markSceneSent();
          }
        }
      });
    }
  }

  function markSceneSent() {
    if (currentSessionId) {
      var P = global.WaypointPhotoCoachPortfolio;
      if (P && P.updateSession) P.updateSession(currentSessionId, { sceneBuilderStatus: "sent" });
    }
    refreshHistory();
  }

  function saveCurrentSession() {
    var P = global.WaypointPhotoCoachPortfolio;
    if (!P || !currentCritique) return;
    P.saveSession({
      id: currentSessionId,
      imageName: currentFile ? currentFile.name : null,
      exif: currentExif,
      critique: currentCritique,
      imageUrl: imageUrl,
      outdoorContext: currentCritique.outdoorContext ||
        (global.WaypointPhotoCoachOutdoorContext && global.WaypointPhotoCoachOutdoorContext.load
          ? global.WaypointPhotoCoachOutdoorContext.load()
          : null)
    }).then(function (session) {
      currentSessionId = session.id;
      var btn = $("btn-coach-save-session");
      if (btn) {
        btn.textContent = "Saved";
        setTimeout(function () { btn.textContent = "Save session"; }, 2000);
      }
      refreshHistory();
      var Skills = global.WaypointPhotoCoachSkills;
      if (Skills && Skills.buildProfile) Skills.buildProfile();
    });
  }

  function refreshHistory() {
    if (els.historyMount && global.WaypointPhotoCoachHistory) {
      global.WaypointPhotoCoachHistory.refresh(els.historyMount, historyCallbacks());
    }
  }

  function historyCallbacks() {
    return {
      onSelect: function (session) {
        if (!session || !session.critique) return;
        currentCritique = session.critique;
        currentSessionId = session.id;
        currentExif = session.exif;
        if (session.thumbnail && els.previewImg) {
          els.previewImg.src = session.thumbnail;
          els.previewImg.hidden = false;
        }
        if (els.previewFrame) els.previewFrame.hidden = false;
        if (els.empty) els.empty.hidden = true;
        if (els.fileName) els.fileName.textContent = session.imageName || "";
        if (els.exifMount) els.exifMount.innerHTML = renderExifPanel(session.exif);
        renderCritique(session.critique);
      },
      onDelete: refreshHistory
    };
  }

  function setPreview(file, url) {
    if (els.previewImg) {
      els.previewImg.src = url;
      els.previewImg.alt = file ? "Uploaded photo: " + file.name : "";
      els.previewImg.hidden = !url;
    }
    if (els.empty) els.empty.hidden = !!url;
    if (els.previewFrame) els.previewFrame.hidden = !url;
    if (els.fileName) els.fileName.textContent = file ? file.name : "";
    if (els.exifMount) els.exifMount.innerHTML = renderExifPanel(currentExif);
    if (els.fieldMount && currentCritique) {
      els.fieldMount.innerHTML = renderFieldInsights(currentCritique);
    }
  }

  function handleFile(file) {
    var check = validateFile(file);
    if (!check.ok) {
      if (els.error) {
        els.error.textContent = check.message || "Could not use that file.";
        els.error.hidden = false;
      }
      return;
    }
    if (els.error) els.error.hidden = true;
    revokeUrl();
    currentFile = file;
    currentSessionId = null;
    imageUrl = URL.createObjectURL(file);
    renderAnalyzing();

    var E = global.WaypointExifReader;
    var outdoorCtx = global.WaypointPhotoCoachOutdoorContext &&
      global.WaypointPhotoCoachOutdoorContext.load
      ? global.WaypointPhotoCoachOutdoorContext.load()
      : null;

    var exifPromise = E && E.readFromFile ? E.readFromFile(file) : Promise.resolve(null);
    var Demo = global.WaypointPhotoCoachDemo;

    exifPromise.then(function (exif) {
      currentExif = exif;
      setPreview(file, imageUrl);
      if (!Demo || !Demo.analyze) {
        renderCritique({ overallGrade: { letter: "—", score: 0, summary: "Analysis engine unavailable." } });
        return;
      }
      return Demo.analyze(file, imageUrl, exif, outdoorCtx).then(function (critique) {
        critique.outdoorContext = outdoorCtx;
        if (els.fieldMount) els.fieldMount.innerHTML = renderFieldInsights(critique);
        renderCritique(critique);
        saveCurrentSession();
      });
    }).catch(function (err) {
      if (els.error) {
        els.error.textContent = err && err.message ? err.message : "Analysis failed.";
        els.error.hidden = false;
      }
    });
  }

  function bindUpload() {
    function openPicker() {
      if (els.fileInput) els.fileInput.click();
    }
    [els.uploadBtn, els.uploadEmptyBtn, els.dropZone].forEach(function (el) {
      if (!el) return;
      if (el === els.dropZone) return;
      el.addEventListener("click", function (e) {
        if (el === els.dropZone) return;
        openPicker();
      });
    });
    if (els.uploadEmptyBtn) els.uploadEmptyBtn.addEventListener("click", openPicker);
    if (els.uploadBtn) els.uploadBtn.addEventListener("click", openPicker);
    if (els.dropZone) {
      els.dropZone.addEventListener("click", function (e) {
        if (e.target.closest("button")) return;
        openPicker();
      });
      els.dropZone.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openPicker();
        }
      });
      els.dropZone.addEventListener("dragover", function (e) {
        e.preventDefault();
        els.dropZone.classList.add("is-dragover");
      });
      els.dropZone.addEventListener("dragleave", function () {
        els.dropZone.classList.remove("is-dragover");
      });
      els.dropZone.addEventListener("drop", function (e) {
        e.preventDefault();
        els.dropZone.classList.remove("is-dragover");
        var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
        if (file) handleFile(file);
      });
    }
    if (els.fileInput) {
      els.fileInput.addEventListener("change", function () {
        var file = els.fileInput.files && els.fileInput.files[0];
        if (file) handleFile(file);
        els.fileInput.value = "";
      });
    }
  }

  function init() {
    els.fileInput = $("coach-file-input");
    els.uploadBtn = $("btn-coach-upload");
    els.uploadEmptyBtn = $("btn-coach-upload-empty");
    els.dropZone = $("coach-drop-zone");
    els.previewImg = $("coach-preview-img");
    els.previewFrame = $("coach-preview-frame");
    els.empty = $("coach-empty");
    els.centerMount = $("coach-center-mount");
    els.rightMount = $("coach-right-mount");
    els.error = $("coach-upload-error");
    els.fileName = $("coach-file-name");
    els.exifMount = $("coach-exif-mount");
    els.fieldMount = $("coach-field-mount");
    els.historyMount = $("coach-history-mount");
    els.dashboard = $("coach-dashboard");

    bindUpload();
    if (els.fieldMount) {
      els.fieldMount.innerHTML = renderFieldInsights(null);
    }
    if (els.historyMount && global.WaypointPhotoCoachHistory) {
      global.WaypointPhotoCoachHistory.mount(els.historyMount, historyCallbacks());
    }
  }

  global.WaypointPhotoCoach = {
    init: init,
    renderCritique: renderCritique,
    getCritique: function () { return currentCritique; },
    getExif: function () { return currentExif; },
    handleFile: handleFile
  };
})(window);
