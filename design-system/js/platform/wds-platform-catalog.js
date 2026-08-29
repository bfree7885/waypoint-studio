/**
 * Waypoint Studio — Platform product catalog
 * Single source of truth for navigation, footers, and foundation status.
 */
(function (global) {
  "use strict";

  var VERSION = "1.1.0";

  /**
   * Relative hrefs assume the page lives under /apps/<slug>/
   * Callers may pass depth: 0 (repo root), 1 (apps slug), 2 (apps nested)
   */
  function hrefs(depth) {
    depth = depth == null ? 1 : depth;
    var root = depth === 0 ? "" : depth === 1 ? "../" : "../../";
    var apps = depth === 0 ? "apps/" : depth === 1 ? "../" : "../../";
    if (depth === 1) {
      root = "../../";
      apps = "../";
    }
    if (depth === 2) {
      root = "../../../";
      apps = "../../";
    }
    if (depth === 0) {
      root = "./";
      apps = "apps/";
    }
    return { root: root, apps: apps };
  }

  var PRODUCTS = [
    {
      id: "studio",
      name: "Waypoint Studio",
      shortName: "Studio",
      tier: "core",
      status: "live",
      description: "Studio directory and shared shell.",
      pathFromApps: "../../",
      pathFromRoot: "./",
      dataProduct: "studio-home",
      navPriority: 5
    },
    {
      id: "dashboard",
      name: "Dashboard",
      shortName: "Dashboard",
      tier: "core",
      status: "live",
      description: "Customizable outdoor workspace — Today Outside and instruments you choose. Quiet Home chrome may still say Home.",
      pathFromApps: "../dashboard/",
      pathFromRoot: "apps/dashboard/",
      dataProduct: "dashboard",
      navPriority: 10
    },
    {
      id: "scenes",
      name: "Waypoint Scenes",
      shortName: "Scenes",
      tier: "internal",
      status: "paused",
      description: "Photography tools retained internally — not a current public Studio product.",
      pathFromApps: "../scenes/",
      pathFromRoot: "apps/scenes/",
      dataProduct: "scenes",
      navPriority: 20
    },
    {
      id: "sheds",
      slug: "shed-hunting",
      name: "Shed Hunting",
      shortName: "Shed Hunting",
      tier: "core",
      status: "live",
      description: "Should I go shed hunting today? Search conditions and habitat interest — never a find prediction.",
      pathFromApps: "../shed-hunting/",
      pathFromRoot: "apps/shed-hunting/",
      dataProduct: "shed-hunting",
      navPriority: 30
    },
    {
      id: "articles",
      name: "Articles",
      shortName: "Articles",
      tier: "core",
      status: "live",
      description: "Calm field reading that deepens observation.",
      pathFromApps: "../../articles/",
      pathFromRoot: "articles/",
      dataProduct: "articles",
      navPriority: 40
    },
    {
      id: "deck",
      name: "Waypoint Deck",
      shortName: "Deck",
      tier: "core",
      status: "in-development",
      description: "Local-first Linux field computer — distinct from Studio web apps.",
      pathFromApps: "../../side-trails/waypoint-deck/",
      pathFromRoot: "side-trails/waypoint-deck/",
      dataProduct: "waypoint-deck",
      navPriority: 50
    },
    {
      id: "support",
      name: "Support",
      shortName: "Support",
      tier: "core",
      status: "live",
      description: "Honest help, FAQ, and contact paths.",
      pathFromApps: "../../support.html",
      pathFromRoot: "support.html",
      dataProduct: "support",
      navPriority: 55
    },
    {
      id: "about",
      name: "About",
      shortName: "About",
      tier: "core",
      status: "live",
      description: "Studio mission and product philosophy.",
      pathFromApps: "../../about.html",
      pathFromRoot: "about.html",
      dataProduct: "about",
      navPriority: 58
    },
    {
      id: "photo-coach",
      name: "Photo Coach",
      shortName: "Photo Coach",
      tier: "internal",
      status: "paused",
      description: "Upload, understand, and improve photographs — part of unpublished Scenes.",
      pathFromApps: "../photo-coach/",
      pathFromRoot: "apps/photo-coach/",
      dataProduct: "photo-coach",
      parent: "scenes",
      navPriority: 45
    },
    {
      id: "hidden-landscapes",
      name: "Hidden Landscapes",
      shortName: "Hidden Landscapes",
      tier: "core",
      status: "scaffold",
      description: "See nature beyond human vision — infrared, UV, polarization, species vision, and more.",
      pathFromApps: "../hidden-landscapes/",
      pathFromRoot: "apps/hidden-landscapes/",
      dataProduct: "hidden-landscapes",
      parent: "scenes",
      navPriority: 47
    }
  ];

  function byId(id) {
    for (var i = 0; i < PRODUCTS.length; i++) {
      if (PRODUCTS[i].id === id || PRODUCTS[i].slug === id || PRODUCTS[i].dataProduct === id) {
        return PRODUCTS[i];
      }
    }
    return null;
  }

  function list(filter) {
    filter = filter || {};
    return PRODUCTS.filter(function (p) {
      if (filter.tier && p.tier !== filter.tier) return false;
      if (filter.status && p.status !== filter.status) return false;
      if (filter.coreOnly && p.tier !== "core") return false;
      if (filter.publicNav && p.parent) return false;
      if (filter.publicNav && (p.publicSurface === false || p.status === "paused" || p.tier === "internal")) return false;
      return true;
    }).slice().sort(function (a, b) {
      return (a.navPriority || 100) - (b.navPriority || 100);
    });
  }

  function resolveHref(product, depth) {
    depth = depth == null ? 1 : depth;
    if (!product) return "#";
    if (product.id === "studio") {
      return depth === 0 ? "./" : depth === 1 ? "../../" : "../../../";
    }
    if (product.id === "dashboard") {
      return depth === 0 ? "apps/dashboard/" : depth === 1 ? "../dashboard/" : "../../dashboard/";
    }
    return depth === 0 ? product.pathFromRoot : product.pathFromApps;
  }

  global.WDS = global.WDS || {};
  global.WDS.platformCatalog = {
    VERSION: VERSION,
    PRODUCTS: PRODUCTS,
    byId: byId,
    list: list,
    hrefs: hrefs,
    resolveHref: resolveHref
  };
})(typeof window !== "undefined" ? window : global);
