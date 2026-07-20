/**
 * Dashboard V2 — 24-hour meaningful timeline.
 */
(function (global) {
  "use strict";

  var Model = function () {
    return global.WDS && global.WDS.dashboardV2Model;
  };

  function num(v) {
    return Model().num(v);
  }

  function fmtTime(d, fallback) {
    if (!d) return fallback || "—";
    try {
      return new Date(d).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    } catch (e) {
      return fallback || "—";
    }
  }

  function parseTimeToday(label) {
    if (!label) return null;
    var now = new Date();
    var m = String(label).match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!m) return null;
    var h = parseInt(m[1], 10);
    var min = parseInt(m[2], 10);
    if (/pm/i.test(m[3]) && h < 12) h += 12;
    if (/am/i.test(m[3]) && h === 12) h = 0;
    var d = new Date(now);
    d.setHours(h, min, 0, 0);
    return d;
  }

  function build(model) {
    var events = [];
    var dl = model.daylight || {};
    var hourly = model.weather.hourly || [];

    if (dl.sunrise) {
      events.push({
        time: parseTimeToday(dl.sunrise),
        label: "Sunrise",
        detail: dl.sunrise,
        kind: "sun"
      });
    }
    if (dl.goldenHour) {
      events.push({
        time: null,
        label: "Golden hour",
        detail: dl.goldenHour,
        kind: "light"
      });
    }

    var rainOn = false;
    hourly.forEach(function (h, idx) {
      var t = h.time ? new Date(h.time) : null;
      if (!t || t.getTime() < Date.now() - 1800000) return;
      var pop = h.precipitation ? num(h.precipitation.probability) : null;
      if (pop != null && pop >= 50 && !rainOn) {
        rainOn = true;
        events.push({
          time: t,
          label: "Rain likely begins",
          detail: "~" + Math.round(pop) + "% chance",
          kind: "rain"
        });
      }
      if (pop != null && pop < 30 && rainOn) {
        rainOn = false;
        events.push({
          time: t,
          label: "Rain chance eases",
          detail: "Probability drops below 30%",
          kind: "rain"
        });
      }
    });

    var maxTemp = null;
    var maxT = null;
    var maxWind = null;
    var maxW = null;
    var maxUv = null;
    var maxU = null;
    hourly.forEach(function (h) {
      var t = h.time ? new Date(h.time) : null;
      if (!t) return;
      var temp = num(h.temperature);
      var wind = h.wind ? num(h.wind.speed) : null;
      var uv = num(h.uvIndex);
      if (temp != null && (maxTemp == null || temp > maxTemp)) {
        maxTemp = temp;
        maxT = t;
      }
      if (wind != null && (maxWind == null || wind > maxWind)) {
        maxWind = wind;
        maxW = t;
      }
      if (uv != null && (maxUv == null || uv > maxUv)) {
        maxUv = uv;
        maxU = t;
      }
    });
    if (maxT) {
      events.push({
        time: maxT,
        label: "Warmest period",
        detail: "~" + Math.round(maxTemp) + "°",
        kind: "temp"
      });
    }
    if (maxW && maxWind >= 15) {
      events.push({
        time: maxW,
        label: "Strongest wind",
        detail: "~" + Math.round(maxWind) + " mph",
        kind: "wind"
      });
    }
    if (maxU && maxUv >= 6) {
      events.push({
        time: maxU,
        label: "Highest UV",
        detail: "Index ~" + Math.round(maxUv),
        kind: "uv"
      });
    }

    if (model.photography.live && model.photography.summary) {
      events.push({
        time: parseTimeToday(dl.sunset),
        label: "Best photography window",
        detail: model.photography.summary,
        kind: "photo"
      });
    }

    if (dl.sunset) {
      events.push({
        time: parseTimeToday(dl.sunset),
        label: "Sunset",
        detail: dl.sunset,
        kind: "sun"
      });
    }
    if (dl.blueHour) {
      events.push({
        time: null,
        label: "Blue hour",
        detail: dl.blueHour,
        kind: "light"
      });
    }
    if (model.moon.rise) {
      events.push({
        time: parseTimeToday(model.moon.rise),
        label: "Moonrise",
        detail: model.moon.phase || "",
        kind: "moon"
      });
    }

    hourly.forEach(function (h) {
      var t = h.time ? new Date(h.time) : null;
      if (!t) return;
      var temp = num(h.temperature);
      if (temp != null && temp <= 32) {
        var prev = events.filter(function (e) {
          return e.label === "At or below freezing";
        })[0];
        if (!prev) {
          events.push({
            time: t,
            label: "At or below freezing",
            detail: Math.round(temp) + "°",
            kind: "freeze"
          });
        }
      }
    });

    (model.alerts.items || []).forEach(function (a) {
      if (a.effective) {
        events.push({
          time: new Date(a.effective),
          label: "Alert starts",
          detail: a.event,
          kind: "alert-official"
        });
      }
      if (a.expires) {
        events.push({
          time: new Date(a.expires),
          label: "Alert expires",
          detail: a.event,
          kind: "alert-official"
        });
      }
    });

    events.sort(function (a, b) {
      var ta = a.time ? a.time.getTime() : 9999999999999;
      var tb = b.time ? b.time.getTime() : 9999999999999;
      return ta - tb;
    });

    return events.slice(0, 14).map(function (e) {
      return {
        timeLabel: e.time ? fmtTime(e.time) : e.detail,
        label: e.label,
        detail: e.detail,
        kind: e.kind
      };
    });
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardV2Timeline = { build: build };
})(window);
