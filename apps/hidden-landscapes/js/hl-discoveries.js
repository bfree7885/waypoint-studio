/**
 * Hidden Landscapes — discoveries derived from actual analysis (no fabricated prose)
 */
(function (global) {
  "use strict";

  function pct(frac) {
    return Math.round(frac * 100);
  }

  function buildDiscoveries(analysis, animalResult, pillarId, viewId) {
    var out = [];
    if (!analysis) return out;

    var tonal = analysis.tonal || {};
    var color = analysis.color || {};
    var regions = analysis.regions || {};

    if (tonal.brightFrac != null && tonal.brightFrac >= 0.18) {
      out.push({
        id: "bright-energy",
        text: "About " + pct(tonal.brightFrac) + "% of pixels sit in the bright tonal range — much of the scene’s light energy is concentrated there.",
        epistemic: "computed",
        regionKey: "brightest",
        region: regions.brightest || null
      });
    }
    if (tonal.clippedHighlightFrac != null && tonal.clippedHighlightFrac >= 0.01) {
      out.push({
        id: "clipped",
        text: "Near-clipped highlights cover about " + pct(tonal.clippedHighlightFrac) + "% of this JPEG/PNG — recoverability beyond the file is not claimed.",
        epistemic: "computed",
        regionKey: "brightest",
        region: regions.brightest || null
      });
    }
    if (tonal.deepShadowFrac != null && tonal.deepShadowFrac >= 0.12) {
      out.push({
        id: "deep-shadow",
        text: "Deep shadows occupy about " + pct(tonal.deepShadowFrac) + "% of the frame; detail there is limited to what this file already holds.",
        epistemic: "computed",
        region: null
      });
    }

    if (color.ranked && color.ranked[0] && color.ranked[0].family !== "neutral") {
      var top = color.ranked[0];
      var second = color.ranked[1];
      var text = "The strongest chromatic family is " + top.family + " (~" + pct(top.frac) + "% of pixels)";
      if (second && second.family !== "neutral" && second.frac > 0.08) {
        text += ", with " + second.family + " next (~" + pct(second.frac) + "%)";
      }
      text += ".";
      out.push({
        id: "color-family",
        text: text,
        epistemic: "computed",
        region: null
      });
    }
    if (color.meanSaturation != null && color.meanSaturation < 0.22 && color.highSatFrac < 0.08) {
      out.push({
        id: "low-sat",
        text: "Most of the frame is relatively low-saturation; chromatic accents are sparse.",
        epistemic: "computed",
        region: null
      });
    } else if (color.highSatFrac >= 0.12) {
      out.push({
        id: "high-sat",
        text: "About " + pct(color.highSatFrac) + "% of pixels are strongly saturated — chromatic regions stand out against quieter surroundings.",
        epistemic: "computed",
        region: null
      });
    }
    if (color.warmFrac != null && color.coolFrac != null) {
      if (color.warmFrac > color.coolFrac * 1.35) {
        out.push({
          id: "warm-bias",
          text: "Warm hues outweigh cool ones in classified pixels (warm ~" + pct(color.warmFrac) + "% vs cool ~" + pct(color.coolFrac) + "%).",
          epistemic: "computed",
          region: null
        });
      } else if (color.coolFrac > color.warmFrac * 1.35) {
        out.push({
          id: "cool-bias",
          text: "Cool hues outweigh warm ones in classified pixels (cool ~" + pct(color.coolFrac) + "% vs warm ~" + pct(color.warmFrac) + "%).",
          epistemic: "computed",
          region: null
        });
      }
    }

    if (regions.edgeDense) {
      out.push({
        id: "edge-dense",
        text: "Edge energy is densest in a localized region — often foliage, shoreline, or textured ground rather than open sky.",
        epistemic: "computed",
        regionKey: "edgeDense",
        region: regions.edgeDense
      });
    }

    if (viewId === "estimated-depth") {
      out.push({
        id: "depth-inferred",
        text: "Estimated depth is INFERRED from haze and vertical position cues — not measured distance.",
        epistemic: "inferred",
        region: null
      });
    }

    if (animalResult && animalResult.status === "ok" && animalResult.metrics) {
      var loss = animalResult.metrics.meanRgSeparationLoss || 0;
      if (loss >= 0.08) {
        out.push({
          id: "rg-loss",
          text: "In this " + (pillarId === "animal" ? "simulation" : "view") + ", red–green separations that are clear to human vision are substantially reduced (mean loss ~" + loss.toFixed(2) + ").",
          epistemic: "simulated",
          region: animalResult.region || null
        });
      }
    }
    if (animalResult && animalResult.status === "unavailable") {
      out.push({
        id: "uv-unavailable",
        text: animalResult.message,
        epistemic: "unavailable",
        region: null
      });
    }

    // Cap to a few meaningful items
    return out.slice(0, 5);
  }

  global.WaypointHLDiscoveries = {
    buildDiscoveries: buildDiscoveries
  };
})(typeof window !== "undefined" ? window : globalThis);
