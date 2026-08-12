/**
 * Dashboard Rebuild — canonical lunar state + orthographic MoonPhase disk.
 * Single source of truth for phase label, illumination %, limb, and geometry.
 * Authority: live daylight / moon package. Printed illumination drives the mask.
 *
 * Disk fraction k (0–1) equals spherical phase function k = (1 + cos α) / 2.
 * Terminator offset along the limb-to-limb axis is cos α = 2k − 1.
 * Lit region (waxing / right): x >= (1 − 2k) * sqrt(1 − y²) in a unit disk.
 */
(function (global) {
  "use strict";

  var clipSeq = 0;
  var PATH_SAMPLES = 72;

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

  /**
   * Deterministic fixtures: illumination 0–100 with waxing and waning limbs.
   * 0% and 100% are nodes (new / full). 3% must render a sliver, never a gibbous.
   */
  var FIXTURES = [
    { id: "new-0", name: "New Moon 0%", phaseValue: 0, illumination: 0, phase: "New moon", limb: "new" },
    { id: "wax-3", name: "Waxing 3%", phaseValue: 0.015, illumination: 3, phase: "New moon", limb: "waxing" },
    { id: "wan-3", name: "Waning 3%", phaseValue: 0.985, illumination: 3, phase: "New moon", limb: "waning" },
    { id: "wax-10", name: "Waxing Crescent 10%", phaseValue: 0.05, illumination: 10, phase: "Waxing crescent", limb: "waxing" },
    { id: "wan-10", name: "Waning Crescent 10%", phaseValue: 0.95, illumination: 10, phase: "Waning crescent", limb: "waning" },
    { id: "wax-25", name: "Waxing Crescent 25%", phaseValue: 0.125, illumination: 25, phase: "Waxing crescent", limb: "waxing" },
    { id: "wan-25", name: "Waning Crescent 25%", phaseValue: 0.875, illumination: 25, phase: "Waning crescent", limb: "waning" },
    { id: "wax-50", name: "First Quarter 50%", phaseValue: 0.25, illumination: 50, phase: "First quarter", limb: "waxing" },
    { id: "wan-50", name: "Last Quarter 50%", phaseValue: 0.75, illumination: 50, phase: "Last quarter", limb: "waning" },
    { id: "wax-75", name: "Waxing Gibbous 75%", phaseValue: 0.375, illumination: 75, phase: "Waxing gibbous", limb: "waxing" },
    { id: "wan-75", name: "Waning Gibbous 75%", phaseValue: 0.625, illumination: 75, phase: "Waning gibbous", limb: "waning" },
    { id: "wax-90", name: "Waxing Gibbous 90%", phaseValue: 0.45, illumination: 90, phase: "Waxing gibbous", limb: "waxing" },
    { id: "wan-90", name: "Waning Gibbous 90%", phaseValue: 0.55, illumination: 90, phase: "Waning gibbous", limb: "waning" },
    { id: "wax-97", name: "Waxing 97%", phaseValue: 0.485, illumination: 97, phase: "Full moon", limb: "waxing" },
    { id: "wan-97", name: "Waning 97%", phaseValue: 0.515, illumination: 97, phase: "Full moon", limb: "waning" },
    { id: "full-100", name: "Full Moon 100%", phaseValue: 0.5, illumination: 100, phase: "Full moon", limb: "full" }
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

  function phaseAngleRad(k) {
    var c = clamp(2 * k - 1, -1, 1);
    return Math.acos(c);
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
    if (k < 0.5) return "new";
    if (k < 40) return "crescent";
    if (k < 60) return "quarter";
    if (k < 99.5) return "gibbous";
    return "full";
  }

  function hemisphereFromLat(lat) {
    if (lat == null || !isFinite(Number(lat))) return "unspecified";
    return Number(lat) < 0 ? "S" : "N";
  }

  /**
   * Northern-hemisphere convention: waxing is lit on the right.
   * Southern hemisphere reverses the apparent disk.
   * Hemisphere is not inferred from live data unless lat is present.
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
      if (n !== 1 && n < 1) n = n * 100;
    }
    return Math.round(clamp(n, 0, 100));
  }

  /**
   * Canonical lunar state. Printed illumination is authoritative for the mask.
   * phaseValue (when present) drives limb / waxing-waning / phase label.
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
      if (illumination == null) illumination = illuminationFromPhaseValue(phaseValue);
      named = named || meta.label;
      if (!named) named = meta.label;
      if (phaseValue >= 0.97 || phaseValue < 0.03) named = meta.label;
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
    if ((limb === "new" || illum < 0.5) && illum <= 3) return "new";
    if (limb === "full" || illum >= 99.5) return "full";
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
    if (k <= 0.002) limb = "new";
    else if (k >= 0.998) limb = "full";
    else if (limb === "new" || limb === "full") {
      if (partial.phaseValue != null) limb = limbFromPhaseValue(partial.phaseValue);
      if (limb === "new" || limb === "full") {
        limb = partial.phaseValue != null && partial.phaseValue >= 0.5 ? "waning" : "waxing";
      }
    }
    var litSide = litSideFor(limb, partial.hemisphere);
    var shape = shapeFromIllumination(partial.illumination);
    var cosAlpha = 1 - 2 * k;
    var alpha = phaseAngleRad(k);
    return {
      phase: partial.phase,
      phaseKey: partial.phaseKey,
      illumination: Math.round(clamp(partial.illumination, 0, 100)),
      illuminationFraction: Math.round(k * 1000) / 1000,
      phaseAngle: Math.round(alpha * 1000) / 1000,
      cosPhaseAngle: Math.round(clamp(2 * k - 1, -1, 1) * 1000) / 1000,
      limb: limb,
      waxing: limb === "waxing",
      waning: limb === "waning",
      litSide: litSide,
      shape: shape,
      terminatorScale: Math.round(Math.abs(cosAlpha) * 1000) / 1000,
      phaseValue: partial.phaseValue,
      hemisphere: partial.hemisphere,
      orientationKnown: !!partial.orientationKnown && litSide !== "unspecified",
      almostDark: partial.illumination <= 3,
      half: partial.illumination >= 45 && partial.illumination <= 55,
      full: partial.illumination >= 99.5
    };
  }

  /**
   * Geometric lit test in unit-disk coords (x right, y up, x²+y² ≤ 1).
   * Orthographic terminator: x_term = (1 − 2k) * sqrt(1 − y²)
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
    if (litSide === "unspecified") s = 1;
    return s * x >= (1 - 2 * k) * sqrt - 1e-9;
  }

  function rasterLitFraction(state, size) {
    size = size || 201;
    if (!state) return 0;
    var cx = (size - 1) / 2;
    var r = cx;
    var lit = 0;
    var disk = 0;
    var y;
    var x;
    var u;
    var v;
    for (y = 0; y < size; y += 1) {
      for (x = 0; x < size; x += 1) {
        u = (x - cx) / r;
        v = (cx - y) / r;
        if (u * u + v * v > 1) continue;
        disk += 1;
        if (isLitAt(u, v, state)) lit += 1;
      }
    }
    return disk ? lit / disk : 0;
  }

  function litPolygon(cx, cy, r, state, samples) {
    var k = clamp(state.illumination, 0, 100) / 100;
    if (k <= 0.002) return [];
    if (k >= 0.998) return null;
    var n = samples || PATH_SAMPLES;
    var litRight = state.litSide !== "left";
    var pts = [];
    var i;
    var y;
    var half;
    var xLimb;
    var xTerm;
    for (i = 0; i <= n; i += 1) {
      y = 1 - (2 * i) / n;
      half = Math.sqrt(Math.max(0, 1 - y * y));
      xLimb = litRight ? half : -half;
      pts.push([cx + r * xLimb, cy - r * y]);
    }
    for (i = n; i >= 0; i -= 1) {
      y = 1 - (2 * i) / n;
      half = Math.sqrt(Math.max(0, 1 - y * y));
      xTerm = (1 - 2 * k) * half;
      if (!litRight) xTerm = -xTerm;
      pts.push([cx + r * xTerm, cy - r * y]);
    }
    return pts;
  }

  function polygonArea(pts) {
    if (!pts || pts.length < 3) return 0;
    var a = 0;
    var i;
    var j = pts.length - 1;
    for (i = 0; i < pts.length; j = i, i += 1) {
      a += pts[j][0] * pts[i][1] - pts[i][0] * pts[j][1];
    }
    return Math.abs(a) / 2;
  }

  function pointInPolygon(x, y, pts) {
    if (!pts || !pts.length) return false;
    var inside = false;
    var j = pts.length - 1;
    var i;
    for (i = 0; i < pts.length; i += 1) {
      var xi = pts[i][0];
      var yi = pts[i][1];
      var xj = pts[j][0];
      var yj = pts[j][1];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 0.0) + xi) {
        inside = !inside;
      }
      j = i;
    }
    return inside;
  }

  function pathAreaFraction(state, r) {
    r = r || 44;
    var k = clamp(state.illumination, 0, 100) / 100;
    if (k <= 0.002) return 0;
    if (k >= 0.998) return 1;
    var pts = litPolygon(0, 0, r, state, PATH_SAMPLES);
    if (!pts) return 1;
    return polygonArea(pts) / (Math.PI * r * r);
  }

  function pathD(pts) {
    if (!pts || !pts.length) return "";
    var d = "M " + pts[0][0].toFixed(3) + " " + pts[0][1].toFixed(3);
    var i;
    for (i = 1; i < pts.length; i += 1) {
      d += " L " + pts[i][0].toFixed(3) + " " + pts[i][1].toFixed(3);
    }
    return d + " Z";
  }

  function litPath(cx, cy, r, state) {
    var k = clamp(state.illumination, 0, 100) / 100;
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
    return pathD(litPolygon(cx, cy, r, state, PATH_SAMPLES));
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
      pathSignature: pathSignature(state),
      rasterFraction: Math.round(rasterLitFraction(state, 121) * 1000) / 1000
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
    var isFull = k >= 0.998 || state.full;
    var hasLit = !!(path && k > 0.002);
    var clip =
      hasLit && !isFull
        ? '<clipPath id="' + id + '-lit"><path d="' + path + '"/></clipPath>'
        : "";
    var surface =
      hasLit
        ? '<g class="wdb-r-lunar__surface"' +
          (isFull ? ">" : ' clip-path="url(#' + id + '-lit)">') +
          '<circle class="wdb-r-lunar__lit" cx="50" cy="50" r="44" fill="url(#' +
          id +
          '-litgrad)"/>' +
          '<ellipse cx="38" cy="42" rx="11" ry="8" fill="#6d6a78" opacity="0.22"/>' +
          '<ellipse cx="58" cy="36" rx="7" ry="5.5" fill="#5c5a68" opacity="0.18"/>' +
          '<ellipse cx="54" cy="58" rx="9" ry="7" fill="#636070" opacity="0.16"/>' +
          '<circle cx="42" cy="62" r="3.2" fill="#4a4754" opacity="0.2"/>' +
          '<circle cx="61" cy="48" r="2.4" fill="#4a4754" opacity="0.16"/>' +
          "</g>"
        : "";
    var termStroke =
      hasLit && !isFull
        ? '<path class="wdb-r-lunar__terminator" d="' +
          path +
          '" fill="none" stroke="rgba(236,230,214,' +
          (state.almostDark ? "0.55" : "0.22") +
          ')" stroke-width="' +
          (state.almostDark ? "1.35" : "0.8") +
          '"/>'
        : "";
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
      '" data-lunar-crescent="' +
      (k < 0.5 && k > 0.002 ? "1" : "0") +
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
      '<circle class="wdb-r-lunar__unlit" cx="50" cy="50" r="44" fill="#07040c"/>' +
      surface +
      termStroke +
      '<circle class="wdb-r-lunar__rim" cx="50" cy="50" r="44" fill="none" stroke="rgba(226,214,255,' +
      (hasLit ? "0.14" : "0.08") +
      ')" stroke-width="0.8"/>' +
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

  var api = {
    version: "2.0.0-moon-phase",
    FIXTURES: FIXTURES,
    normalize: normalize,
    fromDaylight: fromDaylight,
    render: render,
    renderDisk: renderDisk,
    visualState: visualState,
    isLitAt: isLitAt,
    rasterLitFraction: rasterLitFraction,
    pathAreaFraction: pathAreaFraction,
    litPolygon: litPolygon,
    litPath: litPath,
    pointInPolygon: pointInPolygon,
    illuminationFromPhaseValue: illuminationFromPhaseValue,
    phaseMetaFromValue: phaseMetaFromValue,
    limbFromPhaseValue: limbFromPhaseValue,
    shapeFromIllumination: shapeFromIllumination,
    phaseAngleRad: phaseAngleRad
  };

  global.WDS = global.WDS || {};
  global.WDS.dashboardLunar = api;
  global.WDS.MoonPhase = api;
})(typeof window !== "undefined" ? window : global);
