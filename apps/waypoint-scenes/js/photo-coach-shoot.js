/**
 * Photo Coach v2 — Shoot sessions, structured analysis storage, Shoot Summary.
 * Architecture foundation for future photographer profiles, style/niche detection,
 * progress tracking, personalized coaching, and community matching.
 * Does not implement those features yet — only storage + summary.
 */
(function (global) {
  "use strict";

  var SCHEMA_VERSION = "1.0.0";
  var STORAGE_KEY = "waypoint-photo-coach-shoots-v1";
  var MAX_SHOOTS = 12;
  var MAX_IMAGES = 20;
  var THUMB_MAX = 120;

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function round(n) {
    return Math.round(n);
  }

  function id(prefix) {
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7);
  }

  function loadAll() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function saveAll(shoots) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(shoots.slice(0, MAX_SHOOTS)));
      return true;
    } catch (e) {
      // Quota — drop oldest shoots and retry once
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(shoots.slice(0, Math.max(3, Math.floor(MAX_SHOOTS / 2)))));
        return true;
      } catch (e2) {
        return false;
      }
    }
  }

  function makeThumbnail(imageUrl) {
    return new Promise(function (resolve) {
      if (!imageUrl) { resolve(null); return; }
      var img = new Image();
      img.onload = function () {
        try {
          var canvas = document.createElement("canvas");
          var scale = THUMB_MAX / Math.max(img.naturalWidth, img.naturalHeight);
          canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
          var ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.68));
        } catch (err) {
          resolve(null);
        }
      };
      img.onerror = function () { resolve(null); };
      img.src = imageUrl;
    });
  }

  /**
   * Compact structured analysis JSON — not freeform text only.
   * profileContribution is reserved for future Photographer Profiles.
   */
  function toStructuredAnalysis(critique) {
    critique = critique || {};
    var signals = critique.signals || {};
    var genre = critique.genre || null;
    var strengths = critique.strengths || [];
    var improvements = critique.improvements || [];
    var breakdown = critique.scoreBreakdown || [];

    var styleSignals = {
      brightness: signals.brightness != null ? round(signals.brightness) : null,
      contrast: signals.contrast != null ? round(signals.contrast) : null,
      saturation: signals.saturation != null ? Math.round(signals.saturation * 1000) / 1000 : null,
      warmth: signals.warmth != null ? Math.round(signals.warmth * 1000) / 1000 : null,
      coolness: signals.coolness != null ? Math.round(signals.coolness * 1000) / 1000 : null,
      sharpness: signals.blurEstimate != null ? round(signals.blurEstimate) : null,
      orientation: signals.orientation || null,
      subjectEmphasis: signals.subjectEmphasis != null
        ? Math.round(signals.subjectEmphasis * 1000) / 1000
        : null,
      highlightClip: signals.highlightClip != null
        ? Math.round(signals.highlightClip * 1000) / 1000
        : null,
      shadowClip: signals.shadowClip != null
        ? Math.round(signals.shadowClip * 1000) / 1000
        : null
    };

    return {
      schemaVersion: SCHEMA_VERSION,
      engineVersion: critique.version || null,
      trustLabel: critique.trustLabel || "Demo Analysis",
      isDemo: critique.isDemo !== false,
      analyzedAt: critique.analyzedAt || new Date().toISOString(),
      overallGrade: critique.overallGrade || null,
      overallScore: critique.overallScore != null
        ? critique.overallScore
        : (critique.overallGrade && critique.overallGrade.score),
      narrativeSummary: critique.narrativeSummary || null,
      genre: genre,
      coaching: critique.coaching || {
        topStrengths: strengths.slice(0, 3),
        primaryImprovement: improvements[0] || null,
        secondaryImprovements: improvements.slice(1, 4)
      },
      strengths: strengths,
      improvements: improvements,
      scoreBreakdown: breakdown,
      learningConcept: critique.learningConcept || null,
      suggestedCrop: critique.suggestedCrop
        ? {
            aspectRatio: critique.suggestedCrop.aspectRatio,
            reasoning: critique.suggestedCrop.reasoning
          }
        : null,
      styleSignals: styleSignals,
      nicheHints: genre && genre.label && !genre.uncertain ? [genre.label] : [],
      photoUuid: null,
      profileContribution: {
        // Linked PhotoRecord UUID filled after repository ingest.
        // PreferredSubjects / niche / style live on PhotographerProfile (not computed here).
        photoUuid: null,
        skillScores: breakdown.map(function (row) {
          return { category: row.category, score: row.score };
        }),
        styleVector: styleSignals,
        genreVotes: genre && genre.label && !genre.uncertain
          ? [{ label: genre.label, confidence: genre.confidence || 0 }]
          : [],
        strengthTags: strengths.map(function (s) { return s.title; }),
        improvementTags: improvements.map(function (i) { return i.issue || i.category; })
      }
    };
  }

  function createShoot(options) {
    options = options || {};
    return {
      schemaVersion: SCHEMA_VERSION,
      id: id("shoot"),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: "pending",
      outdoorContext: options.outdoorContext || null,
      images: [],
      summary: null,
      // Future hooks (unused for now)
      profileLink: null,
      communityMatchReady: false
    };
  }

  function createImageRecord(file) {
    return {
      id: id("img"),
      fileName: file && file.name ? file.name : "photo.jpg",
      fileSize: file && file.size != null ? file.size : null,
      status: "pending",
      error: null,
      analyzedAt: null,
      thumbnail: null,
      portfolioSessionId: null,
      analysis: null,
      critique: null,
      exif: null
    };
  }

  function stddev(values) {
    if (!values.length) return 0;
    var mean = values.reduce(function (a, b) { return a + b; }, 0) / values.length;
    var v = values.reduce(function (a, b) { return a + (b - mean) * (b - mean); }, 0) / values.length;
    return Math.sqrt(v);
  }

  function median(values) {
    if (!values.length) return 0;
    var s = values.slice().sort(function (a, b) { return a - b; });
    var mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }

  function countMap(items, keyFn) {
    var map = {};
    items.forEach(function (item) {
      var key = keyFn(item);
      if (!key) return;
      if (!map[key]) map[key] = { key: key, count: 0, examples: [] };
      map[key].count++;
      if (map[key].examples.length < 3) map[key].examples.push(item);
    });
    return Object.keys(map).map(function (k) { return map[k]; })
      .sort(function (a, b) { return b.count - a.count; });
  }

  /**
   * Overall shoot score — not a simple average.
   * Blends median, top-keeper strength, consistency, and weak-frame penalty.
   */
  function computeShootScore(scores) {
    if (!scores.length) return null;
    var n = scores.length;
    var med = median(scores);
    var mean = scores.reduce(function (a, b) { return a + b; }, 0) / n;
    var sorted = scores.slice().sort(function (a, b) { return b - a; });
    var topN = sorted.slice(0, Math.min(3, n));
    var topMean = topN.reduce(function (a, b) { return a + b; }, 0) / topN.length;
    var sd = stddev(scores);
    var consistency = clamp(100 - sd * 2.2, 40, 100);
    var keeperRatio = scores.filter(function (s) { return s >= 80; }).length / n;
    var weakRatio = scores.filter(function (s) { return s < 65; }).length / n;
    var raw = 0.32 * med + 0.38 * topMean + 0.18 * mean + 0.12 * consistency
      + keeperRatio * 6 - weakRatio * 10;
    return {
      score: clamp(round(raw), 40, 98),
      median: round(med),
      mean: round(mean),
      topMean: round(topMean),
      consistency: round(consistency),
      stddev: Math.round(sd * 10) / 10,
      keeperCount: scores.filter(function (s) { return s >= 80; }).length,
      weakCount: scores.filter(function (s) { return s < 65; }).length
    };
  }

  function letterFromScore(score) {
    var Demo = global.WaypointPhotoCoachDemo;
    if (Demo && Demo.letterGrade) return Demo.letterGrade(score);
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "F";
  }

  function buildSummary(shoot) {
    var done = (shoot.images || []).filter(function (img) {
      return img.status === "done" && img.analysis;
    });
    if (!done.length) return null;

    var scores = done.map(function (img) {
      return img.analysis.overallScore != null
        ? img.analysis.overallScore
        : (img.analysis.overallGrade && img.analysis.overallGrade.score) || 0;
    });
    var shootScore = computeShootScore(scores);

    var ranked = done.slice().sort(function (a, b) {
      var sa = a.analysis.overallScore || 0;
      var sb = b.analysis.overallScore || 0;
      return sb - sa;
    });
    var strongest = ranked.slice(0, Math.min(3, ranked.length)).map(function (img) {
      var primaryStrength = (img.analysis.strengths && img.analysis.strengths[0])
        ? img.analysis.strengths[0].title
        : "Strong overall read";
      return {
        imageId: img.id,
        fileName: img.fileName,
        score: img.analysis.overallScore,
        letter: img.analysis.overallGrade && img.analysis.overallGrade.letter,
        thumbnail: img.thumbnail,
        why: primaryStrength
      };
    });

    var strengthEntries = [];
    done.forEach(function (img) {
      (img.analysis.strengths || []).forEach(function (s) {
        strengthEntries.push({
          title: s.title,
          fileName: img.fileName,
          imageId: img.id
        });
      });
    });
    var commonStrengths = countMap(strengthEntries, function (e) { return e.title; })
      .slice(0, 5)
      .map(function (row) {
        return {
          title: row.key,
          count: row.count,
          examples: row.examples.map(function (e) { return e.fileName; })
        };
      });

    var improveEntries = [];
    done.forEach(function (img) {
      (img.analysis.improvements || []).forEach(function (imp, idx) {
        improveEntries.push({
          issue: imp.issue,
          category: imp.category || null,
          priority: imp.priority || (idx === 0 ? "primary" : "secondary"),
          fileName: img.fileName,
          imageId: img.id
        });
      });
    });
    var recurring = countMap(improveEntries, function (e) { return e.issue; })
      .slice(0, 5)
      .map(function (row) {
        return {
          issue: row.key,
          count: row.count,
          examples: row.examples.map(function (e) { return e.fileName; }),
          category: row.examples[0] && row.examples[0].category
        };
      });

    var brightness = [];
    var contrast = [];
    var sharpness = [];
    var warmth = [];
    done.forEach(function (img) {
      var st = img.analysis.styleSignals || {};
      if (st.brightness != null) brightness.push(st.brightness);
      if (st.contrast != null) contrast.push(st.contrast);
      if (st.sharpness != null) sharpness.push(st.sharpness);
      if (st.warmth != null) warmth.push(st.warmth);
    });

    var techNotes = [];
    var bSd = stddev(brightness);
    var cSd = stddev(contrast);
    var sSd = stddev(sharpness);
    var wSd = stddev(warmth);
    if (bSd < 18 && brightness.length > 1) {
      techNotes.push("Exposure stays relatively consistent across the shoot.");
    } else if (bSd >= 28) {
      techNotes.push("Exposure varies widely — decide a target brightness before the next outing.");
    }
    if (cSd < 10 && contrast.length > 1) {
      techNotes.push("Contrast character is consistent from frame to frame.");
    } else if (cSd >= 18) {
      techNotes.push("Contrast swings between frames — watch light quality and post habits.");
    }
    if (sSd < 12 && sharpness.length > 1) {
      techNotes.push("Sharpness is fairly steady across the set.");
    } else if (sSd >= 20) {
      techNotes.push("Sharpness is uneven — check shutter speed, focus, and handholding.");
    }
    if (wSd < 0.08 && warmth.length > 1) {
      techNotes.push("White-balance / color temperature feels cohesive.");
    } else if (wSd >= 0.12) {
      techNotes.push("Color temperature shifts between frames — lock WB or correct in a batch.");
    }
    if (!techNotes.length) {
      techNotes.push("Technical signals vary moderately — usable set with room to tighten habits.");
    }

    var techScore = clamp(round(
      100 - (bSd / 2 + cSd * 1.2 + sSd * 1.1 + wSd * 80) / Math.max(1, done.length > 1 ? 1 : 2)
    ), 45, 96);

    var topRecurring = recurring[0];
    var nextFocus = topRecurring
      ? {
          title: topRecurring.issue,
          why: "This issue appeared in " + topRecurring.count + " of " + done.length + " frames.",
          practice: "On your next outing, make this your single field priority before changing anything else."
        }
      : {
          title: "Protect what is already working",
          why: "No single improvement dominated this shoot.",
          practice: "Repeat your strongest setup and vary only one variable (height, timing, or crop)."
        };

    var genreVotes = {};
    done.forEach(function (img) {
      var g = img.analysis.genre;
      if (!g || g.uncertain || !g.label) return;
      if (!genreVotes[g.label]) genreVotes[g.label] = { label: g.label, count: 0, confidenceSum: 0 };
      genreVotes[g.label].count++;
      genreVotes[g.label].confidenceSum += g.confidence || 0;
    });
    var dominantGenres = Object.keys(genreVotes).map(function (k) {
      var g = genreVotes[k];
      return {
        label: g.label,
        count: g.count,
        avgConfidence: Math.round((g.confidenceSum / g.count) * 100) / 100
      };
    }).sort(function (a, b) { return b.count - a.count; });

    return {
      schemaVersion: SCHEMA_VERSION,
      builtAt: new Date().toISOString(),
      imageCount: done.length,
      failedCount: (shoot.images || []).filter(function (i) { return i.status === "error"; }).length,
      overallShootScore: shootScore.score,
      letter: letterFromScore(shootScore.score),
      scoreDetail: shootScore,
      strongestImages: strongest,
      commonStrengths: commonStrengths,
      recurringImprovements: recurring,
      technicalConsistency: {
        score: techScore,
        notes: techNotes,
        metrics: {
          brightnessStdDev: Math.round(bSd * 10) / 10,
          contrastStdDev: Math.round(cSd * 10) / 10,
          sharpnessStdDev: Math.round(sSd * 10) / 10,
          warmthStdDev: Math.round(wSd * 1000) / 1000
        }
      },
      nextOutingFocus: nextFocus,
      // Future: Photographer Profiles / style / niche / matching
      profileHints: {
        dominantGenres: dominantGenres,
        styleTendencies: [
          brightness.length ? { key: "brightness", mean: round(brightness.reduce(function (a, b) { return a + b; }, 0) / brightness.length) } : null,
          contrast.length ? { key: "contrast", mean: round(contrast.reduce(function (a, b) { return a + b; }, 0) / contrast.length) } : null,
          warmth.length ? { key: "warmth", mean: Math.round((warmth.reduce(function (a, b) { return a + b; }, 0) / warmth.length) * 100) / 100 } : null
        ].filter(Boolean),
        skillSignals: commonStrengths.slice(0, 3).map(function (s) { return s.title; }),
        growthSignals: recurring.slice(0, 3).map(function (r) { return r.issue; })
      }
    };
  }

  function persistShoot(shoot) {
    if (!shoot || !shoot.id) return false;
    shoot.updatedAt = new Date().toISOString();
    var all = loadAll().filter(function (s) { return s.id !== shoot.id; });
    all.unshift(shoot);
    return saveAll(all);
  }

  function getShoot(shootId) {
    return loadAll().filter(function (s) { return s.id === shootId; })[0] || null;
  }

  function listShoots() {
    return loadAll();
  }

  function deleteShoot(shootId) {
    saveAll(loadAll().filter(function (s) { return s.id !== shootId; }));
  }

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderFilmstripHtml(shoot, activeId) {
    if (!shoot || !shoot.images || !shoot.images.length) return "";
    var done = shoot.images.filter(function (i) { return i.status === "done"; }).length;
    var total = shoot.images.length;
    var items = shoot.images.map(function (img, idx) {
      var isActive = img.id === activeId;
      var label = img.status === "done"
        ? ((img.analysis && img.analysis.overallGrade && img.analysis.overallGrade.letter) || "•")
        : img.status === "analyzing"
          ? "…"
          : img.status === "error"
            ? "!"
            : String(idx + 1);
      var thumb = img.thumbnail
        ? '<img src="' + escapeHtml(img.thumbnail) + '" alt="" class="pc-filmstrip__thumb">'
        : '<span class="pc-filmstrip__placeholder" aria-hidden="true"></span>';
      return '<button type="button" class="pc-filmstrip__item' +
        (isActive ? " is-active" : "") +
        (img.status === "done" ? " is-done" : "") +
        (img.status === "analyzing" ? " is-analyzing" : "") +
        (img.status === "error" ? " is-error" : "") +
        '" data-image-id="' + escapeHtml(img.id) + '"' +
        ' aria-label="' + escapeHtml(img.fileName) + " — " + escapeHtml(img.status) + '"' +
        (img.status !== "done" && img.status !== "error" ? " disabled" : "") + ">" +
        thumb +
        '<span class="pc-filmstrip__grade">' + escapeHtml(label) + "</span>" +
      "</button>";
    }).join("");

    return '<div class="pc-filmstrip" role="list" aria-label="Shoot photos">' +
      '<div class="pc-filmstrip__meta">' +
        "<strong>Shoot</strong> · " + done + " / " + total + " analyzed" +
      "</div>" +
      '<div class="pc-filmstrip__track">' + items + "</div>" +
    "</div>";
  }

  function renderSummaryHtml(summary, shoot) {
    if (!summary) return "";
    var strongest = (summary.strongestImages || []).map(function (img) {
      return '<li class="pc-shoot-summary__strong">' +
        (img.thumbnail
          ? '<img src="' + escapeHtml(img.thumbnail) + '" alt="" class="pc-shoot-summary__thumb">'
          : "") +
        '<div><strong>' + escapeHtml(img.letter || "—") + " · " + escapeHtml(String(img.score || "—")) +
        "</strong> " + escapeHtml(img.fileName) +
        '<p class="pc-shoot-summary__why">' + escapeHtml(img.why) + "</p>" +
        '<button type="button" class="pc-shoot-summary__open" data-image-id="' + escapeHtml(img.imageId) +
        '">View analysis</button></div></li>';
    }).join("");

    var strengths = (summary.commonStrengths || []).map(function (s) {
      return "<li><strong>" + escapeHtml(s.title) + "</strong> · " + s.count +
        " frame" + (s.count === 1 ? "" : "s") + "</li>";
    }).join("") || "<li>No repeated strengths detected yet.</li>";

    var recurring = (summary.recurringImprovements || []).map(function (r) {
      return "<li><strong>" + escapeHtml(r.issue) + "</strong> · " + r.count +
        " frame" + (r.count === 1 ? "" : "s") + "</li>";
    }).join("") || "<li>No recurring issues stood out.</li>";

    var tech = (summary.technicalConsistency.notes || []).map(function (n) {
      return "<li>" + escapeHtml(n) + "</li>";
    }).join("");

    var focus = summary.nextOutingFocus || {};

    return '<section class="pc-shoot-summary coach-card" aria-labelledby="pc-shoot-summary-title">' +
      '<div class="pc-shoot-summary__head">' +
        '<h2 class="coach-card__title" id="pc-shoot-summary-title">Shoot Summary</h2>' +
        '<span class="coach-trust coach-trust--demo">Demo Analysis</span>' +
      "</div>" +
      '<div class="pc-shoot-summary__score">' +
        '<span class="pc-shoot-summary__letter">' + escapeHtml(summary.letter) + "</span>" +
        '<span class="pc-shoot-summary__num">' + escapeHtml(String(summary.overallShootScore)) +
          '<span class="pc-preview__max">/100</span></span>' +
        '<p class="pc-shoot-summary__score-note">Shoot score blends keepers, median quality, and consistency — not a plain average.</p>' +
      "</div>" +
      '<div class="pc-shoot-summary__grid">' +
        '<div><h3 class="pc-shoot-summary__h">Strongest images</h3><ul class="pc-shoot-summary__strong-list">' +
          strongest + "</ul></div>" +
        "<div><h3 class=\"pc-shoot-summary__h\">Common strengths</h3><ul>" + strengths + "</ul></div>" +
        "<div><h3 class=\"pc-shoot-summary__h\">Recurring improvements</h3><ul>" + recurring + "</ul></div>" +
        '<div><h3 class="pc-shoot-summary__h">Technical consistency · ' +
          escapeHtml(String(summary.technicalConsistency.score)) + "/100</h3><ul>" + tech + "</ul></div>" +
      "</div>" +
      '<div class="pc-shoot-summary__focus">' +
        "<h3 class=\"pc-shoot-summary__h\">Suggested focus for next outing</h3>" +
        "<p><strong>" + escapeHtml(focus.title || "") + "</strong></p>" +
        "<p>" + escapeHtml(focus.why || "") + "</p>" +
        "<p>" + escapeHtml(focus.practice || "") + "</p>" +
      "</div>" +
      '<p class="coach-muted">Stored as structured JSON in this browser — foundation for future progress and profile features.</p>' +
    "</section>";
  }

  function renderProgressHtml(current, total, fileName) {
    return '<div class="pc-batch-progress" role="status" aria-live="polite">' +
      '<p class="pc-batch-progress__title">Analyzing shoot…</p>' +
      '<p class="coach-muted">' + current + " of " + total +
      (fileName ? " · " + escapeHtml(fileName) : "") + "</p>" +
      '<div class="pc-batch-progress__bar" aria-hidden="true">' +
        '<div class="pc-batch-progress__fill" style="width:' +
          clamp(round((current / Math.max(total, 1)) * 100), 0, 100) + '%"></div>' +
      "</div></div>";
  }

  global.WaypointPhotoCoachShoot = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    MAX_IMAGES: MAX_IMAGES,
    MAX_SHOOTS: MAX_SHOOTS,
    createShoot: createShoot,
    createImageRecord: createImageRecord,
    toStructuredAnalysis: toStructuredAnalysis,
    buildSummary: buildSummary,
    computeShootScore: computeShootScore,
    makeThumbnail: makeThumbnail,
    persistShoot: persistShoot,
    saveShoot: persistShoot,
    getShoot: getShoot,
    listShoots: listShoots,
    deleteShoot: deleteShoot,
    renderFilmstripHtml: renderFilmstripHtml,
    renderSummaryHtml: renderSummaryHtml,
    renderProgressHtml: renderProgressHtml
  };
})(window);
