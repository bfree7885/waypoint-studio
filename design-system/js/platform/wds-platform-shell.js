/**
 * Waypoint Studio — shared product shell (nav + footer)
 * Mounts consistent chrome from the platform catalog.
 */
(function (global) {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function depthFromEl(el) {
    if (!el) return 1;
    var d = el.getAttribute("data-shell-depth");
    return d != null ? Number(d) : 1;
  }

  function catalog() {
    return global.WDS && global.WDS.platformCatalog;
  }

  function coreNavItems(depth, currentId) {
    var Cat = catalog();
    if (!Cat) return [];
    return Cat.list({ publicNav: true, coreOnly: true }).map(function (p) {
      return {
        id: p.id,
        label: p.shortName || p.name,
        href: Cat.resolveHref(p, depth),
        current: p.id === currentId || p.dataProduct === currentId
      };
    });
  }

  function renderTopbar(options) {
    options = options || {};
    var depth = options.depth != null ? options.depth : 1;
    var currentId = options.currentId || options.product || null;
    var brandHref = depth === 0 ? "./" : depth === 1 ? "../../" : "../../../";
    var brandName = options.brandName || "Waypoint Studio";
    var extra = options.extraLinks || [];
    var items = coreNavItems(depth, currentId).concat(extra);

    var nav = items.map(function (item) {
      return (
        '<a href="' +
        esc(item.href) +
        '"' +
        (item.current ? ' aria-current="page"' : "") +
        ">" +
        esc(item.label) +
        "</a>"
      );
    }).join("");

    return (
      '<header class="wds-topbar wds-platform-topbar">' +
        '<div class="wds-topbar__inner">' +
          '<a class="wds-brand" href="' + esc(brandHref) + '">' +
            '<span class="wds-brand__mark" aria-hidden="true"></span>' +
            '<span class="wds-brand__name">' + esc(brandName) + "</span>" +
          "</a>" +
          '<nav class="ws-topnav" aria-label="' + esc(options.navLabel || "Waypoint Studio") + '">' +
            nav +
          "</nav>" +
        "</div>" +
      "</header>"
    );
  }

  function renderFooter(options) {
    options = options || {};
    var productName = options.productName || "Waypoint Studio";
    var note = options.note || "Private by default";
    var depth = options.depth != null ? options.depth : 1;
    var how = depth === 0 ? "#how-waypoint-works" : depth === 1 ? "../../#how-waypoint-works" : "../../../#how-waypoint-works";
    return (
      '<footer class="wds-footer wds-platform-footer">' +
        "<p>" +
        esc(productName) +
        " · " +
        esc(note) +
        ' · <a href="' +
        esc(how) +
        '">How Waypoint works</a></p>' +
      "</footer>"
    );
  }

  function mount(options) {
    options = options || {};
    var navHost = document.querySelector("[data-wds-platform-nav]");
    var footerHost = document.querySelector("[data-wds-platform-footer]");
    if (navHost) {
      var depth = depthFromEl(navHost);
      navHost.outerHTML = renderTopbar(Object.assign({}, options, { depth: depth }));
    }
    if (footerHost) {
      var fDepth = depthFromEl(footerHost);
      footerHost.outerHTML = renderFooter(Object.assign({}, options, { depth: fDepth }));
    }
  }

  function autoMount() {
    var el = document.querySelector("[data-wds-platform-shell]");
    if (!el) return;
    var product = el.getAttribute("data-product") ||
      (document.documentElement && document.documentElement.getAttribute("data-product")) ||
      null;
    var productName = el.getAttribute("data-product-name") || null;
    mount({
      currentId: product,
      productName: productName,
      depth: depthFromEl(el),
      brandName: "Waypoint Studio"
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.platformShell = {
    renderTopbar: renderTopbar,
    renderFooter: renderFooter,
    mount: mount,
    autoMount: autoMount
  };

  // Extend legacy nav API
  global.WDS.nav = global.WDS.nav || {};
  global.WDS.nav.renderPlatformTopbar = renderTopbar;
  global.WDS.nav.renderPlatformFooter = renderFooter;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoMount);
  } else {
    autoMount();
  }
})(typeof window !== "undefined" ? window : global);
