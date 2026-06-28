/**
 * Today's Outdoor Highlights — daily decision brief from OIP package.
 */
(function (global) {
  "use strict";

  function item(text, kind) {
    return { text: text, kind: kind || "interpretation" };
  }

  function parseNum(val) {
    if (val == null) return null;
    if (typeof val === "number" && isFinite(val)) return val;
    if (typeof val === "object" && val.value != null) return parseNum(val.value);
    var n = parseFloat(String(val).replace(/[^\d.-]/g, ""));
    return isFinite(n) ? n : null;
  }

  function wxSummary(platform) {
    var w = platform.weather;
    if (!w) return null;
    if (w.status === "live" && w.conditions) return w.conditions;
    if (w.summary) return w.summary;
    if (w.conditions) return w.conditions;
    return null;
  }

  function generate(ctx) {
    ctx = ctx || {};
    var platform = ctx.platform || {};
    var bundle = ctx.bundle || {};
    var items = [];
    var weatherRef = platform.weatherRef;
    var cur = weatherRef && weatherRef.current;
    var today = weatherRef && weatherRef.daily && weatherRef.daily[0];
    var hasLive = !!(weatherRef && weatherRef.meta && !weatherRef.meta.isPlaceholder);

    if (hasLive && cur) {
      var cond = cur.conditions && cur.conditions.summary;
      var temp = parseNum(cur.temperature);
      var feels = parseNum(cur.feelsLike);
      var pop = parseNum(cur.precipitation && cur.precipitation.probability);
      if (pop == null && today && today.precipitation) {
        pop = parseNum(today.precipitation.probability);
      }
      var line = cond || "Live conditions loaded";
      if (temp != null) {
        line = Math.round(temp) + "° now";
        if (feels != null && Math.abs(feels - temp) >= 3) {
          line += ", feels like " + Math.round(feels) + "°";
        }
        line += " — " + (cond || "check hourly for changes");
      }
      items.push(item(line, "forecast"));
      if (pop != null && pop >= 40) {
        items.push(item(pop + "% chance of precipitation today — pack rain layer", "forecast"));
      }
      if (/fog|mist|overcast|cloud/i.test(cond || "")) {
        items.push(item("Fog or overcast possible around sunrise — good for forest photography", "forecast"));
      }
      if (/thunder|storm|lightning/i.test(cond || "")) {
        items.push(item("Storm risk in forecast — have a below-treeline exit plan", "forecast"));
      }
    } else if (wxSummary(platform)) {
      items.push(item(wxSummary(platform) + " (regional editorial snapshot)", "interpretation"));
    }

    var rain = platform.rainfall && platform.rainfall.recent;
    if (rain && rain.summary) {
      items.push(item(rain.summary, rain.source === "editorial" ? "interpretation" : "observation"));
    } else if (rain && parseNum(rain.amount) > 0.2) {
      items.push(item(
        "Recent rain (" + rain.amount + " " + (rain.unit || "in") + " in " + (rain.periodDays || 7) + " days) improves mushroom habitat",
        "observation"
      ));
    }

    var species = (platform.species && platform.species.active) ||
      (platform.phenology && platform.phenology.watch && platform.phenology.watch.activeNow) || [];
    species.slice(0, 2).forEach(function (sp) {
      var name = sp.name || sp.commonName;
      if (!name) return;
      var note = sp.note ? " — " + sp.note : "";
      items.push(item(name + note, "observation"));
    });

    var HN = global.WDS && global.WDS.happeningNow;
    if (HN && HN.generate) {
      var hn = HN.generate({
        platform: platform,
        bundle: bundle,
        intelligence: ctx.intelligence,
        location: ctx.location
      });
      (hn.notes || []).slice(0, 1).forEach(function (note) {
        items.push(item((note.prefix ? note.prefix + " " : "") + note.text, "interpretation"));
      });
    }

    var bundleNotes = bundle.thisWeekOutdoors && bundle.thisWeekOutdoors.happeningNow;
    if (bundleNotes && bundleNotes.length && items.length < 4) {
      bundleNotes.slice(0, 2).forEach(function (txt) {
        if (typeof txt === "string") items.push(item(txt, "interpretation"));
      });
    }

    var tag = hasLive
      ? { label: "Live", className: "wdb-widget__tag--live" }
      : { label: "Educational", className: "wdb-widget__tag--editorial" };

    if (!items.length) {
      return {
        status: "empty",
        tag: { label: "Preview", className: "wdb-widget__tag--preview" },
        summary: "Highlights loading",
        body: "Regional highlights appear when location and weather data load."
      };
    }

    return {
      status: "ready",
      tag: tag,
      summary: items.length + " cues for today",
      highlightItems: items.slice(0, 6)
    };
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardHighlights = { generate: generate };
})(window);
