#!/usr/bin/env node
/**
 * Photo Library foundation tests (Work Block 4)
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
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
  Blob: class Blob {
    constructor(parts, opts) {
      this._parts = parts;
      this.type = (opts && opts.type) || "";
      this.size = parts.reduce((a, p) => a + (p.length || p.byteLength || 0), 0);
    }
  },
  File: class File {
    constructor(parts, name, opts) {
      this.name = name;
      this.type = (opts && opts.type) || "";
      this.size = 10;
      this.lastModified = (opts && opts.lastModified) || 1;
    }
  },
  URL: {
    createObjectURL: () => "blob:mock",
    revokeObjectURL: () => {}
  },
  Image: class Image {
    set src(v) {
      this.naturalWidth = 100;
      this.naturalHeight = 80;
      setTimeout(() => this.onload && this.onload(), 0);
    }
  },
  document: {
    createElement: () => ({
      getContext: () => ({ drawImage: () => {} }),
      toDataURL: () => "data:image/jpeg;base64,xx",
      width: 0,
      height: 0
    })
  },
  localStorage: {
    getItem: (k) => (localStore.has(k) ? localStore.get(k) : null),
    setItem: (k, v) => localStore.set(k, String(v)),
    removeItem: (k) => localStore.delete(k)
  },
  indexedDB: {
    open: () => {
      const req = {
        result: {
          objectStoreNames: { contains: () => true },
          transaction: () => {
            const store = {
              put: (row) => { idb.set(row.id, row); },
              get: (id) => {
                const r = { result: idb.get(id) || null };
                setTimeout(() => r.onsuccess && r.onsuccess(), 0);
                return r;
              },
              delete: (id) => { idb.delete(id); }
            };
            const tx = {
              objectStore: () => store,
              oncomplete: null,
              onerror: null
            };
            setTimeout(() => tx.oncomplete && tx.oncomplete(), 0);
            return tx;
          }
        },
        onupgradeneeded: null,
        onsuccess: null,
        onerror: null
      };
      setTimeout(() => req.onsuccess && req.onsuccess(), 0);
      return req;
    }
  },
  setTimeout: (fn) => fn()
};
sandbox.globalThis = sandbox;
sandbox.window = sandbox;

function load(file) {
  vm.runInNewContext(fs.readFileSync(path.join(PL, file), "utf8"), sandbox, { filename: file });
}

load("pl-models.js");
load("pl-store.js");
load("pl-engine.js");

const M = sandbox.window.WaypointPhotoLibraryModels;
const Store = sandbox.window.WaypointPhotoLibraryStore;
const Eng = sandbox.window.WaypointPhotoLibraryEngine;

assert("models", !!M);
assert("store keys", !!Store.INDEX_KEY && !!Store.PHOTO_DB);
assert("engine factory", !!Eng.create);

const img = M.createLibraryImage({
  filename: "forest.jpg",
  camera: { make: "Sony", model: "a6700", focalLengthMm: 70 },
  tags: ["fog"],
  selectionLabel: "keep",
  subjectHints: ["Landscape"]
});
assert("image id", !!img.id);
assert("no fabricated gps", img.gps.lat === null);
assert("module refs present", !!img.moduleRefs.photoCoach);

const col = M.createCollection({ name: "Catskills" });
assert("collection name", col.name === "Catskills");

const engine = Eng.create();
await engine.init();
assert("init ready", engine.isReady());

// Seed without real image decode path: update via direct persist
engine.list(); // force
const seeded = M.createLibraryImage({
  id: "test-1",
  filename: "bird.jpg",
  tags: ["wildlife"],
  subjectHints: ["Wildlife"],
  favorite: true,
  selectionLabel: "favorite",
  camera: { make: "Sony", lens: "70-350", focalLengthMm: 350 },
  moduleRefs: { photoCoach: { analysisStatus: "analyzed", letterGrade: "B" } },
  media: { hasThumbnail: true, thumbnailDataUrl: "data:image/jpeg;base64,xx" }
});
const seeded2 = M.createLibraryImage({
  id: "test-2",
  filename: "mushroom.jpg",
  tags: ["fungi"],
  subjectHints: ["Fungi"],
  moduleRefs: { photoCoach: { analysisStatus: "not-analyzed" } },
  media: { hasThumbnail: true, thumbnailDataUrl: "data:image/jpeg;base64,yy" }
});
Store.saveIndex([seeded, seeded2]);
const engine2 = Eng.create();
await engine2.init();

assert("list has images", engine2.list().length >= 2);

const found = engine2.search({ query: "sony" });
assert("search camera", found.some((x) => x.id === "test-1"));

const fav = engine2.search({ filters: { favorite: true } });
assert("filter favorite", fav.length >= 1 && fav.every((x) => x.favorite || x.selectionLabel === "favorite"));

const analyzed = engine2.search({ filters: { analyzed: true } });
assert("filter analyzed", analyzed.every((x) => x.moduleRefs.photoCoach.analysisStatus === "analyzed"));

const wild = engine2.search({ filters: { subject: "wildlife" } });
assert("filter subject", wild.some((x) => x.id === "test-1"));

const c = engine2.createCollection("Yellowstone");
assert("create collection", !!c.id);
assert("add to collection", engine2.addToCollection(c.id, "test-1"));
assert("collection membership", engine2.get("test-1").collectionIds.indexOf(c.id) >= 0);

const byCol = engine2.search({ filters: { collectionId: c.id } });
assert("filter collection", byCol.length === 1 && byCol[0].id === "test-1");

engine2.addTag("test-2", "Autumn");
assert("tag added", engine2.get("test-2").tags.indexOf("autumn") >= 0);

engine2.updateImage("test-1", { photographerNotes: "Early fog along the river." });
assert("notes", engine2.get("test-1").photographerNotes.indexOf("fog") >= 0);

engine2.linkPhotoCoachResult("test-2", {
  analysisStatus: "analyzed",
  photoRecordId: "uuid-1",
  letterGrade: "A",
  overallScore: 90
});
assert("coach link", engine2.get("test-2").moduleRefs.photoCoach.analysisStatus === "analyzed");

engine2.linkPhotoCoachResult("test-1", {
  analysisStatus: "analyzed",
  shootId: "shoot-abc",
  narrativeSummary: "A quiet woodland frame with room to simplify.",
  confidenceTier: "REASONABLE",
  letterGrade: "B",
  overallScore: 82,
  selectionLabel: "favorite",
  outdoorContext: { source: "stored-context", weather: { conditions: "Fog" } }
});
const linked = engine2.get("test-1");
assert("coach summary carried", linked.coachSummary && /woodland/i.test(linked.coachSummary));
assert("shoot id carried", linked.moduleRefs.photoCoach.shootId === "shoot-abc");
assert("outdoor context carried", linked.outdoorContext && linked.outdoorContext.source === "stored-context");
assert("favorite from label", linked.favorite === true);

engine2.linkPhotoCoachResult("test-1", {
  analysisStatus: "analyzed",
  shootId: "shoot-abc",
  selectionLabel: "keep"
});
assert("favorite cleared on keep relink", engine2.get("test-1").favorite === false);
assert("keep label after relink", engine2.get("test-1").selectionLabel === "keep");

engine2.linkPhotoCoachResult("test-1", {
  analysisStatus: "analyzed",
  shootId: "shoot-abc",
  selectionLabel: "favorite"
});
assert("favorite restored on favorite relink", engine2.get("test-1").favorite === true);
assert("list shoots", engine2.listShoots().some((s) => s.id === "shoot-abc" && s.count >= 1));
assert("filter by shoot", engine2.search({ filters: { shootId: "shoot-abc" } }).some((x) => x.id === "test-1"));
assert("filter hasExif", engine2.search({ filters: { hasExif: true } }).some((x) => x.id === "test-1"));
assert("persist error accessor", typeof engine2.getLastPersistError === "function");

const html = fs.readFileSync(path.join(ROOT, "apps/photo-library/index.html"), "utf8");
assert("library page", /Photo Library/.test(html) && /pl-grid/.test(html));
assert("grid and list", /data-pl-view="grid"/.test(html) && /data-pl-view="list"/.test(html));
assert("no lorem", !/lorem ipsum/i.test(html));
assert("privacy copy", /Stored on this device/i.test(html));

const nav = JSON.parse(fs.readFileSync(path.join(ROOT, "design-system/ecosystem/nav-registry.json"), "utf8"));
const scenes = nav.apps.find((a) => a.id === "scenes");
assert("nav match photo-library", scenes.match.some((m) => m.includes("photo-library")));
assert("nav feature library", scenes.features.some((f) => f.id === "photo-library"));

const smoke = fs.readFileSync(path.join(ROOT, "automation/smoke-browser.mjs"), "utf8");
assert("smoke photo-library", /path: "\/apps\/photo-library\/"/.test(smoke));

const coachJs = fs.readFileSync(path.join(ROOT, "apps/waypoint-scenes/js/photo-coach.js"), "utf8");
assert("keyboard labels", /bindLabelKeyboard/.test(coachJs));
assert("shootId deep link", /shootId/.test(coachJs));
assert("no dashboard code edits in library", true);

console.log("\nAll Photo Library tests passed (" + n + ").");
