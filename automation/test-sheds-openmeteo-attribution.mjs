#!/usr/bin/env node
/**
 * Open-Meteo / Copernicus attribution compliance checks (display credit only).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { spawnSync } from "node:child_process";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const attrPath = path.join(root, "apps/shed-hunting/js/sheds-data-attribution.js");
const hostHtml = fs.readFileSync(path.join(root, "apps/shed-hunting/host/index.html"), "utf8");
const mapHtml = fs.readFileSync(path.join(root, "apps/shed-hunting/map/index.html"), "utf8");
const radarP0 = fs.readFileSync(path.join(root, "apps/shed-hunting/js/sheds-radar-p0.js"), "utf8");
const mapApp = fs.readFileSync(path.join(root, "apps/shed-hunting/js/sheds-map-app.js"), "utf8");
const provenance = fs.readFileSync(path.join(root, "docs/sheds/SHEDS-DATA-PROVENANCE.md"), "utf8");

assert.ok(fs.existsSync(attrPath), "attribution module exists");
assert.ok(hostHtml.includes("sheds-data-attribution.js"), "host loads attribution module");
assert.ok(hostHtml.includes('id="sheds-weather-credit"'), "host weather credit slot");
assert.ok(mapHtml.includes("sheds-data-attribution.js"), "map loads attribution module");
assert.ok(mapHtml.includes('id="radar-data-credit"'), "radar credit slot");
assert.ok(mapHtml.includes('id="search-areas-data-credit"'), "search areas credit slot");
assert.ok(mapHtml.includes('id="inspect-data-credit"'), "inspect credit slot");

const sandbox = { window: {}, globalThis: {} };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(attrPath, "utf8"), sandbox, { filename: "sheds-data-attribution.js" });
const Attr = sandbox.WaypointShedsDataAttribution;
assert.ok(Attr, "exports WaypointShedsDataAttribution");

const wx = Attr.weatherCreditHtml();
assert.ok(wx.includes("Weather data by Open-Meteo.com"), "weather wording");
assert.ok(wx.includes('href="https://open-meteo.com/"'), "open-meteo link");
assert.ok(wx.includes("creativecommons.org/licenses/by/4.0"), "CC BY link");
assert.ok(wx.includes("open-meteo.com/en/licence"), "licence link");
assert.ok(wx.includes('rel="noopener noreferrer"'), "external rel");

const elev = Attr.elevationCreditHtml();
assert.ok(elev.includes("Open-Meteo"), "elev mentions Open-Meteo");
assert.ok(elev.includes("Copernicus"), "elev mentions Copernicus");
assert.ok(elev.includes("doi.org/10.5270/ESA-c5d3d65"), "Copernicus DEM DOI");
assert.ok(elev.includes("copernicus.eu"), "Copernicus program link");

const pack = Attr.radarPackCreditHtml();
assert.ok(/USGS 3DEP/i.test(pack), "pack credit cites USGS 3DEP");
assert.ok(!/Copernicus|Open-Meteo elevation/i.test(pack), "pack credit does not claim OM elev");

assert.ok(/USGS 3DEP–derived slope from the local GIS pack/.test(radarP0), "radar explain pack slope wording");
assert.ok(/USGS 3DEP–derived aspect from the local GIS pack/.test(radarP0), "radar explain pack aspect wording");
assert.ok(/syncRadarDataCredit/.test(mapApp), "map syncs radar credit");
assert.ok(/searchAreasElevFromOpenMeteo/.test(mapApp), "search areas elev flag");
assert.ok(/inspect-data-credit/.test(mapApp), "inspect credit wired");

assert.ok(!/definitely non-commercial|terms are fully cleared|free API use is definitely permitted/i.test(provenance), "no overclaim in provenance");
assert.ok(/Does not clear/.test(provenance) || /owner decision/i.test(provenance), "provenance keeps terms ambiguity");

// Endpoints unchanged
assert.ok(!/customer-api\.open-meteo/.test(mapApp), "no customer API host");
assert.ok(!/apikey=/.test(mapApp), "no API key wiring in map-app");

const prep = spawnSync(process.execPath, [path.join(root, "scripts/prepare-shed-hunting-host.mjs")], {
  cwd: root,
  encoding: "utf8"
});
assert.equal(prep.status, 0, "prepare host: " + (prep.stderr || prep.stdout || "").slice(0, 500));
const dist = path.join(root, "dist/shedhunting");
const distIndex = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const distMap = fs.readFileSync(path.join(dist, "map/index.html"), "utf8");
assert.ok(fs.existsSync(path.join(dist, "js/sheds-data-attribution.js")), "dist has attribution js");
assert.ok(distIndex.includes("sheds-weather-credit"), "dist overview credit");
assert.ok(distMap.includes("radar-data-credit"), "dist map radar credit");
assert.ok(distMap.includes("Weather data by Open-Meteo.com") || distMap.includes("sheds-data-attribution.js"), "dist map has attribution module");
assert.ok(!fs.existsSync(path.join(dist, "docs")), "no docs in dist");
assert.ok(!fs.existsSync(path.join(dist, "assets/antler-options")), "no antler-options");

console.log("PASS sheds-openmeteo-attribution");
