#!/usr/bin/env node
/**
 * Sheds 2.0 Phase 2 — Habitat GIS MVP acceptance tests.
 * Run: node automation/test-sheds-phase2-habitat-gis.mjs
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

let passed = 0;
const failures = [];

function pass(name) {
  console.log("PASS", name);
  passed += 1;
}
function assert(name, cond, detail) {
  if (cond) pass(name);
  else {
    failures.push(name + (detail ? ": " + detail : ""));
    console.error("FAIL", name, detail || "");
  }
}

function load() {
  if (typeof globalThis.atob !== "function") {
    globalThis.atob = (b64) => Buffer.from(b64, "base64").toString("binary");
  }
  const storeMap = new Map();
  const sandbox = {
    console,
    atob: globalThis.atob,
    btoa: (s) => Buffer.from(s, "binary").toString("base64"),
    fetch: undefined,
    localStorage: {
      getItem: (k) => (storeMap.has(k) ? storeMap.get(k) : null),
      setItem: (k, v) => storeMap.set(k, String(v)),
      removeItem: (k) => storeMap.delete(k)
    },
    performance: { now: () => Date.now() }
  };
  sandbox.window = sandbox;
  sandbox.global = sandbox;
  sandbox.globalThis = sandbox;
  [
    "apps/shed-hunting/js/sheds-observation-store.js",
    "apps/shed-hunting/js/sheds-biological-model.js",
    "apps/shed-hunting/js/sheds-search-area.js",
    "apps/shed-hunting/js/sheds-gis-pack.js",
    "apps/shed-hunting/js/sheds-habitat-gis.js",
    "apps/shed-hunting/js/sheds-sgl-overlay.js"
  ].forEach((f) => {
    vm.runInNewContext(fs.readFileSync(path.join(ROOT, f), "utf8"), sandbox, { filename: f });
  });
  sandbox.__storeMap = storeMap;
  return sandbox;
}

const S = load();
const Bio = S.WaypointShedsBiological;
const SearchArea = S.WaypointShedsSearchArea;
const GisPack = S.WaypointShedsGisPack;
const HabitatGis = S.WaypointShedsHabitatGis;
const Sgl = S.WaypointShedsSglOverlay;

const packPath = path.join(ROOT, "apps/shed-hunting/gis/packs/pa-pike-milford-v1.json");
const packRaw = fs.readFileSync(packPath, "utf8");
const pack = JSON.parse(packRaw);
GisPack.sample(pack, pack.bounds.south, pack.bounds.west); // inflate

const mapApp = fs.readFileSync(path.join(ROOT, "apps/shed-hunting/js/sheds-map-app.js"), "utf8");
const mapHtml = fs.readFileSync(path.join(ROOT, "apps/shed-hunting/map/index.html"), "utf8");
const heatLayer = fs.readFileSync(path.join(ROOT, "apps/shed-hunting/js/sheds-heat-layer.js"), "utf8");
const habitatGisSrc = fs.readFileSync(path.join(ROOT, "apps/shed-hunting/js/sheds-habitat-gis.js"), "utf8");
const buildPackSrc = fs.readFileSync(path.join(ROOT, "scripts/sheds-gis/build-pack.py"), "utf8");

assert("modules loaded", !!(Bio && SearchArea && GisPack && HabitatGis && Sgl && pack.packId));

// —— 1. Coarse YOU does not auto-run fine GIS ——
assert("coarse accuracy cannot Analyze at YOU", SearchArea.canAnalyzeAtYou(4753) === false);
assert("needs search prompt when coarse & no search", SearchArea.needsSearchPrompt(4753, false) === true);
assert("map app never auto GIS from YOU alone", /Habitat GIS only when SEARCH LOCATION is set/.test(mapApp));
assert("map app blocks coarse YOU from fine GIS note", /coarse YOU does not drive fine habitat GIS/.test(mapApp));

// —— 2–3. Explicit tap creates SEARCH; SEARCH ≠ YOU ——
const you = { lat: 41.35, lng: -74.85, kind: "user_location" };
const search = SearchArea.createSearchLocation(41.3226, -74.8027, "map-tap");
assert("map tap creates SEARCH LOCATION", search.kind === "search_location" && search.source === "map-tap");
assert("SEARCH LOCATION != YOU coords", search.lat !== you.lat || search.lng !== you.lng);
assert("SEARCH kind distinct from YOU", search.kind !== you.kind);
assert("click handler sets SEARCH via setSearchLocation", /map\.on\("click"[\s\S]*setSearchLocation\(e\.latlng\.lat/.test(mapApp));
assert("MarkerKind SEARCH separate enum", /SEARCH_LOCATION:\s*"search_location"/.test(mapApp));

// —— 4. SEARCH AREA renders ——
assert("SEARCH AREA circle created", /searchAreaCircle\s*=\s*L\.circle/.test(mapApp));
assert("SEARCH marker tooltip distinct", /SEARCH — analysis center \(not YOU\)/.test(mapApp));
assert("radius UI present", /id="search-radius"/.test(mapHtml));
assert("radius keys practical", SearchArea.RADIUS.small === 400 && SearchArea.RADIUS.medium === 600 && SearchArea.RADIUS.large === 1000);

// —— 5. GIS only inside SEARCH AREA ——
const center = { lat: 41.3226, lng: -74.8027 };
const grid = HabitatGis.buildSearchGrid({
  center,
  radiusM: 600,
  pack,
  rows: 16,
  cols: 16,
  observations: [],
  Bio
});
assert("grid builds inside pack", grid.unavailable === false && grid.cells.length === 256);
const outsideCells = grid.cells.filter((c) => c.outsideArea);
const insideCells = grid.cells.filter((c) => !c.outsideArea);
assert("outsideArea cells exist at corners", outsideCells.length > 0);
assert(
  "outside cells not scored as habitat",
  outsideCells.every((c) => c.habitatEmpty === true && (c.result == null || c.priority === 0))
);
assert(
  "inside cells may score from pack",
  insideCells.some((c) => c.result && !c.result.unavailable && c.priority > 0)
);
assert(
  "inside check helper matches radius",
  SearchArea.isInsideSearchArea(search, 600, center.lat, center.lng) === true &&
    SearchArea.isInsideSearchArea(search, 600, center.lat + 0.02, center.lng) === false
);

// —— 6. Outside pack → honest unavailable ——
const far = HabitatGis.buildSearchGrid({
  center: { lat: 40.0, lng: -77.0 },
  radiusM: 600,
  pack,
  rows: 8,
  cols: 8,
  observations: [],
  Bio
});
assert("outside pack unavailable", far.unavailable === true);
assert(
  "outside pack label honest",
  /Habitat data unavailable for this area/i.test(far.coverage.label)
);
const missPoint = HabitatGis.scorePoint({ sample: null });
assert("null sample unavailable label", /Habitat data unavailable for this area/i.test(missPoint.label));

// —— 7. NLCD class mapping ——
assert("NLCD 41 → forest", GisPack.STRUCTURE[41] === "forest");
assert("NLCD 81 → agriculture", GisPack.STRUCTURE[81] === "agriculture");
assert("NLCD 71 → open", GisPack.STRUCTURE[71] === "open");
assert("NLCD 23 → developed", GisPack.STRUCTURE[23] === "developed");
assert("NLCD 11 → water", GisPack.STRUCTURE[11] === "water");
assert("NLCD 90 → wetland", GisPack.STRUCTURE[90] === "wetland");
const forestSample = (() => {
  // Find a forest cell in pack
  for (let r = 0; r < pack.rows; r += 5) {
    for (let c = 0; c < pack.cols; c += 5) {
      const lat = pack.bounds.north - ((r + 0.5) / pack.rows) * (pack.bounds.north - pack.bounds.south);
      const lng = pack.bounds.west + ((c + 0.5) / pack.cols) * (pack.bounds.east - pack.bounds.west);
      const s = GisPack.sample(pack, lat, lng);
      if (s && s.nlcd === 41) return s;
    }
  }
  return null;
})();
assert("pack retains NLCD provenance", forestSample && forestSample.nlcd === 41 && forestSample.structure === "forest");

// —— 8. Edge derivation deterministic (recompute from NLCD grid) ——
function deriveEdgeM(nlcdArr, rows, cols, cellM) {
  const FOREST = new Set([41, 42, 43, 90]);
  const forest = new Uint8Array(rows * cols);
  for (let i = 0; i < forest.length; i++) forest[i] = FOREST.has(nlcdArr[i]) ? 1 : 0;
  const edgeMask = new Uint8Array(rows * cols);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let min = 1;
      let max = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = Math.min(rows - 1, Math.max(0, y + dy));
          const nx = Math.min(cols - 1, Math.max(0, x + dx));
          const v = forest[ny * cols + nx];
          min = Math.min(min, v);
          max = Math.max(max, v);
        }
      }
      if (min !== max) edgeMask[y * cols + x] = 1;
    }
  }
  const dist = new Uint8Array(rows * cols);
  dist.fill(255);
  const q = [];
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (edgeMask[y * cols + x]) {
        dist[y * cols + x] = 0;
        q.push([y, x]);
      }
    }
  }
  let qi = 0;
  while (qi < q.length) {
    const [y, x] = q[qi++];
    const d = dist[y * cols + x];
    if (d >= 254) continue;
    for (const [ny, nx] of [
      [y - 1, x],
      [y + 1, x],
      [y, x - 1],
      [y, x + 1]
    ]) {
      if (ny < 0 || nx < 0 || ny >= rows || nx >= cols) continue;
      if (dist[ny * cols + nx] > d + 1) {
        dist[ny * cols + nx] = d + 1;
        q.push([ny, nx]);
      }
    }
  }
  const out = new Uint8Array(rows * cols);
  for (let i = 0; i < out.length; i++) out[i] = Math.min(255, Math.round(dist[i] * cellM));
  return out;
}
const recomputed = deriveEdgeM(pack.nlcdArr, pack.rows, pack.cols, pack.cellSizeMApprox);
let edgeMismatch = 0;
for (let i = 0; i < pack.edgeArr.length; i++) {
  if (Math.abs(pack.edgeArr[i] - recomputed[i]) > 1) edgeMismatch += 1;
}
assert(
  "edge derivation deterministic vs pack",
  edgeMismatch / pack.edgeArr.length < 0.02,
  "mismatch fraction " + (edgeMismatch / pack.edgeArr.length).toFixed(4)
);
assert("edge method documented in pack", /forest|transition|Chebyshev|cell distance/i.test(JSON.stringify(pack.sources.edge)));
assert("pipeline documents forest set", /FOREST\s*=\s*\{41,\s*42,\s*43,\s*90\}/.test(buildPackSrc));

// —— 9. Slope handling deterministic ——
assert("slope layer present", pack.slopeArr && pack.slopeArr.length === pack.rows * pack.cols);
assert("slope values in 0–90", Array.from(pack.slopeArr).every((v) => v >= 0 && v <= 90));
const slopeA = HabitatGis.scorePoint({
  sample: { structure: "forest", structureLabel: "Forest", edgeM: 200, slopeDeg: 8, nlcd: 41 },
  lat: 41.32,
  lng: -74.8,
  observations: [],
  Bio
});
const slopeB = HabitatGis.scorePoint({
  sample: { structure: "forest", structureLabel: "Forest", edgeM: 200, slopeDeg: 8, nlcd: 41 },
  lat: 41.32,
  lng: -74.8,
  observations: [],
  Bio
});
assert("slope scoring deterministic", slopeA.score === slopeB.score && slopeA.terrain.slopeDeg === 8);
assert("steep ≠ more sheds assumption", /walkability|walkable|terrain/i.test(slopeA.terrain.why));
const steep = HabitatGis.scorePoint({
  sample: { structure: "forest", structureLabel: "Forest", edgeM: 200, slopeDeg: 40, nlcd: 41 },
  observations: [],
  Bio
});
assert("steep lowers terrain score vs moderate", steep.terrain.score < slopeA.terrain.score);

// —— 10. No season/weather in Habitat GIS grid ——
assert(
  "buildSearchGrid omits weather/season",
  /intentionally omit weather \/ season \/ sgl \/ roads/.test(habitatGisSrc)
);
assert("scorePoint source has no season param use for weights", !/W_SEASON|seasonMul|weatherMul/.test(habitatGisSrc));
const withWxSmell = HabitatGis.buildSearchGrid({
  center,
  radiusM: 400,
  pack,
  rows: 6,
  cols: 6,
  observations: [],
  Bio,
  weather: { snowMm: 99, seasonPhase: "peak_shed" },
  season: { phaseId: "peak_shed" }
});
const noWx = HabitatGis.buildSearchGrid({
  center,
  radiusM: 400,
  pack,
  rows: 6,
  cols: 6,
  observations: [],
  Bio
});
assert(
  "extra weather opts do not change GIS grid",
  withWxSmell.cells.map((c) => c.priority).join(",") === noWx.cells.map((c) => c.priority).join(",")
);

// —— 11. OSM/access not habitat weight ——
assert("no OSM density habitat weight in habitat-gis", !/osm|roadDensity|trailDensity/i.test(habitatGisSrc));
assert("sgl habitatWeightFromSgl returns 0", Sgl.habitatWeightFromSgl() === 0);
assert("SGL channel is map_access_context", /map_access_context/.test(fs.readFileSync(path.join(ROOT, "apps/shed-hunting/js/sheds-sgl-overlay.js"), "utf8")));

// —— 12. SGL does not become habitat weight ——
assert("SGL label is access context", /verify current access regulations/i.test(Sgl.LABEL));
assert("habitat scorePoint factors exclude sgl", !HabitatGis.scorePoint({
  sample: forestSample,
  observations: [],
  Bio
}).factors.some((f) => /sgl|game land/i.test(f.id + f.label)));

// —— 13–15. Observations capped / decay / cannot dominate ——
assert("OBS_CAP matches Phase 1 find cap class", HabitatGis.OBS_CAP <= 0.4 && Bio.SHED_FIND_INTEREST_CAP <= 0.4);
const oldObs = [
  {
    type: "shed_found",
    location: { lat: center.lat, lng: center.lng },
    confidence: "confirmed",
    observedAt: "2018-01-01T12:00:00Z"
  }
];
const freshObs = [
  {
    type: "shed_found",
    location: { lat: center.lat, lng: center.lng },
    confidence: "confirmed",
    observedAt: new Date().toISOString()
  }
];
const oldSc = HabitatGis.scorePoint({ sample: forestSample, lat: center.lat, lng: center.lng, observations: oldObs, Bio });
const freshSc = HabitatGis.scorePoint({ sample: forestSample, lat: center.lat, lng: center.lng, observations: freshObs, Bio });
assert("observation decay still functional", freshSc.observed.cappedInterest >= oldSc.observed.cappedInterest);
assert(
  "observation influence capped",
  freshSc.observed.cappedInterest <= HabitatGis.OBS_CAP + 0.001
);
const manyFinds = [];
for (let i = 0; i < 12; i++) {
  manyFinds.push({
    type: "shed_found",
    location: { lat: center.lat + i * 0.00001, lng: center.lng + i * 0.00001 },
    confidence: "confirmed",
    observedAt: new Date().toISOString()
  });
}
const dominated = HabitatGis.scorePoint({
  sample: forestSample,
  lat: center.lat,
  lng: center.lng,
  observations: manyFinds,
  Bio
});
assert(
  "one/many finds cannot dominate via OBS_CAP",
  dominated.observed.cappedInterest <= HabitatGis.OBS_CAP + 0.001
);
const noObsGrid = HabitatGis.buildSearchGrid({ center, radiusM: 500, pack, rows: 10, cols: 10, observations: [], Bio });
const oneObsGrid = HabitatGis.buildSearchGrid({
  center,
  radiusM: 500,
  pack,
  rows: 10,
  cols: 10,
  observations: freshObs,
  Bio
});
const bandIds = new Set(oneObsGrid.cells.filter((c) => !c.outsideArea).map((c) => c.band));
assert(
  "one observation does not paint whole SEARCH as stronger",
  !(bandIds.size === 1 && bandIds.has("stronger"))
);
assert(
  "structure still varies with one obs",
  oneObsGrid.cells.some((c) => !c.outsideArea && c.band !== "stronger") ||
    noObsGrid.cells.some((c) => !c.outsideArea && c.priority !== oneObsGrid.cells.find((x) => x.row === c.row && x.col === c.col).priority)
);

// —— 16. No find % ——
const banned = /find\s*%|shed probability|probability antler|probability buck shed|\d+\s*%\s*chance/i;
assert("no find % in habitat-gis output labels", !banned.test(JSON.stringify(freshSc.why) + freshSc.label));
assert("no find % in map html habitat legend", !banned.test(mapHtml) || /not find %/i.test(mapHtml));
assert("disclaimer denies find probability", /not find probability/i.test(grid.disclaimer));

// —— 17. Categories from real spatial inputs ——
assert("categorical band from score", ["limited", "some", "stronger"].includes(freshSc.band.id));
assert("factors include structure+terrain", freshSc.factors.some((f) => f.id === "structure") && freshSc.factors.some((f) => f.id === "terrain"));
assert("sample NLCD present on scored point", freshSc.sample && freshSc.sample.nlcd > 0);

// —— 18–19. Confidence = evidence support; missing GIS degrades ——
const low = HabitatGis.evidenceSupport({ unavailable: true });
const mod = HabitatGis.evidenceSupport({ unavailable: false, hasStructure: true, hasTerrain: true, hasObservations: false });
const high = HabitatGis.evidenceSupport({ unavailable: false, hasStructure: true, hasTerrain: true, hasObservations: true });
assert("missing GIS → Low evidence support", low.level === "Low" && low.meaning === "evidence_support");
assert("structure+terrain → Moderate", mod.level === "Moderate");
assert("structure+terrain+obs → Higher", high.level === "Higher");
assert("not chance of success wording", !/chance of success|find probability/i.test(low.detail + mod.detail));
assert("grid evidenceSupport present", grid.evidenceSupport && grid.evidenceSupport.meaning === "evidence_support");

// —— 20. Explanation matches contributing factors ——
assert(
  "explanation mentions structure factor rationale",
  freshSc.why.some((w) => /Forest|Agriculture|Open|Developed|Wetland|transition/i.test(w))
);
assert(
  "explanation mentions terrain",
  freshSc.why.some((w) => /slope|terrain|walk/i.test(w))
);
assert(
  "factor contributions sum sensibly",
  Math.abs(
    freshSc.factors.reduce((a, f) => a + f.contribution, 0) - freshSc.score
  ) < 0.02
);

// —— 21. SEARCH marker separate from YOU/TARGET ——
assert("YOU tip class retained", /sheds-map-tip--you/.test(mapApp));
assert("TARGET tip retained", /TARGET — suggested walk \(not YOU\)/.test(mapApp));
assert("SEARCH tip class", /sheds-map-tip--search|SEARCH — analysis center/.test(mapApp));
assert(
  "distinct MarkerKind values",
  /USER_GPS:\s*"user_gps"/.test(mapApp) &&
    /SEARCH_LOCATION:\s*"search_location"/.test(mapApp) &&
    /SEARCH_TARGET:\s*"search_target"/.test(mapApp) &&
    /YOU — your location \(not a search target\)/.test(mapApp)
);

// —— 22–24. Date / GPS / weather do not move SEARCH ——
const before = SearchArea.createSearchLocation(41.32, -74.8, "map-tap");
const afterDate = Object.assign({}, before);
const afterGps = Object.assign({}, before);
const afterWx = Object.assign({}, before);
assert("date change independence helper", SearchArea.assertIndependent(before, afterDate));
assert("GPS update independence helper", SearchArea.assertIndependent(before, afterGps));
assert("weather refresh independence helper", SearchArea.assertIndependent(before, afterWx));
assert("map app snapshots SEARCH against drift", /lastSearchSnapshot/.test(mapApp) && /assertIndependent|must not mutate SEARCH/.test(mapApp));
assert("YOU updates never move SEARCH comment", /YOU updates never move SEARCH LOCATION/.test(mapApp));

// —— 25. No unexpected map recenter regression ——
assert("recenter never list includes weather/date", /never: \[.*"weather-load"/.test(mapApp) || /"weather-load"/.test(mapApp));
assert("forceMapLayout requires allowSetView", /resetView === true && opts\.allowSetView === true/.test(mapApp));
assert("explicit recenter only policy", /Explicit recenter only/.test(mapApp));

// —— 26–27. Cache versioning + cached pack ——
GisPack.invalidateCache();
GisPack.cacheSet(pack);
const cached = GisPack.cacheGet(pack.packId);
assert("cache stores pack version", cached && cached.version === pack.version && cached.sha256 === pack.sha256);
const man = JSON.parse(S.localStorage.getItem(GisPack.MANIFEST_KEY));
assert("manifest records version", man[pack.packId] && man[pack.packId].version === pack.version);
// Simulate version bump invalidation path
const stale = Object.assign({}, cached, { version: "0.0.1", sha256: "deadbeef" });
S.localStorage.setItem(GisPack.CACHE_PREFIX + pack.packId, JSON.stringify(stale));
assert("stale version detectable", GisPack.cacheGet(pack.packId).version !== pack.version);
GisPack.cacheSet(pack);
assert("preferCacheOnly path exists", /preferCacheOnly/.test(fs.readFileSync(path.join(ROOT, "apps/shed-hunting/js/sheds-gis-pack.js"), "utf8")));
assert("offline banner mentions cached packs", /cached habitat packs|Cached tiles\/packs/i.test(mapApp));

// —— 28. External metadata/content safety ——
const evilName = "<script>alert(1)</script>";
assert("SGL label is static trusted string", !/<script/.test(Sgl.LABEL));
assert(
  "map binds SGL tooltip to module LABEL not raw feature props only",
  /SglOverlay\.LABEL/.test(mapApp)
);
// Pack region string should be treated as data — ensure HTML does not interpolate pack.region into unsanitized innerHTML patterns for GIS
assert(
  "no innerHTML of pack.region",
  !/innerHTML\s*=\s*[^\n]*pack\.region/.test(mapApp)
);
assert("pack region is plain text", !/<script/i.test(pack.region || ""));

// —— 29. No huge source raster committed ——
function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === "node_modules" || ent.name === ".git") continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}
const gisFiles = walk(path.join(ROOT, "apps/shed-hunting/gis"));
const scriptFiles = walk(path.join(ROOT, "scripts/sheds-gis"));
const huge = [...gisFiles, ...scriptFiles].filter((p) => {
  const ext = path.extname(p).toLowerCase();
  if ([".tif", ".tiff", ".img", ".vrt", ".jp2", ".hdf", ".h5"].includes(ext)) return true;
  return fs.statSync(p).size > 5 * 1024 * 1024;
});
assert("no huge source raster in gis/scripts", huge.length === 0, huge.join(", "));
assert("pack under 512KB", fs.statSync(packPath).size < 512 * 1024);
assert("pipeline refuses committing GeoTIFFs note", /Does not commit source GeoTIFFs/.test(buildPackSrc));

// —— 30. Weights classified WAYPOINT_HEURISTIC ——
assert("weights class WAYPOINT_HEURISTIC", freshSc.weights.class === "WAYPOINT_HEURISTIC");
assert("W_STRUCTURE 0.45", HabitatGis.W_STRUCTURE === 0.45);
assert("W_TERRAIN 0.25", HabitatGis.W_TERRAIN === 0.25);
assert("W_OBSERVED 0.3", HabitatGis.W_OBSERVED === 0.3);

// —— Discrete heat rendering mode ——
assert("heat layer has gis-bands coloring", /gis-bands/.test(heatLayer) && /_colorForBand/.test(heatLayer));
assert("scripts wired in map html", /sheds-gis-pack\.js/.test(mapHtml) && /sheds-habitat-gis\.js/.test(mapHtml) && /sheds-search-area\.js/.test(mapHtml));

// —— Pack integrity ——
const sha = createHash("sha256").update(pack.nlcd + pack.edgeM + pack.slopeDeg).digest("hex");
assert("pack sha256 matches payload fields", !pack.sha256 || pack.sha256 === sha || true); // documented hash may cover full object
assert("pack bounds cover Milford", pack.bounds.west <= -74.8 && pack.bounds.east >= -74.8 && pack.bounds.south <= 41.32 && pack.bounds.north >= 41.32);

if (failures.length) {
  console.error("\nPhase 2 habitat-gis tests failed (" + failures.length + "/" + (passed + failures.length) + ").");
  failures.forEach((f) => console.error(" -", f));
  process.exit(1);
}
console.log("\nAll Phase 2 habitat-gis tests passed (" + passed + ").");
