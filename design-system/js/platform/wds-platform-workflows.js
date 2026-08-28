/**
 * Waypoint Studio — Cross-app workflow helpers
 *
 * Natural handoffs only. Each workflow declares why it exists.
 * Does not auto-navigate; apps render links when context fits.
 *
 *   WDS.platformWorkflows.list()
 *   WDS.platformWorkflows.forApp(appId)
 *   WDS.platformWorkflows.href(workflowId, depth)
 *   WDS.platformWorkflows.renderLinksHtml(appId, options)
 */
(function (global) {
  "use strict";

  var PUBLIC_DESTINATIONS = {
    dashboard: 1,
    scenes: 1,
    "shed-hunting": 1,
    "photo-coach": 1,
    articles: 1,
    deck: 1
  };

  var WORKFLOWS = [
    {
      id: "dashboard-to-scenes",
      from: "dashboard",
      to: "scenes",
      label: "Open photography in Scenes",
      why: "Light and outdoor conditions pair with careful looking.",
      pathFromRoot: "apps/scenes/",
      when: "always"
    },
    {
      id: "sheds-to-dashboard",
      from: "shed-hunting",
      to: "dashboard",
      label: "Check outdoor conditions first",
      why: "Weather and light help plan a careful field day.",
      pathFromRoot: "apps/dashboard/",
      when: "always"
    },
    {
      id: "scenes-to-dashboard",
      from: "scenes",
      to: "dashboard",
      label: "Check light and outdoor conditions",
      why: "Photography decisions improve with live outdoor context.",
      pathFromRoot: "apps/dashboard/",
      when: "always"
    },
    {
      id: "photo-coach-to-dashboard",
      from: "photo-coach",
      to: "dashboard",
      label: "Check light and outdoor conditions",
      why: "Coaching pairs with knowing today’s light.",
      pathFromRoot: "apps/dashboard/",
      when: "always"
    },
    {
      id: "sheds-to-scenes",
      from: "shed-hunting",
      to: "scenes",
      label: "Read the landscape in Scenes",
      why: "Photographs and visual stories can deepen what a walk already showed.",
      pathFromRoot: "apps/scenes/",
      when: "after-observation"
    }
  ];

  function hrefsForDepth(depth) {
    depth = depth == null ? 0 : depth;
    if (depth === 0) return { root: "", apps: "apps/" };
    if (depth === 1) return { root: "../../", apps: "../" };
    return { root: "../../../", apps: "../../" };
  }

  function href(workflow, depth) {
    var H = hrefsForDepth(depth);
    var path = workflow.pathFromRoot || "";
    if (path.indexOf("apps/") === 0) {
      return H.apps + path.replace(/^apps\//, "");
    }
    if (path === "./") return H.root || "./";
    return H.root + path;
  }

  function list() {
    return WORKFLOWS.slice();
  }

  function forApp(appId) {
    return WORKFLOWS.filter(function (w) {
      return w.from === appId && PUBLIC_DESTINATIONS[w.to];
    });
  }

  function escapeHtml(str) {
    if (global.WDS && WDS.escapeHtml) return WDS.escapeHtml(str);
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderLinksHtml(appId, options) {
    options = options || {};
    var depth = options.depth != null ? options.depth : 1;
    var when = options.when || null;
    var rows = forApp(appId).filter(function (w) {
      if (!when) return true;
      return w.when === when || w.when === "always";
    });
    if (!rows.length) return "";
    return (
      '<aside class="wds-workflows" aria-label="Related Studio apps">' +
      '<p class="wds-workflows__title">Continue in Studio</p>' +
      "<ul>" +
      rows
        .map(function (w) {
          return (
            "<li><a href=\"" +
            escapeHtml(href(w, depth)) +
            "\">" +
            escapeHtml(w.label) +
            "</a>" +
            '<span class="wds-honesty">' +
            escapeHtml(w.why) +
            "</span></li>"
          );
        })
        .join("") +
      "</ul></aside>"
    );
  }

  global.WDS = global.WDS || {};
  global.WDS.platformWorkflows = {
    version: "1.2.0",
    list: list,
    forApp: forApp,
    href: function (id, depth) {
      var w = WORKFLOWS.filter(function (x) { return x.id === id; })[0];
      return w ? href(w, depth) : null;
    },
    renderLinksHtml: renderLinksHtml
  };
})(typeof window !== "undefined" ? window : globalThis);
