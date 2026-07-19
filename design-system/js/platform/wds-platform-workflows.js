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

  var WORKFLOWS = [
    {
      id: "photo-coach-to-fieldry",
      from: "photo-coach",
      to: "fieldry",
      label: "Log what you noticed in Fieldry",
      why: "Careful looking often becomes a lasting observation.",
      pathFromRoot: "apps/fieldry/",
      when: "after-session"
    },
    {
      id: "fieldry-to-scenes",
      from: "fieldry",
      to: "scenes",
      label: "Explore photography in Scenes",
      why: "Encounters can inspire how you look next time outdoors.",
      pathFromRoot: "apps/scenes/",
      when: "after-save"
    },
    {
      id: "sheds-to-fieldry",
      from: "shed-hunting",
      to: "fieldry",
      label: "Add wildlife sign to your life list",
      why: "Sheds notes and Fieldry records both describe what you found.",
      pathFromRoot: "apps/fieldry/",
      when: "after-observation"
    },
    {
      id: "foragecast-to-fieldry",
      from: "foragecast",
      to: "fieldry",
      label: "Record a find in Fieldry",
      why: "Seasonal guidance pairs well with a private voucher of what you saw.",
      pathFromRoot: "apps/fieldry/",
      when: "after-conditions"
    },
    {
      id: "dashboard-to-any",
      from: "dashboard",
      to: "studio",
      label: "Open another Studio app",
      why: "Dashboard is the outdoor hub; Studio home lists every experience.",
      pathFromRoot: "./",
      when: "always"
    },
    {
      id: "signalterrain-to-dashboard",
      from: "signalterrain",
      to: "dashboard",
      label: "Return to outdoor conditions",
      why: "Signal literacy sits beside outdoor situational awareness.",
      pathFromRoot: "apps/dashboard/",
      when: "always"
    },
    {
      id: "volunteer-to-fieldry",
      from: "waypoint-volunteer",
      to: "fieldry",
      label: "Keep stewardship in your personal history",
      why: "Volunteer moments can become private notes without gamification.",
      pathFromRoot: "apps/fieldry/",
      when: "after-save"
    },
    {
      id: "savant-to-places",
      from: "savant-sommelier",
      to: "studio",
      label: "Save vineyard sites as Studio places",
      why: "Sites you study should live in one place list.",
      pathFromRoot: "settings.html#places",
      when: "settings"
    },
    {
      id: "steepleaf-to-collections",
      from: "steepleaf",
      to: "studio",
      label: "Use Studio collections for tea lists",
      why: "Avoid a second collection system when platform collections exist.",
      pathFromRoot: "settings.html#collections",
      when: "settings"
    },
    {
      id: "fieldry-to-sheds",
      from: "fieldry",
      to: "shed-hunting",
      label: "Review deer / sign context in Sheds",
      why: "Wildlife life-list entries may relate to winter field craft.",
      pathFromRoot: "apps/shed-hunting/",
      when: "taxon-cervid"
    },
    {
      id: "fieldry-to-foragecast",
      from: "fieldry",
      to: "foragecast",
      label: "Check seasonal foraging context",
      why: "Flora and fungi notes pair with educational season status.",
      pathFromRoot: "apps/foragecast/",
      when: "taxon-flora"
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
      return w.from === appId;
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
    version: "1.0.0",
    list: list,
    forApp: forApp,
    href: function (id, depth) {
      var w = WORKFLOWS.filter(function (x) { return x.id === id; })[0];
      return w ? href(w, depth) : null;
    },
    renderLinksHtml: renderLinksHtml
  };
})(typeof window !== "undefined" ? window : globalThis);
