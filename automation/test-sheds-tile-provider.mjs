#!/usr/bin/env node
/**
 * Sheds tile provider — refuse OSMF public tiles; keep production defaults.
 */
import fs from "fs";
import path from "path";
import vm from "vm";
import { fileURLToPath } from "url";

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

function loadTiles(extra) {
  const sandbox = Object.assign(
    {
      window: {},
      document: {
        querySelector: function () {
          return null;
        }
      },
      console
    },
    extra || {}
  );
  sandbox.global = sandbox;
  sandbox.globalThis = sandbox;
  sandbox.window = sandbox;
  vm.runInNewContext(
    fs.readFileSync(path.join(ROOT, "apps/shed-hunting/js/sheds-tile-provider.js"), "utf8"),
    sandbox
  );
  return sandbox.WaypointShedsTiles;
}

const Tiles = loadTiles();
assert("module loads", !!(Tiles && Tiles.createBasemaps));
assert("carto default street", /cartocdn/.test(Tiles.DEFAULTS.streetUrl));
assert("esri default topo", /arcgisonline/.test(Tiles.DEFAULTS.topoUrl));
assert("detects OSMF host", Tiles.isOsmPublicHost("a.tile.openstreetmap.org"));
assert("allows carto host", !Tiles.isOsmPublicHost("a.basemaps.cartocdn.com"));

let threw = false;
try {
  Tiles.assertNotOsmPublic("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", "street");
} catch (e) {
  threw = /OSMF|refuse/i.test(String(e && e.message));
}
assert("assertNotOsmPublic throws for OSMF", threw);

const fakeL = {
  tileLayer: function (url, opts) {
    return {
      url: url,
      options: opts,
      on: function () {
        return this;
      }
    };
  }
};
const layers = Tiles.createBasemaps(fakeL);
assert("createBasemaps street url carto", /cartocdn/.test(layers.street.url));
assert("createBasemaps topo url esri", /arcgisonline/.test(layers.topo.url));
assert("baseLayers has street label", !!layers.baseLayers[layers.config.streetLabel]);

const overridden = loadTiles({
  WAYPOINT_MAP_TILE_CONFIG: {
    streetUrl: "https://example-tiles.test/{z}/{x}/{y}.png",
    streetId: "custom",
    streetLabel: "Custom",
    streetAttribution: "Custom tiles"
  }
});
const custom = overridden.createBasemaps(fakeL);
assert("runtime override street url", /example-tiles\.test/.test(custom.street.url));
assert("runtime override label", custom.config.streetLabel === "Custom");

let overrideOsmThrew = false;
try {
  loadTiles({
    WAYPOINT_MAP_TILE_CONFIG: {
      streetUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    }
  }).createBasemaps(fakeL);
} catch (e) {
  overrideOsmThrew = true;
}
assert("override cannot reintroduce OSMF public tiles", overrideOsmThrew);

const appSrc = fs.readFileSync(path.join(ROOT, "apps/shed-hunting/js/sheds-map-app.js"), "utf8");
assert("map app uses WaypointShedsTiles", /WaypointShedsTiles/.test(appSrc));
assert("map app attaches reliability", /attachReliability/.test(appSrc));
assert("map app has tile status UI", /setTileStatus|map-tile-status/.test(appSrc));

if (failures.length) {
  console.error("\nSheds tile provider tests failed (" + failures.length + ").");
  process.exit(1);
}
console.log("\nAll sheds tile provider tests passed (" + passed + ").");
