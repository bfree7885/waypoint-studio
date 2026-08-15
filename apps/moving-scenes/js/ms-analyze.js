/**
 * Waypoint Moving Scenes — on-device motion opportunity analysis
 * Soft regional masks + multi-cue confidence. Never invents weather or stars.
 * Prefer NO MOTION when confidence is weak.
 * Governing rule: when Waypoint does not know what it is looking at, it does not move it.
 */
(function (global) {
  "use strict";

  /**
   * Analysis long edge. 160 was too coarse for outdoor stills (sky/fog/cloud-sea → water).
   * 320 is the smallest edge that materially improves texture/sky cues without full-res cost.
   * Aspect preserved; SAMPLE_W/H remain API aliases for the target box.
   */
  var ANALYZE_LONG_EDGE = 320;
  var SAMPLE_W = 320;
  var SAMPLE_H = 213;
  /** Minimum class confidence for automatic Waypoint Choice animation */
  var AUTO_CONFIDENCE = 0.42;
  /** Soft cap — never claim 100% from saturated heuristics alone */
  var CONF_CAP = 0.92;

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

  /** Approximate hue degrees 0–360; gray → -1 */
  function hueDeg(r, g, b) {
    var max = Math.max(r, g, b);
    var min = Math.min(r, g, b);
    var d = max - min;
    if (d < 1e-3) return -1;
    var h;
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
    return h;
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
      foliage: new Float32Array(w * h),
      sky: new Float32Array(w * h)
    };
  }

  /**
   * Per-pixel material cues. Water is NOT “blue + smooth” alone —
   * sky/fog/cloud-sea/boardwalk share that look and must be excluded upstream.
   */
  function classifyPixel(r, g, b, y, h, localContrast, edgeMag) {
    var L = luma(r, g, b);
    var S = sat(r, g, b);
    var H = hueDeg(r, g, b);
    var band = bandForY(y, h);
    var yn = y / Math.max(h - 1, 1);

    var coolBlue =
      H >= 175 && H <= 255 && S > 0.08 && S < 0.72 && L > 28 && L < 210;
    var coolCyan =
      H >= 160 && H < 200 && S > 0.1 && S < 0.65 && L > 35 && L < 200;

    // Sky: blue, gray overcast, pale cloudy, warm sunset tops — all top-biased
    var skyBlue =
      coolBlue &&
      L > 90 &&
      S < 0.55 &&
      yn < 0.55 &&
      (band === "top" || band === "upperMid" || (band === "mid" && L > 140));
    var skyGray =
      L > 155 &&
      S < 0.12 &&
      Math.abs(r - g) < 16 &&
      Math.abs(g - b) < 20 &&
      yn < 0.4 &&
      localContrast < 22;
    var skyWarm =
      yn < 0.4 &&
      L > 110 &&
      S > 0.08 &&
      S < 0.45 &&
      ((H >= 10 && H <= 55) || (H >= 0 && H < 25) || H > 330);
    var skyish = skyBlue || skyGray || skyWarm;

    // Clouds / cloud-sea: soft bright low-sat with weak local edges (not hard terrain).
    // Mid/lower soft vapor (cloud-sea in valleys) must count as cloud, not lake.
    var cloudish =
      L > 155 &&
      S < 0.22 &&
      localContrast < 28 &&
      (band === "top" ||
        band === "upperMid" ||
        band === "mid" ||
        (band === "lowerMid" && L > 165 && S < 0.18) ||
        (band === "bottom" && L > 180 && S < 0.14 && localContrast < 16));

    // Fog/haze: veiling — mid luma, very low sat, low contrast, not pure sky top / textured ridge
    var fogish =
      L > 125 &&
      L < 210 &&
      S < 0.12 &&
      localContrast < 14 &&
      edgeMag < 18 &&
      yn > 0.1 &&
      !(yn < 0.32 && L > 190);
    var hazeish =
      L > 105 &&
      L < 195 &&
      S < 0.16 &&
      Math.abs(r - g) < 18 &&
      Math.abs(g - b) < 22 &&
      localContrast < 20 &&
      yn > 0.1;

    var foliage =
      g > r + 10 && g > b && S > 0.18 && L > 30 && L < 170;
    var grassWarm =
      g > r && g > b && S > 0.22 && L > 45 && L < 175 && yn > 0.35;
    var mountain =
      S < 0.28 &&
      L > 40 &&
      L < 160 &&
      Math.abs(r - g) < 28 &&
      Math.abs(r - b) < 34 &&
      (band === "upperMid" || band === "mid") &&
      // Flat veiling is fog, not rock face
      localContrast > 5;
    var rock =
      S < 0.25 &&
      L > 28 &&
      L < 145 &&
      Math.abs(r - g) < 22 &&
      (band === "lowerMid" || band === "bottom" || band === "mid") &&
      localContrast > 4;
    var woodBoard =
      yn > 0.5 &&
      L > 70 &&
      L < 165 &&
      S > 0.18 &&
      S < 0.5 &&
      H >= 18 &&
      H <= 55 &&
      r > g + 6 &&
      r > b + 18 &&
      localContrast > 8;
    var building =
      S < 0.15 && L > 50 && L < 130 && Math.abs(r - g) < 12 && edgeMag > 18;
    var snowish = L > 200 && S < 0.16 && localContrast < 20;

    // Wildlife: warm fur/feathers with enough chroma — NOT gray/brown rock or mud.
    // Centers of subjects are often smooth; do not require high local contrast everywhere.
    var wildlifeFur =
      r > g + 22 &&
      r > b + 18 &&
      S > 0.34 &&
      L > 60 &&
      L < 175 &&
      H >= 5 &&
      H <= 55 &&
      !(L < 120 && S < 0.42);

    /**
     * Water candidate (raw): cool hue + not foliage/wood + mid-lower preferred.
     * Sky/fog/cloud vetoes applied after neighborhood pass.
     */
    var waterHueOk = coolBlue || coolCyan;
    // Reject soft bright vapor (cloud-sea / fog) posing as blue water
    var vaporNotWater =
      L > 150 && S < 0.2 && localContrast < 22;
    var waterish =
      waterHueOk &&
      !foliage &&
      !grassWarm &&
      !woodBoard &&
      !vaporNotWater &&
      L > 30 &&
      L < 200 &&
      S > 0.06 &&
      S <= 0.72 &&
      yn > 0.18 &&
      !(yn < 0.32 && L > 150 && S < 0.35) &&
      // Prefer some texture or mid chroma — flat pale blue is usually sky/vapor
      !(L > 140 && S < 0.18 && localContrast < 12);

    return {
      sky: skyish,
      clouds: cloudish || (skyish && L > 155 && S < 0.22),
      water: waterish,
      fog: fogish,
      haze: hazeish && !skyish,
      foliage: foliage || grassWarm,
      mountain: mountain,
      rock: rock,
      snow: snowish,
      wildlife: wildlifeFur,
      building: building,
      wood: woodBoard,
      L: L,
      S: S,
      H: H,
      yn: yn,
      localContrast: localContrast,
      edgeMag: edgeMag
    };
  }

  function localStats(data, w, h, x, y) {
    var i0 = (y * w + x) * 4;
    var L0 = luma(data[i0], data[i0 + 1], data[i0 + 2]);
    var sum = 0;
    var n = 0;
    var edge = 0;
    var dx;
    var dy;
    for (dy = -1; dy <= 1; dy++) {
      for (dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        var xx = x + dx;
        var yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        var j = (yy * w + xx) * 4;
        var L = luma(data[j], data[j + 1], data[j + 2]);
        sum += Math.abs(L - L0);
        n++;
        if (Math.abs(dx) + Math.abs(dy) === 1) {
          edge = Math.max(edge, Math.abs(L - L0));
        }
      }
    }
    return {
      contrast: n ? sum / n : 0,
      edge: edge
    };
  }

  function meanMask(buf) {
    var s = 0;
    var i;
    for (i = 0; i < buf.length; i++) s += buf[i];
    return s / Math.max(buf.length, 1);
  }

  function overlapFrac(a, b, threshA, threshB) {
    var both = 0;
    var aN = 0;
    var i;
    for (i = 0; i < a.length; i++) {
      if (a[i] >= threshA) {
        aN++;
        if (b[i] >= threshB) both++;
      }
    }
    return aN ? both / aN : 0;
  }

  function largestComponentFrac(buf, w, h, thresh) {
    var seen = new Uint8Array(w * h);
    var best = 0;
    var total = 0;
    var i;
    for (i = 0; i < buf.length; i++) if (buf[i] >= thresh) total++;
    if (!total) return 0;
    var stack = [];
    for (i = 0; i < buf.length; i++) {
      if (buf[i] < thresh || seen[i]) continue;
      var size = 0;
      stack.length = 0;
      stack.push(i);
      seen[i] = 1;
      while (stack.length) {
        var cur = stack.pop();
        size++;
        var cx = cur % w;
        var cy = (cur / w) | 0;
        var n4 = [cur - 1, cur + 1, cur - w, cur + w];
        var k;
        for (k = 0; k < 4; k++) {
          var ni = n4[k];
          if (ni < 0 || ni >= buf.length || seen[ni]) continue;
          var nx = ni % w;
          var ny = (ni / w) | 0;
          if (Math.abs(nx - cx) + Math.abs(ny - cy) !== 1) continue;
          if (buf[ni] < thresh) continue;
          seen[ni] = 1;
          stack.push(ni);
        }
      }
      if (size > best) best = size;
    }
    return best / total;
  }

  function verticalCentroid(buf, w, h, thresh) {
    var sumY = 0;
    var n = 0;
    var i;
    for (i = 0; i < buf.length; i++) {
      if (buf[i] < thresh) continue;
      sumY += (i / w) | 0;
      n++;
    }
    return n ? sumY / n / Math.max(h - 1, 1) : 0.5;
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
      sky: 0,
      wood: 0
    };
    var i;
    var x;
    var y;
    var n = 0;
    var rawWater = new Float32Array(w * h);
    var rawFog = new Float32Array(w * h);
    var rawCloud = new Float32Array(w * h);
    var rawSky = new Float32Array(w * h);

    for (y = 0; y < h; y++) {
      for (x = 0; x < w; x++) {
        i = (y * w + x) * 4;
        if (data[i + 3] < 16) continue;
        var stats = localStats(data, w, h, x, y);
        var flags = classifyPixel(
          data[i],
          data[i + 1],
          data[i + 2],
          y,
          h,
          stats.contrast,
          stats.edge
        );
        var idx = y * w + x;
        n++;

        if (flags.sky) {
          rawSky[idx] = 1;
          totals.sky += 1;
        }
        if (flags.clouds || flags.sky) {
          rawCloud[idx] = flags.clouds ? 1 : 0.4;
          totals.clouds += rawCloud[idx];
        }
        if (flags.water) {
          rawWater[idx] = 1;
          totals.water += 1;
        }
        if (flags.fog) {
          rawFog[idx] = 1;
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
        if (flags.wood) totals.wood += 1;
        if (flags.mountain || flags.rock || flags.building || flags.foliage || flags.wood) {
          masks.stable[idx] = Math.max(
            masks.stable[idx],
            flags.mountain
              ? 1
              : flags.rock
                ? 0.95
                : flags.building
                  ? 0.92
                  : flags.wood
                    ? 0.9
                    : 0.55
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

    // --- Semantic water gate: suppress sky / fog / cloud-sea / scatter ---
    for (i = 0; i < w * h; i++) {
      var wy = ((i / w) | 0) / Math.max(h - 1, 1);
      var skyNear = rawSky[i] > 0.5 || rawCloud[i] > 0.55;
      var fogNear = rawFog[i] > 0.5;
      var stableHard = masks.stable[i] > 0.7;
      var foliageHard = masks.foliage[i] > 0.5;

      // Top / upper sky band: water almost never
      if (wy < 0.28 && skyNear) rawWater[i] = 0;
      if (wy < 0.18) rawWater[i] *= 0.05;

      // Cloud material or fog veiling is not a lake
      if (rawCloud[i] > 0.55) {
        // soft vapor / cloud-sea: kill water wherever cloud cue is strong
        rawWater[i] *= 0.08;
      }
      if (fogNear && rawWater[i] > 0) {
        rawWater[i] = 0;
      }
      if (foliageHard || stableHard) rawWater[i] *= 0.15;
    }

    // Copy gated masks
    for (i = 0; i < w * h; i++) {
      masks.water[i] = rawWater[i];
      masks.fog[i] = rawFog[i];
      masks.clouds[i] = rawCloud[i];
      masks.sky[i] = rawSky[i];
    }

    // Recompute water/fog/cloud totals after gate
    totals.water = 0;
    totals.fog = 0;
    totals.clouds = 0;
    for (i = 0; i < w * h; i++) {
      totals.water += masks.water[i] >= 0.5 ? 1 : 0;
      totals.fog += masks.fog[i] >= 0.5 ? 1 : 0;
      totals.clouds += masks.clouds[i];
    }

    soften(masks.clouds, w, h);
    soften(masks.water, w, h);
    soften(masks.fog, w, h);
    soften(masks.haze, w, h);
    soften(masks.sky, w, h);
    soften(masks.wildlife, w, h);
    expand(masks.wildlife, w, h, 2);
    expand(masks.stable, w, h, 1);

    // Region consistency: scatter water masks → weaken
    var waterConn = largestComponentFrac(masks.water, w, h, 0.35);
    if (waterConn < 0.35) {
      for (i = 0; i < w * h; i++) masks.water[i] *= 0.25;
    }

    // Class competition at pixel level
    for (i = 0; i < w * h; i++) {
      var lock = Math.max(masks.wildlife[i], masks.stable[i] * 0.9);
      masks.clouds[i] *= 1 - lock;
      masks.water[i] *= 1 - Math.max(masks.wildlife[i], masks.stable[i] * 0.55);
      masks.fog[i] *= 1 - Math.max(masks.wildlife[i], masks.stable[i] * 0.35);
      masks.haze[i] *= 1 - masks.wildlife[i];

      // incompatible: strong fog vs water — fog wins when both present
      if (masks.fog[i] > 0.45 && masks.water[i] > 0.35) {
        masks.water[i] *= 0.1;
      }
      // strong sky/cloud vs water
      if (masks.sky[i] > 0.5 && masks.water[i] > 0.3) {
        masks.water[i] *= 0.08;
      }
      if (masks.clouds[i] > 0.65 && masks.water[i] > 0.3 && masks.sky[i] > 0.25) {
        masks.water[i] *= 0.12;
      }
      if (masks.stable[i] > 0.6) masks.clouds[i] *= 0.05;
    }

    var denom = Math.max(n, 1);
    var coverage = {
      clouds: meanMask(masks.clouds),
      water: meanMask(masks.water),
      fog: meanMask(masks.fog),
      haze: meanMask(masks.haze),
      foliage: totals.foliage / denom,
      mountain: totals.mountain / denom,
      rock: totals.rock / denom,
      wildlife: meanMask(masks.wildlife),
      snow: totals.snow / denom,
      sky: meanMask(masks.sky),
      wood: totals.wood / denom,
      waterConnectivity: waterConn,
      waterCentroidY: verticalCentroid(masks.water, w, h, 0.35)
    };

    var waterSkyOverlap = overlapFrac(masks.water, masks.sky, 0.35, 0.4);
    var waterCloudOverlap = overlapFrac(masks.water, masks.clouds, 0.35, 0.45);
    var waterFogOverlap = overlapFrac(masks.water, masks.fog, 0.35, 0.4);
    var fogSky = coverage.fog;
    var evidence = {
      waterSkyOverlap: waterSkyOverlap,
      waterCloudOverlap: waterCloudOverlap,
      waterFogOverlap: waterFogOverlap,
      waterConnectivity: waterConn,
      waterCentroidY: coverage.waterCentroidY
    };

    var confidence = {
      clouds: scoreClouds(coverage, evidence),
      water: scoreWater(coverage, evidence),
      fog: scoreFog(coverage, evidence),
      haze: scoreHaze(coverage),
      foliage: clamp(coverage.foliage * 1.2, 0, 1) * 0.35,
      grass: 0.1,
      rain: 0,
      snow: coverage.snow > 0.35 ? 0.25 : 0,
      light: 0.05,
      stars: 0,
      parallax: coverage.mountain > 0.12 && coverage.sky > 0.15 ? 0.2 : 0.05
    };

    // Global class competition on confidence
    confidence = resolveClassCompetition(confidence, coverage, evidence);

    var waterType = inferWaterType(coverage, confidence);
    var wildlifeProtected = decideWildlifeProtected(coverage, masks);

    return {
      sampleWidth: w,
      sampleHeight: h,
      analyzeLongEdge: ANALYZE_LONG_EDGE,
      coverage: coverage,
      confidence: confidence,
      evidence: evidence,
      waterType: waterType,
      masks: masks,
      autoThreshold: AUTO_CONFIDENCE,
      wildlifeProtected: wildlifeProtected
    };
  }

  function scoreClouds(cov) {
    if (cov.sky < 0.06 && cov.clouds < 0.04) return 0.05;
    var base = clamp(cov.clouds * 1.85 + cov.sky * 0.4, 0, CONF_CAP);
    if (cov.clouds + cov.sky < 0.1) return clamp(base * 0.3, 0, 1);
    // Prefer textured cloud material over empty blue sky alone
    if (cov.clouds < 0.06 && cov.sky > 0.2) base *= 0.55;
    return clamp(base, 0, CONF_CAP);
  }

  /**
   * Water confidence: multi-cue. Coverage alone cannot reach 1.0.
   * Contradictions (sky/fog/cloud overlap, top centroid, scatter) subtract hard.
   */
  function scoreWater(cov, ev) {
    if (cov.water < 0.05) return 0.03;
    var base = clamp(0.12 + cov.water * 1.45, 0, 0.88);
    // Small cool patches in sky scenes must stay below auto threshold
    if (cov.water < 0.12) base *= 0.55;
    if (cov.water < 0.16 && cov.sky > 0.3) base -= 0.18;
    if (cov.waterConnectivity >= 0.55) base += 0.06;
    else if (cov.waterConnectivity < 0.35) base -= 0.22;
    if (cov.waterCentroidY > 0.45 && cov.waterCentroidY < 0.88) base += 0.05;
    if (cov.waterCentroidY < 0.32) base -= 0.35;
    if (ev.waterSkyOverlap > 0.25) base -= 0.4 * ev.waterSkyOverlap;
    if (ev.waterCloudOverlap > 0.35) base -= 0.45 * ev.waterCloudOverlap;
    if (ev.waterFogOverlap > 0.25) base -= 0.5 * ev.waterFogOverlap;
    if (cov.sky > 0.28 && cov.waterCentroidY < 0.45) base -= 0.25;
    if (cov.foliage > 0.35 && cov.water < 0.2) base -= 0.2;
    if (cov.wood > 0.04) base -= 0.18;
    if (cov.fog > 0.12 && cov.water < 0.22) base -= 0.28;
    return clamp(base, 0, CONF_CAP);
  }

  function scoreFog(cov) {
  // Prefer broader fog scoring so genuine mist clears AUTO_CONFIDENCE
  if (cov.fog < 0.05) return 0.06;
  var base = clamp(0.15 + cov.fog * 2.25, 0, 0.88);
  if (cov.foliage > 0.15 && cov.fog > 0.08) base += 0.1; // mist among trees
  if (cov.sky > 0.35 && cov.fog < 0.1) base *= 0.4;
  if (cov.water > 0.25 && cov.fog < 0.12) base *= 0.5;
  return clamp(base, 0, CONF_CAP);
}

  function scoreHaze(cov) {
    if (cov.haze < 0.12) return 0.05;
    return clamp(0.1 + cov.haze * 1.4, 0, 0.7);
  }

  function resolveClassCompetition(conf, cov, ev) {
    var out = Object.assign({}, conf);
    // Water vs sky/cloud: if water heavily overlaps sky/cloud material, drop water
    if (
      out.water >= AUTO_CONFIDENCE &&
      (ev.waterSkyOverlap > 0.3 ||
        ev.waterCloudOverlap > 0.45 ||
        (cov.sky > 0.25 && cov.waterCentroidY < 0.4))
    ) {
      out.water = Math.min(out.water, 0.28);
    }
    // Fog vs water: if fog evidence is real, suppress lake claim
    if (out.fog >= 0.28 && out.water >= AUTO_CONFIDENCE && cov.fog >= 0.08) {
      if (out.fog + 0.05 >= out.water * 0.55 || ev.waterFogOverlap > 0.2) {
        out.water = Math.min(out.water, 0.3);
      }
    }
    // Fog vs clouds among trees: prefer fog when foliage+fog, weak sky
    if (cov.fog > 0.08 && cov.foliage > 0.18 && cov.sky < 0.22) {
      out.fog = Math.max(out.fog, clamp(0.35 + cov.fog * 1.2, 0, CONF_CAP));
      if (out.clouds > out.fog) out.clouds = Math.min(out.clouds, out.fog * 0.85);
    }
    // Cloud-sea / vapor: bright soft sky+cloud mass — not a lake under open sky alone
    if (
      (out.clouds >= 0.4 || cov.sky > 0.2) &&
      cov.clouds > 0.1 &&
      cov.water > 0.15 &&
      (ev.waterCloudOverlap > 0.15 || (cov.fog > 0.05 && cov.foliage < 0.05))
    ) {
      out.water = Math.min(out.water, 0.28);
    }
    // Mountain valley cloud-sea: sky + soft vapor band + almost no foliage,
    // and water mask sits where cloud coverage is also material (or foggy)
    if (
      cov.sky > 0.25 &&
      cov.water > 0.25 &&
      cov.foliage < 0.05 &&
      cov.clouds > 0.15 &&
      (cov.fog > 0.04 || ev.waterCloudOverlap > 0.08 || cov.waterCentroidY < 0.48)
    ) {
      out.water = Math.min(out.water, 0.24);
    }
    // If water still high but connectivity poor → refuse
    if (cov.waterConnectivity < 0.4 && out.water > 0.35) {
      out.water = Math.min(out.water, 0.32);
    }
    return out;
  }

  function inferWaterType(cov, conf) {
    if (!conf || conf.water < AUTO_CONFIDENCE) return "none";
    if (cov.water > 0.28) return "lake";
    if (cov.water > 0.12) return "river";
    return "pool";
  }

  /**
   * Wildlife protect: conservative. Prefer false-neg over animating animals.
   * Dark rocks must NOT trigger. Compact warm mid-frame subjects may protect
   * without claiming reliable wildlife detection.
   */
  function decideWildlifeProtected(cov, masks) {
    // Dominant water scenes: do not claim wildlife from warm mud / pads
    if (cov.water > 0.28 && cov.wildlife < 0.07) return false;
    if (cov.rock > 0.25 && cov.wildlife < 0.05) return false;
    if (cov.wildlife >= 0.045 && cov.rock < 0.3) return true;
    // Compact warm blob: coverage modest but concentrated (bird/mammal subject)
    if (cov.wildlife >= 0.015 && cov.wildlife < 0.045) {
      var conn = largestComponentFrac(masks.wildlife, masks.width, masks.height, 0.4);
      var cy = verticalCentroid(masks.wildlife, masks.width, masks.height, 0.4);
      if (conn >= 0.5 && cy > 0.28 && cy < 0.82 && cov.rock < 0.35 && cov.water < 0.2) return true;
    }
    return false;
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

  function downsampleToImageData(img, maxLongEdge) {
    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    if (!iw || !ih) return null;
    var longEdge = maxLongEdge || ANALYZE_LONG_EDGE;
    var scale = Math.min(1, longEdge / Math.max(iw, ih));
    var w = Math.max(8, Math.round(iw * scale));
    var h = Math.max(8, Math.round(ih * scale));
    var canvas =
      typeof OffscreenCanvas !== "undefined"
        ? new OffscreenCanvas(w, h)
        : document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    var ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    return ctx.getImageData(0, 0, w, h);
  }

  /** Legacy box downsample kept for tests that pass explicit maxW/maxH */
  function downsampleToBox(img, maxW, maxH) {
    var iw = img.naturalWidth || img.width;
    var ih = img.naturalHeight || img.height;
    if (!iw || !ih) return null;
    var scale = Math.min(1, maxW / iw, maxH / ih);
    var w = Math.max(8, Math.round(iw * scale));
    var h = Math.max(8, Math.round(ih * scale));
    var canvas =
      typeof OffscreenCanvas !== "undefined"
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
      imageData = downsampleToImageData(imgOrCanvas, ANALYZE_LONG_EDGE);
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
    ANALYZE_LONG_EDGE: ANALYZE_LONG_EDGE,
    SAMPLE_W: SAMPLE_W,
    SAMPLE_H: SAMPLE_H,
    CONF_CAP: CONF_CAP,
    analyzeSource: analyzeSource,
    analyzeImageData: analyzeImageData,
    downsampleToImageData: downsampleToImageData,
    downsampleToBox: downsampleToBox,
    resizeMask: resizeMask
  };
})(typeof window !== "undefined" ? window : globalThis);
