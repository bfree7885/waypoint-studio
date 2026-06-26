/**
 * Daylight utilities — golden/blue hour windows and moon phase from dates.
 * Used by OIP when merging live weather; no external API required for phase math.
 */
(function (global) {
  "use strict";

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function parseIso(iso) {
    if (!iso) return null;
    try {
      var d = new Date(iso);
      return isNaN(d.getTime()) ? null : d;
    } catch (e) {
      return null;
    }
  }

  function formatTimeRange(start, end) {
    if (!start || !end) return null;
    try {
      var a = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
      var b = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
      return a + " – " + b;
    } catch (e) {
      return null;
    }
  }

  function addMinutes(date, mins) {
    return new Date(date.getTime() + mins * 60000);
  }

  function goldenHourWindows(sunriseIso, sunsetIso) {
    var rise = parseIso(sunriseIso);
    var set = parseIso(sunsetIso);
    if (!rise || !set) return null;
    var morning = formatTimeRange(rise, addMinutes(rise, 60));
    var evening = formatTimeRange(addMinutes(set, -60), set);
    if (!morning && !evening) return null;
    return {
      morning: morning,
      evening: evening,
      summary: [morning ? "AM " + morning : null, evening ? "PM " + evening : null].filter(Boolean).join(" · ")
    };
  }

  function blueHourWindows(sunriseIso, sunsetIso) {
    var rise = parseIso(sunriseIso);
    var set = parseIso(sunsetIso);
    if (!rise || !set) return null;
    var morning = formatTimeRange(addMinutes(rise, -30), rise);
    var evening = formatTimeRange(set, addMinutes(set, 30));
    if (!morning && !evening) return null;
    return {
      morning: morning,
      evening: evening,
      summary: [morning ? "AM " + morning : null, evening ? "PM " + evening : null].filter(Boolean).join(" · ")
    };
  }

  function dayLengthHours(sunriseIso, sunsetIso) {
    var rise = parseIso(sunriseIso);
    var set = parseIso(sunsetIso);
    if (!rise || !set) return null;
    var hrs = (set - rise) / 3600000;
    return isFinite(hrs) ? Math.round(hrs * 10) / 10 : null;
  }

  function moonPhaseLabel(phase) {
    var p = Number(phase);
    if (!isFinite(p)) return null;
    if (p < 0.03 || p > 0.97) return "New moon";
    if (p < 0.22) return "Waxing crescent";
    if (p < 0.28) return "First quarter";
    if (p < 0.47) return "Waxing gibbous";
    if (p < 0.53) return "Full moon";
    if (p < 0.72) return "Waning gibbous";
    if (p < 0.78) return "Last quarter";
    return "Waning crescent";
  }

  function moonIlluminationPercent(phase) {
    var p = Number(phase);
    if (!isFinite(p)) return null;
    var illum = p <= 0.5 ? p * 2 : (1 - p) * 2;
    return Math.round(illum * 100);
  }

  function julianDay(date) {
    return date / 86400000 + 2440587.5;
  }

  function moonPhaseFromDate(date) {
    date = date || new Date();
    var jd = julianDay(date);
    var days = jd - 2451549.5;
    var phase = (days / 29.53058867) % 1;
    if (phase < 0) phase += 1;
    return phase;
  }

  function formatTime(iso) {
    if (!iso) return null;
    var d = parseIso(iso);
    if (!d) return iso;
    try {
      return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    } catch (e) {
      return iso;
    }
  }

  function twilightOffsets(lat) {
    var absLat = Math.abs(Number(lat) || 41);
    var civil = Math.round(28 + Math.max(0, absLat - 35) * 0.4);
    var nauticalExtra = Math.round(28 + Math.max(0, absLat - 35) * 0.5);
    return { civil: civil, nauticalExtra: nauticalExtra };
  }

  function twilightWindows(sunriseIso, sunsetIso, lat) {
    var rise = parseIso(sunriseIso);
    var set = parseIso(sunsetIso);
    if (!rise || !set) return null;
    var off = twilightOffsets(lat);
    var civilAm = formatTimeRange(addMinutes(rise, -off.civil), rise);
    var civilPm = formatTimeRange(set, addMinutes(set, off.civil));
    var nauticalAm = formatTimeRange(addMinutes(rise, -(off.civil + off.nauticalExtra)), addMinutes(rise, -off.civil));
    var nauticalPm = formatTimeRange(addMinutes(set, off.civil), addMinutes(set, off.civil + off.nauticalExtra));
    return {
      civilMorning: civilAm,
      civilEvening: civilPm,
      nauticalMorning: nauticalAm,
      nauticalEvening: nauticalPm,
      civilSummary: [civilAm ? "AM " + civilAm : null, civilPm ? "PM " + civilPm : null].filter(Boolean).join(" · "),
      nauticalSummary: [nauticalAm ? "AM " + nauticalAm : null, nauticalPm ? "PM " + nauticalPm : null].filter(Boolean).join(" · ")
    };
  }

  function moonPhaseEmoji(phase) {
    var p = Number(phase);
    if (!isFinite(p)) return "☽";
    if (p < 0.03 || p > 0.97) return "🌑";
    if (p < 0.22) return "🌒";
    if (p < 0.28) return "🌓";
    if (p < 0.47) return "🌔";
    if (p < 0.53) return "🌕";
    if (p < 0.72) return "🌖";
    if (p < 0.78) return "🌗";
    return "🌘";
  }

  function formatMoonTime(iso) {
    if (!iso) return null;
    try {
      return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    } catch (e) {
      return iso;
    }
  }

  function enrichFromWeather(weatherPkg, editorialDaylight) {
    editorialDaylight = editorialDaylight || {};
    var cur = (weatherPkg && weatherPkg.current) || {};
    var daily = weatherPkg && weatherPkg.daily && weatherPkg.daily[0];
    var isLive = !!(weatherPkg && weatherPkg.meta && !weatherPkg.meta.isPlaceholder);

    var sunrise = cur.sunrise || (daily && daily.sunrise) || editorialDaylight.sunrise;
    var sunset = cur.sunset || (daily && daily.sunset) || editorialDaylight.sunset;

    var moonPhase = daily && daily.moonPhase != null ? daily.moonPhase : moonPhaseFromDate(new Date());
    var phaseLabel = moonPhaseLabel(moonPhase);
    var illumination = moonIlluminationPercent(moonPhase);

    var golden = goldenHourWindows(sunrise, sunset);
    var blue = blueHourWindows(sunrise, sunset);
    var twilight = twilightWindows(sunrise, sunset, weatherPkg && weatherPkg.meta && weatherPkg.meta.lat);
    var lengthHrs = dayLengthHours(sunrise, sunset);

    return {
      status: isLive ? "live" : (editorialDaylight.status || "editorial"),
      sunrise: sunrise,
      sunset: sunset,
      sunriseFormatted: formatTime(sunrise),
      sunsetFormatted: formatTime(sunset),
      dayLengthHours: lengthHrs != null ? lengthHrs : editorialDaylight.dayLengthHours,
      civilTwilight: twilight ? twilight.civilSummary : null,
      civilTwilightMorning: twilight ? twilight.civilMorning : null,
      civilTwilightEvening: twilight ? twilight.civilEvening : null,
      nauticalTwilight: twilight ? twilight.nauticalSummary : null,
      nauticalTwilightMorning: twilight ? twilight.nauticalMorning : null,
      nauticalTwilightEvening: twilight ? twilight.nauticalEvening : null,
      goldenHour: golden ? golden.summary : editorialDaylight.goldenHour || null,
      goldenHourMorning: golden ? golden.morning : null,
      goldenHourEvening: golden ? golden.evening : null,
      blueHour: blue ? blue.summary : editorialDaylight.blueHour || null,
      blueHourMorning: blue ? blue.morning : null,
      blueHourEvening: blue ? blue.evening : null,
      moonPhase: phaseLabel,
      moonPhaseEmoji: moonPhaseEmoji(moonPhase),
      moonPhaseValue: moonPhase,
      moonIllumination: illumination,
      moonrise: daily && daily.moonrise ? formatTime(daily.moonrise) : editorialDaylight.moonrise || null,
      moonset: daily && daily.moonset ? formatTime(daily.moonset) : editorialDaylight.moonset || null,
      moonriseIso: daily && daily.moonrise,
      moonsetIso: daily && daily.moonset,
      timezone: (weatherPkg && weatherPkg.meta && weatherPkg.meta.timezone) || editorialDaylight.timezone,
      source: isLive ? ((weatherPkg.meta && weatherPkg.meta.provider) || "open-meteo") : (editorialDaylight.source || "editorial")
    };
  }

  global.WDS = global.WDS || {};
  global.WDS.daylightUtils = {
    enrichFromWeather: enrichFromWeather,
    goldenHourWindows: goldenHourWindows,
    blueHourWindows: blueHourWindows,
    twilightWindows: twilightWindows,
    formatTime: formatTime,
    moonPhaseLabel: moonPhaseLabel,
    moonPhaseEmoji: moonPhaseEmoji,
    moonPhaseFromDate: moonPhaseFromDate,
    moonIlluminationPercent: moonIlluminationPercent,
    dayLengthHours: dayLengthHours
  };
})(window);
