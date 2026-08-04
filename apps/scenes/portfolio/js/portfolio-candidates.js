/**
 * Waypoint Scenes — Portfolio candidate suggestions
 *
 * Honesty contract:
 * - Labels are observational suggestions, not objective truth.
 * - Prefer: Suggested / Likely candidate / Worth reviewing / Similar to another selection
 * - Explain only when evidence fields exist; never invent EXIF or scores.
 * - Empty analysis → empty suggestions (manual selection still works).
 */
(function (global) {
  "use strict";

  var LABEL = {
    SUGGESTED: "Suggested",
    LIKELY: "Likely candidate",
    WORTH: "Worth reviewing",
    SIMILAR: "Similar to another selection"
  };

  function coach(img) {
    return (img && img.moduleRefs && img.moduleRefs.photoCoach) || {};
  }

  function hasEvidence(img) {
    if (!img) return false;
    if (img.favorite) return true;
    if (img.selectionLabel) return true;
    if (img.rating != null) return true;
    var c = coach(img);
    if (c.analysisStatus === "analyzed" && (c.letterGrade || c.overallScore != null)) return true;
    if (img.captureDate) return true;
    if (img.contentFingerprint) return true;
    return false;
  }

  function gradeRank(letter) {
    if (!letter) return null;
    var L = String(letter).trim().toUpperCase().charAt(0);
    var map = { A: 5, B: 4, C: 3, D: 2, F: 1 };
    return map[L] != null ? map[L] : null;
  }

  function monthKey(iso) {
    if (!iso) return null;
    var d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0");
  }

  function aspectBucket(img) {
    if (!img || img.width == null || img.height == null || !img.height) return null;
    var r = img.width / img.height;
    if (r > 1.25) return "landscape";
    if (r < 0.8) return "portrait";
    return "square";
  }

  function similarReason(img, other) {
    if (!img || !other || img.id === other.id) return null;
    if (img.contentFingerprint && other.contentFingerprint && img.contentFingerprint === other.contentFingerprint) {
      return "Shares a content fingerprint with another selection — worth comparing before keeping both.";
    }
    if (
      img.filename &&
      other.filename &&
      img.filename === other.filename &&
      img.byteSize != null &&
      other.byteSize != null &&
      img.byteSize === other.byteSize
    ) {
      return "Same filename and file size as another selection — may be a duplicate import.";
    }
    var a = aspectBucket(img);
    var b = aspectBucket(other);
    var ma = monthKey(img.captureDate);
    var mb = monthKey(other.captureDate);
    if (a && b && a === b && ma && mb && ma === mb) {
      return "Similar framing and capture month to another selection — variety may help.";
    }
    return null;
  }

  function buildFromEvidence(img) {
    var reasons = [];
    var rank = 0;
    var label = null;
    var c = coach(img);
    var sel = img.selectionLabel;

    if (img.favorite || sel === "favorite") {
      label = LABEL.SUGGESTED;
      rank = Math.max(rank, 90);
      reasons.push("Marked as a favorite in your private library.");
    }
    if (sel === "keep") {
      if (!label || rank < 80) {
        label = LABEL.SUGGESTED;
        rank = Math.max(rank, 82);
      }
      reasons.push("You labeled this Keep during review.");
    }
    if (img.rating != null && img.rating >= 4) {
      if (!label || rank < 78) {
        label = LABEL.LIKELY;
        rank = Math.max(rank, 78);
      }
      reasons.push("Private rating is " + img.rating + " of 5 — a likely candidate for a set.");
    }
    if (c.analysisStatus === "analyzed") {
      var gr = gradeRank(c.letterGrade);
      if (gr != null && gr >= 4) {
        if (!label || rank < 75) {
          label = LABEL.SUGGESTED;
          rank = Math.max(rank, 75);
        }
        reasons.push(
          "Photo Coach noted a stronger session grade (" +
            c.letterGrade +
            ") — suggested, not a ranking."
        );
      } else if (gr != null && gr === 3) {
        if (!label) {
          label = LABEL.WORTH;
          rank = Math.max(rank, 55);
        }
        reasons.push("Analyzed with a middling coach grade — worth reviewing in context of the set.");
      } else if (c.overallScore != null && c.overallScore >= 80) {
        if (!label || rank < 70) {
          label = LABEL.LIKELY;
          rank = Math.max(rank, 70);
        }
        reasons.push("Session score was relatively high for this frame — a likely candidate when scores exist.");
      }
    }
    if (sel === "maybe") {
      if (!label || rank < 50) {
        label = LABEL.WORTH;
        rank = Math.max(rank, 50);
      }
      reasons.push("You left this as Maybe — worth reviewing for supporting use.");
    }
    if (img.rating === 3 && !label) {
      label = LABEL.WORTH;
      rank = 45;
      reasons.push("Mid rating — supporting image territory, not automatic inclusion.");
    }
    if (sel === "reject") {
      return null;
    }

    if (!label) return null;
    return {
      imageId: img.id,
      label: label,
      explanation: reasons.slice(0, 2).join(" "),
      rank: rank,
      kind: label === LABEL.SUGGESTED ? "suggested" : label === LABEL.LIKELY ? "likely" : "worth-reviewing"
    };
  }

  /**
   * @param {object[]} libraryImages
   * @param {{ selectedIds?: string[], limit?: number }} options
   */
  function suggestCandidates(libraryImages, options) {
    options = options || {};
    var selected = {};
    (options.selectedIds || []).forEach(function (id) {
      selected[id] = true;
    });
    var limit = options.limit != null ? options.limit : 48;
    var images = Array.isArray(libraryImages) ? libraryImages : [];

    var anyEvidence = images.some(hasEvidence);
    if (!anyEvidence) {
      return {
        suggestions: [],
        status: "insufficient-data",
        message:
          "Not enough review or analysis signals yet. Choose frames manually — suggestions will appear after Keep/Maybe labels, ratings, or Photo Coach sessions exist."
      };
    }

    var selectedImages = images.filter(function (img) {
      return selected[img.id];
    });
    var out = [];
    var seen = {};

    images.forEach(function (img) {
      if (!img || !img.id || selected[img.id] || seen[img.id]) return;
      if (img.selectionLabel === "reject") return;

      var similarHit = null;
      for (var i = 0; i < selectedImages.length; i++) {
        var why = similarReason(img, selectedImages[i]);
        if (why) {
          similarHit = {
            imageId: img.id,
            label: LABEL.SIMILAR,
            explanation: why,
            rank: 88,
            kind: "similar"
          };
          break;
        }
      }

      // When curating, similarity warnings outrank generic strength suggestions
      // so the photographer can compare before adding near-duplicates.
      if (similarHit && selectedImages.length) {
        seen[img.id] = true;
        out.push(similarHit);
        return;
      }

      var base = buildFromEvidence(img);
      if (base) {
        seen[img.id] = true;
        out.push(base);
      }
    });

    out.sort(function (a, b) {
      return b.rank - a.rank;
    });

    return {
      suggestions: out.slice(0, limit),
      status: out.length ? "ok" : "no-matches",
      message: out.length
        ? "Suggestions use your private labels, ratings, and coach notes when available — not a scoreboard."
        : "No suggested frames for this portfolio yet. Add from the library, or label Keep/favorites in Shoot Review."
    };
  }

  global.WaypointScenesPortfolioCandidates = {
    LABEL: LABEL,
    hasEvidence: hasEvidence,
    suggestCandidates: suggestCandidates,
    similarReason: similarReason
  };
})(typeof window !== "undefined" ? window : globalThis);
