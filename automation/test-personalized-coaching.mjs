#!/usr/bin/env node
/**
 * Personalized Coaching v1 — critique context, growth, repetition,
 * intentional feedback, hidden themes, helpful/not-relevant, low confidence.
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
    }
  };
}

function setup() {
  global.window = global;
  global.localStorage = makeLocalStorage();
  load("apps/waypoint-scenes/js/photo-coach-models.js");
  load("apps/waypoint-scenes/js/photo-coach-profile-engine.js");
  load("apps/waypoint-scenes/js/photo-coach-personalized.js");
  load("apps/waypoint-scenes/js/photo-coach-repository.js");
  load("apps/waypoint-scenes/js/photo-coach-profile-demo.js");
}

function run() {
  setup();
  const Pers = global.WaypointPhotoCoachPersonalized;
  const Repo = global.WaypointPhotoCoachRepository;
  const Demo = global.WaypointPhotoCoachProfileDemo;

  // ——— Low confidence ———
  const emptyGrowth = Pers.detectGrowth([], []);
  assert("low evidence growth unavailable", emptyGrowth.available === false);
  assert(
    "low evidence label",
    /not enough/i.test(emptyGrowth.confidenceLabel),
    emptyGrowth.confidenceLabel
  );

  const seeded = Demo.seedDemoProfile({ replace: true });
  assert("demo seed", seeded.ok);

  // ——— Personalized critique context ———
  const critique = {
    narrativeSummary: "Balanced exposure and a clear subject.",
    strengths: [{ title: "Subject isolation", whyItWorks: "Quiet background supports the subject." }],
    improvements: [
      {
        priority: "primary",
        issue: "Bright branch near the upper edge",
        whatToDo: "Take one extra frame excluding the branch.",
        category: "Framing"
      },
      {
        priority: "secondary",
        issue: "Busy background",
        whatToDo: "Simplify the backdrop.",
        category: "Background"
      }
    ],
    signals: { subjectEmphasis: 0.14 },
    overallGrade: { summary: "Balanced exposure and a clear subject." }
  };

  const block = Pers.personalizeCritique(critique, {
    profile: seeded.profile,
    photos: Repo.PhotoRepository.list(),
    shoots: Repo.ShootRepository.list(),
    memory: Repo.CoachingRepository.list(),
    preferences: Repo.PreferencesRepository.load()
  });

  assert("personalized narrative present", !!(block.narrative && block.narrative.length > 20), block.narrative);
  assert(
    "mentions woodland tendency",
    /woodland/i.test(block.narrative) || /woodland/i.test(block.styleRelation || ""),
    block.narrative + " | " + block.styleRelation
  );
  assert(
    "notes improvement or ongoing craft",
    /improv|ongoing|background|branch|strength/i.test(block.narrative),
    block.narrative
  );
  assert("next steps limited", block.nextSteps.length >= 1 && block.nextSteps.length <= 2);
  assert("critique narrative updated", /woodland|improv|ongoing|subject/i.test(critique.narrativeSummary));
  assert(
    "does not overstate landscape as core",
    !/established landscape/i.test(block.narrative || "")
  );

  // ——— Growth detection ———
  const growth = Pers.detectGrowth(Repo.PhotoRepository.list(), Repo.ShootRepository.list(), {
    preferences: Repo.PreferencesRepository.load()
  });
  assert("growth available on demo", growth.available);
  const bg = growth.improvements.find((g) => /background/i.test(g.area));
  assert("background simplicity improving", !!bg && bg.direction === "improving", JSON.stringify(bg));
  assert("growth has confidence", bg && bg.confidencePercent > 0 && bg.evidenceWindow);

  // ——— Next outing ———
  const plan =
    seeded.outingPlan ||
    Pers.buildNextOutingPlan(
      {
        id: "shoot-woodland-recent",
        summary: {
          commonStrengths: [{ title: "Background simplicity", count: 7 }],
          recurringImprovements: [{ issue: "Protect highlight detail", count: 2 }]
        }
      },
      {
        profile: seeded.profile,
        memory: Repo.CoachingRepository.list(),
        preferences: Repo.PreferencesRepository.load()
      }
    );
  assert("outing has strength", /continue/i.test(plan.continueStrength), plan.continueStrength);
  assert("outing has practice", !!plan.practiceSkill);
  assert("outing has experiment", !!plan.optionalExperiment);
  assert("outing has subject/condition", !!plan.subjectOrCondition);
  assert("outing not homework language", !/homework|assignment|lesson/i.test(plan.summary), plan.summary);
  assert("outing woodland-aware", /woodland|soft light|subject/i.test(plan.summary), plan.summary);

  // ——— Repetition prevention ———
  const family = "framing";
  const mem = [];
  for (let i = 0; i < 3; i++) {
    mem.push({
      coachingTheme: family,
      themeLabel: "Framing",
      recommendation: "Crop tighter",
      createdAt: new Date().toISOString()
    });
  }
  const repeated = Pers.personalizeCritique(
    {
      narrativeSummary: "Another woodland frame.",
      strengths: [{ title: "Light" }],
      improvements: [
        { priority: "primary", issue: "Crop tighter at the edges", category: "Framing", whatToDo: "Tighten the crop." }
      ]
    },
    {
      profile: seeded.profile,
      photos: Repo.PhotoRepository.list(),
      shoots: Repo.ShootRepository.list(),
      memory: mem,
      preferences: Repo.PreferencesRepository.load()
    }
  );
  assert(
    "acknowledges ongoing focus",
    /ongoing focus/i.test(repeated.narrative) ||
      repeated.nextSteps.some((s) => s.wasRepeated),
    repeated.narrative + " | " + JSON.stringify(repeated.nextSteps)
  );

  // ——— Intentional choice ———
  Repo.PreferencesRepository.reset();
  Repo.PreferencesRepository.markIntentional("framing");
  const intentionalCritique = Pers.personalizeCritique(
    {
      narrativeSummary: "Frame with bright edge.",
      strengths: [{ title: "Subject isolation" }],
      improvements: [
        { priority: "primary", issue: "Bright branch near the upper edge", category: "Framing", whatToDo: "Exclude branch." }
      ]
    },
    {
      profile: seeded.profile,
      photos: Repo.PhotoRepository.list(),
      shoots: Repo.ShootRepository.list(),
      memory: [],
      preferences: Repo.PreferencesRepository.load()
    }
  );
  assert(
    "intentional language adapts",
    /intentional/i.test(intentionalCritique.narrative) ||
      intentionalCritique.technicalVsStyle.some((n) => n.kind === "style"),
    intentionalCritique.narrative + " | " + JSON.stringify(intentionalCritique.technicalVsStyle)
  );
  assert(
    "intentional skips framing as primary next-step push",
    !intentionalCritique.nextSteps.some((s) => s.family === "framing"),
    JSON.stringify(intentionalCritique.nextSteps)
  );

  // ——— Hidden themes ———
  Repo.PreferencesRepository.reset();
  Repo.PreferencesRepository.hideTheme("background-simplicity");
  assert(
    "hidden theme skipped",
    Pers.shouldSkipTheme(Repo.PreferencesRepository.load(), [], "background-simplicity")
  );
  const hiddenGrowth = Pers.detectGrowth(Repo.PhotoRepository.list(), Repo.ShootRepository.list(), {
    preferences: Repo.PreferencesRepository.load()
  });
  assert(
    "hidden theme absent from growth",
    !hiddenGrowth.improvements.some((g) => g.family === "background-simplicity")
  );
  Repo.PreferencesRepository.restoreTheme("background-simplicity");
  assert(
    "restored theme not skipped",
    !Pers.shouldSkipTheme(Repo.PreferencesRepository.load(), [], "background-simplicity")
  );

  // ——— Helpful / not relevant feedback ———
  Repo.PreferencesRepository.reset();
  const rec = global.WaypointPhotoCoachModels.createCoachingRecord({
    coachingTheme: "exposure",
    themeLabel: "Exposure",
    recommendation: "Watch highlights"
  });
  Repo.CoachingRepository.save(rec);
  Repo.CoachingRepository.setFeedback(rec.uuid, "helpful");
  let prefs = Repo.PreferencesRepository.load();
  assert("helpful increments", prefs.themeFeedback.exposure && prefs.themeFeedback.exposure.helpful >= 1);

  Repo.CoachingRepository.setFeedback(rec.uuid, "not_relevant");
  Repo.PreferencesRepository.recordThemeFeedback("exposure", "not_relevant");
  prefs = Repo.PreferencesRepository.load();
  // Force two not_relevant with zero helpful for skip rule — reset helpful via fresh family
  Repo.PreferencesRepository.reset();
  Repo.PreferencesRepository.recordThemeFeedback("color", "not_relevant");
  Repo.PreferencesRepository.recordThemeFeedback("color", "not_relevant");
  assert(
    "repeated not_relevant skips theme",
    Pers.shouldSkipTheme(Repo.PreferencesRepository.load(), [], "color")
  );

  // ——— Memory records structure ———
  const records = Pers.buildMemoryRecords(block, {
    photoId: "p1",
    shootId: "s1",
    photoCount: 36,
    shootCount: 5
  });
  assert("memory has uuid", records[0] && records[0].uuid);
  assert("memory has theme", records[0] && records[0].coachingTheme);
  assert("memory has recommendation", records[0] && records[0].recommendation);
  assert("memory has evidence", records[0] && records[0].evidenceUsed);
  assert("memory wasRepeated flag", typeof records[0].wasRepeated === "boolean");

  // ——— Landscape not overstated in outing ———
  assert(
    "outing does not center landscape experiment",
    !/landscape experiment|established landscape/i.test(plan.summary || ""),
    plan.summary
  );

  // ——— Existing profile tests still conceptually hold ———
  assert(
    "profile still woodland dominant",
    seeded.profile.likelyNiches[0] && /woodland/i.test(seeded.profile.likelyNiches[0].label)
  );
  const landscape = seeded.profile.likelyNiches.find((n) => /landscape/i.test(n.label));
  assert(
    "landscape remains low confidence / experimental",
    landscape &&
      (landscape.claimStrength === "experimental" || landscape.confidencePercent <= 35)
  );

  if (failures.length) {
    console.log("\n" + failures.length + " failure(s)");
    process.exit(1);
  }
  console.log("\nAll personalized coaching tests passed.");
}

run();
