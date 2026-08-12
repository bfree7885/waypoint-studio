/**
 * Dashboard Rebuild — widget workspace (RC2.5 Sprint 6 polish).
 * Columns, favorites, family grouping, skeletons, CLS-safe lazy paint.
 * Authority: docs/rebuild-2026/03-dashboard-architecture.md
 */
(function (global) {
  "use strict";

  function Registry() {
    return global.WDS && global.WDS.dashboardRebuildRegistry;
  }

  function Prefs() {
    return global.WDS && global.WDS.dashboardRebuildPrefs;
  }

  function prefersReducedMotion() {
    try {
      return !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
    } catch (e) {
      return false;
    }
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderGroupHeader(family) {
    if (!family || !family.id || !family.label) return "";
    return (
      '<div class="wdb-r-group" data-family="' +
      escapeHtml(family.id) +
      '" role="presentation">' +
      '<p class="wdb-r-group__label">' +
      escapeHtml(family.label) +
      "</p>" +
      "</div>"
    );
  }

  function openFamilySection(family, columns) {
    var id = family && family.id ? family.id : "instruments";
    return (
      '<section class="wdb-r-family" data-wdb-r-family data-family="' +
      escapeHtml(id) +
      '" data-cols="' +
      columns +
      '" style="--wdb-r-family-cols: ' +
      columns +
      '">' +
      (family && family.label ? renderGroupHeader(family) : "") +
      '<div class="wdb-r-family__grid" data-wdb-r-family-grid data-cols="' +
      columns +
      '">'
    );
  }

  function closeFamilySection() {
    return "</div></section>";
  }

  function renderSkeletonBody() {
    return (
      '<div class="wdb-r-widget__body wdb-r-widget__body--pending" data-lazy-slot data-trust="waiting" aria-busy="true">' +
      '<p class="wdb-r-widget__status wdb-r-sr-only">Settling…</p>' +
      '<div class="wdb-r-skeleton" aria-hidden="true">' +
      '<span class="wdb-r-skeleton__line wdb-r-skeleton__line--lg"></span>' +
      '<span class="wdb-r-skeleton__line"></span>' +
      '<span class="wdb-r-skeleton__line wdb-r-skeleton__line--sm"></span>' +
      "</div>" +
      '<p class="wdb-r-widget__trust"><span class="wds-trust-chip" data-trust="waiting">Waiting</span></p>' +
      "</div>"
    );
  }

  function renderWidgetFrame(widget, prefs, options) {
    options = options || {};
    var reg = Registry();
    var prefsApi = Prefs();
    var size =
      (prefs && prefs.sizes && prefs.sizes[widget.id]) ||
      widget.size ||
      "standard";
    if (reg && reg.normalizeSize) size = reg.normalizeSize(size);
    var lazy = !!options.lazy && !options.eager;
    var data = null;
    var body = "";
    if (lazy) {
      body = renderSkeletonBody();
    } else {
      data = reg && reg.getData
        ? reg.getData(widget.id, { platform: options.platform || null })
        : { trust: "waiting", message: "Data will appear here." };
      body =
        reg && reg.render
          ? reg.render(widget, data)
          : reg && reg.renderPlaceholder
            ? reg.renderPlaceholder(widget, data)
            : '<p class="wdb-r-widget__status">Data will appear here.</p>';
    }
    var customize = !!options.customize;
    var fav =
      prefsApi && prefsApi.isFavorite ? prefsApi.isFavorite(widget.id, prefs) : false;
    var family =
      reg && reg.familyFor
        ? reg.familyFor(widget)
        : { id: widget.category || "", label: widget.category || "" };
    var icon =
      reg && reg.iconHtml
        ? '<span class="wdb-r-widget__icon" aria-hidden="true">' +
          reg.iconHtml(widget, data) +
          "</span>"
        : "";
    var extraAttrs =
      !lazy && data && reg && reg.articleDataAttrs ? reg.articleDataAttrs(data) : "";
    var controls = "";
    if (customize) {
      controls =
        '<div class="wdb-r-widget__controls">' +
        '<button type="button" class="wdb-r-btn wdb-r-btn--quiet' +
        (fav ? " is-active" : "") +
        '" data-wdb-r-action="favorite" data-widget-id="' +
        escapeHtml(widget.id) +
        '" aria-pressed="' +
        (fav ? "true" : "false") +
        '" aria-label="' +
        (fav ? "Unpin " : "Favorite ") +
        escapeHtml(widget.title) +
        '">' +
        (fav ? "Favorited" : "Favorite") +
        "</button>" +
        '<button type="button" class="wdb-r-btn" data-wdb-r-action="move-up" data-widget-id="' +
        escapeHtml(widget.id) +
        '" aria-label="Move ' +
        escapeHtml(widget.title) +
        ' up">Move up</button>' +
        '<button type="button" class="wdb-r-btn" data-wdb-r-action="move-down" data-widget-id="' +
        escapeHtml(widget.id) +
        '" aria-label="Move ' +
        escapeHtml(widget.title) +
        ' down">Move down</button>' +
        '<button type="button" class="wdb-r-btn" data-wdb-r-action="size-cycle" data-widget-id="' +
        escapeHtml(widget.id) +
        '" aria-label="Change size for ' +
        escapeHtml(widget.title) +
        '">Size: ' +
        escapeHtml(size) +
        "</button>" +
        '<button type="button" class="wdb-r-btn" data-wdb-r-action="hide" data-widget-id="' +
        escapeHtml(widget.id) +
        '" aria-label="Hide ' +
        escapeHtml(widget.title) +
        '">Hide</button>' +
        "</div>";
    }
    return (
      '<article class="wdb-r-widget wdb-r-widget--' +
      escapeHtml(size) +
      (fav ? " wdb-r-widget--favorite" : "") +
      '" data-widget-id="' +
      escapeHtml(widget.id) +
      '" data-category="' +
      escapeHtml(widget.category || "") +
      '" data-family="' +
      escapeHtml(family.id || "") +
      '" data-size="' +
      escapeHtml(size) +
      '"' +
      extraAttrs +
      (fav ? ' data-favorite="true"' : "") +
      (lazy ? ' data-lazy="pending"' : ' data-lazy="ready"') +
      ">" +
      '<header class="wdb-r-widget__head">' +
      '<div class="wdb-r-widget__title-row">' +
      icon +
      "<h3 class=\"wdb-r-widget__title\">" +
      escapeHtml(widget.title) +
      "</h3>" +
      "</div>" +
      '<p class="wdb-r-widget__cat">' +
      escapeHtml(family.label || widget.category || "") +
      (fav ? " · Favorite" : "") +
      "</p>" +
      "</header>" +
      body +
      controls +
      "</article>"
    );
  }

  function hydrateLazyWidget(article, platform) {
    if (!article || article.getAttribute("data-lazy") !== "pending") return;
    var id = article.getAttribute("data-widget-id");
    var reg = Registry();
    var widget = reg && reg.get ? reg.get(id) : null;
    var slot = article.querySelector("[data-lazy-slot]");
    if (!widget || !slot || !reg) return;
    var data = reg.getData(id, { platform: platform || null });
    var html = reg.render ? reg.render(widget, data) : "";
    slot.outerHTML = html;
    article.setAttribute("data-lazy", "ready");
    article.removeAttribute("aria-busy");
    if (reg.articleDataAttrs) {
      var attrStr = String(reg.articleDataAttrs(data) || "");
      var re = /\s(data-[a-z0-9-]+)="([^"]*)"/g;
      var m;
      while ((m = re.exec(attrStr))) {
        article.setAttribute(m[1], m[2]);
      }
    }
    if (reg.iconHtml) {
      var iconSlot = article.querySelector(".wdb-r-widget__icon");
      if (iconSlot) iconSlot.innerHTML = reg.iconHtml(widget, data);
    }
  }

  function bindLazy(root, options) {
    options = options || {};
    if (!root || typeof root.querySelectorAll !== "function") return;
    var pending = root.querySelectorAll('[data-lazy="pending"]');
    if (!pending.length) return;
    var platform = options.platform || null;

    function fill(el) {
      hydrateLazyWidget(el, platform);
    }

    if (typeof global.IntersectionObserver !== "function") {
      Array.prototype.forEach.call(pending, fill);
      return;
    }

    var vh =
      global.innerHeight ||
      (global.document &&
        global.document.documentElement &&
        global.document.documentElement.clientHeight) ||
      900;
    var io = new global.IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          fill(entry.target);
          io.unobserve(entry.target);
        });
      },
      { root: null, rootMargin: "160px 0px", threshold: 0.01 }
    );

    Array.prototype.forEach.call(pending, function (el) {
      var rect = typeof el.getBoundingClientRect === "function" ? el.getBoundingClientRect() : null;
      /* Eager-fill above-the-fold / laid-out widgets to avoid sticky Settling… */
      if (!rect || (rect.height === 0 && rect.top === 0) || (rect.top < vh + 160 && rect.bottom > -40)) {
        fill(el);
        return;
      }
      io.observe(el);
    });

    /* Headless / late-layout safety: hydrate leftovers shortly without blocking first paint. */
    if (typeof global.setTimeout === "function") {
      global.setTimeout(function () {
        if (!root || typeof root.querySelectorAll !== "function") return;
        Array.prototype.forEach.call(root.querySelectorAll('[data-lazy="pending"]'), fill);
      }, 120);
    }
  }

  function renderWorkspace(options) {
    options = options || {};
    var reg = Registry();
    var prefsApi = Prefs();
    var prefs = options.prefs || (prefsApi && prefsApi.load ? prefsApi.load() : null);
    var ids =
      options.ids ||
      (prefsApi && prefsApi.visibleOrdered ? prefsApi.visibleOrdered(prefs) : []);
    var customize = !!options.customize;
    var columns = Number((prefs && prefs.gridColumns) || 3);
    if ([1, 2, 3].indexOf(columns) < 0) columns = 3;
    var reduce = prefersReducedMotion();
    var animate = !!options.animate && !reduce;
    var lazy = options.lazy === true;
    var sections = [];
    var openFamilyId = null;
    var familyOpen = false;

    function ensureFamily(family) {
      var familyId = family && family.id ? family.id : "instruments";
      if (familyOpen && openFamilyId === familyId) return;
      if (familyOpen) {
        sections.push(closeFamilySection());
        familyOpen = false;
      }
      sections.push(openFamilySection(customize ? null : family, columns));
      openFamilyId = familyId;
      familyOpen = true;
    }

    ids.forEach(function (id) {
      var w = reg && reg.get ? reg.get(id) : null;
      if (!w) return;
      var family =
        reg && reg.familyFor
          ? reg.familyFor(w)
          : { id: w.category || "instruments", label: w.category || "Instruments" };
      if (customize) {
        ensureFamily({ id: "workspace", label: "" });
      } else {
        ensureFamily(family);
      }
      sections.push(
        renderWidgetFrame(w, prefs, {
          customize: customize,
          platform: options.platform || null,
          lazy: lazy,
          eager: options.eager === true
        })
      );
    });
    if (familyOpen) sections.push(closeFamilySection());

    var empty = "";
    if (!ids.length || !sections.length) {
      empty =
        '<div class="wdb-r-workspace__empty" role="status">' +
        '<p class="wdb-r-workspace__empty-title">Your workspace is empty</p>' +
        "<p>" +
        (customize
          ? "Add instruments from the library below. Changes stay draft until you Save."
          : "Open Customize to choose the outdoor instruments you want each morning.") +
        "</p>" +
        "</div>";
    }
    var customizeEntry = customize
      ? ""
      : '<a class="wdb-r-btn wdb-r-btn--customize" href="#/customize" data-wdb-r-customize-entry>' +
        "Customize</a>";
    return (
      '<section class="wdb-r-workspace" data-wdb-r-workspace aria-labelledby="wdb-r-workspace-title"' +
      (customize ? ' data-customize="true"' : "") +
      ">" +
      '<header class="wdb-r-workspace__header">' +
      "<div>" +
      '<h2 id="wdb-r-workspace-title" class="wdb-r-workspace__title">Workspace</h2>' +
      '<p class="wdb-r-workspace__lede">Outdoor instruments for this place — facts first, each settling on its own.</p>' +
      "</div>" +
      customizeEntry +
      "</header>" +
      '<div class="wdb-r-workspace__grid' +
      (animate ? " wdb-r-workspace__grid--animate" : "") +
      '" data-wdb-r-grid data-columns="' +
      columns +
      '" style="--wdb-r-columns: ' +
      columns +
      '">' +
      sections.join("") +
      empty +
      "</div>" +
      "</section>"
    );
  }

  function mount(host, options) {
    if (!host) return null;
    host.innerHTML = renderWorkspace(options);
    var root = host.querySelector("[data-wdb-r-workspace]");
    if (options && options.lazy) {
      bindLazy(host, { platform: options.platform || null });
    }
    return root;
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardRebuildWorkspace = {
    version: "3.3.0-tile-layout",
    renderWorkspace: renderWorkspace,
    renderWidgetFrame: renderWidgetFrame,
    mount: mount,
    bindLazy: bindLazy,
    hydrateLazyWidget: hydrateLazyWidget
  };
})(typeof window !== "undefined" ? window : global);
