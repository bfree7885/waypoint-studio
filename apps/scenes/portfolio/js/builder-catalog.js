/**
 * Waypoint Scenes — Auto Portfolio Builder · Purpose + size + role catalogs
 *
 * Pure constants and soft weight helpers. No UI. No invented competition rules.
 * Every purpose influence is explainable and soft.
 */
(function (global) {
  "use strict";

  var PURPOSES = [
    {
      id: "general",
      label: "General",
      summary: "Balanced suggested draft — strong frames, variety, and a readable sequence.",
      priorities: ["strong", "variety", "sequence"]
    },
    {
      id: "photography-website",
      label: "Photography website",
      summary: "Favors a clear opening and cover candidate, with limited repetition.",
      priorities: ["opening", "cover", "strong", "limited-repetition"]
    },
    {
      id: "gallery-presentation",
      label: "Gallery / presentation",
      summary: "Early impact, orientation rhythm, and breathing room between similar frames.",
      priorities: ["impact", "orientation-rhythm", "breathing-room"]
    },
    {
      id: "calendar-image-set",
      label: "Calendar image set",
      summary: "Prefers month diversity when capture dates exist — never invents months.",
      priorities: ["month-diversity", "even-spread"],
      requiresDatesForSeason: true
    },
    {
      id: "book-visual-story",
      label: "Book / visual story",
      summary: "Soft chronology and transition roles when dates exist — not a claim of story understanding.",
      priorities: ["chronology", "transitions", "supporting-detail"]
    },
    {
      id: "competition-shortlist",
      label: "Competition shortlist",
      summary: "Tighter set favoring Keep / favorite / strong-candidate signals. No invented contest rules.",
      priorities: ["keep-favorite", "strong", "tight-set"],
      noInventedRules: true
    },
    {
      id: "wall-print-collection",
      label: "Wall-print collection",
      summary: "Soft preference for higher resolution when dimensions exist; fewer near-duplicates.",
      priorities: ["resolution", "limited-repetition"]
    },
    {
      id: "hiking-outdoor-journal",
      label: "Hiking / outdoor journal",
      summary: "Chronology and environmental tags when present. GPS is unused (usually absent).",
      priorities: ["chronology", "environmental-tags"]
    }
  ];

  var SIZE_PRESETS = [
    { id: "small", label: "Small", min: 6, max: 10, guide: "6–10 images — a focused short set." },
    { id: "medium", label: "Medium", min: 12, max: 20, guide: "12–20 images — a typical working portfolio draft." },
    { id: "large", label: "Large", min: 24, max: 40, guide: "24–40 images — a broad draft; review carefully." },
    { id: "custom", label: "Custom", min: 1, max: 80, guide: "Choose a count that fits your purpose." }
  ];

  var ROLES = [
    { id: "opening", label: "Opening" },
    { id: "hero", label: "Hero" },
    { id: "supporting", label: "Supporting" },
    { id: "environmental", label: "Environmental" },
    { id: "detail", label: "Detail" },
    { id: "transition", label: "Transition" },
    { id: "cover-candidate", label: "Cover candidate" },
    { id: "closing", label: "Closing" },
    { id: "alternate", label: "Alternate" },
    { id: "needs-review", label: "Needs review" }
  ];

  /** Allowed observational language tokens (product copy guard). */
  var ALLOWED_PHRASES = [
    "Suggested draft",
    "Proposed sequence",
    "Strong opening candidate",
    "Adds useful variety",
    "Similar to another selection",
    "Possible supporting image",
    "Alternative choice",
    "Lower-confidence placement",
    "Review recommended"
  ];

  var BANNED =
    /\b(perfect portfolio|best possible|guaranteed professional|objective winner|final portfolio|AI-certified|portfolio score\s*:\s*\d+|objectively better|professional quality)\b/i;

  function purposeById(id) {
    for (var i = 0; i < PURPOSES.length; i++) if (PURPOSES[i].id === id) return PURPOSES[i];
    return PURPOSES[0];
  }

  function sizeById(id) {
    for (var i = 0; i < SIZE_PRESETS.length; i++) if (SIZE_PRESETS[i].id === id) return SIZE_PRESETS[i];
    return SIZE_PRESETS[1];
  }

  function resolveTargetCount(sizeId, customCount) {
    var preset = sizeById(sizeId || "medium");
    if (preset.id === "custom") {
      var n = Number(customCount);
      if (!isFinite(n) || n < 1) n = 12;
      return Math.min(preset.max, Math.max(preset.min, Math.round(n)));
    }
    // Prefer midpoint of guide range as soft target
    return Math.round((preset.min + preset.max) / 2);
  }

  function roleLabel(id) {
    for (var i = 0; i < ROLES.length; i++) if (ROLES[i].id === id) return ROLES[i].label;
    return id;
  }

  /**
   * Soft numeric bias from purpose — never a score product surface.
   * Returns multipliers applied to candidate weight components.
   */
  function purposeWeights(purposeId) {
    var p = purposeById(purposeId);
    var w = {
      strong: 1,
      variety: 1,
      opening: 1,
      cover: 1,
      chronology: 1,
      resolution: 1,
      monthDiversity: 1,
      tightSet: 1,
      environmental: 1
    };
    (p.priorities || []).forEach(function (key) {
      if (key === "strong" || key === "keep-favorite" || key === "impact") w.strong += 0.35;
      if (key === "variety" || key === "limited-repetition") w.variety += 0.35;
      if (key === "opening" || key === "cover") {
        w.opening += 0.4;
        w.cover += 0.4;
      }
      if (key === "chronology" || key === "transitions") w.chronology += 0.4;
      if (key === "resolution") w.resolution += 0.35;
      if (key === "month-diversity" || key === "even-spread") w.monthDiversity += 0.5;
      if (key === "tight-set") w.tightSet += 0.3;
      if (key === "environmental-tags" || key === "supporting-detail") w.environmental += 0.3;
      if (key === "orientation-rhythm" || key === "breathing-room") w.variety += 0.25;
    });
    return w;
  }

  function sanitizeText(text) {
    if (!text) return text;
    if (BANNED.test(text)) {
      return "Evidence is limited here — treat this as a suggested draft detail, not a final judgment.";
    }
    return text;
  }

  global.WaypointScenesBuilderCatalog = {
    PURPOSES: PURPOSES,
    SIZE_PRESETS: SIZE_PRESETS,
    ROLES: ROLES,
    ALLOWED_PHRASES: ALLOWED_PHRASES,
    BANNED: BANNED,
    purposeById: purposeById,
    sizeById: sizeById,
    resolveTargetCount: resolveTargetCount,
    roleLabel: roleLabel,
    purposeWeights: purposeWeights,
    sanitizeText: sanitizeText
  };
})(typeof window !== "undefined" ? window : globalThis);
