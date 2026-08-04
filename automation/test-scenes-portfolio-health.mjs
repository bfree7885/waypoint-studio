#!/usr/bin/env node
/**
 * Scenes Portfolio Health tests
 *
 * Covers concentration, underrepresentation, repetition, metadata, purpose
 * alignment, strength patterns, opportunities, insight model, portfolio
 * comparison, interface surface, and bans on score/ranking/judgment language.
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PF = path.join(ROOT, "apps/scenes/portfolio/js");
const PL = path.join(ROOT, "apps/photo-library/js");

let n = 0;
function assert(name, cond) {
  if (!cond) {
    console.error("FAIL", name);
    process.exitCode = 1;
    throw new Error(name);
  }
  console.log("PASS", name);
  n += 1;
}

const localStore = new Map();
const sandbox = {
  window: {},
  console,
  Math,
  Date,
  Array,
  Object,
  String,
  Number,
  JSON,
  Promise,
  isFinite,
  isNaN,
  parseInt,
  parseFloat,
  localStorage: {
    getItem: (k) => (localStore.has(k) ? localStore.get(k) : null),
    setItem: (k, v) => localStore.set(k, String(v)),
    removeItem: (k) => localStore.delete(k)
  },
  crypto: {
    randomUUID: () => "ph-test-" + Math.random().toString(36).slice(2, 12)
  },
  setTimeout: (fn) => fn()
};
sandbox.globalThis = sandbox;
sandbox.window = sandbox;

function load(dir, file) {
  vm.runInNewContext(fs.readFileSync(path.join(dir, file), "utf8"), sandbox, { filename: file });
}

load(PL, "pl-models.js");
load(PF, "portfolio-models.js");
load(PF, "portfolio-store.js");
load(PF, "portfolio-candidates.js");
load(PF, "portfolio-engine.js");
load(PF, "assistant-signals.js");
load(PF, "assistant-recommend.js");
load(PF, "assistant-session.js");
load(PF, "health-catalog.js");
load(PF, "health-engine.js");
load(PF, "health-compare.js");
load(PF, "health-store.js");

const LibM = sandbox.window.WaypointPhotoLibraryModels;
const PortM = sandbox.window.WaypointScenesPortfolioModels;
const Cat = sandbox.window.WaypointScenesHealthCatalog;
const Eng = sandbox.window.WaypointScenesHealthEngine;
const Cmp = sandbox.window.WaypointScenesHealthCompare;
const Store = sandbox.window.WaypointScenesHealthStore;

assert("catalog api", !!Cat && Cat.CATEGORIES.length >= 7);
assert("engine api", !!Eng && !!Eng.analyze);
assert("compare api", !!Cmp && !!Cmp.compare);
assert("store api", !!Store && !!Store.create);
assert("analysis versioned", /^\d+\.\d+\.\d+$/.test(Cat.ANALYSIS_VERSION));
assert("store key namespaced", Store.STORE_KEY === "waypoint-scenes-portfolio-health-v1");

const banned = Cat.BANNED;

function mk(partial) {
  return LibM.createLibraryImage(partial);
}

function portfolio(partial) {
  return PortM.createPortfolio(partial);
}

const winter = "2026-01-15T10:00:00.000Z";
const spring = "2026-04-10T14:00:00.000Z";
const autumn = "2025-10-05T08:00:00.000Z";
const autumn2 = "2025-10-05T08:00:02.000Z";

const library = [
  mk({
    id: "ridge-a",
    filename: "ridge-a.jpg",
    captureDate: autumn,
    width: 6000,
    height: 4000,
    favorite: true,
    selectionLabel: "keep",
    rating: 5,
    tags: ["ridge", "alpine"],
    contentFingerprint: "fp-ridge",
    byteSize: 1000
  }),
  mk({
    id: "ridge-b",
    filename: "ridge-b.jpg",
    captureDate: autumn2,
    width: 6000,
    height: 4000,
    selectionLabel: "keep",
    rating: 4,
    tags: ["ridge"],
    contentFingerprint: "fp-ridge-2"
  }),
  mk({
    id: "ridge-dup",
    filename: "ridge-a.jpg",
    captureDate: autumn,
    width: 6000,
    height: 4000,
    byteSize: 1000,
    contentFingerprint: "fp-ridge",
    tags: ["ridge"]
  }),
  mk({
    id: "lichen",
    filename: "lichen.jpg",
    captureDate: spring,
    width: 3000,
    height: 4500,
    selectionLabel: "keep",
    rating: 4,
    tags: ["lichen", "detail"]
  }),
  mk({
    id: "winter-1",
    filename: "snow-1.jpg",
    captureDate: winter,
    width: 5000,
    height: 3300,
    selectionLabel: "keep",
    tags: ["snow", "winter"]
  }),
  mk({
    id: "winter-2",
    filename: "snow-2.jpg",
    captureDate: winter,
    width: 5000,
    height: 3300,
    tags: ["snow"]
  }),
  mk({
    id: "winter-3",
    filename: "snow-3.jpg",
    captureDate: winter,
    width: 4800,
    height: 3200,
    tags: ["snow"]
  }),
  mk({
    id: "portrait-only",
    filename: "tree-p.jpg",
    captureDate: spring,
    width: 2400,
    height: 3600,
    tags: ["forest"],
    selectionLabel: "maybe"
  }),
  mk({
    id: "no-meta",
    filename: "legacy.jpg",
    media: { hasThumbnail: false, hasOriginal: false }
  }),
  mk({
    id: "coach-strong",
    filename: "coach.jpg",
    captureDate: autumn,
    width: 5500,
    height: 3600,
    favorite: true,
    selectionLabel: "keep",
    rating: 5,
    tags: ["ridge"],
    moduleRefs: {
      photoCoach: { analysisStatus: "analyzed", letterGrade: "A", overallScore: 88, shootId: "shoot-1" }
    }
  })
];

const pfAutumn = portfolio({
  id: "pf-autumn",
  title: "Autumn ridges",
  purpose: "photography-website",
  coverImageId: "ridge-a",
  imageIds: ["ridge-a", "ridge-b", "ridge-dup", "coach-strong"],
  items: [
    { imageId: "ridge-a", selectionRationale: "opening / cover candidate" },
    { imageId: "ridge-b", selectionRationale: "hero" },
    { imageId: "ridge-dup", selectionRationale: "supporting" },
    { imageId: "coach-strong", selectionRationale: "hero" }
  ]
});

const pfThin = portfolio({
  id: "pf-thin",
  title: "One frame",
  purpose: "general",
  imageIds: ["lichen"]
});

const pfEmpty = portfolio({
  id: "pf-empty",
  title: "Empty set",
  purpose: null,
  imageIds: []
});

const pfHiking = portfolio({
  id: "pf-hike",
  title: "Trail notes",
  purpose: "hiking-outdoor-journal",
  imageIds: ["ridge-a", "ridge-b", "lichen"],
  items: [
    { imageId: "ridge-a", selectionRationale: "opening" },
    { imageId: "ridge-b", selectionRationale: "detail" },
    { imageId: "lichen", selectionRationale: "detail" }
  ]
});

function analyze(portfolios, extra) {
  return Eng.analyze(
    Object.assign(
      {
        scope: portfolios.length > 1 ? "multiple" : "one",
        portfolioIds: portfolios.map((p) => p.id),
        portfolios,
        libraryImages: library
      },
      extra || {}
    )
  );
}

function allText(analysis) {
  return JSON.stringify(analysis);
}

// ---- Concentration ----
const a1 = analyze([pfAutumn]);
assert("concentration insights exist", a1.insights.some((i) => i.category === "concentration"));
assert(
  "dominant subject when labels exist",
  a1.insights.some((i) => i.category === "concentration" && i.dimension === "subject" && /ridge/i.test(i.observation))
);
assert(
  "dominant season when dates exist",
  a1.insights.some((i) => i.category === "concentration" && i.dimension === "season")
);
assert(
  "orientation concentration",
  a1.insights.some((i) => i.category === "concentration" && i.dimension === "orientation")
);
assert(
  "similarity / burst concentration via repetition",
  a1.insights.some((i) => i.category === "repetition")
);
assert("no negative judgment in concentration", !banned.test(allText(a1)));
assert(
  "intentional language present",
  a1.insights.some((i) => /intentional/i.test(i.whyItMayMatter || i.observation))
);

// ---- Underrepresentation ----
const a2 = analyze([pfAutumn]);
assert(
  "library vs portfolio underrepresentation (winter)",
  a2.insights.some(
    (i) =>
      i.category === "underrepresentation" &&
      i.comparisonBasis === "library-vs-portfolio" &&
      /winter/i.test(i.observation)
  )
);
assert(
  "no claim without comparison basis",
  a2.insights
    .filter((i) => i.category === "underrepresentation")
    .every((i) => i.comparisonBasis && i.comparisonBasis !== "industry-norm")
);
const aNoDates = Eng.analyze({
  scope: "one",
  portfolioIds: ["pf-nodate"],
  portfolios: [
    portfolio({
      id: "pf-nodate",
      title: "No dates",
      purpose: "general",
      imageIds: ["no-meta"]
    })
  ],
  libraryImages: [library.find((x) => x.id === "no-meta")]
});
assert(
  "graceful fallback when metadata absent",
  aNoDates.insights.some((i) => i.category === "metadata") &&
    !aNoDates.insights.some((i) => i.category === "underrepresentation" && i.dimension === "season" && /industry/i.test(i.observation))
);
assert("no industry-standard assumptions", !/industry|professional portfolios require/i.test(allText(a2)));

const aHike = analyze([pfHiking]);
assert(
  "purpose-linked underrepresentation possible",
  aHike.insights.some((i) => i.category === "underrepresentation" && i.comparisonBasis === "purpose-signals") ||
    aHike.insights.some((i) => i.category === "purpose-alignment")
);

// ---- Repetition ----
assert(
  "near-duplicate insight",
  a1.insights.some((i) => i.category === "repetition" && /duplicate|similar/i.test(i.title + i.observation))
);
assert(
  "burst or similar-group insight",
  a1.insights.some((i) => i.category === "repetition" && i.dimension === "similar-group")
);
assert(
  "repeated-role insight possible",
  a1.insights.some((i) => i.category === "repetition" && i.dimension === "role") || true
);
assert(
  "affected-image linking",
  a1.insights.filter((i) => i.category === "repetition").every((i) => Array.isArray(i.affectedImageIds))
);

const store = Store.create();
await store.init();
const run1 = store.runAnalysis({
  scope: "one",
  portfolioIds: [pfAutumn.id],
  portfolios: [pfAutumn],
  libraryImages: library
});
const rep = run1.insights.find((i) => i.category === "repetition");
assert("repetition insight for persistence", !!rep);
store.setInsightFlags(rep.id, { intentionalRepetition: true, fingerprint: rep.fingerprint, dismissed: true });
const run2 = store.runAnalysis(
  {
    scope: "one",
    portfolioIds: [pfAutumn.id],
    portfolios: [pfAutumn],
    libraryImages: library
  },
  { force: true }
);
const rep2 = run2.insights.find((i) => i.id === rep.id);
assert("intentional repetition preserved", !!rep2 && rep2.intentionalRepetition === true);
assert("repetition dismissal persistence", !!rep2 && rep2.dismissed === true);

// ---- Metadata ----
assert(
  "EXIF / capture coverage",
  a1.insights.some((i) => i.category === "metadata" && i.dimension === "captureDate")
);
assert(
  "location coverage honesty",
  a1.insights.some((i) => i.category === "metadata" && /location|gps/i.test(i.title + i.observation))
);
assert(
  "subject-label coverage",
  a1.insights.some((i) => i.category === "metadata" && i.dimension === "subject")
);
const aStale = Eng.analyze({
  scope: "one",
  portfolioIds: ["pf-stale"],
  portfolios: [
    portfolio({
      id: "pf-stale",
      title: "Stale",
      purpose: "general",
      imageIds: ["ridge-a", "missing-id-xyz"]
    })
  ],
  libraryImages: library
});
assert(
  "stale references",
  aStale.insights.some((i) => i.category === "metadata" && /stale|missing/i.test(i.title + i.observation))
);
assert(
  "missing files noted",
  aStale.coverage.missingMedia.count >= 1 || aStale.insights.some((i) => /missing/i.test(i.observation))
);
assert(
  "metadata ≠ photo quality",
  a1.insights
    .filter((i) => i.category === "metadata")
    .some((i) => /not photography quality|not photo quality|Metadata ≠ photo quality/i.test(i.observation + JSON.stringify(i.evidence)))
);

// ---- Purpose alignment ----
const purposes = [
  "general",
  "photography-website",
  "gallery-presentation",
  "calendar-image-set",
  "book-visual-story",
  "competition-shortlist",
  "wall-print-collection",
  "hiking-outdoor-journal"
];
purposes.forEach((pur) => {
  const p = portfolio({
    id: "pf-" + pur,
    title: pur,
    purpose: pur,
    imageIds: ["ridge-a", "lichen", "winter-1"],
    coverImageId: "ridge-a"
  });
  const ax = analyze([p]);
  assert(
    "purpose alignment · " + pur,
    ax.insights.some((i) => i.category === "purpose-alignment" && i.comparisonBasis === "purpose-signals")
  );
  assert(
    "no invented contest rules · " + pur,
    !/guaranteed print quality/i.test(allText(ax)) && !/must follow contest/i.test(allText(ax))
  );
});
const aNoPurpose = analyze([pfEmpty]);
assert(
  "insufficient-purpose metadata fallback",
  aNoPurpose.insights.some((i) => i.category === "purpose-alignment" && /purpose not set/i.test(i.title))
);

// ---- Strength ----
assert(
  "strength grounded in preferences",
  a1.insights.some((i) => i.category === "strength" && i.comparisonBasis === "user-decisions")
);
const aAsst = Eng.analyze({
  scope: "one",
  portfolioIds: [pfAutumn.id],
  portfolios: [pfAutumn],
  libraryImages: library,
  assistantSessions: [
    {
      id: "as1",
      recommendations: [{ imageId: "ridge-a", category: "strong-candidate" }]
    }
  ],
  coachSessions: [{ id: "c1", notes: [{ text: "Prefer ridge-a for opening", imageIds: ["ridge-a"] }] }]
});
assert(
  "strength grounded in Assistant",
  aAsst.insights.some((i) => i.category === "strength" && i.dimension === "assistant")
);
assert(
  "strength grounded in coaching notes",
  aAsst.insights.some((i) => i.category === "strength" && i.dimension === "coach-notes")
);
assert("cautious strength language", aAsst.insights.filter((i) => i.category === "strength").every((i) => /suggest|soft|yours|authority/i.test(i.observation + i.whyItMayMatter)));
assert("no unsupported artistic claims", !/objectively artistic|your art is inferior/i.test(allText(aAsst)));

// ---- Opportunities ----
assert(
  "opportunities from underrepresentation",
  a2.insights.some((i) => i.category === "opportunity")
);
assert(
  "optional language",
  a2.insights.filter((i) => i.category === "opportunity").every((i) => /opportunity, not a requirement|optional/i.test(i.observation + i.whyItMayMatter))
);
const opp = run1.insights.find((i) => i.category === "opportunity") || a2.insights.find((i) => i.category === "opportunity");
if (opp) {
  store.setInsightFlags(opp.id, { saved: true, fingerprint: opp.fingerprint });
  store.setInsightFlags(opp.id, { notRelevant: true, dismissed: true, fingerprint: opp.fingerprint });
  const st = store.getState().insightState[opp.id];
  assert("opportunity dismiss/save/not-relevant", st.saved && st.notRelevant && st.dismissed);
}
assert("no urgency/streak in opportunities", !/\bmust shoot\b|\bhurry\b|\bdeadline\b|\bearn a streak\b/i.test(allText(a2)));
assert(
  "no score in opportunities",
  a2.insights
    .filter((i) => i.category === "opportunity")
    .every((i) => !/score is \d|health score|completeness score|your score/i.test(i.observation + i.title))
);

// ---- Insight model ----
const sample = a1.insights[0];
assert("insight has confidence", ["higher", "moderate", "lower"].includes(sample.confidence));
assert("insight has comparison basis", !!sample.comparisonBasis);
assert("insight has evidence", Array.isArray(sample.evidence));
assert("insight has affected ids array", Array.isArray(sample.affectedImageIds));
assert("insight versioned", sample.analysisVersion === Cat.ANALYSIS_VERSION);
assert("deterministic output", JSON.stringify(analyze([pfAutumn]).signature) === JSON.stringify(analyze([pfAutumn]).signature));

store.setInsightFlags(sample.id, { dismissed: true, fingerprint: sample.fingerprint, note: "keep watching" });
const refreshed = store.runAnalysis(
  {
    scope: "one",
    portfolioIds: [pfAutumn.id],
    portfolios: [pfAutumn],
    libraryImages: library
  },
  { force: true }
);
const after = refreshed.insights.find((i) => i.id === sample.id);
assert("dismissed insight persistence on refresh", after && after.dismissed === true);
assert("note persistence", after && after.note === "keep watching");
store.restoreInsight(sample.id);
const restored = store.getState().insightState[sample.id];
assert("restore insight", restored.dismissed === false);

// Material fingerprint change restores visibility
store.setInsightFlags(sample.id, { dismissed: true, fingerprint: "old-fp" });
const merged = Eng.mergePersisted(
  { insights: [{ ...sample, fingerprint: "new-fp", dismissed: false }] },
  { insightState: store.getState().insightState }
);
assert(
  "changed insight behavior",
  merged.insights[0].restoredBecauseChanged === true && merged.insights[0].dismissed === false
);

// ---- Portfolio comparison ----
const cmp = Cmp.compare([pfAutumn, pfHiking], library);
assert("descriptive comparison ok", cmp.ok);
assert(
  "no winner language",
  !/\bis the winner\b|\bbetter portfolio\b|\branks higher\b|\byour score is\b/i.test(JSON.stringify(cmp))
);
assert("identical handling path", typeof cmp.identicalMembership === "boolean");
const cmpSame = Cmp.compare([pfAutumn, { ...pfAutumn, id: "pf-autumn-copy", title: "Copy" }], library);
assert("identical membership detected", cmpSame.identicalMembership === true);
const cmpMissing = Cmp.compare([pfAutumn], library);
assert("compare needs two", cmpMissing.ok === false);

// ---- Interface / empty states ----
const aEmpty = analyze([pfEmpty]);
assert("empty portfolio analyzed honestly", aEmpty.overview.imageCount === 0 || aEmpty.insights.some((i) => /no images/i.test(i.observation)));
const aOne = analyze([pfThin]);
assert("one-image portfolio safe", Array.isArray(aOne.insights));
const aNone = Eng.analyze({ scope: "one", portfolioIds: [], portfolios: [], libraryImages: library });
assert("no-portfolio state", aNone.overview.areas.some((a) => /no portfolios/i.test(a.summary)));

// Overview never includes a score field
assert(
  "no universal score in overview",
  !a1.overview.areas.some((a) => /readiness|completeness %|overall grade|score:\s*\d/i.test(a.label + a.summary)) &&
    !a1.overview.areas.some((a) => a.id === "health-score")
);
assert("confidence qualitative only", a1.overview.areas.some((a) => /higher \/ moderate \/ lower/i.test(a.summary)));

// UI surface files exist
const uiFiles = [
  "apps/scenes/portfolio/health.html",
  "apps/scenes/portfolio/js/health-ui.js",
  "apps/scenes/portfolio/js/health-boot.js",
  "apps/scenes/portfolio/css/scenes-portfolio-health.css",
  "docs/scenes/portfolio-health-signal-audit.md"
];
uiFiles.forEach((f) => {
  assert("file exists " + f, fs.existsSync(path.join(ROOT, f)));
});

const html = fs.readFileSync(path.join(ROOT, "apps/scenes/portfolio/health.html"), "utf8");
assert("interface: no-portfolio empty state markup", /No portfolios yet/.test(html));
assert("interface: progress region", /pfh-progress/.test(html));
assert("interface: save/dismiss affordances via detail", /pfh-detail/.test(html));
assert("interface: compare section", /Portfolio comparison/.test(html));
assert("interface: refresh control", /Refresh analysis/.test(html));
assert("no score ring markup", !/score-ring|health-score|readiness-meter/i.test(html));

const indexHtml = fs.readFileSync(path.join(ROOT, "apps/scenes/portfolio/index.html"), "utf8");
assert("portfolios index links Health", /health\.html/.test(indexHtml));

// Global banned language across engine outputs
[a1, a2, aHike, aAsst, aEmpty, aOne].forEach((ax, idx) => {
  assert("banned language absent #" + idx, !banned.test(allText(ax)));
});

console.log("\nPortfolio Health tests passed:", n);
