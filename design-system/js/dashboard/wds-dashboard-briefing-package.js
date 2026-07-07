/**
 * Unified outdoor briefing — single composed narrative from OIP slices.
 * Powers the cohesive briefing document and deduplicates story/highlights.
 */
(function (global) {
  "use strict";

  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function num(val) {
    if (val == null) return null;
    if (typeof val === "number" && isFinite(val)) return val;
    if (typeof val === "object" && val.value != null) return num(val.value);
    return null;
  }

  function isNational(platform) {
    return !!(platform && platform.meta && platform.meta.contentMode === "national-educational");
  }

  function notice(domain, opts) {
    opts = opts || {};
    return {
      domain: domain,
      what: opts.what || "",
      why: opts.why || "",
      matters: opts.matters || "",
      doAction: opts.doAction || "",
      watch: opts.watch || "",
      trust: opts.trust || "Educational",
      source: opts.source || "",
      text: opts.what || ""
    };
  }

  function domainIntel(platform) {
    var out = { trails: null, water: null, wildlife: null, safety: null };
    var T = global.WDS && global.WDS.trailDashboardIntel;
    var W = global.WDS && global.WDS.waterDashboardIntel;
    var Wi = global.WDS && global.WDS.wildlifeDashboardIntel;
    var S = global.WDS && global.WDS.safetyDashboardIntel;
    if (T && T.analyze) {
      var ti = T.analyze(platform);
      out.trails = { intel: ti, summary: T.summary ? T.summary(ti) : null };
    }
    if (W && W.analyze) {
      var wi = W.analyze(platform);
      out.water = { intel: wi, summary: W.summary ? W.summary(wi) : null };
    }
    if (Wi && Wi.analyze) {
      var wli = Wi.analyze(platform);
      out.wildlife = { intel: wli, summary: Wi.summary ? Wi.summary(wli) : null };
    }
    if (S && S.analyze) {
      var si = S.analyze(platform);
      out.safety = { intel: si, summary: S.summary ? S.summary(si) : null };
    }
    return out;
  }

  function compose(ctx) {
    ctx = ctx || {};
    var platform = ctx.platform || {};
    var wx = platform.weatherRef;
    var hasLive = !!(wx && wx.meta && !wx.meta.isPlaceholder);
    var national = isNational(platform);
    var domains = domainIntel(platform);
    var OW = global.WDS && global.WDS.outdoorWeatherIntel;
    var intel = hasLive && OW && OW.analyze ? OW.analyze(wx, platform) : null;
    var scores = hasLive && OW && OW.scorecard ? OW.scorecard(wx, platform) : null;

    var Brief = global.WDS && global.WDS.dashboardBrief;
    var brief = Brief && Brief.build ? Brief.build(ctx) : null;

    var narrative = [];
    var notices = [];
    var evidence = [];

    if (!hasLive) {
      var LearnEmpty = global.WDS && global.WDS.dashboardLearn;
      var learnEmpty = LearnEmpty && LearnEmpty.generate ? LearnEmpty.generate(ctx) : null;
      return {
        hasLive: false,
        headline: "Outdoor briefing",
        narrative: ["Set your location to load a live outdoor briefing for your coordinates."],
        notices: [{
          domain: "Location",
          text: "City, weather, sun/moon, and safety data require coordinates or a county selection.",
          trust: "Educational",
          what: "City, weather, sun/moon, and safety data require coordinates or a county selection.",
          why: "Waypoint synthesizes outdoor guidance from your coordinates — without them, live weather and safety feeds cannot load.",
          matters: "A precise location makes sunrise, stream gauges, and alerts meaningful.",
          doAction: "Tap Use my location or search for your county.",
          watch: "Elevation and microclimate can shift conditions within a few miles."
        }],
        evidence: [],
        brief: brief,
        intel: intel,
        scores: scores,
        domains: domains,
        learn: learnEmpty,
        morningAnswers: {
          where: "Set your location",
          now: "Live weather, air quality, and safety alerts load after you choose a place.",
          sinceYesterday: "Return tomorrow after setting location to see how conditions shifted.",
          sinceYesterdayTrust: "Educational",
          notice: "Every widget teaches when live data is unavailable — nothing is faked.",
          photograph: "Once live, you'll get golden-hour windows and field photography cues.",
          goOutside: "Pick a location first, then read the outdoor verdict for your coordinates.",
          learn: learnEmpty ? learnEmpty.summary + " — " + learnEmpty.body : "Start with one cloud type or tree bark pattern today.",
          pulse: { today: "Set location", now: "Awaiting coordinates", next: "Live briefing loads next" }
        },
        todayInNature: [{
          category: "Getting started",
          text: "Choose your county or allow browser location — Waypoint will never invent local species data.",
          why: "Honest labels (Live, Estimated, Educational) keep trust while you explore.",
          trust: "Educational",
          source: "Waypoint"
        },
        {
          category: "Seasonal change",
          text: "Notice what is plausible outdoors this week at your latitude — bud swell, bird song, or frost on grass.",
          why: "Seasonal cues build curiosity before live feeds connect.",
          trust: "Educational",
          source: "Waypoint environmental education"
        },
        {
          category: "River conditions",
          text: "Learn to read water color, debris lines, and bank wetness — stream flow shapes crossings and wildlife corridors.",
          why: "Hydrology literacy matters even when a live gauge is not linked yet.",
          trust: "Educational",
          source: "Waypoint hydrology education"
        }],
        missions: [
          { type: "Walking", title: "Walk 20 minutes", body: "Take a short walk and note one smell, one sound, and one texture.", why: "Builds daily outdoor rhythm before live data arrives." },
          { type: "Weather", title: "Observe cloud types", body: "Name three cloud forms and whether they grow or flatten over 15 minutes.", why: "Cloud literacy helps you read the sky without an app." },
          { type: "Nature journaling", title: "One square meter study", body: "Choose one square meter and sketch every living thing you see in ten minutes.", why: "Small plots reveal complexity that wide views hide." }
        ],
        photoFieldGuide: [{
          label: "While you wait",
          text: "Practice reading light on a windowsill — note shadow hardness at different times.",
          why: "Light literacy transfers directly to field photography once live data arrives.",
          trust: "Educational"
        }],
        provenance: { sources: ["Waypoint"], updatedAt: null }
      };
    }

    if (brief) {
      narrative.push(brief.verdictDetail || brief.verdictLabel);
    }
    if (intel && intel.recommendation && intel.recommendation.headline) {
      narrative.push(intel.recommendation.headline + ". " + (intel.recommendation.detail || ""));
    }

    var cur = wx.current || {};
    var temp = num(cur.temperature);
    var cond = (cur.conditions && cur.conditions.summary) || "";
    if (temp != null) evidence.push(Math.round(temp) + "° · " + cond);

    var dl = platform.daylight;
    if (dl && dl.goldenHour) evidence.push("Golden hour: " + dl.goldenHour);

    if (platform.airQuality && platform.airQuality.usAqi != null) {
      evidence.push("US AQI " + platform.airQuality.usAqi);
      notices.push(notice("Air quality", {
        what: "US AQI " + platform.airQuality.usAqi + (platform.airQuality.category ? " (" + platform.airQuality.category + ")" : ""),
        why: "Fine particulate and ozone affect breathing and exertion outdoors.",
        matters: "Sensitive groups should reduce prolonged exertion above 100; above 150 is unhealthy for everyone.",
        doAction: platform.airQuality.usAqi >= 100 ? "Shorten intense hikes; consider indoor backup plan." : "Good air for outdoor activity at moderate pace.",
        watch: "Check hourly if wildfire smoke is regional — AQI can shift fast.",
        trust: "Live",
        source: "Open-Meteo Air Quality"
      }));
    }

    if (dl && dl.sunriseFormatted) {
      notices.push(notice("Sun & moon", {
        what: "Sunrise " + dl.sunriseFormatted + " · Sunset " + (dl.sunsetFormatted || "—") +
          (dl.goldenHour ? " · Golden hour: " + dl.goldenHour : "") +
          (dl.moonPhase ? " · Moon: " + dl.moonPhase : ""),
        why: "Solar angle controls light quality, temperature swing, and wildlife activity windows.",
        matters: "Golden hour is the highest-value window for landscape and wildlife photography.",
        doAction: intel && intel.photography && intel.photography.level === "excellent"
          ? "Prioritize a shoot during golden hour today."
          : "Plan key outdoor time around sunrise or golden hour.",
        watch: dl.blueHour ? "Blue hour: " + dl.blueHour : "Watch western horizon breaks before sunset.",
        trust: "Live",
        source: "Open-Meteo astronomy"
      }));
    }

    if (platform.alerts && platform.alerts.items && platform.alerts.items.length) {
      var a0 = platform.alerts.items[0];
      notices.push(notice("Safety", {
        what: platform.alerts.items.length + " NWS alert(s) — " + (a0.event || a0.headline || "active warning"),
        why: "National Weather Service issues alerts for hazards that override normal outdoor plans.",
        matters: "Official warnings can require shelter, route changes, or cancellation.",
        doAction: "Read the full alert at weather.gov before exposed travel.",
        watch: "Conditions can change hourly — re-check before leaving cell service.",
        trust: "Live",
        source: "NWS"
      }));
    }

    if (intel && intel.photography) {
      notices.push(notice("Photography", {
        what: intel.photography.summary + (intel.photography.detail ? " — " + intel.photography.detail : ""),
        why: "Cloud cover, humidity, and sun angle shape contrast, color, and subject visibility.",
        matters: "Light quality is the primary lever for outdoor image impact.",
        doAction: intel.photography.level === "excellent" || intel.photography.level === "good"
          ? "Carry a camera on today's outing — conditions favor strong frames."
          : "Shoot early/late or embrace atmosphere (fog, rain) if midday is harsh.",
        watch: "Check hourly cloud trends — breaks in overcast create brief peak light.",
        trust: "Estimated",
        source: "Open-Meteo + derived light"
      }));
    }

    if (intel && intel.hiking) {
      notices.push(notice("Hiking", {
        what: intel.hiking.summary + (intel.hiking.detail ? " — " + intel.hiking.detail : ""),
        why: "Temperature, precipitation, and wind drive comfort and risk on exposed trails.",
        matters: "Heat, storms, and mud change route safety more than trail difficulty ratings.",
        doAction: intel.hiking.level === "poor" ? "Choose low, sheltered routes or postpone." : "Pack layers matched to feels-like temperature.",
        watch: "Ridge lines and water crossings worsen first in changing weather.",
        trust: "Estimated",
        source: "Open-Meteo"
      }));
    }

    var usgs = platform.usgsWater;
    if (usgs && usgs.nearest) {
      var US = global.WDS && global.WDS.usgsWater;
      var fg = US && US.formatGauge ? US.formatGauge(usgs) : null;
      if (fg) {
        notices.push(notice("Water", {
          what: fg.headline + " — " + fg.detail,
          why: "Stream stage and discharge indicate crossing difficulty and flood trend.",
          matters: "Rising water can make ford crossings dangerous within hours.",
          doAction: "Compare gauge reading to local flood stage before water crossings.",
          watch: "Recent rain upstream may not appear at gauge yet — allow lag time.",
          trust: "Live",
          source: "USGS IV (provisional)"
        }));
      }
    } else if (domains.water && domains.water.summary) {
      notices.push(notice("Water", {
        what: domains.water.summary,
        why: "Hydrology shapes fishing, paddling, and trail creek crossings.",
        matters: "No live gauge is linked — local conditions may differ from forecast rain.",
        doAction: "Check USGS WaterWatch or local gauge before committing to water routes.",
        watch: "Muddy tributaries after rain — even when main stem looks clear.",
        trust: national ? "Educational" : "Editorial",
        source: national ? "U.S. educational hydrology" : "Regional bundle"
      }));
    }

    if (domains.trails && domains.trails.summary) {
      notices.push(notice("Trails", {
        what: domains.trails.summary,
        why: "Recent rain and temperature drive mud, erosion, and closure risk.",
        matters: "Trail surface can differ from valley weather within miles.",
        doAction: "Verify trail status at park or forest service sites before driving out.",
        watch: "North-facing slopes and drainages stay muddy longer after rain.",
        trust: "Estimated",
        source: "Open-Meteo + regional notes"
      }));
    } else {
      notices.push(notice("Trails", {
        what: national
          ? "Trail agency live feeds not connected for this coordinates view."
          : "Trail conditions inferred from weather — not a trail report.",
        why: "Official closures and surface reports come from land managers, not weather alone.",
        matters: "A dry forecast does not guarantee passable mud or open gates.",
        doAction: "Check Recreation.gov, NPS, or state park sites before you go.",
        watch: "Parking lot mud and gate signage at trailheads.",
        trust: "Not yet available",
        source: "Recreation.gov / NPS (pending)"
      }));
    }

    notices.push(notice("Public lands", {
      what: national
        ? "Federal and state land boundaries are not resolved to this coordinate yet."
        : "Verify land jurisdiction and regulations for your planned route.",
      why: "Rules, fees, and seasonal closures vary by agency (NPS, USFS, BLM, state).",
      matters: "Photography, drones, and camping rules differ across jurisdictions.",
      doAction: "Confirm access and permits on the managing agency website.",
      watch: "Seasonal road closures and fire restrictions — often unposted until you arrive.",
      trust: "Educational",
      source: "Land manager sites (not yet connected)"
    }));

    if (domains.wildlife && domains.wildlife.summary) {
      notices.push(notice("Wildlife", {
        what: domains.wildlife.summary,
        why: "Temperature and season drive diurnal activity, migration, and visibility.",
        matters: "Dawn and dusk remain peak windows even when midday is quiet.",
        doAction: "Move slowly at edges — forest margins and water sources first.",
        watch: "Storm fronts can suppress movement; after rain, amphibians and birds often rebound.",
        trust: national ? "Educational" : "Editorial",
        source: national ? "Climate-season guidance" : "Regional species bundle"
      }));
    } else {
      notices.push(notice("Wildlife", {
        what: "Species activity follows season and weather at your latitude.",
        why: "Live occurrence data (eBird) is not connected for this briefing.",
        matters: "Educational guidance cannot replace local knowledge or rare species alerts.",
        doAction: "Listen at dawn; scan edges and water sources.",
        watch: "Never approach young animals — parent may be nearby.",
        trust: "Educational",
        source: "Waypoint environmental education"
      }));
    }

    if (!national) {
      var species = (platform.species && platform.species.active) || [];
      if (species[0] && species[0].name) {
        notices.push(notice("Ecology", {
          what: "Watch for " + species[0].name + (species[0].note ? " — " + species[0].note : ""),
          why: "Local phenology and species calendars reflect field conditions in this bundle.",
          matters: "Editorial species notes are not live occurrence data.",
          doAction: "Confirm identification in the field — use multiple cues, not one photo.",
          watch: "Habitat type and microclimate can shift timing by weeks.",
          trust: "Editorial",
          source: "Local field bundle"
        }));
      }
    } else {
      var UN = global.WDS && global.WDS.usNational;
      if (UN && UN.weatherInterpretation && wx) {
        notices.push(notice("Ecology", {
          what: UN.weatherInterpretation(wx),
          why: "Broad climate zone and current weather shape what is plausible outdoors.",
          matters: "This is educational — not a species list for your exact coordinates.",
          doAction: "Use a field guide for your state; observe before identifying.",
          watch: "Edges, water, and south-facing slopes first.",
          trust: "Educational",
          source: "Waypoint U.S. educational"
        }));
      }
    }

    var EB = global.WDS && global.WDS.ecosystemBridge;
    if (EB && EB.save) {
      try { EB.save(platform, ctx.location); } catch (e) { /* noop */ }
    }

    var Challenge = global.WDS && global.WDS.dashboardChallenge;
    var Learn = global.WDS && global.WDS.dashboardLearn;
    var challenge = Challenge && Challenge.pickForConditions
      ? Challenge.pickForConditions(ctx, intel)
      : (Challenge && Challenge.generate ? Challenge.generate(ctx) : null);
    var missions = Challenge && Challenge.generateMissions
      ? Challenge.generateMissions(ctx, intel, 4)
      : (challenge ? [challenge] : []);
    var learn = Learn && Learn.generate ? Learn.generate(ctx) : null;

    var MB = global.WDS && global.WDS.morningBriefing;
    var photoFieldGuide = MB && MB.buildPhotoFieldGuide ? MB.buildPhotoFieldGuide(wx, platform, intel) : [];

    if (MB && MB.synthesizeNow) {
      narrative = [MB.synthesizeNow(wx, intel)];
      if (brief && brief.verdictDetail && brief.verdict !== "wait") {
        narrative.push(brief.verdictDetail);
      }
    }

    var partialDoc = {
      hasLive: true,
      brief: brief,
      intel: intel,
      learn: learn,
      photoFieldGuide: photoFieldGuide,
      domains: domains
    };
    var morningAnswers = MB && MB.buildMorningAnswers ? MB.buildMorningAnswers(ctx, partialDoc) : null;
    var todayInNature = MB && MB.buildTodayInNature ? MB.buildTodayInNature(ctx, partialDoc) : [];

    var sources = ["Open-Meteo"];
    if (platform.alerts && platform.alerts.items && platform.alerts.items.length) sources.push("NWS");
    if (platform.airQuality && platform.airQuality.status === "live") sources.push("Open-Meteo AQI");
    if (usgs && usgs.nearest) sources.push("USGS");

    return {
      hasLive: true,
      headline: brief ? brief.verdictLabel : "Outdoor briefing",
      verdict: brief ? brief.verdict : "caution",
      narrative: narrative,
      notices: notices,
      evidence: evidence,
      brief: brief,
      intel: intel,
      scores: scores,
      domains: domains,
      challenge: challenge,
      missions: missions,
      learn: learn,
      morningAnswers: morningAnswers,
      todayInNature: todayInNature,
      photoFieldGuide: photoFieldGuide,
      provenance: {
        sources: sources,
        updatedAt: wx.meta && wx.meta.fetchedAt ? wx.meta.fetchedAt : new Date().toISOString()
      }
    };
  }

  function renderNotice(n) {
    var fields = [];
    if (n.what) fields.push('<p class="wdb-doc__what"><strong>What:</strong> ' + escapeHtml(n.what) + "</p>");
    if (n.why) fields.push('<p class="wdb-doc__why"><strong>Why:</strong> ' + escapeHtml(n.why) + "</p>");
    if (n.matters) fields.push('<p class="wdb-doc__matters"><strong>Why it matters:</strong> ' + escapeHtml(n.matters) + "</p>");
    if (n.doAction) fields.push('<p class="wdb-doc__do"><strong>What to do:</strong> ' + escapeHtml(n.doAction) + "</p>");
    if (n.watch) fields.push('<p class="wdb-doc__watch"><strong>What to notice:</strong> ' + escapeHtml(n.watch) + "</p>");
    return (
      '<article class="wdb-doc__notice wdb-doc__notice--' + escapeHtml((n.trust || "educational").toLowerCase().replace(/\s+/g, "-")) + '">' +
        '<header class="wdb-doc__notice-head">' +
          '<span class="wdb-doc__domain">' + escapeHtml(n.domain) + "</span>" +
          '<span class="wdb-doc__trust">' + escapeHtml(n.trust || "Educational") + "</span>" +
        "</header>" +
        fields.join("") +
        (n.source ? '<p class="wdb-doc__notice-meta">Source: ' + escapeHtml(n.source) + "</p>" : "") +
      "</article>"
    );
  }

  function render(ctx) {
    var doc = compose(ctx);
    var dateLine = doc.brief && doc.brief.dateLine
      ? doc.brief.dateLine
      : new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

    var MB = global.WDS && global.WDS.morningBriefing;
    var morningHtml = "";
    if (doc.morningAnswers && MB && MB.renderMorningHero) {
      morningHtml = MB.renderMorningHero(doc.morningAnswers, doc.headline, dateLine);
    }

    var natureHtml = MB && MB.renderTodayInNature ? MB.renderTodayInNature(doc.todayInNature) : "";
    var missionsHtml = MB && MB.renderMissions ? MB.renderMissions(doc.missions) : "";
    var photoHtml = MB && MB.renderPhotoGuide ? MB.renderPhotoGuide(doc.photoFieldGuide) : "";

    var narrativeHtml = doc.narrative.map(function (p) {
      return "<p class=\"wdb-doc__para\">" + escapeHtml(p) + "</p>";
    }).join("");

    var noticesHtml = doc.notices.map(renderNotice).join("");

    var learnHtml = "";
    if (doc.learn) {
      learnHtml =
        '<section class="wdb-learn-today" aria-label="Learn today">' +
          '<h2 class="wdb-learn-today__title">What to learn today</h2>' +
          '<article class="wdb-learn-today__card">' +
            '<span class="wdb-learn-today__trust">Educational</span>' +
            '<p class="wdb-learn-today__summary">' + escapeHtml(doc.learn.summary || "") + "</p>" +
            '<p class="wdb-learn-today__body">' + escapeHtml(doc.learn.body || "") + "</p>" +
            (doc.learn.metaFooter ? '<p class="wdb-learn-today__meta">' + escapeHtml(doc.learn.metaFooter) + "</p>" : "") +
          "</article>" +
        "</section>";
    }

    var evidenceHtml = doc.evidence.length
      ? '<ul class="wdb-doc__evidence">' + doc.evidence.map(function (e) {
          return "<li>" + escapeHtml(e) + "</li>";
        }).join("") + "</ul>"
      : "";

    var updated = doc.provenance.updatedAt
      ? new Date(doc.provenance.updatedAt).toLocaleString()
      : "—";

    var detailsHtml = noticesHtml
      ? '<details class="wdb-doc__details">' +
          '<summary class="wdb-doc__details-summary">Full domain briefing (' + doc.notices.length + " topics)</summary>" +
          '<div class="wdb-doc__notices" aria-label="Domain guidance">' + noticesHtml + "</div>" +
        "</details>"
      : "";

    return (
      '<section class="wdb-doc wdb-doc--' + escapeHtml(doc.verdict || "caution") + '" aria-label="Outdoor briefing for ' + escapeHtml(dateLine) + '">' +
        morningHtml +
        natureHtml +
        missionsHtml +
        photoHtml +
        (narrativeHtml || evidenceHtml
          ? '<div class="wdb-doc__synthesis">' + narrativeHtml + evidenceHtml + "</div>"
          : "") +
        detailsHtml +
        learnHtml +
        '<footer class="wdb-doc__foot">' +
          '<p>Sources: ' + escapeHtml(doc.provenance.sources.join(" · ")) + " · Updated " + escapeHtml(updated) + "</p>" +
        "</footer>" +
      "</section>"
    );
  }

  function widgetStory(ctx) {
    var doc = compose(ctx);
    if (!doc.hasLive) {
      return global.WDS.dashboardStory && global.WDS.dashboardStory.generate
        ? global.WDS.dashboardStory.generate(ctx)
        : { status: "empty", summary: "Briefing pending" };
    }
    return {
      status: "ready",
      tag: { label: "Estimated", className: "wdb-widget__tag--estimated" },
      summary: doc.headline,
      body: doc.narrative.join(" "),
      items: doc.notices.slice(0, 4).map(function (n) { return n.domain + ": " + n.text; }),
      metaFooter: "Unified briefing · " + doc.provenance.sources.join(" · ")
    };
  }

  function widgetHighlights(ctx) {
    var doc = compose(ctx);
    var items = doc.notices.map(function (n) {
      return { text: n.domain + " — " + n.text, kind: n.trust === "Live" ? "observation" : "interpretation" };
    });
    if (doc.evidence.length) {
      items.unshift({ text: doc.evidence.join(" · "), kind: "forecast" });
    }
    var dateLabel = new Date().toLocaleDateString(undefined, {
      weekday: "long", month: "long", day: "numeric", year: "numeric"
    });
    return {
      status: items.length ? "ready" : "empty",
      tag: { label: "Estimated", className: "wdb-widget__tag--estimated" },
      summary: items.length + " field cues for " + dateLabel,
      items: items
    };
  }

  function replaceInRoot(root, ctx) {
    var scope = root && root.querySelector ? root : document;
    var el = scope.querySelector(".wdb-doc");
    if (!el) return false;
    var html = render(ctx);
    var wrap = document.createElement("div");
    wrap.innerHTML = html;
    var next = wrap.firstElementChild;
    if (next) el.replaceWith(next);
    return !!next;
  }

  function resolveContext(ctx) {
    ctx = ctx || {};
    if (!ctx.platform) {
      var OIP = global.WDS && global.WDS.outdoorIntelligence;
      ctx.platform = OIP && OIP.getLast ? OIP.getLast() : null;
    }
    if (!ctx.location && global.WDS && global.WDS.location && global.WDS.location.getState) {
      ctx.location = global.WDS.location.getState();
    }
    return ctx;
  }

  function refresh(root, ctx) {
    return replaceInRoot(root, resolveContext(ctx));
  }

  function bind(root, ctx) {
    if (!bind._wired && global.document) {
      bind._wired = true;
      global.document.addEventListener("wds:outdoor-intelligence-change", function (e) {
        var loc = global.WDS && global.WDS.location && global.WDS.location.getState
          ? global.WDS.location.getState()
          : null;
        var mount = document.querySelector("[data-wds-dashboard-root]");
        replaceInRoot(mount && mount.closest("#main") || document, {
          platform: e.detail,
          location: loc
        });
      });
    }
    refresh(root, ctx);
  }

  global.WDS = global.WDS || {};
  global.WDS.briefingPackage = {
    compose: compose,
    render: render,
    refresh: refresh,
    bind: bind,
    widgetStory: widgetStory,
    widgetHighlights: widgetHighlights
  };
})(window);
