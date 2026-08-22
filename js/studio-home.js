/**
 * Waypoint Studio — front door (homepage)
 * Observe. Discover. Understand.
 *
 * Progressive enhancement only: location honesty for "Useful now",
 * Waypoint's Take mount, and a hidden gate mount for automation.
 * Does not render a fake outdoor dashboard on /.
 */
(function (global) {
  "use strict";

  (function redirectLegacyDashboardHashes() {
    var h = String((global.location && global.location.hash) || "");
    if (!h) return;
    if (/outdoor-dashboard|wdb-section-|how-waypoint-works|wds-content-engine|#\/customize/i.test(h)) {
      global.location.replace("apps/dashboard/" + h);
    }
  })();

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function readLocation() {
    try {
      var raw = global.localStorage && global.localStorage.getItem("wds-location-v3");
      if (!raw) return null;
      var loc = JSON.parse(raw);
      if (!loc || typeof loc !== "object") return null;
      return loc;
    } catch (e) {
      return null;
    }
  }

  function placeLabel(loc) {
    if (!loc) return "";
    return (
      loc.displayTitle ||
      loc.placeLabel ||
      loc.name ||
      (loc.county && loc.stateCode ? loc.county + ", " + loc.stateCode : "") ||
      ""
    );
  }

  function updateNowPanel() {
    var body = document.querySelector("[data-was-home-now-body]");
    var meta = document.querySelector("[data-was-home-now-meta]");
    var btn = document.getElementById("was-home-loc-btn");
    if (!body) return;

    var loc = readLocation();
    var label = placeLabel(loc);
    if (label) {
      body.textContent =
        "A place is saved on this device: " +
        label +
        ". Open Dashboard for Today Outside — conditions settle there as data arrives. Nothing is invented on this page.";
      if (meta) {
        meta.textContent =
          (loc.source === "manual" ? "Place set manually" : "Place from this device") +
          " · coordinates stay local unless you share them";
      }
      if (btn) { btn.hidden = true; btn.setAttribute("hidden", ""); }
    } else {
      body.textContent =
        "No place is saved yet. Open Dashboard to set a region, or use your location — coordinates stay on this device.";
      if (meta) meta.textContent = "Location optional · privacy-first";
      if (btn) { btn.hidden = false; btn.removeAttribute("hidden"); }
    }
  }

  function bindLocationButton() {
    var btn = document.getElementById("was-home-loc-btn");
    if (!btn) return;
    btn.addEventListener("click", function () {
      var Loc = global.WDS && global.WDS.location;
      if (Loc && typeof Loc.requestBrowserLocation === "function") {
        Loc.requestBrowserLocation({ promptMountId: "wds-location-prompt" });
        return;
      }
      if (Loc && typeof Loc.showPrompt === "function") {
        Loc.showPrompt({ mountId: "wds-location-prompt" });
        return;
      }
      global.location.href = "apps/dashboard/";
    });
  }

  function mountTake() {
    var takeEl = document.querySelector("[data-wds-take]");
    var Take = global.WDS && global.WDS.take;
    if (!takeEl || !Take || !Take.mount) return;
    Take.mount(
      takeEl,
      Take.homepageDefault
        ? Take.homepageDefault()
        : {
            body: "Start with the day you are in. Tools wait until attention has somewhere to land.",
            meta: "Editorial · not a score · not a to-do list"
          }
    );
  }

  /**
   * Hidden gate mount — keeps automation selectors stable without
   * turning the visible front door into an app-directory card grid.
   */
  function renderGateMount() {
    var mount = document.getElementById("was-home-apps");
    if (!mount) return;
    mount.innerHTML =
      '<div class="was-home__grid was-home__grid--primary" data-home-gate="pathways">' +
      '<a class="was-home__card" href="apps/dashboard/"><h3 class="was-home__card-title">Dashboard</h3></a>' +
      '<a class="was-home__card" href="apps/scenes/"><h3 class="was-home__card-title">Scenes</h3></a>' +
      '<a class="was-home__card" href="apps/shed-hunting/"><h3 class="was-home__card-title">Sheds</h3></a>' +
      '<a class="was-home__card" href="articles/"><h3 class="was-home__card-title">Articles</h3></a>' +
      '<a class="was-home__card" href="side-trails/"><h3 class="was-home__card-title">Side Trails</h3></a>' +
      "</div>";
    mount.hidden = true;
    mount.setAttribute("aria-hidden", "true");
  }

  function boot() {
    updateNowPanel();
    bindLocationButton();
    mountTake();
    renderGateMount();

    global.addEventListener("wds:location", updateNowPanel);
    global.addEventListener("storage", function (ev) {
      if (ev && ev.key === "wds-location-v3") updateNowPanel();
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})(typeof window !== "undefined" ? window : globalThis);
