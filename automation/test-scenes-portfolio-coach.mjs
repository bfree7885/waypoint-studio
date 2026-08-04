#!/usr/bin/env node
/**
 * Scenes Portfolio Coach tests
 *
 * Covers comparative coaching: compare facts, coaching-point generation
 * (Observation → Why → Tradeoff → Portfolio context → decision prompt),
 * qualitative confidence, banned definitive language, user decisions,
 * personal notes persistence, role overrides, portfolio actions (explicit
 * only), edge states, and interface surface checks.
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
    randomUUID: () => "pc-test-" + Math.random().toString(36).slice(2, 12)
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
load(PF, "coach-compare.js");
load(PF, "coach-generate.js");
load(PF, "coach-store.js");

const LibM = sandbox.window.WaypointPhotoLibraryModels;
const Compare = sandbox.window.WaypointScenesCoachCompare;
const Gen = sandbox.window.WaypointScenesCoachGenerate;
const Coach = sandbox.window.WaypointScenesCoachStore;
const PortEng = sandbox.window.WaypointScenesPortfolioEngine;
const Sessions = sandbox.window.WaypointScenesAssistantSessions;

assert("compare api", !!Compare && !!Compare.comparePair);
assert("generate api", !!Gen && !!Gen.generate);
assert("coach store api", !!Coach && !!Coach.create);
assert("analysis versioned", /^\d+\.\d+\.\d+$/.test(Gen.ANALYSIS_VERSION));
assert("compare versioned", /^\d+\.\d+\.\d+$/.test(Compare.COMPARE_VERSION));
assert("store key namespaced", Coach.STORE_KEY === "waypoint-scenes-portfolio-coach-v1");

const banned =
  /\b(objectively better|objectively worse|bad photo|professional quality|correct composition|should be rejected|score of \d+|best overall|great composition|excellent photo|portfolio-worthy)\b/i;

function assertCleanPoints(points, label) {
  points.forEach((p) => {
    ["observation", "whyItMayMatter", "tradeoff", "portfolioContext", "decisionPrompt"].forEach((k) => {
      if (p[k]) assert(label + " no banned in " + k, !banned.test(p[k]));
    });
    assert(label + " has structure", !!(p.observation && p.whyItMayMatter && p.tradeoff && p.decisionPrompt));
    assert(label + " confidence qualitative", ["higher", "moderate", "lower"].indexOf(p.confidence) >= 0);
    assert(label + " has category", !!p.category);
    assert(label + " versioned", p.analysisVersion === Gen.ANALYSIS_VERSION);
  });
}

// ---- frame comparison from real signals ----
const t0 = "2026-05-01T10:00:00.000Z";
const t1 = "2026-05-01T10:00:02.000Z";
const imgA = LibM.createLibraryImage({
  id: "a1",
  filename: "heron-wide.jpg",
  captureDate: t0,
  width: 6000,
  height: 4000,
  favorite: true,
  selectionLabel: "keep",
  rating: 5,
  tags: ["heron", "marsh"],
  contentFingerprint: "fp-1"
});
const imgB = LibM.createLibraryImage({
  id: "b1",
  filename: "heron-tight.jpg",
  captureDate: t1,
  width: 3000,
  height: 4000,
  selectionLabel: "maybe",
  rating: 3,
  tags: ["heron"],
  contentFingerprint: "fp-2",
  moduleRefs: { photoCoach: { analysisStatus: "analyzed", letterGrade: "B", overallScore: 78 } }
});

const cmp = Compare.comparePair(imgA, imgB, { source: "similar-group", group: { id: "g1", kind: "burst", reason: "burst window" } });
assert("compare ids", cmp.imageIdA === "a1" && cmp.imageIdB === "b1");
assert("frame has aspect fact", cmp.frameFacts.some((f) => f.key === "aspect"));
assert("frame has timing fact", cmp.frameFacts.some((f) => f.key === "timing"));
assert("frame has resolution fact", cmp.frameFacts.some((f) => f.key === "resolution"));
assert("frame has rating fact", cmp.frameFacts.some((f) => f.key === "rating"));
assert("roles suggested without winner", cmp.rolesA.length >= 1 && cmp.rolesB.length >= 1);

const gen = Gen.generate(cmp, {});
assert("generate ok status", gen.status === "ok" || gen.status === "insufficient-data");
assert("has coaching points", gen.points.length >= 2);
assertCleanPoints(gen.points, "burst pair");
assert(
  "modes present",
  gen.points.some((p) => p.mode === "frame") &&
    gen.points.some((p) => p.mode === "role")
);
assert(
  "technical vs creative distinguished",
  gen.points.some((p) => p.kind === "technical") && gen.points.some((p) => p.kind === "creative" || p.kind === "mixed")
);
assert(
  "evidence on points",
  gen.points.some((p) => Array.isArray(p.evidence) && (p.evidence.length > 0 || p.category === "insufficient-evidence"))
);

// duplicate fingerprint pair
const dupA = LibM.createLibraryImage({ id: "d1", filename: "x.jpg", contentFingerprint: "same", width: 2000, height: 1500 });
const dupB = LibM.createLibraryImage({ id: "d2", filename: "y.jpg", contentFingerprint: "same", width: 2000, height: 1500 });
const dupCmp = Compare.comparePair(dupA, dupB, {});
const dupGen = Gen.generate(dupCmp, {});
assert("duplicate repetition category", dupGen.points.some((p) => p.category === "portfolio-repetition" || /fingerprint|duplicate/i.test(p.observation)));
assertCleanPoints(dupGen.points, "dup");

// ---- portfolio-fit ----
const port = PortEng.getShared();
await port.init();
const pf = port.createPortfolio({
  title: "Marsh morning",
  purpose: "heron wetland quiet",
  imageIds: ["a1"]
});
// seed library context for fit
const fitCmp = Compare.comparePair(imgA, imgB, {
  portfolio: port.get(pf.id),
  libraryImages: [imgA, imgB],
  source: "portfolio-alt"
});
assert("fit membership fact", fitCmp.fitFacts.some((f) => f.key === "membership"));
const fitGen = Gen.generate(fitCmp, {});
assert("fit points include portfolio-fit mode", fitGen.points.some((p) => p.mode === "portfolio-fit"));
assert("cover / variety categories appear", fitGen.points.some((p) => /cover|variety|repetition|narrative|insufficient/i.test(p.category)));
assertCleanPoints(fitGen.points, "fit");

// ---- no portfolio ----
const noPf = Compare.comparePair(imgA, imgB, {});
const noPfGen = Gen.generate(noPf, { modes: ["portfolio-fit"] });
assert("no portfolio honest", noPfGen.points.some((p) => /no portfolio/i.test(p.observation) || p.category === "insufficient-evidence"));

// ---- single image / insufficient pair ----
const one = Gen.generate({ imageIdA: "a1", imageIdB: null, labelA: "only", frameFacts: [], fitFacts: [], rolesA: [], rolesB: [] }, {});
assert("single image status", one.status === "insufficient-pair");
assert("single image point", one.points[0].category === "insufficient-evidence");

// ---- identical signals ----
const twin1 = LibM.createLibraryImage({ id: "t1", filename: "t1.jpg" });
const twin2 = LibM.createLibraryImage({ id: "t2", filename: "t2.jpg" });
const twinGen = Gen.generate(Compare.comparePair(twin1, twin2, {}));
assert("identical / sparse => insufficient present", twinGen.points.some((p) => p.category === "insufficient-evidence"));
assertCleanPoints(twinGen.points, "twins");

// ---- missing media ----
const miss = LibM.createLibraryImage({ id: "m1", filename: "gone.jpg" });
miss.media = { hasThumbnail: false, hasOriginal: false, thumbnailDataUrl: null };
const ok = LibM.createLibraryImage({ id: "m2", filename: "ok.jpg", width: 1000, height: 800, favorite: true });
ok.media = { hasThumbnail: true, hasOriginal: true, thumbnailDataUrl: "data:image/svg+xml,x" };
const missGen = Gen.generate(Compare.comparePair(miss, ok, {}));
assert("missing media coached", missGen.points.some((p) => /missing|media/i.test(p.observation + p.whyItMayMatter)));

// ---- coach store: decisions + notes + persistence ----
const engine = Coach.create();
await engine.init();
const sess = engine.openComparison({
  imgA,
  imgB,
  portfolio: port.get(pf.id),
  libraryImages: [imgA, imgB],
  source: "manual",
  assistantSessionId: "asst-1"
});
assert("coach session created", !!sess.id);
assert("points persisted on session", sess.points.length >= 1);
assert("decision empty preference", sess.decision.preference === null);

engine.setPreference(sess.id, "prefer-a");
assert("prefer A", engine.get(sess.id).decision.preference === "prefer-a");
engine.setPreference(sess.id, "keep-both");
assert("keep both", engine.get(sess.id).decision.preference === "keep-both");
engine.setPreference(sess.id, "keep-neither");
assert("keep neither", engine.get(sess.id).decision.preference === "keep-neither");

engine.setRoles(sess.id, "hero-or-subject", "supporting", true);
assert("role override", engine.get(sess.id).decision.roleOverride === true);
assert("roles set", engine.get(sess.id).decision.roles.a === "hero-or-subject");

const pointId = sess.points[0].id;
engine.markPoint(sess.id, pointId, "helpful");
assert("helpful marked", engine.get(sess.id).decision.helpfulPointIds.indexOf(pointId) >= 0);
engine.markPoint(sess.id, pointId, "dismiss");
assert("dismiss moves off helpful", engine.get(sess.id).decision.dismissedPointIds.indexOf(pointId) >= 0);
assert("dismiss clears helpful", engine.get(sess.id).decision.helpfulPointIds.indexOf(pointId) < 0);

const note = engine.addNote(sess.id, "The wider frame keeps the reeds — I may want that breathing room.");
assert("note saved", !!note && /reeds/.test(note.text));
assert("notes for image", engine.notesForImage("a1").length >= 1);
assert("notes for session", engine.notesForSession(sess.id).length >= 1);

// reopen same pair preserves decision
const again = engine.openComparison({
  imgA,
  imgB,
  portfolio: port.get(pf.id),
  libraryImages: [imgA, imgB],
  source: "manual",
  assistantSessionId: "asst-1"
});
assert("reuse session id", again.id === sess.id);
assert("decision survives regenerate", again.decision.preference === "keep-neither");
assert("roles survive regenerate", again.decision.roles.a === "hero-or-subject");

// persistence across engines
const engine2 = Coach.create();
await engine2.init();
assert("session persisted", !!engine2.get(sess.id));
assert("notes persisted", engine2.notesForSession(sess.id).length >= 1);

// explicit portfolio add recording (engine does not silently mutate — caller adds)
engine2.recordAdded(sess.id, "b1");
assert("added recorded", engine2.get(sess.id).decision.addedImageIds.indexOf("b1") >= 0);

// invalid preference rejected
assert("invalid pref rejected", engine2.setPreference(sess.id, "winner") === null);

// ---- assistant session still independent ----
const asst = Sessions.create();
await asst.init();
const as = asst.startSession({ source: { type: "library", ref: null, label: "Lib" }, images: [imgA, imgB] });
assert("assistant session still works", !!as.id && Object.keys(as.recommendations).length === 2);

// ---- interface / a11y surface ----
const html = fs.readFileSync(path.join(ROOT, "apps/scenes/portfolio/assistant.html"), "utf8");
const css = fs.readFileSync(path.join(ROOT, "apps/scenes/portfolio/css/scenes-portfolio-assistant.css"), "utf8");
const ui = fs.readFileSync(path.join(ROOT, "apps/scenes/portfolio/js/assistant-ui.js"), "utf8");

assert("html loads coach modules", /coach-compare\.js/.test(html) && /coach-generate\.js/.test(html) && /coach-store\.js/.test(html));
assert("html has coach region", /id="pfc-coach"/.test(html));
assert("coach in hero copy", /Portfolio Coach/i.test(html));
assert("ui opens coach", /openCoach/.test(ui) && /Portfolio Coach/.test(ui));
assert("ui user controls", /prefer-a/.test(ui) && /keep-both/.test(ui) && /keep-neither/.test(ui));
assert("ui personal notes", /pfc-note-save/.test(ui));
assert("ui evidence toggle", /data-coach-evidence/.test(ui));
assert("ui role override", /data-role-side/.test(ui));
assert("css coach layout", /\.pfc-coach/.test(css) && /\.pfc-photos/.test(css));
assert("css mobile tabs", /\.pfc-tab/.test(css));
assert("css desktop side-by-side", /grid-template-columns:\s*1fr 1fr/.test(css) || /minmax\(0,\s*1\.1fr\)/.test(css));
assert("css hidden coach", /\.pfc-coach\[hidden\]/.test(css));
assert("css focus visible coach", /\.pfc-tab:focus-visible/.test(css));
assert("css reduced motion coach", /prefers-reduced-motion/.test(css) && /\.pfc-point/.test(css));
assert("no coming soon", !/coming soon/i.test(html));
assert("no lorem", !/lorem ipsum/i.test(html));

// signal audit + preserved prior docs
const audit = fs.readFileSync(path.join(ROOT, "docs/scenes/portfolio-coach-signal-audit.md"), "utf8");
assert("coach audit available signals", /Available coaching signals/i.test(audit));
assert("coach audit used signals", /USED this sprint/i.test(audit));
assert("coach audit excluded", /EXCLUDED this sprint/i.test(audit));
assert("coach audit privacy", /Privacy/i.test(audit));
assert("coach audit performance", /Performance/i.test(audit));
assert(
  "prior assistant audit preserved",
  fs.existsSync(path.join(ROOT, "docs/scenes/portfolio-assistant-signal-audit.md"))
);
assert(
  "prior assistant owner review preserved",
  fs.existsSync(path.join(ROOT, "docs/scenes/portfolio-assistant-owner-review.md"))
);

// no pixel sharpness claims in generate source
const genSrc = fs.readFileSync(path.join(PF, "coach-generate.js"), "utf8");
assert("no fake sharpness claims", !/pixel sharpness is excellent/i.test(genSrc));
assert("mentions cannot inspect pixels", /cannot inspect pixel/i.test(genSrc));

console.log("\nAll Scenes Portfolio Coach tests passed (" + n + ").");
