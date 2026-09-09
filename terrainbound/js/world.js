/**
 * Region worlds: height, water, collision, inspectables, scatter details.
 * Cedar Hollow formulas stay on the hollow; High Country uses terrainModel.
 * Data-driven from region JSON. No DOM.
 */

function dist(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function polylineDistance(x, y, points) {
  let best = Infinity;
  for (let i = 0; i < points.length - 1; i += 1) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[i + 1];
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy || 1;
    let t = ((x - x1) * dx + (y - y1) * dy) / len2;
    t = Math.max(0, Math.min(1, t));
    best = Math.min(best, dist(x, y, x1 + dx * t, y1 + dy * t));
  }
  return best;
}

function cedarHollowHeight(region, x, y) {
  const peak = region.peak;
  const dPeak = dist(x, y, peak.x, peak.y);
  const mountain = Math.max(0, 1 - dPeak / 520);
  const north = 1 - y / region.height;
  const westLift = Math.max(0, 1 - dist(x, y, 640, 520) / 420) * 0.28;
  const hollow = Math.max(0, 1 - dist(x, y, 1100, 1180) / 380) * -0.22;
  const southDrop = (y / region.height) * -0.18;
  const stationShelf = Math.max(0, 1 - dist(x, y, 1760, 860) / 260) * 0.16;
  return Math.max(
    0,
    Math.min(1, north * 0.42 + mountain * 0.72 + westLift + hollow + southDrop + stationShelf)
  );
}

function highCountryHeight(region, x, y) {
  const south = y / region.height;
  const northLift = (1 - south) * 0.3;
  const westPeak = Math.max(0, 1 - dist(x, y, 520, 420) / 340) * 0.58;
  const radio = Math.max(0, 1 - dist(x, y, 1340, 220) / 260) * 0.5;
  const ridge = Math.max(0, 1 - dist(x, y, 1280, 500) / 300) * 0.32;
  const switchback = Math.max(0, 1 - dist(x, y, 540, 720) / 240) * 0.28;
  let h = 0.12 + northLift + westPeak + radio + ridge + switchback;
  if (x < 640 && y > 380 && y < 980) {
    h += 0.12 * Math.max(0, 1 - (640 - x) / 280);
  }
  const ldx = (x - 740) / 145;
  const ldy = (y - 1088) / 100;
  const lr = ldx * ldx + ldy * ldy;
  if (lr < 1) h -= 0.16 * (1 - Math.sqrt(Math.max(0, lr)));
  h -= Math.max(0, 1 - dist(x, y, 1880, 880) / 210) * 0.12;
  h -= Math.max(0, 1 - dist(x, y, 1988, 1140) / 300) * 0.06;
  h += Math.max(0, 1 - dist(x, y, 1280, 1560) / 240) * 0.05;
  return Math.max(0, Math.min(1, h));
}

export function heightAt(region, x, y) {
  if (region.terrainModel === "high-country" || region.id === "high-country") {
    return highCountryHeight(region, x, y);
  }
  return cedarHollowHeight(region, x, y);
}

export function inPond(region, x, y) {
  const p = region.pond;
  const dx = (x - p.cx) / p.rx;
  const dy = (y - p.cy) / p.ry;
  return dx * dx + dy * dy <= 1;
}

export function inWetland(region, x, y) {
  const w = region.wetland;
  if (!w) return false;
  const dx = (x - w.cx) / w.rx;
  const dy = (y - w.cy) / w.ry;
  return dx * dx + dy * dy <= 1;
}

export function inOutcrop(region, x, y) {
  const o = region.outcrop;
  if (!o) return false;
  return dist(x, y, o.x, o.y) < o.r;
}

export function inTributary(region, x, y) {
  const t = region.tributary;
  if (!t) return false;
  return polylineDistance(x, y, t.points) < t.width;
}

export function inCreek(region, x, y) {
  const creekW = region.creek.width;
  const outW = region.outlet.width;
  return (
    polylineDistance(x, y, region.creek.points) < creekW ||
    polylineDistance(x, y, region.outlet.points) < outW ||
    inPond(region, x, y) ||
    inTributary(region, x, y)
  );
}

export function onTrail(region, x, y) {
  return region.trails.some((trail) => polylineDistance(x, y, trail.points) < 22);
}

export function inStation(region, x, y) {
  const s = region.station;
  return x > s.x && x < s.x + s.w && y > s.y && y < s.y + s.h;
}

function hash01(x, y) {
  const n = Math.imul(Math.floor(x) + 374761393, 668265263) ^ Math.imul(Math.floor(y) + 127412617, 1103515245);
  return ((n >>> 0) % 1000) / 1000;
}

export function biomeWeights(region, x, y) {
  const h = heightAt(region, x, y);
  if (region.terrainModel === "high-country") {
    const treeline = h < 0.58;
    const forest = treeline ? Math.max(0, 1 - dist(x, y, 1100, 1400) / 380) * 0.55 : 0;
    const rock = Math.max(h > 0.5 ? (h - 0.5) / 0.5 : 0, inOutcrop(region, x, y) ? 0.9 : 0);
    const marsh = inWetland(region, x, y) ? 1 : 0;
    const soil = onTrail(region, x, y) ? 0.9 : 0;
    let water = 0;
    if (inCreek(region, x, y)) water = 1;
    const slope = Math.max(0, 1 - dist(x, y, 560, 720) / 220);
    const meadow = Math.max(0, 1 - dist(x, y, 1988, 1140) / 320);
    return {
      water,
      trail: soil,
      rock,
      marsh: marsh * (1 - water),
      forest,
      slope,
      meadow: meadow * 0.7 + Math.max(0, 1 - rock - marsh - forest * 0.5 - soil - water) * 0.35,
      height: h
    };
  }
  const woods = Math.max(0, 1 - dist(x, y, 560, 800) / 360);
  const meadow = Math.max(0, 1 - dist(x, y, 1500, 1180) / 280);
  const marsh = inWetland(region, x, y) ? 1 : Math.max(0, 1 - dist(x, y, region.wetland?.cx || 0, region.wetland?.cy || 0) / 210);
  const rock = Math.max(h > 0.62 ? (h - 0.62) / 0.38 : 0, inOutcrop(region, x, y) ? 0.85 : 0);
  const soil = onTrail(region, x, y) ? 0.9 : Math.max(0, 1 - dist(x, y, 1024, 1108) / 70) * 0.7;
  let water = 0;
  if (inCreek(region, x, y)) water = 1;
  const slope = Math.max(0, 1 - dist(x, y, 730, 540) / 240);
  const forest = Math.min(1, woods * 1.1);
  const grass = Math.max(0, 1 - rock - marsh * 0.8 - forest * 0.55 - soil - water);
  return {
    water,
    trail: soil,
    rock,
    marsh: marsh * (1 - water),
    forest,
    slope,
    meadow: meadow * 0.6 + grass * 0.4,
    height: h
  };
}

const PALETTE = {
  rockHi: [232, 224, 212],
  rockLo: [176, 160, 140],
  forest: [62, 122, 58],
  forestFloor: [86, 130, 62],
  slope: [132, 168, 72],
  meadow: [168, 196, 82],
  marsh: [92, 128, 72],
  marshWet: [74, 110, 78],
  trail: [212, 184, 138],
  soil: [186, 148, 96]
};

const ALPINE_PALETTE = {
  rockHi: [228, 226, 222],
  rockLo: [148, 142, 136],
  forest: [58, 92, 62],
  forestFloor: [78, 108, 70],
  slope: [150, 152, 118],
  meadow: [164, 176, 112],
  marsh: [88, 118, 96],
  marshWet: [70, 104, 92],
  trail: [196, 178, 148],
  soil: [168, 150, 118]
};

function mixRgb(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t)
  ];
}

function rgbToHex(rgb) {
  return (
    "#" +
    rgb
      .map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0"))
      .join("")
  );
}

export function groundColor(region, x, y) {
  const pal = region.terrainModel === "high-country" ? ALPINE_PALETTE : PALETTE;
  if (inCreek(region, x, y) && !inTributary(region, x, y) && !inPond(region, x, y)) {
    // Tributary handled as water by renderer; main creek/pond left transparent for animated water.
  }
  if (inPond(region, x, y)) return null;
  if (polylineDistance(x, y, region.creek.points) < region.creek.width) return null;
  if (polylineDistance(x, y, region.outlet.points) < region.outlet.width) return null;

  const w = biomeWeights(region, x, y);
  let rgb = pal.meadow;
  if (w.forest > 0.2) rgb = mixRgb(rgb, pal.forestFloor, Math.min(1, w.forest));
  if (w.slope > 0.25) rgb = mixRgb(rgb, pal.slope, Math.min(1, w.slope));
  if (w.marsh > 0.2) rgb = mixRgb(rgb, pal.marsh, Math.min(1, w.marsh));
  if (w.marsh > 0.55) rgb = mixRgb(rgb, pal.marshWet, (w.marsh - 0.55) / 0.45);
  if (w.rock > 0.12) rgb = mixRgb(rgb, w.height > 0.78 ? pal.rockHi : pal.rockLo, Math.min(1, w.rock * 1.2));
  if (w.trail > 0.35) rgb = mixRgb(rgb, pal.trail, Math.min(1, w.trail));
  if (inTributary(region, x, y)) rgb = mixRgb(rgb, [90, 160, 170], 0.55);

  const n = hash01(x, y);
  const d = (n - 0.5) * 8;
  rgb = [rgb[0] + d, rgb[1] + d * 0.7, rgb[2] + d * 0.35];
  return rgbToHex(rgb);
}

function reservedSpot(region, x, y, extras) {
  if (inCreek(region, x, y)) return true;
  if (onTrail(region, x, y)) return true;
  if (inStation(region, x, y)) return true;
  if (dist(x, y, region.spawn.x, region.spawn.y) < 90) return true;
  if (dist(x, y, region.ranger.x, region.ranger.y) < 70) return true;
  for (const feat of region.features) {
    if (dist(x, y, feat.x, feat.y) < 42) return true;
  }
  for (const extra of extras) {
    if (dist(x, y, extra.x, extra.y) < 40) return true;
  }
  return false;
}

function plantTrees(region, rng, extras) {
  const alpine = region.terrainModel === "high-country";
  const trees = [];
  const want = alpine ? 72 : 170;
  let guard = 0;
  while (trees.length < want && guard < 5000) {
    guard += 1;
    const x = 80 + rng() * (region.width - 160);
    const y = 80 + rng() * (region.height - 160);
    const h = heightAt(region, x, y);
    if (alpine && h > 0.56) continue;
    if (h > 0.72) continue;
    if (reservedSpot(region, x, y, extras)) continue;
    if (inWetland(region, x, y) && rng() > 0.12) continue;
    const forestBoost = alpine
      ? dist(x, y, 1100, 1420) < 320 || dist(x, y, 1680, 1320) < 220
      : dist(x, y, 560, 800) < 340 || dist(x, y, 1500, 1100) < 200;
    if (!forestBoost && rng() > (alpine ? 0.1 : 0.18)) continue;
    if (trees.some((tree) => dist(x, y, tree.x, tree.y) < 38)) continue;
    const pine = alpine ? true : dist(x, y, region.peak.x, region.peak.y) < 420 ? rng() > 0.28 : rng() > 0.55;
    trees.push({
      x,
      y,
      r: alpine ? 12 + rng() * 6 : pine ? 16 + rng() * 8 : 18 + rng() * 10,
      pine,
      shade: rng()
    });
  }
  return trees;
}

function scatterDetails(region, rng, extras) {
  const alpine = region.terrainModel === "high-country";
  const details = [];
  const tryAdd = (kind, n, test) => {
    let guard = 0;
    let added = 0;
    while (added < n && guard < n * 30) {
      guard += 1;
      const x = 60 + rng() * (region.width - 120);
      const y = 60 + rng() * (region.height - 120);
      if (!test(x, y)) continue;
      if (reservedSpot(region, x, y, extras) && kind !== "reed") continue;
      if (details.some((d) => dist(x, y, d.x, d.y) < 22)) continue;
      details.push({ kind, x, y, s: 0.7 + rng() * 0.6, rot: rng() * Math.PI });
      added += 1;
    }
  };
  tryAdd("rock", alpine ? 48 : 28, (x, y) => heightAt(region, x, y) > (alpine ? 0.36 : 0.42) || inOutcrop(region, x, y));
  tryAdd("boulder", alpine ? 16 : 8, (x, y) => heightAt(region, x, y) > 0.5);
  tryAdd("log", alpine ? 4 : 10, (x, y) => !alpine && dist(x, y, 560, 800) < 380 && !inCreek(region, x, y));
  tryAdd("shrub", alpine ? 14 : 24, (x, y) => heightAt(region, x, y) < 0.55 && !inWetland(region, x, y));
  tryAdd("flower", alpine ? 8 : 18, (x, y) => heightAt(region, x, y) < (alpine ? 0.4 : 0.28) && !inWetland(region, x, y));
  tryAdd("reed", alpine ? 12 : 36, (x, y) => inWetland(region, x, y) || (inPond(region, x, y) === false && dist(x, y, region.pond.cx, region.pond.cy) < region.pond.rx + 36));
  tryAdd("soil", alpine ? 6 : 8, (x, y) => alpine ? dist(x, y, 620, 960) < 90 : dist(x, y, 1024, 1108) < 90 || heightAt(region, x, y) > 0.58);
  return details;
}

export function createWorld(region, seed = 1842, extras = []) {
  const rng = mulberry32(seed);
  const trees = plantTrees(region, rng, extras);
  const details = scatterDetails(region, rng, extras);
  return { region, trees, details, extras };
}

export function treeAt(world, x, y) {
  for (const tree of world.trees) {
    if (dist(x, y, tree.x, tree.y) < tree.r * 0.55) return tree;
  }
  return null;
}

export function blockingDetailAt(world, x, y) {
  for (const d of world.details) {
    if (d.kind === "boulder" && dist(x, y, d.x, d.y) < 14) return d;
    if (d.kind === "log" && dist(x, y, d.x, d.y) < 10) return d;
  }
  return null;
}

export function isBlocked(world, x, y) {
  const { region } = world;
  if (x < 28 || y < 28 || x > region.width - 28 || y > region.height - 28) return true;
  if (region.terrainModel === "high-country") {
    if (heightAt(region, x, y) > 0.93 && !onTrail(region, x, y)) return true;
  } else if (heightAt(region, x, y) > 0.8) {
    return true;
  }
  if (inStation(region, x, y)) return true;
  if (treeAt(world, x, y)) return true;
  if (blockingDetailAt(world, x, y)) return true;
  return false;
}

export function isWater(world, x, y) {
  return inCreek(world.region, x, y) || inWetland(world.region, x, y);
}

export function moveWithCollision(world, x, y, dx, dy) {
  const marsh = inWetland(world.region, x, y) && !inCreek(world.region, x, y);
  const speedScale = inCreek(world.region, x, y) ? 0.48 : marsh ? 0.72 : 1;
  const nx = x + dx * speedScale;
  const ny = y + dy * speedScale;
  if (!isBlocked(world, nx, ny)) return { x: nx, y: ny };
  if (!isBlocked(world, nx, y)) return { x: nx, y };
  if (!isBlocked(world, x, ny)) return { x, y: ny };
  return { x, y };
}

export function nearestInspectable(world, x, y, range = 150) {
  let best = null;
  let bestD = Infinity;
  for (const feature of world.region.features) {
    const reach = Math.max(range, feature.radius || 150);
    const d = dist(x, y, feature.x, feature.y);
    if (d <= reach && d < bestD) {
      best = feature;
      bestD = d;
    }
  }
  return best;
}

export function nearestStoryProp(region, x, y, range = 48) {
  let best = null;
  let bestD = range;
  for (const prop of region.props || []) {
    if (!prop.inspect) continue;
    const d = dist(x, y, prop.x, prop.y);
    if (d < bestD) {
      best = prop;
      bestD = d;
    }
  }
  return best;
}

export function nearRanger(region, x, y) {
  return dist(x, y, region.ranger.x, region.ranger.y) < region.ranger.greetRadius;
}

export function polylineDistanceExport(x, y, points) {
  return polylineDistance(x, y, points);
}

export { polylineDistance, dist };
