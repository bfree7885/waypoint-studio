/**
 * Savant WIE — Cellar Intelligence (collection insights + improvement suggestions).
 */
(function (global) {
  "use strict";

  function analyze(signals, catalog) {
    signals = signals || { wines: [], counts: {} };
    catalog = catalog || { entries: [] };
    var wines = signals.wines || [];
    var insights = [];
    var suggestions = [];

    var styles = {};
    var regions = {};
    var countries = {};
    var colors = { red: 0, white: 0, sparkling: 0, other: 0 };
    var agingCapable = 0;
    var approaching = 0;
    var year = new Date().getFullYear();

    wines.forEach(function (w) {
      var st = String(w.style || "").toLowerCase();
      styles[st || "unspecified"] = (styles[st || "unspecified"] || 0) + (Number(w.quantity) || 1);
      if (w.region) regions[w.region] = (regions[w.region] || 0) + 1;
      if (w.country) countries[w.country] = (countries[w.country] || 0) + 1;
      if (/spark/.test(st) || /champagne|cava|prosecco/i.test(w.name || "")) colors.sparkling += 1;
      else if (/white|blanc|riesling|chardonnay|chenin/i.test(st + " " + (w.varietal || ""))) colors.white += 1;
      else if (/red|noir|cabernet|merlot|syrah|nebbiolo|gamay/i.test(st + " " + (w.varietal || ""))) colors.red += 1;
      else colors.other += 1;

      var drinkTo = parseInt(w.drinkTo, 10);
      var drinkFrom = parseInt(w.drinkFrom, 10);
      if (drinkTo && drinkTo >= year + 5) agingCapable += 1;
      if (drinkTo && drinkTo <= year + 1 && drinkTo >= year - 1) approaching += 1;
      if (!drinkTo && drinkFrom && drinkFrom <= year) approaching += 1;
    });

    if (!wines.length) {
      insights.push({
        id: "empty",
        text: "Your cellar is empty — add bottles you actually drink so intelligence can personalize.",
        why: "Without inventory signals, Savant can teach from the catalog but cannot analyze your collection."
      });
      suggestions.push({
        text: "Start with one everyday white, one flexible red, and one sparkling for gatherings.",
        why: "Three roles cover most occasions without forcing a scoreboard cellar."
      });
    } else {
      if (colors.sparkling === 0) {
        insights.push({ id: "no-sparkling", text: "You have no sparkling wines.", why: "Sparkling teaches acid, pressure, and celebration use-cases that still wines miss." });
        suggestions.push({ text: "Add a traditional-method or quality tank sparkling under your usual budget.", why: "Fills a functional gap and expands tasting education." });
      }
      if (colors.white <= 1 && colors.red >= 3) {
        insights.push({ id: "white-gap", text: "Your cellar is light on white wine diversity.", why: "White wines often carry the acidity and aromatic lessons that balance a red-heavy shelf." });
        suggestions.push({ text: "Add a high-acid white (Riesling or Chenin) and one textural white (Chardonnay or oak-optional).", why: "Creates contrast for tasting practice." });
      }
      var regionKeys = Object.keys(regions);
      if (regionKeys.length === 1) {
        insights.push({
          id: "region-narrow",
          text: "Your cellar is heavily weighted toward " + regionKeys[0] + ".",
          why: "Single-region cellars deepen expertise but can stall comparative learning."
        });
        suggestions.push({ text: "Add one bottle from a neighboring climate conversation region.", why: "Guided discovery works best with side-by-side contrast." });
      }
      var caHeavy = regionKeys.some(function (r) { return /california|napa|sonoma/i.test(r); }) &&
        regionKeys.filter(function (r) { return /california|napa|sonoma/i.test(r); })
          .reduce(function (n, r) { return n + regions[r]; }, 0) >= Math.ceil(wines.length * 0.6);
      if (caHeavy) {
        insights.push({ id: "ca-heavy", text: "Your cellar is heavily weighted toward California.", why: "Warm-region dominance can hide cool-climate acidity benchmarks." });
      }
      if (approaching >= 2) {
        insights.push({
          id: "maturity",
          text: "Several wines look near their drink window (" + approaching + ").",
          why: "Drink windows are estimates — check storage history, then prioritize bottles at peak risk of fading."
        });
      }
      if (agingCapable === 0 && wines.length >= 3) {
        insights.push({
          id: "no-aging",
          text: "You have few or no wines tagged for longer aging.",
          why: "Not a flaw — most wine is meant young — but intentional aging bottles teach time."
        });
        suggestions.push({ text: "If curious, reserve one structured red or Riesling with a longer drink-to year.", why: "Creates a future tasting lesson without filling the cellar with trophies." });
      }
    }

    return {
      version: "1.0.0",
      honesty: "Cellar insights read your local inventory structure — they are coaching notes, not judgments.",
      insights: insights,
      suggestions: suggestions,
      snapshot: {
        styles: styles,
        regions: regions,
        countries: countries,
        colors: colors,
        approaching: approaching,
        agingCapable: agingCapable
      }
    };
  }

  global.SavantWIE = global.SavantWIE || {};
  global.SavantWIE.cellar = {
    analyze: analyze
  };
})(typeof window !== "undefined" ? window : globalThis);
