/**
 * SignalTerrain Cyber Awareness — transparent priority engine.
 * Every point is explained. No mysterious AI scores.
 */
(function (global) {
  "use strict";

  function bandFor(total, bands) {
    for (var i = 0; i < bands.length; i++) {
      var b = bands[i];
      if (total >= b.min && total <= b.max) return b;
    }
    return bands[bands.length - 1];
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function score(inputs, factorsDoc, rulesDoc) {
    inputs = inputs || {};
    factorsDoc = factorsDoc || {};
    rulesDoc = rulesDoc || {};
    var maps = rulesDoc.maps || {};
    var contributions = [];
    var unknowns = [];

    function add(factorId, points, maxPoints, inputValue, reason) {
      contributions.push({
        factorId: factorId,
        points: points,
        maxPoints: maxPoints,
        inputValue: inputValue,
        reason: reason
      });
    }

    var sev = inputs.severity || "info";
    add(
      "severity",
      maps.severity[sev] != null ? maps.severity[sev] : 2,
      20,
      sev,
      "Severity labeled “" + sev + "” on the subject."
    );

    var ke = inputs.knownExploitation || "none";
    add(
      "known_exploitation",
      maps.known_exploitation[ke] != null ? maps.known_exploitation[ke] : 0,
      25,
      ke,
      ke === "active"
        ? "Public sources indicate active exploitation (e.g. KEV or equivalent)."
        : ke === "historical"
          ? "Exploitation has been publicly documented historically."
          : "No known exploitation asserted in sample inputs."
    );

    var pea = inputs.publicExploitAvailability || "none";
    add(
      "public_exploit_availability",
      maps.public_exploit_availability[pea] != null ? maps.public_exploit_availability[pea] : 0,
      15,
      pea,
      pea === "none"
        ? "No public exploit availability asserted."
        : "Public reporting indicates exploit availability (“" + pea + "”) — literacy only; no payloads."
    );

    var patch = inputs.patchAvailability || "available";
    add(
      "patch_availability",
      maps.patch_availability[patch] != null ? maps.patch_availability[patch] : 3,
      10,
      patch,
      patch === "unavailable"
        ? "No patch path asserted — raises defensive priority."
        : patch === "partial"
          ? "Partial mitigation/patch path asserted."
          : "A patch or update path is available — still requires human action."
    );

    var industry = clamp(Number(inputs.industryRelevance) || 0, 0, 10);
    add(
      "industry_relevance",
      industry,
      10,
      industry,
      industry
        ? "Industry overlap with observer interests scored " + industry + "/10."
        : "No industry overlap boost applied."
    );

    var recency = inputs.recency || "legacy";
    add(
      "recency",
      maps.recency[recency] != null ? maps.recency[recency] : 2,
      10,
      recency,
      "Recency band “" + recency + "”."
    );

    var sources = clamp(Number(inputs.trustedSourceCount) || 0, 0, 5);
    add(
      "trusted_source_count",
      sources,
      5,
      sources,
      sources
        ? sources + " trusted citation(s) support this picture."
        : "Few or no trusted citations recorded — treat cautiously."
    );
    if (sources < 1) unknowns.push("Trusted source coverage is thin.");

    var interest = clamp(Number(inputs.ownerInterest) || 0, 0, 5);
    add(
      "owner_interest",
      interest,
      5,
      interest,
      interest
        ? "Local owner interest boost " + interest + "/5 (device-local preference)."
        : "No local owner interest boost."
    );

    var conf = inputs.confidence || "moderate";
    add(
      "confidence",
      maps.confidence[conf] != null ? maps.confidence[conf] : 4,
      5,
      conf,
      "Confidence labeled “" + conf + "”."
    );

    var total = 0;
    contributions.forEach(function (c) {
      total += c.points;
    });
    total = clamp(Math.round(total), 0, 100);

    var bands = rulesDoc.bands || [];
    var band = bandFor(total, bands);
    var caps = rulesDoc.caps || {};
    if (
      band.id === "urgent" &&
      caps.urgentRequiresKnownExploitation &&
      ke === "none"
    ) {
      band = bands.filter(function (b) {
        return b.id === "high";
      })[0] || band;
      unknowns.push("Urgent capped: known exploitation not asserted.");
      total = Math.min(total, 74);
    }
    if (
      band.id === "urgent" &&
      caps.urgentMinTrustedSources &&
      sources < caps.urgentMinTrustedSources
    ) {
      band = bands.filter(function (b) {
        return b.id === "high";
      })[0] || band;
      unknowns.push("Urgent capped: fewer than " + caps.urgentMinTrustedSources + " trusted sources.");
      total = Math.min(total, 74);
    }

    var whyParts = contributions
      .filter(function (c) {
        return c.points > 0;
      })
      .sort(function (a, b) {
        return b.points - a.points;
      })
      .slice(0, 4)
      .map(function (c) {
        return c.reason;
      });

    return {
      meta: {
        version: "0.1.0",
        schema: "https://waypoint.studio/schemas/signalterrain/cyber/priority-score/v0.1",
        status: inputs.status || "sample",
        engineVersion: rulesDoc.engineVersion || "cyber-priority-0.1.0",
        disclaimer: "Transparent sum of labeled factors — not an AI mystery score."
      },
      id: inputs.id || "cyp_computed",
      subjectId: inputs.subjectId || null,
      total: total,
      band: band.id,
      contributions: contributions,
      summaryWhy: whyParts.join(" "),
      unknowns: unknowns,
      computedAt: new Date().toISOString()
    };
  }

  function loadRules(base) {
    base = base || "../../design-system/signalterrain/intelligence/cyber/";
    return Promise.all([
      fetch(base + "priority-factors.json").then(function (r) {
        return r.json();
      }),
      fetch(base + "priority-rules.json").then(function (r) {
        return r.json();
      })
    ]).then(function (parts) {
      return { factors: parts[0], rules: parts[1] };
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.signalTerrainCyberPriority = {
    score: score,
    loadRules: loadRules,
    bandFor: bandFor
  };
})(typeof window !== "undefined" ? window : globalThis);
