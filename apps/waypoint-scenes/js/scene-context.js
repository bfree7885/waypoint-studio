/**
 * Scene Builder context — architecture for future scene capabilities.
 * Registers capability slots; does not fake implementations.
 */
(function (global) {
  "use strict";

  var CAPABILITIES = {
    "living-scene-2d": { status: "live", label: "Living Scene (2D)", trust: "Live" },
    parallax: { status: "live", label: "Parallax depth", trust: "Live" },
    "animated-water": { status: "partial", label: "Animated water", trust: "Estimated", note: "Canvas overlay — not fluid simulation" },
    "animated-clouds": { status: "partial", label: "Animated clouds", trust: "Estimated", note: "Drift effect module" },
    "wind-grass": { status: "partial", label: "Moving grass / leaves", trust: "Estimated", note: "Leaf drift effect" },
    "weather-aware": { status: "pending", label: "Weather-aware scenes", trust: "Not available" },
    "time-of-day": { status: "pending", label: "Time-of-day lighting", trust: "Not available" },
    "3d-outdoor": { status: "pending", label: "3D outdoor environments", trust: "Not available" },
    "desktop-wallpaper": { status: "pending", label: "Desktop wallpaper export", trust: "Not available" },
    "mobile-wallpaper": { status: "pending", label: "Mobile wallpaper export", trust: "Not available" },
    "cinematic-loop": { status: "pending", label: "Cinematic loop export", trust: "Not available" },
    vr: { status: "pending", label: "VR support", trust: "Not available" }
  };

  function createContext(options) {
    options = options || {};
    return {
      version: "1.0.0",
      imageUrl: options.imageUrl || null,
      imageName: options.imageName || null,
      exif: options.exif || null,
      analyzer: options.analyzer || null,
      critique: options.critique || null,
      weather: options.weather || null,
      capabilities: Object.assign({}, CAPABILITIES),
      exportTargets: {
        png: { status: "live", width: null, height: null },
        mp4: { status: "pending" },
        livePhoto: { status: "pending" },
        wallpaperDesktop: { status: "pending", sizes: ["1920x1080", "2560x1440", "3840x2160"] },
        wallpaperMobile: { status: "pending", sizes: ["1170x2532", "1080x2400"] }
      }
    };
  }

  function listCapabilities() {
    return Object.keys(CAPABILITIES).map(function (k) {
      return Object.assign({ id: k }, CAPABILITIES[k]);
    });
  }

  var activeContext = null;

  function setActive(ctx) {
    activeContext = ctx || null;
    return activeContext;
  }

  function getActive() {
    return activeContext;
  }

  global.WaypointSceneContext = {
    CAPABILITIES: CAPABILITIES,
    createContext: createContext,
    listCapabilities: listCapabilities,
    setActive: setActive,
    getActive: getActive
  };
})(window);
