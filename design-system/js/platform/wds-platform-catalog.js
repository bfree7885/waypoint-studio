/**
 * Waypoint Studio — Platform product catalog
 * Single source of truth for navigation, footers, and foundation status.
 */
(function (global) {
  "use strict";

  var VERSION = "1.0.0";

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
      description: "Home — Waypoint Studio outdoor workspace entry.",
      pathFromApps: "../../",
      pathFromRoot: "./",
      dataProduct: "studio-home",
      navPriority: 5
    },
    {
      id: "dashboard",
      name: "Home",
      shortName: "Home",
      tier: "core",
      status: "live",
      description: "Customizable outdoor workspace — Today Outside and instruments you choose.",
      pathFromApps: "../dashboard/",
      pathFromRoot: "apps/dashboard/",
      dataProduct: "dashboard",
      navPriority: 10
    },
    {
      id: "foragecast",
      name: "ForageCast",
      shortName: "ForageCast",
      tier: "core",
      status: "live",
      description: "Seasonal land companion — foraging, orchard, garden, and today’s action plan.",
      pathFromApps: "../foragecast/",
      pathFromRoot: "apps/foragecast/",
      dataProduct: "foragecast",
      navPriority: 20
    },
    {
      id: "fieldry",
      name: "Fieldry",
      shortName: "Fieldry",
      tier: "core",
      status: "live",
      description: "Private observation ledger — a life list of the natural world.",
      pathFromApps: "../fieldry/",
      pathFromRoot: "apps/fieldry/",
      dataProduct: "fieldry",
      navPriority: 30
    },
    {
      id: "scenes",
      name: "Waypoint Scenes",
      shortName: "Scenes",
      tier: "core",
      status: "live",
      description: "Photography craft hub — Photo Coach (Shoot Review) and Photo Library available now; Hidden Landscapes experimental. Futures stay labeled.",
      pathFromApps: "../scenes/",
      pathFromRoot: "apps/scenes/",
      dataProduct: "scenes",
      navPriority: 40
    },
    {
      id: "photo-coach",
      name: "Photo Coach",
      shortName: "Photo Coach",
      tier: "core",
      status: "live",
      description: "Shoot review and on-device coaching — part of Scenes.",
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
      description: "Experimental ways of seeing — artistic simulations, clearly labeled, not finished spectral capture.",
      pathFromApps: "../hidden-landscapes/",
      pathFromRoot: "apps/hidden-landscapes/",
      dataProduct: "hidden-landscapes",
      parent: "scenes",
      navPriority: 47
    },
    {
      id: "sheds",
      slug: "shed-hunting",
      name: "Sheds",
      shortName: "Sheds",
      tier: "foundation",
      status: "foundation",
      description: "Antler shed hunting platform — species, finds, forecasts, and ethics.",
      pathFromApps: "../shed-hunting/",
      pathFromRoot: "apps/shed-hunting/",
      dataProduct: "shed-hunting",
      navPriority: 60
    },
    {
      id: "steepleaf",
      name: "Steepleaf",
      shortName: "Steepleaf",
      tier: "product",
      status: "active",
      description: "Tea companion — today’s brew, private collection, sessions, and calm learning.",
      pathFromApps: "../steepleaf/",
      pathFromRoot: "apps/steepleaf/",
      dataProduct: "steepleaf",
      navPriority: 70
    },
    {
      id: "signalterrain",
      name: "SignalTerrain",
      shortName: "SignalTerrain",
      tier: "foundation",
      status: "foundation",
      description: "Radio & Spectrum Intelligence and educational Cyber Awareness.",
      pathFromApps: "../signalterrain/",
      pathFromRoot: "apps/signalterrain/",
      dataProduct: "signalterrain",
      navPriority: 80
    },
    {
      id: "savant-sommelier",
      name: "Savant Sommelier",
      shortName: "Savant",
      tier: "foundation",
      status: "foundation",
      description: "Vineyard intelligence — terrain, climate, and wine landscape literacy.",
      pathFromApps: "../savant-sommelier/",
      pathFromRoot: "apps/savant-sommelier/",
      dataProduct: "savant-sommelier",
      navPriority: 90
    },
    {
      id: "waypoint-volunteer",
      name: "Waypoint Volunteer",
      shortName: "Volunteer",
      tier: "foundation",
      status: "foundation",
      description: "What good can I do today? — community opportunity discovery.",
      pathFromApps: "../waypoint-volunteer/",
      pathFromRoot: "apps/waypoint-volunteer/",
      dataProduct: "waypoint-volunteer",
      navPriority: 85
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
