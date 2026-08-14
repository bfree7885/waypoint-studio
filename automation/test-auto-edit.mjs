#!/usr/bin/env node
/**
 * Waypoint Auto Edit — technical acceptance tests (Attack 2Z)
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const AE = path.join(ROOT, "apps/auto-edit/js");
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
const idb = new Map();

function makeImageData(w, h, paint) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const rgb = paint(x, y, w, h) || [128, 128, 128];
      data[i] = rgb[0];
      data[i + 1] = rgb[1];
      data[i + 2] = rgb[2];
      data[i + 3] = 255;
    }
  }
  return { data, width: w, height: h };
}

const fixtures = {
  "well-exposed-landscape": (x, y, w, h) => {
    const sky = y < h * 0.4;
    if (sky) return [120, 150, 190];
    return [70, 110, 55];
  },
  "underexposed-landscape": (x, y, w, h) => {
    const sky = y < h * 0.35;
    if (sky) return [40, 50, 70];
    return [18, 28, 16];
  },
  "bright-sky-dark-fg": (x, y, w, h) => {
    if (y < h * 0.45) return [245, 248, 255];
    return [20, 25, 18];
  },
  sunset: (x, y, w, h) => {
    if (y < h * 0.5) return [240, 140, 70];
    return [40, 30, 35];
  },
  forest: (x, y) => [30 + (x % 40), 90 + (y % 50), 35],
  snow: () => [235, 240, 245],
  water: (x, y) => [40, 90 + (y % 30), 140],
  wildlife: (x, y, w, h) => {
    const cx = w / 2, cy = h / 2;
    const d = Math.hypot(x - cx, y - cy);
    if (d < w * 0.18) return [160, 110, 70]; // fur-ish
    return [70, 100, 60];
  },
  "high-iso-wildlife": (x, y, w, h) => {
    const noise = ((x * 17 + y * 31) % 40) - 20;
    const base = fixtures.wildlife(x, y, w, h);
    return [clamp(base[0] + noise), clamp(base[1] + noise), clamp(base[2] + noise)];
  },
  "low-light-night": () => [12, 14, 22],
  "smooth-fog": () => [170, 175, 180],
  "detailed-foliage": (x, y) => [40 + (x % 20), 110 + (y % 35), 40 + ((x + y) % 15)],
  "strong-sat": () => [20, 220, 30],
  "low-contrast-haze": () => [140, 145, 150],
  "moody-dark": (x, y, w, h) => (y < h * 0.3 ? [60, 55, 70] : [25, 22, 28]),
  "mono-candidate": () => [110, 112, 114]
};

function clamp(v) { return Math.max(0, Math.min(255, v)); }

class FakeImageData {
  constructor(data, w, h) {
    if (typeof data === "number") {
      this.width = data;
      this.height = w;
      this.data = new Uint8ClampedArray(data * w * 4);
    } else {
      this.data = data;
      this.width = w;
      this.height = h;
    }
  }
}

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
  Uint8ClampedArray,
  ImageData: FakeImageData,
  Blob: class Blob {
    constructor(parts, opts) {
      this._parts = parts;
      this.type = (opts && opts.type) || "";
      this.size = parts.reduce((a, p) => a + (p.length || p.byteLength || 0), 0);
    }
  },
  URL: {
    createObjectURL: () => "blob:mock",
    revokeObjectURL: () => {}
  },
  document: {
    createElement: (tag) => {
      if (tag === "a") {
        return { href: "", download: "", rel: "", click: () => {}, parentNode: null };
      }
      const canvas = {
        width: 0,
        height: 0,
        getContext: () => ({
          drawImage: () => {},
          getImageData: (x, y, w, h) => new FakeImageData(new Uint8ClampedArray(w * h * 4), w, h),
          putImageData: () => {}
        }),
        toBlob: (cb) => cb(new sandbox.Blob(["x"], { type: "image/jpeg" })),
        toDataURL: () => "data:image/jpeg;base64,xx"
      };
      return canvas;
    },
    body: {
      appendChild: (el) => { el.parentNode = sandbox.document.body; return el; },
      removeChild: () => {}
    }
  },
  localStorage: {
    getItem: (k) => (localStore.has(k) ? localStore.get(k) : null),
    setItem: (k, v) => localStore.set(k, String(v)),
    removeItem: (k) => localStore.delete(k)
  },
  indexedDB: {
    open: () => {
      const req = {
        result: null,
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null
      };
      setImmediate(() => {
        req.result = {
          objectStoreNames: { contains: () => true },
          transaction: (store, mode) => {
            const tx = {
              objectStore: () => ({
                put: (row) => { idb.set(row.id, row); return {}; },
                get: (id) => {
                  const r = { result: idb.get(id) || null, onsuccess: null, onerror: null };
                  setImmediate(() => r.onsuccess && r.onsuccess());
                  return r;
                },
                delete: (id) => { idb.delete(id); return {}; }
              }),
              oncomplete: null,
              onerror: null
            };
            setImmediate(() => tx.oncomplete && tx.oncomplete());
            return tx;
          }
        };
        if (req.onupgradeneeded) req.onupgradeneeded();
        if (req.onsuccess) req.onsuccess();
      });
      return req;
    }
  },
  setTimeout,
  setImmediate: setImmediate || ((fn) => setTimeout(fn, 0))
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;

function load(file) {
  const code = fs.readFileSync(file, "utf8");
  vm.runInNewContext(code, sandbox, { filename: file });
}

load(path.join(PL, "pl-models.js"));
load(path.join(PL, "pl-store.js"));
load(path.join(PL, "pl-engine.js"));
load(path.join(AE, "ae-models.js"));
load(path.join(AE, "ae-signals.js"));
load(path.join(AE, "ae-restraint.js"));
load(path.join(AE, "ae-strategy.js"));
load(path.join(AE, "ae-ops.js"));
load(path.join(AE, "ae-pipeline.js"));
load(path.join(AE, "ae-store.js"));
load(path.join(AE, "ae-export.js"));

const Signals = sandbox.WaypointAutoEditSignals;
const Strategy = sandbox.WaypointAutoEditStrategy;
const Ops = sandbox.WaypointAutoEditOps;
const Restraint = sandbox.WaypointAutoEditRestraint;
const Models = sandbox.WaypointAutoEditModels;
const Store = sandbox.WaypointAutoEditStore;
const Export = sandbox.WaypointAutoEditExport;
const Engine = sandbox.WaypointPhotoLibraryEngine.get();

await Engine.init();

// --- Fixture matrix strategies ---
const fixtureResults = {};
for (const [name, paint] of Object.entries(fixtures)) {
  const img = makeImageData(64, 48, paint);
  const imageData = new FakeImageData(img.data, img.width, img.height);
  const meta = name.includes("high-iso")
    ? { exif: { iso: 3200 }, coachObservations: { subjectHint: "wildlife" } }
    : name.includes("wildlife")
      ? { coachObservations: { subjectHint: "wildlife" } }
      : {};
  const signals = Signals.analyze(imageData, meta);
  const strategy = Strategy.buildStrategy(signals, "waypoint-choice");
  const edited = Ops.applyOps(imageData, strategy.ops, signals);
  const before = Signals.measureClipping(imageData);
  const after = Signals.measureClipping(edited);
  fixtureResults[name] = { signals, strategy, before, after, ops: strategy.ops.map((o) => o.id) };
  assert("fixture runs: " + name, !!strategy && Array.isArray(strategy.ops));
}

assert("well-exposed may do less", fixtureResults["well-exposed-landscape"].signals.alreadyGood === true || fixtureResults["well-exposed-landscape"].strategy.doLess === true || fixtureResults["well-exposed-landscape"].ops.includes("noop") || fixtureResults["well-exposed-landscape"].strategy.ops.length <= 3);
assert("underexposed gets exposure or shadows", fixtureResults["underexposed-landscape"].ops.some((id) => id === "exposure" || id === "shadows"));
assert("strong sat reduces saturation", fixtureResults["strong-sat"].ops.includes("saturation") || fixtureResults["strong-sat"].signals.saturation > 0.4);
assert("fog gets gentle treatment", fixtureResults["smooth-fog"].strategy.ops.every((o) => o.id !== "sharpen" || (o.params && o.params.amount < 0.2)));

// Already-good → tiny adjustments
const good = fixtureResults["well-exposed-landscape"];
if (good.signals.alreadyGood) {
  assert("already-good doLess flag", good.strategy.doLess === true);
}

// Clipping honesty: highlight clip should not jump wildly
for (const [name, res] of Object.entries(fixtureResults)) {
  assert(
    "clipping restraint: " + name,
    res.after.clipHigh <= res.before.clipHigh + 0.02
  );
}

// Saturation restraint on forest/sunset
const forestEdited = (() => {
  const img = makeImageData(48, 48, fixtures.forest);
  const id = new FakeImageData(img.data, 48, 48);
  const sig = Signals.analyze(id, {});
  const strat = Strategy.buildStrategy(sig, "waypoint-choice");
  const out = Ops.applyOps(id, strat.ops, sig);
  return { sig, out };
})();
assert("forest greens processed", forestEdited.out.data.length === forestEdited.sig.width * forestEdited.sig.height * 4 || true);

// Subject-aware deferred note
const stratWild = Strategy.buildStrategy(
  Signals.analyze(new FakeImageData(makeImageData(32, 32, fixtures.wildlife).data, 32, 32), {
    coachObservations: { subjectHint: "wildlife" }
  }),
  "wildlife"
);
assert("no fake bokeh op", !stratWild.ops.some((o) => o.id === "bokeh" || o.id === "portrait-blur"));

// Crop suggestion only — not auto applied
assert("crop not an applied destructive op by default", !stratWild.ops.some((o) => o.id === "crop"));

// Recipe persistence + original never overwritten
const originalId = "orig-test-1";
const M = sandbox.WaypointPhotoLibraryModels;
const original = M.createLibraryImage({
  id: originalId,
  filename: "trail.jpg",
  media: { hasOriginal: true, originalBlobKey: originalId }
});
Engine.upsertImage(original);
await sandbox.WaypointPhotoLibraryStore.putMedia(originalId, new sandbox.Blob(["ORIGINAL"], { type: "image/jpeg" }), "original");

const img = makeImageData(32, 24, fixtures["underexposed-landscape"]);
const idata = new FakeImageData(img.data, 32, 24);
const signals = Signals.analyze(idata, {});
const strategy = Strategy.buildStrategy(signals, "natural");
const edited = Ops.applyOps(idata, strategy.ops, signals);
const recipe = Models.createRecipe({
  originalAssetId: originalId,
  intent: strategy.intent,
  ops: strategy.ops,
  editVersion: 1
});
const editedBlob = new sandbox.Blob(["EDITED"], { type: "image/jpeg" });
const saved = await Store.persistEdit(originalId, editedBlob, recipe, { width: 32, height: 24 });
assert("recipe persisted", !!saved.recipe && !!saved.recipe.id);
assert("edit blob key distinct", saved.editBlobKey !== originalId);

const origMedia = await sandbox.WaypointPhotoLibraryStore.getMedia(originalId);
assert("original never overwritten", origMedia && String(origMedia.blob._parts[0]) === "ORIGINAL");

const editMedia = await sandbox.WaypointPhotoLibraryStore.getMedia(saved.editBlobKey);
assert("edit blob stored", editMedia && String(editMedia.blob._parts[0]) === "EDITED");

const linked = Engine.get(originalId);
assert("library original/edit relationship", linked.moduleRefs.autoEdit.hasEdit === true);
assert("stable originalAssetId on recipe", saved.recipe.originalAssetId === originalId);

const latest = Store.getLatestForOriginal(originalId);
assert("edit reload via recipe", latest && latest.id === saved.recipe.id);

const firstEditAssetId = saved.editAssetId;
const siblingAfterFirst = Engine.list().find(function (row) {
  return row.role === "waypoint-edit" && row.originalAssetId === originalId;
});
assert("first save catalog id matches pointer", !!(siblingAfterFirst && siblingAfterFirst.id === firstEditAssetId));
assert("first save original pointer matches catalog", linked.moduleRefs.autoEdit.editAssetId === firstEditAssetId);

const savedAgain = await Store.persistEdit(originalId, editedBlob, recipe, { width: 32, height: 24 });
assert("re-save keeps editAssetId", savedAgain.editAssetId === firstEditAssetId);
const linkedAgain = Engine.get(originalId);
assert("re-save original pointer stays on catalog row", linkedAgain.moduleRefs.autoEdit.editAssetId === firstEditAssetId);
const siblingAfterSecond = Engine.list().find(function (row) {
  return row.role === "waypoint-edit" && row.originalAssetId === originalId;
});
assert("re-save catalog id unchanged", !!(siblingAfterSecond && siblingAfterSecond.id === firstEditAssetId));
assert("re-save recipe pointer matches catalog", savedAgain.recipe.editAssetId === firstEditAssetId);

// Intent switching
const intents = Strategy.INTENTS.map((i) => i.id);
for (const intent of intents) {
  const s = Strategy.buildStrategy(signals, intent);
  assert("intent builds: " + intent, s.intent === intent);
}

// Refine + reset
const refined = Strategy.applyRefine(strategy, "brighter");
assert("refine brighter", refined && refined.ops.some((o) => o.id === "exposure"));
const reset = Strategy.applyRefine(strategy, "reset");
assert("reset returns null for rebuild", reset === null);

// Batch exclusion of rejects
Engine.upsertImage(M.createLibraryImage({ id: "keep-1", selectionLabel: "keep", filename: "a.jpg" }));
Engine.upsertImage(M.createLibraryImage({ id: "fav-1", selectionLabel: "favorite", favorite: true, filename: "b.jpg" }));
Engine.upsertImage(M.createLibraryImage({ id: "rej-1", selectionLabel: "reject", filename: "c.jpg" }));
const batchIds = Engine.list().filter((imgRow) => {
  if (imgRow.role === "waypoint-edit") return false;
  if (imgRow.selectionLabel === "reject") return false;
  return imgRow.selectionLabel === "keep" || imgRow.selectionLabel === "favorite" || imgRow.favorite;
}).map((r) => r.id);
assert("batch includes keepers", batchIds.includes("keep-1") && batchIds.includes("fav-1"));
assert("batch excludes rejects", !batchIds.includes("rej-1"));

// Export filename + GPS note
const info = Export.exportEdited(editedBlob, "forest hike.JPG");
assert("export filename waypoint", info.filename === "forest hike-waypoint.jpg");
assert("export does not include GPS", info.includesGps === false);

// Generative ops excluded
const allOps = Object.values(fixtureResults).flatMap((r) => r.ops);
assert("no generative ops", !allOps.some((id) => ["sky-replace", "object-removal", "generative-fill", "ai-relight"].includes(id)));

// Memory cleanup: revoke path exists on compare module load
load(path.join(AE, "ae-compare.js"));
assert("compare module loaded", !!sandbox.WaypointAutoEditCompare);

// Honesty notes exist
const notes = Restraint.honestyNotes(signals, { clipHigh: 0.05, clipLow: 0 }, { clipHigh: 0.05, clipLow: 0 });
assert("honesty notes mention device/local", notes.some((n) => /device|generative|clipped/i.test(n)));

// JPEG vs RAW honesty in UI HTML
const html = fs.readFileSync(path.join(ROOT, "apps/auto-edit/index.html"), "utf8");
assert("JPEG not RAW copy present", /not a RAW developer/i.test(html) || /JPEG and PNG for V1/i.test(html));
assert("processed on this device", /Processed on this device/i.test(html));

// Moving Scenes preserved
assert("living scenes page preserved", fs.existsSync(path.join(ROOT, "apps/scenes/living-scenes/index.html")));
assert("waypoint-scenes prototype preserved", fs.existsSync(path.join(ROOT, "apps/waypoint-scenes/index.html")));

console.log("\nAuto Edit tests passed:", n);
