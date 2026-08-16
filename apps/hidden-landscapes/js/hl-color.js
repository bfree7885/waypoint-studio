/**
 * Hidden Landscapes — color science (sRGB / linear / XYZ / LMS)
 * Used for luminance and dichromat animal simulations. Not CSS filters.
 */
(function (global) {
  "use strict";

  function srgbToLinear(c) {
    var v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  }

  function linearToSrgb(v) {
    var c = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.max(0, v), 1 / 2.4) - 0.055;
    return Math.max(0, Math.min(255, Math.round(c * 255)));
  }

  /** Relative luminance Rec. 709 on linearized sRGB. */
  function relativeLuminance(r, g, b) {
    var R = srgbToLinear(r);
    var G = srgbToLinear(g);
    var B = srgbToLinear(b);
    return 0.2126 * R + 0.7152 * G + 0.0722 * B;
  }

  /** sRGB 0–255 → XYZ (D65), using sRGB matrix. */
  function srgbToXyz(r, g, b) {
    var R = srgbToLinear(r);
    var G = srgbToLinear(g);
    var B = srgbToLinear(b);
    return {
      X: 0.4124564 * R + 0.3575761 * G + 0.1804375 * B,
      Y: 0.2126729 * R + 0.7151522 * G + 0.072175 * B,
      Z: 0.0193339 * R + 0.119192 * G + 0.9503041 * B
    };
  }

  function xyzToSrgb(X, Y, Z) {
    var R = 3.2404542 * X + -1.5371385 * Y + -0.4985314 * Z;
    var G = -0.969266 * X + 1.8760108 * Y + 0.041556 * Z;
    var B = 0.0556434 * X + -0.2040259 * Y + 1.0572252 * Z;
    return [linearToSrgb(R), linearToSrgb(G), linearToSrgb(B)];
  }

  /** Hunt-Pointer-Estevez LMS (D65-oriented). */
  function xyzToLmsHpe(X, Y, Z) {
    return {
      L: 0.4002 * X + 0.7076 * Y + -0.0808 * Z,
      M: -0.2263 * X + 1.1653 * Y + 0.0457 * Z,
      S: 0.0 * X + 0.0 * Y + 0.9182 * Z
    };
  }

  function lmsToXyzHpe(L, M, S) {
    // Inverse of HPE (approximate)
    return {
      X: 1.8602 * L + -1.1295 * M + 0.2199 * S,
      Y: 0.3612 * L + 0.6388 * M + 0.0 * S,
      Z: 0.0 * L + 0.0 * M + 1.0891 * S
    };
  }

  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var h = 0;
    var s = 0;
    var l = (max + min) / 2;
    var d = max - min;
    if (d > 1e-6) {
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        default: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h: h * 360, s: s, l: l };
  }

  /**
   * Project LMS onto a dichromat plane by collapsing L/M toward a weighted mean.
   * Inspired by Brettel et al. plane projection idea; animal-specific weights.
   */
  function projectDichromat(L, M, S, kind) {
    if (kind === "deer") {
      // Deer: S + M-like (~537nm); collapse L toward M
      var mid = 0.55 * L + 0.45 * M;
      return { L: mid * 0.92, M: mid * 1.02, S: S * 1.05 };
    }
    // Canine: S + L-like; collapse M toward L
    var midC = 0.35 * M + 0.65 * L;
    return { L: midC * 1.02, M: midC * 0.95, S: S * 1.08 };
  }

  function simulateDichromatRgb(r, g, b, kind) {
    var xyz = srgbToXyz(r, g, b);
    var lms = xyzToLmsHpe(xyz.X, xyz.Y, xyz.Z);
    var p = projectDichromat(lms.L, lms.M, lms.S, kind);
    var xyz2 = lmsToXyzHpe(p.L, p.M, p.S);
    return xyzToSrgb(xyz2.X, xyz2.Y, xyz2.Z);
  }

  global.WaypointHLColor = {
    srgbToLinear: srgbToLinear,
    linearToSrgb: linearToSrgb,
    relativeLuminance: relativeLuminance,
    srgbToXyz: srgbToXyz,
    xyzToSrgb: xyzToSrgb,
    xyzToLmsHpe: xyzToLmsHpe,
    lmsToXyzHpe: lmsToXyzHpe,
    rgbToHsl: rgbToHsl,
    simulateDichromatRgb: simulateDichromatRgb,
    projectDichromat: projectDichromat
  };
})(typeof window !== "undefined" ? window : globalThis);
