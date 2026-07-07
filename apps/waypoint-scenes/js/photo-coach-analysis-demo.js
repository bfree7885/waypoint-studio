/**
 * Photo Coach — deterministic Demo Analysis engine.
 * Uses browser-readable signals only. Always labeled Demo Analysis.
 */
(function (global) {
  "use strict";

  var SAMPLE_W = 200;
  var SAMPLE_H = 130;

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

    var histogram = new Array(16).fill(0);
    var colorBins = {};
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
        var lumR = 0.2126 * data[idR] + 0.7152 * data[idR + 1] + 0.0722 * data[idR + 2];
        var lumU = 0.2126 * data[idU] + 0.7152 * data[idU + 1] + 0.0722 * data[idU + 2];
        var lumD = 0.2126 * data[idD] + 0.7152 * data[idD + 1] + 0.0722 * data[idD + 2];
        var lap = Math.abs(4 * lumC - lumL - lumR - lumU - lumD);
        laplacianSum += lap;
        laplacianN++;
      }
    }

    for (var hi = 0; hi < data.length; hi += 4) {
      var lr = data[hi];
      var lg = data[hi + 1];
      var lb = data[hi + 2];
      var hl = 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
      histogram[clamp(Math.floor(hl / 16), 0, 15)]++;
      var bin = Math.floor(lr / 64) + "-" + Math.floor(lg / 64) + "-" + Math.floor(lb / 64);
      colorBins[bin] = (colorBins[bin] || 0) + 1;
    }

    var dominant = Object.keys(colorBins).sort(function (a, b) {
      return colorBins[b] - colorBins[a];
    }).slice(0, 3).map(function (k) {
      var p = k.split("-").map(Number);
      var names = ["deep", "mid", "bright"];
      var r = names[p[0]] || "mid";
      var g = names[p[1]] || "mid";
      var b = names[p[2]] || "mid";
      if (p[1] > p[0] && p[1] > p[2]) return "natural green";
      if (p[2] > p[0] && p[2] > p[1]) return "sky blue";
      if (p[0] > p[2]) return "warm earth";
      return r + "/" + g + "/" + b + " tones";
    });

    var lapVar = laplacianN ? laplacianSum / laplacianN : 0;
    var blurScore = clamp(100 - lapVar * 1.8, 0, 100);

    return {
      width: iw,
      height: ih,
      aspectRatio: iw / ih,
      orientation: iw > ih * 1.15 ? "landscape" : ih > iw * 1.15 ? "portrait" : "square",
      isPanoramic: iw / ih > 2.2,
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
      histogram: histogram.map(function (v) { return v / n; }),
      dominantColors: dominant,
      blurEstimate: blurScore,
      highlightClip: bright / n,
      shadowClip: dark / n,
      megapixels: round((iw * ih) / 1000000 * 10) / 10
    };
  }

  function scoreCategory(base, signals, weights) {
    var s = base;
    weights.forEach(function (w) {
      s += w.delta(signals);
    });
    return clamp(round(s), 40, 98);
  }

  function buildScores(signals, exif, outdoor) {
    var comp = scoreCategory(74, signals, [
      { delta: function (sig) { return sig.orientation === "landscape" ? 4 : sig.orientation === "portrait" ? 2 : 0; } },
      { delta: function (sig) { return sig.edgeDensity > 0.08 ? 5 : -3; } },
      { delta: function (sig) { return sig.vignetteLeft + sig.vignetteRight > 0.12 ? -4 : 3; } }
    ]);
    var light = scoreCategory(72, signals, [
      { delta: function (sig) { return sig.brightness > 95 && sig.brightness < 175 ? 6 : -5; } },
      { delta: function () { return outdoor && outdoor.daylight && outdoor.daylight.goldenHour ? 8 : 0; } },
      { delta: function (sig) { return sig.warmth > 0.18 ? 4 : 0; } }
    ]);
    var exposure = scoreCategory(70, signals, [
      { delta: function (sig) { return sig.brightFraction < 0.04 ? 8 : -12; } },
      { delta: function (sig) { return sig.darkFraction < 0.22 ? 6 : -8; } }
    ]);
    var color = scoreCategory(73, signals, [
      { delta: function (sig) { return sig.contrast > 35 && sig.contrast < 75 ? 5 : -4; } },
      { delta: function (sig) { return Math.abs(sig.warmth - sig.coolness) < 0.08 ? -3 : 4; } }
    ]);
    var sharp = scoreCategory(76, signals, [
      { delta: function (sig) { return sig.edgeDensity > 0.1 ? 6 : -5; } },
      { delta: function () { return exif && exif.iso && exif.iso > 3200 ? -10 : 3; } }
    ]);
    var subject = scoreCategory(71, signals, [
      { delta: function (sig) { return sig.edgeDensity > 0.09 ? 5 : -2; } },
      { delta: function (sig) { return sig.darkFraction > 0.15 && sig.darkFraction < 0.35 ? 4 : 0; } }
    ]);
    var story = scoreCategory(70, signals, [
      { delta: function () { return outdoor && outdoor.photography ? 6 : 0; } },
      { delta: function (sig) { return sig.contrast > 40 ? 4 : 0; } }
    ]);

    return [
      { category: "Composition", score: comp, reason: comp >= 80
        ? "Orientation and edge structure suggest intentional framing."
        : "Framing reads workable — tighten edges or clarify the anchor." },
      { category: "Light", score: light, reason: light >= 80
        ? "Brightness and warmth support natural outdoor modeling."
        : outdoor && outdoor.daylight && outdoor.daylight.goldenHour
          ? "Golden-hour window available — light quality should be strong when timed well."
          : "Light is flat or harsh — favor early/late windows." },
      { category: "Exposure", score: exposure, reason: exposure >= 80
        ? "Highlight and shadow balance look recoverable."
        : sigMsg(signals.brightFraction > 0.06, "Highlights may be clipping — recover headroom.",
            signals.darkFraction > 0.28, "Shadows are deep — lift locally for texture.") },
      { category: "Color", score: color, reason: color >= 80
        ? "Contrast and color separation read natural."
        : "Global color may need balance before contrast pushes." },
      { category: "Sharpness", score: sharp, reason: sharp >= 80
        ? "Edge density suggests acceptable subject sharpness for web."
        : "Softness detected — verify focus at 100% before printing." },
      { category: "Subject impact", score: subject, reason: subject >= 80
        ? "A clear tonal anchor appears in the frame."
        : "Subject separation could be stronger — crop or wait for cleaner background." },
      { category: "Story / emotion", score: story, reason: story >= 80
        ? "Atmosphere and field context support a contemplative read."
        : "Mood is present — add field context or a stronger narrative element." }
    ];
  }

  function sigMsg() {
    for (var i = 0; i < arguments.length; i += 2) {
      if (arguments[i]) return arguments[i + 1];
    }
    return "Exposure sits in a workable mid-range — refine in post.";
  }

  function buildStrengths(signals, outdoor) {
    var list = [];
    if (signals.contrast >= 32) {
      list.push({
        title: "Natural separation",
        whyItWorks: "Tonal contrast gives depth between subject and background.",
        preserveInEdit: "Mask clarity and contrast to the subject — avoid global crunch."
      });
    }
    if (signals.brightFraction < 0.05) {
      list.push({
        title: "Highlight headroom",
        whyItWorks: "Sky and bright areas retain detail — credible outdoor light.",
        preserveInEdit: "Recover highlights gently; do not flatten the sky."
      });
    }
    if (outdoor && outdoor.photography && outdoor.photography.summary) {
      list.push({
        title: "Field-aligned conditions",
        whyItWorks: "Dashboard context: " + outdoor.photography.summary,
        preserveInEdit: "Edit toward the mood you actually shot — don't fight the light."
      });
    }
    if (signals.edgeDensity > 0.09) {
      list.push({
        title: "Defined structure",
        whyItWorks: "Edge detail suggests a readable subject or landscape form.",
        preserveInEdit: "Sharpen output for web; check corners after crop for print."
      });
    }
    if (list.length < 3) {
      list.push({
        title: "Honest outdoor palette",
        whyItWorks: "Colors read natural rather than oversaturated — good foundation for refinement.",
        preserveInEdit: "Adjust white balance before pushing vibrance."
      });
    }
    if (list.length < 3) {
      list.push({
        title: "Usable dynamic range",
        whyItWorks: "Shadow and highlight regions appear editable without extreme clipping.",
        preserveInEdit: "Use local adjustments instead of a heavy global HDR look."
      });
    }
    return list.slice(0, 5);
  }

  function buildImprovements(signals, outdoor) {
    var list = [];
    if (signals.brightFraction > 0.05) {
      list.push({
        issue: "Bright hotspots",
        whyItMatters: "Clipped highlights pull attention and limit print size.",
        whatToDo: "Pull highlights −0.1 to −0.25 EV; use a sky mask if needed.",
        expectedImprovement: "Sky credibility and calmer eye path."
      });
    }
    if (signals.darkFraction > 0.25) {
      list.push({
        issue: "Heavy shadows",
        whyItMatters: "Lost shadow texture reads muddy on screen and in print.",
        whatToDo: "Lift shadows +0.2 to +0.35 EV with a gentle curve.",
        expectedImprovement: "Foreground depth without a flat HDR appearance."
      });
    }
    if (signals.contrast < 30) {
      list.push({
        issue: "Low global contrast",
        whyItMatters: "Flat images lack subject presence, especially on mobile.",
        whatToDo: "Add mild clarity on subject; optional light dehaze if haze is present.",
        expectedImprovement: "Stronger subject separation and snap."
      });
    }
    if (signals.vignetteLeft + signals.vignetteRight > 0.1) {
      list.push({
        issue: "Dark frame edges",
        whyItMatters: "Natural vignetting can compete with the subject.",
        whatToDo: "Crop or lift edge shadows; check for lens hood or filter vignette.",
        expectedImprovement: "Cleaner frame and stronger center focus."
      });
    }
    if (signals.warmth > 0.22 && signals.coolness < 0.08) {
      list.push({
        issue: "Warm color cast",
        whyItMatters: "Strong warmth can age foliage and skew skin/rock tones.",
        whatToDo: "Cool white balance slightly or split-tone shadows toward green.",
        expectedImprovement: "More believable natural color."
      });
    }
    if (outdoor && outdoor.alerts && outdoor.alerts.count) {
      list.push({
        issue: "Active weather alerts in your area",
        whyItMatters: "Safety and light quality may shift quickly outdoors.",
        whatToDo: "Re-check conditions before returning to the field.",
        expectedImprovement: "Safer shoot and better-timed light."
      });
    }
    while (list.length < 4) {
      list.push({
        issue: list.length === 0 ? "Composition refinement" : "Timing and angle",
        whyItMatters: "Small field changes often outperform heavy post-processing.",
        whatToDo: list.length < 2
          ? "Re-shoot 20 minutes earlier/later or lower your camera 12 inches."
          : "Try a vertical crop and isolate one anchor element.",
        expectedImprovement: "Clearer story and less editing debt."
      });
    }
    return list.slice(0, 6);
  }

  function buildEditPlan(signals) {
    var EditIntel = global.WaypointPhotoCoachEditIntel;
    if (EditIntel && EditIntel.buildFromSignals) {
      return EditIntel.buildFromSignals(signals);
    }
    return null;
  }

  function buildCrop(signals) {
    var primary = "3:2";
    if (signals.orientation === "portrait") primary = "4:5";
    else if (signals.isPanoramic) primary = "16:9";
    else if (signals.orientation === "square") primary = "1:1";
    var alts = ["3:2", "4:5", "1:1", "16:9", "5:4"];
    if (signals.orientation === "portrait") alts = ["4:5", "2:3", "1:1", "9:16"];
    else if (signals.isPanoramic) alts = ["16:9", "21:9", "3:2"];
    return {
      aspectRatio: primary,
      alternativeAspectRatios: alts.filter(function (r) { return r !== primary; }).slice(0, 3),
      reasoning: signals.orientation === "portrait"
        ? "Vertical frame suits subject-forward storytelling and mobile viewing."
        : signals.isPanoramic
          ? "Wide aspect preserves the panoramic sweep — trim only for distraction control."
          : "Classic 3:2 balances landscape depth with print options.",
      horizonNote: signals.skyBrightness > 0.35
        ? "Horizon likely in upper third — verify level before crop."
        : "Check horizon level — tilt reads quickly in landscapes.",
      subjectPlacement: signals.darkFraction > 0.2
        ? "Place the anchor on a lower-third intersection for depth."
        : "Center-weighted light — consider offsetting the subject for tension.",
      leadingLineSuggestion: signals.edgeDensity > 0.1
        ? "Strong edges detected — align crop so lines lead into the frame, not out."
        : "Look for natural diagonals (shoreline, ridge) and crop to strengthen them.",
      showOverlay: true
    };
  }

  function buildPrint(signals, overall) {
    var worthy = overall >= 75 && signals.brightFraction < 0.08 && signals.blurEstimate > 45;
    var maxSize = signals.width >= 5000 ? "24×36 max (test 16×24 first)" :
      signals.width >= 4000 ? "16×24" : signals.width >= 3000 ? "12×18" : "8×12 proof";
    return {
      worthy: worthy,
      worthyLabel: worthy ? "Yes — worthy of a test print" : "Not yet — refine exposure, crop, and sharpness",
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
        : "Highlights (" + round(signals.highlightClip * 100) + "% clip est.) or softness limit print size — edit first."
    };
  }

  function buildSceneSuggestion(signals, outdoor, overall) {
    var mood = "natural";
    var presetId = "still-lake";
    var motion = "slow-push-in";
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
      summary: "Demo suggestion from image tone" +
        (outdoor && outdoor.daylight && outdoor.daylight.goldenHour
          ? " and golden-hour field context." : ".")
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
    if (outdoor.daylight && outdoor.daylight.blueHour) {
      lines.push("Blue hour: " + outdoor.daylight.blueHour);
    }
    if (outdoor.daylight) {
      if (outdoor.daylight.goldenHour) lines.push("Golden hour: " + outdoor.daylight.goldenHour);
      if (outdoor.daylight.moonPhase) lines.push("Moon: " + outdoor.daylight.moonPhase);
    }
    if (outdoor.alerts && outdoor.alerts.count) {
      lines.push("Safety: " + outdoor.alerts.count + " NWS alert(s) — " + (outdoor.alerts.headline || "check conditions"));
    }
    if (outdoor.challenge) {
      lines.push("Today's challenge: " + outdoor.challenge);
    }
    var Outdoor = global.WaypointPhotoCoachOutdoorContext;
    var season = Outdoor && Outdoor.seasonFromDate
      ? Outdoor.seasonFromDate(outdoor.savedAt ? new Date(outdoor.savedAt) : new Date())
      : null;
    if (season) lines.push("Season: " + season);
    var impact = Outdoor && Outdoor.environmentImpact
      ? Outdoor.environmentImpact(outdoor)
      : (outdoor.photography && outdoor.photography.detail
        ? outdoor.photography.detail
        : signals.warmth > 0.18
          ? "Warm field light aligns with golden-hour coaching — preserve warmth in edits."
          : "Field context helps explain light direction and timing choices.");
    return {
      available: true,
      location: lines[0] || "Dashboard snapshot",
      lines: lines,
      photoImpact: impact
    };
  }

  function breakdownItem(category, score, reason, teachingNote) {
    return { category: category, score: score, reason: reason, teachingNote: teachingNote };
  }

  function buildPhotoBreakdown(signals, exif, outdoor, scores) {
    var byCat = {};
    scores.forEach(function (s) { byCat[s.category] = s.score; });
    var comp = byCat["Composition"] || 72;
    var light = byCat["Light"] || 72;
    var exp = byCat["Exposure"] || 70;
    var color = byCat["Color"] || 73;
    var sharp = byCat["Sharpness"] || 76;
    var subject = byCat["Subject impact"] || 71;
    var story = byCat["Story / emotion"] || 70;
    var tech = clamp(round((sharp + exp) / 2), 40, 98);
    var depth = clamp(round(70 + (signals.darkFraction > 0.15 ? 8 : -4) + (signals.contrast > 35 ? 6 : 0)), 40, 98);
    var balance = clamp(round(72 - (signals.vignetteLeft + signals.vignetteRight > 0.12 ? 10 : 0)), 40, 98);
    var fg = clamp(round(68 + (signals.darkFraction > 0.18 && signals.darkFraction < 0.35 ? 10 : 0)), 40, 98);
    var bg = clamp(round(74 + (signals.skyBrightness > 0.3 ? 4 : 0) - (signals.brightFraction > 0.06 ? 8 : 0)), 40, 98);
    var distract = clamp(round(78 - signals.brightFraction * 120 - (signals.vignetteLeft + signals.vignetteRight) * 40), 40, 98);

    return [
      breakdownItem("Composition", comp, "Frame orientation is " + signals.orientation + " at " + signals.width + "×" + signals.height + ".",
        "Composition is where you place the world inside the rectangle — ask what you included and what you excluded."),
      breakdownItem("Lighting", light, signals.warmth > 0.18 ? "Warm dominant light detected." : "Cool or neutral light character.",
        "Light reveals form. Side light shows texture; front light flattens; back light creates silhouette."),
      breakdownItem("Exposure", exp, "Highlight clip ~" + round(signals.highlightClip * 100) + "% · shadow clip ~" + round(signals.shadowClip * 100) + "%.",
        "Expose for what you cannot recover — usually sky highlights or critical shadow texture."),
      breakdownItem("Color", color, "Dominant palette: " + (signals.dominantColors || []).join(", ") + ".",
        "Color harmony comes from relationship, not saturation — balance white point before pushing vibrance."),
      breakdownItem("Technical quality", tech, exif && exif.iso ? "ISO " + exif.iso + " · " + signals.megapixels + " MP." : signals.megapixels + " MP capture.",
        "Technical quality gates how large you can print and how much you can crop."),
      breakdownItem("Sharpness", sharp, "Blur estimate " + round(signals.blurEstimate) + "/100 (higher = sharper).",
        "Sharpness is about the subject, not the whole frame — check eyes, anchor, or horizon at 100%."),
      breakdownItem("Storytelling", story, outdoor && outdoor.photography ? outdoor.photography.summary : "Mood inferred from tone and contrast.",
        "Story is what the viewer feels after three seconds — not the caption you would write."),
      breakdownItem("Subject", subject, signals.edgeDensity > 0.09 ? "Tonal anchor with readable edges." : "Subject separation is moderate.",
        "The subject is what you intend the eye to find first — everything else supports it."),
      breakdownItem("Foreground", fg, signals.darkFraction > 0.2 ? "Dark foreground mass — depth opportunity." : "Foreground is lighter — watch for competing brightness.",
        "Foreground interest invites the viewer into the frame like a path into the scene."),
      breakdownItem("Background", bg, signals.skyBrightness > 0.3 ? "Bright upper field — likely sky or open light." : "Background stays subdued.",
        "Backgrounds should explain context without stealing the subject."),
      breakdownItem("Distractions", distract, signals.brightFraction > 0.05 ? "Bright hotspots may pull the eye." : "Few obvious tonal distractions.",
        "Distractions are anything brighter or sharper than your subject outside the subject."),
      breakdownItem("Depth", depth, signals.contrast > 32 ? "Tonal layers suggest near-to-far separation." : "Flat tonal range — depth may read shallow.",
        "Depth is built with foreground, subject, and background layers — and with atmospheric fade."),
      breakdownItem("Visual balance", balance, signals.vignetteLeft + signals.vignetteRight > 0.1 ? "Edge weight may pull the frame." : "Weight is relatively centered.",
        "Balance is not symmetry — it is whether the frame feels stable or intentionally tense.")
    ];
  }

  function buildNarrative(signals, exif, outdoor, overall) {
    var parts = [];
    parts.push("This " + signals.orientation + " outdoor frame");
    if (signals.megapixels) parts.push("(" + signals.megapixels + " MP)");
    parts.push("reads as a " + (overall >= 78 ? "confident keeper" : overall >= 68 ? "solid field capture" : "learning exposure"));
    parts.push("with " + (signals.contrast > 38 ? "strong tonal separation" : "softer global contrast"));
    parts.push("and " + (signals.dominantWarm ? "warm natural light" : signals.coolness > 0.12 ? "cool atmospheric light" : "neutral daylight character") + ".");
    if (signals.brightFraction > 0.05) parts.push("Highlight areas are pushing — recover before print.");
    else if (signals.darkFraction > 0.25) parts.push("Shadows carry weight — lift locally to reveal texture.");
    if (outdoor && outdoor.daylight && outdoor.daylight.goldenHour) {
      parts.push("Field context places this near golden hour — lean into warmth and direction.");
    }
    if (exif && exif.focalLengthMm) {
      parts.push("At " + exif.focalLengthMm + "mm, consider how lens choice shaped compression and background separation.");
    }
    return parts.join(" ");
  }

  function buildLearningConcept(signals, outdoor) {
    var concepts = [];
    if (signals.contrast < 32) {
      concepts.push({
        title: "Atmospheric perspective",
        lesson: "Low contrast often means haze or flat light — distant objects fade in tone and saturation. Use that fade to push the subject forward, or return when air is clearer.",
        practice: "Shoot the same scene on a crisp morning and a hazy afternoon; compare depth."
      });
    }
    if (signals.orientation === "portrait") {
      concepts.push({
        title: "Foreground interest",
        lesson: "Vertical frames succeed when the near ground invites the eye upward. Rocks, ferns, or water at the bottom act as a doorstep into the scene.",
        practice: "Lower the camera 12 inches and include one foreground anchor."
      });
    }
    if (signals.edgeDensity > 0.1) {
      concepts.push({
        title: "Leading lines",
        lesson: "Strong edges in the frame can guide the eye — trails, shorelines, ridges. Ask where lines enter and where they exit.",
        practice: "Re-compose so the strongest line leads to your subject, not out of frame."
      });
    }
    if (signals.warmth > 0.2) {
      concepts.push({
        title: "Light direction",
        lesson: "Warm dominance suggests low sun angle or reflected warmth. Directional light models form — notice which side of objects is lit.",
        practice: "Note sun position; return when light crosses the subject at 90°."
      });
    }
    if (outdoor && outdoor.daylight && outdoor.daylight.blueHour) {
      concepts.push({
        title: "Blue hour color harmony",
        lesson: "Cool ambient sky mixed with warm artificial or horizon glow creates natural complementary tension.",
        practice: "Bracket blue hour and compare white balance choices."
      });
    }
    if (!concepts.length) {
      concepts.push({
        title: "Visual weight",
        lesson: "Every frame balances bright vs dark, sharp vs soft, warm vs cool. Your eye finds the heaviest element first — make sure it is your subject.",
        practice: "Squint at the image — what shape remains? That is your true composition."
      });
    }
    return concepts[0];
  }

  function buildChallenge(signals, outdoor) {
    if (outdoor && outdoor.daylight && outdoor.daylight.goldenHour) {
      return "Return during today's golden hour and shoot the same subject with the sun behind you, then beside you — compare shadow direction.";
    }
    if (signals.orientation === "landscape") {
      return "Re-shoot in vertical orientation from half your current height — foreground first, sky second.";
    }
    if (signals.contrast < 32) {
      return "Wait for softer light (cloud edge or blue hour) and reshoot without changing position.";
    }
    return "Isolate one subject against the simplest background you can find within 50 steps.";
  }

  function analyzeFromSignals(signals, file, exif, outdoorContext) {
    var breakdown = buildScores(signals, exif, outdoorContext);
    var overall = round(breakdown.reduce(function (a, b) { return a + b.score; }, 0) / breakdown.length);
    var letter = letterGrade(overall);
    var strengths = buildStrengths(signals, outdoorContext);
    var improvements = buildImprovements(signals, outdoorContext);
    var editIntelligence = buildEditPlan(signals);
    var suggestedCrop = buildCrop(signals);
    var printRec = buildPrint(signals, overall);
    var sceneSuggestion = buildSceneSuggestion(signals, outdoorContext, overall);
    var fieldInsights = buildFieldInsights(outdoorContext, signals);
    var photoBreakdown = buildPhotoBreakdown(signals, exif, outdoorContext, breakdown);
    var narrativeSummary = buildNarrative(signals, exif, outdoorContext, overall);
    var learningConcept = buildLearningConcept(signals, outdoorContext);

    return {
      version: "3.1.0",
      engineStatus: "disconnected",
      isDemo: true,
      isSample: true,
      trustLabel: "Demo Analysis",
      analyzedAt: new Date().toISOString(),
      imageName: file && file.name ? file.name : "photo.jpg",
      outdoorContext: outdoorContext || null,
      signals: signals,
      captureMetadata: exif && exif.hasExif ? {
        source: "EXIF", trust: "Live",
        make: exif.make, model: exif.model, iso: exif.iso,
        focalLengthMm: exif.focalLengthMm, exposureTimeSec: exif.exposureTimeSec,
        fNumber: exif.fNumber, dateTime: exif.dateTime, gps: exif.gps
      } : { source: "None", trust: "Not available" },
      overallGrade: {
        letter: letter,
        score: overall,
        summary: narrativeSummary,
        portfolioPotential: overall >= 78 ? "High" : overall >= 68 ? "Medium" : "Developing",
        printPotential: printRec.worthy ? "Good after edits" : "Screen-first for now",
        confidence: "Moderate — demo signals only, not full AI vision"
      },
      overallScore: overall,
      narrativeSummary: narrativeSummary,
      scoreBreakdown: breakdown,
      photoBreakdown: photoBreakdown,
      strengths: strengths,
      improvements: improvements,
      learningConcept: learningConcept,
      suggestedCrop: suggestedCrop,
      printRecommendation: printRec,
      editIntelligence: editIntelligence,
      fieldInsights: fieldInsights,
      nextShootChallenge: buildChallenge(signals, outdoorContext),
      fieldAssignment: buildChallenge(signals, outdoorContext),
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
    letterGrade: letterGrade
  };
})(window);
