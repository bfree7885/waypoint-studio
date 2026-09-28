#!/usr/bin/env node
/**
 * Map-first field UX V1 — presentation shell.
 * Does not score, fetch weather, or start a browser.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(root, "apps/shed-hunting/map/index.html"), "utf8");
const css = fs.readFileSync(path.join(root, "apps/shed-hunting/css/sheds-map.css"), "utf8");
const app = fs.readFileSync(path.join(root, "apps/shed-hunting/js/sheds-map-app.js"), "utf8");
const tiles = fs.readFileSync(path.join(root, "apps/shed-hunting/js/sheds-tile-provider.js"), "utf8");

let passed = 0;
const failures = [];
function assert(name, cond) {
  if (cond) {
    passed += 1;
    console.log("PASS", name);
  } else {
    failures.push(name);
    console.log("FAIL", name);
  }
}

function fnBody(name) {
  const re = new RegExp("function " + name + "\\s*\\([^)]*\\)\\s*\\{");
  const start = app.search(re);
  if (start < 0) return "";
  let i = app.indexOf("{", start);
  let depth = 0;
  for (let j = i; j < app.length; j += 1) {
    if (app[j] === "{") depth += 1;
    else if (app[j] === "}") {
      depth -= 1;
      if (depth === 0) return app.slice(i, j + 1);
    }
  }
  return "";
}

assert("A radar panel hidden in markup", /id="radar-p0-panel"[^>]*\bhidden\b/.test(html));
assert("A radar panel forced off the map", /#radar-p0-panel\[hidden\][\s\S]*display:\s*none\s*!important/.test(css));
assert("B why-bands live inside the briefing", /id="plan-details"[\s\S]{0,400}id="why-bands-today"/.test(html));
assert("B why-bands not a normal-map overlay", /#plan-card \.sheds-why-bands[\s\S]*position:\s*static/.test(css));
assert("C briefing peek hidden", /id="plan-card"[^>]*\bhidden\b/.test(html));
assert("D four-button dock hidden", /class="sheds-app-dock" hidden/.test(html));
assert("E layers control present", /id="btn-map-layers"/.test(html));
assert("F more control present", /id="btn-more"/.test(html) && /id="sheet-tools"/.test(html));

const wash = fnBody("setRadarWashVisible");
assert("G shed radar toggle function", /function setRadarWashVisible/.test(app) && /id="layer-shed-radar"/.test(html));
assert("H wash off uses heat visibility", /heatVisible\s*=\s*!!on/.test(wash) && /setHeatVisible\(!!on\)/.test(wash));
assert("I wash on does not recompute", !/scheduleRecompute/.test(wash));
assert("J today landscape radios preserved", /id="layer-radar-today"/.test(html) && /id="layer-radar-landscape"/.test(html) && /setRadarSurfaceMode\("today"\)/.test(app) && /setRadarSurfaceMode\("landscape"\)/.test(app));
assert("K weather radar disabled", /id="layer-weather-radar"[^>]*\bdisabled\b/.test(html) && /Coming later/.test(html) && !/nexrad|rainviewer/i.test(html));
assert("L observations checkbox remains", /id="obs-visible"/.test(html) && /obsVisible/.test(app));

const track = fnBody("setTrackVisible");
assert("M track toggle does not delete points", /state\.trackVisible\s*=\s*!!on/.test(track) && !/clear\(/.test(track) && !/addTrackPoint/.test(track));
assert("N saved basemap still wins", /loadSavedBasemapId\(\)/.test(tiles) && /if \(saved && basemaps/.test(tiles));
assert("O empty basemap preference is topo", /function resolveInitialBasemapId[\s\S]{0,280}return "topo"/.test(tiles));

const markerStart = app.indexOf("function userMarkerPresentation");
const markerSrc = app.slice(markerStart, markerStart + fnBody("userMarkerPresentation").length + "function userMarkerPresentation(headingDeg, approximate) ".length);
const userMarkerPresentation = new Function(app.slice(markerStart, app.indexOf("function userMarkerIcon")) + "\nreturn userMarkerPresentation;")();
assert("P valid heading is an arrow", userMarkerPresentation(90, false).kind === "arrow" && userMarkerPresentation(90, false).headingDeg === 90);
assert("P heading wraps", userMarkerPresentation(400, false).headingDeg === 40);
assert("Q missing heading is a dot", userMarkerPresentation(null, false).kind === "dot");
assert("Q approximate stays a ring", userMarkerPresentation(90, true).kind === "ring");
assert("Q non-finite heading is a dot", userMarkerPresentation(NaN, false).kind === "dot");

assert("R 390px credit wrap rule", /@media \(max-width:\s*390px\)[\s\S]*sheds-map-credit/.test(css));
assert("S 320px compact controls", /@media \(max-width:\s*320px\)[\s\S]*sheds-map-ctrls/.test(css));
assert("T map credit element", /id="map-data-credit"/.test(html) && /function syncMapCredits/.test(app) && /weatherCreditHtml/.test(app));
assert("T esri attribution not removed", /leaflet-control-attribution/.test(css) && /display:\s*block\s*!important/.test(css));
assert("U search areas still in layers", /id="search-areas-visible"/.test(html) && /id="btn-my-areas"/.test(html) && /id="btn-place-search"/.test(html));
assert("V inspect still available", /id="btn-inspect-point"/.test(html));
assert("W measure still available", /id="btn-measure"/.test(html));
assert("X field hunt still available", /id="btn-more-field-hunt"/.test(html) && /id="field-hunt-hud"/.test(html) && /id="btn-hunt-plans"/.test(html));
assert("Y stores not edited by this test", !/localStorage\.setItem/.test(fnBody("setTrackVisible")));

assert("normal taps do not set search", /if \(!state\.searchPlaceArmed\) return;/.test(app));
assert("heading refresh is outside the movement gate", /state\.headingDeg = displayedCourse\(/.test(app) && app.indexOf("state.headingDeg = displayedCourse(") < app.indexOf("var suppressed"));
assert("brand name hidden", /\.sheds-hud-brand__name,[\s\S]{0,240}display:\s*none\s*!important/.test(css));
assert("you chip hidden", /\.sheds-here[\s\S]{0,40}display:\s*none\s*!important/.test(css));
assert("interest legend hidden", /#heat-legend\[hidden\][\s\S]*display:\s*none\s*!important/.test(css));
assert("search areas legend hidden", /id="search-areas-legend"[^>]*\bhidden\b/.test(html));
assert("no weather radar implementation", !/RainViewer|NEXRAD|precipitation.?tile/i.test(app + html));

const layersPrimary = html.slice(html.indexOf('id="sheet-controls"'), html.indexOf('id="advanced-map-tools"'));
assert("layers primary skips diagnostic status", !/rule-based|needs SEARCH LOCATION|MODEL —/.test(layersPrimary));
assert("map type is the basemap heading", /id="map-type-heading">Map type/.test(html));
assert("advanced map tools disclosure", /id="advanced-map-tools"/.test(html) && /id="btn-measure"/.test(html) && /id="btn-inspect-point"/.test(html));
assert("more field groups", /id="more-saved-places"/.test(html) && /Saved Places/.test(html) && /id="more-planning"/.test(html) && /Tools &amp; Settings/.test(html));
assert("start hunt and add observation lead More", /id="btn-more-field-hunt">Start Hunt/.test(html) && /id="btn-add-obs">Add Observation/.test(html));
assert("mobile zoom buttons leave the map", /max-width:\s*719px[\s\S]{0,180}sheds-zoom-pair[\s\S]{0,80}display:\s*none/.test(css));
assert("credits join the leaflet attribution stack", /function placeMapCreditWithAttribution/.test(app));

console.log(passed + " passed, " + failures.length + " failed");
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
