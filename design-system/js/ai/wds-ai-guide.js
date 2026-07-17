/**
 * Waypoint AI Guide — shared product-AI voice helpers.
 * Park-ranger field companion: notice, explain, invite — never grade or assign.
 * @see docs/WAYPOINT-AI-GUIDE.md
 */
(function (global) {
  "use strict";

  var SYSTEM_PREAMBLE =
    "Follow Waypoint Constitution and Waypoint AI Principles: observe clearly, explain evidence vs interpretation, respect uncertainty and autonomy, invite curiosity, never assign work or grade people.\n\n" +
    "You are a Waypoint Studio field guide — like an exceptional national-park ranger walking beside the user.\n\n" +
    "You notice clearly. You explain relationships. You answer questions. You provide context. You respect uncertainty. You invite curiosity.\n\n" +
    "You are not a teacher, lecturer, assignment engine, or grading system.\n" +
    "You never pressure, judge, or assign work.\n" +
    "You never make the user feel guilty, behind, or evaluated.\n\n" +
    "Prefer language such as: \"I noticed…\", \"This might explain…\", \"Here's why this may matter…\", \"If you're interested…\", \"You may also want to know…\"\n\n" +
    "Always distinguish what the evidence shows from what Waypoint interprets.\n" +
    "Stay calm, specific, and honest about limits.\n" +
    "Safety, legality, and wildlife ethics must stay clear and direct when relevant.\n" +
    "Leave decisions with the user.";

  var PREFER = [
    "I noticed",
    "This might explain",
    "Here's why this may matter",
    "If you're interested",
    "If you're curious",
    "You may also want to know",
    "Worth noticing",
    "One possible reading",
    "Evidence currently suggests",
    "You decide"
  ];

  var AVOID = [
    "You must",
    "You should",
    "You need to",
    "Your assignment",
    "Complete this",
    "Homework",
    "You failed",
    "You're behind",
    "Grade:",
    "Pass/fail",
    "Do this now"
  ];

  var PRESSURE_RE =
    /\b(you must|you should|you need to|your assignment|complete this|homework|you failed|you're behind|do this now|catch up)\b/gi;

  function systemPreamble() {
    return SYSTEM_PREAMBLE;
  }

  function preferPhrases() {
    return PREFER.slice();
  }

  function avoidPhrases() {
    return AVOID.slice();
  }

  /**
   * Soften common school/productivity phrasing in generated coach text.
   * Does not touch safety-critical sentences that use direct imperatives
   * about law, toxicity, or wildlife harm when those words appear alone.
   */
  function softenOutput(text) {
    if (text == null || text === "") return text;
    var s = String(text);
    s = s.replace(/\bImprove first:\s*/gi, "Worth noticing first: ");
    s = s.replace(/\bTeaching note:\s*/gi, "Guide note: ");
    s = s.replace(/\bOverall grade\b/gi, "Overall reading");
    s = s.replace(/\bLetter grade\b/gi, "Relative reading");
    s = s.replace(/\bScore breakdown\b/gi, "What stands out");
    s = s.replace(/\blearning exposure\b/gi, "exploratory frame");
    s = s.replace(/\bYour assignment\b/gi, "If you're curious");
    s = s.replace(/\bYou should\b/gi, "You may want to");
    s = s.replace(/\bYou must\b/gi, "It helps to");
    s = s.replace(/\bYou need to\b/gi, "You may want to");
    s = s.replace(/\bPractice:\s*/gi, "Worth trying: ");
    s = s.replace(/\bNext field challenge\b/gi, "Worth noticing next");
    s = s.replace(/\bToday'?s mission:\s*/gi, "Worth noticing today: ");
    return s;
  }

  function hasPressureLanguage(text) {
    if (!text) return false;
    PRESSURE_RE.lastIndex = 0;
    return PRESSURE_RE.test(String(text));
  }

  /**
   * Wrap a product-specific instruction with the ranger preamble.
   */
  function buildSystemPrompt(productInstructions) {
    var extra = productInstructions ? String(productInstructions).trim() : "";
    return extra ? SYSTEM_PREAMBLE + "\n\n---\n\n" + extra : SYSTEM_PREAMBLE;
  }

  /**
   * Invite framing for optional next steps (never assignments).
   */
  function invite(suggestion) {
    var tip = String(suggestion || "").trim();
    if (!tip) return "";
    if (/^if you/i.test(tip) || /^you may/i.test(tip) || /^worth/i.test(tip)) return tip;
    return "If you're curious, " + tip.charAt(0).toLowerCase() + tip.slice(1);
  }

  /**
   * Notice framing for observations.
   */
  function noticed(observation) {
    var tip = String(observation || "").trim();
    if (!tip) return "";
    if (/^i noticed/i.test(tip)) return tip;
    return "I noticed " + tip.charAt(0).toLowerCase() + tip.slice(1);
  }

  global.WDS = global.WDS || {};
  global.WDS.aiGuide = {
    version: "1.0.0",
    systemPreamble: systemPreamble,
    buildSystemPrompt: buildSystemPrompt,
    preferPhrases: preferPhrases,
    avoidPhrases: avoidPhrases,
    softenOutput: softenOutput,
    hasPressureLanguage: hasPressureLanguage,
    invite: invite,
    noticed: noticed,
    docPath: "docs/WAYPOINT-AI-GUIDE.md",
    constitutionPath: "docs/WAYPOINT-CONSTITUTION.md",
    principlesPath: "docs/WAYPOINT-AI-PRINCIPLES.md"
  };
})(typeof window !== "undefined" ? window : globalThis);
