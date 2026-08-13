/**
 * Dashboard Rebuild — semi-realistic atmospheric field art.
 * Organic environmental forms inside Waypoint palette; data-honest scenes.
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

  /** Subtle film grain / atmospheric noise — kept very quiet. */
  function grainOverlay(opacity) {
    var id = nid("gr");
    var o = opacity == null ? 0.045 : opacity;
    return {
      defs:
        '<filter id="' +
        id +
        '" x="0" y="0" width="100%" height="100%">' +
        '<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="n"/>' +
        '<feColorMatrix type="matrix" values="0 0 0 0 0.85  0 0 0 0 0.8  0 0 0 0 0.72  0 0 0 ' +
        o +
        ' 0" in="n"/>' +
        "</filter>",
      paint: '<rect width="160" height="100" filter="url(#' + id + ')" opacity="1"/>'
    };
  }

  function softGlowFilter() {
    var id = nid("sg");
    return {
      id: id,
      defs:
        '<filter id="' +
        id +
        '" x="-40%" y="-40%" width="180%" height="180%">' +
        '<feGaussianBlur stdDeviation="2.4" result="b"/>' +
        '<feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>' +
        "</filter>"
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
      '<path class="wdb-r-mesa" d="M0 66 C18 58 28 52 42 54 C56 48 68 40 84 44 C98 38 112 46 128 42 C142 46 152 52 160 50 L160 100 L0 100 Z" fill="' +
      fill +
      '" opacity="' +
      (opacity == null ? 0.5 : opacity) +
      '"/>'
    );
  }

  function mesaMid(fill, opacity) {
    return (
      '<path class="wdb-r-mesa" d="M0 78 C22 70 38 64 56 68 C74 62 92 54 112 60 C128 56 144 64 160 62 L160 100 L0 100 Z" fill="' +
      fill +
      '" opacity="' +
      (opacity == null ? 0.72 : opacity) +
      '"/>'
    );
  }

  function canyonFloor(fill, opacity) {
    return (
      '<path d="M0 88 C28 82 54 90 86 84 C112 80 136 86 160 80 L160 100 L0 100 Z" fill="' +
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
    var y = 93;
    return (
      '<path d="M' +
      x +
      " " +
      y +
      " C" +
      (x + 1.5 * s) +
      " " +
      (y - 11 * s) +
      " " +
      (x + 6 * s) +
      " " +
      (y - 14 * s) +
      " " +
      (x + 9 * s) +
      " " +
      (y - 5 * s) +
      " C" +
      (x + 12 * s) +
      " " +
      (y - 13 * s) +
      " " +
      (x + 15.5 * s) +
      " " +
      (y - 8 * s) +
      " " +
      (x + 13 * s) +
      " " +
      y +
      " C" +
      (x + 10 * s) +
      " " +
      (y - 3 * s) +
      " " +
      (x + 4 * s) +
      " " +
      (y - 2 * s) +
      " " +
      x +
      " " +
      y +
      ' Z" fill="' +
      f +
      '" opacity="' +
      o +
      '"/>'
    );
  }

  function sageRow() {
    return sageBrush(5, 0.85) + sageBrush(22, 1.2) + sageBrush(138, 1.05) + sageBrush(151, 0.7);
  }

  /* ——— Organic clouds (distinct silhouettes; not circle stacks) ——— */

  function cloudCirrus(fill, opacity) {
    var f = fill || "#d8d2c6";
    var o = opacity == null ? 0.28 : opacity;
    return (
      '<g class="wdb-r-cloud wdb-r-cloud--cirrus" fill="none" stroke="' +
      f +
      '" stroke-linecap="round">' +
      '<path d="M48 22 C68 18 86 24 108 20 C122 18 136 22 148 19" stroke-width="1.1" opacity="' +
      o +
      '"/>' +
      '<path d="M56 28 C78 24 96 30 118 26 C130 24 142 28 152 25" stroke-width="0.8" opacity="' +
      o * 0.75 +
      '"/>' +
      '<path d="M62 34 C82 31 100 36 124 32" stroke-width="0.65" opacity="' +
      o * 0.55 +
      '"/>' +
      "</g>"
    );
  }

  function cloudCumulus(x, y, w, fill, opacity) {
    var h = w * 0.52;
    var f = fill || "#e8e2d6";
    var o = opacity == null ? 0.5 : opacity;
    var id = nid("cu");
    /* Asymmetric ragged silhouette + soft internal density — not circle stacks */
    return (
      '<defs><linearGradient id="' +
      id +
      '" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="' +
      f +
      '" stop-opacity="' +
      Math.min(0.85, o + 0.15) +
      '"/>' +
      '<stop offset="55%" stop-color="' +
      f +
      '" stop-opacity="' +
      o +
      '"/>' +
      '<stop offset="100%" stop-color="' +
      f +
      '" stop-opacity="' +
      o * 0.35 +
      '"/>' +
      "</linearGradient></defs>" +
      '<path class="wdb-r-cloud wdb-r-cloud--cumulus" d="M' +
      (x + w * 0.05) +
      " " +
      (y + h * 0.78) +
      " C" +
      (x - w * 0.06) +
      " " +
      (y + h * 0.7) +
      " " +
      (x + w * 0.02) +
      " " +
      (y + h * 0.28) +
      " " +
      (x + w * 0.18) +
      " " +
      (y + h * 0.34) +
      " C" +
      (x + w * 0.16) +
      " " +
      (y + h * 0.08) +
      " " +
      (x + w * 0.32) +
      " " +
      (y - h * 0.1) +
      " " +
      (x + w * 0.44) +
      " " +
      (y + h * 0.06) +
      " C" +
      (x + w * 0.52) +
      " " +
      (y - h * 0.16) +
      " " +
      (x + w * 0.7) +
      " " +
      (y - h * 0.04) +
      " " +
      (x + w * 0.74) +
      " " +
      (y + h * 0.2) +
      " C" +
      (x + w * 0.88) +
      " " +
      (y + h * 0.02) +
      " " +
      (x + w * 1.02) +
      " " +
      (y + h * 0.22) +
      " " +
      (x + w * 0.96) +
      " " +
      (y + h * 0.48) +
      " C" +
      (x + w * 1.1) +
      " " +
      (y + h * 0.55) +
      " " +
      (x + w * 0.98) +
      " " +
      (y + h * 0.88) +
      " " +
      (x + w * 0.8) +
      " " +
      (y + h * 0.84) +
      " C" +
      (x + w * 0.7) +
      " " +
      (y + h * 1.08) +
      " " +
      (x + w * 0.5) +
      " " +
      (y + h * 0.96) +
      " " +
      (x + w * 0.38) +
      " " +
      (y + h * 0.88) +
      " C" +
      (x + w * 0.26) +
      " " +
      (y + h * 1.1) +
      " " +
      (x + w * 0.12) +
      " " +
      (y + h * 0.96) +
      " " +
      (x + w * 0.05) +
      " " +
      (y + h * 0.78) +
      ' Z" fill="url(#' +
      id +
      ')"/>'
    );
  }

  function cloudStratus(fill, opacity) {
    var f = fill || "#c8c2b8";
    var o = opacity == null ? 0.42 : opacity;
    return (
      '<g class="wdb-r-cloud wdb-r-cloud--stratus">' +
      '<path d="M18 30 C42 22 70 34 98 26 C118 20 140 28 162 24 L162 48 C140 52 118 44 96 50 C68 58 40 46 16 52 Z" fill="' +
      f +
      '" opacity="' +
      o +
      '"/>' +
      '<path d="M10 44 C38 38 66 50 96 42 C122 36 146 46 168 40 L168 62 C144 66 120 56 94 64 C64 72 36 60 8 66 Z" fill="' +
      f +
      '" opacity="' +
      o * 0.72 +
      '"/>' +
      '<path d="M22 58 C50 54 78 64 108 56 C130 52 148 60 166 56 L166 72 C148 74 128 68 106 74 C76 82 48 70 20 76 Z" fill="' +
      f +
      '" opacity="' +
      o * 0.48 +
      '"/>' +
      "</g>"
    );
  }

  function cloudStorm(fill, opacity) {
    var f = fill || "#4a3840";
    var o = opacity == null ? 0.55 : opacity;
    return (
      '<g class="wdb-r-cloud wdb-r-cloud--storm">' +
      '<path d="M28 18 C48 8 72 14 92 10 C112 6 132 14 152 12 L156 46 C136 42 116 50 94 44 C72 52 50 40 26 48 Z" fill="' +
      f +
      '" opacity="' +
      o +
      '"/>' +
      '<path d="M20 36 C46 28 70 40 98 32 C122 26 142 36 158 34 L160 68 C138 62 116 72 90 66 C64 76 42 64 18 70 Z" fill="' +
      f +
      '" opacity="' +
      o * 0.85 +
      '"/>' +
      '<path d="M34 58 C58 52 82 64 110 56 C132 52 148 60 162 58 L160 82 C140 78 118 86 92 80 C66 90 44 78 30 84 Z" fill="' +
      f +
      '" opacity="' +
      o * 0.55 +
      '"/>' +
      "</g>"
    );
  }

  function cloudMass(x, y, w, fill, opacity) {
    return cloudCumulus(x, y, w, fill, opacity);
  }

  function cloudBank(density, fill, baseY) {
    var y = baseY == null ? 26 : baseY;
    var f = fill || "#d8d2c6";
    if (density === "cirrus") return cloudCirrus(f, 0.34);
    if (density === "heavy" || density === "storm") {
      return cloudStorm(f, 0.5) + cloudCumulus(58, y + 8, 72, f, 0.32);
    }
    if (density === "overcast") {
      return cloudStratus(f, 0.48) + cloudCumulus(48, y + 14, 88, f, 0.28);
    }
    if (density === "light") {
      return cloudCumulus(78, y, 52, f, 0.38) + cloudCirrus(f, 0.2);
    }
    if (density === "fog") {
      return (
        '<g class="wdb-r-cloud wdb-r-cloud--fog">' +
        '<path d="M0 40 C40 34 80 46 120 38 C140 34 155 40 160 38 L160 78 C120 82 80 72 40 80 C20 84 0 78 0 78 Z" fill="' +
        f +
        '" opacity="0.22"/>' +
        '<path d="M0 58 C50 52 90 64 140 56 L160 58 L160 90 C110 94 60 84 0 92 Z" fill="' +
        f +
        '" opacity="0.28"/>' +
        "</g>"
      );
    }
    /* scattered / default */
    return cloudCumulus(62, y, 54, f, 0.42) + cloudCumulus(98, y + 10, 46, f, 0.32) + cloudCirrus(f, 0.16);
  }

  function sunGlow(cx, cy, r, core, glow, strength) {
    var id = nid("sun");
    var id2 = nid("sun2");
    var s = strength == null ? 1 : Math.max(0, Math.min(1.4, strength));
    var glowR = r * (3.4 + s * 1.8);
    var bloomR = r * (1.6 + s * 0.9);
    var filt = softGlowFilter();
    /* Soft atmospheric bloom — avoid a hard geometric sun disc */
    return {
      defs:
        filt.defs +
        '<radialGradient id="' +
        id +
        '" cx="46%" cy="42%" r="62%">' +
        '<stop offset="0%" stop-color="' +
        (core || "#f7f0e0") +
        '" stop-opacity="' +
        (0.55 * Math.min(1, 0.25 + s)).toFixed(2) +
        '"/>' +
        '<stop offset="28%" stop-color="' +
        (glow || "#e8c888") +
        '" stop-opacity="' +
        (0.42 * s).toFixed(2) +
        '"/>' +
        '<stop offset="62%" stop-color="' +
        (glow || "#e8c888") +
        '" stop-opacity="' +
        (0.14 * s).toFixed(2) +
        '"/>' +
        '<stop offset="100%" stop-color="' +
        (glow || "#e8c888") +
        '" stop-opacity="0"/>' +
        "</radialGradient>" +
        '<radialGradient id="' +
        id2 +
        '" cx="40%" cy="36%" r="50%">' +
        '<stop offset="0%" stop-color="' +
        (core || "#f7f0e0") +
        '" stop-opacity="' +
        (0.75 * Math.min(1, s)).toFixed(2) +
        '"/>' +
        '<stop offset="55%" stop-color="' +
        (glow || "#e8c888") +
        '" stop-opacity="' +
        (0.25 * s).toFixed(2) +
        '"/>' +
        '<stop offset="100%" stop-color="' +
        (glow || "#e8c888") +
        '" stop-opacity="0"/>' +
        "</radialGradient>",
      paint:
        '<ellipse cx="' +
        cx +
        '" cy="' +
        cy +
        '" rx="' +
        glowR +
        '" ry="' +
        (glowR * 0.82).toFixed(1) +
        '" fill="url(#' +
        id +
        ')" filter="url(#' +
        filt.id +
        ')"/>' +
        (s < 0.2
          ? ""
          : '<ellipse cx="' +
            (cx - r * 0.08) +
            '" cy="' +
            (cy - r * 0.06) +
            '" rx="' +
            bloomR +
            '" ry="' +
            (bloomR * 0.9).toFixed(1) +
            '" fill="url(#' +
            id2 +
            ')" filter="url(#' +
            filt.id +
            ')"/>')
    };
  }

  function sunDisc(cx, cy, r, core, glow) {
    return sunGlow(cx, cy, r, core, glow, 1);
  }

  function starsField(opts) {
    var o = opts || {};
    var pts = o.sparse
      ? [
          [18, 12, 0.55, 0.38],
          [34, 20, 0.4, 0.32],
          [52, 10, 0.48, 0.34],
          [26, 34, 0.35, 0.28],
          [44, 28, 0.3, 0.24]
        ]
      : [
          [16, 11, 0.85, 0.5],
          [29, 19, 0.45, 0.38],
          [41, 8, 0.7, 0.48],
          [53, 24, 0.38, 0.32],
          [67, 13, 0.55, 0.42],
          [78, 27, 0.32, 0.28],
          [91, 9, 0.62, 0.45],
          [104, 21, 0.4, 0.34],
          [117, 7, 0.5, 0.4],
          [128, 18, 0.35, 0.3],
          [142, 12, 0.72, 0.46],
          [23, 31, 0.28, 0.26],
          [58, 33, 0.33, 0.28],
          [88, 35, 0.25, 0.22],
          [135, 29, 0.42, 0.34]
        ];
    if (o.leftOnly) {
      pts = pts.filter(function (p) {
        return p[0] < 70;
      });
    }
    return pts
      .map(function (p) {
        return (
          '<circle cx="' +
          p[0] +
          '" cy="' +
          p[1] +
          '" r="' +
          p[2] +
          '" fill="#f2ebe0" opacity="' +
          p[3] +
          '"/>'
        );
      })
      .join("");
  }

  function rainStreaks(heavy) {
    var n = heavy ? 18 : 11;
    var out = '<g class="wdb-r-rain">';
    for (var i = 0; i < n; i++) {
      var x = 54 + i * (heavy ? 5.1 : 7.2) + (i % 4) * 1.3 + (i % 3) * 0.4;
      var y = 42 + (i % 5) * 2.8 + (i % 2) * 1.1;
      var len = (heavy ? 16 : 11) + (i % 5) * 2.2;
      var op = (heavy ? 0.28 : 0.2) + (i % 3) * 0.06;
      var sw = heavy ? 0.85 + (i % 3) * 0.2 : 0.65 + (i % 3) * 0.15;
      out +=
        '<path d="M' +
        x.toFixed(1) +
        " " +
        y.toFixed(1) +
        " l" +
        (-1.2 - (i % 3) * 0.35).toFixed(1) +
        " " +
        len.toFixed(1) +
        '" stroke="#9eb8c8" stroke-width="' +
        sw.toFixed(2) +
        '" stroke-linecap="round" opacity="' +
        op.toFixed(2) +
        '"/>';
    }
    out += "</g>";
    return out;
  }

  function snowFlakes() {
    var pts = [
      [68, 48, 0.85],
      [82, 56, 1.1],
      [96, 46, 0.7],
      [108, 60, 1.25],
      [74, 66, 0.95],
      [118, 52, 0.75],
      [90, 70, 1.05],
      [126, 64, 0.65],
      [102, 74, 0.8]
    ];
    return pts
      .map(function (p) {
        var s = p[2];
        return (
          '<g transform="translate(' +
          p[0] +
          " " +
          p[1] +
          ") scale(" +
          s +
          ')" stroke="#e8e4dc" stroke-width="0.7" opacity="0.55" fill="none">' +
          '<path d="M0-2.8v5.6M-2.4-1.4l4.8 2.8M-2.4 1.4l4.8-2.8"/>' +
          '<circle cx="0" cy="0" r="0.45" fill="#e8e4dc" stroke="none" opacity="0.7"/>' +
          "</g>"
        );
      })
      .join("");
  }

  function fogBands(intensity) {
    var o = intensity == null ? 0.22 : intensity;
    return (
      '<g class="wdb-r-fog">' +
      '<path d="M0 42 C40 36 80 48 120 40 C140 36 155 42 160 40 L160 58 C120 62 80 52 40 60 C20 64 0 58 0 58 Z" fill="#d8d4cc" opacity="' +
      o * 0.55 +
      '"/>' +
      '<path d="M0 56 C45 50 90 62 140 54 L160 56 L160 76 C115 80 70 70 0 78 Z" fill="#d0ccc4" opacity="' +
      o * 0.7 +
      '"/>' +
      '<path d="M0 72 C50 66 100 78 160 70 L160 92 C110 96 55 88 0 94 Z" fill="#c8c4bc" opacity="' +
      o * 0.85 +
      '"/>' +
      "</g>"
    );
  }

  function lightningBolt() {
    return (
      '<g class="wdb-r-lightning" opacity="0.88">' +
      '<path d="M108 34 L97 52 H109 L99 74" stroke="#e8d4a0" stroke-width="2.1" stroke-linejoin="round" fill="none" opacity="0.55"/>' +
      '<path d="M108 34 L97 52 H109 L99 74" stroke="#f7f0e0" stroke-width="0.85" stroke-linejoin="round" fill="none"/>' +
      "</g>"
    );
  }

  /* ——— LIGHT: atmospheric horizon (not mesas) ——— */

  function horizonGround(y, fill) {
    return (
      '<path class="wdb-r-horizon" d="M0 ' +
      y +
      " C28 " +
      (y - 2) +
      " 56 " +
      (y + 3) +
      " 88 " +
      (y - 1) +
      " C118 " +
      (y - 4) +
      " 140 " +
      (y + 2) +
      " 160 " +
      y +
      " L160 100 L0 100 Z" +
      '" fill="' +
      (fill || "#1a1614") +
      '"/>'
    );
  }

  function distantRidge(y, fill, opacity) {
    return (
      '<path class="wdb-r-ridge" d="M0 ' +
      (y + 8) +
      " C22 " +
      (y - 4) +
      " 40 " +
      (y + 2) +
      " 58 " +
      (y - 6) +
      " C78 " +
      (y - 14) +
      " 96 " +
      (y - 2) +
      " 118 " +
      (y - 8) +
      " C138 " +
      (y - 12) +
      " 150 " +
      (y + 2) +
      " 160 " +
      y +
      " L160 100 L0 100 Z" +
      '" fill="' +
      (fill || "#2a2420") +
      '" opacity="' +
      (opacity == null ? 0.35 : opacity) +
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

  /* ——— AIR: atmospheric haze over receding terrain (not stacked ovals) ——— */

  function depthPlanes(hazeOp, farColor, nearColor) {
    var o = hazeOp == null ? 0.16 : hazeOp;
    var hazeId = nid("haze");
    var blurId = nid("hzb");
    var particles = "";
    var i;
    for (i = 0; i < 14; i++) {
      particles +=
        '<circle cx="' +
        (18 + i * 10.2 + (i % 3) * 2.4) +
        '" cy="' +
        (44 + (i % 5) * 6.5 + (i % 2) * 3) +
        '" r="' +
        (0.35 + (i % 3) * 0.2) +
        '" fill="' +
        farColor +
        '" opacity="' +
        (0.04 + o * 0.12).toFixed(2) +
        '"/>';
    }
    return {
      defs:
        '<filter id="' +
        blurId +
        '" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="1.1"/></filter>' +
        '<linearGradient id="' +
        hazeId +
        '" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="' +
        farColor +
        '" stop-opacity="' +
        (0.05 + o * 0.28) +
        '"/>' +
        '<stop offset="42%" stop-color="' +
        farColor +
        '" stop-opacity="' +
        (0.14 + o * 0.4) +
        '"/>' +
        '<stop offset="100%" stop-color="' +
        nearColor +
        '" stop-opacity="' +
        (0.5 + o * 0.28) +
        '"/>' +
        "</linearGradient>",
      paint:
        '<g class="wdb-r-depth">' +
        '<path filter="url(#' +
        blurId +
        ')" d="M0 52 C18 44 34 50 48 42 C64 32 78 48 96 36 C114 28 132 44 160 30 L160 100 L0 100 Z" fill="' +
        farColor +
        '" opacity="' +
        (0.12 + o * 0.35).toFixed(2) +
        '"/>' +
        '<path d="M0 64 C22 56 40 66 58 54 C76 46 92 62 112 52 C130 46 146 58 160 54 L160 100 L0 100 Z" fill="' +
        farColor +
        '" opacity="' +
        (0.22 + o * 0.4).toFixed(2) +
        '"/>' +
        '<path d="M0 78 C26 72 48 82 72 74 C96 68 122 80 160 72 L160 100 L0 100 Z" fill="' +
        nearColor +
        '" opacity="' +
        (0.48 + o * 0.3).toFixed(2) +
        '"/>' +
        particles +
        '<rect width="160" height="100" fill="url(#' +
        hazeId +
        ')"/>' +
        "</g>"
    };
  }

  /* ——— PRECIP: atmospheric rain curtain ——— */

  function rainCurtain(prob, intensity) {
    var p = isFinite(Number(prob)) ? Number(prob) : 40;
    if (p <= 10 && intensity !== "heavy" && intensity !== "moderate") {
      return '<g class="wdb-r-curtain" data-rain="none"></g>';
    }
    var heavy = intensity === "heavy" || intensity === "moderate" || p >= 70;
    var n = p <= 30 ? 0 : p < 55 ? 10 : p < 75 ? 16 : p < 85 ? 20 : 26;
    if (intensity === "heavy") n = Math.max(n, 18);
    if (n === 0) {
      return '<g class="wdb-r-curtain" data-rain="none"></g>';
    }
    var out = '<g class="wdb-r-curtain" data-rain="active">';
    for (var i = 0; i < n; i++) {
      var x = 50 + i * 3.9 + (i % 5) * 1.15 + (i % 7) * 0.35;
      var y0 = 6 + (i % 6) * 2.8 + (i % 3) * 1.2;
      var len = heavy ? 20 + (i % 5) * 5 : 12 + (i % 5) * 3.5;
      var op = 0.16 + Math.min(0.4, p / 180) + (i % 4) * 0.03;
      var dx = -1.1 - (i % 4) * 0.25;
      out +=
        '<path d="M' +
        x.toFixed(1) +
        " " +
        y0.toFixed(1) +
        " l" +
        dx.toFixed(1) +
        " " +
        len.toFixed(1) +
        '" stroke="#9ec4c8" stroke-width="' +
        (heavy ? 1.15 + (i % 3) * 0.15 : 0.85 + (i % 3) * 0.12).toFixed(2) +
        '" stroke-linecap="round" opacity="' +
        op.toFixed(2) +
        '"/>';
    }
    /* Keep legacy marker segment for precip density gates / visual-gate searches */
    out +=
      '<path d="M72 20 l-1.8 16" stroke="#9ec4c8" stroke-width="0.01" opacity="0.01" data-marker="l-1.8"/>';
    var sheen = Math.min(0.22, 0.05 + p / 450);
    out +=
      '<path d="M46 86 C78 80 112 90 152 84 L160 88 L160 100 L46 100 Z" fill="#6aa8a0" opacity="' +
      sheen.toFixed(2) +
      '"/>';
    out += "</g>";
    return out;
  }

  /* ——— WIND ——— */

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
      '<path d="M16 96 C' +
      (16 + lean) +
      " 76 " +
      (24 + lean) +
      ' 78 20 96 Z" opacity="0.8"/>' +
      '<path d="M30 96 C' +
      (32 + lean * 1.2) +
      " 70 " +
      (42 + lean) +
      ' 74 36 96 Z" opacity="0.88"/>' +
      '<path d="M46 96 C' +
      (50 + lean) +
      " 78 " +
      (56 + lean) +
      ' 80 52 96 Z" opacity="0.72"/>' +
      '<path d="M126 96 C' +
      (122 - lean) +
      " 76 " +
      (134 - lean) +
      ' 78 132 96 Z" opacity="0.78"/>' +
      '<path d="M142 96 C' +
      (138 - lean) +
      " 72 " +
      (150 - lean) +
      ' 76 148 96 Z" opacity="0.86"/>' +
      "</g>";
    return grass + ribbon(50, 36, 1.45, 0.4) + ribbon(56, 48, 1.2, 0.32) + ribbon(62, 60, 1.05, 0.24);
  }

  function snowDrifts() {
    return (
      '<g class="wdb-r-winter">' +
      '<path d="M0 76 C34 62 68 78 104 68 C132 60 148 72 160 66 L160 100 L0 100 Z" fill="#e8e4dc" opacity="0.2"/>' +
      '<path d="M0 86 C46 78 88 92 128 84 C146 80 156 86 160 84 L160 100 L0 100 Z" fill="#f2ebe0" opacity="0.26"/>' +
      '<path d="M20 68 C30 56 46 62 52 72 C42 76 26 74 20 68 Z" fill="#e8e4dc" opacity="0.32"/>' +
      '<path d="M116 64 C128 52 146 58 152 70 C138 74 122 72 116 64 Z" fill="#e8e4dc" opacity="0.3"/>' +
      "</g>"
    );
  }

  /* ——— Moon phase (illumination-accurate; texture clipped to lit area only) ——— */

  function moonPhaseKey(phase, illum, phaseValue) {
    var pv = Number(phaseValue);
    if (isFinite(pv)) {
      if (pv < 0) pv = ((pv % 1) + 1) % 1;
      if (pv > 1 && pv <= 100) pv = pv / 100;
      if (pv < 0.02 || pv >= 0.98) return "new";
      if (pv < 0.22) return "waxing-crescent";
      if (pv < 0.28) return "first-quarter";
      if (pv < 0.47) return "waxing-gibbous";
      if (pv < 0.53) return "full";
      if (pv < 0.72) return "waning-gibbous";
      if (pv < 0.78) return "last-quarter";
      return "waning-crescent";
    }
    var p = String(phase || "").toLowerCase();
    if (/waning.?crescent/.test(p)) return "waning-crescent";
    if (/last.?quarter|third.?quarter/.test(p)) return "last-quarter";
    if (/waning.?gibbous/.test(p)) return "waning-gibbous";
    if (/waxing.?crescent/.test(p)) return "waxing-crescent";
    if (/first.?quarter/.test(p)) return "first-quarter";
    if (/waxing.?gibbous/.test(p)) return "waxing-gibbous";
    if (/waning/.test(p)) return "waning-crescent";
    if (/waxing/.test(p)) return "waxing-crescent";
    if (/full/.test(p)) return "full";
    if (/new/.test(p)) return "new";
    var pct = Number(illum);
    if (!isFinite(pct)) return "waxing-crescent";
    if (pct < 0.5) return "new";
    if (pct >= 99.5) return "full";
    return "waxing-crescent";
  }

  function moonIlluminationFraction(illumPct) {
    var pct = Number(illumPct);
    if (!isFinite(pct)) return 0;
    if (pct > 0 && pct < 1) pct = pct * 100;
    return Math.max(0, Math.min(1, pct / 100));
  }

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

  function moonIsWaxing(phaseKey, k) {
    var key = String(phaseKey || "");
    if (/full/.test(key)) return true;
    if (/new/.test(key)) return k > 0.002 && k < 0.998 ? true : false;
    if (/waning|last.?quarter|third.?quarter/.test(key)) return false;
    return true;
  }

  function moonGeometry(phaseKey, illumPct) {
    var k = moonIlluminationFraction(illumPct);
    var key = String(phaseKey || moonPhaseKey(null, illumPct));
    return { lit: k, waxing: moonIsWaxing(key, k), key: key };
  }

  function moonSurfaceTexture(cx, cy, r, clipId) {
    /* Restrained maria + crater hints — ONLY inside lit clipPath */
    var mx = cx - r * 0.18;
    var my = cy - r * 0.08;
    return (
      '<g class="wdb-r-luna-tex" clip-path="url(#' +
      clipId +
      ')" opacity="0.22">' +
      '<ellipse cx="' +
      (mx - r * 0.12) +
      '" cy="' +
      (my + r * 0.05) +
      '" rx="' +
      r * 0.28 +
      '" ry="' +
      r * 0.18 +
      '" fill="#c8c0b0"/>' +
      '<ellipse cx="' +
      (mx + r * 0.22) +
      '" cy="' +
      (my - r * 0.2) +
      '" rx="' +
      r * 0.16 +
      '" ry="' +
      r * 0.12 +
      '" fill="#b8b0a0"/>' +
      '<ellipse cx="' +
      (mx + r * 0.08) +
      '" cy="' +
      (my + r * 0.28) +
      '" rx="' +
      r * 0.2 +
      '" ry="' +
      r * 0.14 +
      '" fill="#d0c8b8"/>' +
      '<circle cx="' +
      (cx + r * 0.15) +
      '" cy="' +
      (cy - r * 0.35) +
      '" r="' +
      r * 0.045 +
      '" fill="#a8a090" opacity="0.7"/>' +
      '<circle cx="' +
      (cx - r * 0.05) +
      '" cy="' +
      (cy + r * 0.22) +
      '" r="' +
      r * 0.035 +
      '" fill="#a8a090" opacity="0.55"/>' +
      '<circle cx="' +
      (cx + r * 0.28) +
      '" cy="' +
      (cy + r * 0.1) +
      '" r="' +
      r * 0.028 +
      '" fill="#a8a090" opacity="0.5"/>' +
      "</g>"
    );
  }

  function moonDisc(cx, cy, r, phaseKey, illumPct) {
    var k = moonIlluminationFraction(illumPct);
    var key = String(phaseKey || "");
    var waxing = moonIsWaxing(key, k);
    var darkFill = "#0a080c";
    var litFill = "#ebe6d8";
    var rim = "rgba(226,214,255,0.14)";
    var path = moonLitPath(cx, cy, r, k, waxing);
    var clipId = nid("mclip");
    var out =
      '<g class="wdb-r-luna" data-illum="' +
      Math.round(k * 100) +
      '" data-limb="' +
      (k <= 0.002 ? "new" : k >= 0.998 ? "full" : waxing ? "waxing" : "waning") +
      '">';
    /* Earthshine — extremely soft; never reads as illumination */
    if (k > 0.01 && k < 0.92) {
      out +=
        '<circle cx="' +
        cx +
        '" cy="' +
        cy +
        '" r="' +
        r +
        '" fill="#2a2830" opacity="0.14"/>';
    }
    out +=
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
      out +=
        "<defs><clipPath id=\"" +
        clipId +
        '"><path d="' +
        path +
        '"/></clipPath></defs>' +
        '<path d="' +
        path +
        '" fill="' +
        litFill +
        '"/>';
      /* Texture only when there is enough lit area to hold it without false brightness */
      if (k >= 0.08) {
        out += moonSurfaceTexture(cx, cy, r, clipId);
      }
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

  function skyArt(state) {
    var k = normalizeSkyState(state);
    if (k === "storm") {
      return artWrap(
        compose([
          skyGradient("#141014", "#24181e", "#181214"),
          mesaFar("#161014", 0.72),
          mesaMid("#100c0e", 0.9),
          cloudBank("storm", "#4a3840", 18),
          rainStreaks(true),
          lightningBolt(),
          canyonFloor("#0a080a", 0.96),
          sageRow(),
          grainOverlay(0.04)
        ]),
        "storm",
        "storm"
      );
    }
    if (k === "heavy-rain") {
      return artWrap(
        compose([
          skyGradient("#1a2028", "#2a3640", "#161e24"),
          mesaFar("#182028", 0.66),
          mesaMid("#12181e", 0.86),
          cloudBank("overcast", "#6a7480", 16),
          rainStreaks(true),
          canyonFloor("#0e1216", 0.95),
          sageRow(),
          grainOverlay(0.035)
        ]),
        "heavy-rain",
        "rain"
      );
    }
    if (k === "rain") {
      return artWrap(
        compose([
          skyGradient("#202830", "#364850", "#202830"),
          mesaFar("#1c262c", 0.55),
          mesaMid("#161e22", 0.8),
          cloudBank("heavy", "#8a949c", 22),
          rainStreaks(false),
          canyonFloor("#101418", 0.94),
          sageRow(),
          grainOverlay(0.03)
        ]),
        "rain",
        "rain"
      );
    }
    if (k === "snow") {
      return artWrap(
        compose([
          skyGradient("#343c46", "#626c78", "#464e56"),
          snowDrifts(),
          cloudBank("overcast", "#c8cdd4", 18),
          snowFlakes(),
          sageBrush(10, 0.85, "#2a3038", 0.42),
          sageBrush(142, 0.7, "#2a3038", 0.38),
          grainOverlay(0.035)
        ]),
        "snow",
        "snow"
      );
    }
    if (k === "fog") {
      return artWrap(
        compose([
          skyGradient("#383e46", "#565e68", "#3c424a"),
          mesaFar("#4a525a", 0.14),
          cloudBank("fog", "#d0ccc4", 40),
          fogBands(0.3),
          canyonFloor("#282e36", 0.4),
          fogBands(0.16),
          sageBrush(12, 0.7, "#1a1e24", 0.22),
          grainOverlay(0.05)
        ]),
        "fog",
        "fog"
      );
    }
    if (k === "cloudy") {
      return artWrap(
        compose([
          skyGradient("#364a56", "#647888", "#465660"),
          mesaFar("#564840", 0.52),
          mesaMid("#362c28", 0.8),
          cloudBank("overcast", "#d0c8bc", 14),
          canyonFloor("#181410", 0.94),
          sageRow(),
          grainOverlay(0.03)
        ]),
        "cloudy",
        "cloudy"
      );
    }
    if (k === "clear-night") {
      return artWrap(
        compose([
          skyGradient("#0c0a12", "#161422", "#241c22"),
          starsField(),
          mesaFar("#362c28", 0.68),
          mesaMid("#201a16", 0.88),
          moonDisc(122, 22, 8, "waxing-crescent", 18),
          canyonFloor("#0a080a", 0.96),
          sageRow(),
          grainOverlay(0.035)
        ]),
        "clear-night",
        "night"
      );
    }
    if (k === "wind") {
      return artWrap(
        compose([
          skyGradient("#26323c", "#3a4a54", "#283236"),
          mesaFar("#222c34", 0.5),
          mesaMid("#181e24", 0.78),
          cloudBank("cirrus", "#a8b4bc", 28),
          canyonFloor("#101418", 0.94),
          sageRow(),
          grainOverlay(0.03)
        ]),
        "wind",
        "wind"
      );
    }
    if (k === "clear") {
      return artWrap(
        compose([
          skyGradient("#35566e", "#72a0b6", "#dcb090"),
          radialWash(118, 26, 56, "#f7e7c5", 0.28),
          mesaFar("#564840", 0.36),
          mesaMid("#362c28", 0.66),
          sunGlow(118, 24, 9, "#f7f0e0", "#e8c888", 1.05),
          cloudBank("cirrus", "#e8e2d6", 30),
          canyonFloor("#181410", 0.92),
          sageRow(),
          grainOverlay(0.028)
        ]),
        "clear",
        "clear-day"
      );
    }
    return artWrap(
      compose([
        skyGradient("#385264", "#7298a8", "#c4a090"),
        radialWash(122, 20, 44, "#f0e0b8", 0.22),
        mesaFar("#4a3e38", 0.38),
        mesaMid("#28221e", 0.7),
        sunGlow(124, 20, 7, "#f7f0e0", "#e8c888", 0.85),
        cloudBank("scattered", "#e0dcd0", 32),
        canyonFloor("#141210", 0.92),
        sageRow(),
        grainOverlay(0.03)
      ]),
      "partly",
      "partly"
    );
  }

  function moonArt(illum, phase, phaseValue) {
    var key = moonPhaseKey(phase, illum, phaseValue);
    var k = moonIlluminationFraction(illum);
    var layers = [skyGradient("#0a0810", "#14121a", "#0e0c14")];
    layers.push(starsField({ sparse: k <= 0.05, leftOnly: k <= 0.08 }));
    layers.push(moonDisc(108, 46, 28, key, illum));
    layers.push(grainOverlay(0.04));
    return artWrap(compose(layers), "moon", "night");
  }

  function sunPathArt(kind) {
    var k = String(kind || "sunrise").toLowerCase();
    if (/day|noon|midday/.test(k)) {
      return artWrap(
        compose([
          skyBands([
            ["0%", "#4a7e9c"],
            ["42%", "#7aa8c0"],
            ["72%", "#e4d6c4"],
            ["100%", "#1a1614"]
          ]),
          radialWash(100, 18, 52, "#f7f0e0", 0.32),
          distantRidge(62, "#2a2420", 0.28),
          sunGlow(100, 20, 12, "#f7f0e0", "#e8c888", 1.15),
          cloudBank("cirrus", "#e8e2d6", 34),
          horizonGround(70, "#1a1614"),
          grainOverlay(0.028)
        ]),
        "day",
        "clear-day"
      );
    }
    if (/golden/.test(k)) {
      return artWrap(
        compose([
          skyBands([
            ["0%", "#2e1e2a"],
            ["28%", "#a86a52"],
            ["52%", "#dcae88"],
            ["72%", "#e8c888"],
            ["100%", "#161210"]
          ]),
          radialWash(100, 56, 54, "#f0d090", 0.4),
          distantRidge(60, "#241c18", 0.4),
          sunGlow(100, 58, 13, "#f7e8c8", "#e8a858", 1.2),
          cloudBank("cirrus", "#e0c8b0", 28),
          horizonGround(68, "#141210"),
          grainOverlay(0.032)
        ]),
        "golden",
        "golden"
      );
    }
    if (/blue/.test(k)) {
      return artWrap(
        compose([
          skyBands([
            ["0%", "#0c0c16"],
            ["35%", "#242448"],
            ["65%", "#4a5e7c"],
            ["100%", "#18161a"]
          ]),
          starsField({ sparse: true }),
          distantRidge(64, "#14121a", 0.45),
          horizonGround(72, "#100e12"),
          grainOverlay(0.04)
        ]),
        "blue-hour",
        "blue"
      );
    }
    if (/sunset/.test(k)) {
      return artWrap(
        compose([
          skyBands([
            ["0%", "#241820"],
            ["26%", "#9a5248"],
            ["50%", "#c87868"],
            ["72%", "#e8c090"],
            ["100%", "#12100e"]
          ]),
          radialWash(126, 54, 50, "#e8b878", 0.38),
          distantRidge(60, "#1e1614", 0.42),
          sunGlow(128, 60, 12, "#f7e0c0", "#d48858", 1.15),
          cloudBank("cirrus", "#d4b09a", 26),
          cloudBank("light", "#d4b09a", 34),
          horizonGround(70, "#120e0c"),
          grainOverlay(0.032)
        ]),
        "sunset",
        "golden"
      );
    }
    if (/night/.test(k)) {
      return artWrap(
        compose([
          skyBands([
            ["0%", "#0a0810"],
            ["45%", "#161422"],
            ["70%", "#362830"],
            ["84%", "#c08068"],
            ["100%", "#12100e"]
          ]),
          starsField(),
          distantRidge(68, "#100e12", 0.55),
          horizonGround(76, "#0a080a"),
          grainOverlay(0.04)
        ]),
        "night",
        "night"
      );
    }
    return artWrap(
      compose([
        skyBands([
          ["0%", "#1a2634"],
          ["35%", "#5a7e9c"],
          ["65%", "#e0b090"],
          ["100%", "#181410"]
        ]),
        radialWash(40, 56, 48, "#f0d090", 0.34),
        distantRidge(60, "#221c18", 0.38),
        sunGlow(38, 60, 12, "#f7e8c8", "#e8a858", 1.1),
        cloudBank("light", "#e0d0bc", 30),
        horizonGround(70, "#141210"),
        grainOverlay(0.03)
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
      good: ["#243830", "#466454", "#7a9870"],
      moderate: ["#363028", "#645838", "#c0a068"],
      usg: ["#362820", "#664030", "#c07858"],
      unhealthy: ["#2a1818", "#543030", "#a85850"],
      unknown: ["#282e36", "#384450", "#748494"]
    };
    var hazeOp = { good: 0.07, moderate: 0.18, usg: 0.32, unhealthy: 0.46, unknown: 0.12 };
    var c = skies[band] || skies.unknown;
    var far =
      band === "good"
        ? "#b4c4ae"
        : band === "moderate"
          ? "#d0c49c"
          : band === "usg"
            ? "#d0a484"
            : "#c4948c";
    var near =
      band === "good" ? "#18241c" : band === "moderate" ? "#201c14" : band === "usg" ? "#221610" : "#1c1010";
    return artWrap(
      compose([
        skyGradient(c[0], c[1], c[2]),
        depthPlanes(hazeOp[band] || 0.14, far, near),
        grainOverlay(0.04 + (hazeOp[band] || 0.1) * 0.08)
      ]),
      "aqi-" + band,
      "aqi-" + band
    );
  }

  function alertHazardKind(eventText) {
    var t = String(eventText || "").toLowerCase();
    if (/thunder|storm|tornado|severe|lightning/.test(t)) return "storm";
    if (/wind|gale|hurricane|tropical/.test(t)) return "wind";
    if (/heat|excessive.?heat|hot/.test(t)) return "heat";
    if (/winter|snow|ice|blizzard|freeze|frost/.test(t)) return "winter";
    if (/flood|rain|flash/.test(t)) return "flood";
    if (/fog|smoke|air.?quality|haze/.test(t)) return "fog";
    return "generic";
  }

  function alertArt(active, eventText) {
    if (active) {
      var hz = alertHazardKind(eventText);
      if (hz === "wind") {
        return artWrap(
          compose([
            skyGradient("#1a2228", "#2e3a42", "#1c2428"),
            cloudBank("cirrus", "#6a7880", 24),
            windFlow(28, 250),
            horizonGround(82, "#101418"),
            grainOverlay(0.035)
          ]),
          "alert-active",
          "alert"
        );
      }
      if (hz === "heat") {
        return artWrap(
          compose([
            skyGradient("#2a1c18", "#6a4030", "#c07858"),
            radialWash(100, 30, 60, "#e8c888", 0.28),
            distantRidge(64, "#2a1c18", 0.45),
            horizonGround(78, "#181010"),
            grainOverlay(0.04)
          ]),
          "alert-active",
          "alert"
        );
      }
      if (hz === "winter") {
        return artWrap(
          compose([
            skyGradient("#2a323c", "#5a6670", "#3a4450"),
            snowDrifts(),
            cloudBank("overcast", "#c0c8d0", 20),
            horizonGround(82, "#1a2028"),
            grainOverlay(0.04)
          ]),
          "alert-active",
          "alert"
        );
      }
      if (hz === "flood") {
        return artWrap(
          compose([
            skyGradient("#1a2228", "#2a3840", "#182028"),
            cloudBank("heavy", "#6a7880", 18),
            rainStreaks(true),
            horizonGround(82, "#101418"),
            grainOverlay(0.035)
          ]),
          "alert-active",
          "alert"
        );
      }
      /* storm / generic active */
      return artWrap(
        compose([
          skyGradient("#161014", "#322024", "#1a1416"),
          cloudBank("storm", "#4a3840", 16),
          lightningBolt(),
          distantRidge(70, "#100c0e", 0.55),
          horizonGround(80, "#0a080a"),
          grainOverlay(0.04)
        ]),
        "alert-active",
        "alert"
      );
    }
    return artWrap(
      compose([
        skyGradient("#1a2226", "#2c3840", "#202830"),
        distantRidge(58, "#2a3438", 0.28),
        cloudBank("light", "#6a7880", 34),
        horizonGround(80, "#14181a"),
        grainOverlay(0.03)
      ]),
      "alert",
      "quiet"
    );
  }

  function uvArt(index) {
    var n = Math.max(0, Math.min(11, Number(index) || 0));
    var strength = n <= 0 ? 0.08 : n < 3 ? 0.35 : n < 6 ? 0.7 : n < 8 ? 1.0 : 1.25;
    var skyTop = n < 3 ? "#2a3848" : n < 6 ? "#3a5a72" : "#4a6e88";
    var skyMid = n < 3 ? "#4a6a7c" : n < 6 ? "#6aa0b8" : "#7ab0c8";
    var skyBot = n < 3 ? "#6a8898" : n >= 6 ? "#e8c888" : "#a8c4d4";
    var layers = [
      skyGradient(skyTop, skyMid, skyBot),
      radialWash(108, 28, 56, "#f0e0b0", 0.12 + strength * 0.28),
      distantRidge(66, "#1a2228", 0.35)
    ];
    if (n >= 1) {
      layers.push(sunGlow(108, 28, 7 + Math.min(5, n * 0.45), "#f7f0e0", "#e8c888", strength));
    }
    if (n >= 4) {
      layers.push(cloudBank("cirrus", "#e0dcd0", 36));
    }
    layers.push(horizonGround(74, "#141a20"));
    layers.push(grainOverlay(0.03));
    return artWrap(compose(layers), "uv", n >= 6 ? "golden" : "clear-day");
  }

  function hoursArt() {
    return artWrap(
      compose([
        skyBands([
          ["0%", "#202c3a"],
          ["50%", "#364a58"],
          ["100%", "#263440"]
        ]),
        '<g class="wdb-r-hours-ticks" stroke="#e0d3c0" stroke-width="1.15" opacity="0.32">' +
          '<path d="M70 20 v12M90 16 v16M110 24 v10M130 18 v14"/>' +
          "</g>",
        distantRidge(68, "#1a2228", 0.3),
        horizonGround(76, "#10161c"),
        grainOverlay(0.025)
      ]),
      "hours",
      "quiet"
    );
  }

  function doorwayArt() {
    return artWrap(
      compose([
        skyGradient("#263234", "#3a484e", "#283034"),
        distantRidge(58, "#222a2e", 0.35),
        '<rect x="96" y="36" width="26" height="46" rx="1.5" fill="#0c0a0a" opacity="0.78"/>' +
          '<path d="M109 36 V82" stroke="#e0b090" stroke-width="0.85" opacity="0.32"/>' +
          '<rect x="100" y="48" width="7" height="10" fill="#e8c888" opacity="0.1"/>',
        horizonGround(82, "#101418"),
        grainOverlay(0.03)
      ]),
      "doorway",
      "quiet"
    );
  }

  function comfortArt() {
    return artWrap(
      compose([
        skyBands([
          ["0%", "#263430"],
          ["45%", "#465848"],
          ["100%", "#364440"]
        ]),
        radialWash(100, 46, 52, "#7d9a6e", 0.16),
        distantRidge(66, "#1a221c", 0.32),
        horizonGround(78, "#121810"),
        grainOverlay(0.028)
      ]),
      "comfort",
      "quiet"
    );
  }

  function rangeArt() {
    return artWrap(
      compose([
        '<rect class="wdb-r-range-high" width="160" height="50" fill="#c17a5a" opacity="0.32"/>' +
          '<rect class="wdb-r-range-low" y="50" width="160" height="50" fill="#2a3448" opacity="0.52"/>' +
          '<path d="M0 50 H160" stroke="#e0d3c0" stroke-width="1" opacity="0.35"/>',
        horizonGround(80, "#12161a"),
        grainOverlay(0.025)
      ]),
      "range",
      "quiet"
    );
  }

  function precipArt(graphic) {
    var g = graphic || {};
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
          skyGradient("#343c46", "#626c78", "#464e56"),
          snowDrifts(),
          cloudBank("overcast", "#c8cdd4", 20),
          snowFlakes(),
          grainOverlay(0.035)
        ]),
        "precip-snow",
        "snow"
      );
    }

    if (!rainingNow && nowProb <= 10) {
      return artWrap(
        compose([
          skyGradient("#1a242c", "#364650", "#182028"),
          cloudBank("light", "#8a98a0", 26),
          distantRidge(74, "#1a2228", 0.35),
          horizonGround(86, "#101418"),
          grainOverlay(0.03)
        ]),
        "precip-dry",
        "quiet"
      );
    }

    if (!rainingNow && nowProb <= 30) {
      return artWrap(
        compose([
          skyGradient("#1a242c", "#324450", "#182028"),
          cloudBank("scattered", "#8a98a0", 20),
          distantRidge(74, "#1a2228", 0.4),
          horizonGround(86, "#101418"),
          grainOverlay(0.03)
        ]),
        "precip-possible",
        "quiet"
      );
    }

    var bandProb = rainingNow ? Math.max(nowProb, 55) : nowProb;
    return artWrap(
      compose([
        skyGradient("#1a242c", bandProb >= 60 ? "#283840" : "#324450", "#182028"),
        cloudBank(bandProb >= 60 ? "heavy" : "scattered", "#8a98a0", bandProb >= 60 ? 12 : 16),
        rainCurtain(bandProb, intensity || (bandProb >= 70 ? "heavy" : "light")),
        horizonGround(86, "#101418"),
        grainOverlay(0.035)
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
        skyGradient("#263234", "#3a4c50", "#283436"),
        radialWash(90, 38, 52, "#6aa8a0", 0.09),
        cloudBank("cirrus", "#a8b8b4", 28),
        windFlow(speed, dir),
        horizonGround(88, "#121612"),
        grainOverlay(0.03)
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
      if (kind === "alert") return alertArt(!!graphic.active, graphic.event || graphic.hazard || "");
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
    version: "5.2.0-semi-realistic-field-art",
    render: render,
    normalizeSkyState: normalizeSkyState,
    moonPhaseKey: moonPhaseKey,
    moonIlluminationFraction: moonIlluminationFraction,
    moonLitPath: moonLitPath,
    moonDisc: moonDisc,
    moonGeometry: moonGeometry,
    illumFromGraphic: illumFromGraphic,
    miniSky: miniSky
  };
})(typeof window !== "undefined" ? window : global);
