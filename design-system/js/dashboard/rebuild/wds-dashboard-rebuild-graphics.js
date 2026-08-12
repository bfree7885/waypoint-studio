/**
 * Dashboard Rebuild — unique data-driven instrument art.
 * Southwestern high-desert / field-guide scenes. Reusable primitives composed
 * DIFFERENTLY per instrument — not tinted clones of one mountain+sun drawing.
 * Authority: docs/DASHBOARD-VISUAL-LANGUAGE.md
 */
(function (global) {
  "use strict";

  var ART_VIEW = "0 0 160 100";
  var MINI_VIEW = "0 0 24 16";
  var uid = 0;
  function nid(prefix) {
    uid += 1;
    return prefix + uid;
  }

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
      ' data-scene="' +
      esc(kind || "generic") +
      '" aria-hidden="true">' +
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

  function skyGradient(c0, c1, c2) {
    var id = nid("sky");
    return {
      defs:
        '<linearGradient id="' +
        id +
        '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="' +
        c0 +
        '"/>' +
        '<stop offset="48%" stop-color="' +
        c1 +
        '"/>' +
        '<stop offset="100%" stop-color="' +
        c2 +
        '"/>' +
        "</linearGradient>",
      paint: '<rect width="160" height="100" fill="url(#' + id + ')"/>'
    };
  }

  function radialWash(cx, cy, r, color, opacity) {
    var id = nid("rw");
    return {
      defs:
        '<radialGradient id="' +
        id +
        '" cx="' +
        cx +
        '" cy="' +
        cy +
        '" r="' +
        r +
        '" gradientUnits="userSpaceOnUse">' +
        '<stop offset="0%" stop-color="' +
        color +
        '" stop-opacity="' +
        opacity +
        '"/>' +
        '<stop offset="100%" stop-color="' +
        color +
        '" stop-opacity="0"/>' +
        "</radialGradient>",
      paint: '<rect width="160" height="100" fill="url(#' + id + ')"/>'
    };
  }

  function compose(layers) {
    var defs = "";
    var paint = "";
    layers.forEach(function (L) {
      if (!L) return;
      if (typeof L === "string") {
        paint += L;
        return;
      }
      if (L.defs) defs += L.defs;
      if (L.paint) paint += L.paint;
    });
    return (defs ? "<defs>" + defs + "</defs>" : "") + paint;
  }

  /* ——— CONDITIONS: flat-topped high-desert mesas (not alpine sawtooth) ——— */

  function mesaFar(fill, opacity) {
    return (
      '<path class="wdb-r-mesa" d="M0 64 H20 V40 H48 V52 H70 V30 H104 V46 H128 V36 H160 V100 H0 Z" fill="' +
      fill +
      '" opacity="' +
      (opacity == null ? 0.5 : opacity) +
      '"/>'
    );
  }

  function mesaMid(fill, opacity) {
    return (
      '<path d="M0 74 H28 V58 H62 V66 H90 V50 H124 V62 H160 V100 H0 Z" fill="' +
      fill +
      '" opacity="' +
      (opacity == null ? 0.72 : opacity) +
      '"/>'
    );
  }

  function canyonFloor(fill, opacity) {
    return (
      '<path d="M0 86 C36 80 70 88 110 82 L160 78 L160 100 L0 100 Z" fill="' +
      fill +
      '" opacity="' +
      (opacity == null ? 0.94 : opacity) +
      '"/>'
    );
  }

  function sageBrush(x, scale, fill, opacity) {
    var s = scale || 1;
    var f = fill || "#1a1814";
    var o = opacity == null ? 0.82 : opacity;
    var y = 92;
    return (
      '<path d="M' +
      x +
      " " +
      y +
      " C" +
      (x + 2 * s) +
      " " +
      (y - 10 * s) +
      " " +
      (x + 8 * s) +
      " " +
      (y - 12 * s) +
      " " +
      (x + 10 * s) +
      " " +
      (y - 4 * s) +
      " C" +
      (x + 14 * s) +
      " " +
      (y - 11 * s) +
      " " +
      (x + 16 * s) +
      " " +
      (y - 6 * s) +
      " " +
      (x + 13 * s) +
      " " +
      y +
      " Z" +
      '" fill="' +
      f +
      '" opacity="' +
      o +
      '"/>'
    );
  }

  function sageRow() {
    return sageBrush(6, 0.9) + sageBrush(24, 1.15) + sageBrush(136, 1) + sageBrush(150, 0.75);
  }

  function cloudMass(x, y, w, fill, opacity) {
    var h = w * 0.42;
    var f = fill || "#e8e2d6";
    var o = opacity == null ? 0.55 : opacity;
    return (
      '<path d="M' +
      (x + w * 0.12) +
      " " +
      (y + h * 0.88) +
      " C" +
      (x - w * 0.02) +
      " " +
      (y + h * 0.9) +
      " " +
      (x - w * 0.04) +
      " " +
      (y + h * 0.55) +
      " " +
      (x + w * 0.08) +
      " " +
      (y + h * 0.42) +
      " C" +
      (x + w * 0.02) +
      " " +
      (y + h * 0.18) +
      " " +
      (x + w * 0.16) +
      " " +
      (y + h * 0.02) +
      " " +
      (x + w * 0.3) +
      " " +
      (y + h * 0.12) +
      " C" +
      (x + w * 0.34) +
      " " +
      (y - h * 0.08) +
      " " +
      (x + w * 0.48) +
      " " +
      (y - h * 0.14) +
      " " +
      (x + w * 0.56) +
      " " +
      (y + h * 0.05) +
      " C" +
      (x + w * 0.66) +
      " " +
      (y - h * 0.1) +
      " " +
      (x + w * 0.8) +
      " " +
      (y - h * 0.02) +
      " " +
      (x + w * 0.86) +
      " " +
      (y + h * 0.22) +
      " C" +
      (x + w * 1.02) +
      " " +
      (y + h * 0.18) +
      " " +
      (x + w * 1.05) +
      " " +
      (y + h * 0.55) +
      " " +
      (x + w * 0.92) +
      " " +
      (y + h * 0.7) +
      " C" +
      (x + w * 0.98) +
      " " +
      (y + h * 0.95) +
      " " +
      (x + w * 0.78) +
      " " +
      (y + h * 1.05) +
      " " +
      (x + w * 0.62) +
      " " +
      (y + h * 0.95) +
      " C" +
      (x + w * 0.48) +
      " " +
      (y + h * 1.08) +
      " " +
      (x + w * 0.28) +
      " " +
      (y + h * 1.02) +
      " " +
      (x + w * 0.12) +
      " " +
      (y + h * 0.88) +
      " Z" +
      '" fill="' +
      f +
      '" opacity="' +
      o +
      '"/>'
    );
  }

  function cloudBank(density, fill, baseY) {
    var y = baseY == null ? 28 : baseY;
    var f = fill || "#d8d2c6";
    if (density === "heavy") {
      return (
        cloudMass(42, y - 4, 78, f, 0.42) +
        cloudMass(68, y + 6, 70, f, 0.5) +
        cloudMass(88, y - 2, 62, f, 0.38) +
        cloudMass(52, y + 12, 90, f, 0.28)
      );
    }
    if (density === "overcast") {
      return (
        cloudMass(30, y - 8, 100, f, 0.48) +
        cloudMass(55, y + 2, 95, f, 0.55) +
        cloudMass(70, y + 10, 85, f, 0.4) +
        cloudMass(40, y + 16, 110, "#b8b2a8", 0.32)
      );
    }
    if (density === "light") {
      return cloudMass(78, y, 55, f, 0.4) + cloudMass(105, y + 8, 42, f, 0.32);
    }
    return cloudMass(70, y, 58, f, 0.45) + cloudMass(100, y + 10, 48, f, 0.35);
  }

  function sunDisc(cx, cy, r, core, glow) {
    var id = nid("sun");
    return (
      '<defs><radialGradient id="' +
      id +
      '" cx="50%" cy="50%" r="50%">' +
      '<stop offset="0%" stop-color="' +
      (core || "#f7f0e0") +
      '"/>' +
      '<stop offset="55%" stop-color="' +
      (glow || "#e8c888") +
      '" stop-opacity="0.85"/>' +
      '<stop offset="100%" stop-color="' +
      (glow || "#e8c888") +
      '" stop-opacity="0"/>' +
      "</radialGradient></defs>" +
      '<circle cx="' +
      cx +
      '" cy="' +
      cy +
      '" r="' +
      r * 2.4 +
      '" fill="url(#' +
      id +
      ')" opacity="0.9"/>' +
      '<circle cx="' +
      cx +
      '" cy="' +
      cy +
      '" r="' +
      r +
      '" fill="' +
      (core || "#f7f0e0") +
      '" opacity="0.95"/>'
    );
  }

  function starsField() {
    var pts = [
      [22, 14, 0.9],
      [38, 22, 0.6],
      [54, 12, 0.7],
      [68, 26, 0.5],
      [86, 10, 0.8],
      [102, 18, 0.55],
      [118, 8, 0.65],
      [132, 24, 0.5],
      [48, 32, 0.45],
      [96, 30, 0.4],
      [28, 36, 0.35]
    ];
    return pts
      .map(function (p) {
        return (
          '<circle cx="' +
          p[0] +
          '" cy="' +
          p[1] +
          '" r="' +
          p[2] +
          '" fill="#f2ebe0" opacity="0.55"/>'
        );
      })
      .join("");
  }

  function rainStreaks(heavy) {
    var n = heavy ? 14 : 8;
    var out = "";
    for (var i = 0; i < n; i++) {
      var x = 58 + i * (heavy ? 6.2 : 8.5) + (i % 3) * 1.5;
      var y = 48 + (i % 4) * 3;
      out +=
        '<path d="M' +
        x.toFixed(1) +
        " " +
        y +
        " l-2.2 " +
        (heavy ? 18 : 12) +
        '" stroke="#9eb8c8" stroke-width="' +
        (heavy ? 1.35 : 1.1) +
        '" stroke-linecap="round" opacity="' +
        (heavy ? 0.55 : 0.42) +
        '"/>';
    }
    return out;
  }

  function snowFlakes() {
    var pts = [
      [72, 52],
      [86, 58],
      [98, 50],
      [110, 62],
      [78, 68],
      [120, 54],
      [94, 72]
    ];
    return pts
      .map(function (p) {
        return (
          '<g transform="translate(' +
          p[0] +
          " " +
          p[1] +
          ')" stroke="#e8e4dc" stroke-width="0.9" opacity="0.65">' +
          '<path d="M0-3.2v6.4M-2.8-1.6l5.6 3.2M-2.8 1.6l5.6-3.2"/>' +
          "</g>"
        );
      })
      .join("");
  }

  function fogBands(intensity) {
    var o = intensity == null ? 0.22 : intensity;
    return (
      '<path d="M40 48 C70 42 100 52 140 46" stroke="#d8d4cc" stroke-width="7" stroke-linecap="round" opacity="' +
      o +
      '" fill="none"/>' +
      '<path d="M35 58 C75 52 105 62 145 56" stroke="#d8d4cc" stroke-width="9" stroke-linecap="round" opacity="' +
      o * 0.85 +
      '" fill="none"/>' +
      '<path d="M30 70 C80 64 110 74 150 68" stroke="#c8c4bc" stroke-width="11" stroke-linecap="round" opacity="' +
      o * 0.7 +
      '" fill="none"/>'
    );
  }

  function lightningBolt() {
    return (
      '<path d="M108 36 L98 54 H108 L100 72" stroke="#e8d4a0" stroke-width="1.8" stroke-linejoin="round" fill="none" opacity="0.85"/>' +
      '<path d="M108 36 L98 54 H108 L100 72" stroke="#f7f0e0" stroke-width="0.7" stroke-linejoin="round" fill="none" opacity="0.9"/>'
    );
  }

  /* ——— LIGHT: flat horizon bands + sun — NOT mesas ——— */

  function horizonGround(y, fill) {
    return (
      '<rect class="wdb-r-horizon" x="0" y="' +
      y +
      '" width="160" height="' +
      (100 - y) +
      '" fill="' +
      (fill || "#1a1614") +
      '"/>'
    );
  }

  function skyBands(stops) {
    var id = nid("bands");
    var defs =
      '<linearGradient id="' +
      id +
      '" x1="0" y1="0" x2="0" y2="1">';
    stops.forEach(function (s) {
      defs +=
        '<stop offset="' +
        s[0] +
        '" stop-color="' +
        s[1] +
        '"' +
        (s[2] != null ? ' stop-opacity="' + s[2] + '"' : "") +
        "/>";
    });
    defs += "</linearGradient>";
    return {
      defs: defs,
      paint: '<rect class="wdb-r-light-bands" width="160" height="100" fill="url(#' + id + ')"/>'
    };
  }

  /* ——— AIR: receding visibility planes — NOT mesas ——— */

  function depthPlanes(hazeOp, farColor, nearColor) {
    var o = hazeOp == null ? 0.16 : hazeOp;
    return (
      '<g class="wdb-r-depth">' +
      '<ellipse cx="108" cy="42" rx="70" ry="18" fill="' +
      farColor +
      '" opacity="' +
      (0.18 + o * 0.5) +
      '"/>' +
      '<ellipse cx="100" cy="56" rx="78" ry="16" fill="' +
      farColor +
      '" opacity="' +
      (0.22 + o * 0.55) +
      '"/>' +
      '<ellipse cx="96" cy="70" rx="86" ry="14" fill="' +
      nearColor +
      '" opacity="' +
      (0.28 + o * 0.4) +
      '"/>' +
      '<rect x="0" y="78" width="160" height="22" fill="' +
      nearColor +
      '" opacity="' +
      (0.55 + o * 0.2) +
      '"/>' +
      "</g>"
    );
  }

  /* ——— PRECIP: vertical rain curtain — NOT mesas ——— */

  function rainCurtain(prob, intensity) {
    var p = isFinite(Number(prob)) ? Number(prob) : 40;
    /* Never depict falling rain for dry / very-low probability. */
    if (p <= 10 && intensity !== "heavy" && intensity !== "moderate") {
      return '<g class="wdb-r-curtain" data-rain="none"></g>';
    }
    var heavy = intensity === "heavy" || intensity === "moderate" || p >= 70;
    var n = p <= 30 ? 0 : p < 55 ? 8 : p < 75 ? 14 : p < 85 ? 18 : 24;
    if (intensity === "heavy") n = Math.max(n, 18);
    if (n === 0) {
      return '<g class="wdb-r-curtain" data-rain="none"></g>';
    }
    var out = '<g class="wdb-r-curtain" data-rain="active">';
    for (var i = 0; i < n; i++) {
      var x = 52 + (i * 4.2 + (i % 5) * 1.1);
      var y0 = 8 + (i % 7) * 3;
      var len = heavy ? 22 + (i % 4) * 6 : 14 + (i % 4) * 4;
      var op = 0.22 + Math.min(0.45, p / 160);
      out +=
        '<path d="M' +
        x.toFixed(1) +
        " " +
        y0 +
        " l-1.8 " +
        len +
        '" stroke="#9ec4c8" stroke-width="' +
        (heavy ? 1.4 : 1.05) +
        '" stroke-linecap="round" opacity="' +
        op.toFixed(2) +
        '"/>';
    }
    var sheen = Math.min(0.28, 0.06 + p / 400);
    out +=
      '<path d="M48 88 C80 84 112 90 150 86 L160 88 L160 100 L48 100 Z" fill="#6aa8a0" opacity="' +
      sheen.toFixed(2) +
      '"/>';
    out += "</g>";
    return out;
  }

  function virga(prob) {
    var n = 5;
    var out = '<g class="wdb-r-curtain">';
    for (var i = 0; i < n; i++) {
      var x = 78 + i * 12;
      out +=
        '<path d="M' +
        x +
        " 28 l-1.2 16" +
        '" stroke="#a8c0c4" stroke-width="1" stroke-linecap="round" opacity="' +
        (0.12 + (prob || 10) / 200) +
        '"/>';
    }
    out += "</g>";
    return out;
  }

  /* ——— WIND: movement + direction — NOT mesas ——— */

  function windFlow(speed, deg) {
    var mph = isFinite(Number(speed)) ? Number(speed) : 8;
    var d = isFinite(Number(deg)) ? Number(deg) : 270;
    var amp = Math.min(16, 5 + mph * 0.45);
    var rad = ((d - 180) * Math.PI) / 180;
    var dx = Math.cos(rad) * 28;
    var dy = Math.sin(rad) * 8;
    function ribbon(x, y, w, op) {
      var x2 = x + dx + w * 0.4;
      var y2 = y + dy;
      var x3 = x + dx * 1.6 + w;
      var y3 = y + dy * 0.4;
      return (
        '<path d="M' +
        x.toFixed(1) +
        " " +
        y.toFixed(1) +
        " C" +
        (x + 18).toFixed(1) +
        " " +
        (y - amp * 0.35).toFixed(1) +
        " " +
        x2.toFixed(1) +
        " " +
        (y2 + amp * 0.2).toFixed(1) +
        " " +
        x3.toFixed(1) +
        " " +
        y3.toFixed(1) +
        '" stroke="#c4d8d4" stroke-width="' +
        w +
        '" fill="none" opacity="' +
        op +
        '"/>'
      );
    }
    var lean = Math.min(10, mph * 0.35);
    var grass =
      '<g class="wdb-r-flow" fill="#2a3228">' +
      '<path d="M18 96 C' +
      (18 + lean) +
      " 78 " +
      (26 + lean) +
      " 80 22 96 Z" +
      '" opacity="0.85"/>' +
      '<path d="M32 96 C' +
      (34 + lean * 1.2) +
      " 72 " +
      (44 + lean) +
      " 76 38 96 Z" +
      '" opacity="0.9"/>' +
      '<path d="M48 96 C' +
      (52 + lean) +
      " 80 " +
      (58 + lean) +
      " 82 54 96 Z" +
      '" opacity="0.75"/>' +
      '<path d="M128 96 C' +
      (124 - lean) +
      " 78 " +
      (136 - lean) +
      " 80 134 96 Z" +
      '" opacity="0.8"/>' +
      '<path d="M144 96 C' +
      (140 - lean) +
      " 74 " +
      (152 - lean) +
      " 78 150 96 Z" +
      '" opacity="0.88"/>' +
      "</g>";
    return (
      grass +
      ribbon(50, 38, 1.5, 0.42) +
      ribbon(56, 50, 1.25, 0.34) +
      ribbon(62, 62, 1.1, 0.26)
    );
  }

  /* ——— SNOW: winter forms — NOT recolored rain mesas ——— */

  function snowDrifts() {
    return (
      '<g class="wdb-r-winter">' +
      '<path d="M0 78 Q36 64 72 76 Q108 88 160 70 L160 100 L0 100 Z" fill="#e8e4dc" opacity="0.22"/>' +
      '<path d="M0 88 Q48 80 90 90 Q128 96 160 84 L160 100 L0 100 Z" fill="#f2ebe0" opacity="0.28"/>' +
      '<path d="M22 70 Q34 58 48 70 Q40 74 22 70 Z" fill="#e8e4dc" opacity="0.35"/>' +
      '<path d="M118 66 Q132 54 148 68 Q136 72 118 66 Z" fill="#e8e4dc" opacity="0.32"/>' +
      "</g>"
    );
  }

  /* ——— Moon phase: orthographic illuminated area only (no maria/craters/glow) ——— */

  function moonPhaseKey(phase, illum, phaseValue) {
    var pv = Number(phaseValue);
    if (isFinite(pv)) {
      if (pv < 0) pv = ((pv % 1) + 1) % 1;
      if (pv > 1 && pv <= 100) pv = pv / 100;
      if (pv < 0.005 || pv >= 0.995) return "new";
      if (pv >= 0.495 && pv < 0.505) return "full";
      return pv < 0.5 ? "waxing" : "waning";
    }
    var p = String(phase || "").toLowerCase();
    if (/waning|last.?quarter|third.?quarter/.test(p)) return "waning";
    if (/waxing|first.?quarter/.test(p)) return "waxing";
    if (/full/.test(p)) return "full";
    if (/new/.test(p)) return "new";
    var pct = Number(illum);
    if (!isFinite(pct)) return "waxing";
    if (pct < 0.5) return "new";
    if (pct >= 99.5) return "full";
    return "waxing";
  }

  function moonIlluminationFraction(illumPct) {
    var pct = Number(illumPct);
    if (!isFinite(pct)) return 0;
    /*
     * Dashboard / Open-Meteo illumination is always 0–100 percent.
     * Do NOT treat 1 as “100% of a unit fraction” — that paints a Full Moon
     * for a 1% New Moon (the production failure case).
     * Only rescale clearly fractional values strictly between 0 and 1 exclusive.
     */
    if (pct > 0 && pct < 1) pct = pct * 100;
    return Math.max(0, Math.min(1, pct / 100));
  }

  /**
   * Orthographic terminator: lit disk fraction k = illumination/100.
   * Terminator x = (1 − 2k) · √(1 − y²). Waxing = lit on the right.
   * Paint ONLY dark disk + solid lit polygon — no texture, glow, or craters.
   */
  function moonLitPath(cx, cy, r, k, waxing) {
    if (k <= 0.002) return "";
    if (k >= 0.998) {
      return (
        "M " +
        (cx - r) +
        " " +
        cy +
        " a " +
        r +
        " " +
        r +
        " 0 1 1 " +
        r * 2 +
        " 0 a " +
        r +
        " " +
        r +
        " 0 1 1 " +
        -r * 2 +
        " 0"
      );
    }
    var n = 72;
    var litRight = waxing !== false;
    var d = "";
    var i;
    var y;
    var half;
    var xLimb;
    var xTerm;
    for (i = 0; i <= n; i++) {
      y = 1 - (2 * i) / n;
      half = Math.sqrt(Math.max(0, 1 - y * y));
      xLimb = litRight ? half : -half;
      d += (i === 0 ? "M " : " L ") + (cx + r * xLimb).toFixed(3) + " " + (cy - r * y).toFixed(3);
    }
    for (i = n; i >= 0; i--) {
      y = 1 - (2 * i) / n;
      half = Math.sqrt(Math.max(0, 1 - y * y));
      xTerm = (1 - 2 * k) * half;
      if (!litRight) xTerm = -xTerm;
      d += " L " + (cx + r * xTerm).toFixed(3) + " " + (cy - r * y).toFixed(3);
    }
    return d + " Z";
  }

  function moonDisc(cx, cy, r, phaseKey, illumPct) {
    var k = moonIlluminationFraction(illumPct);
    var key = String(phaseKey || "");
    var waxing = key !== "waning" && key !== "new";
    if (key === "full") waxing = true;
    if (key === "new" && k > 0.002 && k < 0.998) waxing = true;
    var darkFill = "#0a080c";
    var litFill = "#ebe6d8";
    var rim = "rgba(226,214,255,0.14)";
    var path = moonLitPath(cx, cy, r, k, waxing);
    var out =
      '<g class="wdb-r-luna" data-illum="' +
      Math.round(k * 100) +
      '" data-limb="' +
      (k <= 0.002 ? "new" : k >= 0.998 ? "full" : waxing ? "waxing" : "waning") +
      '">' +
      '<circle cx="' +
      cx +
      '" cy="' +
      cy +
      '" r="' +
      r +
      '" fill="' +
      darkFill +
      '"/>';
    if (path) {
      out += '<path d="' + path + '" fill="' + litFill + '"/>';
    }
    out +=
      '<circle cx="' +
      cx +
      '" cy="' +
      cy +
      '" r="' +
      r +
      '" fill="none" stroke="' +
      rim +
      '" stroke-width="0.7"/>' +
      "</g>";
    return out;
  }

  /* ——— Sky / weather scenes (Conditions instrument) ——— */

  function normalizeSkyState(state) {
    var s = String(state || "partly")
      .toLowerCase()
      .replace(/[_]/g, " ");
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

  function weatherTerrain(sky) {
    return compose([
      sky,
      mesaFar("#3a2e28", 0.48),
      mesaMid("#241c18", 0.78),
      canyonFloor("#14110e", 0.95),
      sageRow()
    ]);
  }

  function skyArt(state) {
    var k = normalizeSkyState(state);
    if (k === "storm") {
      return artWrap(
        compose([
          skyGradient("#1a1214", "#2a1c22", "#1c1416"),
          mesaFar("#1a1214", 0.7),
          mesaMid("#120e10", 0.88),
          cloudBank("heavy", "#4a3840", 24),
          rainStreaks(true),
          lightningBolt(),
          canyonFloor("#0c0a0c", 0.96),
          sageRow()
        ]),
        "storm",
        "storm"
      );
    }
    if (k === "heavy-rain") {
      return artWrap(
        compose([
          skyGradient("#1e242c", "#2e3a44", "#1a2228"),
          mesaFar("#1a2228", 0.65),
          mesaMid("#141a20", 0.85),
          cloudBank("overcast", "#6a7480", 22),
          rainStreaks(true),
          canyonFloor("#101418", 0.95),
          sageRow()
        ]),
        "heavy-rain",
        "rain"
      );
    }
    if (k === "rain") {
      return artWrap(
        compose([
          skyGradient("#243038", "#3a4e58", "#243038"),
          mesaFar("#1e2a30", 0.55),
          mesaMid("#182024", 0.8),
          cloudBank("heavy", "#8a949c", 26),
          rainStreaks(false),
          canyonFloor("#12161a", 0.94),
          sageRow()
        ]),
        "rain",
        "rain"
      );
    }
    if (k === "snow") {
      return artWrap(
        compose([
          skyGradient("#3a424c", "#6a7480", "#4a545c"),
          snowDrifts(),
          cloudBank("heavy", "#c8cdd4", 22),
          snowFlakes(),
          sageBrush(10, 0.85, "#2a3038", 0.45),
          sageBrush(142, 0.7, "#2a3038", 0.4)
        ]),
        "snow",
        "snow"
      );
    }
    if (k === "fog") {
      return artWrap(
        compose([
          skyGradient("#3a4048", "#5a626c", "#3e444c"),
          mesaFar("#4a525a", 0.18),
          fogBands(0.28),
          canyonFloor("#2a3038", 0.45),
          fogBands(0.18),
          sageBrush(12, 0.7, "#1a1e24", 0.28)
        ]),
        "fog",
        "fog"
      );
    }
    if (k === "cloudy") {
      return artWrap(
        compose([
          skyGradient("#3a4e5c", "#6a808c", "#4a5a64"),
          mesaFar("#5a4a40", 0.55),
          mesaMid("#3a2e28", 0.82),
          cloudBank("overcast", "#d0c8bc", 18),
          canyonFloor("#1a1614", 0.94),
          sageRow()
        ]),
        "cloudy",
        "cloudy"
      );
    }
    if (k === "clear-night") {
      return artWrap(
        compose([
          skyGradient("#100e14", "#1a1824", "#2a1e24"),
          starsField(),
          mesaFar("#3a2e28", 0.7),
          mesaMid("#221c18", 0.88),
          moonDisc(122, 22, 8, "waxing-crescent"),
          canyonFloor("#0c0a0c", 0.96),
          sageRow()
        ]),
        "clear-night",
        "night"
      );
    }
    if (k === "wind") {
      return artWrap(
        compose([
          skyGradient("#2a3640", "#3d4e58", "#2a3438"),
          mesaFar("#243038", 0.5),
          mesaMid("#1a2228", 0.78),
          cloudBank("light", "#a8b4bc", 30),
          canyonFloor("#12161a", 0.94),
          sageRow()
        ]),
        "wind",
        "wind"
      );
    }
    if (k === "clear") {
      return artWrap(
        compose([
          skyGradient("#3a5a72", "#7aa0b8", "#e0b090"),
          radialWash(118, 28, 50, "#f7e7c5", 0.32),
          mesaFar("#5a4a40", 0.38),
          mesaMid("#3a2e28", 0.68),
          sunDisc(118, 26, 9, "#f7f0e0", "#e8c888"),
          canyonFloor("#1a1614", 0.92),
          sageRow()
        ]),
        "clear",
        "clear-day"
      );
    }
    return artWrap(
      compose([
        skyGradient("#3d5468", "#7a98a8", "#c4a090"),
        radialWash(122, 22, 40, "#f0e0b8", 0.26),
        mesaFar("#4a3e38", 0.4),
        mesaMid("#2a221e", 0.72),
        sunDisc(124, 22, 7, "#f7f0e0", "#e8c888"),
        cloudBank("scattered", "#e0dcd0", 36),
        canyonFloor("#161210", 0.92),
        sageRow()
      ]),
      "partly",
      "partly"
    );
  }

  function moonArt(illum, phase, phaseValue) {
    var key = moonPhaseKey(phase, illum, phaseValue);
    var k = moonIlluminationFraction(illum);
    var layers = [skyGradient("#0c0a10", "#16141c", "#100e14")];
    /* Keep stars away from the lunar disk so they cannot be read as maria/blobs. */
    var stars = starsField();
    if (k <= 0.03) {
      /* Near-new: fewer, smaller stars, left of the moon only. */
      stars =
        '<circle cx="22" cy="14" r="0.7" fill="#f2ebe0" opacity="0.4"/>' +
        '<circle cx="38" cy="22" r="0.5" fill="#f2ebe0" opacity="0.35"/>' +
        '<circle cx="54" cy="12" r="0.55" fill="#f2ebe0" opacity="0.35"/>' +
        '<circle cx="28" cy="36" r="0.4" fill="#f2ebe0" opacity="0.3"/>';
    }
    layers.push(stars);
    layers.push(moonDisc(108, 46, 28, key, illum));
    return artWrap(compose(layers), "moon", "night");
  }

  function sunPathArt(kind) {
    var k = String(kind || "sunrise").toLowerCase();
    if (/day|noon|midday/.test(k)) {
      return artWrap(
        compose([
          skyBands([
            ["0%", "#4a7a98"],
            ["55%", "#7aa0b8"],
            ["78%", "#e0d3c0"],
            ["100%", "#1a1614"]
          ]),
          radialWash(100, 22, 42, "#f7f0e0", 0.35),
          sunDisc(100, 22, 11, "#f7f0e0", "#e8c888"),
          horizonGround(68, "#1a1614")
        ]),
        "day",
        "clear-day"
      );
    }
    if (/golden/.test(k)) {
      return artWrap(
        compose([
          skyBands([
            ["0%", "#3a2430"],
            ["35%", "#c17a5a"],
            ["62%", "#e0b090"],
            ["78%", "#e8c888"],
            ["100%", "#1a1614"]
          ]),
          radialWash(100, 58, 48, "#f0d090", 0.42),
          sunDisc(100, 60, 13, "#f7e8c8", "#e8a858"),
          horizonGround(66, "#141210")
        ]),
        "golden",
        "golden"
      );
    }
    if (/blue/.test(k)) {
      return artWrap(
        compose([
          skyBands([
            ["0%", "#101018"],
            ["40%", "#2a2848"],
            ["70%", "#4a5a78"],
            ["100%", "#1a1618"]
          ]),
          starsField(),
          horizonGround(70, "#100e12")
        ]),
        "blue-hour",
        "blue"
      );
    }
    if (/sunset/.test(k)) {
      return artWrap(
        compose([
          skyBands([
            ["0%", "#2a1c28"],
            ["32%", "#a85d52"],
            ["58%", "#d08070"],
            ["78%", "#e8c888"],
            ["100%", "#141210"]
          ]),
          radialWash(124, 56, 44, "#e8b878", 0.4),
          sunDisc(126, 62, 11, "#f7e0c0", "#d48858"),
          horizonGround(68, "#120e0c")
        ]),
        "sunset",
        "golden"
      );
    }
    if (/night/.test(k)) {
      return artWrap(
        compose([
          skyBands([
            ["0%", "#0c0a10"],
            ["48%", "#1a1824"],
            ["72%", "#3a2a30"],
            ["84%", "#c4886a"],
            ["100%", "#141210"]
          ]),
          starsField(),
          horizonGround(74, "#0c0a0c")
        ]),
        "night",
        "night"
      );
    }
    return artWrap(
      compose([
        skyBands([
          ["0%", "#1e2a38"],
          ["40%", "#5a7a98"],
          ["70%", "#e0b090"],
          ["100%", "#1a1614"]
        ]),
        radialWash(42, 58, 42, "#f0d090", 0.35),
        sunDisc(40, 62, 11, "#f7e8c8", "#e8a858"),
        horizonGround(68, "#141210")
      ]),
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
      good: ["#2a3a34", "#4a6a58", "#7d9a6e"],
      moderate: ["#3a3428", "#6a5a38", "#c4a46a"],
      usg: ["#3a2a24", "#6a4030", "#c17a5a"],
      unhealthy: ["#2e1c1c", "#5a3030", "#a85d52"],
      unknown: ["#2a3038", "#3a4450", "#7a8a9a"]
    };
    var hazeOp = { good: 0.08, moderate: 0.2, usg: 0.34, unhealthy: 0.48, unknown: 0.14 };
    var c = skies[band] || skies.unknown;
    var far =
      band === "good"
        ? "#b8c8b0"
        : band === "moderate"
          ? "#d4c8a0"
          : band === "usg"
            ? "#d4a888"
            : "#c89890";
    var near =
      band === "good" ? "#1a221c" : band === "moderate" ? "#221c14" : band === "usg" ? "#241814" : "#1e1212";
    return artWrap(
      compose([
        skyGradient(c[0], c[1], c[2]),
        depthPlanes(hazeOp[band] || 0.14, far, near)
      ]),
      "aqi-" + band,
      "aqi-" + band
    );
  }

  function alertArt(active) {
    if (active) {
      return artWrap(
        compose([
          skyGradient("#1a1214", "#3a2428", "#1e1618"),
          cloudBank("heavy", "#4a3840", 22),
          lightningBolt(),
          horizonGround(78, "#0c0a0c")
        ]),
        "alert-active",
        "alert"
      );
    }
    return artWrap(
      compose([
        skyGradient("#1e2428", "#2e3840", "#222830"),
        cloudBank("light", "#6a7480", 36),
        horizonGround(80, "#14181a")
      ]),
      "alert",
      "quiet"
    );
  }

  function uvArt(index) {
    var n = Math.max(0, Math.min(11, Number(index) || 0));
    var rings = "";
    var count = n < 3 ? 1 : n < 6 ? 2 : n < 8 ? 3 : 4;
    for (var i = 0; i < count; i++) {
      rings +=
        '<circle cx="108" cy="30" r="' +
        (14 + i * 8) +
        '" stroke="#e8c888" stroke-width="1.1" fill="none" opacity="' +
        (0.35 - i * 0.06) +
        '"/>';
    }
    return artWrap(
      compose([
        skyGradient("#3a4a58", "#6aa8c2", n >= 6 ? "#e8c888" : "#a8c4d4"),
        radialWash(108, 30, 48, "#f0e0b0", n >= 6 ? 0.42 : 0.24),
        sunDisc(108, 30, 8 + Math.min(4, n * 0.4), "#f7f0e0", "#e8c888"),
        rings,
        horizonGround(72, "#161c22")
      ]),
      "uv",
      n >= 6 ? "golden" : "clear-day"
    );
  }

  function hoursArt() {
    return artWrap(
      compose([
        skyBands([
          ["0%", "#243040"],
          ["50%", "#3a4e5c"],
          ["100%", "#2a3640"]
        ]),
        '<g class="wdb-r-hours-ticks" stroke="#e0d3c0" stroke-width="1.2" opacity="0.35">' +
          '<path d="M70 22 v10M90 18 v14M110 26 v8M130 20 v12"/>' +
          "</g>",
        horizonGround(74, "#12181e")
      ]),
      "hours",
      "quiet"
    );
  }

  function doorwayArt() {
    return artWrap(
      compose([
        skyGradient("#2a3438", "#3d4a50", "#2a3236"),
        '<rect x="96" y="38" width="26" height="44" rx="1.5" fill="#0e0c0c" opacity="0.78"/>' +
          '<path d="M109 38 V82" stroke="#e0b090" stroke-width="0.9" opacity="0.35"/>' +
          '<rect x="100" y="48" width="7" height="10" fill="#e8c888" opacity="0.12"/>',
        horizonGround(82, "#12161a")
      ]),
      "doorway",
      "quiet"
    );
  }

  function comfortArt() {
    return artWrap(
      compose([
        skyBands([
          ["0%", "#2a3430"],
          ["45%", "#4a5a48"],
          ["100%", "#3a4840"]
        ]),
        radialWash(100, 48, 50, "#7d9a6e", 0.18),
        horizonGround(76, "#141a16")
      ]),
      "comfort",
      "quiet"
    );
  }

  function rangeArt() {
    return artWrap(
      compose([
        '<rect class="wdb-r-range-high" width="160" height="50" fill="#c17a5a" opacity="0.35"/>' +
          '<rect class="wdb-r-range-low" y="50" width="160" height="50" fill="#2a3448" opacity="0.55"/>' +
          '<path d="M0 50 H160" stroke="#e0d3c0" stroke-width="1.1" opacity="0.4"/>',
        horizonGround(78, "#14181c")
      ]),
      "range",
      "quiet"
    );
  }

  function precipArt(graphic) {
    var g = graphic || {};
    /* Artwork follows NOW state — never paint active rain from a future peak alone. */
    var nowProb =
      g.nowProbability != null
        ? Number(g.nowProbability)
        : g.probability != null
          ? Number(g.probability)
          : g.value != null
            ? Number(g.value)
            : 0;
    if (!isFinite(nowProb)) nowProb = 0;
    var amount = g.amount != null ? Number(g.amount) : 0;
    if (!isFinite(amount)) amount = 0;
    var intensity = String(g.intensity || "").toLowerCase();
    var ptype = String(g.precipType || g.type || "").toLowerCase();
    var rainingNow =
      amount >= 0.01 ||
      intensity === "heavy" ||
      intensity === "moderate" ||
      /rain|drizzle|shower|storm/.test(String(g.conditions || "").toLowerCase());

    if (/snow|sleet|blizzard/.test(ptype) && (rainingNow || nowProb >= 40)) {
      return artWrap(
        compose([
          skyGradient("#3a424c", "#6a7480", "#4a545c"),
          snowDrifts(),
          snowFlakes()
        ]),
        "precip-snow",
        "snow"
      );
    }

    /*
     * Conservative visual bands (NOW probability / intensity):
     * 0–10  dry — NO rain streaks
     * 11–30 possibility cues only — NO active rainfall streaks unless raining now
     * 31–60 light curtain
     * 61–80 denser curtain
     * 81–100 strong curtain
     */
    if (!rainingNow && nowProb <= 10) {
      return artWrap(
        compose([
          skyGradient("#1e2830", "#3a4a54", "#1a2228"),
          cloudBank("light", "#8a98a0", 28),
          horizonGround(86, "#12161a")
        ]),
        "precip-dry",
        "quiet"
      );
    }

    if (!rainingNow && nowProb <= 30) {
      return artWrap(
        compose([
          skyGradient("#1e2830", "#354652", "#1a2228"),
          cloudBank("scattered", "#8a98a0", 22),
          horizonGround(86, "#12161a")
        ]),
        "precip-possible",
        "quiet"
      );
    }

    var bandProb = rainingNow ? Math.max(nowProb, 55) : nowProb;
    return artWrap(
      compose([
        skyGradient("#1e2830", bandProb >= 60 ? "#2a3a44" : "#354652", "#1a2228"),
        cloudBank(bandProb >= 60 ? "heavy" : "scattered", "#8a98a0", bandProb >= 60 ? 14 : 18),
        rainCurtain(bandProb, intensity || (bandProb >= 70 ? "heavy" : "light")),
        horizonGround(86, "#12161a")
      ]),
      "precip",
      "rain"
    );
  }

  function windArt(graphic) {
    var g = graphic || {};
    var speed = g.speed != null ? g.speed : g.value;
    var dir = g.direction != null ? g.direction : g.deg;
    return artWrap(
      compose([
        skyGradient("#2a3438", "#3d4e52", "#2a3638"),
        radialWash(90, 40, 50, "#6aa8a0", 0.1),
        windFlow(speed, dir),
        horizonGround(88, "#141816")
      ]),
      "wind",
      "wind"
    );
  }

  function miniSky(state) {
    var k = normalizeSkyState(state);
    if (k === "rain" || k === "heavy-rain") {
      return mini(
        '<path d="M3 5 Q8 2 14 5 Q18 3 21 6" stroke="currentColor" stroke-width="1.1" fill="none"/>' +
          '<path d="M8 9v5M12 9v5M16 9v4" stroke="currentColor" stroke-width="1"/>'
      );
    }
    if (k === "storm") {
      return mini(
        '<path d="M3 6 Q10 2 18 6" stroke="currentColor" stroke-width="1.1" fill="none"/>' +
          '<path d="M12 7l-2 4h3l-2 4" stroke="currentColor" stroke-width="1"/>'
      );
    }
    if (k === "cloudy" || k === "fog") {
      return mini(
        '<path d="M4 10 Q8 5 13 8 Q16 4 21 8 Q22 12 16 12 H6 Q3 12 4 10Z" stroke="currentColor" stroke-width="1" fill="none"/>'
      );
    }
    if (k === "clear-night") {
      return mini('<circle cx="14" cy="7" r="4" stroke="currentColor" stroke-width="1.1" fill="none"/>');
    }
    if (k === "clear") {
      return mini('<circle cx="12" cy="8" r="4" stroke="currentColor" stroke-width="1.1" fill="none"/>');
    }
    return mini(
      '<circle cx="17" cy="5" r="2.8" stroke="currentColor" stroke-width="1" fill="none"/>' +
        '<path d="M3 11 Q7 6 12 9 Q15 5 20 9 Q21 13 14 13 H5 Q2 13 3 11Z" stroke="currentColor" stroke-width="1" fill="none"/>'
    );
  }

  function render(graphic) {
    if (!graphic || !graphic.kind) return "";
    var kind = graphic.kind;
    try {
      if (kind === "sky") return skyArt(graphic.state);
      if (kind === "aqi") return aqiArt(graphic.value);
      if (kind === "moon") return moonArt(graphic.value, graphic.phase, graphic.phaseValue);
      if (
        kind === "sun" ||
        kind === "sunrise" ||
        kind === "sunset" ||
        kind === "golden" ||
        kind === "blue-hour" ||
        kind === "day"
      ) {
        return sunPathArt(graphic.state || kind);
      }
      if (kind === "alert") return alertArt(!!graphic.active);
      if (kind === "uv") return uvArt(graphic.value);
      if (kind === "wind") return windArt(graphic);
      if (kind === "precip") return precipArt(graphic);
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
    version: "5.1.0-moon-rain-visual-gate",
    render: render,
    normalizeSkyState: normalizeSkyState,
    moonPhaseKey: moonPhaseKey,
    moonIlluminationFraction: moonIlluminationFraction,
    moonLitPath: moonLitPath,
    moonDisc: moonDisc,
    illumFromGraphic: illumFromGraphic,
    miniSky: miniSky
  };
})(typeof window !== "undefined" ? window : global);
