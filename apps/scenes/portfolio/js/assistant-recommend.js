/**
 * Waypoint Scenes — Portfolio Assistant · Recommendation logic
 *
 * Pure, UI-free, deterministic, versioned. Turns collected signals into
 * explainable categories with qualitative confidence and evidence-only
 * rationale. NEVER claims a photo is objectively good/bad/professional and
 * NEVER auto-rejects. Insufficient evidence => "Needs review".
 *
 * Categories (system recommends; photographer decides):
 *   strong-candidate · supporting-image · similar-frame · needs-review
 * Confidence: higher | moderate | lower  (qualitative only, never a percentage)
 */
(function (global) {
  "use strict";

  var ANALYSIS_VERSION = "1.0.0";

  function Signals() {
    return global.WaypointScenesAssistantSignals;
  }

  var CATEGORY = {
    STRONG: "strong-candidate",
    SUPPORTING: "supporting-image",
    SIMILAR: "similar-frame",
    REVIEW: "needs-review"
  };

  var CATEGORY_LABEL = {
    "strong-candidate": "Strong candidate",
    "supporting-image": "Supporting image",
    "similar-frame": "Similar frame",
    "needs-review": "Needs review"
  };

  var CONFIDENCE_LABEL = {
    higher: "Higher confidence",
    moderate: "Moderate confidence",
    lower: "Lower confidence"
  };

  // ---- Similarity grouping (over the whole session set) -------------------

  function buildGroups(signalList) {
    var groups = [];
    var assigned = Object.create(null);

    function claim(ids) {
      ids.forEach(function (id) { assigned[id] = true; });
    }

    // Pass A — exact import fingerprint (strongest duplicate signal)
    var byFp = Object.create(null);
    signalList.forEach(function (s) {
      if (s.fingerprint) {
        (byFp[s.fingerprint] = byFp[s.fingerprint] || []).push(s.id);
      }
    });
    Object.keys(byFp).forEach(function (fp) {
      var ids = byFp[fp].filter(function (id) { return !assigned[id]; });
      if (ids.length >= 2) {
        claim(ids);
        groups.push({
          id: "grp-fp-" + groups.length,
          kind: "duplicate",
          strength: "exact",
          reason: "Shares an import fingerprint (same file identity) with " + (ids.length - 1) + " other frame" + (ids.length - 1 === 1 ? "" : "s") + " — likely the same photo imported more than once.",
          imageIds: ids
        });
      }
    });

    // Pass B — filename + byte size match (likely duplicate import)
    var byName = Object.create(null);
    signalList.forEach(function (s) {
      if (assigned[s.id]) return;
      if (s.filenameKey && s.byteSize != null) {
        var k = s.filenameKey + "::" + s.byteSize;
        (byName[k] = byName[k] || []).push(s.id);
      }
    });
    Object.keys(byName).forEach(function (k) {
      var ids = byName[k].filter(function (id) { return !assigned[id]; });
      if (ids.length >= 2) {
        claim(ids);
        groups.push({
          id: "grp-name-" + groups.length,
          kind: "duplicate",
          strength: "name-size",
          reason: "Same filename and file size as " + (ids.length - 1) + " other frame" + (ids.length - 1 === 1 ? "" : "s") + " — may be a duplicate import worth comparing.",
          imageIds: ids
        });
      }
    });

    // Pass C — capture-time bursts within the same aspect bucket
    var timed = signalList
      .filter(function (s) { return !assigned[s.id] && s.captureTime != null; })
      .sort(function (a, b) { return a.captureTime - b.captureTime; });
    var win = Signals() ? Signals().BURST_WINDOW_MS : 4000;
    var i = 0;
    while (i < timed.length) {
      var cluster = [timed[i]];
      var j = i + 1;
      while (
        j < timed.length &&
        timed[j].captureTime - cluster[cluster.length - 1].captureTime <= win &&
        timed[j].aspect === cluster[0].aspect
      ) {
        cluster.push(timed[j]);
        j++;
      }
      if (cluster.length >= 2) {
        var ids2 = cluster.map(function (s) { return s.id; });
        claim(ids2);
        groups.push({
          id: "grp-burst-" + groups.length,
          kind: "burst",
          strength: "burst",
          reason: "Captured within a few seconds of " + (ids2.length - 1) + " other frame" + (ids2.length - 1 === 1 ? "" : "s") + " — a burst worth comparing before keeping all.",
          imageIds: ids2
        });
      }
      i = j > i + 1 ? j : i + 1;
    }

    // Pass D — same framing + same capture month (weak variety hint)
    var byFrame = Object.create(null);
    signalList.forEach(function (s) {
      if (assigned[s.id]) return;
      if (s.aspect && s.captureMonth) {
        var k = s.aspect + "::" + s.captureMonth;
        (byFrame[k] = byFrame[k] || []).push(s.id);
      }
    });
    Object.keys(byFrame).forEach(function (k) {
      var ids = byFrame[k].filter(function (id) { return !assigned[id]; });
      if (ids.length >= 2) {
        claim(ids);
        var parts = k.split("::");
        groups.push({
          id: "grp-frame-" + groups.length,
          kind: "framing",
          strength: "framing",
          reason: "Similar framing (" + parts[0] + ") and capture month as " + (ids.length - 1) + " other frame" + (ids.length - 1 === 1 ? "" : "s") + " — check for variety.",
          imageIds: ids
        });
      }
    });

    return groups;
  }

  function groupIndex(groups) {
    var idx = Object.create(null);
    groups.forEach(function (g) {
      g.imageIds.forEach(function (id) { idx[id] = g; });
    });
    return idx;
  }

  // ---- Per-image strength classification ---------------------------------

  function classifyStrength(s) {
    var rationale = [];
    var strongHits = 0;

    if (s.favorite) {
      rationale.push("Marked as a favorite in your private library.");
      strongHits++;
    }
    if (s.selectionLabel === "keep") {
      rationale.push("You labeled this Keep during review.");
      strongHits++;
    }
    if (s.rating != null && s.rating >= 4) {
      rationale.push("Your private rating is " + s.rating + " of 5.");
      strongHits++;
    }
    if (s.coach && s.coach.analyzed && s.coach.gradeRank != null && s.coach.gradeRank >= 4) {
      rationale.push("Photo Coach noted a stronger session grade (" + s.coach.letterGrade + ") — a soft signal, not a ranking.");
      strongHits++;
    }

    if (strongHits > 0) {
      return {
        category: CATEGORY.STRONG,
        confidence: strongHits >= 2 ? "higher" : "moderate",
        rationale: rationale
      };
    }

    // Supporting-tier positives
    if (s.selectionLabel === "maybe") {
      rationale.push("You left this as Maybe during review — a supporting frame to weigh.");
    }
    if (s.rating === 3) {
      rationale.push("Your private rating is 3 of 5 — supporting-image territory.");
    }
    if (s.coach && s.coach.analyzed) {
      if (s.coach.gradeRank === 3) {
        rationale.push("Analyzed with a middling coach grade (" + s.coach.letterGrade + ") — worth weighing in context.");
      } else if (s.coach.overallScore != null && s.coach.overallScore >= 70) {
        rationale.push("Session score was relatively high for this frame — a soft signal only.");
      }
    }

    if (rationale.length > 0) {
      return { category: CATEGORY.SUPPORTING, confidence: "moderate", rationale: rationale };
    }

    return { category: CATEGORY.REVIEW, confidence: "lower", rationale: [] };
  }

  function similarConfidence(group) {
    if (!group) return "lower";
    if (group.strength === "exact") return "higher";
    if (group.strength === "name-size" || group.strength === "burst") return "moderate";
    return "lower";
  }

  /**
   * Recommend a category for one image given its signals + optional group.
   */
  function recommendForImage(s, group) {
    // Honor a prior explicit Reject — never auto-include, be transparent.
    var conflict = null;
    if (s.selectionLabel === "reject") {
      if (s.favorite || (s.rating != null && s.rating >= 4)) {
        conflict = "You labeled this Reject, but it is also " + (s.favorite ? "a favorite" : "rated " + s.rating + " of 5") + " — conflicting signals to reconcile.";
      } else {
        conflict = "You labeled this Reject during review — kept visible for you to reconsider, not auto-removed.";
      }
    }

    if (conflict) {
      return {
        imageId: s.id,
        category: CATEGORY.REVIEW,
        subKind: "conflict",
        confidence: "lower",
        rationale: [conflict],
        relatedImageIds: group ? group.imageIds.filter(function (id) { return id !== s.id; }) : [],
        groupId: group ? group.id : null
      };
    }

    var strength = classifyStrength(s);

    // Exact / name-size duplicates: comparison is the salient action.
    if (group && group.kind === "duplicate") {
      var rat = [group.reason];
      strength.rationale.forEach(function (r) { rat.push(r); });
      return {
        imageId: s.id,
        category: CATEGORY.SIMILAR,
        subKind: "possible-duplicate",
        confidence: similarConfidence(group),
        rationale: rat.slice(0, 3),
        relatedImageIds: group.imageIds.filter(function (id) { return id !== s.id; }),
        groupId: group.id
      };
    }

    // Non-duplicate group (burst / framing): strong frames stay strong but can
    // be compared; weaker members surface as Similar frame.
    if (group) {
      if (strength.category === CATEGORY.STRONG) {
        var rat2 = strength.rationale.slice();
        rat2.push(group.reason);
        return {
          imageId: s.id,
          category: CATEGORY.STRONG,
          subKind: null,
          confidence: strength.confidence,
          rationale: rat2.slice(0, 3),
          relatedImageIds: group.imageIds.filter(function (id) { return id !== s.id; }),
          groupId: group.id
        };
      }
      return {
        imageId: s.id,
        category: CATEGORY.SIMILAR,
        subKind: group.kind,
        confidence: similarConfidence(group),
        rationale: [group.reason].concat(strength.rationale).slice(0, 3),
        relatedImageIds: group.imageIds.filter(function (id) { return id !== s.id; }),
        groupId: group.id
      };
    }

    // No group — pure strength classification.
    var out = {
      imageId: s.id,
      category: strength.category,
      subKind: strength.category === CATEGORY.REVIEW ? "insufficient" : null,
      confidence: strength.confidence,
      rationale: strength.rationale.slice(0, 3),
      relatedImageIds: [],
      groupId: null
    };
    if (out.category === CATEGORY.REVIEW && !out.rationale.length) {
      out.rationale = [
        s.missingMedia
          ? "This frame is missing its local image data — review manually."
          : "Not enough review or analysis signal yet — choose manually if it fits your purpose."
      ];
    }
    return out;
  }

  /**
   * Analyze a set of LibraryImages.
   * @param {object[]} images
   * @param {{previous?:object}} [options] previous session cache for reuse
   * @returns {{analysisVersion, analyzedAt, recommendations, groups, order, status, message}}
   */
  function analyze(images, options) {
    options = options || {};
    var S = Signals();
    var list = Array.isArray(images) ? images.filter(Boolean) : [];

    if (!list.length) {
      return {
        analysisVersion: ANALYSIS_VERSION,
        analyzedAt: new Date().toISOString(),
        recommendations: {},
        groups: [],
        order: [],
        status: "empty",
        message: "No photographs in this source yet. Import or choose another source to begin."
      };
    }

    var signalList = list.map(function (img) { return S.collectSignals(img); }).filter(Boolean);
    var groups = buildGroups(signalList);
    var gIndex = groupIndex(groups);

    var prev = (options.previous && options.previous.recommendations) || null;
    var prevVersion = options.previous && options.previous.analysisVersion;
    var recommendations = {};

    signalList.forEach(function (s) {
      var sig = S.signalSignature(imageById(list, s.id));
      var group = gIndex[s.id] || null;
      // Reuse cached recommendation only when nothing relevant changed and the
      // group membership is identical — avoids recomputing unchanged frames.
      if (
        prev &&
        prevVersion === ANALYSIS_VERSION &&
        prev[s.id] &&
        prev[s.id].signature === sig &&
        sameGroup(prev[s.id], group)
      ) {
        recommendations[s.id] = prev[s.id];
        return;
      }
      var rec = recommendForImage(s, group);
      rec.signature = sig;
      recommendations[s.id] = rec;
    });

    var order = rankOrder(signalList, recommendations);

    var withEvidence = signalList.some(function (s) { return s.evidenceCount > 0; });
    var status = withEvidence ? "ok" : "insufficient-data";
    var message = withEvidence
      ? "Recommendations use your own labels, ratings, and coach notes when present — not a scoreboard. You decide what belongs."
      : "Not enough review or analysis signal in this source yet. Everything is marked Needs review — curate manually, and suggestions sharpen as you label frames.";

    return {
      analysisVersion: ANALYSIS_VERSION,
      analyzedAt: new Date().toISOString(),
      recommendations: recommendations,
      groups: groups,
      order: order,
      status: status,
      message: message
    };
  }

  function sameGroup(rec, group) {
    var prevId = rec.groupId || null;
    var nowId = group ? group.id : null;
    return prevId === nowId;
  }

  function imageById(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  var CATEGORY_WEIGHT = {
    "strong-candidate": 0,
    "similar-frame": 1,
    "supporting-image": 2,
    "needs-review": 3
  };
  var CONFIDENCE_WEIGHT = { higher: 0, moderate: 1, lower: 2 };

  function rankOrder(signalList, recommendations) {
    return signalList
      .map(function (s) { return s.id; })
      .sort(function (a, b) {
        var ra = recommendations[a];
        var rb = recommendations[b];
        var ca = CATEGORY_WEIGHT[ra.category] - CATEGORY_WEIGHT[rb.category];
        if (ca !== 0) return ca;
        return CONFIDENCE_WEIGHT[ra.confidence] - CONFIDENCE_WEIGHT[rb.confidence];
      });
  }

  global.WaypointScenesAssistantRecommend = {
    ANALYSIS_VERSION: ANALYSIS_VERSION,
    CATEGORY: CATEGORY,
    CATEGORY_LABEL: CATEGORY_LABEL,
    CONFIDENCE_LABEL: CONFIDENCE_LABEL,
    buildGroups: buildGroups,
    classifyStrength: classifyStrength,
    recommendForImage: recommendForImage,
    analyze: analyze
  };
})(typeof window !== "undefined" ? window : globalThis);
