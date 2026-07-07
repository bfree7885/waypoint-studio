/**
 * Photo Coach — upload, EXIF, critique UI, portfolio, Scene Builder bridge.
 */
(function (global) {
  "use strict";

  var Schema = function () { return global.WaypointPhotoCoachSchema; };
  var Exif = function () { return global.WaypointExifReader; };
  var Portfolio = function () { return global.WaypointPhotoCoachPortfolio; };
  var imageUrl = null;
  var currentFile = null;
  var currentExif = null;
  var currentCritique = null;
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
    if (window.WaypointFileUpload) return window.WaypointFileUpload.validate(file);
    if (!file) return { ok: false, message: "No file selected." };
    return { ok: true };
  }

  function revokeUrl() {
    if (imageUrl && imageUrl.indexOf("blob:") === 0) URL.revokeObjectURL(imageUrl);
    imageUrl = null;
  }

  function renderList(items) {
    if (!items || !items.length) return "";
    return "<ul class=\"coach-list\">" + items.map(function (i) {
      return "<li>" + escapeHtml(i) + "</li>";
    }).join("") + "</ul>";
  }

  function renderSection(title, block) {
    if (!block) return "";
    var html = "<section class=\"coach-section\"><h3 class=\"coach-section__title\">" + escapeHtml(title) + "</h3>";
    if (block.summary) html += "<p class=\"coach-section__summary\">" + escapeHtml(block.summary) + "</p>";
    if (block.why) html += "<p class=\"coach-section__why\"><strong>Why:</strong> " + escapeHtml(block.why) + "</p>";
    if (block.strengths && block.strengths.length) {
      html += "<p class=\"coach-section__label\">Strengths</p>" + renderList(block.strengths);
    }
    if (block.improvements && block.improvements.length) {
      html += "<p class=\"coach-section__label\">Improve</p>" + renderList(block.improvements);
    }
    html += "</section>";
    return html;
  }

  function renderExifPanel(exif) {
    var E = Exif();
    if (!exif || !exif.hasExif) {
      return '<p class="coach-exif coach-exif--empty muted">No EXIF metadata found in this file. Capture data will appear when embedded in JPEG.</p>';
    }
    var lines = E && E.formatMeta ? E.formatMeta(exif) : [];
    return (
      '<div class="coach-exif">' +
        '<h3 class="coach-exif__title">Capture metadata <span class="coach-trust coach-trust--live">Live</span></h3>' +
        '<p class="coach-exif__source">Source: EXIF · Read locally on your device</p>' +
        '<ul class="coach-exif__list">' + lines.map(function (l) {
          return "<li>" + escapeHtml(l) + "</li>";
        }).join("") + "</ul>" +
      "</div>"
    );
  }

  function renderCritique(critique) {
    if (!critique) return "";
    var badge = critique.isSample
      ? '<span class="coach-trust coach-trust--demo">Demo sample</span>'
      : '<span class="coach-trust coach-trust--live">Live analysis</span>';
    var engineNote = critique.engineStatus === "disconnected"
      ? '<p class="coach-engine-note" role="status"><strong>Analysis engine not connected.</strong> ' +
        (critique.isSample
          ? "The critique below is a labeled demonstration of the structured feedback you will receive when AI analysis ships."
          : "Upload is ready; connect the analysis engine to generate real critiques.") +
        "</p>"
      : "";

    var recipeHtml = "";
    if (critique.editRecipe && critique.editRecipe.length) {
      recipeHtml = "<section class=\"coach-section\"><h3 class=\"coach-section__title\">Editing recommendations</h3><ol class=\"coach-recipe\">" +
        critique.editRecipe.map(function (step) {
          return "<li><strong>" + escapeHtml(step.step) + ":</strong> " + escapeHtml(step.action) +
            "<span class=\"coach-recipe__why\">" + escapeHtml(step.why) + "</span></li>";
        }).join("") + "</ol></section>";
    }

    return (
      '<div class="coach-results">' +
        '<header class="coach-results__head">' +
          badge +
          '<p class="coach-results__meta">Source: Waypoint Photo Coach · Schema v' + escapeHtml(critique.version || "2") + " · " +
            (critique.isSample ? "Demonstration data" : "AI analysis") +
            (critique.analyzedAt ? " · " + escapeHtml(new Date(critique.analyzedAt).toLocaleString()) : "") +
          "</p>" +
        "</header>" +
        engineNote +
        '<div class="coach-score-card">' +
          '<p class="coach-score-label">Overall score</p>' +
          '<p class="coach-score-value">' + (critique.overallScore != null ? escapeHtml(String(critique.overallScore)) : "—") + '<span class="coach-score-max">/100</span></p>' +
        "</div>" +
        '<div class="coach-recs">' +
          '<div class="coach-rec-card"><h3>Portfolio</h3><p>' + escapeHtml(critique.portfolioRecommendation || "—") + "</p></div>" +
          '<div class="coach-rec-card"><h3>Print</h3><p>' + escapeHtml(critique.printRecommendation || "—") + "</p></div>" +
        "</div>" +
        renderSection("Subject", critique.subject) +
        renderSection("Composition", critique.composition) +
        renderSection("Foreground", critique.foreground) +
        renderSection("Background", critique.background) +
        renderSection("Lighting", critique.lighting) +
        renderSection("Color", critique.color) +
        renderSection("Exposure", critique.exposure) +
        renderSection("Technical quality", critique.technical) +
        renderSection("Sharpness", critique.sharpness) +
        renderSection("Noise", critique.noise) +
        renderSection("Storytelling", critique.storytelling) +
        (critique.distractions && critique.distractions.length
          ? '<section class="coach-section"><h3 class="coach-section__title">Distractions</h3>' + renderList(critique.distractions) + "</section>"
          : "") +
        (critique.suggestedCrop
          ? '<section class="coach-section"><h3 class="coach-section__title">Suggested crop</h3>' +
              '<p><strong>' + escapeHtml(critique.suggestedCrop.aspectRatio) + "</strong> — " +
              escapeHtml(critique.suggestedCrop.description) + "</p>" +
              '<p class="coach-muted">' + escapeHtml(critique.suggestedCrop.reason) + "</p></section>"
          : "") +
        recipeHtml +
        '<section class="coach-section coach-section--accent"><h3 class="coach-section__title">Learning lesson</h3>' +
          '<p>' + escapeHtml(critique.learningNote || "—") + "</p></section>" +
        (critique.fieldAssignment
          ? '<section class="coach-section"><h3 class="coach-section__title">Field assignment</h3>' +
              '<p>' + escapeHtml(critique.fieldAssignment) + "</p></section>"
          : "") +
        '<section class="coach-section"><h3 class="coach-section__title">Challenge for your next shoot</h3>' +
          '<p>' + escapeHtml(critique.nextShootChallenge || "—") + "</p></section>" +
        '<div class="coach-actions">' +
          '<button type="button" class="btn btn-secondary" id="btn-coach-save-session">Save to portfolio</button>' +
          '<button type="button" class="btn btn-primary" id="btn-coach-send-builder">Build living scene</button>' +
        "</div>" +
      "</div>"
    );
  }

  function renderPortfolioSummary() {
    var P = Portfolio();
    if (!P || !els.portfolioMount) return;
    var summary = P.skillSummary();
    var Prof = global.WaypointPhotoCoachProfile;
    var prof = Prof && Prof.renderSummary ? Prof.renderSummary() : null;
    var skillsHtml = global.WaypointPhotoCoachSkills && global.WaypointPhotoCoachSkills.renderHtml
      ? global.WaypointPhotoCoachSkills.renderHtml()
      : "";
    var sessions = P.listSessions().slice(0, 5);
    var html = '<div class="coach-portfolio"><h3 class="coach-portfolio__title">Coached sessions</h3>';
    if (prof) {
      html += '<p class="coach-portfolio__stats">Level: ' + escapeHtml(prof.level) +
        " · Goals: " + escapeHtml(prof.goals) + "</p>";
    }
    if (summary) {
      html += '<p class="coach-portfolio__stats">' + summary.sessionsCoached + " sessions · avg " + summary.averageScore + "/100</p>";
    } else {
      html += '<p class="coach-portfolio__stats muted">No saved sessions yet — save a critique to track progress.</p>';
    }
    if (sessions.length) {
      html += '<ul class="coach-portfolio__list">' + sessions.map(function (s) {
        return "<li>" + escapeHtml(s.imageName || "Photo") + " · " +
          (s.critique && s.critique.overallScore != null ? s.critique.overallScore + "/100" : "—") +
          "</li>";
      }).join("") + "</ul>";
    }
    html += skillsHtml + "</div>";
    els.portfolioMount.innerHTML = html;
  }

  function bindResultActions() {
    var saveBtn = $("btn-coach-save-session");
    var builderBtn = $("btn-coach-send-builder");
    if (saveBtn) {
      saveBtn.onclick = function () {
        var P = Portfolio();
        if (!P || !currentCritique) return;
        P.saveSession({
          imageName: currentFile ? currentFile.name : null,
          exif: currentExif,
          critique: currentCritique,
          imageUrl: imageUrl
        });
        renderPortfolioSummary();
        var Skills = global.WaypointPhotoCoachSkills;
        if (Skills && Skills.buildProfile) Skills.buildProfile();
        saveBtn.textContent = "Saved";
        setTimeout(function () { saveBtn.textContent = "Save to portfolio"; }, 2000);
      };
    }
    if (builderBtn) {
      builderBtn.onclick = function () {
        if (!imageUrl || !window.WaypointSceneApp) return;
        if (window.WaypointSceneApp.setProductMode) {
          window.WaypointSceneApp.setProductMode("builder");
        } else {
          document.querySelectorAll("[data-product-mode]").forEach(function (btn) {
            if (btn.getAttribute("data-product-mode") === "builder") btn.click();
          });
        }
        window.WaypointSceneApp.loadPhotoForLivingScene(imageUrl, currentFile ? currentFile.name : "photo");
        if (window.WaypointSceneApp.setSceneContext) {
          window.WaypointSceneApp.setSceneContext(
            window.WaypointSceneContext && window.WaypointSceneContext.createContext
              ? window.WaypointSceneContext.createContext({
                  imageUrl: imageUrl,
                  imageName: currentFile ? currentFile.name : null,
                  exif: currentExif,
                  critique: currentCritique
                })
              : { critique: currentCritique, exif: currentExif }
          );
        }
      };
    }
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
    imageUrl = URL.createObjectURL(file);

    var E = Exif();
    var exifPromise = E && E.readFromFile ? E.readFromFile(file) : Promise.resolve(null);

    exifPromise.then(function (exif) {
      currentExif = exif;
      setPreview(file, imageUrl);
      var S = Schema();
      currentCritique = S ? S.sampleCritique(file.name, exif) : null;
      if (els.resultsMount) {
        els.resultsMount.innerHTML = renderCritique(currentCritique);
        els.resultsMount.hidden = false;
        bindResultActions();
      }
      if (els.resultsPanel) els.resultsPanel.hidden = false;
    });
  }

  function bindUpload() {
    function openPicker() {
      if (els.fileInput) els.fileInput.click();
    }
    [els.uploadBtn, els.uploadEmptyBtn].forEach(function (btn) {
      if (btn) btn.addEventListener("click", openPicker);
    });
    if (els.fileInput) {
      els.fileInput.addEventListener("change", function () {
        var file = els.fileInput.files && els.fileInput.files[0];
        if (file) handleFile(file);
        if (els.fileInput) els.fileInput.value = "";
      });
    }
    if (els.dropZone) {
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
  }

  function init() {
    els.fileInput = $("coach-file-input");
    els.uploadBtn = $("btn-coach-upload");
    els.uploadEmptyBtn = $("btn-coach-upload-empty");
    els.dropZone = $("coach-drop-zone");
    els.previewImg = $("coach-preview-img");
    els.previewFrame = $("coach-preview-frame");
    els.empty = $("coach-empty");
    els.resultsMount = $("coach-results");
    els.resultsPanel = $("coach-results-panel");
    els.error = $("coach-upload-error");
    els.fileName = $("coach-file-name");
    els.exifMount = $("coach-exif-mount");
    els.portfolioMount = $("coach-portfolio-mount");
    bindUpload();
    renderPortfolioSummary();
  }

  global.WaypointPhotoCoach = {
    init: init,
    renderCritique: renderCritique,
    getCritique: function () { return currentCritique; },
    getExif: function () { return currentExif; },
    analyze: function (file) {
      return Promise.resolve(Schema().sampleCritique(file && file.name, currentExif));
    }
  };
})(window);
