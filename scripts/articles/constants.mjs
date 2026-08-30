/** Shared constants for Waypoint Articles RSS pipeline. */

export const ENGINE_VERSION = "1.0.0";
export const USER_AGENT =
  "WaypointStudio-ArticlesFeed/1.0 (+https://waypointstudio.org/articles/; curated outdoor reading; respectful crawler)";

export const CATEGORIES = [
  "Weather",
  "Climate",
  "Wildlife",
  "Birds",
  "Forests and Plants",
  "Fungi",
  "Geology",
  "Rivers and Water",
  "Astronomy and Night Sky",
  "Hiking and Trails",
  "Outdoor Safety",
  "Conservation",
  "Environmental Science",
  "Nature Photography",
  "Hidden Landscapes",
  "Seasonal Nature",
  "Regional News"
];

export const GEOGRAPHIC_SCOPES = [
  "Hudson Valley",
  "Catskills",
  "Poconos",
  "Northern New Jersey",
  "Tri-State",
  "Adirondacks",
  "Northeast",
  "National",
  "Global"
];

/** Priority order for geographic relevance (lower index = higher priority). */
export const GEO_PRIORITY = [
  "Hudson Valley",
  "Catskills",
  "Poconos",
  "Northern New Jersey",
  "Tri-State",
  "Adirondacks",
  "Northeast",
  "National",
  "Global"
];

export const SUMMARY_PROVENANCE = [
  "ai-generated",
  "feed-description",
  "editor-written",
  "unavailable"
];

export const TAKE_PROVENANCE = ["generated", "editor-written", "fallback", "unavailable"];

export const ARTICLE_STATUS = ["active", "duplicate", "rejected", "stale"];

/** Active Studio / Publishing companions only — do not promote paused/retired apps. */
export const RELATED_PRODUCTS = [
  { id: "dashboard", label: "Dashboard", href: "/apps/dashboard/" },
  { id: "sheds", label: "Shed Hunting", href: "https://shedhunting.org/" },
  { id: "articles", label: "Articles", href: "/articles/" }
];

/** Paused / retired / unpublished — never suggest via related-product chips. */
export const RELATED_PRODUCTS_BLOCKED = [
  "fieldry",
  "openroad-pa",
  "openroad",
  "savant-sommelier",
  "savant",
  "signalterrain",
  "cyber",
  "global-signals",
  "foragecast",
  "scenes",
  "photo-coach",
  "hidden-landscapes"
];

export const REJECT_TOPIC_PATTERNS = [
  /\bcelebrity\b/i,
  /\breality\s+tv\b/i,
  /\bstock\s+market\b/i,
  /\bcrypto\b/i,
  /\belection\s+poll\b/i,
  /\bvotes\s+of\s+congress\b/i,
  /\bbest\s+deals?\b/i,
  /\bcoupon\b/i,
  /\baffiliate\b/i,
  /\bgadget\s+review\b/i,
  /\bsmartphone\b/i,
  /\bvotes\s+for\s+[A-Z][a-z]+\b/,
  /\bwind\s+tunnel\b/i,
  /\btest\s+kitchen\b/i,
  /\bseafood\s+recipes?\b/i,
  /\btelevision\s+programs?\b/i,
  /\bfws\s+scholar\b/i,
  /\bhunting\s+and\s+fishing\s+packages\b/i,
  /\bphoto\s+contest\b/i,
  /\bobituar/i,
  /\bop[- ]?ed\b/i,
  /\bselection\s+of\s+poems\b/i,
  /\btech\s+assistance\s+workshop\b/i,
  /\bolder\s+adults\b/i,
  /\bprison\b/i,
  /\bolympic\s+prospects\b/i
];

export const TRUST_TIER_WEIGHT = {
  official: 1.0,
  academic: 0.95,
  nonprofit: 0.9,
  "established-newsroom": 0.82,
  photography: 0.8,
  community: 0.55
};
