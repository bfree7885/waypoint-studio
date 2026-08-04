/**
 * Waypoint Scenes — Portfolio Health · Catalog
 *
 * Language guards, dimension ids, purpose alignment notes, confidence labels.
 * Pure constants — no UI, no scoring.
 */
(function (global) {
  "use strict";

  var ANALYSIS_VERSION = "1.0.0";
  var MAX_PORTFOLIO_IMAGES = 200;
  var MAX_LIBRARY_COMPARE = 2000;

  var CATEGORIES = [
    { id: "concentration", label: "Concentration" },
    { id: "underrepresentation", label: "Underrepresentation" },
    { id: "repetition", label: "Repetition" },
    { id: "metadata", label: "Metadata coverage" },
    { id: "purpose-alignment", label: "Purpose alignment" },
    { id: "strength", label: "Strength patterns" },
    { id: "opportunity", label: "Optional opportunities" }
  ];

  var CONFIDENCE = {
    higher: "Higher confidence",
    moderate: "Moderate confidence",
    lower: "Lower confidence"
  };

  var DIMENSIONS = [
    { id: "subject", label: "Subject labels", needs: "tags" },
    { id: "season", label: "Season", needs: "captureDate" },
    { id: "date-range", label: "Date range", needs: "captureDate" },
    { id: "location", label: "Location", needs: "gps" },
    { id: "orientation", label: "Orientation", needs: "dimensions" },
    { id: "role", label: "Image roles", needs: "roles" },
    { id: "focal", label: "Focal length", needs: "camera.focalLengthMm" },
    { id: "lens", label: "Lens", needs: "camera.lens" },
    { id: "camera", label: "Camera", needs: "camera.model" },
    { id: "time-of-day", label: "Time of day", needs: "captureDate" },
    { id: "similar-group", label: "Similar-frame groups", needs: "similarity" },
    { id: "collection", label: "Collections", needs: "collectionIds" },
    { id: "shoot", label: "Shoots", needs: "shootId" },
    { id: "purpose", label: "Purpose", needs: "purpose" }
  ];

  var PURPOSE_NOTES = {
    general: {
      summary: "A general portfolio often mixes strong frames with useful variety.",
      looksFor: ["variety across available labels", "limited near-duplicate clusters", "readable orientation mix when dimensions exist"]
    },
    "photography-website": {
      summary: "Website sets often benefit from a clear opening and cover candidate.",
      looksFor: ["cover assignment", "opening or hero role when recorded", "limited repetition near the start"]
    },
    "gallery-presentation": {
      summary: "Gallery presentations often favor early impact and breathing room between similar frames.",
      looksFor: ["orientation rhythm", "spacing of similar groups", "strong early selections from your preferences"]
    },
    "calendar-image-set": {
      summary: "Calendar sets prefer month diversity when capture dates exist — months are never invented.",
      looksFor: ["month coverage when dates exist", "even spread across dated frames"]
    },
    "book-visual-story": {
      summary: "Book / visual-story sets often lean on chronology and supporting or detail roles when dates and roles exist.",
      looksFor: ["chronological order when dates exist", "supporting or detail roles when recorded"]
    },
    "competition-shortlist": {
      summary: "Competition shortlists in Scenes favor Keep / favorite / strong-candidate signals. No invented contest rules.",
      looksFor: ["Keep or favorite density", "Assistant strong-candidate overlap when a session exists"]
    },
    "wall-print-collection": {
      summary: "Wall-print collections soft-prefer higher resolution when dimensions exist and fewer near-duplicates.",
      looksFor: ["resolution when dimensions exist", "limited near-duplicate clusters"]
    },
    "hiking-outdoor-journal": {
      summary: "Hiking / outdoor journals often lean on chronology and environmental tags when present. GPS is usually absent.",
      looksFor: ["chronology when dates exist", "environmental or trail tags when labeled"]
    }
  };

  var ALLOWED_PHRASE_HINTS = [
    "Your current portfolio leans heavily toward",
    "This category appears frequently",
    "You have fewer images representing",
    "Consider reviewing",
    "You may want to explore",
    "This pattern may be intentional",
    "Metadata is incomplete, so this observation has lower confidence",
    "This portfolio emphasizes",
    "This is an opportunity, not a requirement",
    "Your selections suggest a preference for"
  ];

  /** Judgment / score / obligation language — asserted in tests. */
  var BANNED =
    /\b(your portfolio is weak|your score is\s*\d+|portfolio score\s*:\s*\d+|you must shoot|you failed to|professional portfolios require|this portfolio is unbalanced|your photography level|readiness score|completeness score|overall health score|benchmark against|rank(ed|ing)? users?|achievement badge|streak)\b/i;

  var SEASON_BY_MONTH = {
    0: "winter",
    1: "winter",
    2: "spring",
    3: "spring",
    4: "spring",
    5: "summer",
    6: "summer",
    7: "summer",
    8: "autumn",
    9: "autumn",
    10: "autumn",
    11: "winter"
  };

  function seasonFromCapture(iso) {
    if (!iso) return null;
    var t = Date.parse(String(iso).replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3"));
    if (!isFinite(t)) return null;
    return SEASON_BY_MONTH[new Date(t).getUTCMonth()] || null;
  }

  function timeOfDayFromCapture(iso) {
    if (!iso) return null;
    var t = Date.parse(String(iso).replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3"));
    if (!isFinite(t)) return null;
    var h = new Date(t).getUTCHours();
    if (h < 5) return "night";
    if (h < 8) return "early-morning";
    if (h < 11) return "morning";
    if (h < 14) return "midday";
    if (h < 17) return "afternoon";
    if (h < 20) return "evening";
    return "night";
  }

  function purposeNote(purposeIdOrText) {
    if (!purposeIdOrText) return null;
    var id = String(purposeIdOrText).trim();
    if (PURPOSE_NOTES[id]) return Object.assign({ id: id }, PURPOSE_NOTES[id]);
    // Free-text purpose — soft keyword mapping only
    var lower = id.toLowerCase();
    var mapped = null;
    if (/website|web\b/.test(lower)) mapped = "photography-website";
    else if (/gallery|exhibit|presentation/.test(lower)) mapped = "gallery-presentation";
    else if (/calendar/.test(lower)) mapped = "calendar-image-set";
    else if (/book|story|narrative/.test(lower)) mapped = "book-visual-story";
    else if (/competition|contest|shortlist/.test(lower)) mapped = "competition-shortlist";
    else if (/wall|print/.test(lower)) mapped = "wall-print-collection";
    else if (/hike|hiking|trail|outdoor|journal/.test(lower)) mapped = "hiking-outdoor-journal";
    else if (/general|portfolio/.test(lower)) mapped = "general";
    if (mapped) return Object.assign({ id: mapped, fromFreeText: true }, PURPOSE_NOTES[mapped]);
    return {
      id: "free-text",
      summary: "Purpose is recorded as your own wording. Alignment notes stay descriptive and do not invent external rules.",
      looksFor: ["patterns you already labeled", "repetition you may want to review"],
      fromFreeText: true
    };
  }

  function categoryLabel(id) {
    for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].id === id) return CATEGORIES[i].label;
    return id;
  }

  function containsBanned(text) {
    return BANNED.test(String(text || ""));
  }

  global.WaypointScenesHealthCatalog = {
    ANALYSIS_VERSION: ANALYSIS_VERSION,
    MAX_PORTFOLIO_IMAGES: MAX_PORTFOLIO_IMAGES,
    MAX_LIBRARY_COMPARE: MAX_LIBRARY_COMPARE,
    CATEGORIES: CATEGORIES,
    CONFIDENCE: CONFIDENCE,
    DIMENSIONS: DIMENSIONS,
    PURPOSE_NOTES: PURPOSE_NOTES,
    ALLOWED_PHRASE_HINTS: ALLOWED_PHRASE_HINTS,
    BANNED: BANNED,
    seasonFromCapture: seasonFromCapture,
    timeOfDayFromCapture: timeOfDayFromCapture,
    purposeNote: purposeNote,
    categoryLabel: categoryLabel,
    containsBanned: containsBanned
  };
})(typeof window !== "undefined" ? window : globalThis);
