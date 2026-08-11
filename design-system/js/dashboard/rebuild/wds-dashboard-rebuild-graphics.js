/**
 * Dashboard Rebuild — field-guide / weather-station illustrations.
 * Atmospheric context in negative space — secondary to measurements.
 * Coherent stroke system; not emoji, cartoon, or glossy UI icons.
 * Authority: docs/DESIGN-SYSTEM-2.0.md + docs/DASHBOARD-VISUAL-LANGUAGE.md
 */
(function (global) {
  "use strict";

  var VIEW = "0 0 96 56";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function wrap(inner, kind, illum) {
    return (
      '<div class="wdb-r-graphic wdb-r-graphic--' +
      esc(kind || "generic") +
      '"' +
      (illum ? ' data-illum="' + esc(illum) + '"' : "") +
      ' aria-hidden="true">' +
      '<svg class="wdb-r-graphic__svg" viewBox="' +
      VIEW +
      '" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false">' +
      inner +
      "</svg></div>"
    );
  }

  /* Shared primitives — field atlas line weight */
  var SW = 'stroke="currentColor" stroke-width="1.25" stroke-linecap="round" stroke-linejoin="round"';
  var SWF = SW + ' fill="color-mix(in srgb, currentColor 10%, transparent)"';

  function sunDisc(cx, cy, r) {
    return (
      '<circle cx="' +
      cx +
      '" cy="' +
      cy +
      '" r="' +
      r +
      '" ' +
      SWF +
      "/>"
    );
  }

  function sunRays(cx, cy, inner, outer, n) {
    var out = "";
    for (var i = 0; i < n; i++) {
      var a = (i / n) * Math.PI * 2 - Math.PI / 2;
      out +=
        '<path d="M' +
        (cx + Math.cos(a) * inner).toFixed(1) +
        " " +
        (cy + Math.sin(a) * inner).toFixed(1) +
        "L" +
        (cx + Math.cos(a) * outer).toFixed(1) +
        " " +
        (cy + Math.sin(a) * outer).toFixed(1) +
        '" ' +
        SW +
        "/>";
    }
    return out;
  }

  function cloudMass(x, y, w) {
    var h = w * 0.42;
    return (
      '<path d="M' +
      (x + w * 0.22) +
      " " +
      (y + h) +
      "C" +
      (x + w * 0.08) +
      " " +
      (y + h) +
      " " +
      x +
      " " +
      (y + h * 0.72) +
      " " +
      x +
      " " +
      (y + h * 0.48) +
      "C" +
      x +
      " " +
      (y + h * 0.18) +
      " " +
      (x + w * 0.16) +
      " " +
      y +
      " " +
      (x + w * 0.34) +
      " " +
      (y + h * 0.12) +
      "C" +
      (x + w * 0.42) +
      " " +
      (y - h * 0.08) +
      " " +
      (x + w * 0.58) +
      " " +
      (y - h * 0.08) +
      " " +
      (x + w * 0.66) +
      " " +
      (y + h * 0.14) +
      "C" +
      (x + w * 0.86) +
      " " +
      (y + h * 0.08) +
      " " +
      (x + w) +
      " " +
      (y + h * 0.28) +
      " " +
      (x + w) +
      " " +
      (y + h * 0.52) +
      "C" +
      (x + w) +
      " " +
      (y + h * 0.78) +
      " " +
      (x + w * 0.86) +
      " " +
      (y + h) +
      " " +
      (x + w * 0.7) +
      " " +
      (y + h) +
      "Z" +
      '" ' +
      SWF +
      "/>"
    );
  }

  function rainStreaks(x, y, n, heavy) {
    var out = "";
    var gap = heavy ? 5 : 7;
    for (var i = 0; i < n; i++) {
      var dx = x + i * gap;
      out +=
        '<path d="M' +
        dx +
        " " +
        y +
        "l" +
        (heavy ? -1.2 : -0.8) +
        " " +
        (heavy ? 10 : 7) +
        '" ' +
        SW +
        "/>";
    }
    return out;
  }

  function horizon() {
    return '<path d="M8 44h80" ' + SW + ' opacity="0.35"/>';
  }

  function skyClearDay() {
    return wrap(
      horizon() + sunDisc(68, 18, 9) + sunRays(68, 18, 12, 18, 8),
      "clear",
      "clear-day"
    );
  }

  function skyPartly() {
    return wrap(
      horizon() +
        sunDisc(72, 14, 6) +
        sunRays(72, 14, 9, 13, 6) +
        cloudMass(18, 22, 52),
      "partly",
      "partly"
    );
  }

  function skyCloudy() {
    return wrap(
      horizon() + cloudMass(12, 16, 48) + cloudMass(36, 24, 44),
      "cloudy",
      "cloudy"
    );
  }

  function skyFog() {
    return wrap(
      horizon() +
        '<path d="M14 18h56M18 26h50M16 34h54" ' +
        SW +
        ' opacity="0.55"/>' +
        cloudMass(28, 10, 36),
      "fog",
      "fog"
    );
  }

  function skyRain() {
    return wrap(
      horizon() + cloudMass(20, 10, 54) + rainStreaks(28, 32, 6, false),
      "rain",
      "rain"
    );
  }

  function skyHeavyRain() {
    return wrap(
      horizon() + cloudMass(16, 8, 58) + rainStreaks(24, 30, 9, true),
      "heavy-rain",
      "rain"
    );
  }

  function skyStorm() {
    return wrap(
      horizon() +
        cloudMass(14, 8, 56) +
        rainStreaks(26, 30, 5, true) +
        '<path d="M48 28l-5 10h7l-4 10" ' +
        SW +
        "/>",
      "storm",
      "storm"
    );
  }

  function skySnow() {
    var flakes = "";
    var pts = [
      [28, 34],
      [40, 38],
      [52, 33],
      [34, 42],
      [46, 44]
    ];
    pts.forEach(function (p) {
      flakes +=
        '<path d="M' +
        p[0] +
        " " +
        (p[1] - 3) +
        "v6M" +
        (p[0] - 3) +
        " " +
        p[1] +
        "h6M" +
        (p[0] - 2) +
        " " +
        (p[1] - 2) +
        "l4 4M" +
        (p[0] - 2) +
        " " +
        (p[1] + 2) +
        "l4-4" +
        '" ' +
        SW +
        ' opacity="0.7"/>';
    });
    return wrap(horizon() + cloudMass(18, 10, 52) + flakes, "snow", "snow");
  }

  function skyClearNight() {
    return wrap(
      horizon() +
        '<circle cx="70" cy="16" r="8" ' +
        SWF +
        "/>" +
        '<circle cx="74" cy="14" r="8" fill="var(--wdb-r-surface, #1f1a26)"/>' +
        '<circle cx="28" cy="14" r="1" fill="currentColor" opacity="0.55"/>' +
        '<circle cx="40" cy="22" r="0.8" fill="currentColor" opacity="0.45"/>' +
        '<circle cx="52" cy="12" r="0.7" fill="currentColor" opacity="0.5"/>',
      "clear-night",
      "night"
    );
  }

  function skyWind() {
    return wrap(
      horizon() +
        '<path d="M16 18h40c4 0 7 2.5 7 5.5S60 29 56 29H34" ' +
        SW +
        "/>" +
        '<path d="M20 32h44c3.5 0 6 2 6 4.5S67.5 41 64 41H28" ' +
        SW +
        "/>" +
        '<path d="M24 46h28" ' +
        SW +
        ' opacity="0.5"/>',
      "wind",
      "wind"
    );
  }

  function normalizeSkyState(state) {
    var s = String(state || "partly").toLowerCase().replace(/[_]/g, " ");
    if (/thunder|storm|severe|lightning/.test(s)) return "storm";
    if (/heavy.?rain|downpour|torrent/.test(s)) return "heavy-rain";
    if (/snow|sleet|blizzard|flurr/.test(s)) return "snow";
    if (/fog|mist|haze|smoke/.test(s)) return "fog";
    if (/rain|drizzle|shower/.test(s)) return "rain";
    if (/clear.?night|night.?clear/.test(s)) return "clear-night";
    if (/wind|breez|gust/.test(s) && !/cloud|rain|clear|part/.test(s)) return "wind";
    if (/overcast|cloud/.test(s) && !/part/.test(s)) return "cloudy";
    if (/clear|sunny|fair/.test(s)) return "clear";
    if (/part/.test(s)) return "partly";
    return "partly";
  }

  function sky(state) {
    var k = normalizeSkyState(state);
    if (k === "storm") return skyStorm();
    if (k === "heavy-rain") return skyHeavyRain();
    if (k === "snow") return skySnow();
    if (k === "fog") return skyFog();
    if (k === "rain") return skyRain();
    if (k === "clear-night") return skyClearNight();
    if (k === "wind") return skyWind();
    if (k === "cloudy") return skyCloudy();
    if (k === "clear") return skyClearDay();
    return skyPartly();
  }

  function moonPhaseKeyFromFraction(frac) {
    var pv = Number(frac);
    if (!isFinite(pv)) return null;
    if (pv < 0) pv = ((pv % 1) + 1) % 1;
    if (pv > 1) pv = pv % 1;
    if (pv < 0.03 || pv > 0.97) return "new";
    if (pv < 0.22) return "waxing-crescent";
    if (pv < 0.28) return "first-quarter";
    if (pv < 0.47) return "waxing-gibbous";
    if (pv < 0.53) return "full";
    if (pv < 0.72) return "waning-gibbous";
    if (pv < 0.78) return "last-quarter";
    return "waning-crescent";
  }

  function moonPhaseFractionNow() {
    var jd = Date.now() / 86400000 + 2440587.5;
    var days = jd - 2451549.5;
    var phase = days / 29.53058867;
    phase = phase - Math.floor(phase);
    if (phase < 0) phase += 1;
    return phase;
  }

  function moonPhaseKey(phase, illum, phaseValue) {
    var p = String(phase || "").toLowerCase();
    if (/new/.test(p)) return "new";
    if (/full/.test(p)) return "full";
    if (/first.?quarter|waxing.?quarter/.test(p)) return "first-quarter";
    if (/last.?quarter|third.?quarter|waning.?quarter/.test(p)) return "last-quarter";
    if (/waxing.?crescent/.test(p)) return "waxing-crescent";
    if (/waning.?crescent/.test(p)) return "waning-crescent";
    if (/waxing.?gibbous/.test(p)) return "waxing-gibbous";
    if (/waning.?gibbous/.test(p)) return "waning-gibbous";
    /* Prefer 0–1 phase fraction (distinguishes waxing vs waning); illum % cannot */
    var fromValue = moonPhaseKeyFromFraction(phaseValue);
    if (fromValue) return fromValue;
    var fromNow = moonPhaseKeyFromFraction(moonPhaseFractionNow());
    if (fromNow) return fromNow;
    var pct = Number(illum);
    if (!isFinite(pct)) return "waxing-crescent";
    if (pct < 5) return "new";
    if (pct >= 95) return "full";
    /* Amount-only last resort — still ambiguous for side; prefer quarter/gibbous neutrals */
    if (pct < 35) return "waxing-crescent";
    if (pct < 55) return "first-quarter";
    if (pct < 85) return "waxing-gibbous";
    return "full";
  }

  function moon(illum, phase, phaseValue) {
    var key = moonPhaseKey(phase, illum, phaseValue);
    var cx = 64;
    var cy = 22;
    var r = 12;
    var disc = '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" ' + SWF + "/>";
    var mask = "";
    /* Shadow disc offsets approximate phase — field-guide style */
    var offsets = {
      new: 0,
      "waxing-crescent": 9,
      "first-quarter": 12,
      "waxing-gibbous": 16,
      full: 28,
      "waning-gibbous": -16,
      "last-quarter": -12,
      "waning-crescent": -9
    };
    var off = offsets[key] != null ? offsets[key] : 9;
    if (key === "new") {
      mask =
        '<circle cx="' +
        cx +
        '" cy="' +
        cy +
        '" r="' +
        r +
        '" fill="var(--wdb-r-surface, #1f1a26)" opacity="0.85"/>';
    } else if (key !== "full") {
      mask =
        '<circle cx="' +
        (cx + off) +
        '" cy="' +
        cy +
        '" r="' +
        (r + 0.5) +
        '" fill="var(--wdb-r-surface, #1f1a26)"/>';
    }
    var stars =
      '<circle cx="28" cy="14" r="0.9" fill="currentColor" opacity="0.45"/>' +
      '<circle cx="38" cy="24" r="0.7" fill="currentColor" opacity="0.4"/>' +
      '<circle cx="46" cy="12" r="0.6" fill="currentColor" opacity="0.35"/>';
    return wrap(
      horizon() + disc + mask + stars,
      "moon",
      "night"
    );
  }

  function sunPath(kind) {
    var k = String(kind || "sunrise").toLowerCase();
    if (/midday|noon|^day$/.test(k)) {
      return wrap(
        horizon() + sunDisc(48, 16, 10) + sunRays(48, 16, 13, 20, 8),
        "midday",
        "clear-day"
      );
    }
    if (/golden/.test(k)) {
      return wrap(
        horizon() +
          sunDisc(48, 36, 10) +
          sunRays(48, 36, 13, 18, 7) +
          '<path d="M12 36h72" ' +
          SW +
          ' opacity="0.4"/>',
        "golden",
        "golden"
      );
    }
    if (/blue/.test(k)) {
      return wrap(
        horizon() +
          '<circle cx="48" cy="34" r="9" ' +
          SWF +
          "/>" +
          '<path d="M18 34h60" ' +
          SW +
          ' opacity="0.35"/>' +
          '<circle cx="30" cy="18" r="0.8" fill="currentColor" opacity="0.35"/>',
        "blue-hour",
        "blue"
      );
    }
    if (/sunset/.test(k)) {
      return wrap(
        horizon() +
          '<path d="M14 40c10-14 22-20 34-18 12 2 22 10 28 18" ' +
          SW +
          "/>" +
          sunDisc(70, 28, 7),
        "sunset",
        "golden"
      );
    }
    return wrap(
      horizon() +
        '<path d="M14 40c10-14 22-20 34-18 12 2 22 10 28 18" ' +
        SW +
        "/>" +
        sunDisc(28, 28, 7),
      "sunrise",
      "golden"
    );
  }

  function aqi(level) {
    var n = Number(level);
    var band = !isFinite(n)
      ? "unknown"
      : n <= 50
        ? "good"
        : n <= 100
          ? "moderate"
          : n <= 150
            ? "usg"
            : "unhealthy";
    return wrap(
      horizon() +
        '<ellipse cx="48" cy="28" rx="28" ry="12" ' +
        SW +
        ' opacity="0.35"/>' +
        '<ellipse cx="48" cy="26" rx="18" ry="8" ' +
        SWF +
        "/>" +
        '<ellipse cx="48" cy="24" rx="8" ry="4" fill="currentColor" opacity="0.2"/>',
      "aqi-" + band,
      "aqi-" + band
    );
  }

  function alert(active) {
    return wrap(
      horizon() +
        '<path d="M48 10 72 42H24L48 10Z" ' +
        SWF +
        "/>" +
        '<path d="M48 22v10M48 36.5v1" ' +
        SW +
        "/>",
      active ? "alert-active" : "alert",
      active ? "alert" : "quiet"
    );
  }

  function uv(index) {
    var n = Math.max(0, Math.min(11, Number(index) || 0));
    var rays = Math.max(3, Math.ceil(n / 2));
    return wrap(
      horizon() + sunDisc(52, 22, 7) + sunRays(52, 22, 10, 10 + rays, rays),
      "uv",
      n >= 6 ? "golden" : "clear-day"
    );
  }

  function precip() {
    return skyRain();
  }

  function hours() {
    return wrap(
      horizon() +
        '<path d="M20 40V22M34 40V16M48 40V24M62 40V14M76 40V20" ' +
        SW +
        "/>" +
        '<path d="M16 40h64" ' +
        SW +
        ' opacity="0.4"/>',
      "hours",
      "quiet"
    );
  }

  function doorway() {
    return wrap(
      horizon() +
        '<rect x="36" y="12" width="24" height="32" rx="1.5" ' +
        SWF +
        "/>" +
        '<path d="M48 12v32" ' +
        SW +
        ' opacity="0.5"/>' +
        '<circle cx="54" cy="28" r="1.2" fill="currentColor" opacity="0.55"/>' +
        sunDisc(72, 16, 4),
      "doorway",
      "quiet"
    );
  }

  function comfort() {
    return wrap(
      horizon() +
        '<path d="M40 38c0-10 4-18 8-22 4 4 8 12 8 22" ' +
        SW +
        "/>" +
        '<path d="M40 38h16" ' +
        SW +
        "/>" +
        sunDisc(48, 14, 3.5),
      "comfort",
      "quiet"
    );
  }

  function dayRange() {
    return wrap(
      horizon() +
        '<path d="M22 40V28M74 40V18" ' +
        SW +
        "/>" +
        '<path d="M22 28h52" ' +
        SW +
        ' stroke-dasharray="2 3" opacity="0.55"/>' +
        '<path d="M22 40h52" ' +
        SW +
        ' opacity="0.35"/>',
      "range",
      "quiet"
    );
  }

  function wind() {
    return skyWind();
  }

  function render(graphic) {
    if (!graphic || !graphic.kind) return "";
    var kind = graphic.kind;
    try {
      if (kind === "sky") return sky(graphic.state);
      if (kind === "aqi") return aqi(graphic.value);
      if (kind === "moon") return moon(graphic.value, graphic.phase, graphic.phaseValue);
      if (kind === "sun" || kind === "sunrise" || kind === "sunset" || kind === "golden" || kind === "blue-hour") {
        return sunPath(graphic.state || kind);
      }
      if (kind === "alert") return alert(!!graphic.active);
      if (kind === "uv") return uv(graphic.value);
      if (kind === "wind") return wind();
      if (kind === "precip") return precip();
      if (kind === "hours") return hours();
      if (kind === "doorway") return doorway();
      if (kind === "comfort") return comfort();
      if (kind === "range") return dayRange();
    } catch (e) {
      return "";
    }
    return "";
  }

  function illumFromGraphic(graphic) {
    if (!graphic) return "quiet";
    if (graphic.illum) return graphic.illum;
    var html = render(graphic);
    var m = html && html.match(/data-illum="([^"]+)"/);
    return m ? m[1] : "quiet";
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardRebuildGraphics = {
    version: "2.0.0-field-guide",
    render: render,
    normalizeSkyState: normalizeSkyState,
    moonPhaseKey: moonPhaseKey,
    illumFromGraphic: illumFromGraphic
  };
})(typeof window !== "undefined" ? window : global);
