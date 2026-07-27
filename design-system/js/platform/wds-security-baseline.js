/**
 * Waypoint Studio — client security baseline helpers.
 *
 * Enforces safe attributes on external links. Does not claim HTTP headers
 * GitHub Pages cannot serve.
 */
(function (global) {
  "use strict";

  function isExternalHttp(href) {
    if (!href) return false;
    try {
      var u = new URL(href, location.href);
      return (u.protocol === "http:" || u.protocol === "https:") && u.origin !== location.origin;
    } catch (e) {
      return false;
    }
  }

  function hardenAnchor(a) {
    if (!a || a.nodeType !== 1) return;
    var href = a.getAttribute("href") || "";
    if (!isExternalHttp(href)) return;
    var rel = (a.getAttribute("rel") || "").toLowerCase().split(/\s+/).filter(Boolean);
    ["noopener", "noreferrer"].forEach(function (token) {
      if (rel.indexOf(token) === -1) rel.push(token);
    });
    a.setAttribute("rel", rel.join(" "));
    if (a.getAttribute("target") === "_blank" || isExternalHttp(href)) {
      // Prefer explicit blank for third-party destinations opened as navigation
      // only when already targeting blank; do not force every external link to blank.
    }
  }

  function hardenTree(root) {
    var scope = root && root.querySelectorAll ? root : document;
    scope.querySelectorAll("a[href]").forEach(hardenAnchor);
  }

  function observe() {
    if (!global.MutationObserver || !document.documentElement) return;
    var mo = new MutationObserver(function (mutations) {
      mutations.forEach(function (m) {
        m.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          if (node.tagName === "A") hardenAnchor(node);
          else if (node.querySelectorAll) hardenTree(node);
        });
      });
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  function init() {
    hardenTree(document);
    observe();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  global.WDS = global.WDS || {};
  global.WDS.securityBaseline = {
    version: "1.0.0",
    hardenAnchor: hardenAnchor,
    hardenTree: hardenTree,
    init: init
  };
})(typeof window !== "undefined" ? window : globalThis);
