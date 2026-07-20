/**
 * Outdoor Brief Intelligence — built-in provider observation plugins.
 * Each plugin emits interpretation observations (not raw dumps).
 * Providers: Weather, Photography, Rivers, AQI, UV, Sunrise/Sunset, Moon,
 * Alerts, Wind, Cloud cover, Fog.
 */
(function (global) {
  "use strict";

  var R = global.WDS && global.WDS.outdoorBriefRegistry;
  if (!R) return;

  var P = R.PRIORITY;
  var C = R.CONFIDENCE;

  function alertMatch(items, re) {
    return (items || []).filter(function (a) {
      var t = ((a.event || "") + " " + (a.headline || "")).toLowerCase();
      return re.test(t);
    });
  }

  function hikingSummary(model) {
    var OW = global.WDS && global.WDS.outdoorWeatherIntel;
    var wx = model.platform && model.platform.weatherRef;
    if (OW && OW.hikingComfort && wx && model.weather && model.weather.live) {
      return OW.hikingComfort(wx);
    }
    var Act = global.WDS && global.WDS.dashboardV2Activity;
    if (Act && Act.scoreActivity) {
      var scored = Act.scoreActivity("hike", model, {});
      return {
        level: scored.suitability,
        summary: scored.reason || (scored.positives && scored.positives[0]) || "Hiking suitability assessed from weather",
        detail: (scored.limits || []).join("; ")
      };
    }
    return null;
  }

  function registerBuiltIns() {
    /* —— Honesty / trust —— */
    R.registerPlugin({
      id: "trust",
      module: "core",
      observe: function (ctx) {
        var model = ctx.model || {};
        var trust = ctx.trust || (model.provider && model.provider.trust) || "partial";
        var weather = ctx.weather || model.weather || {};
        var out = [];
        if (trust === "offline") {
          out.push(
            R.observation({
              id: "trust-offline",
              theme: "trust",
              module: "core",
              priority: P.TRUST,
              confidence: C.HIGH,
              text: "You appear offline. Treat any readings as cached and verify conditions before heading out.",
              source: "connectivity"
            })
          );
        } else if (
          trust === "cached" ||
          (model.provider && model.provider.fromCache && !weather.live)
        ) {
          out.push(
            R.observation({
              id: "trust-cached",
              theme: "trust",
              module: "core",
              priority: P.TRUST,
              confidence: C.HIGH,
              text: "Data may be cached. Prefer confirming time-sensitive plans after a live refresh.",
              source: "cache"
            })
          );
        } else if (
          trust === "partial" ||
          trust === "provider-unavailable" ||
          (!weather.live && trust !== "live")
        ) {
          out.push(
            R.observation({
              id: "trust-partial",
              theme: "trust",
              module: "core",
              priority: P.TRUST,
              confidence: C.HIGH,
              text: "Some layers are partial or still loading; interpretation below uses only available evidence.",
              source: "providers"
            })
          );
        }
        return out;
      }
    });

    /* —— Alerts / Emergency —— */
    R.registerPlugin({
      id: "alerts",
      module: "emergency",
      observe: function (ctx) {
        var model = ctx.model || {};
        var alerts = ctx.alerts || model.alerts || { items: [] };
        var items = alerts.items || [];
        var trust = ctx.trust || (model.provider && model.provider.trust);
        var conf = R.confidenceFromTrust(trust, items.length > 0 || alerts.status === "live");
        var out = [];
        if (!items.length) return out;

        var top = items[0];
        out.push(
          R.observation({
            id: "alert-active",
            theme: "alert",
            module: "emergency",
            priority: P.SAFETY,
            confidence: conf,
            text:
              "Active alert: " +
              (top.event || "Weather alert") +
              (top.headline ? " — " + String(top.headline).slice(0, 120) : "") +
              ". Check official guidance before outdoor plans.",
            evidence: { event: top.event },
            source: "NWS"
          })
        );

        if (alertMatch(items, /flood/).length) {
          out.push(
            R.observation({
              id: "alert-flood",
              theme: "flood",
              module: "emergency",
              priority: P.SAFETY,
              confidence: conf,
              text: "Flood-related alert is in effect — avoid flood-prone roads, low crossings, and rising water.",
              source: "NWS"
            })
          );
        }
        if (alertMatch(items, /heat|excessive heat/).length) {
          out.push(
            R.observation({
              id: "alert-heat",
              theme: "heat-alert",
              module: "emergency",
              priority: P.SAFETY,
              confidence: conf,
              text: "Heat advisory or warning is active — limit midday exertion and carry water.",
              source: "NWS"
            })
          );
        }
        if (alertMatch(items, /fire weather|red flag/).length) {
          out.push(
            R.observation({
              id: "alert-fire",
              theme: "fire",
              module: "emergency",
              priority: P.SAFETY,
              confidence: conf,
              text: "Fire weather alert is active — watch open flame restrictions and smoke.",
              source: "NWS"
            })
          );
        }
        if (alertMatch(items, /thunder|severe|tornado|lightning/).length) {
          out.push(
            R.observation({
              id: "alert-storm",
              theme: "storm",
              module: "emergency",
              priority: P.SAFETY,
              confidence: conf,
              text: "Storm or severe weather alert is active — postpone exposed ridgelines and open water.",
              source: "NWS"
            })
          );
        }
        return out;
      }
    });

    /* —— AQI —— */
    R.registerPlugin({
      id: "aqi",
      module: "air",
      observe: function (ctx) {
        var model = ctx.model || {};
        var air = ctx.airQuality || model.air || {};
        if (!air.live || air.aqi == null) return [];
        var trust = ctx.trust || (model.provider && model.provider.trust);
        var conf = R.confidenceFromTrust(trust, true);
        if (air.aqi >= 101) {
          return [
            R.observation({
              id: "aqi-elevated",
              theme: "aqi",
              module: "air",
              priority: P.SAFETY,
              confidence: conf,
              text:
                "Air quality is elevated (AQI " +
                Math.round(air.aqi) +
                (air.category ? ", " + air.category : "") +
                ") — shorten hard outdoor effort if sensitive.",
              evidence: { aqi: air.aqi },
              source: "AQI"
            })
          ];
        }
        return [
          R.observation({
            id: "aqi-ok",
            theme: "aqi",
            module: "air",
            priority: P.ENVIRONMENT,
            confidence: conf,
            text:
              "Air quality looks manageable (AQI " +
              Math.round(air.aqi) +
              (air.category ? ", " + air.category : "") +
              ").",
            evidence: { aqi: air.aqi },
            source: "AQI"
          })
        ];
      }
    });

    /* —— Weather / heat / cold / precip —— */
    R.registerPlugin({
      id: "weather",
      module: "weather",
      observe: function (ctx) {
        var model = ctx.model || {};
        var weather = ctx.weather || model.weather || {};
        var hourly = ctx.hourly || weather.hourly || [];
        var c = weather.current || {};
        var trust = ctx.trust || (model.provider && model.provider.trust);
        var conf = R.confidenceFromTrust(trust, !!weather.live);
        var out = [];
        var location = ctx.location || model.location || {};

        if (c.feelsF != null && c.feelsF >= 90) {
          out.push(
            R.observation({
              id: "heat-stress",
              theme: "heat",
              module: "weather",
              priority: P.SAFETY,
              confidence: conf,
              text:
                "Feels-like temperature is near " +
                Math.round(c.feelsF) +
                "° — heat stress risk for long hikes.",
              source: "weather"
            })
          );
        } else if (c.feelsF != null && c.feelsF <= 20) {
          out.push(
            R.observation({
              id: "cold-stress",
              theme: "cold",
              module: "weather",
              priority: P.SAFETY,
              confidence: conf,
              text:
                "Very cold feels-like temperature (~" +
                Math.round(c.feelsF) +
                "°) — dress for wind and frost exposure.",
              source: "weather"
            })
          );
        }

        if (weather.live && c.precipProb != null && c.precipProb >= 50) {
          out.push(
            R.observation({
              id: "precip-now",
              theme: "rain",
              module: "weather",
              priority: P.TIME_SENSITIVE,
              confidence: conf,
              text:
                "Rain chance around " +
                Math.round(c.precipProb) +
                "% — pack a shell if you’ll be out longer than an hour.",
              source: "weather"
            })
          );
        } else if (hourly.length) {
          var wetSoon = hourly.slice(0, 6).some(function (h) {
            var p = h.precipitation ? R.num(h.precipitation.probability) : R.num(h.precipProb);
            return p != null && p >= 55;
          });
          if (wetSoon) {
            out.push(
              R.observation({
                id: "precip-hourly",
                theme: "rain",
                module: "weather",
                priority: P.TIME_SENSITIVE,
                confidence: weather.live ? C.MEDIUM : C.LOW,
                text: "Hourly forecast shows a higher rain chance within the next few hours.",
                source: "weather"
              })
            );
          }
        }

        if (weather.live && c.tempF != null) {
          var feels = c.feelsF != null ? c.feelsF : c.tempF;
          var cond = c.conditions || "conditions updating";
          var place = location.label ? " near " + location.label : "";
          out.push(
            R.observation({
              id: "current-conditions",
              theme: "conditions",
              module: "weather",
              priority: P.OPPORTUNITY,
              confidence: conf,
              text:
                "Now" +
                place +
                ": about " +
                Math.round(c.tempF) +
                "°" +
                (feels != null && Math.round(feels) !== Math.round(c.tempF)
                  ? " (feels " + Math.round(feels) + "°)"
                  : "") +
                ", " +
                cond +
                (c.windMph != null ? ", wind ~" + Math.round(c.windMph) + " mph" : "") +
                ".",
              source: "weather"
            })
          );
        }
        return out;
      }
    });

    /* —— Wind —— */
    R.registerPlugin({
      id: "wind",
      module: "weather",
      observe: function (ctx) {
        var model = ctx.model || {};
        var weather = ctx.weather || model.weather || {};
        var c = weather.current || {};
        if (!weather.live || c.windMph == null) return [];
        var trust = ctx.trust || (model.provider && model.provider.trust);
        var conf = R.confidenceFromTrust(trust, true);
        if (c.windMph >= 25) {
          return [
            R.observation({
              id: "wind-strong",
              theme: "wind",
              module: "weather",
              priority: P.TIME_SENSITIVE,
              confidence: conf,
              text:
                "Strong wind (~" +
                Math.round(c.windMph) +
                " mph" +
                (c.windGust != null ? ", gusts ~" + Math.round(c.windGust) : "") +
                ") — expect noisy treelines and harder paddling or ridge travel.",
              source: "weather"
            })
          ];
        }
        if (c.windMph >= 15) {
          return [
            R.observation({
              id: "wind-moderate",
              theme: "wind",
              module: "weather",
              priority: P.ENVIRONMENT,
              confidence: conf,
              text:
                "Breezy (~" +
                Math.round(c.windMph) +
                " mph) — good for biting-insect relief; brace tripods for telephoto work.",
              source: "weather"
            })
          ];
        }
        return [];
      }
    });

    /* —— UV —— */
    R.registerPlugin({
      id: "uv",
      module: "weather",
      observe: function (ctx) {
        var model = ctx.model || {};
        var weather = ctx.weather || model.weather || {};
        var uv =
          ctx.uv != null
            ? ctx.uv
            : weather.current && weather.current.uv;
        if (uv == null || uv < 6) return [];
        var trust = ctx.trust || (model.provider && model.provider.trust);
        var conf = R.confidenceFromTrust(trust, !!weather.live);
        return [
          R.observation({
            id: "uv-high",
            theme: "uv",
            module: "weather",
            priority: P.TIME_SENSITIVE,
            confidence: conf,
            text:
              "UV is elevated (UV " +
              Math.round(uv) +
              ") — shade and sunscreen matter for midday trails.",
            evidence: { uv: uv },
            source: "weather"
          })
        ];
      }
    });

    /* —— Cloud cover —— */
    R.registerPlugin({
      id: "cloud",
      module: "weather",
      observe: function (ctx) {
        var model = ctx.model || {};
        var weather = ctx.weather || model.weather || {};
        var c = weather.current || {};
        if (!weather.live || c.cloudPct == null) return [];
        var trust = ctx.trust || (model.provider && model.provider.trust);
        var conf = R.confidenceFromTrust(trust, true);
        if (c.cloudPct >= 80) {
          return [
            R.observation({
              id: "cloud-overcast",
              theme: "cloud",
              module: "weather",
              priority: P.PHOTO_HIKE,
              confidence: conf,
              text:
                "Heavy cloud cover (~" +
                Math.round(c.cloudPct) +
                "%) — soft light favors forests and waterfalls; sky drama is limited.",
              source: "weather"
            })
          ];
        }
        if (c.cloudPct >= 40 && c.cloudPct < 80) {
          return [
            R.observation({
              id: "cloud-partly",
              theme: "cloud",
              module: "weather",
              priority: P.PHOTO_HIKE,
              confidence: conf,
              text:
                "Broken clouds (~" +
                Math.round(c.cloudPct) +
                "%) — watch for shifting light and short sun breaks on ridges.",
              source: "weather"
            })
          ];
        }
        return [];
      }
    });

    /* —— Fog (visibility / conditions text) —— */
    R.registerPlugin({
      id: "fog",
      module: "weather",
      observe: function (ctx) {
        var model = ctx.model || {};
        var weather = ctx.weather || model.weather || {};
        var c = weather.current || {};
        if (!weather.live) return [];
        var cond = String(c.conditions || "").toLowerCase();
        var foggy =
          /fog|mist|haze/.test(cond) ||
          (c.visibilityMi != null && c.visibilityMi > 0 && c.visibilityMi <= 2);
        if (!foggy) return [];
        var trust = ctx.trust || (model.provider && model.provider.trust);
        var conf = R.confidenceFromTrust(trust, true);
        return [
          R.observation({
            id: "fog-active",
            theme: "fog",
            module: "weather",
            priority: P.TIME_SENSITIVE,
            confidence: conf,
            text:
              "Fog or low visibility is in play" +
              (c.visibilityMi != null ? " (~" + c.visibilityMi + " mi)" : "") +
              " — slow travel; strong atmosphere for woodland photography.",
            source: "weather"
          })
        ];
      }
    });

    /* —— Sunrise / Sunset / Golden hour —— */
    R.registerPlugin({
      id: "sun",
      module: "astronomy",
      observe: function (ctx) {
        var model = ctx.model || {};
        var astronomy = ctx.astronomy || {
          daylight: model.daylight,
          moon: model.moon
        };
        var daylight = astronomy.daylight || model.daylight || {};
        var trust = ctx.trust || (model.provider && model.provider.trust);
        var live = !!(daylight.sunset || daylight.sunrise || daylight.goldenHour);
        var conf = R.confidenceFromTrust(trust, live);
        var out = [];
        if (daylight.sunset) {
          out.push(
            R.observation({
              id: "sunset",
              theme: "sunset",
              module: "astronomy",
              priority: P.TIME_SENSITIVE,
              confidence: conf,
              text: "Sunset around " + daylight.sunset + " — plan return with daylight remaining.",
              evidence: { sunset: daylight.sunset },
              source: "astronomy"
            })
          );
        }
        if (daylight.goldenHour) {
          out.push(
            R.observation({
              id: "golden-hour",
              theme: "golden-hour",
              module: "astronomy",
              priority: P.TIME_SENSITIVE,
              confidence: conf === C.HIGH ? C.MEDIUM : conf,
              text: "Golden hour window: " + daylight.goldenHour + ".",
              source: "astronomy"
            })
          );
        }
        return out;
      }
    });

    /* —— Moon —— */
    R.registerPlugin({
      id: "moon",
      module: "astronomy",
      observe: function (ctx) {
        var model = ctx.model || {};
        var astronomy = ctx.astronomy || { moon: model.moon };
        var moon = astronomy.moon || model.moon || {};
        var seasonal = ctx.seasonal || { season: model.season };
        if (!moon.phase && !seasonal.season) return [];
        var trust = ctx.trust || (model.provider && model.provider.trust);
        var conf = R.confidenceFromTrust(trust, !!(moon.phase || moon.illumination != null));
        var seasonLine = seasonal.season ? "Seasonally " + seasonal.season : "Tonight’s sky";
        if (moon.phase) seasonLine += "; moon is " + moon.phase;
        if (moon.illumination != null) seasonLine += " (~" + Math.round(moon.illumination) + "% lit)";
        seasonLine += ".";
        return [
          R.observation({
            id: "seasonal-moon",
            theme: "moon",
            module: "astronomy",
            priority: P.RIVERS_SEASONAL,
            confidence: conf,
            text: seasonLine,
            source: "astronomy"
          })
        ];
      }
    });

    /* —— Photography —— */
    R.registerPlugin({
      id: "photography",
      module: "photography",
      observe: function (ctx) {
        var model = ctx.model || {};
        var photography = ctx.photography || model.photography || {};
        if (!photography.live || !photography.summary) return [];
        var trust = ctx.trust || (model.provider && model.provider.trust);
        var conf = R.confidenceFromTrust(trust, true);
        return [
          R.observation({
            id: "photography",
            theme: "photography",
            module: "photography",
            priority: P.PHOTO_HIKE,
            confidence: conf,
            text:
              "Photography: " +
              photography.summary +
              (photography.level ? " (" + photography.level + ")" : "") +
              ".",
            source: "photography"
          })
        ];
      }
    });

    /* —— Hiking / Trail —— */
    R.registerPlugin({
      id: "hiking",
      module: "trail",
      observe: function (ctx) {
        var model = ctx.model || {};
        var hiking = ctx.hiking || hikingSummary(model);
        if (!hiking || !hiking.summary) return [];
        var trust = ctx.trust || (model.provider && model.provider.trust);
        var weather = ctx.weather || model.weather || {};
        var conf = R.confidenceFromTrust(trust, !!weather.live);
        return [
          R.observation({
            id: "hiking",
            theme: "hiking",
            module: "trail",
            priority: P.PHOTO_HIKE,
            confidence: conf === C.HIGH ? C.MEDIUM : conf,
            text:
              "Hiking: " +
              hiking.summary +
              (hiking.level ? " — " + hiking.level : "") +
              (hiking.detail ? ". " + String(hiking.detail).slice(0, 100) : ""),
            source: "trail"
          })
        ];
      }
    });

    /* —— Rivers —— */
    R.registerPlugin({
      id: "rivers",
      module: "rivers",
      observe: function (ctx) {
        var model = ctx.model || {};
        var rivers = ctx.rivers || model.rivers || {};
        if (!rivers.live || !rivers.sites || !rivers.sites[0]) return [];
        var site = rivers.sites[0];
        var stage = site.stageFt != null ? site.stageFt.toFixed(1) + " ft" : null;
        var flow = site.flowCfs != null ? Math.round(site.flowCfs) + " cfs" : null;
        var trust = ctx.trust || (model.provider && model.provider.trust);
        var conf = site.stale
          ? C.LOW
          : R.confidenceFromTrust(trust, true);
        return [
          R.observation({
            id: "river-gauge",
            theme: "river",
            module: "rivers",
            priority: P.RIVERS_SEASONAL,
            confidence: conf,
            text:
              "Nearest gauge (" +
              (site.name || "USGS") +
              "): " +
              [stage, flow, site.trend].filter(Boolean).join(", ") +
              (site.stale ? " — reading may be stale" : "") +
              ".",
            source: "USGS"
          })
        ];
      }
    });
  }

  registerBuiltIns();

  global.WDS.outdoorBriefPlugins = {
    VERSION: "1.0.0",
    registerBuiltIns: registerBuiltIns
  };
})(typeof window !== "undefined" ? window : globalThis);
