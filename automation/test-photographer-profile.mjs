#!/usr/bin/env node
/**
 * Photographer Profile v1 — weighting, confidence, exclusions,
 * experimentation, corrections, reset, and recalculation.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import vm from "vm";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const failures = [];

function fail(name, detail) {
  failures.push(name + ": " + detail);
  console.log("FAIL", name, "—", detail);
}

function pass(name) {
  console.log("PASS", name);
}

function assert(name, cond, detail) {
  if (cond) pass(name);
  else fail(name, detail || "assertion failed");
}

function load(file) {
  const code = fs.readFileSync(path.join(ROOT, file), "utf8");
  vm.runInThisContext(code, { filename: file });
}

function makeLocalStorage() {
  const s = {};
  return {
    getItem(k) {
      return Object.prototype.hasOwnProperty.call(s, k) ? s[k] : null;
    },
    setItem(k, v) {
      s[k] = String(v);
    },
    removeItem(k) {
      delete s[k];
    },
    clear() {
      Object.keys(s).forEach((k) => delete s[k]);
    },
    _raw: s
  };
}

function setup() {
  global.window = global;
  global.localStorage = makeLocalStorage();
  load("apps/waypoint-scenes/js/photo-coach-models.js");
  load("apps/waypoint-scenes/js/photo-coach-profile-engine.js");
  load("apps/waypoint-scenes/js/photo-coach-repository.js");
  load("apps/waypoint-scenes/js/photo-coach-profile-demo.js");
}

function run() {
  setup();
  const M = global.WaypointPhotoCoachModels;
  const Eng = global.WaypointPhotoCoachProfileEngine;
  const Repo = global.WaypointPhotoCoachRepository;
  const Demo = global.WaypointPhotoCoachProfileDemo;

  // ——— Confidence tiers ———
  assert("tier <10", Eng.confidenceTier(5).id === "not_enough", Eng.confidenceTier(5).id);
  assert("tier 10-29", Eng.confidenceTier(15).id === "early", Eng.confidenceTier(15).id);
  assert("tier 30-99", Eng.confidenceTier(40).id === "emerging", Eng.confidenceTier(40).id);
  assert("tier 100+", Eng.confidenceTier(120).id === "established", Eng.confidenceTier(120).id);
  assert(
    "tier labels",
    Eng.confidenceTier(5).label === "Not enough work analyzed yet" &&
      Eng.confidenceTier(15).label === "Early tendency" &&
      Eng.confidenceTier(40).label === "Emerging pattern" &&
      Eng.confidenceTier(120).label === "Established pattern"
  );

  // ——— Recency weighting soft ———
  const newest = Date.parse("2026-07-01T00:00:00Z");
  const oldest = Date.parse("2026-01-01T00:00:00Z");
  const wNew = Eng.recencyWeight(newest, newest, oldest);
  const wOld = Eng.recencyWeight(oldest, newest, oldest);
  assert("recency newer > older", wNew > wOld, wNew + " vs " + wOld);
  assert("recency bounded", wNew <= 1.2 && wOld >= 0.8, wNew + "/" + wOld);

  // ——— Demo corpus profile ———
  const seeded = Demo.seedDemoProfile({ replace: true });
  assert("demo seed ok", seeded.ok, seeded.error);
  const profile = seeded.profile;
  assert("demo photo count", profile.evidence.eligiblePhotoCount === 36, String(profile.evidence.eligiblePhotoCount));
  assert("demo shoot count", profile.evidence.eligibleShootCount === 5, String(profile.evidence.eligibleShootCount));
  assert("demo tier emerging", profile.evidence.confidenceTier === "emerging", profile.evidence.confidenceTier);

  const topNiche = (profile.likelyNiches || [])[0];
  assert(
    "dominant woodland detail",
    topNiche && /woodland/i.test(topNiche.label),
    topNiche ? topNiche.label : "none"
  );

  const landscape = (profile.likelyNiches || []).find((n) => /landscape/i.test(n.label));
  assert("landscape present", !!landscape, "missing landscape niche");
  assert(
    "landscape experimental/low confidence",
    landscape &&
      (landscape.claimStrength === "experimental" ||
        landscape.confidencePercent <= 35 ||
        /experiment/i.test(landscape.evidenceLabel || "")),
    landscape
      ? landscape.claimStrength + " @ " + landscape.confidencePercent
      : "n/a"
  );
  assert(
    "woodland outranks landscape",
    topNiche && landscape && topNiche.weight > landscape.weight,
    topNiche && landscape ? topNiche.weight + " vs " + landscape.weight : "n/a"
  );

  const growth = profile.recentGrowth || {};
  const bgTrend = (growth.trends || []).find((t) => /background/i.test(t.theme));
  assert(
    "background simplicity improving",
    bgTrend && bgTrend.direction === "improving",
    bgTrend ? JSON.stringify(bgTrend) : "no trend"
  );

  assert(
    "niche has confidence + support counts",
    topNiche.confidencePercent != null &&
      topNiche.supportingPhotos > 0 &&
      topNiche.supportingShoots > 0,
    JSON.stringify(topNiche)
  );

  // ——— Stability: one shoot shouldn't flip dominance ———
  const before = topNiche.label;
  const M2 = M.createPhotoRecord({
    originalFilename: "noise-landscape.jpg",
    analyzedAt: new Date().toISOString(),
    shootId: "shoot-noise",
    subjectCategories: ["Landscape"],
    overallScore: 90,
    lightingConditions: "blue-hour",
    backgroundComplexity: "complex",
    subjectIsolation: "weak",
    camera: M.emptyCamera(),
    dominantMood: "landscape mood"
  });
  M2.camera.focalLengthMm = 24;
  Repo.PhotoRepository.save(M2);
  Repo.ShootRepository.save(
    M.createShoot({
      id: "shoot-noise",
      date: new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
      status: "complete",
      imageCount: 1,
      photoIds: [M2.uuid],
      isExperimentation: false
    })
  );
  const afterOne = Repo.ProfileRepository.recalculate();
  const afterTop = (afterOne.likelyNiches || [])[0];
  assert(
    "stable after one shoot",
    afterTop && /woodland/i.test(afterTop.label),
    afterTop ? afterTop.label + " (was " + before + ")" : "none"
  );

  // ——— Exclusion ———
  Demo.seedDemoProfile({ replace: true });
  const woodlandShoot = "shoot-woodland-recent";
  Repo.ShootRepository.setExcluded(woodlandShoot, true);
  const exclProfile = Repo.ProfileRepository.recalculate();
  const exclEligible = exclProfile.evidence.eligiblePhotoCount;
  assert("exclusion reduces eligible", exclEligible < 36, String(exclEligible));

  // Exclude all woodland shoots → wildlife may rise
  ["shoot-woodland-early", "shoot-woodland-mid", "shoot-woodland-recent"].forEach((id) => {
    Repo.ShootRepository.setExcluded(id, true);
  });
  const noWood = Repo.ProfileRepository.recalculate();
  const noWoodTop = (noWood.likelyNiches || [])[0];
  assert(
    "excluding woodland elevates other niches",
    noWoodTop && !/woodland/i.test(noWoodTop.label),
    noWoodTop ? noWoodTop.label : "none"
  );

  // ——— Experimentation flag ———
  Demo.seedDemoProfile({ replace: true });
  // Force landscape shoot NOT experiment and see confidence rise, then mark experiment
  Repo.ShootRepository.setExperimentation("shoot-landscape-experiment", false);
  const landOpen = Repo.ProfileRepository.recalculate();
  const landOpenItem = (landOpen.likelyNiches || []).find((n) => /landscape/i.test(n.label));
  Repo.ShootRepository.setExperimentation("shoot-landscape-experiment", true);
  const landExp = Repo.ProfileRepository.recalculate();
  const landExpItem = (landExp.likelyNiches || []).find((n) => /landscape/i.test(n.label));
  assert("landscape exists both ways", !!landOpenItem && !!landExpItem);
  assert(
    "experiment lowers landscape confidence or marks experimental",
    landExpItem.confidencePercent <= landOpenItem.confidencePercent ||
      landExpItem.claimStrength === "experimental",
    landOpenItem.confidencePercent + " -> " + landExpItem.confidencePercent + " / " + landExpItem.claimStrength
  );

  // ——— Corrections without deleting critique ———
  Demo.seedDemoProfile({ replace: true });
  const aPhoto = Repo.PhotoRepository.list().find((p) => /landscape/i.test((p.subjectCategories || []).join(" ")));
  assert("found landscape photo", !!aPhoto);
  const originalSubjects = (aPhoto.subjectCategories || []).slice();
  Repo.PhotoRepository.correctSubjects(aPhoto.uuid, ["Woodland detail"], "Woodland detail");
  const corrected = Repo.PhotoRepository.get(aPhoto.uuid);
  assert(
    "correction preserves original subjects",
    JSON.stringify(corrected.subjectCategories) === JSON.stringify(originalSubjects),
    JSON.stringify(corrected.subjectCategories)
  );
  assert(
    "correction stored separately",
    corrected.userCorrections.subjectCategories[0] === "Woodland detail"
  );
  assert("original critique intact", !!corrected.aiCritique);

  // ——— Photo exclude ———
  Repo.PhotoRepository.setExcluded(aPhoto.uuid, true);
  const excludedPhoto = Repo.PhotoRepository.get(aPhoto.uuid);
  assert("photo excluded flag", excludedPhoto.excludeFromProfile === true);

  // ——— Reset computed ———
  const resetView = Repo.ProfileRepository.resetComputed();
  assert("reset clears computedAt", resetView.computedAt == null, String(resetView.computedAt));
  assert("reset keeps photoCount", resetView.photoCount > 0, String(resetView.photoCount));

  // ——— Recalculate restores ———
  const restored = Repo.ProfileRepository.recalculate();
  assert("recalculate restores computedAt", !!restored.computedAt);
  assert("recalculate restores niches", (restored.likelyNiches || []).length > 0);

  // ——— Reset learning clears flags ———
  Repo.ShootRepository.setExcluded("shoot-wildlife", true);
  Repo.ShootRepository.setExperimentation("shoot-landscape-experiment", true);
  Repo.ProfileRepository.resetLearning();
  const wildlife = Repo.ShootRepository.get("shoot-wildlife");
  const landscapeShoot = Repo.ShootRepository.get("shoot-landscape-experiment");
  assert("reset learning clears exclude", wildlife && wildlife.excludeFromProfile === false);
  assert(
    "reset learning clears experiment",
    landscapeShoot && landscapeShoot.isExperimentation === false
  );

  // ——— Coaching language positive ———
  const reworded = Eng.rewordCoaching("Busy background");
  assert(
    "coaching reword constructive",
    /simplif|strengthen|continue|keep|growth|practice/i.test(reworded),
    reworded
  );

  // ——— Insufficient evidence message ———
  localStorage.setItem(Repo.PHOTO_KEY, "[]");
  localStorage.setItem(Repo.SHOOT_KEY, "[]");
  const empty = Repo.ProfileRepository.recalculate();
  assert(
    "empty profile not-enough",
    empty.evidence.confidenceTier === "not_enough" &&
      /not enough/i.test(empty.currentDirection.summary),
    empty.currentDirection && empty.currentDirection.summary
  );

  // ——— Privacy default ———
  assert(
    "privacy private",
    empty.privacy && empty.privacy.visibility === "private",
    JSON.stringify(empty.privacy)
  );

  // ——— Companion intelligence (Photography DNA, projects, soft observations) ———
  Demo.seedDemoProfile({ replace: true });
  const companion = Repo.ProfileRepository.recalculate();
  assert("has photographyDna", !!(companion.photographyDna && companion.photographyDna.summary));
  assert(
    "dna not evaluative grade language",
    !/letter grade|ranked #|follower/i.test(companion.photographyDna.summary || "")
  );
  assert("has observations", Array.isArray(companion.observations) && companion.observations.length > 0);
  assert(
    "observation soft language",
    companion.observations.some((o) => /appears|may enjoy|emerging|seems/i.test(o)),
    companion.observations[0]
  );
  assert("has projects from history", Array.isArray(companion.projects) && companion.projects.length > 0);
  assert(
    "forest project from woodland history",
    companion.projects.some((p) => /forest|tree|season/i.test(p.title)),
    JSON.stringify(companion.projects.map((p) => p.title))
  );
  assert(
    "favorite subjects populated",
    (companion.favoriteSubjects || companion.preferredSubjects || []).length > 0
  );
  assert(
    "favorite locations from demo",
    (companion.favoriteLocations || []).some((l) => /ridge hollow/i.test(l.label)),
    JSON.stringify(companion.favoriteLocations)
  );
  assert("favorite seasons", (companion.favoriteSeasons || []).length > 0);
  assert("favorite lenses", (companion.favoriteLenses || []).length > 0);
  assert("confidence timeline", Array.isArray(companion.confidenceTimeline));
  assert("photography journey", !!(companion.photographyJourney && companion.photographyJourney.stage));
  assert("curiosity insights", (companion.curiosityInsights || []).length > 0);
  assert("goals suggested", (companion.goals || []).length > 0);
  assert("schema 2.0", companion.schemaVersion === "2.0.0" || M.PROFILE_SCHEMA === "2.0.0");

  // Empty companion remains gentle
  localStorage.setItem(Repo.PHOTO_KEY, "[]");
  localStorage.setItem(Repo.SHOOT_KEY, "[]");
  const emptyCompanion = Repo.ProfileRepository.recalculate();
  assert(
    "empty dna patient",
    emptyCompanion.photographyDna && /wait|begin|rush|enough/i.test(emptyCompanion.photographyDna.summary || ""),
    emptyCompanion.photographyDna && emptyCompanion.photographyDna.summary
  );

  // ——— Schema migration ———
  const legacyPhoto = {
    uuid: "legacy-1",
    schemaVersion: "2.0.0",
    subjectCategories: ["Wildlife"],
    analyzedAt: new Date().toISOString()
  };
  const migrated = M.migratePhotoRecord(legacyPhoto);
  assert("migrate photo exclude default", migrated.excludeFromProfile === false);
  assert("migrate photo corrections", !!migrated.userCorrections);

  if (failures.length) {
    console.log("\n" + failures.length + " failure(s)");
    process.exit(1);
  }
  console.log("\nAll photographer profile tests passed.");
}

run();
