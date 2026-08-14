/**
 * Waypoint Auto Edit — restraint constraints (NATURAL FIRST).
 */
(function (global) {
  "use strict";

  var LIMITS = {
    maxExposureEv: 0.55,
    minExposureEv: -0.45,
    maxHighlightPull: 0.42,
    maxShadowLift: 0.38,
    maxContrast: 0.18,
    minContrast: -0.12,
    maxVibrance: 0.16,
    maxSaturation: 0.1,
    minSaturation: -0.18,
    maxWarmth: 0.12,
    maxCool: 0.12,
    maxClarity: 0.12,
    maxDehaze: 0.14,
    maxSharpen: 0.35,
    maxDenoise: 0.28,
    greenSatCap: 0.06,
    skyCyanCap: 0.05,
    sunsetSatCap: 0.04,
    orangeProtect: 0.08
  };

  function clampOp(op, signals) {
    var o = Object.assign({}, op);
    var p = Object.assign({}, o.params || {});
    var hints = (signals && signals.sceneHints) || {};

    if (o.id === "exposure") {
      p.ev = clamp(p.ev || 0, LIMITS.minExposureEv, LIMITS.maxExposureEv);
    }
    if (o.id === "highlights") {
      p.amount = clamp(Math.abs(p.amount || 0), 0, LIMITS.maxHighlightPull);
      p.amount = -p.amount;
    }
    if (o.id === "shadows") {
      p.amount = clamp(p.amount || 0, 0, LIMITS.maxShadowLift);
    }
    if (o.id === "contrast") {
      p.amount = clamp(p.amount || 0, LIMITS.minContrast, LIMITS.maxContrast);
    }
    if (o.id === "vibrance") {
      var vmax = LIMITS.maxVibrance;
      if (hints.likelySunset) vmax = Math.min(vmax, LIMITS.sunsetSatCap);
      if (hints.strongSaturation) vmax = Math.min(vmax, 0.04);
      if (hints.likelyForest) vmax = Math.min(vmax, LIMITS.greenSatCap);
      p.amount = clamp(p.amount || 0, -0.12, vmax);
    }
    if (o.id === "saturation") {
      var smax = LIMITS.maxSaturation;
      if (hints.likelySunset || hints.strongSaturation) smax = Math.min(smax, 0.03);
      if (hints.likelyForest) smax = Math.min(smax, LIMITS.greenSatCap);
      p.amount = clamp(p.amount || 0, LIMITS.minSaturation, smax);
    }
    if (o.id === "whiteBalance") {
      p.warmth = clamp(p.warmth || 0, -LIMITS.maxCool, LIMITS.maxWarmth);
    }
    if (o.id === "clarity" || o.id === "localContrast") {
      p.amount = clamp(p.amount || 0, 0, LIMITS.maxClarity);
      if (hints.highDetailFoliage) p.amount = Math.min(p.amount, 0.06);
    }
    if (o.id === "dehaze") {
      p.amount = clamp(p.amount || 0, 0, LIMITS.maxDehaze);
    }
    if (o.id === "sharpen") {
      p.amount = clamp(p.amount || 0, 0, LIMITS.maxSharpen);
      if (hints.likelyFog || hints.likelyWater) p.amount = Math.min(p.amount, 0.12);
      if (hints.highDetailFoliage) p.amount = Math.min(p.amount, 0.22);
    }
    if (o.id === "denoise") {
      p.amount = clamp(p.amount || 0, 0, LIMITS.maxDenoise);
      // Protect texture: never heavy denoise on foliage/wildlife detail
      if (hints.highDetailFoliage || hints.likelyWildlife) p.amount = Math.min(p.amount, 0.12);
    }
    o.params = p;
    return o;
  }

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  /**
   * Soft per-pixel protection masks applied after global ops.
   */
  function protectPixel(r, g, b, srcR, srcG, srcB, signals) {
    var hints = (signals && signals.sceneHints) || {};
    var outR = r, outG = g, outB = b;
    var maxc = Math.max(srcR, srcG, srcB) || 1;
    var minc = Math.min(srcR, srcG, srcB);
    var sat = (maxc - minc) / maxc;
    var L = 0.2126 * srcR + 0.7152 * srcG + 0.0722 * srcB;

    // Radioactive greens
    if (srcG >= srcR && srcG >= srcB && sat > 0.15) {
      var gGain = (outG - srcG);
      if (gGain > 0) {
        outG = srcG + gGain * 0.35;
        outR = srcR + (outR - srcR) * 0.55;
        outB = srcB + (outB - srcB) * 0.55;
      }
    }

    // Cyan skies
    if (srcB >= srcR && srcB >= srcG && L > 90) {
      var cyanPush = outB - outR;
      var srcCyan = srcB - srcR;
      if (cyanPush > srcCyan + 18) {
        outB = srcB + (outB - srcB) * 0.4;
        outG = srcG + (outG - srcG) * 0.55;
      }
    }

    // Sunset / warm highlight oversat
    if (hints.likelySunset || (srcR > srcG && srcG > srcB && L > 120)) {
      var outMax = Math.max(outR, outG, outB) || 1;
      var outMin = Math.min(outR, outG, outB);
      var outSat = (outMax - outMin) / outMax;
      if (outSat > sat + 0.08) {
        outR = srcR + (outR - srcR) * 0.45;
        outG = srcG + (outG - srcG) * 0.45;
        outB = srcB + (outB - srcB) * 0.45;
      }
    }

    // Orange fur / skin-ish midtones
    if (srcR > srcG && srcG > srcB && L > 40 && L < 200 && (srcR - srcB) > 30) {
      outR = srcR + (outR - srcR) * 0.5;
      outG = srcG + (outG - srcG) * 0.55;
      outB = srcB + (outB - srcB) * 0.6;
    }

    return [
      clamp(outR, 0, 255),
      clamp(outG, 0, 255),
      clamp(outB, 0, 255)
    ];
  }

  function honestyNotes(signals, beforeClip, afterClip) {
    var notes = [];
    if (signals && signals.clipHigh > 0.02) {
      notes.push("Some highlight detail was already clipped in the JPEG — Auto Edit cannot invent lost sky detail.");
    }
    if (signals && signals.clipLow > 0.04) {
      notes.push("Deep shadows may lack recoverable texture in this file.");
    }
    if (afterClip && beforeClip && afterClip.clipHigh > beforeClip.clipHigh + 0.005) {
      notes.push("Highlight clipping increased slightly; strategy should be reined in.");
    }
    if (signals && signals.alreadyGood) {
      notes.push("The original already reads strong — Waypoint Choice kept changes minimal.");
    }
    if (!(signals && signals.exif && signals.exif.iso != null)) {
      notes.push("ISO was not available; noise handling stayed conservative.");
    }
    notes.push("Processed on this device. No generative fill, sky replace, or invented detail.");
    return notes;
  }

  global.WaypointAutoEditRestraint = {
    LIMITS: LIMITS,
    clampOp: clampOp,
    protectPixel: protectPixel,
    honestyNotes: honestyNotes
  };
})(typeof window !== "undefined" ? window : globalThis);
