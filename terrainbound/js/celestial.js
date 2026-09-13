/**
 * Lightweight celestial time for TerrainBound.
 * Teaching-scale Sun, Moon, shadows, seasons, and Kepler orbits.
 * Deterministic. Not a professional astronomy engine.
 */

export const MINUTES_PER_DAY = 1440;
export const DAYS_PER_YEAR = 365;
export const SYNODIC_DAYS = 29.53059;
export const AXIAL_TILT_DEG = 23.44;
export const EARTH_E = 0.0167;
export const PERIHELION_DOY = 3;
export const MOON_ORBIT_TILT_DEG = 5.1;
export const GNOMON_M = 1;
export const MU_AU = 4 * Math.PI * Math.PI;
export const DEFAULT_LAT = 34.52;

const PHASE_NAMES = [
  "new",
  "waxing crescent",
  "first quarter",
  "waxing gibbous",
  "full",
  "waning gibbous",
  "last quarter",
  "waning crescent"
];

function wrapDeg(d) {
  return ((d % 360) + 360) % 360;
}

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export function createSkyState(overrides = {}) {
  return {
    minutes: overrides.minutes ?? 10 * MINUTES_PER_DAY + 8 * 60,
    nodeDeg: overrides.nodeDeg ?? 18,
    tiltDeg: overrides.tiltDeg ?? MOON_ORBIT_TILT_DEG
  };
}

export function dayOfYear(minutes) {
  const days = minutes / MINUTES_PER_DAY;
  return ((days % DAYS_PER_YEAR) + DAYS_PER_YEAR) % DAYS_PER_YEAR;
}

export function hourOfDay(minutes) {
  const m = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return m / 60;
}

export function calendarLabel(minutes) {
  const doy = dayOfYear(minutes);
  const monthDays = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const names = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let left = Math.floor(doy) + 1;
  let month = 0;
  while (month < 12 && left > monthDays[month]) {
    left -= monthDays[month];
    month += 1;
  }
  const hour = hourOfDay(minutes);
  const h = Math.floor(hour);
  const min = Math.round((hour - h) * 60) % 60;
  const hh = String(h).padStart(2, "0");
  const mm = String(min).padStart(2, "0");
  return `${names[month]} ${left} · ${hh}:${mm}`;
}

export function solarDeclinationDeg(doy) {
  return AXIAL_TILT_DEG * Math.sin((2 * Math.PI * (doy - 80)) / DAYS_PER_YEAR);
}

export function sunPosition(minutes, latDeg = DEFAULT_LAT) {
  const doy = dayOfYear(minutes);
  const hour = hourOfDay(minutes);
  const delta = (solarDeclinationDeg(doy) * Math.PI) / 180;
  const lat = (latDeg * Math.PI) / 180;
  const H = (((hour - 12) * 15) * Math.PI) / 180;
  const sinAlt = Math.sin(lat) * Math.sin(delta) + Math.cos(lat) * Math.cos(delta) * Math.cos(H);
  const alt = Math.asin(clamp(sinAlt, -1, 1));
  const cosAz =
    (Math.sin(delta) - Math.sin(alt) * Math.sin(lat)) / (Math.cos(alt) * Math.cos(lat) || 1e-9);
  let az = Math.acos(clamp(cosAz, -1, 1));
  if (H > 0) az = 2 * Math.PI - az;
  return {
    altitudeDeg: (alt * 180) / Math.PI,
    azimuthDeg: (az * 180) / Math.PI,
    hour,
    doy,
    declinationDeg: solarDeclinationDeg(doy)
  };
}

export function daylightHours(doy, latDeg = DEFAULT_LAT) {
  const delta = (solarDeclinationDeg(doy) * Math.PI) / 180;
  const lat = (latDeg * Math.PI) / 180;
  const arg = -Math.tan(lat) * Math.tan(delta);
  if (arg <= -1) return 24;
  if (arg >= 1) return 0;
  return (2 * Math.acos(clamp(arg, -1, 1)) * 180) / Math.PI / 15;
}

export function sunriseHour(doy, latDeg = DEFAULT_LAT) {
  const day = daylightHours(doy, latDeg);
  return 12 - day / 2;
}

export function sunsetHour(doy, latDeg = DEFAULT_LAT) {
  const day = daylightHours(doy, latDeg);
  return 12 + day / 2;
}

export function shadowFromSun(sun, gnomonM = GNOMON_M) {
  const directionDeg = wrapDeg(sun.azimuthDeg + 180);
  if (sun.altitudeDeg <= 0.4) {
    return { length: null, directionDeg, visible: false };
  }
  const length = gnomonM / Math.tan((sun.altitudeDeg * Math.PI) / 180);
  return { length, directionDeg, visible: true };
}

export function compassLabel(deg) {
  const names = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  const idx = Math.round(wrapDeg(deg) / 45) % 8;
  return names[idx];
}

export function earthSunDistanceAu(doy) {
  const frac = ((doy - PERIHELION_DOY + DAYS_PER_YEAR) % DAYS_PER_YEAR) / DAYS_PER_YEAR;
  const nu = 2 * Math.PI * frac;
  return (1 - EARTH_E * EARTH_E) / (1 + EARTH_E * Math.cos(nu));
}

export function seasonName(doy) {
  const d = ((doy % DAYS_PER_YEAR) + DAYS_PER_YEAR) % DAYS_PER_YEAR;
  if (d >= 355 || d < 80) return "winter";
  if (d < 172) return "spring";
  if (d < 266) return "summer";
  return "autumn";
}

export function seasonKey(doy) {
  const name = seasonName(doy);
  if (name === "winter") return "winter";
  if (name === "summer") return "summer";
  return "equinox";
}

export function namedSeasonDay(name) {
  if (name === "winter") return 10;
  if (name === "summer") return 172;
  return 80;
}

export function timeOfDayName(minutes, latDeg = DEFAULT_LAT) {
  const hour = hourOfDay(minutes);
  const doy = dayOfYear(minutes);
  const rise = sunriseHour(doy, latDeg);
  const set = sunsetHour(doy, latDeg);
  if (hour < rise - 0.4 || hour >= set + 0.4) return "night";
  if (Math.abs(hour - 12) <= 0.35) return "noon";
  if (hour < 11) return "morning";
  if (hour < set - 0.6) return "afternoon";
  return "sunset";
}

export function isNight(minutes, latDeg = DEFAULT_LAT) {
  return timeOfDayName(minutes, latDeg) === "night";
}

export function minutesForPhase(name, extraDays = 0) {
  const idx = Math.max(0, PHASE_NAMES.indexOf(name));
  const turn = idx / 8;
  return (turn * SYNODIC_DAYS + extraDays) * MINUTES_PER_DAY + 21.2 * 60;
}

export function moonPhase(minutes) {
  const age = ((minutes / MINUTES_PER_DAY) % SYNODIC_DAYS + SYNODIC_DAYS) % SYNODIC_DAYS;
  const turn = age / SYNODIC_DAYS;
  const phaseAngleDeg = turn * 360;
  const illumination = (1 - Math.cos((phaseAngleDeg * Math.PI) / 180)) / 2;
  const idx = Math.round(turn * 8) % 8;
  return {
    age,
    illumination,
    name: PHASE_NAMES[idx],
    phaseAngleDeg,
    waxing: turn < 0.5
  };
}

export function moonPosition(minutes, latDeg = DEFAULT_LAT, tiltDeg = MOON_ORBIT_TILT_DEG) {
  const sun = sunPosition(minutes, latDeg);
  const moon = moonPhase(minutes);
  const moonHour = (sun.hour + moon.phaseAngleDeg / 15 + 24) % 24;
  const moonMinutes = Math.floor(dayOfYear(minutes)) * MINUTES_PER_DAY + moonHour * 60;
  const fakeSun = sunPosition(moonMinutes, latDeg);
  const latOffset = tiltDeg * Math.sin(((moon.phaseAngleDeg - 18) * Math.PI) / 180);
  return {
    ...moon,
    altitudeDeg: fakeSun.altitudeDeg + latOffset * 0.15,
    azimuthDeg: fakeSun.azimuthDeg,
    hour: moonHour
  };
}

export function eclipseGeometry(minutes, tiltDeg = MOON_ORBIT_TILT_DEG, nodeDeg = 18) {
  const moon = moonPhase(minutes);
  const orbitAngle = moon.phaseAngleDeg;
  const moonLat = tiltDeg * Math.sin(((orbitAngle - nodeDeg) * Math.PI) / 180);
  const nearNode = Math.abs(moonLat) < 1.6;
  const isNew = moon.illumination < 0.06;
  const isFull = moon.illumination > 0.94;
  const solar = isNew && nearNode;
  const lunar = isFull && nearNode;
  const umbra = (solar || lunar) && Math.abs(moonLat) < 0.7;
  const penumbra = (solar || lunar) && !umbra;
  return {
    moonLat,
    nearNode,
    isNew,
    isFull,
    solar,
    lunar,
    umbra,
    penumbra,
    monthlyIfNoTilt: tiltDeg < 0.2,
    reason:
      tiltDeg < 0.2
        ? "With no tilt, new and full Moon line up every month."
        : nearNode
          ? "The Moon is near a node, so the shadows can meet."
          : "The Moon's path is tilted, so the shadows usually miss."
  };
}

export function tidalKind(moon) {
  if (moon.illumination < 0.12 || moon.illumination > 0.88) return "spring";
  if (Math.abs(moon.illumination - 0.5) < 0.12) return "neap";
  return "mid";
}

export function tidalRangeM(moon) {
  const kind = tidalKind(moon);
  if (kind === "spring") return 2.8;
  if (kind === "neap") return 1.1;
  return 1.8;
}

export function setHour(state, hour, latDeg = DEFAULT_LAT) {
  const doy = Math.floor(dayOfYear(state.minutes));
  let h = hour;
  if (hour === "sunrise") h = sunriseHour(doy, latDeg);
  if (hour === "sunset") h = sunsetHour(doy, latDeg);
  if (hour === "morning") h = 8;
  if (hour === "noon") h = 12;
  if (hour === "afternoon") h = 15.5;
  if (hour === "night") h = 21.2;
  state.minutes = doy * MINUTES_PER_DAY + h * 60;
  return state;
}

export function addHours(state, hours) {
  state.minutes += hours * 60;
  return state;
}

export function addDays(state, days) {
  state.minutes += days * MINUTES_PER_DAY;
  return state;
}

export function skySnapshot(state, latDeg = DEFAULT_LAT) {
  const sun = sunPosition(state.minutes, latDeg);
  const shadow = shadowFromSun(sun);
  const moon = moonPosition(state.minutes, latDeg, state.tiltDeg);
  const doy = dayOfYear(state.minutes);
  const night = isNight(state.minutes, latDeg);
  return {
    minutes: state.minutes,
    label: calendarLabel(state.minutes),
    doy,
    hour: hourOfDay(state.minutes),
    season: seasonName(doy),
    seasonKey: seasonKey(doy),
    sun,
    shadow,
    moon,
    night,
    timeName: timeOfDayName(state.minutes, latDeg),
    daylight: daylightHours(doy, latDeg),
    earthSunAu: earthSunDistanceAu(doy),
    eclipse: eclipseGeometry(state.minutes, state.tiltDeg, state.nodeDeg)
  };
}

export function periodFromA(a) {
  return Math.pow(a, 1.5);
}

export function aFromPeriod(period) {
  return Math.pow(period, 2 / 3);
}

export function keplerCheck(a, predictedP, tolerance = 0.08) {
  const actual = periodFromA(a);
  const ok = Math.abs(predictedP - actual) <= tolerance * actual;
  return { actual, predicted: predictedP, ok, residual: predictedP - actual };
}

export function orbitPoint({ a = 1, e = 0, nuDeg = 0, mu = MU_AU }) {
  const eClamped = clamp(e, 0, 0.7);
  const nu = (nuDeg * Math.PI) / 180;
  const r = (a * (1 - eClamped * eClamped)) / (1 + eClamped * Math.cos(nu));
  const v = Math.sqrt(mu * (2 / r - 1 / a));
  return {
    r,
    v,
    x: r * Math.cos(nu),
    y: r * Math.sin(nu),
    peri: a * (1 - eClamped),
    apo: a * (1 + eClamped),
    e: eClamped,
    a,
    nuDeg: wrapDeg(nuDeg)
  };
}

export function advanceTrueAnomaly(nuDeg, a, e, dtYears, mu = MU_AU) {
  const steps = 24;
  let nu = nuDeg;
  const dt = dtYears / steps;
  for (let i = 0; i < steps; i += 1) {
    const p = orbitPoint({ a, e, nuDeg: nu, mu });
    const dNu = ((p.v / p.r) * dt * 180) / Math.PI;
    nu = wrapDeg(nu + dNu);
  }
  return nu;
}

export function equalAreaSectors({ a, e, dtYears = 0.08 }) {
  const peri = orbitPoint({ a, e, nuDeg: 0 });
  const apo = orbitPoint({ a, e, nuDeg: 180 });
  const periEnd = advanceTrueAnomaly(0, a, e, dtYears);
  const apoEnd = advanceTrueAnomaly(180, a, e, dtYears);
  return {
    peri,
    apo,
    periSweep: wrapDeg(periEnd),
    apoSweep: wrapDeg(apoEnd - 180),
    periFaster: peri.v > apo.v
  };
}

export const PLANETS = [
  { id: "mercury", name: "Mercury", radius: 0.38, mass: 0.055, density: 5.4, a: 0.39, p: 0.24, kind: "rocky" },
  { id: "venus", name: "Venus", radius: 0.95, mass: 0.82, density: 5.2, a: 0.72, p: 0.62, kind: "rocky" },
  { id: "earth", name: "Earth", radius: 1, mass: 1, density: 5.5, a: 1, p: 1, kind: "rocky" },
  { id: "mars", name: "Mars", radius: 0.53, mass: 0.11, density: 3.9, a: 1.52, p: 1.88, kind: "rocky" },
  { id: "jupiter", name: "Jupiter", radius: 11.2, mass: 318, density: 1.3, a: 5.2, p: 11.9, kind: "giant" },
  { id: "saturn", name: "Saturn", radius: 9.4, mass: 95, density: 0.7, a: 9.6, p: 29.5, kind: "giant" }
];

export function planetPeriodTrend(planets = PLANETS) {
  const sorted = [...planets].sort((a, b) => a.a - b.a);
  let increasing = true;
  for (let i = 1; i < sorted.length; i += 1) {
    if (sorted[i].p <= sorted[i - 1].p) increasing = false;
  }
  return { increasing, farthest: sorted[sorted.length - 1], nearest: sorted[0] };
}

export function rockyFromDensity(planets = PLANETS, cutoff = 3) {
  return planets.filter((item) => item.density >= cutoff).map((item) => item.id);
}

export function drawOrbitModel(ctx, width, height, model) {
  const { a = 1, e = 0.4, nuDeg = 40, sectors = false } = model || {};
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#1a2430";
  ctx.fillRect(0, 0, width, height);
  const cx = width * 0.46;
  const cy = height * 0.52;
  const scale = Math.min(width, height) * 0.32 / Math.max(a * (1 + e), 1);
  const focusX = cx;
  const focusY = cy;
  ctx.strokeStyle = "rgba(220, 210, 180, 0.85)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i <= 72; i += 1) {
    const p = orbitPoint({ a, e, nuDeg: (i / 72) * 360 });
    const x = focusX + p.x * scale;
    const y = focusY + p.y * scale;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.fillStyle = "#f0c44c";
  ctx.beginPath();
  ctx.arc(focusX, focusY, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#f4efe2";
  ctx.font = "11px Trebuchet MS, sans-serif";
  ctx.fillText("Sun", focusX + 10, focusY - 8);
  const body = orbitPoint({ a, e, nuDeg });
  ctx.fillStyle = "#8aa0d0";
  ctx.beginPath();
  ctx.arc(focusX + body.x * scale, focusY + body.y * scale, 6, 0, Math.PI * 2);
  ctx.fill();
  if (sectors) {
    const sec = equalAreaSectors({ a, e });
    ctx.fillStyle = "rgba(240, 196, 76, 0.22)";
    ctx.beginPath();
    ctx.moveTo(focusX, focusY);
    for (let ang = 0; ang <= sec.periSweep; ang += 4) {
      const p = orbitPoint({ a, e, nuDeg: ang });
      ctx.lineTo(focusX + p.x * scale, focusY + p.y * scale);
    }
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "rgba(138, 160, 208, 0.22)";
    ctx.beginPath();
    ctx.moveTo(focusX, focusY);
    for (let ang = 180; ang <= 180 + sec.apoSweep; ang += 4) {
      const p = orbitPoint({ a, e, nuDeg: ang });
      ctx.lineTo(focusX + p.x * scale, focusY + p.y * scale);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#d8c8a0";
  ctx.font = "12px Trebuchet MS, sans-serif";
  ctx.fillText(`e = ${e.toFixed(2)}  r = ${body.r.toFixed(2)}  speed ${body.v.toFixed(2)}`, 12, 18);
}

export function drawMoonGeometry(ctx, width, height, moon) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#1a2430";
  ctx.fillRect(0, 0, width, height);
  const sunX = 36;
  const earthX = width * 0.42;
  const cy = height * 0.55;
  const ang = ((moon?.phaseAngleDeg || 0) * Math.PI) / 180;
  const moonX = earthX + Math.cos(ang) * 70;
  const moonY = cy + Math.sin(ang) * 42;
  ctx.fillStyle = "#f0c44c";
  ctx.beginPath();
  ctx.arc(sunX, cy, 14, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5a8fbe";
  ctx.beginPath();
  ctx.arc(earthX, cy, 12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d8d0c0";
  ctx.beginPath();
  ctx.arc(moonX, moonY, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(20, 24, 36, 0.72)";
  ctx.beginPath();
  ctx.arc(moonX, moonY, 8, Math.PI / 2, (3 * Math.PI) / 2);
  ctx.fill();
  ctx.fillStyle = "#f4efe2";
  ctx.font = "11px Trebuchet MS, sans-serif";
  ctx.fillText("Sun", sunX - 10, cy + 28);
  ctx.fillText("Earth", earthX - 14, cy + 28);
  ctx.fillText("Moon", moonX - 12, moonY + 22);
  ctx.fillText("Half the Moon is lit. The phase is the geometry we see.", 12, 18);
}

export function drawEclipseGeometry(ctx, width, height, geo) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#1a2430";
  ctx.fillRect(0, 0, width, height);
  const cy = height * 0.52;
  ctx.fillStyle = "#f0c44c";
  ctx.beginPath();
  ctx.arc(40, cy, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#5a8fbe";
  ctx.beginPath();
  ctx.arc(width * 0.48, cy, 14, 0, Math.PI * 2);
  ctx.fill();
  const tilt = geo?.moonLat || 0;
  const moonY = cy + tilt * 7;
  ctx.fillStyle = "#d8d0c0";
  ctx.beginPath();
  ctx.arc(width * 0.78, moonY, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(240, 196, 76, 0.35)";
  ctx.beginPath();
  ctx.moveTo(56, cy);
  ctx.lineTo(width - 24, cy);
  ctx.stroke();
  ctx.fillStyle = "rgba(20, 16, 28, 0.45)";
  ctx.beginPath();
  ctx.moveTo(width * 0.48 + 14, cy - 6);
  ctx.lineTo(width * 0.92, cy - 18);
  ctx.lineTo(width * 0.92, cy + 18);
  ctx.lineTo(width * 0.48 + 14, cy + 6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f4efe2";
  ctx.font = "12px Trebuchet MS, sans-serif";
  ctx.fillText(geo?.reason || "Tilt decides whether shadows meet.", 12, 18);
}

export function starField(seed, count = 80) {
  let a = seed >>> 0 || 2210;
  const rand = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: count }, () => ({
    x: rand(),
    y: rand() * 0.62,
    s: 0.6 + rand() * 1.4
  }));
}
