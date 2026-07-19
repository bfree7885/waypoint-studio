/**
 * SignalTerrain shared browser utilities.
 * Prefer this module over per-runtime copies of esc / loadJson / hash helpers.
 */
(function (global) {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function loadJson(url) {
    if (global.WDS && WDS.resilience && WDS.resilience.getJson) {
      return WDS.resilience
        .getJson(url, {
          providerId: "signalterrain",
          fetchOptions: { credentials: "same-origin" },
          persist: true,
          coalesce: true
        })
        .then(function (pack) {
          return pack && pack.data != null ? pack.data : pack;
        });
    }
    return fetch(url, { credentials: "same-origin" }).then(function (r) {
      if (!r.ok) throw new Error("Failed to load " + url + " (" + r.status + ")");
      return r.json();
    });
  }

  /**
   * Parse location.hash into { panel, id }.
   * Supports #panel and #panel/id.
   */
  function parseHash(locationObj) {
    var loc = locationObj || global.location;
    var h = String((loc && loc.hash) || "").replace(/^#/, "");
    if (!h) return { panel: null, id: null };
    var parts = h.split("/");
    return { panel: parts[0] || null, id: parts[1] || null };
  }

  function setHash(panel, id, locationObj) {
    var loc = locationObj || global.location;
    if (!loc) return;
    var next = id ? panel + "/" + id : String(panel || "");
    if (String(loc.hash || "").replace(/^#/, "") !== next) {
      loc.hash = next;
    }
  }

  /**
   * Canonical localStorage key catalog for SignalTerrain cyber surfaces.
   * Documented for privacy reviews — do not invent ad-hoc keys.
   */
  var STORAGE_KEYS = {
    researchWorkspace: "st_research_workspace_v01",
    researchCachePrefix: "st_research_cache_",
    inventory: "st_inventory_v1",
    securityProfile: "st_security_profile_v1",
    advisorSnapshot: "st_advisor_snapshot_v1",
    ingestPrefix: "wds.st.cyber.ingest.v01.",
    workspaceLayout: "st_cyber_workspace_layout_v01"
  };

  global.WDS = global.WDS || {};
  global.WDS.signalTerrainUtil = {
    esc: esc,
    loadJson: loadJson,
    parseHash: parseHash,
    setHash: setHash,
    STORAGE_KEYS: STORAGE_KEYS
  };
})(typeof window !== "undefined" ? window : globalThis);
