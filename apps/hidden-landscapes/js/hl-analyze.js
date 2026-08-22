/**
 * Hidden Landscapes — Light / Color / Structure analysis & visualization
 * All outputs are COMPUTED or INFERRED from RGB pixels. Never invents UV/IR/thermal.
 */
(function (global) {
  "use strict";

  var Color = null;
  function C() {
    Color = Color || global.WaypointHLColor;
    return Color;
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function drawImageScaled(img, maxEdge) {
    var w = img.naturalWidth || img.width;
    var h = img.naturalHeight || img.height;
    var scale = 1;
    if (maxEdge && Math.max(w, h) > maxEdge) scale = maxEdge / Math.max(w, h);
    var cw = Math.max(1, Math.round(w * scale));
    var ch = Math.max(1, Math.round(h * scale));
    var canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    var ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, cw, ch);
    return { canvas: canvas, ctx: ctx, imageData: ctx.getImageData(0, 0, cw, ch), width: cw, height: ch };
  }

  function copyImageData(src) {
    return new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
  }

  function luminanceBuffer(imageData) {
    var d = imageData.data;
    var out = new Float32Array(imageData.width * imageData.height);
    var col = C();
    for (var i = 0, p = 0; i < d.length; i += 4, p++) {
      out[p] = col.relativeLuminance(d[i], d[i + 1], d[i + 2]);
    }
    return out;
  }

  function renderLuminance(imageData) {
    var d = imageData.data;
    var out = new Uint8ClampedArray(d.length);
    var col = C();
    for (var i = 0; i < d.length; i += 4) {
      var Y = col.relativeLuminance(d[i], d[i + 1], d[i + 2]);
      var g = Math.round(Math.pow(clamp(Y, 0, 1), 1 / 2.2) * 255);
      out[i] = out[i + 1] = out[i + 2] = g;
      out[i + 3] = d[i + 3];
    }
    return new ImageData(out, imageData.width, imageData.height);
  }

  function analyzeTonal(lum, width, height) {
    var hist = new Array(32);
    var i;
    for (i = 0; i < 32; i++) hist[i] = 0;
    var clipped = 0;
    var deepShadow = 0;
    var bright = 0;
    var n = lum.length;
    for (i = 0; i < n; i++) {
      var y = lum[i];
      var bin = clamp(Math.floor(y * 32), 0, 31);
      hist[bin]++;
      if (y >= 0.98) clipped++;
      if (y < 0.08) deepShadow++;
      if (y > 0.75) bright++;
    }
    return {
      histogram: hist,
      clippedHighlightFrac: clipped / n,
      deepShadowFrac: deepShadow / n,
      brightFrac: bright / n,
      pixelCount: n,
      width: width,
      height: height
    };
  }

  function renderTonal(imageData, lum) {
    var d = imageData.data;
    var out = new Uint8ClampedArray(d.length);
    for (var i = 0, p = 0; i < d.length; i += 4, p++) {
      var y = lum[p];
      var r, g, b;
      if (y < 0.08) { r = 20; g = 24; b = 48; }
      else if (y < 0.25) { r = 40; g = 70; b = 110; }
      else if (y < 0.55) { r = 90; g = 120; b = 90; }
      else if (y < 0.85) { r = 180; g = 160; b = 70; }
      else if (y < 0.98) { r = 230; g = 210; b = 160; }
      else { r = 255; g = 240; b = 240; }
      // Blend with luminance so form stays readable; hatch-like via checker on clipped
      var base = Math.round(Math.pow(y, 1 / 2.2) * 180);
      out[i] = clamp(Math.round(base * 0.45 + r * 0.55), 0, 255);
      out[i + 1] = clamp(Math.round(base * 0.45 + g * 0.55), 0, 255);
      out[i + 2] = clamp(Math.round(base * 0.45 + b * 0.55), 0, 255);
      if (y >= 0.98 && ((p % 7) === 0)) {
        out[i] = 255; out[i + 1] = 255; out[i + 2] = 255;
      }
      out[i + 3] = d[i + 3];
    }
    return new ImageData(out, imageData.width, imageData.height);
  }

  function renderConcentration(imageData, lum) {
    var w = imageData.width;
    var h = imageData.height;
    var d = imageData.data;
    var out = new Uint8ClampedArray(d.length);
    var thr = 0.55;
    var maxY = 0;
    var i;
    for (i = 0; i < lum.length; i++) if (lum[i] > maxY) maxY = lum[i];
    thr = Math.max(0.45, maxY * 0.62);
    for (i = 0; i < lum.length; i++) {
      var y = lum[i];
      var t = clamp((y - thr * 0.5) / Math.max(1e-6, 1 - thr * 0.5), 0, 1);
      var o = i * 4;
      var baseR = d[o] * 0.35;
      var baseG = d[o + 1] * 0.35;
      var baseB = d[o + 2] * 0.35;
      out[o] = clamp(baseR + t * 200, 0, 255);
      out[o + 1] = clamp(baseG + t * 160, 0, 255);
      out[o + 2] = clamp(baseB + t * 40, 0, 255);
      out[o + 3] = d[o + 3];
    }
    return new ImageData(out, w, h);
  }

  function analyzeColor(imageData) {
    var d = imageData.data;
    var col = C();
    var families = {
      red: 0, orange: 0, yellow: 0, green: 0, cyan: 0, blue: 0, purple: 0, neutral: 0
    };
    var warm = 0;
    var cool = 0;
    var satSum = 0;
    var satCount = 0;
    var highSat = 0;
    var n = 0;
    for (var i = 0; i < d.length; i += 4) {
      var hsl = col.rgbToHsl(d[i], d[i + 1], d[i + 2]);
      n++;
      satSum += hsl.s;
      satCount++;
      if (hsl.s < 0.12 || hsl.l < 0.08 || hsl.l > 0.92) {
        families.neutral++;
        continue;
      }
      if (hsl.s > 0.45) highSat++;
      var h = hsl.h;
      if (h < 20 || h >= 340) families.red++;
      else if (h < 45) families.orange++;
      else if (h < 70) families.yellow++;
      else if (h < 160) families.green++;
      else if (h < 200) families.cyan++;
      else if (h < 260) families.blue++;
      else families.purple++;
      if (h < 70 || h >= 330) warm++;
      else if (h >= 150 && h < 270) cool++;
    }
    var ranked = Object.keys(families).map(function (k) {
      return { family: k, frac: families[k] / n };
    }).sort(function (a, b) { return b.frac - a.frac; });
    return {
      families: families,
      ranked: ranked,
      warmFrac: warm / n,
      coolFrac: cool / n,
      meanSaturation: satSum / Math.max(1, satCount),
      highSatFrac: highSat / n,
      pixelCount: n
    };
  }

  function renderFamilies(imageData) {
    var d = imageData.data;
    var out = new Uint8ClampedArray(d.length);
    var col = C();
    var palette = {
      red: [190, 60, 50], orange: [210, 120, 40], yellow: [210, 190, 60],
      green: [60, 140, 70], cyan: [50, 150, 160], blue: [50, 90, 180],
      purple: [120, 70, 160], neutral: [110, 110, 105]
    };
    for (var i = 0; i < d.length; i += 4) {
      var hsl = col.rgbToHsl(d[i], d[i + 1], d[i + 2]);
      var key = "neutral";
      if (!(hsl.s < 0.12 || hsl.l < 0.08 || hsl.l > 0.92)) {
        var h = hsl.h;
        if (h < 20 || h >= 340) key = "red";
        else if (h < 45) key = "orange";
        else if (h < 70) key = "yellow";
        else if (h < 160) key = "green";
        else if (h < 200) key = "cyan";
        else if (h < 260) key = "blue";
        else key = "purple";
      }
      var p = palette[key];
      var y = Math.round(C().relativeLuminance(d[i], d[i + 1], d[i + 2]) * 255);
      out[i] = clamp(Math.round(y * 0.35 + p[0] * 0.65), 0, 255);
      out[i + 1] = clamp(Math.round(y * 0.35 + p[1] * 0.65), 0, 255);
      out[i + 2] = clamp(Math.round(y * 0.35 + p[2] * 0.65), 0, 255);
      out[i + 3] = d[i + 3];
    }
    return new ImageData(out, imageData.width, imageData.height);
  }

  function renderWarmCool(imageData) {
    var d = imageData.data;
    var out = new Uint8ClampedArray(d.length);
    var col = C();
    for (var i = 0; i < d.length; i += 4) {
      var hsl = col.rgbToHsl(d[i], d[i + 1], d[i + 2]);
      var y = Math.pow(col.relativeLuminance(d[i], d[i + 1], d[i + 2]), 1 / 2.2) * 200;
      var h = hsl.h;
      var warm = (h < 70 || h >= 330) && hsl.s > 0.1;
      var cool = h >= 150 && h < 270 && hsl.s > 0.1;
      if (warm) {
        out[i] = clamp(y * 0.5 + 140, 0, 255);
        out[i + 1] = clamp(y * 0.45 + 70, 0, 255);
        out[i + 2] = clamp(y * 0.35 + 30, 0, 255);
      } else if (cool) {
        out[i] = clamp(y * 0.35 + 30, 0, 255);
        out[i + 1] = clamp(y * 0.45 + 80, 0, 255);
        out[i + 2] = clamp(y * 0.55 + 140, 0, 255);
      } else {
        out[i] = out[i + 1] = out[i + 2] = clamp(y, 0, 255);
      }
      out[i + 3] = d[i + 3];
    }
    return new ImageData(out, imageData.width, imageData.height);
  }

  function renderSaturation(imageData) {
    var d = imageData.data;
    var out = new Uint8ClampedArray(d.length);
    var col = C();
    for (var i = 0; i < d.length; i += 4) {
      var hsl = col.rgbToHsl(d[i], d[i + 1], d[i + 2]);
      var y = Math.pow(col.relativeLuminance(d[i], d[i + 1], d[i + 2]), 1 / 2.2);
      var s = hsl.s;
      out[i] = clamp(Math.round(y * 80 + s * d[i] * 0.9), 0, 255);
      out[i + 1] = clamp(Math.round(y * 80 + s * d[i + 1] * 0.9), 0, 255);
      out[i + 2] = clamp(Math.round(y * 80 + s * d[i + 2] * 0.9), 0, 255);
      out[i + 3] = d[i + 3];
    }
    return new ImageData(out, imageData.width, imageData.height);
  }

  function sobelEdges(lum, w, h) {
    var mag = new Float32Array(w * h);
    var max = 1e-6;
    for (var y = 1; y < h - 1; y++) {
      for (var x = 1; x < w - 1; x++) {
        var i = y * w + x;
        var gx =
          -lum[i - w - 1] - 2 * lum[i - 1] - lum[i + w - 1] +
          lum[i - w + 1] + 2 * lum[i + 1] + lum[i + w + 1];
        var gy =
          -lum[i - w - 1] - 2 * lum[i - w] - lum[i - w + 1] +
          lum[i + w - 1] + 2 * lum[i + w] + lum[i + w + 1];
        var m = Math.sqrt(gx * gx + gy * gy);
        mag[i] = m;
        if (m > max) max = m;
      }
    }
    return { mag: mag, max: max };
  }

  function renderEdges(imageData, edge) {
    var d = imageData.data;
    var out = new Uint8ClampedArray(d.length);
    var inv = 1 / edge.max;
    for (var i = 0; i < edge.mag.length; i++) {
      var v = clamp(edge.mag[i] * inv, 0, 1);
      var g = Math.round(Math.pow(v, 0.7) * 255);
      var o = i * 4;
      out[o] = g; out[o + 1] = g; out[o + 2] = g; out[o + 3] = d[o + 3];
    }
    return new ImageData(out, imageData.width, imageData.height);
  }

  function localStats(lum, w, h, radius) {
    var variance = new Float32Array(w * h);
    var contrast = new Float32Array(w * h);
    var r = radius || 2;
    for (var y = 0; y < h; y++) {
      for (var x = 0; x < w; x++) {
        var sum = 0;
        var sum2 = 0;
        var count = 0;
        for (var dy = -r; dy <= r; dy++) {
          var yy = clamp(y + dy, 0, h - 1);
          for (var dx = -r; dx <= r; dx++) {
            var xx = clamp(x + dx, 0, w - 1);
            var v = lum[yy * w + xx];
            sum += v;
            sum2 += v * v;
            count++;
          }
        }
        var mean = sum / count;
        var i = y * w + x;
        variance[i] = Math.max(0, sum2 / count - mean * mean);
        contrast[i] = Math.abs(lum[i] - mean);
      }
    }
    return { variance: variance, contrast: contrast };
  }

  function renderFloatMap(imageData, buf, gamma) {
    var d = imageData.data;
    var out = new Uint8ClampedArray(d.length);
    var max = 1e-6;
    var i;
    for (i = 0; i < buf.length; i++) if (buf[i] > max) max = buf[i];
    var inv = 1 / max;
    gamma = gamma || 0.65;
    for (i = 0; i < buf.length; i++) {
      var g = Math.round(Math.pow(clamp(buf[i] * inv, 0, 1), gamma) * 255);
      var o = i * 4;
      out[o] = g; out[o + 1] = g; out[o + 2] = g; out[o + 3] = d[o + 3];
    }
    return new ImageData(out, imageData.width, imageData.height);
  }

  /** INFERRED near/far cue — not measured depth. */
  function renderEstimatedDepth(imageData, lum) {
    var w = imageData.width;
    var h = imageData.height;
    var d = imageData.data;
    var out = new Uint8ClampedArray(d.length);
    for (var y = 0; y < h; y++) {
      var vert = y / Math.max(1, h - 1);
      for (var x = 0; x < w; x++) {
        var i = y * w + x;
        var haze = clamp(lum[i], 0, 1);
        // Lower in frame → nearer bias; bright desaturated upper → farther bias
        var near = clamp(0.15 + vert * 0.75 - haze * 0.25, 0, 1);
        var o = i * 4;
        out[o] = Math.round(near * 40 + (1 - near) * 180);
        out[o + 1] = Math.round(near * 100 + (1 - near) * 160);
        out[o + 2] = Math.round(near * 70 + (1 - near) * 200);
        out[o + 3] = d[o + 3];
      }
    }
    return new ImageData(out, w, h);
  }

  function findBrightestRegion(lum, w, h, block) {
    block = block || 16;
    var best = { x: 0, y: 0, score: -1, w: block, h: block };
    for (var by = 0; by < h; by += block) {
      for (var bx = 0; bx < w; bx += block) {
        var sum = 0;
        var count = 0;
        for (var y = by; y < Math.min(h, by + block); y++) {
          for (var x = bx; x < Math.min(w, bx + block); x++) {
            sum += lum[y * w + x];
            count++;
          }
        }
        var score = sum / count;
        if (score > best.score) {
          best = { x: bx, y: by, score: score, w: Math.min(block, w - bx), h: Math.min(block, h - by) };
        }
      }
    }
    return best;
  }

  function findEdgeDenseRegion(edge, w, h, block) {
    block = block || 16;
    var best = { x: 0, y: 0, score: -1, w: block, h: block };
    for (var by = 0; by < h; by += block) {
      for (var bx = 0; bx < w; bx += block) {
        var sum = 0;
        var count = 0;
        for (var y = by; y < Math.min(h, by + block); y++) {
          for (var x = bx; x < Math.min(w, bx + block); x++) {
            sum += edge.mag[y * w + x];
            count++;
          }
        }
        var score = sum / count;
        if (score > best.score) {
          best = { x: bx, y: by, score: score, w: Math.min(block, w - bx), h: Math.min(block, h - by) };
        }
      }
    }
    return best;
  }

  /**
   * Build full analysis package from an HTMLImageElement.
   * analysisMaxEdge for stats; displayMaxEdge for visualization canvases.
   */
  function analyzeImage(img, options) {
    options = options || {};
    var analysisMax = options.analysisMaxEdge || 640;
    var displayMax = options.displayMaxEdge || 1600;
    var display = drawImageScaled(img, displayMax);
    var analysis = analysisMax === displayMax ? display : drawImageScaled(img, analysisMax);
    var lumA = luminanceBuffer(analysis.imageData);
    var lumD = analysis === display ? lumA : luminanceBuffer(display.imageData);
    var tonal = analyzeTonal(lumA, analysis.width, analysis.height);
    var color = analyzeColor(analysis.imageData);
    var edgeA = sobelEdges(lumA, analysis.width, analysis.height);
    var statsA = localStats(lumA, analysis.width, analysis.height, 2);
    var edgeD = sobelEdges(lumD, display.width, display.height);
    var statsD = localStats(lumD, display.width, display.height, 2);
    var brightRegion = findBrightestRegion(lumA, analysis.width, analysis.height, 20);
    var edgeRegion = findEdgeDenseRegion(edgeA, analysis.width, analysis.height, 20);

    // Scale regions to display coords
    var sx = display.width / analysis.width;
    var sy = display.height / analysis.height;
    function scaleRegion(r) {
      return {
        x: Math.round(r.x * sx),
        y: Math.round(r.y * sy),
        w: Math.max(8, Math.round(r.w * sx)),
        h: Math.max(8, Math.round(r.h * sy)),
        score: r.score
      };
    }

    var views = {
      photo: copyImageData(display.imageData),
      luminance: renderLuminance(display.imageData),
      tonal: renderTonal(display.imageData, lumD),
      concentration: renderConcentration(display.imageData, lumD),
      families: renderFamilies(display.imageData),
      "warm-cool": renderWarmCool(display.imageData),
      saturation: renderSaturation(display.imageData),
      edges: renderEdges(display.imageData, edgeD),
      texture: renderFloatMap(display.imageData, statsD.variance, 0.55),
      "local-contrast": renderFloatMap(display.imageData, statsD.contrast, 0.7),
      "estimated-depth": renderEstimatedDepth(display.imageData, lumD)
    };

    return {
      width: display.width,
      height: display.height,
      analysisWidth: analysis.width,
      analysisHeight: analysis.height,
      tonal: tonal,
      color: color,
      edgeEnergyMean: edgeA.mag.reduce(function (a, b) { return a + b; }, 0) / edgeA.mag.length,
      regions: {
        brightest: scaleRegion(brightRegion),
        edgeDense: scaleRegion(edgeRegion)
      },
      views: views,
      displayCanvas: display.canvas,
      release: function () {
        views = null;
      }
    };
  }

  function putView(canvas, imageData) {
    if (!canvas || !imageData) return;
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    canvas.getContext("2d").putImageData(imageData, 0, 0);
  }

  global.WaypointHLAnalyze = {
    drawImageScaled: drawImageScaled,
    analyzeImage: analyzeImage,
    putView: putView,
    luminanceBuffer: luminanceBuffer,
    renderLuminance: renderLuminance,
    analyzeTonal: analyzeTonal,
    analyzeColor: analyzeColor,
    relativeLuminance: function (r, g, b) { return C().relativeLuminance(r, g, b); }
  };
})(typeof window !== "undefined" ? window : globalThis);
