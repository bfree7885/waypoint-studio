/**
 * Waypoint Scenes — Portfolio Assistant · Signal collection layer
 *
 * Pure, UI-free. Reads real LibraryImage fields and normalizes them into an
 * honest `signals` object. NEVER invents EXIF, scores, or pixel analysis.
 * Every field here traces to docs/scenes/portfolio-assistant-signal-audit.md.
 *
 * Also resolves session "sources" (library / collection / portfolio / shoot)
 * down to LibraryImage ids so downstream logic reads one source of truth.
 */
(function (global) {
  "use strict";

  var BURST_WINDOW_MS = 4000; // capture-time proximity for a likely burst

  function coach(img) {
    return (img && img.moduleRefs && img.moduleRefs.photoCoach) || null;
  }

  function gradeRank(letter) {
    if (!letter) return null;
    var L = String(letter).trim().toUpperCase().charAt(0);
    var map = { A: 5, B: 4, C: 3, D: 2, F: 1 };
    return map[L] != null ? map[L] : null;
  }

  function parseTime(iso) {
    if (!iso) return null;
    var t = Date.parse(String(iso).replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3"));
    return isFinite(t) ? t : null;
  }

  function monthKey(iso) {
    var t = parseTime(iso);
    if (t == null) return null;
    var d = new Date(t);
    return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0");
  }

  function aspectBucket(img) {
    if (!img || img.width == null || img.height == null || !img.height) {
      if (img && img.orientation) return img.orientation;
      return null;
    }
    var r = img.width / img.height;
    if (r > 1.25) return "landscape";
    if (r < 0.8) return "portrait";
    return "square";
  }

  function presentCamera(img) {
    var c = img && img.camera;
    if (!c) return null;
    var out = {};
    ["make", "model", "lens", "focalLengthMm", "fNumber", "iso", "shutter", "exposureTimeSec"].forEach(
      function (k) {
        if (c[k] != null && c[k] !== "") out[k] = c[k];
      }
    );
    return Object.keys(out).length ? out : null;
  }

  /**
   * Normalize one LibraryImage into an honest signals object.
   * Missing fields stay null — they are not fabricated.
   */
  function collectSignals(img) {
    if (!img || !img.id) return null;
    var c = coach(img);
    var analyzed = !!(c && c.analysisStatus === "analyzed");
    var coachOut = null;
    if (analyzed && (c.letterGrade || c.overallScore != null)) {
      coachOut = {
        analyzed: true,
        letterGrade: c.letterGrade || null,
        gradeRank: gradeRank(c.letterGrade),
        overallScore: c.overallScore != null ? c.overallScore : null,
        shootId: c.shootId || null
      };
    } else if (c && c.shootId) {
      coachOut = { analyzed: false, letterGrade: null, gradeRank: null, overallScore: null, shootId: c.shootId };
    }

    var hasThumb = !!(img.media && (img.media.thumbnailDataUrl || img.media.hasThumbnail));
    var hasOriginal = !!(img.media && img.media.hasOriginal);

    var signals = {
      id: img.id,
      filename: img.filename || img.originalFilename || null,
      hasThumbnail: hasThumb,
      hasOriginal: hasOriginal,
      missingMedia: !hasThumb && !hasOriginal,
      favorite: !!img.favorite || img.selectionLabel === "favorite",
      selectionLabel: img.selectionLabel || null,
      rating: img.rating != null ? img.rating : null,
      coach: coachOut,
      captureTime: parseTime(img.captureDate),
      captureMonth: monthKey(img.captureDate),
      fingerprint: img.contentFingerprint || null,
      filenameKey: img.filename || img.originalFilename || null,
      byteSize: img.byteSize != null ? img.byteSize : null,
      aspect: aspectBucket(img),
      camera: presentCamera(img),
      tags: Array.isArray(img.tags) ? img.tags.slice() : [],
      subjectHints: Array.isArray(img.subjectHints) ? img.subjectHints.slice() : [],
      collectionIds: Array.isArray(img.collectionIds) ? img.collectionIds.slice() : []
    };

    var count = 0;
    if (signals.favorite) count++;
    if (signals.selectionLabel && signals.selectionLabel !== "favorite") count++;
    if (signals.rating != null) count++;
    if (signals.coach && signals.coach.analyzed) count++;
    if (signals.captureTime != null) count++;
    if (signals.fingerprint) count++;
    signals.evidenceCount = count;
    return signals;
  }

  /** True when at least one image in the set carries a usable signal. */
  function anyEvidence(images) {
    return (images || []).some(function (img) {
      var s = collectSignals(img);
      return s && s.evidenceCount > 0;
    });
  }

  /**
   * Stable signature of the fields that drive a recommendation. Used to skip
   * recompute when nothing relevant changed.
   */
  function signalSignature(img) {
    var s = collectSignals(img);
    if (!s) return "none";
    return [
      s.favorite ? 1 : 0,
      s.selectionLabel || "-",
      s.rating != null ? s.rating : "-",
      s.coach && s.coach.analyzed ? (s.coach.letterGrade || "") + ":" + (s.coach.overallScore != null ? s.coach.overallScore : "") : "-",
      s.captureTime != null ? s.captureTime : "-",
      s.fingerprint || "-",
      s.filenameKey || "-",
      s.byteSize != null ? s.byteSize : "-",
      s.aspect || "-",
      s.missingMedia ? "m" : "-"
    ].join("|");
  }

  // ---- Session source resolution -----------------------------------------

  function imagesByCollection(libraryImages, collectionId) {
    return (libraryImages || []).filter(function (img) {
      return (img.collectionIds || []).indexOf(collectionId) >= 0;
    });
  }

  function imagesByShoot(libraryImages, shootId) {
    return (libraryImages || []).filter(function (img) {
      var c = coach(img);
      return c && c.shootId === shootId;
    });
  }

  /**
   * @param {{type:string, ref?:string, imageIds?:string[]}} spec
   * @param {{libraryImages:object[], collections?:object[], portfolios?:object[], candidateSessions?:object[]}} ctx
   * @returns {{type,ref,label,imageIds,images}}
   */
  function resolveSource(spec, ctx) {
    spec = spec || { type: "library" };
    ctx = ctx || {};
    var lib = ctx.libraryImages || [];
    var byId = {};
    lib.forEach(function (img) { byId[img.id] = img; });

    var images = [];
    var label = "Your Photo Library";

    if (spec.type === "collection" && spec.ref) {
      images = imagesByCollection(lib, spec.ref);
      var col = (ctx.collections || []).filter(function (c) { return c.id === spec.ref; })[0];
      label = col ? "Collection · " + col.name : "Collection";
    } else if (spec.type === "portfolio" && spec.ref) {
      var pf = (ctx.portfolios || []).filter(function (p) { return p.id === spec.ref; })[0];
      var ids = pf ? pf.imageIds || [] : [];
      images = ids.map(function (id) { return byId[id]; }).filter(Boolean);
      label = pf ? "Portfolio · " + pf.title : "Portfolio";
    } else if (spec.type === "shoot" && spec.ref) {
      images = imagesByShoot(lib, spec.ref);
      label = "Shoot · " + String(spec.ref).slice(0, 12);
    } else if (spec.type === "candidate-session" && spec.ref) {
      var cs = (ctx.candidateSessions || []).filter(function (s) { return s.id === spec.ref; })[0];
      var csIds = cs ? cs.imageIds || [] : [];
      images = csIds.map(function (id) { return byId[id]; }).filter(Boolean);
      label = cs ? "Candidate review · " + (cs.title || cs.id.slice(0, 8)) : "Candidate review";
    } else if (spec.type === "selected" && Array.isArray(spec.imageIds)) {
      images = spec.imageIds.map(function (id) { return byId[id]; }).filter(Boolean);
      label = "Selected library photographs (" + images.length + ")";
    } else {
      images = lib.slice();
      label = "Your Photo Library";
    }

    return {
      type: spec.type || "library",
      ref: spec.ref || null,
      label: label,
      imageIds: images.map(function (img) { return img.id; }),
      images: images
    };
  }

  /** Enumerate source options that actually have data. */
  function listSources(ctx) {
    ctx = ctx || {};
    var lib = ctx.libraryImages || [];
    var out = [{ type: "library", ref: null, label: "Your Photo Library", count: lib.length }];

    (ctx.collections || []).forEach(function (col) {
      var n = imagesByCollection(lib, col.id).length;
      if (n > 0) out.push({ type: "collection", ref: col.id, label: col.name, count: n });
    });

    (ctx.portfolios || []).forEach(function (p) {
      out.push({ type: "portfolio", ref: p.id, label: p.title, count: (p.imageIds || []).length });
    });

    var shoots = {};
    lib.forEach(function (img) {
      var c = coach(img);
      if (c && c.shootId) shoots[c.shootId] = (shoots[c.shootId] || 0) + 1;
    });
    Object.keys(shoots).forEach(function (sid) {
      if (shoots[sid] > 0) out.push({ type: "shoot", ref: sid, label: "Shoot " + sid.slice(0, 8), count: shoots[sid] });
    });

    (ctx.candidateSessions || []).forEach(function (s) {
      var n = (s.imageIds || []).length;
      if (n > 0) {
        out.push({
          type: "candidate-session",
          ref: s.id,
          label: "Candidate review · " + (s.title || s.id.slice(0, 8)),
          count: n
        });
      }
    });

    return out;
  }

  global.WaypointScenesAssistantSignals = {
    BURST_WINDOW_MS: BURST_WINDOW_MS,
    collectSignals: collectSignals,
    anyEvidence: anyEvidence,
    signalSignature: signalSignature,
    aspectBucket: aspectBucket,
    monthKey: monthKey,
    gradeRank: gradeRank,
    resolveSource: resolveSource,
    listSources: listSources
  };
})(typeof window !== "undefined" ? window : globalThis);
