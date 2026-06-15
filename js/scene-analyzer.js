(function (global) {
  "use strict";

  /**
   * Client-side landscape heuristics — samples pixels in vertical bands.
   * No server upload; analysis runs on a downscaled canvas in the browser.
   */
  var SAMPLE_W = 160;
  var SAMPLE_H = 100;

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

  function classifyPixel(r, g, b) {
    var bright = (r + g + b) / 3;
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var sat = max === 0 ? 0 : (max - min) / max;

    return {
      sky: bright > 110 && b > r + 12 && b >= g - 15 && sat < 0.58,
      water: b > r + 4 && b >= g - 25 && sat < 0.62 && bright > 45 && bright < 215,
      trees: g > r + 8 && g > b - 5 && sat > 0.18 && bright > 35 && bright < 175,
      mountains: sat < 0.38 && bright > 35 && bright < 175 && Math.abs(r - g) < 35 && Math.abs(r - b) < 40,
      clouds: bright > 175 && sat < 0.28,
      fields: g >= r - 5 && bright > 70 && bright < 210 && sat > 0.12 && sat < 0.72 && r > 60,
      snow: bright > 195 && sat < 0.22,
      foreground: bright < 120 || sat > 0.45
    };
  }

  function analyze(img) {
    var canvas = document.createElement("canvas");
    canvas.width = SAMPLE_W;
    canvas.height = SAMPLE_H;
    var ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return emptyResult();

    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    if (!iw || !ih) return emptyResult();

    var scale = Math.max(SAMPLE_W / iw, SAMPLE_H / ih);
    var dw = iw * scale;
    var dh = ih * scale;
    var ox = (SAMPLE_W - dw) / 2;
    var oy = (SAMPLE_H - dh) / 2;
    ctx.drawImage(img, ox, oy, dw, dh);

    var data = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data;
    var totals = {
      sky: 0,
      water: 0,
      trees: 0,
      mountains: 0,
      clouds: 0,
      fields: 0,
      snow: 0,
      foreground: 0
    };
    var bandWeight = {
      sky: { top: 1.4, upperMid: 0.5, mid: 0.15, lowerMid: 0.05, bottom: 0.05 },
      water: { top: 0.05, upperMid: 0.35, mid: 1.2, lowerMid: 1.4, bottom: 0.6 },
      trees: { top: 0.05, upperMid: 0.6, mid: 1.1, lowerMid: 1.2, bottom: 0.9 },
      mountains: { top: 0.15, upperMid: 1.5, mid: 0.8, lowerMid: 0.2, bottom: 0.05 },
      clouds: { top: 1.5, upperMid: 0.8, mid: 0.1, lowerMid: 0.05, bottom: 0.05 },
      fields: { top: 0.05, upperMid: 0.4, mid: 1.2, lowerMid: 1.1, bottom: 0.5 },
      snow: { top: 1, upperMid: 1, mid: 1, lowerMid: 1, bottom: 1 },
      foreground: { top: 0.05, upperMid: 0.15, mid: 0.35, lowerMid: 0.9, bottom: 1.5 }
    };
    var pixelCount = 0;
    var i;
    var x;
    var y;

    for (y = 0; y < SAMPLE_H; y++) {
      for (x = 0; x < SAMPLE_W; x++) {
        i = (y * SAMPLE_W + x) * 4;
        if (data[i + 3] < 16) continue;
        var band = bandForY(y, SAMPLE_H);
        var flags = classifyPixel(data[i], data[i + 1], data[i + 2]);
        var key;
        for (key in flags) {
          if (flags[key]) totals[key] += bandWeight[key][band];
        }
        pixelCount++;
      }
    }

    if (pixelCount === 0) return emptyResult();

    var maxTotal = 0;
    var features = {};
    for (key in totals) {
      if (totals[key] > maxTotal) maxTotal = totals[key];
    }
    for (key in totals) {
      features[key] = clamp(totals[key] / Math.max(maxTotal, 1), 0, 1);
    }

    var depth = {
      background: clamp((features.sky + features.mountains + features.clouds) / 2.2, 0, 1),
      midground: clamp((features.water + features.trees + features.fields) / 2.2, 0, 1),
      foreground: clamp(features.foreground, 0, 1)
    };

    return {
      features: features,
      depth: depth,
      labels: featureLabels(features)
    };
  }

  function featureLabels(features) {
    var list = [];
    var map = [
      ["sky", "Sky"],
      ["water", "Water"],
      ["trees", "Trees"],
      ["mountains", "Mountains"],
      ["clouds", "Clouds"],
      ["fields", "Open fields"],
      ["snow", "Snow"],
      ["foreground", "Foreground"]
    ];
    var i;
    for (i = 0; i < map.length; i++) {
      var key = map[i][0];
      var score = features[key];
      if (score >= 0.28) {
        list.push({ id: key, label: map[i][1], score: score });
      }
    }
    list.sort(function (a, b) {
      return b.score - a.score;
    });
    return list;
  }

  function emptyResult() {
    return {
      features: {
        sky: 0,
        water: 0,
        trees: 0,
        mountains: 0,
        clouds: 0,
        fields: 0,
        snow: 0,
        foreground: 0
      },
      depth: { background: 0, midground: 0, foreground: 0 },
      labels: []
    };
  }

  global.WaypointSceneAnalyzer = {
    analyze: analyze
  };
})(window);
