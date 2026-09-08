/**
 * Cartoon world renderer. Terrain is baked once; water, details, and characters animate.
 */

import { groundColor, dist } from "./world.js";

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function createRenderer(canvas, world, helpers) {
  const ctx = canvas.getContext("2d");
  const ground = document.createElement("canvas");
  ground.width = world.region.width;
  ground.height = world.region.height;
  bakeGround(ground, world, helpers);
  const leaves = Array.from({ length: 14 }, (_, i) => ({
    x: ((i * 173) % world.region.width),
    y: ((i * 97) % world.region.height),
    s: 0.7 + (i % 4) * 0.15,
    phase: i * 0.7
  }));

  return {
    draw(state) {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.fillStyle = "#7ec8ea";
      ctx.fillRect(0, 0, width, height);
      drawSky(ctx, width, height, state.time, state.reducedMotion);
      ctx.translate(width / 2, height / 2);
      ctx.scale(state.camera.scale, state.camera.scale);
      ctx.translate(-state.camera.x, -state.camera.y);
      ctx.drawImage(ground, 0, 0);
      drawWater(ctx, world, state.time, state.reducedMotion);
      if (state.flowVisible) drawFlowArrows(ctx, world, state.time);
      if (state.landscapeInterpreted) drawIceFlowArrows(ctx, state);
      drawStoryProps(ctx, world.region, state.time, state.reducedMotion);
      drawDiscoveryLandmarks(ctx, world, state);
      drawDetails(ctx, world, state.time, state.reducedMotion);
      if (!state.reducedMotion) drawLeaves(ctx, leaves, world.region, state.time);
      drawTrees(ctx, world, state.time, state.reducedMotion);
      drawStation(ctx, world.region);
      drawNearHint(ctx, world, state);
      drawRanger(ctx, world.region, state.time, state.reducedMotion);
      drawPlayer(ctx, state.player, state.time, state.reducedMotion);
      drawDestination(ctx, state);
      drawLabels(ctx, world, state);
      ctx.restore();
    }
  };
}

function drawSky(ctx, width, height, time, reduced) {
  const drift = reduced ? 0 : (time * 8) % (width + 240);
  ctx.fillStyle = "rgba(255,255,255,0.22)";
  for (let i = 0; i < 3; i += 1) {
    const x = ((drift * (0.4 + i * 0.18) + i * 280) % (width + 200)) - 80;
    const y = 36 + i * 22;
    ctx.beginPath();
    ctx.ellipse(x, y, 70 - i * 8, 18, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 36, y + 4, 48, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawLeaves(ctx, leaves, region, time) {
  for (const leaf of leaves) {
    const x = (leaf.x + time * (8 + leaf.s * 6)) % region.width;
    const y = (leaf.y + Math.sin(time * 0.7 + leaf.phase) * 18 + time * 3) % region.height;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(time * 0.4 + leaf.phase);
    ctx.fillStyle = "rgba(196, 110, 38, 0.45)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 4 * leaf.s, 2.2 * leaf.s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function bakeGround(canvas, world, helpers) {
  const ctx = canvas.getContext("2d");
  const { region } = world;
  const step = 2;
  const img = ctx.createImageData(region.width, region.height);
  const data = img.data;
  for (let y = 0; y < region.height; y += step) {
    for (let x = 0; x < region.width; x += step) {
      const hex = groundColor(region, x, y);
      if (!hex) continue;
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      for (let oy = 0; oy < step; oy += 1) {
        for (let ox = 0; ox < step; ox += 1) {
          const px = x + ox;
          const py = y + oy;
          if (px >= region.width || py >= region.height) continue;
          const i = (py * region.width + px) * 4;
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = 255;
        }
      }
    }
  }
  ctx.putImageData(img, 0, 0);

  const peak = region.peak;
  ctx.fillStyle = "#d8cfc2";
  ctx.beginPath();
  ctx.moveTo(peak.x - 260, peak.y + 140);
  ctx.lineTo(peak.x - 80, peak.y - 40);
  ctx.lineTo(peak.x, peak.y - 110);
  ctx.lineTo(peak.x + 90, peak.y - 20);
  ctx.lineTo(peak.x + 250, peak.y + 150);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#efe8dc";
  ctx.beginPath();
  ctx.moveTo(peak.x - 40, peak.y - 20);
  ctx.lineTo(peak.x, peak.y - 118);
  ctx.lineTo(peak.x + 48, peak.y - 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#b7a790";
  ctx.beginPath();
  ctx.moveTo(peak.x - 180, peak.y + 80);
  ctx.lineTo(peak.x - 40, peak.y - 10);
  ctx.lineTo(peak.x + 20, peak.y + 90);
  ctx.closePath();
  ctx.fill();

  if (region.outcrop) {
    ctx.fillStyle = "#c4b49a";
    ctx.beginPath();
    ctx.ellipse(region.outcrop.x, region.outcrop.y, 70, 42, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#a89880";
    ctx.beginPath();
    ctx.ellipse(region.outcrop.x + 8, region.outcrop.y + 6, 48, 22, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(120, 96, 72, 0.45)";
  ctx.lineWidth = 16;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const trail of region.trails) strokeLine(ctx, trail.points);
  ctx.strokeStyle = "rgba(214, 188, 142, 0.92)";
  ctx.lineWidth = 8;
  for (const trail of region.trails) strokeLine(ctx, trail.points);

  ctx.strokeStyle = "rgba(214, 196, 120, 0.7)";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.ellipse(region.pond.cx, region.pond.cy, region.pond.rx + 8, region.pond.ry + 8, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function strokeLine(ctx, points) {
  ctx.beginPath();
  points.forEach((pt, i) => {
    if (i === 0) ctx.moveTo(pt[0], pt[1]);
    else ctx.lineTo(pt[0], pt[1]);
  });
  ctx.stroke();
}

function drawWater(ctx, world, time, reduced) {
  const { region } = world;
  const shimmer = reduced ? 0 : Math.sin(time * 2.1) * 2;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#2f8fbe";
  ctx.lineWidth = region.creek.width * 2;
  strokeLine(ctx, region.creek.points);
  ctx.strokeStyle = "#3fb3d9";
  ctx.lineWidth = region.creek.width * 1.35;
  strokeLine(ctx, region.creek.points);
  ctx.strokeStyle = "#7fe0ef";
  ctx.lineWidth = 7;
  ctx.setLineDash([18, 16]);
  ctx.lineDashOffset = reduced ? 0 : -time * 28;
  strokeLine(ctx, region.creek.points);
  ctx.setLineDash([]);

  if (region.tributary) {
    ctx.strokeStyle = "#4aa8c8";
    ctx.lineWidth = region.tributary.width * 1.8;
    strokeLine(ctx, region.tributary.points);
    ctx.strokeStyle = "#7fd4e6";
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 10]);
    ctx.lineDashOffset = reduced ? 0 : -time * 18;
    strokeLine(ctx, region.tributary.points);
    ctx.setLineDash([]);
  }

  ctx.strokeStyle = "#2f8fbe";
  ctx.lineWidth = region.outlet.width * 2;
  strokeLine(ctx, region.outlet.points);
  ctx.strokeStyle = "#3fb3d9";
  ctx.lineWidth = region.outlet.width * 1.3;
  strokeLine(ctx, region.outlet.points);

  const p = region.pond;
  ctx.fillStyle = "#2f8fbe";
  ctx.beginPath();
  ctx.ellipse(p.cx, p.cy, p.rx, p.ry, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#46b7db";
  ctx.beginPath();
  ctx.ellipse(p.cx, p.cy - 6, p.rx - 18, p.ry - 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.beginPath();
  ctx.ellipse(p.cx - 40, p.cy - 28, 54, 22, -0.4, 0, Math.PI * 2);
  ctx.fill();
  if (!reduced) {
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(p.cx, p.cy, p.rx - 30 + shimmer, p.ry - 22, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,255,255,0.18)";
    ctx.beginPath();
    ctx.ellipse(p.cx + 8, p.cy + 6, p.rx - 48 - shimmer * 0.5, p.ry - 36, 0.1, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawFlowArrows(ctx, world, time) {
  const path = [
    [730, 540],
    [860, 690],
    [980, 800],
    [1040, 980],
    [1080, 1188],
    [1100, 1380],
    [1140, 1470]
  ];
  ctx.fillStyle = "rgba(20, 90, 150, 0.8)";
  for (let i = 0; i < path.length - 1; i += 1) {
    const a = path[i];
    const b = path[i + 1];
    const mx = lerp(a[0], b[0], 0.55);
    const my = lerp(a[1], b[1], 0.55);
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const pulse = 1 + Math.sin(time * 3 + i) * 0.08;
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(ang);
    ctx.scale(pulse, pulse);
    ctx.beginPath();
    ctx.moveTo(16, 0);
    ctx.lineTo(-12, 10);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-12, -10);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawIceFlowArrows(ctx, state) {
  const path = state.iceFlow || [];
  if (path.length < 2) return;
  ctx.save();
  ctx.strokeStyle = "rgba(90, 110, 140, 0.7)";
  ctx.fillStyle = "rgba(90, 110, 140, 0.75)";
  ctx.setLineDash([10, 7]);
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(path[0][0], path[0][1]);
  for (let i = 1; i < path.length; i += 1) ctx.lineTo(path[i][0], path[i][1]);
  ctx.stroke();
  ctx.setLineDash([]);
  for (let i = 0; i < path.length - 1; i += 1) {
    const a = path[i];
    const b = path[i + 1];
    const mx = lerp(a[0], b[0], 0.7);
    const my = lerp(a[1], b[1], 0.7);
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(ang);
    ctx.beginPath();
    ctx.moveTo(10, 0);
    ctx.lineTo(-8, 7);
    ctx.lineTo(-8, -7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
}

function drawDetails(ctx, world, time, reduced) {
  const sorted = world.details.slice().sort((a, b) => a.y - b.y);
  for (const d of sorted) {
    const sway = reduced ? 0 : Math.sin(time * 1.6 + d.x * 0.02) * 1.8;
    if (d.kind === "rock" || d.kind === "boulder") {
      ctx.fillStyle = "rgba(40,40,30,0.18)";
      ctx.beginPath();
      ctx.ellipse(d.x, d.y + 4, d.kind === "boulder" ? 16 : 9, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = d.kind === "boulder" ? "#8d8070" : "#9a8b78";
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, (d.kind === "boulder" ? 16 : 8) * d.s, (d.kind === "boulder" ? 11 : 6) * d.s, d.rot, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.beginPath();
      ctx.ellipse(d.x - 3, d.y - 2, 4, 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (d.kind === "log") {
      ctx.save();
      ctx.translate(d.x, d.y);
      ctx.rotate(d.rot * 0.4);
      ctx.fillStyle = "#6b4a2a";
      ctx.fillRect(-18, -4, 36, 8);
      ctx.fillStyle = "#c4a06a";
      ctx.beginPath();
      ctx.arc(18, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    } else if (d.kind === "shrub") {
      ctx.fillStyle = "#3d7a40";
      ctx.beginPath();
      ctx.ellipse(d.x + sway * 0.4, d.y - 4, 10 * d.s, 8 * d.s, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (d.kind === "flower") {
      ctx.fillStyle = "#3f8a3a";
      ctx.fillRect(d.x - 1, d.y - 4, 2, 6);
      ctx.fillStyle = d.s > 1 ? "#e8c84a" : "#d46aa0";
      ctx.beginPath();
      ctx.arc(d.x, d.y - 6, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (d.kind === "reed") {
      ctx.strokeStyle = "#4a6b38";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + sway, d.y - 16 * d.s);
      ctx.stroke();
      ctx.fillStyle = "#c4a24a";
      ctx.fillRect(d.x + sway - 1, d.y - 20 * d.s, 3, 7);
    } else if (d.kind === "soil") {
      ctx.fillStyle = "rgba(176, 132, 80, 0.55)";
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, 16, 8, d.rot, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawStoryProps(ctx, region, time, reduced) {
  for (const prop of region.props || []) {
    if (prop.kind === "rain-gauge") {
      ctx.strokeStyle = "#4a5560";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(prop.x, prop.y);
      ctx.lineTo(prop.x, prop.y - 28);
      ctx.stroke();
      ctx.fillStyle = "#8aa0b0";
      ctx.fillRect(prop.x - 6, prop.y - 36, 12, 10);
    } else if (prop.kind === "instrument-crate") {
      ctx.fillStyle = "#8a6238";
      ctx.fillRect(prop.x - 12, prop.y - 10, 24, 16);
      ctx.strokeStyle = "#5a3e22";
      ctx.strokeRect(prop.x - 12, prop.y - 10, 24, 16);
    } else if (prop.kind === "sampling-flag") {
      ctx.strokeStyle = "#6d4c32";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(prop.x, prop.y);
      ctx.lineTo(prop.x, prop.y - 26);
      ctx.stroke();
      ctx.fillStyle = "#d6c24a";
      ctx.fillRect(prop.x, prop.y - 26, 12, 8);
    } else if (prop.kind === "survey-stake") {
      ctx.fillStyle = "#c45c26";
      ctx.fillRect(prop.x - 3, prop.y - 18, 6, 18);
      ctx.fillStyle = "#f4efe2";
      ctx.fillRect(prop.x - 8, prop.y - 28, 16, 10);
    } else if (prop.kind === "washout") {
      ctx.fillStyle = "rgba(168, 128, 82, 0.8)";
      ctx.beginPath();
      ctx.ellipse(prop.x, prop.y, 28, 12, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#5a3e22";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(prop.x - 16, prop.y - 4);
      ctx.lineTo(prop.x - 6, prop.y + 6);
      ctx.lineTo(prop.x + 4, prop.y - 2);
      ctx.stroke();
    } else if (prop.kind === "flood-gauge") {
      ctx.fillStyle = "#d8c8a0";
      ctx.fillRect(prop.x - 3, prop.y - 34, 6, 34);
      ctx.fillStyle = "#2f6b3a";
      ctx.fillRect(prop.x - 8, prop.y - 18, 16, 3);
      ctx.fillStyle = "#c45c26";
      ctx.fillRect(prop.x - 8, prop.y - 28, 16, 3);
    } else if (prop.kind === "sawhorse") {
      ctx.strokeStyle = "#6d4c32";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(prop.x - 14, prop.y + 6);
      ctx.lineTo(prop.x - 6, prop.y - 10);
      ctx.lineTo(prop.x + 14, prop.y - 10);
      ctx.lineTo(prop.x + 18, prop.y + 6);
      ctx.stroke();
    } else if (prop.kind === "lantern") {
      ctx.fillStyle = "#3a342c";
      ctx.fillRect(prop.x - 4, prop.y - 16, 8, 12);
      ctx.fillStyle = "rgba(240, 196, 76, 0.55)";
      ctx.beginPath();
      ctx.arc(prop.x, prop.y - 10, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (prop.kind === "pack") {
      ctx.fillStyle = "#4a5c3a";
      ctx.fillRect(prop.x - 8, prop.y - 10, 16, 12);
      ctx.fillStyle = "#c45c26";
      ctx.fillRect(prop.x - 6, prop.y - 14, 12, 5);
    } else if (prop.kind === "cairn") {
      ctx.fillStyle = "#b8aea0";
      ctx.fillRect(prop.x - 8, prop.y - 6, 16, 8);
      ctx.fillRect(prop.x - 5, prop.y - 12, 10, 6);
      ctx.fillRect(prop.x - 3, prop.y - 16, 6, 4);
    }
  }
}

function drawDiscoveryLandmarks(ctx, world, state) {
  const items = state.discoveries || [];
  for (const item of items) {
    ctx.save();
    ctx.translate(item.x, item.y);
    if (item.symbol === "erratic") {
      ctx.fillStyle = "rgba(40,30,20,0.2)";
      ctx.beginPath();
      ctx.ellipse(0, 10, 22, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#b08068";
      ctx.beginPath();
      ctx.ellipse(0, 0, 20, 14, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#8a6a58";
      ctx.beginPath();
      ctx.ellipse(4, 2, 10, 6, 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.symbol === "bedrock" || item.symbol === "weathered") {
      ctx.fillStyle = "#c2b4a0";
      ctx.fillRect(-18, -8, 36, 14);
      ctx.fillStyle = "#a89884";
      ctx.fillRect(-16, -2, 32, 6);
      const grooved =
        item.symbol === "bedrock" &&
        ((state.measuredIds || []).includes("bedrock-grooves") || state.landscapeInterpreted);
      if (grooved) {
        ctx.strokeStyle = "rgba(70, 60, 50, 0.75)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(-14, -6);
        ctx.lineTo(12, -1);
        ctx.moveTo(-14, -2);
        ctx.lineTo(14, 3);
        ctx.moveTo(-12, 2);
        ctx.lineTo(12, 7);
        ctx.stroke();
      }
    } else if (item.symbol === "cobbles") {
      ctx.fillStyle = "#8a9aa8";
      ctx.beginPath();
      ctx.ellipse(-8, 2, 7, 4, 0.2, 0, Math.PI * 2);
      ctx.ellipse(4, 0, 6, 4, -0.3, 0, Math.PI * 2);
      ctx.ellipse(10, 4, 5, 3, 0.1, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.symbol === "sediment") {
      ctx.fillStyle = "#e2d2a8";
      ctx.beginPath();
      ctx.ellipse(0, 0, 22, 10, 0.1, 0, Math.PI * 2);
      ctx.fill();
    } else if (item.symbol === "view") {
      ctx.strokeStyle = "#6d4c32";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-16, 0);
      ctx.lineTo(-16, -10);
      ctx.lineTo(16, -10);
      ctx.lineTo(16, 0);
      ctx.stroke();
    } else if (item.symbol === "seep") {
      ctx.fillStyle = "rgba(70, 130, 120, 0.45)";
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      if (!state.reducedMotion) {
        const pulse = 10 + Math.sin(state.time * 2.4) * 3;
        ctx.strokeStyle = "rgba(180, 220, 210, 0.45)";
        ctx.beginPath();
        ctx.ellipse(0, 2, pulse, pulse * 0.4, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (item.symbol === "rills") {
      ctx.strokeStyle = "rgba(120, 90, 50, 0.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, -8);
      ctx.lineTo(-2, 10);
      ctx.moveTo(2, -6);
      ctx.lineTo(8, 10);
      ctx.stroke();
    } else if (item.symbol === "bank") {
      ctx.strokeStyle = "#6b4424";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-10, -6);
      ctx.quadraticCurveTo(0, 8, 10, -4);
      ctx.stroke();
    } else if (item.symbol === "gauge") {
      ctx.fillStyle = "#d8c8a0";
      ctx.fillRect(-2, -22, 4, 22);
      ctx.strokeStyle = "#8a5a2a";
      ctx.beginPath();
      ctx.moveTo(-14, -12);
      ctx.lineTo(14, -12);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawTrees(ctx, world, time, reduced) {
  const sorted = world.trees.slice().sort((a, b) => a.y - b.y);
  for (const tree of sorted) {
    const sway = reduced ? 0 : Math.sin(time * 1.4 + tree.x * 0.01) * 2.4;
    ctx.fillStyle = "rgba(40, 60, 30, 0.22)";
    ctx.beginPath();
    ctx.ellipse(tree.x, tree.y + 8, tree.r * 0.7, tree.r * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    if (tree.pine) {
      ctx.fillStyle = "#6b4424";
      ctx.fillRect(tree.x - 3, tree.y - 10, 6, 16);
      ctx.fillStyle = "#1f6b3a";
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.moveTo(tree.x + sway, tree.y - 18 - i * 14);
        ctx.lineTo(tree.x - tree.r + i * 4, tree.y - i * 12);
        ctx.lineTo(tree.x + tree.r - i * 4, tree.y - i * 12);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = "#2e8a4c";
      ctx.beginPath();
      ctx.moveTo(tree.x + sway, tree.y - 52);
      ctx.lineTo(tree.x - tree.r * 0.55, tree.y - 18);
      ctx.lineTo(tree.x + tree.r * 0.55, tree.y - 18);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = "#6b4424";
      ctx.fillRect(tree.x - 4, tree.y - 8, 8, 16);
      ctx.fillStyle = "#2f8a42";
      ctx.beginPath();
      ctx.ellipse(tree.x + sway, tree.y - 22, tree.r, tree.r * 0.85, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#49a85a";
      ctx.beginPath();
      ctx.ellipse(tree.x - 6 + sway, tree.y - 28, tree.r * 0.55, tree.r * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawStation(ctx, region) {
  const s = region.station;
  ctx.fillStyle = "rgba(40, 50, 30, 0.2)";
  ctx.fillRect(s.x + 8, s.y + s.h - 6, s.w, 16);
  ctx.fillStyle = "#d8c09a";
  ctx.fillRect(s.x - 18, s.y + s.h - 18, s.w + 36, 20);
  ctx.fillStyle = "#c4783c";
  ctx.fillRect(s.x, s.y, s.w, s.h);
  ctx.fillStyle = "#8a3324";
  ctx.beginPath();
  ctx.moveTo(s.x - 16, s.y + 12);
  ctx.lineTo(s.x + s.w / 2, s.y - 52);
  ctx.lineTo(s.x + s.w + 16, s.y + 12);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#6d4c32";
  ctx.fillRect(s.x + s.w / 2 - 16, s.y + s.h - 46, 32, 46);
  ctx.fillStyle = "#f4e2a8";
  ctx.fillRect(s.x + 18, s.y + 28, 28, 22);
  ctx.fillRect(s.x + s.w - 46, s.y + 28, 28, 22);
  ctx.fillStyle = "#7a3b1e";
  ctx.fillRect(s.x + s.w - 28, s.y - 28, 14, 36);
  ctx.fillStyle = "rgba(230,230,230,0.7)";
  ctx.beginPath();
  ctx.ellipse(s.x + s.w - 21, s.y - 40, 10, 14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#6d4c32";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(s.x + s.w + 36, s.y + 20);
  ctx.lineTo(s.x + s.w + 36, s.y + s.h - 8);
  ctx.stroke();
  ctx.fillStyle = "#c45c26";
  ctx.beginPath();
  ctx.moveTo(s.x + s.w + 36, s.y + 20);
  ctx.lineTo(s.x + s.w + 36, s.y + 48);
  ctx.lineTo(s.x + s.w + 62, s.y + 34);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#2f6b3a";
  ctx.font = "bold 16px Trebuchet MS, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("Cedar Hollow Station", s.x + s.w / 2, s.y + s.h + 28);
}

function drawNearHint(ctx, world, state) {
  const target = state.nearTarget;
  if (!target) return;
  const pulse = 1 + Math.sin(state.time * 3.2) * 0.12;
  ctx.beginPath();
  ctx.arc(target.x, target.y, 11 * pulse, 0, Math.PI * 2);
  ctx.strokeStyle = target.kind === "discovery" ? "rgba(232, 176, 64, 0.85)" : "rgba(255,255,255,0.7)";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawPerson(ctx, x, y, facing, bob, palette) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = "rgba(30,40,20,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, 10, 16, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = palette.pants;
  ctx.fillRect(-8, -2 + bob, 16, 14);
  ctx.fillStyle = palette.shirt;
  ctx.fillRect(-9, -18 + bob, 18, 18);
  if (palette.hat) {
    ctx.fillStyle = palette.hat;
    ctx.fillRect(-12, -36 + bob, 24, 8);
    ctx.fillRect(-8, -42 + bob, 16, 8);
  }
  ctx.fillStyle = palette.skin;
  ctx.beginPath();
  ctx.arc(0, -24 + bob, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = palette.hair;
  ctx.beginPath();
  ctx.arc(0, -28 + bob, 10, Math.PI, Math.PI * 2);
  ctx.fill();
  const dir = facing >= 0 ? 1 : -1;
  ctx.fillStyle = "#1c1c1c";
  ctx.beginPath();
  ctx.arc(dir * 3, -24 + bob, 1.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = palette.pack || palette.shirt;
  ctx.fillRect(-6 - dir * 8, -16 + bob, 8, 12);
  ctx.restore();
}

function drawRanger(ctx, region, time, reduced) {
  const bob = reduced ? 0 : Math.sin(time * 2) * 1.2;
  drawPerson(ctx, region.ranger.x, region.ranger.y, -1, bob, {
    shirt: "#c4a35a",
    pants: "#4a5c3a",
    skin: "#e6b089",
    hair: "#3a2a1c",
    hat: "#5c4030",
    pack: "#6b4424"
  });
}

function drawPlayer(ctx, player, time, reduced) {
  const moving = Math.hypot(player.vx || 0, player.vy || 0) > 12;
  const inspecting = player.pose === "inspect";
  const dir = player.facing >= 0 ? 1 : -1;
  const bob = reduced ? 0 : inspecting ? 1 : moving ? Math.sin(time * 11) * 2 : Math.sin(time * 1.6) * 0.6;
  const stride = reduced || !moving ? 0 : Math.sin(time * 11) * 5;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.fillStyle = "rgba(30,40,20,0.25)";
  ctx.beginPath();
  ctx.ellipse(0, 11, 15, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3d4f66";
  ctx.fillRect(-9 + stride * 0.15, 2 + bob, 7, 12);
  ctx.fillRect(2 - stride * 0.15, 2 + bob, 7, 12);
  ctx.fillStyle = "#c45c26";
  ctx.fillRect(-10, -16 + bob, 20, 16);
  ctx.fillStyle = "#2a9d8f";
  ctx.fillRect(-8, -20 + bob, 16, 8);
  ctx.fillStyle = "#f0c09a";
  ctx.beginPath();
  ctx.arc(0, -26 + bob, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3a2a1c";
  ctx.beginPath();
  ctx.arc(-2, -29 + bob, 8, Math.PI, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1c1c1c";
  ctx.beginPath();
  ctx.arc(dir * 3, -26 + bob, 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6b4424";
  ctx.fillRect(-5 - dir * 9, -14 + bob, 9, 11);
  if (inspecting) {
    ctx.fillStyle = "#f4efe2";
    ctx.fillRect(dir * 10, -12 + bob, 8, 10);
    ctx.strokeStyle = "#8a6238";
    ctx.strokeRect(dir * 10, -12 + bob, 8, 10);
  }
  ctx.restore();
}

function drawDestination(ctx, state) {
  if (!state.destination) return;
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(state.destination.x, state.destination.y, 10, 0, Math.PI * 2);
  ctx.stroke();
}

function drawLabels(ctx, world, state) {
  const px = state.player.x;
  const py = state.player.y;
  ctx.font = "bold 15px Trebuchet MS, sans-serif";
  ctx.textAlign = "center";
  for (const feature of world.region.features) {
    const d = dist(px, py, feature.x, feature.y);
    if (d > 150) continue;
    const label = feature.name;
    ctx.fillStyle = "rgba(28, 44, 28, 0.72)";
    const w = ctx.measureText(label).width + 18;
    ctx.beginPath();
    roundRect(ctx, feature.x - w / 2, feature.y - 58, w, 24, 10);
    ctx.fill();
    ctx.fillStyle = "#f7f3e8";
    ctx.fillText(label, feature.x, feature.y - 42);
  }
  const extras = state.interpretiveLabels || [];
  ctx.font = "12px Trebuchet MS, sans-serif";
  for (const extra of extras) {
    const w = ctx.measureText(extra.text).width + 14;
    ctx.fillStyle = "rgba(90, 110, 140, 0.82)";
    ctx.beginPath();
    roundRect(ctx, extra.x - w / 2, extra.y + 16, w, 20, 8);
    ctx.fill();
    ctx.fillStyle = "#f7f3e8";
    ctx.fillText(extra.text, extra.x, extra.y + 30);
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
