/**
 * Dashboard Rebuild — cinematic stylized landscape card art.
 * Field-guide / mountain weather-station / dark atmospheric landscapes.
 * Multi-layer SVG (foreground / midground / background). Lightweight — not photos.
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

  /* ——— Shared scene library (vector layers) ——— */

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

  /** Distant mountain silhouette — background */
  function ridgesFar(fill, opacity) {
    return (
      '<path d="M0 58 L18 42 L32 50 L48 28 L62 44 L78 22 L94 40 L112 18 L128 36 L144 26 L160 38 L160 100 L0 100 Z" fill="' +
      fill +
      '" opacity="' +
      (opacity == null ? 0.55 : opacity) +
      '"/>'
    );
  }

  /** Midground ridges */
  function ridgesMid(fill, opacity) {
    return (
      '<path d="M0 68 L22 54 L40 62 L58 46 L76 58 L98 42 L118 56 L138 48 L160 58 L160 100 L0 100 Z" fill="' +
      fill +
      '" opacity="' +
      (opacity == null ? 0.72 : opacity) +
      '"/>'
    );
  }

  /** Near terrain / valley floor */
  function terrainNear(fill, opacity) {
    return (
      '<path d="M0 82 C28 76 48 84 72 78 C96 72 118 80 140 74 L160 72 L160 100 L0 100 Z" fill="' +
      fill +
      '" opacity="' +
      (opacity == null ? 0.92 : opacity) +
      '"/>'
    );
  }

  /** Pine / spruce silhouettes — foreground accents */
  function pines(x, scale, fill, opacity) {
    var s = scale || 1;
    var f = fill || "#0e0c12";
    var o = opacity == null ? 0.85 : opacity;
    return (
      '<g fill="' +
      f +
      '" opacity="' +
      o +
      '">' +
      '<path d="M' +
      (x + 6 * s) +
      " " +
      (88 - 22 * s) +
      " L" +
      (x + 12 * s) +
      " " +
      (88 - 8 * s) +
      " H" +
      (x + 9 * s) +
      " L" +
      (x + 14 * s) +
      " " +
      (88 - 2 * s) +
      " H" +
      (x + 10 * s) +
      " L" +
      (x + 15 * s) +
      " " +
      (88 + 4 * s) +
      " H" +
      (x - 3 * s) +
      " L" +
      (x + 2 * s) +
      " " +
      (88 - 2 * s) +
      " H" +
      (x - 1 * s) +
      " L" +
      (x + 4 * s) +
      " " +
      (88 - 8 * s) +
      " H" +
      x +
      ' Z"/>' +
      '<rect x="' +
      (x + 5 * s) +
      '" y="' +
      (88 + 2 * s) +
      '" width="' +
      2.2 * s +
      '" height="' +
      5 * s +
      '" opacity="0.7"/>' +
      "</g>"
    );
  }

  function pineRow() {
    return pines(8, 0.85) + pines(22, 1.05) + pines(138, 0.9) + pines(148, 0.7);
  }

  /**
   * Billowy cloud mass — path-based cumulus, NOT overlapping ellipses as the hero.
   */
  function cloudMass(x, y, w, fill, opacity) {
    var h = w * 0.42;
    var f = fill || "#e8e2d6";
    var o = opacity == null ? 0.55 : opacity;
    /* Irregular cumulus silhouette — lobes + uneven base (not an ellipse) */
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
    /* scattered / partly */
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
      (glow || "#d4a05c") +
      '" stop-opacity="0.85"/>' +
      '<stop offset="100%" stop-color="' +
      (glow || "#d4a05c") +
      '" stop-opacity="0"/>' +
      "</radialGradient></defs>" +
      '<circle cx="' +
      cx +
      '" cy="' +
      cy +
      '" r="' +
      (r * 2.4) +
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
      var x = 58 + i * (heavy ? 6.2 : 8.5) + ((i % 3) * 1.5);
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
      (o * 0.85) +
      '" fill="none"/>' +
      '<path d="M30 70 C80 64 110 74 150 68" stroke="#c8c4bc" stroke-width="11" stroke-linecap="round" opacity="' +
      (o * 0.7) +
      '" fill="none"/>'
    );
  }

  function lightningBolt() {
    return (
      '<path d="M108 36 L98 54 H108 L100 72" stroke="#e8d4a0" stroke-width="1.8" stroke-linejoin="round" fill="none" opacity="0.85"/>' +
      '<path d="M108 36 L98 54 H108 L100 72" stroke="#f7f0e0" stroke-width="0.7" stroke-linejoin="round" fill="none" opacity="0.9"/>'
    );
  }

  function hazeVeil(opacity, color) {
    return (
      '<ellipse cx="100" cy="52" rx="58" ry="22" fill="' +
      (color || "#c8c0b0") +
      '" opacity="' +
      opacity +
      '"/>' +
      '<ellipse cx="88" cy="64" rx="64" ry="16" fill="' +
      (color || "#c8c0b0") +
      '" opacity="' +
      (opacity * 0.75) +
      '"/>'
    );
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

  function baseDayTerrain(sky) {
    return compose([
      sky,
      ridgesFar("#2a3440", 0.5),
      ridgesMid("#1f2832", 0.75),
      terrainNear("#141018", 0.95),
      pineRow()
    ]);
  }

  function baseNightTerrain(sky) {
    return compose([
      sky,
      starsField(),
      ridgesFar("#1a1524", 0.65),
      ridgesMid("#12101a", 0.85),
      terrainNear("#0c0a10", 0.96),
      pineRow()
    ]);
  }

  /* ——— Moon phase (accurate 8-phase geometry via mask + real illumination) ——— */

  function moonPhaseKey(phase, illum, phaseValue) {
    var p = String(phase || "").toLowerCase();
    if (/new/.test(p) && !/wane|wax/.test(p)) return "new";
    if (/full/.test(p)) return "full";
    if (/first.?quarter|waxing.?quarter/.test(p)) return "first-quarter";
    if (/last.?quarter|third.?quarter|waning.?quarter/.test(p)) return "last-quarter";
    if (/waxing.?crescent/.test(p)) return "waxing-crescent";
    if (/waning.?crescent/.test(p)) return "waning-crescent";
    if (/waxing.?gibbous/.test(p)) return "waxing-gibbous";
    if (/waning.?gibbous/.test(p)) return "waning-gibbous";
    /* Prefer synodic phase fraction 0..1 when label missing — honest waxing/waning.
       Guard null/"" : Number(null)===0 would falsely read as new moon. */
    if (phaseValue != null && phaseValue !== "") {
      var pv = Number(phaseValue);
      if (isFinite(pv)) {
        if (pv < 0) pv = ((pv % 1) + 1) % 1;
        if (pv > 1 && pv <= 100) pv = pv / 100;
        if (pv < 0.03 || pv > 0.97) return "new";
        if (pv < 0.22) return "waxing-crescent";
        if (pv < 0.28) return "first-quarter";
        if (pv < 0.47) return "waxing-gibbous";
        if (pv < 0.53) return "full";
        if (pv < 0.72) return "waning-gibbous";
        if (pv < 0.78) return "last-quarter";
        return "waning-crescent";
      }
    }
    var pct = Number(illum);
    if (!isFinite(pct)) return "waxing-crescent";
    /* Illumination alone cannot distinguish waxing vs waning — stay honest with discrete bands */
    if (pct < 3) return "new";
    if (pct < 35) return "waxing-crescent";
    if (pct < 55) return "first-quarter";
    if (pct < 85) return "waxing-gibbous";
    if (pct < 97) return "full";
    return "full";
  }

  /**
   * Illumination fraction 0..1 and waxing flag.
   * Prefer measured/computed illumination when available; phase key sets orientation
   * unless synodic phaseValue is present (needed near new/full labels).
   */
  function moonGeometry(key, illumPct, phaseValue) {
    var map = {
      new: { lit: 0, waxing: true },
      "waxing-crescent": { lit: 0.2, waxing: true },
      "first-quarter": { lit: 0.5, waxing: true },
      "waxing-gibbous": { lit: 0.75, waxing: true },
      full: { lit: 1, waxing: true },
      "waning-gibbous": { lit: 0.75, waxing: false },
      "last-quarter": { lit: 0.5, waxing: false },
      "waning-crescent": { lit: 0.2, waxing: false }
    };
    var g = map[key] || map["waxing-crescent"];
    var lit = g.lit;
    if (illumPct != null && isFinite(Number(illumPct))) {
      lit = Math.max(0, Math.min(1, Number(illumPct) / 100));
    }
    var waxing = g.waxing;
    if (phaseValue != null && phaseValue !== "") {
      var pv = Number(phaseValue);
      if (isFinite(pv)) {
        if (pv < 0) pv = ((pv % 1) + 1) % 1;
        if (pv > 1 && pv <= 100) pv = pv / 100;
        waxing = pv <= 0.5;
      }
    }
    return { lit: lit, waxing: waxing };
  }

  function moonDisc(cx, cy, r, phaseKey, illumPct, phaseValue) {
    var g = moonGeometry(phaseKey, illumPct, phaseValue);
    var mid = nid("moon");
    var lit = g.lit;
    /* Field-guide lunar viz: ivory-silver lit face, faintly visible dark limb */
    var darkFill = "#2a2438";
    var darkStroke = "#6a6280";
    var litFill = "#e8e4d8";
    var crater = "#d0c8b8";
    if (lit <= 0.02) {
      return (
        '<circle cx="' +
        cx +
        '" cy="' +
        cy +
        '" r="' +
        (r + 3) +
        '" fill="#d4c8a8" opacity="0.05"/>' +
        '<circle cx="' +
        cx +
        '" cy="' +
        cy +
        '" r="' +
        r +
        '" fill="' +
        darkFill +
        '" stroke="' +
        darkStroke +
        '" stroke-width="0.55" opacity="0.92"/>'
      );
    }
    if (lit >= 0.98) {
      return (
        '<circle cx="' +
        cx +
        '" cy="' +
        cy +
        '" r="' +
        (r + 4) +
        '" fill="#d4c8a8" opacity="0.12"/>' +
        '<circle cx="' +
        cx +
        '" cy="' +
        cy +
        '" r="' +
        r +
        '" fill="' +
        litFill +
        '"/>' +
        '<circle cx="' +
        (cx - r * 0.25) +
        '" cy="' +
        (cy - r * 0.2) +
        '" r="' +
        r * 0.18 +
        '" fill="' +
        crater +
        '" opacity="0.35"/>'
      );
    }
    /* Mask: white disc minus dark offset disc for crescent/gibbous/quarter */
    var offset;
    if (lit <= 0.5) {
      offset = g.waxing ? -r * (1.15 - lit * 1.1) : r * (1.15 - lit * 1.1);
    } else {
      offset = g.waxing ? -r * (lit - 0.15) : r * (lit - 0.15);
    }
    return (
      "<defs>" +
      '<mask id="' +
      mid +
      '">' +
      '<rect x="' +
      (cx - r - 4) +
      '" y="' +
      (cy - r - 4) +
      '" width="' +
      (r * 2 + 8) +
      '" height="' +
      (r * 2 + 8) +
      '" fill="black"/>' +
      '<circle cx="' +
      cx +
      '" cy="' +
      cy +
      '" r="' +
      r +
      '" fill="white"/>' +
      (lit < 0.98
        ? '<circle cx="' +
          (cx + offset) +
          '" cy="' +
          cy +
          '" r="' +
          (r + 0.2) +
          '" fill="black"/>'
        : "") +
      "</mask>" +
      "</defs>" +
      /* Faintly visible unlit hemisphere */
      '<circle cx="' +
      cx +
      '" cy="' +
      cy +
      '" r="' +
      r +
      '" fill="' +
      darkFill +
      '" stroke="' +
      darkStroke +
      '" stroke-width="0.45" opacity="0.88"/>' +
      /* Soft limb glow */
      '<circle cx="' +
      cx +
      '" cy="' +
      cy +
      '" r="' +
      (r + 2.5) +
      '" fill="#d4c8a8" opacity="0.07"/>' +
      /* Ivory-silver illuminated face */
      '<circle cx="' +
      cx +
      '" cy="' +
      cy +
      '" r="' +
      r +
      '" fill="' +
      litFill +
      '" mask="url(#' +
      mid +
      ')"/>' +
      '<circle cx="' +
      (cx - r * 0.22) +
      '" cy="' +
      (cy - r * 0.18) +
      '" r="' +
      r * 0.14 +
      '" fill="' +
      crater +
      '" opacity="0.28" mask="url(#' +
      mid +
      ')"/>'
    );
  }

  /* ——— Sky / weather scenes ——— */

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
        compose([
          skyGradient("#1a1520", "#2a2438", "#1c1824"),
          ridgesFar("#16121e", 0.7),
          ridgesMid("#100e16", 0.88),
          cloudBank("heavy", "#4a4458", 24),
          rainStreaks(true),
          lightningBolt(),
          terrainNear("#0c0a10", 0.96),
          pineRow()
        ]),
        "storm",
        "storm"
      );
    }
    if (k === "heavy-rain") {
      return artWrap(
        compose([
          skyGradient("#1e2832", "#2e3e4a", "#1a242c"),
          ridgesFar("#1a2228", 0.65),
          ridgesMid("#141a20", 0.85),
          cloudBank("overcast", "#6a7480", 22),
          rainStreaks(true),
          terrainNear("#101418", 0.95),
          pineRow()
        ]),
        "heavy-rain",
        "rain"
      );
    }
    if (k === "rain") {
      return artWrap(
        compose([
          skyGradient("#243440", "#3a5060", "#243038"),
          ridgesFar("#1e2a32", 0.55),
          ridgesMid("#182028", 0.8),
          cloudBank("heavy", "#8a949c", 26),
          rainStreaks(false),
          terrainNear("#12161a", 0.94),
          pineRow()
        ]),
        "rain",
        "rain"
      );
    }
    if (k === "snow") {
      return artWrap(
        compose([
          skyGradient("#2a323c", "#4a5564", "#2e3640"),
          ridgesFar("#3a4450", 0.45),
          ridgesMid("#2a323c", 0.7),
          cloudBank("heavy", "#c8cdd4", 24),
          snowFlakes(),
          terrainNear("#1a1e24", 0.9),
          '<path d="M0 88 C40 84 80 90 120 85 L160 82 L160 100 L0 100 Z" fill="#e8e4dc" opacity="0.18"/>',
          pineRow()
        ]),
        "snow",
        "snow"
      );
    }
    if (k === "fog") {
      return artWrap(
        compose([
          skyGradient("#3a4048", "#5a626c", "#3e444c"),
          ridgesFar("#4a525a", 0.25),
          ridgesMid("#3a424a", 0.35),
          fogBands(0.28),
          terrainNear("#2a3038", 0.55),
          fogBands(0.18),
          pines(12, 0.7, "#1a1e24", 0.35),
          pines(145, 0.65, "#1a1e24", 0.3)
        ]),
        "fog",
        "fog"
      );
    }
    if (k === "cloudy") {
      return artWrap(
        compose([
          skyGradient("#2f3a46", "#4a5a68", "#323c46"),
          ridgesFar("#2a3440", 0.55),
          ridgesMid("#1e2830", 0.8),
          cloudBank("overcast", "#9aa4ae", 20),
          terrainNear("#14181c", 0.94),
          pineRow()
        ]),
        "cloudy",
        "cloudy"
      );
    }
    if (k === "clear-night") {
      return artWrap(
        compose([
          skyGradient("#0e0c16", "#1a1528", "#12101a"),
          starsField(),
          ridgesFar("#14101c", 0.7),
          ridgesMid("#0e0c14", 0.88),
          moonDisc(118, 26, 11, "waxing-crescent"),
          terrainNear("#0a0810", 0.96),
          pineRow()
        ]),
        "clear-night",
        "night"
      );
    }
    if (k === "wind") {
      return artWrap(
        compose([
          skyGradient("#2a3640", "#3d4e5c", "#2a343c"),
          ridgesFar("#243038", 0.55),
          ridgesMid("#1a2228", 0.8),
          cloudBank("light", "#a8b4bc", 30),
          '<path d="M55 40 C80 36 100 44 130 38" stroke="#a8c4d4" stroke-width="1.3" fill="none" opacity="0.4"/>' +
            '<path d="M60 50 C90 46 110 54 135 48" stroke="#a8c4d4" stroke-width="1.2" fill="none" opacity="0.32"/>' +
            '<path d="M65 60 C95 56 115 64 138 58" stroke="#a8c4d4" stroke-width="1.1" fill="none" opacity="0.25"/>',
          terrainNear("#12161a", 0.94),
          pineRow()
        ]),
        "wind",
        "wind"
      );
    }
    if (k === "clear") {
      return artWrap(
        compose([
          skyGradient("#3a6a8a", "#6aa8c2", "#b8d4e4"),
          radialWash(118, 28, 50, "#f7e7c5", 0.35),
          ridgesFar("#4a6a78", 0.35),
          ridgesMid("#2a4050", 0.65),
          sunDisc(118, 26, 9),
          terrainNear("#1a242c", 0.9),
          pineRow()
        ]),
        "clear",
        "clear-day"
      );
    }
    /* partly cloudy */
    return artWrap(
      compose([
        skyGradient("#3d5a72", "#6a90a8", "#a0c0d4"),
        radialWash(122, 22, 40, "#f0e0b8", 0.28),
        ridgesFar("#3a5568", 0.4),
        ridgesMid("#243848", 0.7),
        sunDisc(124, 22, 7),
        cloudBank("scattered", "#e0dcd0", 36),
        terrainNear("#161c22", 0.92),
        pineRow()
      ]),
      "partly",
      "partly"
    );
  }

  function moonArt(illum, phase, phaseValue) {
    var key = moonPhaseKey(phase, illum, phaseValue);
    return artWrap(
      compose([
        skyGradient("#0c0a14", "#1a1528", "#100e18"),
        starsField(),
        ridgesFar("#14101c", 0.72),
        ridgesMid("#0e0c14", 0.9),
        moonDisc(118, 34, 16, key, illum, phaseValue),
        terrainNear("#0a0810", 0.96),
        pineRow()
      ]),
      "moon",
      "night"
    );
  }

  function sunPathArt(kind) {
    var k = String(kind || "sunrise").toLowerCase();
    if (/golden/.test(k)) {
      return artWrap(
        compose([
          skyGradient("#3a2430", "#c17a5a", "#d4a05c"),
          radialWash(100, 48, 55, "#f0d090", 0.4),
          ridgesFar("#4a3038", 0.45),
          ridgesMid("#2a1c22", 0.75),
          sunDisc(100, 52, 12, "#f7e8c8", "#e8a858"),
          terrainNear("#141018", 0.92),
          pineRow()
        ]),
        "golden",
        "golden"
      );
    }
    if (/blue/.test(k)) {
      return artWrap(
        compose([
          skyGradient("#12101e", "#2a2848", "#4a5a78"),
          starsField(),
          ridgesFar("#1a1828", 0.7),
          ridgesMid("#12101a", 0.88),
          '<circle cx="100" cy="54" r="10" fill="#8b7ab0" opacity="0.35"/>',
          terrainNear("#0c0a12", 0.95),
          pineRow()
        ]),
        "blue-hour",
        "blue"
      );
    }
    if (/sunset/.test(k)) {
      return artWrap(
        compose([
          skyGradient("#2a1c28", "#a85d52", "#d4a05c"),
          radialWash(120, 44, 48, "#e8b878", 0.38),
          ridgesFar("#3a2830", 0.5),
          ridgesMid("#22181e", 0.8),
          sunDisc(122, 48, 10, "#f7e0c0", "#d48858"),
          terrainNear("#120e14", 0.94),
          pineRow()
        ]),
        "sunset",
        "golden"
      );
    }
    /* sunrise */
    return artWrap(
      compose([
        skyGradient("#1e2a38", "#5a7a98", "#d4a05c"),
        radialWash(48, 50, 45, "#f0d090", 0.35),
        ridgesFar("#2a3848", 0.45),
        ridgesMid("#1a2430", 0.75),
        sunDisc(48, 52, 10, "#f7e8c8", "#e8a858"),
        terrainNear("#12161c", 0.93),
        pineRow()
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
    var hazeOp = { good: 0.08, moderate: 0.18, usg: 0.28, unhealthy: 0.38, unknown: 0.12 };
    var c = skies[band] || skies.unknown;
    var hazeColor =
      band === "good"
        ? "#b8c8b0"
        : band === "moderate"
          ? "#d4c8a0"
          : band === "usg"
            ? "#d4a888"
            : "#c89890";
    return artWrap(
      compose([
        skyGradient(c[0], c[1], c[2]),
        ridgesFar("#2a322e", 0.4),
        ridgesMid("#1e2622", 0.65),
        hazeVeil(hazeOp[band] || 0.12, hazeColor),
        terrainNear("#141814", 0.9),
        hazeVeil((hazeOp[band] || 0.12) * 0.6, hazeColor),
        pineRow()
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
          ridgesFar("#1a1216", 0.75),
          ridgesMid("#120e12", 0.9),
          cloudBank("heavy", "#4a3840", 22),
          lightningBolt(),
          terrainNear("#0c0a0c", 0.96),
          pineRow()
        ]),
        "alert-active",
        "alert"
      );
    }
    return artWrap(
      compose([
        skyGradient("#1e242c", "#2e3844", "#222830"),
        ridgesFar("#242c34", 0.45),
        ridgesMid("#1a2228", 0.7),
        cloudBank("light", "#6a7480", 34),
        terrainNear("#12161a", 0.92),
        pineRow()
      ]),
      "alert",
      "quiet"
    );
  }

  function uvArt(index) {
    var n = Math.max(0, Math.min(11, Number(index) || 0));
    return artWrap(
      compose([
        skyGradient("#3a4a58", "#6aa8c2", n >= 6 ? "#d4a05c" : "#a8c4d4"),
        radialWash(110, 28, 45, "#f0e0b0", n >= 6 ? 0.4 : 0.25),
        ridgesFar("#3a5060", 0.4),
        ridgesMid("#243848", 0.7),
        sunDisc(112, 28, 8 + Math.min(4, n * 0.4)),
        terrainNear("#161c22", 0.92),
        pineRow()
      ]),
      "uv",
      n >= 6 ? "golden" : "clear-day"
    );
  }

  function hoursArt() {
    return artWrap(
      compose([
        skyGradient("#243040", "#3a4e5c", "#2a3640"),
        ridgesFar("#243038", 0.5),
        ridgesMid("#1a242c", 0.75),
        cloudBank("light", "#8a98a4", 32),
        terrainNear("#12181e", 0.93),
        pineRow()
      ]),
      "hours",
      "quiet"
    );
  }

  function doorwayArt() {
    return artWrap(
      compose([
        skyGradient("#2a343c", "#3d4a52", "#2a3238"),
        ridgesFar("#2a343c", 0.45),
        ridgesMid("#1e282e", 0.75),
        sunDisc(130, 24, 5),
        '<rect x="96" y="42" width="22" height="38" rx="1.5" fill="#0e0c12" opacity="0.7"/>' +
          '<path d="M107 42 V80" stroke="#f2ebe0" stroke-width="0.8" opacity="0.2"/>',
        terrainNear("#12161a", 0.94),
        pineRow()
      ]),
      "doorway",
      "quiet"
    );
  }

  function comfortArt() {
    return artWrap(
      compose([
        skyGradient("#2a3430", "#4a5a48", "#3a4840"),
        ridgesFar("#2a3830", 0.45),
        ridgesMid("#1e2a24", 0.75),
        terrainNear("#141a16", 0.93),
        pineRow()
      ]),
      "comfort",
      "quiet"
    );
  }

  function rangeArt() {
    return artWrap(
      compose([
        skyGradient("#2a3440", "#4a5a68", "#2a343c"),
        ridgesFar("#2a3848", 0.45),
        ridgesMid("#1e2830", 0.75),
        sunDisc(120, 26, 6),
        terrainNear("#14181c", 0.93),
        pineRow()
      ]),
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
    version: "4.0.0-cinematic",
    render: render,
    normalizeSkyState: normalizeSkyState,
    moonPhaseKey: moonPhaseKey,
    moonGeometry: moonGeometry,
    illumFromGraphic: illumFromGraphic,
    miniSky: miniSky
  };
})(typeof window !== "undefined" ? window : global);
