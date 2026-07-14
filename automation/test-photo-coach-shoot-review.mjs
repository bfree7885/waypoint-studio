#!/usr/bin/env node
/**
 * Photo Coach Shoot Review (Work Block 3) — unit tests
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const WS = path.join(ROOT, "apps/waypoint-scenes/js");

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

function load(file) {
  const code = fs.readFileSync(path.join(WS, file), "utf8");
  vm.runInNewContext(code, sandbox, { filename: file });
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
  Uint8ClampedArray,
  Promise,
  setTimeout: (fn) => fn(),
  localStorage: {
    getItem: (k) => (localStore.has(k) ? localStore.get(k) : null),
    setItem: (k, v) => localStore.set(k, String(v)),
    removeItem: (k) => localStore.delete(k)
  },
  sessionStorage: {
    getItem: (k) => (localStore.has("ss:" + k) ? localStore.get("ss:" + k) : null),
    setItem: (k, v) => localStore.set("ss:" + k, String(v)),
    removeItem: (k) => localStore.delete("ss:" + k)
  }
};
sandbox.globalThis = sandbox;
sandbox.window = sandbox;

load("photo-coach-queue.js");
load("photo-coach-grouping.js");
load("photo-coach-importer-bridge.js");
load("photo-coach-shoot.js");

const Queue = sandbox.window.WaypointPhotoCoachQueue;
const Grouping = sandbox.window.WaypointPhotoCoachGrouping;
const Bridge = sandbox.window.WaypointPhotoCoachImporterBridge;
const Shoot = sandbox.window.WaypointPhotoCoachShoot;

assert("queue module", !!Queue);
assert("grouping module", !!Grouping);
assert("importer bridge", !!Bridge);
assert("shoot module", !!Shoot);
assert("schema 2", Shoot.SCHEMA_VERSION === "2.0.0");

const files = [
  { name: "a.jpg", size: 10, lastModified: 1 },
  { name: "a.jpg", size: 10, lastModified: 1 },
  { name: "b.jpg", size: 11, lastModified: 2 }
];
const dedupe = Queue.dedupeFiles(files);
assert("dedupe unique count", dedupe.unique.length === 2);
assert("dedupe skipped", dedupe.skippedDuplicates === 1);

let progressHits = 0;
let processed = [];
const q = Queue.createQueue({
  files: [{ name: "1.jpg" }, { name: "2.jpg" }, { name: "3.jpg" }],
  onProgress: function () { progressHits++; },
  processItem: function (file, index) {
    processed.push(file.name + ":" + index);
    if (index === 1) q.cancel();
    return Promise.resolve(true);
  }
});

await q.start();
assert("queue processed at least first", processed.length >= 1);
assert("queue cancelled or completed", q.getState().status === "cancelled" || q.getState().status === "complete");
assert("progress fired", progressHits >= 1);
assert("eta formatter", Queue.formatEta(500) === "a moment");
assert("eta seconds", /s$/.test(Queue.formatEta(5000)));

const shoot = Shoot.createShoot({});
const imgs = [];
for (let i = 0; i < 4; i++) {
  const rec = Shoot.createImageRecord({ name: "p" + i + ".jpg", size: 100 + i, lastModified: i });
  rec.status = "done";
  rec.selectionLabel = null;
  rec.exif = {
    hasExif: true,
    make: "Test",
    model: "Cam",
    focalLengthMm: 35 + i,
    dateTimeOriginal: "2026:07:14 10:0" + i + ":00"
  };
  rec.analysis = {
    overallScore: 70 + i * 5,
    overallGrade: { letter: "B", score: 70 + i * 5 },
    strengths: [{ title: i % 2 ? "Strong light" : "Clear subject" }],
    improvements: i < 2 ? [{ issue: "Watch the edges", category: "distraction" }] : [],
    genre: { label: i < 2 ? "Woodland detail" : "Landscape", confidence: 0.8, uncertain: false },
    scoreBreakdown: [
      { category: "Composition", score: 60 + i * 8 },
      { category: "Technical", score: 70 },
      { category: "Artistic", score: 65 + i }
    ],
    styleSignals: {
      brightness: 50 + i,
      contrast: 40 + i,
      saturation: 0.3,
      warmth: 0.4,
      sharpness: 55,
      orientation: "landscape",
      highlightClip: i === 0 ? 0.12 : 0.01,
      shadowClip: 0.05
    }
  };
  // Near-burst on first two via identical-ish style + times already close
  if (i === 1) {
    rec.exif.dateTimeOriginal = "2026:07:14 10:00:01";
    rec.analysis.styleSignals.brightness = 50;
    rec.analysis.styleSignals.contrast = 40;
  }
  imgs.push(rec);
}
shoot.images = imgs;

const groups = Grouping.groupImages(shoot.images);
assert("groups created or empty ok", Array.isArray(groups));

const summary = Shoot.buildSummary(shoot);
assert("summary built", !!summary);
assert("session insights", Array.isArray(summary.sessionInsights) && summary.sessionInsights.length >= 1);
assert("session stats", !!summary.sessionStats && summary.sessionStats.percentages);
assert("best of session", Array.isArray(summary.bestOfSession));
assert("editing suggestions", Array.isArray(summary.editingSuggestions));
assert("session date label", !!summary.sessionDateLabel);
assert("weather placeholder", summary.weatherPlaceholder && summary.weatherPlaceholder.status === "future");
assert("gear camera", summary.gear && summary.gear.camera);

assert("set keep label", Shoot.setImageSelection(shoot, imgs[0].id, "keep"));
assert("label stored", imgs[0].selectionLabel === "keep");
assert("reject invalid label", Shoot.normalizeSelectionLabel("winner") === null);
assert("favorite label", Shoot.setImageSelection(shoot, imgs[1].id, "favorite"));

const html = Shoot.renderSummaryHtml(summary, shoot);
assert("summary html title", /How did today/i.test(html));
assert("no lorem", !/lorem ipsum/i.test(html));
assert("selection controls", /Private labels/.test(Shoot.renderSelectionControlsHtml(imgs[0].id, "keep")));

const progress = Shoot.renderProgressHtml({
  status: "running",
  index: 1,
  total: 4,
  currentFileName: "x.jpg",
  remaining: 3,
  estimatedMsRemaining: 8000
});
assert("progress cancel button", /pc-queue-cancel/.test(progress));
assert("progress remaining", /remaining/.test(progress));

const payload = Bridge.emptyPayload();
payload.files = [{ fileName: "a.jpg" }];
const valid = Bridge.validatePayload(payload);
assert("importer validate ok", valid.ok);
const bad = Bridge.validatePayload({ files: [] });
assert("importer validate empty fails", !bad.ok);
const staged = Bridge.stageHandoff(payload);
assert("importer stage", staged.ok);
assert("importer peek", !!Bridge.peekHandoff());
Bridge.clearHandoff();
assert("importer clear", !Bridge.peekHandoff());
const recv = await Bridge.receiveSession(payload);
assert("importer receive stub", recv.status === "not-implemented");

const coachHtml = fs.readFileSync(path.join(ROOT, "apps/photo-coach/index.html"), "utf8");
assert("coach loads queue", /photo-coach-queue\.js/.test(coachHtml));
assert("coach loads grouping", /photo-coach-grouping\.js/.test(coachHtml));
assert("coach loads importer bridge", /photo-coach-importer-bridge\.js/.test(coachHtml));
assert("folder input", /coach-folder-input/.test(coachHtml) && /webkitdirectory/.test(coachHtml));
assert("single upload still supported", /coach-file-input/.test(coachHtml) && /multiple/.test(coachHtml));

console.log("\nAll Photo Coach Shoot Review tests passed (" + n + ").");
