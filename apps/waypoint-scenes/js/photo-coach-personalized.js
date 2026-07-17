/**
 * Waypoint Scenes Personalized Coaching v1.
 *
 * Turns profile + shoot history + coaching memory into personal feedback.
 * Coaching language only — no grades-as-identity, no competition.
 */
(function (global) {
  "use strict";

  var ENGINE_VERSION = "1.0.0";
  var REPEAT_WINDOW = 8;
  var REPEAT_THRESHOLD = 2;

  function models() {
    return global.WaypointPhotoCoachModels;
  }

  function themeKey(label) {
    if (label == null) return null;
    return String(label)
      .toLowerCase()
      .replace(/growth focus:\s*/i, "")
      .replace(/[^a-z0-9\s-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function themeFamily(key) {
    key = themeKey(key) || "";
    if (/background|busy|simplif|isolation|separat/.test(key)) return "background-simplicity";
    if (/crop|fram|edge|branch|upper edge/.test(key)) return "framing";
    if (/sharp|focus|motion/.test(key)) return "sharpness";
    if (/expos|highlight|shadow|bright/.test(key)) return "exposure";
    if (/light|golden|blue hour|direction/.test(key)) return "light";
    if (/color|white balance|saturation/.test(key)) return "color";
    if (/compos/.test(key)) return "composition";
    if (/subject/.test(key)) return "subject-presence";
    return key || "general-craft";
  }

  function familyLabel(family) {
    var map = {
      "background-simplicity": "Background simplicity",
      framing: "Framing",
      sharpness: "Sharpness",
      exposure: "Exposure consistency",
      light: "Use of light",
      color: "Color control",
      composition: "Composition",
      "subject-presence": "Subject isolation"
    };
    return map[family] || (family ? family.charAt(0).toUpperCase() + family.slice(1) : "Craft focus");
  }

  function prefsFrom(raw) {
    var M = models();
    if (M && M.migrateCoachingPreferences) return M.migrateCoachingPreferences(raw || {});
    return raw || { hiddenThemes: [], intentionalThemes: [], boostedThemes: [], themeFeedback: {} };
  }

  function isHidden(prefs, family) {
    prefs = prefsFrom(prefs);
    return (prefs.hiddenThemes || []).indexOf(family) >= 0;
  }

  function isIntentional(prefs, family) {
    prefs = prefsFrom(prefs);
    return (prefs.intentionalThemes || []).indexOf(family) >= 0;
  }

  function isBoosted(prefs, family) {
    prefs = prefsFrom(prefs);
    return (prefs.boostedThemes || []).indexOf(family) >= 0;
  }

  function feedbackScore(prefs, family) {
    prefs = prefsFrom(prefs);
    var fb = (prefs.themeFeedback || {})[family] || {};
    return {
      helpful: fb.helpful || 0,
      not_relevant: fb.not_relevant || 0,
      intentional: fb.intentional || 0,
      want_more: fb.want_more || 0
    };
  }

  function recentThemeCounts(memory, family) {
    var list = (memory || []).slice(0, REPEAT_WINDOW);
    var count = 0;
    list.forEach(function (r) {
      if (themeFamily(r.coachingTheme || r.themeLabel) === family) count += 1;
    });
    return count;
  }

  function shouldSkipTheme(prefs, memory, family) {
    if (!family) return true;
    if (isHidden(prefs, family)) return true;
    var fb = feedbackScore(prefs, family);
    if (fb.not_relevant >= 2 && fb.helpful === 0 && !isBoosted(prefs, family)) return true;
    if (isIntentional(prefs, family) && !isBoosted(prefs, family)) return true;
    return false;
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

  function avg(nums) {
    var list = (nums || []).filter(function (n) { return n != null && !isNaN(n); });
    if (!list.length) return null;
    return list.reduce(function (a, b) { return a + b; }, 0) / list.length;
  }

  function eligiblePhotos(photos, shoots) {
    var sMap = {};
    (shoots || []).forEach(function (s) {
      if (s && s.id) sMap[s.id] = s;
    });
    return (photos || []).filter(function (p) {
      if (!p || p.excludeFromProfile) return false;
      var shoot = p.shootId ? sMap[p.shootId] : null;
      if (shoot && shoot.excludeFromProfile) return false;
      return true;
    });
  }

  /**
   * Evidence-backed growth across recent vs earlier eligible work.
   */
  function detectGrowth(photos, shoots, options) {
    options = options || {};
    var eligible = eligiblePhotos(photos, shoots);
    var sorted = eligible.slice().sort(function (a, b) {
      return String(a.analyzedAt || "").localeCompare(String(b.analyzedAt || ""));
    });
    if (sorted.length < 10) {
      return {
        available: false,
        confidenceLabel: "Not enough work analyzed yet",
        confidencePercent: 0,
        improvements: [],
        evidenceWindow: { photoCount: sorted.length, shootCount: 0 }
      };
    }

    var third = Math.max(3, Math.floor(sorted.length / 3));
    var early = sorted.slice(0, third);
    var recent = sorted.slice(sorted.length - third);
    var shootIds = {};
    recent.forEach(function (p) {
      if (p.shootId) shootIds[p.shootId] = true;
    });
    early.forEach(function (p) {
      if (p.shootId) shootIds[p.shootId] = true;
    });

    function metric(list, fn) {
      return avg(list.map(fn));
    }

    var candidates = [
      {
        family: "background-simplicity",
        area: "Background simplicity",
        early: metric(early, function (p) { return complexityScore(p.backgroundComplexity); }),
        recent: metric(recent, function (p) { return complexityScore(p.backgroundComplexity); }),
        betterWhen: "lower",
        explain: "Recent frames show quieter backgrounds than earlier work."
      },
      {
        family: "subject-presence",
        area: "Subject isolation",
        early: metric(early, function (p) { return isolationScore(p.subjectIsolation); }),
        recent: metric(recent, function (p) { return isolationScore(p.subjectIsolation); }),
        betterWhen: "higher",
        explain: "Subject presence reads more clearly in recent work."
      },
      {
        family: "composition",
        area: "Composition",
        early: metric(early, function (p) { return p.compositionScore; }),
        recent: metric(recent, function (p) { return p.compositionScore; }),
        betterWhen: "higher",
        explain: "Composition scores trend a little stronger lately."
      },
      {
        family: "exposure",
        area: "Exposure consistency",
        early: metric(early, function (p) {
          return p.exposureQuality === "balanced" ? 1 : 0;
        }),
        recent: metric(recent, function (p) {
          return p.exposureQuality === "balanced" ? 1 : 0;
        }),
        betterWhen: "higher",
        explain: "Exposure choices look more consistent across recent frames."
      },
      {
        family: "sharpness",
        area: "Sharpness",
        early: metric(early, function (p) { return p.sharpness; }),
        recent: metric(recent, function (p) { return p.sharpness; }),
        betterWhen: "higher",
        explain: "Sharpness estimates trend stronger in recent work."
      },
      {
        family: "light",
        area: "Use of light",
        early: metric(early, function (p) { return p.artisticScore; }),
        recent: metric(recent, function (p) { return p.artisticScore; }),
        betterWhen: "higher",
        explain: "Light and mood choices feel more intentional lately."
      }
    ];

    var prefs = prefsFrom(options.preferences);
    var improvements = [];
    candidates.forEach(function (c) {
      if (c.early == null || c.recent == null) return;
      if (isHidden(prefs, c.family)) return;
      var delta = c.betterWhen === "lower" ? c.early - c.recent : c.recent - c.early;
      var threshold = c.betterWhen === "lower" ? 0.25 : (c.area === "Exposure consistency" ? 0.12 : 2.5);
      if (c.area === "Exposure consistency" || c.family === "subject-presence" || c.family === "background-simplicity") {
        threshold = c.betterWhen === "lower" ? 0.25 : 0.25;
      }
      if (delta < threshold) return;

      var conf = Math.min(78, Math.round(35 + delta * (c.betterWhen === "lower" ? 40 : 8) + Math.min(third, 8)));
      if (sorted.length < 30) conf = Math.min(conf, 55);
      improvements.push({
        area: c.area,
        family: c.family,
        direction: "improving",
        evidenceWindow: {
          earlyPhotos: early.length,
          recentPhotos: recent.length,
          totalPhotos: sorted.length,
          shootCount: Object.keys(shootIds).length
        },
        confidencePercent: conf,
        confidenceLabel: sorted.length >= 30 ? "Emerging pattern" : "Early tendency",
        explanation: c.explain
      });
    });

    improvements.sort(function (a, b) {
      return b.confidencePercent - a.confidencePercent;
    });

    return {
      available: improvements.length > 0,
      confidenceLabel: sorted.length >= 30 ? "Emerging pattern" : "Early tendency",
      confidencePercent: improvements[0] ? improvements[0].confidencePercent : 0,
      improvements: improvements.slice(0, 4),
      evidenceWindow: {
        photoCount: sorted.length,
        shootCount: Object.keys(shootIds).length,
        earlyCount: early.length,
        recentCount: recent.length
      }
    };
  }

  function profileStrengthLabels(profile) {
    return ((profile && profile.strengths) || []).map(function (s) {
      return s.label;
    });
  }

  function dominantDirection(profile) {
    if (profile && profile.emergingNiche && profile.emergingNiche.label) {
      return profile.emergingNiche.label;
    }
    if (profile && profile.likelyNiches && profile.likelyNiches[0]) {
      return profile.likelyNiches[0].label;
    }
    if (profile && profile.preferredSubjects && profile.preferredSubjects[0]) {
      return profile.preferredSubjects[0].label;
    }
    return null;
  }

  function photoShowsStrength(critique, family) {
    var strengths = (critique && critique.strengths) || [];
    var signals = (critique && critique.signals) || {};
    if (family === "background-simplicity") {
      return strengths.some(function (s) {
        return /background|isolation|simpl/i.test(s.title || "");
      }) || signals.subjectEmphasis > 0.1;
    }
    if (family === "subject-presence") {
      return strengths.some(function (s) {
        return /subject|isolation/i.test(s.title || "");
      });
    }
    if (family === "light") {
      return strengths.some(function (s) {
        return /light/i.test(s.title || "");
      });
    }
    return strengths.length > 0;
  }

  function improvementFamilyFromCritique(imp) {
    var blob = [imp.issue, imp.category, imp.whatToDo].filter(Boolean).join(" ");
    return themeFamily(blob);
  }

  function growthMatchesFamily(growth, family) {
    return ((growth && growth.improvements) || []).some(function (g) {
      return g.family === family;
    });
  }

  function buildPersonalizedNarrative(critique, ctx) {
    var profile = ctx.profile || {};
    var direction = dominantDirection(profile);
    var growth = ctx.growth || {};
    var prefs = prefsFrom(ctx.preferences);
    var parts = [];
    var topStrength = (critique.strengths && critique.strengths[0]) || null;
    var primary = (critique.improvements || []).filter(function (i) {
      return i.priority === "primary";
    })[0] || (critique.improvements || [])[0];

    if (direction && topStrength) {
      parts.push(
        "Your " +
          direction.toLowerCase() +
          " images often work best when " +
          describeUsualStrength(profile, topStrength) +
          " This frame " +
          (photoShowsStrength(critique, "background-simplicity") ||
          photoShowsStrength(critique, "subject-presence")
            ? "continues that strength."
            : "is exploring nearby territory.")
      );
    } else if (topStrength) {
      parts.push(
        "What is working here: " +
          (topStrength.title || "a clear visual beat") +
          (topStrength.whyItWorks ? " — " + topStrength.whyItWorks : ".")
      );
    }

    if (primary) {
      var family = improvementFamilyFromCritique(primary);
      if (shouldSkipTheme(prefs, ctx.memory, family) && isIntentional(prefs, family)) {
        parts.push(
          "About " +
            familyLabel(family).toLowerCase() +
            ": you marked similar choices as intentional before. If that still holds here, protect the choice rather than “fixing” it."
        );
      } else if (growthMatchesFamily(growth, family) || growthMatchesFamily(growth, "background-simplicity")) {
        var gItem = ((growth.improvements || []).filter(function (g) {
          return g.family === family || g.family === "background-simplicity";
        })[0]) || growth.improvements[0];
        if (gItem && !shouldSkipTheme(prefs, ctx.memory, gItem.family)) {
          parts.push(
            gItem.area +
              " is improving compared with your recent shoots" +
              (primary.issue ? ", though " + softenIssue(primary.issue) + " still competes for attention." : ".")
          );
        }
      } else if (!shouldSkipTheme(prefs, ctx.memory, family)) {
        var repeats = recentThemeCounts(ctx.memory, family);
        if (repeats >= REPEAT_THRESHOLD) {
          parts.push(
            familyLabel(family) +
              " remains an ongoing focus — not a new discovery. One useful beat in this frame: " +
              softenIssue(primary.issue || primary.whatToDo) +
              "."
          );
        }
      }
    }

    return parts.filter(Boolean).join(" ");
  }

  function describeUsualStrength(profile, topStrength) {
    var strengths = profileStrengthLabels(profile).join(" ").toLowerCase();
    if (/isolation|background|simpl/i.test(strengths) || /isolation|background/i.test(topStrength.title || "")) {
      return "the subject is isolated against a quiet background.";
    }
    if (/light/i.test(strengths) || /light/i.test(topStrength.title || "")) {
      return "light shapes form with clear intent.";
    }
    return "a clear subject and patient looking lead the frame.";
  }

  function softenIssue(issue) {
    var s = String(issue || "").trim();
    if (!s) return "a small competing detail";
    return s.charAt(0).toLowerCase() + s.slice(1).replace(/\.$/, "");
  }

  function buildNextSteps(critique, ctx) {
    var prefs = prefsFrom(ctx.preferences);
    var steps = [];
    var improvements = critique.improvements || [];
    var memory = ctx.memory || [];

    improvements.forEach(function (imp) {
      if (steps.length >= 2) return;
      var family = improvementFamilyFromCritique(imp);
      if (shouldSkipTheme(prefs, memory, family)) return;
      var repeats = recentThemeCounts(memory, family);
      var text;
      if (isBoosted(prefs, family) || feedbackScore(prefs, family).want_more > 0) {
        text =
          "Going deeper on " +
          familyLabel(family).toLowerCase() +
          ": " +
          (imp.whatToDo || imp.issue || "make one deliberate adjustment before leaving the spot.");
      } else if (repeats >= REPEAT_THRESHOLD) {
        text =
          "Ongoing focus — " +
          familyLabel(family).toLowerCase() +
          ": try one extra frame that specifically addresses " +
          softenIssue(imp.issue) +
          ".";
      } else {
        text = imp.whatToDo || ("Try addressing: " + softenIssue(imp.issue));
      }
      steps.push({
        family: family,
        label: familyLabel(family),
        text: text,
        wasRepeated: repeats >= REPEAT_THRESHOLD,
        confidence: imp.confidence || "moderate-demo"
      });
    });

    if (!steps.length && (critique.strengths || [])[0]) {
      steps.push({
        family: "general-craft",
        label: "Continue",
        text: "Protect what is already working: " + critique.strengths[0].title + ".",
        wasRepeated: false,
        confidence: "moderate-demo"
      });
    }
    return steps;
  }

  function buildTechnicalVsStyle(critique, ctx) {
    var prefs = prefsFrom(ctx.preferences);
    var notes = [];
    (critique.improvements || []).forEach(function (imp) {
      var family = improvementFamilyFromCritique(imp);
      if (isIntentional(prefs, family)) {
        notes.push({
          kind: "style",
          family: family,
          text:
            familyLabel(family) +
            " may be an intentional stylistic choice for you — disagreement is welcome, not a failure."
        });
      } else if (/sharp|expos|focus|clip|noise/i.test([imp.issue, imp.category].join(" "))) {
        notes.push({
          kind: "technical",
          family: family,
          text: "Technical note: " + softenIssue(imp.issue) + " — this is craft control more than style."
        });
      } else if (/crop|fram|background|compos|light|color/i.test([imp.issue, imp.category].join(" "))) {
        notes.push({
          kind: "style-or-craft",
          family: family,
          text:
            "Could be craft or style: " +
            softenIssue(imp.issue) +
            ". If it was intentional, mark it that way so future coaching adapts."
        });
      }
    });
    return notes.slice(0, 3);
  }

  function lowConfidenceGate(profile, photos) {
    var count = (photos && photos.length) || (profile && profile.evidence && profile.evidence.eligiblePhotoCount) || 0;
    if (count < 10) {
      return {
        limited: true,
        note: "Personalized coaching is still light — not enough work analyzed yet for strong claims."
      };
    }
    return { limited: false, note: null };
  }

  /**
   * Enrich a critique in place (and return personalization block).
   */
  function personalizeCritique(critique, context) {
    context = context || {};
    critique = critique || {};
    var profile = context.profile || {};
    var photos = context.photos || [];
    var shoots = context.shoots || [];
    var prefs = prefsFrom(context.preferences);
    var memory = context.memory || [];
    var growth = context.growth || detectGrowth(photos, shoots, { preferences: prefs });
    var gate = lowConfidenceGate(profile, eligiblePhotos(photos, shoots));

    var ctx = {
      profile: profile,
      photos: photos,
      shoots: shoots,
      memory: memory,
      preferences: prefs,
      growth: growth,
      shootImages: context.shootImages || []
    };

    var personalizedNarrative = buildPersonalizedNarrative(critique, ctx);
    var nextSteps = buildNextSteps(critique, ctx);
    var techVsStyle = buildTechnicalVsStyle(critique, ctx);
    var baseNarrative = critique.narrativeSummary || "";

    var combinedNarrative = baseNarrative;
    if (personalizedNarrative) {
      combinedNarrative = gate.limited
        ? baseNarrative + (baseNarrative ? " " : "") + gate.note
        : personalizedNarrative + (baseNarrative ? " " + baseNarrative : "");
    }

    var block = {
      engineVersion: ENGINE_VERSION,
      narrative: personalizedNarrative,
      combinedNarrative: combinedNarrative,
      styleRelation: dominantDirection(profile)
        ? "Relates to your usual " + dominantDirection(profile).toLowerCase() + " direction."
        : null,
      growthNotes: (growth.improvements || []).slice(0, 2),
      nextSteps: nextSteps,
      technicalVsStyle: techVsStyle,
      limitedEvidence: gate.limited,
      limitedNote: gate.note,
      privacy: "private"
    };

    critique.personalized = block;
    critique.narrativeSummary = combinedNarrative;
    if (critique.overallGrade) {
      critique.overallGrade.summary = combinedNarrative;
    }
    return block;
  }

  /**
   * Short next-outing plan after a shoot — not homework.
   */
  function buildNextOutingPlan(shoot, context) {
    context = context || {};
    var profile = context.profile || {};
    var prefs = prefsFrom(context.preferences);
    var memory = context.memory || [];
    var summary = (shoot && shoot.summary) || {};
    var direction = dominantDirection(profile);
    var strength =
      (summary.commonStrengths && summary.commonStrengths[0] && summary.commonStrengths[0].title) ||
      (profile.strengths && profile.strengths[0] && profile.strengths[0].label) ||
      "what already feels natural in your looking";

    var practiceTheme = null;
    var recurring = summary.recurringImprovements || [];
    for (var i = 0; i < recurring.length; i++) {
      var fam = themeFamily(recurring[i].issue || recurring[i].theme);
      if (!shouldSkipTheme(prefs, memory, fam)) {
        practiceTheme = { family: fam, label: familyLabel(fam), issue: recurring[i].issue };
        break;
      }
    }
    if (!practiceTheme && profile.recurringCoachingThemes && profile.recurringCoachingThemes[0]) {
      var t = profile.recurringCoachingThemes[0];
      var f = themeFamily(t.label);
      if (!shouldSkipTheme(prefs, memory, f)) {
        practiceTheme = { family: f, label: familyLabel(f), issue: t.label };
      }
    }

    var experiment =
      direction && /woodland/i.test(direction)
        ? "If you're curious, try one extra frame from a lower angle before moving on."
        : direction && /wildlife/i.test(direction)
          ? "If you're curious, try one frame that waits for a quieter edge behind the subject."
          : "If you're curious, try one gentle experiment — a new angle or waiting an extra breath — without forcing it to match past work.";

    var subjectLine = direction
      ? "Conditions that often fit an emerging " +
        direction.toLowerCase() +
        " direction: soft light and uncluttered backgrounds."
      : "Follow whatever subject still pulls your eye — style can keep evolving.";

    var practiceLine = practiceTheme
      ? "On a later walk, you may want to keep an eye on " +
        practiceTheme.label.toLowerCase() +
        (practiceTheme.issue ? " (" + softenIssue(practiceTheme.issue) + ")" : "") +
        " — only if it still feels interesting."
      : "Keep looking with the same patience you already bring.";

    var continueLine = "Worth keeping: " + strength + ".";
    var paragraph = [
      direction
        ? "If you take another " +
          (/woodland/i.test(direction) ? "woodland walk" : direction.toLowerCase() + " outing") +
          ", you may notice small subjects in soft light again."
        : "If you head out again, follow subjects that already feel like yours.",
      practiceTheme
        ? "You may also want to give " +
          practiceTheme.label.toLowerCase() +
          " one quiet look — curiosity, not a checklist."
        : "",
      experiment
    ]
      .filter(Boolean)
      .join(" ");

    var repeats = practiceTheme ? recentThemeCounts(memory, practiceTheme.family) >= REPEAT_THRESHOLD : false;

    return {
      engineVersion: ENGINE_VERSION,
      continueStrength: continueLine,
      practiceSkill: practiceLine,
      optionalExperiment: experiment,
      subjectOrCondition: subjectLine,
      summary: paragraph,
      wasRepeated: repeats,
      practiceFamily: practiceTheme ? practiceTheme.family : null,
      confidencePercent: (profile.evidence && profile.evidence.eligiblePhotoCount >= 30)
        ? 62
        : (profile.evidence && profile.evidence.eligiblePhotoCount >= 10 ? 45 : 20),
      confidenceLabel:
        profile.evidence && profile.evidence.confidenceLabel
          ? profile.evidence.confidenceLabel
          : "Early tendency",
      privacy: "private"
    };
  }

  function buildMemoryRecords(block, meta) {
    meta = meta || {};
    var M = models();
    if (!M || !M.createCoachingRecord) return [];
    var records = [];
    (block.nextSteps || []).forEach(function (step) {
      records.push(
        M.createCoachingRecord({
          photoId: meta.photoId || null,
          shootId: meta.shootId || null,
          coachingTheme: step.family,
          themeLabel: step.label,
          recommendation: step.text,
          evidenceUsed: {
            photoCount: meta.photoCount || 0,
            shootCount: meta.shootCount || 0,
            signals: ["critique", "profile"],
            profileTier: meta.profileTier || null
          },
          confidence: step.confidence || null,
          confidencePercent: meta.confidencePercent || null,
          wasRepeated: !!step.wasRepeated,
          source: "photo"
        })
      );
    });
    return records;
  }

  function buildOutingMemoryRecord(plan, meta) {
    var M = models();
    if (!M || !M.createCoachingRecord || !plan) return null;
    return M.createCoachingRecord({
      photoId: null,
      shootId: meta.shootId || null,
      coachingTheme: plan.practiceFamily || "next-outing",
      themeLabel: plan.practiceFamily ? familyLabel(plan.practiceFamily) : "Next outing",
      recommendation: plan.summary,
      evidenceUsed: {
        photoCount: meta.photoCount || 0,
        shootCount: meta.shootCount || 0,
        signals: ["shoot-summary", "profile"],
        profileTier: meta.profileTier || null
      },
      confidencePercent: plan.confidencePercent,
      confidence: plan.confidenceLabel,
      wasRepeated: !!plan.wasRepeated,
      source: "outing"
    });
  }

  function currentFocus(memory, prefs, profile) {
    prefs = prefsFrom(prefs);
    var counts = {};
    (memory || []).slice(0, 20).forEach(function (r) {
      var f = themeFamily(r.coachingTheme || r.themeLabel);
      if (!f || shouldSkipTheme(prefs, memory, f)) return;
      if (r.userFeedback === "not_relevant" || r.userFeedback === "intentional") return;
      counts[f] = (counts[f] || 0) + 1;
      if (isBoosted(prefs, f)) counts[f] += 2;
    });
    ((profile && profile.recurringCoachingThemes) || []).forEach(function (t, idx) {
      var f = themeFamily(t.label);
      if (!f || shouldSkipTheme(prefs, memory, f)) return;
      counts[f] = (counts[f] || 0) + Math.max(1, 3 - idx);
    });
    return Object.keys(counts)
      .map(function (f) {
        return {
          family: f,
          label: familyLabel(f),
          weight: counts[f],
          ongoing: counts[f] >= REPEAT_THRESHOLD
        };
      })
      .sort(function (a, b) {
        return b.weight - a.weight;
      })
      .slice(0, 2);
  }

  function markLaterImprovement(memory, growth) {
    var improving = {};
    ((growth && growth.improvements) || []).forEach(function (g) {
      improving[g.family] = true;
    });
    return (memory || []).map(function (r) {
      var f = themeFamily(r.coachingTheme || r.themeLabel);
      if (improving[f] && r.laterShowedImprovement == null) {
        r.laterShowedImprovement = true;
      }
      return r;
    });
  }

  global.WaypointPhotoCoachPersonalized = {
    ENGINE_VERSION: ENGINE_VERSION,
    themeKey: themeKey,
    themeFamily: themeFamily,
    familyLabel: familyLabel,
    isHidden: isHidden,
    isIntentional: isIntentional,
    shouldSkipTheme: shouldSkipTheme,
    recentThemeCounts: recentThemeCounts,
    detectGrowth: detectGrowth,
    personalizeCritique: personalizeCritique,
    buildNextOutingPlan: buildNextOutingPlan,
    buildMemoryRecords: buildMemoryRecords,
    buildOutingMemoryRecord: buildOutingMemoryRecord,
    currentFocus: currentFocus,
    markLaterImprovement: markLaterImprovement,
    lowConfidenceGate: lowConfidenceGate
  };
})(typeof window !== "undefined" ? window : global);
