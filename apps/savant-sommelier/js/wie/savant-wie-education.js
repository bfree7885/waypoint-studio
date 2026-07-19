/**
 * Savant WIE — Education Engine (concise teachable moments, not walls of text).
 */
(function (global) {
  "use strict";

  var SNIPPETS = {
    acidity: "Why acidity matters: it keeps wine tasting fresh, cuts fat in food, and supports aging in many whites and lighter reds.",
    slope: "Why slope matters: cold air drains downhill — gentle slopes often avoid frost pockets that flatten valley floors can collect.",
    limestone: "Why limestone soils matter (teaching shorthand): they often drain well and are associated with wines that keep tension — soil is never a single flavor guarantee.",
    maritime: "Why maritime climates differ: oceans moderate heat spikes, so ripening can be steadier than inland continental swings.",
    continental: "Why continental climates differ: larger day–night and seasonal swings can intensify ripeness risk and frost timing.",
    pinotVsCab: "Why Pinot Noir behaves differently than Cabernet: thinner skins and cooler preferred heat windows make Pinot more site- and vintage-sensitive.",
    gdd: "Why Growing Degree Days matter: they summarize heat available to ripen a grape — useful for screening, not a quality score.",
    oak: "Why oak matters: barrels can add flavor and texture via toast and oxygen exchange — more oak is not automatically better.",
    tannin: "Why tannin matters: it structures reds and binds with protein in food; aggressive tannin without fruit feels drying.",
    terroir: "Why terroir is taught carefully: climate and terrain often explain more beginner mysteries than soil color myths alone.",
    drinkWindow: "Why drink windows are estimates: storage, vintage, and bottle variation move the target — use them as priorities, not clocks.",
    aspect: "Why aspect matters: south-facing slopes (N hemisphere) gather more sun, speeding ripening versus cooler north aspects."
  };

  function forTopic(id) {
    return SNIPPETS[id] || null;
  }

  function forContext(ctx) {
    ctx = ctx || {};
    var out = [];
    if (ctx.metricId && SNIPPETS[ctx.metricId]) out.push(SNIPPETS[ctx.metricId]);
    if (ctx.grape && /pinot/i.test(ctx.grape) && /cabernet/i.test(ctx.compareGrape || "cabernet")) {
      out.push(SNIPPETS.pinotVsCab);
    }
    if (ctx.theme && SNIPPETS[ctx.theme]) out.push(SNIPPETS[ctx.theme]);
    if (ctx.page === "vineyard") {
      out.push(SNIPPETS.gdd);
      out.push(SNIPPETS.slope);
      out.push(SNIPPETS.aspect);
    }
    if (ctx.page === "discover") {
      out.push(SNIPPETS.acidity);
      out.push(SNIPPETS.terroir);
    }
    if (ctx.page === "cellar") {
      out.push(SNIPPETS.drinkWindow);
    }
    // unique
    var seen = {};
    return out.filter(function (s) {
      if (!s || seen[s]) return false;
      seen[s] = true;
      return true;
    }).slice(0, 4);
  }

  function forMetric(metric) {
    if (!metric) return null;
    var map = {
      slope: "slope",
      aspect: "aspect",
      gdd: "gdd",
      acidity: "acidity",
      solarExposure: "aspect",
      climateClass: "maritime"
    };
    var id = map[metric.id];
    return id ? SNIPPETS[id] : (metric.whyItMatters || null);
  }

  global.SavantWIE = global.SavantWIE || {};
  global.SavantWIE.education = {
    SNIPPETS: SNIPPETS,
    forTopic: forTopic,
    forContext: forContext,
    forMetric: forMetric
  };
})(typeof window !== "undefined" ? window : globalThis);
