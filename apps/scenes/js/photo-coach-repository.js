/**
 * Waypoint Scenes / Photo Coach — repositories for growth data.
 *
 * Quiet persistence behind the existing UI.
 * Storage keys are versioned; older shoot/session stores remain valid.
 * Profile calculation lives in WaypointPhotoCoachProfileEngine.
 */
(function (global) {
  "use strict";

  var PHOTO_KEY = "waypoint-photo-records-v1";
  var SHOOT_KEY = "waypoint-photo-shoots-entity-v1";
  var PROFILE_KEY = "waypoint-photographer-profile-v1";
  var COACHING_KEY = "waypoint-photo-coaching-memory-v1";
  var COACHING_PREFS_KEY = "waypoint-photo-coaching-prefs-v1";
  var MAX_PHOTOS = 200;
  var MAX_SHOOTS = 40;
  var MAX_COACHING = 120;

  var Models = null;

  function models() {
    if (!Models) Models = global.WaypointPhotoCoachModels;
    return Models;
  }

  function engine() {
    return global.WaypointPhotoCoachProfileEngine || null;
  }

  function personalized() {
    return global.WaypointPhotoCoachPersonalized || null;
  }

  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      try {
        if (Array.isArray(value) && value.length > 10) {
          localStorage.setItem(key, JSON.stringify(value.slice(0, Math.floor(value.length / 2))));
          return true;
        }
      } catch (e2) { /* ignore */ }
      return false;
    }
  }

  function avg(nums) {
    var list = (nums || []).filter(function (n) { return n != null && !isNaN(n); });
    if (!list.length) return null;
    return Math.round(list.reduce(function (a, b) { return a + b; }, 0) / list.length);
  }

  function scoreFromBreakdown(breakdown, names) {
    var rows = breakdown || [];
    var hit = rows.filter(function (r) {
      return names.indexOf(r.category) >= 0 && r.score != null;
    });
    return avg(hit.map(function (r) { return r.score; }));
  }

  function lightingFrom(critique, outdoor) {
    var signals = (critique && critique.signals) || {};
    var parts = [];
    if (outdoor && outdoor.daylight && outdoor.daylight.goldenHour) parts.push("golden-hour");
    if (outdoor && outdoor.daylight && outdoor.daylight.blueHour) parts.push("blue-hour");
    if (signals.warmth > 0.2) parts.push("warm");
    if (signals.coolness > 0.18) parts.push("cool");
    if (signals.brightness < 90) parts.push("low-key");
    if (signals.brightness > 170) parts.push("high-key");
    if (signals.contrast < 30) parts.push("soft / flat");
    if (signals.contrast > 55) parts.push("directional / contrasty");
    if (outdoor && outdoor.weather && outdoor.weather.conditions) {
      parts.push(String(outdoor.weather.conditions).toLowerCase());
    }
    return parts.length ? parts.join(", ") : "unspecified";
  }

  function backgroundComplexityFrom(signals) {
    signals = signals || {};
    var edge = signals.edgeDensity != null ? signals.edgeDensity : 0;
    var spread = signals.tonalSpread != null ? signals.tonalSpread : 0;
    var score = edge * 60 + spread * 40;
    if (score < 0.12) return "simple";
    if (score < 0.22) return "moderate";
    return "complex";
  }

  function subjectIsolationFrom(signals) {
    signals = signals || {};
    var v = signals.subjectEmphasis != null ? signals.subjectEmphasis : 0;
    if (v >= 0.12) return "strong";
    if (v >= 0.06) return "moderate";
    return "weak";
  }

  function exposureQualityFrom(signals) {
    signals = signals || {};
    var hi = signals.highlightClip != null ? signals.highlightClip : 0;
    var sh = signals.shadowClip != null ? signals.shadowClip : 0;
    if (hi > 0.06) return "highlight-risk";
    if (sh > 0.3) return "shadow-heavy";
    if (signals.brightness < 85) return "underexposed";
    if (signals.brightness > 185) return "overexposed";
    return "balanced";
  }

  function colorCharacteristicsFrom(signals) {
    signals = signals || {};
    var parts = [];
    if (signals.dominantColors && signals.dominantColors.length) {
      parts.push(signals.dominantColors.join(", "));
    }
    if (signals.dominantWarm) parts.push("warm bias");
    else if (signals.coolness > 0.15) parts.push("cool bias");
    if (signals.saturation != null) {
      if (signals.saturation > 0.4) parts.push("high saturation");
      else if (signals.saturation < 0.12) parts.push("muted");
      else parts.push("natural saturation");
    }
    return parts.length ? parts.join(" · ") : null;
  }

  function dominantMoodFrom(critique, outdoor) {
    var genre = critique && critique.genre;
    if (genre && !genre.uncertain && genre.label) return genre.label.toLowerCase() + " mood";
    var signals = (critique && critique.signals) || {};
    if (outdoor && outdoor.daylight && outdoor.daylight.goldenHour) return "warm contemplative";
    if (signals.coolness > 0.18) return "cool atmospheric";
    if (signals.contrast > 50) return "dramatic";
    if (signals.contrast < 30) return "quiet / soft";
    return "observational";
  }

  function confidenceFrom(critique) {
    var g = critique && critique.overallGrade;
    if (g && typeof g.confidence === "string") return g.confidence;
    if (critique && critique.genre && critique.genre.confidence != null) {
      return Math.round(critique.genre.confidence * 100);
    }
    return "moderate-demo";
  }

  /**
   * Map a live critique (+ context) into a PhotoRecord.
   */
  function photoRecordFromCritique(critique, meta) {
    meta = meta || {};
    var M = models();
    if (!M) return null;
    critique = critique || {};
    var signals = critique.signals || {};
    var breakdown = critique.scoreBreakdown || [];
    var exif = meta.exif || {};
    var outdoor = meta.outdoorContext || critique.outdoorContext || null;
    var loc = outdoor && outdoor.location ? outdoor.location : {};

    var compositionScore = scoreFromBreakdown(breakdown, [
      "Composition", "Subject impact"
    ]);
    var technicalScore = scoreFromBreakdown(breakdown, [
      "Sharpness", "Exposure"
    ]);
    var artisticScore = scoreFromBreakdown(breakdown, [
      "Story / emotion", "Color", "Light"
    ]);
    var overall = critique.overallScore != null
      ? critique.overallScore
      : (critique.overallGrade && critique.overallGrade.score);

    var subjectCategories = [];
    if (critique.genre && critique.genre.label && !critique.genre.uncertain) {
      subjectCategories.push(critique.genre.label);
    }
    (critique.nicheHints || []).forEach(function (n) {
      if (n && subjectCategories.indexOf(n) < 0) subjectCategories.push(n);
    });

    var coaching = [];
    (critique.improvements || []).forEach(function (imp) {
      coaching.push({
        priority: imp.priority || "secondary",
        issue: imp.issue || null,
        whatToDo: imp.whatToDo || null,
        whyItMatters: imp.whyItMatters || null,
        expectedImprovement: imp.expectedImprovement || null
      });
    });
    if (critique.learningConcept) {
      coaching.push({
        priority: "practice",
        issue: critique.learningConcept.title || null,
        whatToDo: critique.learningConcept.practice || null,
        whyItMatters: critique.learningConcept.lesson || null,
        expectedImprovement: null
      });
    }

    var captureDateTime = null;
    if (exif.dateTime) captureDateTime = exif.dateTime;
    else if (exif.DateTimeOriginal) captureDateTime = exif.DateTimeOriginal;

    return M.createPhotoRecord({
      uuid: meta.uuid || M.uuid(),
      originalFilename: meta.originalFilename || critique.imageName || null,
      captureDateTime: captureDateTime,
      camera: {
        make: exif.make || null,
        model: exif.model || null,
        lens: exif.lens || exif.lensModel || null,
        focalLengthMm: exif.focalLengthMm != null ? exif.focalLengthMm : null,
        fNumber: exif.fNumber != null ? exif.fNumber : null,
        iso: exif.iso != null ? exif.iso : null,
        exposureTimeSec: exif.exposureTimeSec != null ? exif.exposureTimeSec : null
      },
      location: {
        label: [loc.city, loc.county, loc.state].filter(Boolean).join(", ") || null,
        city: loc.city || null,
        county: loc.county || null,
        state: loc.state || null,
        country: loc.country || null,
        lat: loc.lat != null ? loc.lat : null,
        lng: loc.lng != null ? loc.lng : null,
        source: outdoor ? "dashboard-outdoor-context" : null
      },
      subjectCategories: subjectCategories,
      compositionScore: compositionScore,
      technicalScore: technicalScore,
      artisticScore: artisticScore,
      overallScore: overall != null ? overall : null,
      confidence: confidenceFrom(critique),
      lightingConditions: lightingFrom(critique, outdoor),
      backgroundComplexity: backgroundComplexityFrom(signals),
      subjectIsolation: subjectIsolationFrom(signals),
      sharpness: signals.blurEstimate != null ? Math.round(signals.blurEstimate) : null,
      exposureQuality: exposureQualityFrom(signals),
      colorCharacteristics: colorCharacteristicsFrom(signals),
      dominantMood: dominantMoodFrom(critique, outdoor),
      aiCritique: {
        engine: "demo-analysis",
        trustLabel: critique.trustLabel || "On-device analysis",
        narrative: critique.narrativeSummary || null,
        strengths: (critique.strengths || []).map(function (s) {
          return { title: s.title, whyItWorks: s.whyItWorks };
        }),
        improvements: (critique.improvements || []).map(function (i) {
          return { issue: i.issue, whyItMatters: i.whyItMatters };
        }),
        letterGrade: critique.overallGrade && critique.overallGrade.letter
          ? critique.overallGrade.letter
          : null
      },
      aiCoachingSuggestions: coaching,
      shootId: meta.shootId || null,
      analyzedAt: critique.analyzedAt || new Date().toISOString(),
      portfolioSessionId: meta.portfolioSessionId || null,
      thumbnail: meta.thumbnail || null,
      legacyImageId: meta.legacyImageId || null,
      engineVersion: critique.version || null,
      selectionLabel: meta.selectionLabel || null
    });
  }

  function shootEntityFromSession(sessionShoot, photoRecords) {
    var M = models();
    if (!M) return null;
    sessionShoot = sessionShoot || {};
    photoRecords = photoRecords || [];
    var summary = sessionShoot.summary || {};
    var photos = photoRecords;

    function avgField(field) {
      return avg(photos.map(function (p) { return p[field]; }));
    }

    var date = sessionShoot.createdAt
      ? String(sessionShoot.createdAt).slice(0, 10)
      : (summary.builtAt ? String(summary.builtAt).slice(0, 10) : null);

    return M.createShoot({
      id: sessionShoot.id,
      date: date,
      createdAt: sessionShoot.createdAt || null,
      updatedAt: sessionShoot.updatedAt || new Date().toISOString(),
      status: sessionShoot.status || "complete",
      imageCount: photos.length || (summary.imageCount != null ? summary.imageCount : 0),
      photoIds: photos.map(function (p) { return p.uuid; }),
      averageScores: {
        overall: avgField("overallScore"),
        composition: avgField("compositionScore"),
        technical: avgField("technicalScore"),
        artistic: avgField("artisticScore")
      },
      bestImages: (summary.strongestImages || []).map(function (img) {
        return {
          imageId: img.imageId || null,
          fileName: img.fileName || null,
          score: img.score != null ? img.score : null,
          letter: img.letter || null,
          why: img.why || null,
          photoUuid: null
        };
      }),
      commonStrengths: (summary.commonStrengths || []).map(function (s) {
        return { title: s.title, count: s.count };
      }),
      commonImprovementThemes: (summary.recurringImprovements || []).map(function (r) {
        return { theme: r.issue, count: r.count, category: r.category || null };
      }),
      aiSummary: summary.nextOutingFocus
        ? [
            "Shoot score " + (summary.overallShootScore != null ? summary.overallShootScore : "—") +
              (summary.letter ? " (" + summary.letter + ")" : "") + ".",
            summary.nextOutingFocus.title
              ? "Next focus: " + summary.nextOutingFocus.title + "."
              : "",
            summary.nextOutingFocus.why || "",
            summary.nextOutingFocus.practice || ""
          ].filter(Boolean).join(" ")
        : null,
      summaryDetail: summary,
      outdoorContext: sessionShoot.outdoorContext || null,
      communityMatchReady: false
    });
  }

  /* ——— Photo repository ——— */

  var PhotoRepository = {
    list: function () {
      var M = models();
      return readJson(PHOTO_KEY, []).map(function (p) {
        return M && M.migratePhotoRecord ? M.migratePhotoRecord(p) : p;
      });
    },
    get: function (uuid) {
      return this.list().filter(function (p) { return p.uuid === uuid; })[0] || null;
    },
    save: function (record) {
      if (!record || !record.uuid) return false;
      var M = models();
      if (M && M.migratePhotoRecord) record = M.migratePhotoRecord(record);
      var all = this.list().filter(function (p) { return p.uuid !== record.uuid; });
      all.unshift(record);
      return writeJson(PHOTO_KEY, all.slice(0, MAX_PHOTOS));
    },
    saveMany: function (records) {
      var M = models();
      var all = this.list();
      var byId = {};
      all.forEach(function (p) { byId[p.uuid] = p; });
      (records || []).forEach(function (r) {
        if (r && r.uuid) {
          byId[r.uuid] = M && M.migratePhotoRecord ? M.migratePhotoRecord(r) : r;
        }
      });
      var merged = Object.keys(byId).map(function (k) { return byId[k]; });
      merged.sort(function (a, b) {
        return String(b.analyzedAt || "").localeCompare(String(a.analyzedAt || ""));
      });
      return writeJson(PHOTO_KEY, merged.slice(0, MAX_PHOTOS));
    },
    byShoot: function (shootId) {
      return this.list().filter(function (p) { return p.shootId === shootId; });
    },
    count: function () {
      return this.list().length;
    },
    setExcluded: function (uuid, excluded) {
      var photo = this.get(uuid);
      if (!photo) return false;
      photo.excludeFromProfile = !!excluded;
      return this.save(photo);
    },
    correctSubjects: function (uuid, subjects, nicheLabel) {
      var photo = this.get(uuid);
      if (!photo) return false;
      if (!photo.userCorrections) {
        photo.userCorrections = models().emptyUserCorrections();
      }
      // Preserve original subjectCategories / critique; only override for learning
      photo.userCorrections.subjectCategories = (subjects || []).filter(Boolean);
      if (nicheLabel != null) {
        photo.userCorrections.nicheLabel = nicheLabel || null;
      }
      photo.userCorrections.correctedAt = new Date().toISOString();
      return this.save(photo);
    },
    clearCorrections: function (uuid) {
      var photo = this.get(uuid);
      if (!photo) return false;
      photo.userCorrections = models().emptyUserCorrections();
      return this.save(photo);
    }
  };

  /* ——— Shoot repository (entity store; parallel to UI shoot sessions) ——— */

  var ShootRepository = {
    list: function () {
      var M = models();
      return readJson(SHOOT_KEY, []).map(function (s) {
        return M && M.migrateShoot ? M.migrateShoot(s) : s;
      });
    },
    get: function (id) {
      return this.list().filter(function (s) { return s.id === id; })[0] || null;
    },
    save: function (shoot) {
      if (!shoot || !shoot.id) return false;
      var M = models();
      if (M && M.migrateShoot) shoot = M.migrateShoot(shoot);
      var all = this.list().filter(function (s) { return s.id !== shoot.id; });
      all.unshift(shoot);
      return writeJson(SHOOT_KEY, all.slice(0, MAX_SHOOTS));
    },
    count: function () {
      return this.list().length;
    },
    setExcluded: function (id, excluded) {
      var shoot = this.get(id);
      if (!shoot) return false;
      shoot.excludeFromProfile = !!excluded;
      shoot.updatedAt = new Date().toISOString();
      return this.save(shoot);
    },
    setExperimentation: function (id, isExperiment) {
      var shoot = this.get(id);
      if (!shoot) return false;
      shoot.isExperimentation = !!isExperiment;
      shoot.updatedAt = new Date().toISOString();
      return this.save(shoot);
    }
  };

  /* ——— Photographer profile repository ——— */

  var ProfileRepository = {
    load: function () {
      var M = models();
      var stored = readJson(PROFILE_KEY, null);
      if (stored) {
        return M && M.migratePhotographerProfile
          ? M.migratePhotographerProfile(stored)
          : stored;
      }
      var legacy = null;
      try {
        var raw = localStorage.getItem("waypoint-photo-coach-profile-v1");
        legacy = raw ? JSON.parse(raw) : null;
      } catch (e) {
        legacy = null;
      }
      var profile = M
        ? M.createPhotographerProfile(legacy ? {
            displayName: legacy.displayName || null,
            experienceLevel: legacy.experienceLevel || "developing",
            goals: legacy.goals || ["composition", "lighting"],
            focusAreas: legacy.focusAreas || [],
            completedAssignments: legacy.completedAssignments || [],
            createdAt: legacy.createdAt || new Date().toISOString(),
            updatedAt: legacy.updatedAt || new Date().toISOString()
          } : {})
        : { schemaVersion: "1.1.0", id: "local-default", privacy: { visibility: "private" } };
      if (M && M.migratePhotographerProfile) {
        profile = M.migratePhotographerProfile(profile);
      }
      writeJson(PROFILE_KEY, profile);
      return profile;
    },
    save: function (profile) {
      if (!profile) return false;
      var M = models();
      if (M && M.migratePhotographerProfile) {
        profile = M.migratePhotographerProfile(profile);
      }
      profile.updatedAt = new Date().toISOString();
      return writeJson(PROFILE_KEY, profile);
    },
    touchCounters: function (opts) {
      opts = opts || {};
      var profile = this.load();
      profile.photoCount = PhotoRepository.count();
      profile.shootCount = ShootRepository.count();
      if (opts.lastPhotoUuid) profile.lastPhotoUuid = opts.lastPhotoUuid;
      if (opts.lastShootId) profile.lastShootId = opts.lastShootId;
      this.save(profile);
      if (!opts.skipRecalculate) {
        this.recalculate();
      }
      return this.load();
    },
    recalculate: function () {
      var Eng = engine();
      var profile = this.load();
      if (!Eng || !Eng.compute) {
        profile.photoCount = PhotoRepository.count();
        profile.shootCount = ShootRepository.count();
        return this.save(profile) ? profile : null;
      }
      var computed = Eng.compute(PhotoRepository.list(), ShootRepository.list());
      Object.keys(computed).forEach(function (key) {
        profile[key] = computed[key];
      });
      if (!profile.privacy) {
        profile.privacy = { visibility: "private", shareEnabled: false };
      }
      profile.privacy.visibility = "private";
      profile.awaitingRecalculation = false;
      this.save(profile);
      return profile;
    },
    /**
     * Clear computed profile fields. Keeps photos/shoots and learning flags.
     */
    resetComputed: function () {
      var M = models();
      var current = this.load();
      var shell = M
        ? M.createPhotographerProfile({
            id: current.id || "local-default",
            createdAt: current.createdAt || new Date().toISOString(),
            displayName: current.displayName || null,
            experienceLevel: current.experienceLevel || "developing",
            goals: current.goals || ["composition", "lighting"],
            focusAreas: current.focusAreas || [],
            completedAssignments: current.completedAssignments || [],
            privacy: { visibility: "private", shareEnabled: false },
            photoCount: PhotoRepository.count(),
            shootCount: ShootRepository.count(),
            lastPhotoUuid: current.lastPhotoUuid || null,
            lastShootId: current.lastShootId || null
          })
        : current;
      shell.awaitingRecalculation = true;
      this.save(shell);
      return shell;
    },
    /**
     * Full learning reset: clear exclusions/experiment flags/corrections, then recompute empty.
     */
    resetLearning: function () {
      var photos = PhotoRepository.list().map(function (p) {
        p.excludeFromProfile = false;
        p.userCorrections = models().emptyUserCorrections();
        return p;
      });
      PhotoRepository.saveMany(photos);
      ShootRepository.list().forEach(function (s) {
        s.excludeFromProfile = false;
        s.isExperimentation = false;
        ShootRepository.save(s);
      });
      return this.resetComputed();
    }
  };

  /* ——— Coaching memory + preferences ——— */

  var CoachingRepository = {
    list: function () {
      var M = models();
      return readJson(COACHING_KEY, []).map(function (r) {
        return M && M.migrateCoachingRecord ? M.migrateCoachingRecord(r) : r;
      });
    },
    save: function (record) {
      if (!record || !record.uuid) return false;
      var M = models();
      if (M && M.migrateCoachingRecord) record = M.migrateCoachingRecord(record);
      var all = this.list().filter(function (r) { return r.uuid !== record.uuid; });
      all.unshift(record);
      return writeJson(COACHING_KEY, all.slice(0, MAX_COACHING));
    },
    saveMany: function (records) {
      var all = this.list();
      var byId = {};
      all.forEach(function (r) { byId[r.uuid] = r; });
      (records || []).forEach(function (r) {
        if (r && r.uuid) byId[r.uuid] = r;
      });
      var merged = Object.keys(byId).map(function (k) { return byId[k]; });
      merged.sort(function (a, b) {
        return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
      });
      return writeJson(COACHING_KEY, merged.slice(0, MAX_COACHING));
    },
    setFeedback: function (uuid, feedback) {
      var rec = this.list().filter(function (r) { return r.uuid === uuid; })[0];
      if (!rec) return false;
      rec.userFeedback = feedback;
      rec.feedbackAt = new Date().toISOString();
      this.save(rec);
      if (rec.coachingTheme) {
        PreferencesRepository.recordThemeFeedback(rec.coachingTheme, feedback);
      }
      return true;
    },
    clear: function () {
      return writeJson(COACHING_KEY, []);
    }
  };

  var PreferencesRepository = {
    load: function () {
      var M = models();
      var stored = readJson(COACHING_PREFS_KEY, null);
      if (stored) {
        return M && M.migrateCoachingPreferences
          ? M.migrateCoachingPreferences(stored)
          : stored;
      }
      var prefs = M ? M.createCoachingPreferences() : { hiddenThemes: [], intentionalThemes: [], boostedThemes: [], themeFeedback: {} };
      writeJson(COACHING_PREFS_KEY, prefs);
      return prefs;
    },
    save: function (prefs) {
      var M = models();
      if (M && M.migrateCoachingPreferences) prefs = M.migrateCoachingPreferences(prefs);
      prefs.updatedAt = new Date().toISOString();
      return writeJson(COACHING_PREFS_KEY, prefs);
    },
    hideTheme: function (family) {
      var prefs = this.load();
      if (prefs.hiddenThemes.indexOf(family) < 0) prefs.hiddenThemes.push(family);
      prefs.boostedThemes = prefs.boostedThemes.filter(function (t) { return t !== family; });
      return this.save(prefs);
    },
    restoreTheme: function (family) {
      var prefs = this.load();
      prefs.hiddenThemes = prefs.hiddenThemes.filter(function (t) { return t !== family; });
      return this.save(prefs);
    },
    markIntentional: function (family) {
      var prefs = this.load();
      if (prefs.intentionalThemes.indexOf(family) < 0) prefs.intentionalThemes.push(family);
      this.recordThemeFeedback(family, "intentional");
      return this.save(prefs);
    },
    clearIntentional: function (family) {
      var prefs = this.load();
      prefs.intentionalThemes = prefs.intentionalThemes.filter(function (t) { return t !== family; });
      return this.save(prefs);
    },
    wantMore: function (family) {
      var prefs = this.load();
      if (prefs.boostedThemes.indexOf(family) < 0) prefs.boostedThemes.push(family);
      prefs.hiddenThemes = prefs.hiddenThemes.filter(function (t) { return t !== family; });
      this.recordThemeFeedback(family, "want_more");
      return this.save(prefs);
    },
    recordThemeFeedback: function (family, feedback) {
      if (!family || !feedback) return false;
      var prefs = this.load();
      if (!prefs.themeFeedback[family]) {
        prefs.themeFeedback[family] = { helpful: 0, not_relevant: 0, intentional: 0, want_more: 0 };
      }
      var key = feedback;
      if (!prefs.themeFeedback[family][key] && prefs.themeFeedback[family][key] !== 0) {
        prefs.themeFeedback[family][key] = 0;
      }
      if (prefs.themeFeedback[family][key] != null) {
        prefs.themeFeedback[family][key] += 1;
      }
      if (feedback === "not_relevant") {
        // Soft — do not auto-hide; engine skips after repeated not_relevant
      }
      if (feedback === "intentional") {
        if (prefs.intentionalThemes.indexOf(family) < 0) prefs.intentionalThemes.push(family);
      }
      return this.save(prefs);
    },
    reset: function () {
      var M = models();
      var prefs = M ? M.createCoachingPreferences() : { hiddenThemes: [], intentionalThemes: [], boostedThemes: [], themeFeedback: {} };
      return this.save(prefs);
    }
  };

  /**
   * Apply personalized coaching to a critique using current profile memory.
   */
  function applyPersonalizedCritique(critique, meta) {
    meta = meta || {};
    var Pers = personalized();
    if (!Pers || !critique) return critique;
    var profile = ProfileRepository.load();
    var photos = PhotoRepository.list();
    var shoots = ShootRepository.list();
    var memory = CoachingRepository.list();
    var prefs = PreferencesRepository.load();
    var growth = Pers.detectGrowth(photos, shoots, { preferences: prefs });
    memory = Pers.markLaterImprovement(memory, growth);
    CoachingRepository.saveMany(memory);

    Pers.personalizeCritique(critique, {
      profile: profile,
      photos: photos,
      shoots: shoots,
      memory: memory,
      preferences: prefs,
      growth: growth,
      shootImages: meta.shootImages || []
    });

    var records = Pers.buildMemoryRecords(critique.personalized || {}, {
      photoId: meta.photoId || null,
      shootId: meta.shootId || null,
      photoCount: photos.length,
      shootCount: shoots.length,
      profileTier: profile.evidence && profile.evidence.confidenceTier,
      confidencePercent: critique.personalized && critique.personalized.limitedEvidence ? 20 : 50
    });
    if (records.length) CoachingRepository.saveMany(records);
    return critique;
  }

  function applyNextOutingCoaching(sessionShoot) {
    var Pers = personalized();
    if (!Pers || !sessionShoot) return null;
    var profile = ProfileRepository.load();
    var photos = PhotoRepository.list();
    var shoots = ShootRepository.list();
    var memory = CoachingRepository.list();
    var prefs = PreferencesRepository.load();
    var plan = Pers.buildNextOutingPlan(sessionShoot, {
      profile: profile,
      photos: photos,
      shoots: shoots,
      memory: memory,
      preferences: prefs
    });
    if (sessionShoot.summary) {
      sessionShoot.summary.personalizedOuting = plan;
      // Prefer personalized short plan in the focus slot when available
      if (plan && plan.summary) {
        sessionShoot.summary.nextOutingFocus = {
          title: "Next outing",
          why: plan.continueStrength,
          practice: plan.summary
        };
      }
    }
    var rec = Pers.buildOutingMemoryRecord(plan, {
      shootId: sessionShoot.id,
      photoCount: photos.length,
      shootCount: shoots.length,
      profileTier: profile.evidence && profile.evidence.confidenceTier
    });
    if (rec) CoachingRepository.save(rec);
    return plan;
  }

  /**
   * Persist growth records after analysis without affecting UI.
   */
  function ingestAnalysis(critique, meta) {
    var record = photoRecordFromCritique(critique, meta);
    if (!record) return null;
    var M = models();
    if (M && M.migratePhotoRecord) record = M.migratePhotoRecord(record);
    // Carry personalization snippet onto the photo record when present
    if (critique && critique.personalized) {
      record.personalizedCoaching = {
        narrative: critique.personalized.narrative || null,
        nextSteps: critique.personalized.nextSteps || [],
        limitedEvidence: !!critique.personalized.limitedEvidence
      };
    }
    PhotoRepository.save(record);
    ProfileRepository.touchCounters({ lastPhotoUuid: record.uuid });
    return record;
  }

  function ingestShoot(sessionShoot, photoRecords) {
    var entity = shootEntityFromSession(sessionShoot, photoRecords);
    if (!entity) return null;
    var M = models();
    if (M && M.migrateShoot) entity = M.migrateShoot(entity);
    var byName = {};
    (photoRecords || []).forEach(function (p) {
      if (p.originalFilename) byName[p.originalFilename] = p.uuid;
    });
    entity.bestImages = (entity.bestImages || []).map(function (b) {
      if (b.fileName && byName[b.fileName]) b.photoUuid = byName[b.fileName];
      return b;
    });
    // Preserve learning flags if shoot already exists
    var existing = ShootRepository.get(entity.id);
    if (existing) {
      entity.excludeFromProfile = !!existing.excludeFromProfile;
      entity.isExperimentation = !!existing.isExperimentation;
    }
    ShootRepository.save(entity);
    ProfileRepository.touchCounters({ lastShootId: entity.id });
    return entity;
  }

  global.WaypointPhotoCoachRepository = {
    PHOTO_KEY: PHOTO_KEY,
    SHOOT_KEY: SHOOT_KEY,
    PROFILE_KEY: PROFILE_KEY,
    COACHING_KEY: COACHING_KEY,
    COACHING_PREFS_KEY: COACHING_PREFS_KEY,
    photoRecordFromCritique: photoRecordFromCritique,
    shootEntityFromSession: shootEntityFromSession,
    PhotoRepository: PhotoRepository,
    ShootRepository: ShootRepository,
    ProfileRepository: ProfileRepository,
    CoachingRepository: CoachingRepository,
    PreferencesRepository: PreferencesRepository,
    applyPersonalizedCritique: applyPersonalizedCritique,
    applyNextOutingCoaching: applyNextOutingCoaching,
    ingestAnalysis: ingestAnalysis,
    ingestShoot: ingestShoot
  };
})(typeof window !== "undefined" ? window : global);
