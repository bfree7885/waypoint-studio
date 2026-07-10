/**
 * Photo Coach — heuristic analysis engine (pixel sampling only, honestly labeled).
 */
(function (global) {
  "use strict";

  var Model = function () { return global.PhotoCoachCritiqueModel; };
  var Sampler = function () { return global.PhotoCoachPixelSampler; };

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function scoreFromSignals(signals) {
    var s = 72;
    if (signals.brightness > 95 && signals.brightness < 175) s += 6;
    else s -= 5;
    if (signals.brightFraction < 0.05) s += 5;
    else s -= 8;
    if (signals.darkFraction < 0.25) s += 4;
    else s -= 6;
    if (signals.contrast > 32 && signals.contrast < 75) s += 5;
    if (signals.edgeDensity > 0.09) s += 4;
    if (signals.blurEstimate > 50) s += 3;
    else s -= 4;
    if (signals.vignetteLeft + signals.vignetteRight > 0.12) s -= 4;
    return clamp(Math.round(s), 45, 92);
  }

  function buildImpression(signals, meta, score) {
    var parts = [];
    parts.push("This " + signals.orientation + " photograph");
    if (meta && meta.megapixels) parts.push("at " + meta.megapixels + " MP");
    parts.push(score >= 78 ? "reads as a strong field capture" : score >= 65 ? "has solid material to work with" : "is a useful study frame");
    parts.push("with " + (signals.contrast > 38 ? "clear tonal separation" : "softer overall contrast") + ".");
    if (signals.brightFraction > 0.05) parts.push("Highlights are pushing — recovery will matter.");
    else if (signals.darkFraction > 0.25) parts.push("Shadows carry weight — local lifting will reveal texture.");
    else parts.push("Exposure looks workable for gentle refinement.");
    parts.push("This feedback is based on sampled pixels in your browser, not full AI vision.");
    return parts.join(" ");
  }

  function buildWhatWorks(signals, M) {
    var items = [];
    if (signals.contrast >= 32) {
      items.push(M.normalizeItem("Tonal separation gives depth between subject and background.", "Composition"));
    }
    if (signals.edgeDensity > 0.09) {
      items.push(M.normalizeItem("Readable structure and edges suggest a clear anchor in the frame.", "Subject placement"));
    }
    if (signals.brightFraction < 0.05) {
      items.push(M.normalizeItem("Bright areas retain headroom — skies and highlights look recoverable.", "Light"));
    }
    if (signals.warmth > 0.15 && signals.warmth > signals.coolness) {
      items.push(M.normalizeItem("Warm light adds mood without looking artificially graded.", "Mood"));
    }
    if (signals.orientation === "landscape" && signals.skyBrightness > 0.25) {
      items.push(M.normalizeItem("Open sky or upper-field brightness can frame the scene naturally.", "Composition"));
    }
    if (signals.blurEstimate > 55) {
      items.push(M.normalizeItem("Edge sharpness looks acceptable for web sharing at this sample scale.", "Focus"));
    }
    if (items.length < 2) {
      items.push(M.normalizeItem("Natural color and brightness provide a honest starting point for editing.", "Color"));
    }
    return items.slice(0, 5);
  }

  function buildWhatWeakens(signals, M) {
    var items = [];
    if (signals.brightFraction > 0.05) {
      items.push(M.normalizeItem("Bright hotspots may clip and pull attention away from the subject.", "Exposure"));
    }
    if (signals.darkFraction > 0.25) {
      items.push(M.normalizeItem("Heavy shadows can hide foreground texture and read muddy on screen.", "Exposure"));
    }
    if (signals.contrast < 30) {
      items.push(M.normalizeItem("Low global contrast can make the subject feel distant or flat.", "Mood"));
    }
    if (signals.vignetteLeft + signals.vignetteRight > 0.1) {
      items.push(M.normalizeItem("Dark frame edges compete with the center — check lens vignette or crop.", "Cropping"));
    }
    if (signals.warmth > 0.22 && signals.coolness < 0.08) {
      items.push(M.normalizeItem("A strong warm cast may skew foliage and rock tones.", "White balance"));
    }
    if (signals.blurEstimate < 45) {
      items.push(M.normalizeItem("Softness is visible at sample resolution — verify focus at 100%.", "Focus"));
    }
    if (signals.edgeDensity < 0.06) {
      items.push(M.normalizeItem("Few strong edges — the subject may not separate clearly from the background.", "Subject placement"));
    }
    if (!items.length) {
      items.push(M.normalizeItem("Minor clutter or busy edges — simplify the frame on your next attempt.", "Clutter"));
    }
    return items.slice(0, 5);
  }

  function buildSuggestedEdits(signals, M) {
    var edits = [];
    if (signals.brightFraction > 0.05) {
      edits.push(M.normalizeEdit("Reduce highlights", "Pull highlights down slightly and mask the sky if needed."));
    }
    if (signals.darkFraction > 0.25) {
      edits.push(M.normalizeEdit("Lift shadows", "Raise shadow tones locally — avoid a flat HDR look."));
    }
    if (signals.contrast < 32) {
      edits.push(M.normalizeEdit("Add contrast", "Apply mild clarity or contrast on the subject only."));
    }
    if (signals.dominantWarm) {
      edits.push(M.normalizeEdit("Cool white balance", "Neutralize warmth before pushing saturation."));
    } else if (signals.coolness > 0.15) {
      edits.push(M.normalizeEdit("Warm slightly", "A small warmth shift can feel more natural at dawn or dusk."));
    }
    if (signals.vignetteLeft + signals.vignetteRight > 0.1) {
      edits.push(M.normalizeEdit("Crop or brighten edges", "Trim distracting corners or lift edge shadows."));
    }
    if (signals.orientation === "landscape" && signals.width / signals.height > 1.6) {
      edits.push(M.normalizeEdit("Consider crop", "A tighter crop may strengthen the subject on the rule-of-thirds."));
    }
    if (signals.blurEstimate < 50) {
      edits.push(M.normalizeEdit("Sharpen carefully", "Output sharpening for web — check noise first."));
    }
    if (edits.length < 3) {
      edits.push(M.normalizeEdit("Straighten horizon", "A level horizon reads instantly more intentional."));
    }
    return edits.slice(0, 6);
  }

  function buildNextTime(signals, meta, M) {
    var tips = [];
    if (signals.brightFraction > 0.05 || signals.warmth > 0.18) {
      tips.push(M.normalizeNext("Wait for softer light", "Try golden hour or thin cloud cover to tame highlights."));
    }
    if (signals.orientation === "landscape") {
      tips.push(M.normalizeNext("Try vertical", "Shoot the same scene in portrait for a stronger mobile story."));
    }
    if (signals.edgeDensity < 0.08) {
      tips.push(M.normalizeNext("Move closer", "Isolate one anchor element against a simpler background."));
    }
    if (signals.darkFraction > 0.28) {
      tips.push(M.normalizeNext("Shoot lower", "Include foreground interest to lead the eye into the frame."));
    }
  if (meta && meta.focalLengthMm && meta.focalLengthMm < 28) {
      tips.push(M.normalizeNext("Try longer focal length", "Compression can simplify busy wide-angle scenes."));
    }
    if (signals.contrast < 32) {
      tips.push(M.normalizeNext("Return after weather changes", "Clearer air or directional sun adds depth."));
    }
    if (!tips.length) {
      tips.push(M.normalizeNext("Bracket exposure", "Shoot one stop under and over to protect highlights and shadows."));
    }
    return tips.slice(0, 5);
  }

  function analyzeLoadedImage(loadResult, metadata) {
    var M = Model();
    var S = Sampler();
    if (!M || !S) return Promise.reject(new Error("Analysis modules not loaded."));

    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        var signals = S.sampleFromImage(img);
        if (!signals) {
          reject(new Error("Could not sample image pixels."));
          return;
        }
        var meta = metadata || {};
        var score = scoreFromSignals(signals);
        var critique = M.emptyCritique();
        critique.id = "pc-" + Date.now().toString(36);
        critique.analyzedAt = new Date().toISOString();
        critique.filename = meta.filename || (loadResult.file && loadResult.file.name) || "photo";
        critique.score = score;
        critique.metadata = meta;
        critique.overallImpression = buildImpression(signals, meta, score);
        critique.whatWorks = buildWhatWorks(signals, M);
        critique.whatWeakens = buildWhatWeakens(signals, M);
        critique.suggestedEdits = buildSuggestedEdits(signals, M);
        critique.nextTime = buildNextTime(signals, meta, M);
        critique._signals = signals;
        resolve(critique);
      };
      img.onerror = function () {
        reject(new Error("Could not read image for analysis."));
      };
      img.src = loadResult.url;
    });
  }

  global.PhotoCoachAnalysisEngine = {
    analyzeLoadedImage: analyzeLoadedImage,
    scoreFromSignals: scoreFromSignals
  };
})(window);
