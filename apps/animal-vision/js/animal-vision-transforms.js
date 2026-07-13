/**
 * Animal Vision — reversible canvas transforms (no AI, no invented objects).
 * All operations are deterministic pixel remaps of the source photograph.
 */
(function (global) {
  "use strict";

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  function copyImageData(src) {
    return new ImageData(new Uint8ClampedArray(src.data), src.width, src.height);
  }

  function drawScaled(img, maxEdge) {
    var w = img.naturalWidth || img.width;
    var h = img.naturalHeight || img.height;
    var scale = 1;
    if (maxEdge && Math.max(w, h) > maxEdge) {
      scale = maxEdge / Math.max(w, h);
    }
    var cw = Math.max(1, Math.round(w * scale));
    var ch = Math.max(1, Math.round(h * scale));
    var canvas = document.createElement("canvas");
    canvas.width = cw;
    canvas.height = ch;
    var ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, cw, ch);
    return { canvas: canvas, ctx: ctx, imageData: ctx.getImageData(0, 0, cw, ch) };
  }

  function applyBoxBlur(data, width, height, radius) {
    if (radius <= 0) return data;
    var src = data.data;
    var out = new Uint8ClampedArray(src.length);
    var r = Math.max(1, Math.round(radius));
    var w = width;
    var h = height;
    for (var y = 0; y < h; y += 1) {
      for (var x = 0; x < w; x += 1) {
        var sumR = 0;
        var sumG = 0;
        var sumB = 0;
        var sumA = 0;
        var count = 0;
        for (var dy = -r; dy <= r; dy += 1) {
          var yy = clamp(y + dy, 0, h - 1);
          for (var dx = -r; dx <= r; dx += 1) {
            var xx = clamp(x + dx, 0, w - 1);
            var i = (yy * w + xx) * 4;
            sumR += src[i];
            sumG += src[i + 1];
            sumB += src[i + 2];
            sumA += src[i + 3];
            count += 1;
          }
        }
        var o = (y * w + x) * 4;
        out[o] = sumR / count;
        out[o + 1] = sumG / count;
        out[o + 2] = sumB / count;
        out[o + 3] = sumA / count;
      }
    }
    return new ImageData(out, width, height);
  }

  function lerpChannel(a, b, t) {
    return a + (b - a) * t;
  }

  function transformDeer(imageData, params) {
    params = params || {};
    var mix = params.redGreenMix != null ? params.redGreenMix : 0.55;
    var blueBoost = params.blueBoost != null ? params.blueBoost : 1.12;
    var sat = params.saturation != null ? params.saturation : 0.72;
    var contrast = params.contrast != null ? params.contrast : 1.04;
    var soft = params.detailSoftness != null ? params.detailSoftness : 0.35;
    var peri = params.peripheralSoftness != null ? params.peripheralSoftness : 0.22;

    var blurred = soft > 0.05 ? applyBoxBlur(imageData, imageData.width, imageData.height, soft * 1.6) : imageData;
    var src = imageData.data;
    var blur = blurred.data;
    var out = new Uint8ClampedArray(src.length);
    var w = imageData.width;
    var h = imageData.height;
    var cx = (w - 1) / 2;
    var cy = (h - 1) / 2;
    var maxD = Math.sqrt(cx * cx + cy * cy) || 1;

    for (var y = 0; y < h; y += 1) {
      for (var x = 0; x < w; x += 1) {
        var i = (y * w + x) * 4;
        var r = lerpChannel(src[i], blur[i], soft);
        var g = lerpChannel(src[i + 1], blur[i + 1], soft);
        var b = lerpChannel(src[i + 2], blur[i + 2], soft);
        var avgRG = r * (1 - mix) + g * mix;
        var nr = avgRG * 0.92 + g * 0.08;
        var ng = avgRG * 0.88 + r * 0.05;
        var nb = clamp(b * blueBoost, 0, 255);
        var gray = 0.299 * nr + 0.587 * ng + 0.114 * nb;
        nr = gray + (nr - gray) * sat;
        ng = gray + (ng - gray) * sat;
        nb = gray + (nb - gray) * sat;
        nr = (nr - 128) * contrast + 128;
        ng = (ng - 128) * contrast + 128;
        nb = (nb - 128) * contrast + 128;
        var dx = (x - cx) / maxD;
        var dy = (y - cy) / maxD;
        var edge = Math.sqrt(dx * dx + dy * dy);
        var soften = clamp((edge - 0.55) / 0.45, 0, 1) * peri;
        var lum = 0.299 * nr + 0.587 * ng + 0.114 * nb;
        nr = lerpChannel(nr, lum, soften * 0.65);
        ng = lerpChannel(ng, lum, soften * 0.65);
        nb = lerpChannel(nb, lum, soften * 0.5);
        out[i] = clamp(nr, 0, 255);
        out[i + 1] = clamp(ng, 0, 255);
        out[i + 2] = clamp(nb, 0, 255);
        out[i + 3] = src[i + 3];
      }
    }
    return new ImageData(out, w, h);
  }

  function transformHoneybee(imageData, params) {
    params = params || {};
    var redAtten = params.redAttenuate != null ? params.redAttenuate : 0.45;
    var blueBoost = params.blueBoost != null ? params.blueBoost : 1.28;
    var violet = params.violetLift != null ? params.violetLift : 0.18;
    var sat = params.saturation != null ? params.saturation : 0.9;
    var edge = params.edgeEmphasis != null ? params.edgeEmphasis : 0.2;
    var contrast = params.contrast != null ? params.contrast : 1.06;

    var blurred = edge > 0.05 ? applyBoxBlur(imageData, imageData.width, imageData.height, 1) : imageData;
    var src = imageData.data;
    var blur = blurred.data;
    var out = new Uint8ClampedArray(src.length);
    var w = imageData.width;
    var h = imageData.height;

    for (var i = 0; i < src.length; i += 4) {
      var r = src[i] * redAtten;
      var g = src[i + 1];
      var b = src[i + 2] * blueBoost;
      b = clamp(b + (255 - r) * violet * 0.35, 0, 255);
      var purple = clamp((src[i + 2] * 0.55 + (255 - src[i]) * 0.25), 0, 255);
      r = lerpChannel(r, purple * 0.35, violet);
      if (edge > 0) {
        var br = blur[i];
        var bg = blur[i + 1];
        var bb = blur[i + 2];
        r = clamp(r + (src[i] - br) * edge, 0, 255);
        g = clamp(g + (src[i + 1] - bg) * edge, 0, 255);
        b = clamp(b + (src[i + 2] - bb) * edge, 0, 255);
      }
      var gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * sat;
      g = gray + (g - gray) * sat;
      b = gray + (b - gray) * sat;
      r = (r - 128) * contrast + 128;
      g = (g - 128) * contrast + 128;
      b = (b - 128) * contrast + 128;
      out[i] = clamp(r, 0, 255);
      out[i + 1] = clamp(g, 0, 255);
      out[i + 2] = clamp(b, 0, 255);
      out[i + 3] = src[i + 3];
    }
    return new ImageData(out, w, h);
  }

  function transformBoxTurtle(imageData, params) {
    params = params || {};
    var warmth = params.warmth != null ? params.warmth : 0.12;
    var greenLift = params.greenLift != null ? params.greenLift : 1.06;
    var localC = params.localContrast != null ? params.localContrast : 0.28;
    var sharpen = params.nearFieldSharpen != null ? params.nearFieldSharpen : 0.22;
    var distSoft = params.distanceSoftness != null ? params.distanceSoftness : 0.18;
    var sat = params.saturation != null ? params.saturation : 1.05;
    var contrast = params.contrast != null ? params.contrast : 1.08;

    var blurred = applyBoxBlur(imageData, imageData.width, imageData.height, 1.2);
    var src = imageData.data;
    var blur = blurred.data;
    var out = new Uint8ClampedArray(src.length);
    var w = imageData.width;
    var h = imageData.height;

    for (var y = 0; y < h; y += 1) {
      var near = y / Math.max(1, h - 1);
      for (var x = 0; x < w; x += 1) {
        var i = (y * w + x) * 4;
        var r = src[i];
        var g = src[i + 1];
        var b = src[i + 2];
        var lr = blur[i];
        var lg = blur[i + 1];
        var lb = blur[i + 2];
        r = lerpChannel(r, r + (r - lr) * (localC + sharpen * near), 1);
        g = lerpChannel(g, g + (g - lg) * (localC + sharpen * near), 1);
        b = lerpChannel(b, b + (b - lb) * (localC + sharpen * near), 1);
        var softAmt = distSoft * (1 - near);
        r = lerpChannel(r, lr, softAmt);
        g = lerpChannel(g, lg, softAmt);
        b = lerpChannel(b, lb, softAmt);
        r = clamp(r + warmth * 40 - b * warmth * 0.08, 0, 255);
        g = clamp(g * greenLift, 0, 255);
        b = clamp(b * (1 - warmth * 0.35), 0, 255);
        var gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = gray + (r - gray) * sat;
        g = gray + (g - gray) * sat;
        b = gray + (b - gray) * sat;
        r = (r - 128) * contrast + 128;
        g = (g - 128) * contrast + 128;
        b = (b - 128) * contrast + 128;
        out[i] = clamp(r, 0, 255);
        out[i + 1] = clamp(g, 0, 255);
        out[i + 2] = clamp(b, 0, 255);
        out[i + 3] = src[i + 3];
      }
    }
    return new ImageData(out, w, h);
  }

  var REGISTRY = {
    "deer-dichromatic": transformDeer,
    "honeybee-uv-inspired": transformHoneybee,
    "box-turtle-forest-floor": transformBoxTurtle
  };

  function applySpecies(img, species) {
    if (!img || !species || !species.transform) {
      return Promise.reject(new Error("Missing image or species transform."));
    }
    var transform = species.transform;
    var fn = REGISTRY[transform.id];
    if (!fn) {
      return Promise.reject(new Error("Unknown transform: " + transform.id));
    }
    return new Promise(function (resolve, reject) {
      try {
        var drawn = drawScaled(img, transform.maxEdge || 1600);
        var original = copyImageData(drawn.imageData);
        var interpreted = fn(drawn.imageData, transform.params || {});
        drawn.ctx.putImageData(interpreted, 0, 0);
        resolve({
          canvas: drawn.canvas,
          originalData: original,
          interpretedData: interpreted,
          width: drawn.canvas.width,
          height: drawn.canvas.height,
          transformId: transform.id
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  function paintData(canvas, imageData) {
    if (!canvas || !imageData) return;
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    var ctx = canvas.getContext("2d");
    ctx.putImageData(imageData, 0, 0);
  }

  global.WaypointAnimalVision = global.WaypointAnimalVision || {};
  global.WaypointAnimalVision.transforms = {
    applySpecies: applySpecies,
    paintData: paintData,
    registry: REGISTRY,
    _test: {
      transformDeer: transformDeer,
      transformHoneybee: transformHoneybee,
      transformBoxTurtle: transformBoxTurtle,
      copyImageData: copyImageData,
      clamp: clamp
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
