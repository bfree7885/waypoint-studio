/**
 * Bottom terminal / output placeholder.
 */
(function (global) {
  "use strict";

  var Hackbot = (global.Hackbot = global.Hackbot || {});
  var Views = (Hackbot.Views = Hackbot.Views || {});

  Views.renderTerminalPlaceholder = function (el) {
    if (!el) return;
    el.innerHTML =
      '<div class="hb-term-head">' +
      "<h2>Terminal / Output</h2>" +
      '<p class="hb-term-flag">Not enabled</p>' +
      "</div>" +
      '<pre class="hb-term-body" tabindex="0">' +
      "Terminal execution is not enabled yet.\n" +
      "Hackbot will not run commands, scans, or exploits from this panel.\n" +
      "Future output belongs only to authorized, local training or explicitly scoped research." +
      "</pre>";
  };
})(window);
