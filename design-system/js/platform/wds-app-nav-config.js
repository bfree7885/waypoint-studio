/**
 * Waypoint Studio — App navigation config (embedded from nav-registry.json)
 * Edit design-system/ecosystem/nav-registry.json, then regenerate or keep in sync.
 */
(function (global) {
  "use strict";
  global.WDS = global.WDS || {};
  global.WDS.APP_NAV_CONFIG = {
    "version": "2.2.0-home-rc1",
    "brand": {
      "name": "Waypoint Studio",
      "homeRoute": "./"
    },
    "studioPrimaryNav": [
      { "id": "home", "label": "Home", "href": "./", "hint": "What’s happening outside today" },
      { "id": "scenes", "label": "Scenes", "href": "apps/scenes/", "hint": "Review today’s shoot" },
      { "id": "sheds", "label": "Sheds", "href": "apps/shed-hunting/map/", "hint": "Where to search" },
      { "id": "articles", "label": "Articles", "href": "articles/", "hint": "Learn while you’re out" },
      { "id": "about", "label": "About", "href": "about.html" }
    ],
    "homePrimary": ["home", "scenes", "sheds"],
    "homeIncubator": ["signalterrain", "steepleaf", "savant-sommelier"],
    "homeSupporting": ["foragecast", "fieldry", "landscape-interpretation"],
    "categories": [
      {
        "id": "core",
        "label": "Today outside"
      },
      {
        "id": "photography",
        "label": "Photography"
      },
      {
        "id": "outdoor",
        "label": "In the field"
      },
      {
        "id": "intelligence",
        "label": "Reading the land"
      },
      {
        "id": "lifestyle",
        "label": "Nearby"
      }
    ],
    "apps": [
      {
        "id": "dashboard",
        "title": "Home",
        "shortTitle": "Home",
        "icon": "dashboard",
        "route": "apps/dashboard/",
        "match": [
          "/apps/dashboard",
          "^/index\\.html$",
          "^/$"
        ],
        "category": "core",
        "description": "Customizable outdoor workspace — Today Outside summary plus instruments you choose.",
        "status": "live",
        "maturity": "Live",
        "purpose": "Assemble your view of conditions near you; glance Today Outside; go deeper when you choose.",
        "features": [
          {
            "id": "workspace",
            "label": "Workspace",
            "href": "apps/dashboard/",
            "hash": "#/",
            "match": [
              "/apps/dashboard/?$",
              "/apps/dashboard/index",
              "^/$",
              "^/index\\.html$"
            ]
          },
          {
            "id": "customize",
            "label": "Customize",
            "href": "apps/dashboard/",
            "hash": "#/customize",
            "match": [
              "#/customize",
              "#customize"
            ]
          }
        ],
        "startHere": {
          "label": "Open Home",
          "href": "./"
        },
        "journeys": [
          "observe",
          "understand"
        ],
        "related": [
          "scenes",
          "sheds"
        ]
      },
      {
        "id": "scenes",
        "title": "Scenes",
        "shortTitle": "Scenes",
        "icon": "scenes",
        "route": "apps/scenes/",
        "match": [
          "/apps/scenes",
          "/apps/photo-coach",
          "/apps/waypoint-scenes",
          "/apps/animal-vision",
          "/apps/hidden-landscapes",
          "/apps/photo-library"
        ],
        "category": "photography",
        "description": "Flagship photography — follow a photographer’s journey: import, review, organize, learn, then discover other ways of seeing.",
        "status": "live",
        "features": [
          {
            "id": "overview",
            "label": "Today",
            "href": "apps/scenes/",
            "match": [
              "/apps/scenes/?$",
              "/apps/scenes/index"
            ]
          },
          {
            "id": "photo-coach",
            "label": "Review a shoot",
            "href": "apps/photo-coach/",
            "match": [
              "/apps/scenes/photo-coach",
              "/apps/photo-coach/?$",
              "/apps/photo-coach/index"
            ]
          },
          {
            "id": "photo-library",
            "label": "Your photographs",
            "href": "apps/photo-library/",
            "match": [
              "/apps/scenes/photo-library",
              "/apps/photo-library"
            ]
          },
          {
            "id": "hidden-landscapes",
            "label": "Other ways of seeing",
            "href": "apps/hidden-landscapes/",
            "match": [
              "/apps/scenes/hidden-landscapes",
              "/apps/hidden-landscapes",
              "/apps/animal-vision"
            ]
          }
        ],
        "purpose": "Observe carefully, discover what to look for, understand how you see — Create and Share stay inside the craft workflow.",
        "maturity": "Flagship",
        "startHere": {
          "label": "Review today’s shoot",
          "href": "apps/photo-coach/"
        },
        "journeys": [
          "observe",
          "discover",
          "understand"
        ],
        "related": [
          "dashboard",
          "fieldry"
        ]
      },
      {
        "id": "sheds",
        "title": "Sheds",
        "shortTitle": "Sheds",
        "icon": "sheds",
        "route": "apps/shed-hunting/",
        "match": [
          "/apps/shed-hunting"
        ],
        "category": "outdoor",
        "description": "Flagship shed hunting — map, GPS, field workflow, and privacy-first observations.",
        "status": "live",
        "features": [
          {
            "id": "field-map",
            "label": "Where to search",
            "href": "apps/shed-hunting/map/"
          },
          {
            "id": "overview",
            "label": "About today’s hunt",
            "href": "apps/shed-hunting/"
          }
        ],
        "purpose": "A day’s hunt — where to search, conditions, finds, and learning without trophy culture.",
        "maturity": "Flagship",
        "startHere": {
          "label": "Where should I search?",
          "href": "apps/shed-hunting/map/"
        },
        "journeys": [
          "observe",
          "understand"
        ],
        "related": [
          "dashboard",
          "fieldry",
          "landscape-interpretation"
        ]
      },
      {
        "id": "foragecast",
        "title": "ForageCast",
        "shortTitle": "ForageCast",
        "icon": "foragecast",
        "route": "apps/foragecast/",
        "match": [
          "/apps/foragecast"
        ],
        "category": "outdoor",
        "description": "Outdoor intelligence — what to look for today and why, across foraging and land care.",
        "status": "live",
        "features": [
          {
            "id": "overview",
            "label": "Overview",
            "href": "apps/foragecast/",
            "match": [
              "/apps/foragecast/?$",
              "/apps/foragecast/index"
            ]
          },
          {
            "id": "conditions",
            "label": "Today's Conditions",
            "href": "apps/foragecast/conditions.html",
            "match": [
              "conditions.html"
            ]
          },
          {
            "id": "species",
            "label": "Species",
            "href": "apps/foragecast/species.html",
            "match": [
              "species.html"
            ]
          },
          {
            "id": "map",
            "label": "Map",
            "href": "apps/foragecast/map.html",
            "match": [
              "map.html"
            ]
          },
          {
            "id": "timeline",
            "label": "Season Timeline",
            "href": "apps/foragecast/timeline.html",
            "match": [
              "timeline.html"
            ]
          },
          {
            "id": "weather",
            "label": "Recent Weather",
            "href": "apps/foragecast/weather.html",
            "match": [
              "weather.html"
            ]
          },
          {
            "id": "habitats",
            "label": "Habitats",
            "href": "apps/foragecast/habitats.html",
            "match": [
              "habitats.html"
            ]
          },
          {
            "id": "learn",
            "label": "Learn",
            "href": "apps/foragecast/learn.html",
            "match": [
              "learn.html"
            ]
          },
          {
            "id": "journal",
            "label": "Journal",
            "href": "apps/foragecast/journal.html",
            "match": [
              "journal.html"
            ]
          },
          {
            "id": "settings",
            "label": "Settings",
            "href": "apps/foragecast/settings.html",
            "match": [
              "settings.html"
            ]
          }
        ],
        "purpose": "Seasonal outdoor intelligence — what to look for today across foraging and land care.",
        "maturity": "Live",
        "startHere": {
          "label": "Open ForageCast",
          "href": "apps/foragecast/"
        },
        "journeys": [
          "observe",
          "understand"
        ],
        "related": [
          "dashboard",
          "fieldry",
          "landscape-interpretation"
        ]
      },
      {
        "id": "fieldry",
        "title": "Fieldry",
        "shortTitle": "Fieldry",
        "icon": "fieldry",
        "route": "apps/fieldry/",
        "match": [
          "/apps/fieldry",
          "/apps/terrainbound"
        ],
        "category": "outdoor",
        "description": "A private life list for what you encounter outdoors.",
        "status": "live",
        "features": [
          {
            "id": "overview",
            "label": "Overview",
            "href": "apps/fieldry/#/",
            "hash": "#/"
          },
          {
            "id": "record",
            "label": "Record",
            "href": "apps/fieldry/#/new",
            "hash": "#/new"
          },
          {
            "id": "observations",
            "label": "Observations",
            "href": "apps/fieldry/#/history",
            "hash": "#/history"
          },
          {
            "id": "life",
            "label": "Life list",
            "href": "apps/fieldry/#/life",
            "hash": "#/life"
          },
          {
            "id": "explore",
            "label": "Explore",
            "href": "apps/fieldry/#/browse",
            "hash": "#/browse"
          },
          {
            "id": "stats",
            "label": "Stats",
            "href": "apps/fieldry/#/stats",
            "hash": "#/stats"
          },
          {
            "id": "collections",
            "label": "Collections",
            "href": "apps/fieldry/#/collections",
            "hash": "#/collections"
          }
        ],
        "purpose": "A private life list and field notebook for what you encounter outdoors.",
        "maturity": "Live",
        "startHere": {
          "label": "Record an encounter",
          "href": "apps/fieldry/#/new"
        },
        "journeys": [
          "observe",
          "create"
        ],
        "related": [
          "dashboard",
          "scenes",
          "sheds",
          "foragecast",
          "waypoint-volunteer"
        ]
      },
      {
        "id": "steepleaf",
        "title": "Steepleaf",
        "shortTitle": "Steepleaf",
        "icon": "steepleaf",
        "route": "apps/steepleaf/",
        "match": [
          "/apps/steepleaf"
        ],
        "category": "outdoor",
        "description": "Tea companion — today’s brew, private collection, sessions, and knowledge graph.",
        "status": "active",
        "features": [
          {
            "id": "home",
            "label": "Home",
            "href": "apps/steepleaf/#home"
          },
          {
            "id": "brew",
            "label": "Today's Brew",
            "href": "apps/steepleaf/#brew"
          },
          {
            "id": "collection",
            "label": "My Collection",
            "href": "apps/steepleaf/#collection"
          },
          {
            "id": "sessions",
            "label": "Sessions",
            "href": "apps/steepleaf/#sessions"
          },
          {
            "id": "journal",
            "label": "Journal",
            "href": "apps/steepleaf/#journal"
          },
          {
            "id": "learning",
            "label": "Learning",
            "href": "apps/steepleaf/#learning"
          },
          {
            "id": "explore",
            "label": "Knowledge graph",
            "href": "apps/steepleaf/explore/"
          },
          {
            "id": "settings",
            "label": "Settings",
            "href": "apps/steepleaf/#settings"
          }
        ],
        "purpose": "Private tea companion — today’s brew, collection, sessions, and calm tasting notes.",
        "maturity": "Early access",
        "startHere": {
          "label": "Open today’s brew",
          "href": "apps/steepleaf/#brew"
        },
        "journeys": [
          "observe",
          "understand",
          "create"
        ],
        "related": [
          "savant-sommelier"
        ]
      },
      {
        "id": "signalterrain",
        "title": "SignalTerrain",
        "shortTitle": "SignalTerrain",
        "icon": "signalterrain",
        "route": "apps/signalterrain/",
        "match": [
          "/apps/signalterrain"
        ],
        "category": "intelligence",
        "description": "Radio & Spectrum Intelligence and educational Cyber Awareness — observe and understand signals without offense.",
        "status": "foundation",
        "features": [
          {
            "id": "overview",
            "label": "Overview",
            "href": "apps/signalterrain/"
          },
          {
            "id": "topics",
            "label": "Topics",
            "href": "apps/signalterrain/topics.html"
          },
          {
            "id": "graph",
            "label": "Knowledge graph",
            "href": "apps/signalterrain/graph.html"
          },
          {
            "id": "summary",
            "label": "Intelligence summary",
            "href": "apps/signalterrain/summary.html"
          },
          {
            "id": "cyber",
            "label": "Cyber Awareness",
            "href": "apps/signalterrain/cyber/"
          },
          {
            "id": "cyber-brief",
            "label": "Daily cyber brief",
            "href": "apps/signalterrain/cyber/brief.html"
          },
          {
            "id": "cyber-explorer",
            "label": "Cyber intelligence explorer",
            "href": "apps/signalterrain/cyber/explorer.html"
          },
          {
            "id": "cyber-advisor",
            "label": "Adaptive defense advisor",
            "href": "apps/signalterrain/cyber/advisor.html"
          },
          {
            "id": "cyber-knowledge",
            "label": "Defensive knowledge",
            "href": "apps/signalterrain/cyber/knowledge.html"
          },
          {
            "id": "cyber-ingest-health",
            "label": "Cyber ingest (internal)",
            "href": "apps/signalterrain/cyber/ingest-health.html"
          }
        ],
        "purpose": "Observe and understand radio spectrum and educational cyber signals without offense or hype.",
        "maturity": "Foundation",
        "startHere": {
          "label": "Open today’s cyber brief",
          "href": "apps/signalterrain/cyber/live.html#brief"
        },
        "journeys": [
          "observe",
          "understand"
        ],
        "related": [
          "dashboard"
        ]
      },
      {
        "id": "savant-sommelier",
        "title": "Savant Sommelier",
        "shortTitle": "Savant",
        "icon": "savant",
        "route": "apps/savant-sommelier/",
        "match": [
          "/apps/savant-sommelier"
        ],
        "category": "lifestyle",
        "description": "Wine intelligence — discover, learn, cellar, and vineyard suitability with explanations.",
        "status": "active",
        "features": [
          {
            "id": "discover",
            "label": "Discover",
            "href": "apps/savant-sommelier/",
            "match": [
              "/apps/savant-sommelier/?$",
              "/apps/savant-sommelier/index"
            ]
          },
          {
            "id": "learn",
            "label": "Learn",
            "href": "apps/savant-sommelier/learn.html"
          },
          {
            "id": "cellar",
            "label": "My Cellar",
            "href": "apps/savant-sommelier/cellar.html"
          },
          {
            "id": "vineyard",
            "label": "Vineyard Intelligence",
            "href": "apps/savant-sommelier/vineyard.html"
          },
          {
            "id": "settings",
            "label": "Settings",
            "href": "apps/savant-sommelier/settings.html"
          }
        ],
        "purpose": "Wine-through-place literacy — discover, learn, cellar, and vineyard context with explanations.",
        "maturity": "Early access",
        "startHere": {
          "label": "Discover wines",
          "href": "apps/savant-sommelier/"
        },
        "journeys": [
          "observe",
          "understand",
          "create"
        ],
        "related": [
          "steepleaf",
          "dashboard"
        ]
      },
      {
        "id": "waypoint-volunteer",
        "title": "Waypoint Volunteer",
        "shortTitle": "Volunteer",
        "icon": "volunteer",
        "route": "apps/waypoint-volunteer/",
        "match": [
          "/apps/waypoint-volunteer"
        ],
        "category": "outdoor",
        "description": "Free primary product — What good can I do today? Nearby outdoor stewardship without management software.",
        "status": "live",
        "features": [
          {
            "id": "discover",
            "label": "What good today?",
            "href": "apps/waypoint-volunteer/discover.html"
          },
          {
            "id": "saved",
            "label": "Nearby saved",
            "href": "apps/waypoint-volunteer/saved/"
          },
          {
            "id": "overview",
            "label": "About Volunteer",
            "href": "apps/waypoint-volunteer/?about=1"
          },
          {
            "id": "impact",
            "label": "My impact",
            "href": "apps/waypoint-volunteer/impact/"
          },
          {
            "id": "profile",
            "label": "My interests",
            "href": "apps/waypoint-volunteer/profile/"
          }
        ],
        "purpose": "What good can I do today? — nearby outdoor stewardship without management software.",
        "maturity": "Free",
        "startHere": {
          "label": "What good can I do today?",
          "href": "apps/waypoint-volunteer/discover.html"
        },
        "journeys": [
          "observe",
          "understand",
          "share"
        ],
        "related": [
          "fieldry",
          "landscape-interpretation",
          "dashboard"
        ]
      },
      {
        "id": "landscape-interpretation",
        "title": "Landscape Interpretation",
        "shortTitle": "Landscape",
        "icon": "terrain",
        "route": "apps/landscape-interpretation/",
        "match": [
          "/apps/landscape-interpretation"
        ],
        "category": "outdoor",
        "description": "Why does this place look the way it does? — educational landscape stories from field clues.",
        "status": "experimental",
        "purpose": "Read why a place looks the way it does from field clues — ecology, geology, and land use.",
        "maturity": "Experimental",
        "startHere": {
          "label": "Open field reader",
          "href": "apps/landscape-interpretation/"
        },
        "journeys": [
          "observe",
          "understand"
        ],
        "related": [
          "dashboard",
          "fieldry",
          "foragecast",
          "waypoint-volunteer"
        ],
        "features": [
          {
            "id": "field",
            "label": "Field reader",
            "href": "apps/landscape-interpretation/"
          },
          {
            "id": "learn",
            "label": "Learn",
            "href": "apps/landscape-interpretation/learn.html"
          }
        ]
      }
    ],
    "journeys": [
      {
        "id": "observe",
        "label": "Observe",
        "blurb": "See what is happening outdoors — conditions, light, wildlife sign, and stewardship opportunities."
      },
      {
        "id": "discover",
        "label": "Discover",
        "blurb": "Find places, photographs, and ways to care for the natural world."
      },
      {
        "id": "understand",
        "label": "Understand",
        "blurb": "Learn why it matters — calm explanations with uncertainty labeled, never hype."
      }
    ],
    "mission": {
      "lines": ["Observe.", "Discover.", "Understand."],
      "tagline": "Capture what you find. Learn why it matters."
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
