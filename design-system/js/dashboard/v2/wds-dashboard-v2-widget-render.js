/**
 * Dashboard V2 — render individual category widgets from normalized model.
 * Honest empty / planned / unavailable states; never fabricates live numbers.
 */
(function (global) {
  "use strict";

  function esc(s) {
    var M = global.WDS && global.WDS.dashboardV2Model;
    return M && M.escapeHtml ? M.escapeHtml(s) : String(s == null ? "" : s);
  }

  function num(v) {
    var M = global.WDS && global.WDS.dashboardV2Model;
    return M && M.num ? M.num(v) : null;
  }

  function availBadge(state) {
    var Cat = global.WDS && global.WDS.dashboardV2Widgets;
    var label = Cat && Cat.availabilityLabel ? Cat.availabilityLabel(state) : state;
    return (
      '<span class="wdb-v2-widget__avail wdb-v2-widget__avail--' +
      esc(state) +
      '">' +
      esc(label) +
      "</span>"
    );
  }

  function plannedBody(name) {
    return (
      '<p class="wdb-v2-widget__empty">Planned — ' +
      esc(name) +
      " is catalogued but not connected to a live provider yet.</p>"
    );
  }

  function unavailableBody(msg) {
    return '<p class="wdb-v2-widget__empty">' + esc(msg || "Data unavailable for this location right now.") + "</p>";
  }

  function kv(label, value) {
    if (value == null || value === "") return "";
    return (
      '<div class="wdb-v2-widget__kv"><dt>' +
      esc(label) +
      "</dt><dd>" +
      esc(value) +
      "</dd></div>"
    );
  }

  function dl(rowsHtml) {
    return '<dl class="wdb-v2-widget__dl">' + rowsHtml + "</dl>";
  }

  function alertFilter(items, re) {
    return (items || []).filter(function (a) {
      return re.test(((a.event || "") + " " + (a.headline || "")).toLowerCase());
    });
  }

  function listAlerts(items, emptyMsg) {
    if (!items || !items.length) {
      return '<p class="wdb-v2-widget__muted">' + esc(emptyMsg || "No matching alerts.") + "</p>";
    }
    return (
      '<ul class="wdb-v2-widget__list">' +
      items
        .slice(0, 4)
        .map(function (a) {
          return (
            "<li><strong>" +
            esc(a.event || "Alert") +
            "</strong>" +
            (a.headline ? " — " + esc(String(a.headline).slice(0, 140)) : "") +
            "</li>"
          );
        })
        .join("") +
      "</ul>"
    );
  }

  function hikingIntel(model) {
    var OW = global.WDS && global.WDS.outdoorWeatherIntel;
    var wx = model.platform && model.platform.weatherRef;
    if (OW && OW.hikingComfort && wx && model.weather.live) return OW.hikingComfort(wx);
    var Act = global.WDS && global.WDS.dashboardV2Activity;
    if (Act && Act.scoreActivity && model.weather.live) {
      var s = Act.scoreActivity("hike", model, {});
      return { level: s.suitability, summary: s.reason || (s.positives && s.positives[0]) || "Assessed", detail: (s.limits || []).join("; ") };
    }
    return null;
  }

  function fogIntel(model) {
    var sky = global.WDS && global.WDS.skyDashboardIntel;
    var wx = model.platform && model.platform.weatherRef;
    if (sky && sky.analyze && wx) {
      try {
        var intel = sky.analyze(wx, model.platform);
        return intel && intel.fogPotential ? intel.fogPotential : null;
      } catch (e) {
        return null;
      }
    }
    var c = model.weather.current || {};
    if (!model.weather.live || c.humidity == null) return null;
    if (c.humidity >= 90 && (c.cloudPct == null || c.cloudPct >= 40)) {
      return { headline: "Fog possible", detail: "High humidity with cloud cover — valleys first at dawn." };
    }
    return { headline: "Fog unlikely", detail: "Humidity and sky do not strongly favor radiation fog." };
  }

  function renderBody(widget, model) {
    var Cat = global.WDS && global.WDS.dashboardV2Widgets;
    var state = Cat && Cat.resolveAvailability ? Cat.resolveAvailability(widget, model) : widget.availability;
    var c = (model.weather && model.weather.current) || {};
    var hourly = (model.weather && model.weather.hourly) || [];
    var daily = (model.weather && model.weather.daily) || [];
    var alerts = (model.alerts && model.alerts.items) || [];
    var id = widget.id;

    if (state === "planned") return { state: state, html: plannedBody(widget.name) };

    switch (id) {
      case "wx-current":
        if (!model.weather.live && c.tempF == null) return { state: "unavailable", html: unavailableBody("Waiting on live weather.") };
        return {
          state: state,
          html: dl(
            kv("Temp", c.tempF != null ? Math.round(c.tempF) + "°F" : null) +
              kv("Feels like", c.feelsF != null ? Math.round(c.feelsF) + "°F" : null) +
              kv("Sky", c.conditions || null) +
              kv("Wind", c.windMph != null ? Math.round(c.windMph) + " mph" : null) +
              kv("Humidity", c.humidity != null ? Math.round(c.humidity) + "%" : null)
          )
        };

      case "wx-hourly":
        if (!hourly.length) return { state: "unavailable", html: unavailableBody("Hourly forecast not available yet.") };
        return {
          state: state,
          html:
            '<ul class="wdb-v2-widget__list wdb-v2-widget__list--compact">' +
            hourly
              .slice(0, 6)
              .map(function (h) {
                var t = h.time || h.timestamp;
                var label = t
                  ? new Date(t).toLocaleTimeString(undefined, { hour: "numeric" })
                  : "—";
                var temp = num(h.temperature != null ? h.temperature : h.temp);
                var pop = h.precipitation ? num(h.precipitation.probability) : num(h.precipProb);
                return (
                  "<li><span>" +
                  esc(label) +
                  "</span> <strong>" +
                  (temp != null ? Math.round(temp) + "°" : "—") +
                  "</strong>" +
                  (pop != null ? ' · rain ' + Math.round(pop) + "%" : "") +
                  "</li>"
                );
              })
              .join("") +
            "</ul>"
        };

      case "wx-multiday":
        if (!daily.length) return { state: "unavailable", html: unavailableBody("Daily forecast not available yet.") };
        return {
          state: state,
          html:
            '<ul class="wdb-v2-widget__list wdb-v2-widget__list--compact">' +
            daily
              .slice(0, 5)
              .map(function (d, i) {
                var pop = d.precipitation ? num(d.precipitation.probability) : null;
                var hi = num(d.temperatureMax != null ? d.temperatureMax : d.tempMax);
                var lo = num(d.temperatureMin != null ? d.temperatureMin : d.tempMin);
                return (
                  "<li><span>Day " +
                  (i + 1) +
                  "</span> <strong>" +
                  (hi != null ? Math.round(hi) + "°" : "—") +
                  (lo != null ? "/" + Math.round(lo) + "°" : "") +
                  "</strong>" +
                  (pop != null ? " · " + Math.round(pop) + "% precip" : "") +
                  "</li>"
                );
              })
              .join("") +
            "</ul>"
        };

      case "wx-precip":
        return {
          state: state,
          html: dl(
            kv("Chance now", c.precipProb != null ? Math.round(c.precipProb) + "%" : "—") +
              kv(
                "Recent rain",
                model.rainfall && model.rainfall.recent
                  ? model.rainfall.recent.amount +
                      " " +
                      (model.rainfall.recent.unit || "in") +
                      " / " +
                      (model.rainfall.recent.periodDays || 7) +
                      "d"
                  : null
              )
          )
        };

      case "wx-wind":
        return {
          state: state,
          html: dl(
            kv("Sustained", c.windMph != null ? Math.round(c.windMph) + " mph" : "—") +
              kv("Gusts", c.windGust != null ? Math.round(c.windGust) + " mph" : null)
          )
        };

      case "wx-temp-trend": {
        if (hourly.length < 2) return { state: "unavailable", html: unavailableBody("Need hourly temps for a trend.") };
        var t0 = num(hourly[0].temperature != null ? hourly[0].temperature : hourly[0].temp);
        var t1 = num(hourly[Math.min(3, hourly.length - 1)].temperature != null ? hourly[Math.min(3, hourly.length - 1)].temperature : hourly[Math.min(3, hourly.length - 1)].temp);
        var delta = t0 != null && t1 != null ? Math.round(t1 - t0) : null;
        var trend =
          delta == null ? "Updating" : delta > 2 ? "Warming (~+" + delta + "°)" : delta < -2 ? "Cooling (~" + delta + "°)" : "Steady";
        return { state: state, html: dl(kv("Next hours", trend) + kv("Now", t0 != null ? Math.round(t0) + "°" : null)) };
      }

      case "wx-humidity":
        return {
          state: state,
          html: dl(kv("Humidity", c.humidity != null ? Math.round(c.humidity) + "%" : "—") + kv("Dew point", "Not separately reported in this feed"))
        };

      case "wx-visibility":
      case "photo-clarity":
      case "air-visibility":
        if (c.visibilityMi == null) return { state: "unavailable", html: unavailableBody("Visibility not reported yet.") };
        return { state: state, html: dl(kv("Visibility", Math.round(c.visibilityMi * 10) / 10 + " mi")) };

      case "wx-severe":
      case "alert-nws":
        return { state: state, html: listAlerts(alerts, "No active NWS alerts.") };

      case "astro-sun":
        return {
          state: model.daylight.sunrise || model.daylight.sunset ? state : "unavailable",
          html: dl(kv("Sunrise", model.daylight.sunrise || "—") + kv("Sunset", model.daylight.sunset || "—"))
        };

      case "astro-twilight":
        if (!model.daylight.civilTwilightEnd) return { state: "unavailable", html: unavailableBody("Twilight end not in daylight package yet.") };
        return { state: state, html: dl(kv("Civil twilight ends", model.daylight.civilTwilightEnd)) };

      case "astro-golden":
        return {
          state: model.daylight.goldenHour || model.daylight.blueHour ? state : "unavailable",
          html: dl(kv("Golden hour", model.daylight.goldenHour || "—") + kv("Blue hour", model.daylight.blueHour || "—"))
        };

      case "astro-moon-phase":
        return {
          state: model.moon.phase ? state : "unavailable",
          html: dl(
            kv("Phase", model.moon.phase || "—") +
              kv("Illumination", model.moon.illumination != null ? Math.round(model.moon.illumination) + "%" : null)
          )
        };

      case "astro-moon-times":
        if (!model.moon.rise && !model.moon.set) return { state: "unavailable", html: unavailableBody("Moonrise/set not available yet.") };
        return { state: state, html: dl(kv("Moonrise", model.moon.rise || "—") + kv("Moonset", model.moon.set || "—")) };

      case "astro-night-sky":
      case "astro-cloud-stargaze": {
        var cloud = c.cloudPct;
        var illum = model.moon.illumination;
        if (cloud == null && !model.weather.live) return { state: "unavailable", html: unavailableBody("Need cloud cover for stargazing cues.") };
        var skyNote =
          cloud != null && cloud <= 30 && (illum == null || illum < 40)
            ? "Favorable for stars"
            : cloud != null && cloud >= 70
              ? "Clouds will limit the night sky"
              : "Mixed — check local horizon";
        return {
          state: state,
          html: dl(kv("Cloud cover", cloud != null ? Math.round(cloud) + "%" : "—") + kv("Outlook", skyNote) + kv("Moon", model.moon.phase || null))
        };
      }

      case "photo-conditions":
      case "photo-landscape":
      case "photo-light":
        if (!model.photography.live && !model.photography.summary) {
          return { state: "unavailable", html: unavailableBody("Photography cues need live weather.") };
        }
        return {
          state: state,
          html: dl(
            kv("Summary", model.photography.summary || "—") +
              kv("Level", model.photography.level || null) +
              kv("Detail", model.photography.detail ? String(model.photography.detail).slice(0, 160) : null)
          )
        };

      case "photo-wildlife":
      case "photo-macro":
      case "photo-sunrise":
      case "photo-sunset":
      case "photo-night": {
        if (!model.weather.live) return { state: "unavailable", html: unavailableBody("Needs live weather.") };
        var tip =
          id === "photo-macro"
            ? c.cloudPct != null && c.cloudPct >= 40
              ? "Soft light favors macro detail"
              : "Harsher light — seek shade for close work"
            : id === "photo-night"
              ? c.cloudPct != null && c.cloudPct < 40
                ? "Clearer skies favor night work"
                : "Clouds may wash out night scenes"
              : id === "photo-sunrise"
                ? "Morning window near " + (model.daylight.sunrise || "sunrise")
                : id === "photo-sunset"
                  ? "Evening window near " + (model.daylight.sunset || "sunset")
                  : "Use soft side-light and watch wind for subject motion";
        return { state: state, html: dl(kv("Cue", tip) + kv("Sky", c.conditions || null) + kv("Wind", c.windMph != null ? Math.round(c.windMph) + " mph" : null)) };
      }

      case "photo-fog": {
        var fog = fogIntel(model);
        if (!fog) return { state: "unavailable", html: unavailableBody("Fog heuristic needs humidity/sky data.") };
        return { state: "experimental", html: dl(kv("Outlook", fog.headline || fog.level || "—") + kv("Detail", fog.detail || null)) };
      }

      case "photo-wind":
      case "hike-wind":
        return {
          state: c.windMph != null ? state : "unavailable",
          html: dl(
            kv("Wind", c.windMph != null ? Math.round(c.windMph) + " mph" : "—") +
              kv(
                "Impact",
                c.windMph == null
                  ? null
                  : c.windMph >= 20
                    ? "High — exposed ridges and long lenses suffer"
                    : c.windMph >= 12
                      ? "Moderate — watch subject motion"
                      : "Low — generally manageable"
              )
          )
        };

      case "hike-conditions":
      case "hike-comfort": {
        var hike = hikingIntel(model);
        if (!hike) return { state: "unavailable", html: unavailableBody("Hiking comfort needs live weather.") };
        return { state: state, html: dl(kv("Level", hike.level || "—") + kv("Summary", hike.summary || "—") + kv("Notes", hike.detail || null)) };
      }

      case "hike-heat-cold": {
        if (c.feelsF == null) return { state: "unavailable", html: unavailableBody("Needs feels-like temperature.") };
        var band =
          c.feelsF >= 90 ? "Heat stress likely" : c.feelsF >= 82 ? "Warm — hydrate" : c.feelsF <= 20 ? "Severe cold stress" : c.feelsF <= 35 ? "Cold — layer up" : "Within a moderate band";
        return { state: state, html: dl(kv("Feels like", Math.round(c.feelsF) + "°F") + kv("Stress", band)) };
      }

      case "hike-rain":
        return {
          state: state,
          html:
            dl(kv("Precip chance", c.precipProb != null ? Math.round(c.precipProb) + "%" : "—")) +
            listAlerts(alertFilter(alerts, /thunder|storm|tornado|flood/), "No storm/flood alerts.")
        };

      case "hike-daylight": {
        if (!model.daylight.sunset) return { state: "unavailable", html: unavailableBody("Sunset time needed.") };
        return { state: state, html: dl(kv("Sunset", model.daylight.sunset) + kv("Sunrise", model.daylight.sunrise || null)) };
      }

      case "hike-mud": {
        var rain = model.rainfall && model.rainfall.recent;
        if (!rain && c.precipProb == null) return { state: "unavailable", html: unavailableBody("No recent rainfall context yet.") };
        var mud =
          rain && num(rain.amount) > 0.5
            ? "Trails may be muddy after recent rain"
            : c.precipProb != null && c.precipProb >= 50
              ? "Wet footing possible if showers arrive"
              : "Mud risk looks limited from available rain cues";
        return { state: "experimental", html: dl(kv("Outlook", mud) + kv("Recent", rain ? rain.amount + " " + (rain.unit || "in") : null)) };
      }

      case "hike-uv":
      case "air-uv":
        if (c.uv == null) return { state: "unavailable", html: unavailableBody("UV index not reported yet.") };
        return {
          state: state,
          html: dl(
            kv("UV", Math.round(c.uv)) +
              kv("Guidance", c.uv >= 8 ? "Very high — minimize midday sun" : c.uv >= 6 ? "High — protect skin" : "Moderate or lower")
          )
        };

      case "river-nearby":
      case "river-level":
      case "river-trend":
      case "river-freshness": {
        if (!model.rivers.live || !model.rivers.sites.length) {
          return { state: "unavailable", html: unavailableBody("No nearby USGS gauges reporting for this location.") };
        }
        if (id === "river-nearby") {
          return {
            state: state,
            html:
              '<ul class="wdb-v2-widget__list">' +
              model.rivers.sites
                .slice(0, 4)
                .map(function (s) {
                  return (
                    "<li><strong>" +
                    esc(s.name) +
                    "</strong>" +
                    (s.distanceMi != null ? " · " + s.distanceMi.toFixed(1) + " mi" : "") +
                    (s.stageFt != null ? " · " + s.stageFt.toFixed(1) + " ft" : "") +
                    (s.trend ? " · " + esc(s.trend) : "") +
                    "</li>"
                  );
                })
                .join("") +
              "</ul>"
          };
        }
        var site = model.rivers.sites[0];
        if (id === "river-level") return { state: state, html: dl(kv("Site", site.name) + kv("Stage", site.stageFt != null ? site.stageFt.toFixed(1) + " ft" : "—") + kv("Flow", site.flowCfs != null ? Math.round(site.flowCfs) + " cfs" : null)) };
        if (id === "river-trend") return { state: state, html: dl(kv("Site", site.name) + kv("Trend", site.trend || "Not interpreted") ) };
        return {
          state: state,
          html: dl(
            kv("Site", site.name) +
              kv("Observed", site.observedAt ? new Date(site.observedAt).toLocaleString() : "—") +
              kv("Stale", site.stale ? "Yes — treat cautiously" : "No")
          )
        };
      }

      case "river-flood":
        return { state: state, html: listAlerts(alertFilter(alerts, /flood/), "No flood alerts. Gauge detail is in Rivers widgets when live.") };

      case "river-rain": {
        var rr = model.rainfall && model.rainfall.recent;
        if (!rr) return { state: "unavailable", html: unavailableBody("Recent rainfall package not available.") };
        return { state: "experimental", html: dl(kv("Recent", rr.amount + " " + (rr.unit || "in")) + kv("Period", (rr.periodDays || 7) + " days") + kv("Note", "Runoff impact is inferred, not a forecast hydrograph.")) };
      }

      case "air-aqi":
        if (!model.air.live || model.air.aqi == null) return { state: "unavailable", html: unavailableBody("Air quality not live yet.") };
        return { state: state, html: dl(kv("US AQI", Math.round(model.air.aqi)) + kv("Category", model.air.category || "—") + kv("PM2.5", model.air.pm25 != null ? model.air.pm25 : null)) };

      case "air-env-alerts":
      case "alert-local": {
        var env = alertFilter(alerts, /heat|air|smoke|wind|flood|fire|storm|thunder/);
        var parts = [];
        if (model.air.live && model.air.aqi != null && model.air.aqi >= 101) parts.push("Elevated AQI " + Math.round(model.air.aqi));
        if (c.feelsF != null && c.feelsF >= 90) parts.push("Heat stress from feels-like " + Math.round(c.feelsF) + "°");
        return {
          state: state,
          html:
            (parts.length ? '<p class="wdb-v2-widget__muted">' + esc(parts.join("; ")) + "</p>" : "") +
            listAlerts(env.length ? env : alerts.slice(0, 3), "No concentrated local hazards from live inputs.")
        };
      }

      case "alert-flood":
        return { state: state, html: listAlerts(alertFilter(alerts, /flood/), "No flood alerts.") };
      case "alert-heat":
        return { state: state, html: listAlerts(alertFilter(alerts, /heat/), "No heat alerts.") };
      case "alert-fire":
        return { state: state, html: listAlerts(alertFilter(alerts, /fire weather|red flag/), "No fire weather alerts.") };
      case "alert-storm":
        return { state: state, html: listAlerts(alertFilter(alerts, /thunder|severe|tornado|lightning/), "No storm/lightning alerts.") };
      case "alert-aqi":
        if (!model.air.live || model.air.aqi == null) return { state: "unavailable", html: unavailableBody("AQI not available.") };
        return {
          state: state,
          html: dl(
            kv("AQI", Math.round(model.air.aqi)) +
              kv("Caution", model.air.aqi >= 101 ? "Elevated — sensitive groups should limit exertion" : "No elevated AQI caution from current reading")
          )
        };

      case "season-frost": {
        var low = null;
        if (hourly.length) {
          hourly.slice(0, 12).forEach(function (h) {
            var t = num(h.temperature != null ? h.temperature : h.temp);
            if (t != null && (low == null || t < low)) low = t;
          });
        }
        if (low == null && c.tempF != null) low = c.tempF;
        if (low == null) return { state: "unavailable", html: unavailableBody("Need overnight lows for frost cues.") };
        return {
          state: "experimental",
          html: dl(kv("Near-term low cue", Math.round(low) + "°F") + kv("Frost", low <= 33 ? "Possible near or below freezing" : "Unlikely from available temps"))
        };
      }

      case "season-snow": {
        var snowy = /snow|sleet|ice|wintry/i.test(c.conditions || "") || alertFilter(alerts, /snow|winter|ice|blizzard/).length;
        return {
          state: state,
          html: dl(kv("Conditions", c.conditions || "—") + kv("Snow/ice language", snowy ? "Present in conditions or alerts" : "Not indicated in current live inputs"))
        };
      }

      case "season-mushroom": {
        var amt = model.rainfall && model.rainfall.recent ? num(model.rainfall.recent.amount) : null;
        return {
          state: "experimental",
          html: dl(
            kv("Moisture cue", amt != null ? amt + " in recent rain package" : "Rainfall package limited") +
              kv("Note", "Experimental only — not a foraging go/no-go. Identify carefully; follow local rules.")
          )
        };
      }

      case "season-summary":
        return {
          state: state,
          html: dl(kv("Season", model.season || "—") + kv("Place", model.location && model.location.label ? model.location.label : null) + kv("Moon", model.moon.phase || null))
        };

      case "travel-weekend": {
        var cWx = (model.weather && model.weather.current) || {};
        return {
          state: model.weather && model.weather.live ? "derived" : "unavailable",
          html: model.weather && model.weather.live
            ? dl(
                kv("Now", cWx.tempF != null ? Math.round(cWx.tempF) + "°F · " + (cWx.conditions || "—") : null) +
                  kv("Guidance", "Use multi-day forecast widgets for a fuller weekend picture.")
              )
            : unavailableBody("Waiting on live weather for weekend outlook.")
        };
      }

      case "fav-pinned": {
        var Prefs = global.WDS && global.WDS.dashboardV2Prefs;
        var prefs = Prefs && Prefs.load ? Prefs.load() : { enabled: [] };
        var n = (prefs.enabled || []).length;
        return {
          state: "derived",
          html: dl(kv("Enabled widgets", String(n)) + kv("Note", "Pin essentials via Customize Dashboard."))
        };
      }

      default:
        if (widget.availability === "planned") return { state: "planned", html: plannedBody(widget.name) };
        return { state: "unavailable", html: unavailableBody("No renderer for this widget yet.") };
    }
  }

  function renderWidget(widget, model) {
    var body = renderBody(widget, model);
    var tab = widget.tab || "today";
    return (
      '<article class="wdb-v2-widget" data-wdb-v2-widget="' +
      esc(widget.id) +
      '" data-availability="' +
      esc(body.state) +
      '">' +
      '<header class="wdb-v2-widget__head">' +
      '<h4 class="wdb-v2-widget__title">' +
      esc(widget.name) +
      "</h4>" +
      availBadge(body.state) +
      "</header>" +
      '<p class="wdb-v2-widget__desc">' +
      esc(widget.description) +
      "</p>" +
      '<div class="wdb-v2-widget__body">' +
      body.html +
      "</div>" +
      '<button type="button" class="wdb-v2-widget__more wds-btn wds-btn--ghost wds-btn--sm" data-wdb-v2-goto-tab="' +
      esc(tab) +
      '">Open detail</button>' +
      "</article>"
    );
  }

  function renderGrouped(selectedIds, model) {
    var Cat = global.WDS && global.WDS.dashboardV2Widgets;
    if (!Cat) return "";
    var categories = Cat.categories();
    var byCat = {};
    selectedIds.forEach(function (id) {
      var w = Cat.byId(id);
      if (!w) return;
      if (!byCat[w.category]) byCat[w.category] = [];
      byCat[w.category].push(w);
    });

    var sections = categories
      .map(function (cat) {
        var list = byCat[cat.id];
        if (!list || !list.length) return "";
        return (
          '<section class="wdb-v2-cat" data-wdb-v2-category="' +
          esc(cat.id) +
          '" aria-labelledby="wdb-v2-cat-' +
          esc(cat.id) +
          '">' +
          '<h3 class="wdb-v2-cat__title" id="wdb-v2-cat-' +
          esc(cat.id) +
          '">' +
          esc(cat.label) +
          "</h3>" +
          '<div class="wdb-v2-cat__grid">' +
          list.map(function (w) {
            return renderWidget(w, model);
          }).join("") +
          "</div>" +
          "</section>"
        );
      })
      .filter(Boolean)
      .join("");

    if (!sections) {
      return (
        '<section class="wdb-v2-widgets wdb-v2-widgets--empty" aria-label="Selected widgets">' +
        '<p class="wdb-v2-empty">No widgets selected. Use <strong>Customize widgets</strong> to choose a set.</p>' +
        "</section>"
      );
    }

    return '<div class="wdb-v2-widgets" data-wdb-v2-widgets>' + sections + "</div>";
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardV2WidgetRender = {
    renderWidget: renderWidget,
    renderGrouped: renderGrouped,
    renderBody: renderBody
  };
})(window);
