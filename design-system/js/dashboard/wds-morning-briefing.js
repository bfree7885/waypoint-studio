/**
 * Morning outdoor briefing — human synthesis, Today in Nature, field photography.
 * Powers the opening screen: where, now, delta, notice, photograph, go, learn.
 */
(function (global) {
  "use strict";

  var SNAPSHOT_KEY = "waypoint-briefing-snapshot-v1";

  function num(val) {
    if (val == null) return null;
    if (typeof val === "number" && isFinite(val)) return val;
    if (typeof val === "object" && val.value != null) return num(val.value);
    return null;
  }

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function locationLabel(ctx) {
    var loc = ctx.location || {};
    var parts = [];
    if (loc.city && loc.city !== "—") parts.push(loc.city);
    if (loc.county && loc.county !== "—" && loc.county !== loc.city) parts.push(loc.county);
    if (loc.stateCode) parts.push(loc.stateCode);
    else if (loc.state) parts.push(loc.state);
    if (!parts.length && loc.displayTitle) return loc.displayTitle;
    if (!parts.length && loc.name) return loc.name;
    return parts.length ? parts.join(", ") : "your coordinates";
  }

  function seasonAt(lat) {
    var UN = global.WDS && global.WDS.usNational;
    if (UN && UN.seasonLabel) return UN.seasonLabel(lat);
    var m = new Date().getMonth() + 1;
    if (m >= 3 && m <= 5) return "spring";
    if (m >= 6 && m <= 8) return "summer";
    if (m >= 9 && m <= 11) return "fall";
    return "winter";
  }

  function synthesizeNow(wx, intel) {
    var cur = (wx && wx.current) || {};
    var temp = num(cur.temperature);
    var humidity = num(cur.humidity);
    var wind = cur.wind && num(cur.wind.speed);
    var cloud = num(cur.cloudCover);
    var cond = ((cur.conditions && cur.conditions.summary) || "").toLowerCase();
    var parts = [];

    if (cond) {
      if (/fog|mist/.test(cond)) {
        parts.push("Fog and mist soften light across valleys and water edges right now");
      } else if (/rain|drizzle|shower/.test(cond)) {
        parts.push("Rain is active — trails may be slick and creeks are rising");
      } else if (/thunder|storm/.test(cond)) {
        parts.push("Storms are in play — exposed ridges and water crossings need extra caution");
      } else if (/clear|mainly clear/.test(cond) && cloud != null && cloud < 25) {
        parts.push("Clear skies mean hard midday light but crisp visibility for distance views");
      } else if (cloud != null && cloud >= 40 && cloud <= 85) {
        parts.push("Scattered clouds are diffusing sunlight — comfortable for being outside and kind to cameras");
      } else if (cond) {
        parts.push(cond.charAt(0).toUpperCase() + cond.slice(1) + " conditions outside right now");
      }
    }

    var comfort = [];
    if (humidity != null && humidity < 45) comfort.push("low humidity");
    if (wind != null && wind < 10) comfort.push("calm winds");
    if (wind != null && wind >= 20) comfort.push("breezy conditions");
    if (temp != null && temp >= 55 && temp <= 78) comfort.push("mild air temperature");

    if (comfort.length >= 2 && !/rain|storm|thunder/.test(cond)) {
      parts.push(comfort.slice(0, 3).join(", ") + " will produce comfortable outdoor conditions through much of the day");
    } else if (temp != null && !parts.length) {
      parts.push("Air near " + Math.round(temp) + "° — dress for feels-like and wind on exposed routes");
    }

    if (intel && intel.mushroom && intel.mushroom.level === "moist" && intel.mushroom.detail) {
      parts.push("Recent rainfall combined with warm overnight temperatures may increase mushroom activity over the next several days — this is weather context only, not a fruiting forecast");
    }

    if (!parts.length) return "Live weather is loading — check hourly trends before committing to exposed travel.";
    return parts.join(". ") + ".";
  }

  function loadSnapshot() {
    try {
      var raw = global.localStorage && global.localStorage.getItem(SNAPSHOT_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveSnapshot(wx, brief) {
    if (!wx || !wx.meta || wx.meta.isPlaceholder) return;
    var cur = wx.current || {};
    var snap = {
      date: new Date().toISOString().slice(0, 10),
      temp: num(cur.temperature),
      cond: (cur.conditions && cur.conditions.summary) || "",
      verdict: brief && brief.verdict,
      uv: num(cur.uvIndex),
      pop: num(cur.precipitation && cur.precipitation.probability)
    };
    try {
      if (global.localStorage) global.localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snap));
    } catch (e) { /* noop */ }
  }

  function compareSinceYesterday(wx, brief) {
    var prior = loadSnapshot();
    saveSnapshot(wx, brief);
    if (!prior || prior.date === new Date().toISOString().slice(0, 10)) {
      return {
        text: "First visit today — tomorrow you'll see how temperature, sky, and rain shifted overnight.",
        trust: "Estimated"
      };
    }
    var cur = (wx && wx.current) || {};
    var temp = num(cur.temperature);
    var cond = (cur.conditions && cur.conditions.summary) || "";
    var deltas = [];

    if (temp != null && prior.temp != null) {
      var diff = Math.round(temp - prior.temp);
      if (Math.abs(diff) >= 3) {
        deltas.push(diff > 0 ? diff + "° warmer than your last visit" : Math.abs(diff) + "° cooler than your last visit");
      } else {
        deltas.push("Temperature similar to your last visit");
      }
    }
    if (cond && prior.cond && cond.toLowerCase() !== prior.cond.toLowerCase()) {
      deltas.push("Sky shifted from " + prior.cond.toLowerCase() + " to " + cond.toLowerCase());
    } else if (cond && prior.cond) {
      deltas.push("Sky pattern holding steady (" + cond.toLowerCase() + ")");
    }
    if (brief && prior.verdict && brief.verdict !== prior.verdict) {
      deltas.push("Outdoor verdict changed — recheck alerts before heading out");
    }

    return {
      text: deltas.length ? deltas.join(". ") + "." : "Conditions are tracking close to your last visit.",
      trust: "Estimated"
    };
  }

  function buildPhotoFieldGuide(wx, platform, intel) {
    var Sky = global.WDS && global.WDS.skyDashboardIntel;
    var sky = Sky && Sky.analyze ? Sky.analyze(wx, platform) : null;
    var cur = (wx && wx.current) || {};
    var dl = platform && platform.daylight;
    var uv = num(cur.uvIndex);
    var items = [];

    if (intel && intel.photography) {
      items.push({
        label: "Light quality",
        text: intel.photography.summary + (intel.photography.detail ? " — " + intel.photography.detail : ""),
        why: "Cloud cover and humidity shape contrast, color saturation, and how textures read in frame.",
        trust: "Estimated"
      });
    }

    var bestWindow = dl && dl.goldenHour ? dl.goldenHour : (dl && dl.blueHour ? dl.blueHour : null);
    if (bestWindow) {
      items.push({
        label: "Best shooting window",
        text: "Golden hour: " + bestWindow + (dl.sunsetFormatted ? " · Sunset " + dl.sunsetFormatted : ""),
        why: "Low sun angle lengthens shadows and warms color — the highest-impact window for landscape and wildlife.",
        trust: dl.goldenHour ? "Estimated" : "Live"
      });
    }

    if (sky) {
      if (sky.fogPotential) {
        items.push({
          label: "Fog probability",
          text: sky.fogPotential.headline + " — " + sky.fogPotential.detail,
          why: "Fog simplifies backgrounds and reveals atmosphere — valleys and water edges first at dawn.",
          trust: /likely now/i.test(sky.fogPotential.headline) ? "Live" : "Estimated"
        });
      }
      if (sky.cloudCover) {
        items.push({
          label: "Cloud interest",
          text: sky.cloudCover.headline + (sky.cloudCover.detail ? " — " + sky.cloudCover.detail : ""),
          why: "Broken cloud decks create directional light and sunset color — watch the western horizon late day.",
          trust: "Live"
        });
      }
      if (sky.sunriseQuality) {
        items.push({
          label: "Landscape conditions",
          text: "Sunrise: " + sky.sunriseQuality.headline + " · Sunset: " + (sky.sunsetQuality && sky.sunsetQuality.headline || "—"),
          why: "Ridge silhouettes and water reflections peak when sky color separates from foreground exposure.",
          trust: "Estimated"
        });
      }
      if (sky.nightPhotography) {
        items.push({
          label: "Astrophotography outlook",
          text: sky.nightPhotography.headline + " — " + sky.nightPhotography.detail,
          why: "Moon brightness and cloud cover determine whether faint stars or moonlit landscapes are the better target.",
          trust: "Estimated"
        });
      }
    }

    if (/fog|mist|rain|overcast/.test(((cur.conditions && cur.conditions.summary) || "").toLowerCase())) {
      items.push({
        label: "Macro conditions",
        text: "Soft, even light favors forest floor detail — dew, fungi, and leaf texture without harsh specular highlights.",
        why: "Diffuse light lets you shoot close without battling shadow clipping on small subjects.",
        trust: "Estimated"
      });
    } else if (intel && intel.photography && intel.photography.level === "fair") {
      items.push({
        label: "Macro conditions",
        text: "Hard midday light — use your body or a hat to shade small subjects, or shoot early/late.",
        why: "Specular highlights on wet leaves and insect carapaces blow out quickly in direct sun.",
        trust: "Estimated"
      });
    }

    if (intel && intel.wildlife) {
      items.push({
        label: "Bird photography conditions",
        text: intel.wildlife.summary + (intel.wildlife.detail ? " — " + intel.wildlife.detail : ""),
        why: "Activity windows cluster at dawn and dusk when birds feed — overcast can extend workable hours.",
        trust: "Estimated"
      });
    }

    if (/rain|drizzle|fog|mist|overcast/.test(((cur.conditions && cur.conditions.summary) || "").toLowerCase()) ||
        (num(cur.humidity) != null && num(cur.humidity) >= 70)) {
      items.push({
        label: "Water reflection quality",
        text: "Still or sheltered water may hold reflections when wind is low — check ponds and creek bends after rain.",
        why: "Calm surfaces mirror sky color at blue hour — rain freshens color but wind ripples break the mirror.",
        trust: "Estimated"
      });
    }

    if (uv != null && uv >= 8) {
      items.push({
        label: "UV & heat",
        text: "UV index " + Math.round(uv) + " — harsh shadows and heat stress during long hikes.",
        why: "High UV also increases contrast and harsh shadows for photography while increasing heat stress during long hikes.",
        trust: "Live"
      });
    }

    return items;
  }

  function natureItem(category, text, why, trust, source) {
    return { category: category, text: text, why: why || "", trust: trust || "Estimated", source: source || "" };
  }

  function buildTodayInNature(ctx, doc) {
    var platform = ctx.platform || {};
    var wx = platform.weatherRef;
    var intel = doc.intel;
    var domains = doc.domains || {};
    var national = platform.meta && platform.meta.contentMode === "national-educational";
    var loc = ctx.location || {};
    var lat = num(loc.lat);
    var season = seasonAt(lat);
    var month = new Date().getMonth() + 1;
    var dl = platform.daylight;
    var items = [];

    if (intel && intel.wildlife) {
      items.push(natureItem(
        "Wildlife movement",
        intel.wildlife.summary + (intel.wildlife.detail ? " — " + intel.wildlife.detail : ""),
        "Temperature and weather front timing concentrate animal movement near dawn, dusk, and water.",
        "Estimated",
        "Open-Meteo + season"
      ));
    }

    items.push(natureItem(
      "Bird activity",
      month >= 3 && month <= 5
        ? "Spring songbirds are establishing territories — listen for dawn chorus in forest edges."
        : month >= 9 && month <= 11
          ? "Fall migration may concentrate birds along ridges and water — dawn is the busiest window."
          : "Diurnal birds feed most actively in the first and last light hours — scan edges and feeders.",
      "Birds respond to light level and insect availability — weather fronts can trigger fallout days.",
      "Estimated",
      national ? "Waypoint U.S. field guidance" : "Season + weather"
    ));

    var species = (platform.species && platform.species.active) || [];
    if (!national && species[0] && species[0].name) {
      items.push(natureItem(
        "Flowering",
        "Watch for " + species[0].name + (species[0].note ? " — " + species[0].note : ""),
        "Bloom timing ties to accumulated warmth — south-facing slopes often lead by a week or more.",
        "Editorial",
        "Local field bundle"
      ));
    } else {
      items.push(natureItem(
        "Flowering",
        season === "spring"
          ? "Early spring ephemerals respond to soil warmth — look on south-facing slopes and trail margins."
          : season === "summer"
            ? "Mid-summer meadows peak for pollinator visits — notice which flowers insects prefer."
            : season === "fall"
              ? "Late-season asters and goldenrods feed migrating insects — edges and old fields first."
              : "Winter botany shifts to buds, bark, and evergreen structure — conifers hold color against snow.",
        "Flowering phenology marks seasonal progression and signals pollinator and bird activity.",
        "Estimated",
        "Latitude-season guidance"
      ));
    }

    items.push(natureItem(
      "Tree phenology",
      season === "spring" ? "Leaf-out and bud swell track growing degree days — cooler nights slow coastal and valley trees."
        : season === "fall" ? "Senescence follows photoperiod and first frosts — ridges often color before valleys."
          : "Bark, bud scale, and crown shape tell the story between bloom seasons.",
      "Tree phenology links climate timing to wildlife food webs — mast crops and caterpillar hatch follow leaves.",
      "Estimated",
      "Season at your latitude"
    ));

    var insectTemp = num(wx && wx.current && wx.current.temperature);
    items.push(natureItem(
      "Insects",
      (insectTemp != null && insectTemp >= 55)
        ? "Warmer air brings out pollinators and aerial insects — spider webs appear on trail margins after calm nights."
        : "Cool air suppresses flying insects — look under logs and stones for slow-moving invertebrates.",
      "Insect activity tracks temperature and humidity — they are the base of many food webs you can observe directly.",
      "Estimated",
      "Season + temperature"
    ));

    if (month >= 3 && month <= 5 || month >= 9 && month <= 11) {
      items.push(natureItem(
        "Migration",
        month <= 5
          ? "Northbound migration peaks vary by latitude — cold fronts can ground songbirds in surprising numbers."
          : "Southbound migration follows food and cold fronts — ridges and coastlines act as funnels.",
        "Migration connects hemispheres — a single cold front can concentrate thousands of birds in one morning.",
        "Estimated",
        "General migration ecology"
      ));
    }

    if (intel && intel.mushroom) {
      items.push(natureItem(
        "Fungi",
        intel.mushroom.summary + (intel.mushroom.detail ? " — " + intel.mushroom.detail : ""),
        "Fungi respond to soil moisture and temperature — weather cues describe conditions, not species fruiting.",
        "Estimated",
        "Open-Meteo humidity & rain"
      ));
    }

    var usgs = platform.usgsWater;
    if (usgs && usgs.nearest) {
      var US = global.WDS && global.WDS.usgsWater;
      var fg = US && US.formatGauge ? US.formatGauge(usgs) : null;
      if (fg) {
        items.push(natureItem(
          "River conditions",
          fg.headline + " — " + fg.detail,
          "Stream flow affects crossing safety, fishing access, and where wildlife drinks — rising water lags rain upstream.",
          "Live",
          "USGS IV (provisional)"
        ));
      }
    } else if (domains.water && domains.water.summary) {
      items.push(natureItem(
        "River conditions",
        domains.water.summary,
        "No live gauge is linked — stream flow still shapes crossings, fishing, and riverside wildlife corridors.",
        national ? "Estimated" : "Editorial",
        national ? "U.S. hydrology guidance" : "Regional bundle"
      ));
    } else {
      items.push(natureItem(
        "River conditions",
        "Live stream gauge not connected — learn to read water color, debris lines, and bank wetness after rain.",
        "Stream stage and temperature affect dissolved oxygen, fish activity, and crossing safety.",
        "Estimated",
        "Waypoint hydrology guidance"
      ));
    }

    var Sky = global.WDS && global.WDS.skyDashboardIntel;
    var sky = Sky && wx ? Sky.analyze(wx, platform) : null;
    if (sky && sky.nightPhotography) {
      items.push(natureItem(
        "Night sky",
        sky.nightPhotography.headline + " — " + sky.nightPhotography.detail,
        "Dark skies reveal circadian rhythms in wildlife — owls, frogs, and insects shift after astronomical twilight.",
        "Estimated",
        "Moon + cloud cover"
      ));
    }

    if (dl && dl.moonPhase) {
      items.push(natureItem(
        "Astronomy",
        "Moon: " + dl.moonPhase + (dl.moonIllumination != null ? " (" + Math.round(dl.moonIllumination) + "% illuminated)" : ""),
        "Moon phase sets night brightness — bright moons favor landscape night walks; dark moons favor stars.",
        "Live",
        "Open-Meteo astronomy"
      ));
    }

    if (domains.wildlife && domains.wildlife.summary) {
      items.push(natureItem(
        "Ecology",
        domains.wildlife.summary,
        "Habitat edges and water sources concentrate interactions — ecology is the story of who meets where.",
        national ? "Estimated" : "Editorial",
        national ? "Climate-season guidance" : "Regional bundle"
      ));
    }

    items.push(natureItem(
      "Seasonal change",
      season.charAt(0).toUpperCase() + season.slice(1) + " at " + (lat != null ? Math.abs(Math.round(lat)) + "°" + (lat >= 0 ? "N" : "S") : "your latitude"),
      "Day length and average temperature drive what is plausible outdoors this week — compare south-facing slopes to shaded drainages.",
      "Estimated",
      "Latitude + calendar"
    ));

    if (intel && intel.photography) {
      items.push(natureItem(
        "Photography",
        intel.photography.summary,
        "Today's atmosphere is part of the landscape — notice how light quality changes your urge to look closely.",
        "Estimated",
        "Derived light analysis"
      ));
    }

    return items;
  }

  function buildMorningAnswers(ctx, doc) {
    var platform = ctx.platform || {};
    var wx = platform.weatherRef;
    var brief = doc.brief;
    var intel = doc.intel;
    var learn = doc.learn;
    var loc = ctx.location || {};
    var since = compareSinceYesterday(wx, brief);
    var photoGuide = doc.photoFieldGuide || buildPhotoFieldGuide(wx, platform, intel);

    var noticeText = brief && brief.lookFor ? brief.lookFor : "";
    if (!noticeText && intel && intel.wildlife) {
      noticeText = "Scan forest edges and water — " + intel.wildlife.summary.toLowerCase();
    }
    if (!noticeText) noticeText = "Watch cloud build through the afternoon and listen for birds at first light.";

    var photoText = intel && intel.photography
      ? intel.photography.summary + (intel.photography.detail ? " — " + intel.photography.detail : "")
      : (photoGuide[0] ? photoGuide[0].text : "Check golden hour windows before leaving.");

    var goText = brief
      ? brief.verdictLabel + ". " + brief.verdictDetail
      : (intel && intel.recommendation ? intel.recommendation.headline + ". " + intel.recommendation.detail : "Check conditions before exposed travel.");

    var learnText = learn
      ? learn.summary + " — " + learn.body
      : "Pick one species or cloud type to identify today — naming builds memory.";

    return {
      where: locationLabel(ctx) + (loc.elevationMeters != null ? " · " + Math.round(loc.elevationMeters * 3.28084) + " ft" : ""),
      now: synthesizeNow(wx, intel),
      sinceYesterday: since.text,
      sinceYesterdayTrust: since.trust,
      notice: noticeText,
      photograph: photoText,
      goOutside: goText,
      learn: learnText,
      pulse: {
        today: brief ? brief.verdictLabel : "Outdoor briefing",
        now: wx && wx.current ? (num(wx.current.temperature) != null ? Math.round(num(wx.current.temperature)) + "° · " + ((wx.current.conditions && wx.current.conditions.summary) || "") : synthesizeNow(wx, intel)) : "Loading…",
        next: platform.daylight && platform.daylight.goldenHour
          ? "Golden hour · " + platform.daylight.goldenHour
          : (platform.daylight && platform.daylight.sunriseFormatted ? "Sunrise " + platform.daylight.sunriseFormatted : "Check hourly forecast")
      }
    };
  }

  function renderPulse(pulse) {
    return (
      '<div class="wdb-morning__pulse" aria-label="Today, now, and next">' +
        '<div class="wdb-morning__pulse-item"><span class="wdb-morning__pulse-label">Today</span><span class="wdb-morning__pulse-value">' + escapeHtml(pulse.today) + "</span></div>" +
        '<div class="wdb-morning__pulse-item wdb-morning__pulse-item--now"><span class="wdb-morning__pulse-label">Now</span><span class="wdb-morning__pulse-value">' + escapeHtml(pulse.now) + "</span></div>" +
        '<div class="wdb-morning__pulse-item"><span class="wdb-morning__pulse-label">Next</span><span class="wdb-morning__pulse-value">' + escapeHtml(pulse.next) + "</span></div>" +
      "</div>"
    );
  }

  function renderAnswerRow(numLabel, question, answer, trust) {
    return (
      '<div class="wdb-morning__answer">' +
        '<div class="wdb-morning__answer-head">' +
          '<span class="wdb-morning__answer-num">' + escapeHtml(numLabel) + "</span>" +
          '<h3 class="wdb-morning__answer-q">' + escapeHtml(question) + "</h3>" +
          (trust ? '<span class="wdb-morning__trust">' + escapeHtml(trust) + "</span>" : "") +
        "</div>" +
        '<p class="wdb-morning__answer-a">' + escapeHtml(answer) + "</p>" +
      "</div>"
    );
  }

  function renderMorningHero(answers, headline, dateLine) {
    return (
      '<section class="wdb-morning" aria-label="Morning outdoor briefing">' +
        '<header class="wdb-morning__head">' +
          '<h2 class="wdb-morning__title">' + escapeHtml(headline || "Morning briefing") + "</h2>" +
          '<p class="wdb-morning__date">' + escapeHtml(dateLine) + "</p>" +
        "</header>" +
        renderPulse(answers.pulse) +
        '<div class="wdb-morning__answers">' +
          renderAnswerRow("1", "Where am I?", answers.where, "Live") +
          renderAnswerRow("2", "What is happening outside right now?", answers.now, "Live") +
          renderAnswerRow("3", "What changed since yesterday?", answers.sinceYesterday, answers.sinceYesterdayTrust) +
          renderAnswerRow("4", "What should I notice today?", answers.notice, "Estimated") +
          renderAnswerRow("5", "What should I photograph?", answers.photograph, "Estimated") +
          renderAnswerRow("6", "Should I go outside?", answers.goOutside, "Estimated") +
          renderAnswerRow("7", "What should I learn today?", answers.learn, "Estimated") +
        "</div>" +
      "</section>"
    );
  }

  function renderNatureCard(item) {
    return (
      '<article class="wdb-nature__card wdb-nature__card--' + escapeHtml((item.trust || "estimated").toLowerCase().replace(/\s+/g, "-")) + '">' +
        '<header class="wdb-nature__card-head">' +
          '<span class="wdb-nature__category">' + escapeHtml(item.category) + "</span>" +
          '<span class="wdb-nature__trust">' + escapeHtml(item.trust) + "</span>" +
        "</header>" +
        '<p class="wdb-nature__text">' + escapeHtml(item.text) + "</p>" +
        (item.why ? '<p class="wdb-nature__why"><strong>Why this matters:</strong> ' + escapeHtml(item.why) + "</p>" : "") +
        (item.source ? '<p class="wdb-nature__source">' + escapeHtml(item.source) + "</p>" : "") +
      "</article>"
    );
  }

  function renderTodayInNature(items) {
    if (!items || !items.length) return "";
    return (
      '<section class="wdb-nature" aria-label="Today in nature">' +
        '<h2 class="wdb-nature__title">Today in nature</h2>' +
        '<p class="wdb-nature__intro">Live and estimated cues for your latitude and season — never invented county biology.</p>' +
        '<div class="wdb-nature__grid">' + items.map(renderNatureCard).join("") + "</div>" +
      "</section>"
    );
  }

  function renderMissionCard(m) {
    return (
      '<article class="wdb-missions__card">' +
        '<span class="wdb-missions__type">' + escapeHtml(m.type || "Mission") + "</span>" +
        '<h3 class="wdb-missions__title">' + escapeHtml(m.title || m.summary || "") + "</h3>" +
        '<p class="wdb-missions__body">' + escapeHtml(m.body || "") + "</p>" +
        (m.why ? '<p class="wdb-missions__why"><strong>Why:</strong> ' + escapeHtml(m.why) + "</p>" : "") +
      "</article>"
    );
  }

  function renderMissions(missions) {
    if (!missions || !missions.length) return "";
    return (
      '<section class="wdb-missions" aria-label="Today\'s outdoor missions">' +
        '<h2 class="wdb-missions__title">Today\'s outdoor missions</h2>' +
        '<p class="wdb-missions__intro">Three to five small activities — rotate daily and match conditions when possible.</p>' +
        '<div class="wdb-missions__grid">' + missions.map(renderMissionCard).join("") + "</div>" +
      "</section>"
    );
  }

  function renderPhotoGuide(items) {
    if (!items || !items.length) return "";
    return (
      '<section class="wdb-photo-field" aria-label="Photography field guidance">' +
        '<h2 class="wdb-photo-field__title">Photography · field guidance</h2>' +
        '<div class="wdb-photo-field__grid">' +
          items.map(function (item) {
            return (
              '<article class="wdb-photo-field__card">' +
                '<header class="wdb-photo-field__head">' +
                  '<span class="wdb-photo-field__label">' + escapeHtml(item.label) + "</span>" +
                  '<span class="wdb-photo-field__trust">' + escapeHtml(item.trust) + "</span>" +
                "</header>" +
                '<p class="wdb-photo-field__text">' + escapeHtml(item.text) + "</p>" +
                (item.why ? '<p class="wdb-photo-field__why"><strong>Why:</strong> ' + escapeHtml(item.why) + "</p>" : "") +
              "</article>"
            );
          }).join("") +
        "</div>" +
      "</section>"
    );
  }

  global.WDS = global.WDS || {};
  global.WDS.morningBriefing = {
    buildMorningAnswers: buildMorningAnswers,
    buildTodayInNature: buildTodayInNature,
    buildPhotoFieldGuide: buildPhotoFieldGuide,
    compareSinceYesterday: compareSinceYesterday,
    synthesizeNow: synthesizeNow,
    renderMorningHero: renderMorningHero,
    renderTodayInNature: renderTodayInNature,
    renderMissions: renderMissions,
    renderPhotoGuide: renderPhotoGuide
  };
})(window);
