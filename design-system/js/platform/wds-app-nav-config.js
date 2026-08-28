/**
 * Waypoint Studio — App navigation config (embedded from nav-registry.json)
 * Edit design-system/ecosystem/nav-registry.json, then regenerate or keep in sync.
 */
(function (global) {
  "use strict";
  global.WDS = global.WDS || {};
  global.WDS.APP_NAV_CONFIG = {
  "version": "3.0.0",
  "brand": {
    "name": "Waypoint Studio",
    "homeRoute": "./"
  },
  "studioPrimaryNav": [
    {
      "id": "dashboard",
      "label": "Dashboard",
      "href": "/apps/dashboard/",
      "hint": "What’s happening outside today"
    },
    {
      "id": "scenes",
      "label": "Scenes",
      "href": "/apps/scenes/",
      "hint": "Explore and understand what you see"
    },
    {
      "id": "sheds",
      "label": "Sheds",
      "href": "/apps/shed-hunting/map/",
      "hint": "Map-first shed hunting"
    },
    {
      "id": "deck",
      "label": "Deck",
      "href": "/side-trails/waypoint-deck/",
      "hint": "Offline field computing"
    },
    {
      "id": "articles",
      "label": "Articles",
      "href": "/articles/",
      "hint": "Stories and field reading"
    },
    {
      "id": "support",
      "label": "Support",
      "href": "/support.html",
      "hint": "Help and honest answers"
    },
    {
      "id": "about",
      "label": "About",
      "href": "/about.html",
      "hint": "Studio mission"
    }
  ],
  "architectureNavLabels": [
    "Dashboard",
    "Scenes",
    "Sheds",
    "Deck",
    "Articles",
    "Support",
    "About"
  ],
  "homePrimary": [
    "dashboard",
    "scenes",
    "sheds"
  ],
  "homeIncubator": [],
  "homeSideTrails": [],
  "homeSupporting": [],
  "homePaused": [],
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
      "label": "Reading the land"
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
      "description": "Customizable outdoor workspace — Today Outside summary plus instruments you choose.",
      "status": "live",
      "features": [
        {
          "id": "workspace",
          "label": "Workspace",
          "href": "apps/dashboard/",
          "hash": "#/",
          "match": [
            "/apps/dashboard/?$",
            "/apps/dashboard/index"
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
      "purpose": "Assemble your view of conditions near you; glance Today Outside; go deeper when you choose.",
      "maturity": "Live",
      "startHere": {
        "label": "Open Dashboard",
        "href": "apps/dashboard/"
      },
      "journeys": [
        "observe",
        "understand"
      ],
      "related": [
        "scenes",
        "sheds"
      ],
      "publicSurface": true
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
        "/apps/photo-library",
        "/apps/auto-edit",
        "/apps/moving-scenes"
      ],
      "category": "photography",
      "description": "One photography platform — Photo Coach, Auto Edit, Moving Scenes, Hidden Landscapes, Scene Builder, Photographer Profile, and Photo Library.",
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
          "href": "apps/photo-library/",
          "match": [
            "/apps/scenes/photo-library",
            "/apps/photo-library"
          ]
        },
        {
          "id": "photo-coach",
          "label": "Photo Coach",
          "href": "apps/photo-coach/",
          "match": [
            "/apps/scenes/photo-coach",
            "/apps/photo-coach/?$",
            "/apps/photo-coach/index"
          ]
        },
        {
          "id": "auto-edit",
          "label": "Auto Edit",
          "href": "apps/auto-edit/",
          "match": [
            "/apps/scenes/auto-edit",
            "/apps/auto-edit"
          ]
        },
        {
          "id": "hidden-landscapes",
          "label": "Hidden Landscapes",
          "href": "apps/hidden-landscapes/",
          "match": [
            "/apps/scenes/hidden-landscapes",
            "/apps/hidden-landscapes",
            "/apps/animal-vision"
          ]
        },
        {
          "id": "living-scenes",
          "label": "Moving Scenes",
          "href": "apps/moving-scenes/",
          "match": [
            "/apps/scenes/living-scenes",
            "/apps/scenes/moving-scenes",
            "/apps/moving-scenes"
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
      ],
      "purpose": "One photography platform for careful looking, craft feedback, and quieter visual growth.",
      "maturity": "Live",
      "startHere": {
        "label": "Open Photo Coach",
        "href": "apps/photo-coach/"
      },
      "journeys": [
        "observe",
        "understand",
        "create",
        "share"
      ],
      "related": [
        "dashboard"
      ],
      "publicSurface": true
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
      ],
      "purpose": "Private antler-shed field craft — sign, seasonality, and finds without trophy culture.",
      "maturity": "Foundation",
      "startHere": {
        "label": "Open field map",
        "href": "apps/shed-hunting/map/"
      },
      "journeys": [
        "observe",
        "understand"
      ],
      "related": [
        "dashboard"
      ],
      "publicSurface": true
    },
    {
      "id": "waypoint-deck",
      "title": "Waypoint Deck",
      "shortTitle": "Deck",
      "icon": "deck",
      "route": "side-trails/waypoint-deck/",
      "match": [
        "/side-trails/waypoint-deck"
      ],
      "category": "outdoor",
      "description": "Offline-first Linux field computer — local maps, knowledge, and field tools when the network is optional.",
      "status": "in-development",
      "features": [
        {
          "id": "overview",
          "label": "Overview",
          "href": "side-trails/waypoint-deck/"
        }
      ],
      "purpose": "A local-first field computer, distinct from Waypoint Studio’s web apps.",
      "maturity": "In development",
      "startHere": {
        "label": "Read Waypoint Deck",
        "href": "side-trails/waypoint-deck/"
      },
      "journeys": [
        "observe",
        "understand"
      ],
      "related": [
        "dashboard",
        "scenes",
        "sheds"
      ],
      "publicSurface": true
    }
  ],
  "journeys": [
    {
      "id": "observe",
      "label": "Observe",
      "blurb": "See what is happening — weather, seasons, wildlife sign, light, community needs, and invisible environments."
    },
    {
      "id": "understand",
      "label": "Understand",
      "blurb": "Learn why it matters — calm explanations with uncertainty labeled, never hype."
    },
    {
      "id": "create",
      "label": "Create",
      "blurb": "Optional making — photography craft, journals, and personal collections without competition."
    },
    {
      "id": "share",
      "label": "Share",
      "blurb": "Intentional sharing only — exports and contributions you choose, never engagement traps."
    }
  ],
  "homeDeck": [
    "waypoint-deck"
  ],
  "publicAppIds": [
    "dashboard",
    "scenes",
    "sheds",
    "waypoint-deck"
  ]
};
})(typeof window !== "undefined" ? window : globalThis);
