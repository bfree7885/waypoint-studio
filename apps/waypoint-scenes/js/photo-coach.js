/**
 * Photo Coach — Upload. Notice. Understand. Bring it to Life.
 */
(function (global) {
  "use strict";

  var imageUrl = null;
  var currentFile = null;
  var currentExif = null;
  var currentCritique = null;
  var currentSessionId = null;
  var currentShoot = null;
  var currentImageId = null;
  var currentLibraryId = null;
  var batchBusy = false;
  var currentQueue = null;
  var objectUrls = [];
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

  function revokeAllObjectUrls() {
    objectUrls.forEach(function (u) {
      if (u && u.indexOf("blob:") === 0) URL.revokeObjectURL(u);
    });
    objectUrls = [];
    imageUrl = null;
  }

  function trackUrl(url) {
    if (url) objectUrls.push(url);
    return url;
  }

  function maxBatch() {
    var Shoot = global.WaypointPhotoCoachShoot;
    return Shoot && Shoot.MAX_IMAGES ? Shoot.MAX_IMAGES : 20;
  }

  function showError(message) {
    if (!els.error) return;
    els.error.textContent = message || "Something went wrong.";
    els.error.hidden = false;
  }

  function clearError() {
    if (els.error) els.error.hidden = true;
  }

  function refreshFilmstrip() {
    if (!els.filmstripMount || !global.WaypointPhotoCoachShoot) return;
    if (!currentShoot || !currentShoot.images.length) {
      els.filmstripMount.innerHTML = "";
      els.filmstripMount.hidden = true;
      return;
    }
    els.filmstripMount.hidden = false;
    els.filmstripMount.innerHTML = global.WaypointPhotoCoachShoot.renderFilmstripHtml(
      currentShoot,
      currentImageId
    );
    els.filmstripMount.querySelectorAll(".pc-filmstrip__item").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-image-id");
        if (id) showShootImage(id);
      });
    });
  }

  function refreshShootSummary() {
    if (!els.summaryMount || !global.WaypointPhotoCoachShoot) return;
    if (!currentShoot || !currentShoot.summary || currentShoot.images.length < 2) {
      els.summaryMount.innerHTML = "";
      els.summaryMount.hidden = true;
      return;
    }
    els.summaryMount.hidden = false;
    els.summaryMount.innerHTML = global.WaypointPhotoCoachShoot.renderSummaryHtml(
      currentShoot.summary,
      currentShoot
    );
    els.summaryMount.querySelectorAll(".pc-shoot-summary__open, .pc-group__thumb").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-image-id");
        if (id) showShootImage(id);
      });
    });
    els.summaryMount.querySelectorAll("details.pc-group").forEach(function (det) {
      det.addEventListener("toggle", function () {
        var gid = det.getAttribute("data-group-id");
        if (!gid || !currentShoot || !currentShoot.groups) return;
        currentShoot.groups.forEach(function (g) {
          if (g.id === gid) g.collapsed = !det.open;
        });
      });
    });
  }

  function persistCurrentShootLabels() {
    var Shoot = global.WaypointPhotoCoachShoot;
    if (!currentShoot || !Shoot) return;
    if (currentShoot.images.filter(function (i) { return i.status === "done"; }).length >= 2) {
      currentShoot.summary = Shoot.buildSummary(currentShoot);
    }
    var persistCopy = serializeShootForStorage(currentShoot);
    var ok = Shoot.persistShoot(persistCopy);
    if (ok === false) {
      showError("Could not save this shoot to browser storage (quota or privacy mode). Your labels still apply for this session — export or free space before closing the tab.");
    }
    refreshFilmstrip();
    refreshShootSummary();
  }

  function serializeShootForStorage(shoot) {
    return {
      schemaVersion: shoot.schemaVersion,
      id: shoot.id,
      createdAt: shoot.createdAt,
      updatedAt: new Date().toISOString(),
      status: shoot.status,
      outdoorContext: shoot.outdoorContext,
      source: shoot.source || "photo-coach",
      title: shoot.title || null,
      groups: shoot.groups || [],
      summary: shoot.summary,
      analysisStartedAt: shoot.analysisStartedAt || null,
      analysisFinishedAt: shoot.analysisFinishedAt || null,
      analysisDurationMs: shoot.analysisDurationMs || null,
      profileLink: null,
      importerHandoffId: shoot.importerHandoffId || null,
      communityMatchReady: false,
      images: shoot.images.map(function (img) {
        return {
          id: img.id,
          fileName: img.fileName,
          fileSize: img.fileSize,
          fileFingerprint: img.fileFingerprint || null,
          status: img.status,
          error: img.error,
          analyzedAt: img.analyzedAt,
          thumbnail: img.thumbnail,
          portfolioSessionId: img.portfolioSessionId,
          analysis: img.analysis,
          selectionLabel: img.selectionLabel || null,
          groupId: img.groupId || null,
          exif: img.exif
            ? {
                hasExif: !!img.exif.hasExif,
                make: img.exif.make || null,
                model: img.exif.model || null,
                lens: img.exif.lens || img.exif.lensModel || null,
                lensModel: img.exif.lensModel || null,
                iso: img.exif.iso || null,
                focalLengthMm: img.exif.focalLengthMm || null,
                fNumber: img.exif.fNumber || null,
                exposureTimeSec: img.exif.exposureTimeSec || null,
                dateTimeOriginal: img.exif.dateTimeOriginal || null,
                dateTime: img.exif.dateTime || null,
                gpsLatitude: img.exif.gpsLatitude || null,
                gpsLongitude: img.exif.gpsLongitude || null
              }
            : null
        };
      })
    };
  }

  function bindSelectionControls(mount, imageId, currentLabel) {
    if (!mount || !global.WaypointPhotoCoachShoot) return;
    var host = document.createElement("div");
    host.className = "pc-selection-mount";
    host.innerHTML = global.WaypointPhotoCoachShoot.renderSelectionControlsHtml(imageId, currentLabel);
    mount.appendChild(host);
    host.querySelectorAll("[data-selection]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var label = btn.getAttribute("data-selection");
        if (label === "") label = null;
        global.WaypointPhotoCoachShoot.setImageSelection(currentShoot, imageId, label);
        persistCurrentShootLabels();
        showShootImage(imageId);
      });
    });
  }

  function showShootImage(imageId) {
    if (!currentShoot) return;
    var img = currentShoot.images.filter(function (i) { return i.id === imageId; })[0];
    if (!img || (img.status !== "done" && img.status !== "error")) return;
    if (!img.critique && img.portfolioSessionId && global.WaypointPhotoCoachPortfolio) {
      var sess = global.WaypointPhotoCoachPortfolio.getSession(img.portfolioSessionId);
      if (sess && sess.critique) {
        img.critique = sess.critique;
        img.exif = img.exif || sess.exif;
      }
    }
    if (!img.critique) return;
    currentImageId = img.id;
    currentCritique = img.critique;
    currentExif = img.exif;
    currentSessionId = img.portfolioSessionId || null;
    currentFile = { name: img.fileName };
    if (img.thumbnail && els.previewImg) {
      els.previewImg.src = img.thumbnail;
      els.previewImg.alt = "Photo: " + img.fileName;
      els.previewImg.hidden = false;
    }
    if (els.previewFrame) els.previewFrame.hidden = false;
    if (els.empty) els.empty.hidden = true;
    if (els.fileName) els.fileName.textContent = img.fileName || "";
    if (els.exifMount) els.exifMount.innerHTML = renderExifPanel(img.exif);
    if (els.fieldMount) els.fieldMount.innerHTML = renderFieldInsights(img.critique);
    if (els.notesMount) showSessionNotes("");
    renderCritique(img.critique);
    if (els.centerMount && img.status === "done") {
      bindSelectionControls(els.centerMount, img.id, img.selectionLabel || null);
    }
    refreshFilmstrip();
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
        '<span class="coach-trust coach-trust--live">Stored outdoor context</span></h3>' +
        '<p class="coach-field-loc">' + escapeHtml(fi.location) + "</p>" +
        '<ul class="coach-field-list">' + (fi.lines || []).map(function (l) {
          return "<li>" + escapeHtml(l) + "</li>";
        }).join("") + "</ul>" +
        '<p class="coach-field-impact">' + escapeHtml(fi.photoImpact) + "</p>" +
        '<p class="coach-muted">From a saved field snapshot — not inferred from the photograph. EXIF GPS (if present) is separate and stays on this device.</p></div>';
    }
    if (Outdoor) {
      return Outdoor.render();
    }
    return '<div class="coach-card coach-card--field"><h3 class="coach-card__title">Field conditions</h3>' +
      '<p class="coach-muted">Optional. Photo Coach works without outdoor context. When a field snapshot was saved earlier on this device, weather and light can appear here — nothing is invented.</p></div>';
  }

  function updatePreviewOverlay(critique) {
    if (!els.previewFrame) return;
    var existing = els.previewFrame.querySelector(".coach-preview-thirds");
    if (existing) existing.remove();
    var crop = critique && critique.suggestedCrop;
    if (!crop || !crop.showOverlay) return;
    var overlay = document.createElement("div");
    overlay.className = "coach-preview-thirds";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = '<div class="coach-crop-thirds-h"></div><div class="coach-crop-thirds-v"></div>';
    els.previewFrame.appendChild(overlay);
  }

  function renderSessionNotes() {
    return '<div class="coach-card coach-card--notes" id="coach-session-notes-card">' +
      '<label class="coach-card__title" for="coach-session-notes">Session notes</label>' +
      '<textarea id="coach-session-notes" class="coach-session-notes" rows="3" placeholder="What you noticed, what you might try later…"></textarea>' +
      '<p class="coach-muted">Saved with this session in your portfolio.</p></div>';
  }

  function showSessionNotes(notes) {
    if (!els.notesMount) return;
    els.notesMount.innerHTML = renderSessionNotes();
    els.notesMount.hidden = false;
    var ta = $("coach-session-notes");
    if (ta) ta.value = notes || "";
    bindSessionNotes();
  }

  function bindSessionNotes() {
    var ta = $("coach-session-notes");
    if (!ta) return;
    ta.oninput = function () {
      if (currentSessionId) {
        var P = global.WaypointPhotoCoachPortfolio;
        if (P && P.updateSession) P.updateSession(currentSessionId, { sessionNotes: ta.value });
      }
    };
  }

  function renderGradeCard(c) {
    var g = c.overallGrade || {};
    var tier = c.confidenceTier || g.confidenceTier || "REASONABLE";
    var badge = '<span class="coach-trust coach-trust--live">' + escapeHtml(c.trustLabel || "On-device analysis") + "</span>";
    var confBadge = '<span class="coach-conf coach-conf--' + escapeHtml(String(tier).toLowerCase()) + '">' +
      escapeHtml(c.confidenceLabel || g.confidence || confidenceTierText(tier)) + "</span>";
    var genre = c.genre && !c.genre.uncertain && c.genre.confidence >= 0.58
      ? '<p class="coach-genre">Likely genre: <strong>' + escapeHtml(c.genre.label) + "</strong></p>"
      : (c.coaching && c.coaching.uncertainNote
        ? '<p class="coach-genre coach-genre--uncertain">' + escapeHtml(c.coaching.uncertainNote) + "</p>"
        : "");
    return '<section class="coach-grade-card" aria-labelledby="coach-grade-title">' +
      '<div class="coach-grade-card__head">' +
        '<h2 class="coach-grade-card__title" id="coach-grade-title">Overall read</h2>' + badge + confBadge +
      "</div>" +
      '<div class="coach-grade-card__score">' +
        '<span class="coach-grade-letter" aria-label="Relative reading">' + escapeHtml(g.letter || "—") + "</span>" +
        '<span class="coach-grade-num">' + escapeHtml(String(g.score != null ? g.score : c.overallScore || "—")) +
          '<span class="coach-grade-max">/100 relative</span></span>' +
      "</div>" +
      genre +
      '<p class="coach-grade-summary">' + escapeHtml(c.narrativeSummary || g.summary || "") + "</p>" +
      '<p class="coach-engine-note" role="note">A relative field reading of this image — not a grade of you as a photographer. Analysis stays on this device.</p>' +
    "</section>";
  }

  function confidenceTierText(tier) {
    if (tier === "HIGH") return "HIGH confidence";
    if (tier === "LOW") return "LOW confidence";
    return "REASONABLE confidence";
  }

  function renderSignalsPanel(signals) {
    if (!signals) return "";
    var hist = signals.histogram || [];
    var bars = hist.map(function (v, i) {
      var h = clamp(Math.round(v * 400), 2, 100);
      return '<div class="coach-hist-bar coach-histogram__bar" style="height:' + h + '%" title="Tone bin ' + i + '"></div>';
    }).join("");
    var sharp = signals.sharpnessAssessment;
    var sharpLine = sharp
      ? "Sharpness est.: " + escapeHtml(String(sharp.score)) + "/100 · " + escapeHtml(sharp.confidenceLabel || "")
      : "Sharpness est.: " + escapeHtml(String(Math.round(signals.blurEstimate))) + "/100";
    return '<div class="coach-card coach-card--signals"><h3 class="coach-card__title">Image signals <span class="coach-trust coach-trust--live">On-device</span></h3>' +
      '<div class="coach-histogram" aria-label="Luminance histogram">' + bars + "</div>" +
      '<ul class="coach-signal-list">' +
        "<li>Brightness: " + escapeHtml(String(Math.round(signals.brightness))) + "</li>" +
        "<li>Contrast: " + escapeHtml(String(Math.round(signals.contrast))) + "</li>" +
        "<li>" + sharpLine + "</li>" +
        "<li>Highlight clip est.: " + escapeHtml(String(Math.round(signals.highlightClip * 100))) + "%</li>" +
        "<li>Shadow clip est.: " + escapeHtml(String(Math.round(signals.shadowClip * 100))) + "%</li>" +
        "<li>Colors: " + escapeHtml((signals.dominantColors || []).join(", ")) + "</li>" +
      "</ul></div>";
  }

  function renderPhotoBreakdown(c) {
    var rows = c.photoBreakdown || [];
    if (!rows.length) return "";
    return '<section class="coach-card" aria-labelledby="coach-photo-breakdown-title">' +
      '<h3 class="coach-card__title" id="coach-photo-breakdown-title">Photo breakdown</h3>' +
      '<ul class="coach-photo-breakdown">' + rows.map(function (r) {
        return '<li class="coach-photo-breakdown__item">' +
          '<details class="coach-photo-breakdown__details">' +
            '<summary><span class="coach-photo-breakdown__cat">' + escapeHtml(r.category) + "</span>" +
            '<span class="coach-photo-breakdown__score">' + escapeHtml(String(r.score)) + "</span></summary>" +
            '<p class="coach-photo-breakdown__reason">' + escapeHtml(r.reason) + "</p>" +
            '<p class="coach-photo-breakdown__teach"><strong>Guide note:</strong> ' + escapeHtml(r.teachingNote) + "</p>" +
          "</details></li>";
      }).join("") + "</ul></section>";
  }

  function renderLearning(c) {
    var lc = c.learningConcept;
    if (!lc) return "";
    var Guide = global.WDS && global.WDS.guideCard;
    if (Guide && Guide.render) {
      return Guide.render({
        why: lc.lesson,
        noticing: lc.title,
        curious: lc.practice ? [lc.practice] : [],
        inset: true,
        id: "coach-learn"
      });
    }
    return '<section class="coach-card coach-card--learn" aria-labelledby="coach-learn-title">' +
      '<h3 class="coach-card__title" id="coach-learn-title">Worth noticing: ' + escapeHtml(lc.title) + "</h3>" +
      '<p>' + escapeHtml(lc.lesson) + "</p>" +
      '<p class="coach-muted"><strong>Worth trying:</strong> ' + escapeHtml(lc.practice) + "</p></section>";
  }

  function renderBreakdown(c) {
    var rows = c.scoreBreakdown || [];
    if (!rows.length) return "";
    return '<section class="coach-card" aria-labelledby="coach-breakdown-title">' +
      '<h3 class="coach-card__title" id="coach-breakdown-title">What stands out</h3>' +
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
    var list = (c.strengths || []).filter(function (s) {
      return !s.confidenceTier || s.confidenceTier !== "LOW" || (s.confidence != null && s.confidence >= 58);
    });
    if (!list.length) return "";
    return '<section class="coach-card coach-card--worked" aria-labelledby="coach-strengths-title">' +
      '<h3 class="coach-card__title" id="coach-strengths-title">What worked</h3>' +
      '<ul class="coach-coach-cards">' + list.map(function (s) {
        var conf = s.confidenceLabel || (s.confidenceTier ? s.confidenceTier + " confidence" : "");
        return '<li class="coach-coach-card coach-coach-card--good">' +
          '<h4>' + escapeHtml(s.title) +
          (conf ? ' <span class="coach-conf coach-conf--sm">' + escapeHtml(conf) + "</span>" : "") +
          "</h4>" +
          '<p><strong>Why:</strong> ' + escapeHtml(s.whyItWorks) + "</p>" +
          '<p><strong>Preserve:</strong> ' + escapeHtml(s.preserveInEdit) + "</p>" +
        "</li>";
      }).join("") + "</ul></section>";
  }

  function renderImprovements(c) {
    var list = (c.improvements || []).filter(function (s) {
      // Omit weak critiques from the primary coaching surface
      if (s.confidenceTier === "LOW" && s.category === "Sharpness" && !/uncertain/i.test(s.issue || "")) return false;
      if (s.confidence != null && s.confidence < 58) return false;
      return true;
    });
    if (!list.length) {
      return '<section class="coach-card coach-card--watch" aria-labelledby="coach-improve-title">' +
        '<h3 class="coach-card__title" id="coach-improve-title">What to watch</h3>' +
        '<p class="coach-muted">Nothing stood out with enough confidence from on-device signals. Your judgment leads — keep, maybe, or reject freely.</p></section>';
    }
    return '<section class="coach-card coach-card--watch" aria-labelledby="coach-improve-title">' +
      '<h3 class="coach-card__title" id="coach-improve-title">What to watch</h3>' +
      '<ul class="coach-coach-cards">' + list.slice(0, 3).map(function (s, idx) {
        var badge = s.priority === "primary" || idx === 0
          ? '<span class="coach-priority-badge">First</span>'
          : '<span class="coach-priority-badge coach-priority-badge--secondary">Also</span>';
        var conf = s.confidenceLabel || "";
        return '<li class="coach-coach-card coach-coach-card--grow' +
          (s.priority === "primary" || idx === 0 ? " coach-coach-card--primary" : "") + '">' +
          '<h4>' + escapeHtml(s.issue) + " " + badge +
          (conf ? ' <span class="coach-conf coach-conf--sm">' + escapeHtml(conf) + "</span>" : "") +
          "</h4>" +
          '<p><strong>Why it may matter:</strong> ' + escapeHtml(s.whyItMatters) + "</p>" +
          '<p><strong>If you edit:</strong> ' + escapeHtml(s.whatToDo) + "</p>" +
        "</li>";
      }).join("") + "</ul></section>";
  }

  function renderNextTime(c) {
    var actions = c.nextTimeActions || (c.coaching && c.coaching.nextTimeActions) || [];
    if (!actions.length) {
      var challenge = c.nextShootChallenge || c.fieldAssignment;
      if (challenge) actions = [challenge];
    }
    actions = actions.slice(0, 2);
    if (!actions.length) return "";
    return '<section class="coach-card coach-card--next-time" aria-labelledby="coach-next-time-title">' +
      '<h3 class="coach-card__title" id="coach-next-time-title">Next time</h3>' +
      '<p class="coach-muted">One or two concrete field actions — optional, not homework.</p>' +
      '<ol class="coach-next-time">' + actions.map(function (a) {
        return "<li>" + escapeHtml(a) + "</li>";
      }).join("") + "</ol></section>";
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
      '<h3 class="coach-card__title" id="coach-crop-title">Crop idea (optional)</h3>' +
      '<div class="coach-crop-preview">' + overlay +
        '<span class="coach-crop-ratio">' + escapeHtml(crop.aspectRatio) + "</span>" +
      "</div>" +
      '<p>' + escapeHtml(crop.reasoning) + "</p>" +
      (crop.alternativeAspectRatios && crop.alternativeAspectRatios.length
        ? '<p class="coach-muted"><strong>Also consider:</strong> ' + escapeHtml(crop.alternativeAspectRatios.join(", ")) + "</p>"
        : "") +
      '<p class="coach-muted"><strong>Leading lines:</strong> ' + escapeHtml(crop.leadingLineSuggestion || "") + "</p>" +
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
      '<h3 class="coach-card__title" id="coach-print-title">Print lab</h3>' +
      '<p class="coach-print-worthy">' + escapeHtml(p.worthyLabel) + "</p>" +
      '<dl class="coach-print-meta">' +
        "<div><dt>Max size</dt><dd>" + escapeHtml(p.recommendedSize) + "</dd></div>" +
        "<div><dt>Paper</dt><dd>" + escapeHtml(p.paper || p.medium) + "</dd></div>" +
        "<div><dt>Matte</dt><dd>" + escapeHtml(p.matte || "—") + "</dd></div>" +
        "<div><dt>Gloss</dt><dd>" + escapeHtml(p.gloss || "—") + "</dd></div>" +
        "<div><dt>Fine art</dt><dd>" + escapeHtml(p.fineArt || "—") + "</dd></div>" +
        "<div><dt>Canvas</dt><dd>" + escapeHtml(p.canvas || "—") + "</dd></div>" +
        "<div><dt>Metal</dt><dd>" + escapeHtml(p.metal || "—") + "</dd></div>" +
        "<div><dt>Border</dt><dd>" + escapeHtml(p.border || "—") + "</dd></div>" +
        "<div><dt>Frame</dt><dd>" + escapeHtml(p.frameColor || "—") + "</dd></div>" +
      "</dl>" +
      '<p class="coach-muted">' + escapeHtml(p.why) + "</p></section>";
  }

  function renderChallenge(c) {
    var tip = c.nextShootChallenge || c.fieldAssignment || "";
    if (!tip) return "";
    var Guide = global.WDS && global.WDS.guideCard;
    if (Guide && Guide.render) {
      return Guide.render({
        noticing: tip,
        why: "An optional noticing idea for another walk — only if it still interests you.",
        inset: true,
        id: "coach-challenge"
      });
    }
    return '<section class="coach-card coach-card--accent" aria-labelledby="coach-challenge-title">' +
      '<h3 class="coach-card__title" id="coach-challenge-title">Worth noticing next</h3>' +
      '<p>' + escapeHtml(tip) + "</p></section>";
  }

  function renderNextAction(c) {
    var improvements = c.improvements || [];
    var first = (c.coaching && c.coaching.primaryImprovement) || improvements[0];
    var edits = c.editIntelligence && c.editIntelligence.adjustments
      ? c.editIntelligence.adjustments.filter(function (a) { return a.priority === "primary"; })[0] ||
        c.editIntelligence.adjustments[0]
      : null;
    var title = first ? first.whatToDo : (edits ? edits.label + " → " + edits.suggestedValue : "");
    var why = first
      ? (first.expectedImprovement || first.whyItMatters || "")
      : (edits ? (edits.expectedImprovement || edits.reason || "") : "");
    if (!title) return "";
    var Guide = global.WDS && global.WDS.guideCard;
    if (Guide && Guide.render) {
      return Guide.render({
        noticing: title,
        why: why || "One optional change worth considering — your original file is unchanged.",
        curious: why ? ["Your original file stays unchanged."] : [],
        inset: true,
        id: "coach-next"
      });
    }
    return '<section class="coach-card coach-next-action" aria-labelledby="coach-next-title">' +
      '<h3 class="coach-card__title" id="coach-next-title">If you\'re curious</h3>' +
      '<p>' + escapeHtml(title) + "</p>" +
      (why ? '<p class="coach-next-action__why"><strong>Why that may help:</strong> ' + escapeHtml(why) + "</p>" : "") +
      '<p class="coach-muted">Suggestions only — your original file is unchanged.</p>' +
    "</section>";
  }

  function renderTechnicalDetails(c) {
    var body = renderPhotoBreakdown(c) + renderBreakdown(c);
    if (!body) return "";
    return '<details class="coach-tech-details">' +
      "<summary>Technical details</summary>" +
      '<p class="coach-muted">Measured image signals and category scores — secondary to the coaching above.</p>' +
      body +
    "</details>";
  }

  function renderPersonalized(c) {
    var p = c.personalized;
    if (!p) return "";
    var steps = (p.nextSteps || []).map(function (s) {
      return "<li>" + escapeHtml(s.text) +
        (s.wasRepeated ? ' <span class="coach-muted">(ongoing focus)</span>' : "") +
        "</li>";
    }).join("");
    var styleNotes = (p.technicalVsStyle || []).map(function (n) {
      return "<li>" + escapeHtml(n.text) + "</li>";
    }).join("");
    var growth = (p.growthNotes || []).map(function (g) {
      return "<li><strong>" + escapeHtml(g.area) + "</strong> — " + escapeHtml(g.explanation) +
        ' <span class="coach-muted">(' + escapeHtml(String(g.confidencePercent)) + "% · " +
        escapeHtml(g.confidenceLabel || "") + ")</span></li>";
    }).join("");

    return '<section class="coach-card coach-card--personalized" aria-labelledby="coach-for-you-title">' +
      '<h3 class="coach-card__title" id="coach-for-you-title">For you</h3>' +
      (p.limitedEvidence
        ? '<p class="coach-muted">' + escapeHtml(p.limitedNote || "Personal coaching is still light.") + "</p>"
        : "") +
      (p.styleRelation ? "<p>" + escapeHtml(p.styleRelation) + "</p>" : "") +
      (growth ? '<ul class="coach-personalized__growth">' + growth + "</ul>" : "") +
      (steps ? "<p><strong>Useful next steps</strong></p><ul>" + steps + "</ul>" : "") +
      (styleNotes
        ? "<p><strong>Technical vs style</strong></p><ul>" + styleNotes + "</ul>"
        : "") +
      '<p class="coach-muted">Private coaching from your profile and recent shoots — not a comparison to anyone else.</p>' +
    "</section>";
  }

  function renderCenter(critique) {
    return '<div class="coach-review-stack">' +
      renderGradeCard(critique) +
      renderStrengths(critique) +
      renderImprovements(critique) +
      renderNextTime(critique) +
      renderPersonalized(critique) +
      renderLearning(critique) +
      renderTechnicalDetails(critique) +
      '<div class="coach-actions coach-actions--center">' +
        '<button type="button" class="wds-btn wds-btn--secondary" id="btn-coach-save-session">Save to Library</button>' +
        '<p class="coach-muted coach-kbd-hint">Labels: <kbd>1</kbd> Keep · <kbd>2</kbd> Maybe · <kbd>3</kbd> Reject · <kbd>4</kbd> Favorite · <kbd>0</kbd> Clear</p>' +
      "</div>" +
    "</div>";
  }

  function renderRight(critique) {
    var edits = global.WaypointPhotoCoachEditIntel && global.WaypointPhotoCoachEditIntel.renderHtml
      ? global.WaypointPhotoCoachEditIntel.renderHtml(critique.editIntelligence)
      : "";
    return '<details class="coach-deeper"><summary>Deeper edit &amp; print notes</summary>' +
      '<div class="coach-deeper__body">' +
        edits + renderCrop(critique) + renderPrint(critique) +
      "</div></details>";
  }

  function renderAnalyzing() {
    var html = '<div class="coach-analyzing" role="status" aria-live="polite">' +
      '<p class="coach-analyzing__title">Analyzing your photo…</p>' +
      '<p class="coach-muted">Reviewing visual qualities in your browser. This usually takes a moment.</p></div>';
    if (els.centerMount) els.centerMount.innerHTML = html;
    if (els.dropZone) els.dropZone.classList.add("is-loading");
    if (els.rightMount) {
      els.rightMount.innerHTML = "";
      els.rightMount.hidden = true;
    }
  }

  function renderCritique(critique) {
    if (!critique) return;
    currentCritique = critique;
    if (els.dropZone) els.dropZone.classList.remove("is-loading");
    if (els.centerMount) {
      els.centerMount.innerHTML = renderCenter(critique);
      els.centerMount.hidden = false;
    }
    if (els.rightMount) {
      els.rightMount.innerHTML = renderRight(critique);
      els.rightMount.hidden = false;
    }
    if (els.dashboard) els.dashboard.classList.add("has-results");
    if (els.signalsMount && critique.signals) {
      els.signalsMount.innerHTML = renderSignalsPanel(critique.signals);
      els.signalsMount.hidden = false;
    }
    if (els.notesMount) {
      var notes = "";
      if (currentSessionId) {
        var Pn = global.WaypointPhotoCoachPortfolio;
        var sess = Pn && Pn.getSession ? Pn.getSession(currentSessionId) : null;
        if (sess) notes = sess.sessionNotes || "";
      }
      showSessionNotes(notes);
    }
    updatePreviewOverlay(critique);
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
      sessionNotes: ($("coach-session-notes") && $("coach-session-notes").value) || "",
      outdoorContext: currentCritique.outdoorContext ||
        (global.WaypointPhotoCoachOutdoorContext && global.WaypointPhotoCoachOutdoorContext.load
          ? global.WaypointPhotoCoachOutdoorContext.load()
          : null)
    }).then(function (session) {
      currentSessionId = session.id;
      var btn = $("btn-coach-save-session");
      if (btn) {
        btn.textContent = "Saved to Library";
        setTimeout(function () { btn.textContent = "Save to Library"; }, 2000);
      }
      refreshHistory();
      var Skills = global.WaypointPhotoCoachSkills;
      if (Skills && Skills.buildProfile) Skills.buildProfile();
    }).catch(function () {
      showError("Could not save this photograph locally. Your in-session review is still available — free storage space or try again.");
    });
  }

  function refreshHistory() {
    if (els.historyMount && global.WaypointPhotoCoachHistory) {
      global.WaypointPhotoCoachHistory.refresh(els.historyMount, historyCallbacks());
    }
  }

  var compareSessionA = null;

  function historyCallbacks() {
    return {
      onSelect: function (session) {
        if (!session || !session.critique) return;
        if (compareSessionA && compareSessionA.id !== session.id) {
          var Cmp = global.WaypointPhotoCoachCompare;
          if (Cmp && els.compareMount) Cmp.mount(els.compareMount, compareSessionA, session);
          compareSessionA = null;
          return;
        }
        compareSessionA = session;
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
        if (els.notesMount) showSessionNotes(session.sessionNotes || "");
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

  function analyzeOne(file, imageRec, outdoorCtx) {
    var Shoot = global.WaypointPhotoCoachShoot;
    var E = global.WaypointExifReader;
    var Demo = global.WaypointPhotoCoachDemo;
    var url = trackUrl(URL.createObjectURL(file));
    imageRec.status = "analyzing";
    refreshFilmstrip();

    var exifPromise = E && E.readFromFile ? E.readFromFile(file) : Promise.resolve(null);

    return exifPromise.then(function (exif) {
      imageRec.exif = exif;
      if (!Demo || !Demo.analyze) {
        throw new Error("Analysis engine unavailable.");
      }
      return Demo.analyze(file, url, exif, outdoorCtx).then(function (critique) {
        critique.outdoorContext = outdoorCtx;

        // Personalized coaching from profile + memory (before persist/render)
        var Repo = global.WaypointPhotoCoachRepository;
        if (Repo && Repo.applyPersonalizedCritique) {
          Repo.applyPersonalizedCritique(critique, {
            photoId: null,
            shootId: currentShoot ? currentShoot.id : null,
            shootImages: currentShoot
              ? currentShoot.images.filter(function (i) { return i.status === "done" && i.critique; })
              : []
          });
        }

        return Shoot.makeThumbnail(url).then(function (thumb) {
          imageRec.thumbnail = thumb;
          imageRec.critique = critique;
          imageRec.analysis = Shoot.toStructuredAnalysis(critique);
          imageRec.analyzedAt = critique.analyzedAt || new Date().toISOString();
          imageRec.status = "done";
          imageRec.error = null;

          // Persist individual portfolio session (existing behavior)
          var P = global.WaypointPhotoCoachPortfolio;
          var afterPersist = function () {
            // Growth data model — silent PhotoRecord write
            if (Repo && Repo.ingestAnalysis) {
              var record = Repo.ingestAnalysis(critique, {
                originalFilename: file.name,
                exif: exif,
                outdoorContext: outdoorCtx,
                shootId: currentShoot ? currentShoot.id : null,
                portfolioSessionId: imageRec.portfolioSessionId || null,
                thumbnail: thumb,
                legacyImageId: imageRec.id,
                selectionLabel: imageRec.selectionLabel || null
              });
              if (record) {
                imageRec.photoUuid = record.uuid;
                // Link memory photo IDs when possible
                if (Repo.CoachingRepository && critique.personalized) {
                  Repo.CoachingRepository.list().slice(0, 6).forEach(function (mem) {
                    if (!mem.photoId && mem.shootId === (currentShoot && currentShoot.id)) {
                      mem.photoId = record.uuid;
                      Repo.CoachingRepository.save(mem);
                    }
                  });
                }
                if (imageRec.analysis) {
                  imageRec.analysis.photoUuid = record.uuid;
                  if (imageRec.analysis.profileContribution) {
                    imageRec.analysis.profileContribution.photoUuid = record.uuid;
                  }
                }
                if (currentLibraryId && global.WaypointPhotoLibraryEngine) {
                  try {
                    var lib = global.WaypointPhotoLibraryEngine.get();
                    if (lib && lib.linkPhotoCoachResult) {
                      lib.linkPhotoCoachResult(currentLibraryId, {
                        analysisStatus: "analyzed",
                        photoRecordId: record.uuid,
                        portfolioSessionId: imageRec.portfolioSessionId || null,
                        shootId: currentShoot ? currentShoot.id : null,
                        shootImageId: imageRec.id,
                        analyzedAt: critique.analyzedAt || new Date().toISOString(),
                        letterGrade: critique.overallGrade && critique.overallGrade.letter,
                        overallScore: critique.overallScore,
                        narrativeSummary: critique.narrativeSummary || null,
                        confidenceTier: critique.confidenceTier || null,
                        coachSummary: critique.narrativeSummary || null,
                        outdoorContext: outdoorCtx || null,
                        selectionLabel: imageRec.selectionLabel || null,
                        subjectHints: (critique.genre && critique.genre.label && !critique.genre.uncertain)
                          ? [critique.genre.label]
                          : []
                      });
                    }
                  } catch (libErr) { /* library optional */ }
                }
              }
            }
            return { file: file, url: url, imageRec: imageRec, critique: critique, exif: exif };
          };
          if (P && P.saveSession) {
            return P.saveSession({
              imageName: file.name,
              exif: exif,
              critique: critique,
              imageUrl: url,
              thumbnail: thumb,
              outdoorContext: outdoorCtx,
              shootId: currentShoot ? currentShoot.id : null,
              shootImageId: imageRec.id
            }).then(function (session) {
              imageRec.portfolioSessionId = session.id;
              return afterPersist();
            });
          }
          return afterPersist();
        });
      });
    }).catch(function (err) {
      imageRec.status = "error";
      imageRec.error = err && err.message ? err.message : "Analysis failed.";
      return null;
    });
  }

  function finishShoot() {
    var Shoot = global.WaypointPhotoCoachShoot;
    if (!currentShoot || !Shoot) return;
    var done = currentShoot.images.filter(function (i) { return i.status === "done"; });
    var failed = currentShoot.images.filter(function (i) { return i.status === "error"; });
    var skipped = currentShoot.images.filter(function (i) { return i.status === "skipped"; });
    currentShoot.analysisFinishedAt = new Date().toISOString();
    if (currentShoot.analysisStartedAt) {
      currentShoot.analysisDurationMs = Math.max(
        0,
        new Date(currentShoot.analysisFinishedAt) - new Date(currentShoot.analysisStartedAt)
      );
    }
    currentShoot.status = skipped.length && !done.length && !failed.length
      ? "cancelled"
      : failed.length && !done.length
        ? "error"
        : failed.length || skipped.length
          ? "partial"
          : "complete";
    currentShoot.summary = done.length ? Shoot.buildSummary(currentShoot) : null;

    var Repo = global.WaypointPhotoCoachRepository;
    if (currentShoot.summary && Repo && Repo.applyNextOutingCoaching) {
      Repo.applyNextOutingCoaching(currentShoot);
    }

    var persistCopy = serializeShootForStorage(currentShoot);
    Shoot.persistShoot(persistCopy);

    // Growth Shoot entity + profile bookkeeping
    if (Repo && Repo.ingestShoot) {
      var photoRecords = [];
      if (Repo.PhotoRepository && Repo.PhotoRepository.byShoot) {
        photoRecords = Repo.PhotoRepository.byShoot(currentShoot.id);
      }
      Repo.ingestShoot(persistCopy, photoRecords);
    }

    refreshFilmstrip();
    refreshShootSummary();
    if (els.dropZone) els.dropZone.classList.remove("is-loading");
    batchBusy = false;
    currentQueue = null;
    refreshHistory();
  }

  function runBatch(files) {
    var Shoot = global.WaypointPhotoCoachShoot;
    var Queue = global.WaypointPhotoCoachQueue;
    if (!Shoot) {
      if (files[0]) handleFile(files[0]);
      return;
    }
    if (batchBusy) {
      showError("A shoot is already analyzing. Cancel it or wait for it to finish.");
      return;
    }

    var accepted = [];
    var rejected = [];
    for (var i = 0; i < files.length; i++) {
      var check = validateFile(files[i]);
      if (check.ok) accepted.push(files[i]);
      else rejected.push((files[i] && files[i].name ? files[i].name : "file") + ": " + (check.message || "invalid"));
    }

    var skippedDuplicates = 0;
    if (Queue && Queue.dedupeFiles) {
      var deduped = Queue.dedupeFiles(accepted);
      accepted = deduped.unique;
      skippedDuplicates = deduped.skippedDuplicates;
    }

    if (accepted.length > maxBatch()) {
      showError("You can analyze up to " + maxBatch() + " photos per shoot. Only the first " + maxBatch() + " will be used.");
      accepted = accepted.slice(0, maxBatch());
    }
    if (!accepted.length) {
      showError(rejected[0] || "No valid images selected.");
      return;
    }
    var notices = [];
    if (rejected.length) notices.push(rejected.length + " file(s) skipped as unsupported.");
    if (skippedDuplicates) notices.push(skippedDuplicates + " duplicate file(s) skipped.");
    if (notices.length) showError(notices.join(" ") + " Analyzing " + accepted.length + " photo(s).");
    else clearError();

    revokeAllObjectUrls();
    batchBusy = true;
    var outdoorCtx = global.WaypointPhotoCoachOutdoorContext &&
      global.WaypointPhotoCoachOutdoorContext.load
      ? global.WaypointPhotoCoachOutdoorContext.load()
      : null;

    currentShoot = Shoot.createShoot({ outdoorContext: outdoorCtx });
    currentShoot.status = "analyzing";
    currentShoot.analysisStartedAt = new Date().toISOString();
    currentShoot.images = accepted.map(function (f) { return Shoot.createImageRecord(f); });
    currentImageId = null;
    currentSessionId = null;
    if (els.summaryMount) {
      els.summaryMount.innerHTML = "";
      els.summaryMount.hidden = true;
    }
    refreshFilmstrip();
    if (els.dropZone) els.dropZone.classList.add("is-loading");

    function paintProgress(state) {
      if (els.centerMount && Shoot.renderProgressHtml) {
        els.centerMount.innerHTML = Shoot.renderProgressHtml(state);
        var cancelBtn = $("pc-queue-cancel");
        if (cancelBtn && currentQueue) {
          cancelBtn.addEventListener("click", function () {
            currentQueue.cancel();
          });
        }
      }
      if (els.rightMount) {
        els.rightMount.innerHTML = "";
        els.rightMount.hidden = true;
      }
    }

    function afterQueue() {
      finishShoot();
      var done = currentShoot.images.filter(function (im) { return im.status === "done"; });
      if (done.length) {
        var favorite = done.filter(function (im) { return im.selectionLabel === "favorite"; })[0];
        var best = favorite || done.slice().sort(function (a, b) {
          return (b.analysis.overallScore || 0) - (a.analysis.overallScore || 0);
        })[0];
        showShootImage(best.id);
      } else if (currentShoot.status === "cancelled") {
        showError("Analysis cancelled. No photographs were finished.");
        if (els.centerMount) {
          els.centerMount.innerHTML = '<div class="coach-welcome"><p>Analysis cancelled. Upload again when you are ready.</p></div>';
        }
      } else {
        showError("Could not analyze any photos in this shoot.");
      }
    }

    if (Queue && Queue.createQueue) {
      currentQueue = Queue.createQueue({
        files: accepted,
        onProgress: function (state) {
          paintProgress(state);
          refreshFilmstrip();
        },
        processItem: function (file, index) {
          var imageRec = currentShoot.images[index];
          if (currentQueue && currentQueue.getState().cancelled) {
            imageRec.status = "skipped";
            return Promise.resolve(false);
          }
          return analyzeOne(file, imageRec, outdoorCtx).then(function (result) {
            refreshFilmstrip();
            if (result) {
              currentFile = result.file;
              imageUrl = result.url;
              currentExif = result.exif;
              currentCritique = result.critique;
              currentImageId = result.imageRec.id;
              currentSessionId = result.imageRec.portfolioSessionId;
              setPreview(result.file, result.url);
              if (els.fieldMount) els.fieldMount.innerHTML = renderFieldInsights(result.critique);
              renderCritique(result.critique);
              bindSelectionControls(els.centerMount, result.imageRec.id, result.imageRec.selectionLabel || null);
            }
            return !!result;
          });
        }
      });
      paintProgress(currentQueue.getState());
      currentQueue.start().then(function (result) {
        if (result && result.status === "cancelled") {
          currentShoot.images.forEach(function (img) {
            if (img.status === "pending" || img.status === "analyzing") img.status = "skipped";
          });
        }
        afterQueue();
      });
      return;
    }

    // Fallback without queue module
    var idx = 0;
    function next() {
      if (idx >= accepted.length) {
        afterQueue();
        return;
      }
      paintProgress({
        status: "running",
        index: idx,
        total: accepted.length,
        currentFileName: accepted[idx].name,
        remaining: accepted.length - idx,
        estimatedMsRemaining: null
      });
      analyzeOne(accepted[idx], currentShoot.images[idx], outdoorCtx).then(function (result) {
        refreshFilmstrip();
        if (result) {
          currentFile = result.file;
          imageUrl = result.url;
          currentExif = result.exif;
          currentCritique = result.critique;
          currentImageId = result.imageRec.id;
          currentSessionId = result.imageRec.portfolioSessionId;
          setPreview(result.file, result.url);
          if (els.fieldMount) els.fieldMount.innerHTML = renderFieldInsights(result.critique);
          renderCritique(result.critique);
        }
        idx++;
        setTimeout(next, 30);
      });
    }
    next();
  }

  function handleFile(file) {
    if (!file) return;
    runBatch([file]);
  }

  function handleFiles(fileList) {
    var files = [];
    if (!fileList) return;
    for (var i = 0; i < fileList.length; i++) files.push(fileList[i]);
    if (!files.length) return;
    runBatch(files);
  }

  function bindUpload() {
    function openPicker() {
      if (els.fileInput) els.fileInput.click();
    }
    function openFolderPicker() {
      if (els.folderInput) els.folderInput.click();
    }
    if (els.uploadEmptyBtn) els.uploadEmptyBtn.addEventListener("click", openPicker);
    if (els.uploadBtn) els.uploadBtn.addEventListener("click", openPicker);
    if (els.folderBtn) {
      var supportsFolder = els.folderInput && ("webkitdirectory" in els.folderInput || "directory" in els.folderInput);
      if (!supportsFolder) {
        els.folderBtn.hidden = true;
      } else {
        els.folderBtn.addEventListener("click", openFolderPicker);
      }
    }
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
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
          handleFiles(e.dataTransfer.files);
        }
      });
    }
    if (els.fileInput) {
      els.fileInput.addEventListener("change", function () {
        if (els.fileInput.files && els.fileInput.files.length) {
          handleFiles(els.fileInput.files);
        }
        els.fileInput.value = "";
      });
    }
    if (els.folderInput) {
      els.folderInput.addEventListener("change", function () {
        if (els.folderInput.files && els.folderInput.files.length) {
          handleFiles(els.folderInput.files);
        }
        els.folderInput.value = "";
      });
    }
    document.addEventListener("paste", function (e) {
      if (!els.dashboard || els.dashboard.closest("[hidden]")) return;
      var items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      var pasted = [];
      for (var i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.indexOf("image") === 0) {
          var file = items[i].getAsFile();
          if (file) pasted.push(file);
        }
      }
      if (pasted.length) {
        e.preventDefault();
        handleFiles(pasted);
      }
    });
  }

  function primeWorthNoticing() {
    var WN = global.WDS && global.WDS.worthNoticing;
    if (!WN || !WN.loadSamples || WN.getLibrary()) return;
    var base = "../../design-system/worth-noticing/";
    Promise.all([
      WN.loadSamples(base + "samples/demo-observations.json"),
      WN.loadRules(base + "rules/generation-rules.json"),
      WN.loadQuality(base + "quality.json")
    ])
      .then(function (parts) {
        WN.prime(parts[0].observations || [], parts[1], parts[2]);
        if (els.fieldMount) {
          els.fieldMount.innerHTML = renderFieldInsights(null);
          if (WN.bindDismiss) WN.bindDismiss(els.fieldMount);
        }
      })
      .catch(function () {
        /* optional — silence is correct if samples unavailable */
      });
  }

  function init() {
    els.fileInput = $("coach-file-input");
    els.folderInput = $("coach-folder-input");
    els.folderBtn = $("btn-coach-folder");
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
    els.notesMount = $("coach-notes-mount");
    els.historyMount = $("coach-history-mount");
    els.compareMount = $("coach-compare-mount");
    els.signalsMount = $("coach-signals-mount");
    els.dashboard = $("coach-dashboard");
    els.filmstripMount = $("coach-filmstrip-mount");
    els.summaryMount = $("coach-shoot-summary-mount");

    bindUpload();
    bindLabelKeyboard();
    primeWorthNoticing();
    if (els.fieldMount) {
      els.fieldMount.innerHTML = renderFieldInsights(null);
    }
    if (els.historyMount && global.WaypointPhotoCoachHistory) {
      global.WaypointPhotoCoachHistory.mount(els.historyMount, historyCallbacks());
    }
    var Repo = global.WaypointPhotoCoachRepository;
    if (Repo && Repo.ProfileRepository && Repo.ProfileRepository.load) {
      Repo.ProfileRepository.load();
    }

    // Future Importer handoff peek (no auto-run)
    var Bridge = global.WaypointPhotoCoachImporterBridge;
    if (Bridge && Bridge.peekHandoff && Bridge.peekHandoff()) {
      console.info("[Photo Coach] Importer handoff is staged. Ingest is not auto-started yet.");
    }

    // Photo Library deep-link: /apps/photo-coach/?libraryId=
    var LibClient = global.WaypointPhotoLibraryClient;
    if (LibClient && LibClient.resolveLibraryFile) {
      LibClient.resolveLibraryFile().then(function (pack) {
        if (!pack || !pack.file) return;
        handleFiles([pack.file]);
        if (pack.image && pack.id && global.WaypointPhotoLibraryEngine) {
          try {
            currentLibraryId = pack.id;
          } catch (e) { /* ignore */ }
        }
      }).catch(function () { /* ignore missing library */ });
    }

    // Return to shoot summary: /apps/photo-coach/?shootId=
    try {
      var params = new URLSearchParams(global.location.search || "");
      var shootId = params.get("shootId");
      var ShootApi = global.WaypointPhotoCoachShoot;
      if (shootId && ShootApi && ShootApi.getShoot) {
        var found = ShootApi.getShoot(shootId);
        if (found) {
          currentShoot = found;
          refreshFilmstrip();
          refreshShootSummary();
          var firstDone = (found.images || []).filter(function (i) { return i.status === "done"; })[0];
          if (firstDone) showShootImage(firstDone.id);
        }
      }
    } catch (e) { /* ignore */ }
  }

  function bindLabelKeyboard() {
    document.addEventListener("keydown", function (e) {
      if (!currentShoot || !currentImageId) return;
      var t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      var map = { "1": "keep", "2": "maybe", "3": "reject", "4": "favorite", "0": null };
      if (!(e.key in map)) return;
      e.preventDefault();
      var label = map[e.key];
      global.WaypointPhotoCoachShoot.setImageSelection(currentShoot, currentImageId, label);
      persistCurrentShootLabels();
      showShootImage(currentImageId);
    });
  }

  global.WaypointPhotoCoach = {
    init: init,
    renderCritique: renderCritique,
    getCritique: function () { return currentCritique; },
    getExif: function () { return currentExif; },
    getShoot: function () { return currentShoot; },
    handleFile: handleFile,
    handleFiles: handleFiles,
    cancelQueue: function () {
      if (currentQueue) currentQueue.cancel();
    }
  };
})(window);
