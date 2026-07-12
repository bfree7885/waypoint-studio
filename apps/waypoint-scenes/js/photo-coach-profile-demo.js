/**
 * Seeded demo corpus for Photographer Profile validation.
 * Woodland-detail dominant + wildlife + landscape experimentation,
 * with background simplicity improving over time.
 */
(function (global) {
  "use strict";

  function models() {
    return global.WaypointPhotoCoachModels;
  }

  function daysAgo(n, hour) {
    var d = new Date();
    d.setUTCDate(d.getUTCDate() - n);
    d.setUTCHours(hour || 10, 15, 0, 0);
    return d.toISOString();
  }

  function makePhoto(opts) {
    var M = models();
    return M.createPhotoRecord({
      uuid: opts.uuid || M.uuid(),
      originalFilename: opts.filename,
      captureDateTime: opts.analyzedAt,
      analyzedAt: opts.analyzedAt,
      shootId: opts.shootId,
      subjectCategories: opts.subjects,
      compositionScore: opts.composition,
      technicalScore: opts.technical,
      artisticScore: opts.artistic,
      overallScore: opts.overall,
      confidence: "moderate-demo",
      lightingConditions: opts.lighting,
      backgroundComplexity: opts.background,
      subjectIsolation: opts.isolation,
      sharpness: opts.sharpness || 70,
      exposureQuality: "balanced",
      colorCharacteristics: opts.color,
      dominantMood: opts.mood,
      camera: {
        make: "Sony",
        model: "A7IV",
        lens: opts.lens || "FE 90mm Macro",
        focalLengthMm: opts.focal,
        fNumber: opts.fNumber || 4,
        iso: opts.iso || 400,
        exposureTimeSec: 0.008
      },
      aiCritique: {
        engine: "demo-analysis",
        trustLabel: "On-device analysis",
        narrative: opts.narrative || null,
        strengths: (opts.strengths || []).map(function (t) {
          return { title: t, whyItWorks: "Consistent in this body of work." };
        }),
        improvements: (opts.improvements || []).map(function (t) {
          return { issue: t, whyItMatters: "A recurring craft opportunity." };
        }),
        letterGrade: opts.letter || "B"
      },
      aiCoachingSuggestions: (opts.improvements || []).map(function (t, i) {
        return {
          priority: i === 0 ? "primary" : "secondary",
          issue: t,
          whatToDo: "Practice on the next outing.",
          whyItMatters: "Builds a clearer visual habit.",
          expectedImprovement: "Stronger subject read"
        };
      }),
      excludeFromProfile: false,
      userCorrections: M.emptyUserCorrections()
    });
  }

  function makeShoot(opts, photoIds) {
    var M = models();
    return M.createShoot({
      id: opts.id,
      date: opts.date,
      createdAt: opts.createdAt,
      updatedAt: opts.createdAt,
      status: "complete",
      imageCount: photoIds.length,
      photoIds: photoIds,
      averageScores: opts.averages || {
        overall: 74,
        composition: 72,
        technical: 76,
        artistic: 73
      },
      bestImages: [],
      commonStrengths: opts.strengths || [],
      commonImprovementThemes: opts.themes || [],
      aiSummary: opts.summary || null,
      excludeFromProfile: false,
      isExperimentation: !!opts.isExperimentation
    });
  }

  /**
   * Build realistic demo records (does not write storage).
   */
  function buildDemoCorpus() {
    var photos = [];
    var shoots = [];

    // Shoot 1 — early woodland detail (busier backgrounds)
    var s1 = "shoot-woodland-early";
    var s1photos = [];
    for (var i = 0; i < 8; i++) {
      var p1 = makePhoto({
        filename: "woodland-early-" + (i + 1) + ".jpg",
        analyzedAt: daysAgo(90 - i, 9),
        shootId: s1,
        subjects: ["Woodland detail"],
        composition: 68 + (i % 3),
        technical: 70 + (i % 4),
        artistic: 72,
        overall: 70 + (i % 5),
        lighting: "soft / flat, cool, forest shade",
        background: i < 5 ? "complex" : "moderate",
        isolation: i < 4 ? "weak" : "moderate",
        focal: 90,
        color: "green, brown · muted · cool bias",
        mood: "quiet woodland mood",
        strengths: ["Natural color", "Attentive looking"],
        improvements: ["Busy background", "Crop tighter"],
        letter: "B-"
      });
      s1photos.push(p1.uuid);
      photos.push(p1);
    }
    shoots.push(makeShoot({
      id: s1,
      date: daysAgo(90).slice(0, 10),
      createdAt: daysAgo(90),
      strengths: [{ title: "Natural color", count: 5 }],
      themes: [{ theme: "Busy background", count: 6 }],
      summary: "Early woodland looking — backgrounds often compete."
    }, s1photos));

    // Shoot 2 — woodland mid (improving)
    var s2 = "shoot-woodland-mid";
    var s2photos = [];
    for (var j = 0; j < 8; j++) {
      var p2 = makePhoto({
        filename: "woodland-mid-" + (j + 1) + ".jpg",
        analyzedAt: daysAgo(50 - j, 10),
        shootId: s2,
        subjects: ["Woodland detail"],
        composition: 74 + (j % 3),
        technical: 76,
        artistic: 75,
        overall: 76 + (j % 4),
        lighting: "soft / flat, warm, filtered canopy",
        background: j < 3 ? "moderate" : "simple",
        isolation: j < 2 ? "moderate" : "strong",
        focal: 90,
        color: "green, amber · natural saturation · warm bias",
        mood: "warm contemplative woodland mood",
        strengths: ["Subject isolation", "Background simplicity", "Light"],
        improvements: ["Watch exposure at bright gaps"],
        letter: "B"
      });
      s2photos.push(p2.uuid);
      photos.push(p2);
    }
    shoots.push(makeShoot({
      id: s2,
      date: daysAgo(50).slice(0, 10),
      createdAt: daysAgo(50),
      strengths: [{ title: "Subject isolation", count: 5 }],
      themes: [{ theme: "Watch exposure", count: 3 }],
      summary: "Woodland detail clarifying — cleaner backgrounds."
    }, s2photos));

    // Shoot 3 — recent woodland (cleaner)
    var s3 = "shoot-woodland-recent";
    var s3photos = [];
    for (var k = 0; k < 8; k++) {
      var p3 = makePhoto({
        filename: "woodland-recent-" + (k + 1) + ".jpg",
        analyzedAt: daysAgo(12 - Math.min(k, 10), 11),
        shootId: s3,
        subjects: ["Woodland detail"],
        composition: 80 + (k % 3),
        technical: 82,
        artistic: 79,
        overall: 81 + (k % 3),
        lighting: "golden-hour, warm, directional / contrasty",
        background: "simple",
        isolation: "strong",
        focal: 90,
        color: "amber, green · natural saturation · warm bias",
        mood: "warm contemplative woodland mood",
        strengths: ["Background simplicity", "Subject isolation", "Light"],
        improvements: ["Protect highlight detail"],
        letter: "B+"
      });
      s3photos.push(p3.uuid);
      photos.push(p3);
    }
    shoots.push(makeShoot({
      id: s3,
      date: daysAgo(12).slice(0, 10),
      createdAt: daysAgo(12),
      averages: { overall: 82, composition: 81, technical: 82, artistic: 79 },
      strengths: [{ title: "Background simplicity", count: 7 }],
      themes: [{ theme: "Protect highlight detail", count: 2 }],
      summary: "Strong woodland-detail direction with clean backgrounds."
    }, s3photos));

    // Shoot 4 — wildlife
    var s4 = "shoot-wildlife";
    var s4photos = [];
    for (var w = 0; w < 8; w++) {
      var pw = makePhoto({
        filename: "wildlife-" + (w + 1) + ".jpg",
        analyzedAt: daysAgo(35 - w, 7),
        shootId: s4,
        subjects: ["Wildlife"],
        composition: 73 + (w % 4),
        technical: 78,
        artistic: 74,
        overall: 75 + (w % 4),
        lighting: "cool, directional / contrasty",
        background: w % 2 === 0 ? "moderate" : "simple",
        isolation: "strong",
        focal: 400,
        lens: "FE 200-600",
        fNumber: 6.3,
        iso: 800,
        color: "brown, green · natural saturation",
        mood: "wildlife observational mood",
        strengths: ["Subject isolation", "Technical control"],
        improvements: ["Crop tighter", "Watch busy edges"],
        letter: "B"
      });
      s4photos.push(pw.uuid);
      photos.push(pw);
    }
    shoots.push(makeShoot({
      id: s4,
      date: daysAgo(35).slice(0, 10),
      createdAt: daysAgo(35),
      strengths: [{ title: "Subject isolation", count: 6 }],
      themes: [{ theme: "Crop tighter", count: 4 }],
      summary: "Wildlife sessions with strong isolation."
    }, s4photos));

    // Shoot 5 — landscape experimentation (small, flagged)
    var s5 = "shoot-landscape-experiment";
    var s5photos = [];
    for (var L = 0; L < 4; L++) {
      var pl = makePhoto({
        filename: "landscape-exp-" + (L + 1) + ".jpg",
        analyzedAt: daysAgo(20 - L, 18),
        shootId: s5,
        subjects: ["Landscape"],
        composition: 70,
        technical: 74,
        artistic: 71,
        overall: 71,
        lighting: "blue-hour, cool",
        background: "complex",
        isolation: "weak",
        focal: 24,
        lens: "FE 24-70",
        fNumber: 8,
        color: "blue, violet · cool bias",
        mood: "cool atmospheric landscape mood",
        strengths: ["Atmosphere"],
        improvements: ["Simplify the frame", "Stronger foreground anchor"],
        letter: "B-"
      });
      s5photos.push(pl.uuid);
      photos.push(pl);
    }
    shoots.push(makeShoot({
      id: s5,
      date: daysAgo(20).slice(0, 10),
      createdAt: daysAgo(20),
      isExperimentation: true,
      strengths: [{ title: "Atmosphere", count: 3 }],
      themes: [{ theme: "Simplify the frame", count: 3 }],
      summary: "Landscape experiments — exploratory, not core direction."
    }, s5photos));

    return {
      photos: photos,
      shoots: shoots,
      meta: {
        totalPhotos: photos.length,
        totalShoots: shoots.length,
        expectedDominant: "Woodland detail",
        expectedExperiment: "Landscape"
      }
    };
  }

  /**
   * Write demo corpus into repositories and recalculate profile.
   * @param {object} opts { replace: true } clears existing growth photos/shoots first
   */
  function seedDemoProfile(opts) {
    opts = opts || {};
    var Repo = global.WaypointPhotoCoachRepository;
    var corpus = buildDemoCorpus();
    if (!Repo) return { ok: false, error: "Repository unavailable", corpus: corpus };

    if (opts.replace !== false) {
      try {
        localStorage.setItem(Repo.PHOTO_KEY, "[]");
        localStorage.setItem(Repo.SHOOT_KEY, "[]");
      } catch (e) { /* ignore */ }
    }

    Repo.PhotoRepository.saveMany(corpus.photos);
    corpus.shoots.forEach(function (s) {
      Repo.ShootRepository.save(s);
    });
    var profile = Repo.ProfileRepository.recalculate();

    // Seed coaching memory from personalized engine for demo validation
    var Pers = global.WaypointPhotoCoachPersonalized;
    var outingPlan = null;
    var samplePersonalized = null;
    if (Pers && Repo.CoachingRepository) {
      try {
        localStorage.setItem(Repo.COACHING_KEY, "[]");
      } catch (e2) { /* ignore */ }
      var recentShoot = corpus.shoots.filter(function (s) {
        return s.id === "shoot-woodland-recent";
      })[0];
      if (recentShoot) {
        recentShoot.summary = {
          commonStrengths: recentShoot.commonStrengths,
          recurringImprovements: (recentShoot.commonImprovementThemes || []).map(function (t) {
            return { issue: t.theme, count: t.count };
          })
        };
        outingPlan = Repo.applyNextOutingCoaching
          ? Repo.applyNextOutingCoaching(recentShoot)
          : Pers.buildNextOutingPlan(recentShoot, {
              profile: profile,
              memory: [],
              preferences: Repo.PreferencesRepository.load()
            });
      }
      var sampleCritique = {
        narrativeSummary: "A quiet woodland frame with a clear subject.",
        strengths: [{ title: "Subject isolation", whyItWorks: "Quiet background." }],
        improvements: [
          {
            priority: "primary",
            issue: "Bright branch near the upper edge",
            whatToDo: "Recompose to exclude the competing branch.",
            category: "Framing"
          }
        ],
        signals: { subjectEmphasis: 0.14 }
      };
      samplePersonalized = Pers.personalizeCritique(sampleCritique, {
        profile: profile,
        photos: corpus.photos,
        shoots: corpus.shoots,
        memory: Repo.CoachingRepository.list(),
        preferences: Repo.PreferencesRepository.load()
      });
      var mem = Pers.buildMemoryRecords(samplePersonalized, {
        photoId: corpus.photos[corpus.photos.length - 1].uuid,
        shootId: "shoot-woodland-recent",
        photoCount: corpus.photos.length,
        shootCount: corpus.shoots.length
      });
      if (mem.length) Repo.CoachingRepository.saveMany(mem);
    }

    return {
      ok: true,
      corpus: corpus,
      profile: profile,
      outingPlan: outingPlan,
      samplePersonalized: samplePersonalized
    };
  }

  global.WaypointPhotoCoachProfileDemo = {
    buildDemoCorpus: buildDemoCorpus,
    seedDemoProfile: seedDemoProfile
  };
})(typeof window !== "undefined" ? window : global);
