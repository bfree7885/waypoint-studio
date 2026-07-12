/**
 * Compatibility shim — platform shell is now the App Shell.
 * Prefer loading wds-app-nav-config.js + wds-app-nav.js + wds-app-shell.js.
 */
(function (global) {
  "use strict";
  if (global.WDS && global.WDS.appShell) return;
  // If app-shell was not loaded, expose a no-op-safe mount.
  global.WDS = global.WDS || {};
  global.WDS.platformShell = global.WDS.platformShell || {
    mount: function () {},
    autoMount: function () {},
    renderTopbar: function () { return ""; },
    renderFooter: function () { return ""; }
  };
})(typeof window !== "undefined" ? window : global);
