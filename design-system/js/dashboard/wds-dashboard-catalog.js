/**
 * Waypoint Dashboard — full widget catalog (Sprint 1)
 */
(function (global) {
  "use strict";

  var register = function (def) {
    if (global.WDS && global.WDS.dashboardWidgets) {
      global.WDS.dashboardWidgets.register(def);
    }
  };

  function D() {
    return global.WDS && global.WDS.dashboardWidgetData;
  }

  function reg(o) {
    register(Object.assign({
      defaultCollapsed: false,
      size: "md",
      tier: "standard",
      defaultVisible: false
    }, o));
  }

  function live(kind, o) {
    reg(Object.assign({
      getData: function () {
        return D().liveMount(kind, o.liveSummary);
      }
    }, o));
  }

  function preview(o) {
    reg(Object.assign({
      getData: function (ctx) {
        if (o.resolve) {
          var r = o.resolve(ctx);
          if (r) return r;
        }
        return D().previewData(o.summary, o.placeholder, o.items);
      }
    }, o));
  }

  function p(ctx) {
    return D().platform(ctx);
  }

  /* ——— Outdoor Weather anchor ——— */
  reg({
    id: "outdoor-weather",
    title: "Outdoor Weather",
    icon: "◎",
    category: "conditions",
    defaultOrder: 1,
    defaultVisible: true,
    tier: "anchor",
    size: "anchor",
    defaultCollapsed: false,
    futureProvider: "open-meteo",
    getData: function () {
      return D().liveMount("outdoor-weather", "Loading outdoor conditions…");
    }
  });

  /* ——— Today's highlights (vital) ——— */
  reg({
    id: "todays-outdoor-highlights",
    title: "Today's Outdoor Highlights",
    icon: "★",
    category: "conditions",
    defaultOrder: 5,
    defaultVisible: true,
    tier: "vital",
    size: "wide",
    getData: function (ctx) {
      var H = global.WDS && global.WDS.dashboardHighlights;
      return H && H.generate ? H.generate(ctx) : { status: "loading", summary: "Building highlights…" };
    }
  });

  /* ——— Conditions ——— */
  live("current", {
    id: "current-weather",
    title: "Current Weather",
    icon: "Wx",
    category: "conditions",
    defaultOrder: 10,
    defaultVisible: false,
    size: "lg",
    futureProvider: "open-meteo",
    liveSummary: "Loading conditions…"
  });

  live("hourly", {
    id: "hourly-forecast",
    title: "Hourly Forecast",
    icon: "Hr",
    category: "conditions",
    defaultOrder: 20,
    defaultVisible: false,
    size: "wide",
    futureProvider: "open-meteo",
    liveSummary: "Next 24 hours"
  });

  live("daily", {
    id: "weekly-forecast",
    title: "Weekly Forecast",
    icon: "7d",
    category: "conditions",
    defaultOrder: 30,
    defaultVisible: false,
    size: "wide",
    futureProvider: "open-meteo",
    liveSummary: "Seven-day outlook"
  });

  preview({
    id: "air-quality",
    title: "Air Quality",
    icon: "AQ",
    category: "conditions",
    defaultOrder: 40,
    futureProvider: "air-quality-api",
    summary: "AQI not connected",
    placeholder: "Air quality index and smoke alerts will appear when a provider is connected."
  });

  live("wind", {
    id: "wind",
    title: "Wind",
    icon: "Wd",
    category: "conditions",
    defaultOrder: 50,
    defaultVisible: false,
    size: "sm",
    futureProvider: "open-meteo",
    liveSummary: "Wind and gusts"
  });

  live("uv", {
    id: "uv-index",
    title: "UV Index",
    icon: "UV",
    category: "conditions",
    defaultOrder: 60,
    defaultVisible: false,
    size: "sm",
    futureProvider: "open-meteo",
    liveSummary: "UV exposure today"
  });

  /* ——— Sun & Moon dashboard ——— */
  reg({
    id: "sun-moon-dashboard",
    title: "Sun & Moon",
    icon: "☀",
    category: "sun-moon",
    defaultOrder: 100,
    defaultVisible: true,
    size: "full",
    futureProvider: "open-meteo",
    getData: function () {
      return D().liveMount("sun-moon-dashboard", "Loading sun and moon…");
    }
  });

  /* ——— Sun & Moon (legacy singles) ——— */
  live("sunrise", {
    id: "sunrise",
    title: "Sunrise",
    icon: "↑",
    category: "sun-moon",
    defaultOrder: 110,
    defaultVisible: false,
    size: "sm",
    liveSummary: "Sunrise time"
  });

  live("sunset", {
    id: "sunset",
    title: "Sunset",
    icon: "↓",
    category: "sun-moon",
    defaultOrder: 120,
    defaultVisible: false,
    size: "sm",
    liveSummary: "Sunset time"
  });

  preview({
    id: "golden-hour",
    title: "Golden Hour",
    icon: "Au",
    category: "sun-moon",
    defaultOrder: 130,
    defaultVisible: false,
    size: "sm",
    summary: "Warm directional light",
    resolve: function (ctx) {
      var dl = D().daylightData(ctx);
      if (dl && dl.goldenHour) {
        return D().editorialReady(dl.goldenHour, "Best for landscapes and wildlife rim light.", null, null, D().tagFromSlice(dl));
      }
      return null;
    },
    placeholder: "Golden hour windows appear when daylight data is available."
  });

  preview({
    id: "blue-hour",
    title: "Blue Hour",
    icon: "Bl",
    category: "sun-moon",
    defaultOrder: 140,
    summary: "Twilight photography",
    resolve: function (ctx) {
      var dl = D().daylightData(ctx);
      if (dl && dl.blueHour) {
        return D().editorialReady(dl.blueHour, "Cool ambient light before sunrise and after sunset.", null, null, D().tagFromSlice(dl));
      }
      return null;
    },
    placeholder: "Blue hour timing appears when daylight data is connected."
  });

  preview({
    id: "moon-phase",
    title: "Moon Phase",
    icon: "☽",
    category: "sun-moon",
    defaultOrder: 150,
    futureProvider: "open-meteo-astronomy",
    summary: "Lunar cycle",
    resolve: function (ctx) {
      var dl = D().daylightData(ctx);
      if (dl && dl.moonPhase) {
        return {
          status: "ready",
          tag: D().tagFromSlice(dl),
          summary: dl.moonPhase,
          items: dl.moonIllumination != null ? ["Illumination: " + dl.moonIllumination + "%"] : []
        };
      }
      return null;
    },
    placeholder: "Moon phase and illumination when daylight data loads."
  });

  preview({
    id: "moonrise",
    title: "Moonrise",
    icon: "☾↑",
    category: "sun-moon",
    defaultOrder: 160,
    futureProvider: "open-meteo-astronomy",
    summary: "Moonrise time",
    resolve: function (ctx) {
      var dl = D().daylightData(ctx);
      if (dl && dl.moonrise) {
        return D().editorialReady(dl.moonrise, "Tonight's moonrise", null, null, D().tagFromSlice(dl));
      }
      return null;
    },
    placeholder: "Moonrise times from Open-Meteo when available."
  });

  preview({
    id: "moonset",
    title: "Moonset",
    icon: "☾↓",
    category: "sun-moon",
    defaultOrder: 170,
    futureProvider: "open-meteo-astronomy",
    summary: "Moonset time",
    resolve: function (ctx) {
      var dl = D().daylightData(ctx);
      if (dl && dl.moonset) {
        return D().editorialReady(dl.moonset, "Tonight's moonset", null, null, D().tagFromSlice(dl));
      }
      return null;
    },
    placeholder: "Moonset times from Open-Meteo when available."
  });

  /* ——— Wildlife dashboard ——— */
  reg({
    id: "wildlife-dashboard",
    title: "Wildlife Activity",
    icon: "W",
    category: "wildlife",
    defaultOrder: 200,
    defaultVisible: true,
    size: "full",
    getData: function () {
      return D().intelMount("wildlife-dashboard", "What's moving outside this week");
    }
  });

  /* ——— Wildlife (legacy singles) ——— */
  preview({
    id: "wildlife-activity",
    title: "Wildlife Activity",
    icon: "W",
    category: "wildlife",
    defaultOrder: 210,
    defaultVisible: false,
    summary: "What's moving outside",
    resolve: function (ctx) {
      var matches = D().observationsMatching(p(ctx), /bear|wildlife|bird|deer|warbler|migrat/i);
      if (matches.length) {
        return D().editorialReady(matches[0].title, matches[0].body,
          matches.slice(0, 3).map(function (n) { return n.title; }));
      }
      return null;
    },
    placeholder: "Editorial wildlife notes interpret what may be active near trails and waterways."
  });

  preview({
    id: "bird-migration",
    title: "Bird Migration",
    icon: "Bm",
    category: "wildlife",
    defaultOrder: 220,
    defaultVisible: false,
    futureProvider: "ebird-migration",
    summary: "Migration windows",
    resolve: function (ctx) {
      var matches = D().observationsMatching(p(ctx), /warbler|migrat|flycatcher|vireo|shorebird/i);
      if (matches.length) {
        return D().editorialReady("Migration cues this week", matches[0].body,
          matches.slice(0, 4).map(function (n) { return n.title; }));
      }
      var items = D().speciesActiveItems(p(ctx), 4, function (s) {
        return /warbler|hawk|eagle|duck|goose|crane|sparrow/i.test((s.name || "") + (s.note || ""));
      });
      if (items.length) return D().editorialReady("Species on the move", null, items);
      return null;
    },
    placeholder: "Migration timing and peak species when bird data providers connect."
  });

  preview({
    id: "amphibian-activity",
    title: "Amphibian Activity",
    icon: "Am",
    category: "wildlife",
    defaultOrder: 230,
    futureProvider: "phenology",
    summary: "Frogs and salamanders",
    resolve: function (ctx) {
      var items = D().speciesActiveItems(p(ctx), 4, function (s) {
        return /frog|toad|salamander|newt/i.test((s.name || "") + (s.note || ""));
      });
      if (items.length) return D().editorialReady("Wet-night chorus season", null, items);
      return null;
    },
    placeholder: "Amphibian breeding and calling activity after warm rains."
  });

  preview({
    id: "insect-activity",
    title: "Insect Activity",
    icon: "In",
    category: "wildlife",
    defaultOrder: 240,
    futureProvider: "phenology",
    summary: "Pollinators and hatch timing",
    resolve: function (ctx) {
      var items = D().speciesActiveItems(p(ctx), 4, function (s) {
        return /butterfly|moth|dragonfly|bee|cicada|firefly/i.test((s.name || "") + (s.note || ""));
      });
      if (items.length) return D().editorialReady("Invertebrate pulse", null, items);
      return null;
    },
    placeholder: "Hatch and bloom-linked insect activity for field observation."
  });

  /* ——— Foraging dashboard ——— */
  reg({
    id: "foraging-dashboard",
    title: "Foraging Conditions",
    icon: "Fg",
    category: "foraging",
    defaultOrder: 300,
    defaultVisible: true,
    size: "full",
    getData: function () {
      return D().intelMount("foraging-dashboard", "Seasonal context · observe first");
    }
  });

  /* ——— Foraging (legacy singles) ——— */
  preview({
    id: "mushroom-outlook",
    title: "Mushroom Outlook",
    icon: "Mg",
    category: "foraging",
    defaultOrder: 310,
    defaultVisible: false,
    detailHref: "apps/foragecast/",
    summary: "Fruiting conditions",
    resolve: function (ctx) {
      var b = D().bundle(ctx);
      var fp = b.foragecastPreview;
      if (fp && fp.fruitingOutlook) {
        return D().editorialReady("Educational outlook — not a harvest guarantee", null,
          fp.fruitingOutlook.slice(0, 4).map(function (row) {
            return row.species + " — " + (row.note || row.status);
          }), { href: "apps/foragecast/", label: "Open ForageCast" });
      }
      return null;
    },
    placeholder: "Moisture and habitat cues for ethical mushroom investigation.",
    items: null
  });

  preview({
    id: "berry-conditions",
    title: "Berry Conditions",
    icon: "Br",
    category: "foraging",
    defaultOrder: 320,
    summary: "Ripening window",
    resolve: function (ctx) {
      var items = D().speciesActiveItems(p(ctx), 4, function (s) {
        return /berry|blueberry|huckleberry|raspberry|blackberry/i.test((s.name || "") + (s.note || ""));
      });
      if (items.length) return D().editorialReady("Berry phenology", null, items);
      return null;
    },
    placeholder: "Berry ripening follows elevation and recent rainfall."
  });

  preview({
    id: "seasonal-edibles",
    title: "Seasonal Edibles",
    icon: "Ed",
    category: "foraging",
    defaultOrder: 330,
    defaultVisible: false,
    summary: "What's in season",
    resolve: function (ctx) {
      var groups = D().speciesGroups(p(ctx));
      if (groups && groups.length) {
        return { status: "ready", tag: D().tagFromSource("editorial"), summary: "Active and ending windows", groups: groups };
      }
      return null;
    },
    placeholder: "Seasonal edible plants and fungi — identification first, harvest ethics always."
  });

  preview({
    id: "recent-rainfall",
    title: "Recent Rainfall",
    icon: "Rn",
    category: "foraging",
    defaultOrder: 340,
    defaultVisible: false,
    summary: "Moisture context",
    resolve: function (ctx) {
      var rain = D().rainfall(ctx);
      var line = D().formatRainfall(rain);
      if (line) return D().editorialReady(line, rain.recent && rain.recent.summary);
      return null;
    },
    placeholder: "Recent rainfall shapes fruiting and stream conditions."
  });

  /* ——— Flora dashboard ——— */
  reg({
    id: "flora-dashboard",
    title: "Flora & Phenology",
    icon: "Fl",
    category: "flora",
    defaultOrder: 400,
    defaultVisible: true,
    size: "full",
    getData: function () {
      return D().intelMount("flora-dashboard", "Bloom, leaf-out, and seasonal flora");
    }
  });

  /* ——— Flora (legacy singles) ——— */
  preview({
    id: "bloom-calendar",
    title: "Bloom Calendar",
    icon: "Bc",
    category: "flora",
    defaultOrder: 410,
    defaultVisible: false,
    summary: "What's blooming",
    resolve: function (ctx) {
      var items = D().speciesActiveItems(p(ctx), 5, function (s) {
        return /bloom|flower|laurel|trillium|azalea/i.test((s.name || "") + (s.note || ""));
      });
      if (items.length) return D().editorialReady("Bloom pulse this week", null, items);
      return null;
    },
    placeholder: "Wildflower bloom windows from regional phenology."
  });

  preview({
    id: "tree-phenology",
    title: "Tree Phenology",
    icon: "Tr",
    category: "flora",
    defaultOrder: 420,
    summary: "Leaf-out and canopy",
    resolve: function (ctx) {
      var items = D().speciesActiveItems(p(ctx), 5, function (s) {
        return /maple|oak|birch|beech|bud|leaf/i.test((s.name || "") + (s.note || ""));
      });
      if (items.length) return D().editorialReady("Canopy timing", null, items);
      return null;
    },
    placeholder: "Bud break, leaf-out, and mast timing for the region."
  });

  preview({
    id: "wildflower-activity",
    title: "Wildflower Activity",
    icon: "Wf",
    category: "flora",
    defaultOrder: 430,
    summary: "Forest floor color",
    resolve: function (ctx) {
      var items = D().speciesActiveItems(p(ctx), 5, function (s) {
        return /wildflower|ephemeral|trillium|violet|anemone/i.test((s.name || "") + (s.note || ""));
      });
      if (items.length) return D().editorialReady("Ephemeral show", null, items);
      return null;
    },
    placeholder: "Spring ephemerals and summer meadow flowers."
  });

  preview({
    id: "fall-color",
    title: "Fall Color",
    icon: "Fc",
    category: "flora",
    defaultOrder: 440,
    futureProvider: "foliage",
    summary: "Foliage forecast",
    placeholder: "Peak foliage timing and elevation bands — coming when foliage provider connects."
  });

  /* ——— Water dashboard ——— */
  reg({
    id: "water-dashboard",
    title: "Water Intelligence",
    icon: "H₂O",
    category: "water",
    defaultOrder: 500,
    defaultVisible: true,
    size: "full",
    getData: function () {
      return D().intelMount("water-dashboard", "Rivers, rain, and hydrology at a glance");
    }
  });

  /* ——— Water (legacy singles) ——— */
  preview({
    id: "river-levels",
    title: "River Levels",
    icon: "Rv",
    category: "water",
    defaultOrder: 510,
    defaultVisible: false,
    futureProvider: "usgs-gauges",
    summary: "Main stem rivers",
    placeholder: "USGS river gauge levels will appear when gauges are connected."
  });

  preview({
    id: "stream-flow",
    title: "Stream Flow",
    icon: "St",
    category: "water",
    defaultOrder: 520,
    futureProvider: "usgs-gauges",
    summary: "Creek and tributary flow",
    placeholder: "Stream flow (cfs) for paddling and crossing decisions."
  });

  preview({
    id: "water-temperature",
    title: "Water Temperature",
    icon: "Wt",
    category: "water",
    defaultOrder: 530,
    futureProvider: "usgs-gauges",
    summary: "Surface water temp",
    placeholder: "Water temperature at gauge sites when available."
  });

  preview({
    id: "flood-status",
    title: "Flood Status",
    icon: "Fl",
    category: "water",
    defaultOrder: 540,
    futureProvider: "nws-flood",
    summary: "Flood watches and stages",
    placeholder: "Flood stage and advisory status from NWS when connected."
  });

  /* ——— Trail dashboard ——— */
  reg({
    id: "trail-dashboard",
    title: "Trail Conditions",
    icon: "Tk",
    category: "trails",
    defaultOrder: 600,
    defaultVisible: true,
    size: "full",
    getData: function () {
      return D().intelMount("trail-dashboard", "Trail ops at a glance");
    }
  });

  /* ——— Trails (legacy singles) ——— */
  preview({
    id: "trail-conditions",
    title: "Trail Conditions",
    icon: "Tk",
    category: "trails",
    defaultOrder: 610,
    defaultVisible: false,
    summary: "Mud, ice, and tread",
    resolve: function (ctx) {
      var matches = D().observationsMatching(p(ctx), /trail|mud|ridge|hike|path/i);
      if (matches.length) {
        return D().editorialReady(matches[0].title, matches[0].body,
          matches.slice(0, 3).map(function (n) { return n.title; }));
      }
      return null;
    },
    placeholder: "Ridge tops dry first; ravines hold mud after rain — verify locally."
  });

  preview({
    id: "trail-closures",
    title: "Trail Closures",
    icon: "X",
    category: "trails",
    defaultOrder: 620,
    futureProvider: "trail-reports",
    summary: "Closed trails",
    placeholder: "Agency trail closures when trail report provider connects."
  });

  preview({
    id: "park-alerts",
    title: "Park Alerts",
    icon: "Pa",
    category: "trails",
    defaultOrder: 630,
    futureProvider: "nps-alerts",
    summary: "Park-wide notices",
    placeholder: "National and state park alerts when provider connects."
  });

  preview({
    id: "parking-updates",
    title: "Parking Updates",
    icon: "Pk",
    category: "trails",
    defaultOrder: 640,
    futureProvider: "crowd-reports",
    summary: "Lot availability",
    placeholder: "Popular trailhead parking status when crowd data connects."
  });

  /* ——— Photography dashboard ——— */
  reg({
    id: "photography-conditions-dashboard",
    title: "Photography Conditions",
    icon: "Px",
    category: "photography",
    defaultOrder: 700,
    defaultVisible: true,
    size: "full",
    futureProvider: "open-meteo",
    getData: function () {
      return D().liveMount("photography-dashboard", "Loading photography conditions…");
    }
  });

  /* ——— Photography (legacy singles) ——— */
  preview({
    id: "sunrise-quality",
    title: "Sunrise Quality",
    icon: "Sq",
    category: "photography",
    defaultOrder: 710,
    defaultVisible: false,
    summary: "Morning light potential",
    resolve: function (ctx) {
      var w = D().weather(ctx);
      var items = [];
      if (D().sliceReady(w) && w.conditions) items.push(w.conditions);
      if (D().sliceReady(w) && /cloud|fog|overcast/i.test(w.conditions || "")) {
        items.push("Diffuse dawn — strong for forest and creek scenes");
      }
      if (items.length) return D().editorialReady("Sunrise shoot window", null, items);
      return null;
    },
    placeholder: "Cloud cover and fog shape sunrise photography potential."
  });

  preview({
    id: "sunset-quality",
    title: "Sunset Quality",
    icon: "Sq",
    category: "photography",
    defaultOrder: 720,
    summary: "Evening light potential",
    resolve: function (ctx) {
      var w = D().weather(ctx);
      var items = [];
      if (D().sliceReady(w) && w.conditions) items.push(w.conditions);
      if (D().sliceReady(w) && /clear|partly/i.test(w.conditions || "")) {
        items.push("Clear sky — watch for hard rim light on ridges");
      }
      if (items.length) return D().editorialReady("Sunset shoot window", null, items);
      return null;
    },
    placeholder: "Evening cloud decks and clearing trends for landscape light."
  });

  preview({
    id: "fog-potential",
    title: "Fog Potential",
    icon: "Fg",
    category: "photography",
    defaultOrder: 730,
    summary: "Valley fog likelihood",
    resolve: function (ctx) {
      var w = D().weather(ctx);
      if (D().sliceReady(w) && /fog|mist|overcast/i.test(w.conditions || "")) {
        return D().editorialReady("Fog or mist likely", "Look to valleys and water edges at dawn.");
      }
      return null;
    },
    placeholder: "Radiation fog potential from humidity, wind, and overnight cooling."
  });

  preview({
    id: "milky-way",
    title: "Milky Way",
    icon: "Mw",
    category: "photography",
    defaultOrder: 740,
    futureProvider: "astronomy-api",
    summary: "Night sky visibility",
    resolve: function (ctx) {
      var dl = D().daylight(ctx);
      if (D().sliceReady(dl) && dl.moonPhase && /new|waxing crescent|waning crescent/i.test(dl.moonPhase)) {
        return D().editorialReady("Dark sky window", "Moon phase favors Milky Way attempts on clear nights.");
      }
      return null;
    },
    placeholder: "Milky Way visibility from moon phase and cloud forecast."
  });

  preview({
    id: "aurora",
    title: "Aurora",
    icon: "Au",
    category: "photography",
    defaultOrder: 750,
    futureProvider: "noaa-aurora",
    summary: "Northern lights chance",
    placeholder: "Geomagnetic activity and aurora forecast for your latitude."
  });

  live("cloud-cover", {
    id: "cloud-cover",
    title: "Cloud Cover",
    icon: "Cc",
    category: "photography",
    defaultOrder: 760,
    defaultVisible: false,
    size: "sm",
    futureProvider: "open-meteo",
    liveSummary: "Cloud cover %"
  });

  /* ——— Astronomy ——— */
  preview({
    id: "visible-planets",
    title: "Visible Planets",
    icon: "Pl",
    category: "astronomy",
    defaultOrder: 810,
    futureProvider: "astronomy-api",
    summary: "Tonight's planets",
    placeholder: "Planet rise/set and visibility when astronomy API connects."
  });

  preview({
    id: "iss-passes",
    title: "ISS Passes",
    icon: "Is",
    category: "astronomy",
    defaultOrder: 820,
    futureProvider: "iss-tracker",
    summary: "Space station passes",
    placeholder: "ISS overhead pass times for your coordinates."
  });

  preview({
    id: "meteor-showers",
    title: "Meteor Showers",
    icon: "Ms",
    category: "astronomy",
    defaultOrder: 830,
    futureProvider: "astronomy-api",
    summary: "Active showers",
    placeholder: "Annual meteor shower peaks and moon interference."
  });

  preview({
    id: "dark-sky-rating",
    title: "Dark Sky Rating",
    icon: "Ds",
    category: "astronomy",
    defaultOrder: 840,
    summary: "Light pollution context",
    resolve: function (ctx) {
      var dl = D().daylight(ctx);
      if (D().sliceReady(dl) && dl.astronomicalTwilight) {
        return D().editorialReady("Astronomical twilight", dl.astronomicalTwilight);
      }
      return null;
    },
    placeholder: "Bortle-scale dark sky rating and astronomical twilight timing."
  });

  /* ——— Safety dashboard ——— */
  reg({
    id: "safety-dashboard",
    title: "Outdoor Safety",
    icon: "Sf",
    category: "safety",
    defaultOrder: 900,
    defaultVisible: true,
    size: "full",
    getData: function () {
      return D().intelMount("safety-dashboard", "Calm safety snapshot for today");
    }
  });

  /* ——— Safety (legacy singles) ——— */
  preview({
    id: "tick-activity",
    title: "Tick Activity",
    icon: "Tk",
    category: "safety",
    defaultOrder: 910,
    defaultVisible: false,
    summary: "Tick season risk",
    placeholder: "Tick activity index from temperature and humidity models."
  });

  preview({
    id: "mosquito-activity",
    title: "Mosquito Activity",
    icon: "Mz",
    category: "safety",
    defaultOrder: 920,
    summary: "Bite pressure",
    placeholder: "Mosquito activity forecast when entomology provider connects."
  });

  preview({
    id: "fire-danger",
    title: "Fire Danger",
    icon: "Fi",
    category: "safety",
    defaultOrder: 930,
    futureProvider: "fire-weather",
    summary: "Wildfire risk",
    placeholder: "Fire weather index and burn ban status."
  });

  preview({
    id: "heat-risk",
    title: "Heat Risk",
    icon: "Ht",
    category: "safety",
    defaultOrder: 940,
    summary: "Heat stress",
    resolve: function (ctx) {
      var w = D().weather(ctx);
      if (D().sliceReady(w) && /hot|heat|humid/i.test((w.conditions || "") + (w.summary || ""))) {
        return D().editorialReady("Heat advisory conditions", "Start early, carry water, know exit routes.");
      }
      return null;
    },
    placeholder: "Heat index and exertion risk from live weather when extreme."
  });

  preview({
    id: "storm-risk",
    title: "Storm Risk",
    icon: "St",
    category: "safety",
    defaultOrder: 950,
    defaultVisible: false,
    summary: "Thunderstorm potential",
    resolve: function (ctx) {
      var w = D().weather(ctx);
      if (D().sliceReady(w) && /storm|thunder|lightning/i.test((w.conditions || "") + (w.summary || ""))) {
        return D().editorialReady("Storm potential today", "Have a below-treeline exit plan before ridges.");
      }
      return null;
    },
    placeholder: "Thunderstorm and lightning risk from forecast when elevated."
  });

  /* ——— Conservation ——— */
  preview({
    id: "conservation-news",
    title: "Local Conservation News",
    icon: "Cv",
    category: "conservation",
    defaultOrder: 1010,
    summary: "Stewardship updates",
    resolve: function (ctx) {
      var plat = p(ctx);
      var c = plat.conservation;
      var cu = D().bundle(ctx).conservationUpdate;
      if (D().sliceReady(c) && c.summary) {
        return D().editorialReady(c.summary, null, null, { href: "#conservation-update", label: "Stewardship" });
      }
      if (cu && cu.title) {
        return D().editorialReady(cu.summary || cu.title, null, null, { href: "#conservation-update", label: "Read more" });
      }
      return null;
    },
    placeholder: "Habitat projects and public lands context for your region."
  });

  preview({
    id: "volunteer-opportunities",
    title: "Volunteer Opportunities",
    icon: "Vo",
    category: "conservation",
    defaultOrder: 1020,
    futureProvider: "volunteer-events",
    summary: "Trail and habitat work",
    placeholder: "Stewardship volunteer events when calendar provider connects."
  });

  preview({
    id: "invasive-species-alerts",
    title: "Invasive Species Alerts",
    icon: "Iv",
    category: "conservation",
    defaultOrder: 1030,
    futureProvider: "invasive-watch",
    summary: "Report and control",
    placeholder: "Invasive plant and pest alerts for the region."
  });

  preview({
    id: "habitat-projects",
    title: "Habitat Projects",
    icon: "Hb",
    category: "conservation",
    defaultOrder: 1040,
    summary: "Active restoration",
    placeholder: "Ongoing habitat restoration and monitoring projects."
  });

  /* ——— My Dashboard ——— */
  preview({
    id: "recent-fieldry-observations",
    title: "Recent Fieldry Observations",
    icon: "Fn",
    category: "my-dashboard",
    defaultOrder: 1110,
    defaultVisible: true,
    detailHref: "apps/fieldry/",
    summary: "Your field notes",
    resolve: function () {
      var stats = D().fieldryLocalStats();
      if (stats && stats.total > 0) {
        var items = [
          stats.total + " observation" + (stats.total === 1 ? "" : "s") + " on this device",
          stats.speciesCount + " species named"
        ];
        if (stats.recent && stats.recent.length) {
          stats.recent.forEach(function (obs) {
            var name = obs.taxon && (obs.taxon.commonName || obs.taxon.scientificName);
            if (name) items.push(name);
          });
        }
        return {
          status: "ready",
          tag: D().tagFromSource("local"),
          summary: stats.total + " observations",
          items: items,
          link: { href: "apps/fieldry/", label: "Open Fieldry" }
        };
      }
      return {
        status: "empty",
        tag: D().tagFromSource("local"),
        summary: "No observations yet",
        body: "Record what you see in the field.",
        link: { href: "apps/fieldry/", label: "Start in Fieldry" }
      };
    },
    placeholder: ""
  });

  preview({
    id: "favorite-locations",
    title: "Favorite Locations",
    icon: "★",
    category: "my-dashboard",
    defaultOrder: 1120,
    summary: "Saved places",
    resolve: function () {
      var favs = D().favoriteLocations();
      if (favs.length) {
        return {
          status: "ready",
          tag: D().tagFromSource("local"),
          summary: favs.length + " saved",
          items: favs.map(function (f) { return f.name || f.label || f; })
        };
      }
      return D().previewData("No favorites yet", "Save trailheads and overlooks from the location bar.");
    },
    placeholder: "Save favorite trailheads and overlooks — coming soon."
  });

  preview({
    id: "observation-goals",
    title: "Observation Goals",
    icon: "Go",
    category: "my-dashboard",
    defaultOrder: 1130,
    summary: "This week's targets",
    placeholder: "Set species or habitat goals to guide weekend field time."
  });

  preview({
    id: "recently-viewed-species",
    title: "Recently Viewed Species",
    icon: "Sp",
    category: "my-dashboard",
    defaultOrder: 1140,
    summary: "Species you've studied",
    resolve: function () {
      var recent = D().recentSpeciesViews();
      if (recent.length) {
        return {
          status: "ready",
          tag: D().tagFromSource("local"),
          summary: recent.length + " recent",
          items: recent.map(function (r) { return r.commonName || r.name || r.id; })
        };
      }
      return D().previewData("No species viewed yet", "Open Species Spotlight or WSKB entries to build your list.");
    },
    placeholder: "Recently viewed species from WSKB."
  });

})(window);
