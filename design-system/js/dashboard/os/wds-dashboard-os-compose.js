/**
 * Outdoor OS — compose Happening / Matters / Do / Day Arc from V2 intelligence.
 * Spec: DASHBOARD-SCREEN-SPECIFICATION.md §0–§2; Manifesto one-job.
 * Milestone 2: delegates Happening / Matters / Do to dashboardOSInterpret
 * (PriorityRanker). Does not invent facts — ranks and synthesizes only.
 */
(function (global) {
  "use strict";

  function wordCount(s) {
    return String(s || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
  }

  function clipWords(s, max) {
    var parts = String(s || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length <= max) return parts.join(" ");
    return parts.slice(0, max).join(" ");
  }

  function clipChars(s, max) {
    s = String(s || "").trim();
    if (s.length <= max) return s;
    return s.slice(0, max - 1).replace(/\s+\S*$/, "") + "…";
  }

  function clockNow(flags) {
    if (flags && flags.now) {
      try {
        return new Date(flags.now);
      } catch (e) { /* noop */ }
    }
    return new Date();
  }

  function isNightLocal(flags) {
    var h = clockNow(flags).getHours();
    return h < 5 || h >= 21;
  }

  function weekdayOrTonight(night, flags) {
    if (night) return "Tonight";
    return clockNow(flags).toLocaleDateString(undefined, { weekday: "long" });
  }

  function placeLine(model, flags) {
    var night = isNightLocal(flags);
    var day = weekdayOrTonight(night, flags);
    var label = (model.location && model.location.label) || "";
    label = String(label).replace(/^United States$/i, "").trim();
    if (!label || /finding your location/i.test(label)) return clipWords(day, 8);
    var near = /^near /i.test(label) ? label : "Near " + label;
    return clipWords(day + " · " + near, 8);
  }

  function hasUsablePlace(model) {
    if (!model || !model.location) return false;
    if (model.location.coordsOk) return true;
    var src = model.location.source;
    if (src === "pending" || src === "unavailable") return false;
    if (model.location.lat == null || model.location.lng == null) return false;
    return false;
  }

  function trustLabel(model, briefing) {
    var Rel = global.WDS && global.WDS.dashboardReliability;
    var online = !Rel || !Rel.isOnline || Rel.isOnline();
    if (!online) return { status: "Offline", detail: "" };
    var trust = (model.provider && model.provider.trust) || "unknown";
    if (briefing && briefing.partial) trust = "cached";
    if (model.provider && model.provider.fromCache && trust === "live") trust = "cached";
    var map = {
      live: "Live",
      cached: "Cached",
      partial: "Partial",
      offline: "Offline",
      unknown: "Partial"
    };
    var status = map[trust] || "Partial";
    var detail = "";
    if (status !== "Live" && model.provider && model.provider.hydratedAt) {
      try {
        var d = new Date(model.provider.hydratedAt);
        detail =
          "as of " +
          d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }).toLowerCase().replace(" ", "");
      } catch (e) { /* noop */ }
    }
    return { status: status, detail: detail };
  }

  function atmosphereKind(model, flags) {
    var c = (model.weather && model.weather.current) || {};
    var cond = String(c.conditions || "").toLowerCase();
    if (isNightLocal(flags)) return "night";
    if (/thunder|storm/.test(cond)) return "storm";
    if (/rain|drizzle|shower/.test(cond)) return "rain";
    if (/snow|sleet|ice/.test(cond)) return "snow";
    if (/fog|mist/.test(cond)) return "fog";
    if (c.cloudPct != null && c.cloudPct >= 70) return "overcast";
    if (c.cloudPct != null && c.cloudPct >= 35) return "partly";
    return "clear";
  }

  /** @deprecated M2 — use dashboardOSInterpret; kept as emergency fallback only. */
  function buildHappeningFallback(model, briefing) {
    if (!model.weather || !model.weather.live) {
      return {
        headline: "Finding today’s conditions",
        support: "Live outdoor character will fill in without inventing a place.",
        panel: "conditions"
      };
    }
    var c = (model.weather && model.weather.current) || {};
    var temp = c.feelsF != null ? c.feelsF : c.tempF;
    var parts = [];
    if (c.cloudPct != null && c.cloudPct >= 70) parts.push("Soft overcast");
    else if (c.cloudPct != null && c.cloudPct >= 35) parts.push("Broken cloud");
    else parts.push("Clear");
    if (temp != null) {
      if (temp < 35) parts.push("cold");
      else if (temp < 50) parts.push("cool");
      else if (temp < 68) parts.push("mild");
      else if (temp < 82) parts.push("warm");
      else parts.push("hot");
    }
    if (c.windMph != null && c.windMph < 6) parts.push("light air");
    else if (c.windMph != null && c.windMph >= 18) parts.push("breezy");
    var headline = clipWords(parts.join(", "), 8);
    var support = "Conditions near you set the tone for time outside today.";
    return { headline: headline, support: clipWords(support, 18), panel: "conditions" };
  }

  function severityRank(sev) {
    sev = String(sev || "").toLowerCase();
    if (/extreme|severe/.test(sev)) return 0;
    if (/moderate|warning/.test(sev)) return 1;
    if (/minor|watch|advisory/.test(sev)) return 2;
    return 3;
  }

  function buildAlert(model) {
    var items = (model.alerts && model.alerts.items) || [];
    if (!items.length) return null;
    items = items.slice().sort(function (a, b) {
      return severityRank(a.severity) - severityRank(b.severity);
    });
    var top = items[0];
    var sev = top.severity || "Alert";
    var consequence = clipWords(top.headline || top.event || "Official weather alert is in effect", 12);
    var action = "Review before going out";
    var band = clipWords(sev + " · " + consequence + " · " + action, 28);
    return {
      severity: sev,
      text: band,
      more: items.length > 1 ? "+" + (items.length - 1) + " more" : "",
      items: items
    };
  }

  function buildMattersFallback(model) {
    var matters = [];
    var alert = buildAlert(model);
    if (alert) {
      matters.push({
        text: clipWords(alert.items[0].event || "Official alert shapes today’s plan", 14),
        panel: "alerts",
        rank: 1
      });
    } else if (model.weather && model.weather.live) {
      matters.push({
        text: "Conditions look ordinary — timing still shapes the day",
        panel: "day-arc",
        rank: 1
      });
    }
    return matters.slice(0, 3);
  }

  function buildDoFallback(model) {
    var alert = buildAlert(model);
    if (alert) {
      return {
        primary: clipWords("Postpone exposed travel until the alert eases", 16),
        alternate: "Alternate: short sheltered check of conditions nearby",
        rationale: [alert.items[0].event || "Official alert"]
      };
    }
    return {
      primary: "Step outside briefly to read conditions firsthand",
      alternate: null,
      rationale: []
    };
  }

  function compactClockLabel(raw) {
    var s = String(raw || "").trim();
    if (!s) return "";
    // M3 polish: never treat prose (e.g. photo "Diffuse light") as a beat clock.
    if (!/^\d{1,2}(:\d{2})?\s*(a\.?m\.?|p\.?m\.?|a|p)?$/i.test(s)) return "";
    return s
      .toLowerCase()
      .replace(/\s/g, "")
      .replace(":00", "")
      .replace(/a\.?m\.?/, "a")
      .replace(/p\.?m\.?/, "p");
  }

  function buildDayArc(timeline) {
    var beats = [];
    (timeline || []).forEach(function (ev) {
      if (beats.length >= 7) return;
      var t = "";
      if (ev.time) {
        try {
          // Spec §1.3 [H] — compact beats: "1p · 7:40p" not "2:00 PM"
          t = compactClockLabel(
            new Date(ev.time).toLocaleTimeString(undefined, { hour: "numeric" })
          );
        } catch (e) { /* noop */ }
      } else if (ev.timeLabel) {
        t = compactClockLabel(ev.timeLabel);
      }
      var label = clipWords(ev.label || "", 4);
      if (!label) return;
      // Prefer timed beats; allow one untimed only if we have nothing yet
      if (!t && beats.length) return;
      beats.push({
        time: clipWords(String(t || ""), 3),
        label: label,
        best: /golden|best|clear|calm/i.test(label + " " + (ev.kind || "")),
        detail: ev.detail || ""
      });
    });
    return beats.slice(0, 7);
  }

  function buildNotice(briefing, alert) {
    if (alert) return null;
    var n = briefing && briefing.sections && briefing.sections.noticing;
    if (!n || !n.items || !n.items.length) return null;
    if (/no unusual|default|still worth/i.test(n.text || "")) return null;
    return { text: clipWords(n.items[0] || n.text, 25), panel: "conditions" };
  }

  function buildConstraints(briefing, matters, intel) {
    if (intel && intel.constraints) return intel.constraints;
    if (!matters || matters.length < 2) return null;
    var caution = briefing && briefing.sections && briefing.sections.caution;
    if (!caution || !caution.items || !caution.items.length) return null;
    if (matters[0].panel === "alerts") return null;
    return {
      text: clipWords("If you still go: " + caution.items[0], 30)
    };
  }

  function buildGateways(model) {
    var g = [{ id: "conditions", label: "Conditions" }];
    g.push({ id: "light", label: "Light" });
    if (model.air && (model.air.live || model.air.aqi != null)) g.push({ id: "air", label: "Air" });
    if (model.rivers && model.rivers.live && model.rivers.sites && model.rivers.sites.length) {
      g.push({ id: "water", label: "Water" });
    }
    if (model.alerts && model.alerts.items && model.alerts.items.length) {
      g.push({ id: "alerts", label: "Alerts" });
    }
    return g;
  }

  function compose(payload) {
    payload = payload || {};
    var model = payload.model || {};
    var briefing = payload.briefing || {};
    var activities = payload.activities || [];
    var windows = payload.windows || [];
    var timeline = payload.timeline || [];

    var flags = payload.flags || payload.interpretationFlags || {};
    var placeOk = hasUsablePlace(model);
    var alert = placeOk ? buildAlert(model) : null;
    var trust = trustLabel(model, briefing);
    var loading = placeOk && !model.weather.live && !(briefing && briefing.partial) && trust.status !== "Cached";

    if (!placeOk) {
      return {
        mode: "no-location",
        placeOk: false,
        chrome: { brand: "Outside" },
        trust: trust,
        atmosphere: "neutral",
        loading: false
      };
    }

    var Interpret = global.WDS && global.WDS.dashboardOSInterpret;
    var intel = null;
    if (Interpret && Interpret.synthesize) {
      intel = Interpret.synthesize({
        model: model,
        briefing: briefing,
        activities: activities,
        windows: windows,
        flags: flags
      });
    }

    var happening = intel
      ? intel.happening
      : buildHappeningFallback(model, briefing);
    var matters = intel ? intel.matters : buildMattersFallback(model);
    var plan = intel ? intel.do : buildDoFallback(model);
    var dayArc = buildDayArc(timeline);
    var notice = buildNotice(briefing, alert);
    var constraints = buildConstraints(briefing, matters, intel);

    return {
      mode: loading ? "loading" : "briefing",
      placeOk: true,
      chrome: { brand: "Outside" },
      placeTime: placeLine(model, flags),
      happening: happening,
      matters: matters,
      do: plan,
      alert: alert,
      dayArc: dayArc,
      dayArcPeek: dayArc.slice(0, 5),
      notice: notice,
      constraints: constraints,
      gateways: buildGateways(model),
      trust: trust,
      atmosphere: atmosphereKind(model, flags),
      loading: loading,
      model: model,
      briefing: briefing,
      activities: activities,
      providers: payload.providers || [],
      prefs: payload.prefs || {},
      intelligence: intel
        ? {
            signals: intel.signals,
            traces: intel.traces,
            uncertainty: intel.uncertainty,
            rulesApplied: intel.rulesApplied,
            dewPointF: intel.dewPointF,
            meta: intel.meta
          }
        : null
    };
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardOSCompose = {
    compose: compose,
    hasUsablePlace: hasUsablePlace,
    clipWords: clipWords,
    wordCount: wordCount
  };
})(window);
