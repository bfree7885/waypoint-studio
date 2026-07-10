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
    return '<div class="coach-card coach-card--field"><h3 class="coach-card__title">Field conditions</h3>' +
      '<p class="coach-muted">Optional. Photo Coach works without the dashboard. If you have recently opened the outdoor dashboard with your location, weather and light context can appear here.</p></div>';
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
      '<textarea id="coach-session-notes" class="coach-session-notes" rows="3" placeholder="What you learned, what to try next…"></textarea>' +
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
    var badge = c.isDemo || c.isSample
      ? '<span class="coach-trust coach-trust--demo">Demo Analysis</span>'
      : '<span class="coach-trust coach-trust--live">AI Analysis</span>';
    var genre = c.genre && !c.genre.uncertain && c.genre.confidence >= 0.58
      ? '<p class="coach-genre">Likely genre: <strong>' + escapeHtml(c.genre.label) + "</strong></p>"
      : (c.coaching && c.coaching.uncertainNote
        ? '<p class="coach-genre coach-genre--uncertain">' + escapeHtml(c.coaching.uncertainNote) + "</p>"
        : "");
    return '<section class="coach-grade-card" aria-labelledby="coach-grade-title">' +
      '<div class="coach-grade-card__head">' +
        '<h2 class="coach-grade-card__title" id="coach-grade-title">Overall grade</h2>' + badge +
      "</div>" +
      '<div class="coach-grade-card__score">' +
        '<span class="coach-grade-letter" aria-label="Letter grade">' + escapeHtml(g.letter || "—") + "</span>" +
        '<span class="coach-grade-num">' + escapeHtml(String(g.score != null ? g.score : c.overallScore || "—")) +
          '<span class="coach-grade-max">/100</span></span>' +
      "</div>" +
      genre +
      '<p class="coach-grade-summary">' + escapeHtml(c.narrativeSummary || g.summary || "") + "</p>" +
      '<dl class="coach-grade-meta">' +
        "<div><dt>Portfolio</dt><dd>" + escapeHtml(g.portfolioPotential || "—") + "</dd></div>" +
        "<div><dt>Print</dt><dd>" + escapeHtml(g.printPotential || "—") + "</dd></div>" +
        "<div><dt>Confidence</dt><dd>" + escapeHtml(g.confidence || "Demo signals") + "</dd></div>" +
      "</dl>" +
      (c.engineStatus === "disconnected"
        ? '<p class="coach-engine-note" role="status">Browser-based Demo Analysis — guidance from image characteristics, not a cloud AI review.</p>'
        : "") +
    "</section>";
  }

  function renderSignalsPanel(signals) {
    if (!signals) return "";
    var hist = signals.histogram || [];
    var bars = hist.map(function (v, i) {
      var h = clamp(Math.round(v * 400), 2, 100);
      return '<div class="coach-hist-bar coach-histogram__bar" style="height:' + h + '%" title="Tone bin ' + i + '"></div>';
    }).join("");
    return '<div class="coach-card coach-card--signals"><h3 class="coach-card__title">Image signals <span class="coach-trust coach-trust--demo">Demo</span></h3>' +
      '<div class="coach-histogram" aria-label="Luminance histogram">' + bars + "</div>" +
      '<ul class="coach-signal-list">' +
        "<li>Brightness: " + escapeHtml(String(Math.round(signals.brightness))) + "</li>" +
        "<li>Contrast: " + escapeHtml(String(Math.round(signals.contrast))) + "</li>" +
        "<li>Sharpness est.: " + escapeHtml(String(Math.round(signals.blurEstimate))) + "/100</li>" +
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
            '<p class="coach-photo-breakdown__teach"><strong>Teaching note:</strong> ' + escapeHtml(r.teachingNote) + "</p>" +
          "</details></li>";
      }).join("") + "</ul></section>";
  }

  function renderLearning(c) {
    var lc = c.learningConcept;
    if (!lc) return "";
    return '<section class="coach-card coach-card--learn" aria-labelledby="coach-learn-title">' +
      '<h3 class="coach-card__title" id="coach-learn-title">Learn today: ' + escapeHtml(lc.title) + "</h3>" +
      '<p>' + escapeHtml(lc.lesson) + "</p>" +
      '<p class="coach-muted"><strong>Practice:</strong> ' + escapeHtml(lc.practice) + "</p></section>";
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
      '<h3 class="coach-card__title" id="coach-strengths-title">What is working</h3>' +
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
    if (!list.length) {
      return '<section class="coach-card" aria-labelledby="coach-improve-title">' +
        '<h3 class="coach-card__title" id="coach-improve-title">What could improve</h3>' +
        '<p class="coach-muted">No high-confidence issue stood out from browser signals. Refine gently rather than stacking edits.</p></section>';
    }
    return '<section class="coach-card" aria-labelledby="coach-improve-title">' +
      '<h3 class="coach-card__title" id="coach-improve-title">What could improve</h3>' +
      '<ul class="coach-coach-cards">' + list.map(function (s, idx) {
        var badge = s.priority === "primary" || idx === 0
          ? '<span class="coach-priority-badge">Improve first</span>'
          : '<span class="coach-priority-badge coach-priority-badge--secondary">Secondary</span>';
        return '<li class="coach-coach-card coach-coach-card--grow' +
          (s.priority === "primary" || idx === 0 ? " coach-coach-card--primary" : "") + '">' +
          '<h4>' + escapeHtml(s.issue) + " " + badge + "</h4>" +
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
    return '<section class="coach-card coach-card--accent" aria-labelledby="coach-challenge-title">' +
      '<h3 class="coach-card__title" id="coach-challenge-title">Next field challenge</h3>' +
      '<p>' + escapeHtml(c.nextShootChallenge || c.fieldAssignment || "—") + "</p></section>";
  }

  function renderNextAction(c) {
    var improvements = c.improvements || [];
    var first = (c.coaching && c.coaching.primaryImprovement) || improvements[0];
    var edits = c.editIntelligence && c.editIntelligence.adjustments
      ? c.editIntelligence.adjustments.filter(function (a) { return a.priority === "primary"; })[0] ||
        c.editIntelligence.adjustments[0]
      : null;
    var title = first ? first.whatToDo : (edits ? "Try: " + edits.label + " → " + edits.suggestedValue : "");
    var why = first
      ? (first.expectedImprovement || first.whyItMatters || "")
      : (edits ? (edits.expectedImprovement || edits.reason || "") : "");
    if (!title) return "";
    return '<section class="coach-card coach-next-action" aria-labelledby="coach-next-title">' +
      '<h3 class="coach-card__title" id="coach-next-title">Suggested next edit</h3>' +
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

  function renderCenter(critique) {
    return renderGradeCard(critique) +
      renderStrengths(critique) +
      renderImprovements(critique) +
      renderNextAction(critique) +
      renderLearning(critique) +
      renderTechnicalDetails(critique) +
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
      if (els.dropZone) els.dropZone.classList.remove("is-loading");
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
    document.addEventListener("paste", function (e) {
      if (!els.dashboard || els.dashboard.closest("[hidden]")) return;
      var items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      for (var i = 0; i < items.length; i++) {
        if (items[i].type && items[i].type.indexOf("image") === 0) {
          var file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            handleFile(file);
            break;
          }
        }
      }
    });
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
    els.notesMount = $("coach-notes-mount");
    els.historyMount = $("coach-history-mount");
    els.compareMount = $("coach-compare-mount");
    els.signalsMount = $("coach-signals-mount");
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
