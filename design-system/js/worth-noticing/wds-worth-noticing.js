/**
 * Worth Noticing Engine — calm context-aware observations.
 * Never notifications, streaks, homework, or engagement bait.
 * @see docs/WAYPOINT-OBSERVATION-ENGINE.md
 */
(function (global) {
  "use strict";

  var DEFAULT_QUALITY = {
    minimumScore: 0.55,
    hardFailPatterns: [
      "tip of the day",
      "daily challenge",
      "homework",
      "assignment",
      "you must",
      "you're behind",
      "you are behind",
      "streak",
      "don't miss",
      "do not miss",
      "complete this",
      "required reading",
      "next lesson",
      "achievement unlocked"
    ],
    weights: {
      specificity: 0.25,
      evidence: 0.2,
      uncertainty: 0.15,
      autonomy: 0.2,
      productFit: 0.1,
      freshness: 0.1
    }
  };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function hasPressureLanguage(text) {
    var s = String(text || "").toLowerCase();
    var patterns = DEFAULT_QUALITY.hardFailPatterns;
    var G = global.WDS && global.WDS.aiGuide;
    if (G && G.hasPressureLanguage && G.hasPressureLanguage(text)) return true;
    for (var i = 0; i < patterns.length; i++) {
      if (s.indexOf(patterns[i]) >= 0) return true;
    }
    return false;
  }

  function isExpired(obs, now) {
    if (!obs || !obs.expiresAt) return false;
    var t = Date.parse(obs.expiresAt);
    if (isNaN(t)) return false;
    return t < (now || Date.now());
  }

  function presentationLabel(key) {
    return (
      {
        "worth-noticing": "Worth noticing",
        "interesting-today": "Interesting today",
        "current-conditions": "Current conditions",
        "recent-research": "Recent research",
        "something-changed": "Something changed",
        background: "Background",
        context: "Context"
      }[key] || "Worth noticing"
    );
  }

  /**
   * Score an observation for surfacing. Returns { score, pass, reasons, dimensions }.
   */
  function score(obs, ctx, quality) {
    quality = quality || DEFAULT_QUALITY;
    ctx = ctx || {};
    var reasons = [];
    var blob = [obs.title, obs.observation, obs.whyItMatters].join(" ");

    if (!obs || !obs.observation || !obs.whyItMatters) {
      return { score: 0, pass: false, reasons: ["missing observation or why"], dimensions: {} };
    }
    if (hasPressureLanguage(blob)) {
      return { score: 0, pass: false, reasons: ["pressure or school language"], dimensions: {} };
    }
    if (isExpired(obs, ctx.now)) {
      return { score: 0, pass: false, reasons: ["expired"], dimensions: {} };
    }
    if (obs.reviewStatus === "archived") {
      return { score: 0, pass: false, reasons: ["archived"], dimensions: {} };
    }

    var w = quality.weights || DEFAULT_QUALITY.weights;
    var dims = {};

    var signals = obs.signals || {};
    var ctxSignals = ctx.signals || ctx;
    var signalHit = 0;
    var signalKeys = Object.keys(signals);
    signalKeys.forEach(function (k) {
      if (ctxSignals[k] != null && ctxSignals[k] !== false && ctxSignals[k] !== "") signalHit++;
    });
    dims.specificity =
      signalKeys.length === 0 ? 0.35 : Math.min(1, 0.4 + signalHit / Math.max(1, signalKeys.length));

    dims.evidence = (obs.evidence && obs.evidence.length ? Math.min(1, 0.45 + obs.evidence.length * 0.2) : 0.2);

    if (obs.confidence == null && !obs.confidenceLabel) dims.uncertainty = 0.45;
    else if (obs.confidenceLabel === "uncertain" || obs.confidenceLabel === "low") dims.uncertainty = 0.9;
    else if (obs.confidence != null && obs.confidence < 0.65) dims.uncertainty = 0.8;
    else dims.uncertainty = 0.65;

    dims.autonomy = /you decide|if you|optional|may |worth |consider|curious/i.test(blob) ? 0.9 : 0.55;
    if (/must|should complete|go now/i.test(blob)) dims.autonomy = 0.1;

    var product = ctx.product || ctx.productId;
    if (!product) dims.productFit = 0.7;
    else if ((obs.products || []).indexOf(product) >= 0 || (obs.products || []).indexOf("shared") >= 0)
      dims.productFit = 1;
    else dims.productFit = 0.05;

    dims.freshness = isExpired(obs, ctx.now) ? 0 : 0.85;

    var total = 0;
    Object.keys(w).forEach(function (k) {
      total += (dims[k] != null ? dims[k] : 0) * w[k];
    });

    var min = quality.minimumScore != null ? quality.minimumScore : DEFAULT_QUALITY.minimumScore;
    var pass = total >= min && dims.productFit >= 0.5;
    if (!pass) reasons.push("below quality threshold or product mismatch");
    else reasons.push("passes quality gates");

    return { score: Math.round(total * 1000) / 1000, pass: pass, reasons: reasons, dimensions: dims };
  }

  function filterByProduct(list, productId) {
    if (!productId) return (list || []).slice();
    return (list || []).filter(function (o) {
      return (o.products || []).indexOf(productId) >= 0 || (o.products || []).indexOf("shared") >= 0;
    });
  }

  /**
   * Pick at most one observation — or null (silence).
   */
  function select(observations, ctx, quality) {
    ctx = ctx || {};
    quality = quality || DEFAULT_QUALITY;
    var list = filterByProduct(observations, ctx.product || ctx.productId);
    var ranked = list
      .map(function (obs) {
        return { observation: obs, result: score(obs, ctx, quality) };
      })
      .filter(function (r) {
        return r.result.pass;
      })
      .sort(function (a, b) {
        return b.result.score - a.result.score;
      });
    if (!ranked.length) return null;
    return ranked[0];
  }

  function signalMatch(rule, ctxSignals) {
    var i;
    if (rule.requiresAll && rule.requiresAll.length) {
      for (i = 0; i < rule.requiresAll.length; i++) {
        if (!ctxSignals[rule.requiresAll[i]]) return false;
      }
    }
    if (rule.requiresAny && rule.requiresAny.length) {
      var any = false;
      for (i = 0; i < rule.requiresAny.length; i++) {
        if (ctxSignals[rule.requiresAny[i]]) any = true;
      }
      if (!any) return false;
    }
    if (rule.minNightsAboveFreezing != null) {
      var n = Number(ctxSignals.nightsAboveFreezing || 0);
      if (n < rule.minNightsAboveFreezing) return false;
    }
    if (rule.phenologyTag && ctxSignals.phenologyTag !== rule.phenologyTag) return false;
    return true;
  }

  /**
   * Map rules + observation library → candidates for the active context.
   */
  function matchRules(observations, rules, ctx) {
    ctx = ctx || {};
    var ctxSignals = Object.assign({}, ctx.signals || {}, ctx);
    var byId = {};
    (observations || []).forEach(function (o) {
      if (o && o.id) byId[o.id] = o;
    });
    var product = ctx.product || ctx.productId;
    var out = [];
    (rules || []).forEach(function (rule) {
      if (product && rule.products && rule.products.indexOf(product) < 0) return;
      if (!signalMatch(rule, ctxSignals)) return;
      var obs = byId[rule.observationId];
      if (!obs) return;
      out.push(obs);
    });
    return out;
  }

  function selectFromRules(observations, rules, ctx, quality) {
    var matched = matchRules(observations, rules, ctx);
    return select(matched.length ? matched : observations, ctx, quality);
  }

  function toGuideCard(obs) {
    if (!obs) return null;
    var curious = [];
    (obs.deeperReading || []).forEach(function (d) {
      if (!d || !d.label) return;
      curious.push(d.href ? { label: d.label, href: d.href } : d.label);
    });
    (obs.relatedResearch || []).forEach(function (id) {
      curious.push("Related research: " + id);
    });
    return {
      noticing: obs.title,
      seeing: obs.observation,
      why: obs.whyItMatters,
      uncertainty:
        obs.confidenceLabel === "uncertain" || obs.confidenceLabel === "low"
          ? "Confidence is limited — treat this as a noticing cue, not a certainty."
          : obs.confidence != null && obs.confidence < 0.6
            ? "Moderate confidence only."
            : "",
      curious: curious,
      inset: true
    };
  }

  function render(obs, options) {
    options = options || {};
    if (!obs) return "";
    var Guide = global.WDS && global.WDS.guideCard;
    if (Guide && Guide.render && options.useGuideCard !== false) {
      return Guide.render(toGuideCard(obs));
    }

    var label = presentationLabel(obs.presentation);
    var evidence = (obs.evidence || [])
      .slice(0, 3)
      .map(function (e) {
        return "<li>" + esc(e) + "</li>";
      })
      .join("");
    var curious = (obs.deeperReading || [])
      .map(function (d) {
        if (d.href) {
          return '<li><a href="' + esc(d.href) + '">' + esc(d.label) + "</a></li>";
        }
        return "<li><span>" + esc(d.label) + "</span></li>";
      })
      .join("");

    return (
      '<aside class="wn-card" data-wn-id="' +
      esc(obs.id) +
      '" data-wn-observation>' +
      (options.dismissible
        ? '<button type="button" class="wn-card__dismiss" data-wn-dismiss aria-label="Dismiss">Dismiss</button>'
        : "") +
      '<p class="wn-card__eyebrow">' +
      esc(label) +
      "</p>" +
      '<h3 class="wn-card__title">' +
      esc(obs.title) +
      "</h3>" +
      '<p class="wn-card__observation">' +
      esc(obs.observation) +
      "</p>" +
      '<p class="wn-card__why"><strong>Why it matters</strong> ' +
      esc(obs.whyItMatters) +
      "</p>" +
      (evidence ? '<ul class="wn-card__evidence">' + evidence + "</ul>" : "") +
      (curious
        ? '<div class="wn-card__curious"><p class="wn-card__curious-label">If you\'re curious</p><ul>' +
          curious +
          "</ul></div>"
        : "") +
      "</aside>"
    );
  }

  function bindDismiss(root) {
    root = root || document;
    root.querySelectorAll("[data-wn-dismiss]").forEach(function (btn) {
      if (btn.dataset.wnBound) return;
      btn.dataset.wnBound = "1";
      btn.addEventListener("click", function () {
        var card = btn.closest("[data-wn-observation]");
        if (card) card.remove();
      });
    });
  }

  async function loadSamples(basePath) {
    basePath = basePath || "design-system/worth-noticing/samples/demo-observations.json";
    var res = await fetch(basePath, { cache: "no-store" });
    if (!res.ok) throw new Error("Could not load worth-noticing samples.");
    return res.json();
  }

  async function loadQuality(basePath) {
    basePath = basePath || "design-system/worth-noticing/quality.json";
    var res = await fetch(basePath, { cache: "no-store" });
    if (!res.ok) return DEFAULT_QUALITY;
    return res.json();
  }

  async function loadRules(basePath) {
    basePath = basePath || "design-system/worth-noticing/rules/generation-rules.json";
    var res = await fetch(basePath, { cache: "no-store" });
    if (!res.ok) return { rules: [] };
    return res.json();
  }

  var _library = null;

  function prime(observations, rules, quality) {
    _library = {
      observations: observations || [],
      rules: (rules && rules.rules) || rules || [],
      quality: quality || DEFAULT_QUALITY
    };
    return _library;
  }

  function getLibrary() {
    return _library;
  }

  /**
   * Derive signals from Outdoor Intelligence / Photo Coach outdoor snapshot.
   */
  function signalsFromOutdoorContext(ctx) {
    ctx = ctx || {};
    var weather = ctx.weather || {};
    var conditions = String(weather.conditions || weather.summary || "").toLowerCase();
    var signals = {};
    if (/overcast|cloud|diffuse|fog|mist/.test(conditions)) {
      signals.isDiffuse = true;
      signals.skyOvercast = true;
    }
    if (/rain|shower|drizzle/.test(conditions)) signals.recentRain = true;
    if (ctx.daylight && ctx.daylight.goldenHour) signals.goldenHour = true;
    if (ctx.season) signals.season = String(ctx.season).toLowerCase();
    return signals;
  }

  function selectForOutdoorContext(ctx, product) {
    if (!_library || !_library.observations.length) return null;
    var signals = signalsFromOutdoorContext(ctx);
    return selectFromRules(
      _library.observations,
      _library.rules,
      { product: product || "photo-coach", signals: signals },
      _library.quality
    );
  }

  global.WDS = global.WDS || {};
  global.WDS.worthNoticing = {
    version: "1.0.0",
    score: score,
    select: select,
    selectFromRules: selectFromRules,
    matchRules: matchRules,
    filterByProduct: filterByProduct,
    render: render,
    toGuideCard: toGuideCard,
    bindDismiss: bindDismiss,
    hasPressureLanguage: hasPressureLanguage,
    loadSamples: loadSamples,
    loadQuality: loadQuality,
    loadRules: loadRules,
    prime: prime,
    getLibrary: getLibrary,
    signalsFromOutdoorContext: signalsFromOutdoorContext,
    selectForOutdoorContext: selectForOutdoorContext,
    presentationLabel: presentationLabel,
    defaultQuality: DEFAULT_QUALITY,
    docPath: "docs/WAYPOINT-OBSERVATION-ENGINE.md"
  };
})(typeof window !== "undefined" ? window : globalThis);
