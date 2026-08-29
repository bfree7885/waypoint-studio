/**
 * Waypoint Studio — App navigation resolver
 * Reads WDS.APP_NAV_CONFIG and resolves active app, features, and hrefs by depth.
 */
(function (global) {
  "use strict";

  function config() {
    return (global.WDS && global.WDS.APP_NAV_CONFIG) || { apps: [], categories: [], brand: { name: "Waypoint Studio", homeRoute: "./" } };
  }

  function pathname() {
    try {
      return String(global.location && global.location.pathname || "").replace(/\\/g, "/");
    } catch (e) {
      return "";
    }
  }

  function hash() {
    try {
      return String(global.location && global.location.hash || "");
    } catch (e) {
      return "";
    }
  }

  /**
   * Directory depth from site root (segment count).
   * / → 0, /articles/ → 1, /apps/scenes/ → 2, /articles/categories/observe/ → 3
   * File segments (about.html) do not add depth.
   */
  function depthFromPath(path) {
    path = path || pathname();
    var clean = String(path || "").replace(/\\/g, "/").replace(/\/index\.html$/i, "").replace(/\/$/, "");
    var parts = clean.split("/").filter(Boolean);
    if (parts.length && /\.[a-z0-9]+$/i.test(parts[parts.length - 1])) {
      parts.pop();
    }
    return parts.length;
  }

  function prefixes(depth) {
    depth = depth == null ? depthFromPath() : Number(depth);
    if (!isFinite(depth) || depth <= 0) return { root: "./", apps: "apps/" };
    var up = "";
    for (var i = 0; i < depth; i++) up += "../";
    return { root: up, apps: up + "apps/" };
  }

  function resolveRoute(route, depth) {
    if (!route) return "#";
    if (route.charAt(0) === "#" || route.indexOf("http") === 0) return route;
    // Site-root absolute paths work from any nesting (preferred for primary nav).
    if (route.charAt(0) === "/") return route;
    var p = prefixes(depth);
    if (route.indexOf("apps/") === 0) {
      return p.root + route;
    }
    return p.root + route.replace(/^\.\//, "");
  }

  function matchesPattern(pattern, path, h) {
    if (!pattern) return false;
    var hay = path + (h || "");
    if (pattern.charAt(0) === "#" || pattern.indexOf("#") === 0) {
      return (h || "").indexOf(pattern.replace(/^#/, "#")) === 0 || (h || "") === pattern;
    }
    try {
      if (pattern.indexOf("$") >= 0 || pattern.indexOf("?") >= 0) {
        return new RegExp(pattern, "i").test(hay) || new RegExp(pattern, "i").test(path);
      }
    } catch (e) { /* fall through */ }
    return hay.indexOf(pattern) >= 0 || path.indexOf(pattern) >= 0;
  }

  function listApps() {
    return (config().apps || []).slice();
  }

  function listCategories() {
    return (config().categories || []).slice();
  }

  function isPublicApp(app) {
    if (!app) return false;
    if (app.publicSurface === false) return false;
    var st = String(app.status || "live").toLowerCase();
    if (st === "paused" || st === "retired" || st === "archived") return false;
    return true;
  }

  function appsByCategory() {
    var cats = listCategories();
    var apps = listApps().filter(isPublicApp);
    return cats.map(function (cat) {
      return {
        id: cat.id,
        label: cat.label,
        apps: apps.filter(function (a) { return a.category === cat.id; })
      };
    }).filter(function (g) { return g.apps.length > 0; });
  }

  function listJourneys() {
    return (config().journeys || []).slice();
  }

  function appsByJourney() {
    var journeys = listJourneys();
    var apps = listApps();
    if (!journeys.length) return [];
    return journeys.map(function (j) {
      return {
        id: j.id,
        label: j.label,
        blurb: j.blurb || "",
        apps: apps.filter(function (a) {
          return (a.journeys || []).indexOf(j.id) >= 0;
        })
      };
    }).filter(function (g) { return g.apps.length > 0; });
  }

  function startHereHref(app, depth) {
    if (!app) return "#";
    var sh = app.startHere;
    if (sh && sh.href) return resolveRoute(sh.href, depth);
    return resolveRoute(app.route, depth);
  }

  function relatedApps(appId) {
    var app = byId(appId);
    if (!app || !app.related || !app.related.length) return [];
    var paused = {
      fieldry: 1,
      foragecast: 1,
      "savant-sommelier": 1,
      "openroad-pa": 1,
      signalterrain: 1,
      "global-signals": 1,
      "waypoint-volunteer": 1,
      steepleaf: 1,
      "landscape-interpretation": 1,
      terrainbound: 1,
      volunteer: 1,
      scenes: 1
    };
    return app.related
      .map(byId)
      .filter(Boolean)
      .filter(function (related) {
        if (paused[related.id]) return false;
        var st = String(related.status || "live").toLowerCase();
        return st !== "paused" && st !== "retired" && st !== "archived";
      });
  }

  function byId(id) {
    var apps = listApps();
    for (var i = 0; i < apps.length; i += 1) {
      if (apps[i].id === id) return apps[i];
    }
    return null;
  }

  function detectApp(path, h) {
    path = path || pathname();
    h = h == null ? hash() : h;
    var apps = listApps();
    var best = null;
    var bestScore = -1;
    apps.forEach(function (app) {
      (app.match || []).forEach(function (pat) {
        if (matchesPattern(pat, path, h)) {
          var score = String(pat).length;
          if (score > bestScore) {
            bestScore = score;
            best = app;
          }
        }
      });
    });
    return best;
  }

  function detectFeature(app, path, h) {
    if (!app || !app.features) return null;
    path = path || pathname();
    h = h == null ? hash() : h;
    var best = null;
    var bestScore = -1;
    app.features.forEach(function (feat) {
      var patterns = feat.match || [];
      if (feat.hash) patterns = patterns.concat([feat.hash]);
      if (!patterns.length && feat.href && feat.href.indexOf("#") >= 0) {
        patterns = [feat.href.slice(feat.href.indexOf("#"))];
      }
      if (!patterns.length) {
        // default overview when path ends at app root
        var routeTail = (app.route || "").replace(/\/$/, "");
        if (path.replace(/\/$/, "").slice(-routeTail.length) === routeTail.replace(/^apps\//, "") ||
            path.indexOf(routeTail) >= 0 && !/\/[^/]+\/.+\//.test(path.split("/apps/")[1] || "")) {
          if (!best) best = feat;
        }
        return;
      }
      patterns.forEach(function (pat) {
        if (matchesPattern(pat, path, h)) {
          var score = String(pat).length + (feat.hash && h.indexOf(feat.hash) === 0 ? 50 : 0);
          if (score > bestScore) {
            bestScore = score;
            best = feat;
          }
        }
      });
    });
    if (!best && app.features.length) best = app.features[0];
    return best;
  }

  function featureHref(feat, depth, app) {
    if (!feat) return "#";
    if (feat.hash) {
      var current = detectApp();
      if (current && app && current.id === app.id) return feat.hash;
      var base = resolveRoute(app.route, depth).replace(/\/?$/, "/");
      return base + feat.hash.replace(/^\//, "");
    }
    if (feat.href && feat.href.charAt(0) === "#") return feat.href;
    return resolveRoute(feat.href || (app && app.route) || "#", depth);
  }

  function brandHome(depth) {
    return prefixes(depth).root;
  }

  function studioHomeHref(depth) {
    return brandHome(depth);
  }

  function originConfig() {
    var cfg = config();
    return cfg.origins || {
      studioOrigin: "https://waypointstudio.org",
      shedOrigin: "https://shedhunting.org",
      shedDedicatedHostEnabled: false
    };
  }

  function shedHuntingPublicHref() {
    if (global.WDS && global.WDS.origins && typeof global.WDS.origins.shedHuntingPublicHref === "function") {
      return global.WDS.origins.shedHuntingPublicHref();
    }
    var o = originConfig();
    if (o.shedDedicatedHostEnabled) {
      return String(o.shedOrigin || "https://shedhunting.org").replace(/\/+$/, "") + "/";
    }
    return "/apps/shed-hunting/";
  }

  function shedHuntingMapPublicHref() {
    if (global.WDS && global.WDS.origins && typeof global.WDS.origins.shedHuntingMapHref === "function") {
      return global.WDS.origins.shedHuntingMapHref();
    }
    var o = originConfig();
    if (o.shedDedicatedHostEnabled) {
      return String(o.shedOrigin || "https://shedhunting.org").replace(/\/+$/, "") + "/map/";
    }
    return "/apps/shed-hunting/map/";
  }

  global.WDS = global.WDS || {};
  global.WDS.appNav = {
    config: config,
    listApps: listApps,
    listCategories: listCategories,
    listJourneys: listJourneys,
    appsByCategory: appsByCategory,
    appsByJourney: appsByJourney,
    relatedApps: relatedApps,
    startHereHref: startHereHref,
    byId: byId,
    detectApp: detectApp,
    detectFeature: detectFeature,
    resolveRoute: resolveRoute,
    featureHref: featureHref,
    brandHome: brandHome,
    studioHomeHref: studioHomeHref,
    originConfig: originConfig,
    shedHuntingPublicHref: shedHuntingPublicHref,
    shedHuntingMapPublicHref: shedHuntingMapPublicHref,
    depthFromPath: depthFromPath,
    prefixes: prefixes,
    pathname: pathname,
    hash: hash
  };
})(typeof window !== "undefined" ? window : global);
