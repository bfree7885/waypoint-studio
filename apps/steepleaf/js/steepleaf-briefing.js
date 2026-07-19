/**
 * Steepleaf — Today's Tea briefing.
 * Interprets the user's private collection & sessions only.
 * Never invents teas, ratings, or journal entries.
 */
(function (global) {
  "use strict";

  function daysBetween(a, b) {
    var ms = Math.abs(new Date(b).getTime() - new Date(a).getTime());
    return ms / (1000 * 60 * 60 * 24);
  }

  function hourLocal(d) {
    return (d || new Date()).getHours();
  }

  function monthLocal(d) {
    return (d || new Date()).getMonth(); // 0-11
  }

  /**
   * Rough seasonal / weather-adjacent cues from calendar only (no fabricated weather API).
   * Honest: "seasonal tendency" not live meteorology.
   */
  function seasonalContext(d) {
    var m = monthLocal(d);
    var h = hourLocal(d);
    if (m === 11 || m <= 1) {
      return {
        id: "cool-season",
        label: "Cooler season",
        delicateOk: false,
        richOk: true,
        note: "Calendar suggests a cooler season — richer, warmer cups often feel welcome."
      };
    }
    if (m >= 5 && m <= 7) {
      return {
        id: "warm-season",
        label: "Warmer season",
        delicateOk: true,
        richOk: true,
        note: "Warmer months often suit lighter greens and whites, especially earlier in the day."
      };
    }
    if (h < 11) {
      return {
        id: "morning",
        label: "Morning",
        delicateOk: true,
        richOk: true,
        note: "Morning water and palate are often kinder to delicate teas."
      };
    }
    if (h >= 17) {
      return {
        id: "evening",
        label: "Evening",
        delicateOk: true,
        richOk: true,
        note: "Evening cups favor what you find soothing — lower caffeine styles if that matters to you."
      };
    }
    return {
      id: "daytime",
      label: "Daytime",
      delicateOk: true,
      richOk: true,
      note: "A flexible window for most styles in your collection."
    };
  }

  function lastBrewForTea(brews, teaId) {
    for (var i = 0; i < brews.length; i++) {
      if (brews[i].teaId === teaId) return brews[i];
    }
    return null;
  }

  function daysSinceType(brews, teas, typeId) {
    var teaIds = {};
    teas.forEach(function (t) {
      if (t.type === typeId) teaIds[t.id] = true;
    });
    var latest = null;
    brews.forEach(function (b) {
      if (!teaIds[b.teaId]) return;
      if (!latest || String(b.brewedAt) > String(latest)) latest = b.brewedAt;
    });
    if (!latest) return null;
    return daysBetween(latest, new Date().toISOString());
  }

  function pickRecommendation(teas, brews, season, prefs) {
    if (!teas.length) return null;
    var scored = teas.map(function (t) {
      var score = 0;
      var reasons = [];
      var guide = global.SteepleafGuides && global.SteepleafGuides.guideForType(t.type);
      var last = lastBrewForTea(brews, t.id);
      var days = last ? daysBetween(last.brewedAt, new Date().toISOString()) : 999;

      if (t.favorite) {
        score += 8;
        reasons.push("Marked as a favorite in your collection.");
      }
      if (days >= 10 && days < 900) {
        score += 10;
        reasons.push("You last brewed this about " + Math.round(days) + " days ago — a good gap for noticing change.");
      } else if (!last) {
        score += 12;
        reasons.push("You have not logged a session with this tea yet.");
      } else if (days < 2) {
        score -= 6;
        reasons.push("Brewed very recently — fine to repeat, or try something else.");
      }

      if (season.id === "cool-season" && (t.type === "shou-puer" || t.type === "black" || t.type === "heicha")) {
        score += 9;
        reasons.push(season.note);
      }
      if ((season.id === "warm-season" || season.id === "morning") && (t.type === "green" || t.type === "white" || t.type === "yellow")) {
        score += 8;
        reasons.push(season.note);
      }
      if (season.delicateOk && (t.type === "green" || t.type === "white") && hourLocal() < 12) {
        score += 4;
        reasons.push("Earlier in the day is often kinder to delicate greens and whites.");
      }
      if (prefs && prefs.preferredTypes && prefs.preferredTypes.indexOf(t.type) >= 0) {
        score += 6;
        reasons.push("Matches a style you marked as preferred in Settings.");
      }
      if (t.type === "oolong" && last && last.steepSeconds && last.steepSeconds > 60) {
        score += 3;
        reasons.push("Your last oolong steep was relatively long — a shorter first infusion can open fragrance.");
      }

      return {
        tea: t,
        score: score,
        reasons: reasons,
        guide: guide,
        lastBrew: last
      };
    });

    scored.sort(function (a, b) {
      return b.score - a.score;
    });
    return scored[0];
  }

  function buildBriefing() {
    var Store = global.WaypointSteepleaf;
    var Guides = global.SteepleafGuides;
    if (!Store) {
      return {
        generatedAt: new Date().toISOString(),
        empty: true,
        bullets: ["Steepleaf models are not loaded."],
        recommendation: null
      };
    }

    var teas = Store.listTeas();
    var brews = Store.listBrews();
    var prefs = Store.getPreferences();
    var season = seasonalContext();
    var bullets = [];
    var recommendation = pickRecommendation(teas, brews, season, prefs);

    if (!teas.length) {
      return {
        generatedAt: new Date().toISOString(),
        empty: true,
        season: season,
        bullets: [
          "Your collection is empty — add a tea you actually own to unlock today’s briefing.",
          "Nothing here is invented: recommendations only come from your private shelf and sessions.",
          season.note
        ],
        recommendation: null,
        counts: { teas: 0, brews: 0 }
      };
    }

    bullets.push(season.note);

    if (recommendation) {
      var t = recommendation.tea;
      var g = recommendation.guide;
      bullets.push(
        "Suggested focus: “" +
          t.name +
          "”" +
          (t.type ? " (" + Guides.typeLabel(t.type) + ")" : "") +
          "."
      );
      recommendation.reasons.slice(0, 3).forEach(function (r) {
        bullets.push(r);
      });
      if (g) {
        bullets.push(
          "Starting parameters: about " +
            g.tempRange +
            ", ~" +
            g.steepSeconds +
            "s first steep — " +
            g.why
        );
        if (t.type === "oolong") {
          bullets.push("Consider a shorter first infusion today to keep later cups lively.");
        }
      }
    }

    // Type gap insights from real brew history only (skip type already covered by recommendation)
    var recType = recommendation && recommendation.tea && recommendation.tea.type;
    ["green", "oolong", "shou-puer", "white"].forEach(function (typeId) {
      if (recType && typeId === recType) return;
      var owned = teas.some(function (x) {
        return x.type === typeId;
      });
      if (!owned) return;
      var gap = daysSinceType(brews, teas, typeId);
      if (gap == null) {
        bullets.push(
          "You own " + Guides.typeLabel(typeId) + " tea but have not logged a session yet."
        );
      } else if (gap >= 14) {
        bullets.push(
          "You have not brewed " +
            Guides.typeLabel(typeId) +
            " in about " +
            Math.round(gap) +
            " days — a gentle invitation if you miss that style."
        );
      }
    });

    if (brews.length) {
      var yesterday = brews[0];
      var yTea = Store.getTea(yesterday.teaId);
      var name = (yTea && yTea.name) || yesterday.teaNameSnapshot || "your last tea";
      bullets.push(
        "Your most recent session was “" +
          name +
          "” — reopen those notes when you brew again to compare."
      );
    } else {
      bullets.push("No brew sessions yet — today’s cup can become your first journal entry.");
    }

    // Deduplicate while preserving order
    var seen = {};
    bullets = bullets.filter(function (b) {
      if (seen[b]) return false;
      seen[b] = true;
      return true;
    }).slice(0, 7);

    return {
      generatedAt: new Date().toISOString(),
      empty: false,
      season: season,
      bullets: bullets,
      recommendation: recommendation,
      counts: { teas: teas.length, brews: brews.length }
    };
  }

  function compareSessions(current, previous) {
    if (!current || !previous) return null;
    var lines = [];
    if (current.waterTempC != null && previous.waterTempC != null) {
      var dT = current.waterTempC - previous.waterTempC;
      if (dT !== 0) {
        lines.push(
          "Water " +
            (dT > 0 ? "+" : "") +
            dT +
            "°C vs previous session (" +
            previous.waterTempC +
            "°C → " +
            current.waterTempC +
            "°C)."
        );
      } else {
        lines.push("Same water temperature as the previous session (" + current.waterTempC + "°C).");
      }
    }
    if (current.steepSeconds != null && previous.steepSeconds != null) {
      var dS = current.steepSeconds - previous.steepSeconds;
      if (dS !== 0) {
        lines.push(
          "Steep time " + (dS > 0 ? "+" : "") + dS + "s vs previous (" + previous.steepSeconds + "s → " + current.steepSeconds + "s)."
        );
      }
    }
    if (current.rating != null && previous.rating != null) {
      var dR = current.rating - previous.rating;
      if (dR > 0) lines.push("You rated this session higher than the previous one.");
      else if (dR < 0) lines.push("You rated this session lower than the previous one — useful signal, not a verdict.");
      else lines.push("Same overall rating as the previous session.");
    }
    if (previous.notes && current.notes) {
      lines.push("Both sessions have notes — read them side by side for what changed.");
    } else if (previous.notes && !current.notes) {
      lines.push("Previous session had notes you can revisit.");
    }
    if (!lines.length) {
      lines.push("Not enough shared parameters to compare yet — log temperature and time next round.");
    }
    return {
      previousId: previous.id,
      previousAt: previous.brewedAt,
      lines: lines
    };
  }

  global.SteepleafBriefing = {
    buildBriefing: buildBriefing,
    compareSessions: compareSessions,
    seasonalContext: seasonalContext
  };
})(typeof window !== "undefined" ? window : globalThis);
