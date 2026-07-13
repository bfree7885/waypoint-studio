/**
 * Hidden Landscapes — creative transformation processors
 * Pure ImageData remaps. Not spectral capture.
 */
(function (global) {
  "use strict";

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function copyImageData(src) {
    return {
      data: new Uint8ClampedArray(src.data),
      width: src.width,
      height: src.height
    };
  }

  function luma(r, g, b) {
    return 0.299 * r + 0.587 * g + 0.114 * b;
  }

  /** Rough vegetation affinity from visible RGB (not NDVI). */
  function vegScore(r, g, b) {
    var max = Math.max(r, g, b) || 1;
    var min = Math.min(r, g, b);
    var sat = (max - min) / max;
    var greenDom = g >= r && g >= b ? 1 : g / max;
    var vsBlue = clamp((g - b) / 255, -1, 1);
    return clamp(0.45 * greenDom + 0.35 * Math.max(0, vsBlue) + 0.2 * sat * (g / max), 0, 1);
  }

  function skyScore(r, g, b) {
    var L = luma(r, g, b) / 255;
    var blueDom = b >= r && b >= g ? 1 : b / (Math.max(r, g, b) || 1);
    return clamp(0.55 * blueDom + 0.35 * Math.max(0, (b - r) / 255) + 0.1 * L, 0, 1);
  }

  function mixRgb(a, b, t) {
    return [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t
    ];
  }

  function applyIntensity(src, transformed, intensity) {
    var t = clamp(intensity == null ? 1 : intensity, 0, 1);
    if (t >= 0.999) return transformed;
    if (t <= 0.001) return copyImageData(src);
    var out = new Uint8ClampedArray(src.data.length);
    var a = src.data;
    var b = transformed.data;
    for (var i = 0; i < a.length; i += 4) {
      out[i] = a[i] + (b[i] - a[i]) * t;
      out[i + 1] = a[i + 1] + (b[i + 1] - a[i + 1]) * t;
      out[i + 2] = a[i + 2] + (b[i + 2] - a[i + 2]) * t;
      out[i + 3] = a[i + 3];
    }
    return { data: out, width: src.width, height: src.height };
  }

  function mapPixels(src, fn) {
    var d = src.data;
    var out = new Uint8ClampedArray(d.length);
    for (var i = 0; i < d.length; i += 4) {
      var rgb = fn(d[i], d[i + 1], d[i + 2], i);
      out[i] = clamp(rgb[0], 0, 255);
      out[i + 1] = clamp(rgb[1], 0, 255);
      out[i + 2] = clamp(rgb[2], 0, 255);
      out[i + 3] = d[i + 3];
    }
    return { data: out, width: src.width, height: src.height };
  }

  var PROCESSORS = {
    original: function (src) {
      return copyImageData(src);
    },

    "infrared-dream": function (src, params) {
      params = params || {};
      var vegLift = params.vegLift != null ? params.vegLift : 1.35;
      var skyDeepen = params.skyDeepen != null ? params.skyDeepen : 1.2;
      var warmCast = params.warmCast != null ? params.warmCast : 0.22;
      return mapPixels(src, function (r, g, b) {
        var v = vegScore(r, g, b);
        var s = skyScore(r, g, b);
        var L = luma(r, g, b);
        var pale = clamp(L * vegLift + v * 90, 0, 255);
        var dream = [
          pale * (0.95 + warmCast * 0.2) + v * 25,
          pale * 0.98 + v * 10,
          pale * (0.88 - warmCast * 0.15) + (1 - v) * 20
        ];
        var sky = [
          clamp(r * 0.55 / skyDeepen + 20, 0, 255),
          clamp(g * 0.65 / skyDeepen + 35, 0, 255),
          clamp(b * 1.05 * skyDeepen + 40, 0, 255)
        ];
        var ground = [L * 0.75, L * 0.7, L * 0.65];
        var mixV = mixRgb(ground, dream, clamp(v * 1.15, 0, 1));
        return mixRgb(mixV, sky, clamp(s * (1 - v * 0.85), 0, 1));
      });
    },

    "crimson-canopy": function (src, params) {
      params = params || {};
      var magentaPush = params.magentaPush != null ? params.magentaPush : 1.15;
      var skyCyan = params.skyCyan != null ? params.skyCyan : 1.1;
      var contrast = params.contrast != null ? params.contrast : 1.12;
      return mapPixels(src, function (r, g, b) {
        var v = vegScore(r, g, b);
        var s = skyScore(r, g, b);
        var L = luma(r, g, b);
        var canopy = [
          clamp((L * 0.55 + g * 0.7) * magentaPush + v * 40, 0, 255),
          clamp(L * 0.25 + r * 0.15, 0, 255),
          clamp((L * 0.4 + b * 0.35) * magentaPush + v * 55, 0, 255)
        ];
        var sky = [
          clamp(40 + L * 0.2, 0, 255),
          clamp(90 + g * 0.35 * skyCyan, 0, 255),
          clamp(140 + b * 0.55 * skyCyan, 0, 255)
        ];
        var base = mixRgb([r, g, b], canopy, clamp(v * 1.2, 0, 1));
        var mixed = mixRgb(base, sky, clamp(s * (1 - v), 0, 1));
        return [
          (mixed[0] - 128) * contrast + 128,
          (mixed[1] - 128) * contrast + 128,
          (mixed[2] - 128) * contrast + 128
        ];
      });
    },

    "violet-wilds": function (src, params) {
      params = params || {};
      var violetBias = params.violetBias != null ? params.violetBias : 0.7;
      var lumaLift = params.lumaLift != null ? params.lumaLift : 1.08;
      var sat = params.sat != null ? params.sat : 1.2;
      return mapPixels(src, function (r, g, b) {
        var v = vegScore(r, g, b);
        var L = luma(r, g, b) * lumaLift;
        var target = [
          L * (0.75 + violetBias * 0.2) + v * 50,
          L * (0.35 + (1 - violetBias) * 0.2),
          L * (0.85 + violetBias * 0.25) + v * 70
        ];
        var mixed = mixRgb([r, g, b], target, clamp(0.35 + v * 0.65, 0, 1));
        var gray = luma(mixed[0], mixed[1], mixed[2]);
        return [
          gray + (mixed[0] - gray) * sat,
          gray + (mixed[1] - gray) * sat,
          gray + (mixed[2] - gray) * sat
        ];
      });
    },

    "ghost-forest": function (src, params) {
      params = params || {};
      var silverLift = params.silverLift != null ? params.silverLift : 1.45;
      var groundDarken = params.groundDarken != null ? params.groundDarken : 0.72;
      var skyDarken = params.skyDarken != null ? params.skyDarken : 0.8;
      return mapPixels(src, function (r, g, b) {
        var v = vegScore(r, g, b);
        var s = skyScore(r, g, b);
        var L = luma(r, g, b);
        var silver = clamp(L * silverLift + v * 70, 0, 255);
        var leaf = [silver * 0.98, silver, silver * 0.96];
        var ground = [L * groundDarken * 0.9, L * groundDarken * 0.85, L * groundDarken * 0.8];
        var sky = [L * skyDarken * 0.55, L * skyDarken * 0.6, L * skyDarken * 0.7];
        var base = mixRgb(ground, leaf, clamp(v * 1.25, 0, 1));
        return mixRgb(base, sky, clamp(s * (1 - v * 0.9), 0, 1));
      });
    },

    "electric-meadow": function (src, params) {
      params = params || {};
      var energy = params.energy != null ? params.energy : 1.25;
      var split = params.split != null ? params.split : 0.55;
      return mapPixels(src, function (r, g, b) {
        var v = vegScore(r, g, b);
        var L = luma(r, g, b) / 255;
        var warm = [255 * 0.95, 90 + L * 80, 180 + L * 40];
        var cool = [40 + L * 40, 220 * energy * 0.7, 230];
        var gold = [240, 210, 70];
        var palette = L < split ? mixRgb(cool, warm, v) : mixRgb(warm, gold, clamp((L - split) / (1 - split), 0, 1));
        var punched = [
          palette[0] * (0.85 + energy * 0.12),
          palette[1] * (0.85 + energy * 0.1),
          palette[2] * (0.9 + energy * 0.08)
        ];
        return mixRgb([r, g, b], punched, clamp(0.4 + v * 0.55, 0, 1));
      });
    },

    "nocturnal-world": function (src, params) {
      params = params || {};
      var dim = params.dim != null ? params.dim : 0.55;
      var tealCast = params.tealCast != null ? params.tealCast : 0.35;
      return mapPixels(src, function (r, g, b) {
        var L = luma(r, g, b);
        var night = L * dim;
        return [
          night * (0.55 - tealCast * 0.15),
          night * (0.75 + tealCast * 0.2),
          night * (0.85 + tealCast * 0.25) + 12
        ];
      });
    },

    "mono-infrared-study": function (src, params) {
      params = params || {};
      var vegWeight = params.vegWeight != null ? params.vegWeight : 1.4;
      var skyWeight = params.skyWeight != null ? params.skyWeight : 0.55;
      var contrast = params.contrast != null ? params.contrast : 1.18;
      return mapPixels(src, function (r, g, b) {
        var v = vegScore(r, g, b);
        var s = skyScore(r, g, b);
        var L = luma(r, g, b);
        var mono = L * (1 - v * 0.35 - s * 0.25) + g * vegWeight * v * 0.55 + b * skyWeight * s * 0.35;
        mono = (mono - 128) * contrast + 128;
        mono = clamp(mono, 0, 255);
        return [mono, mono, mono];
      });
    }
  };

  function process(modeId, sourceImageData, intensity, parameters) {
    var fn = PROCESSORS[modeId] || PROCESSORS.original;
    var full = fn(sourceImageData, parameters || {});
    return applyIntensity(sourceImageData, full, intensity);
  }

  function listProcessorIds() {
    return Object.keys(PROCESSORS);
  }

  global.HiddenLandscapesTransforms = {
    process: process,
    applyIntensity: applyIntensity,
    copyImageData: copyImageData,
    vegScore: vegScore,
    listProcessorIds: listProcessorIds,
    PROCESSORS: PROCESSORS
  };
})(typeof window !== "undefined" ? window : globalThis);
