/**
 * Waypoint Auto Edit — image signals from real pixels + optional EXIF/Coach.
 * Never fabricates metadata.
 */
(function (global) {
  "use strict";

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function luma(r, g, b) {
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * @param {ImageData} imageData
   * @param {object} [meta] { exif, coachObservations, outdoor }
   */
  function analyze(imageData, meta) {
    meta = meta || {};
    var d = imageData.data;
    var w = imageData.width;
    var h = imageData.height;
    var n = (w * h) || 1;
    var step = Math.max(1, Math.floor(n / 120000)); // subsample large frames

    var hist = new Array(16).fill(0);
    var sumL = 0, sumL2 = 0;
    var dark = 0, bright = 0, nearBlack = 0, nearWhite = 0;
    var sumR = 0, sumG = 0, sumB = 0;
    var satSum = 0, warm = 0, cool = 0;
    var greenDom = 0, blueDom = 0, orangeBias = 0;
    var edgeAcc = 0, edgeN = 0;
    var noiseAcc = 0, noiseN = 0;
    var skyTopBright = 0, skyTopN = 0;
    var sampled = 0;

    for (var y = 0; y < h; y += Math.max(1, Math.floor(Math.sqrt(step)))) {
      for (var x = 0; x < w; x += Math.max(1, Math.floor(Math.sqrt(step)))) {
        var i = (y * w + x) * 4;
        var r = d[i], g = d[i + 1], b = d[i + 2];
        var L = luma(r, g, b);
        sumL += L;
        sumL2 += L * L;
        hist[clamp(Math.floor(L / 16), 0, 15)]++;
        if (L < 28) dark++;
        if (L > 230) bright++;
        if (L < 8) nearBlack++;
        if (L > 250) nearWhite++;
        sumR += r; sumG += g; sumB += b;
        var maxc = Math.max(r, g, b) || 1;
        var minc = Math.min(r, g, b);
        var sat = (maxc - minc) / maxc;
        satSum += sat;
        if (r > b + 12) warm++;
        if (b > r + 12) cool++;
        if (g >= r && g >= b && sat > 0.12) greenDom++;
        if (b >= r && b >= g && L > 90) blueDom++;
        if (r > g && g > b && r - b > 30 && L > 40 && L < 200) orangeBias++;
        if (y < h * 0.28) {
          skyTopBright += L;
          skyTopN++;
        }
        // local edge + noise via neighbor
        if (x + 1 < w && y + 1 < h) {
          var i2 = (y * w + (x + 1)) * 4;
          var i3 = ((y + 1) * w + x) * 4;
          var L2 = luma(d[i2], d[i2 + 1], d[i2 + 2]);
          var L3 = luma(d[i3], d[i3 + 1], d[i3 + 2]);
          var e = Math.abs(L - L2) + Math.abs(L - L3);
          edgeAcc += e;
          edgeN++;
          noiseAcc += Math.min(e, 18);
          noiseN++;
        }
        sampled++;
      }
    }

    sampled = sampled || 1;
    var meanL = sumL / sampled;
    var variance = Math.max(0, sumL2 / sampled - meanL * meanL);
    var contrast = Math.sqrt(variance);
    var histNorm = hist.map(function (v) { return v / sampled; });
    var darkFraction = dark / sampled;
    var brightFraction = bright / sampled;
    var clipHigh = nearWhite / sampled;
    var clipLow = nearBlack / sampled;
    var avgSat = satSum / sampled;
    var cast = (sumR - sumB) / (sampled * 255);
    var warmth = warm / sampled;
    var coolness = cool / sampled;
    var edgeMean = edgeN ? edgeAcc / edgeN : 0;
    var noiseEst = noiseN ? noiseAcc / noiseN : 0;
    var skyMean = skyTopN ? skyTopBright / skyTopN : meanL;
    var dynamicRange = 0;
    for (var hi = 15; hi >= 0; hi--) if (histNorm[hi] > 0.004) { dynamicRange = hi; break; }
    for (var lo = 0; lo < 16; lo++) if (histNorm[lo] > 0.004) { dynamicRange = dynamicRange - lo; break; }

    var exif = meta.exif || null;
    var iso = exif && exif.iso != null ? exif.iso : null;
    var alreadyGood =
      meanL > 88 && meanL < 168 &&
      contrast > 22 && contrast < 70 &&
      darkFraction < 0.2 && brightFraction < 0.055 &&
      clipHigh < 0.012 && clipLow < 0.02 &&
      avgSat > 0.1 && avgSat < 0.52 &&
      Math.abs(cast) < 0.12 &&
      !((warmth > 0.45 && avgSat > 0.35) || avgSat > 0.55);

    var sceneHints = {
      likelySunset: warmth > 0.45 && meanL > 75 && avgSat > 0.28 && (sumR / sampled) > (sumB / sampled) + 25,
      likelyForest: greenDom / sampled > 0.42 && blueDom / sampled < 0.2,
      likelySnow: meanL > 185 && avgSat < 0.1 && contrast < 35,
      likelyWater: edgeMean < 18 && blueDom / sampled > 0.35 && greenDom / sampled < 0.25,
      likelyFog: contrast < 18 && avgSat < 0.12 && meanL > 100 && meanL < 175 && edgeMean < 14,
      likelyNight: meanL < 48 || (iso != null && iso >= 1600 && meanL < 85),
      likelyWildlife: !!(meta.coachObservations && meta.coachObservations.subjectHint === "wildlife"),
      highDetailFoliage: edgeMean > 52 && greenDom / sampled > 0.28,
      strongSaturation: avgSat > 0.5,
      lowContrastHaze: contrast < 20 && brightFraction < 0.06 && avgSat < 0.2,
      moodyDark: meanL < 70 && contrast > 28 && !alreadyGood,
      monochromeCandidate: avgSat < 0.06
    };

    return {
      width: w,
      height: h,
      sampled: sampled,
      meanLuminance: meanL,
      contrast: contrast,
      histogram: histNorm,
      darkFraction: darkFraction,
      brightFraction: brightFraction,
      clipHigh: clipHigh,
      clipLow: clipLow,
      saturation: avgSat,
      cast: cast,
      warmth: warmth,
      coolness: coolness,
      greenFraction: greenDom / sampled,
      blueFraction: blueDom / sampled,
      orangeFraction: orangeBias / sampled,
      edgeMean: edgeMean,
      noiseEstimate: noiseEst,
      skyMeanLuminance: skyMean,
      dynamicRangeBins: dynamicRange,
      alreadyGood: alreadyGood,
      sceneHints: sceneHints,
      exif: exif ? {
        iso: iso,
        exposureTimeSec: exif.exposureTimeSec != null ? exif.exposureTimeSec : null,
        fNumber: exif.fNumber != null ? exif.fNumber : null,
        whiteBalance: exif.whiteBalance || null
      } : null,
      coachObservations: meta.coachObservations || null,
      outdoor: meta.outdoor || null,
      sourceNotes: buildSourceNotes(meta)
    };
  }

  function buildSourceNotes(meta) {
    var notes = [];
    if (meta.exif) notes.push("EXIF present where available");
    else notes.push("No EXIF used");
    if (meta.coachObservations) notes.push("Coach observations linked");
    if (meta.outdoor) notes.push("Outdoor context linked");
    return notes;
  }

  function measureClipping(imageData) {
    var d = imageData.data;
    var n = d.length / 4;
    var step = Math.max(1, Math.floor(n / 80000));
    var high = 0, low = 0, count = 0;
    for (var i = 0; i < d.length; i += 4 * step) {
      var L = luma(d[i], d[i + 1], d[i + 2]);
      if (L > 250) high++;
      if (L < 8) low++;
      count++;
    }
    count = count || 1;
    return { clipHigh: high / count, clipLow: low / count };
  }

  global.WaypointAutoEditSignals = {
    analyze: analyze,
    measureClipping: measureClipping,
    luma: luma
  };
})(typeof window !== "undefined" ? window : globalThis);
