/**
 * Hidden Landscapes — Animal Vision dichromat simulations (LMS-based)
 * Never invents UV. Bee/bird modes return UNAVAILABLE educational payloads.
 */
(function (global) {
  "use strict";

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function softAcuity(imageData, amount) {
    if (amount <= 0.01) return imageData;
    var w = imageData.width;
    var h = imageData.height;
    var src = imageData.data;
    var out = new Uint8ClampedArray(src.length);
    var r = amount > 0.35 ? 1 : 1;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var sumR = 0, sumG = 0, sumB = 0, c = 0;
        for (var dy = -r; dy <= r; dy++) {
          var yy = clamp(y + dy, 0, h - 1);
          for (var dx = -r; dx <= r; dx++) {
            var xx = clamp(x + dx, 0, w - 1);
            var i = (yy * w + xx) * 4;
            sumR += src[i]; sumG += src[i + 1]; sumB += src[i + 2];
            c++;
          }
        }
        var o = (y * w + x) * 4;
        var t = amount * 0.55;
        out[o] = src[o] * (1 - t) + (sumR / c) * t;
        out[o + 1] = src[o + 1] * (1 - t) + (sumG / c) * t;
        out[o + 2] = src[o + 2] * (1 - t) + (sumB / c) * t;
        out[o + 3] = src[o + 3];
      }
    }
    return new ImageData(out, w, h);
  }

  function simulateSpecies(imageData, speciesId) {
    var Color = global.WaypointHLColor;
    if (!Color) throw new Error("WaypointHLColor missing");

    if (speciesId === "bee-uv" || speciesId === "honeybee" || speciesId === "bird-uv" || speciesId === "bird") {
      return {
        status: "unavailable",
        epistemic: "unavailable",
        imageData: null,
        message: speciesId.indexOf("bird") >= 0
          ? "Bird ultraviolet sensitivity cannot be reconstructed from this RGB photograph. This mode is deferred rather than invented."
          : "Ultraviolet reflectance was not captured in this RGB photograph. Waypoint will not invent nectar guides or UV patterns into your image.",
        label: speciesId.indexOf("bird") >= 0
          ? "BIRD UV — UNAVAILABLE FROM RGB"
          : "BEE UV — UNAVAILABLE FROM RGB"
      };
    }

    var kind = speciesId === "canine" || speciesId === "dog" ? "canine" : "deer";
    var src = imageData.data;
    var out = new Uint8ClampedArray(src.length);
    var rgLoss = 0;
    var blueKeep = 0;
    var samples = 0;
    var hotCells = [];

    for (var i = 0; i < src.length; i += 4) {
      var r = src[i], g = src[i + 1], b = src[i + 2];
      var sim = Color.simulateDichromatRgb(r, g, b, kind);
      out[i] = sim[0];
      out[i + 1] = sim[1];
      out[i + 2] = sim[2];
      out[i + 3] = src[i + 3];

      var humanSep = Math.abs(r - g) / 255;
      var simSep = Math.abs(sim[0] - sim[1]) / 255;
      if (humanSep > 0.18) {
        rgLoss += Math.max(0, humanSep - simSep);
        samples++;
        if (humanSep - simSep > 0.22 && hotCells.length < 40) {
          var px = (i / 4) | 0;
          hotCells.push(px);
        }
      }
      if (b > r && b > g) blueKeep++;
    }

    var softened = softAcuity(new ImageData(out, imageData.width, imageData.height), kind === "deer" ? 0.28 : 0.22);
    var w = imageData.width;
    var h = imageData.height;
    var region = null;
    if (hotCells.length) {
      var sx = 0, sy = 0;
      for (var k = 0; k < hotCells.length; k++) {
        sx += hotCells[k] % w;
        sy += (hotCells[k] / w) | 0;
      }
      var cx = (sx / hotCells.length) | 0;
      var cy = (sy / hotCells.length) | 0;
      var bw = Math.max(24, (w * 0.12) | 0);
      var bh = Math.max(24, (h * 0.12) | 0);
      region = {
        x: clamp(cx - (bw / 2) | 0, 0, w - 1),
        y: clamp(cy - (bh / 2) | 0, 0, h - 1),
        w: bw,
        h: bh
      };
    }

    return {
      status: "ok",
      epistemic: "simulated",
      imageData: softened,
      label: kind === "canine" ? "SIMULATED CANINE VISION" : "SIMULATED DEER VISION",
      metrics: {
        meanRgSeparationLoss: samples ? rgLoss / samples : 0,
        blueDominantFrac: blueKeep / (w * h)
      },
      region: region
    };
  }

  global.WaypointHLAnimal = {
    simulateSpecies: simulateSpecies,
    softAcuity: softAcuity
  };
})(typeof window !== "undefined" ? window : globalThis);
