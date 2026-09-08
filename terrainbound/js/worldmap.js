/**
 * Twelve-region atlas. Names and copy come from data, not from draw code.
 */

export function loadWorld(manifest) {
  const byId = new Map(manifest.regions.map((region) => [region.id, region]));
  return {
    ...manifest,
    byId,
    courseOrder: [...manifest.regions].sort((a, b) => a.courseOrder - b.courseOrder)
  };
}

export function regionById(world, id) {
  return world.byId.get(id) || null;
}

export function createWorldState(world) {
  const start = world.startRegionId || "cedar-hollow";
  return {
    currentRegion: start,
    accessibleRegions: [start],
    masteredRegions: [],
    selectedRegionId: start
  };
}

export function isAccessible(worldState, regionId) {
  return worldState.accessibleRegions.includes(regionId);
}

export function isPlayable(world, regionId) {
  const region = regionById(world, regionId);
  return region?.implementationState === "playable";
}

export function canEnterRegion(world, worldState, regionId) {
  return isAccessible(worldState, regionId) && isPlayable(world, regionId);
}

export function travelStatus(world, worldState, regionId) {
  const region = regionById(world, regionId);
  if (!region) return "unknown";
  if (worldState.currentRegion === regionId) return "here";
  if (isAccessible(worldState, regionId)) return "open";
  return "locked";
}

export function previewModel(world, worldState, regionId) {
  const region = regionById(world, regionId);
  if (!region) return null;
  const status = travelStatus(world, worldState, regionId);
  let routeLabel = "Route not yet open";
  let routeDetail = region.lockCopy;
  if (status === "here") {
    routeLabel = "You are here";
    routeDetail = region.travelCopy;
  } else if (status === "open") {
    routeLabel = "Route open";
    routeDetail = region.travelCopy;
  }
  return {
    id: region.id,
    name: region.name,
    subtitle: region.curriculumTitle,
    visualIdentity: region.visualIdentity,
    shortPreview: region.shortPreview,
    implementationState: region.implementationState,
    playable: region.implementationState === "playable",
    status,
    routeLabel,
    routeDetail,
    canEnter: canEnterRegion(world, worldState, region.id),
    canPreview: true
  };
}

export function applyTravelUnlocks(world, worldState, masteredRegionId, successorId) {
  const opened = [];
  if (!worldState.masteredRegions.includes(masteredRegionId)) {
    worldState.masteredRegions = [...worldState.masteredRegions, masteredRegionId];
  }
  const region = regionById(world, masteredRegionId);
  const nextId = successorId || region?.successor;
  if (nextId && !worldState.accessibleRegions.includes(nextId)) {
    worldState.accessibleRegions = [...worldState.accessibleRegions, nextId];
    opened.push(nextId);
  }
  return opened;
}

export function courseTopicNumbers(world) {
  return world.courseOrder.map((region) => region.curriculumTopic);
}

export function hitTestRegion(world, canvas, clientX, clientY, pad = 28) {
  const rect = canvas.getBoundingClientRect();
  const x = ((clientX - rect.left) / rect.width) * canvas.width;
  const y = ((clientY - rect.top) / rect.height) * canvas.height;
  let best = null;
  let bestD = pad;
  for (const region of world.regions) {
    const px = (region.map.x / 100) * canvas.width;
    const py = (region.map.y / 100) * canvas.height;
    const d = Math.hypot(px - x, py - y);
    if (d < bestD) {
      bestD = d;
      best = region;
    }
  }
  return best;
}

function landPath(ctx, w, h) {
  ctx.beginPath();
  ctx.moveTo(w * 0.08, h * 0.42);
  ctx.bezierCurveTo(w * 0.12, h * 0.18, w * 0.38, h * 0.02, w * 0.58, h * 0.1);
  ctx.bezierCurveTo(w * 0.78, h * 0.18, w * 0.96, h * 0.22, w * 0.94, h * 0.4);
  ctx.bezierCurveTo(w * 0.98, h * 0.62, w * 0.86, h * 0.72, w * 0.74, h * 0.86);
  ctx.bezierCurveTo(w * 0.58, h * 0.98, w * 0.4, h * 0.9, w * 0.22, h * 0.78);
  ctx.bezierCurveTo(w * 0.06, h * 0.66, w * 0.02, h * 0.54, w * 0.08, h * 0.42);
  ctx.closePath();
}

function drawSilhouette(ctx, type, x, y, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = color;
  ctx.strokeStyle = "rgba(20, 32, 24, 0.35)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  if (type === "valley") {
    ctx.moveTo(-18, 10);
    ctx.lineTo(-8, -6);
    ctx.lineTo(0, 2);
    ctx.lineTo(8, -8);
    ctx.lineTo(18, 10);
  } else if (type === "mountains") {
    ctx.moveTo(-20, 12);
    ctx.lineTo(-8, -14);
    ctx.lineTo(0, 0);
    ctx.lineTo(10, -18);
    ctx.lineTo(22, 12);
  } else if (type === "desert") {
    ctx.moveTo(-20, 8);
    ctx.quadraticCurveTo(-6, -10, 4, 2);
    ctx.quadraticCurveTo(12, -8, 20, 8);
    ctx.lineTo(-20, 8);
  } else if (type === "basin") {
    ctx.ellipse(0, 2, 18, 10, 0, 0, Math.PI * 2);
  } else if (type === "badlands") {
    ctx.rect(-16, -2, 10, 12);
    ctx.rect(-4, -8, 9, 18);
    ctx.rect(8, 0, 10, 10);
  } else if (type === "glacier") {
    ctx.moveTo(-18, 10);
    ctx.lineTo(-4, -16);
    ctx.lineTo(6, -6);
    ctx.lineTo(16, -18);
    ctx.lineTo(20, 10);
  } else if (type === "volcano") {
    ctx.moveTo(-18, 12);
    ctx.lineTo(-4, -14);
    ctx.lineTo(0, -6);
    ctx.lineTo(4, -14);
    ctx.lineTo(18, 12);
  } else if (type === "canyon") {
    ctx.moveTo(-20, -8);
    ctx.lineTo(-8, 12);
    ctx.lineTo(0, 2);
    ctx.lineTo(8, 12);
    ctx.lineTo(20, -8);
    ctx.lineTo(8, -8);
    ctx.lineTo(0, 4);
    ctx.lineTo(-8, -8);
  } else if (type === "coast") {
    ctx.moveTo(-18, 6);
    ctx.quadraticCurveTo(-8, -12, 0, 4);
    ctx.quadraticCurveTo(10, 14, 20, 2);
    ctx.lineTo(20, 12);
    ctx.lineTo(-18, 12);
  } else if (type === "storm") {
    ctx.ellipse(0, 4, 16, 8, 0, 0, Math.PI * 2);
    ctx.moveTo(-8, -4);
    ctx.lineTo(2, -14);
    ctx.lineTo(8, -2);
  } else if (type === "bay") {
    ctx.moveTo(-16, -4);
    ctx.quadraticCurveTo(0, 16, 16, -4);
    ctx.lineTo(10, -10);
    ctx.quadraticCurveTo(0, 4, -10, -10);
  } else if (type === "sierra") {
    ctx.moveTo(-22, 12);
    ctx.lineTo(-10, -10);
    ctx.lineTo(-2, 4);
    ctx.lineTo(8, -16);
    ctx.lineTo(14, -2);
    ctx.lineTo(22, -12);
    ctx.lineTo(24, 12);
  } else {
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawWorldMap(ctx, world, worldState, selectedId) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  ctx.clearRect(0, 0, w, h);

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#8ec8ea");
  sky.addColorStop(0.42, "#cfe4c4");
  sky.addColorStop(1, "#3a7ea8");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "#2f6f96";
  ctx.beginPath();
  ctx.ellipse(w * 0.86, h * 0.52, w * 0.22, h * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  landPath(ctx, w, h);
  const land = ctx.createLinearGradient(0, 0, w, h);
  land.addColorStop(0, "#8fb56a");
  land.addColorStop(0.45, "#c4a46a");
  land.addColorStop(1, "#6a8b5a");
  ctx.fillStyle = land;
  ctx.fill();
  ctx.strokeStyle = "rgba(40, 60, 36, 0.35)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "rgba(232, 214, 170, 0.45)";
  ctx.beginPath();
  ctx.ellipse(w * 0.22, h * 0.58, w * 0.16, h * 0.1, -0.4, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(180, 210, 220, 0.55)";
  ctx.beginPath();
  ctx.moveTo(w * 0.36, h * 0.22);
  ctx.lineTo(w * 0.5, h * 0.04);
  ctx.lineTo(w * 0.64, h * 0.18);
  ctx.fill();

  const ordered = world.courseOrder;
  for (let i = 0; i < ordered.length - 1; i += 1) {
    const a = ordered[i];
    const b = ordered[i + 1];
    const ax = (a.map.x / 100) * w;
    const ay = (a.map.y / 100) * h;
    const bx = (b.map.x / 100) * w;
    const by = (b.map.y / 100) * h;
    const open =
      worldState.accessibleRegions.includes(a.id) && worldState.accessibleRegions.includes(b.id);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.strokeStyle = open ? "#c45c26" : "rgba(80, 70, 50, 0.45)";
    ctx.lineWidth = open ? 3.5 : 2;
    ctx.setLineDash(open ? [] : [6, 7]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  for (const region of ordered) {
    const x = (region.map.x / 100) * w;
    const y = (region.map.y / 100) * h;
    const selected = region.id === selectedId;
    drawSilhouette(ctx, region.silhouette, x, y - 6, region.colors.land);
    ctx.beginPath();
    ctx.arc(x, y + 14, selected ? 7 : 5, 0, Math.PI * 2);
    ctx.fillStyle = region.colors.accent;
    ctx.fill();
    if (selected) {
      ctx.strokeStyle = "#f4efe2";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.fillStyle = "#1d2a1c";
    ctx.font = selected ? "700 12px Trebuchet MS, sans-serif" : "600 11px Trebuchet MS, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(region.name, x, y + 30);
  }
}
