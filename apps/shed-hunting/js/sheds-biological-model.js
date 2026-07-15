/**
 * Sheds — Whitetail Biological Model v1.0
 *
 * Translates documented Odocoileus virginianus winter / casting ecology into
 * transparent, modular search-priority scores. NOT machine learning.
 * NOT a probability of finding an antler.
 *
 * Every factor declares: rationale, evidence refs, confidence, data kind, and
 * a hard contribution share so no single input can silently dominate.
 *
 * See docs/BIOLOGICAL_MODEL.md for the literature synthesis.
 */
(function (global) {
  "use strict";

  var MODEL_VERSION = "1.0.0";
  var SPECIES_ID = "odocoileus-virginianus";

  var WEIGHT_SCALE = {
    off: 0,
    low: 0.45,
    balanced: 1,
    strong: 1.65
  };

  /**
   * Documented base shares (must remain explicit — not “magic”).
   * Sum of additive base shares ≈ 1.0 before preference scaling / caps.
   */
  var BASE_SHARE = {
    season_timing: 0.18,
    slope: 0.08,
    aspect_sun: 0.08,
    terrain_form: 0.07,
    thermal_cover: 0.08,
    feeding: 0.09,
    bedding: 0.09,
    edge_transition: 0.06,
    corridors: 0.07,
    fence_crossing: 0.05,
    deer_sign: 0.06,
    shed_find_interest: 0.04,
    human_pressure: 0.05
  };

  /** Soft ceiling: one additive factor cannot exceed this fraction of summed additive contributions. */
  var MAX_FACTOR_FRACTION = 0.28;

  var EVIDENCE = {
    E01: {
      id: "E01",
      kind: "agency_extension",
      cite: "MU Extension G9486 — Antler Development in White-tailed Deer",
      url: "https://extension.missouri.edu/publications/g9486",
      summary: "Photoperiod/hormone cycle; most males shed late Dec–early March in an average season; nutrition energetically expensive."
    },
    E02: {
      id: "E02",
      kind: "agency",
      cite: "NH Fish & Game — Deer Species Assessment",
      url: "https://www.wildlife.nh.gov/sites/g/files/ehbemt746/files/documents/nh-deer-assessment.pdf",
      summary: "Northern herds: antlers shed Dec–Feb; photoperiod + testosterone govern cycle; habitat quality affects antler metrics."
    },
    E03: {
      id: "E03",
      kind: "science_communication",
      cite: "QDMA Canada — The Science Behind Sheds",
      url: "https://www.qdma.ca/en/2014-03-27-13-07-39/what-we-do/deer-biology-management/117-the-science-behind-sheds/",
      summary: "Abscission after testosterone decline; nutrition stress can advance cast; older/dominant bucks often cast earlier; northern casting windows tighter."
    },
    E04: {
      id: "E04",
      kind: "peer_reviewed",
      cite: "Bubenik 2006 — Seasonal regulation of deer reproduction / antler cycle (review)",
      url: "https://wwwi.vef.hr/vetarhiv/papers/2006-76-7-30.pdf",
      summary: "Boreal cervid antler cycle tightly coupled to photoperiodic endocrine cascade."
    },
    E05: {
      id: "E05",
      kind: "peer_reviewed",
      cite: "Armstrong et al. 1983 — Winter bed-site selection, central Ontario (JWM)",
      url: "https://doi.org/10.2307/3808632",
      summary: "Night beds often in closed conifer; day beds more solar-exposed — both needed in winter concentration areas."
    },
    E06: {
      id: "E06",
      kind: "peer_reviewed",
      cite: "Schmitz 1991 — Thermal constraints & winter habitat choice (Ecography)",
      url: "https://doi.org/10.1111/j.1600-0587.1991.tb00640.x",
      summary: "Daytime open/sunny vs nighttime conifer shelter thermal tradeoff near northern range limit."
    },
    E07: {
      id: "E07",
      kind: "university",
      cite: "MSU Deer Ecology Lab — Habitat Cover",
      url: "https://www.msudeer.msstate.edu/habitat-cover.php",
      summary: "Northern thermal/snow shelter often dense mature conifer; yards frequently on south-facing slopes; 70%+ canopy near forage valued."
    },
    E08: {
      id: "E08",
      kind: "agency",
      cite: "Minnesota DNR — Winter Severity Index / winter impacts",
      url: "https://www.dnr.state.mn.us/mammals/deer/management/wsi.html",
      summary: "Deep snow raises movement costs more than cold alone; deer yard in dense conifer; crust can favor predators over deer."
    },
    E09: {
      id: "E09",
      kind: "peer_reviewed",
      cite: "Moen 1976 — Energy conservation by white-tailed deer in winter (Ecology)",
      url: "https://doi.org/10.2307/1936411",
      summary: "Winter energy conservation via reduced activity, slower travel, preferring lesser snow / gentler ground; disturbance costly."
    },
    E10: {
      id: "E10",
      kind: "peer_reviewed",
      cite: "DelGiudice et al. / MN research — dense conifer cover & snow",
      url: "https://doi.org/10.1371/journal.pone.0065368",
      summary: "~40 cm snow seriously restricts movement; conifer canopies can reduce snow depth substantially."
    },
    E11: {
      id: "E11",
      kind: "peer_reviewed",
      cite: "Claude et al. / hunting spatial behavior (Can. J. Zool.)",
      url: "https://doi.org/10.1139/cjz-2016-0125",
      summary: "During hunting risk, deer often reduce travel and concentrate in known ranges rather than expand micro-ranges."
    },
    E12: {
      id: "E12",
      kind: "peer_reviewed",
      cite: "Peterson et al. 2011 — Roadside fences / home-range responses (Wildl. Soc. Bull.)",
      url: "https://doi.org/10.1002/wsb.38",
      summary: "Deer maintain site fidelity and use fence endings/gaps rather than freely crossing tall barrier fencing."
    },
    E13: {
      id: "E13",
      kind: "habitat_management",
      cite: "NAW / applied topography guidance (management synthesis)",
      url: "https://www.northamericanwhitetail.com/editorial/topography-and-terrain-deer-management/519607",
      summary: "Applied topography: drainages as corridors, benches as travel/bed microsites, saddles as low-energy ridge crossings — experience-based synthesis, not a single experiment."
    },
    E14: {
      id: "E14",
      kind: "thesis_disagreement",
      cite: "Pauley 1988 thesis — Winter habitat selection by sexes (Montana)",
      url: "https://scholarworks.umt.edu/etd/8053",
      summary: "DISAGREEMENT: on that Montana winter range, deer selected low elevations, steep slopes, and north aspects — opposing broad “south-slope winter” heuristic. Aspect preference is regional, not universal."
    }
  };

  var FACTOR_CATALOG = {
    season_timing: {
      id: "season_timing",
      category: "seasonal",
      label: "Seasonal casting window",
      dataKind: "ecological_assumption",
      baseShare: BASE_SHARE.season_timing,
      biologicalConfidence: 0.72,
      prefsKey: "season",
      evidenceIds: ["E01", "E02", "E03", "E04"],
      rationale:
        "Antler cast is triggered by post-rut testosterone decline under photoperiod control. Regional peak is earlier farther south / later farther north, but individuals vary with age, dominance, and nutrition."
    },
    slope: {
      id: "slope",
      category: "terrain",
      label: "Slope energy / walkability",
      dataKind: "inferred",
      baseShare: BASE_SHARE.slope,
      biologicalConfidence: 0.55,
      prefsKey: "slope",
      evidenceIds: ["E09", "E13"],
      rationale:
        "Winter deer conserve energy and often favor gentler travel when snow impedes movement. Extremely steep ground is poorer search habitat and costlier for deer."
    },
    aspect_sun: {
      id: "aspect_sun",
      category: "terrain",
      label: "Aspect / solar exposure",
      dataKind: "ecological_assumption",
      baseShare: BASE_SHARE.aspect_sun,
      biologicalConfidence: 0.48,
      prefsKey: "aspect",
      evidenceIds: ["E05", "E06", "E07", "E14"],
      rationale:
        "Many northern winter descriptions favor sunnier day beds and south-facing yards, but some mountain studies select north aspects. Soft northern-hemisphere sun bias only; regional disagreement is documented."
    },
    terrain_form: {
      id: "terrain_form",
      category: "terrain",
      label: "Terrain microform (ridge / drainage / saddle / bench hints)",
      dataKind: "inferred",
      baseShare: BASE_SHARE.terrain_form,
      biologicalConfidence: 0.4,
      prefsKey: "terrainForm",
      evidenceIds: ["E13", "E09"],
      rationale:
        "Applied ecology and energy conservation suggest deer use low-cost routes: drainages, benches, and saddles. Map-derived hints from elevation neighborhoods are coarse proxies, not mapped landforms."
    },
    thermal_cover: {
      id: "thermal_cover",
      category: "habitat",
      label: "Thermal / winter cover",
      dataKind: "observed",
      baseShare: BASE_SHARE.thermal_cover,
      biologicalConfidence: 0.7,
      prefsKey: "thermalCover",
      evidenceIds: ["E05", "E06", "E07", "E08", "E10"],
      rationale:
        "Dense conifer snow/thermal shelter and winter concentration areas are repeatedly linked to winter survival and reduced snow depth under canopy. We only boost where the user records winter cover/concentration — we do not invent land-cover polygons."
    },
    feeding: {
      id: "feeding",
      category: "habitat",
      label: "Feeding areas",
      dataKind: "observed",
      baseShare: BASE_SHARE.feeding,
      biologicalConfidence: 0.68,
      prefsKey: "feeding",
      evidenceIds: ["E07", "E08", "E09"],
      rationale:
        "Winter feeding sites adjacent to cover create repeated feed→bed movements where cast antlers can accumulate along travel and loafing edges."
    },
    bedding: {
      id: "bedding",
      category: "habitat",
      label: "Bedding / day–night cover mosaic",
      dataKind: "observed",
      baseShare: BASE_SHARE.bedding,
      biologicalConfidence: 0.66,
      prefsKey: "bedding",
      evidenceIds: ["E05", "E06"],
      rationale:
        "Bedding notes mark rest sites. Multiple nearby bedding notes reinforce a local cover complex used in winter."
    },
    edge_transition: {
      id: "edge_transition",
      category: "habitat",
      label: "Edges / transition zones",
      dataKind: "inferred",
      baseShare: BASE_SHARE.edge_transition,
      biologicalConfidence: 0.35,
      prefsKey: "edges",
      evidenceIds: ["E07"],
      rationale:
        "Edges between forage openings and cover are biologically relevant, but without land-cover data this factor stays weak or neutral rather than invented."
    },
    corridors: {
      id: "corridors",
      category: "behavior",
      label: "Travel corridors",
      dataKind: "observed",
      baseShare: BASE_SHARE.corridors,
      biologicalConfidence: 0.6,
      prefsKey: "corridors",
      evidenceIds: ["E09", "E12", "E13"],
      rationale:
        "Repeated trails and crossings concentrate winter movement when deer minimize travel cost."
    },
    fence_crossing: {
      id: "fence_crossing",
      category: "behavior",
      label: "Fence / obstacle crossings",
      dataKind: "observed",
      baseShare: BASE_SHARE.fence_crossing,
      biologicalConfidence: 0.58,
      prefsKey: "fences",
      evidenceIds: ["E12"],
      rationale:
        "Deer often prefer gaps, endings, and known crossing sites over random high jumps across continuous fence."
    },
    deer_sign: {
      id: "deer_sign",
      category: "behavior",
      label: "Recent deer sign / sightings",
      dataKind: "observed",
      baseShare: BASE_SHARE.deer_sign,
      biologicalConfidence: 0.55,
      prefsKey: "deerSign",
      evidenceIds: ["E09"],
      rationale:
        "Fresh sign indicates recent presence. It raises search interest nearby without proving sheds exist."
    },
    shed_find_interest: {
      id: "shed_find_interest",
      category: "calibration_signal",
      label: "Prior shed finds (interest only)",
      dataKind: "observed",
      baseShare: BASE_SHARE.shed_find_interest,
      biologicalConfidence: 0.45,
      prefsKey: "shedFinds",
      evidenceIds: ["E01", "E03"],
      rationale:
        "A prior find is evidence that casting happened somewhere nearby historically. It raises local interest for revisiting habitat context — never a guarantee of additional antlers."
    },
    human_pressure: {
      id: "human_pressure",
      category: "human",
      label: "Human disturbance / pressure",
      dataKind: "observed",
      baseShare: BASE_SHARE.human_pressure,
      biologicalConfidence: 0.5,
      prefsKey: "humanPressure",
      evidenceIds: ["E11", "E09"],
      rationale:
        "Hunting and recreation can reduce diurnal movement and push deer into secure cover. Documented pressure down-weights open disturbed pockets for shed walking relative to quieter adjacent cover — still not a find probability."
    }
  };

  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }

  function weightOf(prefs, key) {
    var w = (prefs && prefs.weights && prefs.weights[key]) || "balanced";
    return WEIGHT_SCALE[w] != null ? WEIGHT_SCALE[w] : 1;
  }

  function haversineM(aLat, aLng, bLat, bLng) {
    var R = 6371000;
    var toRad = Math.PI / 180;
    var dLat = (bLat - aLat) * toRad;
    var dLng = (bLng - aLng) * toRad;
    var lat1 = aLat * toRad;
    var lat2 = bLat * toRad;
    var h = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function kernel(distM, radiusM) {
    if (distM >= radiusM) return 0;
    var t = distM / radiusM;
    return (1 - t) * (1 - t);
  }

  /** Latitude-aware casting window. Soft heuristic; documented uncertainty. */
  function seasonProfile(date, lat) {
    date = date || new Date();
    var month = date.getMonth() + 1;
    var doy = Math.floor((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
      Date.UTC(date.getFullYear(), 0, 0)) / 86400000);
    var northern = !(typeof lat === "number" && lat < 0);
    var peakCenter;
    var windowHalf;
    if (!northern) {
      peakCenter = 220;
      windowHalf = 55;
    } else if (typeof lat === "number") {
      // Approx peaks: Gulf ~ late Jan (doy 25), Midwest ~ mid-Feb (45), Upper Midwest/Canada ~ early Mar (70+)
      peakCenter = clamp(20 + (lat - 30) * 2.2, 25, 85);
      windowHalf = lat > 45 ? 28 : lat > 38 ? 35 : 42;
    } else {
      peakCenter = 55;
      windowHalf = 35;
    }
    var dist = Math.min(
      Math.abs(doy - peakCenter),
      Math.abs(doy - peakCenter + 365),
      Math.abs(doy - peakCenter - 365)
    );
    var seasonScore = clamp(1 - dist / (windowHalf * 2.1), 0.1, 1);
    var phase = "post-shed / off-peak";
    if (dist <= windowHalf * 0.45) phase = "peak-shed";
    else if (dist <= windowHalf) phase = "shoulder (pre-/post-peak)";
    else if (northern && (month === 12 || month <= 4) && doy < peakCenter) phase = "pre-shed";
    else if (northern && month >= 2 && month <= 5 && doy > peakCenter) phase = "post-shed";
    return {
      score: seasonScore,
      phase: phase,
      peakDoy: Math.round(peakCenter),
      windowHalfDays: Math.round(windowHalf),
      source: "ecological_assumption",
      note: "Casting timing varies by animal, nutrition, age, dominance, and weather. Latitude shifts the regional window; this is not a forecast that sheds are on the ground."
    };
  }

  function slopePreferenceScore(slopeDeg) {
    if (slopeDeg == null) return { score: 0.5, label: "slope unavailable", available: false };
    var ideal = 8;
    var score = clamp(1 - Math.abs(slopeDeg - ideal) / 28, 0.05, 1);
    if (slopeDeg > 35) score *= 0.45;
    return {
      score: score,
      label: slopeDeg < 5 ? "flat" : slopeDeg < 15 ? "gentle" : slopeDeg < 28 ? "moderate" : "steep",
      available: true
    };
  }

  function aspectPreferenceScore(aspect, lat) {
    if (aspect == null) return { score: 0.5, label: "aspect unavailable", available: false };
    var northern = !(typeof lat === "number" && lat < 0);
    // Soft sun bias for northern winter day-beds — disputed regionally (E14).
    var target = northern ? 200 : 20;
    var sun = Math.cos((aspect - target) * Math.PI / 180);
    var score = clamp(0.55 + 0.28 * sun, 0.2, 1);
    return {
      score: score,
      label: sun > 0.25 ? "more sun-exposed" : sun < -0.25 ? "more shaded" : "mixed aspect",
      available: true,
      disagreementNote: northern
        ? "Regional disagreement exists: some mountain winter ranges prefer northerly aspects (E14)."
        : null
    };
  }

  function terrainFormScore(morph) {
    if (!morph || morph.source === "unavailable") {
      return { score: 0.5, label: "terrain form unavailable", available: false, parts: null };
    }
    var s = 0.42;
    var bits = [];
    if (morph.drainageHint > 0.5) { s += 0.18; bits.push("drainage-relative low"); }
    if (morph.benchHint > 0.5) { s += 0.16; bits.push("bench-like gentler patch"); }
    if (morph.saddleHint > 0.5) { s += 0.2; bits.push("saddle-like pass"); }
    if (morph.ridgeHint > 0.55) { s += 0.05; bits.push("ridge-relative high"); }
    return {
      score: clamp(s, 0.15, 1),
      label: bits.length ? bits.join(", ") : "no strong microform hint",
      available: true,
      parts: morph
    };
  }

  function observationSignals(lat, lng, observations, prefs) {
    observations = observations || [];
    var out = {
      feeding: 0,
      bedding: 0,
      thermal: 0,
      corridors: 0,
      deerSign: 0,
      fences: 0,
      searchPenalty: 0,
      shedBoost: 0,
      humanPressure: 0,
      edgeNote: 0,
      beddingCluster: 0,
      obsCountNearby: 0
    };
    var beddingNearby = 0;
    var i;
    for (i = 0; i < observations.length; i++) {
      var o = observations[i];
      if (!o || !o.location) continue;
      var d = haversineM(lat, lng, o.location.lat, o.location.lng);
      if (d < 1200) out.obsCountNearby += 1;
      var t = o.type;
      if (t === "feeding_area") {
        out.feeding = Math.max(out.feeding, kernel(d, 900) * weightOf(prefs, "feeding"));
      } else if (t === "bedding_area") {
        out.bedding = Math.max(out.bedding, kernel(d, 800) * weightOf(prefs, "bedding"));
        if (d < 350) beddingNearby += 1;
      } else if (t === "winter_concentration") {
        out.thermal = Math.max(out.thermal, kernel(d, 1100) * weightOf(prefs, "thermalCover"));
        out.bedding = Math.max(out.bedding, kernel(d, 900) * 0.55 * weightOf(prefs, "bedding"));
        if (d < 400) beddingNearby += 1;
      } else if (t === "trail_crossing") {
        out.corridors = Math.max(out.corridors, kernel(d, 700) * weightOf(prefs, "corridors"));
      } else if (t === "fence_crossing") {
        out.fences = Math.max(out.fences, kernel(d, 550) * weightOf(prefs, "fences"));
      } else if (t === "deer_sign" || t === "deer_seen") {
        var freshness = o.confidence === "confirmed" ? 1.12 : o.confidence === "uncertain" ? 0.9 : 1;
        out.deerSign = Math.max(
          out.deerSign,
          kernel(d, 1000) * weightOf(prefs, "deerSign") * (t === "deer_seen" ? 0.85 : 1) * freshness
        );
      } else if (t === "shed_found") {
        out.shedBoost = Math.max(out.shedBoost, kernel(d, 650) * 0.55 * weightOf(prefs, "shedFinds"));
      } else if (t === "search_completed") {
        out.searchPenalty = Math.max(out.searchPenalty, kernel(d, 450) * weightOf(prefs, "searchHistory"));
      } else if (t === "habitat_note") {
        out.edgeNote = Math.max(out.edgeNote, kernel(d, 700) * weightOf(prefs, "edges") * 0.55);
      } else if (t === "hunting_pressure" || t === "hiking_pressure" || t === "human_disturbance") {
        var press = kernel(d, 800) * weightOf(prefs, "humanPressure");
        if (t === "hunting_pressure") press *= 1.15;
        out.humanPressure = Math.max(out.humanPressure, press);
      } else if (t === "access_issue") {
        out.humanPressure = Math.max(out.humanPressure, kernel(d, 500) * 0.35 * weightOf(prefs, "humanPressure"));
      }
    }
    if (beddingNearby >= 2) {
      out.beddingCluster = clamp(0.15 * (beddingNearby - 1), 0, 0.35);
      out.bedding = clamp(out.bedding + out.beddingCluster, 0, 1.25);
    }
    return out;
  }

  function weatherModifiers(weather, prefs) {
    var snowW = weightOf(prefs, "snow");
    var out = {
      snowFactor: 1,
      coldFactor: 1,
      windFactor: 1,
      stormSettleFactor: 1,
      source: "unavailable",
      snowMm: null,
      tempC: null,
      notes: []
    };
    if (!weather) {
      out.notes.push("Weather samples unavailable — snow/temperature influence held neutral.");
      return out;
    }
    out.source = weather.source || "weather-provider";
    out.snowMm = weather.snowMm;
    out.tempC = typeof weather.tempC === "number" ? weather.tempC : null;
    if (snowW > 0 && typeof weather.snowInfluence === "number") {
      out.snowFactor = clamp(weather.snowInfluence, 0.55, 1.15);
      out.notes.push("Snowfall summary modulates travel cost / concentration heuristics (agency WSI literature: deep snow costly).");
    }
    // Cold: below roughly -18C (~0F MN WSI day threshold concept) — soft energy cost, not WSI clone
    if (snowW > 0 && out.tempC != null && out.tempC <= -18) {
      out.coldFactor = 0.92;
      out.notes.push("Very cold recent temperature increases energy cost; prioritize cover–feed mosaics if observed.");
    }
    if (typeof weather.windSpeedMs === "number" && weather.windSpeedMs >= 10) {
      out.windFactor = 0.94;
      out.notes.push("Elevated wind — exposure may push day use toward lee/thermal cover when recorded.");
    }
    // Crust / freeze-thaw: cannot observe remotely with confidence → explicit unavailable
    out.notes.push("Snow crust and freeze/thaw state are not sensed here (uncertainty).");
    return out;
  }

  function buildFactorEntry(catalogId, score01, extras) {
    extras = extras || {};
    var meta = FACTOR_CATALOG[catalogId];
    var avail = extras.available !== false;
    var raw = avail ? clamp(score01, 0, 1.25) : 0.5;
    var w = extras.weightScale != null ? extras.weightScale : 1;
    var share = meta.baseShare * w;
    var contribution = share * (avail ? clamp(raw, 0, 1) : 0.5);
    return {
      id: catalogId,
      label: meta.label,
      category: meta.category,
      dataKind: extras.dataKind || meta.dataKind,
      score: clamp(raw, 0, 1),
      available: avail,
      baseShare: meta.baseShare,
      weightScale: w,
      contribution: contribution,
      biologicalConfidence: meta.biologicalConfidence,
      rationale: meta.rationale,
      evidenceIds: meta.evidenceIds.slice(),
      note: extras.note || null,
      labelDetail: extras.labelDetail || null
    };
  }

  function capContributions(factors) {
    var sum = 0;
    var i;
    for (i = 0; i < factors.length; i++) sum += Math.max(0, factors[i].contribution);
    if (sum <= 0) return factors;
    for (i = 0; i < factors.length; i++) {
      var maxAllowed = sum * MAX_FACTOR_FRACTION;
      if (factors[i].contribution > maxAllowed) {
        factors[i].capped = true;
        factors[i].contribution = maxAllowed;
      }
    }
    return factors;
  }

  function confidenceBundle(factors, opts, obs, terrainAvailable, weatherAvail, edgeAvail) {
    var bioVals = [];
    var i;
    for (i = 0; i < factors.length; i++) {
      if (factors[i].available && factors[i].weightScale > 0) {
        bioVals.push(factors[i].biologicalConfidence);
      }
    }
    var biological = bioVals.length
      ? bioVals.reduce(function (a, b) { return a + b; }, 0) / bioVals.length
      : 0.35;

    var envBits = 0;
    var envTotal = 3;
    if (terrainAvailable) envBits += 1;
    if (weatherAvail) envBits += 1;
    if (edgeAvail) envBits += 1;
    var environmentalData = envBits / envTotal;

    var obsN = (opts.observations && opts.observations.length) || 0;
    var near = obs.obsCountNearby || 0;
    var observationDensity = clamp(0.15 + 0.12 * Math.min(obsN, 8) + 0.08 * Math.min(near, 6), 0.15, 0.95);

    // Overall recommendation confidence ≠ probability of a shed
    var overall = clamp(
      0.34 * biological + 0.28 * environmentalData + 0.38 * observationDensity,
      0.12,
      0.9
    );
    if (!terrainAvailable) overall *= 0.92;
    if (!edgeAvail) overall *= 0.9;

    return {
      biological: Math.round(biological * 100) / 100,
      environmentalData: Math.round(environmentalData * 100) / 100,
      observationDensity: Math.round(observationDensity * 100) / 100,
      overallRecommendation: Math.round(overall * 100) / 100,
      disclaimer: "Confidence channels rate input support for guidance — not the chance an antler is present."
    };
  }

  function taxonomyFrom(factors, uncertaintyNotes) {
    var tax = {
      observed: [],
      inferred: [],
      ecologicalAssumptions: [],
      userPreferences: [],
      uncertainty: uncertaintyNotes.slice()
    };
    factors.forEach(function (f) {
      if (f.weightScale <= 0) return;
      var tip = f.label + (f.labelDetail ? " (" + f.labelDetail + ")" : "");
      if (f.dataKind === "observed" && f.available && f.score > 0.2) tax.observed.push(tip);
      else if (f.dataKind === "inferred" && f.available) tax.inferred.push(tip);
      else if (f.dataKind === "ecological_assumption") tax.ecologicalAssumptions.push(tip);
      if (f.weightScale !== 1) tax.userPreferences.push(f.label + " weight×" + f.weightScale);
      if (!f.available) tax.uncertainty.push(f.label + " data unavailable — held near neutral.");
    });
    return tax;
  }

  function explainBiological(result) {
    if (!result) return "No biological model result.";
    var lines = [];
    var bandLabel = result.band === "higher" ? "Higher modeled search priority"
      : result.band === "moderate" ? "Moderate modeled search priority"
        : "Lower modeled search priority";
    lines.push(bandLabel + " under Whitetail Biological Model v" + MODEL_VERSION + ".");

    var tops = (result.factors || []).slice().sort(function (a, b) {
      return b.contribution - a.contribution;
    }).filter(function (f) {
      return f.weightScale > 0 && f.available && f.score > 0.45;
    }).slice(0, 4);

    if (tops.length) {
      var bits = tops.map(function (f) {
        return f.labelDetail || f.label;
      });
      lines.push("Priority reflects alignment of: " + bits.join("; ") + ".");
      lines.push("Biological reasoning: " + tops[0].rationale);
    } else {
      lines.push("Few strong local observations; score leans on seasonal timing and available terrain assumptions.");
    }

    if (result.labels && result.labels.seasonPhase) {
      lines.push("Seasonal phase heuristic: “" + result.labels.seasonPhase + "” (latitude-aware casting window).");
    }
    if (result.confidence) {
      lines.push(
        "Confidence (not probability) — biological " + result.confidence.biological +
        ", environmental data " + result.confidence.environmentalData +
        ", observation density " + result.confidence.observationDensity +
        ", overall guidance " + result.confidence.overallRecommendation + "."
      );
    }
    if (result.taxonomy && result.taxonomy.uncertainty && result.taxonomy.uncertainty.length) {
      lines.push("Uncertainty: " + result.taxonomy.uncertainty.slice(0, 3).join(" "));
    }
    lines.push("This is relative search guidance for whitetail shed walking — not a map of antlers.");
    return lines.join(" ");
  }

  /**
   * Core scorer — used by the heat / planner pipeline.
   */
  function scoreCell(opts) {
    opts = opts || {};
    var prefs = opts.prefs || { weights: {} };
    var lat = opts.lat;
    var lng = opts.lng;
    var season = seasonProfile(opts.date, lat);
    var terrain = opts.terrain || { slope: null, aspect: null, source: "unavailable" };
    var slope = slopePreferenceScore(terrain.slope);
    var aspect = aspectPreferenceScore(terrain.aspect, lat);
    var form = terrainFormScore(terrain.morphology);
    var obs = observationSignals(lat, lng, opts.observations, prefs);
    var wx = weatherModifiers(opts.weather, prefs);

    var edgeScore = 0.5;
    var edgeAvail = false;
    if (typeof opts.edgeHint === "number") {
      edgeScore = clamp(opts.edgeHint, 0, 1);
      edgeAvail = true;
    } else if (obs.edgeNote > 0) {
      edgeScore = clamp(0.45 + obs.edgeNote, 0, 1);
      edgeAvail = true;
    }

    var thermalScore = obs.thermal > 0
      ? clamp(obs.thermal, 0, 1)
      : (obs.bedding > 0.35 ? clamp(obs.bedding * 0.55, 0, 0.7) : 0.5);
    var thermalAvail = obs.thermal > 0 || obs.bedding > 0.35;

    // Human pressure: high score means MORE pressure → invert for search attractiveness
    var humanAttract = obs.humanPressure > 0
      ? clamp(1 - obs.humanPressure, 0.15, 1)
      : 0.5;
    var humanAvail = obs.humanPressure > 0;

    var factors = [
      buildFactorEntry("season_timing", season.score, {
        weightScale: weightOf(prefs, "season"),
        available: true,
        labelDetail: season.phase,
        dataKind: "ecological_assumption"
      }),
      buildFactorEntry("slope", slope.score, {
        weightScale: weightOf(prefs, "slope"),
        available: slope.available,
        labelDetail: slope.label
      }),
      buildFactorEntry("aspect_sun", aspect.score, {
        weightScale: weightOf(prefs, "aspect"),
        available: aspect.available,
        labelDetail: aspect.label,
        note: aspect.disagreementNote
      }),
      buildFactorEntry("terrain_form", form.score, {
        weightScale: weightOf(prefs, "terrainForm"),
        available: form.available,
        labelDetail: form.label
      }),
      buildFactorEntry("thermal_cover", thermalScore, {
        weightScale: weightOf(prefs, "thermalCover"),
        available: thermalAvail,
        labelDetail: thermalAvail ? "winter/thermal cover signal" : null,
        dataKind: thermalAvail ? "observed" : "inferred"
      }),
      buildFactorEntry("feeding", obs.feeding, {
        weightScale: 1,
        available: obs.feeding > 0,
        dataKind: "observed"
      }),
      buildFactorEntry("bedding", obs.bedding, {
        weightScale: 1,
        available: obs.bedding > 0,
        dataKind: "observed"
      }),
      buildFactorEntry("edge_transition", edgeScore, {
        weightScale: weightOf(prefs, "edges"),
        available: edgeAvail,
        dataKind: edgeAvail ? (opts.edgeHint != null ? "inferred" : "observed") : "inferred"
      }),
      buildFactorEntry("corridors", obs.corridors, {
        weightScale: 1,
        available: obs.corridors > 0
      }),
      buildFactorEntry("fence_crossing", obs.fences, {
        weightScale: 1,
        available: obs.fences > 0
      }),
      buildFactorEntry("deer_sign", obs.deerSign, {
        weightScale: 1,
        available: obs.deerSign > 0
      }),
      buildFactorEntry("shed_find_interest", obs.shedBoost, {
        weightScale: 1,
        available: obs.shedBoost > 0
      }),
      buildFactorEntry("human_pressure", humanAttract, {
        weightScale: weightOf(prefs, "humanPressure"),
        available: humanAvail,
        dataKind: humanAvail ? "observed" : "inferred",
        labelDetail: humanAvail ? "lower attractiveness under recorded disturbance" : null
      })
    ];

    capContributions(factors);

    var additive = 0;
    factors.forEach(function (f) { additive += f.contribution; });

    var searchW = weightOf(prefs, "searchHistory");
    var searchPenalty = obs.searchPenalty;
    var afterSearch = additive * (1 - 0.55 * searchPenalty * (searchW > 0 ? 1 : 0));

    var wxMul = 1;
    if (weightOf(prefs, "snow") > 0) {
      wxMul = wx.snowFactor * wx.coldFactor * wx.windFactor;
      // Deep snow without observed winter cover: do not invent yards — slight damp only
      if ((wx.snowMm || 0) > 15 && !thermalAvail) wxMul *= 0.92;
      // Deep snow + observed winter concentration: modest concentration preference
      if ((wx.snowMm || 0) > 15 && obs.thermal > 0.25) wxMul *= 1.06;
    }
    afterSearch *= wxMul;

    var coverageFactor = 1;
    var coverageLevel = opts.coverageLevel || null;
    if (opts.coverageFactor != null && isFinite(opts.coverageFactor)) {
      coverageFactor = clamp(opts.coverageFactor, 0.2, 1.15);
    }
    afterSearch *= coverageFactor;

    var priority = clamp(afterSearch / 0.85, 0, 1);

    var band = "lower";
    if (priority >= 0.72) band = "higher";
    else if (priority >= 0.45) band = "moderate";

    var terrainAvailable = terrain.source === "map-derived" && slope.available;
    var weatherAvail = wx.source !== "unavailable";
    var uncertaintyNotes = wx.notes.slice();
    if (aspect.disagreementNote) uncertaintyNotes.push(aspect.disagreementNote);
    uncertaintyNotes.push("Land-cover polygons are not loaded in v1.0.");

    var confidence = confidenceBundle(
      factors, opts, obs, terrainAvailable, weatherAvail, edgeAvail
    );
    var taxonomy = taxonomyFrom(factors, uncertaintyNotes);

    var parts = {
      season: season.score * weightOf(prefs, "season"),
      slope: slope.score,
      aspect: aspect.score,
      terrainForm: form.score,
      thermal: thermalScore,
      feeding: obs.feeding,
      bedding: obs.bedding,
      corridors: obs.corridors,
      deerSign: obs.deerSign,
      fences: obs.fences,
      shedBoost: obs.shedBoost,
      humanPressure: obs.humanPressure,
      searchPenalty: searchPenalty,
      snowFactor: wx.snowFactor,
      coverageFactor: coverageFactor
    };

    var result = {
      modelVersion: MODEL_VERSION,
      speciesId: SPECIES_ID,
      priority: priority,
      band: band,
      factors: factors,
      parts: parts,
      labels: {
        seasonPhase: season.phase,
        slope: slope.label,
        aspect: aspect.label,
        terrainForm: form.label,
        coverageLevel: coverageLevel
      },
      sources: {
        season: season.source,
        terrain: terrain.source || "unavailable",
        observations: (opts.observations && opts.observations.length) ? "user-observation" : "unavailable",
        weather: wx.source,
        landCover: edgeAvail ? (opts.edgeHint != null ? "estimated" : "user-observation") : "unavailable"
      },
      seasonNote: season.note,
      confidence: confidence,
      taxonomy: taxonomy,
      weatherNotes: wx.notes,
      contributionBreakdown: factors.map(function (f) {
        return {
          key: f.id,
          label: f.label,
          value: Math.round(f.contribution * 1000) / 1000,
          dataKind: f.dataKind,
          evidenceIds: f.evidenceIds
        };
      }),
      calibration: {
        schema: "waypoint-sheds-calibration-hooks-v1",
        modelVersion: MODEL_VERSION,
        readyFor: [
          "regional_peak_doy_offset",
          "per_factor_bias_from_confirmed_finds",
          "season_validation_pass_fail",
          "user_weight_profiles_by_region"
        ],
        note: "Hooks only — no learning implemented in v1.0."
      }
    };
    result.explanation = explainBiological(result);
    return result;
  }

  function terrainMorphologyAt(grid, row, col, rows, cols) {
    function eAt(r, c) {
      if (r < 0 || c < 0 || r >= rows || c >= cols || !grid) return null;
      var v = grid[r * cols + c];
      return typeof v === "number" && isFinite(v) ? v : null;
    }
    var c0 = eAt(row, col);
    if (c0 == null) return { source: "unavailable" };
    var nbrs = [];
    var dr;
    var dc;
    for (dr = -1; dr <= 1; dr++) {
      for (dc = -1; dc <= 1; dc++) {
        if (!dr && !dc) continue;
        var v = eAt(row + dr, col + dc);
        if (v != null) nbrs.push(v);
      }
    }
    if (nbrs.length < 4) return { source: "unavailable" };
    var mean = nbrs.reduce(function (a, b) { return a + b; }, 0) / nbrs.length;
    var rel = c0 - mean;
    var higher = 0;
    var lower = 0;
    nbrs.forEach(function (v) {
      if (v > c0 + 1.5) higher += 1;
      if (v < c0 - 1.5) lower += 1;
    });
    var n = eAt(row - 1, col);
    var s = eAt(row + 1, col);
    var w = eAt(row, col - 1);
    var e = eAt(row, col + 1);
    var saddleNS = n != null && s != null && w != null && e != null &&
      n > c0 + 2 && s > c0 + 2 && w < c0 - 1 && e < c0 - 1;
    var saddleEW = n != null && s != null && w != null && e != null &&
      w > c0 + 2 && e > c0 + 2 && n < c0 - 1 && s < c0 - 1;
    var ridgeHint = rel > 3 || higher >= 5 ? 0.75 : rel > 1.2 ? 0.45 : 0.15;
    var drainageHint = rel < -3 || lower >= 5 ? 0.8 : rel < -1.2 ? 0.5 : 0.15;
    var saddleHint = (saddleNS || saddleEW) ? 0.85 : 0.1;
    // Bench-ish: near mean elevation with modest neighbor spread
    var spread = 0;
    nbrs.forEach(function (v) { spread += Math.abs(v - mean); });
    spread /= nbrs.length;
    var benchHint = (Math.abs(rel) < 2 && spread < 4 && spread > 0.4) ? 0.65 : 0.15;
    return {
      source: "map-derived",
      relativeElev: rel,
      ridgeHint: ridgeHint,
      drainageHint: drainageHint,
      saddleHint: saddleHint,
      benchHint: benchHint
    };
  }

  function listFactors() {
    return Object.keys(FACTOR_CATALOG).map(function (k) { return FACTOR_CATALOG[k]; });
  }

  function getEvidence(id) {
    return EVIDENCE[id] || null;
  }

  global.WaypointShedsBiological = {
    MODEL_VERSION: MODEL_VERSION,
    SPECIES_ID: SPECIES_ID,
    WEIGHT_SCALE: WEIGHT_SCALE,
    BASE_SHARE: BASE_SHARE,
    MAX_FACTOR_FRACTION: MAX_FACTOR_FRACTION,
    EVIDENCE: EVIDENCE,
    FACTOR_CATALOG: FACTOR_CATALOG,
    listFactors: listFactors,
    getEvidence: getEvidence,
    seasonProfile: seasonProfile,
    scoreCell: scoreCell,
    explain: explainBiological,
    terrainMorphologyAt: terrainMorphologyAt,
    haversineM: haversineM,
    weightOf: weightOf,
    observationSignals: observationSignals
  };
})(typeof window !== "undefined" ? window : globalThis);
