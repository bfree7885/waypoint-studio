/**
 * Category and geographic classification from title, description, and feed defaults.
 * Geographic labels come from article content/place references — not publisher location alone.
 */

import { CATEGORIES, GEO_PRIORITY, REJECT_TOPIC_PATTERNS } from "./constants.mjs";

const CATEGORY_RULES = [
  { id: "Weather", patterns: [/\bweather\b/i, /\bforecast\b/i, /\bstorm\b/i, /\bnor['’]?easter\b/i, /\bheat\s+advisory\b/i, /\bwinter\s+storm\b/i, /\bblizzard\b/i, /\bflood\s+watch\b/i, /\bskywarn\b/i, /\bnwr\s+transmitter\b/i] },
  { id: "Climate", patterns: [/\bclimate\b/i, /\bglobal\s+warming\b/i, /\bcarbon\s+dioxide\b/i, /\bgreenhouse\s+gas/i, /\bclimate\s+change\b/i] },
  { id: "Birds", patterns: [/\bbird\b/i, /\bbirds\b/i, /\bmigration\b/i, /\braptor\b/i, /\bowl\b/i, /\bwarbler\b/i, /\beagle\b/i, /\bhawk\b/i, /\baudubon\b/i, /\bebird\b/i] },
  { id: "Wildlife", patterns: [/\bwildlife\b/i, /\bdeer\b/i, /\bbear\b/i, /\bmammal\b/i, /\breptile\b/i, /\bhabitat\b/i, /\bendangered\b/i, /\brefuge\b/i] },
  { id: "Forests and Plants", patterns: [/\bforest\b/i, /\btree\b/i, /\bplant\b/i, /\bflora\b/i, /\bfoliage\b/i, /\bwildflower\b/i, /\binvasive\s+plant\b/i, /\boak\b/i, /\bhemlock\b/i] },
  { id: "Fungi", patterns: [/\bfungi\b/i, /\bmushroom\b/i, /\bmycelium\b/i, /\bforag(?:e|ing)\b/i] },
  { id: "Geology", patterns: [/\bgeology\b/i, /\bearthquake\b/i, /\bvolcano\b/i, /\bfossil\b/i, /\bmineral\b/i, /\bglacier\b/i, /\brock\s+formation\b/i] },
  { id: "Rivers and Water", patterns: [/\briver\b/i, /\bstream\b/i, /\bwatershed\b/i, /\bwetland\b/i, /\bdrought\b/i, /\bflood\b/i, /\bhudson\s+river\b/i, /\bdelaware\s+river\b/i, /\blake\s+level\b/i, /\bwater\s+quality\b/i] },
  { id: "Astronomy and Night Sky", patterns: [/\bastronomy\b/i, /\bnight\s+sky\b/i, /\bmeteor\b/i, /\baurora\b/i, /\bmoon\b/i, /\bsolar\s+storm\b/i, /\bsolar\s+flare\b/i, /\bcomet\b/i, /\bspace\s+weather\b/i, /\bconstellation\b/i, /\bstargaz/i] },
  { id: "Hiking and Trails", patterns: [/\bhike\b/i, /\bhiking\b/i, /\btrail\b/i, /\bbackpack\b/i, /\bappalachian\s+trail\b/i, /\bcamping\b/i] },
  { id: "Outdoor Safety", patterns: [/\bhypothermia\b/i, /\bheat\s+illness\b/i, /\btick\b/i, /\blyme\b/i, /\brescue\b/i, /\bavalanche\b/i, /\blightning\b/i, /\bwildfire\s+smoke\b/i, /\boutdoor\s+safety\b/i, /\bspotter\b/i] },
  { id: "Conservation", patterns: [/\bconservation\b/i, /\bpreserve\b/i, /\bprotected\s+land\b/i, /\brewild\b/i, /\bsteward\b/i, /\bland\s+trust\b/i, /\bnational\s+wildlife\s+refuge\b/i] },
  { id: "Environmental Science", patterns: [/\benvironmental\s+science\b/i, /\becology\b/i, /\bbiodiversity\b/i, /\bstudy\s+finds\b/i, /\bresearchers?\s+found\b/i] },
  { id: "Nature Photography", patterns: [/\bphotograph\b/i, /\bphotography\b/i, /\bwildlife\s+photo\b/i, /\bnature\s+photo\b/i, /\blens\b/i] },
  { id: "Hidden Landscapes", patterns: [/\binfrared\b/i, /\bultraviolet\b/i, /\bthermal\b/i, /\bmultispectral\b/i, /\bhidden\s+landscape\b/i, /\binvisible\s+light\b/i] },
  { id: "Seasonal Nature", patterns: [/\bseasonal\b/i, /\bfall\s+foliage\b/i, /\bmigration\b/i, /\bfirst\s+frost\b/i, /\bleaf\s+peak\b/i, /\bwintering\b/i, /\bphenolog/i] },
  { id: "Regional News", patterns: [/\bpark\s+closure\b/i, /\btrail\s+closure\b/i, /\bpublic\s+lands?\b/i, /\bstate\s+park\b/i, /\bnational\s+park\b/i] }
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
      /\bhighlands\s+current\b/i,
      /\bphilipstown\b/i,
      /\bcold\s+spring\b/i,
      /\bputnam\s+county\b/i
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
      /\bnew\s+jersey\b/i,
      /\bcapital\s+region\b/i,
      /\bnew\s+scotland\b/i,
      /\balbany\b/i,
      /\bberkshires\b/i
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

function articleTextBlob(item) {
  return [
    item.title,
    item.cleanedExcerpt || item.rawDescription || item.description,
    (item.categories || []).join(" ")
  ]
    .join(" ")
    .toLowerCase();
}

function blobFor(item, feed) {
  // Topic rejection may include feed notes; classification should prefer article text.
  return [
    articleTextBlob(item),
    (feed && feed.notes) || ""
  ]
    .join(" ")
    .toLowerCase();
}

export function shouldRejectTopic(item, feed) {
  // Reject from article text only — never from feed notes (notes may mention rejection keywords).
  const text = articleTextBlob(item);
  return REJECT_TOPIC_PATTERNS.some((re) => re.test(text));
}

export function classifyCategories(item, feed) {
  const text = articleTextBlob(item);
  const found = [];
  for (const rule of CATEGORY_RULES) {
    if (rule.patterns.some((re) => re.test(text))) found.push(rule.id);
  }
  // Soft-map publisher category labels from the item itself.
  for (const raw of item.categories || []) {
    const lower = String(raw).toLowerCase();
    for (const c of CATEGORIES) {
      const token = c.toLowerCase().split(" ")[0];
      if (token.length > 3 && lower.includes(token) && !found.includes(c)) found.push(c);
    }
  }
  // Feed defaults only when the article text did not produce a category.
  if (!found.length) {
    for (const d of (feed && feed.defaultCategories) || []) {
      if (CATEGORIES.includes(d) && !found.includes(d)) found.push(d);
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

  // Soft feed default only when article text lacks place signals.
  // Narrow local defaults (HV/Catskills/Poconos/N.NJ) require an explicit place reference —
  // otherwise demote to Northeast/National/Global so publisher office location cannot fake locality.
  if (!scopes.length && feed && feed.defaultGeographicScope) {
    const def = feed.defaultGeographicScope;
    const narrowLocal = new Set([
      "Hudson Valley",
      "Catskills",
      "Poconos",
      "Northern New Jersey",
      "Tri-State",
      "Adirondacks"
    ]);
    if (narrowLocal.has(def)) {
      scopes.push("Northeast");
    } else if (GEO_PRIORITY.includes(def)) {
      scopes.push(def);
    }
  }

  if (!scopes.length) scopes.push("National");

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
