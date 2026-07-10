/**
 * Daylight utilities — golden/blue hour windows and moon phase from dates.
 * Open-Meteo wall-clock times are interpreted in the location IANA timezone.
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

  function hasExplicitOffset(iso) {
    return /[Zz]$|[+-]\d{2}:\d{2}$/.test(String(iso || ""));
  }

  function wallClockParts(iso) {
    var m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!m) return null;
    return {
      year: +m[1],
      month: +m[2],
      day: +m[3],
      hour: +m[4],
      minute: +m[5]
    };
  }

  function formatHour12(hour, minute) {
    var h = Number(hour);
    var m = Number(minute);
    if (!isFinite(h) || !isFinite(m)) return null;
    var period = h >= 12 ? "PM" : "AM";
    var h12 = h % 12 || 12;
    return h12 + ":" + pad(m) + " " + period;
  }

  function zoneParts(instant, timeZone) {
    if (!instant || !timeZone) return null;
    try {
      var fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      });
      var parts = fmt.formatToParts(instant);
      var out = {};
      parts.forEach(function (p) {
        if (p.type !== "literal") out[p.type] = Number(p.value);
      });
      return out;
    } catch (e) {
      return null;
    }
  }

  function wallClockToInstant(iso, timeZone) {
    var wall = wallClockParts(iso);
    if (!wall || !timeZone) return parseIso(iso);
    if (hasExplicitOffset(iso)) return parseIso(iso);
    var utcGuess = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute);
    for (var i = 0; i < 4; i++) {
      var zp = zoneParts(new Date(utcGuess), timeZone);
      if (!zp) break;
      var target = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute);
      var actual = Date.UTC(zp.year, zp.month - 1, zp.day, zp.hour, zp.minute);
      var delta = target - actual;
      if (Math.abs(delta) < 60000) break;
      utcGuess += delta;
    }
    return new Date(utcGuess);
  }

  function formatTime(iso, timeZone) {
    if (!iso) return null;
    var wall = wallClockParts(iso);
    if (wall && timeZone && !hasExplicitOffset(iso)) {
      return formatHour12(wall.hour, wall.minute);
    }
    var d = parseIso(iso);
    if (!d) return iso;
    try {
      var opts = { hour: "numeric", minute: "2-digit" };
      if (timeZone) opts.timeZone = timeZone;
      return d.toLocaleTimeString(undefined, opts);
    } catch (e) {
      return iso;
    }
  }

  function formatTimeRange(start, end, timeZone) {
    if (!start || !end) return null;
    var a = formatTime(start, timeZone);
    var b = formatTime(end, timeZone);
    if (!a || !b) return null;
    return a + " – " + b;
  }

  function addMinutes(date, mins) {
    return new Date(date.getTime() + mins * 60000);
  }

  function goldenHourWindows(sunriseIso, sunsetIso, timeZone) {
    var rise = wallClockToInstant(sunriseIso, timeZone);
    var set = wallClockToInstant(sunsetIso, timeZone);
    if (!rise || !set) return null;
    var morning = formatTimeRange(rise.toISOString(), addMinutes(rise, 60).toISOString(), timeZone);
    var evening = formatTimeRange(addMinutes(set, -60).toISOString(), set.toISOString(), timeZone);
    if (!morning && !evening) return null;
    return {
      morning: morning,
      evening: evening,
      summary: [morning ? "AM " + morning : null, evening ? "PM " + evening : null].filter(Boolean).join(" · ")
    };
  }

  function blueHourWindows(sunriseIso, sunsetIso, timeZone) {
    var rise = wallClockToInstant(sunriseIso, timeZone);
    var set = wallClockToInstant(sunsetIso, timeZone);
    if (!rise || !set) return null;
    var morning = formatTimeRange(addMinutes(rise, -30).toISOString(), rise.toISOString(), timeZone);
    var evening = formatTimeRange(set.toISOString(), addMinutes(set, 30).toISOString(), timeZone);
    if (!morning && !evening) return null;
    return {
      morning: morning,
      evening: evening,
      summary: [morning ? "AM " + morning : null, evening ? "PM " + evening : null].filter(Boolean).join(" · ")
    };
  }

  function dayLengthHours(sunriseIso, sunsetIso, timeZone) {
    var rise = wallClockToInstant(sunriseIso, timeZone);
    var set = wallClockToInstant(sunsetIso, timeZone);
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

  function twilightOffsets(lat) {
    var absLat = Math.abs(Number(lat) || 41);
    var civil = Math.round(28 + Math.max(0, absLat - 35) * 0.4);
    var nauticalExtra = Math.round(28 + Math.max(0, absLat - 35) * 0.5);
    var astroExtra = Math.round(22 + Math.max(0, absLat - 35) * 0.35);
    return { civil: civil, nauticalExtra: nauticalExtra, astroExtra: astroExtra };
  }

  function twilightWindows(sunriseIso, sunsetIso, lat, timeZone) {
    var rise = wallClockToInstant(sunriseIso, timeZone);
    var set = wallClockToInstant(sunsetIso, timeZone);
    if (!rise || !set) return null;
    var off = twilightOffsets(lat);
    var civilAm = formatTimeRange(addMinutes(rise, -off.civil).toISOString(), rise.toISOString(), timeZone);
    var civilPm = formatTimeRange(set.toISOString(), addMinutes(set, off.civil).toISOString(), timeZone);
    var nauticalAm = formatTimeRange(addMinutes(rise, -(off.civil + off.nauticalExtra)).toISOString(), addMinutes(rise, -off.civil).toISOString(), timeZone);
    var nauticalPm = formatTimeRange(addMinutes(set, off.civil).toISOString(), addMinutes(set, off.civil + off.nauticalExtra).toISOString(), timeZone);
    var astroAm = formatTimeRange(addMinutes(rise, -(off.civil + off.nauticalExtra + off.astroExtra)).toISOString(), addMinutes(rise, -(off.civil + off.nauticalExtra)).toISOString(), timeZone);
    var astroPm = formatTimeRange(addMinutes(set, off.civil + off.nauticalExtra).toISOString(), addMinutes(set, off.civil + off.nauticalExtra + off.astroExtra).toISOString(), timeZone);
    return {
      civilMorning: civilAm,
      civilEvening: civilPm,
      nauticalMorning: nauticalAm,
      nauticalEvening: nauticalPm,
      astronomicalMorning: astroAm,
      astronomicalEvening: astroPm,
      civilSummary: [civilAm ? "AM " + civilAm : null, civilPm ? "PM " + civilPm : null].filter(Boolean).join(" · "),
      nauticalSummary: [nauticalAm ? "AM " + nauticalAm : null, nauticalPm ? "PM " + nauticalPm : null].filter(Boolean).join(" · "),
      astronomicalSummary: [astroAm ? "AM " + astroAm : null, astroPm ? "PM " + astroPm : null].filter(Boolean).join(" · ")
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

  function enrichFromWeather(weatherPkg, editorialDaylight, locCtx) {
    editorialDaylight = editorialDaylight || {};
    var cur = (weatherPkg && weatherPkg.current) || {};
    var daily = weatherPkg && weatherPkg.daily && weatherPkg.daily[0];
    var isLive = !!(weatherPkg && weatherPkg.meta && !weatherPkg.meta.isPlaceholder);
    var tz = (weatherPkg && weatherPkg.meta && weatherPkg.meta.timezone) ||
      editorialDaylight.timezone || null;
    var lat = weatherPkg && weatherPkg.meta && weatherPkg.meta.lat;
    var lng = weatherPkg && weatherPkg.meta && weatherPkg.meta.lng;
    var LC = global.WDS && global.WDS.locationContext;

    var sunrise = cur.sunrise || (daily && daily.sunrise) || editorialDaylight.sunrise;
    var sunset = cur.sunset || (daily && daily.sunset) || editorialDaylight.sunset;
    var moonPhase = daily && daily.moonPhase != null ? daily.moonPhase : moonPhaseFromDate(new Date());
    var golden = goldenHourWindows(sunrise, sunset, tz);
    var blue = blueHourWindows(sunrise, sunset, tz);
    var twilight = twilightWindows(sunrise, sunset, lat, tz);
    var localDate = LC && LC.localDateInZone && tz ? LC.localDateInZone(tz) : null;
    var utcOffset = LC && LC.utcOffsetLabel && tz ? LC.utcOffsetLabel(tz) : null;

    var pkg = {
      status: isLive ? "live" : (editorialDaylight.status || "editorial"),
      sunrise: sunrise,
      sunset: sunset,
      sunriseFormatted: formatTime(sunrise, tz),
      sunsetFormatted: formatTime(sunset, tz),
      dayLengthHours: dayLengthHours(sunrise, sunset, tz) != null
        ? dayLengthHours(sunrise, sunset, tz)
        : editorialDaylight.dayLengthHours,
      civilTwilight: twilight ? twilight.civilSummary : null,
      civilTwilightMorning: twilight ? twilight.civilMorning : null,
      civilTwilightEvening: twilight ? twilight.civilEvening : null,
      nauticalTwilight: twilight ? twilight.nauticalSummary : null,
      nauticalTwilightMorning: twilight ? twilight.nauticalMorning : null,
      nauticalTwilightEvening: twilight ? twilight.nauticalEvening : null,
      astronomicalTwilight: twilight ? twilight.astronomicalSummary : null,
      astronomicalTwilightMorning: twilight ? twilight.astronomicalMorning : null,
      astronomicalTwilightEvening: twilight ? twilight.astronomicalEvening : null,
      goldenHour: golden ? golden.summary : editorialDaylight.goldenHour || null,
      goldenHourMorning: golden ? golden.morning : null,
      goldenHourEvening: golden ? golden.evening : null,
      goldenHourStatus: golden && isLive ? "estimated" : (editorialDaylight.goldenHourStatus || "editorial"),
      blueHour: blue ? blue.summary : editorialDaylight.blueHour || null,
      blueHourMorning: blue ? blue.morning : null,
      blueHourEvening: blue ? blue.evening : null,
      blueHourStatus: blue && isLive ? "estimated" : (editorialDaylight.blueHourStatus || "editorial"),
      moonPhase: moonPhaseLabel(moonPhase),
      moonPhaseEmoji: moonPhaseEmoji(moonPhase),
      moonPhaseValue: moonPhase,
      moonIllumination: moonIlluminationPercent(moonPhase),
      moonrise: daily && daily.moonrise ? formatTime(daily.moonrise, tz) : editorialDaylight.moonrise || null,
      moonset: daily && daily.moonset ? formatTime(daily.moonset, tz) : editorialDaylight.moonset || null,
      moonriseIso: daily && daily.moonrise,
      moonsetIso: daily && daily.moonset,
      timezone: tz,
      localDate: localDate,
      utcOffset: utcOffset,
      requestLat: lat,
      requestLng: lng,
      dataLat: lat,
      dataLng: lng,
      rawSunrise: sunrise,
      rawSunset: sunset,
      source: isLive ? ((weatherPkg.meta && weatherPkg.meta.provider) || "open-meteo") : (editorialDaylight.source || "editorial"),
      moduleSource: isLive ? "open-meteo-astronomy" : (editorialDaylight.source || "editorial"),
      sourceClassification: isLive ? "user-oip" : "editorial",
      cachedAt: new Date().toISOString()
    };
    if (LC && LC.attachModule) {
      LC.attachModule("daylight", pkg, locCtx, {
        requestLat: lat,
        requestLng: lng,
        dataLat: lat,
        dataLng: lng,
        timezone: tz,
        localDate: localDate,
        utcOffset: utcOffset,
        moduleSource: pkg.moduleSource,
        sourceClassification: pkg.sourceClassification
      });
    }
    return pkg;
  }

  global.WDS = global.WDS || {};
  global.WDS.daylightUtils = {
    enrichFromWeather: enrichFromWeather,
    goldenHourWindows: goldenHourWindows,
    blueHourWindows: blueHourWindows,
    twilightWindows: twilightWindows,
    formatTime: formatTime,
    wallClockToInstant: wallClockToInstant,
    moonPhaseLabel: moonPhaseLabel,
    moonPhaseEmoji: moonPhaseEmoji,
    moonPhaseFromDate: moonPhaseFromDate,
    moonIlluminationPercent: moonIlluminationPercent,
    dayLengthHours: dayLengthHours
  };
})(window);
