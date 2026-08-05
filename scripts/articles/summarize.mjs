/**
 * Deterministic summary and Waypoint's Take generation from feed metadata only.
 * No invented facts. Labels provenance honestly.
 */

import { sanitizeExcerpt, truncateWords, wordCount, stripHtml } from "./sanitize.mjs";

const MIN_SUMMARY_WORDS = 45;
const MAX_SUMMARY_WORDS = 90;
const MIN_TAKE_WORDS = 30;
const MAX_TAKE_WORDS = 70;

function sentenceSplit(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function hedgeUncertainty(text) {
  // Preserve uncertainty markers; do not escalate claims.
  return text
    .replace(/\bproves that\b/gi, "suggests that")
    .replace(/\bwill definitely\b/gi, "may")
    .replace(/\bguarantees?\b/gi, "may support");
}

/**
 * Build a concise neutral summary from feed description / title.
 */
export function buildSummary(article) {
  const excerpt = stripHtml(article.cleanedExcerpt || article.rawDescription || "");
  const title = stripHtml(article.title || "");
  const words = wordCount(excerpt);

  if (words < 12) {
    return {
      summary:
        "Available feed details are too limited to form a reliable summary. Open the original article for the publisher’s full reporting.",
      summaryProvenance: "unavailable",
      summaryNote: "source-material-too-limited"
    };
  }

  let body = sanitizeExcerpt(excerpt, 900);
  body = hedgeUncertainty(body);

  // Prefer first 2–4 sentences, then clamp to word budget.
  const sentences = sentenceSplit(body);
  let assembled = "";
  for (const s of sentences) {
    const next = assembled ? assembled + " " + s : s;
    if (wordCount(next) > MAX_SUMMARY_WORDS && wordCount(assembled) >= 40) break;
    assembled = next;
    if (wordCount(assembled) >= MIN_SUMMARY_WORDS && sentences.indexOf(s) >= 1) break;
  }
  if (!assembled) assembled = body;

  let summary = truncateWords(assembled, MAX_SUMMARY_WORDS);
  if (wordCount(summary) < 25) {
    summary = truncateWords(`${title}. ${assembled}`, MAX_SUMMARY_WORDS);
  }

  // Never pretend a truncated feed excerpt is a complete editorial summary.
  const provenance = "feed-description";
  if (wordCount(excerpt) > MAX_SUMMARY_WORDS + 20) {
    summary = summary.replace(/\.…$/, "…");
    if (!/based on the publisher.?s feed/i.test(summary)) {
      summary += " (Condensed from the publisher’s feed description — not a full article summary.)";
    }
  }

  return {
    summary: truncateWords(summary, MAX_SUMMARY_WORDS + 18),
    summaryProvenance: provenance,
    summaryNote: null
  };
}

function pickProductContext(relatedProducts, categories) {
  const ids = new Set((relatedProducts || []).map((p) => p.id || p));
  if (ids.has("dashboard") || (categories || []).includes("Weather")) {
    return "check Dashboard conditions before heading out";
  }
  if (ids.has("photo-coach") || ids.has("scenes") || (categories || []).includes("Nature Photography")) {
    return "review related craft ideas in Scenes or Photo Coach";
  }
  if (ids.has("hidden-landscapes") || (categories || []).includes("Hidden Landscapes")) {
    return "compare what Hidden Landscapes reveals beyond visible light";
  }
  if (ids.has("sheds") || (categories || []).includes("Wildlife")) {
    return "connect habitat and seasonal movement notes in Sheds when relevant";
  }
  if (ids.has("fieldry")) {
    return "record what you notice as a Fieldry observation";
  }
  return "use Waypoint Studio tools that match the subject when they add context";
}

/**
 * Waypoint's Take — separate from the summary; outdoor-observer oriented.
 */
export function buildWaypointTake(article) {
  const excerpt = stripHtml(article.cleanedExcerpt || article.rawDescription || "");
  const cats = article.categories || [];
  const geo = (article.geographicScopes || [])[0] || "this region";

  if (wordCount(excerpt) < 12 && wordCount(article.title || "") < 4) {
    return {
      waypointTake: "No Waypoint analysis is available — the feed provided too little context to ground a field take.",
      takeProvenance: "unavailable",
      takeNote: "insufficient-source-material"
    };
  }

  const noticeHints = [];
  if (cats.includes("Birds") || cats.includes("Wildlife")) {
    noticeHints.push("watch for species activity, tracks, or calling patterns suited to the season");
  }
  if (cats.includes("Weather") || cats.includes("Outdoor Safety")) {
    noticeHints.push("notice how wind, moisture, and temperature change what the landscape feels like");
  }
  if (cats.includes("Astronomy and Night Sky")) {
    noticeHints.push("look up when skies clear — timing and light pollution shape what is visible");
  }
  if (cats.includes("Forests and Plants") || cats.includes("Seasonal Nature")) {
    noticeHints.push("compare leaf stage, understory color, and canopy density with what you see on your usual routes");
  }
  if (cats.includes("Hiking and Trails")) {
    noticeHints.push("consider trail surface, water crossings, and recent weather before committing to a route");
  }
  if (cats.includes("Geology") || cats.includes("Rivers and Water")) {
    noticeHints.push("read water level, rock exposure, and erosion clues as living field signals");
  }
  if (cats.includes("Nature Photography") || cats.includes("Hidden Landscapes")) {
    noticeHints.push("think about light quality and what the camera can clarify that the eye alone may miss");
  }
  if (!noticeHints.length) {
    noticeHints.push("carry the reporting back into patient outdoor observation rather than treating it as a headline alone");
  }

  const productLine = pickProductContext(article.relatedProducts, cats);
  const take = [
    `For an outdoor observer in ${geo}, this reporting matters because it frames what you might notice outside — ${noticeHints[0]}.`,
    `Practical context stays modest: treat the publisher’s findings as provisional until you read the original.`,
    `In Waypoint Studio, ${productLine}.`
  ].join(" ");

  return {
    waypointTake: truncateWords(take, MAX_TAKE_WORDS),
    takeProvenance: "fallback",
    takeNote: "deterministic-template-from-feed-metadata"
  };
}
