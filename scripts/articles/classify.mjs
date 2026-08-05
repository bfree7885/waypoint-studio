/**
 * Category and geographic classification from title, description, and feed defaults.
 * Geographic labels come from article content/place references — not publisher location alone.
 */

import { CATEGORIES, GEO_PRIORITY, REJECT_TOPIC_PATTERNS } from "./constants.mjs";

const CATEGORY_RULES = [
  { id: "Weather", patterns: [/\bweather\b/i, /\bforecast\b/i, /\bstorm\b/i, /\bnor['’]?easter\b/i, /\bheat\s+advisory\b/i, /\bwinter\s+storm\b/i, /\bblizzard\b/i, /\bflood\s+watch\b/i] },
  { id: "Climate", patterns: [/\bclimate\b/i, /\bglobal\s+warming\b/i, /\bcarbon\b/i, /\bemissions?\b/i, /\bgreenhouse\b/i] },
  { id: "Birds", patterns: [/\bbird\b/i, /\bbirds\b/i, /\bmigration\b/i, /\braptor\b/i, /\bowl\b/i, /\bwarbler\b/i, /\beagle\b/i, /\bhawk\b/i, /\baudubon\b/i, /\bebird\b/i] },
  { id: "Wildlife", patterns: [/\bwildlife\b/i, /\bdeer\b/i, /\bbear\b/i, /\bmammal\b/i, /\breptile\b/i, /\bhabitat\b/i, /\bendangered\b/i, /\bspecies\b/i] },
  { id: "Forests and Plants", patterns: [/\bforest\b/i, /\btree\b/i, /\bplant\b/i, /\bflora\b/i, /\bfoliage\b/i, /\bwildflower\b/i, /\binvasive\s+plant\b/i, /\boak\b/i, /\bhemlock\b/i] },
  { id: "Fungi", patterns: [/\bfungi\b/i, /\bmushroom\b/i, /\bmycelium\b/i, /\bforag(?:e|ing)\b/i] },
  { id: "Geology", patterns: [/\bgeology\b/i, /\bearthquake\b/i, /\bvolcano\b/i, /\brock\b/i, /\bfossil\b/i, /\bmineral\b/i, /\bglacier\b/i] },
  { id: "Rivers and Water", patterns: [/\briver\b/i, /\bstream\b/i, /\bwatershed\b/i, /\bwetland\b/i, /\bdrought\b/i, /\bflood\b/i, /\bhudson\s+river\b/i, /\bdelaware\b/i, /\blake\b/i] },
  { id: "Astronomy and Night Sky", patterns: [/\bastronomy\b/i, /\bnight\s+sky\b/i, /\bmeteor\b/i, /\baurora\b/i, /\bmoon\b/i, /\bsolar\b/i, /\bplanet\b/i, /\bcomet\b/i, /\bnasa\b/i, /\bspace\s+weather\b/i] },
  { id: "Hiking and Trails", patterns: [/\bhike\b/i, /\bhiking\b/i, /\btrail\b/i, /\bbackpack\b/i, /\bappalachian\b/i, /\bat\s+trail\b/i, /\bpath\b/i] },
  { id: "Outdoor Safety", patterns: [/\bsafety\b/i, /\bhypothermia\b/i, /\bheat\s+illness\b/i, /\btick\b/i, /\blyme\b/i, /\brescue\b/i, /\bavalanche\b/i, /\blightning\b/i, /\bwildfire\s+smoke\b/i] },
  { id: "Conservation", patterns: [/\bconservation\b/i, /\bpreserve\b/i, /\bprotected\s+land\b/i, /\brewild\b/i, /\bsteward\b/i, /\bland\s+trust\b/i] },
  { id: "Environmental Science", patterns: [/\benvironmental\s+science\b/i, /\becology\b/i, /\bbiodiversity\b/i, /\bresearch\b/i, /\bstudy\s+finds\b/i, /\bscientists?\b/i] },
  { id: "Nature Photography", patterns: [/\bphotograph\b/i, /\bphotography\b/i, /\bphoto\b/i, /\blens\b/i, /\bcamera\b/i, /\bwildlife\s+photo\b/i] },
  { id: "Hidden Landscapes", patterns: [/\binfrared\b/i, /\bultraviolet\b/i, /\bthermal\b/i, /\bmultispectral\b/i, /\bhidden\s+landscape\b/i, /\binvisible\s+light\b/i] },
  { id: "Seasonal Nature", patterns: [/\bseason\b/i, /\bspring\b/i, /\bautumn\b/i, /\bfall\s+foliage\b/i, /\bmigration\b/i, /\bfirst\s+frost\b/i, /\bleaf\s+peak\b/i, /\bwintering\b/i] },
  { id: "Regional News", patterns: [/\bpark\s+closure\b/i, /\btrail\s+closure\b/i, /\bpublic\s+lands?\b/i, /\bstate\s+park\b/i, /\bnational\s+park\b/i, /\bdec\b/i] }
];

const PLACE_RULES = [
  {
    scope: "Hudson Valley",
    patterns: [
      /\bhudson\s+valley\b/i,
      /\bpoughkeepsie\b/i,
      /\bkingston\b/i,
      /\bnew\s+paltz\b/i,
      /\bbeacon\b/i,
      /\bhudson\s+river\b/i,
      /\bdutchess\b/i,
      /\bulster\s+county\b/i,
      /\borange\s+county\b/i,
      /\bcolumbia\s+county\b/i,
      /\bcatskill\s+park\b/i // sometimes HV adjacent; still Catskills preferred below
    ]
  },
  {
    scope: "Catskills",
    patterns: [
      /\bcatskills?\b/i,
      /\bcatskill\s+mountains?\b/i,
      /\bslide\s+mountain\b/i,
      /\bkaaterskill\b/i,
      /\bhunter\s+mountain\b/i,
      /\bwindham\b/i,
      /\bphoenicia\b/i,
      /\bwoodstock\b/i
    ]
  },
  {
    scope: "Poconos",
    patterns: [
      /\bpoconos?\b/i,
      /\bpike\s+county\b/i,
      /\bmonroe\s+county\b/i,
      /\bdelaware\s+water\s+gap\b/i,
      /\bstroudsburg\b/i,
      /\bmilford\b/i,
      /\bhawley\b/i,
      /\bnortheastern\s+pennsylvania\b/i,
      /\bnepa\b/i
    ]
  },
  {
    scope: "Northern New Jersey",
    patterns: [
      /\bnorthern\s+new\s+jersey\b/i,
      /\bhighlands\b/i,
      /\bsussex\s+county\b/i,
      /\bmorris\s+county\b/i,
      /\bwarren\s+county\b/i,
      /\bpassaic\b/i,
      /\bdelaware\s+water\s+gap\b/i
    ]
  },
  {
    scope: "Adirondacks",
    patterns: [/\badirondacks?\b/i, /\blake\s+placid\b/i, /\bsaranac\b/i, /\bhigh\s+peaks\b/i]
  },
  {
    scope: "Tri-State",
    patterns: [
      /\btri[- ]state\b/i,
      /\bnew\s+york[-–]\s*new\s+jersey[-–]\s*pennsylvania\b/i,
      /\bny[-–]nj[-–]pa\b/i
    ]
  },
  {
    scope: "Northeast",
    patterns: [
      /\bnortheast\b/i,
      /\bnew\s+england\b/i,
      /\bmid[- ]atlantic\b/i,
      /\bappalachian\b/i,
      /\bnew\s+york\s+state\b/i,
      /\bpennsylvania\b/i,
      /\bnew\s+jersey\b/i
    ]
  },
  {
    scope: "National",
    patterns: [
      /\bnational\s+park\b/i,
      /\bunited\s+states\b/i,
      /\bacross\s+the\s+(?:u\.?s\.?|nation)\b/i,
      /\bfederal\b/i,
      /\bnps\b/i,
      /\busgs\b/i,
      /\bnoaa\b/i
    ]
  },
  {
    scope: "Global",
    patterns: [/\bworldwide\b/i, /\bglobal\b/i, /\binternational\b/i, /\bearth\b/i, /\bplanet\b/i]
  }
];

function blobFor(item, feed) {
  return [
    item.title,
    item.cleanedExcerpt || item.rawDescription || item.description,
    (item.categories || []).join(" "),
    (feed && feed.defaultCategories || []).join(" "),
    (feed && feed.notes) || ""
  ]
    .join(" ")
    .toLowerCase();
}

export function shouldRejectTopic(item, feed) {
  const text = blobFor(item, feed);
  return REJECT_TOPIC_PATTERNS.some((re) => re.test(text));
}

export function classifyCategories(item, feed) {
  const text = blobFor(item, feed);
  const found = [];
  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.some((re) => re.test(text))) found.push(rule.id);
  }
  for (const d of feed && feed.defaultCategories || []) {
    if (CATEGORIES.includes(d) && !found.includes(d)) found.push(d);
  }
  // Feed-provided category string soft mapping
  for (const raw of item.categories || []) {
    const lower = String(raw).toLowerCase();
    for (const c of CATEGORIES) {
      if (lower.includes(c.toLowerCase().split(" ")[0]) && !found.includes(c)) found.push(c);
    }
  }
  if (!found.length) found.push("Environmental Science");
  return found.slice(0, 4);
}

export function classifyGeography(item, feed) {
  const titleDesc = [
    item.title,
    item.cleanedExcerpt || item.rawDescription || item.description
  ]
    .join(" ")
    .toLowerCase();

  const placeReferences = [];
  const scopes = [];

  for (const rule of PLACE_RULES) {
    for (const re of rule.patterns) {
      const m = titleDesc.match(re);
      if (m) {
        placeReferences.push(m[0]);
        if (!scopes.includes(rule.scope)) scopes.push(rule.scope);
      }
    }
  }

  // Only use feed default geographic scope when article text lacks place signals.
  // Do not upgrade publisher locale into a false local label.
  if (!scopes.length && feed && feed.defaultGeographicScope) {
    const def = feed.defaultGeographicScope;
    if (GEO_PRIORITY.includes(def)) scopes.push(def);
  }

  if (!scopes.length) scopes.push("National");

  // Prefer highest-priority regional label as primary
  scopes.sort((a, b) => GEO_PRIORITY.indexOf(a) - GEO_PRIORITY.indexOf(b));

  return {
    geographicScopes: scopes.slice(0, 3),
    placeReferences: [...new Set(placeReferences)].slice(0, 8),
    primaryGeo: scopes[0]
  };
}

export function currentSeason(date = new Date()) {
  const m = date.getUTCMonth() + 1;
  if (m >= 3 && m <= 5) return "spring";
  if (m >= 6 && m <= 8) return "summer";
  if (m >= 9 && m <= 11) return "autumn";
  return "winter";
}

export function isSeasonallyRelevant(categories, season) {
  const set = new Set(categories || []);
  if (set.has("Seasonal Nature")) return true;
  if (season === "autumn" && (set.has("Forests and Plants") || set.has("Nature Photography"))) return true;
  if (season === "spring" && (set.has("Birds") || set.has("Wildlife") || set.has("Forests and Plants"))) return true;
  if (season === "winter" && (set.has("Astronomy and Night Sky") || set.has("Wildlife") || set.has("Outdoor Safety"))) return true;
  if (season === "summer" && (set.has("Hiking and Trails") || set.has("Rivers and Water") || set.has("Outdoor Safety"))) return true;
  return false;
}
