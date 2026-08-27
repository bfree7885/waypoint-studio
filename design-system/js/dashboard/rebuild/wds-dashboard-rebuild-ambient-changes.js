/**
 * Dashboard Ambient — deterministic change detection (Phase 1.5).
 *
 * Compares two AmbientSnapshot objects. No network. No LLM.
 *
 * Materiality (testable constants; see POLICY / docs/DASHBOARD-AMBIENT.md):
 *   temperature     |Δ| >= 4°F. 1°F is sensor/diurnal noise; 4°F is dress-for-weather.
 *   apparent temp   |Δ| >= 5°F only when temperature itself did not already fire.
 *   wind            |Δ| >= 8 mph, or either side crosses 18 mph (Happening Now breezy).
 *   precipitation   precipitating boolean flip, or chance crosses 50% with |Δ| >= 25.
 *   weather text    only wet/hazard class changes (rain/snow/thunder/fog), not cloudy vs partly.
 *   alerts          add/remove by event name only when both snapshots have live NWS trust.
 *   daylight        day ↔ night only. Remaining-until-sunset is ignored.
 *   opportunities   photography/astronomy level rank change >= 2, and only while weatherLive
 *                   on both sides. Foraging/Sheds never emit. UNKNOWN from source failure
 *                   is not "opportunity ended".
 *
 * Missing or stale-unavailable values are never treated as environmental change.
 */
(function (global) {
  "use strict";

  var TEMP_DELTA_F = 4;
  var APPARENT_DELTA_F = 5;
  var WIND_DELTA_MPH = 8;
  var WIND_BREEZY_MPH = 18;
  var PRECIP_CROSS_PCT = 50;
  var PRECIP_DELTA_PCT = 25;
  var OPP_RANK_STEPS = 2;
  var MAX_ITEMS = 4;

  function num(v) {
    if (v == null) return null;
    if (typeof v === "number" && isFinite(v)) return v;
    var n = Number(v);
    return isFinite(n) ? n : null;
  }

  function asDate(v) {
    if (!v) return null;
    if (v instanceof Date) return isNaN(v.getTime()) ? null : v;
    var d = new Date(v);
    return isNaN(d.getTime()) ? null : d;
  }

  function sourceTrust(snapshot, id) {
    var list = (snapshot && snapshot.sources) || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].id === id) return String(list[i].trust || "unknown");
    }
    return "unknown";
  }

  function weatherKnown(snapshot) {
    var status = snapshot && snapshot.conditions && snapshot.conditions.status;
    return status === "live" || status === "cached";
  }

  function alertsKnown(snapshot) {
    var trust = sourceTrust(snapshot, "nws");
    return trust === "live";
  }

  function levelRank(level) {
    var l = String(level || "").toLowerCase();
    if (l === "excellent" || l === "high") return 4;
    if (l === "good" || l === "moderate") return 3;
    if (l === "fair") return 2;
    if (l === "poor" || l === "low") return 1;
    return 0;
  }

  function wetClass(summary) {
    var s = String(summary || "").toLowerCase();
    if (/thunder|lightning/.test(s)) return "thunder";
    if (/snow|sleet|blizzard|flurries|ice/.test(s)) return "snow";
    if (/rain|drizzle|shower/.test(s)) return "rain";
    if (/fog|mist/.test(s)) return "fog";
    return "dry";
  }

  function wetLabel(cls) {
    if (cls === "thunder") return "Thunderstorms";
    if (cls === "snow") return "Snow";
    if (cls === "rain") return "Rain";
    if (cls === "fog") return "Fog";
    return "Precipitation";
  }

  function alertKeys(snapshot) {
    var keys = [];
    var seen = Object.create(null);
    function push(item) {
      if (!item) return;
      var id = String(item.id || "");
      if (id === "alert-none") return;
      var title = String(item.title || "");
      if (/no active alerts/i.test(title)) return;
      var kind = String(item.kind || "");
      var isAlert =
        kind === "alert" ||
        /alert/i.test(id) ||
        /warning|watch|advisory|emergency/i.test(title + " " + String(item.detail || ""));
      if (!isAlert) return;
      var label = String(item.detail || title || id)
        .replace(/^active alert[:\s]*/i, "")
        .replace(/\s+/g, " ")
        .trim();
      if (!label || /no official weather alerts/i.test(label)) return;
      var key = label.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      keys.push({ key: key, label: label });
    }
    ((snapshot && snapshot.signals) || []).forEach(push);
    (snapshot && snapshot.developing && snapshot.developing.items ? snapshot.developing.items : []).forEach(
      push
    );
    return keys;
  }

  function opportunityByDomain(snapshot, domain) {
    var list = (snapshot && snapshot.opportunities) || [];
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].domain === domain) return list[i];
    }
    return null;
  }

  function formatDelta(n) {
    var rounded = Math.round(Math.abs(n));
    return String(rounded);
  }

  function arrow(n) {
    if (n > 0) return "↑";
    if (n < 0) return "↓";
    return "";
  }

  function formatClock(iso, timezone) {
    var d = asDate(iso);
    if (!d) return null;
    try {
      return d.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
        timeZone: timezone || undefined
      });
    } catch (e) {
      try {
        return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
      } catch (e2) {
        return null;
      }
    }
  }

  function windowLabel(reference, current) {
    var clock = formatClock(
      reference && reference.capturedAt,
      (current && current.place && current.place.timezone) ||
        (reference && reference.place && reference.place.timezone)
    );
    return clock ? "since " + clock : "since earlier";
  }

  function item(partial) {
    return {
      id: partial.id,
      category: partial.category,
      kind: "change",
      prominence: partial.prominence || "attention",
      rank: partial.rank == null ? 50 : partial.rank,
      kicker: partial.kicker || "Changed",
      title: partial.title,
      detail: partial.detail || "",
      delta: partial.delta != null ? partial.delta : null
    };
  }

  function diff(previous, current) {
    if (!current || typeof current !== "object") {
      return {
        status: "unavailable",
        referenceCapturedAt: null,
        windowLabel: "",
        items: []
      };
    }
    if (!previous || typeof previous !== "object") {
      return {
        status: "warming",
        referenceCapturedAt: null,
        windowLabel: "",
        items: []
      };
    }
    if (previous.schemaVersion != null && previous.schemaVersion !== 1) {
      return {
        status: "warming",
        referenceCapturedAt: previous.capturedAt || null,
        windowLabel: "",
        items: []
      };
    }

    var Store = global.WDS && global.WDS.dashboardRebuildAmbientStore;
    var comparable = false;
    if (Store && typeof Store.placesComparable === "function") {
      comparable = Store.placesComparable(previous.place, current.place);
    } else {
      var pk =
        Store && typeof Store.placeKey === "function"
          ? Store.placeKey
          : function (place) {
              place = place || {};
              var lat = num(place.lat);
              var lng = num(place.lng);
              if (lat == null || lng == null) return "unknown";
              return (
                "geo:" +
                (Math.round(lat / 0.05) * 0.05).toFixed(2) +
                "," +
                (Math.round(lng / 0.05) * 0.05).toFixed(2)
              );
            };
      var ka = pk(previous.place);
      var kb = pk(current.place);
      comparable = ka !== "unknown" && kb !== "unknown" && ka === kb;
    }
    if (!comparable) {
      return {
        status: "incomparable",
        referenceCapturedAt: previous.capturedAt || null,
        windowLabel: "",
        items: []
      };
    }

    var items = [];
    var prevC = previous.conditions || {};
    var curC = current.conditions || {};
    var wxOk = weatherKnown(previous) && weatherKnown(current);

    if (wxOk) {
      var t0 = num(prevC.temperatureF);
      var t1 = num(curC.temperatureF);
      if (t0 != null && t1 != null) {
        var dt = t1 - t0;
        if (Math.abs(dt) >= TEMP_DELTA_F) {
          items.push(
            item({
              id: "change-temp",
              category: "weather",
              prominence: Math.abs(dt) >= 8 ? "attention" : "attention",
              rank: 30 + Math.min(20, Math.round(Math.abs(dt))),
              title: "Temperature " + arrow(dt) + " " + formatDelta(dt) + "°F",
              detail:
                Math.round(t1) +
                "° now, " +
                (dt < 0 ? "down from " : "up from ") +
                Math.round(t0) +
                "°.",
              delta: dt
            })
          );
        }
      } else {
        /* valid → missing is not a temperature change; both-null is also silence. */
      }

      var a0 = num(prevC.apparentTemperatureF);
      var a1 = num(curC.apparentTemperatureF);
      var tempAlready = items.some(function (it) {
        return it.id === "change-temp";
      });
      if (!tempAlready && a0 != null && a1 != null && Math.abs(a1 - a0) >= APPARENT_DELTA_F) {
        var da = a1 - a0;
        items.push(
          item({
            id: "change-apparent",
            category: "weather",
            rank: 28,
            title: "Feels-like " + arrow(da) + " " + formatDelta(da) + "°F",
            detail: "Apparent temperature moved from " + Math.round(a0) + "° to " + Math.round(a1) + "°.",
            delta: da
          })
        );
      }

      var w0 = num(prevC.windMph);
      var w1 = num(curC.windMph);
      if (w0 != null && w1 != null) {
        var dw = w1 - w0;
        var crossedBreezy =
          (w0 < WIND_BREEZY_MPH && w1 >= WIND_BREEZY_MPH) ||
          (w0 >= WIND_BREEZY_MPH && w1 < WIND_BREEZY_MPH);
        if (Math.abs(dw) >= WIND_DELTA_MPH || crossedBreezy) {
          items.push(
            item({
              id: "change-wind",
              category: "weather",
              rank: crossedBreezy || Math.abs(dw) >= 12 ? 55 : 40,
              title: dw >= 0 ? "Wind increasing" : "Wind easing",
              detail:
                "Now " +
                Math.round(w1) +
                " mph, " +
                (dw >= 0 ? "up from " : "down from ") +
                Math.round(w0) +
                " mph.",
              delta: dw
            })
          );
        }
      }

      var p0 = prevC.precipitating;
      var p1 = curC.precipitating;
      if (p0 != null && p1 != null && !!p0 !== !!p1) {
        var cls = wetClass(p1 ? curC.summary : prevC.summary);
        if (cls === "dry") cls = wetClass(p1 ? prevC.summary : curC.summary);
        if (cls === "dry") cls = "rain";
        items.push(
          item({
            id: "change-precip-state",
            category: "weather",
            prominence: "attention",
            rank: 70,
            title: p1 ? wetLabel(cls) + " has started" : wetLabel(cls) + " has ended",
            detail: p1
              ? "Precipitation is falling now."
              : "Precipitation has ended, with live weather still available."
          })
        );
      }

      var c0 = num(prevC.precipChancePct);
      var c1 = num(curC.precipChancePct);
      var precipStateAlready = items.some(function (it) {
        return it.id === "change-precip-state";
      });
      if (!precipStateAlready && c0 != null && c1 != null) {
        var crossed =
          (c0 < PRECIP_CROSS_PCT && c1 >= PRECIP_CROSS_PCT) ||
          (c0 >= PRECIP_CROSS_PCT && c1 < PRECIP_CROSS_PCT);
        if (crossed && Math.abs(c1 - c0) >= PRECIP_DELTA_PCT) {
          items.push(
            item({
              id: "change-precip-chance",
              category: "weather",
              rank: 45,
              title: c1 > c0 ? "Rain chance rising" : "Rain chance falling",
              detail: Math.round(c1) + "% now, from " + Math.round(c0) + "%."
            })
          );
        }
      }

      var class0 = wetClass(prevC.summary);
      var class1 = wetClass(curC.summary);
      if (
        prevC.summary &&
        curC.summary &&
        class0 !== class1 &&
        (class0 !== "dry" || class1 !== "dry") &&
        !items.some(function (it) {
          return it.id === "change-precip-state";
        })
      ) {
        items.push(
          item({
            id: "change-wx-class",
            category: "weather",
            rank: 50,
            title: class1 === "dry" ? wetLabel(class0) + " has ended" : wetLabel(class1) + " moving in",
            detail: String(prevC.summary) + " → " + String(curC.summary)
          })
        );
      }
    }

    if (alertsKnown(previous) && alertsKnown(current)) {
      var prevAlerts = alertKeys(previous);
      var curAlerts = alertKeys(current);
      var prevMap = Object.create(null);
      var curMap = Object.create(null);
      prevAlerts.forEach(function (a) {
        prevMap[a.key] = a;
      });
      curAlerts.forEach(function (a) {
        curMap[a.key] = a;
      });
      curAlerts.forEach(function (a) {
        if (!prevMap[a.key]) {
          items.push(
            item({
              id: "change-alert-add:" + a.key,
              category: "alerts",
              prominence: /warning|emergency/i.test(a.label) ? "urgent" : "attention",
              rank: /warning|emergency/i.test(a.label) ? 95 : 80,
              kicker: "Alert",
              title: a.label + " issued",
              detail: "An official alert is newly in effect."
            })
          );
        }
      });
      prevAlerts.forEach(function (a) {
        if (!curMap[a.key]) {
          items.push(
            item({
              id: "change-alert-end:" + a.key,
              category: "alerts",
              prominence: "attention",
              rank: 75,
              kicker: "Alert",
              title: a.label + " ended",
              detail: "The alert is no longer active, with live alert data still available."
            })
          );
        }
      });
    }

    var d0 = prevC.daylight && prevC.daylight.status;
    var d1 = curC.daylight && curC.daylight.status;
    if (d0 && d1 && d0 !== "unknown" && d1 !== "unknown" && d0 !== d1) {
      if ((d0 === "day" && d1 === "night") || (d0 === "night" && d1 === "day")) {
        items.push(
          item({
            id: "change-daylight",
            category: "daylight",
            rank: 35,
            title: d1 === "night" ? "Night has fallen" : "Daylight has returned",
            detail: "A real daylight transition, not the remaining-time countdown."
          })
        );
      }
    }

    var prevLive = !!(previous.meta && previous.meta.weatherLive);
    var curLive = !!(current.meta && current.meta.weatherLive);
    if (prevLive && curLive) {
      ["photography", "astronomy"].forEach(function (domain) {
        var o0 = opportunityByDomain(previous, domain);
        var o1 = opportunityByDomain(current, domain);
        if (!o0 || !o1) return;
        if (o0.status === "unknown" && o1.status === "unknown") return;
        if (o0.status !== "ready" && o1.status !== "ready") return;
        if (o0.status === "ready" && o1.status === "unknown") return;
        if (o0.status === "unknown" && o1.status === "ready") {
          var readyRank = levelRank(o1.level);
          if (readyRank >= 3) {
            items.push(
              item({
                id: "change-opp-" + domain,
                category: "opportunity",
                rank: 32,
                title:
                  domain === "astronomy"
                    ? "Night-sky opportunity is now known"
                    : "Photography opportunity is now known",
                detail: o1.headline || "Conditions became readable."
              })
            );
          }
          return;
        }
        var r0 = levelRank(o0.level);
        var r1 = levelRank(o1.level);
        if (r0 > 0 && r1 > 0 && Math.abs(r1 - r0) >= OPP_RANK_STEPS) {
          var worse = r1 < r0;
          items.push(
            item({
              id: "change-opp-" + domain,
              category: "opportunity",
              rank: worse ? 52 : 34,
              title:
                domain === "astronomy"
                  ? worse
                    ? "Night-sky opportunity deteriorated"
                    : "Night-sky opportunity improved"
                  : worse
                    ? "Photography opportunity deteriorated"
                    : "Photography opportunity improved",
              detail: (o0.headline || o0.level || "") + " → " + (o1.headline || o1.level || "")
            })
          );
        }
      });
    }

    items.sort(function (a, b) {
      return (b.rank || 0) - (a.rank || 0);
    });
    items = items.slice(0, MAX_ITEMS);

    return {
      status: items.length ? "changed" : "quiet",
      referenceCapturedAt: previous.capturedAt || null,
      windowLabel: windowLabel(previous, current),
      items: items
    };
  }

  function decorateSnapshot(snapshot, changes) {
    if (!snapshot) return snapshot;
    snapshot.meta = snapshot.meta || {};
    changes = changes || { status: "warming", items: [] };
    snapshot.meta.changeDetection = true;
    snapshot.meta.changesStatus = changes.status || "warming";
    snapshot.meta.referenceCapturedAt = changes.referenceCapturedAt || null;
    snapshot.meta.history = changes.status === "quiet" || changes.status === "changed";

    var current = snapshot.developing || {};
    var currentItems = current.items || [];
    var changeItems = changes.items || [];
    var status = changes.status;

    function asDevItem(ch) {
      return {
        id: ch.id,
        kind: ch.kind || "change",
        kicker: ch.kicker || "Changed",
        title: ch.title,
        detail: ch.detail || "",
        severity: ch.prominence === "urgent" ? "urgent" : "attention"
      };
    }

    var warmingLike = status === "warming" || status === "incomparable" || status === "unavailable";
    if (warmingLike) {
      var hasHazard =
        current.state === "urgent" ||
        currentItems.some(function (it) {
          return it.kind === "alert" || it.severity === "urgent";
        });
      if (!hasHazard) {
        snapshot.developing = {
          state: current.state === "unknown" ? "unknown" : "quiet",
          headline: "Building recent context",
          detail: "This display has not yet remembered enough local conditions to say what changed.",
          items: [],
          gaps: current.gaps || []
        };
      }
      snapshot.meta.history = false;
      return snapshot;
    }

    if (!changeItems.length) {
      return snapshot;
    }

    var merged = [];
    var seen = Object.create(null);
    function push(entry) {
      if (!entry || !entry.title) return;
      var key = String(entry.id || entry.title)
        .toLowerCase()
        .replace(/\s+/g, " ");
      var titleKey = String(entry.title)
        .toLowerCase()
        .replace(/\s+/g, " ");
      if (seen[key] || seen[titleKey]) return;
      seen[key] = true;
      seen[titleKey] = true;
      merged.push(entry);
    }

    changeItems.forEach(function (ch) {
      push(asDevItem(ch));
    });
    currentItems.forEach(function (it) {
      if (it.kind === "alert" || it.severity === "urgent") push(it);
    });
    merged = merged.slice(0, MAX_ITEMS);

    var urgent =
      current.state === "urgent" ||
      merged.some(function (it) {
        return it.severity === "urgent" || it.kind === "alert";
      });
    var windowText = changes.windowLabel ? "Changed " + changes.windowLabel : "";
    snapshot.developing = {
      state: urgent ? "urgent" : "attention",
      headline: merged[0].title,
      detail: windowText || merged[0].detail || current.detail || "",
      items: merged,
      gaps: current.gaps || []
    };
    return snapshot;
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardRebuildAmbientChanges = {
    version: "1.5.0",
    POLICY: {
      tempDeltaF: TEMP_DELTA_F,
      apparentDeltaF: APPARENT_DELTA_F,
      windDeltaMph: WIND_DELTA_MPH,
      windBreezyMph: WIND_BREEZY_MPH,
      precipCrossPct: PRECIP_CROSS_PCT,
      precipDeltaPct: PRECIP_DELTA_PCT,
      opportunityRankSteps: OPP_RANK_STEPS,
      maxItems: MAX_ITEMS
    },
    diff: diff,
    decorateSnapshot: decorateSnapshot,
    alertKeys: alertKeys
  };
})(typeof window !== "undefined" ? window : global);
