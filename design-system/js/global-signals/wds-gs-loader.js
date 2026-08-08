/**
 * Shared Global Signals production loader gates.
 * Production surfaces must refuse sample-demo / fixture modes.
 */
(function (global) {
  "use strict";

  var NS = (global.WDS = global.WDS || {});
  var GS = (NS.globalSignals = NS.globalSignals || {});

  var PRODUCTION_MODES = { live: true, "live-empty": true };
  var FIXTURE_MODES = {
    "sample-demo": true,
    fixture: true,
    demo: true,
    "curated-baseline": true
  };

  function isProductionMode(mode) {
    return Boolean(PRODUCTION_MODES[String(mode || "")]);
  }

  function isFixtureMode(mode) {
    return Boolean(FIXTURE_MODES[String(mode || "")]);
  }

  /**
   * Gate a dataset for production UI.
   * @param {object} data
   * @param {{allowFixture?: boolean}} opts
   */
  function gateDataset(data, opts) {
    opts = opts || {};
    if (!data || typeof data !== "object") {
      return { ok: false, reason: "missing_dataset", data: null };
    }
    var mode = data.mode;
    if (opts.allowFixture && isFixtureMode(mode)) {
      return { ok: true, reason: "fixture_allowed", data: data, production: false };
    }
    if (!isProductionMode(mode)) {
      return {
        ok: false,
        reason: "non_production_mode",
        mode: mode,
        data: null,
        message:
          "Refusing to render non-production Global Signals data (" +
          String(mode || "missing") +
          "). Fixtures belong under data/global-signals/fixtures/."
      };
    }
    return { ok: true, reason: "live", data: data, production: true };
  }

  async function fetchJson(url) {
    var res = await fetch(url, { credentials: "same-origin" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    return res.json();
  }

  async function loadProduction(url, opts) {
    var raw = await fetchJson(url);
    var gated = gateDataset(raw, opts);
    if (!gated.ok) {
      var err = new Error(gated.message || gated.reason);
      err.gate = gated;
      throw err;
    }
    return gated;
  }

  GS.loader = {
    isProductionMode: isProductionMode,
    isFixtureMode: isFixtureMode,
    gateDataset: gateDataset,
    loadProduction: loadProduction,
    PRODUCTION_MODES: PRODUCTION_MODES,
    FIXTURE_MODES: FIXTURE_MODES
  };
})(typeof window !== "undefined" ? window : globalThis);
