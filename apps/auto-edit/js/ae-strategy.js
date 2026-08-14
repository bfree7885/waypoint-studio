/**
 * Waypoint Auto Edit — scene-aware strategy (Waypoint Choice + intents).
 * Conditional ops only; DO LESS on already-good frames.
 */
(function (global) {
  "use strict";

  var INTENTS = [
    { id: "waypoint-choice", label: "Waypoint Choice", blurb: "System picks a restrained finish for this photograph." },
    { id: "natural", label: "Natural", blurb: "Gentle balance — barely there." },
    { id: "field-guide", label: "Field Guide", blurb: "Clean, crisp, neutral, detail-oriented." },
    { id: "atmospheric", label: "Atmospheric", blurb: "Preserve mood and light relationship." },
    { id: "wildlife", label: "Wildlife", blurb: "Natural color and careful detail." },
    { id: "landscape", label: "Landscape", blurb: "Tonal depth with controlled highlights." },
    { id: "monochrome", label: "Monochrome", blurb: "Intentional black-and-white interpretation." }
  ];

  function op(id, params, reason) {
    return { id: id, params: params || {}, reason: reason || "" };
  }

  function needsWork(signals) {
    return signals.meanLuminance < 78 ||
      signals.meanLuminance > 188 ||
      signals.brightFraction > 0.045 ||
      signals.darkFraction > 0.28 ||
      signals.clipHigh > 0.015 ||
      signals.saturation > 0.5 ||
      Math.abs(signals.cast) > 0.14 ||
      signals.contrast < 18 ||
      signals.contrast > 82 ||
      !!(signals.exif && signals.exif.iso >= 2000);
  }

  function buildStrategy(signals, intentId) {
    intentId = intentId || "waypoint-choice";
    var intent = INTENTS.find(function (i) { return i.id === intentId; }) || INTENTS[0];
    var ops = [];
    var hints = signals.sceneHints || {};
    var balanced = !needsWork(signals) || !!signals.alreadyGood;
    var doLess = !!signals.alreadyGood || (balanced && intentId === "waypoint-choice");
    var scale = doLess ? 0.28 : 1;

    if (intentId === "monochrome") {
      ops.push(op("monochrome", { contrast: 0.08 * (doLess ? 0.5 : 1), lift: 0.02 }, "Black-and-white interpretation"));
      if (signals.meanLuminance < 90) ops.push(op("exposure", { ev: 0.12 * scale }, "Slight lift for monochrome midtones"));
      return finalize(signals, intent, ops, doLess);
    }

    // Exposure — only clear underexposure / overexposure
    if (signals.meanLuminance < 72) {
      ops.push(op("exposure", { ev: clamp((88 - signals.meanLuminance) / 130, 0.1, 0.42) * scale }, "Lift underexposed midtones"));
    } else if (signals.meanLuminance > 195 && !hints.likelySnow) {
      ops.push(op("exposure", { ev: -clamp((signals.meanLuminance - 188) / 150, 0.08, 0.32) * scale }, "Pull hot midtones"));
    }

    if (signals.brightFraction > 0.05 || signals.clipHigh > 0.012) {
      ops.push(op("highlights", { amount: clamp(0.14 + signals.brightFraction * 2, 0.1, 0.36) * scale }, "Calm bright areas"));
    }

    if (signals.darkFraction > 0.3 && !hints.moodyDark) {
      ops.push(op("shadows", { amount: clamp(0.12 + (signals.darkFraction - 0.3), 0.08, 0.3) * scale }, "Open heavy shadows carefully"));
    } else if (hints.likelySunset && signals.darkFraction > 0.22 && !doLess) {
      ops.push(op("shadows", { amount: 0.1 * scale }, "Foreground breath under warm sky"));
    }

    // White/black points — rare, only flat files that need depth
    if (!doLess && signals.clipLow < 0.005 && signals.darkFraction > 0.22 && signals.contrast < 22) {
      ops.push(op("blackPoint", { amount: 0.03 }, "Gentle black point for depth"));
    }

    // WB only for clear casts (skip intentional sunsets unless Field Guide)
    if (signals.cast > 0.14 && !(hints.likelySunset && intentId !== "field-guide")) {
      ops.push(op("whiteBalance", { warmth: -clamp(signals.cast * 0.45, 0.03, 0.09) * scale }, "Cool a warm cast"));
    } else if (signals.cast < -0.14) {
      ops.push(op("whiteBalance", { warmth: clamp(Math.abs(signals.cast) * 0.45, 0.03, 0.09) * scale }, "Warm a cool cast"));
    }

    // Contrast / haze — only when truly flat
    if (signals.contrast < 18 || hints.likelyFog || hints.lowContrastHaze) {
      var cAmt = clamp(0.07 + (18 - Math.min(signals.contrast, 18)) / 220, 0.04, 0.12) * scale;
      if (intentId === "atmospheric") cAmt *= 0.65;
      ops.push(op("contrast", { amount: cAmt }, "Restore gentle global contrast"));
      if ((hints.likelyFog || hints.lowContrastHaze) && !doLess) {
        ops.push(op("dehaze", { amount: (intentId === "atmospheric" ? 0.05 : 0.08) * scale }, "Light haze control"));
      }
    } else if (signals.contrast > 82) {
      ops.push(op("contrast", { amount: -0.07 * scale }, "Ease crushing contrast"));
    } else if (intentId === "landscape" && !doLess && signals.contrast < 40) {
      ops.push(op("curve", { shadows: 0.03, highlights: -0.025, mid: 0.015 }, "Landscape S-curve (restrained)"));
    }

    // Color
    if (hints.strongSaturation || signals.saturation > 0.5) {
      ops.push(op("saturation", { amount: -0.1 * scale }, "Calm oversaturation"));
    } else if (!doLess && signals.saturation < 0.11 && !hints.likelySnow && !hints.likelyFog && intentId !== "natural") {
      var v = hints.likelyForest || hints.likelySunset ? 0.03 : 0.06;
      ops.push(op("vibrance", { amount: v * scale }, "Modest vibrance on muted color"));
    }

    // Local contrast only when soft and intentional
    if (!doLess && signals.edgeMean < 22 && intentId !== "atmospheric" && !hints.likelyFog && intentId === "field-guide") {
      ops.push(op("localContrast", { amount: 0.05 }, "Subtle midtone snap"));
    }

    // Denoise — ISO-aware
    var iso = signals.exif && signals.exif.iso;
    if ((iso != null && iso >= 1600) || (signals.noiseEstimate > 12 && signals.meanLuminance < 90)) {
      if (!hints.highDetailFoliage) {
        var dn = iso != null && iso >= 3200 ? 0.18 : 0.1;
        if (hints.likelyWildlife) dn = Math.min(dn, 0.09);
        ops.push(op("denoise", { amount: dn * scale }, "Conservative noise reduction"));
      }
    }

    // Sharpen — only when soft and not fog; skip on doLess unless Field Guide
    if (!hints.likelyFog && signals.edgeMean < 28 && (!doLess || intentId === "field-guide")) {
      var sh = intentId === "field-guide" ? 0.16 : 0.1;
      if (intentId === "wildlife") sh = 0.12;
      if (iso != null && iso >= 2500) sh *= 0.55;
      ops.push(op("sharpen", { amount: sh * scale }, "Gentle output sharpening"));
    }

    var cropSuggestion = null;
    if (signals.coachObservations && signals.coachObservations.suggestLevelHorizon) {
      cropSuggestion = {
        type: "level-horizon",
        rotateDeg: signals.coachObservations.horizonTiltDeg || 0,
        note: "Optional: level the horizon. Not applied until you approve."
      };
    }

    if (intentId === "natural") {
      ops = ops.filter(function (o) {
        return ["exposure", "highlights", "shadows", "whiteBalance", "saturation"].indexOf(o.id) >= 0;
      }).map(function (o) { return scaleOp(o, 0.65); });
    }
    if (intentId === "wildlife") {
      ops = ops.map(function (o) {
        if (o.id === "vibrance" || o.id === "saturation") return scaleOp(o, 0.55);
        if (o.id === "localContrast") return scaleOp(o, 0.4);
        return o;
      });
    }
    if (intentId === "landscape" && !ops.some(function (o) { return o.id === "highlights"; }) && signals.skyMeanLuminance > 175 && !doLess) {
      ops.push(op("highlights", { amount: 0.1 * scale }, "Protect bright sky"));
    }

    if (doLess && ops.length > 3) ops = ops.slice(0, 3);
    if (!ops.length) {
      ops.push(op("noop", {}, "Already balanced — no global finish required"));
    }

    return finalize(signals, intent, ops, doLess, cropSuggestion);
  }

  function finalize(signals, intent, ops, doLess, cropSuggestion) {
    var Restraint = global.WaypointAutoEditRestraint;
    var clamped = ops.map(function (o) {
      return Restraint && o.id !== "noop" && o.id !== "monochrome" ? Restraint.clampOp(o, signals) : o;
    });
    return {
      intent: intent.id,
      intentLabel: intent.label,
      doLess: doLess,
      ops: clamped,
      cropSuggestion: cropSuggestion || null,
      summary: doLess
        ? "Waypoint Choice: the file already looks strong — only tiny finishing."
        : "Waypoint Choice: restrained outdoor finish from this photograph’s signals."
    };
  }

  function scaleOp(o, factor) {
    var p = Object.assign({}, o.params);
    Object.keys(p).forEach(function (k) {
      if (typeof p[k] === "number") p[k] = p[k] * factor;
    });
    return { id: o.id, params: p, reason: o.reason };
  }

  function applyRefine(baseStrategy, refineId) {
    var ops = (baseStrategy.ops || []).map(function (o) {
      return { id: o.id, params: Object.assign({}, o.params), reason: o.reason };
    });
    function bump(id, key, delta) {
      var found = ops.find(function (o) { return o.id === id; });
      if (found) {
        found.params[key] = (found.params[key] || 0) + delta;
      } else {
        var p = {};
        p[key] = delta;
        ops.push({ id: id, params: p, reason: "Refine: " + refineId });
      }
    }
    switch (refineId) {
      case "more-natural":
        ops = ops.map(function (o) { return scaleOp(o, 0.55); });
        break;
      case "brighter": bump("exposure", "ev", 0.12); break;
      case "darker": bump("exposure", "ev", -0.12); break;
      case "warmer": bump("whiteBalance", "warmth", 0.06); break;
      case "cooler": bump("whiteBalance", "warmth", -0.06); break;
      case "less-saturated": bump("saturation", "amount", -0.08); break;
      case "more-contrast": bump("contrast", "amount", 0.06); break;
      case "less-contrast": bump("contrast", "amount", -0.06); break;
      case "reset":
        return null;
      default:
        break;
    }
    var Restraint = global.WaypointAutoEditRestraint;
    return {
      intent: baseStrategy.intent,
      intentLabel: baseStrategy.intentLabel,
      doLess: false,
      ops: ops.map(function (o) {
        return Restraint && o.id !== "noop" ? Restraint.clampOp(o, {}) : o;
      }),
      cropSuggestion: baseStrategy.cropSuggestion,
      summary: "Refined: " + refineId,
      refineId: refineId
    };
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  global.WaypointAutoEditStrategy = {
    INTENTS: INTENTS,
    buildStrategy: buildStrategy,
    applyRefine: applyRefine
  };
})(typeof window !== "undefined" ? window : globalThis);
