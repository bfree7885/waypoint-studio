/**
 * Dashboard Discover — calendar season vs phenology guardrails.
 * Calendar season is deterministic from date + hemisphere.
 * Phenology is editorial, geographically variable, and must expire.
 * Impossible season/date copy is suppressed — never rewritten as filler.
 */
(function (global) {
  "use strict";

  var VERSION = "1.0.0-season-guard";
  var EDITORIAL_MAX_AGE_MS = 21 * 24 * 60 * 60 * 1000;

  var SPRING_PHENOLOGY = /ephemeral|morel|trillium|trout lily|spring beauty|bloodroot|mountain laurel may be opening|laurel buds|last morels|late spring transition/i;

  function parseDate(value) {
    if (!value) return null;
    if (value instanceof Date) {
      return isNaN(value.getTime()) ? null : value;
    }
    var d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }

  function hemisphereFromLat(lat) {
    var n = Number(lat);
    if (!isFinite(n)) return "north";
    return n < 0 ? "south" : "north";
  }

  function partsInZone(now, timeZone) {
    now = parseDate(now) || new Date();
    if (!timeZone) {
      return {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        day: now.getDate()
      };
    }
    try {
      var fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      });
      var out = {};
      fmt.formatToParts(now).forEach(function (p) {
        if (p.type === "year") out.year = Number(p.value);
        if (p.type === "month") out.month = Number(p.value);
        if (p.type === "day") out.day = Number(p.value);
      });
      if (out.year && out.month && out.day) return out;
    } catch (e) {
      /* fall through */
    }
    return {
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate()
    };
  }

  function meteorologicalName(month, hemisphere) {
    var m = Number(month);
    var south = hemisphere === "south";
    if (south) {
      if (m >= 3 && m <= 5) return "autumn";
      if (m >= 6 && m <= 8) return "winter";
      if (m >= 9 && m <= 11) return "spring";
      return "summer";
    }
    if (m >= 3 && m <= 5) return "spring";
    if (m >= 6 && m <= 8) return "summer";
    if (m >= 9 && m <= 11) return "autumn";
    return "winter";
  }

  function phaseFromDay(day) {
    var d = Number(day);
    if (d <= 10) return "early";
    if (d <= 20) return "mid";
    return "late";
  }

  function calendarSeason(options) {
    options = options || {};
    var now = parseDate(options.now) || new Date();
    var lat = options.lat;
    var timeZone = options.timeZone || null;
    var hemi = hemisphereFromLat(lat);
    var parts = partsInZone(now, timeZone);
    var name = meteorologicalName(parts.month, hemi);
    var phase = phaseFromDay(parts.day);
    return {
      name: name,
      phase: phase,
      label: phase + " " + name,
      month: parts.month,
      day: parts.day,
      year: parts.year,
      hemisphere: hemi,
      source: "computed-calendar",
      confidence: "high"
    };
  }

  function normalizeSeasonToken(value) {
    var s = String(value || "")
      .toLowerCase()
      .replace(/·.*/, "")
      .replace(/tropical latitude|high latitude|plateau|river valleys|warmer lows|lowland|catskills timing|slower leaf-out/g, "")
      .trim();
    s = s.replace(/\s+/g, " ");
    var m = s.match(/\b(early|mid|late)\s+(spring|summer|autumn|fall|winter)\b/);
    if (m) {
      var name = m[2] === "fall" ? "autumn" : m[2];
      return { phase: m[1], name: name, label: m[1] + " " + name };
    }
    var only = s.match(/\b(spring|summer|autumn|fall|winter)\b/);
    if (only) {
      var n = only[1] === "fall" ? "autumn" : only[1];
      return { phase: null, name: n, label: n };
    }
    return null;
  }

  function seasonsCompatible(editorial, computed) {
    if (!editorial || !computed) return false;
    if (editorial.name !== computed.name) return false;
    if (editorial.phase && editorial.phase !== computed.phase) {
      /* mid vs late in the same meteorological season is allowed; early vs late is not. */
      var order = { early: 1, mid: 2, late: 3 };
      var a = order[editorial.phase];
      var b = order[computed.phase];
      if (a && b && Math.abs(a - b) > 1) return false;
    }
    return true;
  }

  function isEditorialFresh(options) {
    options = options || {};
    var now = parseDate(options.now) || new Date();
    var until = parseDate(options.validUntil || options.editorialValidUntil);
    if (until) return now.getTime() <= until.getTime();
    var weekOf = parseDate(options.weekOf);
    if (weekOf) return now.getTime() - weekOf.getTime() <= EDITORIAL_MAX_AGE_MS;
    /* Undated editorial phenology is treated as stale — omit rather than guess. */
    return false;
  }

  function phenologyForbidden(text, computed) {
    var blob = String(text || "");
    if (!blob) return false;
    if (computed && computed.name === "spring" && computed.hemisphere === "north") return false;
    if (computed && computed.name === "autumn" && computed.hemisphere === "south") return false;
    return SPRING_PHENOLOGY.test(blob);
  }

  function collectPhenologyText(pheno, extras) {
    var bits = [];
    if (pheno) {
      if (pheno.stage) bits.push(pheno.stage);
      if (pheno.summary) bits.push(pheno.summary);
      if (Array.isArray(pheno.notes)) bits = bits.concat(pheno.notes);
    }
    if (extras) bits.push(extras);
    return bits.filter(Boolean).join(" · ");
  }

  function isClockOnly(value) {
    return /^\d{1,2}:\d{2}(:\d{2})?$/.test(String(value || "").trim());
  }

  /**
   * Guard a platform package in place.
   * Calendar season becomes computed. Stale / impossible phenology is omitted.
   * Clock-only editorial sunrise/sunset is stripped so May times cannot appear in August.
   */
  function guardPackage(pkg, options) {
    options = options || {};
    if (!pkg || typeof pkg !== "object") return pkg;
    var now = parseDate(options.now) || new Date();
    var lat =
      options.lat != null
        ? Number(options.lat)
        : pkg.location && pkg.location.latitude != null
          ? Number(pkg.location.latitude)
          : pkg.coordinates && pkg.coordinates.latitude != null
            ? Number(pkg.coordinates.latitude)
            : null;
    var timeZone = options.timeZone || pkg.timezone || (pkg.daylight && pkg.daylight.timezone) || null;
    var computed = calendarSeason({ now: now, lat: lat, timeZone: timeZone });

    pkg.calendar = pkg.calendar || {};
    if (pkg.calendar.season && !pkg.calendar.editorialSeason) {
      pkg.calendar.editorialSeason = pkg.calendar.season;
    }
    pkg.calendar.season = computed.label;
    pkg.calendar.month = computed.month;
    pkg.calendar.seasonSource = computed.source;
    pkg.calendar.hemisphere = computed.hemisphere;
    pkg.calendar.seasonConfidence = "high";

    var editorialToken = normalizeSeasonToken(pkg.calendar.editorialSeason);
    pkg.calendar.editorialCompatible = editorialToken
      ? seasonsCompatible(editorialToken, computed)
      : false;

    var pheno = pkg.phenology || {};
    var blob = collectPhenologyText(pheno);
    var fresh = isEditorialFresh({
      now: now,
      weekOf: pkg.calendar.weekOf || options.weekOf,
      validUntil: pkg.calendar.editorialValidUntil || pheno.validUntil || options.validUntil
    });
    var forbidden = phenologyForbidden(blob, computed);
    var seasonOk = !editorialToken || pkg.calendar.editorialCompatible;

    if (!fresh || forbidden || !seasonOk || !blob) {
      pkg.phenology = pkg.phenology || {};
      pkg.phenology.status = "omitted";
      pkg.phenology.stage = null;
      pkg.phenology.summary = null;
      pkg.phenology.notes = [];
      pkg.phenology.omittedReason = !blob
        ? "none"
        : !fresh
          ? "stale"
          : forbidden
            ? "impossible-for-date"
            : "season-mismatch";
      pkg.phenology.confidence = "none";
      if (pkg.phenology.watch) {
        pkg.phenology.watch = { activeNow: [], ending: [], comingSoon: [] };
      }
    } else {
      pkg.phenology.status = "editorial";
      pkg.phenology.confidence = "low";
      pkg.phenology.omittedReason = null;
    }

    if (pkg.daylight && pkg.daylight.source === "editorial") {
      if (isClockOnly(pkg.daylight.sunrise)) pkg.daylight.sunrise = null;
      if (isClockOnly(pkg.daylight.sunset)) pkg.daylight.sunset = null;
      if (pkg.daylight.dayLengthHours != null && pkg.phenology && pkg.phenology.omittedReason === "stale") {
        pkg.daylight.dayLengthHours = null;
      }
    }

    return pkg;
  }

  function displayLine(pkg, options) {
    options = options || {};
    if (pkg) guardPackage(pkg, options);
    var cal = (pkg && pkg.calendar) || {};
    var pheno = (pkg && pkg.phenology) || {};
    if (pheno.stage && pheno.status === "editorial") {
      return {
        text: "Seasonal note (editorial): " + String(pheno.stage),
        kind: "editorial-phenology",
        confidence: "low"
      };
    }
    if (cal.season && cal.seasonSource === "computed-calendar") {
      return {
        text: "Calendar: " + String(cal.season),
        kind: "computed-calendar",
        confidence: "high"
      };
    }
    return null;
  }

  function containsImpossibleSeasonCopy(text, options) {
    var computed = calendarSeason(options || {});
    var blob = String(text || "");
    if (phenologyForbidden(blob, computed)) return true;
    var token = normalizeSeasonToken(blob);
    if (token && token.name !== computed.name) return true;
    return false;
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardSeason = {
    version: VERSION,
    hemisphereFromLat: hemisphereFromLat,
    calendarSeason: calendarSeason,
    normalizeSeasonToken: normalizeSeasonToken,
    seasonsCompatible: seasonsCompatible,
    isEditorialFresh: isEditorialFresh,
    phenologyForbidden: phenologyForbidden,
    guardPackage: guardPackage,
    displayLine: displayLine,
    containsImpossibleSeasonCopy: containsImpossibleSeasonCopy,
    isClockOnly: isClockOnly,
    EDITORIAL_MAX_AGE_MS: EDITORIAL_MAX_AGE_MS
  };
})(typeof window !== "undefined" ? window : global);
