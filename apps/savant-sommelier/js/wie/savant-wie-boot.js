/**
 * Shared script manifest comment — load order for Wine Intelligence Engine.
 * signals → palate → recommend → discovery → tasting → pairing → cellar → purchase
 * → education → compare → search → engine
 */
(function (global) {
  "use strict";
  global.SavantWIE = global.SavantWIE || {};
  global.SavantWIE.BOOT = { version: "2.0.0", phase: "wine-intelligence-engine" };
})(typeof window !== "undefined" ? window : globalThis);
