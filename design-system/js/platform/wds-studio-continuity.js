/**
 * Waypoint Studio — continuity strip for sister/field surfaces.
 * Auto-mounts on .gs-landing, .st-landing, .sheds-app, or [data-wds-studio-continuity].
 */
(function (global) {
  "use strict";

  var WDS = global.WDS || (global.WDS = {});

  function scriptBase() {
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].src || "";
      var idx = src.indexOf("design-system/js/platform/wds-studio-continuity.js");
      if (idx !== -1) return src.slice(0, idx);
    }
    return null;
  }

  function depthFromPath() {
    var fromScript = scriptBase();
    if (fromScript) return fromScript;
    var path = (global.location && location.pathname) || "";
    var markers = [
      "/apps/shed-hunting/map/",
      "/side-trails/global-signals/",
      "/side-trails/signalterrain/",
      "/side-trails/"
    ];
    for (var m = 0; m < markers.length; m++) {
      var at = path.indexOf(markers[m]);
      if (at !== -1) {
        var after = path.slice(at + markers[m].length);
        var segs = after.split("/").filter(Boolean);
        var dirs = segs.filter(function (s) { return s.indexOf(".") === -1; }).length;
        var upFromMarker = markers[m].split("/").filter(Boolean).length;
        return "../".repeat(upFromMarker + dirs);
      }
    }
    return "../../";
  }

  function detectProduct(root) {
    if (document.querySelector(".sheds-app")) return "sheds";
    if (root.classList.contains("st-landing")) return "signalterrain";
    if (root.classList.contains("gs-landing") || root.classList.contains("gsh-page")) return "global-signals";
    return root.getAttribute("data-wds-studio-continuity") || "studio";
  }

  function trailLabel(product) {
    if (product === "sheds") return "Sheds";
    if (product === "signalterrain") return "SignalTerrain";
    if (product === "global-signals") return "Global Signals";
    return "Side Trails";
  }

  function mount(options) {
    options = options || {};
    if (document.querySelector("[data-wds-studio-continuity-mounted]")) return null;

    var shedsHost = document.querySelector(".sheds-app");
    var host = document.querySelector("[data-wds-studio-continuity]") || shedsHost || document.body;
    if (!host) return null;

    var product = options.product || detectProduct(document.body);
    var base = options.base || depthFromPath();
    var homeHref = base;
    var supportHref = base + "support.html";
    var aboutHref = base + "about.html";
    var label = trailLabel(product);
    var midHref = base + "side-trails/";
    var midLabel = "Side Trails";
    var productHref = null;

    if (product === "sheds") {
      midHref = base + "apps/shed-hunting/";
      midLabel = "Sheds";
    } else if (product === "signalterrain") {
      productHref = base + "side-trails/signalterrain/";
    } else if (product === "global-signals") {
      productHref = base + "side-trails/global-signals/";
    }

    var strip = document.createElement("div");
    strip.className = "wds-studio-continuity";
    strip.setAttribute("data-wds-studio-continuity-mounted", "true");
    strip.setAttribute("role", "navigation");
    strip.setAttribute("aria-label", "Waypoint Studio");

    var html =
      '<a class="wds-studio-continuity__brand" href="' + homeHref + '">Waypoint Studio</a>' +
      '<span class="wds-studio-continuity__sep" aria-hidden="true">·</span>' +
      '<a class="wds-studio-continuity__trail" href="' + midHref + '">' + midLabel + "</a>";

    if (productHref) {
      html +=
        '<span class="wds-studio-continuity__sep" aria-hidden="true">·</span>' +
        '<a class="wds-studio-continuity__trail" href="' + productHref + '" aria-current="page">' + label + "</a>";
    }

    html +=
      '<nav class="wds-studio-continuity__nav" aria-label="Studio">' +
      '<a href="' + homeHref + '">Home</a>' +
      '<a href="' + supportHref + '">Support</a>' +
      '<a href="' + aboutHref + '">About</a>' +
      "</nav>";

    strip.innerHTML = html;

    if (shedsHost && host === shedsHost) {
      shedsHost.insertBefore(strip, shedsHost.firstChild);
    } else {
      document.body.insertBefore(strip, document.body.firstChild);
    }
    return strip;
  }

  function autoMount() {
    var body = document.body;
    if (!body) return;
    if (
      body.classList.contains("gs-landing") ||
      body.classList.contains("gsh-page") ||
      body.classList.contains("st-landing") ||
      document.querySelector(".sheds-app") ||
      document.querySelector("[data-wds-studio-continuity]")
    ) {
      mount();
    }
  }

  WDS.studioContinuity = { mount: mount, autoMount: autoMount };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", autoMount);
  } else {
    autoMount();
  }
})(typeof window !== "undefined" ? window : this);
