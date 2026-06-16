/**
 * Waypoint Studio Design System — Icons
 * Shared stroke icon set (24×24, currentColor).
 */
(function (global) {
  "use strict";

  var PATHS = {
    search: "M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Zm5.2-2.3 3.8 3.8",
    upload: "M12 16V6m0 0-3.5 3.5M12 6l3.5 3.5M5 18h14",
    map: "M4 6.5 9 4.5l6 2 5-2v13l-5 2-6-2-5 2V6.5Z M9 4.5v13 M15 6.5v13",
    leaf: "M6 18c6-10 12-10 12-10s-2 8-8 10-4-2-4 0Z M8 14c2-4 6-6 10-6",
    compass: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm2.5-6.5-2-4-4-2 4 2 2 4Z",
    camera: "M5 8h2l1.5-2h7L17 8h2a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Zm7 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
    book: "M5 5.5A2.5 2.5 0 0 1 7.5 3H18v16H7.5A2.5 2.5 0 0 0 5 21.5V5.5Z M18 7H8",
    export: "M12 3v12m0 0 4-4m-4 4-4-4M5 19h14",
    close: "M6 6l12 12M18 6 6 18",
    chevron: "M9 6l6 6-6 6",
    menu: "M5 7h14M5 12h14M5 17h14",
    species: "M12 3c-2 4-6 6-6 10a6 6 0 0 0 12 0c0-4-4-6-6-10Z",
    weather: "M7 16a4 4 0 0 1 .5-8 5.5 5.5 0 0 1 10.6 1.8A3.5 3.5 0 0 1 17.5 18H7Z",
    terrain: "M3 18 9 8l4 6 3-4 5 8H3Z"
  };

  function svg(name, options) {
    options = options || {};
    var d = PATHS[name];
    if (!d) return "";
    var cls = "wds-icon" + (options.className ? " " + options.className : "");
    var label = options.label;
    var hidden = options.decorative !== false ? ' aria-hidden="true"' : "";
    var title = label ? "<title>" + label + "</title>" : "";
    return (
      '<svg class="' + cls + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"' + hidden + ">" +
        title + '<path d="' + d + '"/>' +
      "</svg>"
    );
  }

  global.WDS = global.WDS || {};
  global.WDS.icons = {
    names: Object.keys(PATHS),
    svg: svg
  };
})(window);
