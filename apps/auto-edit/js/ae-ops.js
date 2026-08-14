/**
 * Waypoint Auto Edit — restrained pixel operations (canvas ImageData).
 * No generative fill / sky replace / fake detail.
 */
(function (global) {
  "use strict";

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function copyImageData(src) {
    return new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
  }

  function luma(r, g, b) {
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  function applyExposure(data, ev) {
    if (!ev) return;
    var mul = Math.pow(2, ev);
    for (var i = 0; i < data.length; i += 4) {
      data[i] = clamp(data[i] * mul, 0, 255);
      data[i + 1] = clamp(data[i + 1] * mul, 0, 255);
      data[i + 2] = clamp(data[i + 2] * mul, 0, 255);
    }
  }

  function applyHighlightsShadows(data, hi, sh) {
    hi = hi || 0;
    sh = sh || 0;
    if (!hi && !sh) return;
    for (var i = 0; i < data.length; i += 4) {
      var r = data[i], g = data[i + 1], b = data[i + 2];
      var L = luma(r, g, b) / 255;
      var tHi = L * L;
      var tSh = (1 - L) * (1 - L);
      var f = 1 + hi * tHi + sh * tSh;
      data[i] = clamp(r * f, 0, 255);
      data[i + 1] = clamp(g * f, 0, 255);
      data[i + 2] = clamp(b * f, 0, 255);
    }
  }

  function applyContrast(data, amount) {
    if (!amount) return;
    var c = 1 + amount;
    for (var i = 0; i < data.length; i += 4) {
      data[i] = clamp((data[i] - 128) * c + 128, 0, 255);
      data[i + 1] = clamp((data[i + 1] - 128) * c + 128, 0, 255);
      data[i + 2] = clamp((data[i + 2] - 128) * c + 128, 0, 255);
    }
  }

  function applyCurve(data, params) {
    params = params || {};
    var shadows = params.shadows || 0;
    var highlights = params.highlights || 0;
    var mid = params.mid || 0;
    if (!shadows && !highlights && !mid) return;
    for (var i = 0; i < data.length; i += 4) {
      for (var c = 0; c < 3; c++) {
        var v = data[i + c] / 255;
        var s = shadows * (1 - v) * (1 - v);
        var h = highlights * v * v;
        var m = mid * (1 - Math.abs(v - 0.5) * 2);
        data[i + c] = clamp((v + s + h + m) * 255, 0, 255);
      }
    }
  }

  function applyWhiteBalance(data, warmth) {
    if (!warmth) return;
    for (var i = 0; i < data.length; i += 4) {
      data[i] = clamp(data[i] * (1 + warmth * 0.55), 0, 255);
      data[i + 2] = clamp(data[i + 2] * (1 - warmth * 0.55), 0, 255);
    }
  }

  function applySaturation(data, amount) {
    if (!amount) return;
    for (var i = 0; i < data.length; i += 4) {
      var r = data[i], g = data[i + 1], b = data[i + 2];
      var L = luma(r, g, b);
      data[i] = clamp(L + (r - L) * (1 + amount), 0, 255);
      data[i + 1] = clamp(L + (g - L) * (1 + amount), 0, 255);
      data[i + 2] = clamp(L + (b - L) * (1 + amount), 0, 255);
    }
  }

  function applyVibrance(data, amount) {
    if (!amount) return;
    for (var i = 0; i < data.length; i += 4) {
      var r = data[i], g = data[i + 1], b = data[i + 2];
      var maxc = Math.max(r, g, b) || 1;
      var minc = Math.min(r, g, b);
      var sat = (maxc - minc) / maxc;
      var boost = amount * (1 - sat);
      var L = luma(r, g, b);
      data[i] = clamp(L + (r - L) * (1 + boost), 0, 255);
      data[i + 1] = clamp(L + (g - L) * (1 + boost), 0, 255);
      data[i + 2] = clamp(L + (b - L) * (1 + boost), 0, 255);
    }
  }

  function applyBlackWhitePoint(data, blackAmt, whiteAmt) {
    blackAmt = blackAmt || 0;
    whiteAmt = whiteAmt || 0;
    if (!blackAmt && !whiteAmt) return;
    var lo = blackAmt * 40;
    var hi = 255 - whiteAmt * 40;
    var span = hi - lo || 1;
    for (var i = 0; i < data.length; i += 4) {
      data[i] = clamp(((data[i] - lo) / span) * 255, 0, 255);
      data[i + 1] = clamp(((data[i + 1] - lo) / span) * 255, 0, 255);
      data[i + 2] = clamp(((data[i + 2] - lo) / span) * 255, 0, 255);
    }
  }

  function applyDehaze(data, amount) {
    if (!amount) return;
    // Simple dark-channel-ish contrast in brighter air
    for (var i = 0; i < data.length; i += 4) {
      var r = data[i], g = data[i + 1], b = data[i + 2];
      var minc = Math.min(r, g, b);
      var air = minc / 255;
      var f = 1 + amount * air * 0.85;
      data[i] = clamp((r - 18 * amount) * f, 0, 255);
      data[i + 1] = clamp((g - 18 * amount) * f, 0, 255);
      data[i + 2] = clamp((b - 18 * amount) * f, 0, 255);
    }
  }

  function applyLocalContrast(src, amount) {
    if (!amount) return src;
    var w = src.width, h = src.height;
    var d = src.data;
    var out = new Uint8ClampedArray(d);
    var radius = 2;
    for (var y = radius; y < h - radius; y += 1) {
      for (var x = radius; x < w - radius; x += 1) {
        var i = (y * w + x) * 4;
        var sum = 0, count = 0;
        for (var dy = -radius; dy <= radius; dy++) {
          for (var dx = -radius; dx <= radius; dx++) {
            var j = ((y + dy) * w + (x + dx)) * 4;
            sum += luma(d[j], d[j + 1], d[j + 2]);
            count++;
          }
        }
        var local = sum / count;
        var L = luma(d[i], d[i + 1], d[i + 2]);
        var delta = (L - local) * amount;
        out[i] = clamp(d[i] + delta, 0, 255);
        out[i + 1] = clamp(d[i + 1] + delta, 0, 255);
        out[i + 2] = clamp(d[i + 2] + delta, 0, 255);
      }
    }
    return new ImageData(out, w, h);
  }

  function applySharpen(src, amount) {
    if (!amount) return src;
    var w = src.width, h = src.height;
    var d = src.data;
    var out = new Uint8ClampedArray(d);
    // Unsharp via Laplacian-ish kernel
    for (var y = 1; y < h - 1; y++) {
      for (var x = 1; x < w - 1; x++) {
        var i = (y * w + x) * 4;
        for (var c = 0; c < 3; c++) {
          var center = d[i + c];
          var lap =
            -d[((y - 1) * w + x) * 4 + c] -
            d[(y * w + (x - 1)) * 4 + c] +
            4 * center -
            d[(y * w + (x + 1)) * 4 + c] -
            d[((y + 1) * w + x) * 4 + c];
          out[i + c] = clamp(center + lap * amount * 0.35, 0, 255);
        }
      }
    }
    return new ImageData(out, w, h);
  }

  function applyDenoise(src, amount) {
    if (!amount) return src;
    // Tiny box blur mix — restrained to avoid wax
    var w = src.width, h = src.height;
    var d = src.data;
    var out = new Uint8ClampedArray(d);
    var t = clamp(amount, 0, 0.35);
    for (var y = 1; y < h - 1; y++) {
      for (var x = 1; x < w - 1; x++) {
        var i = (y * w + x) * 4;
        for (var c = 0; c < 3; c++) {
          var avg =
            (d[i + c] +
              d[((y - 1) * w + x) * 4 + c] +
              d[((y + 1) * w + x) * 4 + c] +
              d[(y * w + (x - 1)) * 4 + c] +
              d[(y * w + (x + 1)) * 4 + c]) /
            5;
          // Preserve strong edges
          var edge = Math.abs(d[i + c] - avg);
          var mix = t * (1 - clamp(edge / 28, 0, 1));
          out[i + c] = clamp(d[i + c] * (1 - mix) + avg * mix, 0, 255);
        }
      }
    }
    return new ImageData(out, w, h);
  }

  function applyMonochrome(data, params) {
    params = params || {};
    var contrast = 1 + (params.contrast || 0);
    var lift = params.lift || 0;
    for (var i = 0; i < data.length; i += 4) {
      var L = luma(data[i], data[i + 1], data[i + 2]);
      L = clamp((L - 128) * contrast + 128 + lift * 255, 0, 255);
      data[i] = data[i + 1] = data[i + 2] = L;
    }
  }

  function applyOps(imageData, ops, signals) {
    var Restraint = global.WaypointAutoEditRestraint;
    var working = copyImageData(imageData);
    var srcCopy = copyImageData(imageData);
    ops = ops || [];

    ops.forEach(function (o) {
      if (!o || o.id === "noop") return;
      var p = o.params || {};
      if (o.id === "exposure") applyExposure(working.data, p.ev || 0);
      else if (o.id === "highlights" || o.id === "shadows") {
        // handled below as pair — accumulate
      } else if (o.id === "contrast") applyContrast(working.data, p.amount || 0);
      else if (o.id === "curve") applyCurve(working.data, p);
      else if (o.id === "whiteBalance") applyWhiteBalance(working.data, p.warmth || 0);
      else if (o.id === "saturation") applySaturation(working.data, p.amount || 0);
      else if (o.id === "vibrance") applyVibrance(working.data, p.amount || 0);
      else if (o.id === "blackPoint") applyBlackWhitePoint(working.data, p.amount || 0, 0);
      else if (o.id === "whitePoint") applyBlackWhitePoint(working.data, 0, p.amount || 0);
      else if (o.id === "dehaze") applyDehaze(working.data, p.amount || 0);
      else if (o.id === "monochrome") applyMonochrome(working.data, p);
    });

    var hi = 0, sh = 0;
    ops.forEach(function (o) {
      if (o.id === "highlights") hi = o.params && o.params.amount != null ? o.params.amount : hi;
      if (o.id === "shadows") sh = o.params && o.params.amount != null ? o.params.amount : sh;
    });
    if (hi || sh) applyHighlightsShadows(working.data, hi, sh);

    ops.forEach(function (o) {
      if (o.id === "localContrast" || o.id === "clarity") {
        working = applyLocalContrast(working, (o.params && o.params.amount) || 0);
      }
      if (o.id === "denoise") working = applyDenoise(working, (o.params && o.params.amount) || 0);
      if (o.id === "sharpen") working = applySharpen(working, (o.params && o.params.amount) || 0);
    });

    // Per-pixel restraint vs original
    if (Restraint && Restraint.protectPixel) {
      var a = working.data;
      var s = srcCopy.data;
      for (var i = 0; i < a.length; i += 4) {
        var rgb = Restraint.protectPixel(a[i], a[i + 1], a[i + 2], s[i], s[i + 1], s[i + 2], signals);
        a[i] = rgb[0];
        a[i + 1] = rgb[1];
        a[i + 2] = rgb[2];
      }
    }

    // Avoid increasing highlight clip vs source
    if (global.WaypointAutoEditSignals) {
      var before = global.WaypointAutoEditSignals.measureClipping(srcCopy);
      var after = global.WaypointAutoEditSignals.measureClipping(working);
      if (after.clipHigh > before.clipHigh + 0.004) {
        // blend back 40% toward source in near-white regions
        var wd = working.data;
        var sd = srcCopy.data;
        for (var j = 0; j < wd.length; j += 4) {
          var L2 = luma(wd[j], wd[j + 1], wd[j + 2]);
          if (L2 > 245) {
            wd[j] = sd[j] * 0.55 + wd[j] * 0.45;
            wd[j + 1] = sd[j + 1] * 0.55 + wd[j + 1] * 0.45;
            wd[j + 2] = sd[j + 2] * 0.55 + wd[j + 2] * 0.45;
          }
        }
      }
    }

    return working;
  }

  global.WaypointAutoEditOps = {
    copyImageData: copyImageData,
    applyOps: applyOps
  };
})(typeof window !== "undefined" ? window : globalThis);
