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
      "description": "Tea discovery \u2014 catalog, brew journal, and sensory notes.",
      "status": "foundation",
      "features": [
        {
          "id": "overview",
          "label": "Overview",
          "href": "apps/steepleaf/"
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
      "description": "Observatory for invisible environments \u2014 RF foundations; educational cyber awareness planned.",
      "status": "foundation",
      "features": [
        {
          "id": "overview",
          "label": "Overview",
          "href": "apps/signalterrain/"
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
    }
  ]
};
})(typeof window !== "undefined" ? window : globalThis);
