/**
 * Flora dashboard intelligence — phenology and bloom from OIP; observation over collection.
 */
(function (global) {
  "use strict";

  var FEED_REGISTRY = {
    bloomCalendar: { slot: "bloom-calendar", provider: "phenology-network", status: "partial" },
    wildflowerActivity: { slot: "wildflower-activity", provider: "phenology-network", status: "partial" },
    treePhenology: { slot: "tree-phenology", provider: "phenology-network", status: "partial" },
    berrySeason: { slot: "berry-season", provider: "phenology-network", status: "partial" },
    leafOut: { slot: "leaf-out", provider: "phenology-network", status: "partial" },
    fallColor: { slot: "fall-color", provider: "foliage-forecast", status: "pending" }
  };

  var OBSERVE = "Photograph and note stage — do not pick blooms on public land.";

  function card(id, icon, label, state, headline, detail, observeNote, source, feedKey, items) {
    var feed = FEED_REGISTRY[feedKey] || null;
    return {
      id: id,
      icon: icon,
      label: label,
      state: state || "empty",
      headline: headline,
      detail: detail || "",
      observeNote: observeNote || OBSERVE,
      items: items || [],
      source: source || "educational",
      feedSlot: feed ? feed.slot : null,
      feedProvider: feed ? feed.provider : null,
      feedStatus: feed ? feed.status : null
    };
  }

  function allSpecies(platform) {
    var out = [];
    var sp = platform && platform.species;
    var watch = platform && platform.phenology && platform.phenology.watch;
    function push(list) {
      if (!list || !list.length) return;
      list.forEach(function (e) { out.push(e); });
    }
    if (sp) {
      push(sp.active);
      push(sp.ending);
      push(sp.comingSoon);
    }
    if (watch) {
      push(watch.activeNow);
      push(watch.ending);
      push(watch.comingSoon);
    }
    return out;
  }

  function matchSpecies(platform, pattern) {
    var re = pattern instanceof RegExp ? pattern : new RegExp(pattern, "i");
    return allSpecies(platform).filter(function (e) {
      var hay = ((e.name || "") + " " + (e.note || "") + " " + (e.status || "")).toLowerCase();
      return re.test(hay);
    });
  }

  function formatItems(list, limit) {
    return (list || []).slice(0, limit || 4).map(function (e) {
      return {
        name: e.name || "—",
        status: e.status || "",
        note: e.note || ""
      };
    });
  }

  function seasonFromPlatform(platform) {
    var label = (platform && platform.calendar && platform.calendar.season) ||
      (platform && platform.phenology && platform.phenology.stage) || "";
    var lower = String(label).toLowerCase();
    if (/winter/.test(lower)) return "winter";
    if (/spring/.test(lower)) return "spring";
    if (/summer/.test(lower)) return "summer";
    if (/fall|autumn/.test(lower)) return "fall";
    var m = new Date().getMonth() + 1;
    if (m >= 3 && m <= 5) return "spring";
    if (m >= 6 && m <= 8) return "summer";
    if (m >= 9 && m <= 11) return "fall";
    return "winter";
  }

  function buildBloomCalendar(platform) {
    var blooms = matchSpecies(platform, /bloom|flower|laurel|azalea|rhododendron|trillium|ephemeral/i);
    if (blooms.length) {
      return card(
        "bloom-calendar", "🌸", "Bloom Calendar",
        "ready",
        blooms.length + " bloom signal(s) on regional watch",
        (platform.phenology && platform.phenology.summary) || "Phenology watch for your region this week.",
        "Compare bud stage on north vs. south slopes — timing varies by elevation, not calendar alone.",
        "editorial", "bloomCalendar", formatItems(blooms, 5)
      );
    }
    return card(
      "bloom-calendar", "🌸", "Bloom Calendar",
      "empty",
      "No bloom signals on watch this week",
      "Regional phenology will list opening and fading blooms when seasonal watch updates.",
      OBSERVE,
      "educational", "bloomCalendar", []
    );
  }

  function buildWildflowerActivity(platform, season) {
    var flowers = matchSpecies(platform, /wildflower|ephemeral|trillium|violet|anemone|trout lily|spring beauty/i);
    if (flowers.length) {
      return card(
        "wildflower-activity", "🌼", "Wildflower Activity",
        "ready",
        "Forest floor and meadow color active",
        flowers.map(function (f) { return f.name + (f.note ? " — " + f.note : ""); }).slice(0, 2).join(". ") + ".",
        "Observe from trail — never collect wild plants from protected populations.",
        "editorial", "wildflowerActivity", formatItems(flowers, 4)
      );
    }
    if (season === "spring") {
      return card(
        "wildflower-activity", "🌼", "Wildflower Activity",
        "empty",
        "Ephemeral season may be fading on warm slopes",
        "Cool ravines may still hold late trillium and trout lily — look for habitat, not hotspots.",
        OBSERVE,
        "expected", "wildflowerActivity", []
      );
    }
    return card(
      "wildflower-activity", "🌼", "Wildflower Activity",
      "empty",
      "Wildflower window depends on elevation",
      "Spring ephemerals finish quickly as canopy closes — summer meadows follow on different timing.",
      OBSERVE,
      "educational", "wildflowerActivity", []
    );
  }

  function buildTreePhenology(platform, season) {
    var trees = matchSpecies(platform, /maple|oak|birch|beech|hemlock|bud|canopy|mast|leaf/i);
    if (trees.length) {
      return card(
        "tree-phenology", "🌳", "Tree Phenology",
        "ready",
        "Canopy and mast signals on watch",
        trees[0].note || "Tree timing varies by species and aspect.",
        "Note bud break or leaf senescence on the same tree weekly — personal phenology, not a forecast.",
        "editorial", "treePhenology", formatItems(trees, 4)
      );
    }
    if (season === "spring") {
      return card(
        "tree-phenology", "🌳", "Tree Phenology",
        "empty",
        "Leaf-out progressing by elevation",
        "South-facing oak and maple ridges green first; north slopes and ravines lag by days or weeks.",
        "Photograph one branch at eye level — track change, don't need a map pin.",
        "expected", "treePhenology", []
      );
    }
    if (season === "fall") {
      return card(
        "tree-phenology", "🌳", "Tree Phenology",
        "empty",
        "Senescence and mast timing underway",
        "Sugar maple and birch often color early in cool ravines; oak holds green longer on dry ridges.",
        OBSERVE,
        "expected", "treePhenology", []
      );
    }
    return card(
      "tree-phenology", "🌳", "Tree Phenology",
      "empty",
      "Canopy phenology quiet this week",
      "Bud break, full leaf, and mast drop follow species-specific calendars.",
      OBSERVE,
      "educational", "treePhenology", []
    );
  }

  function buildBerrySeason(platform, season) {
    var berries = matchSpecies(platform, /berry|blueberry|huckleberry|raspberry|blackberry|serviceberry/i);
    if (berries.length) {
      return card(
        "berry-season", "🫐", "Berry Season",
        "ready",
        "Berry phenology on regional watch",
        berries.map(function (b) {
          return b.name + (b.status ? " (" + b.status + ")" : "");
        }).slice(0, 3).join(" · "),
        "Ripening follows elevation and sun — observe fruit set; harvest ethics and permits vary by land.",
        "editorial", "berrySeason", formatItems(berries, 4)
      );
    }
    if (season === "summer" || season === "fall") {
      return card(
        "berry-season", "🫐", "Berry Season",
        "empty",
        "Berry window may open on sunny edges",
        "Highbush blueberry and blackberry often ripen mid-summer into fall — timing shifts yearly.",
        "Taste only what you can identify with confidence; leave fruit for wildlife.",
        "expected", "berrySeason", []
      );
    }
    return card(
      "berry-season", "🫐", "Berry Season",
      "empty",
      "Berry season not active in regional watch",
      "Green fruit set and flower fade precede ripening by weeks.",
      OBSERVE,
      "educational", "berrySeason", []
    );
  }

  function buildLeafOut(platform, season) {
    var ending = matchSpecies(platform, /ephemeral|fading|canopy|leaf-out|leaf out|closure/i);
    if (season === "spring" && ending.length) {
      return card(
        "leaf-out", "🍃", "Leaf-out",
        "ready",
        "Canopy closure advancing",
        ending[0].note || "Ephemerals fade as overstory leaves expand.",
        "Compare open canopy on a south ridge vs. shaded ravine the same day.",
        "editorial", "leafOut", formatItems(ending, 3)
      );
    }
    if (season === "spring") {
      return card(
        "leaf-out", "🍃", "Leaf-out",
        "ready",
        "Spring leaf-out in progress",
        "Overstory green-up reduces forest floor light — ephemerals finish quickly after full leaf.",
        "Note date when your reference tree reaches half leaf — repeat annually for personal phenology.",
        "expected", "leafOut", []
      );
    }
    if (season === "summer") {
      return card(
        "leaf-out", "🍃", "Leaf-out",
        "ready",
        "Full canopy season",
        "Forest floor is shaded; understory shifts to ferns and late-summer flora.",
        OBSERVE,
        "educational", "leafOut", []
      );
    }
    return card(
      "leaf-out", "🍃", "Leaf-out",
      "empty",
      "Leaf-out tracking resumes in spring",
      "Bud break timing is one of the most visible regional phenology signals.",
      OBSERVE,
      "educational", "leafOut", []
    );
  }

  function buildFallColor(season) {
    if (season === "fall") {
      return card(
        "fall-color", "🍂", "Fall Color",
        "empty",
        "Foliage forecast preview",
        "Peak color moves down elevation bands through October — live foliage API not connected yet.",
        "Scout slopes and valleys for early maples — no peak-date guarantees.",
        "future", "fallColor", []
      );
    }
    return card(
      "fall-color", "🍂", "Fall Color",
      "pending",
      "Fall color feed pending",
      "Elevation-band foliage forecast will appear when foliage provider connects.",
      "Autumn photography rewards patience — watch sugar maple and birch in cool ravines first.",
      "future", "fallColor", []
    );
  }

  function analyze(platform) {
    if (!platform) return null;
    var season = seasonFromPlatform(platform);
    var cards = {
      bloomCalendar: buildBloomCalendar(platform),
      wildflowerActivity: buildWildflowerActivity(platform, season),
      treePhenology: buildTreePhenology(platform, season),
      berrySeason: buildBerrySeason(platform, season),
      leafOut: buildLeafOut(platform, season),
      fallColor: buildFallColor(season)
    };
    var list = [
      cards.bloomCalendar,
      cards.wildflowerActivity,
      cards.treePhenology,
      cards.berrySeason,
      cards.leafOut,
      cards.fallColor
    ];
    return {
      cards: cards,
      cardList: list,
      season: season,
      phenologyTitle: (platform.phenology && platform.phenology.summary) ||
        (platform.phenology && platform.phenology.stage) || null,
      readyCount: list.filter(function (c) { return c.state === "ready"; }).length,
      feedRegistry: FEED_REGISTRY,
      regionLabel: (platform.region && platform.region.label) ||
        (platform.geography && platform.geography.ecoregion) || null
    };
  }

  function summary(intel) {
    if (!intel) return null;
    if (intel.phenologyTitle) return intel.phenologyTitle;
    var b = intel.cards.bloomCalendar;
    return b && b.state === "ready" ? b.headline : "Flora phenology";
  }

  global.WDS = global.WDS || {};
  global.WDS.floraDashboardIntel = { analyze: analyze, summary: summary, FEED_REGISTRY: FEED_REGISTRY };
})(window);
