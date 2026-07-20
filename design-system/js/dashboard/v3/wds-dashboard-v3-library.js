/**
 * Dashboard V3 — Widget Library browser.
 * Browse by category (Favorites first), with short descriptions per widget.
 * Add / remove / hide / restore are preference operations; this module is the catalog UX API.
 */
(function (global) {
  "use strict";

  var BROWSE_ORDER = [
    "favorites",
    "photography",
    "weather",
    "hiking",
    "rivers",
    "air",
    "astronomy",
    "wildlife",
    "travel",
    "emergency"
  ];

  function api(name) {
    return global.WDS && global.WDS[name] ? global.WDS[name] : null;
  }

  function esc(s) {
    var M = api("dashboardV2Model");
    return M && M.escapeHtml ? M.escapeHtml(s) : String(s == null ? "" : s);
  }

  function catalog() {
    return api("dashboardV2Widgets");
  }

  function categories() {
    var Cats = api("dashboardV3Categories");
    if (Cats && Cats.all) {
      var byId = {};
      Cats.all().forEach(function (c) {
        byId[c.id] = c;
      });
      return BROWSE_ORDER.map(function (id) {
        return byId[id] || { id: id, label: id, description: "" };
      }).filter(Boolean);
    }
    var Cat = catalog();
    return Cat && Cat.categories ? Cat.categories() : [];
  }

  function entryFor(widget, prefs, model) {
    var Cat = catalog();
    var P = api("dashboardV2Prefs");
    prefs = prefs || (P && P.load ? P.load() : { enabled: [], hidden: [] });
    var enabled = (prefs.enabled || []).indexOf(widget.id) >= 0;
    var hidden = (prefs.hidden || []).indexOf(widget.id) >= 0;
    var avail =
      Cat && Cat.resolveAvailability ? Cat.resolveAvailability(widget, model) : widget.availability;
    var label = Cat && Cat.availabilityLabel ? Cat.availabilityLabel(avail) : avail;
    return {
      id: widget.id,
      name: widget.name,
      description: widget.description || "",
      category: widget.category,
      availability: avail,
      availabilityLabel: label,
      enabled: enabled,
      hidden: hidden,
      onBoard: enabled && !hidden,
      size: widget.size || "md",
      tab: widget.tab || null
    };
  }

  function widgetsInCategory(categoryId, prefs, model) {
    var Cat = catalog();
    var P = api("dashboardV2Prefs");
    prefs = prefs || (P && P.load ? P.load() : { enabled: [], hidden: [], order: [] });
    if (!Cat) return [];

    if (categoryId === "favorites") {
      var enabledIds = prefs.enabled || [];
      var order = prefs.order || [];
      var fav = enabledIds
        .slice()
        .sort(function (a, b) {
          return order.indexOf(a) - order.indexOf(b);
        })
        .map(function (id) {
          return Cat.byId(id);
        })
        .filter(Boolean)
        .map(function (w) {
          return entryFor(w, prefs, model);
        });
      return fav;
    }

    var list = Cat.inCategory ? Cat.inCategory(categoryId) : [];
    var Cats = api("dashboardV3Categories");
    if ((!list || !list.length) && Cats && Cats.normalizeId) {
      /* also match remapped legacy ids already applied by catalog bridge */
      list = (Cat.all ? Cat.all() : []).filter(function (w) {
        return (Cats.normalizeId(w.category) || w.category) === categoryId;
      });
    }
    return list.map(function (w) {
      return entryFor(w, prefs, model);
    });
  }

  /**
   * Full library index: categories → widget entries with short descriptions.
   */
  function browse(opts) {
    opts = opts || {};
    var P = api("dashboardV2Prefs");
    var prefs = opts.prefs || (P && P.load ? P.load() : null);
    var model = opts.model || null;
    return categories().map(function (cat) {
      var widgets = widgetsInCategory(cat.id, prefs, model);
      return {
        id: cat.id,
        label: cat.label,
        description: cat.description || "",
        icon: cat.icon || "dot",
        widgets: widgets,
        count: widgets.length
      };
    });
  }

  function browseCategory(categoryId, opts) {
    opts = opts || {};
    var index = browse(opts);
    for (var i = 0; i < index.length; i++) {
      if (index[i].id === categoryId) return index[i];
    }
    return null;
  }

  function renderCategoryNav(activeId, index) {
    index = index || browse();
    return (
      '<nav class="wdb-v3-library__nav" aria-label="Widget categories" data-wdb-v3-library-nav>' +
      '<ul class="wdb-v3-library__nav-list">' +
      index
        .map(function (cat) {
          var active = cat.id === activeId;
          return (
            '<li><button type="button" class="wdb-v3-library__nav-btn' +
            (active ? " is-active" : "") +
            '" data-wdb-v3-library-cat="' +
            esc(cat.id) +
            '"' +
            (active ? ' aria-current="true"' : "") +
            ">" +
            esc(cat.label) +
            ' <span class="wdb-v3-library__nav-count">' +
            cat.count +
            "</span></button></li>"
          );
        })
        .join("") +
      "</ul></nav>"
    );
  }

  function renderWidgetCard(entry) {
    var status =
      entry.hidden ? "Hidden" : entry.enabled ? "On board" : "Available";
    var actions = "";
    if (entry.hidden) {
      actions =
        '<button type="button" class="wds-btn wds-btn--secondary wds-btn--sm" data-wdb-v3-restore="' +
        esc(entry.id) +
        '">Restore</button>';
    } else if (entry.enabled) {
      actions =
        '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" data-wdb-v3-hide="' +
        esc(entry.id) +
        '">Hide</button>' +
        '<button type="button" class="wds-btn wds-btn--ghost wds-btn--sm" data-wdb-v3-remove="' +
        esc(entry.id) +
        '">Remove</button>';
    } else {
      actions =
        '<button type="button" class="wds-btn wds-btn--primary wds-btn--sm" data-wdb-v3-add="' +
        esc(entry.id) +
        '">Add</button>';
    }
    return (
      '<li class="wdb-v3-library__item" data-wdb-v3-library-widget="' +
      esc(entry.id) +
      '" data-enabled="' +
      (entry.enabled ? "1" : "0") +
      '" data-hidden="' +
      (entry.hidden ? "1" : "0") +
      '">' +
      '<div class="wdb-v3-library__meta">' +
      '<span class="wdb-v3-library__name">' +
      esc(entry.name) +
      "</span>" +
      '<span class="wdb-v3-library__desc">' +
      esc(entry.description) +
      "</span>" +
      '<span class="wdb-v3-library__status">' +
      esc(status) +
      " · " +
      esc(entry.availabilityLabel) +
      "</span>" +
      "</div>" +
      '<div class="wdb-v3-library__actions">' +
      actions +
      "</div></li>"
    );
  }

  function renderBrowser(opts) {
    opts = opts || {};
    var active = opts.category || "favorites";
    var index = browse(opts);
    var activeCat = null;
    for (var i = 0; i < index.length; i++) {
      if (index[i].id === active) {
        activeCat = index[i];
        break;
      }
    }
    if (!activeCat) activeCat = index[0] || { id: "favorites", label: "Favorites", widgets: [], description: "" };

    var emptyMsg =
      activeCat.id === "favorites"
        ? "No favorites yet. Add widgets from other categories to personalize your board."
        : "No widgets in this category yet.";

    return (
      '<div class="wdb-v3-library" data-wdb-v3-library data-active-category="' +
      esc(activeCat.id) +
      '">' +
      '<header class="wdb-v3-library__head">' +
      "<h3>Widget Library</h3>" +
      "<p>Browse by category. Every dashboard can look different.</p>" +
      "</header>" +
      renderCategoryNav(activeCat.id, index) +
      '<section class="wdb-v3-library__panel" aria-labelledby="wdb-v3-library-cat-title">' +
      '<h4 id="wdb-v3-library-cat-title">' +
      esc(activeCat.label) +
      "</h4>" +
      (activeCat.description
        ? '<p class="wdb-v3-library__cat-desc">' + esc(activeCat.description) + "</p>"
        : "") +
      (activeCat.widgets.length
        ? '<ul class="wdb-v3-library__list">' +
          activeCat.widgets.map(renderWidgetCard).join("") +
          "</ul>"
        : '<p class="wdb-v3-library__empty">' + esc(emptyMsg) + "</p>") +
      "</section></div>"
    );
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardV3Library = {
    VERSION: "3.1.0",
    BROWSE_ORDER: BROWSE_ORDER,
    categories: categories,
    browse: browse,
    browseCategory: browseCategory,
    widgetsInCategory: widgetsInCategory,
    renderBrowser: renderBrowser,
    renderCategoryNav: renderCategoryNav
  };
})(window);
