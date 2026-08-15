/**
 * Waypoint Moving Scenes — on-device motion opportunity analysis
 * Soft regional masks + confidence. Never invents weather or stars.
 * Prefer NO MOTION when confidence is weak.
 */
(function (global) {
  "use strict";

  var SAMPLE_W = 160;
  var SAMPLE_H = 100;
  /** Minimum class confidence for automatic Waypoint Choice animation */
  var AUTO_CONFIDENCE = 0.42;

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function bandForY(y, h) {
    var t = y / h;
    if (t < 0.22) return "top";
    if (t < 0.42) return "upperMid";
    if (t < 0.62) return "mid";
    if (t < 0.82) return "lowerMid";
    return "bottom";
  }

  function luma(r, g, b) {
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function sat(r, g, b) {
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    return max === 0 ? 0 : (max - min) / max;
  }

  function classifyPixel(r, g, b, y, h) {
    var L = luma(r, g, b);
    var S = sat(r, g, b);
    var band = bandForY(y, h);
    var skyish = L > 95 && b > r + 8 && b >= g - 18 && S < 0.55 && (band === "top" || band === "upperMid");
    var cloudish = L > 170 && S < 0.22 && (band === "top" || band === "upperMid" || band === "mid");
    var waterish =
      b > r + 4 &&
      b >= g - 28 &&
      S < 0.75 &&
      L > 35 &&
      L < 215 &&
      (band === "upperMid" || band === "mid" || band === "lowerMid" || band === "bottom");
    var fogish = L > 130 && L < 210 && S < 0.12;
    var hazeish = L > 110 && L < 190 && S < 0.18 && Math.abs(r - g) < 18 && Math.abs(g - b) < 22;
    var foliage =
      g > r + 10 && g > b && S > 0.18 && L > 30 && L < 170;
    var mountain =
      S < 0.28 && L > 40 && L < 160 && Math.abs(r - g) < 28 && Math.abs(r - b) < 34 &&
      (band === "upperMid" || band === "mid");
    var rock =
      S < 0.22 && L > 35 && L < 140 && Math.abs(r - g) < 20 &&
      (band === "lowerMid" || band === "bottom" || band === "mid");
    var snowish = L > 200 && S < 0.16;
    var rainHint = false; // never invent; only if caller marks visible weather later
    var wildlifeFur =
      r > g + 15 && r > b + 10 && S > 0.2 && L > 45 && L < 190;

    return {
      sky: skyish,
      clouds: cloudish || (skyish && L > 160 && S < 0.25),
      water: waterish,
      fog: fogish && !waterish,
      haze: hazeish && !waterish && !skyish,
      foliage: foliage,
      mountain: mountain,
      rock: rock,
      snow: snowish,
      rain: rainHint,
      wildlife: wildlifeFur,
      building: S < 0.15 && L > 50 && L < 130 && Math.abs(r - g) < 12
    };
  }

  function emptyMasks(w, h) {
    return {
      width: w,
      height: h,
      clouds: new Float32Array(w * h),
      water: new Float32Array(w * h),
      fog: new Float32Array(w * h),
      haze: new Float32Array(w * h),
      stable: new Float32Array(w * h),
      wildlife: new Float32Array(w * h),
      foliage: new Float32Array(w * h)
    };
  }

  function analyzeImageData(imageData) {
    var w = imageData.width;
    var h = imageData.height;
    var data = imageData.data;
    var masks = emptyMasks(w, h);
    var totals = {
      clouds: 0,
      water: 0,
      fog: 0,
      haze: 0,
      foliage: 0,
      mountain: 0,
      rock: 0,
      wildlife: 0,
      snow: 0,
      sky: 0
    };
    var i;
    var x;
    var y;
    var n = 0;

    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        i = (y * w + x) * 4;
        if (data[i + 3] < 16) continue;
        var flags = classifyPixel(data[i], data[i + 1], data[i + 2], y, h);
        var idx = y * w + x;
        n++;
        if (flags.clouds || flags.sky) {
          masks.clouds[idx] = flags.clouds ? 1 : 0.45;
          totals.clouds += masks.clouds[idx];
        }
        if (flags.sky) totals.sky += 1;
        if (flags.water) {
          masks.water[idx] = 1;
          totals.water += 1;
        }
        if (flags.fog) {
          masks.fog[idx] = 1;
          totals.fog += 1;
        }
        if (flags.haze) {
          masks.haze[idx] = 0.85;
          totals.haze += 1;
        }
        if (flags.foliage) {
          masks.foliage[idx] = 1;
          totals.foliage += 1;
        }
        if (flags.mountain || flags.rock || flags.building || flags.foliage) {
          masks.stable[idx] = Math.max(
            masks.stable[idx],
            flags.mountain ? 1 : flags.rock ? 0.95 : flags.building ? 0.9 : 0.55
          );
        }
        if (flags.wildlife) {
          masks.wildlife[idx] = 1;
          totals.wildlife += 1;
        }
        if (flags.snow) totals.snow += 1;
        if (flags.mountain) totals.mountain += 1;
        if (flags.rock) totals.rock += 1;
      }
    }

    // Soften masks + protect wildlife / stable from motion
    soften(masks.clouds, w, h);
    soften(masks.water, w, h);
    soften(masks.fog, w, h);
    soften(masks.haze, w, h);
    soften(masks.wildlife, w, h);
    expand(masks.wildlife, w, h, 2);
    expand(masks.stable, w, h, 1);

    for (i = 0; i < w * h; i++) {
      var lock = Math.max(masks.wildlife[i], masks.stable[i] * 0.85);
      masks.clouds[i] *= 1 - lock;
      masks.water[i] *= 1 - Math.max(masks.wildlife[i], masks.stable[i] * 0.35);
      masks.fog[i] *= 1 - masks.wildlife[i];
      masks.haze[i] *= 1 - masks.wildlife[i];
      // Tree trunks / mountains should not ride sky warp
      if (masks.stable[i] > 0.6) masks.clouds[i] *= 0.05;
    }

    var denom = Math.max(n, 1);
    var coverage = {
      clouds: totals.clouds / denom,
      water: totals.water / denom,
      fog: totals.fog / denom,
      haze: totals.haze / denom,
      foliage: totals.foliage / denom,
      mountain: totals.mountain / denom,
      rock: totals.rock / denom,
      wildlife: totals.wildlife / denom,
      snow: totals.snow / denom,
      sky: totals.sky / denom
    };

    var confidence = {
      clouds: scoreClouds(coverage, masks),
      water: scoreWater(coverage, masks),
      fog: scoreFog(coverage),
      haze: scoreHaze(coverage),
      foliage: clamp(coverage.foliage * 1.2, 0, 1) * 0.35, // intentionally weak → defer
      grass: 0.1,
      rain: 0, // never invent
      snow: coverage.snow > 0.35 ? 0.25 : 0, // visible snow ≠ invent falling snow
      light: 0.05,
      stars: 0,
      parallax: coverage.mountain > 0.12 && coverage.sky > 0.15 ? 0.2 : 0.05
    };

    var waterType = inferWaterType(coverage, masks);

    return {
      sampleWidth: w,
      sampleHeight: h,
      coverage: coverage,
      confidence: confidence,
      waterType: waterType,
      masks: masks,
      autoThreshold: AUTO_CONFIDENCE,
      wildlifeProtected: coverage.wildlife >= 0.02
    };
  }

  function scoreClouds(cov) {
    if (cov.sky < 0.08 && cov.clouds < 0.05) return 0.05;
    var base = clamp(cov.clouds * 2.2 + cov.sky * 0.55, 0, 1);
    // Need sky room; avoid painting motion on full-frame white walls
    if (cov.clouds + cov.sky < 0.12) return clamp(base * 0.3, 0, 1);
    return base;
  }

  function scoreWater(cov) {
    if (cov.water < 0.05) return 0.04;
    // Prefer broader water bodies; tiny blue blobs stay weak
    var base = clamp(cov.water * 2.6, 0, 1);
    if (cov.water < 0.08) base *= 0.45;
    if (cov.water >= 0.15) base = Math.max(base, 0.5);
    return base;
  }

  function scoreFog(cov) {
    if (cov.fog < 0.18) return 0.08;
    return clamp(cov.fog * 1.6, 0, 0.85);
  }

  function scoreHaze(cov) {
    if (cov.haze < 0.2) return 0.06;
    return clamp(cov.haze * 1.3, 0, 0.7);
  }

  function inferWaterType(cov) {
    if (cov.water < 0.06) return "none";
    if (cov.water > 0.28) return "lake";
    if (cov.water > 0.12) return "river";
    return "pool";
  }

  function soften(buf, w, h) {
    var out = new Float32Array(buf.length);
    var x;
    var y;
    var i;
    for (y = 1; y < h - 1; y++) {
      for (x = 1; x < w - 1; x++) {
        i = y * w + x;
        out[i] =
          (buf[i] * 4 +
            buf[i - 1] +
            buf[i + 1] +
            buf[i - w] +
            buf[i + w]) /
          8;
      }
    }
    for (i = 0; i < buf.length; i++) buf[i] = out[i] || buf[i];
  }

  function expand(buf, w, h, radius) {
    var out = new Float32Array(buf.length);
    var x;
    var y;
    var dx;
    var dy;
    var i;
    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        var m = 0;
        for (dy = -radius; dy <= radius; dy++) {
          for (dx = -radius; dx <= radius; dx++) {
            var xx = x + dx;
            var yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
            m = Math.max(m, buf[yy * w + xx]);
          }
        }
        out[y * w + x] = m;
      }
    }
    for (i = 0; i < buf.length; i++) buf[i] = out[i];
  }

  function downsampleToImageData(img, maxW, maxH) {
    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    if (!iw || !ih) return null;
    var scale = Math.min(1, maxW / iw, maxH / ih);
    var w = Math.max(8, Math.round(iw * scale));
    var h = Math.max(8, Math.round(ih * scale));
    var canvas = typeof OffscreenCanvas !== "undefined"
      ? new OffscreenCanvas(w, h)
      : document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h);
  }

  function analyzeSource(imgOrCanvas) {
    var imageData;
    if (imgOrCanvas && imgOrCanvas.data && imgOrCanvas.width) {
      imageData = imgOrCanvas;
    } else {
      imageData = downsampleToImageData(imgOrCanvas, SAMPLE_W, SAMPLE_H);
    }
    if (!imageData) {
      return {
        coverage: {},
        confidence: {},
        waterType: "none",
        masks: emptyMasks(SAMPLE_W, SAMPLE_H),
        autoThreshold: AUTO_CONFIDENCE,
        wildlifeProtected: false,
        error: "Could not read image pixels."
      };
    }
    return analyzeImageData(imageData);
  }

  /**
   * Upsample a float mask to target size (nearest for speed).
   */
  function resizeMask(src, sw, sh, tw, th) {
    var out = new Float32Array(tw * th);
    var x;
    var y;
    for (y = 0; y < th; y++) {
      var sy = Math.min(sh - 1, Math.floor((y / th) * sh));
      for (x = 0; x < tw; x++) {
        var sx = Math.min(sw - 1, Math.floor((x / tw) * sw));
        out[y * tw + x] = src[sy * sw + sx];
      }
    }
    return out;
  }

  global.WaypointMovingScenesAnalyze = {
    AUTO_CONFIDENCE: AUTO_CONFIDENCE,
    SAMPLE_W: SAMPLE_W,
    SAMPLE_H: SAMPLE_H,
    analyzeSource: analyzeSource,
    analyzeImageData: analyzeImageData,
    downsampleToImageData: downsampleToImageData,
    resizeMask: resizeMask
  };
})(typeof window !== "undefined" ? window : globalThis);
