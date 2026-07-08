/**
 * OIE photography reasoning — field guidance with WHY for every recommendation.
 */
(function (global) {
  "use strict";

  var C = global.WDS && global.WDS.oieCore;
  if (!C) return;
  var b = C.block;

  function rules() {
    var R = [];

    var genres = [
      {
        id: "photo-landscape",
        genre: "Landscape",
        when: function (c) { return c.hasLive; },
        block: function (c) {
          if (c.isFog) {
            return b({
              what: "Landscape: fog simplifies layers — shoot intimate forest and creek scenes.",
              why: "Fog hides distant clutter and merges tonal values for painterly depth.",
              whyItMatters: "Wide vistas fail in fog; close compositions gain mystery.",
              whatToDo: "Use foreground anchors within six feet; expose for mid-tones.",
              whatToLookFor: "Trees fading into white; leading lines along paths.",
              trust: "Estimated",
              source: "Derived light analysis"
            });
          }
          if (c.isDiffuse) {
            return b({
              what: "Landscape: broken cloud softens ridges — excellent for woodland layers and water.",
              why: "Diffuse light holds shadow detail in forest while preserving sky interest.",
              whyItMatters: "One of the most forgiving light regimes for full-frame landscapes.",
              whatToDo: "Polarizer may deepen sky between clouds; watch uneven polarization at wide angle.",
              whatToLookFor: "Sun breaks creating spotlights on distant slopes.",
              trust: "Estimated",
              source: "Derived light analysis"
            });
          }
          if (c.isClear) {
            return b({
              what: "Landscape: clear sky — plan golden hour; midday harsh for grand vistas.",
              why: "High sun angle creates short shadows and blown highlights on water and rock.",
              whyItMatters: "Timing matters more than location on clear days.",
              whatToDo: "Scout sunset azimuth; arrive 45 minutes early for setup.",
              whatToLookFor: "Alpenglow on east-facing peaks after sunset on western horizons.",
              trust: "Estimated",
              source: "Derived light analysis"
            });
          }
          return b({
            what: "Landscape: check hourly cloud trend before committing to a vista hike.",
            why: "Sky conditions shift faster than trail conditions.",
            whyItMatters: "A long hike to a view with closed sky wastes the best light.",
            whatToDo: "Match hike duration to forecast window.",
            whatToLookFor: "Western horizon breaks before sunset.",
            trust: "Estimated",
            source: "Open-Meteo"
          });
        }
      },
      {
        id: "photo-wildlife",
        genre: "Wildlife",
        when: function (c) { return c.hasLive && c.temp != null && c.temp >= 40 && c.temp <= 75 && !c.isStorm; },
        block: function () {
          return b({
            what: "Wildlife: mild temperatures favor diurnal activity — dawn and dusk remain peak windows.",
            why: "Many mammals and birds feed when light is low and predators are less visible.",
            whyItMatters: "Behavior beats gear — being present at edges during transitions matters most.",
            whatToDo: "Sit still at forest margins 30 minutes before sunset.",
            whatToLookFor: "Movement at eye level along trails; ear-first bird detection.",
            trust: "Estimated",
            source: "Temperature + season"
          });
        }
      },
      {
        id: "photo-macro",
        genre: "Macro",
        when: function (c) { return c.isOvercast || c.isFog || (c.isDiffuse && !c.isRain); },
        block: function () {
          return b({
            what: "Macro: soft even light favors forest floor detail — dew, fungi, leaf texture.",
            why: "Diffuse light avoids specular blowouts on wet surfaces.",
            whyItMatters: "Macro lives in the millimeter scale — light direction defines texture.",
            whatToDo: "Use body or hat as flag; f/8–f/11 for depth on flat subjects.",
            whatToLookFor: "Droplets, spider silk, lichen apothecia after rain.",
            trust: "Estimated",
            source: "Cloud + conditions"
          });
        }
      },
      {
        id: "photo-macro-hard",
        genre: "Macro",
        when: function (c) { return c.isClear && c.uv != null && c.uv >= 6; },
        block: function () {
          return b({
            what: "Macro: hard midday sun — shade small subjects with your body or a diffuser.",
            why: "Specular highlights on insect carapaces and wet leaves clip quickly in direct sun.",
            whyItMatters: "A single blown highlight destroys macro impact.",
            whatToDo: "Shoot early morning on clear days; look for open shade on north sides of logs.",
            whatToLookFor: "Insects basking in dappled light at trail edges.",
            trust: "Educational",
            source: "Photography field guidance"
          });
        }
      },
      {
        id: "photo-birds",
        genre: "Bird photography",
        when: function (c) { return c.hasLive && !c.isStorm; },
        block: function (c) {
          if (c.isOvercast) {
            return b({
              what: "Birds: overcast extends workable hours — even light on plumage without harsh shadow.",
              why: "Cloud acts as fill light under wings and bellies.",
              whyItMatters: "Songbirds in canopy become photographable past mid-morning.",
              whatToDo: "Raise ISO modestly; fast shutter for perch hops.",
              whatToLookFor: "Feeding flocks at forest edges after rain.",
              trust: "Estimated",
              source: "Light analysis"
            });
          }
          return b({
            what: "Birds: prioritize dawn chorus windows — backlit feathers need exposure compensation.",
            why: "Birds are most vocal and active in first light.",
            whyItMatters: "Behavioral shots beat static perch shots for storytelling.",
            whatToDo: "Pre-focus on anticipated perches; silence shutter if possible.",
            whatToLookFor: "Hawks riding thermals midday on clear days.",
            trust: "Estimated",
            source: "Light + season"
          });
        }
      },
      {
        id: "photo-astro",
        genre: "Astrophotography",
        when: function (c) { return c.moonIllum != null && c.moonIllum <= 25; },
        block: function (c) {
          if (c.cloud != null && c.cloud > 60) {
            return b({
              what: "Astro: dark moon but heavy cloud — stars unlikely tonight without clearing.",
              why: "Cloud opacity blocks point sources entirely.",
              whyItMatters: "Uncertainty is high — do not plan travel around astro without sky check.",
              whatToDo: "Monitor hourly cloud trend; have backup night landscape plan.",
              whatToLookFor: "Gaps in cloud deck toward zenith.",
              trust: "Estimated",
              source: "Moon + cloud",
              confidence: 0.55
            });
          }
          return b({
            what: "Astro: dark moon phase — Milky Way possible if sky clears (not guaranteed).",
            why: "Low moonlight raises star contrast; light pollution still limits urban areas.",
            whyItMatters: "Dedicated astronomy feed not connected — treat as educational outlook.",
            whatToDo: "Focus at infinity in daylight; arrive at site before full dark.",
            whatToLookFor: "Airplane trails vs satellites; avoid bright headlamps.",
            trust: "Estimated",
            source: "Moon phase",
            confidence: 0.6
          });
        }
      },
      {
        id: "photo-storm",
        genre: "Storm photography",
        when: function (c) { return c.isStorm || (c.pop != null && c.pop >= 60); },
        block: function () {
          return b({
            what: "Storm: dramatic sky potential — safety distance is non-negotiable.",
            why: "Lightning can strike far from rain core; metal tripods are hazardous.",
            whyItMatters: "No photograph is worth exposure on ridges or open water.",
            whatToDo: "Shoot from inside vehicle or porch; use telephoto compression on distant cells.",
            whatToLookFor: "Shelf clouds, rain curtains, lightning more than 10 miles away.",
            trust: "Live",
            source: "NWS + Open-Meteo"
          });
        }
      },
      {
        id: "photo-fog",
        genre: "Fog photography",
        when: function (c) { return c.isFog || (c.humidity != null && c.humidity >= 85 && c.hour < 9); },
        block: function () {
          return b({
            what: "Fog: prime atmosphere for creeks, bridges, and silhouetted trees.",
            why: "Fog reduces contrast so cameras capture scene luminance within dynamic range.",
            whyItMatters: "Fog lifts quickly — timing beats composition planning.",
            whatToDo: "Shoot RAW; slight clarity reduction in post enhances mood.",
            whatToLookFor: "Layers of trees at decreasing contrast.",
            trust: "Estimated",
            source: "Humidity + conditions"
          });
        }
      },
      {
        id: "photo-reflections",
        genre: "Reflections",
        when: function (c) { return c.wind != null && c.wind < 8 && (c.isRain || c.humidity >= 65); },
        block: function () {
          return b({
            what: "Reflections: calm wind after rain — ponds and creek bends may hold mirror surfaces.",
            why: "Still water doubles sky color at blue hour; wind ripples break symmetry.",
            whyItMatters: "Reflection shots anchor composition with strong symmetry.",
            whatToDo: "Low tripod height; polarizer to control sky vs reflection balance.",
            whatToLookFor: "Puddles on flat rock slabs; inverted autumn color on lakes.",
            trust: "Estimated",
            source: "Wind + moisture"
          });
        }
      },
      {
        id: "photo-moon",
        genre: "Moon",
        when: function (c) { return c.dl && c.dl.moonPhase; },
        block: function (c) {
          return b({
            what: "Moon: " + c.dl.moonPhase + (c.moonIllum != null ? " — " + Math.round(c.moonIllum) + "% lit" : "") + ".",
            why: "Moon phase sets night brightness and tide of nocturnal wildlife activity.",
            whyItMatters: "Moonlit landscapes need separate exposure from sky; stars need dark moon.",
            whatToDo: "Expose for moon detail at telephoto; blend exposures for moon + foreground.",
            whatToLookFor: "Moonrise alignment with ridges (check azimuth apps).",
            trust: "Live",
            source: "Open-Meteo astronomy"
          });
        }
      },
      {
        id: "photo-fall-color",
        genre: "Fall color",
        when: function (c) { return c.season === "fall" || c.month >= 9 && c.month <= 11; },
        block: function () {
          return b({
            what: "Fall color: senescence follows photoperiod and frost — ridges often peak before valleys.",
            why: "Anthocyanins and carotenoids reveal as chlorophyll breaks down at different rates by species.",
            whyItMatters: "Peak color can shift a week by elevation — microclimate matters.",
            whatToDo: "Shoot backlit leaves for translucence; overcast reduces glare on red maples.",
            whatToLookFor: "Sugar maples on wet soils; oaks holding bronze into November.",
            trust: "Educational",
            source: "Latitude-season phenology"
          });
        }
      },
      {
        id: "photo-waterfall",
        genre: "Waterfalls",
        when: function (c) { return (c.isRain || (c.precipAmt != null && c.precipAmt > 0.05)) && !c.isStorm; },
        block: function () {
          return b({
            what: "Waterfalls: recent rain increases flow — silk-water effect needs tripod and ND filter.",
            why: "Higher discharge adds white water that reads as texture at 1/4–1 s shutter.",
            whyItMatters: "Low flow after drought disappoints — rain timing matters.",
            whatToDo: "Wipe spray from lens; protect camera from mist with rain sleeve.",
            whatToLookFor: "Side light on cascade spray; moss saturation after rain.",
            trust: "Estimated",
            source: "Precipitation + flow inference"
          });
        }
      },
      {
        id: "photo-snow",
        genre: "Snow",
        when: function (c) { return c.isSnow || (c.temp != null && c.temp <= 32 && c.precipAmt > 0); },
        block: function () {
          return b({
            what: "Snow: expose +1 to +2 EV over meter reading to keep snow white, not gray.",
            why: "Camera meters average to middle gray — snow fools reflective metering.",
            whyItMatters: "Blue shadows in snow scenes are natural — preserve them for depth.",
            whatToDo: "Battery life drops in cold — keep spare warm in pocket.",
            whatToLookFor: "Animal tracks before melt; hoarfrost on branches at dawn.",
            trust: "Estimated",
            source: "Winter conditions"
          });
        }
      }
    ];

    genres.forEach(function (g) {
      R.push({
        id: g.id,
        category: "photography",
        tags: ["photo", g.genre.toLowerCase()],
        when: g.when,
        block: g.block
      });
    });

    return R;
  }

  global.WDS = global.WDS || {};
  global.WDS.oiePhotographyRules = { all: rules };
})(window);
