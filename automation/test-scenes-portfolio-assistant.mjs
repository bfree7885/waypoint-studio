#!/usr/bin/env node
/**
 * Scenes Portfolio Assistant tests
 *
 * Covers the explainable candidate assistant: signal collection, recommendation
 * logic (categories + qualitative confidence + honesty), similar-frame grouping,
 * user control / decision persistence, recompute-without-overwrite, add-to-
 * portfolio integration, and interface/a11y surface checks.
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
    randomUUID: () => "cs-test-" + Math.random().toString(36).slice(2, 12)
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

const LibM = sandbox.window.WaypointPhotoLibraryModels;
const Sig = sandbox.window.WaypointScenesAssistantSignals;
const Rec = sandbox.window.WaypointScenesAssistantRecommend;
const Sessions = sandbox.window.WaypointScenesAssistantSessions;
const PortEng = sandbox.window.WaypointScenesPortfolioEngine;

// ---- module presence ----
assert("signals api", !!Sig && !!Sig.collectSignals && !!Sig.resolveSource);
assert("recommend api", !!Rec && !!Rec.analyze);
assert("sessions api", !!Sessions && !!Sessions.create);
assert("analysis versioned", /^\d+\.\d+\.\d+$/.test(Rec.ANALYSIS_VERSION));
assert(
  "session key namespaced",
  Sessions.SESSIONS_KEY === "waypoint-scenes-portfolio-candidate-sessions-v1"
);

// ---- signal collection is honest (no fabrication) ----
const bareImg = LibM.createLibraryImage({ id: "b1", filename: "raw.jpg" });
const bareSig = Sig.collectSignals(bareImg);
assert("bare no evidence", bareSig.evidenceCount === 0);
assert("bare rating null", bareSig.rating === null);
assert("bare coach null", bareSig.coach === null);
assert("bare camera null", bareSig.camera === null);

const richImg = LibM.createLibraryImage({
  id: "r1",
  filename: "keeper.jpg",
  favorite: true,
  selectionLabel: "keep",
  rating: 5,
  width: 4000,
  height: 3000,
  moduleRefs: { photoCoach: { analysisStatus: "analyzed", letterGrade: "A", overallScore: 91 } }
});
const richSig = Sig.collectSignals(richImg);
assert("rich evidence counted", richSig.evidenceCount >= 3);
assert("rich aspect landscape", richSig.aspect === "landscape");
assert("rich coach analyzed", richSig.coach && richSig.coach.analyzed === true);
assert("rich grade rank", richSig.coach.gradeRank === 5);

// ---- recommendation categories ----
const strong = Rec.recommendForImage(richSig, null);
assert("favorite+keep+5 => strong", strong.category === "strong-candidate");
assert("strong higher confidence", strong.confidence === "higher");
assert(
  "strong rationale cites evidence",
  strong.rationale.some((r) => /favorite/i.test(r)) && strong.rationale.length > 0
);

const supportingSig = Sig.collectSignals(
  LibM.createLibraryImage({ id: "s1", filename: "supp.jpg", selectionLabel: "maybe", rating: 3 })
);
const supporting = Rec.recommendForImage(supportingSig, null);
assert("maybe+3 => supporting", supporting.category === "supporting-image");
assert("supporting moderate", supporting.confidence === "moderate");

const reviewSig = Sig.collectSignals(LibM.createLibraryImage({ id: "n1", filename: "unknown.jpg" }));
const review = Rec.recommendForImage(reviewSig, null);
assert("no evidence => needs-review", review.category === "needs-review");
assert("needs-review lower confidence", review.confidence === "lower");
assert("needs-review honest rationale", review.rationale.length > 0 && /manually|missing/i.test(review.rationale[0]));

// ---- no banned filler language anywhere in rationale ----
const banned = /\b(AI selected|best overall|great composition|professional quality|excellent photo|portfolio-worthy)\b/i;
[strong, supporting, review].forEach((r) => {
  r.rationale.forEach((line) => {
    assert("no banned filler: " + line.slice(0, 24), !banned.test(line));
  });
});

// ---- reject handled honestly, never auto-removed, never auto-included ----
const rejectSig = Sig.collectSignals(
  LibM.createLibraryImage({ id: "rej1", filename: "rej.jpg", selectionLabel: "reject" })
);
const rejectRec = Rec.recommendForImage(rejectSig, null);
assert("reject => needs-review", rejectRec.category === "needs-review");
assert("reject rationale mentions reject", /reject/i.test(rejectRec.rationale.join(" ")));

const conflictSig = Sig.collectSignals(
  LibM.createLibraryImage({ id: "cf1", filename: "cf.jpg", selectionLabel: "reject", favorite: true })
);
const conflictRec = Rec.recommendForImage(conflictSig, null);
assert("conflict => needs-review", conflictRec.category === "needs-review");
assert("conflict flagged", /conflict/i.test(conflictRec.rationale.join(" ")) && conflictRec.subKind === "conflict");

// ---- similar-frame grouping: exact fingerprint duplicate ----
const dupA = LibM.createLibraryImage({ id: "dupA", filename: "a.jpg", contentFingerprint: "fp-x", selectionLabel: "keep" });
const dupB = LibM.createLibraryImage({ id: "dupB", filename: "b.jpg", contentFingerprint: "fp-x", selectionLabel: "keep" });
const groups = Rec.buildGroups([Sig.collectSignals(dupA), Sig.collectSignals(dupB)]);
assert("duplicate group formed", groups.length === 1 && groups[0].kind === "duplicate");
assert("duplicate group members", groups[0].imageIds.length === 2);

const dupAnalyze = Rec.analyze([dupA, dupB], {});
assert("duplicate categorized similar-frame", dupAnalyze.recommendations["dupA"].category === "similar-frame");
assert("duplicate subkind", dupAnalyze.recommendations["dupA"].subKind === "possible-duplicate");
assert("duplicate higher confidence", dupAnalyze.recommendations["dupA"].confidence === "higher");
assert("duplicate related ref", dupAnalyze.recommendations["dupA"].relatedImageIds.indexOf("dupB") >= 0);

// ---- burst grouping by capture time + aspect ----
const t0 = "2026-05-01T10:00:00.000Z";
const t1 = "2026-05-01T10:00:02.000Z";
const burstA = LibM.createLibraryImage({ id: "ba", filename: "ba.jpg", captureDate: t0, width: 4000, height: 3000 });
const burstB = LibM.createLibraryImage({ id: "bb", filename: "bb.jpg", captureDate: t1, width: 4000, height: 3000, favorite: true });
const burstGroups = Rec.buildGroups([Sig.collectSignals(burstA), Sig.collectSignals(burstB)]);
assert("burst group formed", burstGroups.length === 1 && burstGroups[0].kind === "burst");

const burstAnalyze = Rec.analyze([burstA, burstB], {});
assert("burst strong stays strong", burstAnalyze.recommendations["bb"].category === "strong-candidate");
assert("burst strong has related", burstAnalyze.recommendations["bb"].relatedImageIds.indexOf("ba") >= 0);
assert("burst weak => similar-frame", burstAnalyze.recommendations["ba"].category === "similar-frame");

// ---- insufficient data still returns honest, functional output ----
const noneAnalyze = Rec.analyze(
  [LibM.createLibraryImage({ id: "z1", filename: "z1.jpg" }), LibM.createLibraryImage({ id: "z2", filename: "z2.jpg" })],
  {}
);
assert("insufficient status", noneAnalyze.status === "insufficient-data");
assert("insufficient every needs-review", Object.keys(noneAnalyze.recommendations).every((id) => noneAnalyze.recommendations[id].category === "needs-review"));
assert("insufficient honest message", /Needs review|manually/i.test(noneAnalyze.message));

// ---- empty source ----
const emptyAnalyze = Rec.analyze([], {});
assert("empty status", emptyAnalyze.status === "empty");
assert("empty no recs", Object.keys(emptyAnalyze.recommendations).length === 0);

// ---- ordering puts strong first ----
const mixed = Rec.analyze([reviewSig && richImg, supportingSig && supportingSig, richImg, richImg].filter(Boolean) && [richImg, LibM.createLibraryImage({ id: "s2", filename: "s2.jpg", selectionLabel: "maybe" }), LibM.createLibraryImage({ id: "n2", filename: "n2.jpg" })], {});
assert("order strong first", mixed.order[0] === "r1");

// ---- source resolution ----
const lib = [
  LibM.createLibraryImage({ id: "L1", filename: "l1.jpg", collectionIds: ["col1"] }),
  LibM.createLibraryImage({ id: "L2", filename: "l2.jpg", collectionIds: ["col1"] }),
  LibM.createLibraryImage({ id: "L3", filename: "l3.jpg", moduleRefs: { photoCoach: { shootId: "shoot-9" } } })
];
const colRes = Sig.resolveSource({ type: "collection", ref: "col1" }, { libraryImages: lib, collections: [{ id: "col1", name: "Autumn" }] });
assert("collection source resolves", colRes.imageIds.length === 2 && /Autumn/.test(colRes.label));
const shootRes = Sig.resolveSource({ type: "shoot", ref: "shoot-9" }, { libraryImages: lib });
assert("shoot source resolves", shootRes.imageIds.length === 1 && shootRes.imageIds[0] === "L3");
const libRes = Sig.resolveSource({ type: "library" }, { libraryImages: lib });
assert("library source resolves all", libRes.imageIds.length === 3);
const listed = Sig.listSources({ libraryImages: lib, collections: [{ id: "col1", name: "Autumn" }], portfolios: [] });
assert("listSources includes collection + shoot", listed.some((s) => s.type === "collection") && listed.some((s) => s.type === "shoot"));

// ---- session lifecycle + user control + persistence ----
const engine = Sessions.create();
await engine.init();
assert("session engine ready", engine.isReady());

const sessionImages = [richImg, dupA, dupB, LibM.createLibraryImage({ id: "m1", filename: "m1.jpg", selectionLabel: "maybe" })];
const sess = engine.startSession({ source: { type: "library", ref: null, label: "Your Photo Library" }, images: sessionImages });
assert("session created", !!sess.id);
assert("session refs images", sess.imageIds.length === 4);
assert("session has recommendations", Object.keys(sess.recommendations).length === 4);
assert("session records analysis version", sess.analysisVersion === Rec.ANALYSIS_VERSION);

// user overrides a category
engine.setDecision(sess.id, "r1", { status: "strong", category: "supporting-image" });
assert("effective category = user override", engine.effectiveCategory(engine.get(sess.id), "r1") === "supporting-image");
assert("assistant suggestion preserved", engine.get(sess.id).recommendations["r1"].category === "strong-candidate");

// preferred-in-group
engine.setPreferredInGroup(sess.id, sess.groups[0].id, "dupA");
const afterPref = engine.get(sess.id);
assert("preferred set", afterPref.decisions["dupA"].preferredInGroup === true);
assert("others in group not preferred", afterPref.decisions["dupB"].preferredInGroup === false);

// dismiss / exclude
engine.setDecision(sess.id, "m1", { status: "excluded", dismissed: true });
assert("exclude recorded", engine.get(sess.id).decisions["m1"].status === "excluded");

// recompute must NOT overwrite decisions
const reImages = sessionImages.map((img) => img); // unchanged
const re = engine.reanalyze(sess.id, reImages);
assert("reanalyze keeps decisions", re.decisions["r1"].category === "supporting-image");
assert("reanalyze keeps exclude", re.decisions["m1"].status === "excluded");
assert("reanalyze keeps preferred", re.decisions["dupA"].preferredInGroup === true);
assert("reanalyze refreshes recs", re.recommendations["r1"].category === "strong-candidate");

// clear a decision -> revert to assistant suggestion
engine.clearDecision(sess.id, "r1");
assert("cleared decision reverts", engine.effectiveCategory(engine.get(sess.id), "r1") === "strong-candidate");

// persistence across engine instances
const engine2 = Sessions.create();
await engine2.init();
const reload = engine2.get(sess.id);
assert("session persisted", !!reload);
assert("decisions persisted", reload.decisions["m1"].status === "excluded");
assert("preferred persisted", reload.decisions["dupA"].preferredInGroup === true);

// ---- add-to-portfolio integration (no original altered) ----
const port = PortEng.getShared();
await port.init();
const pf = port.createPortfolio({ title: "Assistant picks" });
const added = port.addImages(pf.id, ["r1"], { source: "suggestion", selectionRationale: "You marked this a favorite." });
assert("added to portfolio", added.added.length === 1 && port.get(pf.id).imageIds.indexOf("r1") >= 0);
engine2.recordAddedToPortfolio(sess.id, "r1", pf.id);
assert("session records destination", engine2.get(sess.id).destinationPortfolioIds.indexOf(pf.id) >= 0);
assert("session marks added strong", engine2.get(sess.id).decisions["r1"].addedToPortfolioIds.indexOf(pf.id) >= 0);

// delete session
assert("delete session ok", engine2.deleteSession(sess.id) === true);
assert("session gone", engine2.get(sess.id) === null);

// ---- interface / a11y / visual surface checks ----
const html = fs.readFileSync(path.join(ROOT, "apps/scenes/portfolio/assistant.html"), "utf8");
const css = fs.readFileSync(path.join(ROOT, "apps/scenes/portfolio/css/scenes-portfolio-assistant.css"), "utf8");

assert("assistant page title", /Candidate review|Portfolio Assistant/i.test(html));
assert("assistant skip link", /wds-skip/.test(html));
assert("assistant scenes shell", /data-product="scenes"/.test(html));
assert("assistant loads signal modules", /assistant-signals\.js/.test(html) && /assistant-recommend\.js/.test(html) && /assistant-session\.js/.test(html));
assert("assistant loads library store", /pl-store\.js/.test(html));
assert("no coming soon", !/coming soon/i.test(html));
assert("no lorem", !/lorem ipsum/i.test(html));
assert("live region present", /aria-live/.test(html));
assert("assistant responsive breakpoint", /@media \(min-width/.test(css));
assert("assistant focus visible", /:focus-visible/.test(css));
assert("assistant hidden override", /\[hidden\]/.test(css));
assert("confidence not color-only (icon/text class)", /confidence/i.test(css));
assert("reduced motion respected", /prefers-reduced-motion/.test(css));

// links from portfolio workspace to assistant
const pfHtml = fs.readFileSync(path.join(ROOT, "apps/scenes/portfolio/index.html"), "utf8");
assert("portfolio links to assistant", /assistant\.html/.test(pfHtml));

// smoke route registered
const smoke = fs.readFileSync(path.join(ROOT, "automation/smoke-browser.mjs"), "utf8");
assert("smoke assistant route", /assistant\.html/.test(smoke));

// signal audit doc exists with required sections
const audit = fs.readFileSync(path.join(ROOT, "docs/scenes/portfolio-assistant-signal-audit.md"), "utf8");
assert("audit available signals section", /Available signals/i.test(audit));
assert("audit selected signals section", /SELECTED for this sprint/i.test(audit));
assert("audit excluded signals section", /EXCLUDED this sprint/i.test(audit));
assert("audit privacy section", /Privacy implications/i.test(audit));
assert("audit performance section", /Performance/i.test(audit));

console.log("\nAll Scenes Portfolio Assistant tests passed (" + n + ").");
