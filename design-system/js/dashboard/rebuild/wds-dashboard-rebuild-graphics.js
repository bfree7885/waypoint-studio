/**
 * Dashboard Rebuild — condition-aware instrument graphics (SVG, not emoji).
 * Decorative; never replace honest fact labels.
 */
(function (global) {
  "use strict";

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function wrap(inner, kind) {
    return (
      '<div class="wdb-r-graphic wdb-r-graphic--' +
      esc(kind || "generic") +
      '" aria-hidden="true">' +
      '<svg class="wdb-r-graphic__svg" viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">' +
      inner +
      "</svg></div>"
    );
  }

  function sky(state) {
    var s = String(state || "partly").toLowerCase();
    if (/thunder|storm|severe/.test(s)) {
      return wrap(
        '<path d="M14 22c0-6 5-10 11-10 2-5 8-8 14-6 5 1 8 6 8 11 4 0 7 3 7 7H14c-3 0-5-2-5-5 0-1 .5-3 2-4Z" stroke="currentColor" stroke-width="1.6" fill="color-mix(in srgb, currentColor 12%, transparent)"/>' +
          '<path d="M30 24l-4 8h6l-3 8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
        "storm"
      );
    }
    if (/rain|drizzle|shower/.test(s)) {
      return wrap(
        '<path d="M16 20c0-5 4-9 10-9 2-4 7-7 12-5 4 1 7 5 7 9 3 0 6 3 6 6H16c-3 0-5-2-5-5Z" stroke="currentColor" stroke-width="1.6" fill="color-mix(in srgb, currentColor 10%, transparent)"/>' +
          '<path d="M24 30v6M32 29v7M40 30v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
        "rain"
      );
    }
    if (/cloud|overcast|fog|mist/.test(s)) {
      return wrap(
        '<path d="M14 24c0-5 4-9 10-9 2-5 8-8 13-5 5 2 7 7 7 11 4 0 7 3 7 6H14c-3 0-5-2-5-5Z" stroke="currentColor" stroke-width="1.6" fill="color-mix(in srgb, currentColor 14%, transparent)"/>',
        "cloud"
      );
    }
    if (/clear|sunny|fair/.test(s)) {
      return wrap(
        '<circle cx="32" cy="18" r="8" stroke="currentColor" stroke-width="1.6" fill="color-mix(in srgb, currentColor 18%, transparent)"/>' +
          '<path d="M32 4v4M32 28v4M14 18h4M46 18h4M19 7l3 3M42 29l3 3M19 29l3-3M42 7l3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>',
        "clear"
      );
    }
    return wrap(
      '<circle cx="22" cy="16" r="6" stroke="currentColor" stroke-width="1.5" fill="color-mix(in srgb, currentColor 14%, transparent)"/>' +
        '<path d="M28 24c0-4 3-7 8-7 1-4 5-6 9-4 3 1 5 4 5 8 3 0 5 2 5 5H28c-2 0-4-2-4-4Z" stroke="currentColor" stroke-width="1.5"/>',
      "partly"
    );
  }

  function aqi(level) {
    var n = Number(level);
    var band = !isFinite(n) ? "unknown" : n <= 50 ? "good" : n <= 100 ? "moderate" : n <= 150 ? "usg" : "unhealthy";
    return (
      '<div class="wdb-r-graphic wdb-r-graphic--aqi wdb-r-graphic--aqi-' +
      esc(band) +
      '" aria-hidden="true">' +
      '<svg class="wdb-r-graphic__svg" viewBox="0 0 64 40" fill="none">' +
      '<circle cx="32" cy="20" r="12" stroke="currentColor" stroke-width="1.6" fill="color-mix(in srgb, currentColor 22%, transparent)"/>' +
      '<circle cx="32" cy="20" r="5" fill="currentColor" opacity="0.55"/>' +
      "</svg></div>"
    );
  }

  function moon(illum) {
    var pct = Math.max(0, Math.min(100, Number(illum) || 0));
    var offset = 10 - (pct / 100) * 20;
    return wrap(
      '<circle cx="32" cy="20" r="11" stroke="currentColor" stroke-width="1.5" fill="color-mix(in srgb, currentColor 10%, transparent)"/>' +
        '<circle cx="' +
        (32 + offset) +
        '" cy="20" r="11" fill="var(--wdb-r-surface, #1f1a26)"/>',
      "moon"
    );
  }

  function sun() {
    return wrap(
      '<path d="M8 28c8-10 18-14 28-12 8 2 14 8 18 16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
        '<circle cx="44" cy="14" r="5" stroke="currentColor" stroke-width="1.5" fill="color-mix(in srgb, currentColor 20%, transparent)"/>',
      "sun"
    );
  }

  function alert() {
    return wrap(
      '<path d="M32 6 52 34H12L32 6Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" fill="color-mix(in srgb, currentColor 12%, transparent)"/>' +
        '<path d="M32 16v8M32 28.5v.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
      "alert"
    );
  }

  function uv(index) {
    var n = Math.max(0, Math.min(11, Number(index) || 0));
    var rays = "";
    for (var i = 0; i < Math.ceil(n / 2); i++) {
      var a = (i / 6) * Math.PI - Math.PI / 2;
      var x1 = 32 + Math.cos(a) * 8;
      var y1 = 20 + Math.sin(a) * 8;
      var x2 = 32 + Math.cos(a) * 14;
      var y2 = 20 + Math.sin(a) * 14;
      rays +=
        '<path d="M' +
        x1.toFixed(1) +
        " " +
        y1.toFixed(1) +
        "L" +
        x2.toFixed(1) +
        " " +
        y2.toFixed(1) +
        '" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>';
    }
    return wrap(
      '<circle cx="32" cy="20" r="6" stroke="currentColor" stroke-width="1.5" fill="color-mix(in srgb, currentColor 18%, transparent)"/>' +
        rays,
      "uv"
    );
  }

  function wind() {
    return wrap(
      '<path d="M10 14h28c3 0 5 2 5 4s-2 4-5 4H22" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
        '<path d="M10 22h34c3 0 5 2 5 4s-2 4-5 4H18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
        '<path d="M10 30h20" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
      "wind"
    );
  }

  function precip() {
    return wrap(
      '<path d="M18 16c0-4 3-8 8-8 1-3 5-5 9-3 3 1 5 4 5 8 2 0 4 2 4 4H18c-2 0-4-2-4-4Z" stroke="currentColor" stroke-width="1.5"/>' +
        '<path d="M24 28c0 3 2 6 4 8M32 27c0 4 2 7 4 9M40 28c0 3 2 6 4 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>',
      "precip"
    );
  }

  function hours() {
    return wrap(
      '<path d="M10 30h44" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>' +
        '<path d="M16 30V18M26 30V14M36 30V20M46 30V12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
      "hours"
    );
  }

  function doorway() {
    return wrap(
      '<rect x="20" y="8" width="24" height="26" rx="2" stroke="currentColor" stroke-width="1.6"/>' +
        '<path d="M32 8v26M20 20h12" stroke="currentColor" stroke-width="1.4"/>' +
        '<circle cx="40" cy="22" r="1.4" fill="currentColor"/>',
      "doorway"
    );
  }

  function comfort() {
    return wrap(
      '<path d="M24 30c0-8 4-14 8-18 4 4 8 10 8 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
        '<path d="M24 30h16" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>' +
        '<circle cx="32" cy="12" r="3" stroke="currentColor" stroke-width="1.4"/>',
      "comfort"
    );
  }

  function dayRange() {
    return wrap(
      '<path d="M12 28h40" stroke="currentColor" stroke-width="1.4"/>' +
        '<path d="M18 28V20M46 28V16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '<path d="M18 20h28" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2 3"/>',
      "range"
    );
  }

  function render(graphic) {
    if (!graphic || !graphic.kind) return "";
    var kind = graphic.kind;
    if (kind === "sky") return sky(graphic.state);
    if (kind === "aqi") return aqi(graphic.value);
    if (kind === "moon") return moon(graphic.value);
    if (kind === "sun") return sun();
    if (kind === "alert") return alert();
    if (kind === "uv") return uv(graphic.value);
    if (kind === "wind") return wind();
    if (kind === "precip") return precip();
    if (kind === "hours") return hours();
    if (kind === "doorway") return doorway();
    if (kind === "comfort") return comfort();
    if (kind === "range") return dayRange();
    return "";
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardRebuildGraphics = {
    version: "1.0.0-depth",
    render: render
  };
})(typeof window !== "undefined" ? window : global);
