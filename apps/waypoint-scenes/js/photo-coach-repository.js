/**
 * Waypoint Scenes / Photo Coach — repositories for growth data.
 *
 * Quiet persistence behind the existing UI. No profile calculation.
 * Storage keys are versioned; older shoot/session stores remain valid.
 */
(function (global) {
  "use strict";

  var PHOTO_KEY = "waypoint-photo-records-v1";
  var SHOOT_KEY = "waypoint-photo-shoots-entity-v1";
  var PROFILE_KEY = "waypoint-photographer-profile-v1";
  var MAX_PHOTOS = 200;
  var MAX_SHOOTS = 40;

  var Models = null;

  function models() {
    if (!Models) Models = global.WaypointPhotoCoachModels;
    return Models;
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
        trustLabel: critique.trustLabel || "Demo Analysis",
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
      engineVersion: critique.version || null
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
      return readJson(PHOTO_KEY, []);
    },
    get: function (uuid) {
      return this.list().filter(function (p) { return p.uuid === uuid; })[0] || null;
    },
    save: function (record) {
      if (!record || !record.uuid) return false;
      var all = this.list().filter(function (p) { return p.uuid !== record.uuid; });
      all.unshift(record);
      return writeJson(PHOTO_KEY, all.slice(0, MAX_PHOTOS));
    },
    saveMany: function (records) {
      var all = this.list();
      var byId = {};
      all.forEach(function (p) { byId[p.uuid] = p; });
      (records || []).forEach(function (r) {
        if (r && r.uuid) byId[r.uuid] = r;
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
    }
  };

  /* ——— Shoot repository (entity store; parallel to UI shoot sessions) ——— */

  var ShootRepository = {
    list: function () {
      return readJson(SHOOT_KEY, []);
    },
    get: function (id) {
      return this.list().filter(function (s) { return s.id === id; })[0] || null;
    },
    save: function (shoot) {
      if (!shoot || !shoot.id) return false;
      var all = this.list().filter(function (s) { return s.id !== shoot.id; });
      all.unshift(shoot);
      return writeJson(SHOOT_KEY, all.slice(0, MAX_SHOOTS));
    },
    count: function () {
      return this.list().length;
    }
  };

  /* ——— Photographer profile repository (shape only; no calculation) ——— */

  var ProfileRepository = {
    load: function () {
      var M = models();
      var stored = readJson(PROFILE_KEY, null);
      if (stored) return stored;
      // Migrate soft fields from legacy learning profile if present
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
        : { schemaVersion: "1.0.0", id: "local-default" };
      writeJson(PROFILE_KEY, profile);
      return profile;
    },
    save: function (profile) {
      if (!profile) return false;
      profile.updatedAt = new Date().toISOString();
      return writeJson(PROFILE_KEY, profile);
    },
    /**
     * Touch bookkeeping counters only — does NOT compute niche/style/etc.
     */
    touchCounters: function (opts) {
      opts = opts || {};
      var profile = this.load();
      profile.photoCount = PhotoRepository.count();
      profile.shootCount = ShootRepository.count();
      if (opts.lastPhotoUuid) profile.lastPhotoUuid = opts.lastPhotoUuid;
      if (opts.lastShootId) profile.lastShootId = opts.lastShootId;
      // Explicitly leave preferredSubjects, emergingNiche, visualStyle, etc. untouched
      profile.computedAt = null;
      return this.save(profile);
    }
  };

  /**
   * Persist growth records after analysis without affecting UI.
   */
  function ingestAnalysis(critique, meta) {
    var record = photoRecordFromCritique(critique, meta);
    if (!record) return null;
    PhotoRepository.save(record);
    ProfileRepository.touchCounters({ lastPhotoUuid: record.uuid });
    return record;
  }

  function ingestShoot(sessionShoot, photoRecords) {
    var entity = shootEntityFromSession(sessionShoot, photoRecords);
    if (!entity) return null;
    // Link best image UUIDs when filenames match
    var byName = {};
    (photoRecords || []).forEach(function (p) {
      if (p.originalFilename) byName[p.originalFilename] = p.uuid;
    });
    entity.bestImages = (entity.bestImages || []).map(function (b) {
      if (b.fileName && byName[b.fileName]) b.photoUuid = byName[b.fileName];
      return b;
    });
    ShootRepository.save(entity);
    ProfileRepository.touchCounters({ lastShootId: entity.id });
    return entity;
  }

  global.WaypointPhotoCoachRepository = {
    PHOTO_KEY: PHOTO_KEY,
    SHOOT_KEY: SHOOT_KEY,
    PROFILE_KEY: PROFILE_KEY,
    photoRecordFromCritique: photoRecordFromCritique,
    shootEntityFromSession: shootEntityFromSession,
    PhotoRepository: PhotoRepository,
    ShootRepository: ShootRepository,
    ProfileRepository: ProfileRepository,
    ingestAnalysis: ingestAnalysis,
    ingestShoot: ingestShoot
  };
})(window);
