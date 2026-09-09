#!/usr/bin/env node
/**
 * Sheds RADAR P2 — live current-condition Today surface tests.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const outDir = path.join(root, "docs/sheds/samples/radar-p2");
fs.mkdirSync(outDir, { recursive: true });

function loadScripts(files) {
  const sandbox = {
    console,
    window: {},
    globalThis: {},
    atob: (s) => Buffer.from(s, "base64").toString("binary"),
  };
  sandbox.window = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.global = sandbox;
  vm.createContext(sandbox);
  for (const rel of files) {
    const full = path.join(root, rel);
    assert.ok(fs.existsSync(full), `missing ${rel}`);
    vm.runInContext(fs.readFileSync(full, "utf8"), sandbox, { filename: rel });
  }
  return sandbox;
}

const sandbox = loadScripts([
  "apps/shed-hunting/js/sheds-habitat-gis.js",
  "apps/shed-hunting/js/sheds-gis-pack.js",
  "apps/shed-hunting/js/sheds-radar-base-landscape.js",
  "apps/shed-hunting/js/sheds-search-priority.js",
  "apps/shed-hunting/js/sheds-search-priority-today.js",
  "apps/shed-hunting/js/sheds-search-priority-today-map.js",
  "apps/shed-hunting/js/sheds-weather.js",
  "apps/shed-hunting/js/sheds-radar-condition-frame.js",
  "apps/shed-hunting/js/sheds-radar-p0.js",
]);

const Radar = sandbox.WaypointShedsRadarP0;
const Model = sandbox.WaypointShedsSearchPriorityToday;
const Base = sandbox.WaypointShedsRadarBaseLandscape;
const Frame = sandbox.WaypointShedsRadarConditionFrame;
const Weather = sandbox.WaypointShedsWeather;
const GisPack = sandbox.WaypointShedsGisPack;
const SP = sandbox.WaypointShedsSearchPriority;

assert.ok(Radar && Model && Base && Frame && Weather && GisPack, "modules load");

const pack = JSON.parse(
  fs.readFileSync(path.join(root, "apps/shed-hunting/gis/packs/pa-pike-milford-v1.json"), "utf8")
);
GisPack.sample(pack, (pack.bounds.north + pack.bounds.south) / 2, (pack.bounds.east + pack.bounds.west) / 2);

const elevFix = JSON.parse(
  fs.readFileSync(path.join(root, "docs/sheds/samples/radar-p0/elev-fixture-pike-50x50.json"), "utf8")
);

const baseBuilt = Radar.buildBaseField({
  pack,
  bounds: elevFix.bounds,
  rows: elevFix.rows,
  cols: elevFix.cols,
  cellSizeMApprox: 90,
  BaseLandscape: Base,
  GisPack,
});
assert.equal(baseBuilt.ok, true, "A Today without Search Area — base builds");
const enriched = Radar.enrichWithTerrain(baseBuilt.field, elevFix.elevations, {
  SearchPriority: SP,
  zoom: 13,
});
assert.equal(enriched.field.terrainEnriched, true, "terrain enrich");
const field = enriched.field;
const baseKey = field.key;

// B P1 base invariant
const landscape = Radar.paintStaticBase(field);
assert.ok(landscape.ok && landscape.grid.surfaceMode === "landscape", "B landscape surface");
assert.equal(field.key, baseKey, "B base key unchanged by paint");

function dist(scores) {
  const a = [...scores].sort((x, y) => x - y);
  const pct = (p) => {
    const i = (a.length - 1) * p;
    const lo = Math.floor(i);
    const hi = Math.ceil(i);
    return a[lo] + (a[hi] - a[lo]) * (i - lo);
  };
  const mean = a.reduce((s, v) => s + v, 0) / a.length;
  const labels = { Lower: 0, Moderate: 0, Stronger: 0 };
  for (const s of a) labels[Base.displayLabel(s)]++;
  return {
    n: a.length,
    min: a[0],
    max: a[a.length - 1],
    mean,
    p10: pct(0.1),
    p25: pct(0.25),
    p50: pct(0.5),
    p75: pct(0.75),
    p90: pct(0.9),
    labels,
    frac: {
      Lower: labels.Lower / a.length,
      Moderate: labels.Moderate / a.length,
      Stronger: labels.Stronger / a.length,
    },
  };
}

function changeMetrics(baseGrid, todayGrid) {
  const a = baseGrid.cells;
  const b = todayGrid.cells;
  let changed = 0,
    inc = 0,
    dec = 0,
    unch = 0,
    clampHi = 0,
    clampLo = 0;
  const deltas = [];
  const scored = [];
  for (let i = 0; i < a.length; i++) {
    if (!a[i] || a[i].outsideArea || a[i].score == null) continue;
    if (!b[i] || b[i].outsideArea || b[i].score == null) continue;
    const d = b[i].score - a[i].landscapeScore;
    scored.push({ a: a[i], b: b[i], d });
    deltas.push(Math.abs(d));
    if (Math.abs(d) < 1e-9) unch++;
    else {
      changed++;
      if (d > 0) inc++;
      else dec++;
    }
    if (b[i].score >= 0.9999) clampHi++;
    if (b[i].score <= 0.0001 && a[i].landscapeScore > 0.0001) clampLo++;
  }
  const byBase = [...scored].sort(
    (x, y) => x.a.landscapeScore - y.a.landscapeScore || x.a.row - y.a.row || x.a.col - y.a.col
  );
  const byToday = [...scored].sort((x, y) => x.b.score - y.b.score || x.b.row - y.b.row || x.b.col - y.b.col);
  const rankBase = new Map(byBase.map((c, i) => [`${c.a.row},${c.a.col}`, i]));
  let rankMove = 0;
  for (let i = 0; i < byToday.length; i++) {
    rankMove += Math.abs(i - rankBase.get(`${byToday[i].b.row},${byToday[i].b.col}`));
  }
  return {
    changed,
    increased: inc,
    decreased: dec,
    unchanged: unch,
    clampHigh: clampHi,
    clampLow: clampLo,
    changedFrac: scored.length ? changed / scored.length : 0,
    meanAbsDelta: deltas.length ? deltas.reduce((s, v) => s + v, 0) / deltas.length : 0,
    maxAbsDelta: deltas.length ? Math.max(...deltas) : 0,
    meanRankAbsMove: scored.length ? rankMove / scored.length : 0,
  };
}

const landScores = landscape.grid.cells.filter((c) => !c.outsideArea).map((c) => c.score);
const landscapeDist = dist(landScores);

// C deterministic condition frame
const wxFake = {
  ready: true,
  fetchedAt: new Date().toISOString(),
  tempC: 2,
  dailyMinC: -3,
  dailyMaxC: 5,
  snowDepthKnown: true,
  snowDepthM: 0.02,
  snowDepthSource: "current",
  precipNowMm: 0,
  precipMm24h: 1,
  snowfallSumCm: 0,
  snowCover: { status: "light", depthM: 0.02 },
  freezeThaw: {
    status: "freeze_thaw",
    nightMinC: -3,
    dayMaxC: 5,
    source: "hourly",
    detail: "Overnight freeze then thaw",
  },
  tempTrend: {
    status: "warming",
    deltaC: 3.2,
    lookbackHours: 24,
    detail: "Warming",
  },
};
const frame1 = Frame.fromWeatherPackage(wxFake, {
  lat: 41.3091,
  lon: -74.7835,
  anchorSource: "map-center",
});
const frame2 = Frame.fromWeatherPackage(wxFake, {
  lat: 41.3091,
  lon: -74.7835,
  anchorSource: "map-center",
});
assert.equal(JSON.stringify(frame1), JSON.stringify(frame2), "C deterministic frame");
assert.equal(frame1.freshness, "fresh");
assert.ok(Frame.canDriveTodaySurface(frame1), "C usable");

// D no RNG / LLM in scorer sources
const modelSrc = fs.readFileSync(path.join(root, "apps/shed-hunting/js/sheds-search-priority-today.js"), "utf8");
const radarSrc = fs.readFileSync(path.join(root, "apps/shed-hunting/js/sheds-radar-p0.js"), "utf8");
const frameSrc = fs.readFileSync(path.join(root, "apps/shed-hunting/js/sheds-radar-condition-frame.js"), "utf8");
assert.ok(!/\bMath\.random\b|\bopenai\b|\banthropic\b|\bLLM\b/.test(modelSrc + radarSrc + frameSrc), "D no RNG/LLM");

// E fetch separated — condition frame has no fetch(
assert.ok(!/\bfetch\s*\(/.test(frameSrc), "E frame does not fetch");
assert.ok(/fromWeatherPackage/.test(frameSrc), "E adapter present");

const cold = Radar.applyFrame(field, "A", { Model });
const thaw = Radar.applyFrame(field, "B", { Model });
const neutral = Radar.applyFrame(field, "N", { Model });
assert.ok(cold.ok && thaw.ok && neutral.ok, "fixtures paint");

const coldMetrics = changeMetrics(landscape.grid, cold.grid);
const thawMetrics = changeMetrics(landscape.grid, thaw.grid);
const neutralMetrics = changeMetrics(landscape.grid, neutral.grid);

// F thaw × solar selective
assert.ok(thaw.grid.stats.solarModifiers > 0, "F solar mods");
assert.ok(thawMetrics.changed > 0 && thawMetrics.unchanged > 0, "F selective");
assert.equal(thawMetrics.decreased, 0, "F thaw only increases");
assert.ok(thawMetrics.changedFrac < 0.5, "F minority change");

// G snow × steep attenuation selective — no positive snow boost
assert.ok(cold.grid.stats.snowModifiers > 0, "G snow mods");
assert.ok(coldMetrics.increased === 0, "G no positive snow recolor");
assert.ok(coldMetrics.decreased > 0, "G steep attenuated");
assert.ok(coldMetrics.changedFrac < 0.25, "G selective attenuation");
const snowPos = cold.grid.cells.filter((c) =>
  (c.interest?.modifiers || []).some((m) => m.id === "snow_practicality" && m.delta > 0)
).length;
assert.equal(snowPos, 0, "G zero positive snow deltas on unit path");

// H neutral ≈ base
assert.equal(neutralMetrics.changed, 0, "H neutral unchanged");
assert.equal(neutralMetrics.meanAbsDelta, 0, "H zero delta");

// I no global boost
assert.equal(thawMetrics.unchanged > 0, true, "I some unchanged thaw");
assert.equal(coldMetrics.unchanged > 0, true, "I some unchanged cold");
const allUp =
  thaw.grid.cells.filter((c) => !c.outsideArea).every((c) => c.score > c.landscapeScore + 1e-9);
assert.equal(allUp, false, "I not uniform boost");

// J unsupported weather vars not scored — precip/wind absent from modifiers
const evPrecip = Model.evaluateCell({
  cell: {
    landscapeScore: 0.5,
    slopeDeg: 8,
    aspectCardinal: "S",
    featureKind: "gentle",
  },
  conditions: {
    snowCoverStatus: "none",
    freezeThawStatus: "above_freezing",
    tempTrendStatus: "little_change",
    precipNowMm: 50,
    windSpeedMs: 20,
  },
});
assert.equal(evPrecip.modifiers.length, 0, "J precip/wind not scored");

// K weather unavailable → Landscape
const badFrame = Frame.fromWeatherPackage(null, { lat: 41.3, lon: -74.8 });
const fallback = Radar.applyConditionFrame(field, badFrame, { Model, ConditionFrame: Frame });
assert.equal(fallback.grid.surfaceMode, "landscape", "K landscape fallback");
assert.ok(/unavailable/i.test(fallback.grid.conditionStatus || ""), "K status copy");

// L stale → Landscape
const staleWx = Object.assign({}, wxFake, {
  fetchedAt: new Date(Date.now() - Frame.FRESH_MS - 60_000).toISOString(),
});
const staleFrame = Frame.fromWeatherPackage(staleWx, { lat: 41.3, lon: -74.8 });
assert.equal(staleFrame.freshness, "stale", "L stale");
const stalePaint = Radar.applyConditionFrame(field, staleFrame, { Model, ConditionFrame: Frame });
assert.equal(stalePaint.grid.surfaceMode, "landscape", "L stale → landscape");

// M unsupported geography — empty outside handled by emptyRadarGrid contract
const empty = Radar.emptyRadarGrid("Outside pack");
assert.equal(empty.grid.unavailable, true, "M honest unavailable");

// N water remains non-searchable under thaw
const waterCell = field.cells.find((c) => !c.outsideArea && c.structure === "water");
assert.ok(waterCell, "N water cell");
const waterEv = Model.evaluateCell({
  cell: {
    landscapeScore: 0,
    landscapeLabel: "water",
    structure: "water",
    water: true,
    slopeDeg: 5,
    aspectCardinal: "S",
    featureKind: "gentle",
  },
  conditions: Radar.FRAMES.B.conditions,
});
assert.equal(waterEv.score, 0, "N water locked 0");
assert.equal(waterEv.modifiers.length, 0, "N no water mods");

// O developed remains suppressed
const devCell = field.cells.find((c) => !c.outsideArea && c.structure === "developed");
if (devCell) {
  const thawDev = thaw.grid.cells.find((c) => c.row === devCell.row && c.col === devCell.col);
  assert.ok(thawDev.score <= devCell.landscapeScore + 1e-9, "O developed no positive lift");
  assert.ok(thawDev.score < 0.35, "O developed stays suppressed");
}

// P/Q history/access excluded from base + frame
assert.ok(/Intentionally ignore|does NOT fetch/i.test(
  fs.readFileSync(path.join(root, "apps/shed-hunting/js/sheds-radar-base-landscape.js"), "utf8") +
    frameSrc
), "P/Q exclusions documented");

// R explanations match modifiers
const south = field.cells.find(
  (c) =>
    !c.outsideArea &&
    (c.aspectCardinal === "S" || c.aspectCardinal === "SE" || c.aspectCardinal === "SW") &&
    c.slopeDeg >= 2
);
assert.ok(south, "southish cell");
const thawExplain = Radar.explainAt(thaw.grid, { lat: south.lat, lng: south.lng });
const text = Radar.formatExplainText(thawExplain);
assert.ok(/TODAY|Today/i.test(text), "R today header");
assert.ok(/Landscape:/i.test(text), "R landscape section");
assert.ok(!/%|probability/i.test(text.replace(/Not find probability/g, "")), "R no % probability claims");

// S Today's Hunt factual consistency — same Weather derivation fields
assert.ok(typeof Weather.deriveFreezeThaw === "function", "S shared freeze");
assert.ok(typeof Weather.deriveTempTrend === "function", "S shared trend");
assert.ok(typeof Weather.classifySnowDepth === "function", "S shared snow");
const liveToday = Radar.applyConditionFrame(field, frame1, { Model, ConditionFrame: Frame });
assert.equal(liveToday.grid.surfaceMode, "today", "S live frame drives today");
assert.ok(liveToday.grid.stats.solarModifiers > 0, "S solar from shared freeze/warming");

// T frame switch no base/elev refetch — keys stable
Radar.applyFrame(field, "A", { Model });
Radar.applyConditionFrame(field, frame1, { Model, ConditionFrame: Frame });
Radar.paintStaticBase(field);
assert.equal(field.key, baseKey, "T base key stable across modes");

// U performance sanity
const t0 = performance.now();
for (let i = 0; i < 5; i++) Radar.applyConditionFrame(field, frame1, { Model, ConditionFrame: Frame });
const ms = (performance.now() - t0) / 5;
assert.ok(ms < 250, "U condition apply <250ms avg, got " + ms);

// V Search Areas / phase1 tri-scale still gets positive snow on benches
const triSnow = Model.evaluateCell({
  cell: { gisBand: "some", aspectCardinal: "N", slopeDeg: 4, featureKind: "bench" },
  conditions: { snowCoverStatus: "limiting", freezeThawStatus: "below_freezing", tempTrendStatus: "cooling" },
});
assert.ok(triSnow.modifiers.some((m) => m.id === "snow_practicality" && m.delta === 1), "V legacy +snow");
const triSteep = Model.evaluateCell({
  cell: { gisBand: "some", aspectCardinal: "N", slopeDeg: 25, featureKind: "steep" },
  conditions: { snowCoverStatus: "limiting", freezeThawStatus: "below_freezing", tempTrendStatus: "cooling" },
});
assert.ok(triSteep.modifiers.some((m) => m.id === "snow_practicality" && m.delta === -1), "V legacy -snow");

// Unit deltas exact
assert.equal(Model.UNIT_SOLAR_DELTA, 0.2);
assert.equal(Model.UNIT_SNOW_STEEP_DELTA, -0.2);
const unitSolar = Model.evaluateCell({
  cell: {
    landscapeScore: 0.5,
    slopeDeg: 8,
    aspectCardinal: "S",
    featureKind: "gentle",
  },
  conditions: Radar.FRAMES.B.conditions,
});
assert.ok(Math.abs(unitSolar.modifiers.find((m) => m.id === "solar_searchability").delta - 0.2) < 1e-9);

// W controlled cold/thaw/neutral proof recorded below
assert.ok(coldMetrics && thawMetrics && neutralMetrics, "W fixtures");

// X live Open-Meteo — attempt honestly; do not overwrite a prior successful proof with a rate-limit miss
function fetchLiveOm() {
  return new Promise((resolve) => {
    const url =
      "https://api.open-meteo.com/v1/forecast?latitude=41.3091&longitude=-74.7835&current=temperature_2m,wind_speed_10m,surface_pressure,precipitation,snow_depth&hourly=temperature_2m,wind_speed_10m,precipitation,surface_pressure,snow_depth&daily=snowfall_sum,sunrise,sunset,precipitation_sum,temperature_2m_min,temperature_2m_max&timezone=auto&past_days=2&forecast_days=3";
    const req = https.get(url, { timeout: 15000 }, (res) => {
      let body = "";
      res.on("data", (c) => (body += c));
      res.on("end", () => {
        if (res.statusCode !== 200) {
          resolve({ ok: false, reason: "http_" + res.statusCode });
          return;
        }
        try {
          resolve({ ok: true, json: JSON.parse(body) });
        } catch (e) {
          resolve({ ok: false, reason: "parse" });
        }
      });
    });
    req.on("error", (e) => resolve({ ok: false, reason: String(e.message || e) }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ ok: false, reason: "timeout" });
    });
  });
}

const live = await fetchLiveOm();
const priorLivePath = path.join(outDir, "live-proof.json");
let priorLive = null;
try {
  priorLive = JSON.parse(fs.readFileSync(priorLivePath, "utf8"));
} catch (e) {
  priorLive = null;
}
let liveProof = {
  attempted: true,
  ok: false,
  reason: live.reason || "unknown",
  note: "Not substituted with fixtures.",
};
if (live.ok) {
  const pkg = Weather.parseForecast(live.json, new Date());
  const liveFrame = Frame.fromWeatherPackage(pkg, {
    lat: 41.3091,
    lon: -74.7835,
    anchorSource: "proof-pike",
  });
  const livePaint = Radar.applyConditionFrame(field, liveFrame, { Model, ConditionFrame: Frame });
  const liveMetrics =
    livePaint.grid.surfaceMode === "today"
      ? changeMetrics(landscape.grid, livePaint.grid)
      : { note: "fell back to landscape", surfaceMode: livePaint.grid.surfaceMode };
  liveProof = {
    attempted: true,
    ok: true,
    sourceTimestamp: liveFrame.sourceTimestamp,
    freshness: liveFrame.freshness,
    freezeThawStatus: liveFrame.freezeThawStatus,
    tempTrendStatus: liveFrame.tempTrendStatus,
    snowCoverStatus: liveFrame.snowCoverStatus,
    snowDepthKnown: liveFrame.snowDepthKnown,
    snowDepthM: liveFrame.snowDepthM,
    limitations: liveFrame.limitations,
    surfaceMode: livePaint.grid.surfaceMode,
    stats: livePaint.grid.stats,
    metrics: liveMetrics,
    landscapeDist,
    todayDist:
      livePaint.grid.surfaceMode === "today"
        ? dist(livePaint.grid.cells.filter((c) => !c.outsideArea).map((c) => c.score))
        : landscapeDist,
  };
} else if (priorLive && priorLive.ok) {
  liveProof = Object.assign({}, priorLive, {
    retainedPriorSuccess: true,
    laterAttemptReason: live.reason || "unknown",
  });
}

const report = {
  generatedAt: new Date().toISOString(),
  checkpoint: "radar-p2",
  deltas: {
    UNIT_SOLAR_DELTA: Model.UNIT_SOLAR_DELTA,
    UNIT_SNOW_STEEP_DELTA: Model.UNIT_SNOW_STEEP_DELTA,
    positiveSnowBoostOnUnitPath: false,
    legacyTriPositiveSnow: true,
  },
  freshnessMs: Frame.FRESH_MS,
  landscape: landscapeDist,
  cold: {
    ...coldMetrics,
    today: dist(cold.grid.cells.filter((c) => !c.outsideArea).map((c) => c.score)),
    stats: cold.grid.stats,
  },
  thaw: {
    ...thawMetrics,
    today: dist(thaw.grid.cells.filter((c) => !c.outsideArea).map((c) => c.score)),
    stats: thaw.grid.stats,
  },
  neutral: {
    ...neutralMetrics,
    today: dist(neutral.grid.cells.filter((c) => !c.outsideArea).map((c) => c.score)),
    stats: neutral.grid.stats,
  },
  performance: { avgConditionApplyMs: Math.round(ms * 10) / 10 },
  liveProof,
  browserEvidence: {
    status: "not_captured_in_unit_suite",
    note: "Browser TODAY/LANDSCAPE screenshots remain a merge gate when live weather is available.",
  },
};

fs.writeFileSync(path.join(outDir, "distribution-report.json"), JSON.stringify(report, null, 2));
fs.writeFileSync(path.join(outDir, "live-proof.json"), JSON.stringify(liveProof, null, 2));

console.log("RADAR P2 tests PASS");
console.log(
  JSON.stringify(
    {
      coldChangedFrac: coldMetrics.changedFrac,
      thawChangedFrac: thawMetrics.changedFrac,
      neutralChanged: neutralMetrics.changed,
      liveOk: liveProof.ok,
      liveReason: liveProof.reason || null,
      avgMs: report.performance.avgConditionApplyMs,
    },
    null,
    2
  )
);

if (!liveProof.ok) {
  console.log("X live proof BLOCKED in this environment:", liveProof.reason);
}
