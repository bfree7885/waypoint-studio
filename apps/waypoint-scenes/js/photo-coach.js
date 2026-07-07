/**
 * Photo Coach — upload foundation + honest critique UI.
 * Real AI analysis not connected; sample critique shown only when labeled Demo.
 */
(function (global) {
  "use strict";

  var Schema = function () { return global.WaypointPhotoCoachSchema; };
  var imageUrl = null;
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
    if (block.strengths && block.strengths.length) {
      html += "<p class=\"coach-section__label\">Strengths</p>" + renderList(block.strengths);
    }
    if (block.improvements && block.improvements.length) {
      html += "<p class=\"coach-section__label\">Improve</p>" + renderList(block.improvements);
    }
    html += "</section>";
    return html;
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
      recipeHtml = "<section class=\"coach-section\"><h3 class=\"coach-section__title\">Suggested edit recipe</h3><ol class=\"coach-recipe\">" +
        critique.editRecipe.map(function (step) {
          return "<li><strong>" + escapeHtml(step.step) + ":</strong> " + escapeHtml(step.action) +
            "<span class=\"coach-recipe__why\">" + escapeHtml(step.why) + "</span></li>";
        }).join("") + "</ol></section>";
    }

    return (
      '<div class="coach-results">' +
        '<header class="coach-results__head">' +
          badge +
          '<p class="coach-results__meta">Source: Waypoint Photo Coach · ' +
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
        renderSection("Composition", critique.composition) +
        renderSection("Lighting", critique.lighting) +
        renderSection("Color", critique.color) +
        renderSection("Technical quality", critique.technical) +
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
        '<section class="coach-section coach-section--accent"><h3 class="coach-section__title">Learning note</h3>' +
          '<p>' + escapeHtml(critique.learningNote || "—") + "</p></section>" +
        '<section class="coach-section"><h3 class="coach-section__title">Challenge for your next shoot</h3>' +
          '<p>' + escapeHtml(critique.nextShootChallenge || "—") + "</p></section>" +
      "</div>"
    );
  }

  function setPreview(file, url) {
    var preview = els.previewImg;
    var empty = els.empty;
    var frame = els.previewFrame;
    if (preview) {
      preview.src = url;
      preview.alt = file ? "Uploaded photo: " + file.name : "";
      preview.hidden = !url;
    }
    if (empty) empty.hidden = !!url;
    if (frame) frame.hidden = !url;
    if (els.fileName) els.fileName.textContent = file ? file.name : "";
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
    imageUrl = URL.createObjectURL(file);
    setPreview(file, imageUrl);

    var S = Schema();
    currentCritique = S ? S.sampleCritique(file.name) : null;
    if (els.resultsMount) {
      els.resultsMount.innerHTML = renderCritique(currentCritique);
      els.resultsMount.hidden = false;
    }
    if (els.resultsPanel) els.resultsPanel.hidden = false;
  }

  function bindUpload() {
    function openPicker() {
      if (els.fileInput) els.fileInput.click();
    }
    [els.uploadBtn, els.uploadEmptyBtn, els.uploadNavBtn].forEach(function (btn) {
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
    els.uploadNavBtn = $("btn-coach-nav");
    els.dropZone = $("coach-drop-zone");
    els.previewImg = $("coach-preview-img");
    els.previewFrame = $("coach-preview-frame");
    els.empty = $("coach-empty");
    els.resultsMount = $("coach-results");
    els.resultsPanel = $("coach-results-panel");
    els.error = $("coach-upload-error");
    els.fileName = $("coach-file-name");
    bindUpload();
  }

  global.WaypointPhotoCoach = {
    init: init,
    renderCritique: renderCritique,
    getCritique: function () { return currentCritique; }
  };
})(window);
