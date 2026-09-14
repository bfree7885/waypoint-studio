/**
 * Lightweight regional atmosphere: sky, haze, clouds, dust, wind.
 * Configured from presentation.json, not per-draw if/else piles.
 */

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function hexToRgb(hex) {
  const n = hex.replace("#", "");
  return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)];
}

export function skyFill(cfg, desertSky) {
  if (desertSky?.darkSky) return { top: "#07091a", horizon: "#1c283c" };
  if (desertSky?.night) return { top: "#070b18", horizon: "#2a2438" };
  if (desertSky && desertSky.sun) {
    const alt = desertSky.sun.altitudeDeg ?? 40;
    if (alt < 6) return { top: "#f0a060", horizon: "#9ad0f0" };
    if (alt < 18) return { top: "#f2c080", horizon: "#b8d8f0" };
    return { top: cfg.skyTop, horizon: cfg.skyHorizon };
  }
  return { top: cfg.skyTop, horizon: cfg.skyHorizon };
}

export function drawBackdrop(ctx, width, height, time, reduced, cfg, sky, stars) {
  const fill = skyFill(cfg, sky);
  const g = ctx.createLinearGradient(0, 0, 0, height * 0.46);
  g.addColorStop(0, fill.top);
  g.addColorStop(1, fill.horizon);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, width, height * 0.46);

  if (sky?.night) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.strokeStyle = "#c8d4f0";
    ctx.lineWidth = 22;
    ctx.beginPath();
    ctx.moveTo(width * 0.02, height * 0.3);
    ctx.quadraticCurveTo(width * 0.5, height * 0.0, width * 0.98, height * 0.24);
    ctx.stroke();
    ctx.restore();
    ctx.fillStyle = "#f4efe2";
    for (const star of stars || []) {
      ctx.globalAlpha = (sky?.darkSky ? 0.62 : 0.5) + star.s * 0.35;
      ctx.beginPath();
      ctx.arc(star.x * width, star.y * height * 0.5, star.s * (sky?.darkSky ? 1.35 : 1.15), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const moon = sky.moon;
    if (moon && moon.altitudeDeg > -4 && !sky.darkSky) {
      const mx = width * (0.18 + (moon.azimuthDeg / 360) * 0.64);
      const my = height * 0.26 - (moon.altitudeDeg / 90) * height * 0.16;
      ctx.fillStyle = "#efe6cc";
      ctx.beginPath();
      ctx.arc(mx, my, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(10, 14, 28, 0.62)";
      ctx.beginPath();
      ctx.arc(mx + (moon.waxing ? -6 : 6), my, 13, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  if (sky?.sun && sky.sun.altitudeDeg > 0) {
    const sx = width * (0.15 + (sky.sun.azimuthDeg / 360) * 0.7);
    const sy = Math.max(16, height * 0.3 - (sky.sun.altitudeDeg / 90) * height * 0.22);
    ctx.fillStyle = "#f4d76a";
    ctx.beginPath();
    ctx.arc(sx, sy, 17, 0, Math.PI * 2);
    ctx.fill();
  }

  const n = cfg.clouds || 0;
  if (!n) return;
  const drift = reduced ? 0 : (time * (5 + cfg.wind * 6)) % (width + 280);
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  for (let i = 0; i < n; i += 1) {
    const x = ((drift * (0.35 + i * 0.16) + i * 220) % (width + 220)) - 70;
    const y = 28 + i * 18;
    ctx.beginPath();
    ctx.ellipse(x, y, 68 - i * 7, 16, 0, 0, Math.PI * 2);
    ctx.ellipse(x + 34, y + 3, 46, 13, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawHaze(ctx, width, height, cfg, night) {
  if (!cfg.haze) return;
  const a = night ? cfg.haze * 0.35 : cfg.haze;
  const rgb = hexToRgb(cfg.skyHorizon);
  ctx.fillStyle = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
  ctx.fillRect(0, height * 0.42, width, height * 0.2);
}

export function drawDust(ctx, world, time, reduced, cfg) {
  if (!cfg.dust || reduced) return;
  ctx.fillStyle = "rgba(214, 186, 132, 0.18)";
  for (let i = 0; i < 10; i += 1) {
    const x = (i * 211 + time * 28 * cfg.wind) % world.region.width;
    const y = 420 + ((i * 97 + time * 9) % 700);
    ctx.beginPath();
    ctx.ellipse(x, y, 18, 4, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawBirds(ctx, world, time, reduced, cfg) {
  if (!cfg.birds || reduced) return;
  ctx.strokeStyle = "rgba(40, 48, 40, 0.45)";
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 2; i += 1) {
    const x = (time * 18 + i * 420) % (world.region.width + 80) - 40;
    const y = 80 + Math.sin(time * 0.7 + i) * 18 + i * 40;
    ctx.beginPath();
    ctx.moveTo(x - 6, y);
    ctx.quadraticCurveTo(x, y - 5, x + 6, y);
    ctx.stroke();
  }
}

export function shadeFromSun(sky) {
  if (!sky?.sun || sky.night || sky.sun.altitudeDeg <= 0) return { dx: 8, dy: 6, alpha: 0.2, length: 1 };
  const az = ((sky.sun.azimuthDeg || 180) * Math.PI) / 180;
  const alt = Math.max(8, sky.sun.altitudeDeg);
  const length = lerp(2.4, 0.55, Math.min(1, alt / 70));
  return {
    dx: Math.sin(az) * 10 * length,
    dy: Math.cos(az) * 6 * length,
    alpha: lerp(0.34, 0.14, Math.min(1, alt / 70)),
    length
  };
}

export const ATMOSPHERE_KEYS = ["haze", "wind", "clouds", "dust", "birds"];
