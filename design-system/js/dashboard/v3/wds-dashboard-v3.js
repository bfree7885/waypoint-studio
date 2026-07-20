/**
 * Dashboard V3 — Outdoor Intelligence foundation orchestrator.
 * Presentation shell over preserved V2 model / prefs / take / widget data.
 * Feature flag: localStorage waypoint-dashboard-v3 (default on; "0" falls back to V2 board).
 */
(function (global) {
  "use strict";

  var FLAG_KEY = "waypoint-dashboard-v3";
  var VERSION = "3.0.0";

  function api(name) {
    return global.WDS && global.WDS[name] ? global.WDS[name] : null;
  }

  function isEnabled() {
    try {
      var v = global.localStorage && global.localStorage.getItem(FLAG_KEY);
      if (v === "0") return false;
      if (v === "1") return true;
    } catch (e) { /* noop */ }
    return true;
  }

  function setEnabled(on) {
    try {
      if (global.localStorage) global.localStorage.setItem(FLAG_KEY, on ? "1" : "0");
    } catch (e) { /* noop */ }
  }

  function categoryIcon(catId) {
    var Cats = api("dashboardV3Categories");
    var c = Cats && Cats.byId ? Cats.byId(catId) : null;
    return (c && c.icon) || "dot";
  }

  function extractPrimary(widget, body) {
    if (!body || !body.html) return null;
    var m = String(body.html).match(/<dd>([^<]{1,48})<\/dd>/);
    if (m) return m[1];
    var strong = String(body.html).match(/<strong>([^<]{1,48})<\/strong>/);
    if (strong) return strong[1];
    return null;
  }

  function buildWidgetViews(model, selectedIds, layout) {
    var Cat = api("dashboardV2Widgets");
    var WR = api("dashboardV2WidgetRender");
    var Layout = api("dashboardV3Layout");
    var Contract = api("dashboardV3Contract");
    if (!Cat || !WR || !Contract) return [];

    var order =
      Layout && Layout.orderedIds
        ? Layout.orderedIds(layout, selectedIds)
        : selectedIds.slice();

    return order
      .map(function (id) {
        var widget = Cat.byId(id);
        if (!widget) return null;
        var body;
        try {
          body = WR.renderBody(widget, model);
        } catch (err) {
          return Contract.normalize({
            id: id,
            category: widget.category,
            title: widget.name,
            description: widget.description,
            error: "Widget failed to render",
            availability: "error",
            expandTab: widget.tab,
            icon: categoryIcon(widget.category)
          });
        }
        var size =
          Layout && Layout.sizeFor
            ? Layout.sizeFor(layout, id, widget)
            : widget.size || "md";
        return Contract.normalize({
          id: widget.id,
          category: widget.category,
          title: widget.name,
          description: widget.description,
          icon: categoryIcon(widget.category),
          primaryValue: extractPrimary(widget, body),
          availability: body.state,
          bodyHtml: body.html,
          lastUpdated: model.provider && model.provider.hydratedAt,
          expandTab: widget.tab,
          size: size,
          tab: widget.tab
        });
      })
      .filter(Boolean);
  }

  function renderWidgetsHtml(model, selectedIds) {
    var Layout = api("dashboardV3Layout");
    var Contract = api("dashboardV3Contract");
    var Cats = api("dashboardV3Categories");
    var Cat = api("dashboardV2Widgets");
    if (!Contract || !Cat) {
      return '<p class="wdb-v3-empty">Widget modules loading…</p>';
    }

    var layout = Layout ? Layout.load(selectedIds) : { order: selectedIds, sizes: {}, groupByCategory: true };
    var views = buildWidgetViews(model, selectedIds, layout);

    if (!views.length) {
      return (
        '<div class="wdb-v3-widgets wdb-v3-widgets--empty" data-wdb-v3-widgets>' +
        '<p class="wdb-v2-empty">No widgets selected. Use <strong>Customize Dashboard</strong> to choose a set.</p>' +
        "</div>"
      );
    }

    if (layout.groupByCategory !== false && Cats) {
      var byCat = {};
      views.forEach(function (v) {
        var cid = Cats.normalizeId ? Cats.normalizeId(v.category) : v.category;
        if (!byCat[cid]) byCat[cid] = [];
        byCat[cid].push(v);
      });
      var sections = Cats.all()
        .map(function (cat) {
          var list = byCat[cat.id];
          if (!list || !list.length) return "";
          var items = list
            .map(function (v) {
              var card = Contract.renderCardSafe(v);
              return Layout && Layout.wrapItem ? Layout.wrapItem(card, v.id, v.size) : card;
            })
            .join("");
          return (
            '<section class="wdb-v3-cat wdb-v2-cat" data-wdb-v3-category="' +
            cat.id +
            '" data-wdb-v2-category="' +
            cat.id +
            '" aria-labelledby="wdb-v3-cat-' +
            cat.id +
            '">' +
            '<h4 class="wdb-v3-cat__title wdb-v2-cat__title" id="wdb-v3-cat-' +
            cat.id +
            '">' +
            cat.label +
            "</h4>" +
            (Layout && Layout.renderGrid
              ? Layout.renderGrid(items, { densify: layout.densify })
              : '<div class="wdb-v3-cat__grid">' + items + "</div>") +
            "</section>"
          );
        })
        .filter(Boolean)
        .join("");
      return '<div class="wdb-v3-widgets" data-wdb-v3-widgets data-wdb-v2-widgets>' + sections + "</div>";
    }

    var flat = views
      .map(function (v) {
        var card = Contract.renderCardSafe(v);
        return Layout && Layout.wrapItem ? Layout.wrapItem(card, v.id, v.size) : card;
      })
      .join("");
    return (
      '<div class="wdb-v3-widgets" data-wdb-v3-widgets data-wdb-v2-widgets>' +
      (Layout && Layout.renderGrid ? Layout.renderGrid(flat, { densify: layout.densify }) : flat) +
      "</div>"
    );
  }

  function buildPayload(ctx) {
    var V2 = api("dashboardV2");
    if (V2 && V2.buildPayload) {
      var base = V2.buildPayload(ctx);
      if (!base) return null;
      var Brief = api("dashboardV3Brief");
      base.brief = Brief && Brief.build ? Brief.build({ model: base.model, take: base.take }) : null;
      base.widgetsHtml = renderWidgetsHtml(base.model, base.selectedIds || []);
      return base;
    }
    return null;
  }

  function render(ctx, opts) {
    if (!isEnabled()) {
      var V2 = api("dashboardV2");
      if (V2 && V2.render) {
        /* Force V2 path without recursing through engine→V3 */
        var prev = global.WDS._wdbV3ForceV2;
        global.WDS._wdbV3ForceV2 = true;
        var html = "";
        try {
          html = V2.render(ctx, opts);
        } finally {
          global.WDS._wdbV3ForceV2 = prev;
        }
        return html;
      }
      return "";
    }
    var payload = buildPayload(ctx);
    if (!payload) return "";
    var Shell = api("dashboardV3Shell");
    if (!Shell) return "";
    var kiosk = !!(opts && opts.kiosk);
    return Shell.render(payload, { kiosk: kiosk });
  }

  function bind(root) {
    if (!root) return;
    var host = root.querySelector("[data-wdb-v3]") || root.querySelector("[data-wdb-v2]");
    if (!host) return;

    var Layout = api("dashboardV3Layout");
    if (Layout && Layout.registerDnDHooks) {
      Layout.registerDnDHooks(host.querySelector("[data-wdb-v3-layout]") || host);
    }

    var Custom = api("dashboardV2Customize");
    if (Custom && Custom.bind) Custom.bind(root);

    if (host._wdbV3Bound) return;
    host._wdbV3Bound = true;

    host.addEventListener("click", function (e) {
      var customize = e.target.closest("#wdb-v3-customize-open, [data-wdb-v3-customize-trigger]");
      if (customize && host.contains(customize)) {
        e.preventDefault();
        var openBtn = root.querySelector("#wdb-v2-customize-open");
        if (openBtn) openBtn.click();
        else if (Custom && Custom.open) Custom.open(root);
      }

      var refreshBtn = e.target.closest("[data-wdb-v3-widget-refresh]");
      if (refreshBtn && host.contains(refreshBtn)) {
        e.preventDefault();
        if (global.WDS && global.WDS.outdoorIntelligence && global.WDS.outdoorIntelligence.refresh) {
          global.WDS.outdoorIntelligence.refresh({ force: true });
        }
      }
    });
  }

  function refresh(root) {
    var V2 = api("dashboardV2");
    if (V2 && V2.refresh) return V2.refresh(root);
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardV3 = {
    VERSION: VERSION,
    FLAG_KEY: FLAG_KEY,
    isEnabled: isEnabled,
    setEnabled: setEnabled,
    buildPayload: buildPayload,
    render: render,
    renderWidgetsHtml: renderWidgetsHtml,
    bind: bind,
    refresh: refresh
  };
})(window);
