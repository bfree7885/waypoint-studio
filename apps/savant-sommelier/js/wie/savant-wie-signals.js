/**
 * Savant WIE — behavioral signals from cellar, wishlist, ratings, purchases.
 * Observations only — no recommendations here.
 */
(function (global) {
  "use strict";

  function seasonOf(iso) {
    if (!iso) return null;
    var m = new Date(iso).getMonth();
    if (isNaN(m)) return null;
    if (m >= 2 && m <= 4) return "spring";
    if (m >= 5 && m <= 7) return "summer";
    if (m >= 8 && m <= 10) return "fall";
    return "winter";
  }

  function collect(options) {
    options = options || {};
    var S = global.WaypointSavant;
    var wines = (options.wines || (S && S.listWines && S.listWines()) || []).slice();
    var wishlist = (options.wishlist || (S && S.listWishlist && S.listWishlist()) || []).slice();
    var sites = (options.sites || (S && S.listSites && S.listSites()) || []).slice();

    var rated = wines.filter(function (w) { return w.rating != null && isFinite(Number(w.rating)); });
    var favorites = wines.filter(function (w) { return w.favorite; });
    var purchased = wines.filter(function (w) { return w.purchasePrice != null || w.purchaseDate; });

    return {
      version: "1.0.0",
      collectedAt: new Date().toISOString(),
      wines: wines,
      wishlist: wishlist,
      sites: sites,
      rated: rated,
      favorites: favorites,
      purchased: purchased,
      counts: {
        wines: wines.length,
        bottles: wines.reduce(function (n, w) { return n + (Number(w.quantity) || 0); }, 0),
        rated: rated.length,
        favorites: favorites.length,
        wishlist: wishlist.length,
        purchased: purchased.length
      },
      seasons: purchased.map(function (w) { return seasonOf(w.purchaseDate); }).filter(Boolean)
    };
  }

  global.SavantWIE = global.SavantWIE || {};
  global.SavantWIE.signals = {
    collect: collect,
    seasonOf: seasonOf
  };
})(typeof window !== "undefined" ? window : globalThis);
