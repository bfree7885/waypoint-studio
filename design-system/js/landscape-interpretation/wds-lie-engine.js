/**
 * Landscape Interpretation Engine — lightweight offline evaluator (v0.1 runtime).
 * Turns observation tags + transparent rules into hedged place stories.
 * No GIS layers. No AI. Educational hypotheses only.
 */
(function (global) {
  "use strict";

  var CONFIDENCE_RANK = {
    high: 4,
    moderate: 3,
    low: 2,
    speculative: 1,
    insufficient: 0
  };

  function tagSet(observations) {
    var set = {};
    (observations || []).forEach(function (o) {
      var tag = typeof o === "string" ? o : o && o.tag;
      if (tag) set[tag] = true;
    });
    return set;
  }

  function predOk(pred, tags) {
    if (!pred || !pred.op) return false;
    if (pred.op === "tag") return !!tags[pred.tag];
    if (pred.op === "tagAny") {
      return (pred.tags || []).some(function (t) {
        return !!tags[t];
      });
    }
    if (pred.op === "tagAll") {
      return (pred.tags || []).every(function (t) {
        return !!tags[t];
      });
    }
    return false;
  }

  function ruleMatches(rule, tags) {
    if (!rule || !rule.if) return false;
    var all = rule.if.all || [];
    var any = rule.if.any;
    if (all.length && !all.every(function (p) { return predOk(p, tags); })) return false;
    if (any && any.length && !any.some(function (p) { return predOk(p, tags); })) return false;
    if (!all.length && !(any && any.length)) return false;
    return true;
  }

  function weakerCeiling(a, b) {
    var ra = CONFIDENCE_RANK[a] != null ? CONFIDENCE_RANK[a] : 0;
    var rb = CONFIDENCE_RANK[b] != null ? CONFIDENCE_RANK[b] : 0;
    return ra <= rb ? a : b;
  }

  function interpretationFromRule(rule, observations) {
    var tags = tagSet(observations);
    var evidence = (rule.evidenceHints || []).slice(0, 4).map(function (text) {
      return { text: text, ruleId: rule.id };
    });
    (observations || []).forEach(function (o) {
      var tag = typeof o === "string" ? o : o && o.tag;
      if (!tag || !tags[tag]) return;
      if (rule.if && JSON.stringify(rule.if).indexOf(tag) !== -1) {
        evidence.push({
          text: (o.description || tag) + " — matched the rule's IF clues.",
          observationId: o.id || null,
          ruleId: rule.id
        });
      }
    });
    return {
      id: "ix_" + rule.id,
      taxonomyId: rule.then && rule.then.taxonomyId,
      category: rule.category,
      label: (rule.then && rule.then.label) || rule.title,
      statement:
        (rule.then && (rule.then.statementTemplate || rule.then.plainLanguage)) ||
        rule.title,
      confidence: {
        level: rule.confidenceCeiling || "low",
        score: null,
        rationale:
          "Ceiling from rule " +
          rule.id +
          ". Evidence is field observation tags only — no live maps or historic imagery.",
        ceilingFromRules: rule.confidenceCeiling || "low"
      },
      supportingEvidence: evidence,
      alternativeExplanations: (rule.alternatives || []).map(function (text) {
        return { text: text };
      }),
      suggestedFieldObservations: (rule.fieldChecks || []).map(function (prompt) {
        return { prompt: prompt, whyItHelps: "Strengthens or weakens this reading." };
      }),
      ruleIds: [rule.id],
      because: rule.if && rule.if.plainLanguage,
      limitations: rule.limitations || "",
      ethicsNotes: rule.ethicsNotes || "",
      consumers: rule.consumers || []
    };
  }

  function evaluate(options) {
    options = options || {};
    var packs = options.packs || [];
    var observations = options.observations || [];
    var tags = tagSet(observations);
    var rules = [];
    packs.forEach(function (pack) {
      (pack.rules || []).forEach(function (r) {
        rules.push(r);
      });
    });
    var matched = rules
      .filter(function (r) {
        return ruleMatches(r, tags);
      })
      .sort(function (a, b) {
        return (b.priority || 0) - (a.priority || 0);
      });

    // Prefer stronger pasture rule over wall-only when both fire
    var seenTax = {};
    var interpretations = [];
    matched.forEach(function (rule) {
      var tax = rule.then && rule.then.taxonomyId;
      if (tax && seenTax[tax]) return;
      if (tax === "land-use.stone-wall-boundary" && seenTax["land-use.former-pasture"]) return;
      if (tax) seenTax[tax] = true;
      interpretations.push(interpretationFromRule(rule, observations));
    });

    var ceiling = "high";
    if (!interpretations.length) ceiling = "insufficient";
    interpretations.forEach(function (ix) {
      ceiling = weakerCeiling(ceiling, ix.confidence.level);
    });

    var packIds = packs.map(function (p) {
      return p.meta && p.meta.packId;
    }).filter(Boolean);

    return {
      meta: {
        version: "0.1.0",
        engineVersion: "0.1.0-runtime",
        status: "educational",
        languageMode: "teach",
        rulePackIds: packIds,
        dataCoverage: {
          userObservations: observations.length > 0,
          remoteLayers: false,
          historicImagery: false,
          notes: "Offline rule evaluation — hypotheses only."
        },
        aiAssisted: false,
        disclaimer:
          "Interpretations are provisional educational stories, not verified land history or legal claims."
      },
      place: options.place || {
        id: null,
        label: options.placeLabel || "This place (field reading)",
        regionHint: options.regionHint || "northeastern-us"
      },
      question: "Why does this place look the way it does?",
      observations: observations,
      interpretations: interpretations,
      narrative: interpretations.length
        ? {
            text: interpretations
              .slice(0, 2)
              .map(function (ix) {
                return ix.statement;
              })
              .join(" "),
            confidenceCeiling: ceiling
          }
        : {
            text: "Not enough clues yet. Add what you notice — walls, water, stems, rock, fire scars — then read again.",
            confidenceCeiling: "insufficient"
          },
      honesty: {
        mode: "observation-tags",
        layers: "none",
        confidenceCeiling: ceiling
      }
    };
  }

  function loadPack(url) {
    return fetch(url, { credentials: "same-origin" }).then(function (r) {
      if (!r.ok) throw new Error("Could not load rule pack (" + r.status + ")");
      return r.json();
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.landscapeInterpretation = {
    version: "0.1.0",
    evaluate: evaluate,
    ruleMatches: ruleMatches,
    tagSet: tagSet,
    loadPack: loadPack,
    CONFIDENCE_RANK: CONFIDENCE_RANK
  };
})(typeof window !== "undefined" ? window : globalThis);
