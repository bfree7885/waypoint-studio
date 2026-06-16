/**
 * Waypoint Studio Design System — Navigation
 * Shared topbar, workspace tabs, and Learn section shell.
 */
(function (global) {
  "use strict";

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderTopbar(options) {
    options = options || {};
    var product = options.product || (global.WDS && global.WDS.core ? global.WDS.core.getProduct() : "scenes");
    var name = options.productName || "Waypoint Studio";
    var nav = (options.actions || []).map(function (action) {
      var cls = "wds-btn wds-btn--ghost wds-btn--sm";
      if (action.primary) cls = "wds-btn wds-btn--primary wds-btn--sm";
      return '<button type="button" class="' + cls + '" id="' + escapeHtml(action.id || "") + '">' + escapeHtml(action.label) + "</button>";
    }).join("");

    return (
      '<header class="wds-topbar">' +
        '<div class="wds-topbar__inner">' +
          '<a class="wds-brand" href="' + escapeHtml(options.homeHref || "#") + '">' +
            '<span class="wds-brand__mark" aria-hidden="true"></span>' +
            '<span class="wds-brand__name">' + escapeHtml(name) + "</span>" +
          "</a>" +
          (nav ? '<nav class="wds-nav" aria-label="Primary">' + nav + "</nav>" : "") +
        "</div>" +
      "</header>"
    );
  }

  function renderWorkspaceTabs(tabs) {
    return (
      '<nav class="wds-tabs" role="tablist" aria-label="Workspace">' +
        tabs.map(function (tab, i) {
          var active = tab.active || i === 0;
          return (
            '<button type="button" class="wds-tab' + (active ? " is-active" : "") + '" role="tab"' +
              ' id="tab-btn-' + escapeHtml(tab.id) + '" data-tab="' + escapeHtml(tab.id) + '"' +
              ' aria-selected="' + (active ? "true" : "false") + '" aria-controls="tab-' + escapeHtml(tab.id) + '">' +
              escapeHtml(tab.label) +
            "</button>"
          );
        }).join("") +
      "</nav>"
    );
  }

  /**
   * Required Learn section shell — every product includes this.
   */
  function renderLearnShell(options) {
    options = options || {};
    return (
      '<section class="wef-learn-shell" id="' + escapeHtml(options.id || "learn") + '" aria-label="' + escapeHtml(options.ariaLabel || "Learn") + '">' +
        '<div class="wef-learn-intro glass-panel">' +
          (options.mission ? '<p class="wef-mission">' + escapeHtml(options.mission) + "</p>" : "") +
          '<h2 class="wds-display-md">' + escapeHtml(options.title || "Learn") + "</h2>" +
          (options.intro ? '<p class="wds-lead">' + escapeHtml(options.intro) + "</p>" : "") +
        "</div>" +
        '<div id="' + escapeHtml(options.mountId || "learn-curriculum") + '" class="wef-curriculum-mount" aria-label="Curriculum"></div>' +
      "</section>"
    );
  }

  global.WDS = global.WDS || {};
  global.WDS.nav = {
    renderTopbar: renderTopbar,
    renderWorkspaceTabs: renderWorkspaceTabs,
    renderLearnShell: renderLearnShell
  };
})(window);
