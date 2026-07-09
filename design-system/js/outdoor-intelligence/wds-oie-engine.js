/**
 * Outdoor Intelligence Engine v1 — unified Outdoor Briefing object.
 * One engine. Many presentations (Dashboard, Photo Coach, Observatory, widgets).
 */
(function (global) {
  "use strict";

  var C = global.WDS && global.WDS.oieCore;
  if (!C) return;

  var VERSION = "1.0.0";
  var lastBriefing = null;

  function block(opts) { return C.block(opts); }

  function domainIntel(platform) {
    var out = { trails: null, water: null, wildlife: null, safety: null, flora: null };
    var map = [
      ["trailDashboardIntel", "trails"],
      ["waterDashboardIntel", "water"],
      ["wildlifeDashboardIntel", "wildlife"],
      ["safetyDashboardIntel", "safety"],
      ["floraDashboardIntel", "flora"]
    ];
    map.forEach(function (pair) {
      var mod = global.WDS && global.WDS[pair[0]];
      if (mod && mod.analyze) {
        var intel = mod.analyze(platform);
        out[pair[1]] = { intel: intel, summary: mod.summary ? mod.summary(intel) : null };
      }
    });
    return out;
  }

  function unavailableBlock(category, source) {
    return block({
      category: category,
      what: "Data currently unavailable",
      why: "Upstream provider did not return usable data in this load cycle.",
      whyItMatters: "Operational dashboards must never stay blank or pending.",
      whatToDo: "Refresh once network or provider recovers.",
      whatToLookFor: "Provider status in footer telemetry.",
      trust: "Unavailable",
      source: source || "Waypoint"
    });
  }

  function domainBlock(domain, summary, intel, trust, source) {

    if (!summary && !(intel && intel.headline)) return null;
    return block({
      category: domain,
      what: summary || (intel && intel.headline) || "",
      why: intel && intel.detail ? intel.detail : "Regional and weather context shape " + domain + " conditions.",
      whyItMatters: "Local " + domain + " can differ from valley weather within miles.",
      whatToDo: intel && intel.recommendation ? intel.recommendation : "Verify locally before committing.",
      whatToLookFor: intel && intel.watch ? intel.watch : "Check official sources when live feeds are unavailable.",
      trust: trust || "Estimated",
      source: source || "Regional bundle + weather"
    });
  }

  function buildSections(ctx, oieCtx, weatherBlocks, photoBlocks, natureBlocks) {
    var platform = ctx.platform || {};
    var wx = platform.weatherRef;
    var dl = platform.daylight;
    var domains = domainIntel(platform);
    var OW = global.WDS && global.WDS.outdoorWeatherIntel;
    var intel = wx && OW && OW.analyze ? OW.analyze(wx, platform) : null;
    var scores = wx && OW && OW.scorecard ? OW.scorecard(wx, platform) : null;
    var Sky = global.WDS && global.WDS.skyDashboardIntel;
    var sky = wx && Sky && Sky.analyze ? Sky.analyze(wx, platform) : null;

    var current = C.section("current", weatherBlocks);
    var forecast = block({
      category: "forecast",
      what: oieCtx.pop != null && oieCtx.pop >= 15
        ? "Rain chance " + oieCtx.pop + "% today" + (oieCtx.precipAmt ? " · up to " + oieCtx.precipAmt + " in" : "")
        : "No significant rain in current forecast window.",
      why: "Probability aggregates model spread — local showers may differ.",
      whyItMatters: "Forecast shapes trail mud, stream crossings, and fungi-friendly moisture.",
      whatToDo: "Check hourly trend before exposed travel.",
      whatToLookFor: "Building cumulus after noon on fair days.",
      trust: "Estimated",
      source: "Open-Meteo"
    });

    var sun = dl ? block({
      category: "sun",
      what: "Sunrise " + (dl.sunriseFormatted || "—") + " · Sunset " + (dl.sunsetFormatted || "—"),
      why: "Solar angle controls light quality, temperature swing, and wildlife activity windows.",
      whyItMatters: "Sun timing drives photography and safety planning more than clock time.",
      whatToDo: "Plan key outdoor time around sunrise or golden hour.",
      whatToLookFor: dl.goldenHour ? "Golden hour: " + dl.goldenHour : "Western horizon breaks before sunset.",
      trust: "Live",
      source: "Open-Meteo astronomy"
    }) : null;

    var moon = dl && dl.moonPhase ? block({
      category: "moon",
      what: "Moon: " + dl.moonPhase + (dl.moonIllumination != null ? " (" + Math.round(dl.moonIllumination) + "% illuminated)" : ""),
      why: "Moon brightness affects night photography and nocturnal wildlife visibility.",
      whyItMatters: "Dark moon favors stars; bright moon favors moonlit landscapes.",
      whatToDo: "Match night objectives to moon phase.",
      whatToLookFor: "Moonrise alignment with ridges when planning night shots.",
      trust: "Live",
      source: "Open-Meteo astronomy"
    }) : null;

    var goldenHour = dl && dl.goldenHour ? block({
      category: "goldenHour",
      what: dl.goldenHour,
      why: "Low sun angle warms color and lengthens shadows.",
      whyItMatters: "Highest-value daily window for landscape and wildlife photography.",
      whatToDo: "Be on location before the window opens.",
      whatToLookFor: "Rim light on fur, feathers, and grass seed heads.",
      trust: "Estimated",
      source: "Open-Meteo astronomy"
    }) : null;

    var blueHour = dl && dl.blueHour ? block({
      category: "blueHour",
      what: dl.blueHour,
      why: "Indirect skylight balances with artificial lights in built environments.",
      whyItMatters: "Narrow window for balanced city-nature scenes.",
      whatToDo: "Tripod and bracket exposures.",
      whatToLookFor: "Cool sky gradient above warm horizon.",
      trust: "Estimated",
      source: "Open-Meteo astronomy"
    }) : null;

    var aqiValue = platform.airQuality
      ? (platform.airQuality.usAqi != null ? platform.airQuality.usAqi : platform.airQuality.aqi)
      : null;
    var aqi = aqiValue != null
      ? block({
          category: "aqi",
          what: "US AQI " + aqiValue + (platform.airQuality.category ? " (" + platform.airQuality.category + ")" : ""),
          why: "Fine particulate and ozone affect breathing and distant clarity.",
          whyItMatters: aqiValue >= 100 ? "Sensitive groups should reduce prolonged exertion." : "Air quality supports outdoor activity at moderate pace.",
          whatToDo: aqiValue >= 150 ? "Shorten intense hikes; consider indoor backup." : "Good air for outdoor activity.",
          whatToLookFor: "Haze on horizons when AQI is elevated.",
          trust: "Live",
          source: "Open-Meteo Air Quality"
        })
      : null;

    var alerts = oieCtx.alertCount > 0 ? C.section("alerts", weatherBlocks.filter(function (bl) {
      return bl.tags && bl.tags.indexOf("alert") >= 0;
    })) : block({
      category: "alerts",
      what: "No NWS alerts for your coordinates.",
      why: "Absence of alerts does not mean absence of weather risk — check hourly forecast.",
      whyItMatters: "Conditions change faster than daily summaries.",
      whatToDo: "Monitor radar if storms are possible.",
      whatToLookFor: "Building cumulus and wind shifts.",
      trust: "Live",
      source: "NWS"
    });

    var usgs = platform.usgsWater;
    var water = null;
    var river = null;
    if (usgs && usgs.nearest) {
      var US = global.WDS && global.WDS.usgsWater;
      var fg = US && US.formatGauge ? US.formatGauge(usgs) : null;
      if (fg) {
        river = block({
          category: "river",
          what: fg.headline + " — " + fg.detail,
          why: "Stream stage and discharge indicate crossing difficulty and flood trend.",
          whyItMatters: "Rising water can make ford crossings dangerous within hours.",
          whatToDo: "Compare gauge reading to local flood stage before water crossings.",
          whatToLookFor: "Recent rain upstream may not appear at gauge yet — allow lag time.",
          trust: "Live",
          source: "USGS IV (provisional)"
        });
        water = river;
      }
    } else if (domains.water && domains.water.summary) {
      water = domainBlock("water", domains.water.summary, domains.water.intel,
        "Estimated", "USGS + regional hydrology");
    } else {
      water = block({
        category: "water",
        what: "Data currently unavailable",
        why: "No live USGS gauge resolved for these coordinates.",
        whyItMatters: "Water stage informs crossing and flood risk.",
        whatToDo: "Retry after location refresh.",
        whatToLookFor: "Gauge proximity and recent rainfall upstream.",
        trust: "Unavailable",
        source: "USGS"
      });
    }

    var photography = C.section("photography", photoBlocks);
    if (intel && intel.photography && !photography.what) {
      photography = block({
        category: "photography",
        what: intel.photography.summary + (intel.photography.detail ? " — " + intel.photography.detail : ""),
        why: "Cloud cover, humidity, and sun angle shape contrast and subject visibility.",
        whyItMatters: "Light quality is the primary lever for outdoor image impact.",
        whatToDo: intel.photography.level === "excellent" ? "Carry a camera — conditions favor strong frames." : "Shoot early/late or embrace atmosphere.",
        whatToLookFor: "Hourly cloud breaks creating brief peak light.",
        trust: "Estimated",
        source: "Open-Meteo + derived light"
      });
    }

    var hiking = intel && intel.hiking ? block({
      category: "hiking",
      what: intel.hiking.summary + (intel.hiking.detail ? " — " + intel.hiking.detail : ""),
      why: "Temperature, precipitation, and wind drive comfort and risk on exposed trails.",
      whyItMatters: "Heat, storms, and mud change route safety more than difficulty ratings.",
      whatToDo: intel.hiking.level === "poor" ? "Choose sheltered routes or postpone." : "Pack layers matched to feels-like.",
      whatToLookFor: "Ridge lines and water crossings worsen first in changing weather.",
      trust: "Estimated",
      source: "Open-Meteo"
    }) : null;

    var wildlife = intel && intel.wildlife ? block({
      category: "wildlife",
      what: intel.wildlife.summary + (intel.wildlife.detail ? " — " + intel.wildlife.detail : ""),
      why: "Temperature and weather front timing concentrate animal movement.",
      whyItMatters: "Dawn and dusk remain peak windows even when midday is quiet.",
      whatToDo: "Move slowly at edges — forest margins and water first.",
      whatToLookFor: "Storm fronts suppress movement; after rain, amphibians rebound.",
      trust: "Estimated",
      source: "Open-Meteo + season"
    }) : domainBlock("wildlife", domains.wildlife && domains.wildlife.summary, domains.wildlife && domains.wildlife.intel,
      "Estimated", "Regional wildlife + weather");

    var plants = domainBlock("plants", domains.flora && domains.flora.summary, domains.flora && domains.flora.intel, "Estimated", "Regional flora + weather");
    var phenology = natureBlocks.length ? C.section("phenology", natureBlocks.filter(function (bl) {
      return bl.tags && (bl.tags.indexOf("bloom") >= 0 || bl.tags.indexOf("leaves") >= 0 || bl.tags.indexOf("season") >= 0);
    })) : block({
      category: "phenology",
      what: oieCtx.season + " at your latitude — notice bud swell, bloom, or senescence by habitat.",
      why: "Phenology marks seasonal progression and signals pollinator activity.",
      whyItMatters: "South-facing slopes often lead timing by a week or more.",
      whatToDo: "Photograph one stage with date for personal phenology record.",
      whatToLookFor: "Edges, wetlands, and south aspects first.",
      trust: "Estimated",
      source: "Seasonal signal model"
    });

    var nightSky = sky && sky.nightPhotography ? block({
      category: "nightSky",
      what: sky.nightPhotography.headline + " — " + sky.nightPhotography.detail,
      why: "Moon brightness and cloud cover determine star visibility.",
      whyItMatters: "Night sky quality affects astrophotography and nocturnal ecology observation.",
      whatToDo: "Check cloud forecast before dark-sky travel.",
      whatToLookFor: "Gaps toward zenith after dusk.",
      trust: "Estimated",
      source: "Moon + cloud cover"
    }) : (scores && scores.nightSky ? block({
      category: "nightSky",
      what: scores.nightSky.why && scores.nightSky.why[0] ? scores.nightSky.why[0] : "Night sky conditions estimated from moon and clouds.",
      why: "Dark skies reveal circadian rhythms in wildlife.",
      whyItMatters: "Astro and ecology both depend on night brightness.",
      whatToDo: "Allow eyes 20 minutes to dark-adapt.",
      whatToLookFor: "Owl calls after astronomical twilight.",
      trust: "Estimated",
      source: "Derived astronomy"
    }) : null);

    var safety = intel && scores && scores.safety ? block({
      category: "safety",
      what: scores.safety.why && scores.safety.why[0] ? scores.safety.why[0] : "Safety assessed from weather, UV, AQI, and alerts.",
      why: "Multiple hazards compound — storms, heat, cold, and air quality together.",
      whyItMatters: "Official alerts override normal outdoor plans when present.",
      whatToDo: oieCtx.alertCount > 0 ? "Read NWS alert at weather.gov." : "Carry layers and water; tell someone your route.",
      whatToLookFor: "Changing wind, darkening western sky, heat shimmer.",
      trust: scores.safety.trust || "Estimated",
      source: "Open-Meteo + NWS"
    }) : null;

    var lessonBlock = null;

    var conservation = null;

    if (!current || !current.what) current = unavailableBlock("current", "Open-Meteo");
    if (!forecast || !forecast.what) forecast = unavailableBlock("forecast", "Open-Meteo");
    if (!sun || !sun.what) sun = unavailableBlock("sun", "Open-Meteo astronomy");
    if (!moon || !moon.what) moon = unavailableBlock("moon", "Open-Meteo astronomy");
    if (!aqi || !aqi.what) aqi = unavailableBlock("aqi", "Open-Meteo Air Quality");
    if (!alerts || !alerts.what) alerts = unavailableBlock("alerts", "NWS");
    if (!water || !water.what) water = unavailableBlock("water", "USGS");
    if (!photography || !photography.what) photography = unavailableBlock("photography", "Derived light");
    if (!safety || !safety.what) safety = unavailableBlock("safety", "Open-Meteo + NWS");

    var radar = block({
      category: "radar",
      what: oieCtx.hasLive
        ? ((oieCtx.isStorm || (oieCtx.pop != null && oieCtx.pop >= 45))
          ? "Precipitation likely — monitor radar before exposed travel."
          : "No active storm signature in current conditions.")
        : "Data currently unavailable",
      why: "Radar status is inferred from live precipitation probability and storm flags when a dedicated radar feed is not connected.",
      whyItMatters: "Storm timing changes outdoor safety and photography windows.",
      whatToDo: oieCtx.hasLive ? "Cross-check weather.gov radar before ridge or water travel." : "Retry after live weather hydrates.",
      whatToLookFor: "Sudden wind shift, darkening west horizon, thunder.",
      trust: oieCtx.hasLive ? "Estimated" : "Unavailable",
      source: "Open-Meteo precip/storm cues"
    });

    return {
      current: current,
      forecast: forecast,
      sun: sun,
      moon: moon,
      goldenHour: goldenHour,
      blueHour: blueHour,
      aqi: aqi,
      alerts: alerts,
      water: water,
      river: river,
      radar: radar,
      photography: photography,
      hiking: hiking,
      wildlife: wildlife,
      plants: plants,
      phenology: phenology,
      nightSky: nightSky,
      safety: safety,
      lesson: null,
      conservation: null,
      intel: intel,
      scores: scores,
      sky: sky,
      domains: domains,
      photoFieldGuide: photoBlocks,
      todayInNature: []
    };
  }

  function buildSynthesis(sections, oieCtx, brief) {
    var happening = C.synthesizeProse([sections.current, sections.forecast].filter(Boolean), "what", 2);
    if (!happening && oieCtx.hasLive) {
      happening = C.synthesizeProse(oieCtx._weatherBlocks || [], "what", 2);
    }
    if (!happening) happening = "Live outdoor data is not yet available for these coordinates.";

    return {
      happening: happening,
      why: C.synthesizeProse([sections.current, sections.hiking].filter(Boolean), "why", 2),
      whyItMatters: C.synthesizeProse([sections.safety, sections.aqi, sections.alerts].filter(Boolean), "whyItMatters", 2),
      whatToDo: brief ? brief.verdictDetail : C.synthesizeProse([sections.hiking, sections.safety].filter(Boolean), "whatToDo", 2),
      whatToLookFor: brief && brief.lookFor ? brief.lookFor : C.synthesizeProse([sections.wildlife, sections.phenology].filter(Boolean), "whatToLookFor", 2),
      whatToPhotograph: sections.photography ? sections.photography.what : C.synthesizeProse(sections.photoFieldGuide || [], "what", 1),
      whatToLearn: "Data currently unavailable"
    };
  }

  function buildMorning(oieCtx, sections, synthesis, brief) {
    var MB = global.WDS && global.WDS.morningBriefing;
    var partial = {
      brief: brief,
      intel: sections.intel,
      learn: null,
      photoFieldGuide: (sections.photoFieldGuide || []).map(function (bl) {
        return { label: bl.category, text: bl.what, why: bl.why, trust: bl.trust };
      }),
      domains: sections.domains
    };
    var answers = MB && MB.buildMorningAnswers
      ? MB.buildMorningAnswers({ platform: oieCtx.platform, location: oieCtx.location }, partial)
      : null;
    if (answers && synthesis) {
      answers.now = synthesis.happening || answers.now;
      answers.notice = synthesis.whatToLookFor || answers.notice;
      answers.photograph = synthesis.whatToPhotograph || answers.photograph;
      answers.goOutside = brief ? brief.verdictLabel + ". " + brief.verdictDetail : answers.goOutside;
      answers.learn = synthesis.whatToLearn || answers.learn;
    }
    return {
      answers: answers,
      pulse: answers && answers.pulse ? answers.pulse : null,
      todayInNature: []
    };
  }

  function collectSources(platform, sections) {
    var sources = ["Open-Meteo"];
    if (platform.alerts && platform.alerts.items && platform.alerts.items.length) sources.push("NWS");
    if (platform.airQuality && platform.airQuality.status === "live") sources.push("Open-Meteo AQI");
    if (platform.usgsWater && platform.usgsWater.nearest) sources.push("USGS");
    if (sections.domains && sections.domains.trails) sources.push("Regional trails");
    return sources;
  }

  function build(ctx) {
    ctx = ctx || {};
    var platform = ctx.platform || {};
    var oieCtx = C.buildContext(ctx);
    oieCtx.platform = platform;
    oieCtx.location = ctx.location || {};

    var weatherRules = (global.WDS.oieWeatherRules && global.WDS.oieWeatherRules.all()) || [];
    var photoRules = (global.WDS.oiePhotographyRules && global.WDS.oiePhotographyRules.all()) || [];
    var natureRules = [];

    var weatherBlocks = C.applyRules(oieCtx, weatherRules);
    var photoBlocks = C.applyRules(oieCtx, photoRules);
    var natureBlocks = C.applyRules(oieCtx, natureRules);
    oieCtx._weatherBlocks = weatherBlocks;

    var Brief = global.WDS && global.WDS.dashboardBrief;
    var brief = Brief && Brief.build ? Brief.build(ctx) : null;

    var sections = buildSections(ctx, oieCtx, weatherBlocks, photoBlocks, natureBlocks);
    var synthesis = buildSynthesis(sections, oieCtx, brief);

    var missions = [];

    var morning = buildMorning(oieCtx, sections, synthesis, brief);

    var outdoorScore = sections.scores && sections.scores.outdoor ? sections.scores.outdoor.value : null;
    var photoScore = sections.scores && sections.scores.photography ? sections.scores.photography.value : null;
    var confidence = oieCtx.hasLive ? 0.82 : 0.45;
    if (oieCtx.alertCount > 0) confidence = 0.9;

    var wx = platform.weatherRef;
    var updatedAt = wx && wx.meta && wx.meta.fetchedAt ? wx.meta.fetchedAt : new Date().toISOString();

    var briefing = {
      meta: {
        version: VERSION,
        assembledAt: new Date().toISOString(),
        hasLive: oieCtx.hasLive,
        national: oieCtx.national,
        confidence: confidence,
        trustLabels: ["Live", "Estimated", "Unavailable"],
        sources: collectSources(platform, sections),
        updatedAt: updatedAt,
        ruleCount: weatherBlocks.length + photoBlocks.length + natureBlocks.length
      },
      location: oieCtx.location,
      platform: platform,
      current: sections.current,
      forecast: sections.forecast,
      sun: sections.sun,
      moon: sections.moon,
      goldenHour: sections.goldenHour,
      blueHour: sections.blueHour,
      aqi: sections.aqi,
      alerts: sections.alerts,
      water: sections.water,
      river: sections.river,
      radar: sections.radar,
      readiness: (function () {
        return block({
          category: "readiness",
          what: brief && brief.verdictLabel ? brief.verdictLabel : (oieCtx.hasLive ? "Outdoor conditions available" : "Data currently unavailable"),
          why: brief && brief.verdictDetail ? brief.verdictDetail : "Readiness combines weather, alerts, UV, and AQI.",
          whyItMatters: "A single readiness line answers whether to go outside now.",
          whatToDo: brief && brief.verdict === "wait" ? "Postpone exposed routes and monitor alerts." : (oieCtx.hasLive ? "Proceed with layers matched to conditions." : "Refresh location."),
          whatToLookFor: "Alerts, UV, wind, and hourly precip trend.",
          trust: oieCtx.hasLive ? "Estimated" : "Unavailable",
          source: "OIE readiness"
        });
      })(),
      photography: sections.photography,
      hiking: sections.hiking,
      wildlife: sections.wildlife,
      plants: sections.plants,
      phenology: sections.phenology,
      nightSky: sections.nightSky,
      safety: sections.safety,
      missions: [],
      lesson: null,
      conservation: null,
      outdoorScore: outdoorScore,
      photographyScore: photoScore,
      confidence: confidence,
      synthesis: synthesis,
      morning: morning,
      brief: brief,
      intel: sections.intel,
      scores: sections.scores,
      domains: sections.domains,
      photoFieldGuide: sections.photoFieldGuide,
      todayInNature: [],
      provenance: {
        sources: collectSources(platform, sections),
        updatedAt: updatedAt
      }
    };

    lastBriefing = briefing;
    return briefing;
  }

  function toLegacyCompose(briefing) {
    if (!briefing) return null;
    var notices = [];
    ["readiness", "current", "forecast", "alerts", "aqi", "sun", "moon", "water", "radar", "photography", "safety"].forEach(function (key) {
      var s = briefing[key];
      if (s && s.what) {
        notices.push({
          domain: s.category === "river" ? "water" : (s.category || key),
          what: s.what,
          why: s.why,
          matters: s.whyItMatters,
          doAction: s.whatToDo,
          watch: s.whatToLookFor,
          trust: s.trust,
          source: s.source,
          text: s.what
        });
      }
    });
    return {
      hasLive: briefing.meta.hasLive,
      headline: briefing.brief ? briefing.brief.verdictLabel : "Outdoor briefing",
      verdict: briefing.brief ? briefing.brief.verdict : "caution",
      narrative: [briefing.synthesis.happening],
      notices: notices,
      evidence: briefing.brief && briefing.brief.stats
        ? briefing.brief.stats.map(function (s) { return s.label + " " + s.value; })
        : [],
      brief: briefing.brief,
      intel: briefing.intel,
      scores: briefing.scores,
      domains: briefing.domains,
      challenge: null,
      missions: [],
      learn: null,
      morningAnswers: briefing.morning.answers,
      todayInNature: [],
      photoFieldGuide: (briefing.photoFieldGuide || []).map(function (bl) {
        return { label: bl.category, text: bl.what, why: bl.why, trust: bl.trust };
      }),
      provenance: briefing.provenance
    };
  }

  function toPhotoCoachSnapshot(briefing) {
    if (!briefing) return null;
    var b = briefing;
    var loc = b.location || {};
    var cur = b.platform && b.platform.weatherRef && b.platform.weatherRef.current;
    var Cnum = C.num;
    return {
      version: 2,
      engine: VERSION,
      savedAt: b.meta.assembledAt,
      location: {
        city: loc.city,
        county: loc.county || loc.name,
        state: loc.state || loc.stateCode,
        lat: loc.lat,
        lng: loc.lng
      },
      weather: cur ? {
        temp: Cnum(cur.temperature),
        feels: Cnum(cur.feelsLike),
        conditions: cur.conditions && cur.conditions.summary,
        humidity: Cnum(cur.humidity),
        windMph: cur.wind && Cnum(cur.wind.speed),
        trust: "Live",
        source: "Open-Meteo"
      } : null,
      daylight: b.sun ? {
        sunrise: b.sun.what,
        goldenHour: b.goldenHour && b.goldenHour.what,
        blueHour: b.blueHour && b.blueHour.what,
        moonPhase: b.moon && b.moon.what,
        trust: "Live"
      } : null,
      synthesis: b.synthesis,
      photography: b.photography,
      hiking: b.hiking,
      safety: b.safety,
      water: b.water,
      missions: [],
      lesson: null,
      outdoorScore: b.outdoorScore,
      photographyScore: b.photographyScore,
      confidence: b.confidence,
      critiquePrep: {
        weatherAware: !!(b.current && b.synthesis),
        seasonAware: !!(b.phenology && b.phenology.what),
        goldenHourAware: !!(b.goldenHour && b.goldenHour.what),
        moonAware: !!(b.moon && b.moon.what),
        waterAware: !!(b.water && b.water.what)
      },
      briefingHeadline: b.brief ? b.brief.verdictLabel : null,
      challenge: null
    };
  }

  function toObservatorySnapshot(briefing) {
    if (!briefing) return null;
    return {
      version: VERSION,
      now_outside: briefing.synthesis.happening,
      ecology_note: {
        text: briefing.phenology ? briefing.phenology.what : "Seasonal signal not available.",
        type: "estimated",
        season: briefing.meta && briefing.meta.hasLive ? (briefing.platform && briefing.platform.daylight ? "live" : "season") : "unavailable",
        trust: "estimated"
      },
      water: briefing.river ? {
        available: briefing.river.trust === "Live",
        summary: briefing.river.what,
        trust: briefing.river.trust,
        source: briefing.river.source
      } : { available: false, message: briefing.water ? briefing.water.what : "No gauge data" },
      photography: briefing.photography ? briefing.photography.what : null,
      missions: [],
      synthesis: briefing.synthesis,
      confidence: briefing.confidence,
      updated_at: briefing.meta.updatedAt,
      source: "Waypoint OIE v1"
    };
  }

  function getLast() { return lastBriefing; }

  global.WDS = global.WDS || {};
  global.WDS.outdoorIntelligenceEngine = {
    VERSION: VERSION,
    build: build,
    getLast: getLast,
    toLegacyCompose: toLegacyCompose,
    toPhotoCoachSnapshot: toPhotoCoachSnapshot,
    toObservatorySnapshot: toObservatorySnapshot
  };
  global.WDS.oie = global.WDS.outdoorIntelligenceEngine;
})(window);
