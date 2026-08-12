/**
 * Dashboard Rebuild — canonical lunar state + data-driven disk.
 * Single source of truth for phase label, illumination %, limb, and SVG.
 * Authority: live daylight / moon package (phaseValue + illumination).
 */
(function (global) {
  "use strict";

  var clipSeq = 0;

  var PHASES = [
    { key: "new", label: "New moon", min: 0, max: 0.03 },
    { key: "waxing-crescent", label: "Waxing crescent", min: 0.03, max: 0.22 },
    { key: "first-quarter", label: "First quarter", min: 0.22, max: 0.28 },
    { key: "waxing-gibbous", label: "Waxing gibbous", min: 0.28, max: 0.47 },
    { key: "full", label: "Full moon", min: 0.47, max: 0.53 },
    { key: "waning-gibbous", label: "Waning gibbous", min: 0.53, max: 0.72 },
    { key: "last-quarter", label: "Last quarter", min: 0.72, max: 0.78 },
    { key: "waning-crescent", label: "Waning crescent", min: 0.78, max: 0.97 }
  ];

  /** Deterministic fixtures for DATA + VISUAL STATE tests. */
  var FIXTURES = [
    { id: 1, name: "New Moon 0%", phaseValue: 0, illumination: 0, phase: "New moon", limb: "new" },
    { id: 2, name: "Waxing Crescent ~10%", phaseValue: 0.05, illumination: 10, phase: "Waxing crescent", limb: "waxing" },
    { id: 3, name: "Waxing Crescent ~25%", phaseValue: 0.125, illumination: 25, phase: "Waxing crescent", limb: "waxing" },
    { id: 4, name: "First Quarter ~50%", phaseValue: 0.25, illumination: 50, phase: "First quarter", limb: "waxing" },
    { id: 5, name: "Waxing Gibbous ~75%", phaseValue: 0.375, illumination: 75, phase: "Waxing gibbous", limb: "waxing" },
    { id: 6, name: "Full Moon 100%", phaseValue: 0.5, illumination: 100, phase: "Full moon", limb: "full" },
    { id: 7, name: "Waning Gibbous ~75%", phaseValue: 0.625, illumination: 75, phase: "Waning gibbous", limb: "waning" },
    { id: 8, name: "Last Quarter ~50%", phaseValue: 0.75, illumination: 50, phase: "Last quarter", limb: "waning" },
    { id: 9, name: "Waning Crescent ~25%", phaseValue: 0.875, illumination: 25, phase: "Waning crescent", limb: "waning" },
    { id: 10, name: "Near New Moon ~3%", phaseValue: 0.985, illumination: 3, phase: "New moon", limb: "waning" }
  ];

  function clamp(n, lo, hi) {
    n = Number(n);
    if (!isFinite(n)) return lo;
    return Math.max(lo, Math.min(hi, n));
  }

  function wrapPhase(p) {
    p = Number(p);
    if (!isFinite(p)) return null;
    p = p % 1;
    if (p < 0) p += 1;
    return p;
  }

  function illuminationFromPhaseValue(p) {
    p = wrapPhase(p);
    if (p == null) return null;
    var k = p <= 0.5 ? p * 2 : (1 - p) * 2;
    return Math.round(k * 100);
  }

  function phaseMetaFromValue(p) {
    p = wrapPhase(p);
    if (p == null) return null;
    if (p >= 0.97 || p < 0.03) return { key: "new", label: "New moon" };
    var i;
    for (i = 0; i < PHASES.length; i += 1) {
      if (p >= PHASES[i].min && p < PHASES[i].max) return PHASES[i];
    }
    return { key: "new", label: "New moon" };
  }

  function limbFromPhaseValue(p) {
    p = wrapPhase(p);
    if (p == null) return "unknown";
    /* True new/full only at the nodes. Near-new (e.g. 3%) keeps waxing/waning so the sliver faces correctly. */
    if (p < 0.005 || p >= 0.995) return "new";
    if (p >= 0.495 && p < 0.505) return "full";
    if (p < 0.5) return "waxing";
    return "waning";
  }

  function limbFromPhaseName(name) {
    var s = String(name || "").toLowerCase();
    if (!s) return "unknown";
    if (/waning|last quarter|third quarter/.test(s)) return "waning";
    if (/waxing|first quarter/.test(s)) return "waxing";
    if (/full/.test(s)) return "full";
    if (/new/.test(s)) return "new";
    return "unknown";
  }

  function shapeFromIllumination(kPct) {
    var k = clamp(kPct, 0, 100);
    if (k <= 3) return "new";
    if (k < 40) return "crescent";
    if (k < 60) return "quarter";
    if (k < 97) return "gibbous";
    return "full";
  }

  function hemisphereFromLat(lat) {
    if (lat == null || !isFinite(Number(lat))) return "unspecified";
    return Number(lat) < 0 ? "S" : "N";
  }

  /**
   * Northern-hemisphere convention: waxing is lit on the right (west limb of sky / east of disk).
   * Southern hemisphere reverses the apparent disk.
   */
  function litSideFor(limb, hemisphere) {
    var hemi = hemisphere === "S" ? "S" : "N";
    if (limb === "full") return "both";
    if (limb === "new") return "none";
    if (limb === "unknown") return "unspecified";
    var waxingRight = hemi === "N";
    if (limb === "waxing") return waxingRight ? "right" : "left";
    if (limb === "waning") return waxingRight ? "left" : "right";
    return "unspecified";
  }

  function parseLat(input) {
    if (!input) return null;
    if (input.lat != null && isFinite(Number(input.lat))) return Number(input.lat);
    if (input.latitude != null && isFinite(Number(input.latitude))) return Number(input.latitude);
    var loc = input.location || input.meta || {};
    if (loc.lat != null && isFinite(Number(loc.lat))) return Number(loc.lat);
    if (loc.latitude != null && isFinite(Number(loc.latitude))) return Number(loc.latitude);
    return null;
  }

  function parsePhaseValue(input) {
    if (!input) return null;
    if (input.phaseValue != null) return wrapPhase(input.phaseValue);
    if (input.moonPhaseValue != null) return wrapPhase(input.moonPhaseValue);
    return null;
  }

  function parseIllumination(input) {
    if (!input) return null;
    var raw = input.illumination != null ? input.illumination : input.moonIllumination;
    if (raw == null) return null;
    var n = Number(raw);
    if (!isFinite(n)) return null;
    if (n > 0 && n <= 1 && String(raw).indexOf("%") < 0) {
      /* Ambiguous 0–1 vs 0–100. Treat values ≤1 as fraction only when not an integer percent. */
      if (n !== 1 && n < 1) n = n * 100;
    }
    return Math.round(clamp(n, 0, 100));
  }

  /**
   * Canonical lunar state. Prefer phaseValue (lunation 0–1) when present so
   * label, illumination, and limb cannot drift apart.
   */
  function normalize(input, options) {
    options = options || {};
    input = input || {};
    var phaseValue = parsePhaseValue(input);
    var illumination = parseIllumination(input);
    var named = input.phase || input.moonPhase || null;
    var lat = options.lat != null ? options.lat : parseLat(options) || parseLat(input);
    var hemisphere = hemisphereFromLat(lat);
    var orientationKnown = hemisphere !== "unspecified";

    if (phaseValue != null) {
      var meta = phaseMetaFromValue(phaseValue);
      illumination = illuminationFromPhaseValue(phaseValue);
      named = meta.label;
      var limb = limbFromPhaseValue(phaseValue);
      return finishState({
        phaseValue: phaseValue,
        illumination: illumination,
        phase: named,
        phaseKey: meta.key,
        limb: limb,
        hemisphere: hemisphere,
        orientationKnown: orientationKnown
      });
    }

    var limbFromName = limbFromPhaseName(named);
    if (illumination == null && named) {
      if (limbFromName === "new") illumination = 0;
      else if (limbFromName === "full") illumination = 100;
      else if (/quarter/.test(String(named).toLowerCase())) illumination = 50;
    }
    if (illumination == null && !named) return null;

    illumination = illumination == null ? 0 : illumination;
    var limb = limbFromName;
    if (limb === "unknown" || limb === "new" || limb === "full") {
      if (illumination <= 3) limb = limb === "unknown" ? "unknown" : limb;
      else if (illumination >= 97) limb = "full";
    }
    var phaseKey = phaseKeyFromLimbAndIllum(limb, illumination, named);
    var phase = named ? String(named) : labelFromKey(phaseKey);
    return finishState({
      phaseValue: null,
      illumination: illumination,
      phase: phase,
      phaseKey: phaseKey,
      limb: limb,
      hemisphere: hemisphere,
      orientationKnown: orientationKnown && limb !== "unknown"
    });
  }

  function phaseKeyFromLimbAndIllum(limb, illum, named) {
    var fromName = String(named || "").toLowerCase();
    if (/first quarter/.test(fromName)) return "first-quarter";
    if (/last quarter|third quarter/.test(fromName)) return "last-quarter";
    if (limb === "new" || illum <= 3) return "new";
    if (limb === "full" || illum >= 97) return "full";
    if (limb === "waxing") {
      if (illum < 40) return "waxing-crescent";
      if (illum < 60) return "first-quarter";
      return "waxing-gibbous";
    }
    if (limb === "waning") {
      if (illum < 40) return "waning-crescent";
      if (illum < 60) return "last-quarter";
      return "waning-gibbous";
    }
    return shapeFromIllumination(illum);
  }

  function labelFromKey(key) {
    var i;
    for (i = 0; i < PHASES.length; i += 1) {
      if (PHASES[i].key === key) return PHASES[i].label;
    }
    return "Moon";
  }

  function finishState(partial) {
    var k = clamp(partial.illumination, 0, 100) / 100;
    var limb = partial.limb;
    var litSide = litSideFor(limb, partial.hemisphere);
    var shape = shapeFromIllumination(partial.illumination);
    var terminatorScale = Math.abs(1 - 2 * k);
    return {
      phase: partial.phase,
      phaseKey: partial.phaseKey,
      illumination: Math.round(clamp(partial.illumination, 0, 100)),
      illuminationFraction: Math.round(k * 1000) / 1000,
      limb: limb,
      waxing: limb === "waxing",
      waning: limb === "waning",
      litSide: litSide,
      shape: shape,
      terminatorScale: Math.round(terminatorScale * 1000) / 1000,
      phaseValue: partial.phaseValue,
      hemisphere: partial.hemisphere,
      orientationKnown: !!partial.orientationKnown && litSide !== "unspecified",
      almostDark: partial.illumination <= 3,
      half: partial.illumination >= 45 && partial.illumination <= 55,
      full: partial.illumination >= 97
    };
  }

  /**
   * Geometric lit test in unit-disk coords (x right, y up, x²+y² ≤ 1).
   * Orthographic terminator: x_term = s * (1 − 2k) * sqrt(1 − y²)
   * Waxing / right-lit: lit when x >= term. Waning / left-lit: mirrored.
   */
  function isLitAt(x, y, state) {
    if (!state) return false;
    var r2 = x * x + y * y;
    if (r2 > 1.0001) return false;
    var k = clamp(state.illumination, 0, 100) / 100;
    if (k <= 0.001) return false;
    if (k >= 0.999) return true;
    var litSide = state.litSide;
    if (litSide === "both") return true;
    if (litSide === "none") return false;
    var sqrt = Math.sqrt(Math.max(0, 1 - y * y));
    var s = litSide === "left" ? -1 : 1;
    /* unspecified limb: still show area fraction, but do not claim a sky direction */
    if (litSide === "unspecified") s = 1;
    return s * x >= (1 - 2 * k) * sqrt - 1e-9;
  }

  function visualState(state) {
    if (!state) return null;
    var samples = [];
    var pts = [
      { id: "center", x: 0, y: 0 },
      { id: "right", x: 0.72, y: 0 },
      { id: "left", x: -0.72, y: 0 },
      { id: "far-right", x: 0.97, y: 0 },
      { id: "far-left", x: -0.97, y: 0 }
    ];
    var i;
    for (i = 0; i < pts.length; i += 1) {
      samples.push({
        id: pts[i].id,
        lit: isLitAt(pts[i].x, pts[i].y, state)
      });
    }
    return {
      illumination: state.illumination,
      limb: state.limb,
      litSide: state.litSide,
      shape: state.shape,
      almostDark: state.almostDark,
      half: state.half,
      full: state.full,
      terminatorScale: state.terminatorScale,
      samples: samples,
      pathSignature: pathSignature(state)
    };
  }

  function pathSignature(state) {
    if (!state) return "";
    return [
      state.phaseKey,
      state.illumination,
      state.limb,
      state.litSide,
      state.shape
    ].join("|");
  }

  function litPath(cx, cy, r, state) {
    var k = clamp(state.illumination, 0, 100) / 100;
    if (k <= 0.005) return "";
    if (k >= 0.995) {
      return "M " + (cx - r) + " " + cy + " a " + r + " " + r + " 0 1 1 " + r * 2 + " 0 a " + r + " " + r + " 0 1 1 " + -r * 2 + " 0";
    }
    var litRight = state.litSide !== "left";
    var limbSweep = litRight ? 1 : 0;
    var rx = Math.max(0.35, r * Math.abs(2 * k - 1));
    var crescent = k < 0.5;
    var termSweep = crescent ? limbSweep : 1 - limbSweep;
    var top = cy - r;
    var bot = cy + r;
    return (
      "M " +
      cx +
      " " +
      top +
      " A " +
      r +
      " " +
      r +
      " 0 0 " +
      limbSweep +
      " " +
      cx +
      " " +
      bot +
      " A " +
      rx +
      " " +
      r +
      " 0 0 " +
      termSweep +
      " " +
      cx +
      " " +
      top +
      " Z"
    );
  }

  function renderDisk(state, options) {
    options = options || {};
    if (!state) return "";
    clipSeq += 1;
    var id = "wdb-lunar-" + clipSeq;
    var cx = 50;
    var cy = 50;
    var r = 44;
    var k = clamp(state.illumination, 0, 100) / 100;
    var path = litPath(cx, cy, r, state);
    var glow = Math.round(Math.min(0.55, 0.06 + k * 0.42) * 100) / 100;
    var litOpacity = state.almostDark ? 0.55 : 1;
    var clip =
      path && !state.full
        ? '<clipPath id="' +
          id +
          '-lit"><path d="' +
          path +
          '"/></clipPath>'
        : "";
    var litGroupOpen = path && !state.full ? '<g clip-path="url(#' + id + '-lit)">' : "<g>";
    var maria =
      litGroupOpen +
      '<circle cx="50" cy="50" r="44" fill="url(#' +
      id +
      '-litgrad)" opacity="' +
      litOpacity +
      '"/>' +
      '<ellipse cx="38" cy="42" rx="11" ry="8" fill="#6d6a78" opacity="0.22"/>' +
      '<ellipse cx="58" cy="36" rx="7" ry="5.5" fill="#5c5a68" opacity="0.18"/>' +
      '<ellipse cx="54" cy="58" rx="9" ry="7" fill="#636070" opacity="0.16"/>' +
      '<circle cx="42" cy="62" r="3.2" fill="#4a4754" opacity="0.2"/>' +
      '<circle cx="61" cy="48" r="2.4" fill="#4a4754" opacity="0.16"/>' +
      "</g>";
    var litPathEl =
      path && !state.full && !state.almostDark
        ? '<path class="wdb-r-lunar__terminator" d="' +
          path +
          '" fill="none" stroke="rgba(236,230,214,0.28)" stroke-width="0.9"/>'
        : "";
    if (state.full) {
      litPathEl = "";
    }
    return (
      '<svg class="wdb-r-lunar__svg" viewBox="0 0 100 100" width="' +
      (options.size || 72) +
      '" height="' +
      (options.size || 72) +
      '" aria-hidden="true" focusable="false"' +
      ' data-lunar-phase="' +
      String(state.phaseKey) +
      '" data-lunar-illumination="' +
      String(state.illumination) +
      '" data-lunar-limb="' +
      String(state.limb) +
      '" data-lunar-lit-side="' +
      String(state.litSide) +
      '" data-lunar-shape="' +
      String(state.shape) +
      '" data-lunar-signature="' +
      pathSignature(state) +
      '">' +
      "<defs>" +
      '<radialGradient id="' +
      id +
      '-litgrad" cx="38%" cy="32%" r="70%">' +
      '<stop offset="0%" stop-color="#f4efe2"/>' +
      '<stop offset="55%" stop-color="#d9d0c0"/>' +
      '<stop offset="100%" stop-color="#b7ad9c"/>' +
      "</radialGradient>" +
      clip +
      "</defs>" +
      '<circle class="wdb-r-lunar__glow" cx="50" cy="50" r="48" fill="rgba(196,184,255,' +
      glow +
      ')"/>' +
      '<circle class="wdb-r-lunar__unlit" cx="50" cy="50" r="44" fill="#1a1228"/>' +
      maria +
      litPathEl +
      '<circle class="wdb-r-lunar__rim" cx="50" cy="50" r="44" fill="none" stroke="rgba(226,214,255,0.35)" stroke-width="1.1"/>' +
      "</svg>"
    );
  }

  function render(state, options) {
    if (!state) return "";
    return (
      '<div class="wdb-r-lunar" data-lunar-root' +
      ' data-lunar-phase="' +
      String(state.phaseKey) +
      '" data-lunar-illumination="' +
      String(state.illumination) +
      '" data-lunar-limb="' +
      String(state.limb) +
      '">' +
      '<div class="wdb-r-lunar__disk">' +
      renderDisk(state, options) +
      "</div>" +
      "</div>"
    );
  }

  function fromDaylight(dl, options) {
    if (!dl) return null;
    return normalize(
      {
        phase: dl.moonPhase,
        illumination: dl.moonIllumination,
        phaseValue: dl.moonPhaseValue,
        lat: options && options.lat
      },
      options
    );
  }

  global.WDS = global.WDS || {};
  global.WDS.dashboardLunar = {
    version: "1.0.0-moon-accuracy",
    FIXTURES: FIXTURES,
    normalize: normalize,
    fromDaylight: fromDaylight,
    render: render,
    renderDisk: renderDisk,
    visualState: visualState,
    isLitAt: isLitAt,
    illuminationFromPhaseValue: illuminationFromPhaseValue,
    phaseMetaFromValue: phaseMetaFromValue,
    limbFromPhaseValue: limbFromPhaseValue,
    shapeFromIllumination: shapeFromIllumination
  };
})(typeof window !== "undefined" ? window : global);
