/**
 * Field Service stations and environmental work-props.
 * Shared emblem; buildings adapt to climate.
 */

export function drawEmblem(ctx, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.fillStyle = "#1f4d32";
  ctx.beginPath();
  ctx.arc(0, 0, 11, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#e8d7a8";
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.arc(0, 0, 9.2, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-7, 4);
  ctx.lineTo(-3, -2);
  ctx.lineTo(0, 2);
  ctx.lineTo(3, -4);
  ctx.lineTo(7, 4);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-6, -5);
  ctx.lineTo(6, -5);
  ctx.stroke();
  ctx.restore();
}

function plaque(ctx, x, y, w, title, sub) {
  ctx.fillStyle = "rgba(28, 36, 24, 0.82)";
  ctx.fillRect(x, y, w, 28);
  ctx.fillStyle = "#e8d7a8";
  ctx.font = "bold 11px Trebuchet MS, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(title, x + w / 2, y + 12);
  ctx.font = "9px Trebuchet MS, sans-serif";
  ctx.fillStyle = "#c8d4bc";
  ctx.fillText(sub, x + w / 2, y + 23);
}

function caseBox(ctx, x, y, color = "#6b4a2a") {
  ctx.fillStyle = "rgba(20, 20, 16, 0.22)";
  ctx.fillRect(x + 2, y + 10, 22, 6);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, 22, 12);
  ctx.fillStyle = "#c4a06a";
  ctx.fillRect(x + 8, y + 3, 6, 3);
}

function radioMast(ctx, x, y, h = 54) {
  ctx.strokeStyle = "#5a4a38";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - h);
  ctx.stroke();
  ctx.strokeStyle = "rgba(90, 74, 56, 0.5)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x - 10, y - 8);
  ctx.lineTo(x, y - h * 0.55);
  ctx.lineTo(x + 10, y - 8);
  ctx.stroke();
}

export function drawStationBuilding(ctx, region, night = false) {
  const s = region.station;
  const model = region.terrainModel;
  if (model === "sunfall-desert") return drawSunfallStation(ctx, s, night);
  if (model === "high-country") return drawRidgeStation(ctx, s, night);
  return drawHollowStation(ctx, s, night);
}

function drawHollowStation(ctx, s, night) {
  ctx.fillStyle = "rgba(40, 50, 30, 0.22)";
  ctx.fillRect(s.x + 10, s.y + s.h - 4, s.w + 8, 18);
  ctx.fillStyle = "#cbb48a";
  ctx.fillRect(s.x - 22, s.y + s.h - 16, s.w + 48, 18);
  ctx.fillStyle = "#b56a3a";
  ctx.fillRect(s.x, s.y + 8, s.w, s.h - 8);
  ctx.fillStyle = "#8a3324";
  ctx.beginPath();
  ctx.moveTo(s.x - 18, s.y + 16);
  ctx.lineTo(s.x + s.w / 2, s.y - 48);
  ctx.lineTo(s.x + s.w + 18, s.y + 16);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#6d4c32";
  ctx.fillRect(s.x + s.w / 2 - 15, s.y + s.h - 44, 30, 44);
  ctx.fillStyle = night ? "rgba(240, 210, 120, 0.7)" : "#f4e2a8";
  ctx.fillRect(s.x + 16, s.y + 32, 26, 20);
  ctx.fillRect(s.x + s.w - 44, s.y + 32, 26, 20);
  ctx.fillStyle = "#7a3b1e";
  ctx.fillRect(s.x + s.w - 26, s.y - 22, 12, 32);
  ctx.fillStyle = "rgba(230,230,230,0.75)";
  ctx.beginPath();
  ctx.ellipse(s.x + s.w - 20, s.y - 36, 9, 13, 0, 0, Math.PI * 2);
  ctx.fill();
  radioMast(ctx, s.x + s.w + 28, s.y + s.h - 10, 62);
  ctx.fillStyle = "#c45c26";
  ctx.beginPath();
  ctx.moveTo(s.x + s.w + 28, s.y + 8);
  ctx.lineTo(s.x + s.w + 28, s.y + 34);
  ctx.lineTo(s.x + s.w + 52, s.y + 21);
  ctx.closePath();
  ctx.fill();
  drawEmblem(ctx, s.x + 28, s.y + 22, 1.05);
  caseBox(ctx, s.x - 36, s.y + s.h - 18);
  caseBox(ctx, s.x - 10, s.y + s.h - 14, "#4a5c3a");
  plaque(ctx, s.x + 18, s.y + s.h + 8, 140, "FIELD SERVICE", "Cedar Hollow Station");
}

function drawRidgeStation(ctx, s, night) {
  ctx.fillStyle = "rgba(20, 28, 32, 0.28)";
  ctx.fillRect(s.x + 8, s.y + s.h - 2, s.w, 16);
  ctx.fillStyle = "#8a8e82";
  ctx.fillRect(s.x - 16, s.y + s.h - 14, s.w + 36, 16);
  ctx.fillStyle = "#6d736c";
  ctx.fillRect(s.x, s.y + 18, s.w, s.h - 18);
  ctx.fillStyle = "#4a524c";
  ctx.fillRect(s.x - 8, s.y + 10, s.w + 16, 16);
  ctx.fillStyle = "#c5c8bc";
  ctx.beginPath();
  ctx.moveTo(s.x - 12, s.y + 18);
  ctx.lineTo(s.x + s.w / 2, s.y - 18);
  ctx.lineTo(s.x + s.w + 12, s.y + 18);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#3d4440";
  ctx.fillRect(s.x + s.w / 2 - 14, s.y + s.h - 40, 28, 40);
  ctx.fillStyle = night ? "rgba(200, 220, 240, 0.55)" : "#dfe8ee";
  ctx.fillRect(s.x + 14, s.y + 36, 22, 16);
  ctx.fillRect(s.x + s.w - 40, s.y + 36, 22, 16);
  radioMast(ctx, s.x - 18, s.y + s.h - 8, 70);
  ctx.strokeStyle = "#c45c26";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(s.x - 18, s.y - 8);
  ctx.lineTo(s.x - 18, s.y + 18);
  ctx.lineTo(s.x + 4, s.y + 6);
  ctx.stroke();
  drawEmblem(ctx, s.x + 26, s.y + 32, 0.95);
  caseBox(ctx, s.x + s.w + 8, s.y + s.h - 16, "#4a524c");
  plaque(ctx, s.x + 10, s.y + s.h + 8, 150, "FIELD SERVICE", "Ridgeline Station");
}

function drawSunfallStation(ctx, s, night) {
  ctx.fillStyle = "rgba(40, 30, 16, 0.24)";
  ctx.fillRect(s.x + 8, s.y + s.h - 4, s.w, 18);
  ctx.fillStyle = "#c4a06a";
  ctx.fillRect(s.x - 28, s.y + s.h - 14, s.w + 56, 16);
  ctx.fillStyle = "#d2b48c";
  ctx.fillRect(s.x - 36, s.y + 36, 40, 10);
  ctx.fillStyle = "#d8c09a";
  ctx.fillRect(s.x, s.y + 26, s.w, s.h - 26);
  ctx.fillStyle = "#8a6a48";
  ctx.fillRect(s.x + 14, s.y + s.h - 46, 22, 34);
  ctx.fillStyle = night ? "rgba(240, 196, 76, 0.62)" : "#f4e2a8";
  ctx.fillRect(s.x + 48, s.y + 42, 20, 14);
  ctx.fillRect(s.x + s.w - 50, s.y + 42, 20, 14);
  ctx.fillStyle = "#c4783c";
  ctx.beginPath();
  ctx.arc(s.x + s.w * 0.62, s.y + 20, 38, Math.PI, 0);
  ctx.fill();
  ctx.fillStyle = night ? "#f2e6c4" : "#e8d2a8";
  ctx.beginPath();
  ctx.arc(s.x + s.w * 0.62, s.y + 20, 24, Math.PI, 0);
  ctx.fill();
  if (night) {
    ctx.fillStyle = "rgba(240, 196, 76, 0.16)";
    ctx.beginPath();
    ctx.arc(s.x + 28, s.y + 48, 40, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(240, 196, 76, 0.2)";
    ctx.beginPath();
    ctx.arc(s.x + s.w * 0.62, s.y + 8, 22, 0, Math.PI * 2);
    ctx.fill();
  }
  radioMast(ctx, s.x + s.w + 18, s.y + s.h - 8, 48);
  drawEmblem(ctx, s.x + 24, s.y + 40, 1);
  caseBox(ctx, s.x - 48, s.y + s.h - 16);
  plaque(ctx, s.x + 22, s.y + s.h + 8, 156, "FIELD SERVICE", "Sunfall Observatory");
}

export function drawWorkProps(ctx, region, time, reduced) {
  const s = region.station;
  const model = region.terrainModel;
  ctx.save();
  if (model !== "sunfall-desert") {
    const sway = reduced ? 0 : Math.sin(time * 1.4) * 3;
    ctx.fillStyle = "#6d4c32";
    ctx.fillRect(s.x - 48, s.y + 8, 4, 36);
    ctx.fillStyle = "#c45c26";
    ctx.beginPath();
    ctx.moveTo(s.x - 46, s.y + 10);
    ctx.lineTo(s.x - 46 + sway, s.y + 28);
    ctx.lineTo(s.x - 46, s.y + 22);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = "#5c4030";
  ctx.fillRect(s.x + s.w * 0.18, s.y + s.h + 36, 18, 8);
  ctx.fillStyle = "#d8c9a4";
  ctx.fillRect(s.x + s.w * 0.18 + 2, s.y + s.h + 32, 14, 6);
  ctx.restore();
}

export const STATION_IDENTITY = {
  network: "FIELD SERVICE",
  variants: ["cedar-hollow", "high-country", "sunfall-desert"]
};
