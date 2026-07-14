/**
 * Photo Coach — Similar-image grouping for a shoot.
 * Groups bursts, near-duplicates, and similar compositions.
 * Never deletes images; groups are for review convenience only.
 */
(function (global) {
  "use strict";

  function id(prefix) {
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  }

  function parseExifTime(img) {
    var ex = img && img.exif;
    if (!ex) return null;
    var raw = ex.dateTimeOriginal || ex.dateTime || ex.captureDateTime || null;
    if (!raw) return null;
    // EXIF often "YYYY:MM:DD HH:MM:SS"
    var normalized = String(raw).replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
    var t = Date.parse(normalized);
    return isFinite(t) ? t : null;
  }

  function styleVec(img) {
    var st = (img.analysis && img.analysis.styleSignals) || {};
    return {
      brightness: st.brightness != null ? st.brightness : 50,
      contrast: st.contrast != null ? st.contrast : 50,
      saturation: st.saturation != null ? st.saturation * 100 : 50,
      warmth: st.warmth != null ? st.warmth * 100 : 50,
      sharpness: st.sharpness != null ? st.sharpness : 50,
      orientation: st.orientation || "landscape"
    };
  }

  function styleDistance(a, b) {
    var va = styleVec(a);
    var vb = styleVec(b);
    if (va.orientation !== vb.orientation) return 999;
    var db = va.brightness - vb.brightness;
    var dc = va.contrast - vb.contrast;
    var ds = va.saturation - vb.saturation;
    var dw = va.warmth - vb.warmth;
    var dsh = (va.sharpness - vb.sharpness) * 0.35;
    return Math.sqrt(db * db + dc * dc + ds * ds + dw * dw + dsh * dsh);
  }

  function genreKey(img) {
    var g = img.analysis && img.analysis.genre;
    if (!g || g.uncertain || !g.label) return null;
    return g.label;
  }

  function scoreOf(img) {
    if (!img || !img.analysis) return 0;
    return img.analysis.overallScore != null
      ? img.analysis.overallScore
      : (img.analysis.overallGrade && img.analysis.overallGrade.score) || 0;
  }

  /**
   * Build groups from completed shoot images.
   * @returns {Array<{id, kind, label, imageIds, collapsed}>}
   */
  function groupImages(images) {
    var done = (images || []).filter(function (img) {
      return img && img.status === "done" && img.analysis;
    });
    if (done.length < 2) return [];

    var assigned = Object.create(null);
    var groups = [];

    // Pass 1 — time bursts (EXIF within 2.5s)
    var timed = done
      .map(function (img) { return { img: img, t: parseExifTime(img) }; })
      .filter(function (row) { return row.t != null; })
      .sort(function (a, b) { return a.t - b.t; });

    var burst = [];
    function flushBurst() {
      if (burst.length < 2) {
        burst = [];
        return;
      }
      var ids = burst.map(function (r) { return r.img.id; });
      ids.forEach(function (iid) { assigned[iid] = true; });
      groups.push({
        id: id("grp"),
        kind: "burst",
        label: "Burst sequence · " + ids.length + " frames",
        imageIds: ids,
        collapsed: true
      });
      burst = [];
    }

    for (var i = 0; i < timed.length; i++) {
      if (!burst.length) {
        burst.push(timed[i]);
        continue;
      }
      var prev = burst[burst.length - 1];
      if (timed[i].t - prev.t <= 2500) burst.push(timed[i]);
      else {
        flushBurst();
        burst.push(timed[i]);
      }
    }
    flushBurst();

    // Pass 2 — near-duplicates / similar composition among unassigned
    var remaining = done.filter(function (img) { return !assigned[img.id]; });
    var used = Object.create(null);

    for (var a = 0; a < remaining.length; a++) {
      if (used[remaining[a].id]) continue;
      var cluster = [remaining[a]];
      used[remaining[a].id] = true;
      for (var b = a + 1; b < remaining.length; b++) {
        if (used[remaining[b].id]) continue;
        var dist = styleDistance(remaining[a], remaining[b]);
        var sameGenre = genreKey(remaining[a]) && genreKey(remaining[a]) === genreKey(remaining[b]);
        if (dist < 14 || (dist < 22 && sameGenre)) {
          cluster.push(remaining[b]);
          used[remaining[b].id] = true;
        }
      }
      if (cluster.length < 2) continue;
      var ids2 = cluster.map(function (img) { return img.id; });
      ids2.forEach(function (iid) { assigned[iid] = true; });
      var nearDup = cluster.every(function (img) {
        return styleDistance(cluster[0], img) < 10;
      });
      groups.push({
        id: id("grp"),
        kind: nearDup ? "near-duplicate" : "similar-composition",
        label: nearDup
          ? "Near duplicates · " + ids2.length + " frames"
          : "Similar compositions · " + ids2.length + " frames",
        imageIds: ids2,
        collapsed: true
      });
    }

    return groups;
  }

  function groupMap(groups) {
    var map = Object.create(null);
    (groups || []).forEach(function (g) {
      (g.imageIds || []).forEach(function (iid) {
        map[iid] = g.id;
      });
    });
    return map;
  }

  /** Prefer keeping the highest-scoring member when reviewing a group (does not delete). */
  function suggestedKeepId(group, imagesById) {
    if (!group || !group.imageIds || !group.imageIds.length) return null;
    var best = null;
    var bestScore = -1;
    group.imageIds.forEach(function (iid) {
      var img = imagesById[iid];
      var sc = scoreOf(img);
      if (sc > bestScore) {
        bestScore = sc;
        best = iid;
      }
    });
    return best;
  }

  global.WaypointPhotoCoachGrouping = {
    groupImages: groupImages,
    groupMap: groupMap,
    suggestedKeepId: suggestedKeepId,
    styleDistance: styleDistance
  };
})(typeof window !== "undefined" ? window : globalThis);
