/**
 * Steepleaf — brewing guides & learning topics.
 * Educational defaults with uncertainty — not personal tasting fabrications.
 */
(function (global) {
  "use strict";

  var BREW_GUIDES = {
    green: {
      label: "Green",
      tempC: 80,
      tempRange: "75–85°C",
      steepSeconds: 90,
      leafHint: "3 g / 150 ml (adjust to taste)",
      infusions: "1–3",
      flavors: "Fresh, vegetal, sweet, marine",
      why: "Greens are delicate; cooler water protects sweetness and avoids bitterness."
    },
    white: {
      label: "White",
      tempC: 85,
      tempRange: "80–90°C",
      steepSeconds: 120,
      leafHint: "3–4 g / 150 ml",
      infusions: "2–4",
      flavors: "Soft floral, honey, hay",
      why: "Gentle heat draws fragrance without cooking the young leaves."
    },
    yellow: {
      label: "Yellow",
      tempC: 85,
      tempRange: "80–90°C",
      steepSeconds: 90,
      leafHint: "3 g / 150 ml",
      infusions: "2–4",
      flavors: "Mellow, sweet, soft vegetal",
      why: "Similar care to green tea, with a slightly warmer window for rounded sweetness."
    },
    oolong: {
      label: "Oolong",
      tempC: 95,
      tempRange: "90–100°C",
      steepSeconds: 45,
      leafHint: "5–7 g / 100–120 ml (gongfu) or lighter for mug",
      infusions: "5–10+",
      flavors: "Floral, creamy, roasted, orchard fruit — style-dependent",
      why: "Many oolongs open across short infusions; a shorter first steep keeps later cups lively."
    },
    black: {
      label: "Black / red",
      tempC: 95,
      tempRange: "90–100°C",
      steepSeconds: 180,
      leafHint: "3 g / 200 ml (mug) or denser for gongfu",
      infusions: "1–4",
      flavors: "Malt, cocoa, dried fruit, spice",
      why: "Fully oxidized leaves tolerate hotter water and longer steeps than greens."
    },
    "sheng-puer": {
      label: "Sheng puer",
      tempC: 95,
      tempRange: "90–100°C",
      steepSeconds: 20,
      leafHint: "6–8 g / 100–120 ml",
      infusions: "8–15+",
      flavors: "Floral, bitter-sweet, orchard, aged depth over years",
      why: "Flash rinses and short early steeps help map bitterness vs sweetness."
    },
    "shou-puer": {
      label: "Shou puer",
      tempC: 100,
      tempRange: "95–100°C",
      steepSeconds: 30,
      leafHint: "6–8 g / 100–120 ml",
      infusions: "8–15+",
      flavors: "Earth, cocoa, wood, sweet depth",
      why: "Ripe puer often likes near-boiling water to open thickness and sweetness."
    },
    heicha: {
      label: "Dark tea",
      tempC: 100,
      tempRange: "95–100°C",
      steepSeconds: 30,
      leafHint: "5–7 g / 100–120 ml",
      infusions: "6–12+",
      flavors: "Woody, dried fruit, mineral",
      why: "Post-fermented leaves generally welcome hot water and many infusions."
    },
    matcha: {
      label: "Matcha",
      tempC: 75,
      tempRange: "70–80°C",
      steepSeconds: 0,
      leafHint: "1–2 g whisked in ~70 ml",
      infusions: "1 (whisked)",
      flavors: "Umami, sweet, grassy",
      why: "Cooler water keeps matcha bright and avoids harsh bitterness."
    },
    herbal: {
      label: "Herbal / tisane",
      tempC: 100,
      tempRange: "95–100°C",
      steepSeconds: 300,
      leafHint: "Per herb; often 1 tsp / cup",
      infusions: "1–2",
      flavors: "Herb-dependent",
      why: "Most tisanes are not Camellia; boiling water usually extracts best."
    },
    other: {
      label: "Other",
      tempC: 90,
      tempRange: "Adjust to leaf",
      steepSeconds: 120,
      leafHint: "Start light; note what you did",
      infusions: "Variable",
      flavors: "Your notes decide",
      why: "Without a clear category, short experiments beat rigid rules."
    }
  };

  var LEARNING = [
    {
      id: "categories",
      title: "Tea categories",
      summary: "A calm map of green, white, oolong, black, puer, and beyond.",
      body: [
        "Most true tea comes from Camellia sinensis. Style differences come from processing, not different plants (except herbals).",
        "Green teas are heated early to stop oxidation. Blacks are fully oxidized. Oolongs sit in between.",
        "Puer and other dark teas involve aging and/or microbial post-fermentation — a different path from oxidation alone.",
        "Use categories as a starting vocabulary, not a ranking."
      ]
    },
    {
      id: "processing",
      title: "Processing methods",
      summary: "Withering, fixing, rolling, oxidizing, drying — what happens to the leaf.",
      body: [
        "Withering softens leaves and begins aroma development.",
        "Fixing (kill-green) stops enzymatic oxidation for greens and some oolongs.",
        "Rolling shapes leaves and moves juices to the surface.",
        "Drying sets the tea for storage. Roast may be added for some oolongs and darker styles."
      ]
    },
    {
      id: "oxidation",
      title: "Oxidation",
      summary: "How leaf enzymes change color and flavor when exposed to air.",
      body: [
        "Oxidation is enzymatic — like a cut apple browning — not the same as microbial fermentation.",
        "Light oxidation tends toward floral and creamy notes; heavier toward malt, cocoa, and dried fruit.",
        "Oolong makers carefully interrupt oxidation to hit a flavor target."
      ]
    },
    {
      id: "fermentation",
      title: "Fermentation & aging",
      summary: "Microbial work and time — especially in puer and heicha.",
      body: [
        "Sheng puer can age slowly over years; shou puer is pile-fermented for ripe character sooner.",
        "Storage humidity and air exchange matter — sealed dampness risks mold; bone-dry can stall aging.",
        "Taste evolution is personal: keep notes rather than chasing a ‘correct’ aged profile."
      ]
    },
    {
      id: "water",
      title: "Water quality",
      summary: "Soft vs hard water, freshness, and why your kettle matters.",
      body: [
        "Very hard water can mute fragrance; very soft or distilled can taste thin or sharp.",
        "Freshly drawn water usually tastes brighter than water that has sat boiled repeatedly.",
        "If a tea suddenly tastes flat, try a different water before blaming the leaf."
      ]
    },
    {
      id: "variables",
      title: "Brewing variables",
      summary: "Temperature, time, leaf amount, and vessel — the levers you control.",
      body: [
        "Hotter and longer usually extract more bitterness and body.",
        "More leaf with shorter time (gongfu) reveals stages across infusions.",
        "Change one variable at a time when comparing sessions."
      ]
    },
    {
      id: "storage",
      title: "Storage",
      summary: "Keep leaves away from heat, light, moisture, and strong odors.",
      body: [
        "Airtight, opaque containers help most greens and lightly oxidized teas.",
        "Strong smells (spice, coffee) migrate into tea easily.",
        "Record storage location in your collection so you can find what you own."
      ]
    },
    {
      id: "terms",
      title: "Tea terminology",
      summary: "Useful words without pretension.",
      body: [
        "Infusion / steep — one contact of leaf and water.",
        "Gongfu — denser leaf, small vessel, many short steeps.",
        "Western style — fewer leaves, larger vessel, longer steeps.",
        "Astringency — drying mouthfeel; bitterness — taste. They are not the same.",
        "Umami — savory depth, common in shaded greens and matcha."
      ]
    }
  ];

  var FLAVOR_SUGGESTIONS = [
    "floral",
    "vegetal",
    "sweet",
    "honey",
    "mineral",
    "roasted",
    "fruity",
    "citrus",
    "cream",
    "nutty",
    "earthy",
    "cocoa",
    "umami",
    "bitter",
    "astringent",
    "clean finish"
  ];

  var MOODS = ["calm", "focused", "curious", "tired", "social", "reflective"];

  function guideForType(typeId) {
    return BREW_GUIDES[typeId] || BREW_GUIDES.other;
  }

  function typeLabel(typeId) {
    var g = BREW_GUIDES[typeId];
    if (g) return g.label;
    var types = (global.WaypointSteepleaf && global.WaypointSteepleaf.TEA_TYPES) || [];
    for (var i = 0; i < types.length; i++) {
      if (types[i].id === typeId) return types[i].label;
    }
    return typeId || "Tea";
  }

  global.SteepleafGuides = {
    BREW_GUIDES: BREW_GUIDES,
    LEARNING: LEARNING,
    FLAVOR_SUGGESTIONS: FLAVOR_SUGGESTIONS,
    MOODS: MOODS,
    guideForType: guideForType,
    typeLabel: typeLabel
  };
})(typeof window !== "undefined" ? window : globalThis);
