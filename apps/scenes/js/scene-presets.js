(function (global) {
  "use strict";

  var MODULE_IDS = [
    "fog",
    "rain",
    "snow",
    "fireflies",
    "cloudDrift",
    "lightRays",
    "dustParticles",
    "leafDrift"
  ];

  var DEFAULT_CAMERA = {
    zoomAmount: 36,
    horizontalDrift: 26,
    verticalDrift: 16,
    rotation: 7
  };

  /** Baseline slider values for disabled overlays. */
  function off(overrides) {
    var base = {
      enabled: false,
      intensity: 18,
      speed: 20,
      opacity: 12,
      scale: 28,
      randomness: 15
    };
    if (overrides) {
      var key;
      for (key in overrides) {
        if (Object.prototype.hasOwnProperty.call(overrides, key)) base[key] = overrides[key];
      }
    }
    return base;
  }

  /** Enabled overlay with explicit studio slider values. */
  function on(values) {
    return Object.assign(
      {
        enabled: true,
        intensity: 50,
        speed: 45,
        opacity: 50,
        scale: 50,
        randomness: 35
      },
      values
    );
  }

  function buildPreset(id, name, description, camera, active) {
    var effects = {};
    var i;
    for (i = 0; i < MODULE_IDS.length; i++) {
      effects[MODULE_IDS[i]] = off();
    }
    var key;
    for (key in active) {
      if (Object.prototype.hasOwnProperty.call(active, key)) {
        effects[key] = on(active[key]);
      }
    }
    return {
      id: id,
      name: name,
      description: description,
      camera: Object.assign({}, DEFAULT_CAMERA, camera),
      effects: effects
    };
  }

  global.WaypointScenePresets = {
    MODULE_IDS: MODULE_IDS,
    DEFAULT_CAMERA: DEFAULT_CAMERA,
    all: function () {
      return [
        buildPreset(
          "morning-mist",
          "Morning Mist",
          "Soft dawn haze — quiet, pale, unhurried.",
          { zoomAmount: 38, horizontalDrift: 22, verticalDrift: 14, rotation: 6 },
          {
            fog: { intensity: 58, speed: 18, opacity: 42, scale: 62, randomness: 28 },
            lightRays: { intensity: 32, speed: 15, opacity: 28, scale: 48, randomness: 20 },
            dustParticles: { intensity: 28, speed: 12, opacity: 22, scale: 38, randomness: 40 }
          }
        ),
        buildPreset(
          "dense-fog",
          "Dense Fog",
          "Thick mist — visibility fades, the world feels close.",
          { zoomAmount: 28, horizontalDrift: 18, verticalDrift: 10, rotation: 4 },
          {
            fog: { intensity: 88, speed: 12, opacity: 72, scale: 78, randomness: 22 },
            cloudDrift: { intensity: 52, speed: 16, opacity: 38, scale: 65, randomness: 30 }
          }
        ),
        buildPreset(
          "golden-hour",
          "Golden Hour",
          "Warm low sun, dust motes, and gentle rays.",
          { zoomAmount: 52, horizontalDrift: 28, verticalDrift: 18, rotation: 8 },
          {
            lightRays: { intensity: 62, speed: 20, opacity: 48, scale: 58, randomness: 25 },
            dustParticles: { intensity: 55, speed: 18, opacity: 45, scale: 42, randomness: 50 },
            fog: { intensity: 22, speed: 14, opacity: 18, scale: 40, randomness: 20 }
          }
        ),
        buildPreset(
          "blue-hour",
          "Blue Hour",
          "Cool twilight — soft fog and slow drift.",
          { zoomAmount: 42, horizontalDrift: 32, verticalDrift: 22, rotation: 10 },
          {
            fog: { intensity: 45, speed: 16, opacity: 38, scale: 55, randomness: 32 },
            lightRays: { intensity: 25, speed: 12, opacity: 22, scale: 45, randomness: 18 },
            dustParticles: { intensity: 20, speed: 10, opacity: 15, scale: 35, randomness: 25 }
          }
        ),
        buildPreset(
          "thunderstorm",
          "Thunderstorm",
          "Heavy rain, rolling clouds, and brooding fog.",
          { zoomAmount: 22, horizontalDrift: 58, verticalDrift: 38, rotation: 20 },
          {
            rain: { intensity: 85, speed: 78, opacity: 62, scale: 52, randomness: 55 },
            fog: { intensity: 55, speed: 35, opacity: 48, scale: 60, randomness: 45 },
            cloudDrift: { intensity: 68, speed: 42, opacity: 45, scale: 58, randomness: 50 }
          }
        ),
        buildPreset(
          "winter-stillness",
          "Winter Stillness",
          "Gentle snowfall over a hushed landscape.",
          { zoomAmount: 35, horizontalDrift: 24, verticalDrift: 16, rotation: 5 },
          {
            snow: { intensity: 72, speed: 28, opacity: 58, scale: 48, randomness: 42 },
            fog: { intensity: 38, speed: 14, opacity: 32, scale: 52, randomness: 28 }
          }
        ),
        buildPreset(
          "spring-rain",
          "Spring Rain",
          "Light rain, fresh mist, drifting leaves.",
          { zoomAmount: 40, horizontalDrift: 30, verticalDrift: 20, rotation: 9 },
          {
            rain: { intensity: 48, speed: 42, opacity: 40, scale: 40, randomness: 38 },
            fog: { intensity: 35, speed: 22, opacity: 30, scale: 48, randomness: 35 },
            leafDrift: { intensity: 32, speed: 35, opacity: 38, scale: 45, randomness: 55 }
          }
        ),
        buildPreset(
          "firefly-evening",
          "Firefly Evening",
          "Warm dusk with fireflies in the meadow.",
          { zoomAmount: 48, horizontalDrift: 36, verticalDrift: 26, rotation: 11 },
          {
            fireflies: { intensity: 58, speed: 28, opacity: 62, scale: 48, randomness: 52 },
            fog: { intensity: 18, speed: 12, opacity: 14, scale: 38, randomness: 22 }
          }
        ),
        buildPreset(
          "mountain-wind",
          "Mountain Wind",
          "Clouds and leaves in alpine air.",
          { zoomAmount: 44, horizontalDrift: 62, verticalDrift: 28, rotation: 16 },
          {
            cloudDrift: { intensity: 70, speed: 55, opacity: 42, scale: 62, randomness: 48 },
            leafDrift: { intensity: 45, speed: 58, opacity: 42, scale: 52, randomness: 62 },
            dustParticles: { intensity: 38, speed: 48, opacity: 32, scale: 40, randomness: 55 }
          }
        ),
        buildPreset(
          "still-lake",
          "Still Lake",
          "Mirror water, breath-fog, absolute calm.",
          { zoomAmount: 32, horizontalDrift: 12, verticalDrift: 8, rotation: 3 },
          {
            fog: { intensity: 28, speed: 8, opacity: 22, scale: 42, randomness: 15 },
            dustParticles: { intensity: 15, speed: 8, opacity: 12, scale: 32, randomness: 18 },
            lightRays: { intensity: 20, speed: 10, opacity: 16, scale: 38, randomness: 12 }
          }
        ),
        buildPreset(
          "rippling-water",
          "Rippling Water",
          "Gentle surface shimmer with soft light.",
          { zoomAmount: 36, horizontalDrift: 42, verticalDrift: 16, rotation: 7 },
          {
            fog: { intensity: 30, speed: 18, opacity: 24, scale: 46, randomness: 28 },
            cloudDrift: { intensity: 32, speed: 28, opacity: 26, scale: 44, randomness: 32 },
            lightRays: { intensity: 34, speed: 18, opacity: 28, scale: 42, randomness: 22 },
            dustParticles: { intensity: 24, speed: 16, opacity: 20, scale: 36, randomness: 35 }
          }
        )
      ];
    }
  };
})(window);
