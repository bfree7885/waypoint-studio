/**
 * OIE nature reasoning — seasonal ecology, honestly labeled educational content.
 */
(function (global) {
  "use strict";

  var C = global.WDS && global.WDS.oieCore;
  if (!C) return;
  var b = C.block;

  function monthRules() {
    var notes = {
      1: { bloom: "Winter botany shifts to buds, bark, and evergreen structure.", birds: "Winter residents dominate feeders; listen for chickadee contact calls.", fungi: "Frozen ground limits fruiting — look for polypores on standing deadwood." },
      2: { bloom: "Maple sap runs on warm days above freezing.", birds: "Great horned owls nest early — listen at dusk.", mammals: "Deer yard up in conifer stands during deep snow." },
      3: { bloom: "Spring ephemerals respond to soil warmth on south-facing slopes.", birds: "Red-winged blackbirds return to wetlands.", amphibians: "Wood frogs may call after thaw — vernal pools first." },
      4: { bloom: "Early wildflowers on trail margins — trout lily, bloodroot by latitude.", birds: "Dawn chorus builds as migrants arrive.", insects: "First flies and bees on willow catkins." },
      5: { bloom: "Mid-spring canopy closure changes forest floor light.", birds: "Warblers arrive in waves — learn songs before leaves hide them.", fungi: "Morel season follows warm rain in many regions — verify locally, never guess edibility." },
      6: { bloom: "Meadow blooms peak for pollinators — notice specialist vs generalist visits.", insects: "Dragonflies emerge at open water.", reptiles: "Turtles bask on logs when air exceeds 65°." },
      7: { bloom: "Prairie and field flowers at peak — milkweed hosts monarch caterpillars.", insects: "Fireflies pulse in humid meadows at dusk.", birds: "Territory song decreases; fledglings beg loudly." },
      8: { bloom: "Goldenrod and asters signal late summer — major pollinator resource.", migration: "Shorebird and hawk migration begins — ridges and coasts concentrate birds.", mammals: "Bears increase feeding before fall — secure food at camp." },
      9: { bloom: "Asters and goldenrod dominate old fields.", migration: "Fall songbird migration peaks on north winds after cold fronts.", leaves: "Early color on stressed or wetland maples." },
      10: { leaves: "Leaf color moves down slopes — peaks vary by elevation week to week.", mammals: "Rut activity increases for white-tailed deer in much of the East.", seeds: "Acorns and hickory mast feed wildlife before winter." },
      11: { birds: "Waterfowl migration on rivers and lakes.", leaves: "Bare trees open sightlines for nest cavities and hawk perches.", fungi: "Late-season polypores and bracket fungi on logs." },
      12: { birds: "Winter finches irrupt some years — feeder watch educational only.", mammals: "Track stories in snow — gait reveals species size and pace.", ecology: "Short days — blue hour comes early; owls call territories at night." }
    };
    var R = [];
    Object.keys(notes).forEach(function (m) {
      var month = parseInt(m, 10);
      var n = notes[month];
      Object.keys(n).forEach(function (topic) {
        R.push({
          id: "nature-m" + month + "-" + topic,
          category: "nature",
          tags: [topic, "season"],
          when: function (c) { return c.month === month; },
          block: function () {
            return b({
              what: n[topic],
              why: "Phenology at your latitude follows day length and accumulated warmth — not calendar dates alone.",
              whyItMatters: "Seasonal timing connects weather to what you can realistically observe this week.",
              whatToDo: "Use a field guide for your state; confirm IDs with multiple cues.",
              whatToLookFor: "South-facing slopes and wetland edges often lead regional timing.",
              trust: "Regional",
              source: "Latitude-season guidance",
              confidence: 0.6
            });
          }
        });
      });
    });
    return R;
  }

  function conditionalRules() {
    var R = [];

    R.push({
      id: "nature-species-editorial",
      category: "nature",
      tags: ["species"],
      when: function (c) { return !c.national && c.species[0] && c.species[0].name; },
      block: function (c) {
        var sp = c.species[0];
        return b({
          what: "Watch for " + sp.name + (sp.note ? " — " + sp.note : ""),
          why: "Local phenology and species calendars reflect field conditions in this bundle.",
          whyItMatters: "Editorial species notes are not live occurrence data — eBird would confirm rarity.",
          whatToDo: "Confirm identification in the field with multiple cues.",
          whatToLookFor: "Habitat type and microclimate can shift timing by weeks.",
          trust: "Editorial",
          source: "Local field bundle"
        });
      }
    });

    R.push({
      id: "nature-mushroom-moist",
      category: "nature",
      tags: ["fungi"],
      when: function (c) { return c.humidity >= 70 && (c.isRain || (c.precipAmt != null && c.precipAmt > 0.05)); },
      block: function () {
        return b({
          what: "Moisture in play — weather supports fungal activity in soils (not a fruiting forecast).",
          why: "Fungi need sustained humidity; fruiting body appearance depends on species and substrate.",
          whyItMatters: "Never eat wild mushrooms without expert ID — weather cue is not species ID.",
          whatToDo: "Photograph undersides, stems, and habitat for later identification.",
          whatToLookFor: "Deadwood, leaf litter, and north-facing slopes retain moisture longest.",
          trust: "Estimated",
          source: "Open-Meteo humidity + rain"
        });
      }
    });

    R.push({
      id: "nature-amphibian-rain",
      category: "nature",
      tags: ["amphibians"],
      when: function (c) { return (c.isRain || (c.pop != null && c.pop >= 40)) && c.temp >= 45 && c.temp <= 70; },
      block: function () {
        return b({
          what: "Warm rain favors amphibian movement — listen near wetlands after dusk.",
          why: "Moist skin loses water quickly — rain and humidity enable overland travel.",
          whyItMatters: "Road crossings spike mortality — drive carefully near vernal pools.",
          whatToDo: "Stand still five minutes with a red light; do not handle without need.",
          whatToLookFor: "Spring peepers, wood frogs, salamanders on wet pavement.",
          trust: "Regional",
          source: "Temperature + precipitation ecology"
        });
      }
    });

    R.push({
      id: "nature-migration-spring",
      category: "nature",
      tags: ["migration", "birds"],
      when: function (c) { return c.month >= 3 && c.month <= 5; },
      block: function () {
        return b({
          what: "Spring migration brings songbirds north on warm fronts — dawn is busiest.",
          why: "Birds migrate when winds and food availability align — cold fronts can ground large numbers.",
          whyItMatters: "A single morning can deliver dozens of species in treetops.",
          whatToDo: "Learn five songs this week; binoculars at forest edge facing sun at your back.",
          whatToLookFor: "Mixed flocks with warblers, vireos, and kinglets.",
          trust: "Regional",
          source: "General migration ecology"
        });
      }
    });

    R.push({
      id: "nature-migration-fall",
      category: "nature",
      tags: ["migration", "birds"],
      when: function (c) { return c.month >= 9 && c.month <= 11; },
      block: function () {
        return b({
          what: "Fall migration follows cold fronts — ridges and coastlines act as funnels.",
          why: "Birds ride tailwinds south and refuel in stopover habitat.",
          whyItMatters: "Weather windows concentrate migrants — timing beats random walks.",
          whatToDo: "Bird the day after a north wind overnight.",
          whatToLookFor: "Kettles of broad-winged hawks on thermals in September.",
          trust: "Regional",
          source: "General migration ecology"
        });
      }
    });

    R.push({
      id: "nature-habitat-edge",
      category: "nature",
      tags: ["ecology", "habitat"],
      when: function () { return true; },
      block: function () {
        return b({
          what: "Forest edges and field margins concentrate biodiversity — ecotones matter.",
          why: "Species from two habitats overlap within ~30 meters of a boundary.",
          whyItMatters: "Most casual observers miss edge specialists by staying on main trail centerline.",
          whatToDo: "Walk the margin slowly once per outing.",
          whatToLookFor: "Browse lines, nests, and scat where cover meets open food.",
          trust: "Regional",
          source: "Waypoint environmental education"
        });
      }
    });

    R.push({
      id: "nature-national-honest",
      category: "nature",
      tags: ["ecology"],
      when: function (c) { return c.national; },
      block: function () {
        return b({
          what: "U.S. regional overview — guidance reflects climate zone, not county-specific species lists.",
          why: "Live occurrence feeds (eBird, iNaturalist) are not connected for this coordinate view.",
          whyItMatters: "Honest labeling prevents false confidence about local rarities.",
          whatToDo: "Connect regional apps for live species data; use Waypoint for weather-linked context.",
          whatToLookFor: "Edges, water, and south-facing slopes first.",
          trust: "Regional",
          source: "Waypoint U.S. regional"
        });
      }
    });

    return R;
  }

  function rules() {
    return monthRules().concat(conditionalRules());
  }

  global.WDS = global.WDS || {};
  global.WDS.oieNatureRules = { all: rules };
})(window);
