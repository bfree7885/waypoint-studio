/**
 * Waypoint Scenes — Portfolio Website Output · Catalog
 * Layouts, appearance defaults, metadata visibility presets.
 * Limited customization — not a full website builder.
 */
(function (global) {
  "use strict";

  var EXPORT_VERSION = "1.0.0";
  var SCHEMA_VERSION = "1.0.0";

  var LAYOUTS = [
    {
      id: "editorial",
      label: "Editorial sequence",
      summary:
        "Honors order with a clear opening and closing. Captions and roles sit with each frame — suited to stories and journals."
    },
    {
      id: "grid",
      label: "Clean grid",
      summary:
        "Responsive grid with optional titles and a focused viewer. Calm presentation for general portfolios."
    },
    {
      id: "showcase",
      label: "Full-width showcase",
      summary:
        "Large images, minimal chrome, cover as hero. Best when photographs should lead."
    }
  ];

  var THEMES = [
    { id: "dark", label: "Dark (charcoal / slate)" },
    { id: "light", label: "Light (off-white)" }
  ];

  var DEFAULT_METADATA_VISIBILITY = {
    captureDate: false,
    locationBroad: false,
    locationPrecise: false,
    camera: false,
    lens: false,
    focalLength: false
  };

  var DEFAULT_APPEARANCE = {
    theme: "dark",
    spacing: "comfortable",
    gridDensity: "regular",
    imageFit: "contain",
    captionVisibility: "always",
    titleAlignment: "left",
    coverDisplay: "hero",
    maxContentWidth: "medium"
  };

  /** Soft size guidance — not a hard product limit. */
  var SIZE_GUIDANCE = {
    softMaxImages: 80,
    warnApproxBytes: 40 * 1024 * 1024,
    blockApproxBytes: 180 * 1024 * 1024
  };

  function layoutById(id) {
    for (var i = 0; i < LAYOUTS.length; i++) {
      if (LAYOUTS[i].id === id) return LAYOUTS[i];
    }
    return LAYOUTS[0];
  }

  global.WaypointScenesPortfolioOutputCatalog = {
    EXPORT_VERSION: EXPORT_VERSION,
    SCHEMA_VERSION: SCHEMA_VERSION,
    LAYOUTS: LAYOUTS,
    THEMES: THEMES,
    DEFAULT_METADATA_VISIBILITY: DEFAULT_METADATA_VISIBILITY,
    DEFAULT_APPEARANCE: DEFAULT_APPEARANCE,
    SIZE_GUIDANCE: SIZE_GUIDANCE,
    layoutById: layoutById
  };
})(typeof window !== "undefined" ? window : globalThis);
