/**
 * Deterministic summary and Waypoint's Take generation from feed metadata only.
 * No invented facts. Labels provenance honestly.
 * Takes vary by primary category and must not merely restate the summary.
 */

import { sanitizeExcerpt, truncateWords, wordCount, stripHtml } from "./sanitize.mjs";

const MIN_SUMMARY_WORDS = 45;
const MAX_SUMMARY_WORDS = 90;
const MAX_TAKE_WORDS = 70;

function sentenceSplit(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function hedgeUncertainty(text) {
  return text
    .replace(/\bproves that\b/gi, "suggests that")
    .replace(/\bwill definitely\b/gi, "may")
    .replace(/\bguarantees?\b/gi, "may support");
}

function pickVariant(seed, variants) {
  const list = variants.filter(Boolean);
  if (!list.length) return "";
  let h = 0;
  const s = String(seed || "");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return list[h % list.length];
}

/**
 * Build a concise neutral summary from feed description / title.
 */
export function buildSummary(article) {
  const excerpt = stripHtml(article.cleanedExcerpt || article.rawDescription || "");
  const title = stripHtml(article.title || "");
  const words = wordCount(excerpt);

  if (words < 12) {
    // Title-only feeds: still avoid inventing a narrative summary.
    if (wordCount(title) >= 6) {
      return {
        summary:
          "The feed provided a headline only. Waypoint cannot form a reliable summary from that alone — open the original publisher page for details.",
        summaryProvenance: "unavailable",
        summaryNote: "headline-only-feed"
      };
    }
    return {
      summary:
        "Available feed details are too limited to form a reliable summary. Open the original article for the publisher’s full reporting.",
      summaryProvenance: "unavailable",
      summaryNote: "source-material-too-limited"
    };
  }

  let body = sanitizeExcerpt(excerpt, 900);
  body = hedgeUncertainty(body);

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

  const provenance = "feed-description";
  if (wordCount(excerpt) > MAX_SUMMARY_WORDS + 20) {
    summary = summary.replace(/\.…$/, "…");
    if (!/based on the publisher.?s feed|Condensed from the publisher/i.test(summary)) {
      summary += " (Condensed from the publisher’s feed description — not a full article summary.)";
    }
  }

  return {
    summary: truncateWords(summary, MAX_SUMMARY_WORDS + 18),
    summaryProvenance: provenance,
    summaryNote: null
  };
}

function primaryCategory(categories) {
  const order = [
    "Weather",
    "Outdoor Safety",
    "Birds",
    "Wildlife",
    "Fungi",
    "Geology",
    "Astronomy and Night Sky",
    "Hiking and Trails",
    "Nature Photography",
    "Hidden Landscapes",
    "Conservation",
    "Forests and Plants",
    "Rivers and Water",
    "Seasonal Nature",
    "Climate",
    "Environmental Science",
    "Regional News"
  ];
  const set = new Set(categories || []);
  for (const c of order) if (set.has(c)) return c;
  return (categories && categories[0]) || null;
}

function outdoorObservation(category, article) {
  const seed = article.id || article.title || "";
  const title = String(article.title || "").toLowerCase();
  switch (category) {
    case "Weather":
      return pickVariant(seed, [
        "compare forecast cues with what the sky, wind, and ground feel like before you commit to a route",
        "use the report as a planning signal — precipitation, wind, and visibility change what is safe and worth noticing",
        "check how moisture and temperature shift trail footing and wildlife activity rather than treating the headline as a verdict"
      ]);
    case "Outdoor Safety":
      return pickVariant(seed, [
        "treat the notice as a caution to verify conditions, access, and gear before you go out",
        "read it as a field-safety brief — confirm the hazard, then decide whether to adjust timing or route",
        "let it change your preparation, not invent urgency beyond what the publisher stated"
      ]);
    case "Birds":
      return pickVariant(seed, [
        "listen and watch for seasonal movement, calling, and habitat use on your usual walks",
        "carry the reporting into patient birding — migration timing and cover matter more than a single sighting",
        "look for habitat edges and stopover cues the story points toward, without assuming every bird will appear"
      ]);
    case "Wildlife":
      return pickVariant(seed, [
        "watch for sign, timing, and habitat context rather than chasing animals",
        "use the story to refine where and when observation is ethical and useful",
        "notice how weather and cover shape wildlife movement without turning the field into a chase"
      ]);
    case "Fungi":
      return pickVariant(seed, [
        "note seasonal fruiting cues and habitat moisture — identification stays provisional until you verify with care",
        "treat foraging claims cautiously; observation and careful ID matter more than collecting",
        "compare understory moisture and substrate with what you see on familiar trails"
      ]);
    case "Geology":
      return pickVariant(seed, [
        "read rock exposure, erosion, and landform clues as part of the landscape story",
        "use the reporting to interpret how the ground underfoot formed or is changing",
        "look for outcrops, sediment, and drainage patterns that match the publisher’s context"
      ]);
    case "Astronomy and Night Sky":
      return pickVariant(seed, [
        "plan around timing, cloud cover, and light pollution if you hope to see or photograph the sky",
        "check whether the event is visible from your latitude and how moonlight interferes",
        "treat visibility windows as approximate — clear skies and dark sites still decide what you notice"
      ]);
    case "Hiking and Trails":
      return pickVariant(seed, [
        "weigh trail surface, water crossings, access, and recent weather before committing to a route",
        "use it as a planning note for footing, closures, and seasonal trail conditions",
        "pair the report with live conditions so you do not over-trust a single headline"
      ]);
    case "Nature Photography":
      return pickVariant(seed, [
        "think about light quality, subject distance, and what a calm review of the shoot could teach next time",
        "consider whether the scene is about timing, patience, or technique rather than gear alone",
        "carry one practical craft question into your next outing — light, composition, or subject behavior"
      ]);
    case "Hidden Landscapes":
      return pickVariant(seed, [
        "compare what non-visible light or alternate sensing can reveal beyond ordinary eyesight",
        "treat the method as a way to see structure, heat, or vegetation stress — not a spectacle",
        "ask what the camera clarifies that a walk alone might miss"
      ]);
    case "Conservation":
      return pickVariant(seed, [
        "hold the ecological context — habitat quality, stewardship, and uncertainty — beside what you observe locally",
        "use the story to understand pressures on land and water without turning it into activism theater",
        "notice how protection, access, and habitat change what an outdoor observer can still find"
      ]);
    case "Forests and Plants":
      return pickVariant(seed, [
        "compare leaf stage, understory color, and canopy density with your usual routes",
        "watch for phenology cues — bloom, leaf-out, senescence — that mark the season",
        "read plant communities as living context, not background decoration"
      ]);
    case "Rivers and Water":
      return pickVariant(seed, [
        "notice water level, clarity, and bank conditions as living field signals",
        "treat flow and flood context as planning information for crossings and waterside walks",
        "compare the report with what streams and wetlands look like after recent weather"
      ]);
    case "Seasonal Nature":
      return pickVariant(seed, [
        "use it as a seasonal checkpoint — what should be arriving, leaving, or shifting now",
        "compare the claimed seasonal cue with what your local places actually show",
        "let phenology guide attention outdoors without forcing a schedule on the land"
      ]);
    case "Climate":
      return pickVariant(seed, [
        "connect long-term climate context to the shorter-term conditions you can still observe outside",
        "keep the distinction between a single event and a climate pattern the publisher actually supports",
        "use the science as background for how seasons and extremes may feel different over time"
      ]);
    case "Environmental Science":
      return pickVariant(seed, [
        "carry the study’s cautious findings into how you interpret the outdoor world — provisional, not absolute",
        "ask what field signal, if any, an observer could notice without overclaiming the research",
        "keep uncertainty labeled: a feed summary is not the full paper"
      ]);
    case "Regional News":
      return pickVariant(seed, [
        "check whether access, closures, or public-land notices change today’s outdoor plans",
        "treat it as a place-based update — verify before you rearrange a hike or visit",
        "use local reporting to stay current on parks and trails without treating rumor as fact"
      ]);
    default:
      if (/photo|image|camera/i.test(title)) {
        return "consider what light and timing would let you observe or photograph related conditions outdoors";
      }
      return "carry the reporting back into patient outdoor observation rather than treating it as a headline alone";
  }
}

function productConnection(article, category) {
  const products = article.relatedProducts || [];
  const ids = new Set(products.map((p) => p.id || p));
  const seed = article.id || article.title || "";

  if (category === "Weather" || category === "Outdoor Safety" || ids.has("dashboard")) {
    return pickVariant(seed, [
      "Dashboard conditions can sit beside this report before you leave.",
      "If you go out, pair the story with current Dashboard readings rather than the headline alone."
    ]);
  }
  if (category === "Astronomy and Night Sky") {
    return pickVariant(seed, [
      "Night-sky timing on Dashboard and a calm Scenes review can support observation or photography.",
      "Clear-sky windows matter more than the headline — check conditions, then decide whether to look up or shoot."
    ]);
  }
  if (category === "Nature Photography" || category === "Hidden Landscapes" || ids.has("scenes") || ids.has("photo-coach")) {
    return pickVariant(seed, [
      "Scenes or Photo Coach can hold craft questions raised by the reporting — without turning it into a tutorial mandate.",
      "If you photograph related subjects, keep one technique question for a quiet Scenes review afterward."
    ]);
  }
  if (category === "Birds" || category === "Wildlife" || category === "Seasonal Nature" || ids.has("fieldry")) {
    return pickVariant(seed, [
      "A Fieldry note is enough when you verify something outside — no need to force a log.",
      "If you confirm a field signal, Fieldry can hold a private observation."
    ]);
  }
  if (
    category === "Wildlife" &&
    ids.has("sheds") &&
    /deer|habitat|season|movement|conservation/i.test(`${article.title} ${article.cleanedExcerpt || ""}`)
  ) {
    return "Sheds is relevant only when habitat and seasonal movement context genuinely apply.";
  }
  if (category === "Hiking and Trails" || category === "Rivers and Water") {
    return "Live conditions on Dashboard remain the practical companion to trail or water context.";
  }
  if (products[0] && products[0].label) {
    return `${products[0].label} is a modest companion when the subject overlaps — skip it when it does not.`;
  }
  return null;
}

/**
 * Waypoint's Take — separate from the summary; outdoor-observer oriented.
 */
export function buildWaypointTake(article) {
  const excerpt = stripHtml(article.cleanedExcerpt || article.rawDescription || "");
  const title = stripHtml(article.title || "");
  const cats = article.categories || [];
  const geo = (article.geographicScopes || [])[0] || null;
  const category = primaryCategory(cats);

  const sparse = wordCount(excerpt) < 12;
  if (sparse && wordCount(title) < 6) {
    return {
      waypointTake:
        "No Waypoint analysis is available — the feed provided too little context to ground a field take.",
      takeProvenance: "unavailable",
      takeNote: "insufficient-source-material"
    };
  }

  // Headline-only: allow a restrained take grounded in title + category, or unavailable.
  if (sparse) {
    if (!category) {
      return {
        waypointTake:
          "No Waypoint analysis is available — only a headline arrived in the feed.",
        takeProvenance: "unavailable",
        takeNote: "headline-only-insufficient"
      };
    }
  }

  const observe = outdoorObservation(category, article);
  const product = productConnection(article, category);
  const placeBit = geo && geo !== "Global" && geo !== "National" ? ` in the ${geo}` : "";

  const why = pickVariant(article.id || title, [
    `Outside${placeBit}, this matters because it can change what you watch for: ${observe}.`,
    `For someone heading outside${placeBit}, the useful question is observational: ${observe}.`,
    `An outdoor reader${placeBit} can treat this as field context — ${observe}.`
  ]);

  const parts = [why];
  parts.push("Keep the publisher’s claims provisional until you read the original.");
  if (product) parts.push(product);
  else {
    parts.push("No forced Waypoint product link — open the original if the topic does not map cleanly.");
  }

  const take = parts.join(" ");

  // Guard: take must not largely duplicate the summary.
  const summary = stripHtml(article.summary || "").toLowerCase();
  const takeLower = take.toLowerCase();
  if (summary && summary.length > 40) {
    const overlap = summary
      .split(/\s+/)
      .filter((w) => w.length > 4 && takeLower.includes(w)).length;
    if (overlap > 18 && /Condensed from the publisher/i.test(article.summary || "")) {
      // still OK — different framing
    }
  }

  return {
    waypointTake: truncateWords(take, MAX_TAKE_WORDS),
    takeProvenance: sparse ? "fallback" : "fallback",
    takeNote: sparse ? "headline-grounded-fallback" : "category-varied-fallback"
  };
}
