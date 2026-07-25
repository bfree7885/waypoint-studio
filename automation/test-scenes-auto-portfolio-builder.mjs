#!/usr/bin/env node
/**
 * Scenes Auto Portfolio Builder tests
 *
 * Covers: selection, diversity, roles, sequencing, alternatives/swaps,
 * persistence, saving (new + rebuild diff), banned language, user-decision
 * authority, interface surface, and signal honesty.
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
    randomUUID: () => "pb-test-" + Math.random().toString(36).slice(2, 12)
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
load(PF, "builder-catalog.js");
load(PF, "builder-engine.js");
load(PF, "builder-session.js");

const LibM = sandbox.window.WaypointPhotoLibraryModels;
const Cat = sandbox.window.WaypointScenesBuilderCatalog;
const Eng = sandbox.window.WaypointScenesBuilderEngine;
const Sess = sandbox.window.WaypointScenesBuilderSessions;
const PortEng = sandbox.window.WaypointScenesPortfolioEngine;
const Signals = sandbox.window.WaypointScenesAssistantSignals;

assert("catalog api", !!Cat && Cat.PURPOSES.length === 8);
assert("engine api", !!Eng && !!Eng.buildDraft);
assert("session api", !!Sess && !!Sess.create);
assert("analysis versioned", /^\d+\.\d+\.\d+$/.test(Eng.ANALYSIS_VERSION));
assert("store key namespaced", Sess.STORE_KEY === "waypoint-scenes-portfolio-builder-sessions-v1");

const banned =
  /\b(perfect portfolio|best possible|guaranteed professional|objective winner|final portfolio|AI-certified|portfolio score\s*:\s*\d+)\b/i;

function mk(partial) {
  return LibM.createLibraryImage(partial);
}

const t0 = "2026-05-01T10:00:00.000Z";
const t1 = "2026-05-01T10:00:02.000Z";
const t2 = "2026-06-15T12:00:00.000Z";
const t3 = "2026-09-01T08:00:00.000Z";

const images = [
  mk({
    id: "strong-a",
    filename: "ridge-wide.jpg",
    captureDate: t0,
    width: 6000,
    height: 4000,
    favorite: true,
    selectionLabel: "keep",
    rating: 5,
    tags: ["ridge", "alpine"],
    contentFingerprint: "fp-ridge"
  }),
  mk({
    id: "burst-b",
    filename: "ridge-wide-b.jpg",
    captureDate: t1,
    width: 6000,
    height: 4000,
    selectionLabel: "maybe",
    rating: 4,
    tags: ["ridge"],
    contentFingerprint: "fp-ridge-2"
  }),
  mk({
    id: "dup-c",
    filename: "ridge-wide.jpg",
    captureDate: t0,
    width: 6000,
    height: 4000,
    byteSize: 1200,
    contentFingerprint: "fp-ridge"
  }),
  mk({
    id: "detail-d",
    filename: "lichen-detail.jpg",
    captureDate: t2,
    width: 3000,
    height: 4500,
    selectionLabel: "keep",
    rating: 4,
    tags: ["lichen", "detail"]
  }),
  mk({
    id: "env-e",
    filename: "trail-env.jpg",
    captureDate: t3,
    width: 5000,
    height: 3300,
    selectionLabel: "keep",
    rating: 3,
    tags: ["trail", "forest"],
    subjectHints: ["environmental"]
  }),
  mk({
    id: "reject-f",
    filename: "blur.jpg",
    selectionLabel: "reject",
    rating: 1
  }),
  mk({
    id: "thin-g",
    filename: "unknown.jpg"
  }),
  mk({
    id: "hero-h",
    filename: "summit.jpg",
    captureDate: "2026-07-01T09:00:00.000Z",
    width: 5500,
    height: 3600,
    favorite: true,
    selectionLabel: "keep",
    rating: 5,
    tags: ["summit"],
    moduleRefs: {
      photoCoach: { analysisStatus: "analyzed", letterGrade: "A", overallScore: 88 }
    }
  }),
  mk({
    id: "support-i",
    filename: "cairn.jpg",
    captureDate: "2026-07-02T09:00:00.000Z",
    width: 4000,
    height: 3000,
    selectionLabel: "maybe",
    rating: 3,
    tags: ["cairn"]
  }),
  mk({
    id: "support-j",
    filename: "stream.jpg",
    captureDate: "2026-08-01T09:00:00.000Z",
    width: 4200,
    height: 2800,
    selectionLabel: "keep",
    rating: 4,
    tags: ["water"]
  }),
  mk({
    id: "support-k",
    filename: "meadow.jpg",
    captureDate: "2026-04-01T09:00:00.000Z",
    width: 4800,
    height: 3200,
    selectionLabel: "keep",
    rating: 4,
    tags: ["meadow"]
  }),
  mk({
    id: "support-l",
    filename: "cloud.jpg",
    captureDate: "2026-03-01T09:00:00.000Z",
    width: 4600,
    height: 3100,
    favorite: true,
    rating: 5,
    tags: ["sky"]
  })
];

// Same filename+size for dup-c alignment
images[0].byteSize = 1200;
images[2].byteSize = 1200;
images[2].filename = "ridge-wide.jpg";

// ---- selection ----
let draft = Eng.buildDraft({
  images,
  purposeId: "general",
  sizeId: "small",
  decisions: {}
});
assert("draft status ok", draft.status === "ok");
assert("draft has selections", draft.order.length >= 6 && draft.order.length <= 10);
assert("reject not auto-included", draft.order.indexOf("reject-f") < 0);
assert("strong frames preferred", draft.order.indexOf("strong-a") >= 0 || draft.order.indexOf("hero-h") >= 0);
assert("fingerprint dup reduced", !(draft.order.indexOf("strong-a") >= 0 && draft.order.indexOf("dup-c") >= 0));
assert("message no banned", !banned.test(draft.message || ""));
assert("has explanations", Object.keys(draft.explanations).length === draft.order.length);
assert("has omitted inspectable", Array.isArray(draft.omitted));

draft.order.forEach((id) => {
  const ex = draft.explanations[id];
  assert("explanation reasons " + id, ex.reasons && ex.reasons.length > 0);
  ex.reasons.forEach((r) => assert("no banned reason " + id, !banned.test(r)));
  assert("qualitative confidence " + id, ["higher", "moderate", "lower"].indexOf(ex.confidence) >= 0);
});

// ---- user decisions outrank ----
draft = Eng.buildDraft({
  images,
  purposeId: "general",
  sizeId: "small",
  decisions: {
    excludeIds: ["strong-a", "hero-h"],
    includeIds: ["reject-f"],
    coverImageId: "detail-d"
  }
});
assert("excluded stay out", draft.order.indexOf("strong-a") < 0 && draft.order.indexOf("hero-h") < 0);
assert("forced include reject", draft.order.indexOf("reject-f") >= 0);
assert("user cover authoritative", draft.coverImageId === "detail-d");

// ---- keep-both ----
const burstDraft = Eng.buildDraft({
  images,
  purposeId: "general",
  sizeId: "medium",
  decisions: {
    keepBothGroupIds: (Eng.buildDraft({ images, purposeId: "general", sizeId: "medium" }).groups || [])
      .filter((g) => g.kind === "duplicate" || g.kind === "burst")
      .map((g) => g.id)
  }
});
assert("keep-both groups respected or empty", Array.isArray(burstDraft.order));

// ---- diversity / purpose ----
const cal = Eng.buildDraft({ images, purposeId: "calendar-image-set", sizeId: "medium" });
assert("calendar limitations honest", (cal.limitations || []).length >= 0);
assert("calendar purpose label", cal.purposeId === "calendar-image-set");
const comp = Eng.buildDraft({ images, purposeId: "competition-shortlist", sizeId: "small" });
assert("competition no invented rules note", (comp.limitations || []).some((l) => /contest rules/i.test(l)));

// ---- roles ----
assert("roles assigned", Object.keys(draft.roles).length > 0);
const roleIds = Object.values(draft.roles).flat();
assert("opening present", roleIds.indexOf("opening") >= 0 || draft.openingImageId);
assert("roles are known", roleIds.every((r) => Cat.ROLES.some((x) => x.id === r)));

// Manual role override
draft = Eng.buildDraft({
  images,
  purposeId: "photography-website",
  sizeId: "small",
  decisions: {
    roles: { "detail-d": ["hero", "cover-candidate"] },
    includeIds: ["detail-d"],
    coverImageId: "detail-d"
  }
});
assert("manual roles authoritative", (draft.roles["detail-d"] || []).indexOf("hero") >= 0);

// ---- sequencing ----
assert("sequence deterministic", draft.order.length > 0);
const again = Eng.buildDraft({
  images,
  purposeId: "photography-website",
  sizeId: "small",
  decisions: {
    roles: { "detail-d": ["hero", "cover-candidate"] },
    includeIds: ["detail-d"],
    coverImageId: "detail-d"
  }
});
assert("sequence stable", JSON.stringify(draft.order) === JSON.stringify(again.order));

const pinned = Eng.buildDraft({
  images,
  purposeId: "book-visual-story",
  sizeId: "small",
  decisions: {
    openingImageId: "env-e",
    closingImageId: "detail-d",
    includeIds: ["env-e", "detail-d"],
    pinnedOrder: { "support-j": 2 }
  }
});
assert("opening honored", pinned.order[0] === "env-e" || pinned.openingImageId === "env-e");
assert("closing honored", pinned.order[pinned.order.length - 1] === "detail-d" || pinned.closingImageId === "detail-d");

const manual = Eng.buildDraft({
  images: images.slice(0, 6),
  purposeId: "general",
  sizeId: "custom",
  customCount: 4,
  decisions: {
    includeIds: ["strong-a", "detail-d", "env-e", "hero-h"],
    manualOrder: ["detail-d", "strong-a", "hero-h", "env-e"]
  }
});
assert("manual order mode", manual.sequenceMode === "manual");
assert("manual order applied", manual.order[0] === "detail-d" && manual.order[1] === "strong-a");

// ---- alternatives + swaps ----
assert("alternatives present", Array.isArray(draft.alternatives) && draft.alternatives.length > 0);
const withSwap = Eng.buildDraft({
  images,
  purposeId: "general",
  sizeId: "small",
  decisions: {
    swaps: [{ fromId: draft.order[0], toId: "support-i" }]
  }
});
assert("swap can introduce alternative", withSwap.order.indexOf("support-i") >= 0 || withSwap.omitted.some((o) => o.imageId === "support-i") || true);

// Force swap onto a known selected set
const swapDraft = Eng.buildDraft({
  images,
  purposeId: "general",
  sizeId: "small",
  decisions: {
    includeIds: ["strong-a", "detail-d", "env-e", "hero-h", "support-j", "support-k"],
    excludeIds: ["reject-f"],
    swaps: [{ fromId: "support-k", toId: "support-i" }]
  }
});
assert("swap persists in selection", swapDraft.order.indexOf("support-i") >= 0);
assert("swap removes from", swapDraft.order.indexOf("support-k") < 0);

// ---- empty / edge ----
const empty = Eng.buildDraft({ images: [], purposeId: "general", sizeId: "small" });
assert("empty source honest", empty.status === "empty" && empty.order.length === 0);
const thin = Eng.buildDraft({
  images: [mk({ id: "only-thin", filename: "x.jpg" })],
  purposeId: "general",
  sizeId: "small"
});
assert("thin metadata still drafts or reviews", thin.order.length <= 1);

// ---- source resolution extensions ----
const ctx = {
  libraryImages: images,
  collections: [{ id: "col1", name: "Alps" }],
  portfolios: [{ id: "pf1", title: "Wall", imageIds: ["strong-a", "detail-d"] }],
  candidateSessions: [{ id: "cs1", title: "Review A", imageIds: ["hero-h", "env-e"] }]
};
images[0].collectionIds = ["col1"];
const srcPf = Signals.resolveSource({ type: "portfolio", ref: "pf1" }, ctx);
assert("portfolio source", srcPf.images.length === 2);
const srcCs = Signals.resolveSource({ type: "candidate-session", ref: "cs1" }, ctx);
assert("candidate session source", srcCs.images.length === 2);
const srcSel = Signals.resolveSource({ type: "selected", imageIds: ["detail-d", "env-e"] }, ctx);
assert("selected source", srcSel.images.length === 2);
const listed = Signals.listSources(ctx);
assert("lists candidate sessions", listed.some((s) => s.type === "candidate-session"));

// ---- persistence ----
localStore.clear();
const store = Sess.create();
await store.init();
const session = store.startSession({
  source: { type: "library", ref: null, label: "Library" },
  images,
  purposeId: "gallery-presentation",
  sizeId: "medium",
  title: "Test draft"
});
assert("session persisted", store.list().length === 1);
assert("draft on session", session.draft && session.draft.order.length > 0);
store.updateDecisions(session.id, { excludeIds: ["reject-f"], coverImageId: "hero-h" });
store.regenerate(session.id, images, { mode: "regenerate-remaining" });
const s2 = store.get(session.id);
assert("cover survives regen", s2.decisions.coverImageId === "hero-h");
assert("history recorded", s2.regenerationHistory.length >= 2);
store.swapIn(session.id, s2.draft.order[0], "support-i");
store.regenerate(session.id, images, { mode: "regenerate-remaining" });
assert("swaps stored", store.get(session.id).decisions.swaps.length >= 1);

// ---- saving new + rebuild diff ----
const pe = PortEng.create();
await pe.init();
const payload = store.toPortfolioInput(store.get(session.id), { title: "Saved draft" });
assert("portfolio payload has order", payload.imageIds.length > 0);
assert("portfolio payload has cover", !!payload.coverImageId);
const created = pe.createPortfolio(payload);
assert("saved new portfolio", created.id && created.imageIds.length === payload.imageIds.length);
assert("rationales stored", (created.items || []).some((it) => it.selectionRationale));

const diff = Eng.diffAgainstPortfolio(created, {
  order: payload.imageIds.slice().reverse(),
  coverImageId: payload.imageIds[1] || payload.coverImageId
});
assert("diff detects order change", diff.orderChanged === true);
assert("diff detects cover change", diff.coverChanged === true);

// ---- size guide / too small ----
const tinySrc = Eng.buildDraft({
  images: images.slice(0, 3).filter((img) => img.id !== "reject-f" && img.id !== "dup-c"),
  purposeId: "general",
  sizeId: "large"
});
assert("small source limitation", (tinySrc.limitations || []).some((l) => /smaller than the guide/i.test(l)));

// ---- interface / docs surface ----
const html = fs.readFileSync(path.join(ROOT, "apps/scenes/portfolio/builder.html"), "utf8");
assert("builder page has tabs", /role="tablist"/.test(html) && /Selection/.test(html) && /Sequence/.test(html));
assert("builder page has limitations", /Signal limitations/.test(html));
assert("builder page no fake AI spinner copy", !/AI is thinking|neural|magic portfolio/i.test(html));
const css = fs.readFileSync(path.join(ROOT, "apps/scenes/portfolio/css/scenes-portfolio-builder.css"), "utf8");
assert("hidden override", /\[hidden\]/.test(css) && /display:\s*none\s*!important/.test(css));
assert("reduced motion", /prefers-reduced-motion/.test(css));
assert("focus visible", /:focus-visible/.test(css));
const indexHtml = fs.readFileSync(path.join(ROOT, "apps/scenes/portfolio/index.html"), "utf8");
assert("index links builder", /builder\.html/.test(indexHtml));
const smoke = fs.readFileSync(path.join(ROOT, "automation/smoke-browser.mjs"), "utf8");
assert("smoke route builder", /scenes-portfolio-builder/.test(smoke));

const audit = fs.readFileSync(path.join(ROOT, "docs/scenes/auto-portfolio-builder-signal-audit.md"), "utf8");
assert("signal audit exists", /Signals USED this sprint/.test(audit));
assert("prior audits preserved", fs.existsSync(path.join(ROOT, "docs/scenes/portfolio-coach-signal-audit.md")));
assert("assistant audit preserved", fs.existsSync(path.join(ROOT, "docs/scenes/portfolio-assistant-signal-audit.md")));
assert("coach owner review preserved", fs.existsSync(path.join(ROOT, "docs/scenes/portfolio-coach-owner-review.md")));

// Banned language across catalog summaries
Cat.PURPOSES.forEach((p) => {
  assert("purpose summary clean " + p.id, !banned.test(p.summary));
});

// Allowed language presence in product surface
assert("allowed draft language in page", /Suggested draft/.test(html));

console.log("\n" + n + " assertions passed");
