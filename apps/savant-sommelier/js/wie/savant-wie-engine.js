/**
 * Savant Wine Intelligence Engine — orchestrator + cache.
 * signals → palate → recommend / discovery / tasting / pairing / cellar / purchase
 */
(function (global) {
  "use strict";

  var memory = { key: null, package: null, at: 0 };

  function packageKey(signals, catalogVersion) {
    var c = signals && signals.counts || {};
    return [c.wines, c.rated, c.favorites, c.wishlist, catalogVersion || "cat"].join("|");
  }

  function evaluate(options) {
    options = options || {};
    var W = global.SavantWIE;
    if (!W || !W.signals || !W.palate) {
      throw new Error("Savant WIE layers are not loaded");
    }

    var catalog = options.catalog || { entries: [], version: "0" };
    var signals = options.signals || W.signals.collect({
      wines: options.wines,
      wishlist: options.wishlist,
      sites: options.sites
    });
    var key = packageKey(signals, catalog.version || catalog.entries && catalog.entries.length);
    var maxAge = options.maxAgeMs != null ? options.maxAgeMs : 2 * 60 * 1000;

    if (!options.force && memory.package && memory.key === key && Date.now() - memory.at < maxAge) {
      memory.package._fromCache = true;
      return memory.package;
    }

    var palate = W.palate.buildPalate(signals, catalog);
    var ownedNames = (signals.wines || []).map(function (w) { return w.name; });
    var recommendations = W.recommend
      ? W.recommend.recommend(palate, catalog, { limit: options.recommendLimit || 6, ownedNames: ownedNames })
      : { items: [] };
    var discovery = W.discovery ? W.discovery.guided(palate, catalog) : { suggestions: [] };
    var tasting = W.tasting ? W.tasting.analyze(palate, signals) : null;
    var cellar = W.cellar ? W.cellar.analyze(signals, catalog) : null;
    var purchase = W.purchase ? W.purchase.analyze(signals, palate) : null;
    var education = W.education
      ? {
          discover: W.education.forContext({ page: "discover" }),
          cellar: W.education.forContext({ page: "cellar" }),
          vineyard: W.education.forContext({ page: "vineyard" })
        }
      : {};

    var pkg = {
      version: "1.0.0",
      generatedAt: new Date().toISOString(),
      _fromCache: false,
      signals: signals,
      palate: palate,
      recommendations: recommendations,
      discovery: discovery,
      tasting: tasting,
      cellar: cellar,
      purchase: purchase,
      education: education,
      honesty: "Wine Intelligence Engine interprets your local signals and educational catalogs — every recommendation should answer why."
    };

    memory = { key: key, package: pkg, at: Date.now() };
    return pkg;
  }

  function clearCache() {
    memory = { key: null, package: null, at: 0 };
  }

  function search(catalog, query) {
    if (!global.SavantWIE.search) return { results: [], suggestions: [] };
    return SavantWIE.search.search(catalog, query);
  }

  function pairFood(catalog, food, palate) {
    if (!global.SavantWIE.pairing) return { matches: [] };
    return SavantWIE.pairing.pairForFood(food, catalog, palate);
  }

  function compare(a, b) {
    if (!global.SavantWIE.compare) return { ok: false };
    return SavantWIE.compare.compareEntries(a, b);
  }

  global.SavantWIE = global.SavantWIE || {};
  global.SavantWIE.engine = {
    evaluate: evaluate,
    clearCache: clearCache,
    search: search,
    pairFood: pairFood,
    compare: compare
  };
})(typeof window !== "undefined" ? window : globalThis);
