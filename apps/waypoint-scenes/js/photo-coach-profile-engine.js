/**
 * Waypoint Scenes Photographer Profile engine v1.
 *
 * Aggregates eligible PhotoRecords + Shoots into a living profile using
 * weighted evidence (recency soft-boost, experimentation down-weight).
 * Does not mutate source critiques. Pure: compute(photos, shoots) → fields.
 */
(function (global) {
  "use strict";

  var COMPUTATION_VERSION = "2.0.0";

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

  function seasonFromTs(ts) {
    if (ts == null) return null;
    var m = new Date(ts).getUTCMonth();
    if (m === 11 || m <= 1) return "Winter";
    if (m <= 4) return "Spring";
    if (m <= 7) return "Summer";
    return "Autumn";
  }

  function timeOfDayFromTs(ts) {
    if (ts == null) return null;
    var h = new Date(ts).getUTCHours();
    if (h < 7) return "Pre-dawn / night";
    if (h < 10) return "Morning";
    if (h < 14) return "Midday";
    if (h < 18) return "Afternoon";
    if (h < 21) return "Golden hour / evening";
    return "Night";
  }

  function locationLabel(photo) {
    var loc = photo && photo.location;
    if (!loc || typeof loc !== "object") return null;
    var parts = [loc.label, loc.city, loc.county, loc.state, loc.country].filter(Boolean);
    if (!parts.length) return null;
    return normalizeLabel(parts[0]);
  }

  function buildObservations(subjects, lighting, compositions, niches, lenses, seasons, tier) {
    if (tier.id === "not_enough") {
      return [
        "Not enough analyzed work yet to describe lasting patterns. Keep exploring — the profile grows gently with each Photo Coach session."
      ];
    }
    var out = [];
    var topSub = subjects[0];
    if (topSub && topSub.supportingPhotos >= 3) {
      out.push("It appears you often photograph " + topSub.label.toLowerCase() + ".");
    }
    if (lighting[0] && lighting[0].supportingPhotos >= 3) {
      out.push("You may enjoy " + lighting[0].label.toLowerCase() + " light.");
    }
    if (compositions[0] && /foreground|environmental|subject/i.test(compositions[0].label)) {
      out.push("One emerging pattern: " + compositions[0].label.toLowerCase() + ".");
    }
    if (niches[0] && niches[0].claimStrength !== "experimental") {
      out.push("This seems to be developing toward " + niches[0].label.toLowerCase() + " as a familiar place to look.");
    }
    if (lenses[0] && /telephoto|macro/i.test(lenses[0].label || "")) {
      out.push("It appears medium-to-long glass or close-focus work shows up often when EXIF is present.");
    }
    if (seasons.length >= 2) {
      out.push("You may enjoy working across more than one season — seasonal coverage is beginning to show.");
    } else if (seasons[0]) {
      out.push("Much of the dated work so far gathers in " + seasons[0].label.toLowerCase() + " — an open invitation to explore other seasons when you wish.");
    }
    var people = (subjects || []).some(function (s) { return /people|portrait|human/i.test(s.label); });
    if (!people && subjects.length) {
      out.push("You rarely photograph people in this body of work — nature and place seem to hold the curiosity.");
    }
    if (!out.length) {
      out.push("Patterns are still forming. Curiosity is welcome even when the profile stays quiet.");
    }
    return out.slice(0, 8);
  }

  function buildPhotographyDna(subjects, lighting, color, compositions, framing, mood, focal, tier, eligibleCount) {
    var subjectLabels = (subjects || []).slice(0, 5).map(function (s) { return s.label; });
    var joined = subjectLabels.join(" ").toLowerCase();
    var wild = /wildlife|bird|deer|mammal/.test(joined);
    var land = /landscape|sky|mountain|river|lake|field/.test(joined);
    var macro = /mushroom|macro|fungi|insect|detail|moss/.test(joined);
    var wood = /wood|forest|tree|canopy/.test(joined);
    var balance = "Still taking shape";
    if (wild && land) balance = "Attention shared between wildlife and wider landscapes";
    else if (wild) balance = "Wildlife interest appears stronger than broad landscapes so far";
    else if (land || wood) balance = "Place and landscape seem to lead";
    else if (macro) balance = "Close looking and fine detail appear prominent";

    var minimal = (framing[0] && /clean|tight|simplified/i.test(framing[0].label)) ||
      (compositions[0] && /simplified|subject-centered/i.test(compositions[0].label));
    var complex = framing[0] && /complex|layered|environmental/i.test(framing[0].label);

    var curiosityFamilyCount = subjectLabels.length;
    var curiosityLabel =
      eligibleCount < 10
        ? "Curiosity is just beginning to leave footprints"
        : curiosityFamilyCount >= 4
          ? "Curiosity spans several subject families"
          : curiosityFamilyCount >= 2
            ? "Curiosity is deepening within a few subject families"
            : "Curiosity is concentrating — a focused looking is taking shape";

    return {
      subjects: subjectLabels,
      visualThemes: (mood || []).slice(0, 3).map(function (m) { return m.label; }),
      preferredLighting: (lighting || []).slice(0, 3).map(function (l) { return l.label; }),
      movement: (focal[0] && /telephoto/i.test(focal[0].label))
        ? "Compressed or distant vantage points appear often when focal length is known"
        : "Observational distance still varies — a healthy range for learning",
      colorPreferences: (color || []).slice(0, 3).map(function (c) { return c.label; }),
      landscapeWildlifeBalance: balance,
      macroInterest: macro
        ? "Macro and close detail show recurring interest"
        : "Macro interest has not stood out yet — or may still be ahead",
      minimalismVersusComplexity: minimal
        ? "A lean toward simplified backgrounds and clear subjects"
        : complex
          ? "A lean toward layered, environmental frames"
          : "Between simplicity and complexity — still exploring",
      environmentalStorytelling: (compositions[0] && /environmental/i.test(compositions[0].label))
        ? "Environmental storytelling appears in how scenes are built"
        : "Storytelling style is still emerging",
      curiosityBreadth: {
        familyCount: curiosityFamilyCount,
        label: curiosityLabel
      },
      observationThemes: (subjects || []).slice(0, 4).map(function (s) { return s.label; }),
      natureConnection: wood || land || wild || macro
        ? "Nature and outdoor looking seem to be a steady through-line"
        : "Connection themes will clarify as more outdoor work arrives",
      evidenceTier: tier.label,
      summary:
        tier.id === "not_enough"
          ? "Photography DNA waits for a fuller body of analyzed work. No rush."
          : "Descriptive tendencies only — not a grade, brand, or fixed identity. " +
            (subjectLabels[0]
              ? "It appears " + subjectLabels[0].toLowerCase() + " sits near the center of attention."
              : "Looking patterns are beginning to gather.")
    };
  }

  function buildProjects(subjects, lighting, seasons, mood, observations) {
    var projects = [];
    var blob = (subjects || [])
      .map(function (s) { return s.label; })
      .concat((lighting || []).map(function (l) { return l.label; }))
      .concat((mood || []).map(function (m) { return m.label; }))
      .join(" ")
      .toLowerCase();

    function add(id, title, reason, source) {
      projects.push({
        id: id,
        title: title,
        reason: reason,
        sourceSubjects: source || [],
        status: "suggested",
        createdAt: new Date().toISOString()
      });
    }

    if (/wood|forest|tree|canopy/.test(blob)) {
      add(
        "forest-seasons",
        "Photograph every season in one forest",
        "Woodland scenes appear often — returning to one place across seasons could deepen that looking.",
        ["Woodland"]
      );
      add(
        "tree-portraits",
        "Tree portraits",
        "Trees already seem familiar friends in your frames.",
        ["Trees"]
      );
    }
    if (/mushroom|fungi|macro/.test(blob)) {
      add(
        "white-mushrooms-rain",
        "White mushrooms after rain",
        "Close natural detail shows up in your history — weather and fungi are a natural invitation.",
        ["Mushrooms"]
      );
    }
    if (/soft|overcast|diffused|shade|fog|mist/.test(blob)) {
      add(
        "morning-fog",
        "Morning fog collection",
        "Soft or atmospheric light already seems welcome in your work.",
        ["Soft light"]
      );
    }
    if (/bird|wildlife/.test(blob)) {
      add(
        "bird-behavior",
        "Bird behavior journal",
        "Wildlife interest appears present — a quiet journal of behavior could fit.",
        ["Wildlife"]
      );
    }
    if (/river|water|reflection|lake/.test(blob)) {
      add(
        "river-reflections",
        "River reflections",
        "Water and place already appear in your looking.",
        ["Water"]
      );
    }
    if (/autumn|fall|canopy/.test(blob) || (seasons[0] && /autumn/i.test(seasons[0].label))) {
      add(
        "autumn-canopy",
        "Autumn canopy",
        "Seasonal color and canopy moods may already be part of your rhythm.",
        ["Autumn"]
      );
    }
    if (/quiet|calm|soft|contemplative|moody/.test(blob)) {
      add(
        "night-forests",
        "Night forests",
        "Quiet atmospheres seem familiar — night forests are a patient next step when you are ready.",
        ["Quiet light"]
      );
    }
    add(
      "hidden-landscapes",
      "Hidden Landscapes opportunities",
      "Beyond-visible looking in Waypoint Scenes can extend the curiosity already in your nature work — as creative simulation, clearly labeled.",
      []
    );

    // Prefer projects tied to observed history; keep Hidden Landscapes last as platform bridge
    var tied = projects.filter(function (p) { return p.id !== "hidden-landscapes"; });
    var bridge = projects.filter(function (p) { return p.id === "hidden-landscapes"; });
    return tied.slice(0, 6).concat(bridge.slice(0, 1));
  }

  function buildConfidenceTimeline(eligiblePhotos) {
    var buckets = {};
    (eligiblePhotos || []).forEach(function (p) {
      var ts = parseTs(p.analyzedAt || p.captureDateTime);
      if (ts == null) return;
      var d = new Date(ts);
      var mo = d.getUTCMonth() + 1;
      var key = d.getUTCFullYear() + "-" + (mo < 10 ? "0" : "") + mo;
      if (!buckets[key]) buckets[key] = { id: key, label: key, photoCount: 0 };
      buckets[key].photoCount += 1;
    });
    return Object.keys(buckets)
      .sort()
      .map(function (k) {
        var b = buckets[k];
        return {
          id: b.id,
          label: b.label,
          photoCount: b.photoCount,
          detail:
            b.photoCount === 1
              ? "One analyzed frame this month — a quiet beginning."
              : b.photoCount + " analyzed frames this month — consistency is a form of curiosity."
        };
      });
  }

  function buildJourney(evidence, subjects, growth) {
    var ev = evidence || {};
    var n = ev.eligiblePhotoCount || 0;
    var stage =
      n < 10 ? "Beginning" : n < 30 ? "Finding patterns" : n < 100 ? "Deepening" : "Long looking";
    return {
      stage: stage,
      summary:
        n === 0
          ? "Your photography journey in Waypoint Scenes begins the first time you analyze a photograph in Photo Coach."
          : "So far, " +
            n +
            " eligible photograph" +
            (n === 1 ? "" : "s") +
            " are teaching the profile how you see. " +
            (subjects[0] ? "Attention often returns to " + subjects[0].label.toLowerCase() + "." : ""),
      photoCount: n,
      shootCount: ev.eligibleShootCount || 0,
      dateRange: ev.dateRange || null,
      growthHint: (growth && growth.summary) || null
    };
  }

  function buildGoals(subjects, opportunities, lighting) {
    var goals = [];
    if (subjects[0]) {
      goals.push({
        id: "continue-" + normalizeKey(subjects[0].label),
        label: "Keep exploring " + subjects[0].label.toLowerCase(),
        kind: "curiosity"
      });
    }
    if (opportunities[0]) {
      goals.push({
        id: "practice-" + normalizeKey(opportunities[0].label),
        label: "Practice gently: " + opportunities[0].label,
        kind: "growth"
      });
    }
    if (lighting[0]) {
      goals.push({
        id: "light-" + normalizeKey(lighting[0].label),
        label: "Notice " + lighting[0].label.toLowerCase() + " when it appears",
        kind: "attention"
      });
    }
    if (!goals.length) {
      goals.push({
        id: "analyze-more",
        label: "Analyze a few more photographs when you are ready",
        kind: "beginning"
      });
    }
    return goals.slice(0, 5);
  }

  function buildMilestones(eligibleCount, subjects, growth) {
    var m = [];
    if (eligibleCount >= 1) {
      m.push({
        id: "first-analysis",
        label: "First analysis joined the profile",
        detail: "Learning begins with a single careful look.",
        at: null
      });
    }
    if (eligibleCount >= 10) {
      m.push({
        id: "early-body",
        label: "A small body of work is in place",
        detail: "Early tendencies can be named with care.",
        at: null
      });
    }
    if (subjects[0] && subjects[0].supportingPhotos >= 5) {
      m.push({
        id: "subject-repeat",
        label: "A favorite subject is repeating",
        detail: "It appears " + subjects[0].label.toLowerCase() + " keeps drawing your eye.",
        at: null
      });
    }
    if (growth && growth.trends && growth.trends.some(function (t) { return t.direction === "improving"; })) {
      m.push({
        id: "growth-signal",
        label: "A growth trend is visible",
        detail: "Recent work shows encouraging change — not a score, a direction.",
        at: null
      });
    }
    return m;
  }

  function buildCuriosityInsights(observations, projects, dna) {
    var insights = (observations || []).slice(0, 4).map(function (text, i) {
      return { id: "obs-" + i, text: text, theme: "observation", kind: "observation" };
    });
    if (dna && dna.curiosityBreadth) {
      insights.push({
        id: "curiosity-breadth",
        text: dna.curiosityBreadth.label + ".",
        theme: "curiosity",
        kind: "curiosity"
      });
    }
    if (projects[0]) {
      insights.push({
        id: "project-nudge",
        text: "You may enjoy a quiet project: " + projects[0].title + ".",
        theme: "project",
        kind: "suggestion"
      });
    }
    return insights.slice(0, 8);
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
    var locationEntries = [];
    var seasonEntries = [];
    var timeEntries = [];
    var lensEntries = [];
    var exposureEntries = [];

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

      var lens = photo.camera && photo.camera.lens ? normalizeLabel(photo.camera.lens) : null;
      if (lens) {
        lensEntries.push({
          key: normalizeKey(lens),
          label: lens,
          weight: w,
          photoUuid: photo.uuid,
          shootId: shootId,
          isExperiment: isExp
        });
      }

      var loc = locationLabel(photo);
      if (loc) {
        locationEntries.push({
          key: normalizeKey(loc),
          label: loc,
          weight: w,
          photoUuid: photo.uuid,
          shootId: shootId,
          isExperiment: isExp
        });
      }

      var ts = parseTs(photo.captureDateTime || photo.analyzedAt);
      var season = seasonFromTs(ts);
      if (season) {
        seasonEntries.push({
          key: normalizeKey(season),
          label: season,
          weight: w,
          photoUuid: photo.uuid,
          shootId: shootId,
          isExperiment: isExp
        });
      }
      var tod = timeOfDayFromTs(ts);
      if (tod) {
        timeEntries.push({
          key: normalizeKey(tod),
          label: tod,
          weight: w,
          photoUuid: photo.uuid,
          shootId: shootId,
          isExperiment: isExp
        });
      }

      if (photo.exposureQuality) {
        var eq = normalizeLabel(photo.exposureQuality);
        exposureEntries.push({
          key: normalizeKey(eq),
          label: eq,
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
    var favoriteLenses = topWithConfidence(lensEntries, 5);
    var favoriteLocations = topWithConfidence(locationEntries, 5);
    var favoriteSeasons = topWithConfidence(seasonEntries, 4);
    var favoriteTimeOfDay = topWithConfidence(timeEntries, 5);
    var typicalCompositions = topWithConfidence(compositionEntries, 5);
    var exposureTendencies = topWithConfidence(exposureEntries, 4);
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

    var evidence = {
      photoCount: photos.length,
      shootCount: shoots.length,
      eligiblePhotoCount: eligiblePhotoCount,
      eligibleShootCount: eligibleShootCount,
      dateRange: { start: dateStart, end: dateEnd },
      confidenceTier: tier.id,
      confidenceLabel: tier.label,
      lastProfileUpdate: new Date().toISOString()
    };

    var photographyDna = buildPhotographyDna(
      preferredSubjects,
      favoriteLighting,
      color,
      typicalCompositions,
      framing,
      mood,
      favoriteFocalLengths,
      tier,
      eligiblePhotoCount
    );
    var observations = buildObservations(
      preferredSubjects,
      favoriteLighting,
      typicalCompositions,
      likelyNiches,
      favoriteLenses,
      favoriteSeasons,
      tier
    );
    var projects = buildProjects(
      preferredSubjects,
      favoriteLighting,
      favoriteSeasons,
      mood,
      observations
    );
    var confidenceTimeline = buildConfidenceTimeline(eligible);
    var photographyJourney = buildJourney(evidence, preferredSubjects, recentGrowth);
    var goals = buildGoals(preferredSubjects, recurringCoachingThemes, favoriteLighting);
    var learningMilestones = buildMilestones(eligiblePhotoCount, preferredSubjects, recentGrowth);
    var curiosityInsights = buildCuriosityInsights(observations, projects, photographyDna);

    // Soft editing tendencies from color language when present — never invent processing history
    var editingTendencies = color.slice(0, 3).map(function (c) {
      return Object.assign({}, c, {
        note: "Inferred from color language in analyses — not raw editing software history."
      });
    });

    return {
      computationVersion: COMPUTATION_VERSION,
      computedAt: new Date().toISOString(),
      preferredSubjects: preferredSubjects,
      favoriteSubjects: preferredSubjects,
      favoriteLocations: favoriteLocations,
      favoriteSeasons: favoriteSeasons,
      favoriteTimeOfDay: favoriteTimeOfDay,
      favoriteLenses: favoriteLenses,
      favoriteConditions: favoriteLighting,
      emergingNiche: emergingNiche,
      likelyNiches: likelyNiches,
      visualStyle: visualStyle,
      strengths: strengths,
      growthOpportunities: recurringCoachingThemes,
      recurringCoachingThemes: recurringCoachingThemes,
      favoriteLighting: favoriteLighting,
      favoriteFocalLengths: favoriteFocalLengths,
      typicalCompositions: typicalCompositions,
      compositionTendencies: typicalCompositions,
      exposureTendencies: exposureTendencies,
      colorTendencies: color,
      editingTendencies: editingTendencies,
      moodTendencies: mood,
      recentImprovements: recentGrowth.trends || [],
      growthTimeline: recentGrowth.trends || [],
      photographyTrends: recentGrowth.trends || [],
      currentDirection: currentDirection,
      recentGrowth: recentGrowth,
      recentProgress: recentGrowth,
      confidenceScore: overallConfidence,
      confidenceTimeline: confidenceTimeline,
      photographyDna: photographyDna,
      photographyJourney: photographyJourney,
      observations: observations,
      projects: projects,
      curiosityInsights: curiosityInsights,
      learningMilestones: learningMilestones,
      goals: goals,
      evidence: evidence,
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
