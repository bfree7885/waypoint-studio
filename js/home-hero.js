/**
 * Homepage seasonal hero — prefers experience identity manifest, then seasons.
 * Owner photography: assets/images/identity/manifest.json
 */
(function (global) {
  "use strict";

  var SEASON_MANIFEST = "assets/images/home/seasons/manifest.json";

  function seasonFromMonth(month) {
    if (month >= 3 && month <= 5) return "spring";
    if (month >= 6 && month <= 8) return "summer";
    if (month >= 9 && month <= 11) return "autumn";
    return "winter";
  }

  function apply(root, entry, seasonId) {
    if (!root || !entry) return;
    var img = root.querySelector("[data-home-hero-img]");
    var credit = root.querySelector("[data-home-hero-credit]");
    var ph = root.querySelector("[data-home-hero-placeholder]");
    if (img && entry.src) {
      img.src = entry.src;
      img.alt = entry.alt || img.alt || "";
      img.dataset.season = seasonId || "";
      if (entry.placeholder) img.setAttribute("data-placeholder", "true");
      else img.removeAttribute("data-placeholder");
    }
    root.setAttribute("data-season", seasonId || "default");
    if (credit) {
      credit.textContent = entry.credit
        ? (entry.placeholder && entry.credit.indexOf("Placeholder") < 0
            ? "Placeholder imagery · "
            : "") + entry.credit
        : "";
      credit.hidden = !entry.credit;
    }
    if (ph) {
      ph.hidden = !entry.placeholder;
    }
  }

  function mountFromIdentity(root) {
    var Id = global.WDS && global.WDS.experienceIdentity;
    if (!Id || !Id.entryFor) return Promise.reject(new Error("no identity"));
    return Id.entryFor("home").then(function (entry) {
      if (!entry) throw new Error("no home identity");
      apply(root, entry, entry.mood || "identity");
      return entry;
    });
  }

  function mountFromSeasons(root) {
    var forced = root.getAttribute("data-season");
    var month = new Date().getMonth() + 1;
    var seasonId = forced && forced !== "auto" ? forced : seasonFromMonth(month);

    return fetch(SEASON_MANIFEST, { credentials: "same-origin" })
      .then(function (r) {
        if (!r.ok) throw new Error("manifest");
        return r.json();
      })
      .then(function (data) {
        var entry =
          (data.seasons && data.seasons[seasonId]) ||
          data.default ||
          null;
        apply(root, entry, seasonId);
        return entry;
      });
  }

  function mount(root) {
    root = root || document.querySelector("[data-home-hero]");
    if (!root) return;
    mountFromIdentity(root).catch(function () {
      return mountFromSeasons(root);
    }).catch(function () {
      /* keep HTML-declared default img */
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.homeHero = {
    mount: mount,
    seasonFromMonth: seasonFromMonth
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      mount();
    });
  } else {
    mount();
  }
})(typeof window !== "undefined" ? window : globalThis);
