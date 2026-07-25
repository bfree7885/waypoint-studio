/**
 * Waypoint Scenes — Auto Portfolio Builder · Draft engine
 *
 * Pure, UI-free, deterministic, versioned pipeline:
 *   source normalization → signal collection → eligibility →
 *   user-decision constraints → quality/candidate weighting →
 *   similarity reduction → diversity balancing → role assignment →
 *   sequencing → explanation
 *
 * Never invents pixel analysis. Never claims aesthetic certainty.
 * User decisions outrank recommendations.
 */
(function (global) {
  "use strict";

  var ANALYSIS_VERSION = "1.0.0";
  /** Transparent consider-cap for very large sources (metadata only). */
  var CONSIDER_CAP = 240;

  function Signals() {
    return global.WaypointScenesAssistantSignals;
  }
  function Recommend() {
    return global.WaypointScenesAssistantRecommend;
  }
  function Catalog() {
    return global.WaypointScenesBuilderCatalog;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function pixels(sig, img) {
    if (img && img.width != null && img.height != null) return img.width * img.height;
    return null;
  }

  function seasonKey(monthKey) {
    if (!monthKey) return null;
    var m = Number(String(monthKey).split("-")[1]);
    if (!isFinite(m)) return null;
    if (m === 12 || m <= 2) return "winter";
    if (m <= 5) return "spring";
    if (m <= 8) return "summer";
    return "autumn";
  }

  function groupMap(groups) {
    var map = Object.create(null);
    (groups || []).forEach(function (g) {
      (g.imageIds || []).forEach(function (id) {
        map[id] = g;
      });
    });
    return map;
  }

  /**
   * Normalize user decision bag. All fields optional; missing = no constraint.
   */
  function normalizeDecisions(decisions) {
    decisions = decisions || {};
    return {
      includeIds: Array.isArray(decisions.includeIds) ? decisions.includeIds.slice() : [],
      excludeIds: Array.isArray(decisions.excludeIds) ? decisions.excludeIds.slice() : [],
      coverImageId: decisions.coverImageId || null,
      openingImageId: decisions.openingImageId || null,
      closingImageId: decisions.closingImageId || null,
      pinnedOrder: decisions.pinnedOrder && typeof decisions.pinnedOrder === "object" ? Object.assign({}, decisions.pinnedOrder) : {},
      roles: decisions.roles && typeof decisions.roles === "object" ? Object.assign({}, decisions.roles) : {},
      swaps: Array.isArray(decisions.swaps) ? decisions.swaps.slice() : [],
      keepBothGroupIds: Array.isArray(decisions.keepBothGroupIds) ? decisions.keepBothGroupIds.slice() : [],
      permitCollapseKeepBoth: !!decisions.permitCollapseKeepBoth,
      manualOrder: Array.isArray(decisions.manualOrder) ? decisions.manualOrder.slice() : null,
      sequenceApplied: !!decisions.sequenceApplied
    };
  }

  function isExcluded(id, decisions) {
    return decisions.excludeIds.indexOf(id) >= 0;
  }

  function isIncluded(id, decisions) {
    return decisions.includeIds.indexOf(id) >= 0;
  }

  function applySwaps(selectedIds, swaps) {
    var ids = selectedIds.slice();
    (swaps || []).forEach(function (sw) {
      if (!sw || !sw.fromId || !sw.toId) return;
      var i = ids.indexOf(sw.fromId);
      if (i >= 0 && ids.indexOf(sw.toId) < 0) ids[i] = sw.toId;
      else if (i < 0 && ids.indexOf(sw.toId) < 0) {
        // swap into set replacing nothing already present — append if from was gone
      }
    });
    return ids;
  }

  /**
   * Soft candidate weight from real signals only. Not a product score.
   */
  function candidateWeight(sig, img, rec, pw) {
    var w = 0;
    var parts = [];
    if (sig.favorite) {
      w += 28 * pw.strong;
      parts.push("favorite");
    }
    if (sig.selectionLabel === "keep") {
      w += 24 * pw.strong;
      parts.push("keep");
    } else if (sig.selectionLabel === "maybe") {
      w += 10;
      parts.push("maybe");
    }
    if (sig.rating != null) {
      w += sig.rating * 4 * pw.strong;
      parts.push("rating:" + sig.rating);
    }
    if (sig.coach && sig.coach.analyzed) {
      if (sig.coach.gradeRank != null) w += sig.coach.gradeRank * 3;
      if (sig.coach.overallScore != null) w += Math.min(12, sig.coach.overallScore / 10);
      parts.push("coach-soft");
    }
    if (rec) {
      if (rec.category === "strong-candidate") w += 18 * pw.strong;
      else if (rec.category === "supporting-image") w += 10;
      else if (rec.category === "similar-frame") w += 6;
      else w += 2;
    }
    var px = pixels(sig, img);
    if (px != null) {
      w += Math.min(10, Math.log10(px + 1)) * pw.resolution;
      parts.push("resolution-soft");
    }
    if (sig.aspect === "landscape") w += 2 * pw.cover;
    if ((sig.tags && sig.tags.length) || (sig.subjectHints && sig.subjectHints.length)) {
      w += 3 * pw.environmental;
      parts.push("tags");
    }
    if (sig.missingMedia) w -= 15;
    if (sig.selectionLabel === "reject" && !sig.favorite) w -= 40;
    return { weight: w, parts: parts };
  }

  function eligibility(sig, img, decisions) {
    if (isExcluded(sig.id, decisions)) {
      return { ok: false, reason: "Excluded by your decision — stays out unless you clear it." };
    }
    if (isIncluded(sig.id, decisions)) {
      return { ok: true, reason: "Forced include by your decision." };
    }
    if (sig.selectionLabel === "reject" && !sig.favorite && !(sig.rating != null && sig.rating >= 4)) {
      return { ok: false, reason: "Labeled Reject in review — not auto-included." };
    }
    return { ok: true, reason: null };
  }

  /**
   * Similarity reduction: keep strongest (or keep-both) per group unless permitted.
   */
  function reduceSimilarity(ranked, gIndex, decisions, weightById) {
    var selected = [];
    var omitted = [];
    var seenGroups = Object.create(null);
    var keepBoth = {};
    (decisions.keepBothGroupIds || []).forEach(function (gid) {
      keepBoth[gid] = true;
    });

    ranked.forEach(function (row) {
      var g = gIndex[row.id];
      if (!g) {
        selected.push(row);
        return;
      }
      if (keepBoth[g.id] && !decisions.permitCollapseKeepBoth) {
        selected.push(row);
        return;
      }
      if (isIncluded(row.id, decisions)) {
        selected.push(row);
        return;
      }
      if (!seenGroups[g.id]) {
        seenGroups[g.id] = row.id;
        selected.push(row);
        return;
      }
      // Already have a representative — omit with alternative pointer
      omitted.push({
        imageId: row.id,
        reason: "Similar to another selection (" + (g.kind || "group") + ") — " + (g.reason || "limited repetition in the suggested draft."),
        alternativeTo: seenGroups[g.id],
        groupId: g.id,
        kind: "similarity"
      });
    });

    return { selected: selected, omitted: omitted };
  }

  /**
   * Diversity pass: prefer adding frames that fill under-represented buckets.
   */
  function balanceDiversity(candidates, targetCount, forcedIds, pw, limitations) {
    var selected = [];
    var selectedSet = Object.create(null);
    var buckets = {
      aspect: Object.create(null),
      month: Object.create(null),
      season: Object.create(null),
      tag: Object.create(null)
    };

    function bump(sig) {
      if (sig.aspect) buckets.aspect[sig.aspect] = (buckets.aspect[sig.aspect] || 0) + 1;
      if (sig.captureMonth) buckets.month[sig.captureMonth] = (buckets.month[sig.captureMonth] || 0) + 1;
      var sk = seasonKey(sig.captureMonth);
      if (sk) buckets.season[sk] = (buckets.season[sk] || 0) + 1;
      var tags = (sig.tags || []).concat(sig.subjectHints || []);
      tags.slice(0, 3).forEach(function (t) {
        var k = String(t).toLowerCase();
        buckets.tag[k] = (buckets.tag[k] || 0) + 1;
      });
    }

    function diversityBonus(sig) {
      var bonus = 0;
      if (sig.aspect && (buckets.aspect[sig.aspect] || 0) === 0) bonus += 8 * pw.variety;
      if (sig.captureMonth && (buckets.month[sig.captureMonth] || 0) === 0) bonus += 6 * pw.monthDiversity;
      var sk = seasonKey(sig.captureMonth);
      if (sk && (buckets.season[sk] || 0) === 0) bonus += 5 * pw.monthDiversity;
      var tags = (sig.tags || []).concat(sig.subjectHints || []);
      var fresh = tags.some(function (t) {
        return (buckets.tag[String(t).toLowerCase()] || 0) === 0;
      });
      if (fresh) bonus += 4 * pw.variety;
      return bonus;
    }

    // Forced includes first
    candidates.forEach(function (row) {
      if (forcedIds[row.id] && !selectedSet[row.id]) {
        selected.push(row);
        selectedSet[row.id] = true;
        bump(row.sig);
      }
    });

    var pool = candidates
      .filter(function (row) {
        return !selectedSet[row.id];
      })
      .slice();

    while (selected.length < targetCount && pool.length) {
      pool.sort(function (a, b) {
        var sa = a.weight + diversityBonus(a.sig);
        var sb = b.weight + diversityBonus(b.sig);
        return sb - sa;
      });
      var next = pool.shift();
      selected.push(next);
      selectedSet[next.id] = true;
      bump(next.sig);
    }

    if (!Object.keys(buckets.month).length) {
      limitations.push("Capture dates are missing on many frames — seasonal / month diversity is unavailable.");
    }
    if (!Object.keys(buckets.tag).length) {
      limitations.push("Subject tags are sparse or absent — subject variety cannot be claimed from metadata.");
    }

    return selected;
  }

  function assignRoles(selected, decisions, pw) {
    var roles = {};
    var n = selected.length;

    selected.forEach(function (row, idx) {
      var list = [];
      var manual = decisions.roles[row.id];
      if (Array.isArray(manual) && manual.length) {
        roles[row.id] = manual.slice();
        return;
      }
      if (typeof manual === "string" && manual) {
        roles[row.id] = [manual];
        return;
      }

      if (decisions.openingImageId === row.id) list.push("opening");
      if (decisions.closingImageId === row.id) list.push("closing");
      if (decisions.coverImageId === row.id) list.push("cover-candidate");

      var sig = row.sig;
      if (idx === 0 && list.indexOf("opening") < 0) list.push("opening");
      if (idx === n - 1 && n > 1 && list.indexOf("closing") < 0) list.push("closing");

      if (sig.favorite || sig.selectionLabel === "keep" || (row.rec && row.rec.category === "strong-candidate")) {
        if (idx <= Math.max(1, Math.floor(n * 0.35))) list.push("hero");
        else list.push("supporting");
      } else if (sig.aspect === "portrait") {
        list.push("detail");
      } else if ((sig.tags && sig.tags.length) || (sig.subjectHints && sig.subjectHints.length)) {
        list.push("environmental");
      } else if (row.rec && row.rec.category === "supporting-image") {
        list.push("supporting");
      } else if (row.rec && row.rec.category === "needs-review") {
        list.push("needs-review");
      } else {
        list.push("supporting");
      }

      if (sig.aspect === "landscape" && pixels(sig, row.img) != null && idx < 3) {
        if (list.indexOf("cover-candidate") < 0) list.push("cover-candidate");
      }
      if (idx > 0 && idx < n - 1 && list.indexOf("transition") < 0 && n >= 8 && idx % 4 === 0) {
        list.push("transition");
      }

      // unique
      var uniq = [];
      list.forEach(function (r) {
        if (uniq.indexOf(r) < 0) uniq.push(r);
      });
      roles[row.id] = uniq;
    });

    return roles;
  }

  function pickCover(selected, decisions, roles) {
    if (decisions.coverImageId) {
      var still = selected.some(function (r) {
        return r.id === decisions.coverImageId;
      });
      if (still) return decisions.coverImageId;
    }
    var best = null;
    var bestScore = -1;
    selected.forEach(function (row) {
      var s = 0;
      var r = roles[row.id] || [];
      if (r.indexOf("cover-candidate") >= 0) s += 5;
      if (r.indexOf("opening") >= 0) s += 3;
      if (row.sig.aspect === "landscape") s += 2;
      var px = pixels(row.sig, row.img);
      if (px != null) s += Math.min(4, Math.log10(px + 1));
      if (row.sig.favorite) s += 2;
      if (s > bestScore) {
        bestScore = s;
        best = row.id;
      }
    });
    return best || (selected[0] && selected[0].id) || null;
  }

  /**
   * Deterministic proposed sequence. Honors pins / opening / closing / manual order.
   */
  function proposeSequence(selected, roles, decisions, pw, limitations) {
    if (decisions.manualOrder && decisions.manualOrder.length) {
      var set = Object.create(null);
      selected.forEach(function (r) {
        set[r.id] = r;
      });
      var ordered = [];
      decisions.manualOrder.forEach(function (id) {
        if (set[id]) {
          ordered.push(set[id]);
          delete set[id];
        }
      });
      selected.forEach(function (r) {
        if (set[r.id]) ordered.push(r);
      });
      return { order: ordered.map(function (r) { return r.id; }), mode: "manual" };
    }

    var byId = Object.create(null);
    selected.forEach(function (r) {
      byId[r.id] = r;
    });

    var pinned = decisions.pinnedOrder || {};
    var slots = new Array(selected.length).fill(null);
    Object.keys(pinned).forEach(function (id) {
      var pos = Number(pinned[id]);
      if (isFinite(pos) && pos >= 0 && pos < slots.length && byId[id]) slots[pos] = id;
    });

    var opening = decisions.openingImageId && byId[decisions.openingImageId] ? decisions.openingImageId : null;
    var closing = decisions.closingImageId && byId[decisions.closingImageId] ? decisions.closingImageId : null;
    if (!opening) {
      selected.some(function (r) {
        if ((roles[r.id] || []).indexOf("opening") >= 0) {
          opening = r.id;
          return true;
        }
        return false;
      });
    }
    if (!closing) {
      for (var ci = selected.length - 1; ci >= 0; ci--) {
        if ((roles[selected[ci].id] || []).indexOf("closing") >= 0 && selected[ci].id !== opening) {
          closing = selected[ci].id;
          break;
        }
      }
    }

    var dated = selected.filter(function (r) {
      return r.sig.captureTime != null;
    }).length;
    if (dated < 2) {
      limitations.push("Fewer than two capture dates — chronology is not used as a sequence spine.");
    }

    var remaining = selected
      .map(function (r) {
        return r.id;
      })
      .filter(function (id) {
        if (opening && id === opening) return false;
        if (closing && id === closing) return false;
        return slots.indexOf(id) < 0;
      });

    // Sort remaining: soft chronology when available, else weight, with orientation spacing preference
    remaining.sort(function (a, b) {
      var ra = byId[a];
      var rb = byId[b];
      var ta = ra.sig.captureTime;
      var tb = rb.sig.captureTime;
      if (ta != null && tb != null && pw.chronology >= 1) {
        if (ta !== tb) return ta - tb;
      }
      // heroes earlier
      var ha = (roles[a] || []).indexOf("hero") >= 0 ? 0 : 1;
      var hb = (roles[b] || []).indexOf("hero") >= 0 ? 0 : 1;
      if (ha !== hb) return ha - hb;
      return rb.weight - ra.weight;
    });

    // Orientation rhythm pass — swap neighbors if same orientation and alternate available
    for (var i = 0; i < remaining.length - 1; i++) {
      var a = byId[remaining[i]];
      var b = byId[remaining[i + 1]];
      if (a.sig.aspect && b.sig.aspect && a.sig.aspect === b.sig.aspect) {
        for (var j = i + 2; j < Math.min(remaining.length, i + 5); j++) {
          var c = byId[remaining[j]];
          if (c.sig.aspect && c.sig.aspect !== a.sig.aspect) {
            var tmp = remaining[i + 1];
            remaining[i + 1] = remaining[j];
            remaining[j] = tmp;
            break;
          }
        }
      }
      // Similarity breathing: if same group consecutive, try swap
      var ga = a.groupId;
      var gb = b.groupId;
      if (ga && gb && ga === gb) {
        for (var k = i + 2; k < Math.min(remaining.length, i + 6); k++) {
          if (byId[remaining[k]].groupId !== ga) {
            var t2 = remaining[i + 1];
            remaining[i + 1] = remaining[k];
            remaining[k] = t2;
            break;
          }
        }
      }
    }

    var out = [];
    if (opening) out.push(opening);
    remaining.forEach(function (id) {
      out.push(id);
    });
    if (closing && out.indexOf(closing) < 0) out.push(closing);

    // Place pinned into slots (rebuild around pins)
    if (Object.keys(pinned).length) {
      var finalSlots = new Array(out.length).fill(null);
      Object.keys(pinned).forEach(function (id) {
        var pos = Number(pinned[id]);
        if (isFinite(pos) && pos >= 0 && pos < finalSlots.length && out.indexOf(id) >= 0) {
          finalSlots[pos] = id;
        }
      });
      var queue = out.filter(function (id) {
        return finalSlots.indexOf(id) < 0;
      });
      for (var s = 0; s < finalSlots.length; s++) {
        if (!finalSlots[s]) finalSlots[s] = queue.shift();
      }
      out = finalSlots.filter(Boolean);
    }

    return { order: out, mode: "proposed" };
  }

  function explainInclusion(row, roles, coverId, purpose) {
    var reasons = [];
    var Cat = Catalog();
    if (row.forced) reasons.push("Included by your decision.");
    if (row.sig.favorite) reasons.push("Marked as a favorite in your private library.");
    if (row.sig.selectionLabel === "keep") reasons.push("You labeled this Keep during review.");
    if (row.sig.rating != null && row.sig.rating >= 4) reasons.push("Private rating is " + row.sig.rating + " of 5.");
    if (row.rec && row.rec.category === "strong-candidate") reasons.push("Assistant category: Strong candidate (soft prior).");
    if (row.rec && row.rec.category === "supporting-image") reasons.push("Possible supporting image based on your prior signals.");
    if ((roles[row.id] || []).indexOf("opening") >= 0) reasons.push("Strong opening candidate for this suggested draft.");
    if (coverId === row.id) reasons.push("Proposed cover candidate from orientation/resolution soft hints (or your cover choice).");
    if ((roles[row.id] || []).indexOf("closing") >= 0) reasons.push("Suggested as a closing placement.");
    if (row.diversityNote) reasons.push(row.diversityNote);
    if (!reasons.length) {
      if (row.sig.evidenceCount === 0) reasons.push("Lower-confidence placement — Review recommended; limited labels or analysis on this frame.");
      else reasons.push("Adds useful variety within the purpose (“" + (purpose.label || "General") + "”).");
    }
    return reasons.map(Cat.sanitizeText).slice(0, 4);
  }

  function buildAlternatives(selectedIds, omitted, ranked, gIndex, decisions) {
    var alts = [];
    var selectedSet = Object.create(null);
    selectedIds.forEach(function (id) {
      selectedSet[id] = true;
    });

    // Cover / opening / closing alternatives from next-best ranked
    function topUnused(n, pred) {
      var out = [];
      for (var i = 0; i < ranked.length && out.length < n; i++) {
        var id = ranked[i].id;
        if (selectedSet[id]) continue;
        if (isExcluded(id, decisions)) continue;
        if (pred && !pred(ranked[i])) continue;
        out.push(id);
      }
      return out;
    }

    alts.push({
      kind: "cover",
      forImageId: decisions.coverImageId || selectedIds[0] || null,
      candidates: topUnused(3, function (row) {
        return row.sig.aspect === "landscape" || row.sig.favorite;
      }),
      label: "Alternative choice for cover"
    });
    alts.push({
      kind: "opening",
      forImageId: selectedIds[0] || null,
      candidates: topUnused(3),
      label: "Alternative choice for opening"
    });
    if (selectedIds.length > 1) {
      alts.push({
        kind: "closing",
        forImageId: selectedIds[selectedIds.length - 1],
        candidates: topUnused(3),
        label: "Alternative choice for closing"
      });
    }

    omitted.forEach(function (om) {
      if (om.kind === "similarity" && om.alternativeTo) {
        alts.push({
          kind: "similarity-omission",
          forImageId: om.alternativeTo,
          candidates: [om.imageId],
          label: "Alternative choice — similar frame that was omitted",
          groupId: om.groupId
        });
      }
    });

    // Low-confidence selected → alternatives
    selectedIds.forEach(function (id) {
      var row = null;
      for (var i = 0; i < ranked.length; i++) if (ranked[i].id === id) {
        row = ranked[i];
        break;
      }
      if (row && row.sig.evidenceCount === 0) {
        alts.push({
          kind: "low-confidence",
          forImageId: id,
          candidates: topUnused(2),
          label: "Alternative choice — lower-confidence placement"
        });
      }
    });

    return alts;
  }

  /**
   * Main entry: build a suggested draft.
   *
   * @param {{
   *   images: object[],
   *   purposeId?: string,
   *   sizeId?: string,
   *   customCount?: number,
   *   decisions?: object,
   *   previous?: object,
   *   mode?: "regenerate-remaining"|"rebuild"
   * }} input
   */
  function buildDraft(input) {
    input = input || {};
    var Cat = Catalog();
    var S = Signals();
    var Rec = Recommend();
    var purpose = Cat.purposeById(input.purposeId || "general");
    var pw = Cat.purposeWeights(purpose.id);
    var target = Cat.resolveTargetCount(input.sizeId || "medium", input.customCount);
    var decisions = normalizeDecisions(input.decisions);
    var limitations = [];
    var images = Array.isArray(input.images) ? input.images.filter(Boolean) : [];

    if (!images.length) {
      return {
        analysisVersion: ANALYSIS_VERSION,
        analyzedAt: nowIso(),
        purposeId: purpose.id,
        purposeLabel: purpose.label,
        targetCount: target,
        selectedIds: [],
        order: [],
        roles: {},
        coverImageId: null,
        explanations: {},
        omitted: [],
        alternatives: [],
        groups: [],
        limitations: ["No photographs in this source. Import or choose another real source — drafts never invent photographs."],
        status: "empty",
        message: "No photographs in this source yet.",
        considerCapApplied: false,
        sourceCount: 0
      };
    }

    var considerCapApplied = false;
    var working = images;
    if (working.length > CONSIDER_CAP) {
      considerCapApplied = true;
      limitations.push(
        "Source has " +
          working.length +
          " photographs — the draft considered a transparent pool of up to " +
          CONSIDER_CAP +
          " (strongest soft signals + forced includes), not a full-res scan."
      );
      // Prefer forcing includes, then soft weight pre-rank for cap
      var pre = working.map(function (img) {
        var sig = S.collectSignals(img);
        var cw = candidateWeight(sig, img, null, pw);
        return { img: img, sig: sig, weight: cw.weight + (isIncluded(img.id, decisions) ? 1000 : 0) };
      });
      pre.sort(function (a, b) {
        return b.weight - a.weight;
      });
      working = pre.slice(0, CONSIDER_CAP).map(function (r) {
        return r.img;
      });
      // Ensure forced includes present
      decisions.includeIds.forEach(function (id) {
        var found = images.filter(function (img) {
          return img.id === id;
        })[0];
        if (found && !working.some(function (w) { return w.id === id; })) working.push(found);
      });
    }

    if (working.length < target) {
      limitations.push(
        "Source has " +
          working.length +
          " eligible frames after constraints — smaller than the guide size (" +
          target +
          "). The suggested draft uses what is available."
      );
    }

    if (purpose.requiresDatesForSeason) {
      var withDates = working.filter(function (img) {
        return !!img.captureDate;
      }).length;
      if (withDates < Math.min(4, working.length)) {
        limitations.push(
          "Calendar purpose works best with capture dates. Many frames lack dates — month diversity is limited and not invented."
        );
      }
    }
    if (purpose.noInventedRules) {
      limitations.push("Competition shortlist uses your Keep / favorite / strong-candidate signals only — no contest rules are invented.");
    }

    var analysis = Rec.analyze(working, { previous: input.previous && input.previous.assistantCache });
    var gIndex = groupMap(analysis.groups);
    var ranked = [];
    var ineligible = [];

    working.forEach(function (img) {
      var sig = S.collectSignals(img);
      if (!sig) return;
      var el = eligibility(sig, img, decisions);
      var rec = analysis.recommendations[img.id] || null;
      var cw = candidateWeight(sig, img, rec, pw);
      var row = {
        id: img.id,
        img: img,
        sig: sig,
        rec: rec,
        weight: cw.weight,
        weightParts: cw.parts,
        forced: isIncluded(img.id, decisions),
        groupId: gIndex[img.id] ? gIndex[img.id].id : null,
        diversityNote: null
      };
      if (!el.ok) {
        ineligible.push({ imageId: img.id, reason: el.reason, kind: "ineligible" });
        return;
      }
      ranked.push(row);
    });

    ranked.sort(function (a, b) {
      if (a.forced !== b.forced) return a.forced ? -1 : 1;
      return b.weight - a.weight;
    });

    var reduced = reduceSimilarity(ranked, gIndex, decisions, null);
    var omitted = reduced.omitted.concat(ineligible);

    // High-ranking omitted (not just similarity) — if we trim for size
    var forcedIds = Object.create(null);
    decisions.includeIds.forEach(function (id) {
      forcedIds[id] = true;
    });

    var balanced = balanceDiversity(reduced.selected, target, forcedIds, pw, limitations);

    // Track size-trim omissions
    var balSet = Object.create(null);
    balanced.forEach(function (r) {
      balSet[r.id] = true;
    });
    reduced.selected.forEach(function (r) {
      if (!balSet[r.id] && !isExcluded(r.id, decisions)) {
        omitted.push({
          imageId: r.id,
          reason: "Solid soft signals, but the suggested draft reached its size guide — inspect as an alternative.",
          alternativeTo: null,
          kind: "size-trim",
          weight: r.weight
        });
      }
    });

    // Mark diversity notes
    balanced.forEach(function (r) {
      if (r.sig.aspect && balanced.filter(function (x) { return x.sig.aspect === r.sig.aspect; }).length <= 2) {
        r.diversityNote = "Adds useful variety in orientation within this suggested draft.";
      }
    });

    // Apply swaps (user chose alternative)
    var selectedIds = balanced.map(function (r) {
      return r.id;
    });
    selectedIds = applySwaps(selectedIds, decisions.swaps);
    // Rehydrate rows after swaps
    var byRank = Object.create(null);
    ranked.forEach(function (r) {
      byRank[r.id] = r;
    });
    working.forEach(function (img) {
      if (!byRank[img.id]) {
        var sig = S.collectSignals(img);
        byRank[img.id] = {
          id: img.id,
          img: img,
          sig: sig,
          rec: analysis.recommendations[img.id] || null,
          weight: 0,
          forced: isIncluded(img.id, decisions),
          groupId: gIndex[img.id] ? gIndex[img.id].id : null
        };
      }
    });
    var selected = selectedIds
      .map(function (id) {
        return byRank[id];
      })
      .filter(Boolean);

    var roles = assignRoles(selected, decisions, pw);
    var coverImageId = pickCover(selected, decisions, roles);
    var seq = proposeSequence(selected, roles, decisions, pw, limitations);

    // Reorder selected to sequence
    var order = seq.order.filter(function (id) {
      return selected.some(function (r) {
        return r.id === id;
      });
    });
    selected.forEach(function (r) {
      if (order.indexOf(r.id) < 0) order.push(r.id);
    });

    var explanations = {};
    selected.forEach(function (row) {
      explanations[row.id] = {
        reasons: explainInclusion(row, roles, coverImageId, purpose),
        confidence:
          row.sig.evidenceCount >= 3 ? "higher" : row.sig.evidenceCount >= 1 ? "moderate" : "lower",
        roles: roles[row.id] || [],
        label:
          row.sig.evidenceCount === 0
            ? "Lower-confidence placement"
            : (roles[row.id] || []).indexOf("opening") >= 0
              ? "Strong opening candidate"
              : (roles[row.id] || []).indexOf("supporting") >= 0
                ? "Possible supporting image"
                : "Suggested draft selection"
      };
    });

    var alternatives = buildAlternatives(order, omitted, ranked, gIndex, decisions);

    // Sort omitted high-rank first for inspectability
    omitted.sort(function (a, b) {
      return (b.weight || 0) - (a.weight || 0);
    });

    var status = selected.length ? "ok" : "empty-draft";
    var message = selected.length
      ? "Suggested draft ready — review selection and proposed sequence. Nothing is saved until you approve."
      : "No eligible photographs after your exclusions and source constraints.";

    return {
      analysisVersion: ANALYSIS_VERSION,
      analyzedAt: nowIso(),
      purposeId: purpose.id,
      purposeLabel: purpose.label,
      purposeSummary: purpose.summary,
      targetCount: target,
      selectedIds: order.slice(),
      order: order.slice(),
      roles: roles,
      coverImageId: coverImageId,
      openingImageId: decisions.openingImageId || order[0] || null,
      closingImageId: decisions.closingImageId || (order.length > 1 ? order[order.length - 1] : null),
      explanations: explanations,
      omitted: omitted,
      alternatives: alternatives,
      groups: analysis.groups,
      limitations: limitations,
      status: status,
      message: Cat.sanitizeText(message),
      considerCapApplied: considerCapApplied,
      sourceCount: images.length,
      consideredCount: working.length,
      sequenceMode: seq.mode,
      assistantCache: {
        analysisVersion: analysis.analysisVersion,
        recommendations: analysis.recommendations
      }
    };
  }

  /**
   * Diff current portfolio vs draft for rebuild preview.
   */
  function diffAgainstPortfolio(portfolio, draft) {
    portfolio = portfolio || {};
    draft = draft || {};
    var current = Array.isArray(portfolio.imageIds) ? portfolio.imageIds.slice() : [];
    var next = Array.isArray(draft.order) ? draft.order.slice() : [];
    var curSet = Object.create(null);
    var nextSet = Object.create(null);
    current.forEach(function (id) {
      curSet[id] = true;
    });
    next.forEach(function (id) {
      nextSet[id] = true;
    });
    var additions = next.filter(function (id) {
      return !curSet[id];
    });
    var removals = current.filter(function (id) {
      return !nextSet[id];
    });
    var orderChanged = current.length === next.length && current.some(function (id, i) {
      return id !== next[i];
    });
    if (current.length !== next.length) orderChanged = true;
    var coverChanged = (portfolio.coverImageId || null) !== (draft.coverImageId || null);
    return {
      additions: additions,
      removals: removals,
      orderChanged: !!orderChanged,
      coverChanged: !!coverChanged,
      currentCount: current.length,
      nextCount: next.length
    };
  }

  global.WaypointScenesBuilderEngine = {
    ANALYSIS_VERSION: ANALYSIS_VERSION,
    CONSIDER_CAP: CONSIDER_CAP,
    normalizeDecisions: normalizeDecisions,
    buildDraft: buildDraft,
    diffAgainstPortfolio: diffAgainstPortfolio,
    candidateWeight: candidateWeight,
    proposeSequence: proposeSequence
  };
})(typeof window !== "undefined" ? window : globalThis);
