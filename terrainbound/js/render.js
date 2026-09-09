/**
 * Cartoon world renderer. Terrain is baked once; water, details, and characters animate.
 */

import { groundColor, dist, desertNightColor } from "./world.js";
import { starField } from "./celestial.js";
import { drawExplorer, drawWren, poseFromIntent } from "./character.js";
import { drawStationBuilding, drawWorkProps } from "./stations.js";
import { drawBackdrop, drawHaze, drawDust, drawBirds, shadeFromSun } from "./atmosphere.js";
import {
  blobPath,
  drawCreekWater,
  drawPondWater,
  drawIrregularTree,
  bakeAlpineStructure,
  bakeDesertStructure,
  bakeHollowRock,
  drawRunoffBench
} from "./density.js";

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function createRenderer(canvas, world, helpers) {
  const ctx = canvas.getContext("2d");
  const ground = document.createElement("canvas");
  ground.width = world.region.width;
  ground.height = world.region.height;
  bakeGround(ground, world, helpers);
  const nightGround = document.createElement("canvas");
  nightGround.width = world.region.width;
  nightGround.height = world.region.height;
  if (world.region.terrainModel === "sunfall-desert") {
    bakeGround(nightGround, world, helpers, (hex) => desertNightColor(hex, 0));
  }
  const leaves = Array.from({ length: 14 }, (_, i) => ({
    x: ((i * 173) % world.region.width),
    y: ((i * 97) % world.region.height),
    s: 0.7 + (i % 4) * 0.15,
    phase: i * 0.7
  }));

  const stars = starField(2210, 90);

  return {
    draw(state) {
      const { width, height } = canvas;
      const desert = world.region.terrainModel === "sunfall-desert";
      const alpine = world.region.terrainModel === "high-country";
      const sky = state.sky;
      const night = Boolean(desert && sky?.night);
      const atm = state.atmosphere || {
        skyTop: alpine ? "#6aa8d4" : desert ? "#8ec8f0" : "#7ec8ea",
        skyHorizon: alpine ? "#d7e4ee" : desert ? "#f2d9a8" : "#c5e4c8",
        haze: alpine ? 0.22 : 0.12,
        wind: alpine ? 0.85 : 0.4,
        clouds: alpine ? 4 : 3,
        dust: desert ? 1 : 0,
        birds: !desert,
        water: !desert
      };
      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.fillStyle = night ? "#0b1020" : atm.skyHorizon;
      ctx.fillRect(0, 0, width, height);
      drawBackdrop(ctx, width, height, state.time, state.reducedMotion, atm, sky, stars);
      ctx.translate(width / 2, height / 2);
      ctx.scale(state.camera.scale, state.camera.scale);
      ctx.translate(-state.camera.x, -state.camera.y);
      const moonLift = night ? Math.max(0, (sky?.moon?.illumination || 0) * Math.max(0, (sky?.moon?.altitudeDeg || 0) / 70)) : 0;
      if (night && world.region.terrainModel === "sunfall-desert") {
        ctx.drawImage(nightGround, 0, 0);
        if (moonLift > 0.05) {
          ctx.fillStyle = `rgba(186, 206, 224, ${0.03 + moonLift * 0.09})`;
          ctx.fillRect(0, 0, world.region.width, world.region.height);
        }
      } else {
        ctx.drawImage(ground, 0, 0);
      }
      if (!night && desert && sky?.sun) {
        const shade = shadeFromSun(sky);
        ctx.fillStyle = `rgba(40, 24, 10, ${shade.alpha * 0.35})`;
        ctx.fillRect(0, 0, world.region.width, world.region.height);
      }
      if (!desert) drawWater(ctx, world, state.time, state.reducedMotion, night);
      else drawDryWash(ctx, world, night);
      if (state.flowVisible) drawFlowArrows(ctx, world, state.time);
      if (state.landscapeInterpreted) drawIceFlowArrows(ctx, state);
      drawStoryProps(ctx, world.region, state.time, state.reducedMotion, state.flumeVisual, night);
      drawGnomonShadow(ctx, world.region, sky);
      drawChallengeSites(ctx, state);
      drawDiscoveryLandmarks(ctx, world, state);
      drawDetails(ctx, world, state.time, state.reducedMotion, night);
      if (!state.reducedMotion && !alpine && !desert) {
        drawLeaves(ctx, leaves, world.region, state.time);
      }
      if (!night) drawDust(ctx, world, state.time, state.reducedMotion, atm);
      drawTrees(ctx, world, state.time, state.reducedMotion, night);
      drawStationBuilding(ctx, world.region, night);
      drawWorkProps(ctx, world.region, state.time, state.reducedMotion);
      drawNearHint(ctx, world, state);
      const ranger = world.region.ranger;
      drawWren(ctx, ranger.x, ranger.y, {
        time: state.time,
        reduced: state.reducedMotion,
        night,
        pose: state.talking ? "talk" : "idle",
        facing: ranger.x > (state.player?.x || 0) ? -1 : 1
      });
      const moving = Math.hypot(state.player.vx || 0, state.player.vy || 0) > 12;
      const pose = poseFromIntent({
        moving,
        journalOpen: Boolean(state.journalOpen),
        talking: Boolean(state.talking),
        pose: state.player.pose
      });
      drawExplorer(ctx, state.player.x, state.player.y, {
        facing: state.player.facing,
        time: state.time,
        reduced: state.reducedMotion,
        pose,
        appearance: state.appearance,
        night
      });
      drawDestination(ctx, state);
      drawLabels(ctx, world, state);
      drawBirds(ctx, world, state.time, state.reducedMotion, atm);
      ctx.restore();
      drawHaze(ctx, width, height, atm, night);
    }
  };
}

function drawDryWash(ctx, world, night = false) {
  const { region } = world;
  if (!region.creek) return;
  ctx.strokeStyle = night ? "rgba(48, 40, 32, 0.85)" : "rgba(168, 132, 82, 0.75)";
  ctx.lineWidth = region.creek.width * 1.8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  strokeLine(ctx, region.creek.points);
  ctx.strokeStyle = night ? "rgba(72, 58, 42, 0.7)" : "rgba(210, 176, 118, 0.55)";
  ctx.lineWidth = region.creek.width * 0.9;
  strokeLine(ctx, region.creek.points);
}

function drawGnomonShadow(ctx, region, sky) {
  const prop = (region.props || []).find((item) => item.kind === "gnomon");
  if (!prop || !sky?.shadow?.visible) return;
  const len = Math.min(90, 18 + sky.shadow.length * 16);
  const rad = ((sky.shadow.directionDeg - 90) * Math.PI) / 180;
  ctx.save();
  ctx.strokeStyle = "rgba(40, 28, 16, 0.45)";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(prop.x, prop.y);
  ctx.lineTo(prop.x + Math.cos(rad) * len, prop.y + Math.sin(rad) * len);
  ctx.stroke();
  ctx.restore();
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

function bakeGround(canvas, world, helpers, tintHex) {
  const ctx = canvas.getContext("2d");
  const { region } = world;
  const night = Boolean(tintHex);
  const step = 2;
  const img = ctx.createImageData(region.width, region.height);
  const data = img.data;
  for (let y = 0; y < region.height; y += step) {
    for (let x = 0; x < region.width; x += step) {
      let hex = groundColor(region, x, y);
      if (hex && tintHex) hex = tintHex(hex, x, y);
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

  if (region.terrainModel === "sunfall-desert") {
    bakeDesertStructure(ctx, region, night);
  } else if (region.terrainModel === "high-country") {
    bakeAlpineStructure(ctx, region);
  } else {
    bakeHollowRock(ctx, region);
  }

  if (region.outcrop) {
    ctx.fillStyle = night ? "#3a3834" : "#c4b49a";
    blobPath(ctx, region.outcrop.x, region.outcrop.y, 70, 42, 4);
    ctx.fill();
    ctx.fillStyle = night ? "#2c2a26" : "#a89880";
    blobPath(ctx, region.outcrop.x + 8, region.outcrop.y + 6, 48, 22, 9);
    ctx.fill();
  }

  ctx.strokeStyle = night ? "rgba(48, 40, 32, 0.7)" : "rgba(120, 96, 72, 0.45)";
  ctx.lineWidth = 16;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const trail of region.trails) strokeLine(ctx, trail.points);
  ctx.strokeStyle = night ? "rgba(72, 62, 48, 0.8)" : "rgba(214, 188, 142, 0.92)";
  ctx.lineWidth = 8;
  for (const trail of region.trails) strokeLine(ctx, trail.points);

  ctx.strokeStyle = night ? "rgba(80, 68, 48, 0.4)" : "rgba(214, 196, 120, 0.55)";
  ctx.lineWidth = 8;
  if (region.pond && region.terrainModel !== "sunfall-desert") {
    blobPath(ctx, region.pond.cx, region.pond.cy, region.pond.rx + 10, region.pond.ry + 8, 2);
    ctx.stroke();
  }
}

function strokeLine(ctx, points) {
  ctx.beginPath();
  points.forEach((pt, i) => {
    if (i === 0) ctx.moveTo(pt[0], pt[1]);
    else ctx.lineTo(pt[0], pt[1]);
  });
  ctx.stroke();
}

function drawWater(ctx, world, time, reduced, night = false) {
  const { region } = world;
  drawCreekWater(ctx, region, time, reduced, night);
  drawPondWater(ctx, region.pond, time, reduced, night, region.terrainModel === "high-country");
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

function drawDetails(ctx, world, time, reduced, night = false) {
  const sorted = world.details.slice().sort((a, b) => a.y - b.y);
  for (const d of sorted) {
    const sway = reduced ? 0 : Math.sin(time * 1.6 + d.x * 0.02) * 1.8;
    if (d.kind === "rock" || d.kind === "boulder" || d.kind === "talus") {
      ctx.fillStyle = night ? "rgba(8,10,16,0.35)" : "rgba(40,40,30,0.18)";
      ctx.beginPath();
      ctx.ellipse(d.x, d.y + 4, d.kind === "boulder" ? 16 : 9, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = night
        ? d.kind === "boulder"
          ? "#3a3c44"
          : "#4a4640"
        : d.kind === "boulder"
          ? "#8d8070"
          : d.kind === "talus"
            ? "#9a9084"
            : "#9a8b78";
      ctx.beginPath();
      ctx.moveTo(d.x - 10 * d.s, d.y + 4);
      ctx.lineTo(d.x - 4 * d.s, d.y - 7 * d.s);
      ctx.lineTo(d.x + 8 * d.s, d.y - 5 * d.s);
      ctx.lineTo(d.x + 11 * d.s, d.y + 5);
      ctx.closePath();
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
      ctx.fillStyle = night ? "#1a2e1c" : "#3d7a40";
      ctx.beginPath();
      ctx.ellipse(d.x + sway * 0.4, d.y - 4, 10 * d.s, 8 * d.s, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (d.kind === "flower") {
      ctx.fillStyle = night ? "#1c3018" : "#3f8a3a";
      ctx.fillRect(d.x - 1, d.y - 4, 2, 6);
      ctx.fillStyle = night ? "#6a5a38" : d.s > 1 ? "#e8c84a" : "#d46aa0";
      ctx.beginPath();
      ctx.arc(d.x, d.y - 6, 3, 0, Math.PI * 2);
      ctx.fill();
    } else if (d.kind === "reed") {
      ctx.strokeStyle = night ? "#243428" : "#4a6b38";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x + sway, d.y - 16 * d.s);
      ctx.stroke();
      ctx.fillStyle = "#c4a24a";
      ctx.fillRect(d.x + sway - 1, d.y - 20 * d.s, 3, 7);
    } else if (d.kind === "soil") {
      ctx.fillStyle = night ? "rgba(70, 56, 40, 0.55)" : "rgba(176, 132, 80, 0.55)";
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, 16, 8, d.rot, 0, Math.PI * 2);
      ctx.fill();
    } else if (d.kind === "tuft") {
      ctx.fillStyle = night ? "#2a3a24" : "#6a8a44";
      ctx.beginPath();
      ctx.moveTo(d.x, d.y + 4);
      ctx.lineTo(d.x - 5, d.y - 8);
      ctx.lineTo(d.x, d.y - 3);
      ctx.lineTo(d.x + 5, d.y - 9);
      ctx.closePath();
      ctx.fill();
    } else if (d.kind === "snow") {
      ctx.fillStyle = night ? "rgba(200, 210, 220, 0.35)" : "rgba(244, 248, 250, 0.8)";
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, 14 * d.s, 7 * d.s, d.rot, 0, Math.PI * 2);
      ctx.fill();
    } else if (d.kind === "pavement") {
      ctx.fillStyle = night ? "rgba(70, 58, 46, 0.55)" : "rgba(186, 150, 104, 0.45)";
      ctx.fillRect(d.x - 8, d.y - 5, 16, 10);
    } else if (d.kind === "cairn-detail") {
      ctx.fillStyle = night ? "#5a5854" : "#b8aea0";
      ctx.fillRect(d.x - 8, d.y - 6, 16, 8);
      ctx.fillRect(d.x - 5, d.y - 12, 10, 6);
      ctx.fillRect(d.x - 3, d.y - 16, 6, 4);
    } else if (d.kind === "stake-detail") {
      ctx.fillStyle = "#c45c26";
      ctx.fillRect(d.x - 2, d.y - 16, 4, 16);
      ctx.fillStyle = "#f4efe2";
      ctx.fillRect(d.x - 6, d.y - 22, 12, 7);
    } else if (d.kind === "case-detail") {
      ctx.fillStyle = "#6b4a2a";
      ctx.fillRect(d.x - 10, d.y - 8, 20, 12);
      ctx.fillStyle = "#c4a06a";
      ctx.fillRect(d.x - 4, d.y - 5, 8, 4);
    }
  }
}

function drawStoryProps(ctx, region, time, reduced, flumeVisual, night = false) {
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
    } else if (prop.kind === "runoff-table") {
      drawRunoffBench(ctx, prop, flumeVisual || {});
    } else if (prop.kind === "gnomon") {
      ctx.fillStyle = "#5a3e22";
      ctx.fillRect(prop.x - 3, prop.y - 36, 6, 36);
      ctx.fillStyle = "#d8c09a";
      ctx.beginPath();
      ctx.arc(prop.x, prop.y - 36, 5, 0, Math.PI * 2);
      ctx.fill();
    } else if (prop.kind === "dome") {
      ctx.fillStyle = "#c4a06a";
      ctx.fillRect(prop.x - 18, prop.y - 10, 36, 16);
      ctx.fillStyle = "#d8c8a0";
      ctx.beginPath();
      ctx.arc(prop.x, prop.y - 10, 16, Math.PI, 0);
      ctx.fill();
    } else if (prop.kind === "sundial") {
      ctx.fillStyle = "#c2b4a0";
      ctx.beginPath();
      ctx.ellipse(prop.x, prop.y, 16, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#6d4c32";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(prop.x, prop.y);
      ctx.lineTo(prop.x + 6, prop.y - 12);
      ctx.stroke();
    } else if (prop.kind === "telescope-pad") {
      ctx.fillStyle = "#b8aea0";
      ctx.beginPath();
      ctx.arc(prop.x, prop.y, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#6d4c32";
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (prop.kind === "survey-post") {
      ctx.fillStyle = "#c45c26";
      ctx.fillRect(prop.x - 3, prop.y - 22, 6, 22);
      ctx.fillStyle = "#d4b46a";
      ctx.fillRect(prop.x - 8, prop.y - 30, 16, 8);
    } else if (prop.kind === "alignment-stone") {
      ctx.fillStyle = "#b8aea0";
      ctx.fillRect(prop.x - 18, prop.y - 6, 10, 12);
      ctx.fillRect(prop.x - 4, prop.y - 8, 10, 14);
      ctx.fillRect(prop.x + 10, prop.y - 5, 10, 11);
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
    } else if (prop.kind === "lookout") {
      ctx.fillStyle = "#6d4c32";
      ctx.fillRect(prop.x - 7, prop.y - 52, 5, 52);
      ctx.fillRect(prop.x + 2, prop.y - 52, 5, 52);
      ctx.fillStyle = "#c4a46a";
      ctx.fillRect(prop.x - 16, prop.y - 68, 32, 18);
      ctx.fillStyle = "#8a3324";
      ctx.fillRect(prop.x - 18, prop.y - 76, 36, 8);
    } else if (prop.kind === "radio-mast") {
      ctx.strokeStyle = "#4a5560";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(prop.x, prop.y);
      ctx.lineTo(prop.x, prop.y - 64);
      ctx.moveTo(prop.x - 10, prop.y - 20);
      ctx.lineTo(prop.x, prop.y - 40);
      ctx.lineTo(prop.x + 10, prop.y - 20);
      ctx.stroke();
      ctx.fillStyle = "#c45c26";
      ctx.beginPath();
      ctx.arc(prop.x, prop.y - 64, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (prop.kind === "dock") {
      ctx.fillStyle = "#8a6238";
      ctx.fillRect(prop.x - 40, prop.y - 8, 52, 16);
      ctx.fillStyle = "#c4a46a";
      for (let i = 0; i < 4; i += 1) ctx.fillRect(prop.x - 38 + i * 12, prop.y - 6, 10, 12);
    } else if (prop.kind === "elevation-stake") {
      ctx.fillStyle = "#d8c8a0";
      ctx.fillRect(prop.x - 3, prop.y - 22, 6, 22);
      ctx.fillStyle = "#f4efe2";
      ctx.fillRect(prop.x - 10, prop.y - 28, 20, 10);
      ctx.fillStyle = "#3d4a3c";
      ctx.font = "9px Trebuchet MS, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(String(prop.elev || ""), prop.x, prop.y - 20);
    }
  }
}

function drawChallengeSites(ctx, state) {
  if (!state.challengeActive || !state.challengeSites?.length) return;
  for (const site of state.challengeSites) {
    const seen = site.observed;
    ctx.beginPath();
    ctx.arc(site.x, site.y, seen ? 5 : 7, 0, Math.PI * 2);
    ctx.fillStyle = seen ? "rgba(196, 92, 38, 0.35)" : "rgba(196, 92, 38, 0.55)";
    ctx.fill();
    ctx.strokeStyle = "rgba(90, 48, 24, 0.55)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
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

function drawTrees(ctx, world, time, reduced, night = false) {
  const sorted = world.trees.slice().sort((a, b) => a.y - b.y);
  for (const tree of sorted) drawIrregularTree(ctx, tree, time, reduced, night);
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
  const focus = state.nearTarget;
  ctx.font = "bold 14px Trebuchet MS, sans-serif";
  ctx.textAlign = "center";
  for (const feature of world.region.features) {
    const d = dist(px, py, feature.x, feature.y);
    const focused = focus && Math.hypot(focus.x - feature.x, focus.y - feature.y) < 28;
    if (d > 72 && !focused) continue;
    const label = feature.name;
    ctx.fillStyle = "rgba(28, 44, 28, 0.62)";
    const w = ctx.measureText(label).width + 16;
    ctx.beginPath();
    roundRect(ctx, feature.x - w / 2, feature.y - 54, w, 22, 10);
    ctx.fill();
    ctx.fillStyle = "#f7f3e8";
    ctx.fillText(label, feature.x, feature.y - 39);
  }
  const extras = state.interpretiveLabels || [];
  ctx.font = "12px Trebuchet MS, sans-serif";
  for (const extra of extras) {
    if (dist(px, py, extra.x, extra.y) > 90) continue;
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
