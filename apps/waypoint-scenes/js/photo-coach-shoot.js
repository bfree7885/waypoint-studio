/**
 * Photo Coach v2 — Shoot Review
 * Session shoot storage, queue-friendly image records, Shoot Summary,
 * grouping hooks, private selection labels, session insights & stats.
 * Photographer Profile consumes structured summaryHints — no cloud share.
 */
(function (global) {
  "use strict";

  var SCHEMA_VERSION = "2.0.0";
  var STORAGE_KEY = "waypoint-photo-coach-shoots-v1";
  var MAX_SHOOTS = 12;
  var MAX_IMAGES = 20;
  var THUMB_MAX = 120;
  var SELECTION_LABELS = ["keep", "maybe", "reject", "favorite"];

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
      trustLabel: critique.trustLabel || "On-device analysis",
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
      source: options.source || "photo-coach",
      title: options.title || null,
      images: [],
      groups: [],
      summary: null,
      analysisStartedAt: null,
      analysisFinishedAt: null,
      analysisDurationMs: null,
      // Future Photographer Profile / Importer hooks
      profileLink: null,
      importerHandoffId: options.importerHandoffId || null,
      communityMatchReady: false
    };
  }

  function createImageRecord(file) {
    return {
      id: id("img"),
      fileName: file && file.name ? file.name : "photo.jpg",
      fileSize: file && file.size != null ? file.size : null,
      fileFingerprint: file
        ? [file.name || "", file.size != null ? file.size : "", file.lastModified != null ? file.lastModified : ""].join("::")
        : null,
      status: "pending",
      error: null,
      analyzedAt: null,
      thumbnail: null,
      portfolioSessionId: null,
      analysis: null,
      critique: null,
      exif: null,
      /** Private organizational label: keep | maybe | reject | favorite | null */
      selectionLabel: null,
      groupId: null
    };
  }

  function normalizeSelectionLabel(label) {
    if (!label) return null;
    var v = String(label).toLowerCase();
    return SELECTION_LABELS.indexOf(v) >= 0 ? v : null;
  }

  function setImageSelection(shoot, imageId, label) {
    if (!shoot || !shoot.images) return false;
    var next = normalizeSelectionLabel(label);
    var found = false;
    shoot.images.forEach(function (img) {
      if (img.id === imageId) {
        img.selectionLabel = next;
        found = true;
      }
    });
    if (found) shoot.updatedAt = new Date().toISOString();
    return found;
  }

  function breakdownScore(img, categoryNeedle) {
    var rows = (img.analysis && img.analysis.scoreBreakdown) || [];
    var needle = String(categoryNeedle || "").toLowerCase();
    for (var i = 0; i < rows.length; i++) {
      var cat = String(rows[i].category || "").toLowerCase();
      if (cat.indexOf(needle) >= 0 && rows[i].score != null) return rows[i].score;
    }
    return null;
  }

  function hasStrength(img, re) {
    return ((img.analysis && img.analysis.strengths) || []).some(function (s) {
      return re.test(String(s.title || "") + " " + String(s.detail || s.why || ""));
    });
  }

  function genreLabel(img) {
    var g = img.analysis && img.analysis.genre;
    if (!g || g.uncertain || !g.label) return null;
    return g.label;
  }

  function pickBest(done, scoreFn, reasonFn) {
    var best = null;
    var bestScore = -1;
    done.forEach(function (img) {
      var sc = scoreFn(img);
      if (sc == null || sc < 0) return;
      if (sc > bestScore) {
        bestScore = sc;
        best = img;
      }
    });
    if (!best || bestScore < 55) return null;
    return {
      imageId: best.id,
      fileName: best.fileName,
      thumbnail: best.thumbnail,
      score: best.analysis && best.analysis.overallScore,
      letter: best.analysis && best.analysis.overallGrade && best.analysis.overallGrade.letter,
      why: reasonFn(best, bestScore)
    };
  }

  function buildBestOfSession(done) {
    var categories = [];
    function push(id, title, pick) {
      if (!pick) return;
      categories.push({ id: id, title: title, pick: pick });
    }

    push("composition", "Best Composition", pickBest(done, function (img) {
      return breakdownScore(img, "composition");
    }, function (img, sc) {
      return "Strongest composition read in this session (" + Math.round(sc) + ").";
    }));

    push("storytelling", "Best Storytelling", pickBest(done, function (img) {
      var base = breakdownScore(img, "story") != null
        ? breakdownScore(img, "story")
        : breakdownScore(img, "artistic");
      if (base == null) base = (img.analysis && img.analysis.overallScore) || 0;
      if (hasStrength(img, /story|moment|gesture|narrative|emotion/i)) base += 6;
      return base;
    }, function () {
      return "A frame that appears to carry a clearer sense of moment or story.";
    }));

    push("wildlife", "Best Wildlife", pickBest(done.filter(function (img) {
      var g = (genreLabel(img) || "").toLowerCase();
      return /wildlife|bird|animal|mammal/.test(g) || hasStrength(img, /wildlife|subject isolation|animal/i);
    }), function (img) {
      return img.analysis.overallScore;
    }, function () {
      return "Strongest wildlife-oriented frame among those the session identified.";
    }));

    push("landscape", "Best Landscape", pickBest(done.filter(function (img) {
      var g = (genreLabel(img) || "").toLowerCase();
      return /landscape|scenic|vista/.test(g) || hasStrength(img, /landscape|depth|horizon/i);
    }), function (img) {
      return img.analysis.overallScore;
    }, function () {
      return "Strongest landscape-oriented frame in this set.";
    }));

    push("nature-detail", "Best Nature Detail", pickBest(done.filter(function (img) {
      var g = (genreLabel(img) || "").toLowerCase();
      return /macro|plant|fungi|detail|flora|close/.test(g) || hasStrength(img, /detail|texture|macro|pattern/i);
    }), function (img) {
      return breakdownScore(img, "detail") != null
        ? breakdownScore(img, "detail")
        : img.analysis.overallScore;
    }, function () {
      return "A closer look that reads as intentional nature detail.";
    }));

    push("color", "Best Color", pickBest(done, function (img) {
      var sat = img.analysis.styleSignals && img.analysis.styleSignals.saturation;
      var artistic = breakdownScore(img, "color");
      if (artistic == null) artistic = breakdownScore(img, "artistic");
      var base = artistic != null ? artistic : (img.analysis.overallScore || 0);
      if (sat != null) base += Math.min(8, sat * 12);
      return base;
    }, function () {
      return "Color and tone appear especially cohesive in this frame.";
    }));

    push("creative", "Most Creative", pickBest(done, function (img) {
      var base = breakdownScore(img, "creative");
      if (base == null) base = breakdownScore(img, "artistic");
      if (base == null) return hasStrength(img, /unusual|creative|abstract|experiment/i)
        ? (img.analysis.overallScore || 0) + 4
        : null;
      return base;
    }, function () {
      return "A more experimental or unexpected reading within the session.";
    }));

    var sorted = done.slice().sort(function (a, b) {
      return ((a.analysis && a.analysis.overallScore) || 0) - ((b.analysis && b.analysis.overallScore) || 0);
    });
    if (sorted.length >= 3) {
      var improved = sorted[sorted.length - 1];
      var early = sorted[0];
      if (((improved.analysis.overallScore || 0) - (early.analysis.overallScore || 0)) >= 8) {
        push("improved", "Most Improved", {
          imageId: improved.id,
          fileName: improved.fileName,
          thumbnail: improved.thumbnail,
          score: improved.analysis.overallScore,
          letter: improved.analysis.overallGrade && improved.analysis.overallGrade.letter,
          why: "Later frames in this ranking look stronger than the weaker end of the set — a gentle signal of warming up, not a score race."
        });
      }
    }

    push("interesting", "Most Interesting", pickBest(done, function (img) {
      var g = genreLabel(img);
      var rareBoost = g ? 2 : 0;
      return (img.analysis.overallScore || 0) + rareBoost + (hasStrength(img, /light|moment|isolation|pattern/i) ? 3 : 0);
    }, function () {
      return "Worth another look — curiosity over perfection.";
    }));

    // Deduplicate picks so one photo isn't every category when evidence is thin
    var used = Object.create(null);
    return categories.filter(function (cat) {
      if (!cat.pick || used[cat.pick.imageId]) return false;
      used[cat.pick.imageId] = true;
      return true;
    });
  }

  function buildSessionInsights(done, shootScore, techNotes) {
    var insights = [];
    var genreVotes = {};
    done.forEach(function (img) {
      var g = genreLabel(img);
      if (!g) return;
      genreVotes[g] = (genreVotes[g] || 0) + 1;
    });
    var genreRank = Object.keys(genreVotes).sort(function (a, b) {
      return genreVotes[b] - genreVotes[a];
    });
    if (genreRank.length && genreVotes[genreRank[0]] >= 2) {
      insights.push({
        id: "genre-focus",
        text: "You consistently photographed " + genreRank[0].toLowerCase() + " scenes in this session."
      });
    }

    (techNotes || []).forEach(function (n, idx) {
      if (/Exposure stays relatively consistent/i.test(n)) {
        insights.push({ id: "exposure-consistent", text: "Exposure appears more consistent across this session." });
      } else if (/White-balance|color temperature feels cohesive/i.test(n)) {
        insights.push({ id: "wb-cohesive", text: "Color temperature feels fairly cohesive from frame to frame." });
      } else if (/Sharpness is fairly steady/i.test(n)) {
        insights.push({ id: "sharp-steady", text: "Sharpness looks fairly steady across the set." });
      } else if (idx === 0 && insights.length < 4) {
        insights.push({ id: "tech-" + idx, text: n });
      }
    });

    var soft = 0;
    done.forEach(function (img) {
      var st = img.analysis.styleSignals || {};
      if (st.contrast != null && st.contrast < 42) soft++;
      if (st.brightness != null && st.brightness > 45 && st.brightness < 70 && st.contrast != null && st.contrast < 48) soft++;
    });
    if (soft >= Math.max(2, Math.ceil(done.length * 0.45))) {
      insights.push({
        id: "soft-light",
        text: "Many photographs appear to have been made in softer light."
      });
    }

    var compScores = done.map(function (img) { return breakdownScore(img, "composition"); }).filter(function (n) { return n != null; });
    if (compScores.length >= 3 && stddev(compScores) >= 12) {
      insights.push({
        id: "composition-experiment",
        text: "Composition scores vary notably — you may have experimented with framing more than usual in this set."
      });
    }

    if (shootScore && shootScore.keeperCount >= 2) {
      insights.push({
        id: "keepers",
        text: "Several frames look technically and compositionally solid enough to keep for a closer edit."
      });
    }

    // Cautious de-dupe by text
    var seen = Object.create(null);
    return insights.filter(function (row) {
      if (seen[row.text]) return false;
      seen[row.text] = true;
      return true;
    }).slice(0, 6);
  }

  function buildSessionStats(done) {
    var buckets = {
      landscape: 0,
      wildlife: 0,
      plants: 0,
      fungi: 0,
      water: 0,
      macro: 0,
      other: 0
    };
    var focals = [];
    var landscapeOrient = 0;
    var portraitOrient = 0;
    var hours = [];

    done.forEach(function (img) {
      var g = (genreLabel(img) || "").toLowerCase();
      var matched = false;
      if (/landscape|scenic/.test(g)) { buckets.landscape++; matched = true; }
      if (/wildlife|bird|animal/.test(g)) { buckets.wildlife++; matched = true; }
      if (/plant|flora|flower|leaf|forest|woodland/.test(g)) { buckets.plants++; matched = true; }
      if (/fungi|mushroom/.test(g)) { buckets.fungi++; matched = true; }
      if (/water|river|lake|cascade|ocean/.test(g)) { buckets.water++; matched = true; }
      if (/macro|detail|close/.test(g)) { buckets.macro++; matched = true; }
      if (!matched) buckets.other++;

      var st = img.analysis.styleSignals || {};
      if (st.orientation === "portrait") portraitOrient++;
      else landscapeOrient++;

      var fl = img.exif && img.exif.focalLengthMm;
      if (fl != null && isFinite(Number(fl))) focals.push(Number(fl));

      var raw = img.exif && (img.exif.dateTimeOriginal || img.exif.dateTime);
      if (raw) {
        var m = String(raw).match(/\s(\d{2}):/);
        if (m) hours.push(Number(m[1]));
      }
    });

    var n = done.length || 1;
    function pct(c) { return Math.round((c / n) * 100); }

    var timeOfDay = null;
    if (hours.length) {
      var avgH = hours.reduce(function (a, b) { return a + b; }, 0) / hours.length;
      if (avgH < 8) timeOfDay = "early morning";
      else if (avgH < 11) timeOfDay = "morning";
      else if (avgH < 15) timeOfDay = "midday";
      else if (avgH < 18) timeOfDay = "afternoon";
      else timeOfDay = "evening";
    }

    return {
      counts: buckets,
      percentages: {
        landscape: pct(buckets.landscape),
        wildlife: pct(buckets.wildlife),
        plants: pct(buckets.plants),
        fungi: pct(buckets.fungi),
        water: pct(buckets.water),
        macro: pct(buckets.macro),
        other: pct(buckets.other)
      },
      averageFocalLengthMm: focals.length
        ? Math.round(focals.reduce(function (a, b) { return a + b; }, 0) / focals.length)
        : null,
      orientation: {
        landscape: landscapeOrient,
        portrait: portraitOrient,
        landscapeRatio: Math.round((landscapeOrient / n) * 100)
      },
      timeOfDay: timeOfDay,
      sampleSize: done.length
    };
  }

  function buildEditingSuggestions(done) {
    var tally = {};
    function bump(id, title, detail) {
      if (!tally[id]) tally[id] = { id: id, title: title, detail: detail, count: 0, examples: [] };
      tally[id].count++;
    }

    done.forEach(function (img) {
      var st = img.analysis.styleSignals || {};
      var critique = img.critique || {};
      var edit = critique.editIntelligence || {};

      if (st.highlightClip != null && st.highlightClip > 0.08) {
        bump("highlights", "Recover highlights", "A few frames show bright areas that may benefit from a gentle highlight recovery.");
      }
      if (st.shadowClip != null && st.shadowClip > 0.1) {
        bump("shadows", "Open shadows", "Shadow areas look dense in places — a small lift may reveal quieter detail.");
      }
      if (st.brightness != null && st.brightness < 38) {
        bump("exposure-up", "Slight exposure adjustment", "Some frames read dark overall; a modest exposure lift may help.");
      } else if (st.brightness != null && st.brightness > 78) {
        bump("exposure-down", "Slight exposure adjustment", "Some frames read bright overall; a small exposure pull may help.");
      }
      if (critique.suggestedCrop && critique.suggestedCrop.reasoning) {
        bump("crop", "Crop recommendation", "Similar crop considerations appear more than once — check edges and subject placement together.");
      }
      if ((img.analysis.improvements || []).some(function (imp) {
        return /distract|clutter|background|clean/i.test(String(imp.issue || "") + " " + String(imp.category || ""));
      })) {
        bump("distractions", "Reduce distractions", "Background or edge clutter shows up in multiple frames.");
      }
      if ((img.analysis.improvements || []).some(function (imp) {
        return /white.?balance|color.?cast|temperature/i.test(String(imp.issue || ""));
      }) || (st.warmth != null && (st.warmth > 0.55 || st.warmth < 0.2))) {
        bump("wb", "Improve white balance", "Color temperature shifts between frames — a shared WB pass may unify the set.");
      }
      if (edit && edit.primaryMove && /impossible|cannot|raw only/i.test(String(edit.primaryMove))) {
        /* skip impossible */
      }
    });

    return Object.keys(tally)
      .map(function (k) { return tally[k]; })
      .filter(function (row) { return row.count >= 1; })
      .sort(function (a, b) { return b.count - a.count; })
      .slice(0, 6);
  }

  function collectGear(done) {
    var cameras = {};
    var lenses = {};
    done.forEach(function (img) {
      var ex = img.exif || {};
      var cam = [ex.make, ex.model].filter(Boolean).join(" ").trim();
      if (cam) cameras[cam] = (cameras[cam] || 0) + 1;
      var lens = ex.lensModel || ex.lens || null;
      if (lens) lenses[lens] = (lenses[lens] || 0) + 1;
      else if (ex.focalLengthMm != null) {
        var fl = Math.round(Number(ex.focalLengthMm)) + "mm";
        lenses[fl] = (lenses[fl] || 0) + 1;
      }
    });
    function topKey(map) {
      return Object.keys(map).sort(function (a, b) { return map[b] - map[a]; })[0] || null;
    }
    return { camera: topKey(cameras), lens: topKey(lenses) };
  }

  function sessionDateLabel(shoot, done) {
    var d = null;
    var i;
    for (i = 0; i < (done ? done.length : 0); i++) {
      var ex = done[i] && done[i].exif;
      if (!ex) continue;
      d = parseExifDate(ex.dateTimeOriginal || ex.dateTime);
      if (d) break;
    }
    if (d) {
      return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    }
    if (shoot && shoot.createdAt) {
      var c = new Date(shoot.createdAt);
      if (!isNaN(c.getTime())) {
        return c.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", year: "numeric" });
      }
    }
    return "This session";
  }

  function parseExifDate(raw) {
    if (!raw) return null;
    var s = String(raw).trim();
    // EXIF often: 2026:07:14 10:00:00
    if (/^\d{4}:\d{2}:\d{2}/.test(s)) {
      s = s.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
    }
    var d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  /**
   * Progression only when EXIF/timestamps support it — never invent a story.
   */
  function buildCaptureProgression(done) {
    var timed = done.map(function (img) {
      var t = parseExifDate(img.exif && (img.exif.dateTimeOriginal || img.exif.dateTime));
      return t ? { img: img, t: t, score: img.analysis.overallScore || 0 } : null;
    }).filter(Boolean).sort(function (a, b) { return a.t - b.t; });
    if (timed.length < 3) {
      return { available: false, note: "Not enough timestamped frames to describe progression." };
    }
    var half = Math.floor(timed.length / 2);
    var firstHalf = timed.slice(0, half);
    var secondHalf = timed.slice(timed.length - half);
    function mean(arr) {
      return arr.reduce(function (a, b) { return a + b.score; }, 0) / arr.length;
    }
    var m1 = mean(firstHalf);
    var m2 = mean(secondHalf);
    var delta = m2 - m1;
    if (Math.abs(delta) < 4) {
      return {
        available: true,
        note: "Quality stayed fairly steady across the timed frames — a consistent session."
      };
    }
    if (delta > 0) {
      return {
        available: true,
        note: "Later frames read a bit stronger than early ones — you may have settled into the subject."
      };
    }
    return {
      available: true,
      note: "Earlier frames read a bit stronger — the first responses to the place may be the keepers."
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
      var favA = a.selectionLabel === "favorite" ? 1000 : a.selectionLabel === "keep" ? 100 : 0;
      var favB = b.selectionLabel === "favorite" ? 1000 : b.selectionLabel === "keep" ? 100 : 0;
      var sa = (a.analysis.overallScore || 0) + favA;
      var sb = (b.analysis.overallScore || 0) + favB;
      return sb - sa;
    });
    var strongest = ranked.slice(0, Math.min(3, ranked.length)).map(function (img) {
      var primaryStrength = (img.analysis.strengths && img.analysis.strengths[0])
        ? img.analysis.strengths[0].title
        : (img.selectionLabel === "favorite" ? "Your favorite for this shoot" : "Strong overall read");
      return {
        imageId: img.id,
        fileName: img.fileName,
        score: img.analysis.overallScore,
        letter: img.analysis.overallGrade && img.analysis.overallGrade.letter,
        thumbnail: img.thumbnail,
        why: primaryStrength,
        selectionLabel: img.selectionLabel || null
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
      .filter(function (row) { return row.count >= 2; })
      .slice(0, 5)
      .map(function (row) {
        return {
          issue: row.key,
          count: row.count,
          examples: row.examples.map(function (e) { return e.fileName; }),
          category: row.examples[0] && row.examples[0].category
        };
      });

    var commonStrengths = countMap(strengthEntries, function (e) { return e.title; })
      .filter(function (row) { return row.count >= 2 || done.length === 1; })
      .slice(0, 5)
      .map(function (row) {
        return {
          title: row.key,
          count: row.count,
          examples: row.examples.map(function (e) { return e.fileName; })
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

    var groups = [];
    if (global.WaypointPhotoCoachGrouping && global.WaypointPhotoCoachGrouping.groupImages) {
      groups = global.WaypointPhotoCoachGrouping.groupImages(shoot.images);
      var byId = Object.create(null);
      done.forEach(function (img) { byId[img.id] = img; });
      groups.forEach(function (g) {
        (g.imageIds || []).forEach(function (iid) {
          if (byId[iid]) byId[iid].groupId = g.id;
        });
      });
      shoot.groups = groups;
    }

    var needsAnother = ranked.filter(function (img) {
      return (img.analysis.overallScore || 0) < 68 ||
        ((img.analysis.improvements || []).length >= 2);
    }).slice(0, 5).map(function (img) {
      var issue = (img.analysis.improvements && img.analysis.improvements[0])
        ? img.analysis.improvements[0].issue
        : "Worth another attempt with one clear change.";
      return {
        imageId: img.id,
        fileName: img.fileName,
        thumbnail: img.thumbnail,
        why: issue
      };
    });

    var interestingSubjects = dominantGenres.slice(0, 4).map(function (g) {
      return { label: g.label, count: g.count };
    });

    var favorite = done.filter(function (img) { return img.selectionLabel === "favorite"; })[0] || null;

    var gear = collectGear(done);
    var insights = buildSessionInsights(done, shootScore, techNotes);
    var stats = buildSessionStats(done);
    var bestOf = buildBestOfSession(done);
    var edits = buildEditingSuggestions(done);
    var durationMs = shoot.analysisDurationMs;
    if (durationMs == null && shoot.analysisStartedAt && shoot.analysisFinishedAt) {
      durationMs = Math.max(0, new Date(shoot.analysisFinishedAt) - new Date(shoot.analysisStartedAt));
    }

    var labelCounts = { keep: 0, maybe: 0, reject: 0, favorite: 0, unlabeled: 0 };
    (shoot.images || []).forEach(function (img) {
      if (img.selectionLabel && labelCounts[img.selectionLabel] != null) labelCounts[img.selectionLabel]++;
      else labelCounts.unset++;
    });

    return {
      schemaVersion: SCHEMA_VERSION,
      builtAt: new Date().toISOString(),
      sessionDateLabel: sessionDateLabel(shoot, done),
      imageCount: done.length,
      failedCount: (shoot.images || []).filter(function (i) { return i.status === "error"; }).length,
      skippedCount: (shoot.images || []).filter(function (i) { return i.status === "skipped"; }).length,
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
      sessionInsights: insights,
      sessionStats: stats,
      bestOfSession: bestOf,
      editingSuggestions: edits,
      imagesNeedingAnotherAttempt: needsAnother,
      interestingSubjects: interestingSubjects,
      favoriteImage: favorite
        ? {
            imageId: favorite.id,
            fileName: favorite.fileName,
            thumbnail: favorite.thumbnail,
            selectionLabel: favorite.selectionLabel || null
          }
        : null,
      gear: gear,
      analysisDurationMs: durationMs,
      labelCounts: labelCounts,
      userKeeperCount: (labelCounts.keep || 0) + (labelCounts.favorite || 0),
      memberPhotoIds: (shoot.images || []).map(function (img) { return img.id; }),
      timeRange: (function () {
        var times = done.map(function (img) {
          return parseExifDate(img.exif && (img.exif.dateTimeOriginal || img.exif.dateTime));
        }).filter(Boolean).sort(function (a, b) { return a - b; });
        if (times.length) return { start: times[0].toISOString(), end: times[times.length - 1].toISOString() };
        return {
          start: shoot.analysisStartedAt || shoot.createdAt || null,
          end: shoot.analysisFinishedAt || shoot.updatedAt || null
        };
      })(),
      progression: buildCaptureProgression(done),
      nextTimeTip: (nextFocus && nextFocus.practice) || (recurring[0] ? ("Watch for: " + recurring[0].issue) : "Take one quieter frame of the same subject before moving on."),
      outdoorContextSummary: shoot.outdoorContext
        ? { source: shoot.outdoorContext.source || "stored-context", available: true, note: "Outdoor context from a saved field snapshot — not invented from photographs." }
        : null,
      groupCount: groups.length,
      weatherPlaceholder: shoot.outdoorContext
        ? { status: "linked", note: "Outdoor context from a saved field snapshot — not invented from photographs." }
        : { status: "unavailable", note: "No outdoor context was saved with this shoot — nothing invented." },
      locations: (function () {
        var locs = [];
        done.forEach(function (img) {
          var ex = img.exif || {};
          if (ex.gpsLatitude != null && ex.gpsLongitude != null) {
            locs.push({
              lat: ex.gpsLatitude,
              lon: ex.gpsLongitude,
              imageId: img.id,
              source: "exif"
            });
          }
        });
        return locs;
      })(),
      profileHints: {
        dominantGenres: dominantGenres,
        styleTendencies: [
          brightness.length ? { key: "brightness", mean: round(brightness.reduce(function (a, b) { return a + b; }, 0) / brightness.length) } : null,
          contrast.length ? { key: "contrast", mean: round(contrast.reduce(function (a, b) { return a + b; }, 0) / contrast.length) } : null,
          warmth.length ? { key: "warmth", mean: Math.round((warmth.reduce(function (a, b) { return a + b; }, 0) / warmth.length) * 100) / 100 } : null
        ].filter(Boolean),
        skillSignals: commonStrengths.slice(0, 3).map(function (s) { return s.title; }),
        growthSignals: recurring.slice(0, 3).map(function (r) { return r.issue; }),
        sessionStats: stats
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
            : img.status === "skipped"
              ? "–"
              : String(idx + 1);
      var sel = img.selectionLabel
        ? '<span class="pc-filmstrip__sel pc-filmstrip__sel--' + escapeHtml(img.selectionLabel) + '" title="' +
          escapeHtml(img.selectionLabel) + '">' + escapeHtml(img.selectionLabel.charAt(0).toUpperCase()) + "</span>"
        : "";
      var thumb = img.thumbnail
        ? '<img src="' + escapeHtml(img.thumbnail) + '" alt="" class="pc-filmstrip__thumb">'
        : '<span class="pc-filmstrip__placeholder" aria-hidden="true"></span>';
      return '<button type="button" class="pc-filmstrip__item' +
        (isActive ? " is-active" : "") +
        (img.status === "done" ? " is-done" : "") +
        (img.status === "analyzing" ? " is-analyzing" : "") +
        (img.status === "error" ? " is-error" : "") +
        (img.selectionLabel ? " is-labeled is-labeled--" + escapeHtml(img.selectionLabel) : "") +
        '" data-image-id="' + escapeHtml(img.id) + '"' +
        ' aria-label="' + escapeHtml(img.fileName) + " — " + escapeHtml(img.status) +
        (img.selectionLabel ? " — " + escapeHtml(img.selectionLabel) : "") + '"' +
        (img.status !== "done" && img.status !== "error" ? " disabled" : "") + ">" +
        thumb + sel +
        '<span class="pc-filmstrip__grade">' + escapeHtml(label) + "</span>" +
      "</button>";
    }).join("");

    return '<div class="pc-filmstrip" role="list" aria-label="Shoot photos">' +
      '<div class="pc-filmstrip__meta">' +
        "<strong>Today’s shoot</strong> · " + done + " / " + total + " analyzed" +
      "</div>" +
      '<div class="pc-filmstrip__track">' + items + "</div>" +
    "</div>";
  }

  function renderGroupsHtml(shoot) {
    var groups = shoot && shoot.groups ? shoot.groups : [];
    if (!groups.length) return "";
    var byId = Object.create(null);
    (shoot.images || []).forEach(function (img) { byId[img.id] = img; });
    return '<div class="pc-shoot-groups" aria-label="Similar photograph groups">' +
      '<h3 class="pc-shoot-summary__h">Similar frames</h3>' +
      '<p class="pc-shoot-summary__lede">Grouped for easier review. Nothing is deleted.</p>' +
      groups.map(function (g) {
        var open = !g.collapsed;
        var thumbs = (g.imageIds || []).map(function (iid) {
          var img = byId[iid];
          if (!img) return "";
          return '<button type="button" class="pc-group__thumb' +
            (img.selectionLabel === "reject" ? " is-reject" : "") +
            '" data-image-id="' + escapeHtml(iid) + '" aria-label="Open ' + escapeHtml(img.fileName) + '">' +
            (img.thumbnail
              ? '<img src="' + escapeHtml(img.thumbnail) + '" alt="">'
              : '<span></span>') +
            "</button>";
        }).join("");
        return '<details class="pc-group" data-group-id="' + escapeHtml(g.id) + '"' +
          (open ? " open" : "") + ">" +
          "<summary>" + escapeHtml(g.label) + "</summary>" +
          '<div class="pc-group__track">' + thumbs + "</div>" +
          "</details>";
      }).join("") +
    "</div>";
  }

  function renderSelectionControlsHtml(imageId, currentLabel) {
    var labels = [
      { id: "keep", title: "Keep" },
      { id: "maybe", title: "Maybe" },
      { id: "reject", title: "Reject" },
      { id: "favorite", title: "Favorite" }
    ];
    return '<div class="pc-selection" role="group" aria-label="Private photo labels">' +
      '<p class="pc-selection__title">Private labels</p>' +
      '<div class="pc-selection__row">' +
      labels.map(function (lab) {
        var pressed = currentLabel === lab.id;
        return '<button type="button" class="pc-selection__btn' + (pressed ? " is-active" : "") +
          '" data-selection="' + lab.id + '" data-image-id="' + escapeHtml(imageId) +
          '" aria-pressed="' + pressed + '">' + escapeHtml(lab.title) + "</button>";
      }).join("") +
      (currentLabel
        ? '<button type="button" class="pc-selection__btn pc-selection__btn--clear" data-selection="" data-image-id="' +
          escapeHtml(imageId) + '">Clear</button>'
        : "") +
      "</div>" +
      '<p class="pc-selection__note">Private to this browser. No scores or public sharing.</p>' +
    "</div>";
  }

  function formatDuration(ms) {
    if (ms == null || !isFinite(ms)) return null;
    var sec = Math.round(ms / 1000);
    if (sec < 60) return sec + "s";
    var min = Math.floor(sec / 60);
    var rem = sec % 60;
    return min + "m " + rem + "s";
  }

  function renderSummaryHtml(summary, shoot) {
    if (!summary) return "";
    var duration = formatDuration(summary.analysisDurationMs);
    var gearBits = [];
    if (summary.gear && summary.gear.camera) gearBits.push(summary.gear.camera);
    if (summary.gear && summary.gear.lens) gearBits.push(summary.gear.lens);

    var meta =
      '<ul class="pc-shoot-summary__meta">' +
        "<li><strong>When</strong> " + escapeHtml(summary.sessionDateLabel || "This session") + "</li>" +
        "<li><strong>Photographs</strong> " + escapeHtml(String(summary.imageCount || 0)) +
          (summary.failedCount ? " · " + summary.failedCount + " could not be analyzed" : "") + "</li>" +
        (gearBits.length ? "<li><strong>Gear</strong> " + escapeHtml(gearBits.join(" · ")) + "</li>" : "") +
        (duration ? "<li><strong>Analysis time</strong> " + escapeHtml(duration) + "</li>" : "") +
        (summary.locations && summary.locations.length
          ? "<li><strong>Locations</strong> " + summary.locations.length + " GPS-tagged frame" +
            (summary.locations.length === 1 ? "" : "s") + "</li>"
          : "<li><strong>Locations</strong> Not available in this set</li>") +
        "<li><strong>Weather</strong> " + escapeHtml((summary.weatherPlaceholder && summary.weatherPlaceholder.note) || "Weather context links when outdoor intelligence is available for the shoot.") + "</li>" +
      "</ul>";

    var insights = (summary.sessionInsights || []).map(function (row) {
      return "<li>" + escapeHtml(row.text) + "</li>";
    }).join("") || "<li>Not enough repeated patterns to speak confidently yet.</li>";

    var strongest = (summary.strongestImages || []).map(function (img) {
      return '<li class="pc-shoot-summary__strong">' +
        (img.thumbnail
          ? '<img src="' + escapeHtml(img.thumbnail) + '" alt="" class="pc-shoot-summary__thumb">'
          : "") +
        '<div><strong>' + escapeHtml(img.fileName) + "</strong>" +
        '<p class="pc-shoot-summary__why">' + escapeHtml(img.why) + "</p>" +
        '<button type="button" class="pc-shoot-summary__open" data-image-id="' + escapeHtml(img.imageId) +
        '">View photograph</button></div></li>';
    }).join("");

    var bestOf = (summary.bestOfSession || []).map(function (cat) {
      var p = cat.pick || {};
      return '<li class="pc-bestof__item">' +
        (p.thumbnail ? '<img src="' + escapeHtml(p.thumbnail) + '" alt="" class="pc-shoot-summary__thumb">' : "") +
        "<div><strong>" + escapeHtml(cat.title) + "</strong>" +
        "<p>" + escapeHtml(p.fileName || "") + "</p>" +
        '<p class="pc-shoot-summary__why">' + escapeHtml(p.why || "") + "</p>" +
        (p.imageId
          ? '<button type="button" class="pc-shoot-summary__open" data-image-id="' + escapeHtml(p.imageId) +
            '">View photograph</button>'
          : "") +
        "</div></li>";
    }).join("") || "<li>Not enough variety to suggest multiple categories yet.</li>";

    var edits = (summary.editingSuggestions || []).map(function (e) {
      return "<li><strong>" + escapeHtml(e.title) + "</strong> · seen in " + e.count +
        " frame" + (e.count === 1 ? "" : "s") +
        "<p class=\"pc-shoot-summary__why\">" + escapeHtml(e.detail) + "</p></li>";
    }).join("") || "<li>No shared edit theme stood out yet.</li>";

    var retry = (summary.imagesNeedingAnotherAttempt || []).map(function (img) {
      return "<li>" + escapeHtml(img.fileName) + " — " + escapeHtml(img.why) + "</li>";
    }).join("") || "<li>Nothing urgently asks for another attempt.</li>";

    var stats = summary.sessionStats || {};
    var pct = stats.percentages || {};
    var statsHtml =
      '<ul class="pc-session-stats" aria-label="Session subject mix">' +
        "<li>Landscape " + (pct.landscape || 0) + "%</li>" +
        "<li>Wildlife " + (pct.wildlife || 0) + "%</li>" +
        "<li>Plants " + (pct.plants || 0) + "%</li>" +
        "<li>Fungi " + (pct.fungi || 0) + "%</li>" +
        "<li>Water " + (pct.water || 0) + "%</li>" +
        "<li>Macro " + (pct.macro || 0) + "%</li>" +
        (stats.averageFocalLengthMm != null
          ? "<li>Avg focal length ~" + stats.averageFocalLengthMm + "mm</li>"
          : "") +
        (stats.orientation
          ? "<li>Orientation " + stats.orientation.landscapeRatio + "% horizontal</li>"
          : "") +
        (stats.timeOfDay ? "<li>Time of day · " + escapeHtml(stats.timeOfDay) + "</li>" : "") +
      "</ul>";

    var subjects = (summary.interestingSubjects || []).map(function (s) {
      return "<li>" + escapeHtml(s.label) + " · " + s.count + "</li>";
    }).join("") || "<li>Subjects stayed lightly labeled — that’s okay.</li>";

    var outing = summary.personalizedOuting || null;
    var outingHtml = "";
    if (outing) {
      outingHtml =
        '<div class="pc-shoot-summary__outing">' +
          '<h3 class="pc-shoot-summary__h">Next outing</h3>' +
          "<p>" + escapeHtml(outing.summary || "") + "</p>" +
          "<ul>" +
            "<li>" + escapeHtml(outing.continueStrength || "") + "</li>" +
            "<li>" + escapeHtml(outing.practiceSkill || "") + "</li>" +
            "<li>" + escapeHtml(outing.optionalExperiment || "") + "</li>" +
            "<li>" + escapeHtml(outing.subjectOrCondition || "") + "</li>" +
          "</ul>" +
        "</div>";
    }

    var focus = summary.nextOutingFocus || {};
    var favoriteHtml = "";
    if (summary.favoriteImage) {
      favoriteHtml =
        '<div class="pc-shoot-summary__favorite">' +
          "<h3 class=\"pc-shoot-summary__h\">Favorite</h3>" +
          (summary.favoriteImage.thumbnail
            ? '<img src="' + escapeHtml(summary.favoriteImage.thumbnail) + '" alt="" class="pc-shoot-summary__thumb">'
            : "") +
          "<p>" + escapeHtml(summary.favoriteImage.fileName) +
          " · marked by you</p>" +
          '<button type="button" class="pc-shoot-summary__open" data-image-id="' +
            escapeHtml(summary.favoriteImage.imageId) + '">View photograph</button>' +
        "</div>";
    }

    return '<section class="pc-shoot-summary coach-card" aria-labelledby="pc-shoot-summary-title">' +
      '<div class="pc-shoot-summary__head">' +
        '<h2 class="coach-card__title" id="pc-shoot-summary-title">How did today’s shoot go?</h2>' +
        '<span class="coach-trust coach-trust--live">On-device · private</span>' +
      "</div>" +
      '<p class="pc-shoot-summary__lede">A quiet mentor read of the outing — not a leaderboard.</p>' +
      meta +
      '<p class="pc-shoot-summary__keepers">Your labels: ' +
        escapeHtml(String((summary.labelCounts && summary.labelCounts.keep) || 0)) + ' Keep · ' +
        escapeHtml(String((summary.labelCounts && summary.labelCounts.favorite) || 0)) + ' Favorite · ' +
        escapeHtml(String((summary.labelCounts && summary.labelCounts.maybe) || 0)) + ' Maybe · ' +
        escapeHtml(String((summary.labelCounts && summary.labelCounts.reject) || 0)) + ' Reject' +
        (summary.userKeeperCount != null ? ' · ' + escapeHtml(String(summary.userKeeperCount)) + ' keepers' : '') +
      '</p>' +
      favoriteHtml +
      (summary.progression && summary.progression.note
        ? '<div class="pc-shoot-summary__block"><h3 class="pc-shoot-summary__h">Progression</h3><p>' +
          escapeHtml(summary.progression.note) + '</p></div>'
        : '') +
      '<div class="pc-shoot-summary__block">' +
        '<h3 class="pc-shoot-summary__h">Session observations</h3>' +
        "<ul>" + insights + "</ul>" +
      "</div>" +
      '<div class="pc-shoot-summary__grid">' +
        '<div><h3 class="pc-shoot-summary__h">Strongest compositions</h3><ul class="pc-shoot-summary__strong-list">' +
          strongest + "</ul></div>" +
        "<div><h3 class=\"pc-shoot-summary__h\">Interesting subjects</h3><ul>" + subjects + "</ul></div>" +
        "<div><h3 class=\"pc-shoot-summary__h\">Worth another attempt</h3><ul>" + retry + "</ul></div>" +
        '<div><h3 class="pc-shoot-summary__h">Technical notes</h3><ul>' +
          (summary.technicalConsistency.notes || []).map(function (n) {
            return "<li>" + escapeHtml(n) + "</li>";
          }).join("") +
        "</ul></div>" +
      "</div>" +
      '<div class="pc-shoot-summary__block">' +
        '<h3 class="pc-shoot-summary__h">Best of session</h3>' +
        '<p class="pc-shoot-summary__lede">Several kinds of success — not one winner.</p>' +
        '<ul class="pc-bestof">' + bestOf + "</ul>" +
      "</div>" +
      '<div class="pc-shoot-summary__block">' +
        '<h3 class="pc-shoot-summary__h">Editing suggestions for the set</h3>' +
        "<ul>" + edits + "</ul>" +
      "</div>" +
      '<div class="pc-shoot-summary__block">' +
        '<h3 class="pc-shoot-summary__h">Session mix</h3>' +
        statsHtml +
      "</div>" +
      renderGroupsHtml(shoot) +
      outingHtml +
      '<div class="pc-shoot-summary__focus">' +
        "<h3 class=\"pc-shoot-summary__h\">Next time</h3>" +
        "<p>" + escapeHtml(summary.nextTimeTip || focus.practice || "") + "</p>" +
        (focus.title ? "<p class=\"coach-muted\"><strong>" + escapeHtml(focus.title) + "</strong> — " + escapeHtml(focus.why || "") + "</p>" : "") +
      "</div>" +
      '<p class="coach-muted">Stored privately on this device. Photos are not uploaded.</p>' +
    "</section>";
  }

  function renderProgressHtml(state) {
    state = state || {};
    var current = state.index != null ? state.index + (state.status === "complete" ? 0 : 1) : 1;
    if (state.status === "complete") current = state.total;
    var total = state.total || 1;
    var fileName = state.currentFileName || "";
    var remaining = state.remaining != null ? state.remaining : Math.max(0, total - (state.index || 0));
    var eta = null;
    if (global.WaypointPhotoCoachQueue && global.WaypointPhotoCoachQueue.formatEta) {
      eta = global.WaypointPhotoCoachQueue.formatEta(state.estimatedMsRemaining);
    }
    var pct = clamp(round(((state.index || 0) / Math.max(total, 1)) * 100), 0, 100);
    if (state.status === "complete") pct = 100;

    return '<div class="pc-batch-progress" role="status" aria-live="polite">' +
      '<p class="pc-batch-progress__title">' +
        (state.status === "cancelling" || state.status === "cancelled"
          ? "Stopping analysis…"
          : "Reviewing today’s shoot…") +
      "</p>" +
      '<p class="coach-muted">Photograph ' + Math.min(current, total) + " of " + total +
      (fileName ? " · " + escapeHtml(fileName) : "") +
      (remaining > 0 ? " · " + remaining + " remaining" : "") +
      (eta ? " · " + escapeHtml(eta) + " left" : "") +
      "</p>" +
      '<div class="pc-batch-progress__bar" aria-hidden="true">' +
        '<div class="pc-batch-progress__fill" style="width:' + pct + '%"></div>' +
      "</div>" +
      (state.status === "running" || state.status === "cancelling"
        ? '<button type="button" class="wds-btn wds-btn--secondary pc-batch-progress__cancel" id="pc-queue-cancel">Cancel remaining</button>'
        : "") +
    "</div>";
  }

  global.WaypointPhotoCoachShoot = {
    SCHEMA_VERSION: SCHEMA_VERSION,
    MAX_IMAGES: MAX_IMAGES,
    MAX_SHOOTS: MAX_SHOOTS,
    SELECTION_LABELS: SELECTION_LABELS,
    createShoot: createShoot,
    createImageRecord: createImageRecord,
    toStructuredAnalysis: toStructuredAnalysis,
    buildSummary: buildSummary,
    computeShootScore: computeShootScore,
    buildBestOfSession: buildBestOfSession,
    buildSessionInsights: buildSessionInsights,
    buildSessionStats: buildSessionStats,
    buildEditingSuggestions: buildEditingSuggestions,
    setImageSelection: setImageSelection,
    normalizeSelectionLabel: normalizeSelectionLabel,
    makeThumbnail: makeThumbnail,
    persistShoot: persistShoot,
    saveShoot: persistShoot,
    getShoot: getShoot,
    listShoots: listShoots,
    deleteShoot: deleteShoot,
    renderFilmstripHtml: renderFilmstripHtml,
    renderSummaryHtml: renderSummaryHtml,
    renderProgressHtml: renderProgressHtml,
    renderSelectionControlsHtml: renderSelectionControlsHtml,
    renderGroupsHtml: renderGroupsHtml
  };
})(window);
