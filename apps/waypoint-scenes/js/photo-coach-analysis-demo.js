/**
 * Photo Coach — On-device analysis engine v5
 * Browser-only, deterministic, confidence-gated mentoring.
 * Always labeled On-device analysis. Never invents low-confidence critique.
 * Sharpness uses Laplacian + scene ambiguity gates (smooth sky/water, shallow DOF, low light).
 */
(function (global) {
  "use strict";

  var SAMPLE_W = 200;
  var SAMPLE_H = 130;
  var CONF_SHOW = 0.58;
  var CONF_STRONG = 0.72;
  var CONF_SHARPNESS_CLAIM = 0.74;
  var ENGINE_VERSION = "5.0.0";

  /** Map 0–1 confidence to product language. */
  function confidenceTier(value) {
    var v = typeof value === "number" ? value : 0;
    if (v >= 0.72) return "HIGH";
    if (v >= 0.58) return "REASONABLE";
    return "LOW";
  }

  function confidenceLabel(value) {
    var tier = confidenceTier(value);
    if (tier === "HIGH") return "HIGH confidence";
    if (tier === "REASONABLE") return "REASONABLE confidence";
    return "LOW confidence";
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function round(n) {
    return Math.round(n);
  }

  function letterGrade(score) {
    if (score >= 97) return "A+";
    if (score >= 93) return "A";
    if (score >= 90) return "A−";
    if (score >= 87) return "B+";
    if (score >= 83) return "B";
    if (score >= 80) return "B−";
    if (score >= 77) return "C+";
    if (score >= 73) return "C";
    if (score >= 70) return "C−";
    if (score >= 67) return "D+";
    if (score >= 63) return "D";
    return "F";
  }

  function loadImage(url) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error("Could not read image pixels.")); };
      img.src = url;
    });
  }

  function lumAt(data, x, y) {
    var i = (y * SAMPLE_W + x) * 4;
    return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
  }

  function samplePixels(img) {
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
    var sumSat = 0;
    var dark = 0;
    var bright = 0;
    var mid = 0;
    var warm = 0;
    var cool = 0;
    var greenish = 0;
    var bluish = 0;
    var edgeH = 0;
    var edgeV = 0;
    var leftDark = 0;
    var rightDark = 0;
    var topBright = 0;
    var bottomDark = 0;
    var centerL = 0;
    var centerN = 0;
    var edgeL = 0;
    var edgeN = 0;
    var thirds = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    var thirdsN = [0, 0, 0, 0, 0, 0, 0, 0, 0];
    var laplacianSum = 0;
    var laplacianN = 0;
    var histogram = new Array(16).fill(0);
    var colorBins = {};

    for (var i = 0; i < data.length; i += 4) {
      var r = data[i];
      var g = data[i + 1];
      var b = data[i + 2];
      var lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      var maxC = Math.max(r, g, b);
      var minC = Math.min(r, g, b);
      var sat = maxC > 0 ? (maxC - minC) / maxC : 0;
      var px = (i / 4) % SAMPLE_W;
      var py = Math.floor((i / 4) / SAMPLE_W);
      sumR += r;
      sumG += g;
      sumB += b;
      sumL += lum;
      sumL2 += lum * lum;
      sumSat += sat;
      if (lum < 45) dark++;
      else if (lum > 210) bright++;
      else mid++;
      if (r > b + 12) warm++;
      if (b > r + 12) cool++;
      if (g > r + 8 && g > b + 8) greenish++;
      if (b > r + 10 && b > g + 5) bluish++;
      histogram[clamp(Math.floor(lum / 16), 0, 15)]++;
      var bin = Math.floor(r / 64) + "-" + Math.floor(g / 64) + "-" + Math.floor(b / 64);
      colorBins[bin] = (colorBins[bin] || 0) + 1;

      var tx = px < SAMPLE_W / 3 ? 0 : px < (2 * SAMPLE_W) / 3 ? 1 : 2;
      var ty = py < SAMPLE_H / 3 ? 0 : py < (2 * SAMPLE_H) / 3 ? 1 : 2;
      var t = ty * 3 + tx;
      thirds[t] += lum;
      thirdsN[t]++;

      var inCenter = px > SAMPLE_W * 0.3 && px < SAMPLE_W * 0.7 && py > SAMPLE_H * 0.3 && py < SAMPLE_H * 0.7;
      if (inCenter) {
        centerL += lum;
        centerN++;
      } else {
        edgeL += lum;
        edgeN++;
      }
    }

    for (var y = 1; y < SAMPLE_H - 1; y++) {
      for (var x = 1; x < SAMPLE_W - 1; x++) {
        var lumC = lumAt(data, x, y);
        var lumR = lumAt(data, x + 1, y);
        var lumD = lumAt(data, x, y + 1);
        var lumL = lumAt(data, x - 1, y);
        var lumU = lumAt(data, x, y - 1);
        if (Math.abs(lumC - lumR) > 28) edgeH++;
        if (Math.abs(lumC - lumD) > 28) edgeV++;
        if (x < SAMPLE_W * 0.15 && lumC < 55) leftDark++;
        if (x > SAMPLE_W * 0.85 && lumC < 55) rightDark++;
        if (y < SAMPLE_H * 0.2 && lumC > 175) topBright++;
        if (y > SAMPLE_H * 0.75 && lumC < 70) bottomDark++;
        var lap = Math.abs(4 * lumC - lumL - lumR - lumU - lumD);
        laplacianSum += lap;
        laplacianN++;
      }
    }

    var meanL = sumL / n;
    var variance = sumL2 / n - meanL * meanL;
    var contrast = Math.sqrt(Math.max(0, variance));
    var lapMean = laplacianN ? laplacianSum / laplacianN : 0;
    var blurScore = clamp(100 - lapMean * 1.8, 0, 100);
    var edgeCells = (SAMPLE_W - 2) * (SAMPLE_H - 2);

    var dominant = Object.keys(colorBins).sort(function (a, b) {
      return colorBins[b] - colorBins[a];
    }).slice(0, 3).map(function (k) {
      var p = k.split("-").map(Number);
      if (p[1] > p[0] && p[1] > p[2]) return "natural green";
      if (p[2] > p[0] && p[2] > p[1]) return "sky blue";
      if (p[0] > p[2]) return "warm earth";
      return "neutral midtones";
    });

    var thirdMeans = thirds.map(function (v, idx) {
      return thirdsN[idx] ? v / thirdsN[idx] : meanL;
    });
    var thirdMax = Math.max.apply(null, thirdMeans);
    var thirdMin = Math.min.apply(null, thirdMeans);
    var subjectThird = thirdMeans.indexOf(thirdMax);
    var leftWeight = (thirdMeans[0] + thirdMeans[3] + thirdMeans[6]) / 3;
    var rightWeight = (thirdMeans[2] + thirdMeans[5] + thirdMeans[8]) / 3;
    var topWeight = (thirdMeans[0] + thirdMeans[1] + thirdMeans[2]) / 3;
    var bottomWeight = (thirdMeans[6] + thirdMeans[7] + thirdMeans[8]) / 3;

    return {
      width: iw,
      height: ih,
      aspectRatio: iw / ih,
      orientation: iw > ih * 1.15 ? "landscape" : ih > iw * 1.15 ? "portrait" : "square",
      isPanoramic: iw / ih > 2.2,
      brightness: meanL,
      contrast: contrast,
      saturation: sumSat / n,
      warmth: warm / n,
      coolness: cool / n,
      greenFraction: greenish / n,
      blueFraction: bluish / n,
      darkFraction: dark / n,
      brightFraction: bright / n,
      midFraction: mid / n,
      edgeDensity: (edgeH + edgeV) / (2 * edgeCells),
      edgeHorizontal: edgeH / edgeCells,
      edgeVertical: edgeV / edgeCells,
      vignetteLeft: leftDark / n,
      vignetteRight: rightDark / n,
      skyBrightness: topBright / (SAMPLE_W * SAMPLE_H * 0.2),
      foregroundDark: bottomDark / n,
      centerBrightness: centerN ? centerL / centerN : meanL,
      edgeBrightness: edgeN ? edgeL / edgeN : meanL,
      subjectEmphasis: (centerN && edgeN)
        ? Math.abs((centerL / centerN) - (edgeL / edgeN)) / 255
        : 0,
      thirdMeans: thirdMeans,
      subjectThird: subjectThird,
      leftRightBalance: Math.abs(leftWeight - rightWeight) / 255,
      topBottomBalance: Math.abs(topWeight - bottomWeight) / 255,
      tonalSpread: (thirdMax - thirdMin) / 255,
      dominantWarm: sumR > sumB * 1.08,
      histogram: histogram.map(function (v) { return v / n; }),
      dominantColors: dominant,
      blurEstimate: blurScore,
      laplacianMean: lapMean,
      highlightClip: bright / n,
      shadowClip: dark / n,
      megapixels: round((iw * ih) / 1000000 * 10) / 10,
      dynamicRangeProxy: clamp(1 - (bright / n + dark / n) * 1.4, 0, 1)
    };
  }

  function conf(value) {
    return clamp(value, 0, 1);
  }

  /**
   * Sharpness / blur honesty gate.
   * Downsample Laplacian is a coarse proxy — never claim "blurry" when the scene
   * is naturally smooth, likely shallow DOF, or low-light noisy.
   */
  function assessSharpness(signals, exif) {
    signals = signals || {};
    exif = exif || {};
    var score = signals.blurEstimate != null ? signals.blurEstimate : 50;
    var edge = signals.edgeDensity != null ? signals.edgeDensity : 0;
    var blue = signals.blueFraction != null ? signals.blueFraction : 0;
    var sky = signals.skyBrightness != null ? signals.skyBrightness : 0;
    var bright = signals.brightness != null ? signals.brightness : 128;
    var subject = signals.subjectEmphasis != null ? signals.subjectEmphasis : 0;
    var ambiguities = [];
    var confidence = 0.7;

    var smoothSkyWater = (sky > 0.22 && edge < 0.055) || (blue > 0.18 && edge < 0.06);
    if (smoothSkyWater) {
      ambiguities.push("smooth-sky-or-water");
      confidence -= 0.28;
    }

    var shallowDof =
      (subject > 0.14 && score < 55 && edge > 0.04) ||
      (exif.fNumber != null && exif.fNumber > 0 && exif.fNumber <= 2.8 && subject > 0.08);
    if (shallowDof) {
      ambiguities.push("shallow-depth-of-field");
      confidence -= 0.22;
    }

    var lowLight =
      bright < 48 ||
      (exif.iso != null && exif.iso >= 3200) ||
      (exif.exposureTimeSec != null && exif.exposureTimeSec >= 0.05 && bright < 70);
    if (lowLight) {
      ambiguities.push("low-light");
      confidence -= 0.18;
    }

    var detailedLandscape = edge > 0.11 && score > 48 && (signals.greenFraction || 0) > 0.12;
    if (detailedLandscape && score > 55) {
      confidence = Math.max(confidence, 0.76);
    }

    // Very low edges + soft laplacian: likely textureless scene, not motion blur
    if (edge < 0.035 && score < 45) {
      ambiguities.push("low-texture-scene");
      confidence -= 0.25;
    }

    // Strong edge density with low score supports a soft claim better
    if (score < 38 && edge > 0.07 && !smoothSkyWater) {
      confidence += 0.12;
    }

    confidence = conf(confidence);
    var tier = confidenceTier(confidence);
    var claimSoftness = score < 38 && confidence >= CONF_SHARPNESS_CLAIM && ambiguities.indexOf("smooth-sky-or-water") < 0;
    var softNote = null;
    if (score < 45 && !claimSoftness) {
      if (ambiguities.indexOf("smooth-sky-or-water") >= 0) {
        softNote = "Large smooth areas (sky or water) often look soft in a quick browser check — zoom the subject at 100% before judging focus.";
      } else if (ambiguities.indexOf("shallow-depth-of-field") >= 0) {
        softNote = "Background softness may be intentional depth of field. Check whether the intended plane is crisp at 100%.";
      } else if (ambiguities.indexOf("low-light") >= 0) {
        softNote = "Low light can look soft from noise or shutter — confirm the subject at 100% rather than trusting a thumbnail estimate.";
      } else {
        softNote = "Sharpness is ambiguous from this downsample. Check the subject at 100% before changing settings next time.";
      }
    }

    return {
      score: round(score),
      confidence: confidence,
      confidenceTier: tier,
      confidenceLabel: confidenceLabel(confidence),
      ambiguities: ambiguities,
      claimSoftness: claimSoftness,
      softNote: softNote,
      method: "laplacian-downsample-" + SAMPLE_W + "x" + SAMPLE_H
    };
  }

  function detectGenre(signals, exif) {
    var candidates = [];
    var focal = exif && exif.focalLengthMm ? Number(exif.focalLengthMm) : null;
    var fNum = exif && exif.fNumber ? Number(exif.fNumber) : null;

    if (signals.brightness < 55 && signals.blueFraction > 0.12) {
      candidates.push({ label: "Night sky", confidence: conf(0.55 + (55 - signals.brightness) / 100) });
    }
    if (signals.orientation === "landscape" && signals.skyBrightness > 0.28 && signals.blueFraction > 0.1) {
      candidates.push({
        label: "Landscape",
        confidence: conf(0.62 + signals.skyBrightness * 0.25 + (signals.isPanoramic ? 0.1 : 0))
      });
    }
    if (signals.greenFraction > 0.22 && signals.skyBrightness < 0.35) {
      candidates.push({
        label: signals.saturation > 0.28 ? "Forest" : "Forest",
        confidence: conf(0.58 + signals.greenFraction * 0.5)
      });
    }
    if (signals.coolness > 0.16 && signals.edgeHorizontal > signals.edgeVertical * 1.15 && signals.contrast > 28) {
      candidates.push({ label: "Waterfall", confidence: conf(0.55 + signals.edgeHorizontal) });
      candidates.push({ label: "River", confidence: conf(0.52 + signals.coolness * 0.4) });
    }
    if (signals.greenFraction > 0.18 && signals.saturation > 0.32 && signals.orientation !== "landscape") {
      candidates.push({ label: "Flower", confidence: conf(0.5 + signals.saturation * 0.4) });
    }
    if (signals.orientation === "portrait" && signals.edgeDensity > 0.11 && signals.subjectEmphasis > 0.08) {
      if (focal && focal >= 80) {
        candidates.push({ label: "Wildlife", confidence: conf(0.6 + Math.min(focal, 400) / 800) });
        if (focal >= 200) candidates.push({ label: "Bird", confidence: conf(0.55 + Math.min(focal, 600) / 1000) });
      }
      if (focal && focal <= 70 && (fNum == null || fNum <= 5.6)) {
        candidates.push({ label: "Macro", confidence: conf(0.52 + signals.edgeDensity) });
        if (signals.greenFraction > 0.15 && signals.warmth < 0.2) {
          candidates.push({ label: "Mushroom", confidence: conf(0.48 + signals.greenFraction * 0.3) });
        }
      }
    }
    if (signals.orientation === "portrait" && signals.subjectEmphasis > 0.12 && signals.blurEstimate > 55) {
      candidates.push({ label: "Portrait", confidence: conf(0.5 + signals.subjectEmphasis) });
    }
    if (signals.edgeVertical > signals.edgeHorizontal * 1.2 && signals.orientation !== "landscape") {
      candidates.push({ label: "Architecture", confidence: conf(0.5 + signals.edgeVertical) });
    }
    if (signals.edgeDensity > 0.14 && signals.contrast > 40 && signals.orientation === "landscape") {
      candidates.push({ label: "Street", confidence: conf(0.45 + signals.edgeDensity * 0.5) });
    }
    if (signals.orientation === "landscape" && signals.megapixels >= 12) {
      candidates.push({ label: "Travel", confidence: conf(0.42 + (signals.skyBrightness > 0.2 ? 0.1 : 0)) });
    }

    candidates.sort(function (a, b) { return b.confidence - a.confidence; });
    var best = candidates[0] || { label: "Outdoor photograph", confidence: 0.4 };
    if (best.confidence < CONF_SHOW) {
      return { label: "Outdoor photograph", confidence: best.confidence, uncertain: true };
    }
    return { label: best.label, confidence: best.confidence, uncertain: false, alternatives: candidates.slice(1, 3) };
  }

  function outdoorHints(outdoor) {
    if (!outdoor) return [];
    var hints = [];
    var weather = outdoor.weather || {};
    var cond = String(weather.conditions || "").toLowerCase();
    if (/fog|mist/i.test(cond)) hints.push({ id: "fog", text: "fog or mist", confidence: 0.75 });
    if (/haze|smoke/i.test(cond) || (outdoor.airQuality && outdoor.airQuality.usAqi > 80)) {
      hints.push({ id: "haze", text: "haze or elevated AQI", confidence: 0.7 });
    }
    if (/rain|shower|drizzle/i.test(cond)) hints.push({ id: "rain", text: "recent or active rain", confidence: 0.72 });
    if (/cloud|overcast/i.test(cond)) hints.push({ id: "clouds", text: "cloud cover", confidence: 0.68 });
    if (outdoor.daylight && outdoor.daylight.goldenHour) {
      hints.push({ id: "golden", text: "golden hour", confidence: 0.8 });
    }
    if (outdoor.daylight && outdoor.daylight.blueHour) {
      hints.push({ id: "blue", text: "blue hour", confidence: 0.78 });
    }
    if (weather.uvIndex != null && weather.uvIndex >= 6) {
      hints.push({ id: "uv", text: "high UV / harsh midday potential", confidence: 0.65 });
    }
    return hints;
  }

  function collectObservations(signals, exif, outdoor, genre) {
    var obs = [];
    var hints = outdoorHints(outdoor);
    var sharp = assessSharpness(signals, exif);
    signals.sharpnessAssessment = sharp;

    function add(o) {
      if (!o || o.confidence < CONF_SHOW) return;
      o.confidenceTier = confidenceTier(o.confidence);
      o.confidenceLabel = confidenceLabel(o.confidence);
      obs.push(o);
    }

    // Strengths
    if (signals.brightFraction < 0.045) {
      add({
        kind: "strength", category: "Highlights", confidence: conf(0.78 - signals.brightFraction * 2),
        impact: 0.7,
        title: "Highlight headroom",
        whyItWorks: "Bright areas still hold detail, so skies and specular light remain believable.",
        preserveInEdit: "Recover highlights gently — do not flatten the brightest tones into gray."
      });
    }
    if (signals.contrast >= 34 && signals.contrast <= 78) {
      add({
        kind: "strength", category: "Contrast", confidence: conf(0.7 + Math.min(signals.contrast, 60) / 200),
        impact: 0.75,
        title: "Readable tonal separation",
        whyItWorks: "Mid-range contrast separates forms without crushing shadows or blowing highlights.",
        preserveInEdit: "Prefer local contrast on the subject over a heavy global crunch."
      });
    }
    if (signals.subjectEmphasis > 0.1) {
      add({
        kind: "strength", category: "Subject emphasis", confidence: conf(0.62 + signals.subjectEmphasis),
        impact: 0.8,
        title: "Subject stands apart from the surround",
        whyItWorks: "The center of the frame differs in brightness from the edges, so the eye finds an anchor quickly.",
        preserveInEdit: "Keep the subject brighter or clearer than competing edges."
      });
    }
    if (signals.edgeDensity > 0.095 && signals.blurEstimate > 48 && sharp.confidenceTier !== "LOW") {
      add({
        kind: "strength", category: "Sharpness", confidence: conf(Math.min(0.82, 0.55 + sharp.confidence * 0.35)),
        impact: 0.65,
        title: "Defined structure",
        whyItWorks: "Edge detail suggests a readable subject or landscape form at this resolution — still confirm the focus plane at 100%.",
        preserveInEdit: "Sharpen for output size; check the true subject at 100% before printing large."
      });
    }
    if (signals.leftRightBalance < 0.08 && signals.topBottomBalance < 0.18) {
      add({
        kind: "strength", category: "Balance", confidence: conf(0.6),
        impact: 0.55,
        title: "Stable visual weight",
        whyItWorks: "Left/right tonal weight is relatively even, so the frame does not tip awkwardly.",
        preserveInEdit: "If you crop, keep the balance intentional — either stable or deliberately tense."
      });
    }
    if (signals.foregroundDark > 0.04 && signals.skyBrightness > 0.2) {
      add({
        kind: "strength", category: "Depth", confidence: conf(0.64),
        impact: 0.7,
        title: "Near-to-far layering",
        whyItWorks: "A darker lower field against a brighter upper field creates natural depth.",
        preserveInEdit: "Protect the foreground darks; lift only enough to show texture."
      });
    }
    if (signals.saturation > 0.12 && signals.saturation < 0.45) {
      add({
        kind: "strength", category: "Color harmony", confidence: conf(0.6),
        impact: 0.5,
        title: "Natural color intensity",
        whyItWorks: "Saturation sits in a believable outdoor range rather than neon or washed-out extremes.",
        preserveInEdit: "Set white balance before pushing vibrance."
      });
    }
    if (signals.dynamicRangeProxy > 0.55) {
      add({
        kind: "strength", category: "Dynamic range", confidence: conf(0.62),
        impact: 0.6,
        title: "Usable dynamic range",
        whyItWorks: "Shadow and highlight extremes are not dominating the histogram, so edits remain flexible.",
        preserveInEdit: "Use local adjustments instead of a heavy global HDR look."
      });
    }
    if (genre && !genre.uncertain && genre.confidence >= CONF_STRONG) {
      add({
        kind: "strength", category: "Storytelling", confidence: genre.confidence,
        impact: 0.55,
        title: "Clear " + genre.label.toLowerCase() + " intent",
        whyItWorks: "Image characteristics align with " + genre.label.toLowerCase() + " photography, which helps the viewer read the story quickly.",
        preserveInEdit: "Edit toward that genre’s priorities — do not force a conflicting look."
      });
    }
    hints.forEach(function (h) {
      if (h.id === "golden" && signals.warmth > 0.12) {
        add({
          kind: "strength", category: "Emotional impact", confidence: h.confidence,
          impact: 0.65,
          title: "Warm directional light",
          whyItWorks: "Field context suggests golden hour, and the image’s warmth supports that mood.",
          preserveInEdit: "Lean into warmth; avoid cooling the frame into a clinical look."
        });
      }
      if (h.id === "blue" && signals.coolness > 0.1) {
        add({
          kind: "strength", category: "Color harmony", confidence: h.confidence,
          impact: 0.6,
          title: "Cool atmospheric color",
          whyItWorks: "Blue-hour field context matches the cooler palette in the frame.",
          preserveInEdit: "Keep a cool bias; warm only the accents you want to glow."
        });
      }
    });

    // Issues / improvements
    if (signals.brightFraction > 0.055) {
      add({
        kind: "issue", category: "Highlights", confidence: conf(0.7 + signals.brightFraction),
        impact: 0.9,
        issue: "Bright hotspots pull attention",
        whyItMatters: "The eye goes to the brightest area first. If that area is not the subject, the story weakens.",
        whatToDo: "Recover highlights (−0.1 to −0.25 EV or Highlights −15 to −30) and crop away any non-essential glare.",
        expectedImprovement: "Calmer eye path and more credible sky or specular detail.",
        editHints: ["recover highlights", "crop"]
      });
    }
    if (signals.darkFraction > 0.28) {
      add({
        kind: "issue", category: "Shadows", confidence: conf(0.68 + signals.darkFraction * 0.5),
        impact: 0.82,
        issue: "Heavy shadows hide texture",
        whyItMatters: "Lost shadow detail reads muddy on screens and prints, especially in foregrounds.",
        whatToDo: "Lift shadows (+15 to +30) with a gentle curve — keep the darkest blacks so the image does not go flat.",
        expectedImprovement: "Foreground depth and readable texture without an HDR look.",
        editHints: ["lift shadows"]
      });
    }
    if (signals.contrast < 28) {
      add({
        kind: "issue", category: "Contrast", confidence: conf(0.72),
        impact: 0.85,
        issue: "Low global contrast flattens presence",
        whyItMatters: "Flat tonal range makes the subject compete with the background, especially on phones.",
        whatToDo: "Add mild contrast or clarity on the subject; use light dehaze only if atmosphere is washing the scene.",
        expectedImprovement: "Stronger subject separation and snap.",
        editHints: ["increase contrast", "local emphasis"]
      });
    }
    if (signals.contrast > 82) {
      add({
        kind: "issue", category: "Contrast", confidence: conf(0.65),
        impact: 0.7,
        issue: "Contrast may be too aggressive",
        whyItMatters: "Extreme contrast can crush midtones and make outdoor color look harsh.",
        whatToDo: "Reduce global contrast slightly and restore midtone detail with shadows/highlights.",
        expectedImprovement: "Softer, more printable tonal transitions.",
        editHints: ["reduce contrast"]
      });
    }
    if (signals.brightness < 85) {
      add({
        kind: "issue", category: "Exposure", confidence: conf(0.7),
        impact: 0.8,
        issue: "Frame reads underexposed",
        whyItMatters: "Dark midtones hide color and emotion before any creative grade.",
        whatToDo: "Brighten overall exposure (+0.2 to +0.4 EV), then refine highlights so skies stay honest.",
        expectedImprovement: "Clearer subject and more usable color.",
        editHints: ["brighten"]
      });
    }
    if (signals.brightness > 185) {
      add({
        kind: "issue", category: "Exposure", confidence: conf(0.68),
        impact: 0.78,
        issue: "Frame reads overexposed",
        whyItMatters: "Hot midtones reduce color and make prints look washed.",
        whatToDo: "Lower exposure slightly and recover highlights before adding contrast.",
        expectedImprovement: "Richer midtones and safer print headroom.",
        editHints: ["recover highlights"]
      });
    }
    if (signals.leftRightBalance > 0.14 || signals.vignetteLeft + signals.vignetteRight > 0.12) {
      add({
        kind: "issue", category: "Balance", confidence: conf(0.62),
        impact: 0.72,
        issue: "Uneven visual weight at the edges",
        whyItMatters: "Dark or bright edges can tip the frame and compete with the subject.",
        whatToDo: "Crop to rebalance, or lift/darken the heavier edge so weight returns to the subject.",
        expectedImprovement: "A more stable composition and clearer hierarchy.",
        editHints: ["crop", "remove distractions by cropping"]
      });
    }
    if (signals.subjectEmphasis < 0.05 && signals.edgeDensity > 0.08) {
      add({
        kind: "issue", category: "Subject emphasis", confidence: conf(0.6),
        impact: 0.88,
        issue: "Subject does not separate cleanly",
        whyItMatters: "Without tonal or clarity separation, viewers hesitate — the photograph feels busy rather than intentional.",
        whatToDo: "Crop tighter, darken the background slightly, or add local clarity/exposure on the intended subject.",
        expectedImprovement: "Immediate subject recognition.",
        editHints: ["crop", "local emphasis"]
      });
    }
    if (sharp.claimSoftness) {
      add({
        kind: "issue", category: "Sharpness", confidence: conf(sharp.confidence),
        impact: 0.86,
        issue: "Subject detail may be too soft for a large print or tight crop",
        whyItMatters: "If the true subject is soft, larger prints and aggressive crops will fail.",
        whatToDo: "Verify focus at 100%. If motion is the cause, raise shutter next time; for this file, crop less and sharpen gently for screen.",
        expectedImprovement: "Honest expectations for print size and cleaner presentation.",
        editHints: [],
        fieldAction: "Next time: lock focus on the subject, then raise shutter until the subject stays crisp when you zoom in."
      });
    } else if (sharp.softNote && sharp.confidence >= CONF_SHOW) {
      // Ambiguous soft signal — advisory only, never "this is blurry"
      add({
        kind: "issue", category: "Sharpness", confidence: conf(Math.min(sharp.confidence, 0.64)),
        impact: 0.45,
        issue: "Sharpness is uncertain from a browser check",
        whyItMatters: "A quick downsample cannot always tell intentional softness from miss-focus.",
        whatToDo: sharp.softNote,
        expectedImprovement: "You decide after a 100% check — coaching will not invent a blur cause.",
        editHints: [],
        fieldAction: null
      });
    }
    if (exif && exif.iso && exif.iso > 3200 && signals.blurEstimate < 55 && !sharp.claimSoftness) {
      add({
        kind: "issue", category: "Noise", confidence: conf(0.7),
        impact: 0.6,
        issue: "High ISO may add noise",
        whyItMatters: "Noise softens fine texture and shows in skies and smooth tones.",
        whatToDo: "Apply light luminance noise reduction on smooth areas; protect subject texture.",
        expectedImprovement: "Cleaner skies without plastic subject detail.",
        editHints: []
      });
    }
    if (signals.warmth > 0.24 && signals.coolness < 0.07) {
      add({
        kind: "issue", category: "White balance", confidence: conf(0.64),
        impact: 0.68,
        issue: "Strong warm cast",
        whyItMatters: "Excess warmth can age foliage and skew rock or water color away from what you saw.",
        whatToDo: "Cool white balance slightly (−200 to −500K) before adjusting saturation.",
        expectedImprovement: "More believable natural color.",
        editHints: ["cool white balance"]
      });
    }
    if (signals.coolness > 0.22 && signals.warmth < 0.08 && !(hints.some(function (h) { return h.id === "blue"; }))) {
      add({
        kind: "issue", category: "White balance", confidence: conf(0.6),
        impact: 0.62,
        issue: "Cool color cast",
        whyItMatters: "A cool bias can make daylight scenes feel clinical unless that is the intended mood.",
        whatToDo: "Warm white balance slightly (+200 to +400K) if the scene was daylight, not blue hour.",
        expectedImprovement: "Friendlier, more natural outdoor color.",
        editHints: ["warm white balance"]
      });
    }
    if (signals.saturation > 0.48) {
      add({
        kind: "issue", category: "Color harmony", confidence: conf(0.63),
        impact: 0.58,
        issue: "Saturation may be overpowering",
        whyItMatters: "High saturation competes with form and can look artificial in outdoor work.",
        whatToDo: "Reduce saturation or vibrance modestly; keep one accent color stronger than the rest.",
        expectedImprovement: "Calmer palette and stronger form.",
        editHints: ["reduce saturation"]
      });
    }
    if (signals.edgeHorizontal > 0.08 && signals.skyBrightness > 0.25 && signals.orientation === "landscape") {
      add({
        kind: "issue", category: "Horizon alignment", confidence: conf(0.55),
        impact: 0.74,
        issue: "Horizon needs a careful check",
        whyItMatters: "Even a slight tilt reads immediately in landscapes with a clear skyline.",
        whatToDo: "Rotate to level the horizon, then crop to restore the frame.",
        expectedImprovement: "A grounded, intentional landscape.",
        editHints: ["rotate", "crop"]
      });
    }
    if (signals.tonalSpread < 0.12 && signals.edgeDensity > 0.1) {
      add({
        kind: "issue", category: "Simplicity", confidence: conf(0.58),
        impact: 0.7,
        issue: "Busy frame without a clear hierarchy",
        whyItMatters: "Many similar tones and edges make the photograph feel crowded.",
        whatToDo: "Crop to one primary subject, or darken secondary areas so one element leads.",
        expectedImprovement: "Clearer story in the first three seconds.",
        editHints: ["crop", "remove distractions by cropping", "local emphasis"]
      });
    }
    hints.forEach(function (h) {
      if (h.id === "haze" && signals.contrast < 40) {
        add({
          kind: "issue", category: "Depth", confidence: h.confidence,
          impact: 0.55,
          issue: "Atmosphere is flattening distance",
          whyItMatters: "Haze or elevated AQI reduces distant contrast — that is environmental, not only an exposure mistake.",
          whatToDo: "Use light dehaze or local contrast on the near subject; do not over-clear the whole sky.",
          expectedImprovement: "Near subject presence while keeping honest atmosphere.",
          editHints: ["increase contrast", "local emphasis"]
        });
      }
      if (h.id === "fog" && signals.contrast < 35) {
        add({
          kind: "strength", category: "Emotional impact", confidence: h.confidence,
          impact: 0.6,
          title: "Fog softens the scene intentionally",
          whyItWorks: "Field conditions suggest fog/mist, which matches the low-contrast mood — that can be a strength if the subject is simple.",
          preserveInEdit: "Protect the soft atmosphere; emphasize one silhouette or shape."
        });
      }
      if (h.id === "uv" && signals.brightFraction > 0.04) {
        add({
          kind: "issue", category: "Exposure", confidence: h.confidence,
          impact: 0.5,
          issue: "Harsh light risk from field conditions",
          whyItMatters: "High UV / midday potential often creates hard highlights and short shadows.",
          whatToDo: "Recover highlights and consider returning in softer light for a cleaner take.",
          expectedImprovement: "More forgiving light and better subject modeling.",
          editHints: ["recover highlights"]
        });
      }
    });

    // Genre-specific coaching
    if (genre && !genre.uncertain) {
      if (genre.label === "Landscape" && signals.foregroundDark < 0.02) {
        add({
          kind: "issue", category: "Foreground/background separation", confidence: conf(0.58),
          impact: 0.66,
          issue: "Landscape needs a stronger foreground doorstep",
          whyItMatters: "Without near-ground interest, wide scenes can feel like a postcard rather than a place you stand in.",
          whatToDo: "Next shoot: lower the camera and include rock, water, or plants in the lower third. For this file, crop to emphasize the strongest mid-ground form.",
          expectedImprovement: "A path into the scene and more depth.",
          editHints: ["crop"]
        });
      }
      if ((genre.label === "Wildlife" || genre.label === "Bird") && signals.subjectEmphasis < 0.08) {
        add({
          kind: "issue", category: "Subject emphasis", confidence: conf(0.6),
          impact: 0.84,
          issue: "Wildlife subject needs cleaner isolation",
          whyItMatters: "Animal photographs succeed when the creature is unmistakable against the habitat.",
          whatToDo: "Crop tighter around the animal and darken busy background edges.",
          expectedImprovement: "Immediate subject recognition.",
          editHints: ["crop", "local emphasis"]
        });
      }
      if (genre.label === "Macro" || genre.label === "Mushroom" || genre.label === "Flower") {
        if (sharp.claimSoftness) {
          add({
            kind: "issue", category: "Sharpness", confidence: conf(Math.max(sharp.confidence, 0.72)),
            impact: 0.8,
            issue: "Critical focus may miss the subject plane",
            whyItMatters: "In close work, a soft focus plane is the whole photograph.",
            whatToDo: "Confirm the sharpest plane at 100%. Prefer a modest crop over aggressive sharpening.",
            expectedImprovement: "Honest presentation of the subject’s texture.",
            editHints: [],
            fieldAction: "Next time: focus on the nearest critical detail, stop down one stop if depth is shallow, and brace or raise shutter."
          });
        } else if (sharp.softNote && signals.blurEstimate < 50) {
          add({
            kind: "issue", category: "Sharpness", confidence: conf(Math.min(sharp.confidence, 0.62)),
            impact: 0.5,
            issue: "Close-up sharpness needs a 100% check",
            whyItMatters: "Macro softness is easy to misread in a small preview.",
            whatToDo: sharp.softNote,
            expectedImprovement: "You keep control of whether softness is intentional.",
            editHints: []
          });
        }
      }
      if (genre.label === "Waterfall" || genre.label === "River") {
        if (signals.brightFraction > 0.04) {
          add({
            kind: "issue", category: "Highlights", confidence: conf(0.64),
            impact: 0.75,
            issue: "Water highlights may be clipping",
            whyItMatters: "White water without texture becomes a blank distraction.",
            whatToDo: "Recover highlights and slightly cool the whites so water retains shape.",
            expectedImprovement: "Readable water texture and calmer contrast.",
            editHints: ["recover highlights", "cool white balance"]
          });
        }
      }
    }

    return obs;
  }

  function prioritize(obs) {
    var strengths = obs.filter(function (o) { return o.kind === "strength"; })
      .sort(function (a, b) { return (b.confidence * b.impact) - (a.confidence * a.impact); });
    var issues = obs.filter(function (o) { return o.kind === "issue"; })
      .sort(function (a, b) { return (b.confidence * b.impact) - (a.confidence * a.impact); });

    // Deduplicate by category for issues (keep highest impact)
    var seenCat = {};
    var uniqueIssues = [];
    issues.forEach(function (o) {
      if (seenCat[o.category]) return;
      seenCat[o.category] = true;
      uniqueIssues.push(o);
    });

    var topStrengths = strengths.slice(0, 3).map(function (o) {
      return {
        title: o.title,
        whyItWorks: o.whyItWorks,
        preserveInEdit: o.preserveInEdit,
        category: o.category,
        confidence: round(o.confidence * 100),
        confidenceTier: o.confidenceTier || confidenceTier(o.confidence),
        confidenceLabel: o.confidenceLabel || confidenceLabel(o.confidence)
      };
    });

    var primary = uniqueIssues[0] || null;
    var secondary = uniqueIssues.slice(1, 4).map(function (o) {
      return {
        issue: o.issue,
        whyItMatters: o.whyItMatters,
        whatToDo: o.whatToDo,
        expectedImprovement: o.expectedImprovement,
        category: o.category,
        confidence: round(o.confidence * 100),
        confidenceTier: o.confidenceTier || confidenceTier(o.confidence),
        confidenceLabel: o.confidenceLabel || confidenceLabel(o.confidence),
        fieldAction: o.fieldAction || null,
        priority: "secondary"
      };
    });

    var improvements = [];
    if (primary) {
      improvements.push({
        issue: primary.issue,
        whyItMatters: primary.whyItMatters,
        whatToDo: primary.whatToDo,
        expectedImprovement: primary.expectedImprovement,
        category: primary.category,
        confidence: round(primary.confidence * 100),
        confidenceTier: primary.confidenceTier || confidenceTier(primary.confidence),
        confidenceLabel: primary.confidenceLabel || confidenceLabel(primary.confidence),
        fieldAction: primary.fieldAction || null,
        priority: "primary",
        editHints: primary.editHints || []
      });
    }
    improvements = improvements.concat(secondary);

    // If no high-confidence strength, say so honestly rather than inventing
    if (!topStrengths.length) {
      topStrengths.push({
        title: "A usable starting frame",
        whyItWorks: "The file is readable enough to coach from, but no single strength stood out with high confidence from browser signals alone.",
        preserveInEdit: "Make one deliberate improvement first — do not stack many global edits.",
        category: "Overall",
        confidence: 50,
        confidenceTier: "LOW",
        confidenceLabel: "LOW confidence"
      });
    }

    var nextTimeActions = [];
    improvements.forEach(function (imp) {
      if (nextTimeActions.length >= 2) return;
      if (imp.fieldAction) {
        nextTimeActions.push(imp.fieldAction);
        return;
      }
      if (imp.whatToDo && /next time|next shoot|raise shutter|lock focus|lower the camera|return in/i.test(imp.whatToDo)) {
        nextTimeActions.push(imp.whatToDo);
      }
    });
    if (!nextTimeActions.length && primary && primary.whatToDo) {
      nextTimeActions.push("Next time in the field: " + primary.whatToDo.replace(/^If you're curious,\s*/i, ""));
    }

    return {
      topStrengths: topStrengths,
      improvements: improvements,
      nextTimeActions: nextTimeActions.slice(0, 2),
      primary: primary,
      all: obs
    };
  }

  function buildEditPlan(signals, improvements, outdoor) {
    var EditIntel = global.WaypointPhotoCoachEditIntel;
    var plan = EditIntel && EditIntel.buildFromSignals
      ? EditIntel.buildFromSignals(signals, { improvements: improvements, outdoor: outdoor })
      : null;
    return plan;
  }

  function buildCrop(signals, primary) {
    var primaryRatio = "3:2";
    if (signals.orientation === "portrait") primaryRatio = "4:5";
    else if (signals.isPanoramic) primaryRatio = "16:9";
    else if (signals.orientation === "square") primaryRatio = "1:1";
    var reason = "Crop to protect the subject and remove edge weight that competes with the story.";
    if (primary && primary.editHints && primary.editHints.indexOf("crop") >= 0) {
      reason = primary.whatToDo;
    } else if (signals.leftRightBalance > 0.12) {
      reason = "Rebalance left/right weight so the subject sits with clearer intention.";
    } else if (signals.subjectEmphasis < 0.06) {
      reason = "Tighten the frame around the tonal anchor so the subject reads first.";
    }
    return {
      aspectRatio: primaryRatio,
      alternativeAspectRatios: signals.orientation === "portrait"
        ? ["4:5", "2:3", "1:1"]
        : ["3:2", "4:5", "16:9"],
      reasoning: reason,
      horizonNote: signals.skyBrightness > 0.3
        ? "If a horizon is visible, level it before final crop — tilt reads immediately."
        : "Check for any strong horizontal that should be level.",
      subjectPlacement: signals.subjectThird === 4
        ? "Subject weight is central — consider a slight offset for tension if the story allows."
        : "Subject weight sits off-center — preserve that placement when cropping.",
      leadingLineSuggestion: signals.edgeDensity > 0.1
        ? "Keep strong edges leading toward the subject, not out of the frame."
        : "Look for a shoreline, path, or ridge that can guide the eye inward.",
      showOverlay: true
    };
  }

  function buildPrint(signals, overall) {
    var worthy = overall >= 75 && signals.brightFraction < 0.08 && signals.blurEstimate > 45;
    var maxSize = signals.width >= 5000 ? "24×36 max (test 16×24 first)" :
      signals.width >= 4000 ? "16×24" : signals.width >= 3000 ? "12×18" : "8×12 proof";
    return {
      worthy: worthy,
      worthyLabel: worthy ? "Yes — worthy of a test print" : "Not yet — refine the highest-impact issue first",
      recommendedSize: worthy ? maxSize : "8×10 proof after edits",
      medium: worthy ? "Fine art matte or lustre photo paper" : "Screen-first",
      paper: worthy ? "Matte or lustre — matte for foliage, lustre for water/sky" : "—",
      canvas: worthy && overall >= 80 ? "Optional 16×24 gallery wrap after proof" : "Not recommended yet",
      metal: overall >= 85 && signals.contrast > 40 ? "8×12 metal accent print possible" : "—",
      gloss: "Gloss only if glare-controlled; otherwise matte/lustre",
      matte: "Preferred for natural scenes — reduces reflections",
      fineArt: worthy ? "Cotton rag fine art for exhibition series" : "—",
      border: worthy ? "1–2 inch white border or full-bleed for modern look" : "—",
      frameColor: worthy ? "Black, walnut, or float mount — match room, not image" : "—",
      matSuggestion: worthy ? "2-inch white mat or float mount for landscapes" : "—",
      why: worthy
        ? "Recoverable dynamic range, sharpness " + round(signals.blurEstimate) + "/100, and " + signals.megapixels + " MP support modest enlargement."
        : "Resolve the primary coaching issue before committing to a large print."
    };
  }

  function scoreCategory(base, deltas) {
    var s = base;
    deltas.forEach(function (d) { s += d; });
    return clamp(round(s), 42, 96);
  }

  function buildScores(signals, exif, outdoor, genre, prioritized) {
    var primaryCat = prioritized.primary ? prioritized.primary.category : null;
    var strengthBoost = prioritized.topStrengths.length >= 2 ? 3 : 0;

    function penalize(cat, amount) {
      return primaryCat === cat ? -amount : 0;
    }

    var composition = scoreCategory(74, [
      signals.orientation === "landscape" ? 3 : signals.orientation === "portrait" ? 2 : 0,
      signals.leftRightBalance < 0.1 ? 4 : -5,
      signals.subjectEmphasis > 0.08 ? 4 : -3,
      penalize("Balance", 6),
      penalize("Simplicity", 5),
      strengthBoost
    ]);
    var light = scoreCategory(72, [
      signals.brightness > 95 && signals.brightness < 175 ? 6 : -6,
      outdoor && outdoor.daylight && outdoor.daylight.goldenHour ? 5 : 0,
      signals.warmth > 0.15 && signals.warmth < 0.3 ? 3 : 0,
      penalize("Exposure", 7)
    ]);
    var exposure = scoreCategory(70, [
      signals.brightFraction < 0.045 ? 8 : -10,
      signals.darkFraction < 0.25 ? 5 : -8,
      penalize("Highlights", 8),
      penalize("Shadows", 7)
    ]);
    var color = scoreCategory(73, [
      signals.saturation > 0.1 && signals.saturation < 0.42 ? 5 : -4,
      Math.abs(signals.warmth - signals.coolness) > 0.05 ? 2 : -2,
      penalize("White balance", 6),
      penalize("Color harmony", 5)
    ]);
    var sharp = scoreCategory(76, [
      signals.edgeDensity > 0.1 ? 5 : -5,
      signals.blurEstimate > 50 ? 4 : -8,
      exif && exif.iso && exif.iso > 3200 ? -8 : 2,
      penalize("Sharpness", 8),
      penalize("Noise", 5)
    ]);
    var subject = scoreCategory(71, [
      signals.subjectEmphasis > 0.08 ? 8 : -4,
      signals.tonalSpread > 0.15 ? 3 : -2,
      penalize("Subject emphasis", 9)
    ]);
    var story = scoreCategory(70, [
      genre && !genre.uncertain ? 6 : 0,
      outdoor && outdoor.photography ? 4 : 0,
      signals.contrast > 35 ? 3 : 0,
      penalize("Emotional impact", 4)
    ]);

    function reasonFor(cat, score, good, weak) {
      return score >= 80 ? good : weak;
    }

    return [
      {
        category: "Composition", score: composition,
        reason: reasonFor(composition, composition,
          "Framing and visual weight support a clear hierarchy.",
          "Framing is workable — clarify the anchor or rebalance edges.")
      },
      {
        category: "Light", score: light,
        reason: reasonFor(light, light,
          "Brightness and color temperature support natural outdoor modeling.",
          "Light is flat or harsh — favor softer windows or recover extremes.")
      },
      {
        category: "Exposure", score: exposure,
        reason: reasonFor(exposure, exposure,
          "Highlight and shadow balance look recoverable.",
          signals.brightFraction > 0.05
            ? "Highlights may be clipping — recover headroom first."
            : signals.darkFraction > 0.28
              ? "Shadows are deep — lift locally for texture."
              : "Exposure sits mid-range — refine with intent.")
      },
      {
        category: "Color", score: color,
        reason: reasonFor(color, color,
          "Color intensity and balance read natural.",
          "Set white balance before pushing saturation or contrast.")
      },
      {
        category: "Sharpness", score: sharp,
        reason: reasonFor(sharp, sharp,
          "Edge structure suggests acceptable subject definition for screen.",
          "Softness detected — verify the subject at 100% before printing.")
      },
      {
        category: "Subject impact", score: subject,
        reason: reasonFor(subject, subject,
          "A tonal or structural anchor appears in the frame.",
          "Subject separation could be stronger — crop or locally emphasize.")
      },
      {
        category: "Story / emotion", score: story,
        reason: reasonFor(story, story,
          (genre && !genre.uncertain ? genre.label + " mood reads clearly." : "Atmosphere supports a contemplative read."),
          "Mood is present — simplify so one feeling leads.")
      }
    ];
  }

  function buildPhotoBreakdown(signals, exif, outdoor, scores, genre) {
    var byCat = {};
    scores.forEach(function (s) { byCat[s.category] = s.score; });
    function item(category, score, reason, teachingNote) {
      return { category: category, score: score, reason: reason, teachingNote: teachingNote };
    }
    var depth = clamp(round(70 + (signals.foregroundDark > 0.03 ? 8 : -3) + (signals.contrast > 35 ? 5 : 0)), 42, 96);
    var balance = clamp(round(74 - signals.leftRightBalance * 40 - (signals.vignetteLeft + signals.vignetteRight) * 35), 42, 96);
    var framing = clamp(round(72 + (signals.subjectEmphasis > 0.08 ? 6 : -4)), 42, 96);
    var perspective = clamp(round(70 + (signals.edgeVertical > signals.edgeHorizontal ? -4 : 3)), 42, 96);
    var distract = clamp(round(80 - signals.brightFraction * 140 - signals.leftRightBalance * 30), 42, 96);
    var simplicity = clamp(round(76 - (signals.edgeDensity > 0.14 ? 8 : 0) + (signals.tonalSpread > 0.18 ? 4 : -4)), 42, 96);

    return [
      item("Composition", byCat["Composition"] || 72, "Orientation " + signals.orientation + " · " + signals.width + "×" + signals.height + ".",
        "Composition is what you include and exclude — hierarchy before decoration."),
      item("Subject emphasis", byCat["Subject impact"] || 71, "Center-to-edge brightness difference ≈ " + round(signals.subjectEmphasis * 100) + "%.",
        "The subject is what the eye should find first."),
      item("Balance", balance, "Left/right imbalance ≈ " + round(signals.leftRightBalance * 100) + "%.",
        "Balance can be stable or intentionally tense — not always centered."),
      item("Visual weight", framing, "Strongest third cell: " + (signals.subjectThird + 1) + " of 9.",
        "Bright, sharp, and warm areas carry more weight."),
      item("Leading lines", clamp(round(68 + signals.edgeDensity * 80), 42, 96), "Edge density " + round(signals.edgeDensity * 100) / 100 + ".",
        "Lines should lead toward the subject, not out of the frame."),
      item("Framing", framing, signals.vignetteLeft + signals.vignetteRight > 0.1 ? "Edge darkening present." : "Edges relatively open.",
        "Natural frames (branches, rock) help when they point inward."),
      item("Horizon alignment", clamp(round(70 + (signals.skyBrightness > 0.25 ? 0 : 4)), 42, 96),
        signals.skyBrightness > 0.25 ? "Bright upper field — check horizon level." : "No strong skyline signal.",
        "A tilted horizon is noticed before almost anything else in landscapes."),
      item("Perspective", perspective, "Vertical vs horizontal edges: " + round(signals.edgeVertical * 100) + "/" + round(signals.edgeHorizontal * 100) + ".",
        "Camera height and angle change story as much as focal length."),
      item("Depth", depth, signals.foregroundDark > 0.03 ? "Darker foreground supports depth." : "Foreground is light — watch for flatness.",
        "Depth needs near, mid, and far layers — or atmospheric fade."),
      item("Foreground/background separation", clamp(round(70 + signals.subjectEmphasis * 40), 42, 96),
        "Subject emphasis proxy " + round(signals.subjectEmphasis * 100) + "%.",
        "Separation can be tonal, color, focus, or scale."),
      item("Color harmony", byCat["Color"] || 73, "Palette: " + (signals.dominantColors || []).join(", ") + ".",
        "Harmony comes from relationship, not maximum saturation."),
      item("Contrast", clamp(round(signals.contrast + 30), 42, 96), "Contrast σ ≈ " + round(signals.contrast) + ".",
        "Contrast creates presence — too much creates harshness."),
      item("Dynamic range", clamp(round(55 + signals.dynamicRangeProxy * 40), 42, 96),
        "Clip est. highlights " + round(signals.highlightClip * 100) + "% · shadows " + round(signals.shadowClip * 100) + "%.",
        "Protect what you cannot recover."),
      item("Exposure", byCat["Exposure"] || 70, "Mean luminance ≈ " + round(signals.brightness) + "/255.",
        "Expose for the tones that matter most to the story."),
      item("Highlights", clamp(round(85 - signals.highlightClip * 200), 42, 96), "Highlight fraction " + round(signals.highlightClip * 100) + "%.",
        "The brightest area often becomes the subject whether you intend it or not."),
      item("Shadows", clamp(round(82 - signals.shadowClip * 120), 42, 96), "Shadow fraction " + round(signals.shadowClip * 100) + "%.",
        "Lift for texture; keep blacks for depth."),
      item("White balance", clamp(round(74 - Math.abs(signals.warmth - signals.coolness) * 40), 42, 96),
        signals.dominantWarm ? "Warm bias detected." : signals.coolness > 0.15 ? "Cool bias detected." : "Relatively neutral.",
        "Fix white balance before creative color."),
      item("Sharpness", byCat["Sharpness"] || 76, "Sharpness estimate " + round(signals.blurEstimate) + "/100.",
        "Sharpness belongs on the subject, not everywhere."),
      item("Motion blur", clamp(round(signals.blurEstimate), 42, 96),
        signals.blurEstimate < 40 ? "Softness may include motion or miss-focus." : "No strong motion-blur signal.",
        "If the subject moved, shutter speed is the field fix."),
      item("Noise", clamp(round(exif && exif.iso && exif.iso > 1600 ? 70 - (exif.iso - 1600) / 80 : 82), 42, 96),
        exif && exif.iso ? "ISO " + exif.iso : "ISO unknown — noise inferred cautiously.",
        "Reduce noise in smooth tones; protect subject texture."),
      item("Cropping", clamp(round(72 + (signals.subjectEmphasis > 0.08 ? 4 : -4)), 42, 96),
        "Current aspect " + (round(signals.aspectRatio * 100) / 100) + ".",
        "Crop is composition after the fact — use it to finish the sentence."),
      item("Simplicity", simplicity, "Edge density " + round(signals.edgeDensity * 100) / 100 + ".",
        "One clear idea beats five competing ones."),
      item("Distractions", distract, signals.brightFraction > 0.05 ? "Bright hotspots may distract." : "Few obvious tonal distractions.",
        "Anything brighter or sharper than the subject outside the subject is a distraction."),
      item("Storytelling", byCat["Story / emotion"] || 70,
        genre && !genre.uncertain ? "Likely genre: " + genre.label + "." : "Genre uncertain from browser signals.",
        "Story is what the viewer feels after three seconds."),
      item("Emotional impact", clamp(round((byCat["Story / emotion"] || 70) + (signals.contrast > 40 ? 3 : 0)), 42, 96),
        outdoor && outdoor.daylight && outdoor.daylight.goldenHour ? "Field context supports warm emotional light." : "Mood inferred from tone and color.",
        "Emotion comes from light, simplicity, and a clear subject — not from filters.")
    ];
  }

  function buildNarrative(signals, exif, outdoor, overall, genre, prioritized) {
    var parts = [];
    var genreLabel = genre && !genre.uncertain ? genre.label.toLowerCase() : signals.orientation + " outdoor";
    var G = global.WDS && global.WDS.aiGuide;
    parts.push("I noticed a " + genreLabel + " frame");
    if (signals.megapixels) parts.push("(" + signals.megapixels + " MP)");
    parts.push(
      "that reads as " +
        (overall >= 78
          ? "a confident keeper"
          : overall >= 68
            ? "a solid field capture"
            : "an exploratory frame — still interesting to study")
    );
    if (prioritized.topStrengths[0]) {
      parts.push("— strongest signal: " + prioritized.topStrengths[0].title.toLowerCase() + ".");
    } else {
      parts.push(".");
    }
    if (prioritized.primary) {
      parts.push(
        "Worth noticing first: " +
          prioritized.primary.issue.toLowerCase() +
          ". Here's why it may matter for this image."
      );
    } else {
      parts.push("Nothing loud stood out as a flaw — refine gently if you want, rather than over-editing.");
    }
    if (outdoor && outdoor.daylight && outdoor.daylight.goldenHour) {
      parts.push("Field context places this near golden hour — that light may be worth leaning into.");
    }
    if (exif && exif.focalLengthMm) {
      parts.push(
        "At " +
          exif.focalLengthMm +
          "mm, lens choice likely shaped compression and background separation."
      );
    }
    parts.push("You decide what, if anything, to try next.");
    var text = parts.join(" ");
    return G && G.softenOutput ? G.softenOutput(text) : text;
  }

  function buildLearningConcept(signals, outdoor, prioritized, genre) {
    var G = global.WDS && global.WDS.aiGuide;
    var concept;
    if (prioritized.primary) {
      concept = {
        title: prioritized.primary.category,
        lesson: prioritized.primary.whyItMatters,
        practice: prioritized.primary.whatToDo
      };
    } else if (genre && !genre.uncertain) {
      concept = {
        title: genre.label + " priorities",
        lesson:
          "In " +
          genre.label.toLowerCase() +
          " work, viewers often decide in seconds whether the subject is clear. Protecting that clarity usually matters more than decorative edits.",
        practice: "If you're curious, squint at the image — if the subject disappears, simplify."
      };
    } else {
      concept = {
        title: "Visual weight",
        lesson:
          "Bright, sharp, and warm areas carry weight. It can help when the heaviest area matches your intended subject.",
        practice: "If you're curious, squint at the image — what shape remains? That is often the true composition."
      };
    }
    if (G) {
      if (concept.lesson && G.softenOutput) concept.lesson = G.softenOutput(concept.lesson);
      if (concept.practice && G.invite) concept.practice = G.invite(concept.practice);
    }
    return concept;
  }

  function buildChallenge(signals, outdoor, genre, prioritized) {
    var G = global.WDS && global.WDS.aiGuide;
    var tip;
    if (prioritized.primary && prioritized.primary.category === "Subject emphasis") {
      tip = "try a simpler background within about 50 steps — same subject, fewer competing edges.";
    } else if (outdoor && outdoor.daylight && outdoor.daylight.goldenHour) {
      tip =
        "return in golden hour and make two frames of the same subject with the sun beside you, then behind you — compare shadow direction.";
    } else if (genre && genre.label === "Landscape") {
      tip = "make another frame from about half your current height with one deliberate foreground anchor.";
    } else if (signals.contrast < 32) {
      tip = "wait for clearer air or softer directional light and remake the frame without changing position.";
    } else {
      tip = "isolate one subject against the simplest background you can find within about 50 steps.";
    }
    return G && G.invite ? G.invite(tip) : "If you're curious, " + tip;
  }

  function buildSceneSuggestion(signals, outdoor, overall) {
    var mood = "natural";
    var presetId = "still-lake";
    if (signals.warmth > 0.2) { mood = "golden-hour"; presetId = "golden-hour"; }
    if (signals.coolness > 0.15) { mood = "blue-hour"; presetId = "blue-hour"; }
    if (signals.brightFraction < 0.02 && signals.contrast < 35) { presetId = "morning-mist"; mood = "mist"; }
    if (outdoor && outdoor.weather && outdoor.weather.conditions &&
        /rain|storm|thunder/i.test(outdoor.weather.conditions)) {
      presetId = "spring-rain";
      mood = "dramatic";
    }
    return {
      mood: mood,
      presetId: presetId,
      motion: overall >= 80 ? "orbit" : "pan-left",
      style: mood === "dramatic" ? "Dramatic" : mood === "mist" ? "Natural" : "Cinematic",
      summary: "On-device tone suggestion" +
        (outdoor && outdoor.daylight && outdoor.daylight.goldenHour ? " using saved golden-hour field context." : ".")
    };
  }

  function buildFieldInsights(outdoor, signals) {
    if (!outdoor) return null;
    var lines = [];
    var loc = outdoor.location || {};
    if (loc.city || loc.county) {
      lines.push([loc.city, loc.county, loc.state].filter(Boolean).join(", "));
    }
    if (outdoor.weather) {
      lines.push((outdoor.weather.temp != null ? Math.round(outdoor.weather.temp) + "° · " : "") +
        (outdoor.weather.conditions || "weather snapshot"));
    }
    if (outdoor.airQuality && outdoor.airQuality.usAqi != null) {
      lines.push("AQI " + outdoor.airQuality.usAqi + (outdoor.airQuality.category ? " (" + outdoor.airQuality.category + ")" : ""));
    }
    if (outdoor.daylight && outdoor.daylight.blueHour) lines.push("Blue hour: " + outdoor.daylight.blueHour);
    if (outdoor.daylight && outdoor.daylight.goldenHour) lines.push("Golden hour: " + outdoor.daylight.goldenHour);
    if (outdoor.daylight && outdoor.daylight.moonPhase) lines.push("Moon: " + outdoor.daylight.moonPhase);
    if (outdoor.alerts && outdoor.alerts.count) {
      lines.push("Safety: " + outdoor.alerts.count + " NWS alert(s)");
    }
    var Outdoor = global.WaypointPhotoCoachOutdoorContext;
    var impact = Outdoor && Outdoor.environmentImpact
      ? Outdoor.environmentImpact(outdoor)
      : "Field context can explain light quality and atmosphere — coaching still works without it.";
    return {
      available: true,
      location: lines[0] || "Dashboard snapshot",
      lines: lines,
      photoImpact: impact
    };
  }

  function analyzeFromSignals(signals, file, exif, outdoorContext) {
    var genre = detectGenre(signals, exif);
    var observations = collectObservations(signals, exif, outdoorContext, genre);
    var prioritized = prioritize(observations);
    var breakdown = buildScores(signals, exif, outdoorContext, genre, prioritized);
    var overall = round(breakdown.reduce(function (a, b) { return a + b.score; }, 0) / breakdown.length);
    var letter = letterGrade(overall);
    var strengths = prioritized.topStrengths;
    var improvements = prioritized.improvements;
    var nextTimeActions = prioritized.nextTimeActions || [];
    var editIntelligence = buildEditPlan(signals, improvements, outdoorContext);
    var suggestedCrop = buildCrop(signals, prioritized.primary);
    var printRec = buildPrint(signals, overall);
    var sceneSuggestion = buildSceneSuggestion(signals, outdoorContext, overall);
    var fieldInsights = buildFieldInsights(outdoorContext, signals);
    var photoBreakdown = buildPhotoBreakdown(signals, exif, outdoorContext, breakdown, genre);
    var narrativeSummary = buildNarrative(signals, exif, outdoorContext, overall, genre, prioritized);
    var learningConcept = buildLearningConcept(signals, outdoorContext, prioritized, genre);
    var sharpAssess = signals.sharpnessAssessment || assessSharpness(signals, exif);

    var uncertainNote = null;
    if (genre.uncertain) {
      uncertainNote = "Genre is uncertain from browser signals alone — coaching stays general rather than inventing a subject type.";
    }

    var overallConf = conf(
      (improvements[0] ? improvements[0].confidence / 100 : 0.65) * 0.35 +
      (strengths[0] ? strengths[0].confidence / 100 : 0.55) * 0.35 +
      (sharpAssess.confidence || 0.6) * 0.3
    );

    return {
      version: ENGINE_VERSION,
      engineStatus: "on-device",
      isDemo: false,
      isSample: false,
      trustLabel: "On-device analysis",
      confidenceTier: confidenceTier(overallConf),
      confidenceLabel: confidenceLabel(overallConf),
      analyzedAt: new Date().toISOString(),
      imageName: file && file.name ? file.name : "photo.jpg",
      outdoorContext: outdoorContext
        ? {
            source: outdoorContext.source || "stored-context",
            note: "Outdoor context from a saved field snapshot — not invented from the photograph.",
            snapshot: outdoorContext
          }
        : null,
      signals: signals,
      sharpnessAssessment: sharpAssess,
      genre: genre,
      coaching: {
        philosophy: ["overall read", "what worked", "what to watch", "next time in the field"],
        topStrengths: strengths,
        primaryImprovement: improvements[0] || null,
        secondaryImprovements: improvements.slice(1),
        nextTimeActions: nextTimeActions,
        uncertainNote: uncertainNote
      },
      captureMetadata: exif && exif.hasExif ? {
        source: "EXIF", trust: "From file",
        make: exif.make, model: exif.model, iso: exif.iso,
        focalLengthMm: exif.focalLengthMm, exposureTimeSec: exif.exposureTimeSec,
        fNumber: exif.fNumber, dateTime: exif.dateTime, gps: exif.gps
      } : { source: "None", trust: "Not available — nothing invented" },
      overallGrade: {
        letter: letter,
        score: overall,
        summary: narrativeSummary,
        portfolioPotential: overall >= 78 ? "High" : overall >= 68 ? "Medium" : "Developing",
        printPotential: printRec.worthy ? "Good after edits" : "Screen-first for now",
        confidence: confidenceLabel(overallConf) + " — on-device signals with gating (not cloud AI)",
        confidenceTier: confidenceTier(overallConf)
      },
      overallScore: overall,
      narrativeSummary: narrativeSummary,
      scoreBreakdown: breakdown,
      photoBreakdown: photoBreakdown,
      strengths: strengths,
      improvements: improvements,
      nextTimeActions: nextTimeActions,
      learningConcept: learningConcept,
      suggestedCrop: suggestedCrop,
      printRecommendation: printRec,
      editIntelligence: editIntelligence,
      fieldInsights: fieldInsights,
      nextShootChallenge: buildChallenge(signals, outdoorContext, genre, prioritized),
      fieldAssignment: buildChallenge(signals, outdoorContext, genre, prioritized),
      sceneSuggestion: sceneSuggestion,
      learningNote: learningConcept.lesson
    };
  }

  function analyze(file, imageUrl, exif, outdoorContext) {
    return loadImage(imageUrl).then(function (img) {
      var signals = samplePixels(img);
      if (!signals) throw new Error("Pixel sampling failed.");
      return analyzeFromSignals(signals, file, exif, outdoorContext);
    });
  }

  global.WaypointPhotoCoachDemo = {
    analyze: analyze,
    analyzeFromSignals: analyzeFromSignals,
    samplePixels: samplePixels,
    assessSharpness: assessSharpness,
    letterGrade: letterGrade,
    detectGenre: detectGenre,
    confidenceTier: confidenceTier,
    confidenceLabel: confidenceLabel,
    CONF_SHOW: CONF_SHOW,
    CONF_STRONG: CONF_STRONG,
    CONF_SHARPNESS_CLAIM: CONF_SHARPNESS_CLAIM,
    ENGINE_VERSION: ENGINE_VERSION
  };
})(window);
