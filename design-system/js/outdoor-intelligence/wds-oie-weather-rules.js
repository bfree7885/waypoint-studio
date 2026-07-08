/**
 * OIE weather reasoning rules — modular, readable, never invent facts.
 */
(function (global) {
  "use strict";

  var C = global.WDS && global.WDS.oieCore;
  if (!C) return;
  var b = C.block;

  function rules() {
    var R = [];

    R.push({
      id: "humidity-very-high",
      category: "weather",
      tags: ["humidity", "fog"],
      when: function (c) { return c.humidity != null && c.humidity >= 85; },
      block: function (c) {
        return b({
          what: "High overnight humidity (" + Math.round(c.humidity) + "%) increases the chance of morning fog in low-lying valleys.",
          why: "When air nears saturation, water vapor condenses on cool surfaces — valleys and water bodies cool fastest.",
          whyItMatters: "Fog reshapes visibility, wildlife movement, and photography light within hours of sunrise.",
          whatToDo: "Plan dawn walks in valleys before fog lifts; carry a layer for damp air.",
          whatToLookFor: "Mist along creeks, soft light on spider webs, reduced bird song until sun breaks through.",
          trust: "Live",
          source: "Open-Meteo humidity"
        });
      }
    });

    R.push({
      id: "humidity-high",
      category: "weather",
      tags: ["humidity", "comfort"],
      when: function (c) { return c.humidity != null && c.humidity >= 70 && c.humidity < 85; },
      block: function () {
        return b({
          what: "Elevated humidity makes air feel heavier and slows evaporative cooling.",
          why: "Sweat evaporates more slowly when the air already holds moisture.",
          whyItMatters: "Perceived exertion rises on humid hikes — pacing matters more than temperature alone suggests.",
          whatToDo: "Slow pace on climbs; hydrate before you feel thirsty.",
          whatToLookFor: "Limp foliage, sluggish insect activity until a breeze arrives.",
          trust: "Live",
          source: "Open-Meteo humidity"
        });
      }
    });

    R.push({
      id: "humidity-low",
      category: "weather",
      tags: ["humidity", "comfort"],
      when: function (c) { return c.humidity != null && c.humidity < 40; },
      block: function (c) {
        return b({
          what: "Low humidity (" + Math.round(c.humidity) + "%) keeps air crisp and comfortable for long walks.",
          why: "Dry air allows efficient evaporative cooling and sharp visibility at distance.",
          whyItMatters: "Comfortable hiking conditions — but skin and lips may dry on exposed ridges.",
          whatToDo: "Carry water; lip balm helps on windy ridges.",
          whatToLookFor: "Exceptional long-range views and hard-edged shadows at midday.",
          trust: "Live",
          source: "Open-Meteo humidity"
        });
      }
    });

    R.push({
      id: "wind-calm",
      category: "weather",
      tags: ["wind", "water", "photo"],
      when: function (c) { return c.wind != null && c.wind < 5; },
      block: function (c) {
        return b({
          what: "Calm winds (" + c.wind.toFixed(1) + " mph) improve reflections on lakes and rivers.",
          why: "Still air lets water surfaces act as mirrors — ripples break reflections above ~8 mph on small ponds.",
          whyItMatters: "Reflection photography and quiet wildlife listening both peak in calm air.",
          whatToDo: "Seek sheltered ponds and creek bends at dawn for mirror shots.",
          whatToLookFor: "Inverted sky on still water; herons and kingfishers hunting at quiet edges.",
          trust: "Live",
          source: "Open-Meteo wind"
        });
      }
    });

    R.push({
      id: "wind-moderate",
      category: "weather",
      tags: ["wind"],
      when: function (c) { return c.wind != null && c.wind >= 8 && c.wind < 18; },
      block: function (c) {
        return b({
          what: "Moderate breeze (" + Math.round(c.wind) + " mph) stirs leaves and disperses stagnant valley air.",
          why: "Wind mixes air layers — valleys clear faster and flying insects become more active.",
          whyItMatters: "Good ventilation on trails; water reflections become textured rather than mirror-smooth.",
          whatToDo: "Embrace moving water texture in photos; secure loose hat and map.",
          whatToLookFor: "Pollinators on wind-sheltered lee sides of hedgerows.",
          trust: "Live",
          source: "Open-Meteo wind"
        });
      }
    });

    R.push({
      id: "wind-strong",
      category: "weather",
      tags: ["wind", "safety"],
      when: function (c) { return c.wind != null && c.wind >= 18; },
      block: function (c) {
        return b({
          what: "Strong wind (" + Math.round(c.wind) + " mph) increases chill on ridges and can bring down branches.",
          why: "Wind strips heat from exposed skin and raises mechanical stress on canopy limbs.",
          whyItMatters: "Ridge travel and tree-camp safety need extra caution; photography tripods may vibrate.",
          whatToDo: "Choose sheltered routes; shorten exposed ridge sections.",
          whatToLookFor: "Whitecaps on lakes, leaning trees, reduced bird flight at height.",
          trust: "Live",
          source: "Open-Meteo wind"
        });
      }
    });

    for (var u = 1; u <= 11; u++) {
      (function (uvLevel) {
        R.push({
          id: "uv-" + uvLevel,
          category: "safety",
          tags: ["uv", "photo"],
          when: function (c) { return c.uv != null && Math.round(c.uv) === uvLevel; },
          block: function () {
            if (uvLevel <= 2) {
              return b({
                what: "Low UV (" + uvLevel + ") — minimal sunburn risk; soft light for portraits.",
                why: "Solar angle and atmospheric path length reduce ultraviolet reaching the surface.",
                whyItMatters: "Extended midday outdoor time is safer for sensitive skin.",
                whatToDo: "Good day for long hikes without aggressive sun protection.",
                whatToLookFor: "Even, flattering light on faces and forest floors.",
                trust: "Live",
                source: "Open-Meteo UV"
              });
            }
            if (uvLevel <= 5) {
              return b({
                what: "Moderate UV (" + uvLevel + ") — sun protection wise on exposed routes after two hours.",
                why: "UV accumulates over exposure duration — cloud cover only partially filters it.",
                whyItMatters: "Comfortable for most people with basic precautions.",
                whatToDo: "Hat and sunscreen on balds and water crossings.",
                whatToLookFor: "Defined but not harsh shadows — good for general photography.",
                trust: "Live",
                source: "Open-Meteo UV"
              });
            }
            if (uvLevel <= 7) {
              return b({
                what: "High UV (" + uvLevel + ") — sunburn possible in under an hour on fair skin.",
                why: "Strong solar radiation increases skin damage and glare on water and rock.",
                whyItMatters: "Heat stress and harsh shadows affect both safety and image quality.",
                whatToDo: "Shoot early/late; hydrate; seek shade on ascents.",
                whatToLookFor: "Specular highlights on leaves and water — expose for highlights.",
                trust: "Live",
                source: "Open-Meteo UV"
              });
            }
            return b({
              what: "Very high UV (" + uvLevel + ") — strong sunlight produces harsh shadows for photography but excellent solar drying after recent rainfall.",
              why: "Extreme UV increases contrast, heat stress, and snow/ice glare at altitude.",
              whyItMatters: "Limit prolonged midday exposure; images may need exposure bracketing.",
              whatToDo: "Avoid noon on exposed rock; reapply sunscreen every two hours.",
              whatToLookFor: "Heat shimmer over roads and rock — distant subjects may look hazy.",
              trust: "Live",
              source: "Open-Meteo UV"
            });
          }
        });
      })(u);
    }

    R.push({
      id: "temp-comfort-band",
      category: "weather",
      tags: ["comfort", "hiking"],
      when: function (c) { return c.feels != null && c.feels >= 50 && c.feels <= 72 && c.wind != null && c.wind < 18 && !c.isStorm; },
      block: function (c) {
        return b({
          what: "Feels-like near " + Math.round(c.feels) + "° with manageable wind — comfortable hiking weather through much of the day.",
          why: "Temperature and wind combine to determine how quickly your body gains or loses heat.",
          whyItMatters: "Comfortable conditions favor longer observation stops and better field notes.",
          whatToDo: "Pack one layer for shade and ridges; this is a strong day for trail time.",
          whatToLookFor: "Active insects, bird song, and hikers moving at conversational pace.",
          trust: "Estimated",
          source: "Open-Meteo"
        });
      }
    });

    R.push({
      id: "temp-heat-stress",
      category: "weather",
      tags: ["heat", "safety"],
      when: function (c) { return c.feels != null && c.feels >= 88; },
      block: function (c) {
        return b({
          what: "Heat stress risk at " + Math.round(c.feels) + "° feels-like — exertion outdoors needs careful pacing.",
          why: "High heat reduces the body's ability to cool through sweat when humidity is also elevated.",
          whyItMatters: "Heat illness can develop quickly on exposed trails without shade or water.",
          whatToDo: "Hike early; carry extra water; choose shaded corridors.",
          whatToLookFor: "Reduced wildlife activity at midday; seek dawn and dusk windows.",
          trust: "Live",
          source: "Open-Meteo"
        });
      }
    });

    R.push({
      id: "temp-cold-exposure",
      category: "weather",
      tags: ["cold", "safety"],
      when: function (c) { return c.feels != null && c.feels <= 28; },
      block: function (c) {
        return b({
          what: "Cold exposure risk at " + Math.round(c.feels) + "° feels-like — layering and wind protection are essential.",
          why: "Wind chill accelerates heat loss from exposed skin and extremities.",
          whyItMatters: "Hypothermia risk rises when wet and cold combine — cotton layers are dangerous.",
          whatToDo: "Synthetic or wool layers; cover ears and hands; shorten stops.",
          whatToLookFor: "Animal tracks in snow or mud; steam from your breath.",
          trust: "Live",
          source: "Open-Meteo"
        });
      }
    });

    R.push({
      id: "fog-active",
      category: "weather",
      tags: ["fog", "photo"],
      when: function (c) { return c.isFog; },
      block: function () {
        return b({
          what: "Fog or mist is active — soft light in valleys and along water edges.",
          why: "Moist air scatters light uniformly, crushing contrast and hiding distant clutter.",
          whyItMatters: "Exceptional conditions for forest atmosphere and macro work; poor for distant landscapes.",
          whatToDo: "Shoot in valleys before fog lifts; use tripod for slow shutter on creeks.",
          whatToLookFor: "Droplets on spider webs, muted silhouettes, quiet bird activity.",
          trust: "Live",
          source: "Open-Meteo conditions"
        });
      }
    });

    R.push({
      id: "fog-potential",
      category: "weather",
      tags: ["fog"],
      when: function (c) {
        return !c.isFog && c.humidity != null && c.humidity >= 80 &&
          c.temp != null && c.temp <= 55 && c.hour < 10;
      },
      block: function () {
        return b({
          what: "Radiation fog may form at dawn — cool, humid air over damp ground.",
          why: "Clear overnight skies let ground heat escape, cooling air to its dew point in valleys.",
          whyItMatters: "Brief window for atmospheric photography before sun burns fog off.",
          whatToDo: "Arrive at low elevations 30 minutes before sunrise if fog is the goal.",
          whatToLookFor: "Mist threading through drainages; listen for owls before light strengthens.",
          trust: "Estimated",
          source: "Open-Meteo humidity + temperature"
        });
      }
    });

    R.push({
      id: "rain-active",
      category: "weather",
      tags: ["rain", "trails"],
      when: function (c) { return c.isRain; },
      block: function () {
        return b({
          what: "Rain is falling — trails may be slick and streams are responding.",
          why: "Precipitation wets surfaces immediately while runoff takes time to reach gauges.",
          whyItMatters: "Crossing safety, mud depth, and fungi-friendly moisture all shift within hours.",
          whatToDo: "Waterproof layers; trekking poles on descents; check gauge lag before fording.",
          whatToLookFor: "Amphibians after showers; fresh mushroom primordia on decaying wood (identify carefully).",
          trust: "Live",
          source: "Open-Meteo conditions"
        });
      }
    });

    R.push({
      id: "rain-likely",
      category: "weather",
      tags: ["rain"],
      when: function (c) { return !c.isRain && c.pop != null && c.pop >= 50; },
      block: function (c) {
        return b({
          what: c.pop + "% chance of rain — pack waterproof shell and dry bag for electronics.",
          why: "Probability aggregates model uncertainty — local showers may miss or hit you.",
          whyItMatters: "Unprepared hikers get cold fast when wet — hypothermia risk even in mild air.",
          whatToDo: "Start early before convection builds; have indoor backup plan.",
          whatToLookFor: "Cumulus towers building after noon on fair-weather days.",
          trust: "Estimated",
          source: "Open-Meteo precipitation probability"
        });
      }
    });

    R.push({
      id: "storm-risk",
      category: "weather",
      tags: ["storm", "safety"],
      when: function (c) { return c.isStorm || (c.pop != null && c.pop >= 70); },
      block: function () {
        return b({
          what: "Thunderstorm or heavy rain risk — postpone exposed ridges, paddles, and open water.",
          why: "Lightning seeks high points and water; flash floods follow steep drainages.",
          whyItMatters: "Weather-related outdoor fatalities cluster around avoidable storm exposure.",
          whatToDo: "Check radar; identify retreat routes; lowest ground if caught (not under trees).",
          whatToLookFor: "Anvil clouds, sudden wind shifts, distant thunder.",
          trust: "Live",
          source: "Open-Meteo + NWS"
        });
      }
    });

    R.push({
      id: "diffuse-clouds",
      category: "weather",
      tags: ["cloud", "photo", "comfort"],
      when: function (c) { return c.isDiffuse && !c.isRain; },
      block: function (c) {
        return b({
          what: "Scattered clouds (" + Math.round(c.cloud) + "% cover) diffuse sunlight — comfortable for being outside and kind to cameras.",
          why: "Clouds act as a giant softbox, reducing harsh contrast while preserving directional light.",
          whyItMatters: "Among the best general outdoor days for hiking and woodland photography.",
          whatToDo: "Carry a camera; watch for brief sun breaks that add rim light.",
          whatToLookFor: "Glowing forest interiors; wildlife active longer through midday.",
          trust: "Live",
          source: "Open-Meteo cloud cover"
        });
      }
    });

    R.push({
      id: "clear-hard-light",
      category: "weather",
      tags: ["cloud", "photo"],
      when: function (c) { return c.isClear && c.cloud != null && c.cloud < 25; },
      block: function () {
        return b({
          what: "Clear sky — hard midday light with crisp visibility for distance views.",
          why: "Direct sun creates strong shadows and high dynamic range scenes.",
          whyItMatters: "Shoot within two hours of sunrise or sunset for landscape impact.",
          whatToDo: "Plan golden hour; use hat to shade lens flare at midday.",
          whatToLookFor: "Rim-lit ridges at sunset; deep blue sky polarized away from sun axis.",
          trust: "Live",
          source: "Open-Meteo"
        });
      }
    });

    R.push({
      id: "overcast-flat",
      category: "weather",
      tags: ["cloud"],
      when: function (c) { return c.isOvercast && !c.isRain; },
      block: function () {
        return b({
          what: "Heavy overcast flattens light — even exposure but muted sunset color.",
          why: "Thick cloud deck blocks direct solar rays; skylight becomes the main illuminant.",
          whyItMatters: "Excellent for macro and forest detail; limited drama for wide landscapes.",
          whatToDo: "Embrace intimate scenes — bark, fungi, creek detail.",
          whatToLookFor: "Saturated greens; reduced animal movement until edges brighten.",
          trust: "Live",
          source: "Open-Meteo"
        });
      }
    });

    R.push({
      id: "recent-precip",
      category: "weather",
      tags: ["rain", "fungi", "water"],
      when: function (c) { return c.precipAmt != null && c.precipAmt > 0.1; },
      block: function (c) {
        return b({
          what: "Measurable precipitation in today's forecast (" + c.precipAmt + " in) — soils are wetting.",
          why: "Recent rainfall combined with warm overnight temperatures may increase mushroom activity over the next several days.",
          whyItMatters: "Weather context only — not a fruiting forecast. Creek crossings and mud depth change.",
          whatToDo: "Check stream gauges with lag time; avoid compacting wet trails.",
          whatToLookFor: "Muddy tributaries, swollen moss, earthworm casts on paths.",
          trust: "Estimated",
          source: "Open-Meteo daily precipitation",
          confidence: 0.7
        });
      }
    });

    R.push({
      id: "aqi-unhealthy",
      category: "air",
      tags: ["aqi", "safety"],
      when: function (c) { return c.aqi != null && c.aqi >= 150; },
      block: function (c) {
        return b({
          what: "Unhealthy air quality (US AQI " + c.aqi + ") — reduce prolonged outdoor exertion.",
          why: "Fine particulate and ozone irritate lungs and reduce oxygen uptake during exercise.",
          whyItMatters: "Sensitive groups and athletes should treat this as a health-limiting day.",
          whatToDo: "Short walks only; consider indoor backup; check if wildfire smoke is regional.",
          whatToLookFor: "Hazy horizons, red sun disk, ash on cars.",
          trust: "Live",
          source: "Open-Meteo Air Quality"
        });
      }
    });

    R.push({
      id: "aqi-moderate",
      category: "air",
      tags: ["aqi"],
      when: function (c) { return c.aqi != null && c.aqi >= 100 && c.aqi < 150; },
      block: function (c) {
        return b({
          what: "Moderate air quality (US AQI " + c.aqi + ") — acceptable for most people at easy pace.",
          why: "Pollutants may affect unusually sensitive individuals during heavy exertion.",
          whyItMatters: "Distant landscape clarity may be reduced in photos — not just a health metric.",
          whatToDo: "Sensitive hikers shorten intense segments; consider dehaze lightly in post.",
          whatToLookFor: "Reduced visibility on ridge views compared to clear days.",
          trust: "Live",
          source: "Open-Meteo Air Quality"
        });
      }
    });

    R.push({
      id: "aqi-good",
      category: "air",
      tags: ["aqi"],
      when: function (c) { return c.aqi != null && c.aqi < 50; },
      block: function (c) {
        return b({
          what: "Excellent air quality (US AQI " + c.aqi + ") — deep visibility for ridge views.",
          why: "Low particulate load lets light travel farther without scattering haze.",
          whyItMatters: "Best days for long sightlines and crisp landscape layers.",
          whatToDo: "Prioritize vista hikes; telephoto compression will look especially clean.",
          whatToLookFor: "Layered ridges fading blue with distance.",
          trust: "Live",
          source: "Open-Meteo Air Quality"
        });
      }
    });

    R.push({
      id: "nws-alert",
      category: "safety",
      tags: ["alert"],
      when: function (c) { return c.alertCount > 0; },
      block: function (c) {
        var a0 = c.alerts[0] || {};
        return b({
          what: c.alertCount + " NWS alert(s) active — " + (a0.event || a0.headline || "check weather.gov"),
          why: "National Weather Service issues alerts when hazards exceed routine forecast uncertainty.",
          whyItMatters: "Official warnings override normal outdoor plans — legal and safety duty to heed them.",
          whatToDo: "Read full alert at weather.gov before exposed travel.",
          whatToLookFor: "Conditions can change hourly — re-check before losing cell service.",
          trust: "Live",
          source: "NWS"
        });
      }
    });

    R.push({
      id: "golden-hour",
      category: "daylight",
      tags: ["photo", "sun"],
      when: function (c) { return c.dl && c.dl.goldenHour; },
      block: function (c) {
        return b({
          what: "Golden hour window: " + c.dl.goldenHour + (c.dl.sunsetFormatted ? " · Sunset " + c.dl.sunsetFormatted : ""),
          why: "Low sun angle warms color temperature and lengthens shadows for depth.",
          whyItMatters: "Highest-value light for landscape and wildlife photography each day.",
          whatToDo: "Be on location 20 minutes before the window; shoot into and across the light.",
          whatToLookFor: "Rim light on fur and feathers; long shadows that reveal terrain texture.",
          trust: "Estimated",
          source: "Open-Meteo astronomy"
        });
      }
    });

    R.push({
      id: "blue-hour",
      category: "daylight",
      tags: ["photo"],
      when: function (c) { return c.dl && c.dl.blueHour; },
      block: function () {
        return b({
          what: "Blue hour available — narrow window of balanced ambient light after sunset or before sunrise.",
          why: "Indirect skylight dominates while artificial lights begin to balance with sky.",
          whyItMatters: "City-meets-nature scenes and water reflections peak in this range.",
          whatToDo: "Tripod required; expose for sky and lift shadows in post moderately.",
          whatToLookFor: "Cool sky gradient above warm horizon glow.",
          trust: "Estimated",
          source: "Open-Meteo astronomy"
        });
      }
    });

    R.push({
      id: "moon-bright",
      category: "astronomy",
      tags: ["moon", "astro"],
      when: function (c) { return c.moonIllum != null && c.moonIllum > 60; },
      block: function (c) {
        return b({
          what: "Bright moon (" + Math.round(c.moonIllum) + "% illuminated) — Milky Way and faint stars washed out.",
          why: "Moonlight competes with starlight on the same exposure scale.",
          whyItMatters: "Shift target to moonlit landscapes or plan astro for a darker phase.",
          whatToDo: "Shoot moonrise over ridges; expose for moon disk separately if including detail.",
          whatToLookFor: "Owls and coyotes often vocalize on bright moon nights.",
          trust: "Live",
          source: "Open-Meteo astronomy"
        });
      }
    });

    R.push({
      id: "moon-dark",
      category: "astronomy",
      tags: ["moon", "astro"],
      when: function (c) { return c.moonIllum != null && c.moonIllum <= 20 && c.cloud != null && c.cloud < 40; },
      block: function () {
        return b({
          what: "Dark moon phase with manageable clouds — favorable for star photography if sky clears tonight.",
          why: "Low moon illumination raises contrast between stars and sky background.",
          whyItMatters: "Astrophotography window — weather permitting, not guaranteed.",
          whatToDo: "Scout dark-sky site; focus at infinity before full dark; uncertainty remains without dedicated astronomy feed.",
          whatToLookFor: "First stars at astronomical twilight; satellite passes after full dark.",
          trust: "Estimated",
          source: "Moon phase + cloud cover",
          confidence: 0.65
        });
      }
    });

    return R;
  }

  global.WDS = global.WDS || {};
  global.WDS.oieWeatherRules = { all: rules };
})(window);
