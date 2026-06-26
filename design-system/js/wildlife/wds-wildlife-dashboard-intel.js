/**
 * Wildlife dashboard intelligence — outdoor activity from OIP platform + local observations.
 * Tentative field cues only; never overstate certainty.
 */
(function (global) {
  "use strict";

  function card(id, icon, label, happening, why, attention, source, confidence) {
    return {
      id: id,
      icon: icon,
      label: label,
      happening: happening,
      why: why,
      attention: attention,
      source: source || "educational",
      confidence: confidence || "low"
    };
  }

  function parseNum(val) {
    if (val == null) return null;
    if (typeof val === "number" && isFinite(val)) return val;
    if (typeof val === "object" && val.value != null) return parseNum(val.value);
    return null;
  }

  function monthFromPlatform(platform) {
    if (platform && platform.calendar && platform.calendar.month) return platform.calendar.month;
    var OIP = global.WDS && global.WDS.outdoorIntelligence;
    if (OIP && OIP.model && OIP.model.monthFromDate) return OIP.model.monthFromDate(new Date());
    return new Date().getMonth() + 1;
  }

  function seasonFromPlatform(platform, month) {
    var label = (platform && platform.calendar && platform.calendar.season) ||
      (platform && platform.phenology && platform.phenology.stage) || "";
    var lower = String(label).toLowerCase();
    if (/winter/.test(lower)) return "winter";
    if (/spring/.test(lower)) return "spring";
    if (/summer/.test(lower)) return "summer";
    if (/fall|autumn/.test(lower)) return "fall";
    if (month >= 3 && month <= 5) return "spring";
    if (month >= 6 && month <= 8) return "summer";
    if (month >= 9 && month <= 11) return "fall";
    return "winter";
  }

  function allSpecies(platform) {
    var out = [];
    var sp = platform && platform.species;
    var watch = platform && platform.phenology && platform.phenology.watch;
    function push(list) {
      if (!list || !list.length) return;
      list.forEach(function (e) { out.push(e); });
    }
    if (sp) {
      push(sp.active);
      push(sp.ending);
      push(sp.comingSoon);
    }
    if (watch) {
      push(watch.activeNow);
      push(watch.ending);
      push(watch.comingSoon);
    }
    return out;
  }

  function speciesMatching(platform, pattern) {
    var re = pattern instanceof RegExp ? pattern : new RegExp(pattern, "i");
    return allSpecies(platform).filter(function (e) {
      var hay = ((e.name || "") + " " + (e.note || "") + " " + (e.status || "")).toLowerCase();
      return re.test(hay);
    });
  }

  function observationsMatching(platform, pattern) {
    var obs = platform && platform.observations;
    if (!obs || !obs.items || !obs.items.length) return [];
    var re = pattern instanceof RegExp ? pattern : new RegExp(pattern, "i");
    return obs.items.filter(function (item) {
      var hay = ((item.title || "") + " " + (item.body || "")).toLowerCase();
      return re.test(hay);
    });
  }

  function fieldryMatching(pattern) {
    try {
      var raw = localStorage.getItem("waypoint-fieldry-observations-v1");
      if (!raw) return [];
      var list = JSON.parse(raw);
      if (!Array.isArray(list)) return [];
      var re = pattern instanceof RegExp ? pattern : new RegExp(pattern, "i");
      return list.filter(function (obs) {
        var taxon = obs.taxon || {};
        var hay = (
          (taxon.commonName || "") + " " + (taxon.scientificName || "") + " " +
          (obs.notes || "") + " " + (obs.behavior || "")
        ).toLowerCase();
        return re.test(hay);
      }).slice(0, 3);
    } catch (e) {
      return [];
    }
  }

  function fieldryLabel(obs) {
    var taxon = obs.taxon || {};
    return taxon.commonName || taxon.scientificName || "Local observation";
  }

  function weatherCtx(platform) {
    var ref = platform && platform.weatherRef;
    var cur = ref && ref.current;
    var live = !!(ref && ref.meta && !ref.meta.isPlaceholder);
    var w = platform && platform.weather;
    var temp = parseNum(cur && cur.temperature);
    var humidity = parseNum(cur && cur.humidity);
    var cond = ((cur && cur.conditions && cur.conditions.summary) ||
      (w && w.conditions) || "").toLowerCase();
    var recentRain = !!(
      platform && platform.rainfall && platform.rainfall.recent &&
      parseNum(platform.rainfall.recent.amount) > 0.2
    );
    if (!recentRain && /rain|shower|drizzle|storm/.test(cond)) recentRain = true;
    return {
      live: live,
      temp: temp,
      humidity: humidity,
      conditions: cond,
      recentRain: recentRain,
      rainy: /rain|shower|drizzle|storm/.test(cond),
      warmHumid: (temp == null || (temp >= 58 && temp <= 88)) &&
        (humidity == null || humidity >= 60)
    };
  }

  function buildWildlifeActivity(platform, ctx) {
    var fieldry = fieldryMatching(/bear|deer|fox|coyote|bobcat|mammal|whitetail|moose|elk/i);
    if (fieldry.length) {
      return card(
        "wildlife-activity", "🦌", "Wildlife Activity",
        "Your Fieldry log includes " + fieldryLabel(fieldry[0]) +
          (fieldry.length > 1 ? " and " + (fieldry.length - 1) + " more recent mammal note(s)" : ""),
        "Local observations on this device suggest recent mammal activity in areas you visited.",
        "Compare your notes to trail reports — patterns may not repeat elsewhere.",
        "observed", "moderate"
      );
    }
    var notes = observationsMatching(platform, /bear|deer|wildlife|coyote|fox|mammal/i);
    if (notes.length) {
      return card(
        "wildlife-activity", "🦌", "Wildlife Activity",
        notes[0].title,
        notes[0].body ? notes[0].body.split(".")[0] + "." : "Regional editorial field note — not a verified survey.",
        "Treat as a cue to look, not a guarantee. Confirm official advisories before visiting.",
        "observed", "low"
      );
    }
    var mammals = speciesMatching(platform, /deer|whitetail|bear|fox|coyote|elk|moose/i);
    if (mammals.length) {
      var m = mammals[0];
      return card(
        "wildlife-activity", "🦌", "Wildlife Activity",
        (m.name || "Mammals") + " may be worth watching — " + (m.status || "active this week"),
        m.note || "Seasonal watch list for your region suggests movement or visibility now.",
        "Dawn and dusk edges, riparian corridors, and field margins — keep distance and secure food.",
        "expected", "low"
      );
    }
    if (ctx.season === "fall" || ctx.month >= 9 || ctx.month <= 2) {
      return card(
        "wildlife-activity", "🦌", "Wildlife Activity",
        "Deer may be more visible near field edges around dusk",
        "Feeding patterns shift with daylight and season — riparian corridors often concentrate movement.",
        "Watch road crossings at dawn and dusk; do not approach rut-active animals closely.",
        "expected", "low"
      );
    }
    if (ctx.season === "spring" || ctx.month >= 3 && ctx.month <= 5) {
      return card(
        "wildlife-activity", "🦌", "Wildlife Activity",
        "Bears and other mammals may be more active after green-up",
        "Spring food search often follows river valleys and emerging vegetation.",
        "Secure attractants at camp; note sign from a safe distance without approaching.",
        "expected", "low"
      );
    }
    return card(
      "wildlife-activity", "🦌", "Wildlife Activity",
      "General wildlife movement follows food, cover, and quiet edges",
      "Without a regional signal this week, timing depends on local habitat more than calendar.",
      "Walk quietly at dawn; scan field margins and water edges — log what you actually see.",
      "educational", "low"
    );
  }

  function buildBirdActivity(platform, ctx) {
    var fieldry = fieldryMatching(/bird|warbler|hawk|eagle|owl|vireo|thrush|duck|goose|sparrow|finch/i);
    if (fieldry.length) {
      return card(
        "bird-activity", "🐦", "Bird Activity",
        "Fieldry log: " + fieldryLabel(fieldry[0]),
        "Your recent bird observations on this device.",
        "Compare habitat and time of day — useful for your patch list, not a regional forecast.",
        "observed", "moderate"
      );
    }
    var notes = observationsMatching(platform, /warbler|bird|vireo|thrush|migration|song|nest/i);
    if (notes.length) {
      return card(
        "bird-activity", "🐦", "Bird Activity",
        notes[0].title,
        notes[0].body ? notes[0].body.split(".")[0] + "." : "Regional editorial note on birds in your area.",
        "Dawn is often best for song — five-minute sound map before moving on.",
        "observed", "low"
      );
    }
    var birds = speciesMatching(platform, /warbler|vireo|thrush|hawk|eagle|owl|duck|goose|sparrow|finch|bird/i);
    if (birds.length) {
      var b = birds[0];
      return card(
        "bird-activity", "🐦", "Bird Activity",
        (b.name || "Birds") + " on the regional watch — " + (b.status || "may be active"),
        b.note || "Phenology watch suggests birds worth checking this week.",
        "Bring binoculars; stay on trail — breeding birds may be on territory.",
        "expected", "low"
      );
    }
    if (ctx.month >= 4 && ctx.month <= 5) {
      return card(
        "bird-activity", "🐦", "Bird Activity",
        "Late spring migration tail may still pass through",
        "Some migrants linger while breeders establish territories — canopy and edge habitat differ.",
        "Listen before looking — ovenbird, vireo, and thrush songs often mark territory.",
        "expected", "low"
      );
    }
    if (ctx.season === "summer") {
      return card(
        "bird-activity", "🐦", "Bird Activity",
        "Breeding season activity — dawn chorus likely strongest",
        "Territory defense and feeding young concentrate vocal activity early in the day.",
        "Photographers: long lens from trail; avoid nest approaches.",
        "educational", "low"
      );
    }
    return card(
      "bird-activity", "🐦", "Bird Activity",
      "Bird activity varies by habitat more than a single calendar week",
      "Without a regional watch signal, your local woods and water edges matter most.",
      "Try a fixed five-minute listen at the same spot twice this week.",
      "educational", "low"
    );
  }

  function buildAmphibianActivity(platform, ctx, wx) {
    var fieldry = fieldryMatching(/frog|toad|salamander|newt|amphibian/i);
    if (fieldry.length) {
      return card(
        "amphibian-activity", "🐸", "Amphibian Activity",
        "Fieldry log: " + fieldryLabel(fieldry[0]),
        "Local observation of amphibians on this device.",
        "Wet nights after rain — vernal pools and creek margins; minimize light and noise.",
        "observed", "moderate"
      );
    }
    var amph = speciesMatching(platform, /frog|toad|salamander|newt|amphibian/i);
    if (amph.length && wx.recentRain) {
      return card(
        "amphibian-activity", "🐸", "Amphibian Activity",
        "Wet conditions may favor calling and movement",
        (amph[0].name || "Amphibians") + " on regional watch — " + (amph[0].note || "breeding season timing varies by elevation."),
        "Evening after warm rain — listen at pond edges; never handle without need.",
        "expected", "low"
      );
    }
    if (wx.warmHumid && (wx.recentRain || wx.rainy) && (ctx.season === "spring" || ctx.month >= 3 && ctx.month <= 6)) {
      return card(
        "amphibian-activity", "🐸", "Amphibian Activity",
        "Warm, humid nights after rain may favor chorus activity",
        "Amphibians often respond to moisture and temperature — low valleys first.",
        "Hikers: stay on trail near vernal pools; photographers: no flash at close range on sensitive species.",
        "expected", "low"
      );
    }
    if (amph.length) {
      return card(
        "amphibian-activity", "🐸", "Amphibian Activity",
        (amph[0].name || "Amphibians") + " on regional phenology watch",
        amph[0].note || "Seasonal window may be opening or closing — elevation matters.",
        "Check forecast for the next warm rain — that often triggers calling.",
        "expected", "low"
      );
    }
    return card(
      "amphibian-activity", "🐸", "Amphibian Activity",
      "Amphibian activity peaks around warm, wet nights in spring",
      "Without rain or a regional watch signal, chorus timing is uncertain this week.",
      "After the next warm rain, listen 30 minutes after sunset at still water.",
      "educational", "low"
    );
  }

  function buildReptileActivity(platform, ctx, wx) {
    var fieldry = fieldryMatching(/snake|turtle|lizard|skink|reptile/i);
    if (fieldry.length) {
      return card(
        "reptile-activity", "🦎", "Reptile Activity",
        "Fieldry log: " + fieldryLabel(fieldry[0]),
        "Local reptile observation on this device.",
        "Watch sun-warmed rocks and logs on trail — give snakes space to retreat.",
        "observed", "moderate"
      );
    }
    var reps = speciesMatching(platform, /snake|turtle|lizard|skink|reptile/i);
    if (reps.length) {
      return card(
        "reptile-activity", "🦎", "Reptile Activity",
        (reps[0].name || "Reptiles") + " may be on regional watch",
        reps[0].note || "Basking and movement increase with warm, sunny days.",
        "Trail hikers: scan sunny edges; never handle — identify from a safe distance.",
        "expected", "low"
      );
    }
    if (wx.temp != null && wx.temp >= 65 && wx.live && (ctx.season === "spring" || ctx.season === "summer")) {
      return card(
        "reptile-activity", "🦎", "Reptile Activity",
        "Warm sunny days may bring basking turtles and snakes to trail edges",
        "Live temperature suggests surface activity is possible — not guaranteed on every slope.",
        "Step around, don't poke — turtles on logs and snakes on warm rocks are common surprises.",
        "expected", "low"
      );
    }
    if (ctx.season === "spring" || ctx.month >= 4 && ctx.month <= 9) {
      return card(
        "reptile-activity", "🦎", "Reptile Activity",
        "Reptile season — basking likely on sunny rocks and logs",
        "Ectotherms need warmth; south-facing edges warm first in morning.",
        "Naturalists: photograph from trail width; hikers: watch footing on sunny ledges.",
        "educational", "low"
      );
    }
    return card(
      "reptile-activity", "🦎", "Reptile Activity",
      "Reptile activity slows in cool weather",
      "Without warmth or a regional signal, encounters may be uncommon this week.",
      "On warm afternoons, check pond logs and rocky trail sections.",
      "educational", "low"
    );
  }

  function buildInsectActivity(platform, ctx, wx) {
    var fieldry = fieldryMatching(/butterfly|moth|dragonfly|bee|beetle|cicada|firefly|insect/i);
    if (fieldry.length) {
      return card(
        "insect-activity", "🦋", "Insect Activity",
        "Fieldry log: " + fieldryLabel(fieldry[0]),
        "Local invertebrate observation on this device.",
        "Pollinators cluster on blooms — macro photographers: wind matters more than gear.",
        "observed", "moderate"
      );
    }
    var ins = speciesMatching(platform, /butterfly|moth|dragonfly|bee|cicada|firefly|beetle|insect|pollinator/i);
    if (ins.length) {
      return card(
        "insect-activity", "🦋", "Insect Activity",
        (ins[0].name || "Insects") + " on regional watch — " + (ins[0].status || "may be active"),
        ins[0].note || "Hatch and bloom timing links invertebrate pulses to phenology.",
        "Photographers: overcast soft light for wings; hikers: tick checks after brushy edges.",
        "expected", "low"
      );
    }
    if (wx.warmHumid && (ctx.season === "spring" || ctx.season === "summer")) {
      return card(
        "insect-activity", "🦋", "Insect Activity",
        "Warm, humid conditions may favor pollinators and flying insects",
        wx.live ? "Live weather suggests favorable conditions — not a hatch forecast." :
          "Regional conditions may support activity — verify in the field.",
        "Watch open flowers and sunny glades; never collect from protected areas.",
        "expected", "low"
      );
    }
    return card(
      "insect-activity", "🦋", "Insect Activity",
      "Insect pulses follow bloom, hatch, and warmth — timing varies by elevation",
      "Without a regional watch entry, local microclimate drives more than calendar.",
      "Note one pollinator and one flower association on your next hike.",
      "educational", "low"
    );
  }

  function buildRutCalendar(ctx) {
    var happening = "Whitetail rut timing varies by latitude and year";
    var why = "Peak breeding is typically late October–November in the Northeast — exact peak shifts annually.";
    var attention = "Photographers and hikers: rut-active bucks may be unpredictable — keep distance.";
    if (ctx.month >= 10 && ctx.month <= 11) {
      happening = "Rut window may be opening in the Northeast";
      why = "Historical timing suggests increased deer movement — not a day-specific forecast.";
      attention = "Extra caution at dawn and dusk near roads and field edges.";
    } else if (ctx.month >= 12 || ctx.month <= 2) {
      happening = "Post-rut — deer may still be visible but less aggressive";
      why = "Breeding season winding down; winter yard behavior varies by snow depth.";
      attention = "Track sign for learning, not pursuit.";
    }
    return card(
      "rut-calendar", "🦌", "Rut Calendar",
      happening, why, attention,
      "future", "low"
    );
  }

  function buildMigration(platform, ctx) {
    var notes = observationsMatching(platform, /migrat|warbler|shorebird|flycatcher|hawk/i);
    if (notes.length) {
      return card(
        "migration", "🕊", "Migration",
        notes[0].title,
        "Regional editorial note — not live radar or eBird density data.",
        "Birders: compare to your checklist history; peaks shift with weather fronts.",
        "observed", "low"
      );
    }
    if (ctx.month >= 3 && ctx.month <= 5) {
      return card(
        "migration", "🕊", "Migration",
        "Spring migration may still bring late migrants through",
        "Fronts and overnight winds influence fallout — no live feed connected yet.",
        "Check canopy oaks and river corridors at dawn after calm, warm nights.",
        "expected", "low"
      );
    }
    if (ctx.month >= 8 && ctx.month <= 11) {
      return card(
        "migration", "🕊", "Migration",
        "Fall migration builds — timing depends on species and weather",
        "Live migration density maps require eBird integration — not connected yet.",
        "Ridge lines and water bodies often concentrate movement — bring binoculars.",
        "expected", "low"
      );
    }
    return card(
      "migration", "🕊", "Migration",
      "Preview — live migration feed not connected",
      "eBird migration timing and density maps will appear when provider connects.",
      "Use regional phenology watch and field notes until live data arrives.",
      "future", "low"
    );
  }

  function analyze(platform) {
    if (!platform) return null;
    var month = monthFromPlatform(platform);
    var ctx = {
      month: month,
      season: seasonFromPlatform(platform, month),
      phenology: platform.phenology && platform.phenology.summary
    };
    var wx = weatherCtx(platform);
    return {
      wildlifeActivity: buildWildlifeActivity(platform, ctx),
      birdActivity: buildBirdActivity(platform, ctx),
      amphibianActivity: buildAmphibianActivity(platform, ctx, wx),
      reptileActivity: buildReptileActivity(platform, ctx, wx),
      insectActivity: buildInsectActivity(platform, ctx, wx),
      rutCalendar: buildRutCalendar(ctx),
      migration: buildMigration(platform, ctx),
      hasLiveWeather: wx.live,
      regionLabel: (platform.region && platform.region.label) ||
        (platform.geography && platform.geography.ecoregion) || null
    };
  }

  function summary(intel) {
    if (!intel) return null;
    var w = intel.wildlifeActivity;
    var b = intel.birdActivity;
    if (w && b) return w.happening.split(".")[0] + " · " + b.happening.split(".")[0];
    return w ? w.happening.split(".")[0] : null;
  }

  global.WDS = global.WDS || {};
  global.WDS.wildlifeDashboardIntel = { analyze: analyze, summary: summary };
})(window);
