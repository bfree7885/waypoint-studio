/**
 * Fieldry collections — favorites and private lists via platform stores.
 */
(function (global) {
  "use strict";

  var U = function () { return global.FieldryUtil; };

  function fieldryCollections() {
    var Stores = global.WDS && global.WDS.platform;
    if (!Stores || !Stores.Collections) return [];
    return Stores.Collections.list().filter(function (c) {
      return !c.appId || c.appId === "fieldry";
    });
  }

  function renderHomeTeaser() {
    var cols = fieldryCollections();
    var withItems = cols.filter(function (c) { return (c.itemIds || []).length > 0; });
    if (!withItems.length) {
      return (
        '<section class="fld-home-section" aria-labelledby="fld-col-title">' +
          '<h2 id="fld-col-title">Collections</h2>' +
          '<p class="fld-home-lead">Save favorites and private lists from any observation. Start by opening a record and choosing Save to favorites.</p>' +
          '<a href="#/collections">Open collections</a>' +
        "</section>"
      );
    }
    var items = withItems.slice(0, 4).map(function (c) {
      var href = c.kind === "favorites"
        ? "#/history?favorites=1"
        : "#/history?collection=" + encodeURIComponent(c.id);
      return (
        '<li><a href="' + href + '">' +
          U().escapeHtml(c.title) +
          '<span>' + (c.itemIds || []).length + " saved</span></a></li>"
      );
    }).join("");
    return (
      '<section class="fld-home-section" aria-labelledby="fld-col-title">' +
        '<header class="fld-home-section__head">' +
          '<h2 id="fld-col-title">Collections</h2>' +
          '<a href="#/collections">Manage</a>' +
        "</header>" +
        '<ul class="fld-home-discover">' + items + "</ul>" +
      "</section>"
    );
  }

  function render() {
    var cols = fieldryCollections();
    var list = cols.length
      ? '<ul class="fld-collections-list">' + cols.map(function (c) {
          var n = (c.itemIds || []).length;
          var href = c.kind === "favorites"
            ? "#/history?favorites=1"
            : "#/history?collection=" + encodeURIComponent(c.id);
          return (
            '<li class="fld-collections-item">' +
              '<a href="' + href + '">' +
                '<strong>' + U().escapeHtml(c.title) + "</strong>" +
                '<span>' + n + " observation" + (n === 1 ? "" : "s") +
                (c.kind === "favorites" ? " · Favorites" : "") +
                "</span>" +
              "</a>" +
            "</li>"
          );
        }).join("") + "</ul>"
      : '<div class="fld-empty">' +
          '<p class="fld-empty__title">No collections yet</p>' +
          '<p class="fld-empty__text">Open any observation and save it to favorites, or create a private list like Backyard Birds.</p>' +
          '<a class="wds-btn wds-btn--primary" href="#/history">Browse history</a>' +
        "</div>";

    return (
      '<section class="fld-collections" aria-labelledby="fld-collections-title">' +
        '<header class="fld-view-head">' +
          '<a class="fld-form__back" href="#/">← Home</a>' +
          '<h1 id="fld-collections-title">Collections</h1>' +
          '<p class="fld-view-lead">Private lists on this device. Use them to keep favorites and themes you want to revisit.</p>' +
        "</header>" +
        list +
      "</section>"
    );
  }

  global.FieldryCollections = {
    render: render,
    renderHomeTeaser: renderHomeTeaser,
    list: fieldryCollections
  };
})(typeof window !== "undefined" ? window : global);
