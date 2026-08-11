/**
 * Dashboard Rebuild — atmospheric outdoor card art + compact glyphs.
 * Data-honest scenes for Conditions / Air / Alerts / Light / Astronomy / forecast.
 * Authority: docs/DASHBOARD-VISUAL-LANGUAGE.md
 */
(function (global) {
  "use strict";

  var ART_VIEW = "0 0 160 100";
  var MINI_VIEW = "0 0 24 16";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function artWrap(inner, kind, illum) {
    return (
      '<div class="wdb-r-widget__art wdb-r-widget__art--' +
      esc(kind || "generic") +
      '"' +
      (illum ? ' data-illum="' + esc(illum) + '"' : "") +
      ' aria-hidden="true">' +
      '<svg class="wdb-r-widget__art-svg" viewBox="' +
      ART_VIEW +
      '" preserveAspectRatio="xMaxYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false">' +
      inner +
      "</svg></div>"
    );
  }

  function mini(inner) {
    return (
      '<span class="wdb-r-hours__icon" aria-hidden="true">' +
      '<svg viewBox="' +
      MINI_VIEW +
      '" fill="none" xmlns="http://www.w3.org/2000/svg" focusable="false">' +
      inner +
      "</svg></span>"
    );
  }

  function defsSky(id, c0, c1, c2) {
    return (
      '<defs><linearGradient id="' +
      id +
      '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' +
      c0 +
      '"/>' +
      '<stop offset="55%" stop-color="' +
      c1 +
      '"/>' +
      '<stop offset="100%" stop-color="' +
      c2 +
      '"/>' +
      "</linearGradient></defs>" +
      '<rect width="160" height="100" fill="url(#' +
      id +
      ')"/>'
    );
  }

  function ground(opacity) {
    return (
      '<path d="M0 78 C40 70 70 82 100 74 C130 66 145 72 160 68 L160 100 L0 100 Z" fill="#17131c" opacity="' +
      (opacity == null ? "0.55" : opacity) +
      '"/>'
    );
  }

  function sun(cx, cy, r) {
    return (
      '<circle cx="' +
      cx +
      '" cy="' +
      cy +
      '" r="' +
      r +
      '" fill="#f2ebe0" opacity="0.9"/>' +
      '<circle cx="' +
      cx +
      '" cy="' +
      cy +
      '" r="' +
      (r + 10) +
      '" fill="#d4a05c" opacity="0.18"/>'
    );
  }

  function moonDisc(cx, cy, r, phaseKey) {
    var base =
      '<circle cx="' +
      cx +
      '" cy="' +
      cy +
      '" r="' +
      r +
      '" fill="#e8e0d4" opacity="0.92"/>';
    var offsets = {
      new: 0,
      "waxing-crescent": 7,
      "first-quarter": 10,
      "waxing-gibbous": 14,
      full: 30,
      "waning-gibbous": -14,
      "last-quarter": -10,
      "waning-crescent": -7
    };
    var off = offsets[phaseKey] != null ? offsets[phaseKey] : 7;
    if (phaseKey === "new") {
      return (
        base +
        '<circle cx="' +
        cx +
        '" cy="' +
        cy +
        '" r="' +
        r +
        '" fill="#1f1a26" opacity="0.88"/>'
      );
    }
    if (phaseKey === "full") return base;
    return (
      base +
      '<circle cx="' +
      (cx + off) +
      '" cy="' +
      cy +
      '" r="' +
      (r + 0.4) +
      '" fill="#1a1520"/>'
    );
  }

  function stars() {
    return (
      '<circle cx="28" cy="18" r="1.1" fill="#f2ebe0" opacity="0.55"/>' +
      '<circle cx="48" cy="28" r="0.8" fill="#f2ebe0" opacity="0.4"/>' +
      '<circle cx="62" cy="14" r="0.7" fill="#f2ebe0" opacity="0.45"/>' +
      '<circle cx="90" cy="22" r="0.9" fill="#f2ebe0" opacity="0.35"/>' +
      '<circle cx="110" cy="12" r="0.6" fill="#f2ebe0" opacity="0.4"/>'
    );
  }

  function cloud(x, y, s, opacity) {
    var o = opacity == null ? 0.55 : opacity;
    return (
      '<ellipse cx="' +
      (x + s * 0.35) +
      '" cy="' +
      y +
      '" rx="' +
      s * 0.42 +
      '" ry="' +
      s * 0.22 +
      '" fill="#f2ebe0" opacity="' +
      o +
      '"/>' +
      '<ellipse cx="' +
      (x + s * 0.62) +
      '" cy="' +
      (y + s * 0.05) +
      '" rx="' +
      s * 0.38 +
      '" ry="' +
      s * 0.2 +
      '" fill="#f2ebe0" opacity="' +
      (o * 0.92) +
      '"/>' +
      '<ellipse cx="' +
      (x + s * 0.48) +
      '" cy="' +
      (y - s * 0.12) +
      '" rx="' +
      s * 0.28 +
      '" ry="' +
      s * 0.18 +
      '" fill="#f2ebe0" opacity="' +
      (o * 0.85) +
      '"/>'
    );
  }

  function rainLines(heavy) {
    var n = heavy ? 10 : 6;
    var out = "";
    for (var i = 0; i < n; i++) {
      var x = 70 + i * (heavy ? 7 : 9);
      out +=
        '<path d="M' +
        x +
        " 58 l-2 " +
        (heavy ? 16 : 12) +
        '" stroke="#a8c8d8" stroke-width="1.2" stroke-linecap="round" opacity="0.55"/>';
    }
    return out;
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

  function skyArt(state) {
    var k = normalizeSkyState(state);
    if (k === "storm") {
      return artWrap(
        defsSky("ws", "#2a2432", "#3a3348", "#1f1a26") +
          cloud(55, 38, 70, 0.45) +
          cloud(85, 48, 55, 0.4) +
          rainLines(true) +
          '<path d="M108 52 L98 70 H110 L102 88" stroke="#d4a05c" stroke-width="1.6" fill="none" opacity="0.75"/>' +
          ground(0.65),
        "storm",
        "storm"
      );
    }
    if (k === "heavy-rain" || k === "rain") {
      return artWrap(
        defsSky("wr", "#2a3a48", "#3d5566", "#243038") +
          cloud(50, 34, 75, 0.5) +
          cloud(90, 44, 50, 0.42) +
          rainLines(k === "heavy-rain") +
          ground(0.6),
        k,
        "rain"
      );
    }
    if (k === "snow") {
      return artWrap(
        defsSky("wsn", "#2c3340", "#4a5566", "#2a3038") +
          cloud(55, 32, 70, 0.48) +
          '<circle cx="78" cy="62" r="1.2" fill="#f2ebe0" opacity="0.7"/>' +
          '<circle cx="92" cy="70" r="1" fill="#f2ebe0" opacity="0.55"/>' +
          '<circle cx="108" cy="64" r="1.1" fill="#f2ebe0" opacity="0.6"/>' +
          '<circle cx="118" cy="76" r="0.9" fill="#f2ebe0" opacity="0.5"/>' +
          ground(0.55),
        "snow",
        "snow"
      );
    }
    if (k === "fog") {
      return artWrap(
        defsSky("wf", "#3a4048", "#5a626c", "#343a42") +
          '<ellipse cx="90" cy="52" rx="55" ry="14" fill="#f2ebe0" opacity="0.18"/>' +
          '<ellipse cx="100" cy="64" rx="60" ry="12" fill="#f2ebe0" opacity="0.14"/>' +
          '<ellipse cx="80" cy="74" rx="50" ry="10" fill="#f2ebe0" opacity="0.12"/>' +
          ground(0.45),
        "fog",
        "fog"
      );
    }
    if (k === "cloudy") {
      return artWrap(
        defsSky("wc", "#2f3a48", "#4a5a6a", "#2a323c") +
          cloud(45, 36, 80, 0.48) +
          cloud(85, 48, 60, 0.42) +
          ground(0.55),
        "cloudy",
        "cloudy"
      );
    }
    if (k === "clear-night") {
      return artWrap(
        defsSky("wn", "#17131c", "#2a2438", "#1a1524") +
          stars() +
          moonDisc(118, 28, 14, "waxing-crescent") +
          ground(0.7),
        "clear-night",
        "night"
      );
    }
    if (k === "wind") {
      return artWrap(
        defsSky("ww", "#2a3440", "#3d4e5c", "#243038") +
          '<path d="M50 40 H120" stroke="#a8c4d4" stroke-width="1.4" opacity="0.45"/>' +
          '<path d="M58 52 H128" stroke="#a8c4d4" stroke-width="1.4" opacity="0.35"/>' +
          '<path d="M64 64 H118" stroke="#a8c4d4" stroke-width="1.2" opacity="0.28"/>' +
          ground(0.5),
        "wind",
        "wind"
      );
    }
    if (k === "clear") {
      return artWrap(
        defsSky("wcl", "#3a6a8a", "#6aa8c2", "#c4d8e4") +
          sun(118, 28, 16) +
          ground(0.4),
        "clear",
        "clear-day"
      );
    }
    /* partly */
    return artWrap(
      defsSky("wp", "#3d5a72", "#6a90a8", "#a8c4d4") +
        sun(122, 24, 12) +
        cloud(48, 48, 70, 0.5) +
        ground(0.45),
      "partly",
      "partly"
    );
  }

  function moonPhaseKey(phase, illum) {
    var p = String(phase || "").toLowerCase();
    if (/new/.test(p)) return "new";
    if (/full/.test(p)) return "full";
    if (/first.?quarter|waxing.?quarter/.test(p)) return "first-quarter";
    if (/last.?quarter|third.?quarter|waning.?quarter/.test(p)) return "last-quarter";
    if (/waxing.?crescent/.test(p)) return "waxing-crescent";
    if (/waning.?crescent/.test(p)) return "waning-crescent";
    if (/waxing.?gibbous/.test(p)) return "waxing-gibbous";
    if (/waning.?gibbous/.test(p)) return "waning-gibbous";
    var pct = Number(illum);
    if (!isFinite(pct)) return "waxing-crescent";
    if (pct < 5) return "new";
    if (pct < 35) return "waxing-crescent";
    if (pct < 55) return "first-quarter";
    if (pct < 85) return "waxing-gibbous";
    if (pct < 95) return "full";
    return "full";
  }

  function moonArt(illum, phase) {
    var key = moonPhaseKey(phase, illum);
    return artWrap(
      defsSky("wm", "#17131c", "#241e32", "#1a1524") +
        stars() +
        moonDisc(112, 34, 18, key) +
        ground(0.72),
      "moon",
      "night"
    );
  }

  function sunPathArt(kind) {
    var k = String(kind || "sunrise").toLowerCase();
    if (/golden/.test(k)) {
      return artWrap(
        defsSky("wg", "#4a2e28", "#c17a5a", "#d4a05c") +
          sun(100, 58, 18) +
          ground(0.5),
        "golden",
        "golden"
      );
    }
    if (/blue/.test(k)) {
      return artWrap(
        defsSky("wb", "#1f1a2e", "#3a3358", "#6a7a9a") +
          stars() +
          '<circle cx="100" cy="58" r="14" fill="#8b7ab0" opacity="0.45"/>' +
          ground(0.65),
        "blue-hour",
        "blue"
      );
    }
    if (/sunset/.test(k)) {
      return artWrap(
        defsSky("wss", "#3a2430", "#c17a5a", "#d4a05c") +
          sun(120, 52, 14) +
          ground(0.55),
        "sunset",
        "golden"
      );
    }
    return artWrap(
      defsSky("wsr", "#2a3a48", "#6aa8c2", "#d4a05c") +
        sun(48, 52, 14) +
        ground(0.5),
      "sunrise",
      "golden"
    );
  }

  function aqiArt(level) {
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
    var skies = {
      good: ["#2a3a32", "#4a6a52", "#7d9a6e"],
      moderate: ["#3a3428", "#6a5a38", "#c4a46a"],
      usg: ["#3a2a24", "#6a4030", "#c17a5a"],
      unhealthy: ["#2e1e1c", "#5a3030", "#a85d52"],
      unknown: ["#2a3038", "#3a4450", "#7a8a9a"]
    };
    var c = skies[band] || skies.unknown;
    var haze =
      band === "good"
        ? 0.08
        : band === "moderate"
          ? 0.16
          : band === "usg"
            ? 0.24
            : 0.32;
    return artWrap(
      defsSky("waqi", c[0], c[1], c[2]) +
        '<ellipse cx="100" cy="48" rx="48" ry="18" fill="#f2ebe0" opacity="' +
        haze +
        '"/>' +
        '<ellipse cx="90" cy="62" rx="55" ry="14" fill="#f2ebe0" opacity="' +
        (haze * 0.8) +
        '"/>' +
        ground(0.5),
      "aqi-" + band,
      "aqi-" + band
    );
  }

  function alertArt(active) {
    if (active) {
      return artWrap(
        defsSky("wal", "#2a1c1c", "#5a3030", "#3a2424") +
          cloud(60, 36, 70, 0.35) +
          '<path d="M108 52 L98 70 H110 L102 88" stroke="#d4a05c" stroke-width="1.6" fill="none" opacity="0.8"/>' +
          ground(0.65),
        "alert-active",
        "alert"
      );
    }
    return artWrap(
      defsSky("waq", "#242830", "#343a44", "#2a3038") +
        cloud(70, 42, 55, 0.22) +
        ground(0.45),
      "alert",
      "quiet"
    );
  }

  function uvArt(index) {
    var n = Math.max(0, Math.min(11, Number(index) || 0));
    return artWrap(
      defsSky("wuv", "#3a4a58", "#6aa8c2", n >= 6 ? "#d4a05c" : "#a8c4d4") +
        sun(110, 34, 10 + Math.min(8, n)) +
        ground(0.4),
      "uv",
      n >= 6 ? "golden" : "clear-day"
    );
  }

  function hoursArt() {
    return artWrap(
      defsSky("wh", "#243040", "#3a4e5c", "#2a3640") +
        cloud(70, 40, 50, 0.28) +
        ground(0.5),
      "hours",
      "quiet"
    );
  }

  function doorwayArt() {
    return artWrap(
      defsSky("wd", "#2a3038", "#3d4a52", "#2a3238") +
        '<rect x="95" y="28" width="28" height="48" rx="2" fill="#17131c" opacity="0.55"/>' +
        '<path d="M109 28 V76" stroke="#f2ebe0" stroke-width="1" opacity="0.25"/>' +
        sun(130, 24, 6) +
        ground(0.5),
      "doorway",
      "quiet"
    );
  }

  function comfortArt() {
    return artWrap(
      defsSky("wco", "#2a3430", "#4a5a48", "#3a4840") + ground(0.45),
      "comfort",
      "quiet"
    );
  }

  function rangeArt() {
    return artWrap(
      defsSky("wrn", "#2a3440", "#4a5a68", "#2a343c") +
        sun(120, 30, 8) +
        ground(0.45),
      "range",
      "quiet"
    );
  }

  function precipArt() {
    return skyArt("rain");
  }

  function windArt() {
    return skyArt("wind");
  }

  function miniSky(state) {
    var k = normalizeSkyState(state);
    if (k === "rain" || k === "heavy-rain") {
      return mini(
        '<path d="M4 6h10" stroke="currentColor" stroke-width="1.2"/>' +
          '<path d="M8 9v5M12 9v5M16 9v4" stroke="currentColor" stroke-width="1"/>'
      );
    }
    if (k === "storm") {
      return mini(
        '<path d="M4 7h12" stroke="currentColor" stroke-width="1.2"/>' +
          '<path d="M12 8l-2 4h3l-2 4" stroke="currentColor" stroke-width="1"/>'
      );
    }
    if (k === "cloudy" || k === "fog") {
      return mini('<ellipse cx="12" cy="9" rx="7" ry="4" stroke="currentColor" stroke-width="1.1" fill="none"/>');
    }
    if (k === "clear-night") {
      return mini('<circle cx="14" cy="7" r="4" stroke="currentColor" stroke-width="1.1" fill="none"/>');
    }
    if (k === "clear") {
      return mini('<circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.1" fill="none"/>');
    }
    return mini(
      '<circle cx="16" cy="6" r="3" stroke="currentColor" stroke-width="1" fill="none"/>' +
        '<ellipse cx="10" cy="10" rx="6" ry="3.5" stroke="currentColor" stroke-width="1" fill="none"/>'
    );
  }

  function render(graphic) {
    if (!graphic || !graphic.kind) return "";
    var kind = graphic.kind;
    try {
      if (kind === "sky") return skyArt(graphic.state);
      if (kind === "aqi") return aqiArt(graphic.value);
      if (kind === "moon") return moonArt(graphic.value, graphic.phase);
      if (
        kind === "sun" ||
        kind === "sunrise" ||
        kind === "sunset" ||
        kind === "golden" ||
        kind === "blue-hour"
      ) {
        return sunPathArt(graphic.state || kind);
      }
      if (kind === "alert") return alertArt(!!graphic.active);
      if (kind === "uv") return uvArt(graphic.value);
      if (kind === "wind") return windArt();
      if (kind === "precip") return precipArt();
      if (kind === "hours") return hoursArt();
      if (kind === "doorway") return doorwayArt();
      if (kind === "comfort") return comfortArt();
      if (kind === "range") return rangeArt();
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
    version: "3.0.0-atmospheric",
    render: render,
    normalizeSkyState: normalizeSkyState,
    moonPhaseKey: moonPhaseKey,
    illumFromGraphic: illumFromGraphic,
    miniSky: miniSky
  };
})(typeof window !== "undefined" ? window : global);
