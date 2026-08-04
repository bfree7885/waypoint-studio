/**
 * Waypoint Scenes — Portfolio Coach · Comparison logic
 *
 * Pure, UI-free. Diffs two (or a small set of) LibraryImage signal objects and
 * optional portfolio context. Emits structured comparison facts only — never
 * aesthetic verdicts. Every fact cites concrete field values.
 *
 * Modes: frame | portfolio-fit | role
 */
(function (global) {
  "use strict";

  var COMPARE_VERSION = "1.0.0";

  function Signals() {
    return global.WaypointScenesAssistantSignals;
  }

  function collect(img) {
    var S = Signals();
    return S ? S.collectSignals(img) : null;
  }

  function fmtRes(s) {
    if (!s) return null;
    // dimensions live on the raw image; signals carry aspect only — callers
    // attach width/height via enrich()
    if (s.width != null && s.height != null) return s.width + "×" + s.height;
    return null;
  }

  function enrich(img) {
    var s = collect(img);
    if (!s) return null;
    s.width = img.width != null ? img.width : null;
    s.height = img.height != null ? img.height : null;
    s.pixels = s.width != null && s.height != null ? s.width * s.height : null;
    s.purposeTags = Array.isArray(img.tags) ? img.tags : s.tags;
    return s;
  }

  function labelOf(s) {
    if (!s) return "Missing image";
    return s.filename || s.id || "Photograph";
  }

  function timeDeltaMs(a, b) {
    if (a == null || b == null) return null;
    return Math.abs(a - b);
  }

  function purposeOverlap(purpose, tags, hints) {
    if (!purpose) return [];
    var words = String(purpose)
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(function (w) { return w.length >= 3; });
    if (!words.length) return [];
    var bag = (tags || []).concat(hints || []).map(function (t) {
      return String(t).toLowerCase();
    });
    return words.filter(function (w) {
      return bag.some(function (t) { return t.indexOf(w) >= 0 || w.indexOf(t) >= 0; });
    });
  }

  /**
   * Build a portfolio context snapshot for fit / cover / sequence coaching.
   * @param {object|null} portfolio
   * @param {object[]} libraryImages
   */
  function portfolioContext(portfolio, libraryImages) {
    if (!portfolio) {
      return {
        present: false,
        id: null,
        title: null,
        purpose: null,
        coverImageId: null,
        imageIds: [],
        count: 0,
        aspects: {},
        months: {},
        fingerprints: {},
        orientationsInOrder: []
      };
    }
    var byId = Object.create(null);
    (libraryImages || []).forEach(function (img) { byId[img.id] = img; });
    var aspects = Object.create(null);
    var months = Object.create(null);
    var fingerprints = Object.create(null);
    var orientationsInOrder = [];
    (portfolio.imageIds || []).forEach(function (id) {
      var img = byId[id];
      var s = enrich(img);
      if (!s) return;
      if (s.aspect) aspects[s.aspect] = (aspects[s.aspect] || 0) + 1;
      if (s.captureMonth) months[s.captureMonth] = (months[s.captureMonth] || 0) + 1;
      if (s.fingerprint) fingerprints[s.fingerprint] = (fingerprints[s.fingerprint] || 0) + 1;
      orientationsInOrder.push(s.aspect || "unknown");
    });
    return {
      present: true,
      id: portfolio.id,
      title: portfolio.title || null,
      purpose: portfolio.purpose || null,
      coverImageId: portfolio.coverImageId || null,
      imageIds: (portfolio.imageIds || []).slice(),
      count: (portfolio.imageIds || []).length,
      aspects: aspects,
      months: months,
      fingerprints: fingerprints,
      orientationsInOrder: orientationsInOrder
    };
  }

  /**
   * Frame-level diffs between A and B.
   */
  function frameDiffs(sigA, sigB) {
    var facts = [];
    if (!sigA || !sigB) {
      facts.push({
        key: "missing-pair",
        signal: "media",
        label: "Pair completeness",
        valueA: sigA ? "present" : "missing",
        valueB: sigB ? "present" : "missing",
        technical: true
      });
      return facts;
    }

    if (sigA.aspect && sigB.aspect && sigA.aspect !== sigB.aspect) {
      facts.push({
        key: "aspect",
        signal: "aspect",
        label: "Orientation / framing",
        valueA: sigA.aspect,
        valueB: sigB.aspect,
        technical: false
      });
    }

    if (sigA.pixels != null && sigB.pixels != null && sigA.pixels !== sigB.pixels) {
      facts.push({
        key: "resolution",
        signal: "resolution",
        label: "Resolution",
        valueA: fmtRes(sigA),
        valueB: fmtRes(sigB),
        technical: true
      });
    }

    var dt = timeDeltaMs(sigA.captureTime, sigB.captureTime);
    if (dt != null) {
      facts.push({
        key: "timing",
        signal: "captureTime",
        label: "Capture timing",
        valueA: sigA.captureTime,
        valueB: sigB.captureTime,
        deltaMs: dt,
        technical: true
      });
    }

    if (sigA.fingerprint && sigB.fingerprint && sigA.fingerprint === sigB.fingerprint) {
      facts.push({
        key: "duplicate-fp",
        signal: "contentFingerprint",
        label: "Import fingerprint",
        valueA: "same",
        valueB: "same",
        technical: true
      });
    }

    if (
      sigA.filenameKey &&
      sigB.filenameKey &&
      sigA.byteSize != null &&
      sigB.byteSize != null &&
      sigA.filenameKey === sigB.filenameKey &&
      sigA.byteSize === sigB.byteSize &&
      !(sigA.fingerprint && sigB.fingerprint && sigA.fingerprint === sigB.fingerprint)
    ) {
      facts.push({
        key: "duplicate-name",
        signal: "filename+byteSize",
        label: "Filename and size",
        valueA: sigA.filenameKey + " · " + sigA.byteSize + " B",
        valueB: sigB.filenameKey + " · " + sigB.byteSize + " B",
        technical: true
      });
    }

    if (sigA.favorite !== sigB.favorite) {
      facts.push({
        key: "favorite",
        signal: "favorite",
        label: "Favorite",
        valueA: sigA.favorite ? "yes" : "no",
        valueB: sigB.favorite ? "yes" : "no",
        technical: false
      });
    }

    if (sigA.selectionLabel !== sigB.selectionLabel) {
      facts.push({
        key: "selection",
        signal: "selectionLabel",
        label: "Review label",
        valueA: sigA.selectionLabel || "none",
        valueB: sigB.selectionLabel || "none",
        technical: false
      });
    }

    if (sigA.rating != null || sigB.rating != null) {
      if (sigA.rating !== sigB.rating) {
        facts.push({
          key: "rating",
          signal: "rating",
          label: "Your private rating",
          valueA: sigA.rating != null ? String(sigA.rating) + "/5" : "unrated",
          valueB: sigB.rating != null ? String(sigB.rating) + "/5" : "unrated",
          technical: false
        });
      }
    }

    var cA = sigA.coach && sigA.coach.analyzed ? sigA.coach : null;
    var cB = sigB.coach && sigB.coach.analyzed ? sigB.coach : null;
    if (cA && cB && (cA.letterGrade !== cB.letterGrade || cA.overallScore !== cB.overallScore)) {
      facts.push({
        key: "coach",
        signal: "photoCoach",
        label: "Photo Coach (soft)",
        valueA: (cA.letterGrade || "—") + (cA.overallScore != null ? " · " + cA.overallScore : ""),
        valueB: (cB.letterGrade || "—") + (cB.overallScore != null ? " · " + cB.overallScore : ""),
        technical: false
      });
    }

    if (sigA.missingMedia || sigB.missingMedia) {
      facts.push({
        key: "media",
        signal: "media",
        label: "Local media",
        valueA: sigA.missingMedia ? "missing preview" : "available",
        valueB: sigB.missingMedia ? "missing preview" : "available",
        technical: true
      });
    }

    var tagsA = (sigA.tags || []).concat(sigA.subjectHints || []).join(", ") || "none";
    var tagsB = (sigB.tags || []).concat(sigB.subjectHints || []).join(", ") || "none";
    if (tagsA !== "none" || tagsB !== "none") {
      if (tagsA !== tagsB) {
        facts.push({
          key: "subjects",
          signal: "tags|subjectHints",
          label: "Tags / subject hints",
          valueA: tagsA,
          valueB: tagsB,
          technical: false
        });
      }
    }

    // Camera metadata only when at least one side has something
    var camA = sigA.camera;
    var camB = sigB.camera;
    if (camA || camB) {
      var keys = ["make", "model", "focalLengthMm", "fNumber", "iso", "shutter"];
      keys.forEach(function (k) {
        var va = camA && camA[k] != null ? String(camA[k]) : null;
        var vb = camB && camB[k] != null ? String(camB[k]) : null;
        if (va && vb && va !== vb) {
          facts.push({
            key: "cam-" + k,
            signal: "camera." + k,
            label: "Camera · " + k,
            valueA: va,
            valueB: vb,
            technical: true
          });
        }
      });
    }

    return facts;
  }

  /**
   * Portfolio-fit facts for A and B relative to a portfolio context.
   */
  function fitDiffs(sigA, sigB, pf) {
    var facts = [];
    if (!pf || !pf.present) {
      facts.push({
        key: "no-portfolio",
        signal: "portfolio",
        label: "Portfolio context",
        valueA: "none selected",
        valueB: "none selected",
        technical: false
      });
      return facts;
    }

    var inA = pf.imageIds.indexOf(sigA && sigA.id) >= 0;
    var inB = pf.imageIds.indexOf(sigB && sigB.id) >= 0;
    facts.push({
      key: "membership",
      signal: "portfolio.imageIds",
      label: "Already in portfolio",
      valueA: inA ? "yes" : "no",
      valueB: inB ? "yes" : "no",
      technical: false
    });

    if (sigA && sigA.aspect) {
      facts.push({
        key: "aspect-mix-a",
        signal: "portfolio.aspects",
        label: "Orientation mix (A vs portfolio)",
        valueA: sigA.aspect + " · portfolio has " + (pf.aspects[sigA.aspect] || 0),
        valueB: null,
        side: "A",
        technical: false
      });
    }
    if (sigB && sigB.aspect) {
      facts.push({
        key: "aspect-mix-b",
        signal: "portfolio.aspects",
        label: "Orientation mix (B vs portfolio)",
        valueA: null,
        valueB: sigB.aspect + " · portfolio has " + (pf.aspects[sigB.aspect] || 0),
        side: "B",
        technical: false
      });
    }

    function monthHits(sig) {
      if (!sig || !sig.captureMonth) return 0;
      return pf.months[sig.captureMonth] || 0;
    }
    if ((sigA && sigA.captureMonth) || (sigB && sigB.captureMonth)) {
      facts.push({
        key: "season",
        signal: "captureMonth",
        label: "Same capture month already in portfolio",
        valueA: sigA && sigA.captureMonth ? sigA.captureMonth + " ×" + monthHits(sigA) : "unknown",
        valueB: sigB && sigB.captureMonth ? sigB.captureMonth + " ×" + monthHits(sigB) : "unknown",
        technical: false
      });
    }

    function fpHits(sig) {
      if (!sig || !sig.fingerprint) return 0;
      return pf.fingerprints[sig.fingerprint] || 0;
    }
    if ((sigA && fpHits(sigA) > 0) || (sigB && fpHits(sigB) > 0)) {
      facts.push({
        key: "repetition",
        signal: "contentFingerprint",
        label: "Matching import fingerprint already in portfolio",
        valueA: fpHits(sigA) > 0 ? "yes (" + fpHits(sigA) + ")" : "no",
        valueB: fpHits(sigB) > 0 ? "yes (" + fpHits(sigB) + ")" : "no",
        technical: true
      });
    }

    if (pf.purpose) {
      var ovA = purposeOverlap(pf.purpose, sigA && sigA.tags, sigA && sigA.subjectHints);
      var ovB = purposeOverlap(pf.purpose, sigB && sigB.tags, sigB && sigB.subjectHints);
      facts.push({
        key: "purpose",
        signal: "purpose|tags",
        label: "Purpose keyword overlap (weak)",
        valueA: ovA.length ? ovA.join(", ") : "none found",
        valueB: ovB.length ? ovB.join(", ") : "none found",
        technical: false
      });
    }

    // Cover suitability signals
    facts.push({
      key: "cover-current",
      signal: "coverImageId",
      label: "Current cover",
      valueA: pf.coverImageId === (sigA && sigA.id) ? "is cover" : "not cover",
      valueB: pf.coverImageId === (sigB && sigB.id) ? "is cover" : "not cover",
      technical: false
    });

    // Sequence: consecutive orientation monotony hint
    var run = 0;
    var maxRun = 0;
    var last = null;
    pf.orientationsInOrder.forEach(function (o) {
      if (o === last && o !== "unknown") run++;
      else run = 1;
      last = o;
      if (run > maxRun) maxRun = run;
    });
    if (maxRun >= 3) {
      facts.push({
        key: "sequence-mono",
        signal: "portfolio.order",
        label: "Orientation run in current sequence",
        valueA: "longest run " + maxRun,
        valueB: "longest run " + maxRun,
        technical: false
      });
    }

    return facts;
  }

  /**
   * Soft role suggestions grounded in signals — never a forced winner.
   */
  function roleHints(sig, pf) {
    var roles = [];
    if (!sig) return roles;
    if (sig.aspect === "landscape" && (sig.pixels == null || sig.pixels >= 2000 * 1500)) {
      roles.push({ role: "cover-or-opening", reason: "Landscape orientation" + (sig.pixels != null ? " with substantial resolution" : "") + " may suit a cover or opening frame." });
    }
    if (sig.aspect === "portrait") {
      roles.push({ role: "detail-or-supporting", reason: "Portrait orientation may suit a detail or supporting placement." });
    }
    if (sig.favorite || sig.selectionLabel === "keep" || (sig.rating != null && sig.rating >= 4)) {
      roles.push({ role: "hero-or-subject", reason: "Your prior review signals (favorite, Keep, or high rating) may point toward a hero or subject role." });
    }
    if (sig.selectionLabel === "maybe" || (sig.rating != null && sig.rating <= 3 && sig.rating > 0)) {
      roles.push({ role: "supporting", reason: "A Maybe label or moderate rating may fit a supporting role rather than a lead." });
    }
    if ((sig.tags && sig.tags.length) || (sig.subjectHints && sig.subjectHints.length)) {
      roles.push({ role: "environmental-or-establishing", reason: "Tagged subject hints may support an environmental or establishing role — depending on how you read the frame." });
    }
    if (pf && pf.present && pf.coverImageId === sig.id) {
      roles.push({ role: "current-cover", reason: "This frame is already the portfolio cover." });
    }
    if (!roles.length) {
      roles.push({ role: "undecided", reason: "Evidence is limited for a specific role — assign one only if it helps your sequence." });
    }
    return roles;
  }

  /**
   * Full comparison package for a pair.
   * @param {object} imgA
   * @param {object} imgB
   * @param {{portfolio?:object, libraryImages?:object[], group?:object, source?:string}} options
   */
  function comparePair(imgA, imgB, options) {
    options = options || {};
    var sigA = enrich(imgA);
    var sigB = enrich(imgB);
    var pf = portfolioContext(options.portfolio || null, options.libraryImages || []);
    var frame = frameDiffs(sigA, sigB);
    var fit = fitDiffs(sigA, sigB, pf);
    var rolesA = roleHints(sigA, pf);
    var rolesB = roleHints(sigB, pf);

    var identicalSignals =
      frame.filter(function (f) { return f.key !== "missing-pair"; }).length === 0 &&
      !(sigA && sigB && (sigA.favorite || sigB.favorite || sigA.rating != null || sigB.rating != null));

    return {
      compareVersion: COMPARE_VERSION,
      comparedAt: new Date().toISOString(),
      source: options.source || "manual",
      groupId: options.group ? options.group.id : null,
      groupKind: options.group ? options.group.kind : null,
      groupReason: options.group ? options.group.reason : null,
      imageIdA: sigA ? sigA.id : (imgA && imgA.id) || null,
      imageIdB: sigB ? sigB.id : (imgB && imgB.id) || null,
      labelA: labelOf(sigA),
      labelB: labelOf(sigB),
      signalsA: sigA,
      signalsB: sigB,
      portfolio: pf,
      frameFacts: frame,
      fitFacts: fit,
      rolesA: rolesA,
      rolesB: rolesB,
      identicalSignals: identicalSignals,
      unrelatedHint: !options.group && frame.length <= 1 && !(sigA && sigB && sigA.captureMonth && sigA.captureMonth === sigB.captureMonth)
    };
  }

  global.WaypointScenesCoachCompare = {
    COMPARE_VERSION: COMPARE_VERSION,
    enrich: enrich,
    portfolioContext: portfolioContext,
    frameDiffs: frameDiffs,
    fitDiffs: fitDiffs,
    roleHints: roleHints,
    purposeOverlap: purposeOverlap,
    comparePair: comparePair
  };
})(typeof window !== "undefined" ? window : globalThis);
