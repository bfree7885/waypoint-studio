/**
 * Organic landcover helpers. Stylized, not photoreal. Region identity stays.
 */

function hash01(x, y) {
  const n = Math.imul(Math.floor(x) + 374761393, 668265263) ^ Math.imul(Math.floor(y) + 127412617, 1103515245);
  return ((n >>> 0) % 1000) / 1000;
}

export function blobPath(ctx, cx, cy, rx, ry, seed = 1) {
  ctx.beginPath();
  const n = 12;
  for (let i = 0; i <= n; i += 1) {
    const a = (i / n) * Math.PI * 2;
    const k = 0.82 + hash01(cx + seed * 11, cy + i * 17) * 0.28;
    const x = cx + Math.cos(a) * rx * k;
    const y = cy + Math.sin(a) * ry * k;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

export function strokeOrganic(ctx, points, width) {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.lineWidth = width;
  ctx.beginPath();
  points.forEach((pt, i) => {
    if (i === 0) ctx.moveTo(pt[0], pt[1]);
    else {
      const prev = points[i - 1];
      const mx = (prev[0] + pt[0]) / 2;
      const my = (prev[1] + pt[1]) / 2;
      ctx.quadraticCurveTo(prev[0], prev[1], mx, my);
    }
  });
  const last = points[points.length - 1];
  ctx.lineTo(last[0], last[1]);
  ctx.stroke();
}

export function drawCreekWater(ctx, region, time, reduced, night) {
  const creek = region.creek;
  if (!creek) return;
  ctx.strokeStyle = night ? "rgba(28, 48, 58, 0.95)" : "rgba(92, 72, 48, 0.55)";
  strokeOrganic(ctx, creek.points, creek.width * 2.35);
  ctx.strokeStyle = night ? "#1a4a5c" : "#2c86b4";
  strokeOrganic(ctx, creek.points, creek.width * 1.85);
  ctx.strokeStyle = night ? "#2a6a7a" : "#46b4d4";
  strokeOrganic(ctx, creek.points, creek.width * 1.15);
  if (!reduced) {
    ctx.save();
    ctx.strokeStyle = night ? "rgba(180, 210, 220, 0.18)" : "rgba(255,255,255, 0.22)";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    const pts = creek.points;
    for (let i = 0; i < pts.length - 1; i += 2) {
      const t = (Math.sin(time * 2.4 + i) + 1) * 0.5;
      const x = pts[i][0] + (pts[i + 1][0] - pts[i][0]) * t;
      const y = pts[i][1] + (pts[i + 1][1] - pts[i][1]) * t;
      ctx.beginPath();
      ctx.moveTo(x - 5, y - 1);
      ctx.lineTo(x + 5, y + 1);
      ctx.stroke();
    }
    ctx.restore();
  }
  if (region.tributary) {
    ctx.strokeStyle = night ? "#245860" : "#4aa8c8";
    strokeOrganic(ctx, region.tributary.points, region.tributary.width * 1.8);
  }
  if (region.outlet) {
    ctx.strokeStyle = night ? "#1a4a5c" : "#2c86b4";
    strokeOrganic(ctx, region.outlet.points, region.outlet.width * 1.9);
    ctx.strokeStyle = night ? "#2a6a7a" : "#46b4d4";
    strokeOrganic(ctx, region.outlet.points, region.outlet.width * 1.2);
  }
}

export function drawPondWater(ctx, pond, time, reduced, night, alpine) {
  if (!pond) return;
  const shimmer = reduced ? 0 : Math.sin(time * 2.1) * 2;
  ctx.fillStyle = night ? "#163844" : alpine ? "#3a8aaa" : "#2c86b4";
  blobPath(ctx, pond.cx, pond.cy, pond.rx, pond.ry, 3);
  ctx.fill();
  ctx.fillStyle = night ? "#1f5564" : alpine ? "#54b0c8" : "#46b7db";
  blobPath(ctx, pond.cx, pond.cy - 6, pond.rx - 16, pond.ry - 14, 7);
  ctx.fill();
  ctx.fillStyle = night ? "rgba(200, 220, 230, 0.12)" : "rgba(255,255,255,0.26)";
  blobPath(ctx, pond.cx - 36, pond.cy - 24, 48, 18, 9);
  ctx.fill();
  ctx.strokeStyle = night ? "rgba(40, 32, 24, 0.45)" : "rgba(120, 96, 64, 0.45)";
  ctx.lineWidth = 10;
  blobPath(ctx, pond.cx, pond.cy, pond.rx + 6, pond.ry + 6, 3);
  ctx.stroke();
  if (!reduced) {
    ctx.strokeStyle = "rgba(255,255,255,0.28)";
    ctx.lineWidth = 2;
    blobPath(ctx, pond.cx, pond.cy, pond.rx - 28 + shimmer, pond.ry - 20, 5);
    ctx.stroke();
  }
}

export function drawIrregularTree(ctx, tree, time, reduced, night) {
  const sway = reduced ? 0 : Math.sin(time * 1.4 + tree.x * 0.01) * 2.4;
  ctx.fillStyle = night ? "rgba(8, 12, 18, 0.45)" : "rgba(40, 60, 30, 0.22)";
  ctx.beginPath();
  ctx.ellipse(tree.x, tree.y + 8, tree.r * 0.7, tree.r * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();
  if (tree.cactus) {
    ctx.fillStyle = night ? "#1a2e1c" : "#3d6b3a";
    ctx.fillRect(tree.x - 4, tree.y - 22, 8, 24);
    ctx.fillRect(tree.x - 12, tree.y - 16, 8, 4);
    ctx.fillRect(tree.x - 12, tree.y - 16, 4, 10);
    ctx.fillRect(tree.x + 4, tree.y - 14, 8, 4);
    ctx.fillRect(tree.x + 8, tree.y - 14, 4, 8);
    return;
  }
  ctx.fillStyle = night ? "#2a2018" : "#6b4424";
  ctx.fillRect(tree.x - 3.5, tree.y - 10, 7, 18);
  if (tree.pine) {
    const dark = night ? "#16301c" : "#1a5a32";
    const lite = night ? "#1f4630" : "#2a7a44";
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = i === 2 ? lite : dark;
      ctx.beginPath();
      const top = tree.y - 20 - i * 13;
      const spread = tree.r - i * 3.2;
      ctx.moveTo(tree.x + sway, top - 16);
      ctx.lineTo(tree.x - spread - 3, tree.y - 2 - i * 10);
      ctx.lineTo(tree.x - spread * 0.2, tree.y - 6 - i * 10);
      ctx.lineTo(tree.x + spread * 0.35, tree.y - 4 - i * 10);
      ctx.lineTo(tree.x + spread + 2, tree.y - 2 - i * 10);
      ctx.closePath();
      ctx.fill();
    }
    return;
  }
  ctx.fillStyle = night ? "#163820" : "#247a38";
  blobPath(ctx, tree.x + sway, tree.y - 24, tree.r * 1.05, tree.r * 0.92, tree.x);
  ctx.fill();
  ctx.fillStyle = night ? "#1f4a28" : "#3d9a4e";
  blobPath(ctx, tree.x - 6 + sway, tree.y - 30, tree.r * 0.62, tree.r * 0.5, tree.y);
  ctx.fill();
}

export function bakeAlpineStructure(ctx, region) {
  const peak = region.peak;
  ctx.fillStyle = "rgba(168, 176, 186, 0.55)";
  ctx.beginPath();
  ctx.moveTo(-40, 280);
  ctx.lineTo(220, 90);
  ctx.lineTo(480, 160);
  ctx.lineTo(760, 40);
  ctx.lineTo(1100, 130);
  ctx.lineTo(1480, 20);
  ctx.lineTo(1920, 110);
  ctx.lineTo(2560, 60);
  ctx.lineTo(2560, 320);
  ctx.lineTo(-40, 320);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(210, 214, 218, 0.62)";
  ctx.beginPath();
  ctx.moveTo(peak.x - 380, peak.y + 240);
  ctx.lineTo(peak.x - 220, peak.y + 36);
  ctx.lineTo(peak.x - 90, peak.y - 108);
  ctx.lineTo(peak.x + 8, peak.y - 48);
  ctx.lineTo(peak.x + 150, peak.y - 86);
  ctx.lineTo(peak.x + 320, peak.y + 210);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f4f6f8";
  ctx.beginPath();
  ctx.moveTo(peak.x - 70, peak.y - 20);
  ctx.lineTo(peak.x - 84, peak.y - 108);
  ctx.lineTo(peak.x - 20, peak.y - 24);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(148, 156, 148, 0.55)";
  ctx.beginPath();
  ctx.moveTo(1680, 980);
  ctx.lineTo(1880, 1080);
  ctx.lineTo(2140, 1180);
  ctx.lineTo(2280, 1320);
  ctx.lineTo(1680, 1280);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(176, 186, 140, 0.45)";
  ctx.beginPath();
  ctx.ellipse(1988, 1140, 210, 90, -0.18, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(168, 164, 158, 0.72)";
  for (const rib of [
    [600, 760, 44, 96, -0.6],
    [520, 620, 38, 84, -0.4],
    [1280, 540, 52, 74, 0.3],
    [460, 508, 34, 58, -0.2],
    [980, 1380, 40, 48, 0.15]
  ]) {
    ctx.beginPath();
    ctx.moveTo(rib[0] - rib[2], rib[1] + rib[3]);
    ctx.lineTo(rib[0], rib[1] - 22);
    ctx.lineTo(rib[0] + rib[2] * 0.7, rib[1] + rib[3] * 0.85);
    ctx.lineTo(rib[0] + rib[2] * 0.2, rib[1] + rib[3] * 1.05);
    ctx.closePath();
    ctx.fill();
  }
  ctx.strokeStyle = "rgba(120, 108, 92, 0.45)";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(470, 520);
  ctx.quadraticCurveTo(540, 680, 620, 960);
  ctx.quadraticCurveTo(700, 1120, 860, 1320);
  ctx.stroke();
  ctx.strokeStyle = "rgba(150, 138, 118, 0.35)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(500, 500);
  ctx.quadraticCurveTo(640, 640, 720, 820);
  ctx.stroke();
  ctx.fillStyle = "rgba(186, 176, 164, 0.55)";
  ctx.beginPath();
  ctx.moveTo(540, 700);
  ctx.lineTo(620, 780);
  ctx.lineTo(700, 860);
  ctx.lineTo(580, 840);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(236, 240, 244, 0.55)";
  ctx.beginPath();
  ctx.ellipse(540, 430, 36, 16, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(1288, 240, 22, 10, 0.2, 0, Math.PI * 2);
  ctx.fill();
  bakeRidgeMeadow(ctx, region);
}

export function bakeRidgeMeadow(ctx, region) {
  const s = region.station;
  const cx = s.x + s.w * 0.55;
  const cy = s.y + s.h + 70;
  ctx.fillStyle = "rgba(168, 176, 132, 0.38)";
  ctx.beginPath();
  ctx.ellipse(cx + 40, cy + 20, 210, 95, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(148, 162, 118, 0.28)";
  ctx.beginPath();
  ctx.ellipse(cx - 80, cy + 50, 120, 48, 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(186, 176, 140, 0.32)";
  ctx.beginPath();
  ctx.ellipse(cx + 150, cy - 10, 70, 36, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(130, 118, 96, 0.28)";
  ctx.lineWidth = 7;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(s.x - 30, s.y + s.h + 8);
  ctx.quadraticCurveTo(s.x + 80, s.y + s.h + 70, s.x + 210, s.y + s.h + 110);
  ctx.stroke();
  ctx.strokeStyle = "rgba(176, 164, 132, 0.4)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(s.x + 20, s.y + s.h + 24);
  ctx.quadraticCurveTo(s.x + 90, cy + 30, s.x + 160, cy + 80);
  ctx.stroke();
  ctx.fillStyle = "rgba(176, 168, 156, 0.5)";
  ctx.beginPath();
  ctx.moveTo(s.x - 90, s.y + 20);
  ctx.lineTo(s.x - 20, s.y + 80);
  ctx.lineTo(s.x + 40, s.y + 110);
  ctx.lineTo(s.x - 40, s.y + 130);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(196, 188, 168, 0.45)";
  for (const patch of [
    [s.x + 200, s.y + 40, 28, 14],
    [s.x + 240, s.y + 90, 22, 12],
    [s.x - 50, s.y + 150, 26, 11]
  ]) {
    ctx.beginPath();
    ctx.ellipse(patch[0], patch[1], patch[2], patch[3], -0.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function bakeDesertStructure(ctx, region, night = false) {
  const peak = region.peak;
  const mesa = night ? "#3a322c" : "#b67a48";
  const band = night ? "#4a3c32" : "#c99258";
  const face = night ? "#52463c" : "#d4a06a";
  const talus = night ? "#2e2822" : "#c4a070";
  ctx.fillStyle = mesa;
  ctx.beginPath();
  ctx.moveTo(peak.x - 300, peak.y + 200);
  ctx.lineTo(peak.x - 160, peak.y + 40);
  ctx.lineTo(peak.x - 40, peak.y - 10);
  ctx.lineTo(peak.x + 80, peak.y - 58);
  ctx.lineTo(peak.x + 240, peak.y + 170);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = band;
  ctx.fillRect(peak.x - 120, peak.y + 40, 220, 10);
  ctx.fillRect(peak.x - 90, peak.y + 70, 170, 8);
  ctx.fillRect(peak.x - 60, peak.y + 98, 130, 7);
  ctx.fillStyle = face;
  ctx.beginPath();
  ctx.moveTo(peak.x - 20, peak.y + 30);
  ctx.lineTo(peak.x + 30, peak.y - 62);
  ctx.lineTo(peak.x + 96, peak.y + 48);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = talus;
  ctx.beginPath();
  ctx.moveTo(peak.x - 220, peak.y + 210);
  ctx.lineTo(peak.x - 80, peak.y + 150);
  ctx.lineTo(peak.x + 40, peak.y + 170);
  ctx.lineTo(peak.x + 180, peak.y + 200);
  ctx.lineTo(peak.x + 40, peak.y + 230);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = night ? "rgba(70, 58, 46, 0.7)" : "rgba(168, 128, 82, 0.45)";
  ctx.lineWidth = 14;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(1320, 1288);
  ctx.quadraticCurveTo(1480, 1220, 1620, 1180);
  ctx.stroke();
  ctx.strokeStyle = night ? "rgba(90, 70, 48, 0.55)" : "rgba(196, 150, 96, 0.4)";
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(region.station.x + 40, region.station.y + region.station.h + 12);
  ctx.lineTo(1512, 1140);
  ctx.stroke();
  if (region.pond) {
    ctx.strokeStyle = night ? "rgba(48, 40, 32, 0.7)" : "rgba(150, 96, 58, 0.5)";
    ctx.lineWidth = 16;
    blobPath(ctx, region.pond.cx, region.pond.cy, region.pond.rx + 12, region.pond.ry + 12, 4);
    ctx.stroke();
  }
}

export function bakeHollowRock(ctx, region) {
  const peak = region.peak;
  ctx.fillStyle = "#d2c6b4";
  ctx.beginPath();
  ctx.moveTo(peak.x - 250, peak.y + 138);
  ctx.lineTo(peak.x - 120, peak.y + 20);
  ctx.lineTo(peak.x - 90, peak.y - 30);
  ctx.lineTo(peak.x - 10, peak.y - 118);
  ctx.lineTo(peak.x + 48, peak.y - 44);
  ctx.lineTo(peak.x + 70, peak.y - 28);
  ctx.lineTo(peak.x + 160, peak.y + 36);
  ctx.lineTo(peak.x + 236, peak.y + 148);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#efe8dc";
  ctx.beginPath();
  ctx.moveTo(peak.x - 36, peak.y - 16);
  ctx.lineTo(peak.x - 8, peak.y - 122);
  ctx.lineTo(peak.x + 42, peak.y - 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#b7a790";
  ctx.beginPath();
  ctx.moveTo(peak.x - 170, peak.y + 74);
  ctx.lineTo(peak.x - 48, peak.y - 16);
  ctx.lineTo(peak.x + 16, peak.y + 86);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(120, 108, 84, 0.28)";
  ctx.beginPath();
  ctx.ellipse(1080, 1188, 140, 58, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(90, 110, 70, 0.22)";
  ctx.beginPath();
  ctx.ellipse(560, 800, 180, 70, 0.2, 0, Math.PI * 2);
  ctx.fill();
}

export function drawRunoffBench(ctx, prop, visual = {}) {
  const slope = visual.slope || "moderate";
  const water = visual.water || "one-cup";
  const running = Boolean(visual.running);
  const lift = slope === "steep" ? 22 : slope === "gentle" ? 6 : 14;
  const cups = water === "extra" ? 2 : 1;
  ctx.fillStyle = "rgba(40, 30, 16, 0.2)";
  ctx.fillRect(prop.x - 40, prop.y + 6, 84, 10);
  ctx.fillStyle = "#6d4c32";
  ctx.fillRect(prop.x - 34, prop.y, 10, 12);
  ctx.fillRect(prop.x + 28, prop.y - lift + 8, 10, 12 + lift);
  ctx.fillStyle = "#8a6238";
  ctx.beginPath();
  ctx.moveTo(prop.x - 32, prop.y - 2);
  ctx.lineTo(prop.x + 36, prop.y - lift);
  ctx.lineTo(prop.x + 36, prop.y - lift + 10);
  ctx.lineTo(prop.x - 32, prop.y + 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#c4a46a";
  ctx.beginPath();
  ctx.moveTo(prop.x - 28, prop.y);
  ctx.lineTo(prop.x + 32, prop.y - lift + 2);
  ctx.lineTo(prop.x + 30, prop.y - lift + 8);
  ctx.lineTo(prop.x - 28, prop.y + 6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = "#5a3e22";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(prop.x + 18, prop.y - 2);
  ctx.lineTo(prop.x + 18, prop.y + 10);
  ctx.stroke();
  ctx.fillStyle = "#8aa0b0";
  for (let i = 0; i < cups; i += 1) {
    ctx.fillRect(prop.x - 38 + i * 12, prop.y - 16, 10, 12);
  }
  ctx.fillStyle = "#3a6a8a";
  ctx.fillRect(prop.x + 30, prop.y - 4, 16, 12);
  ctx.fillStyle = "#f4efe2";
  ctx.fillRect(prop.x - 18, prop.y + 10, 14, 10);
  ctx.strokeStyle = "#8a6238";
  ctx.lineWidth = 1;
  ctx.strokeRect(prop.x - 18, prop.y + 10, 14, 10);
  ctx.fillStyle = "#5a3e22";
  ctx.fillRect(prop.x - 30, prop.y - 8, 8, 6);
  if (running) {
    ctx.strokeStyle = "rgba(70, 160, 200, 0.85)";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(prop.x - 24, prop.y);
    ctx.lineTo(prop.x + 28, prop.y - lift + 6);
    ctx.stroke();
  }
}

export const DENSITY_MARK = "landcover-v76";
export const MEADOW_MARK = "ridge-meadow-v77";
