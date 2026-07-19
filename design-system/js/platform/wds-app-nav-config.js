/**
 * Waypoint Studio — App navigation config (embedded from nav-registry.json)
 * Edit design-system/ecosystem/nav-registry.json, then regenerate or keep in sync.
 */
(function (global) {
  "use strict";
  global.WDS = global.WDS || {};
  global.WDS.APP_NAV_CONFIG = {
  "version": "2.0.0",
  "brand": {
    "name": "Waypoint Studio",
    "homeRoute": "./"
  },
  "categories": [
    {
      "id": "core",
      "label": "Core"
    },
    {
      "id": "photography",
      "label": "Photography"
    },
    {
      "id": "outdoor",
      "label": "Outdoor"
    },
    {
      "id": "intelligence",
      "label": "Intelligence"
    },
    {
      "id": "lifestyle",
      "label": "Lifestyle"
    }
  ],
  "apps": [
    {
      "id": "dashboard",
      "title": "Dashboard",
      "shortTitle": "Dashboard",
      "icon": "dashboard",
      "route": "apps/dashboard/",
      "match": [
        "/apps/dashboard"
      ],
      "category": "core",
      "description": "Weather, light, trails, and outdoor conditions for your region.",
      "status": "live",
      "features": [
        {
          "id": "today",
          "label": "Today",
          "href": "#outdoor-dashboard"
        },
        {
          "id": "conditions",
          "label": "Conditions",
          "href": "#wdb-section-conditions"
        },
        {
          "id": "sun-moon",
          "label": "Sun & Moon",
          "href": "#wdb-section-sun-moon"
        },
        {
          "id": "safety",
          "label": "Safety",
          "href": "#wdb-section-safety"
        },
        {
          "id": "water",
          "label": "Water",
          "href": "#wdb-section-water"
        },
        {
          "id": "photography",
          "label": "Photography",
          "href": "#wdb-section-photography"
        }
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
      "description": "One photography platform \u2014 Photo Coach, Hidden Landscapes, Living Scenes, Scene Builder, Photographer Profile, and Photo Library.",
      "status": "live",
      "features": [
        {
          "id": "overview",
          "label": "Overview",
          "href": "apps/scenes/",
          "match": [
            "/apps/scenes/?$",
            "/apps/scenes/index"
          ]
        },
        {
          "id": "photo-library",
          "label": "Library",
          "href": "apps/scenes/photo-library/",
          "match": [
            "/apps/scenes/photo-library",
            "/apps/photo-library"
          ]
        },
        {
          "id": "photo-coach",
          "label": "Photo Coach",
          "href": "apps/scenes/photo-coach/",
          "match": [
            "/apps/scenes/photo-coach",
            "/apps/photo-coach/?$",
            "/apps/photo-coach/index"
          ]
        },
        {
          "id": "hidden-landscapes",
          "label": "Hidden Landscapes",
          "href": "apps/scenes/hidden-landscapes/",
          "match": [
            "/apps/scenes/hidden-landscapes",
            "/apps/hidden-landscapes",
            "/apps/animal-vision"
          ]
        },
        {
          "id": "living-scenes",
          "label": "Living Scenes",
          "href": "apps/scenes/living-scenes/",
          "match": [
            "/apps/scenes/living-scenes"
          ]
        },
        {
          "id": "scene-builder",
          "label": "Scene Builder",
          "href": "apps/scenes/scene-builder/",
          "match": [
            "/apps/scenes/scene-builder",
            "/apps/waypoint-scenes"
          ]
        },
        {
          "id": "photographer-profile",
          "label": "Profile",
          "href": "apps/scenes/photographer-profile/",
          "match": [
            "/apps/scenes/photographer-profile",
            "/apps/photo-coach/profile"
          ]
        },
        {
          "id": "guide",
          "label": "Field guide",
          "href": "apps/photo-coach/guide/",
          "match": [
            "/apps/photo-coach/guide"
          ]
        }
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
      "description": "Wildlife sign, seasonality, and private finds without trophy culture.",
      "status": "foundation",
      "features": [
        {
          "id": "overview",
          "label": "Overview",
          "href": "apps/shed-hunting/"
        }
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
      "description": "Seasonal land companion \u2014 what to find and what to do today across foraging, orchard, garden, and land care.",
      "status": "live",
      "features": [
        {
          "id": "today",
          "label": "Today",
          "href": "apps/foragecast/",
          "match": [
            "/apps/foragecast/?$",
            "/apps/foragecast/index"
          ]
        },
        {
          "id": "foraging",
          "label": "Foraging",
          "href": "apps/foragecast/foraging.html",
          "match": [
            "foraging.html"
          ]
        },
        {
          "id": "orchard",
          "label": "Orchard",
          "href": "apps/foragecast/pillar.html?id=orchard",
          "match": [
            "pillar.html\\?id=orchard"
          ]
        },
        {
          "id": "garden",
          "label": "Garden",
          "href": "apps/foragecast/pillar.html?id=garden",
          "match": [
            "pillar.html\\?id=garden"
          ]
        },
        {
          "id": "food-forest",
          "label": "Food forest",
          "href": "apps/foragecast/pillar.html?id=food-forest",
          "match": [
            "food-forest"
          ]
        },
        {
          "id": "permaculture",
          "label": "Permaculture",
          "href": "apps/foragecast/pillar.html?id=permaculture",
          "match": [
            "permaculture"
          ]
        },
        {
          "id": "property",
          "label": "Property",
          "href": "apps/foragecast/property.html",
          "match": [
            "property.html"
          ]
        },
        {
          "id": "season-table",
          "label": "Season table",
          "href": "apps/foragecast/season-table.html",
          "match": [
            "season-table"
          ]
        }
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
      "description": "Global tea knowledge graph — interconnected education, discovery, and explainable recommendations.",
      "status": "knowledge-graph",
      "features": [
        {
          "id": "overview",
          "label": "Overview",
          "href": "apps/steepleaf/"
        },
        {
          "id": "explore",
          "label": "Explore graph",
          "href": "apps/steepleaf/explore/"
        },
        {
          "id": "entity",
          "label": "Entity pages",
          "href": "apps/steepleaf/entity/?id=stl_tea-longjing-shifeng"
        }
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
          "label": "Cyber intelligence",
          "href": "apps/signalterrain/cyber/live.html"
        },
        {
          "id": "cyber-workspace",
          "label": "Cyber workspace",
          "href": "apps/signalterrain/cyber/workspace.html"
        },
        {
          "id": "cyber-teaching",
          "label": "Cyber teaching (samples)",
          "href": "apps/signalterrain/cyber/teaching.html"
        },
        {
          "id": "cyber-brief",
          "label": "Cyber brief demo (samples)",
          "href": "apps/signalterrain/cyber/brief.html"
        },
        {
          "id": "cyber-explorer",
          "label": "Cyber explorer (samples)",
          "href": "apps/signalterrain/cyber/explorer.html"
        },
        {
          "id": "cyber-advisor",
          "label": "Cyber advisor (samples)",
          "href": "apps/signalterrain/cyber/advisor.html"
        },
        {
          "id": "cyber-knowledge",
          "label": "Cyber knowledge (samples)",
          "href": "apps/signalterrain/cyber/knowledge.html"
        },
        {
          "id": "cyber-ingest-health",
          "label": "Cyber ingest (internal)",
          "href": "apps/signalterrain/cyber/ingest-health.html"
        }
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
      "description": "Vineyard intelligence \u2014 terrain, climate, and wine landscape literacy.",
      "status": "foundation",
      "features": [
        {
          "id": "overview",
          "label": "Overview",
          "href": "apps/savant-sommelier/"
        }
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
      "description": "What good can I do today? — discover community opportunities without gamification.",
      "status": "foundation",
      "features": [
        {
          "id": "overview",
          "label": "Overview",
          "href": "apps/waypoint-volunteer/"
        },
        {
          "id": "discover",
          "label": "Discover",
          "href": "apps/waypoint-volunteer/discover.html"
        },
        {
          "id": "saved",
          "label": "Saved",
          "href": "apps/waypoint-volunteer/saved/"
        },
        {
          "id": "profile",
          "label": "Profile",
          "href": "apps/waypoint-volunteer/profile/"
        },
        {
          "id": "impact",
          "label": "Impact",
          "href": "apps/waypoint-volunteer/impact/"
        }
      ]
    }
  ]
};
})(typeof window !== "undefined" ? window : globalThis);
