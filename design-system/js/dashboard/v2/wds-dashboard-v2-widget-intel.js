/**
 * Dashboard V2 — Outdoor Intelligence Widgets (RC2.5 Sprint 4).
 * Decision-support interpreters for focus categories.
 * Never invents live values; planned domains return architecture stubs.
 */
(function (global) {
  "use strict";

  function num(v) {
    var M = global.WDS && global.WDS.dashboardV2Model;
    if (M && M.num) return M.num(v);
    return typeof v === "number" && isFinite(v) ? v : null;
  }

  function result(partial) {
    partial = partial || {};
    return {
      domain: partial.domain || "general",
      headline: partial.headline || "Awaiting conditions",
      opportunity: partial.opportunity || null,
      windows: Array.isArray(partial.windows) ? partial.windows : [],
      factors: Array.isArray(partial.factors) ? partial.factors : [],
      take: Array.isArray(partial.take) ? partial.take : [],
      confidence: partial.confidence || "Low",
      providers: Array.isArray(partial.providers) ? partial.providers : [],
      state: partial.state || "derived",
      stub: !!partial.stub,
      stubNote: partial.stubNote || null,
      empty: !!partial.empty,
      error: partial.error || null
    };
  }

  function stub(domain, title, note, providers) {
    return result({
      domain: domain,
      headline: title,
      opportunity: null,
      factors: [],
      take: [note],
      confidence: "Low",
      providers: providers || [],
      state: "planned",
      stub: true,
      stubNote: note,
      empty: true
    });
  }

  function cloudBand(pct) {
    if (pct == null) return null;
    if (pct <= 25) return "mostly clear";
    if (pct <= 55) return "partly cloudy";
    if (pct <= 85) return "mostly cloudy";
    return "overcast";
  }

  function sunAngleCue(daylight, now) {
    now = now || new Date();
    var hour = now.getHours() + now.getMinutes() / 60;
    if (hour < 8 || hour >= 18) return "Low sun angle — long shadows and warmer color.";
    if (hour >= 10 && hour < 15) return "High sun angle — contrasty midday light; seek shade or polarizer.";
    return "Mid-angle sun — workable side-light for landscapes.";
  }

  function photography(model, opts) {
    opts = opts || {};
    var c = (model.weather && model.weather.current) || {};
    var dl = model.daylight || {};
    var moon = model.moon || {};
    var photo = model.photography || {};
    var providers = ["Open-Meteo weather", "Derived daylight"];
    if (!model.weather || !model.weather.live) {
      return result({
        domain: "photography",
        headline: "Photography cues waiting on live weather",
        empty: true,
        state: "unavailable",
        confidence: "Low",
        providers: providers,
        take: ["Refresh once weather hydrates — golden hour and cloud cues need live sky data."]
      });
    }

    var factors = [];
    var windows = [];
    var take = [];
    if (dl.goldenHour) {
      windows.push("Golden hour: " + dl.goldenHour);
      factors.push({ label: "Golden hour", value: dl.goldenHour });
    }
    if (dl.blueHour) {
      windows.push("Blue hour: " + dl.blueHour);
      factors.push({ label: "Blue hour", value: dl.blueHour });
    }
    if (c.cloudPct != null) {
      factors.push({ label: "Clouds", value: Math.round(c.cloudPct) + "% · " + cloudBand(c.cloudPct) });
    }
    if (c.humidity != null) {
      factors.push({ label: "Humidity", value: Math.round(c.humidity) + "%" });
    }
    if (c.windMph != null) {
      factors.push({
        label: "Wind",
        value:
          Math.round(c.windMph) +
          " mph" +
          (c.windMph >= 18 ? " — subject motion risk" : c.windMph >= 10 ? " — watch long lenses" : " — manageable")
      });
    }
    if (c.visibilityMi != null) {
      factors.push({
        label: "Visibility",
        value: Math.round(c.visibilityMi * 10) / 10 + " mi" + (c.visibilityMi < 5 ? " — haze may soften distance" : "")
      });
    }
    if (moon.phase) {
      factors.push({
        label: "Moon",
        value: moon.phase + (moon.illumination != null ? " (~" + Math.round(moon.illumination) + "% lit)" : "")
      });
    }
    factors.push({ label: "Sun angle", value: sunAngleCue(dl, opts.now) });

    var fog = null;
    var sky = global.WDS && global.WDS.skyDashboardIntel;
    if (sky && sky.analyze && model.platform && model.platform.weatherRef) {
      try {
        var intel = sky.analyze(model.platform.weatherRef, model.platform);
        fog = intel && intel.fogPotential ? intel.fogPotential : null;
      } catch (e) { /* ignore */ }
    }
    if (!fog && c.humidity != null && c.humidity >= 90 && (c.cloudPct == null || c.cloudPct >= 40)) {
      fog = { headline: "Fog possible", detail: "High humidity with cloud cover — valleys first at dawn." };
    }
    if (fog && fog.headline) {
      factors.push({ label: "Fog", value: fog.headline + (fog.detail ? " — " + String(fog.detail).slice(0, 80) : "") });
    }

    var headline = photo.summary || "Photography conditions assessed";
    var opportunity = null;
    var level = (photo.level || "").toLowerCase();
    if (fog && /fog|possible|likely/i.test(fog.headline || "")) {
      opportunity = "Soft atmosphere — prioritize forests, creeks, and macro before sun burns off fog.";
      take.push(opportunity);
    } else if (c.cloudPct != null && c.cloudPct >= 40 && c.cloudPct <= 85) {
      opportunity = "Diffuse light favors woodland, wildlife, and even exposures.";
      take.push(opportunity);
    } else if (c.cloudPct != null && c.cloudPct < 25) {
      opportunity = "Hard midday light — lean on golden/blue hour or shaded subjects.";
      take.push(opportunity);
    } else if (dl.goldenHour) {
      opportunity = "Best color window around golden hour (" + dl.goldenHour + ").";
      take.push(opportunity);
    }
    if (c.windMph != null && c.windMph >= 18) {
      take.push("Wind is elevated — favor heavier tripods, faster shutters, or sheltered compositions.");
    }
    if (moon.illumination != null && moon.illumination < 30 && c.cloudPct != null && c.cloudPct < 40) {
      take.push("Darker moon and clearer skies favor night/landscape astro later.");
    }
    if (!take.length && photo.detail) take.push(String(photo.detail).slice(0, 140));
    if (!take.length) take.push("Scan hourly cloud trends before committing to a long drive.");

    if (level === "excellent") headline = photo.summary || "Excellent light opportunity today";
    else if (level === "good") headline = photo.summary || "Good photography windows today";
    else if (level === "fair") headline = photo.summary || "Workable light with timing";
    else if (level === "poor") headline = photo.summary || "Challenging light — pick selective subjects";

    return result({
      domain: "photography",
      headline: headline,
      opportunity: opportunity,
      windows: windows,
      factors: factors,
      take: take.slice(0, 3),
      confidence: model.weather.live ? "High" : "Medium",
      providers: providers,
      state: "derived"
    });
  }

  function hikingWindows(model) {
    var hourly = (model.weather && model.weather.hourly) || [];
    var windows = [];
    var best = null;
    hourly.slice(0, 12).forEach(function (h, i) {
      var temp = num(h.temperature != null ? h.temperature : h.temp);
      var pop = h.precipitation ? num(h.precipitation.probability) : num(h.precipProb);
      var wind = h.wind ? num(h.wind.speed) : num(h.windMph);
      var uv = num(h.uvIndex != null ? h.uvIndex : h.uv);
      var score = 50;
      if (temp != null && temp >= 48 && temp <= 72) score += 20;
      else if (temp != null && (temp < 35 || temp > 85)) score -= 25;
      if (pop != null && pop >= 55) score -= 25;
      else if (pop != null && pop < 25) score += 10;
      if (wind != null && wind >= 20) score -= 15;
      if (uv != null && uv >= 8) score -= 10;
      var t = h.time || h.timestamp;
      var label = t ? new Date(t).toLocaleTimeString(undefined, { hour: "numeric" }) : "Hour " + (i + 1);
      if (best == null || score > best.score) best = { score: score, label: label, temp: temp, pop: pop };
    });
    if (best && best.score >= 55) {
      windows.push(
        "Suggested window near " +
          best.label +
          (best.temp != null ? " (~" + Math.round(best.temp) + "°)" : "") +
          (best.pop != null ? ", rain ~" + Math.round(best.pop) + "%" : "")
      );
    }
    return windows;
  }

  function hiking(model) {
    var c = (model.weather && model.weather.current) || {};
    var providers = ["Open-Meteo weather"];
    if (!model.weather || !model.weather.live) {
      return result({
        domain: "hiking",
        headline: "Hiking comfort waiting on live weather",
        empty: true,
        state: "unavailable",
        confidence: "Low",
        providers: providers,
        take: ["Trail comfort needs temperature, wind, and precip before suggesting windows."]
      });
    }

    var OW = global.WDS && global.WDS.outdoorWeatherIntel;
    var hike = null;
    if (OW && OW.hikingComfort && model.platform && model.platform.weatherRef) {
      hike = OW.hikingComfort(model.platform.weatherRef);
    } else {
      var Act = global.WDS && global.WDS.dashboardV2Activity;
      if (Act && Act.scoreActivity) {
        var s = Act.scoreActivity("hike", model, {});
        hike = { level: s.suitability, summary: s.reason || (s.positives && s.positives[0]) || "Assessed", detail: (s.limits || []).join("; ") };
      }
    }

    var factors = [];
    if (c.tempF != null) factors.push({ label: "Temp", value: Math.round(c.tempF) + "°F" });
    if (c.feelsF != null) factors.push({ label: "Feels like", value: Math.round(c.feelsF) + "°F" });
    if (c.humidity != null) factors.push({ label: "Humidity", value: Math.round(c.humidity) + "%" });
    if (c.windMph != null) factors.push({ label: "Wind", value: Math.round(c.windMph) + " mph" });
    if (c.uv != null) {
      factors.push({
        label: "UV",
        value: Math.round(c.uv) + (c.uv >= 6 ? " — protect midday" : "")
      });
    }
    if (c.precipProb != null) factors.push({ label: "Rain chance", value: Math.round(c.precipProb) + "%" });

    var stress =
      c.feelsF == null
        ? null
        : c.feelsF >= 90
          ? "Heat stress likely — shorter loops, more water"
          : c.feelsF >= 82
            ? "Warm — hydrate and pace"
            : c.feelsF <= 20
              ? "Severe cold stress — limit exposure"
              : c.feelsF <= 35
                ? "Cold — layer and watch wind chill"
                : "Thermal stress looks moderate";
    if (stress) factors.push({ label: "Heat / cold", value: stress });

    var windows = hikingWindows(model);
    if (model.daylight && model.daylight.sunset) {
      windows.push("Plan return before sunset (~" + model.daylight.sunset + ")");
    }

    var take = [];
    if (hike && hike.summary) take.push(hike.summary + (hike.level ? " (" + hike.level + ")" : ""));
    if (windows[0]) take.push(windows[0]);
    if (c.uv != null && c.uv >= 6) take.push("UV is elevated — shade and sunscreen for midday miles.");
    if (c.precipProb != null && c.precipProb >= 50) take.push("Pack a shell — rain chance is meaningful.");
    if (!take.length) take.push("Conditions look ordinary — confirm trailhead weather before long commits.");

    return result({
      domain: "hiking",
      headline: (hike && hike.summary) || "Trail comfort assessed",
      opportunity: windows[0] || null,
      windows: windows,
      factors: factors,
      take: take.slice(0, 3),
      confidence: "High",
      providers: providers,
      state: "derived"
    });
  }

  function ticksStub() {
    return stub(
      "hiking-ticks",
      "Tick activity — architecture placeholder",
      "No live tick or insect density feed is connected. Seasonal awareness only — check local health guidance and do a clothing check after trail time.",
      ["Planned — local health / CDC architecture"]
    );
  }

  function rivers(model) {
    var sites = (model.rivers && model.rivers.sites) || [];
    var providers = ["USGS Water Services", "NWS alerts", "Recent rainfall package"];
    if (!model.rivers || !model.rivers.live || !sites.length) {
      return result({
        domain: "rivers",
        headline: "No nearby USGS gauges reporting",
        empty: true,
        state: "unavailable",
        confidence: "Low",
        providers: providers,
        take: ["River decision support needs a live gauge. Flood alerts still apply when NWS issues them."]
      });
    }

    var site = sites[0];
    var alerts = (model.alerts && model.alerts.items) || [];
    var flood = alerts.filter(function (a) {
      return /flood/i.test((a.event || "") + " " + (a.headline || ""));
    });
    var rain = model.rainfall && model.rainfall.recent;
    var factors = [
      { label: "Site", value: site.name || "Nearest gauge" },
      { label: "Stage", value: site.stageFt != null ? site.stageFt.toFixed(1) + " ft" : "—" },
      { label: "Flow", value: site.flowCfs != null ? Math.round(site.flowCfs) + " cfs" : "—" },
      { label: "Trend", value: site.trend || "Not interpreted" }
    ];
    if (site.distanceMi != null) factors.push({ label: "Distance", value: site.distanceMi.toFixed(1) + " mi" });
    if (rain) {
      factors.push({
        label: "Recent rain",
        value: rain.amount + " " + (rain.unit || "in") + " / " + (rain.periodDays || 7) + "d"
      });
    }
    if (flood.length) factors.push({ label: "Flood alert", value: flood[0].event || "Flood-related alert active" });

    var trend = String(site.trend || "").toLowerCase();
    var take = [];
    var opportunity = null;
    if (flood.length) {
      take.push("Flood-related alert is active — avoid low crossings and treat banks as unstable.");
      opportunity = "Safety first: stay off flood-prone roads and put-ins.";
    } else if (/ris/.test(trend)) {
      opportunity = "Rising stage — photography of banks may work; fishing/kayaking needs caution.";
      take.push(opportunity);
    } else if (/fall/.test(trend)) {
      opportunity = "Falling stage — clearer water may help fishing; put-ins may be more accessible.";
      take.push(opportunity);
    } else {
      opportunity = "Stable gauge reading — check local access and cold-water risk before paddling.";
      take.push(opportunity);
    }
    if (rain && num(rain.amount) != null && num(rain.amount) >= 0.75) {
      take.push("Recent rain may increase turbidity and swift current after runoff.");
    }
    take.push("Water temperature is not live yet — treat immersion risk conservatively.");

    return result({
      domain: "rivers",
      headline: (site.name || "Nearest river") + (site.trend ? " · " + site.trend : ""),
      opportunity: opportunity,
      windows: [],
      factors: factors,
      take: take.slice(0, 3),
      confidence: site.stale ? "Medium" : "High",
      providers: providers,
      state: site.stale ? "partial" : "live"
    });
  }

  function waterTempStub() {
    return stub(
      "rivers-water-temp",
      "Water temperature — architecture placeholder",
      "USGS water temperature is not wired for this location yet. Architecture is ready for gauge parameter 00010 when sites report it.",
      ["Planned — USGS water temperature"]
    );
  }

  function astronomy(model, opts) {
    opts = opts || {};
    var c = (model.weather && model.weather.current) || {};
    var dl = model.daylight || {};
    var moon = model.moon || {};
    var providers = ["Derived daylight / moon", "Open-Meteo cloud cover"];
    var factors = [];
    if (dl.sunrise) factors.push({ label: "Sunrise", value: dl.sunrise });
    if (dl.sunset) factors.push({ label: "Sunset", value: dl.sunset });
    if (dl.civilTwilightEnd) factors.push({ label: "Civil twilight ends", value: dl.civilTwilightEnd });
    if (moon.phase) {
      factors.push({
        label: "Moon phase",
        value: moon.phase + (moon.illumination != null ? " · " + Math.round(moon.illumination) + "% lit" : "")
      });
    }
    if (moon.rise || moon.set) {
      factors.push({ label: "Moonrise / set", value: (moon.rise || "—") + " / " + (moon.set || "—") });
    }
    if (c.cloudPct != null) factors.push({ label: "Cloud cover", value: Math.round(c.cloudPct) + "%" });

    var darkness =
      moon.illumination == null
        ? "Moon brightness unknown"
        : moon.illumination < 25
          ? "Darker skies — good for faint objects"
          : moon.illumination < 60
            ? "Moderate moonlight — brighter targets preferred"
            : "Bright moon — washout risk for Milky Way";
    factors.push({ label: "Darkness", value: darkness });

    var events = [];
    if (dl.goldenHour) events.push("Golden hour " + dl.goldenHour);
    if (dl.blueHour) events.push("Blue hour " + dl.blueHour);
    if (dl.civilTwilightEnd) events.push("Full darkness after " + dl.civilTwilightEnd);

    var skyNote =
      c.cloudPct != null && c.cloudPct <= 30 && (moon.illumination == null || moon.illumination < 40)
        ? "Favorable for stargazing"
        : c.cloudPct != null && c.cloudPct >= 70
          ? "Clouds will limit the night sky"
          : "Mixed — check local horizon clarity";

    var take = [skyNote];
    if (events[0]) take.push("Upcoming light event: " + events[0]);
    if (moon.phase) take.push("Moon is " + moon.phase + (moon.illumination != null ? " (~" + Math.round(moon.illumination) + "% lit)" : "") + ".");

    var empty = !dl.sunrise && !dl.sunset && !moon.phase && c.cloudPct == null;
    return result({
      domain: "astronomy",
      headline: empty ? "Astronomy cues pending daylight package" : skyNote,
      opportunity: events[0] || null,
      windows: events,
      factors: factors,
      take: take.slice(0, 3),
      confidence: model.weather && model.weather.live ? "High" : "Medium",
      providers: providers,
      state: empty ? "unavailable" : "derived",
      empty: empty
    });
  }

  function air(model) {
    var c = (model.weather && model.weather.current) || {};
    var airQ = model.air || {};
    var providers = ["Open-Meteo air quality", "Open-Meteo UV"];
    var factors = [];
    if (airQ.live && airQ.aqi != null) {
      factors.push({ label: "US AQI", value: String(Math.round(airQ.aqi)) });
      if (airQ.category) factors.push({ label: "Category", value: airQ.category });
      if (airQ.pm25 != null) factors.push({ label: "PM2.5", value: String(airQ.pm25) });
    }
    if (c.uv != null) {
      factors.push({
        label: "UV",
        value: Math.round(c.uv) + (c.uv >= 8 ? " — very high" : c.uv >= 6 ? " — high" : "")
      });
    }
    if (c.visibilityMi != null) factors.push({ label: "Visibility", value: Math.round(c.visibilityMi * 10) / 10 + " mi" });

    if (!airQ.live || airQ.aqi == null) {
      return result({
        domain: "air",
        headline: "Air quality not live yet",
        empty: true,
        state: "unavailable",
        confidence: "Low",
        providers: providers,
        factors: factors,
        take: ["Outdoor comfort for air needs a live AQI reading. UV may still guide sun exposure."]
      });
    }

    var comfort =
      airQ.aqi <= 50
        ? "Air looks comfortable for most outdoor plans"
        : airQ.aqi <= 100
          ? "Moderate air — sensitive people may want shorter hard efforts"
          : airQ.aqi <= 150
            ? "Unhealthy for sensitive groups — limit prolonged exertion"
            : "Elevated AQI — reduce outdoor intensity";
    var take = [comfort];
    if (c.uv != null && c.uv >= 6) take.push("UV is elevated — shade matters even when air looks fine.");
    take.push("Wildfire smoke and pollen feeds are architecture stubs — AQI is the live proxy today.");

    return result({
      domain: "air",
      headline: "AQI " + Math.round(airQ.aqi) + (airQ.category ? " · " + airQ.category : ""),
      opportunity: comfort,
      factors: factors,
      take: take.slice(0, 3),
      confidence: "High",
      providers: providers,
      state: "live"
    });
  }

  function pollenStub() {
    return stub(
      "air-pollen",
      "Pollen — architecture placeholder",
      "No live pollen provider is connected. Catalog slot is ready for a regional pollen API without inventing counts.",
      ["Planned — pollen outlook"]
    );
  }

  function smokeStub() {
    return stub(
      "air-smoke",
      "Smoke — architecture placeholder",
      "Dedicated wildfire smoke layers are not connected. Use live AQI and NWS fire weather alerts as the honest proxy.",
      ["Planned — smoke / HRRR-smoke architecture", "Proxy — Open-Meteo AQI"]
    );
  }

  function weather(model) {
    var c = (model.weather && model.weather.current) || {};
    var hourly = (model.weather && model.weather.hourly) || [];
    var alerts = (model.alerts && model.alerts.items) || [];
    var providers = ["Open-Meteo weather", "NWS alerts"];
    if (!model.weather || !model.weather.live) {
      return result({
        domain: "weather",
        headline: "Waiting on live weather",
        empty: true,
        state: "unavailable",
        confidence: "Low",
        providers: providers,
        take: ["Decision support needs a live current observation before suggesting gear or timing."]
      });
    }

    var factors = [];
    if (c.tempF != null) factors.push({ label: "Now", value: Math.round(c.tempF) + "°F · " + (c.conditions || "—") });
    if (c.feelsF != null) factors.push({ label: "Feels like", value: Math.round(c.feelsF) + "°F" });
    if (c.windMph != null) factors.push({ label: "Wind", value: Math.round(c.windMph) + " mph" });
    if (c.precipProb != null) factors.push({ label: "Rain chance", value: Math.round(c.precipProb) + "%" });
    if (c.humidity != null) factors.push({ label: "Humidity", value: Math.round(c.humidity) + "%" });

    var next = hourly[0];
    if (next) {
      var nt = num(next.temperature != null ? next.temperature : next.temp);
      var np = next.precipitation ? num(next.precipitation.probability) : num(next.precipProb);
      factors.push({
        label: "Next hour",
        value: (nt != null ? Math.round(nt) + "°" : "—") + (np != null ? " · rain " + Math.round(np) + "%" : "")
      });
    }

    var take = [];
    if (alerts.length) {
      take.push("Active alert: " + (alerts[0].event || "Weather alert") + " — check official guidance first.");
    }
    if (c.precipProb != null && c.precipProb >= 50) take.push("Carry rain protection for outings longer than an hour.");
    else if (c.feelsF != null && c.feelsF >= 85) take.push("Warm feels-like — plan shade and water for midday.");
    else if (c.feelsF != null && c.feelsF <= 32) take.push("At or below freezing feels-like — dress for cold exposure.");
    else take.push("Current conditions look usable — use hourly for timing and alerts for hard stops.");

    var headline =
      c.tempF != null
        ? Math.round(c.tempF) + "°F" + (c.conditions ? " · " + c.conditions : "")
        : "Current conditions";

    return result({
      domain: "weather",
      headline: headline,
      opportunity: take[0] || null,
      factors: factors,
      take: take.slice(0, 3),
      confidence: alerts.length ? "High" : "High",
      providers: providers,
      state: "live"
    });
  }

  function forWidget(widgetId, model, opts) {
    var id = widgetId || "";
    if (id === "hike-insect" || id === "hike-ticks") return ticksStub();
    if (id === "river-temp") return waterTempStub();
    if (id === "air-pollen") return pollenStub();
    if (id === "air-smoke") return smokeStub();

    if (id.indexOf("photo-") === 0 || id === "astro-golden") return photography(model, opts);
    if (id.indexOf("hike-") === 0) return hiking(model);
    if (id.indexOf("river-") === 0) return rivers(model);
    if (id.indexOf("astro-") === 0) return astronomy(model, opts);
    if (id.indexOf("air-") === 0) return air(model);
    if (id.indexOf("wx-") === 0) return weather(model);
    return null;
  }

  function forCategory(categoryId, model, opts) {
    switch (categoryId) {
      case "photography":
        return photography(model, opts);
      case "hiking":
        return hiking(model);
      case "rivers":
        return rivers(model);
      case "astronomy":
        return astronomy(model, opts);
      case "air":
        return air(model);
      case "weather":
        return weather(model);
      default:
        return null;
    }
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardV2WidgetIntel = {
    VERSION: "4.0.0",
    photography: photography,
    hiking: hiking,
    rivers: rivers,
    astronomy: astronomy,
    air: air,
    weather: weather,
    forWidget: forWidget,
    forCategory: forCategory,
    stubs: {
      ticks: ticksStub,
      waterTemp: waterTempStub,
      pollen: pollenStub,
      smoke: smokeStub
    }
  };
})(window);
