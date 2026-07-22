/**
 * OBSOLETE — Outdoor OS replaced Recovery tabs (Screen Spec §0.1 / Absolute Rules).
 * Stub kept so accidental references do not crash. Do not re-enable.
 * Product Outside never consults this module for presentation (engine short-circuits to OS).
 */
(function (global) {
  "use strict";
  global.WDS = global.WDS || {};
  global.WDS.dashboardRecovery = {
    isEnabled: function () { return false; },
    renderDashboard: null,
    mountRecovery: null
  };
})(window);
