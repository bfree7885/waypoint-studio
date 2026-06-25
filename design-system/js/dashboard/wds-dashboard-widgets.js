/**
 * Waypoint Dashboard — widget registry
 * Each widget is independent; registers via WDS.dashboardWidgets.register()
 */
(function (global) {
  "use strict";

  var registry = {};
  var D = function () { return global.WDS && global.WDS.dashboardWidgetData; };

  function register(def) {
    if (!def || !def.id) return;
    registry[def.id] = def;
  }

  function get(id) {
    return registry[id] || null;
  }

  function all() {
    return Object.keys(registry).map(function (id) { return registry[id]; });
  }

  function defaultDefs() {
    return all().sort(function (a, b) {
      return (a.defaultOrder || 0) - (b.defaultOrder || 0);
    });
  }

  /* ——— Widget definitions ——— */

  register({
    id: "current-weather",
    title: "Current Weather",
    icon: "Wx",
    category: "weather",
    defaultOrder: 10,
    defaultVisible: true,
    defaultCollapsed: false,
    size: "lg",
    detailHref: null,
    futureProvider: "open-meteo",
    getData: function () {
      return { status: "loading", mountKind: "current", tag: D().tagFromSource("live") };
    }
  });

  register({
    id: "forecast",
    title: "Forecast",
    icon: "Fc",
    category: "weather",
    defaultOrder: 20,
    defaultVisible: true,
    defaultCollapsed: false,
    size: "wide",
    futureProvider: "open-meteo",
    getData: function () {
      return { status: "loading", mountKind: "forecast", tag: D().tagFromSource("live") };
    }
  });

  register({
    id: "sun",
    title: "Sun",
    icon: "☀",
    category: "weather",
    defaultOrder: 30,
    defaultVisible: true,
    defaultCollapsed: false,
    size: "sm",
    getData: function () {
      return { status: "loading", mountKind: "sun", tag: D().tagFromSource("live") };
    }
  });

  register({
    id: "moon",
    title: "Moon",
    icon: "☽",
    category: "weather",
    defaultOrder: 35,
    defaultVisible: false,
    defaultCollapsed: false,
    size: "sm",
    futureProvider: "moon-phase",
    getData: function (ctx) {
      var p = D().platform(ctx);
      var dl = p.daylight;
      if (D().sliceReady(dl) && dl.moonPhase) {
        return {
          status: "ready",
          tag: D().tagFromSource("editorial"),
          body: dl.moonPhase,
          items: dl.moonIllumination != null ? ["Illumination: " + dl.moonIllumination + "%"] : []
        };
      }
      return {
        status: "placeholder",
        tag: D().tagFromSource("placeholder"),
        placeholder: "Moon phase and illumination appear when daylight data is connected for your region."
      };
    }
  });

  register({
    id: "seasonal-watch",
    title: "Seasonal Watch",
    icon: "Ph",
    category: "phenology",
    defaultOrder: 40,
    defaultVisible: true,
    defaultCollapsed: false,
    size: "md",
    detailHref: "#seasonal-watch",
    getData: function (ctx) {
      var p = D().platform(ctx);
      var groups = D().speciesGroups(p);
      if (groups && groups.length) {
        return {
          status: "ready",
          tag: D().tagFromSource("editorial"),
          highlight: p.phenology && p.phenology.summary,
          groups: groups,
          link: { href: "#seasonal-watch", label: "Full seasonal watch" }
        };
      }
      return {
        status: "placeholder",
        tag: D().tagFromSource("placeholder"),
        placeholder: "Phenology watch lists blooms, fruiting, and migration windows when regional data loads.",
        link: { href: "#seasonal-watch", label: "Seasonal watch section" }
      };
    }
  });

  register({
    id: "foraging-conditions",
    title: "Foraging Conditions",
    icon: "Fg",
    category: "foraging",
    defaultOrder: 50,
    defaultVisible: true,
    defaultCollapsed: false,
    size: "md",
    detailHref: "apps/foragecast/",
    getData: function (ctx) {
      var b = D().bundle(ctx);
      var fp = b.foragecastPreview;
      var p = D().platform(ctx);
      var items = [];
      if (fp && fp.fruitingOutlook) {
        items = fp.fruitingOutlook.slice(0, 4).map(function (row) {
          return row.species + " — " + (row.note || row.status);
        });
      } else if (D().sliceReady(p.species) && D().hasItems(p.species.active)) {
        items = p.species.active.slice(0, 4).map(function (s) {
          return s.name + (s.note ? " — " + s.note : "");
        });
      }
      if (items.length) {
        return {
          status: "ready",
          tag: D().tagFromSource("editorial"),
          body: "Educational fruiting outlook — not a harvest guarantee.",
          items: items,
          link: { href: "apps/foragecast/", label: "Open ForageCast" }
        };
      }
      return {
        status: "placeholder",
        tag: D().tagFromSource("placeholder"),
        placeholder: "Habitat and moisture cues for ethical foraging investigation appear here.",
        link: { href: "apps/foragecast/", label: "ForageCast laboratory" }
      };
    }
  });

  register({
    id: "wildlife-activity",
    title: "Wildlife Activity",
    icon: "W",
    category: "wildlife",
    defaultOrder: 60,
    defaultVisible: true,
    defaultCollapsed: false,
    size: "md",
    getData: function (ctx) {
      var matches = D().observationsMatching(D().platform(ctx), /bear|wildlife|bird|deer|warbler|migrat/i);
      if (matches.length) {
        return {
          status: "ready",
          tag: D().tagFromSource("editorial"),
          body: matches[0].body,
          items: matches.slice(0, 3).map(function (n) { return n.title; })
        };
      }
      return {
        status: "placeholder",
        tag: D().tagFromSource("placeholder"),
        placeholder: "Editorial wildlife notes interpret what may be active near trails and waterways."
      };
    }
  });

  register({
    id: "flora",
    title: "Flora",
    icon: "Pl",
    category: "phenology",
    defaultOrder: 65,
    defaultVisible: false,
    defaultCollapsed: false,
    size: "md",
    getData: function (ctx) {
      var p = D().platform(ctx);
      var sp = p.species;
      if (D().sliceReady(sp) && D().hasItems(sp.active)) {
        var plants = sp.active.filter(function (s) {
          return /laurel|maple|fern|flower|bloom|plant|ephemeral/i.test((s.name || "") + (s.note || ""));
        });
        var list = (plants.length ? plants : sp.active).slice(0, 5);
        return {
          status: "ready",
          tag: D().tagFromSource("editorial"),
          items: list.map(function (s) { return s.name + (s.note ? " — " + s.note : ""); })
        };
      }
      return {
        status: "placeholder",
        tag: D().tagFromSource("placeholder"),
        placeholder: "Active plants and bloom cues from regional phenology appear here."
      };
    }
  });

  register({
    id: "trail-conditions",
    title: "Trail Conditions",
    icon: "Tr",
    category: "trails",
    defaultOrder: 70,
    defaultVisible: true,
    defaultCollapsed: false,
    size: "md",
    futureProvider: "trail-reports",
    getData: function (ctx) {
      var matches = D().observationsMatching(D().platform(ctx), /trail|mud|ridge|hike|path/i);
      if (matches.length) {
        return {
          status: "ready",
          tag: D().tagFromSource("editorial"),
          body: matches[0].body,
          items: matches.slice(0, 3).map(function (n) { return n.title; })
        };
      }
      return {
        status: "placeholder",
        tag: D().tagFromSource("placeholder"),
        placeholder: "Mud lingers in ravines while ridge tops dry first — verify locally before long climbs."
      };
    }
  });

  register({
    id: "road-closures",
    title: "Road Closures",
    icon: "Rd",
    category: "access",
    defaultOrder: 75,
    defaultVisible: false,
    defaultCollapsed: false,
    size: "sm",
    futureProvider: "dot-511",
    getData: function () {
      return {
        status: "placeholder",
        tag: D().tagFromSource("placeholder"),
        placeholder: "Park and road alerts will appear here when a closures provider is connected."
      };
    }
  });

  register({
    id: "water-conditions",
    title: "Water Conditions",
    icon: "Wa",
    category: "water",
    defaultOrder: 80,
    defaultVisible: false,
    defaultCollapsed: false,
    size: "md",
    futureProvider: "usgs-gauges",
    getData: function (ctx) {
      var p = D().platform(ctx);
      var rainLine = D().formatRainfall(p.rainfall);
      var watersheds = p.geography && p.geography.watersheds;
      var items = [];
      var body = null;
      if (rainLine) {
        body = p.rainfall.recent.summary || rainLine;
        items.push(rainLine);
      }
      if (D().hasItems(watersheds)) items.push("Watersheds: " + watersheds.join(", "));
      if (body || items.length) {
        return {
          status: "ready",
          tag: D().tagFromSource("editorial"),
          body: body,
          items: items
        };
      }
      return {
        status: "placeholder",
        tag: D().tagFromSource("placeholder"),
        placeholder: "Creek levels shift with recent rain. Live gauge integration is planned."
      };
    }
  });

  register({
    id: "photography-conditions",
    title: "Photography Conditions",
    icon: "Px",
    category: "photography",
    defaultOrder: 85,
    defaultVisible: true,
    defaultCollapsed: false,
    size: "md",
    detailHref: "#photo-essay",
    getData: function (ctx) {
      var p = D().platform(ctx);
      var w = p.weather;
      var items = [];
      if (D().sliceReady(w)) {
        if (w.conditions) items.push(w.conditions);
        if (/cloud|overcast|fog/i.test(w.conditions || "")) items.push("Diffuse light — good for forest floor and fungi");
        if (/clear|sun/i.test(w.conditions || "")) items.push("Hard light — shoot early or late for softer tones");
      }
      var dl = p.daylight;
      if (D().sliceReady(dl) && dl.goldenHour) items.push("Golden hour: " + dl.goldenHour);
      if (items.length) {
        return {
          status: "ready",
          tag: D().tagFromSource("editorial"),
          body: "Light and weather shape field photographs — not just subject choice.",
          items: items,
          link: { href: "#photo-essay", label: "Regional photographs" }
        };
      }
      return {
        status: "placeholder",
        tag: D().tagFromSource("placeholder"),
        placeholder: "Golden hour and cloud cover cues help plan ethical field photography.",
        link: { href: "#photo-essay", label: "Photo section" }
      };
    }
  });

  register({
    id: "astronomy",
    title: "Astronomy",
    icon: "★",
    category: "sky",
    defaultOrder: 90,
    defaultVisible: false,
    defaultCollapsed: false,
    size: "sm",
    futureProvider: "astronomy-api",
    getData: function (ctx) {
      var p = D().platform(ctx);
      var dl = p.daylight;
      if (D().sliceReady(dl)) {
        var items = [];
        if (dl.astronomicalTwilight) items.push("Astronomical twilight: " + dl.astronomicalTwilight);
        if (dl.moonPhase) items.push("Moon: " + dl.moonPhase);
        if (items.length) {
          return { status: "ready", tag: D().tagFromSource("editorial"), items: items };
        }
      }
      return {
        status: "placeholder",
        tag: D().tagFromSource("placeholder"),
        placeholder: "Dark-sky windows and moonless nights — future astronomy provider hook."
      };
    }
  });

  register({
    id: "conservation",
    title: "Conservation",
    icon: "Cv",
    category: "stewardship",
    defaultOrder: 100,
    defaultVisible: false,
    defaultCollapsed: false,
    size: "md",
    detailHref: "#conservation-update",
    getData: function (ctx) {
      var p = D().platform(ctx);
      var c = p.conservation;
      var b = D().bundle(ctx);
      var cu = b.conservationUpdate;
      if (D().sliceReady(c) && c.summary) {
        return {
          status: "ready",
          tag: D().tagFromSource("editorial"),
          body: c.summary,
          link: { href: "#conservation-update", label: "Stewardship update" }
        };
      }
      if (cu && cu.title) {
        return {
          status: "ready",
          tag: D().tagFromSource("editorial"),
          body: cu.summary || cu.title,
          link: { href: "#conservation-update", label: "Read more" }
        };
      }
      return {
        status: "placeholder",
        tag: D().tagFromSource("placeholder"),
        placeholder: "Habitat stewardship and public lands context for your region.",
        link: { href: "#conservation-update", label: "Conservation section" }
      };
    }
  });

  register({
    id: "regional-news",
    title: "Regional News",
    icon: "Nw",
    category: "news",
    defaultOrder: 110,
    defaultVisible: false,
    defaultCollapsed: false,
    size: "md",
    futureProvider: "editorial-feed",
    getData: function (ctx) {
      var p = D().platform(ctx);
      var obs = p.observations;
      if (D().sliceReady(obs) && D().hasItems(obs.items)) {
        return {
          status: "ready",
          tag: D().tagFromSource("editorial"),
          items: obs.items.slice(0, 3).map(function (n) { return n.title; }),
          link: { href: "#regional-field-notes", label: "Field notes" }
        };
      }
      return {
        status: "placeholder",
        tag: D().tagFromSource("placeholder"),
        placeholder: "Regional field dispatches — not a news feed. Editorial notes only.",
        link: { href: "#regional-field-notes", label: "Regional field notes" }
      };
    }
  });

  register({
    id: "fieldry-summary",
    title: "Fieldry Summary",
    icon: "Fn",
    category: "observations",
    defaultOrder: 120,
    defaultVisible: true,
    defaultCollapsed: false,
    size: "sm",
    detailHref: "apps/fieldry/",
    getData: function () {
      var stats = D().fieldryLocalStats();
      if (stats && stats.total > 0) {
        return {
          status: "ready",
          tag: { label: "Local", className: "wdb-widget__tag--local" },
          items: [
            stats.total + " observation" + (stats.total === 1 ? "" : "s") + " on this device",
            stats.speciesCount + " species named",
            stats.countyCount + " counties in ledger"
          ],
          link: { href: "apps/fieldry/", label: "Open Fieldry" }
        };
      }
      return {
        status: "empty",
        tag: { label: "Local", className: "wdb-widget__tag--local" },
        body: "No observations on this device yet.",
        link: { href: "apps/fieldry/", label: "Record in Fieldry" }
      };
    }
  });

  register({
    id: "research-notes",
    title: "Research Notes",
    icon: "Rs",
    category: "research",
    defaultOrder: 130,
    defaultVisible: false,
    defaultCollapsed: false,
    size: "md",
    detailHref: "#research-brief",
    getData: function (ctx) {
      var p = D().platform(ctx);
      var r = p.research;
      var b = D().bundle(ctx);
      var rb = b.researchBrief;
      if (D().sliceReady(r) && r.summary) {
        return {
          status: "ready",
          tag: D().tagFromSource("educational"),
          body: r.summary,
          link: { href: "#research-brief", label: "Research brief" }
        };
      }
      if (rb && rb.title) {
        return {
          status: "ready",
          tag: D().tagFromSource("educational"),
          body: rb.summary || rb.title,
          link: { href: "#research-brief", label: "Read brief" }
        };
      }
      return {
        status: "placeholder",
        tag: D().tagFromSource("placeholder"),
        placeholder: "Plain-language science with stated uncertainty — not headlines.",
        link: { href: "#research-brief", label: "Research section" }
      };
    }
  });

  global.WDS = global.WDS || {};
  global.WDS.dashboardWidgets = {
    register: register,
    get: get,
    all: all,
    defaultDefs: defaultDefs
  };
})(window);
