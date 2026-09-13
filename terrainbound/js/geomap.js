/**
 * Reusable regional map math and drawing.
 * Coordinates, scale, distance, contours, profiles, and layer types.
 * Understandable at 9th/10th grade — not a GIS application.
 */

export function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

export function worldToLatLon(region, x, y) {
  const g = region.grid;
  const lat = g.originLat + (1 - y / region.height) * g.latSpan;
  const lon = g.originLon + (x / region.width) * g.lonSpan;
  return { lat, lon };
}

export function formatFixed(value, digits) {
  return Number(value).toFixed(digits);
}

export function formatLatLon(ll, digits) {
  const ns = ll.lat >= 0 ? "N" : "S";
  const ew = ll.lon >= 0 ? "E" : "W";
  return `${formatFixed(Math.abs(ll.lat), digits)}°${ns}, ${formatFixed(Math.abs(ll.lon), digits)}°${ew}`;
}

export function metersPerPixel(region) {
  return region.grid?.metersPerPixel || 1;
}

export function groundDistance(region, ax, ay, bx, by) {
  return dist(ax, ay, bx, by) * metersPerPixel(region);
}

export function polylineLengthMeters(region, points) {
  let meters = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    meters += groundDistance(region, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]);
  }
  return meters;
}

export function trailById(region, id) {
  return (region.trails || []).find((trail) => trail.id === id) || null;
}

export function elevationMeters(region, heightAtFn, x, y) {
  const spec = region.elevation || { baseMeters: 0, rangeMeters: 100 };
  return spec.baseMeters + heightAtFn(region, x, y) * spec.rangeMeters;
}

export function gradientPercent(riseMeters, runMeters) {
  if (!runMeters) return 0;
  return (riseMeters / runMeters) * 100;
}

export function routeMetrics(region, heightAtFn, trail) {
  const points = trail.points;
  const start = points[0];
  const end = points[points.length - 1];
  const distance = polylineLengthMeters(region, points);
  const elev0 = elevationMeters(region, heightAtFn, start[0], start[1]);
  const elev1 = elevationMeters(region, heightAtFn, end[0], end[1]);
  let gain = 0;
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = elevationMeters(region, heightAtFn, points[i][0], points[i][1]);
    const b = elevationMeters(region, heightAtFn, points[i + 1][0], points[i + 1][1]);
    if (b > a) gain += b - a;
  }
  return {
    id: trail.id,
    name: trail.name,
    distance,
    distanceKm: distance / 1000,
    startElev: elev0,
    endElev: elev1,
    gain,
    gradient: gradientPercent(gain, distance)
  };
}

export function sampleProfile(region, heightAtFn, ax, ay, bx, by, steps = 48) {
  const samples = [];
  const run = groundDistance(region, ax, ay, bx, by);
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    samples.push({
      t,
      x,
      y,
      dist: run * t,
      elev: elevationMeters(region, heightAtFn, x, y)
    });
  }
  return { run, samples };
}

export function profileShapeId(profile) {
  const samples = profile.samples;
  const start = samples[0].elev;
  const end = samples[samples.length - 1].elev;
  let min = Infinity;
  let max = -Infinity;
  let minT = 0;
  for (const sample of samples) {
    if (sample.elev < min) {
      min = sample.elev;
      minT = sample.t;
    }
    if (sample.elev > max) max = sample.elev;
  }
  const rise = end - start;
  const relief = max - min;
  if (relief < 25) return "flat-then-wall";
  const mid = samples[Math.floor(samples.length / 2)].elev;
  if (minT > 0.25 && minT < 0.85 && mid + 8 < Math.max(start, end) && rise > 20) {
    return "ridge-then-drop";
  }
  if (rise > 40 && minT < 0.2) return "steady";
  if (end > start + 15 && min < Math.min(start, end) - 12) return "ridge-then-drop";
  return "steady";
}

export function contourCrossings(region, heightAtFn, ax, ay, bx, by, interval, steps = 80) {
  let last = Math.floor(elevationMeters(region, heightAtFn, ax, ay) / interval);
  let count = 0;
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    const band = Math.floor(elevationMeters(region, heightAtFn, x, y) / interval);
    if (band !== last) {
      count += 1;
      last = band;
    }
  }
  return count;
}

export function layerGeometry(layers, id) {
  const spec = (layers || []).find((item) => item.id === id);
  return spec?.geometry || null;
}

export function createMapState() {
  return {
    mode: "world",
    layersOn: ["trails"],
    measureA: null,
    measureB: null,
    profileA: null,
    profileB: null
  };
}

export function toggleMapLayer(mapState, id) {
  const on = mapState.layersOn.includes(id);
  mapState.layersOn = on ? mapState.layersOn.filter((item) => item !== id) : [...mapState.layersOn, id];
  return mapState;
}

export function hasLayer(mapState, id) {
  return mapState.layersOn.includes(id);
}

function project(region, x, y, width, height, pad = 16) {
  return {
    x: pad + (x / region.width) * (width - pad * 2),
    y: pad + (y / region.height) * (height - pad * 2)
  };
}

function strokeTrail(ctx, region, points, width, height, color, lineWidth) {
  if (!points?.length) return;
  ctx.beginPath();
  points.forEach((pt, i) => {
    const p = project(region, pt[0], pt[1], width, height);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.stroke();
}

function drawContours(ctx, region, heightAtFn, width, height, interval) {
  const step = 28;
  ctx.strokeStyle = "rgba(92, 64, 40, 0.45)";
  ctx.lineWidth = 1;
  for (let y = 40; y < region.height; y += step) {
    let drawing = false;
    ctx.beginPath();
    for (let x = 40; x < region.width; x += step) {
      const elev = elevationMeters(region, heightAtFn, x, y);
      const onLine = Math.abs(elev - Math.round(elev / interval) * interval) < interval * 0.22;
      const p = project(region, x, y, width, height);
      if (onLine) {
        if (!drawing) {
          ctx.moveTo(p.x, p.y);
          drawing = true;
        } else ctx.lineTo(p.x, p.y);
      } else {
        drawing = false;
      }
    }
    ctx.stroke();
  }
  for (let x = 40; x < region.width; x += step) {
    let drawing = false;
    ctx.beginPath();
    for (let y = 40; y < region.height; y += step) {
      const elev = elevationMeters(region, heightAtFn, x, y);
      const onLine = Math.abs(elev - Math.round(elev / interval) * interval) < interval * 0.22;
      const p = project(region, x, y, width, height);
      if (onLine) {
        if (!drawing) {
          ctx.moveTo(p.x, p.y);
          drawing = true;
        } else ctx.lineTo(p.x, p.y);
      } else drawing = false;
    }
    ctx.stroke();
  }
}

export function drawFieldMap(ctx, width, height, model) {
  const { region, player, tools = {}, mapState, discoveries = [], heightAtFn } = model;
  const desert = region.terrainModel === "sunfall-desert";
  ctx.clearRect(0, 0, width, height);
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  if (desert) {
    sky.addColorStop(0, "#e8d4a8");
    sky.addColorStop(1, "#c4a06a");
  } else {
    sky.addColorStop(0, "#c9d6c8");
    sky.addColorStop(1, "#8aa090");
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#3d4a3c";
  ctx.font = "600 13px Trebuchet MS, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(region.name, 12, 18);
  ctx.font = "12px Trebuchet MS, sans-serif";
  ctx.fillStyle = "#5a6858";
  ctx.fillText("Sketch map", 12, 34);

  const topo = mapState?.mode === "topo" && tools.topo;
  const layers = mapState?.layersOn || ["trails"];

  if (topo && heightAtFn) {
    drawContours(ctx, region, heightAtFn, width, height, region.elevation?.contourInterval || 20);
  }

  if (layers.includes("vegetation")) {
    ctx.fillStyle = "rgba(70, 110, 72, 0.18)";
    ctx.fillRect(8, height * 0.52, width * 0.42, height * 0.4);
  }

  if (layers.includes("water") && region.pond && region.terrainModel !== "sunfall-desert") {
    const p = project(region, region.pond.cx, region.pond.cy, width, height);
    ctx.fillStyle = "rgba(70, 150, 180, 0.45)";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, 18, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    if (region.wetland) {
      const w = project(region, region.wetland.cx, region.wetland.cy, width, height);
      ctx.fillStyle = "rgba(70, 120, 90, 0.35)";
      ctx.beginPath();
      ctx.ellipse(w.x, w.y, 14, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const trailColor = tools.scale ? "rgba(140, 96, 48, 0.9)" : "rgba(140, 96, 48, 0.4)";
  if (layers.includes("trails") || !tools.gis) {
    for (const trail of region.trails || []) {
      strokeTrail(ctx, region, trail.points, width, height, trailColor, tools.scale ? 2.2 : 1.4);
    }
  }

  if (layers.includes("imagery") && tools.gis) {
    ctx.fillStyle = "rgba(120, 72, 40, 0.55)";
    const scar = project(region, 620, 960, width, height);
    ctx.beginPath();
    ctx.ellipse(scar.x, scar.y, 10, 6, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5a3a28";
    ctx.font = "11px Trebuchet MS, sans-serif";
    ctx.fillText("scar", scar.x + 8, scar.y);
  }

  for (const item of discoveries) {
    const p = project(region, item.x, item.y, width, height);
    ctx.fillStyle = "#c45c26";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  if (player) {
    const p = project(region, player.x, player.y, width, height);
    ctx.fillStyle = "#1d2a1c";
    ctx.beginPath();
    ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#1d2a1c";
    ctx.font = "11px Trebuchet MS, sans-serif";
    ctx.fillText("you", p.x + 7, p.y - 4);
    if (tools.coordinates) {
      ctx.fillStyle = "#3d4a3c";
      ctx.fillText(formatLatLon(worldToLatLon(region, player.x, player.y), 4), 12, height - 28);
    }
    if (tools.elevation && heightAtFn) {
      const elev = Math.round(elevationMeters(region, heightAtFn, player.x, player.y));
      ctx.fillText(`${elev} m`, 12, height - 14);
    }
  }

  ctx.fillStyle = "#5a6858";
  ctx.font = "11px Trebuchet MS, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(region.grid?.scaleLabel || "", width - 12, height - 12);
  const barM = model.scaleBarMeters || 200;
  const barWorld = barM / metersPerPixel(region);
  const barPx = Math.max(24, barWorld * (width / region.width));
  ctx.textAlign = "left";
  ctx.strokeStyle = "#3d4a3c";
  ctx.beginPath();
  ctx.moveTo(12, height - 44);
  ctx.lineTo(12 + barPx, height - 44);
  ctx.stroke();
  ctx.fillStyle = "#3d4a3c";
  ctx.fillText(`${barM} m`, 12, height - 48);
  if (topo) {
    ctx.fillText("Topo", 12, 48);
  }
}

export function drawProfileChart(ctx, width, height, profile) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#f4efe2";
  ctx.fillRect(0, 0, width, height);
  const samples = profile.samples;
  const elevs = samples.map((s) => s.elev);
  const min = Math.min(...elevs) - 10;
  const max = Math.max(...elevs) + 10;
  const pad = 28;
  ctx.strokeStyle = "#8a7a62";
  ctx.strokeRect(pad, 12, width - pad * 2, height - 36);
  ctx.beginPath();
  samples.forEach((sample, i) => {
    const x = pad + (sample.t) * (width - pad * 2);
    const y = 12 + (1 - (sample.elev - min) / (max - min)) * (height - 36);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = "#c45c26";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = "#3d4a3c";
  ctx.font = "11px Trebuchet MS, sans-serif";
  ctx.fillText("A", pad, height - 8);
  ctx.textAlign = "right";
  ctx.fillText("B", width - pad, height - 8);
  ctx.textAlign = "left";
  ctx.fillText(`${Math.round(min)} m`, 4, height - 24);
  ctx.fillText(`${Math.round(max)} m`, 4, 22);
}
