/**
 * Photo Coach — downsampled pixel sampling (browser canvas only).
 */
(function (global) {
  "use strict";

  var SAMPLE_W = 200;
  var SAMPLE_H = 130;

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function sampleFromImage(img) {
    var canvas = document.createElement("canvas");
    canvas.width = SAMPLE_W;
    canvas.height = SAMPLE_H;
    var ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    if (!iw || !ih) return null;

    var scale = Math.max(SAMPLE_W / iw, SAMPLE_H / ih);
    var dw = iw * scale;
    var dh = ih * scale;
    ctx.drawImage(img, (SAMPLE_W - dw) / 2, (SAMPLE_H - dh) / 2, dw, dh);

    var data = ctx.getImageData(0, 0, SAMPLE_W, SAMPLE_H).data;
    var n = SAMPLE_W * SAMPLE_H;
    var sumR = 0;
    var sumG = 0;
    var sumB = 0;
    var sumL = 0;
    var sumL2 = 0;
    var dark = 0;
    var bright = 0;
    var warm = 0;
    var cool = 0;
    var edge = 0;
    var leftDark = 0;
    var rightDark = 0;
    var topBright = 0;

    for (var i = 0; i < data.length; i += 4) {
      var r = data[i];
      var g = data[i + 1];
      var b = data[i + 2];
      var lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      sumR += r;
      sumG += g;
      sumB += b;
      sumL += lum;
      sumL2 += lum * lum;
      if (lum < 45) dark++;
      if (lum > 210) bright++;
      if (r > b + 12) warm++;
      if (b > r + 12) cool++;
    }

    for (var y = 1; y < SAMPLE_H - 1; y++) {
      for (var x = 1; x < SAMPLE_W - 1; x++) {
        var idx = (y * SAMPLE_W + x) * 4;
        var lum = 0.2126 * data[idx] + 0.7152 * data[idx + 1] + 0.0722 * data[idx + 2];
        var idxR = ((y * SAMPLE_W + (x + 1)) * 4);
        var lumR = 0.2126 * data[idxR] + 0.7152 * data[idxR + 1] + 0.0722 * data[idxR + 2];
        if (Math.abs(lum - lumR) > 28) edge++;
        if (x < SAMPLE_W * 0.15 && lum < 55) leftDark++;
        if (x > SAMPLE_W * 0.85 && lum < 55) rightDark++;
        if (y < SAMPLE_H * 0.2 && lum > 175) topBright++;
      }
    }

    var meanL = sumL / n;
    var variance = sumL2 / n - meanL * meanL;
    var contrast = Math.sqrt(Math.max(0, variance));
    var laplacianSum = 0;
    var laplacianN = 0;

    for (var yi = 1; yi < SAMPLE_H - 1; yi++) {
      for (var xi = 1; xi < SAMPLE_W - 1; xi++) {
        var id = (yi * SAMPLE_W + xi) * 4;
        var lumC = 0.2126 * data[id] + 0.7152 * data[id + 1] + 0.0722 * data[id + 2];
        var idL = ((yi * SAMPLE_W + (xi - 1)) * 4);
        var idR = ((yi * SAMPLE_W + (xi + 1)) * 4);
        var idU = (((yi - 1) * SAMPLE_W + xi) * 4);
        var idD = (((yi + 1) * SAMPLE_W + xi) * 4);
        var lumL = 0.2126 * data[idL] + 0.7152 * data[idL + 1] + 0.0722 * data[idL + 2];
        var lumR2 = 0.2126 * data[idR] + 0.7152 * data[idR + 1] + 0.0722 * data[idR + 2];
        var lumU = 0.2126 * data[idU] + 0.7152 * data[idU + 1] + 0.0722 * data[idU + 2];
        var lumD = 0.2126 * data[idD] + 0.7152 * data[idD + 1] + 0.0722 * data[idD + 2];
        laplacianSum += Math.abs(4 * lumC - lumL - lumR2 - lumU - lumD);
        laplacianN++;
      }
    }

    var lapVar = laplacianN ? laplacianSum / laplacianN : 0;

    return {
      width: iw,
      height: ih,
      aspectRatio: iw / ih,
      orientation: iw > ih * 1.15 ? "landscape" : ih > iw * 1.15 ? "portrait" : "square",
      brightness: meanL,
      contrast: contrast,
      warmth: warm / n,
      coolness: cool / n,
      darkFraction: dark / n,
      brightFraction: bright / n,
      edgeDensity: edge / n,
      vignetteLeft: leftDark / n,
      vignetteRight: rightDark / n,
      skyBrightness: topBright / (SAMPLE_W * SAMPLE_H * 0.2),
      dominantWarm: sumR > sumB * 1.08,
      blurEstimate: clamp(100 - lapVar * 1.8, 0, 100),
      highlightClip: bright / n,
      shadowClip: dark / n
    };
  }

  global.PhotoCoachPixelSampler = {
    sampleFromImage: sampleFromImage
  };
})(window);
