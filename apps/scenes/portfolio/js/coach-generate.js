/**
 * Waypoint Scenes — Portfolio Coach · Coaching-point generation + uncertainty
 *
 * Pure, UI-free, versioned. Turns comparison facts into PortfolioCoachPoint
 * objects with mentor voice. NEVER claims objective quality, professional
 * standards, or forced winners. Creative interpretation is cautious.
 *
 * Structure per point:
 *   observation → whyItMayMatter → tradeoff → portfolioContext → decisionPrompt
 */
(function (global) {
  "use strict";

  var ANALYSIS_VERSION = "1.0.0";

  var CATEGORY = {
    TECHNICAL: "technical-clarity",
    SUBJECT: "subject-presentation",
    COMPOSITION: "composition",
    TIMING: "timing-and-gesture",
    ENVIRONMENT: "environmental-context",
    VARIETY: "visual-variety",
    REPETITION: "portfolio-repetition",
    NARRATIVE: "narrative-role",
    COVER: "cover-suitability",
    SEQUENCE: "sequence-contribution",
    INSUFFICIENT: "insufficient-evidence"
  };

  var CATEGORY_LABEL = {
    "technical-clarity": "Technical clarity",
    "subject-presentation": "Subject presentation",
    "composition": "Composition",
    "timing-and-gesture": "Timing and gesture",
    "environmental-context": "Environmental context",
    "visual-variety": "Visual variety",
    "portfolio-repetition": "Portfolio repetition",
    "narrative-role": "Narrative role",
    "cover-suitability": "Cover suitability",
    "sequence-contribution": "Sequence contribution",
    "insufficient-evidence": "Insufficient evidence"
  };

  var BANNED =
    /\b(objectively better|objectively worse|bad photo|professional quality|correct composition|should be rejected|score of \d+|best overall|great composition|excellent photo|portfolio-worthy)\b/i;

  function pointId(prefix, i) {
    return prefix + "-" + i;
  }

  function evidenceFrom(fact) {
    return {
      signal: fact.signal,
      label: fact.label,
      valueA: fact.valueA,
      valueB: fact.valueB,
      deltaMs: fact.deltaMs != null ? fact.deltaMs : null
    };
  }

  function makePoint(partial) {
    var p = {
      id: partial.id,
      category: partial.category,
      mode: partial.mode, // frame | portfolio-fit | role
      kind: partial.kind || "mixed", // technical | creative | mixed
      observation: partial.observation,
      whyItMayMatter: partial.whyItMayMatter,
      tradeoff: partial.tradeoff,
      portfolioContext: partial.portfolioContext || null,
      decisionPrompt: partial.decisionPrompt,
      confidence: partial.confidence, // higher | moderate | lower
      evidence: Array.isArray(partial.evidence) ? partial.evidence : [],
      analysisVersion: ANALYSIS_VERSION
    };
    // Soft guard — never emit banned definitive language
    ["observation", "whyItMayMatter", "tradeoff", "portfolioContext", "decisionPrompt"].forEach(function (k) {
      if (p[k] && BANNED.test(p[k])) {
        p[k] = "Evidence is limited for a definitive claim here — compare the frames yourself.";
        p.confidence = "lower";
        p.category = CATEGORY.INSUFFICIENT;
      }
    });
    return p;
  }

  function confidenceFromFacts(facts, interpretive) {
    if (!facts || !facts.length) return "lower";
    var technical = facts.filter(function (f) { return f.technical; }).length;
    if (interpretive) return technical >= 1 ? "moderate" : "lower";
    if (technical >= 2 || facts.length >= 3) return "higher";
    if (facts.length >= 1) return "moderate";
    return "lower";
  }

  function sideNames(cmp) {
    return { a: "Frame A", b: "Frame B", la: cmp.labelA || "A", lb: cmp.labelB || "B" };
  }

  function pointsFromFrame(cmp) {
    var points = [];
    var names = sideNames(cmp);
    var facts = cmp.frameFacts || [];
    var i = 0;

    facts.forEach(function (f) {
      if (f.key === "aspect") {
        points.push(makePoint({
          id: pointId("frame", i++),
          category: CATEGORY.COMPOSITION,
          mode: "frame",
          kind: "creative",
          observation: names.a + " is " + f.valueA + "; " + names.b + " is " + f.valueB + ".",
          whyItMayMatter: "Different orientations can change how immediate the subject feels and how much of the surroundings stay visible.",
          tradeoff: "A wider " + (f.valueA === "landscape" || f.valueB === "landscape" ? "landscape" : "frame") + " may give more environmental context; a tighter orientation may feel more immediate. Neither is automatically preferable.",
          portfolioContext: null,
          decisionPrompt: "Which orientation better serves the story you want this pair to tell?",
          confidence: "moderate",
          evidence: [evidenceFrom(f)]
        }));
      } else if (f.key === "resolution") {
        points.push(makePoint({
          id: pointId("frame", i++),
          category: CATEGORY.TECHNICAL,
          mode: "frame",
          kind: "technical",
          observation: "Resolution differs: " + names.a + " is " + f.valueA + "; " + names.b + " is " + f.valueB + ".",
          whyItMayMatter: "Higher pixel count can matter for a cover, large print, or crop room — it is not the same as sharpness or focus quality (those are not measured here).",
          tradeoff: "The smaller file may still be the stronger storytelling choice; resolution alone does not decide impact.",
          portfolioContext: null,
          decisionPrompt: "Do you need the extra resolution for how this will be shown?",
          confidence: "higher",
          evidence: [evidenceFrom(f)]
        }));
      } else if (f.key === "timing") {
        var sec = Math.round((f.deltaMs || 0) / 100) / 10;
        var burstLike = (f.deltaMs || 0) <= 4000;
        points.push(makePoint({
          id: pointId("frame", i++),
          category: CATEGORY.TIMING,
          mode: "frame",
          kind: "technical",
          observation: "These frames are about " + sec + "s apart in capture time" + (burstLike ? " — within a short burst window" : "") + ".",
          whyItMayMatter: "Nearby moments can catch a different gesture, wing position, or glance. Timing evidence does not say which moment is the right one.",
          tradeoff: "Keeping both may preserve a small narrative beat; keeping one may reduce repetition.",
          portfolioContext: null,
          decisionPrompt: "Is the timing difference meaningful for your story, or are these near-duplicates for your purpose?",
          confidence: burstLike ? "moderate" : "lower",
          evidence: [evidenceFrom(f)]
        }));
      } else if (f.key === "duplicate-fp" || f.key === "duplicate-name") {
        points.push(makePoint({
          id: pointId("frame", i++),
          category: CATEGORY.REPETITION,
          mode: "frame",
          kind: "technical",
          observation: f.key === "duplicate-fp"
            ? "Both frames share the same import fingerprint — likely the same file identity."
            : "Both frames share the same filename and byte size — may be a duplicate import.",
          whyItMayMatter: "Duplicate imports rarely add variety; comparing them helps you keep a single reference.",
          tradeoff: "You might still keep both temporarily while deciding which library entry to trust — originals are never deleted by coaching.",
          portfolioContext: null,
          decisionPrompt: "Prefer one library entry, keep both for now, or dismiss this comparison?",
          confidence: f.key === "duplicate-fp" ? "higher" : "moderate",
          evidence: [evidenceFrom(f)]
        }));
      } else if (f.key === "favorite" || f.key === "selection" || f.key === "rating") {
        points.push(makePoint({
          id: pointId("frame", i++),
          category: CATEGORY.SUBJECT,
          mode: "frame",
          kind: "mixed",
          observation: "Your prior review signals differ — " + f.label + ": " + names.a + " " + f.valueA + ", " + names.b + " " + f.valueB + ".",
          whyItMayMatter: "These are your own earlier choices, not an external grade. They can remind you what already felt worth keeping.",
          tradeoff: "You can change your mind; a past Maybe or lower rating does not permanently sideline a frame.",
          portfolioContext: null,
          decisionPrompt: "Does your earlier preference still hold when you see them side by side?",
          confidence: "moderate",
          evidence: [evidenceFrom(f)]
        }));
      } else if (f.key === "coach") {
        points.push(makePoint({
          id: pointId("frame", i++),
          category: CATEGORY.SUBJECT,
          mode: "frame",
          kind: "mixed",
          observation: "Photo Coach session notes differ (soft signal): " + names.a + " " + f.valueA + "; " + names.b + " " + f.valueB + ".",
          whyItMayMatter: "Coach grades are assistive session notes, not rankings or proof of quality.",
          tradeoff: "A lower coach note can still carry the mood or gesture you care about.",
          portfolioContext: null,
          decisionPrompt: "Use the coach note as one clue, then decide from the photographs themselves.",
          confidence: "lower",
          evidence: [evidenceFrom(f)]
        }));
      } else if (f.key === "media") {
        points.push(makePoint({
          id: pointId("frame", i++),
          category: CATEGORY.TECHNICAL,
          mode: "frame",
          kind: "technical",
          observation: "Local media completeness differs: " + names.a + " " + f.valueA + "; " + names.b + " " + f.valueB + ".",
          whyItMayMatter: "Missing previews limit what coaching can honestly show — manual comparison in Photo Library may help.",
          tradeoff: "You can still decide from filenames and metadata, but visual judgment is incomplete.",
          portfolioContext: null,
          decisionPrompt: "Restore the missing file or continue with limited evidence?",
          confidence: "higher",
          evidence: [evidenceFrom(f)]
        }));
      } else if (f.key === "subjects") {
        points.push(makePoint({
          id: pointId("frame", i++),
          category: CATEGORY.ENVIRONMENT,
          mode: "frame",
          kind: "creative",
          observation: "Tagged subjects differ: " + names.a + " — " + f.valueA + "; " + names.b + " — " + f.valueB + ".",
          whyItMayMatter: "Different tags may point toward different environmental or subject emphasis — tags are sparse and may be incomplete.",
          tradeoff: "Untagged photographs are not empty of meaning; absence of tags is not absence of subject.",
          portfolioContext: null,
          decisionPrompt: "Do the tags match how you actually see these frames?",
          confidence: "lower",
          evidence: [evidenceFrom(f)]
        }));
      } else if (f.key.indexOf("cam-") === 0) {
        points.push(makePoint({
          id: pointId("frame", i++),
          category: CATEGORY.TECHNICAL,
          mode: "frame",
          kind: "technical",
          observation: "Camera metadata differs for " + f.label + ": " + f.valueA + " vs " + f.valueB + ".",
          whyItMayMatter: "EXIF can explain a technical difference, but unusual exposure or blur may still be intentional.",
          tradeoff: "Metadata never proves creative intent — treat it as context.",
          portfolioContext: null,
          decisionPrompt: "Does the technical difference matter for how you will use the frame?",
          confidence: "moderate",
          evidence: [evidenceFrom(f)]
        }));
      }
    });

    if (cmp.identicalSignals || !points.length) {
      points.push(makePoint({
        id: pointId("frame", i++),
        category: CATEGORY.INSUFFICIENT,
        mode: "frame",
        kind: "mixed",
        observation: "Available metadata looks very similar for this pair, and this workspace cannot inspect pixel sharpness, exposure, or subject separation.",
        whyItMayMatter: "Without richer on-device analysis, honest coaching stops at what the library actually stores.",
        tradeoff: "Manual side-by-side looking is still the most trustworthy path.",
        portfolioContext: null,
        decisionPrompt: "Compare the photographs yourself — prefer one, keep both, keep neither this session, or assign different roles.",
        confidence: "lower",
        evidence: facts.slice(0, 3).map(evidenceFrom)
      }));
    }

    return points;
  }

  function pointsFromFit(cmp) {
    var points = [];
    var names = sideNames(cmp);
    var facts = cmp.fitFacts || [];
    var pf = cmp.portfolio;
    var i = 0;

    if (!pf || !pf.present) {
      points.push(makePoint({
        id: pointId("fit", i++),
        category: CATEGORY.INSUFFICIENT,
        mode: "portfolio-fit",
        kind: "mixed",
        observation: "No portfolio is selected for fit context.",
        whyItMayMatter: "Portfolio-fit coaching needs a destination set to talk about variety, repetition, or cover.",
        tradeoff: "You can still use frame and role coaching without a portfolio.",
        portfolioContext: null,
        decisionPrompt: "Choose a portfolio when you want fit guidance, or continue comparing frames alone.",
        confidence: "higher",
        evidence: []
      }));
      return points;
    }

    facts.forEach(function (f) {
      if (f.key === "membership") {
        points.push(makePoint({
          id: pointId("fit", i++),
          category: CATEGORY.VARIETY,
          mode: "portfolio-fit",
          kind: "mixed",
          observation: "Membership in “" + (pf.title || "portfolio") + "”: " + names.a + " " + f.valueA + "; " + names.b + " " + f.valueB + ".",
          whyItMayMatter: "Knowing what is already curated avoids silent doubles and clarifies whether you are adding or replacing.",
          tradeoff: "Both can belong if they serve different roles; neither must be forced in.",
          portfolioContext: "Portfolio currently holds " + pf.count + " photograph" + (pf.count === 1 ? "" : "s") + ".",
          decisionPrompt: "Add one, add both, replace an existing image, or leave membership unchanged?",
          confidence: "higher",
          evidence: [evidenceFrom(f)]
        }));
      } else if (f.key === "season") {
        points.push(makePoint({
          id: pointId("fit", i++),
          category: CATEGORY.VARIETY,
          mode: "portfolio-fit",
          kind: "creative",
          observation: "Capture-month overlap with the portfolio: " + names.a + " " + f.valueA + "; " + names.b + " " + f.valueB + ".",
          whyItMayMatter: "Several frames from the same month can feel repetitive — or reinforce a seasonal chapter, depending on your purpose.",
          tradeoff: "Variety is not mandatory; a tight seasonal set can be intentional.",
          portfolioContext: pf.purpose ? "Stated purpose: " + pf.purpose : "No purpose text set yet.",
          decisionPrompt: "Would another month’s frame add variety, or does this season belong?",
          confidence: "moderate",
          evidence: [evidenceFrom(f)]
        }));
      } else if (f.key === "repetition") {
        points.push(makePoint({
          id: pointId("fit", i++),
          category: CATEGORY.REPETITION,
          mode: "portfolio-fit",
          kind: "technical",
          observation: "Import-fingerprint overlap with the portfolio: " + names.a + " " + f.valueA + "; " + names.b + " " + f.valueB + ".",
          whyItMayMatter: "Matching fingerprints usually mean the same file identity is already curated.",
          tradeoff: "You may still want a second library id temporarily, but it rarely adds visual variety.",
          portfolioContext: "Repetition check uses import identity, not perceptual hashing.",
          decisionPrompt: "Skip the duplicate, replace the existing entry, or keep reviewing manually?",
          confidence: "higher",
          evidence: [evidenceFrom(f)]
        }));
      } else if (f.key === "purpose") {
        points.push(makePoint({
          id: pointId("fit", i++),
          category: CATEGORY.NARRATIVE,
          mode: "portfolio-fit",
          kind: "creative",
          observation: "Weak purpose-keyword overlap: " + names.a + " — " + f.valueA + "; " + names.b + " — " + f.valueB + ".",
          whyItMayMatter: "Keyword overlap is a coarse hint only — tags may be incomplete and purpose text is brief.",
          tradeoff: "A frame can serve the purpose without matching words.",
          portfolioContext: "Purpose: " + (pf.purpose || "—"),
          decisionPrompt: "Which frame feels closer to the purpose you wrote — or do they serve different chapters?",
          confidence: "lower",
          evidence: [evidenceFrom(f)]
        }));
      } else if (f.key === "cover-current") {
        var coverNote =
          "Cover suitability here uses orientation, resolution when known, and your prior review signals — not pixel beauty analysis.";
        points.push(makePoint({
          id: pointId("fit", i++),
          category: CATEGORY.COVER,
          mode: "portfolio-fit",
          kind: "mixed",
          observation: "Cover status: " + names.a + " " + f.valueA + "; " + names.b + " " + f.valueB + ".",
          whyItMayMatter: "A cover often benefits from clear orientation and enough resolution; expressive or unusual frames can still open a set intentionally.",
          tradeoff: "A cleaner technical candidate and a more expressive candidate may both work — for different moods.",
          portfolioContext: coverNote,
          decisionPrompt: "Leave the current cover, try one of these as cover later, or decide cover separately?",
          confidence: "moderate",
          evidence: [evidenceFrom(f)]
        }));
      } else if (f.key === "sequence-mono") {
        points.push(makePoint({
          id: pointId("fit", i++),
          category: CATEGORY.SEQUENCE,
          mode: "portfolio-fit",
          kind: "creative",
          observation: "The current portfolio sequence has a long run of the same orientation (" + f.valueA + ").",
          whyItMayMatter: "Orientation monotony can reduce breathing room; inserting a contrasting frame may help pacing — or a steady run may be intentional.",
          tradeoff: "Coaching never auto-reorders. Sequence changes stay in your hands.",
          portfolioContext: "Sequence tips are observational only — not Portfolio Health scores.",
          decisionPrompt: "Would either frame add a useful orientation change, or leave the sequence as-is?",
          confidence: "lower",
          evidence: [evidenceFrom(f)]
        }));
      } else if (f.key.indexOf("aspect-mix") === 0) {
        // fold into a single variety point once
      }
    });

    // Orientation variety summary if both aspects known
    if (cmp.signalsA && cmp.signalsB && cmp.signalsA.aspect && cmp.signalsB.aspect) {
      var aCount = pf.aspects[cmp.signalsA.aspect] || 0;
      var bCount = pf.aspects[cmp.signalsB.aspect] || 0;
      points.push(makePoint({
        id: pointId("fit", i++),
        category: CATEGORY.VARIETY,
        mode: "portfolio-fit",
        kind: "creative",
        observation: names.a + " is " + cmp.signalsA.aspect + " (portfolio already has " + aCount + "); " +
          names.b + " is " + cmp.signalsB.aspect + " (portfolio already has " + bCount + ").",
        whyItMayMatter: "Choosing the orientation you have fewer of may add visual variety — if variety is a goal for this purpose.",
        tradeoff: "Matching the dominant orientation can also keep a set cohesive.",
        portfolioContext: "Purpose: " + (pf.purpose || "not set"),
        decisionPrompt: "Do you want more variety, or a tighter, more consistent look?",
        confidence: "moderate",
        evidence: [
          { signal: "aspect", label: "A orientation vs portfolio", valueA: cmp.signalsA.aspect + " ×" + aCount, valueB: null },
          { signal: "aspect", label: "B orientation vs portfolio", valueA: null, valueB: cmp.signalsB.aspect + " ×" + bCount }
        ]
      }));
    }

    return points;
  }

  function pointsFromRoles(cmp) {
    var points = [];
    var names = sideNames(cmp);
    var i = 0;
    var rolesA = cmp.rolesA || [];
    var rolesB = cmp.rolesB || [];

    points.push(makePoint({
      id: pointId("role", i++),
      category: CATEGORY.NARRATIVE,
      mode: "role",
      kind: "creative",
      observation: "Both frames may be useful in different roles rather than competing for one slot.",
      whyItMayMatter: names.a + " soft role hints: " + rolesA.map(function (r) { return r.role; }).join(", ") +
        ". " + names.b + " soft role hints: " + rolesB.map(function (r) { return r.role; }).join(", ") + ".",
      tradeoff: "A cleaner technical candidate and a more expressive candidate can both belong — for example hero vs supporting, or cover vs interior detail.",
      portfolioContext: cmp.portfolio && cmp.portfolio.present
        ? "Roles are suggestions for “" + (cmp.portfolio.title || "portfolio") + "”, not assignments."
        : "Roles are suggestions only until you place them in a portfolio.",
      decisionPrompt: "Assign different roles, prefer one for now, keep both, or keep neither this session?",
      confidence: "lower",
      evidence: rolesA.concat(rolesB).slice(0, 4).map(function (r) {
        return { signal: "roleHint", label: r.role, valueA: r.reason, valueB: null };
      })
    }));

    // Distinct reason lines as lighter supporting points (cap 2)
    var seen = Object.create(null);
    rolesA.concat(rolesB).forEach(function (r) {
      if (points.length >= 3) return;
      if (r.role === "undecided" || seen[r.role]) return;
      seen[r.role] = true;
      points.push(makePoint({
        id: pointId("role", i++),
        category: r.role.indexOf("cover") >= 0 ? CATEGORY.COVER : CATEGORY.NARRATIVE,
        mode: "role",
        kind: "creative",
        observation: r.reason,
        whyItMayMatter: "Role ideas are derived from orientation, resolution when known, and your prior review signals — not from judging artistic merit.",
        tradeoff: "Another role may fit just as well; treat this as a starting prompt.",
        portfolioContext: null,
        decisionPrompt: "Override this suggested role, or leave roles undecided?",
        confidence: "lower",
        evidence: [{ signal: "roleHint", label: r.role, valueA: r.reason, valueB: null }]
      }));
    });

    return points;
  }

  /**
   * Generate versioned coaching output from a comparePair result.
   * @param {object} cmp — from WaypointScenesCoachCompare.comparePair
   * @param {{modes?:string[], maxPoints?:number}} [options]
   */
  function generate(cmp, options) {
    options = options || {};
    var modes = options.modes || ["frame", "portfolio-fit", "role"];
    var maxPoints = options.maxPoints || 12;
    var points = [];

    if (!cmp || !cmp.imageIdA || !cmp.imageIdB) {
      return {
        analysisVersion: ANALYSIS_VERSION,
        generatedAt: new Date().toISOString(),
        status: "insufficient-pair",
        message: "Coaching needs two photograph references. Manual comparison is always available once both are selected.",
        points: [
          makePoint({
            id: "edge-pair",
            category: CATEGORY.INSUFFICIENT,
            mode: "frame",
            kind: "mixed",
            observation: "Only one photograph (or a missing reference) is available.",
            whyItMayMatter: "Comparative coaching explains differences — a single frame is better reviewed in the candidate list.",
            tradeoff: "You can still open notes or return to manual review.",
            portfolioContext: null,
            decisionPrompt: "Select a second photograph to compare, or return to the assistant.",
            confidence: "higher",
            evidence: []
          })
        ],
        compare: cmp || null
      };
    }

    if (modes.indexOf("frame") >= 0) points = points.concat(pointsFromFrame(cmp));
    if (modes.indexOf("portfolio-fit") >= 0) points = points.concat(pointsFromFit(cmp));
    if (modes.indexOf("role") >= 0) points = points.concat(pointsFromRoles(cmp));

    if (cmp.unrelatedHint && modes.indexOf("frame") >= 0) {
      points.unshift(makePoint({
        id: "edge-unrelated",
        category: CATEGORY.INSUFFICIENT,
        mode: "frame",
        kind: "mixed",
        observation: "These photographs do not share a similar-frame group, and metadata overlap is thin.",
        whyItMayMatter: "They may still be worth comparing for role or portfolio fit — or they may simply be unrelated.",
        tradeoff: "Thin evidence means more of the judgment stays with you.",
        portfolioContext: null,
        decisionPrompt: "Continue with cautious coaching, or pick a pair from a similar-frame group?",
        confidence: "lower",
        evidence: []
      }));
    }

    // Deduplicate near-identical observations
    var seenObs = Object.create(null);
    points = points.filter(function (p) {
      var k = p.category + "|" + p.observation.slice(0, 80);
      if (seenObs[k]) return false;
      seenObs[k] = true;
      return true;
    }).slice(0, maxPoints);

    var status = "ok";
    var message = "Coaching explains possible differences from on-device signals. You decide — nothing changes until you act.";
    if (points.every(function (p) { return p.category === CATEGORY.INSUFFICIENT; })) {
      status = "insufficient-data";
      message = "Evidence is limited for this pair. Manual side-by-side comparison remains available.";
    }

    return {
      analysisVersion: ANALYSIS_VERSION,
      generatedAt: new Date().toISOString(),
      status: status,
      message: message,
      points: points,
      compare: {
        imageIdA: cmp.imageIdA,
        imageIdB: cmp.imageIdB,
        labelA: cmp.labelA,
        labelB: cmp.labelB,
        source: cmp.source,
        groupId: cmp.groupId,
        portfolioId: cmp.portfolio && cmp.portfolio.id
      }
    };
  }

  global.WaypointScenesCoachGenerate = {
    ANALYSIS_VERSION: ANALYSIS_VERSION,
    CATEGORY: CATEGORY,
    CATEGORY_LABEL: CATEGORY_LABEL,
    BANNED: BANNED,
    generate: generate,
    makePoint: makePoint,
    confidenceFromFacts: confidenceFromFacts
  };
})(typeof window !== "undefined" ? window : globalThis);
