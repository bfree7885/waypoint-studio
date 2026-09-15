#!/usr/bin/env node
/**
 * SignalTerrain V1.2 preparation — static CSV importer tests.
 * Deterministic. No network. Does not register packs or change V1.1 product data.
 * Run: node automation/test-signalterrain-sota-v1-2-import.mjs
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import {
  HEADER_ALIASES,
  IMPORTER_VERSION,
  PERMISSION_STATUS,
  PRODUCT_CATALOGUE,
  PRODUCT_DATA_DIR,
  generatePacks,
  hashBuffer,
  inspectSource,
  isNetworkLikeInput,
  mapHeaders,
  parseCsv,
  parseSummitRef,
  readLocalCsvFile
} from "../scripts/signalterrain/lib/sota-summit-csv.mjs";
import { PRODUCT_REGISTRATION_LOCKED } from "../scripts/signalterrain/promote-sota-summit-packs.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE = path.join(ROOT, "automation/fixtures/signalterrain/sota-summitslist-synthetic.csv");
const IMPORT_BIN = path.join(ROOT, "scripts/signalterrain/import-sota-summits.mjs");
const PROMOTE_BIN = path.join(ROOT, "scripts/signalterrain/promote-sota-summit-packs.mjs");
const PRODUCT_FILES = [
  "apps/summit-signal/data/ss-summit-catalogue.json",
  "apps/summit-signal/data/ss-summits-w2-gc.json",
  "apps/summit-signal/js/ss-summit-model.js",
  "apps/summit-signal/js/ss-sota-provider.js",
  "apps/summit-signal/index.html"
];

let passed = 0;
const failures = [];

function assert(name, cond, detail) {
  if (cond) {
    passed += 1;
    console.log("PASS", name);
  } else {
    failures.push(name + (detail ? ": " + detail : ""));
    console.error("FAIL", name, detail || "");
  }
}

function shaFile(rel) {
  return hashBuffer(fs.readFileSync(path.join(ROOT, rel)));
}

function loadModel() {
  const sandbox = { console };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  sandbox.globalThis = sandbox;
  vm.runInNewContext(
    fs.readFileSync(path.join(ROOT, "apps/summit-signal/js/ss-summit-model.js"), "utf8"),
    sandbox,
    { filename: "ss-summit-model.js" }
  );
  return sandbox.SignalTerrainSotaModel;
}

function tmpDir(name) {
  return fs.mkdtempSync(path.join(os.tmpdir(), "st-v12-import-" + name + "-"));
}

function writeTempCsv(name, text) {
  const dir = tmpDir(name);
  const file = path.join(dir, name + ".csv");
  fs.writeFileSync(file, text, "utf8");
  return file;
}

function runNode(script, args, extra) {
  return spawnSync(process.execPath, [script].concat(args), {
    cwd: ROOT,
    encoding: "utf8",
    env: Object.assign({}, process.env, extra && extra.env ? extra.env : {})
  });
}

const beforeHashes = {};
for (const rel of PRODUCT_FILES) beforeHashes[rel] = shaFile(rel);

assert("synthetic fixture exists", fs.existsSync(FIXTURE));
assert("synthetic fixture is not a real SOTA pack", /TEST-SYNTHETIC/.test(fs.readFileSync(FIXTURE, "utf8")));
assert("synthetic refs use XX association", /XX\/TS-001/.test(fs.readFileSync(FIXTURE, "utf8")));

/* A. CSV header mapping */
const officialHeader =
  "SummitCode,AssociationName,RegionName,SummitName,AltM,AltFt,GridRef1,GridRef2,Longitude,Latitude,Points,BonusPoints,ValidFrom,ValidTo,ActivationCount,ActivationDate,ActivationCall";
const officialMap = mapHeaders(officialHeader.split(","));
assert("A header mapping official SummitCode", officialMap.mapped.summitCode === 0, JSON.stringify(officialMap.mapped));
assert("A header mapping official Latitude", officialMap.mapped.latitude != null);
assert("A header mapping official Longitude", officialMap.mapped.longitude != null);
assert("A header mapping official AltM/Points", officialMap.mapped.altM != null && officialMap.mapped.points != null);
assert("A header mapping ok", officialMap.ok === true);

const aliasMap = mapHeaders("reference,association_name,region_name,summit_name,elevation_m,lng,lat,points".split(","));
assert("A alias reference→summitCode", aliasMap.mapped.summitCode === 0);
assert("A alias lat/lng", aliasMap.mapped.latitude != null && aliasMap.mapped.longitude != null);
assert("A HEADER_ALIASES covers summitCode", HEADER_ALIASES.summitCode.includes("summitcode"));

/* B. normalization */
const loaded = readLocalCsvFile(FIXTURE);
const inspection = inspectSource(loaded.text, loaded.file);
const alpha = inspection.records.find((r) => r.summitCode === "XX/TS-001");
const beta = inspection.records.find((r) => r.summitCode === "XX/TS-002");
assert("B parsed title line", /SOTA Summits List/.test(inspection.titleLine || ""));
assert("B Alpha name/coords/points/elev", !!(alpha && alpha.name === "Synthetic Alpha Peak" && alpha.latitude === 41.5 && alpha.longitude === -74.1 && alpha.points === 4 && alpha.altM === 500));
assert("B quoted comma name preserved", !!(beta && beta.name === "Synthetic Beta, Ridge"));
assert("B association/region from SummitCode", !!(alpha && alpha.associationCode === "XX" && alpha.regionCode === "TS"));
assert("B association name from column", alpha && alpha.associationName === "Synthetic Test Association");
assert("B parseSummitRef", parseSummitRef("W2/GC-001") && parseSummitRef("W2/GC-001").regionCode === "GC");
assert("B synthetic ref parses", parseSummitRef("XX/TS-001") != null);

/* C. association/region grouping */
assert("C three synthetic regions", inspection.regions.length === 3, JSON.stringify(inspection.regions));
assert("C TS count 2", inspection.regions.some((r) => r.key === "XX/TS" && r.count === 2));
assert("C association XX", inspection.associations.length === 1 && inspection.associations[0].code === "XX");

/* D. multi-pack generation */
const multi = generatePacks(inspection, { regions: ["XX/TS", "XX/TA"] });
assert("D two packs from two --region", multi.packs.length === 2, String(multi.packs.length));
const byAssoc = generatePacks(inspection, { associations: ["XX"] });
assert("D three packs from --association XX", byAssoc.packs.length === 3);

/* E. provenance */
const tsPack = multi.packs.find((p) => p.id === "XX-TS");
assert("E provenance source type", tsPack.payload.source.sourceType === "official-static-summit-list");
assert("E provenance acquisition method", tsPack.payload.source.sourceAcquisitionMethod === "manual user-supplied file");
assert("E provenance permission pending", tsPack.payload.source.permissionStatus === "pending");
assert("E provenance importer version", tsPack.payload.source.importerVersion === IMPORTER_VERSION);
assert("E provenance not registered", tsPack.payload.source.registeredWithProduct === false);
assert("E provenance filename", tsPack.payload.source.sourceFilename === "sota-summitslist-synthetic.csv");
assert("E provenance record count", tsPack.payload.source.recordCount === 2);

/* F. source hash */
assert("F inspect hash matches file", inspection.file.sha256 === hashBuffer(fs.readFileSync(FIXTURE)));
assert("F pack hash matches inspect", tsPack.payload.source.sourceHashSha256 === inspection.file.sha256);
assert("F sha256 hex length", /^[a-f0-9]{64}$/.test(inspection.file.sha256));

/* G. malformed latitude */
const badLat = inspectSource(
  "SummitCode,AssociationName,RegionName,SummitName,AltM,Longitude,Latitude,Points\nXX/TS-001,Synthetic Test Association,R,N,100,-74.1,not-a-lat,4\n"
);
assert("G malformed latitude reported", badLat.invalid.some((i) => i.field === "latitude"));
assert("G malformed latitude not in valid records", badLat.records.length === 0);

/* H. malformed longitude */
const badLng = inspectSource(
  "SummitCode,AssociationName,RegionName,SummitName,AltM,Longitude,Latitude,Points\nXX/TS-001,Synthetic Test Association,R,N,100,9999,41.5,4\n"
);
assert("H malformed longitude reported", badLng.invalid.some((i) => i.field === "longitude"));

/* I. malformed points */
const badPts = inspectSource(
  "SummitCode,AssociationName,RegionName,SummitName,AltM,Longitude,Latitude,Points\nXX/TS-001,Synthetic Test Association,R,N,100,-74.1,41.5,abc\n"
);
assert("I malformed points reported", badPts.invalid.some((i) => i.field === "points"));

/* J. duplicate exact rows */
assert("J exact duplicate counted", inspection.duplicates.exact.length === 1);
assert("J exact duplicate keeps one", inspection.records.filter((r) => r.summitCode === "XX/TS-001").length === 1);
assert("J source records include duplicate row", inspection.totals.sourceRecords === 5);
assert("J valid unique count 4", inspection.totals.valid === 4);

/* K. conflicting duplicate rows */
const conflictCsv =
  "SummitCode,AssociationName,RegionName,SummitName,AltM,Longitude,Latitude,Points\n" +
  "XX/TS-001,Synthetic Test Association,R,N,100,-74.1,41.5,4\n" +
  "XX/TS-001,Synthetic Test Association,R,N,100,-74.1,41.9,4\n";
const conflict = inspectSource(conflictCsv);
assert("K conflict detected", conflict.duplicates.conflicts.length === 1);
assert("K conflict fields include latitude", conflict.duplicates.conflicts[0].conflictingFields.includes("latitude"));
assert("K conflict marks ok false", conflict.ok === false);
let generateThrew = false;
try {
  generatePacks(conflict, { regions: ["XX/TS"] });
} catch (e) {
  generateThrew = /Conflicting duplicate/.test(String(e && e.message));
}
assert("K generate refuses conflicts", generateThrew);

/* L. dry-run output */
const dry = runNode(IMPORT_BIN, ["--input", FIXTURE, "--dry-run"]);
assert("L dry-run exit 0", dry.status === 0, dry.stderr);
assert("L dry-run lists associations", /Associations:/.test(dry.stdout) && /XX/.test(dry.stdout));
assert("L dry-run lists regions", /XX\/TS/.test(dry.stdout) && /XX\/TA/.test(dry.stdout) && /XX\/TB/.test(dry.stdout));
assert("L dry-run source hash", new RegExp(inspection.file.sha256).test(dry.stdout));
const dryOut = tmpDir("dryout");
const dryWithOut = runNode(IMPORT_BIN, ["--input", FIXTURE, "--dry-run", "--out", dryOut]);
assert("L dry-run with --out writes nothing", dryWithOut.status === 0 && fs.readdirSync(dryOut).length === 0);
const dryJson = runNode(IMPORT_BIN, ["--input", FIXTURE, "--dry-run", "--json"]);
const dryPayload = JSON.parse(dryJson.stdout);
assert("L dry-run json flag", dryPayload.dryRun === true && dryPayload.totals.valid === 4);

/* M. no-network behavior */
const urlRun = runNode(IMPORT_BIN, ["--input", "https://example.invalid/summitslist.csv", "--dry-run"]);
assert("M URL input refused", urlRun.status !== 0 && /network\/URL/i.test(urlRun.stderr + urlRun.stdout));
assert("M isNetworkLikeInput http", isNetworkLikeInput("https://example.invalid/summitslist.csv"));
assert("M isNetworkLikeInput local false", isNetworkLikeInput(FIXTURE) === false);
const importerSrc =
  fs.readFileSync(path.join(ROOT, "scripts/signalterrain/lib/sota-summit-csv.mjs"), "utf8") +
  fs.readFileSync(IMPORT_BIN, "utf8") +
  fs.readFileSync(PROMOTE_BIN, "utf8");
assert("M no fetch(", !/\bfetch\s*\(/.test(importerSrc));
assert("M no node http/https import", !/from ["']node:https?["']/.test(importerSrc));
assert("M no SOTA API host", !/api2\.sota\.org\.uk/.test(importerSrc));
assert("M no sotadata download URL", !/sotadata\.org\.uk/.test(importerSrc));

/* N. staging output */
const stage = tmpDir("stage");
const gen = runNode(IMPORT_BIN, [
  "--input",
  FIXTURE,
  "--out",
  stage,
  "--region",
  "XX/TS",
  "--region",
  "XX/TA",
  "--json"
]);
assert("N generate exit 0", gen.status === 0, gen.stderr + gen.stdout);
assert("N staged TS pack", fs.existsSync(path.join(stage, "ss-summits-xx-ts.json")));
assert("N staged TA pack", fs.existsSync(path.join(stage, "ss-summits-xx-ta.json")));
assert("N no TB pack when not selected", !fs.existsSync(path.join(stage, "ss-summits-xx-tb.json")));
assert("N import-report written", fs.existsSync(path.join(stage, "import-report.json")));
const report = JSON.parse(fs.readFileSync(path.join(stage, "import-report.json"), "utf8"));
assert("N report not registered", report.registeredWithProduct === false);
assert("N report permission pending", report.permissionStatus === "pending");
const productStage = runNode(IMPORT_BIN, ["--input", FIXTURE, "--out", PRODUCT_DATA_DIR, "--region", "XX/TS"]);
assert("N refuse product data dir", productStage.status !== 0 && /product catalogue directory/i.test(productStage.stderr));

const Model = loadModel();
const stagedTs = JSON.parse(fs.readFileSync(path.join(stage, "ss-summits-xx-ts.json"), "utf8"));
const packCheck = Model.validatePack(stagedTs);
assert("N staged pack validates against V1.1 model", packCheck.ok === true, JSON.stringify(packCheck.errors));
const catalog = Model.normalizeCatalog(stagedTs);
assert("N normalized Alpha present", !!(Model.findById(catalog.summits, "XX/TS-001") && Model.findById(catalog.summits, "XX/TS-001").name === "Synthetic Alpha Peak"));

/* O. no automatic product registration */
const promote = runNode(PROMOTE_BIN, ["--from", stage, "--permission-confirmed", "--register"]);
assert("O promote refuses registration", promote.status !== 0);
assert("O promote lock message", /PROMOTION REFUSED/.test(promote.stderr));
assert("O PRODUCT_REGISTRATION_LOCKED", PRODUCT_REGISTRATION_LOCKED === true);
assert("O catalogue still one pack", JSON.parse(fs.readFileSync(PRODUCT_CATALOGUE, "utf8")).packs.length === 1);
assert("O catalogue still W2-GC only", JSON.parse(fs.readFileSync(PRODUCT_CATALOGUE, "utf8")).packs[0].id === "W2-GC");
assert("O no synthetic pack in product data", !fs.existsSync(path.join(PRODUCT_DATA_DIR, "ss-summits-xx-ts.json")));

for (const rel of PRODUCT_FILES) {
  assert("product unchanged " + rel, shaFile(rel) === beforeHashes[rel]);
}

assert("permission status constant pending", PERMISSION_STATUS === "pending");
assert("csv parser quoted field", parseCsv('a,"b,c",d\n')[0][1] === "b,c");

if (failures.length) {
  console.error("\n" + failures.length + " failure(s)");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}
console.log("\n" + passed + " passed");
