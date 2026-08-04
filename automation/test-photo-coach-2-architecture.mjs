#!/usr/bin/env node
/**
 * Photo Coach 2.0 architecture — schema, modules, providers, evidence, composition.
 * Deterministic / local fixtures only. No AI, no network.
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PC2 = path.join(ROOT, "apps/waypoint-scenes/js/photo-coach-2");

let n = 0;
function assert(name, cond, detail) {
  if (!cond) {
    console.error("FAIL", name, detail || "");
    process.exitCode = 1;
    throw new Error(name);
  }
  console.log("PASS", name);
  n += 1;
}

function load(file) {
  const code = fs.readFileSync(path.join(PC2, file), "utf8");
  vm.runInNewContext(code, sandbox, { filename: file });
}

const sandbox = {
  console,
  Math,
  Date,
  Array,
  Object,
  String,
  Number,
  JSON,
  Promise,
  setTimeout: (fn) => fn()
};
sandbox.globalThis = sandbox;
sandbox.window = sandbox;

load("schema.js");
load("evidence.js");
load("modules.js");
load("fixtures.js");
load("providers.js");
load("composer.js");

const Schema = sandbox.WaypointPhotoCoach2Schema;
const Evidence = sandbox.WaypointPhotoCoach2Evidence;
const Modules = sandbox.WaypointPhotoCoach2Modules;
const Fixtures = sandbox.WaypointPhotoCoach2Fixtures;
const Providers = sandbox.WaypointPhotoCoach2Providers;
const Coach = sandbox.WaypointPhotoCoach2;

assert("schema export", !!Schema);
assert("schema version 2.0.0", Schema.SCHEMA_VERSION === "2.0.0");
assert("eleven review sections", Schema.SECTION_IDS.length === 11);
assert(
  "required section titles",
  Schema.REVIEW_SECTIONS.map((s) => s.title).join("|") ===
    [
      "Overall Impression",
      "Composition",
      "Light",
      "Color",
      "Subject",
      "Story",
      "Technical Quality",
      "What Works",
      "What Weakens It",
      "Suggested Edits",
      "What To Practice Next"
    ].join("|")
);

assert("module count matches sections", Modules.MODULE_COUNT === 11);
assert("modules list length", Modules.listModules().length === 11);
assert("getModule by section", Modules.getModule("composition").sectionId === "composition");

const region = Evidence.regionFromZone("upper-left", "bright corner");
assert("region zone", region.zone === "upper-left");
assert("region normalized box", region.x === 0 && region.width === 0.34);

const exifRefs = Evidence.exifFromContext(Fixtures.FIXTURE_EXIF, ["iso", "fNumber", "missing"]);
assert("exif refs only present fields", exifRefs.length === 2);
assert("exif iso value", exifRefs[0].field === "iso" && exifRefs[0].value === 400);

const both = Evidence.evidenceBoth("center", "subject", Fixtures.FIXTURE_EXIF, ["focalLengthMm"]);
assert("evidence kind both", both.kind === "both");
assert("evidence has region+exif", !!both.region && both.exif.length === 1);

assert("providers registered", Providers.listProviders().length >= 2);
assert("placeholder provider", !!Providers.getProvider("placeholder.ai-ready"));
assert("heuristic provider", !!Providers.getProvider("heuristic.fixture"));
assert("provider contract has analyze", Providers.PROVIDER_CONTRACT.requiredMethods.includes("analyze"));

const placeholder = Coach.analyzePlaceholder({
  imageName: "empty.jpg",
  exif: Fixtures.FIXTURE_EXIF
});
assert("placeholder section order", Schema.assertSectionOrder(placeholder));
assert("placeholder engine status", placeholder.engineStatus === Schema.ENGINE_STATUS.placeholder);
assert("placeholder isPlaceholder", placeholder.isPlaceholder === true);
assert(
  "placeholder sections empty/placeholder",
  placeholder.sections.every((s) => s.status === Schema.SECTION_STATUS.placeholder || s.status === Schema.SECTION_STATUS.empty)
);
assert(
  "placeholder invents no recommendations",
  placeholder.sections.every((s) => (s.recommendations || []).length === 0)
);

const review = Coach.analyzeFixture({});
assert("fixture section order", Schema.assertSectionOrder(review));
assert("fixture engine ready", review.engineStatus === Schema.ENGINE_STATUS.ready);
assert("fixture provider id", review.providerId === "heuristic.fixture");
assert("fixture has exif", review.exif && review.exif.model === "ILCE-6700");

const titles = Coach.listSectionTitles(review);
assert("fixture titles length", titles.length === 11);
assert("fixture first title", titles[0] === "Overall Impression");
assert("fixture last title", titles[10] === "What To Practice Next");

Schema.SECTION_IDS.forEach((id) => {
  const section = Schema.sectionById(review, id);
  assert("section present " + id, !!section);
  assert("section ready " + id, section.status === Schema.SECTION_STATUS.ready);
  assert("section has summary or recs " + id, !!(section.summary || (section.recommendations && section.recommendations.length)));
});

const audit = Coach.auditEvidence(review, { requireEvidence: true });
assert("evidence audit section order", audit.sectionOrderOk);
assert("evidence audit all ok", audit.ok === true, "failCount=" + audit.failCount);
assert("evidence audit has citations", audit.okCount >= 11);

// Every recommendation should cite region and/or EXIF
let cited = 0;
review.sections.forEach((section) => {
  (section.recommendations || []).forEach((rec) => {
    const v = Schema.validateRecommendationEvidence(rec);
    assert("rec cites evidence in " + section.id, v.ok, v.reason + " :: " + rec.text.slice(0, 60));
    cited += 1;
  });
});
assert("multiple recommendations cited", cited >= 14);

// Module composition: override one section observation
const custom = Coach.analyzeWith("heuristic.fixture", {
  imageName: "custom.jpg",
  isSample: false,
  observations: Object.assign({}, Fixtures.woodlandDawnObservations(), {
    color: {
      summary: "Custom color note",
      items: [
        {
          text: "Warm rim light on the right edge.",
          zone: "right-third",
          regionLabel: "rim light",
          exifFields: ["iso"],
          confidence: 0.9
        }
      ]
    }
  })
});
const color = Schema.sectionById(custom, "color");
assert("custom observation applied", color.summary === "Custom color note");
assert("custom rec text", color.recommendations[0].text.indexOf("rim light") !== -1);
assert("custom rec has exif", color.recommendations[0].evidence[0].exif.some((e) => e.field === "iso"));

// Bad recommendation fails validation
const bad = Schema.createRecommendation({ text: "vague", evidence: [] });
assert("bad rec fails evidence", Schema.validateRecommendationEvidence(bad).ok === false);

// Register a future-AI-shaped provider without redesign
Providers.registerProvider({
  id: "future.ai-stub",
  label: "Future AI stub",
  isPlaceholder: false,
  capabilities: ["review-document"],
  analyze: function (ctx) {
    return Providers.composeReview(
      {
        imageName: (ctx && ctx.imageName) || "stub.jpg",
        exif: (ctx && ctx.exif) || Fixtures.FIXTURE_EXIF,
        observations: {
          overallImpression: {
            summary: "Stub overall",
            items: [{ text: "Stub note", zone: "full-frame", regionLabel: "frame" }]
          }
        },
        isSample: true,
        isPlaceholder: false
      },
      this
    );
  }
});
const stub = Coach.analyzeWith("future.ai-stub", {});
assert("future provider plugs in", stub.providerId === "future.ai-stub");
assert("future provider keeps section order", Schema.assertSectionOrder(stub));
assert("future provider overall ready", Schema.sectionById(stub, "overallImpression").status === Schema.SECTION_STATUS.ready);

// Shell page exists
const shell = path.join(ROOT, "apps/photo-coach/review-v2/index.html");
assert("review-v2 shell exists", fs.existsSync(shell));
const shellHtml = fs.readFileSync(shell, "utf8");
assert("shell loads schema", shellHtml.includes("photo-coach-2/schema.js"));
assert("shell loads composer", shellHtml.includes("photo-coach-2/composer.js"));

console.log("\nOK", n, "assertions");
