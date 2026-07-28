(function (global) {
  "use strict";

  var PRESETS = [
    {
      id: "gentle-drift",
      name: "Gentle Drift",
      description: "Barely-there motion at rest.",
      zoom: 26,
      strength: 20,
      smoothing: 78,
      sensitivity: 28,
      depthStrength: 40,
      autoDrift: true
    },
    {
      id: "deep-forest",
      name: "Deep Forest",
      description: "Rich separation between canopy layers.",
      zoom: 34,
      strength: 26,
      smoothing: 70,
      sensitivity: 32,
      depthStrength: 72,
      autoDrift: true
    },
    {
      id: "mountain-vista",
      name: "Mountain Vista",
      description: "Wide framing, slow horizon drift.",
      zoom: 42,
      strength: 24,
      smoothing: 74,
      sensitivity: 30,
      depthStrength: 58,
      autoDrift: true
    },
    {
      id: "water-reflection",
      name: "Water Reflection",
      description: "Ultra-smooth, like a still lake.",
      zoom: 30,
      strength: 18,
      smoothing: 82,
      sensitivity: 24,
      depthStrength: 48,
      autoDrift: true
    },
    {
      id: "cinematic-push",
      name: "Cinematic Push",
      description: "A quiet forward pull.",
      zoom: 38,
      strength: 32,
      smoothing: 62,
      sensitivity: 38,
      depthStrength: 55,
      autoDrift: false
    }
  ];

  function all() {
    return PRESETS.slice();
  }

  function get(id) {
    return PRESETS.find(function (p) {
      return p.id === id;
    }) || null;
  }

  global.WaypointParallaxPresets = {
    all: all,
    get: get
  };
})(window);
