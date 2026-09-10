/**
 * Shed Radar — display-only intensity mapping.
 *
 * Separates analytical unit scores (P1 landscape + P2 ±0.20) from the
 * continuous wash the hunter sees. Ranking and biology stay untouched.
 *
 * Does NOT claim search probability. Does NOT change Open-Meteo, packs,
 * or scoring modules.
 */
(function (global) {
  "use strict";

  /** Invisible floor on *display* intensity (after transfer). */
  var DISPLAY_FLOOR = 0.04;

  /**
   * Midrange contrast gain for display only.
   * Expands typical ±0.20 analytical gaps without inventing new hot spots
   * or uniformly lifting the whole field (gamma-lift caused plateau wash).
   */
  var CONTRAST_GAIN = 1.65;

  /**
   * analyticalPriority ∈ [0,1] → displayIntensity ∈ [0,1].
   * Monotonic, deterministic, ranking-preserving.
   *
   * Why ±0.20 was nearly invisible: paint used near-linear priority with very
   * low per-pixel alpha × ~0.42 layer opacity, so a fifth-scale analytical
   * step barely moved composited pixels. This gain expands midrange gaps.
   */
  function displayIntensity(analyticalPriority) {
    var p = Number(analyticalPriority);
    if (!isFinite(p) || p <= 0) return 0;
    if (p >= 1) return 1;
    // Contrast about 0.5, then soft clamp via smoothstep on a padded domain.
    var x = 0.5 + CONTRAST_GAIN * (p - 0.5);
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    // Mild smoothstep for continuity (still monotonic on [0,1]).
    return x * x * (3 - 2 * x);
  }

  /**
   * Forest-compatible continuous wash from *display* intensity.
   * Steeper alpha vs legacy so condition deltas read through topo.
   */
  function colorForDisplayIntensity(display, alphaBoost) {
    var d = Number(display);
    if (!isFinite(d) || d < DISPLAY_FLOOR) return null;
    if (d > 1) d = 1;
    var aMul = alphaBoost != null && isFinite(alphaBoost) ? alphaBoost : 1;
    // Slate → amber → green (forest family; higher alpha than production baseline).
    if (d < 0.34) {
      return "rgba(78, 110, 118, " + ((0.10 + d * 0.48) * aMul) + ")";
    }
    if (d < 0.67) {
      return "rgba(168, 148, 72, " + ((0.20 + (d - 0.34) * 0.62) * aMul) + ")";
    }
    return "rgba(56, 128, 68, " + ((0.34 + (d - 0.67) * 0.78) * aMul) + ")";
  }

  /** Paint helper: analytical priority → rgba string (or null). */
  function colorForAnalyticalPriority(analyticalPriority, alphaBoost) {
    return colorForDisplayIntensity(displayIntensity(analyticalPriority), alphaBoost);
  }

  /**
   * Extra multiply applied only in radar continuous paint (not Search Areas).
   * Compensates for default heat layer opacity (~0.42).
   */
  var RADAR_PAINT_ALPHA_BOOST = 1.42;

  function effectiveRadarAlpha(display, layerOpacity) {
    var rgba = colorForDisplayIntensity(display, RADAR_PAINT_ALPHA_BOOST);
    if (!rgba) return 0;
    var m = rgba.match(/,\s*([0-9.]+)\)$/);
    var a = m ? parseFloat(m[1]) : 0;
    var lop = layerOpacity != null && isFinite(layerOpacity) ? layerOpacity : 0.42;
    return a * lop;
  }

  var api = {
    DISPLAY_FLOOR: DISPLAY_FLOOR,
    CONTRAST_GAIN: CONTRAST_GAIN,
    RADAR_PAINT_ALPHA_BOOST: RADAR_PAINT_ALPHA_BOOST,
    displayIntensity: displayIntensity,
    colorForDisplayIntensity: colorForDisplayIntensity,
    colorForAnalyticalPriority: colorForAnalyticalPriority,
    effectiveRadarAlpha: effectiveRadarAlpha
  };

  global.WaypointShedsRadarDisplay = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
