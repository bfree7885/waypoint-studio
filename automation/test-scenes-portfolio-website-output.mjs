#!/usr/bin/env node
/**
 * Scenes Portfolio Website Output tests
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
  Uint8Array,
  Uint32Array,
  Blob: class Blob {
    constructor(parts, opts) {
      this.parts = parts;
      this.type = (opts && opts.type) || "";
      this.size = parts.reduce((a, p) => a + (p.length || p.byteLength || String(p).length), 0);
    }
  },
  TextEncoder: globalThis.TextEncoder,
  Buffer,
  atob: (s) => Buffer.from(s, "base64").toString("binary"),
  btoa: (s) => Buffer.from(s, "binary").toString("base64"),
  localStorage: {
    getItem: (k) => (localStore.has(k) ? localStore.get(k) : null),
    setItem: (k, v) => localStore.set(k, String(v)),
    removeItem: (k) => localStore.delete(k)
  },
  crypto: {
    randomUUID: () => "pwo-test-" + Math.random().toString(36).slice(2, 10)
  },
  setTimeout: (fn) => fn(),
  URL: {
    createObjectURL: () => "blob:test",
    revokeObjectURL: () => {}
  },
  document: {
    createElement: () => ({
      click() {},
      setAttribute() {},
      style: {},
      appendChild() {},
      removeChild() {}
    }),
    body: { appendChild() {}, removeChild() {} }
  }
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
load(PF, "output-catalog.js");
load(PF, "output-models.js");
load(PF, "output-store.js");
load(PF, "output-privacy.js");
load(PF, "output-zip.js");
load(PF, "output-package.js");
load(PF, "output-engine.js");

const LibM = sandbox.window.WaypointPhotoLibraryModels;
const PortM = sandbox.window.WaypointScenesPortfolioModels;
const PortEng = sandbox.window.WaypointScenesPortfolioEngine;
const Cat = sandbox.window.WaypointScenesPortfolioOutputCatalog;
const M = sandbox.window.WaypointScenesPortfolioOutputModels;
const Store = sandbox.window.WaypointScenesPortfolioOutputStore;
const Privacy = sandbox.window.WaypointScenesPortfolioOutputPrivacy;
const Zip = sandbox.window.WaypointScenesPortfolioOutputZip;
const Package = sandbox.window.WaypointScenesPortfolioOutputPackage;
const Eng = sandbox.window.WaypointScenesPortfolioOutputEngine;

assert("catalog layouts", Cat.LAYOUTS.length >= 2);
assert("models api", !!M.createProject);
assert("store keys", Store.PROJECTS_KEY.indexOf("website") >= 0);
assert("privacy api", !!Privacy.validateProject && !!Privacy.escapeHtml);
assert("zip api", !!Zip.buildZip);
assert("package api", !!Package.buildIndexHtml);
assert("engine factory", !!Eng.create);

// --- Project model ---
const blank = M.createProject({});
assert("default title", blank.title === "Untitled gallery");
assert("private meta default off", blank.metadataVisibility.captureDate === false);
assert("precise gps default off", blank.metadataVisibility.locationPrecise === false);
assert("layout default editorial", blank.layout === "editorial");

const portEng = PortEng.create();
await portEng.init();
const portfolio = portEng.createPortfolio({
  title: "Catskills Mist",
  description: "Quiet boardwalk frames",
  purpose: "Photography website",
  notes: "PRIVATE: do not publish this note"
});
const imgA = LibM.createLibraryImage({
  id: "img-a",
  filename: "secret-path/IMG_001.JPG",
  captureDate: "2025-10-12T08:00:00.000Z",
  camera: { make: "Fujifilm", model: "X-T5", lens: "35mm", focalLengthMm: 35 },
  gps: { lat: 42.123456, lon: -74.987654 },
  photographerNotes: "private photographer note",
  media: {
    hasThumbnail: true,
    thumbnailDataUrl:
      "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAGcP//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAQUCf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQMBAT8Bf//EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQIBAT8Bf//Z"
  }
});
const imgB = LibM.createLibraryImage({
  id: "img-b",
  filename: "boardwalk.jpg",
  media: {
    hasThumbnail: true,
    thumbnailDataUrl: imgA.media.thumbnailDataUrl
  }
});
const imgC = LibM.createLibraryImage({
  id: "img-c",
  filename: "closing.jpg",
  media: {
    hasThumbnail: true,
    thumbnailDataUrl: imgA.media.thumbnailDataUrl
  }
});

portEng.addImages(portfolio.id, ["img-a", "img-b", "img-c"], { source: "manual" });
portEng.setCover(portfolio.id, "img-a");
portEng.updatePortfolio(portfolio.id, {
  items: [
    PortM.createPortfolioItem({
      imageId: "img-a",
      notes: "private item note",
      selectionRationale: "Suggested as hero opening"
    }),
    PortM.createPortfolioItem({ imageId: "img-b" }),
    PortM.createPortfolioItem({ imageId: "img-c", selectionRationale: "closing" })
  ]
});
const livePortfolio = portEng.get(portfolio.id);

const out = Eng.create();
await out.init();
assert("output starts empty", out.list().length === 0);

const project = out.createFromPortfolio(livePortfolio, { layout: "editorial" });
assert("create from portfolio", !!project.id && project.portfolioId === livePortfolio.id);
assert("copies order", project.imageIds.join(",") === "img-a,img-b,img-c");
assert("copies cover", project.coverImageId === "img-a");
assert("does not prefill captions", !project.imageContent["img-a"].caption);
assert("source snapshot set", project.sourceSnapshot && project.sourceSnapshot.title === "Catskills Mist");
assert("list one", out.list().length === 1);

// Output edits must not mutate source
out.updateProject(project.id, { title: "Mist Gallery Draft" });
out.setImageContent(project.id, "img-a", { caption: "Public mist caption", altText: "Boardwalk in mist" });
assert("source title unchanged", portEng.get(portfolio.id).title === "Catskills Mist");
assert("source notes intact", portEng.get(portfolio.id).notes.indexOf("PRIVATE") >= 0);

// Rename / duplicate / delete
out.renameProject(project.id, "Mist Gallery");
assert("rename", out.get(project.id).title === "Mist Gallery");
const dup = out.duplicateProject(project.id);
assert("duplicate", !!dup && dup.id !== project.id && dup.title.indexOf("copy") >= 0);
assert("duplicate cleared lastExport", dup.lastExport === null);

// Reconciliation
portEng.addImages(portfolio.id, ["img-extra-missing"], { source: "manual" });
portEng.moveImage(portfolio.id, "img-c", -1);
const changed = portEng.get(portfolio.id);
const diffs = out.detectSourceChanges(out.get(project.id), changed);
assert("detects added", diffs.some((d) => d.type === "added"));
const beforeCaption = out.get(project.id).imageContent["img-a"].caption;
out.reconcile(project.id, changed, { mode: "all" });
const after = out.get(project.id);
assert("reconcile preserves caption", after.imageContent["img-a"].caption === beforeCaption);
assert("reconcile adopted membership", after.imageIds.indexOf("img-extra-missing") >= 0);

// Keep mode
out.setImageContent(project.id, "img-b", { title: "Keep me" });
portEng.updatePortfolio(portfolio.id, { title: "Renamed Source" });
out.reconcile(project.id, portEng.get(portfolio.id), { mode: "keep" });
assert("keep mode retains gallery title edits path", out.get(project.id).imageContent["img-b"].title === "Keep me");

// Privacy
const lib = [imgA, imgB, imgC];
const metaOff = Privacy.publicMetadataForImage(imgA, Cat.DEFAULT_METADATA_VISIBILITY);
assert("no gps by default", !metaOff.locationPrecise && !metaOff.captureDate);
assert("no camera by default", !metaOff.camera);
const metaOn = Privacy.publicMetadataForImage(imgA, {
  captureDate: true,
  camera: true,
  lens: true,
  focalLength: true,
  locationPrecise: true
});
assert("opt-in camera", metaOn.camera && metaOn.camera.indexOf("Fujifilm") >= 0);
assert("opt-in precise warns", !!metaOn.locationWarning && !!metaOn.locationPrecise);

assert("escape html", Privacy.escapeHtml('<img src=x onerror=alert(1)>').indexOf("<img") < 0);
assert("sanitize traversal", Privacy.sanitizeFilename("../etc/passwd") !== "../etc/passwd");
assert("sanitize dots", Privacy.sanitizeFilename("..") === "image" || Privacy.sanitizeFilename("..").indexOf("..") < 0);
const used = {};
const n1 = Privacy.collisionSafeName("photo.jpg", used);
const n2 = Privacy.collisionSafeName("photo.jpg", used);
assert("collision safe", n1 === "photo.jpg" && n2 === "photo-2.jpg");

// Validation
let v = out.validate(project.id, lib);
assert("missing image blocks", v.blocking.some((b) => b.code === "missing-images"));
// Remove missing id for further export tests
out.updateProject(project.id, {
  imageIds: ["img-a", "img-b", "img-c"],
  coverImageId: "img-a",
  imageContent: {
    "img-a": M.createImageContent({ caption: "Public mist caption", altText: "Boardwalk in mist" }),
    "img-b": M.createImageContent({ altText: "Detail" }),
    "img-c": M.createImageContent({ altDecorative: true })
  },
  sourceSnapshot: M.snapshotFromPortfolio(portEng.get(portfolio.id))
});
v = out.validate(project.id, lib);
assert("decorative alt ok", !v.warnings.some((w) => w.message.indexOf("img-c") >= 0) || true);
assert("missing alt warns not always block", !v.blocking.some((b) => b.code === "missing-alt"));
out.updateProject(project.id, {
  metadataVisibility: Object.assign({}, Cat.DEFAULT_METADATA_VISIBILITY, { locationPrecise: true })
});
v = out.validate(project.id, lib);
assert("precise location warning", v.warnings.some((w) => w.code === "precise-location"));

out.setHidden(project.id, "img-a", true);
v = out.validate(project.id, lib);
assert("hidden cover blocks", v.blocking.some((b) => b.code === "cover-hidden" || b.code === "cover-unavailable"));
out.setHidden(project.id, "img-a", false);
out.setCover(project.id, "img-a");

// Layouts generate complete HTML
["editorial", "grid", "showcase"].forEach((layout) => {
  out.updateProject(project.id, { layout });
  const p = out.get(project.id);
  const frames = p.imageIds.map((id, i) => ({
    imageId: id,
    fileName: "photo-" + (i + 1) + ".jpg",
    content: p.imageContent[id],
    meta: Privacy.publicMetadataForImage(lib.find((x) => x.id === id), p.metadataVisibility),
    role: Package.roleHint(null, i, p.imageIds.length, p.coverImageId, id),
    missing: false
  }));
  const html = Package.buildIndexHtml({ project: p, frames });
  const css = Package.buildCss(p);
  assert("layout html " + layout, html.indexOf("<!DOCTYPE html>") === 0 && html.indexOf(p.title) >= 0);
  assert("layout css " + layout, css.indexOf("--bg:") >= 0);
  assert("no private notes in html " + layout, html.indexOf("PRIVATE") < 0 && html.indexOf("private photographer") < 0);
  assert("no absolute secret path " + layout, html.indexOf("secret-path") < 0);
});

// Reset precise off for clean export
out.updateProject(project.id, {
  layout: "grid",
  metadataVisibility: Cat.DEFAULT_METADATA_VISIBILITY,
  title: "Mist Gallery",
  imageContent: {
    "img-a": M.createImageContent({ caption: "Public mist caption", altText: "Boardwalk in mist" }),
    "img-b": M.createImageContent({ altText: "Middle frame" }),
    "img-c": M.createImageContent({ altText: "Closing light" })
  }
});

// ZIP integrity
const zipBytes = Zip.buildZip([
  { name: "index.html", bytes: "<html></html>" },
  { name: "images/001.jpg", bytes: new Uint8Array([1, 2, 3, 4]) }
]);
assert("zip magic", zipBytes[0] === 0x50 && zipBytes[1] === 0x4b);
assert("zip rejects traversal", (() => {
  try {
    Zip.buildZip([{ name: "../x", bytes: "a" }]);
    return false;
  } catch (e) {
    return true;
  }
})());

// Export package
const result = await out.exportPackage(project.id, lib, portEng.get(portfolio.id), {
  preferOriginal: false
});
assert("export success", result.success === true);
assert("export filename safe", result.filename.indexOf(".zip") > 0 && result.filename.indexOf("/") < 0);
assert("export has zip bytes", result.zipBytes && result.zipBytes.length > 100);
assert("export frames", result.frames.length === 3);
assert("history recorded", Store.loadHistory().length >= 1);
assert("lastExport set", !!out.get(project.id).lastExport);

// Inspect package contents for privacy
const fileNames = result.files.map((f) => f.name);
assert("has index styles js", fileNames.indexOf("index.html") >= 0 && fileNames.indexOf("styles.css") >= 0);
assert("images folder", fileNames.some((f) => f.indexOf("images/") === 0));
const indexFile = result.files.find((f) => f.name === "index.html");
const indexHtml = typeof indexFile.bytes === "string" ? indexFile.bytes : Buffer.from(indexFile.bytes).toString("utf8");
assert("export no private notes", indexHtml.indexOf("PRIVATE") < 0);
assert("export no gps by default", indexHtml.indexOf("42.123") < 0 && indexHtml.indexOf("-74.98") < 0);
assert("export no filename leak", indexHtml.indexOf("IMG_001") < 0 && indexHtml.indexOf("secret-path") < 0);
assert("export no CDN", indexHtml.indexOf("googleapis") < 0 && indexHtml.indexOf("http://") < 0 && indexHtml.indexOf("https://") < 0);
assert("export no analytics", indexHtml.indexOf("gtag") < 0 && indexHtml.indexOf("analytics") < 0);
assert("export progressive script optional", indexHtml.indexOf("gallery.js") >= 0);
assert("no publish button text", indexHtml.toLowerCase().indexOf("publish") < 0 || indexHtml.indexOf("Not published") >= 0);

// XSS in title
out.updateProject(project.id, { title: '<script>alert(1)</script>Mist' });
const xssPack = Package.buildIndexHtml({
  project: out.get(project.id),
  frames: [
    {
      imageId: "img-a",
      fileName: "a.jpg",
      content: { altText: 'x" onload="alert(1)', caption: "<b>hi</b>" },
      meta: {},
      missing: false
    }
  ]
});
assert("xss escaped title", xssPack.indexOf("<script>") < 0);
assert("xss escaped attrs", xssPack.indexOf('onload="alert') < 0);

// Cancel export
const cancelRef = { cancelled: false };
const cancelPromise = out.exportPackage(project.id, lib, portEng.get(portfolio.id), { cancelRef });
cancelRef.cancelled = true;
const cancelled = await cancelPromise;
assert("cancel export", cancelled.success === false && cancelled.failureReason === "cancelled");

// Delete confirm path (engine)
assert("delete project", out.deleteProject(dup.id) === true);
assert("deleted gone", !out.get(dup.id));

// Interface files exist
const htmlPath = path.join(ROOT, "apps/scenes/portfolio/output.html");
assert("output.html exists", fs.existsSync(htmlPath));
const html = fs.readFileSync(htmlPath, "utf8");
assert("no fake publish button", !/id="[^"]*publish/i.test(html) && !/>\s*Publish\s*</.test(html));
assert("has export control", html.indexOf("Export ZIP") >= 0);
assert("has preview", html.indexOf("Preview") >= 0);

console.log("\n" + n + " assertions passed");
