#!/usr/bin/env node
/**
 * Sheds tile provider — refuse OSMF; basemap catalog + persistence helpers.
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
  const store = {};
  const sandbox = Object.assign(
    {
      window: {},
      document: {
        querySelector: function () {
          return null;
        }
      },
      localStorage: {
        getItem: function (k) {
          return store[k] || null;
        },
        setItem: function (k, v) {
          store[k] = String(v);
        },
        removeItem: function (k) {
          delete store[k];
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
  sandbox.__store = store;
  return sandbox;
}

const sandbox = loadTiles();
const Tiles = sandbox.WaypointShedsTiles;
assert("module loads", !!(Tiles && Tiles.createBasemaps));
assert("carto default street", /cartocdn/.test(Tiles.DEFAULTS.streetUrl));
assert("esri default topo", /World_Topo_Map/.test(Tiles.DEFAULTS.topoUrl));
assert("esri satellite imagery", /World_Imagery/.test(Tiles.DEFAULTS.satelliteUrl));
assert("esri hybrid reference", /World_Boundaries_and_Places/.test(Tiles.DEFAULTS.hybridRefUrl));
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
      },
      addTo: function () {
        return this;
      }
    };
  },
  layerGroup: function (layers) {
    return {
      layers: layers,
      _shedsBasemapId: null,
      eachLayer: function (fn) {
        (layers || []).forEach(fn);
      },
      addTo: function () {
        return this;
      },
      on: function () {
        return this;
      }
    };
  }
};
const layers = Tiles.createBasemaps(fakeL);
assert("createBasemaps street url carto", /cartocdn/.test(layers.street.url));
assert("createBasemaps topo url esri", /World_Topo_Map/.test(layers.topo.url));
assert("createBasemaps satellite url", /World_Imagery/.test(layers.satellite.url));
assert("createBasemaps hybrid present", !!layers.hybrid);
assert("baseLayers has satellite label", !!layers.baseLayers[layers.config.satelliteLabel]);
assert("baseLayers has hybrid label", !!layers.baseLayers[layers.config.hybridLabel]);
assert("byId lists four basemaps", layers.ids.length === 4);

assert("normalize rejects junk", Tiles.normalizeBasemapId("nope") === null);
assert("normalize accepts satellite", Tiles.normalizeBasemapId("satellite") === "satellite");
assert("save/load basemap id", (() => {
  Tiles.saveBasemapId("hybrid");
  return Tiles.loadSavedBasemapId() === "hybrid";
})());
assert("resolve falls back street when empty", (() => {
  sandbox.localStorage.removeItem(Tiles.BASEMAP_STORAGE_KEY);
  return Tiles.resolveInitialBasemapId(layers) === "street";
})());

const mapLayers = [];
const fakeMap = {
  hasLayer: function (lyr) {
    return mapLayers.indexOf(lyr) >= 0;
  },
  removeLayer: function (lyr) {
    const i = mapLayers.indexOf(lyr);
    if (i >= 0) mapLayers.splice(i, 1);
  }
};
layers.street.addTo = function () {
  mapLayers.push(layers.street);
  return this;
};
layers.satellite.addTo = function () {
  mapLayers.push(layers.satellite);
  return this;
};
layers.topo.addTo = function () {
  mapLayers.push(layers.topo);
  return this;
};
layers.hybrid.addTo = function () {
  mapLayers.push(layers.hybrid);
  return this;
};
mapLayers.push(layers.street);
const applied = Tiles.applyBasemap(fakeMap, layers, "satellite");
assert("applyBasemap switches to satellite", applied === "satellite");
assert("applyBasemap removes prior street", mapLayers.indexOf(layers.street) < 0);
assert("applyBasemap adds satellite", mapLayers.indexOf(layers.satellite) >= 0);
assert("applyBasemap persisted", Tiles.loadSavedBasemapId() === "satellite");

const overridden = loadTiles({
  WAYPOINT_MAP_TILE_CONFIG: {
    streetUrl: "https://example-tiles.test/{z}/{x}/{y}.png",
    streetId: "custom",
    streetLabel: "Custom",
    streetAttribution: "Custom tiles"
  }
});
const custom = overridden.WaypointShedsTiles.createBasemaps(fakeL);
assert("runtime override street url", /example-tiles\.test/.test(custom.street.url));
assert("runtime override label", custom.config.streetLabel === "Custom");

let overrideOsmThrew = false;
try {
  loadTiles({
    WAYPOINT_MAP_TILE_CONFIG: {
      streetUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    }
  }).WaypointShedsTiles.createBasemaps(fakeL);
} catch (e) {
  overrideOsmThrew = true;
}
assert("override cannot reintroduce OSMF public tiles", overrideOsmThrew);

const appSrc = fs.readFileSync(path.join(ROOT, "apps/shed-hunting/js/sheds-map-app.js"), "utf8");
assert("map app uses WaypointShedsTiles", /WaypointShedsTiles/.test(appSrc));
assert("map app attaches reliability", /attachReliability/.test(appSrc));
assert("map app has tile status UI", /setTileStatus|map-tile-status/.test(appSrc));
assert("map app applies basemap helper", /applyBasemap|setBasemapFromUi/.test(appSrc));
assert("map app measure mode", /startMeasureMode|measureActive/.test(appSrc));
assert("map app inspect mode", /armInspectMode|inspectArmed/.test(appSrc));

const html = fs.readFileSync(path.join(ROOT, "apps/shed-hunting/map/index.html"), "utf8");
assert("html basemap select", /id="basemap-select"/.test(html));
assert("html measure button", /id="btn-measure"/.test(html));
assert("html inspect button", /id="btn-inspect-point"/.test(html));
assert("html field tools script", /sheds-map-field-tools\.js/.test(html));
assert("html satellite honesty note", /not proof of deer presence/i.test(html));

if (failures.length) {
  console.error("\nSheds tile provider tests failed (" + failures.length + ").");
  process.exit(1);
}
console.log("\nAll sheds tile provider tests passed (" + passed + ").");
