#!/usr/bin/env node
/**
 * Scenes Sprint 3 — Scene Library + Shoot Review Workspace
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SL = path.join(ROOT, "apps/waypoint-scenes/js/scene-library");

let passed = 0;
function assert(name, cond) {
  if (!cond) {
    console.error("FAIL", name);
    process.exitCode = 1;
    throw new Error(name);
  }
  console.log("PASS", name);
  passed += 1;
}

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

/* ---------- HTML / routing / placeholders ---------- */

assert("library page exists", exists("apps/waypoint-scenes/library/index.html"));
assert("scene detail page exists", exists("apps/waypoint-scenes/scene/index.html"));
assert("portfolio foundation exists", exists("apps/waypoint-scenes/portfolio/index.html"));
assert("export foundation exists", exists("apps/waypoint-scenes/export/index.html"));
assert("scene-library.css exists", exists("apps/waypoint-scenes/css/scene-library.css"));

const landing = read("apps/waypoint-scenes/index.html");
assert("landing links Scene Library", /href="library\/"/.test(landing));

const library = read("apps/waypoint-scenes/library/index.html");
assert("library has search", /id="sl-search"/.test(library));
assert("library has sort", /id="sl-sort"/.test(library));
assert("library has folder import", /webkitdirectory/.test(library));
assert("library has drop zone", /id="sl-drop"/.test(library));
assert("library loads scene modules", /scene-models\.js/.test(library) && /scene-library-ui\.js/.test(library));

const detail = read("apps/waypoint-scenes/scene/index.html");
assert("detail has hero mount", /id="sd-hero"/.test(detail));
assert("detail has summary mount", /id="sd-summary-mount"/.test(detail));
assert("detail has actions mount", /id="sd-actions-mount"/.test(detail));
assert("detail has grid", /id="sd-grid"/.test(detail));
assert("detail has photo detail panel", /id="sd-detail"/.test(detail));
assert("detail has thumb size control", /id="sd-thumb-size"/.test(detail));

const portfolio = read("apps/waypoint-scenes/portfolio/index.html");
assert("portfolio is foundation", /Foundation in progress/.test(portfolio));
assert("portfolio lists capabilities", /Best-of selection/.test(portfolio) && /duplicate/i.test(portfolio));
assert("portfolio disabled start", /disabled/.test(portfolio) && /not available yet/i.test(portfolio));
assert("portfolio no fake results", !/type="file"/.test(portfolio));

const journals = read("apps/waypoint-scenes/remember/index.html");
assert("journals foundation intact", /Outdoor Journals/.test(journals) && /Foundation in progress/.test(journals));
assert("journals lists Year in Nature", /Year in Nature/.test(journals));
assert("journals acknowledges sceneId", /sceneId/.test(journals));

const exportPage = read("apps/waypoint-scenes/export/index.html");
assert("export foundation", /Foundation in progress/.test(exportPage));
assert("export disabled CTA", /not available yet/i.test(exportPage));

const create = read("apps/waypoint-scenes/create/index.html");
assert("living scenes links library", /href="\.\.\/library\/"/.test(create));
assert("living scenes acknowledges sceneId", /sceneId/.test(create));

const coach = read("apps/photo-coach/index.html");
assert("photo coach acknowledges sceneId", /sceneId/.test(coach));

const nav = read("design-system/js/platform/wds-app-nav-config.js");
assert("nav has Scene Library", /"id":\s*"scene-library"/.test(nav));
assert("nav Scene Library href", /apps\/waypoint-scenes\/library\//.test(nav));
assert("nav has Portfolio Advisor", /portfolio-advisor/.test(nav));

const registry = read("design-system/ecosystem/nav-registry.json");
assert("nav-registry Scene Library", /scene-library/.test(registry));

const css = read("apps/waypoint-scenes/css/scene-library.css");
assert("css reduced motion", /prefers-reduced-motion/.test(css));
assert("css responsive breakpoints", /max-width:\s*860px/.test(css) && /max-width:\s*560px/.test(css));
assert("css Scenes accents", /--sl-aurora|--sl-violet|--sl-charcoal/.test(css));

/* ---------- Unit: Scene model / engine / ingest ---------- */

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
  URL: globalThis.URL,
  setTimeout: (fn) => fn(),
  localStorage: {
    getItem: (k) => (localStore.has(k) ? localStore.get(k) : null),
    setItem: (k, v) => localStore.set(k, String(v)),
    removeItem: (k) => localStore.delete(k)
  }
};
sandbox.globalThis = sandbox;
sandbox.window = sandbox;

function load(file) {
  const code = fs.readFileSync(path.join(SL, file), "utf8");
  vm.runInNewContext(code, sandbox, { filename: file });
}

load("scene-models.js");
load("scene-store.js");
load("scene-engine.js");
load("scene-demo.js");
load("scene-ingest.js");
load("scene-format.js");

const M = sandbox.window.WaypointSceneModels;
const Store = sandbox.window.WaypointSceneStore;
const Engine = sandbox.window.WaypointSceneEngine;
const Demo = sandbox.window.WaypointSceneDemo;
const Ingest = sandbox.window.WaypointSceneIngest;
const F = sandbox.window.WaypointSceneFormat;

assert("models module", !!M);
assert("store module", !!Store);
assert("engine module", !!Engine);
assert("demo module", !!Demo);
assert("ingest module", !!Ingest);
assert("format module", !!F);
assert("schema version", M.SCHEMA_VERSION === "1.0.0");

const photo = M.createPhoto({
  filename: "a.jpg",
  captureTime: "2026-07-24T18:30:00.000Z",
  camera: { make: "Sony", model: "ILCE-6700", lens: "18-135", iso: 200, shutter: "1/125", aperture: 4, focalLengthMm: 35 },
  subjectHints: ["forest"],
  favorite: true
});
assert("photo has id", !!photo.id);
assert("photo camera model", photo.camera.model === "ILCE-6700");
assert("photo favorite", photo.favorite === true);

const scene = M.createScene({
  title: "Milford Woods",
  location: "Milford, Pennsylvania",
  camera: "Sony a6700",
  captureDate: "2026-07-24T18:12:00.000Z",
  importSource: M.SOURCE.sample,
  photos: [photo],
  photoCount: 264,
  favoriteImageId: photo.id
});
assert("scene title", scene.title === "Milford Woods");
assert("scene photoCount declared", scene.photoCount === 264);
assert("scene has photos array", scene.photos.length === 1);
assert("scene exif summary available", scene.exifSummary && scene.exifSummary.available === true);
assert("scene status imported", scene.status === M.STATUS.imported);
assert("scene analysis not-started", scene.analysisStatus === M.CAPABILITY_STATUS.notStarted);

const summary = M.buildShootSummary(scene);
assert("summary photo count", summary.photoCount === 264);
assert("summary has subjects", summary.subjects.indexOf("forest") >= 0);
assert("summary weather placeholder", summary.weather && summary.weather.placeholder === true);
assert("summary AI placeholder", summary.aiObservations && summary.aiObservations.placeholder === true);

Engine.init({ seedDemo: false });
assert("engine save", Engine.save(scene) === true);
assert("engine get", Engine.get(scene.id).title === "Milford Woods");
assert("engine list includes", Engine.list().some((s) => s.id === scene.id));

const touched = Engine.touchOpened(scene.id);
assert("touchOpened sets lastOpenedAt", !!touched.lastOpenedAt);

assert("search by title", Engine.query({ q: "milford" }).length >= 1);
assert("search by camera", Engine.query({ q: "sony" }).length >= 1);
assert("search by location", Engine.query({ q: "pennsylvania" }).length >= 1);
assert("sort alpha", Engine.query({ sort: "alpha" }).length >= 1);
assert("sort capture", Engine.query({ sort: "capture" }).length >= 1);
assert("favorites filter", Engine.query({ favoriteOnly: true }).some((s) => s.id === scene.id));

Demo.ensureSeeded();
const demos = Engine.list();
assert("demo seed created scenes", demos.length >= 3);
const milford = Engine.get("scene-demo-milford-woods");
assert("milford demo exists", !!milford);
assert("milford photoCount 264", milford.photoCount === 264);
assert("milford has materialized photos", milford.photos.length >= 10);
assert("milford camera label", /Sony/i.test(milford.camera));

const milfordSummary = Engine.buildShootSummary(milford);
assert("milford summary time text", !!milfordSummary.timeText);
assert("milford summary focals", milfordSummary.focalLengths.length >= 1);
assert("milford summary subjects", milfordSummary.subjects.length >= 1);

// Importer payload contract
const importer = Ingest.ingestFromImporterPayload({
  title: "Card Import Test",
  camera: "Sony a6700",
  location: "Test Trail",
  captureDate: "2026-07-01T12:00:00.000Z",
  photos: [
    { filename: "1.jpg", thumbnailUrl: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", captureTime: "2026-07-01T12:00:00.000Z", camera: { make: "Sony", model: "ILCE-6700", iso: 100, focalLengthMm: 35 } },
    { filename: "2.jpg", thumbnailUrl: "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", captureTime: "2026-07-01T12:05:00.000Z", camera: { make: "Sony", model: "ILCE-6700", iso: 200, focalLengthMm: 70 } }
  ],
  storageLocations: ["Local mirror"]
});
assert("importer ingest ok", importer.ok === true);
assert("importer source", importer.scene.importSource === M.SOURCE.importer);
assert("importer saved", !!Engine.get(importer.scene.id));

// Folder files (File-like stubs)
function FakeFile(name, lastModified) {
  this.name = name;
  this.type = "image/jpeg";
  this.lastModified = lastModified || Date.now();
  this.webkitRelativePath = "MyShoot/" + name;
}
const folder = Ingest.ingestFromFolderFiles(
  [new FakeFile("a.jpg"), new FakeFile("b.jpg"), { name: "notes.txt", type: "text/plain" }],
  { importSource: M.SOURCE.manualFolder }
);
assert("folder ingest ok", folder.ok === true);
assert("folder skips non-images", folder.photoCount === 2);
assert("folder title from path", folder.scene.title === "MyShoot");

const empty = Ingest.ingestFromFolderFiles([], {});
assert("empty folder fails honestly", empty.ok === false);

// Format helpers
assert("format long date", /July/.test(F.formatLongDate("2026-07-24T18:00:00.000Z")));
assert("photo count label plural", F.photoCountLabel(264) === "264 photographs");
assert("photo count label singular", F.photoCountLabel(1) === "1 photograph");
assert("escape html", F.escapeHtml("<b>") === "&lt;b&gt;");

// Detail UI helpers (no DOM — just ensure module loads for API)
load("scene-detail-ui.js");
load("scene-library-ui.js");
assert("detail UI module", !!sandbox.window.WaypointSceneDetailUI);
assert("library UI module", !!sandbox.window.WaypointSceneLibraryUI);
assert("sceneIdFromUrl helper", typeof sandbox.window.WaypointSceneDetailUI.sceneIdFromUrl === "function");

// Virtualization presence in source
const detailUi = read("apps/waypoint-scenes/js/scene-library/scene-detail-ui.js");
assert("virtualized grid window", /visibleStart/.test(detailUi) && /BUFFER_ROWS/.test(detailUi));
assert("keyboard nav in grid", /ArrowRight/.test(detailUi) && /ArrowLeft/.test(detailUi));
assert("no full-res bulk load claim", /never load hundreds of full-resolution/i.test(detailUi) || /windowed/.test(detailUi));

// Action buttons are real links
assert("detail actions include Portfolio", /portfolio\/\?sceneId=/.test(detailUi));
assert("detail actions include Journals", /remember\/\?sceneId=/.test(detailUi));
assert("detail actions include Living Scenes", /create\/\?sceneId=/.test(detailUi));
assert("detail actions include Export", /export\/\?sceneId=/.test(detailUi));
assert("detail actions include Photo Coach", /photo-coach\/\?sceneId=/.test(detailUi));

console.log("\nScenes Sprint 3 checks:", passed, "passed");
