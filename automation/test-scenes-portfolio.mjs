#!/usr/bin/env node
/**
 * Scenes Portfolio Foundation tests
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
  localStorage: {
    getItem: (k) => (localStore.has(k) ? localStore.get(k) : null),
    setItem: (k, v) => localStore.set(k, String(v)),
    removeItem: (k) => localStore.delete(k)
  },
  crypto: {
    randomUUID: () => "pf-test-" + Math.random().toString(36).slice(2, 10)
  },
  setTimeout: (fn) => fn()
};
sandbox.globalThis = sandbox;
sandbox.window = sandbox;

function load(dir, file) {
  vm.runInNewContext(fs.readFileSync(path.join(dir, file), "utf8"), sandbox, {
    filename: file
  });
}

load(PL, "pl-models.js");
load(PF, "portfolio-models.js");
load(PF, "portfolio-store.js");
load(PF, "portfolio-candidates.js");
load(PF, "portfolio-engine.js");

const M = sandbox.window.WaypointScenesPortfolioModels;
const Store = sandbox.window.WaypointScenesPortfolioStore;
const Cand = sandbox.window.WaypointScenesPortfolioCandidates;
const Eng = sandbox.window.WaypointScenesPortfolioEngine;
const LibM = sandbox.window.WaypointPhotoLibraryModels;

assert("portfolio models", !!M && !!M.createPortfolio);
assert("store key", Store.PORTFOLIOS_KEY === "waypoint-scenes-portfolios-v1");
assert("candidates api", !!Cand.suggestCandidates);
assert("engine factory", !!Eng.create);

const blank = M.createPortfolio({ title: "  " });
assert("default title", blank.title === "Untitled portfolio");
assert("health reserved null", blank.health === null);
assert("private default", blank.private === true);
assert("empty images", blank.imageIds.length === 0);

const engine = Eng.create();
await engine.init();
assert("init ready", engine.isReady());
assert("starts empty", engine.list().length === 0);

const p = engine.createPortfolio({
  title: "Catskills Autumn",
  purpose: "Seasonal journal",
  description: "Quiet frames from October walks"
});
assert("create id", !!p.id);
assert("create purpose", p.purpose === "Seasonal journal");
assert("list one", engine.list().length === 1);

engine.renamePortfolio(p.id, "Catskills Autumn Edit");
assert("rename", engine.get(p.id).title === "Catskills Autumn Edit");

engine.updatePortfolio(p.id, { notes: "Prefer mist and boardwalks" });
assert("notes persist", engine.get(p.id).notes.indexOf("mist") >= 0);

const add = engine.addImages(p.id, ["img-a", "img-b"], {
  source: "suggestion",
  selectionRationale: "You labeled this Keep during review."
});
assert("add images", add.added.length === 2);
assert("ordered", engine.get(p.id).imageIds.join(",") === "img-a,img-b");
assert(
  "rationale stored",
  engine.get(p.id).items[0].selectionRationale.indexOf("Keep") >= 0
);

engine.setCover(p.id, "img-b");
assert("cover", engine.get(p.id).coverImageId === "img-b");

engine.moveImage(p.id, "img-b", -1);
assert("reorder via move", engine.get(p.id).imageIds[0] === "img-b");

engine.reorderImages(p.id, ["img-a", "img-b"]);
assert("reorder explicit", engine.get(p.id).imageIds[0] === "img-a");

engine.removeImage(p.id, "img-a");
assert("remove", engine.get(p.id).imageIds.join(",") === "img-b");
assert("cover follows membership", engine.get(p.id).coverImageId === "img-b");

// Persistence across engine instances
const engine2 = Eng.create();
await engine2.init();
assert("persisted across engines", engine2.list().length === 1);
assert("persisted title", engine2.get(p.id).title === "Catskills Autumn Edit");

assert("delete requires existing", engine2.deletePortfolio("missing") === false);
assert("delete ok", engine2.deletePortfolio(p.id) === true);
assert("deleted gone", engine2.list().length === 0);

const engine3 = Eng.create();
await engine3.init();
assert("delete persisted", engine3.list().length === 0);

// Candidate logic — insufficient data
const bare = [
  LibM.createLibraryImage({ id: "x1", filename: "a.jpg" }),
  LibM.createLibraryImage({ id: "x2", filename: "b.jpg" })
];
const none = Cand.suggestCandidates(bare, { selectedIds: [] });
assert("insufficient-data status", none.status === "insufficient-data");
assert("no fake suggestions", none.suggestions.length === 0);
assert("honest message", /Not enough review/i.test(none.message));

// Candidate logic — real evidence
const rich = [
  LibM.createLibraryImage({
    id: "keep1",
    filename: "keeper.jpg",
    selectionLabel: "keep",
    favorite: true,
    rating: 5,
    media: { hasThumbnail: true, thumbnailDataUrl: "data:image/jpeg;base64,aa" }
  }),
  LibM.createLibraryImage({
    id: "maybe1",
    filename: "maybe.jpg",
    selectionLabel: "maybe",
    rating: 3
  }),
  LibM.createLibraryImage({
    id: "reject1",
    filename: "reject.jpg",
    selectionLabel: "reject"
  }),
  LibM.createLibraryImage({
    id: "graded",
    filename: "graded.jpg",
    moduleRefs: {
      photoCoach: { analysisStatus: "analyzed", letterGrade: "A", overallScore: 88 }
    }
  }),
  LibM.createLibraryImage({
    id: "dup",
    filename: "keeper.jpg",
    byteSize: 1000,
    contentFingerprint: "fp-1",
    selectionLabel: "keep"
  }),
  LibM.createLibraryImage({
    id: "orig",
    filename: "keeper-orig.jpg",
    byteSize: 1000,
    contentFingerprint: "fp-1",
    selectionLabel: "keep"
  })
];

const sug = Cand.suggestCandidates(rich, { selectedIds: [] });
assert("suggestions present", sug.suggestions.length >= 2);
assert(
  "reject excluded",
  sug.suggestions.every((s) => s.imageId !== "reject1")
);
assert(
  "honest labels only",
  sug.suggestions.every((s) =>
    ["Suggested", "Likely candidate", "Worth reviewing", "Similar to another selection"].includes(
      s.label
    )
  )
);
assert(
  "explanations when evidence",
  sug.suggestions.every((s) => s.explanation && s.explanation.length > 8)
);

const pf = engine3.createPortfolio({ title: "Similarity check" });
engine3.addImages(pf.id, ["orig"]);
const sim = engine3.suggestForPortfolio(pf.id, rich);
assert(
  "similar surfaced when selecting",
  sim.suggestions.some((s) => s.kind === "similar" || /fingerprint|duplicate/i.test(s.explanation))
);

// Responsive / a11y surface checks on HTML+CSS
const html = fs.readFileSync(
  path.join(ROOT, "apps/scenes/portfolio/index.html"),
  "utf8"
);
const css = fs.readFileSync(
  path.join(ROOT, "apps/scenes/portfolio/css/scenes-portfolio.css"),
  "utf8"
);
assert("portfolio page title", /Purpose portfolios/.test(html));
assert("create control", /id="pf-create"/.test(html));
assert("delete confirm dialog", /role="dialog"/.test(html) && /pf-confirm/.test(html));
assert("no lorem", !/lorem ipsum/i.test(html));
assert("no fake sample portfolios copy", /No portfolios yet/.test(html));
assert("skip link", /Skip to portfolios/.test(html));
assert("responsive breakpoints", /@media \(min-width: 640px\)/.test(css));
assert("focus visible", /:focus-visible/.test(css));
assert("hidden overrides display", /pf-editor\[hidden\]/.test(css));
assert("scenes product shell", /data-product="scenes"/.test(html));

const home = fs.readFileSync(path.join(ROOT, "apps/scenes/index.html"), "utf8");
assert("home links portfolio", /portfolio\//.test(home));

const nav = JSON.parse(
  fs.readFileSync(path.join(ROOT, "design-system/ecosystem/nav-registry.json"), "utf8")
);
const scenes = nav.apps.find((a) => a.id === "scenes");
assert(
  "nav feature portfolio",
  scenes.features.some((f) => f.id === "portfolio")
);

const navConfig = fs.readFileSync(
  path.join(ROOT, "design-system/js/platform/wds-app-nav-config.js"),
  "utf8"
);
assert("nav config portfolio", /apps\/scenes\/portfolio\//.test(navConfig));

const smoke = fs.readFileSync(path.join(ROOT, "automation/smoke-browser.mjs"), "utf8");
assert("smoke portfolio route", /path: "\/apps\/scenes\/portfolio\/"/.test(smoke));

const recon = fs.readFileSync(
  path.join(ROOT, "docs/scenes/current-state-reconciliation.md"),
  "utf8"
);
assert("reconciliation note", /Portfolio Foundation/.test(recon));

console.log("\nAll Scenes Portfolio tests passed (" + n + ").");
