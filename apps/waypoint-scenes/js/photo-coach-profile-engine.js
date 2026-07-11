/**
 * Waypoint Scenes Photographer Profile engine v1.
 *
 * Aggregates eligible PhotoRecords + Shoots into a living profile using
 * weighted evidence (recency soft-boost, experimentation down-weight).
 * Does not mutate source critiques. Pure: compute(photos, shoots) → fields.
 */
(function (global) {
  "use strict";

  var COMPUTATION_VERSION = "1.0.0";

  function round1(n) {
    return Math.round(n * 10) / 10;
  }

  function clamp(n, lo, hi) {
    return Math.max(lo, Math.min(hi, n));
  }

  function normalizeLabel(label) {
    if (label == null) return null;
    var s = String(label).trim().replace(/\s+/g, " ");
    if (!s) return null;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function normalizeKey(label) {
    var n = normalizeLabel(label);
    return n ? n.toLowerCase() : null;
  }

  function parseTs(iso) {
    if (!iso) return null;
    var t = Date.parse(iso);
    return isNaN(t) ? null : t;
  }

  function confidenceTier(eligiblePhotoCount) {
    var n = eligiblePhotoCount || 0;
    if (n < 10) {
      return {
        id: "not_enough",
        label: "Not enough work analyzed yet",
        maxClaimStrength: 0.25
      };
    }
    if (n < 30) {
      return {
        id: "early",
        label: "Early tendency",
        maxClaimStrength: 0.5
      };
    }
    if (n < 100) {
      return {
        id: "emerging",
        label: "Emerging pattern",
        maxClaimStrength: 0.78
      };
    }
    return {
      id: "established",
      label: "Established pattern",
      maxClaimStrength: 0.95
    };
  }

  /**
   * Soft recency curve: newest ≈ 1.18, oldest ≈ 0.82.
   * One recent shoot cannot overwhelm a long history.
   */
  function recencyWeight(ts, newestTs, oldestTs) {
    if (ts == null || newestTs == null || oldestTs == null || newestTs === oldestTs) {
      return 1;
    }
    var span = newestTs - oldestTs;
    var age = clamp((newestTs - ts) / span, 0, 1);
    return 1.18 - 0.36 * age;
  }

  function shootMapFrom(shoots) {
    var map = {};
    (shoots || []).forEach(function (s) {
      if (s && s.id) map[s.id] = s;
    });
    return map;
  }

  function photoWeight(photo, shoot, newestTs, oldestTs) {
    if (!photo || photo.excludeFromProfile) return 0;
    if (shoot && shoot.excludeFromProfile) return 0;
    var w = recencyWeight(parseTs(photo.analyzedAt || photo.captureDateTime), newestTs, oldestTs);
    if (shoot && shoot.isExperimentation) w *= 0.22;
    return w;
  }

  function effectiveSubjects(photo) {
    var corr = photo.userCorrections || {};
    if (corr.subjectCategories && corr.subjectCategories.length) {
      return corr.subjectCategories.map(normalizeLabel).filter(Boolean);
    }
    return (photo.subjectCategories || []).map(normalizeLabel).filter(Boolean);
  }

  function effectiveNicheHint(photo) {
    var corr = photo.userCorrections || {};
    if (corr.nicheLabel) return normalizeLabel(corr.nicheLabel);
    var subjects = effectiveSubjects(photo);
    return subjects[0] || null;
  }

  function lightingTokens(photo) {
    var raw = photo.lightingConditions || "";
    return String(raw)
      .split(/[,·|/]+/)
      .map(function (t) { return normalizeLabel(t); })
      .filter(Boolean);
  }

  function focalBucket(mm) {
    if (mm == null || isNaN(mm)) return null;
    var n = Number(mm);
    if (n < 24) return "ultra-wide (<24mm)";
    if (n < 40) return "wide / environmental (24–40mm)";
    if (n < 70) return "standard (40–70mm)";
    if (n < 135) return "short telephoto (70–135mm)";
    if (n < 300) return "telephoto (135–300mm)";
    return "super-telephoto (300mm+)";
  }

  function framingFrom(photo) {
    var iso = photo.subjectIsolation;
    var bg = photo.backgroundComplexity;
    if (iso === "strong" && bg === "simple") return "tight subject isolation";
    if (iso === "strong") return "subject-forward framing";
    if (iso === "weak" && bg === "complex") return "environmental / busy frames";
    if (bg === "simple") return "clean background framing";
    if (bg === "complex") return "layered / complex backgrounds";
    return "balanced framing";
  }

  function subjectDistanceFrom(photo) {
    var iso = photo.subjectIsolation;
    var focal = photo.camera && photo.camera.focalLengthMm;
    if (iso === "strong" && focal != null && focal >= 100) return "distant / compressed";
    if (iso === "strong") return "intimate / close emphasis";
    if (iso === "weak") return "observational distance";
    return "moderate subject distance";
  }

  function compositionTendency(photo) {
    var frame = framingFrom(photo);
    if (frame.indexOf("tight") >= 0 || frame.indexOf("subject-forward") >= 0) {
      return "subject-centered / decisive crop";
    }
    if (frame.indexOf("environmental") >= 0) return "environmental storytelling";
    if (frame.indexOf("clean") >= 0) return "simplified backgrounds";
    return "exploratory composition";
  }

  function Bucket() {
    this.weight = 0;
    this.photos = {};
    this.shoots = {};
    this.experimentWeight = 0;
  }

  Bucket.prototype.add = function (labelKey, weight, photoUuid, shootId, isExperiment) {
    this.weight += weight;
    if (photoUuid) this.photos[photoUuid] = true;
    if (shootId) this.shoots[shootId] = true;
    if (isExperiment) this.experimentWeight += weight;
  };

  Bucket.prototype.stats = function () {
    return {
      weight: this.weight,
      supportingPhotos: Object.keys(this.photos).length,
      supportingShoots: Object.keys(this.shoots).length,
      experimentShare: this.weight > 0 ? this.experimentWeight / this.weight : 0
    };
  };

  function aggregate(entries) {
    var map = {};
    (entries || []).forEach(function (e) {
      var key = e.key;
      if (!key || !(e.weight > 0)) return;
      if (!map[key]) {
        map[key] = { label: e.label, bucket: new Bucket() };
      }
      map[key].bucket.add(key, e.weight, e.photoUuid, e.shootId, e.isExperiment);
    });
    var total = 0;
    Object.keys(map).forEach(function (k) {
      total += map[k].bucket.weight;
    });
    return Object.keys(map)
      .map(function (k) {
        var item = map[k];
        var st = item.bucket.stats();
        return {
          label: item.label,
          weight: round1(st.weight),
          share: total > 0 ? st.weight / total : 0,
          supportingPhotos: st.supportingPhotos,
          supportingShoots: st.supportingShoots,
          experimentShare: st.experimentShare
        };
      })
      .sort(function (a, b) {
        return b.weight - a.weight;
      });
  }

  function claimConfidence(item, eligibleCount, tier) {
    item = item || {};
    var share = item.share || 0;
    var photos = item.supportingPhotos || 0;
    var shoots = item.supportingShoots || 0;
    var experimentShare = item.experimentShare || 0;

    if (tier.id === "not_enough") {
      return {
        confidencePercent: Math.min(20, Math.round(share * 40)),
        tier: tier,
        claimStrength: "insufficient",
        note: tier.label
      };
    }

    var base = share * 100;
    var shootBoost = Math.min(shoots, 6) * 2.5;
    var breadth = clamp(photos / Math.max(10, eligibleCount * 0.2), 0.35, 1);
    var raw = (base * 0.65 + shootBoost + share * eligibleCount * 0.15) * breadth;
    // Experiment-heavy claims stay soft
    raw *= 1 - experimentShare * 0.55;
    var capped = clamp(raw, 0, tier.maxClaimStrength * 100);
    var pct = Math.round(capped);

    var claimStrength = "tentative";
    if (pct >= 70 && tier.id === "established") claimStrength = "strong";
    else if (pct >= 55 && (tier.id === "emerging" || tier.id === "established")) claimStrength = "moderate";
    else if (pct >= 35) claimStrength = "early";
    else claimStrength = "tentative";

    if (experimentShare > 0.5) claimStrength = "experimental";

    return {
      confidencePercent: pct,
      tier: tier,
      claimStrength: claimStrength,
      note: tier.label
    };
  }

  function withConfidence(item, eligibleCount, tier) {
    var conf = claimConfidence(item, eligibleCount, tier);
    return Object.assign({}, item, {
      confidencePercent: conf.confidencePercent,
      confidenceLabel: conf.note,
      claimStrength: conf.claimStrength,
      evidenceLabel: conf.note
    });
  }

  function rewordCoaching(issue) {
    var raw = String(issue || "").trim();
    if (!raw) return "Keep refining one deliberate craft habit per outing.";
    var lower = raw.toLowerCase();
    if (lower.indexOf("crop") >= 0 || lower.indexOf("fram") >= 0) {
      return "Keep refining framing so the subject reads with clearer intent.";
    }
    if (lower.indexOf("background") >= 0 || lower.indexOf("busy") >= 0) {
      return "Continue simplifying backgrounds to strengthen subject presence.";
    }
    if (lower.indexOf("sharp") >= 0 || lower.indexOf("focus") >= 0) {
      return "Protect sharpness at the moment that matters most in the frame.";
    }
    if (lower.indexOf("expos") >= 0 || lower.indexOf("highlight") >= 0 || lower.indexOf("shadow") >= 0) {
      return "Keep watching exposure so light supports the mood you intend.";
    }
    if (lower.indexOf("color") >= 0 || lower.indexOf("white balance") >= 0) {
      return "Let color stay intentional — supportive of mood, not competing with it.";
    }
    if (lower.indexOf("light") >= 0) {
      return "Continue seeking light that shapes form and atmosphere.";
    }
    return "Growth focus: " + raw.replace(/\.$/, "") + " — treat it as a practice theme, not a grade.";
  }

  function avgField(photos, field) {
    var vals = photos
      .map(function (p) { return p[field]; })
      .filter(function (n) { return n != null && !isNaN(n); });
    if (!vals.length) return null;
    return vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
  }

  function complexityScore(label) {
    if (label === "simple") return 0;
    if (label === "moderate") return 1;
    if (label === "complex") return 2;
    return null;
  }

  function isolationScore(label) {
    if (label === "weak") return 0;
    if (label === "moderate") return 1;
    if (label === "strong") return 2;
    return null;
  }

  function buildRecentGrowth(eligiblePhotos) {
    var sorted = eligiblePhotos.slice().sort(function (a, b) {
      return String(a.analyzedAt || "").localeCompare(String(b.analyzedAt || ""));
    });
    if (sorted.length < 8) {
      return {
        available: false,
        summary: "Analyze a few more shoots to surface recent growth trends.",
        trends: []
      };
    }
    var third = Math.max(3, Math.floor(sorted.length / 3));
    var early = sorted.slice(0, third);
    var recent = sorted.slice(sorted.length - third);

    function avgMap(list, fn) {
      var vals = list.map(fn).filter(function (n) { return n != null && !isNaN(n); });
      if (!vals.length) return null;
      return vals.reduce(function (a, b) { return a + b; }, 0) / vals.length;
    }

    var trends = [];
    var bgEarly = avgMap(early, function (p) { return complexityScore(p.backgroundComplexity); });
    var bgRecent = avgMap(recent, function (p) { return complexityScore(p.backgroundComplexity); });
    if (bgEarly != null && bgRecent != null) {
      var deltaBg = bgEarly - bgRecent;
      if (deltaBg > 0.25) {
        trends.push({
          theme: "Background simplicity",
          direction: "improving",
          detail: "Recent frames show cleaner backgrounds than earlier work."
        });
      } else if (deltaBg < -0.25) {
        trends.push({
          theme: "Background simplicity",
          direction: "watch",
          detail: "Recent frames trend busier — an optional focus for the next outing."
        });
      }
    }

    var isoEarly = avgMap(early, function (p) { return isolationScore(p.subjectIsolation); });
    var isoRecent = avgMap(recent, function (p) { return isolationScore(p.subjectIsolation); });
    if (isoEarly != null && isoRecent != null && isoRecent - isoEarly > 0.25) {
      trends.push({
        theme: "Subject presence",
        direction: "improving",
        detail: "Subject isolation is reading more clearly in recent work."
      });
    }

    var scoreEarly = avgField(early, "overallScore");
    var scoreRecent = avgField(recent, "overallScore");
    if (scoreEarly != null && scoreRecent != null && scoreRecent - scoreEarly >= 3) {
      trends.push({
        theme: "Overall craft consistency",
        direction: "improving",
        detail: "Recent analyses trend a little stronger than earlier ones."
      });
    }

    var summary = trends.length
      ? trends
          .filter(function (t) { return t.direction === "improving"; })
          .map(function (t) { return t.detail; })
          .slice(0, 2)
          .join(" ")
      : "Recent shoots look steady — keep building evidence before reading strong growth claims.";

    return {
      available: true,
      summary: summary || "Recent work is accumulating; patterns will clarify with more shoots.",
      trends: trends
    };
  }

  function buildDirectionSummary(niches, subjects, style, tier, eligibleCount) {
    if (tier.id === "not_enough") {
      return {
        summary:
          "Not enough work analyzed yet to describe a direction. Keep using Photo Coach — " +
          "a living profile needs a small body of work before it speaks with care.",
        confidencePercent: 0,
        confidenceLabel: tier.label,
        supportingPhotos: eligibleCount,
        supportingShoots: 0,
        claimStrength: "insufficient"
      };
    }

    var top = niches[0] || subjects[0];
    if (!top) {
      return {
        summary: "Your analyzed work is varied so far. Direction will clarify as subjects repeat across shoots.",
        confidencePercent: 20,
        confidenceLabel: tier.label,
        supportingPhotos: eligibleCount,
        supportingShoots: 0,
        claimStrength: "tentative"
      };
    }

    var light = style && style.light && style.light[0] ? style.light[0].label : null;
    var framing = style && style.framing && style.framing[0] ? style.framing[0].label : null;
    var parts = [];
    parts.push(
      "Your work is leaning toward " +
        top.label.toLowerCase() +
        " — an " +
        tier.label.toLowerCase() +
        " based on " +
        top.supportingPhotos +
        " photo" +
        (top.supportingPhotos === 1 ? "" : "s") +
        " across " +
        top.supportingShoots +
        " shoot" +
        (top.supportingShoots === 1 ? "" : "s") +
        "."
    );
    if (light) parts.push("Light often reads as " + light.toLowerCase() + ".");
    if (framing) parts.push("Framing tends toward " + framing.toLowerCase() + ".");
    parts.push("This describes evolving tendencies, not a fixed identity.");

    return {
      summary: parts.join(" "),
      confidencePercent: top.confidencePercent,
      confidenceLabel: tier.label,
      supportingPhotos: top.supportingPhotos,
      supportingShoots: top.supportingShoots,
      claimStrength: top.claimStrength,
      primaryLabel: top.label
    };
  }

  /**
   * @param {Array} photos
   * @param {Array} shoots
   * @returns {object} computed profile fields (merge onto stored profile)
   */
  function compute(photos, shoots) {
    photos = (photos || []).slice();
    shoots = (shoots || []).slice();
    var sMap = shootMapFrom(shoots);

    var times = photos
      .map(function (p) { return parseTs(p.analyzedAt || p.captureDateTime); })
      .filter(function (t) { return t != null; })
      .sort(function (a, b) { return a - b; });
    var oldestTs = times.length ? times[0] : null;
    var newestTs = times.length ? times[times.length - 1] : null;

    var eligible = [];
    var weighted = [];

    photos.forEach(function (photo) {
      var shoot = photo.shootId ? sMap[photo.shootId] : null;
      var w = photoWeight(photo, shoot, newestTs, oldestTs);
      if (w <= 0) return;
      eligible.push(photo);
      weighted.push({
        photo: photo,
        shoot: shoot,
        weight: w,
        isExperiment: !!(shoot && shoot.isExperimentation)
      });
    });

    var eligiblePhotoCount = eligible.length;
    var eligibleShootIds = {};
    weighted.forEach(function (w) {
      if (w.photo.shootId) eligibleShootIds[w.photo.shootId] = true;
    });
    var eligibleShootCount = Object.keys(eligibleShootIds).length;
    var tier = confidenceTier(eligiblePhotoCount);

    var subjectEntries = [];
    var nicheEntries = [];
    var lightingEntries = [];
    var focalEntries = [];
    var moodEntries = [];
    var colorEntries = [];
    var framingEntries = [];
    var distanceEntries = [];
    var compositionEntries = [];
    var strengthEntries = [];
    var coachingEntries = [];

    weighted.forEach(function (row) {
      var photo = row.photo;
      var w = row.weight;
      var shootId = photo.shootId || null;
      var isExp = row.isExperiment;

      effectiveSubjects(photo).forEach(function (label) {
        subjectEntries.push({
          key: normalizeKey(label),
          label: label,
          weight: w,
          photoUuid: photo.uuid,
          shootId: shootId,
          isExperiment: isExp
        });
      });

      var niche = effectiveNicheHint(photo);
      if (niche) {
        nicheEntries.push({
          key: normalizeKey(niche),
          label: niche,
          weight: w * (isExp ? 0.85 : 1),
          photoUuid: photo.uuid,
          shootId: shootId,
          isExperiment: isExp
        });
      }

      lightingTokens(photo).forEach(function (tok) {
        lightingEntries.push({
          key: normalizeKey(tok),
          label: tok,
          weight: w,
          photoUuid: photo.uuid,
          shootId: shootId,
          isExperiment: isExp
        });
      });

      var focal = focalBucket(photo.camera && photo.camera.focalLengthMm);
      if (focal) {
        focalEntries.push({
          key: normalizeKey(focal),
          label: focal,
          weight: w,
          photoUuid: photo.uuid,
          shootId: shootId,
          isExperiment: isExp
        });
      }

      if (photo.dominantMood) {
        var mood = normalizeLabel(photo.dominantMood);
        moodEntries.push({
          key: normalizeKey(mood),
          label: mood,
          weight: w,
          photoUuid: photo.uuid,
          shootId: shootId,
          isExperiment: isExp
        });
      }

      if (photo.colorCharacteristics) {
        String(photo.colorCharacteristics)
          .split(/[·|]+/)
          .map(normalizeLabel)
          .filter(Boolean)
          .forEach(function (c) {
            colorEntries.push({
              key: normalizeKey(c),
              label: c,
              weight: w * 0.8,
              photoUuid: photo.uuid,
              shootId: shootId,
              isExperiment: isExp
            });
          });
      }

      var framing = framingFrom(photo);
      framingEntries.push({
        key: normalizeKey(framing),
        label: normalizeLabel(framing),
        weight: w,
        photoUuid: photo.uuid,
        shootId: shootId,
        isExperiment: isExp
      });

      var distance = subjectDistanceFrom(photo);
      distanceEntries.push({
        key: normalizeKey(distance),
        label: normalizeLabel(distance),
        weight: w,
        photoUuid: photo.uuid,
        shootId: shootId,
        isExperiment: isExp
      });

      var composition = compositionTendency(photo);
      compositionEntries.push({
        key: normalizeKey(composition),
        label: normalizeLabel(composition),
        weight: w,
        photoUuid: photo.uuid,
        shootId: shootId,
        isExperiment: isExp
      });

      var strengthTitles = [];
      if (photo.aiCritique && photo.aiCritique.strengths) {
        photo.aiCritique.strengths.forEach(function (s) {
          if (s && s.title) strengthTitles.push(s.title);
        });
      }
      if (photo.compositionScore != null && photo.compositionScore >= 75) {
        strengthTitles.push("Composition consistency");
      }
      if (photo.technicalScore != null && photo.technicalScore >= 75) {
        strengthTitles.push("Technical control");
      }
      if (photo.artisticScore != null && photo.artisticScore >= 75) {
        strengthTitles.push("Artistic intent");
      }
      if (photo.subjectIsolation === "strong") strengthTitles.push("Subject isolation");
      if (photo.backgroundComplexity === "simple") strengthTitles.push("Background simplicity");

      strengthTitles.forEach(function (title) {
        var label = normalizeLabel(title);
        strengthEntries.push({
          key: normalizeKey(label),
          label: label,
          weight: w,
          photoUuid: photo.uuid,
          shootId: shootId,
          isExperiment: isExp
        });
      });

      (photo.aiCoachingSuggestions || []).forEach(function (c) {
        var issue = (c && (c.issue || c.whatToDo)) || null;
        if (!issue) return;
        var label = rewordCoaching(issue);
        coachingEntries.push({
          key: normalizeKey(label),
          label: label,
          weight: w * (c.priority === "primary" ? 1.2 : 1),
          photoUuid: photo.uuid,
          shootId: shootId,
          isExperiment: isExp
        });
      });
    });

    function topWithConfidence(entries, limit) {
      return aggregate(entries)
        .slice(0, limit || 5)
        .map(function (item) {
          return withConfidence(item, eligiblePhotoCount, tier);
        });
    }

    var preferredSubjects = topWithConfidence(subjectEntries, 6);
    var likelyNiches = topWithConfidence(nicheEntries, 5);
    var favoriteLighting = topWithConfidence(lightingEntries, 5);
    var favoriteFocalLengths = topWithConfidence(focalEntries, 5);
    var typicalCompositions = topWithConfidence(compositionEntries, 5);
    var strengths = topWithConfidence(strengthEntries, 6);
    var recurringCoachingThemes = topWithConfidence(coachingEntries, 5);
    var mood = topWithConfidence(moodEntries, 4);
    var color = topWithConfidence(colorEntries, 4);
    var framing = topWithConfidence(framingEntries, 4);
    var distance = topWithConfidence(distanceEntries, 4);

    // Soft-filter: do not present experimental niches as established facts
    likelyNiches = likelyNiches.map(function (n) {
      if (n.experimentShare > 0.45) {
        n.claimStrength = "experimental";
        n.evidenceLabel = "Low-confidence experimentation";
        n.confidencePercent = Math.min(n.confidencePercent, 28);
        n.note = "Appears mainly in shoots marked as experimentation.";
      }
      return n;
    });

    var emergingNiche = null;
    if (likelyNiches.length && likelyNiches[0].claimStrength !== "insufficient") {
      emergingNiche = Object.assign({}, likelyNiches[0]);
      if (emergingNiche.claimStrength === "experimental") {
        emergingNiche = likelyNiches.filter(function (n) {
          return n.claimStrength !== "experimental";
        })[0] || emergingNiche;
      }
    }

    var visualStyle = {
      mood: mood,
      light: favoriteLighting,
      color: color,
      framing: framing,
      subjectDistance: distance,
      composition: typicalCompositions,
      summary: null
    };
    var styleBits = [];
    if (mood[0]) styleBits.push(mood[0].label.toLowerCase());
    if (favoriteLighting[0]) styleBits.push(favoriteLighting[0].label.toLowerCase() + " light");
    if (framing[0]) styleBits.push(framing[0].label.toLowerCase());
    visualStyle.summary = styleBits.length
      ? "Visual tendencies: " + styleBits.join("; ") + "."
      : "Visual style will clarify as more work is analyzed.";

    var recentGrowth = buildRecentGrowth(eligible);
    var currentDirection = buildDirectionSummary(
      likelyNiches,
      preferredSubjects,
      visualStyle,
      tier,
      eligiblePhotoCount
    );

    var dateStart = oldestTs ? new Date(oldestTs).toISOString() : null;
    var dateEnd = newestTs ? new Date(newestTs).toISOString() : null;

    var overallConfidence = 0;
    if (emergingNiche) overallConfidence = emergingNiche.confidencePercent;
    else if (tier.id === "not_enough") overallConfidence = 0;
    else overallConfidence = Math.round(tier.maxClaimStrength * 40);

    return {
      computationVersion: COMPUTATION_VERSION,
      computedAt: new Date().toISOString(),
      preferredSubjects: preferredSubjects,
      emergingNiche: emergingNiche,
      likelyNiches: likelyNiches,
      visualStyle: visualStyle,
      strengths: strengths,
      recurringCoachingThemes: recurringCoachingThemes,
      favoriteLighting: favoriteLighting,
      favoriteFocalLengths: favoriteFocalLengths,
      typicalCompositions: typicalCompositions,
      recentImprovements: recentGrowth.trends || [],
      growthTimeline: recentGrowth.trends || [],
      currentDirection: currentDirection,
      recentGrowth: recentGrowth,
      confidenceScore: overallConfidence,
      evidence: {
        photoCount: photos.length,
        shootCount: shoots.length,
        eligiblePhotoCount: eligiblePhotoCount,
        eligibleShootCount: eligibleShootCount,
        dateRange: { start: dateStart, end: dateEnd },
        confidenceTier: tier.id,
        confidenceLabel: tier.label,
        lastProfileUpdate: new Date().toISOString()
      },
      photoCount: photos.length,
      shootCount: shoots.length
    };
  }

  global.WaypointPhotoCoachProfileEngine = {
    COMPUTATION_VERSION: COMPUTATION_VERSION,
    confidenceTier: confidenceTier,
    recencyWeight: recencyWeight,
    photoWeight: photoWeight,
    claimConfidence: claimConfidence,
    rewordCoaching: rewordCoaching,
    normalizeLabel: normalizeLabel,
    compute: compute
  };
})(typeof window !== "undefined" ? window : global);
